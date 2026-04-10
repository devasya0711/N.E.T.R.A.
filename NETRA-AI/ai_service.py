"""
NETRA-AI standalone service.

Runs the heavy Python inference pipeline out-of-process and exposes
job-based endpoints so the Node API can stay responsive.
"""

from __future__ import annotations

import json
import os
import select
import shutil
import subprocess
import threading
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, JSONResponse, PlainTextResponse, Response
from fastapi.staticfiles import StaticFiles


APP_ROOT = Path(__file__).resolve().parent
OUTPUT_DIR = APP_ROOT / "output"
INPUT_DIR = APP_ROOT / "input"
TORCH_CACHE_DIR = APP_ROOT / ".torch_cache"
LIVE_FRAME_PATH = OUTPUT_DIR / "live_frame.jpg"
LIVE_META_PATH = OUTPUT_DIR / "live_meta.json"
LIVE_LOG_PATH = OUTPUT_DIR / "live_log.txt"

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
INPUT_DIR.mkdir(parents=True, exist_ok=True)
TORCH_CACHE_DIR.mkdir(parents=True, exist_ok=True)

_jobs: dict[str, dict[str, Any]] = {}
_jobs_lock = threading.Lock()
_execution_lock = threading.Lock()


def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _analysis_result_path(run_id: str) -> Path:
    safe = "".join(ch for ch in run_id if ch.isalnum() or ch in ("-", "_"))
    return OUTPUT_DIR / f"analysis_result_{safe}.json"


def _write_json_atomic(target: Path, payload: dict[str, Any]) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    tmp = target.with_suffix(target.suffix + ".tmp")
    with tmp.open("w", encoding="utf-8") as f:
        json.dump(payload, f, separators=(",", ":"))
    tmp.replace(target)


def _read_json(target: Path) -> dict[str, Any]:
    with target.open("r", encoding="utf-8") as f:
        return json.load(f)


def _persist_job_state(run_id: str, payload: dict[str, Any]) -> None:
    payload = dict(payload)
    payload["runId"] = run_id
    payload["updatedAt"] = _iso_now()
    if "createdAt" not in payload:
        payload["createdAt"] = payload["updatedAt"]
    _write_json_atomic(_analysis_result_path(run_id), payload)

    with _jobs_lock:
        existing = _jobs.get(run_id, {})
        merged = {**existing, **payload}
        _jobs[run_id] = merged


def _reset_live_meta(source_is_image: bool) -> None:
    payload = {
        "sourceFps": 0,
        "previewTargetFps": 0,
        "realtimeMode": True,
        "sourceType": "image" if source_is_image else "video",
        "totalFrames": 0,
        "processedFrames": 0,
        "progressPct": 0,
        "done": False,
        "updatedAt": time.time(),
    }
    _write_json_atomic(LIVE_META_PATH, payload)


def _append_live_log(log_file, text: str, log_chunks: list[str], max_chars: int = 220_000) -> None:
    if not text:
        return
    log_file.write(text)
    log_file.flush()
    log_chunks.append(text)
    total_chars = sum(len(chunk) for chunk in log_chunks)
    while total_chars > max_chars and log_chunks:
        popped = log_chunks.pop(0)
        total_chars -= len(popped)


def _process_job(run_id: str, source_path: Path, api_url: str, public_origin: str) -> None:
    is_image = source_path.suffix.lower() in {".jpg", ".jpeg", ".png", ".bmp"}
    timeout_ms = int(os.getenv("AI_MAX_RUNTIME_MS", str(20 * 60 * 1000)))
    timeout_s = max(30, timeout_ms // 1000)
    python_exec = os.getenv("AI_PYTHON_PATH", os.getenv("PYTHON_PATH", "python3"))

    if _execution_lock.locked():
        _persist_job_state(
            run_id,
            {
                "status": "pending",
                "message": "Waiting for previous AI job to finish.",
            },
        )

    with _execution_lock:
        _persist_job_state(
            run_id,
            {
                "status": "pending",
                "message": "AI pipeline started.",
            },
        )

        _reset_live_meta(source_is_image=is_image)
        LIVE_LOG_PATH.write_text("", encoding="utf-8")

        env = os.environ.copy()
        env["API_URL"] = api_url
        env.setdefault("TORCH_HOME", str(TORCH_CACHE_DIR))
        env.setdefault("YOLO_CONFIG_DIR", "/tmp/Ultralytics")

        cmd = [
            python_exec,
            "-u",
            "pipeline.py",
            "--source",
            str(source_path),
            "--sync-api",
            "--no-gui",
            "--save-vid",
            "--realtime-mode",
        ]

        log_chunks: list[str] = []
        timed_out = False
        return_code: int | None = None

        try:
            with LIVE_LOG_PATH.open("a", encoding="utf-8") as log_file:
                _append_live_log(log_file, f"[NETRA-AI] Starting: {' '.join(cmd)}\n", log_chunks)
                proc = subprocess.Popen(
                    cmd,
                    cwd=str(APP_ROOT),
                    env=env,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    bufsize=1,
                )

                deadline = time.time() + timeout_s
                while True:
                    now = time.time()
                    if now >= deadline:
                        timed_out = True
                        _append_live_log(
                            log_file,
                            f"\n[NETRA-AI] Timeout reached ({timeout_s}s). Terminating process.\n",
                            log_chunks,
                        )
                        proc.kill()
                        break

                    if proc.stdout is not None:
                        ready, _, _ = select.select([proc.stdout], [], [], 0.25)
                        if ready:
                            line = proc.stdout.readline()
                            if line:
                                _append_live_log(log_file, line, log_chunks)

                    poll_result = proc.poll()
                    if poll_result is not None:
                        return_code = poll_result
                        if proc.stdout is not None:
                            remaining = proc.stdout.read()
                            if remaining:
                                _append_live_log(log_file, remaining, log_chunks)
                        break

                if timed_out:
                    try:
                        proc.wait(timeout=3)
                    except Exception:
                        pass
                    return_code = proc.returncode
        except Exception as err:
            _persist_job_state(
                run_id,
                {
                    "status": "error",
                    "message": f"Failed to start AI process: {err}",
                    "log": "".join(log_chunks),
                },
            )
            source_path.unlink(missing_ok=True)
            return

        source_path.unlink(missing_ok=True)
        combined_log = "".join(log_chunks)

        if timed_out:
            _persist_job_state(
                run_id,
                {
                    "status": "error",
                    "message": f"AI processing timed out after {timeout_s} seconds.",
                    "log": combined_log,
                },
            )
            return

        if return_code != 0:
            _persist_job_state(
                run_id,
                {
                    "status": "error",
                    "message": f"AI process failed with code {return_code}",
                    "log": combined_log,
                },
            )
            return

        unique_path = OUTPUT_DIR / "unique_potholes.json"
        potholes_list: list[dict[str, Any]] = []
        if unique_path.exists():
            try:
                payload = _read_json(unique_path)
                if isinstance(payload, list):
                    potholes_list = payload
            except Exception:
                potholes_list = []

        if is_image:
            result_rel = "/outputs/annotated_image.jpg"
        else:
            webm_path = OUTPUT_DIR / "annotated_video.webm"
            mp4_path = OUTPUT_DIR / "annotated_video.mp4"
            result_rel = "/outputs/annotated_video.webm" if webm_path.exists() else "/outputs/annotated_video.mp4"
            if not webm_path.exists() and not mp4_path.exists():
                result_rel = ""

        ts = int(time.time() * 1000)
        csv_url = f"{public_origin}/outputs/unique_potholes.csv?t={ts}" if public_origin else None
        output_url = f"{public_origin}{result_rel}?t={ts}" if public_origin and result_rel else None

        _persist_job_state(
            run_id,
            {
                "status": "success",
                "message": "Analysis complete and data synced.",
                "totalPotholes": len(potholes_list),
                "potholesList": potholes_list,
                "csvUrl": csv_url,
                "outputUrl": output_url,
                "log": combined_log,
            },
        )


def _no_cache_headers() -> dict[str, str]:
    return {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
    }


app = FastAPI(title="NETRA AI Service", version="1.0.0")
app.mount("/outputs", StaticFiles(directory=str(OUTPUT_DIR)), name="outputs")


@app.get("/health")
def health() -> dict[str, Any]:
    with _jobs_lock:
        pending_jobs = sum(1 for v in _jobs.values() if v.get("status") == "pending")
    return {
        "status": "ok",
        "service": "netra-ai",
        "pendingJobs": pending_jobs,
        "timestamp": _iso_now(),
    }


@app.post("/jobs")
async def create_job(
    file: UploadFile | None = File(default=None),
    video: UploadFile | None = File(default=None),
    runId: str | None = Form(default=None),
    apiUrl: str | None = Form(default=None),
    publicOrigin: str | None = Form(default=None),
):
    upload = file or video
    if upload is None:
        raise HTTPException(status_code=400, detail="No file uploaded")

    run_id = (runId or f"run-{uuid.uuid4().hex[:12]}").strip()
    if not run_id:
        run_id = f"run-{uuid.uuid4().hex[:12]}"

    ext = Path(upload.filename or "").suffix or ".bin"
    source_path = INPUT_DIR / f"{run_id}{ext}"

    with source_path.open("wb") as dest:
        shutil.copyfileobj(upload.file, dest)

    resolved_api_url = (apiUrl or os.getenv("INTERNAL_API_URL") or "http://127.0.0.1:5000/api/potholes").strip()
    resolved_origin = (
        (
            publicOrigin
            or os.getenv("AI_PUBLIC_ORIGIN")
            or os.getenv("PUBLIC_API_ORIGIN")
            or ""
        ).strip().rstrip("/")
    )

    initial_message = "Job queued." if _execution_lock.locked() else "Job accepted."
    _persist_job_state(
        run_id,
        {
            "status": "pending",
            "message": initial_message,
        },
    )

    worker = threading.Thread(
        target=_process_job,
        args=(run_id, source_path, resolved_api_url, resolved_origin),
        daemon=True,
    )
    worker.start()

    return JSONResponse(
        status_code=202,
        content={
            "success": True,
            "accepted": True,
            "runId": run_id,
            "message": "Analysis queued. Poll /jobs/{runId} for completion.",
        },
    )


@app.get("/jobs/{run_id}")
def get_job(run_id: str):
    run_id = (run_id or "").strip()
    if not run_id:
        return JSONResponse(status_code=400, content={"success": False, "message": "Missing runId"})

    result_path = _analysis_result_path(run_id)
    if result_path.exists():
        try:
            parsed = _read_json(result_path)
            return {"success": True, "data": parsed}
        except Exception as err:
            return JSONResponse(
                status_code=500,
                content={"success": False, "message": f"Failed to parse result: {err}"},
            )

    with _jobs_lock:
        state = _jobs.get(run_id)

    if state:
        return {"success": True, "data": state}

    return JSONResponse(
        status_code=404,
        content={"success": False, "status": "pending", "message": "Result not ready yet"},
    )


@app.get("/live-frame")
def live_frame():
    if not LIVE_FRAME_PATH.exists():
        return Response(status_code=204)
    return FileResponse(str(LIVE_FRAME_PATH), media_type="image/jpeg", headers=_no_cache_headers())


@app.get("/live-meta")
def live_meta():
    if not LIVE_META_PATH.exists():
        return Response(status_code=204)
    return FileResponse(str(LIVE_META_PATH), media_type="application/json", headers=_no_cache_headers())


@app.get("/live-logs")
def live_logs():
    if not LIVE_LOG_PATH.exists():
        return Response(status_code=204)
    text = LIVE_LOG_PATH.read_text(encoding="utf-8", errors="ignore")
    return PlainTextResponse(text, headers=_no_cache_headers())
