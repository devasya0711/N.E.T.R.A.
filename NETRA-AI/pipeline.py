"""
NETRA — Main Pipeline Orchestrator
Wires together all modules into a single end-to-end video pipeline
that can run on a dash-cam feed or pre-recorded video.

Usage:
    python pipeline.py --source video.mp4
    python pipeline.py --source 0          # webcam
"""

import argparse
import json
import os
import random
import time
from pathlib import Path

import cv2
import numpy as np

import config
from detector import PotholeDetector
from depth_estimator import DepthEstimator
from tracker import TemporalTracker
from severity import SeverityScorer
from gps_tagger import GPSTagger
from loop_closure import LoopClosureEngine
from mesh_generator import MeshGenerator


class NETRAPipeline:
    """
    End-to-end Autonomous Pothole Intelligence pipeline.

    Frame-level workflow:
        1. YOLO instance segmentation → raw detections
        2. Temporal tracker → confirmed detections (≥ N frames)
        3. MiDaS depth estimation → depth map
        4. Depth analysis per confirmed pothole
        5. Severity scoring (area + depth + traffic)
        6. GPS geotagging → structured JSON record
        7. Loop closure / repair verification
        8. Optional 3D point cloud & mesh export
    """

    def __init__(
        self,
        generate_mesh: bool = False,
        show_gui: bool = True,
        realtime_mode: bool = False,
    ):
        print("[NETRA] Initialising modules …")
        self.detector = PotholeDetector()
        self.depth_est = DepthEstimator()
        self.tracker = TemporalTracker()
        self.scorer = SeverityScorer()
        self.gps = GPSTagger()
        self.loop_closure = LoopClosureEngine()
        self.mesh_gen = MeshGenerator() if generate_mesh else None

        self.show_gui = show_gui
        self.records: list[dict] = []  # all frame-level detections
        self.unique_potholes: dict[int, dict] = {}  # track_id → best record
        self._last_confirmed_dets: list[dict] = []  # for GUI drawing
        self.save_vid = False
        self.vid_writer = None
        self.out_path = ""
        self._last_live_write = 0.0
        self._target_preview_fps = 8.0
        self.realtime_mode = realtime_mode
        self._cached_depth_map = None
        self._cached_depth_frame = -1
        self._live_meta_path = config.OUTPUT_DIR / "live_meta.json"
        self._last_meta_write_ts = 0.0
        print("[NETRA] All modules ready.\n")

    def _write_live_meta(self, payload: dict):
        """Atomically write pipeline metadata for web progress polling."""
        config.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        tmp_path = config.OUTPUT_DIR / "live_meta.tmp.json"
        with open(tmp_path, "w", encoding="utf-8") as mf:
            json.dump(payload, mf)

        # On Windows, frequent polling can briefly lock live_meta.json.
        # Retry replace a few times; if still locked, fall back to direct write.
        for _ in range(5):
            try:
                os.replace(tmp_path, self._live_meta_path)
                return
            except PermissionError:
                time.sleep(0.02)

        with open(self._live_meta_path, "w", encoding="utf-8") as mf:
            json.dump(payload, mf)

        if tmp_path.exists():
            try:
                tmp_path.unlink()
            except OSError:
                pass

    def _update_progress_meta(
        self,
        *,
        source_fps: float,
        is_image: bool,
        total_frames: int,
        processed_frames: int,
        done: bool = False,
    ):
        """Persist processing progress with throttled disk writes."""
        if total_frames <= 0:
            progress_pct = 0 if not done else 100
        else:
            progress_pct = int(min(100, max(0, round((processed_frames / total_frames) * 100))))

        now = time.perf_counter()
        if not done and (now - self._last_meta_write_ts) < 0.2:
            return

        self._write_live_meta(
            {
                "sourceFps": round(float(source_fps), 2),
                "previewTargetFps": round(float(self._target_preview_fps), 2),
                "realtimeMode": bool(self.realtime_mode),
                "sourceType": "image" if is_image else "video",
                "totalFrames": int(max(0, total_frames)),
                "processedFrames": int(max(0, processed_frames)),
                "progressPct": int(progress_pct),
                "done": bool(done),
                "updatedAt": time.time(),
            }
        )
        self._last_meta_write_ts = now

    def _write_live_frame(self, vis: np.ndarray, is_image: bool = False):
        """Write a lightweight live preview frame for the web UI."""
        now = time.perf_counter()
        target_interval = 1.0 / max(1.0, float(self._target_preview_fps))
        if (now - self._last_live_write) < target_interval and not is_image:
            return

        live_frame = vis
        h, w = live_frame.shape[:2]
        if w > 960:
            new_h = int(h * (960 / w))
            live_frame = cv2.resize(live_frame, (960, new_h), interpolation=cv2.INTER_AREA)

        live_frame_path = config.OUTPUT_DIR / "live_frame.jpg"
        temp_live_frame_path = config.OUTPUT_DIR / "live_frame.tmp.jpg"
        ok, encoded = cv2.imencode(
            ".jpg",
            live_frame,
            [cv2.IMWRITE_JPEG_QUALITY, 60],
        )
        if ok:
            encoded.tofile(str(temp_live_frame_path))
            for _ in range(3):
                try:
                    os.replace(temp_live_frame_path, live_frame_path)
                    self._last_live_write = now
                    break
                except PermissionError:
                    # Windows throws if Node.js is actively serving the file to the frontend.
                    # Wait 5ms and attempt atomic substitute again.
                    time.sleep(0.005)

    # ────────────────────── single frame ────────────────────────

    def process_frame(
        self,
        frame: np.ndarray,
        frame_idx: int,
        traffic_density: float | None = None,
        is_image: bool = False,
    ) -> list[dict]:
        """
        Run the full pipeline on a single video frame.

        Args:
            frame:            BGR image (np.ndarray).
            frame_idx:        Integer frame counter.
            traffic_density:  Override mock traffic density [0–1].
            is_image:         Bypass temporal tracker if True.

        Returns:
            List of structured detection records for this frame.
        """
        # ── 1. YOLO detection ──
        raw_dets = self.detector.detect(frame)

        # ── 2. Temporal tracking ──
        if is_image:
            # Bypass tracker, trust raw detection
            for i, det in enumerate(raw_dets):
                det["track_id"] = i + 1
                det["track_hits"] = 1
            confirmed = raw_dets
        else:
            confirmed = self.tracker.update(raw_dets)

        # Always refresh what is drawn in the preview (including empty frames).
        self._last_confirmed_dets = confirmed
        
        if not confirmed:
            return []

        # ── 3. Depth estimation ──
        # Reuse depth for a few frames in realtime mode to reduce CPU cost.
        if self.realtime_mode and not is_image:
            depth_stride = 6
            if (
                self._cached_depth_map is None
                or (frame_idx - self._cached_depth_frame) >= depth_stride
            ):
                self._cached_depth_map = self.depth_est.estimate(frame)
                self._cached_depth_frame = frame_idx
            depth_map = self._cached_depth_map
        else:
            depth_map = self.depth_est.estimate(frame)

        frame_records: list[dict] = []

        for det in confirmed:
            mask = det["mask"]
            polygon = det.get("polygon", np.array([]))

            # ── 4. Per-pothole depth analysis ──
            depth_stats = DepthEstimator.analyse_pothole_depth(
                depth_map, mask, polygon,
            )

            # ── 5. Severity scoring ──
            mock_traffic = traffic_density if traffic_density is not None else random.uniform(0.2, 0.9)
            sev = self.scorer.score(
                area_px=det["area_px"],
                max_depth=depth_stats["max_depth_rel"],
                traffic_density=mock_traffic,
            )
            
            # Cache the values onto the detection dict for fast-preview drawing persistence
            det["last_depth"] = depth_stats["max_depth_rel"]
            det["last_severity"] = sev["label"]

            # ── 6. GPS geotagging & structured record ──
            gps_coord = self.gps.get_mock_gps()
            record = GPSTagger.build_record(
                detection=det,
                depth_stats=depth_stats,
                severity=sev,
                gps=gps_coord,
                frame_index=frame_idx,
            )

            # ── 7. Loop closure ──
            closure = self.loop_closure.check(record)
            record["loop_closure"] = closure

            # ── 8. Optional 3D mesh ──
            if self.mesh_gen is not None:
                pc = self.mesh_gen.generate_pointcloud(
                    depth_map, mask,
                    rgb_frame=cv2.cvtColor(frame, cv2.COLOR_BGR2RGB),
                )
                ply_path = str(
                    config.OUTPUT_DIR / f"{record['pothole_id']}.ply"
                )
                config.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
                MeshGenerator.export_ply(ply_path, pc)
                record["mesh_ply"] = ply_path

            frame_records.append(record)
            self.records.append(record)

            # Keep only the highest-confidence observation per track
            tid = det.get("track_id")
            if tid is not None:
                prev = self.unique_potholes.get(tid)
                if prev is None or det["confidence"] > prev["detection"]["confidence"]:
                    self.unique_potholes[tid] = record

            # Console summary
            self._log(record, len(self.unique_potholes))

        return frame_records

    # ─────────────────── video stream loop ──────────────────────

    def run(self, source: str | int, save_vid: bool = False):
        """
        Run the pipeline on a video file, image, or camera stream.

        Args:
            source: Path to video/image file, or integer camera index (0).
            save_vid: If True, save the annotated video/image to output directory.
        """
        self.save_vid = save_vid
        is_im = isinstance(source, str) and source.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp'))
        
        cap = None
        fps = 30
        if not is_im:
            cap = cv2.VideoCapture(source)
            if not cap.isOpened():
                raise RuntimeError(f"Cannot open source: {source}")
            fps = cap.get(cv2.CAP_PROP_FPS) or 30
        total_frames = 1 if is_im else int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
            
        frame_idx = 0
        self._target_preview_fps = max(1.0, min(60.0, float(fps)))

        self._update_progress_meta(
            source_fps=fps,
            is_image=is_im,
            total_frames=total_frames,
            processed_frames=0,
            done=False,
        )

        print(f"[NETRA] Processing source: {source}  ({fps:.0f} FPS, is_image={is_im})\n")

        try:
            while True:
                if is_im:
                    frame = cv2.imread(source)
                    if frame is None:
                        raise RuntimeError(f"Cannot read image: {source}")
                    ret = True
                else:
                    ret, frame = cap.read()
                    
                if not ret:
                    break

                if self.realtime_mode and not is_im:
                    h, w = frame.shape[:2]
                    max_w = 640
                    if w > max_w:
                        new_h = int(h * (max_w / w))
                        frame = cv2.resize(frame, (max_w, new_h), interpolation=cv2.INTER_AREA)

                    # Run full AI every N frames, but keep preview updating in-between.
                    preview_stride = 3
                    if frame_idx % preview_stride != 0:
                        vis = self.detector.draw_detections(frame, self._last_confirmed_dets)

                        cv2.putText(
                            vis,
                            f"NETRA | Frame {frame_idx} | FAST PREVIEW | "
                            f"Unique Potholes: {len(self.unique_potholes)}",
                            (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7,
                            (0, 255, 0), 2,
                        )

                        if self.save_vid and not is_im and self.vid_writer is not None:
                            self.vid_writer.write(vis)

                        self._write_live_frame(vis, is_image=is_im)

                        if self.show_gui:
                            try:
                                cv2.imshow("NETRA — Pothole Intelligence", vis)
                                if cv2.waitKey(1) & 0xFF == ord("q"):
                                    break
                            except cv2.error:
                                pass

                        frame_idx += 1
                        self._update_progress_meta(
                            source_fps=fps,
                            is_image=is_im,
                            total_frames=total_frames,
                            processed_frames=frame_idx,
                            done=False,
                        )
                        continue

                t0 = time.perf_counter()
                frame_records = self.process_frame(frame, frame_idx, is_image=is_im)
                dt = time.perf_counter() - t0

                # ── Draw visualisations ──
                draw_dets = self._last_confirmed_dets
                vis = self.detector.draw_detections(frame, draw_dets)

                cv2.putText(
                    vis,
                    f"NETRA | Frame {frame_idx} | {1/dt:.1f} FPS | "
                    f"Unique Potholes: {len(self.unique_potholes)}",
                    (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7,
                    (0, 255, 0), 2,
                )

                if self.save_vid:
                    if is_im:
                        self.out_path = str(config.OUTPUT_DIR / "annotated_image.jpg")
                        cv2.imwrite(self.out_path, vis)
                        print(f"[NETRA] Saved annotated image to: {self.out_path}")
                    else:
                        if self.vid_writer is None:
                            self.out_path = str(config.OUTPUT_DIR / "annotated_video.webm")
                            fourcc = cv2.VideoWriter_fourcc(*'VP80')
                            h, w = vis.shape[:2]
                            self.vid_writer = cv2.VideoWriter(self.out_path, fourcc, fps, (w, h))
                        self.vid_writer.write(vis)                          
                self._write_live_frame(vis, is_image=is_im)

                if self.show_gui:
                    try:
                        cv2.imshow("NETRA — Pothole Intelligence", vis)
                        if cv2.waitKey(1 if not is_im else 0) & 0xFF == ord("q"):
                            break
                    except cv2.error:
                        # Fallback for headless environments
                        pass

                frame_idx += 1
                self._update_progress_meta(
                    source_fps=fps,
                    is_image=is_im,
                    total_frames=total_frames,
                    processed_frames=frame_idx,
                    done=False,
                )
                if is_im:
                    break # Process image only once

        finally:
            if cap:
                cap.release()
            if self.vid_writer:
                self.vid_writer.release()
                print(f"[NETRA] Saved annotated video to: {self.out_path}")
            if self.show_gui:
                try:
                    cv2.destroyAllWindows()
                except cv2.error:
                    pass

        # Export unique pothole records (one per physical pothole)
        config.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        unique_path = str(config.OUTPUT_DIR / "unique_potholes.json")
        unique_csv_path = str(config.OUTPUT_DIR / "unique_potholes.csv")
        
        unique_vals = list(self.unique_potholes.values())
        GPSTagger.export_json(unique_vals, unique_path)
        GPSTagger.export_csv(unique_vals, unique_csv_path)

        # Also export full frame-level log
        all_path = str(config.OUTPUT_DIR / "session_detections.json")
        GPSTagger.export_json(self.records, all_path)

        print(f"\n{'='*60}")
        print(f"  NETRA Session Complete")
        print(f"  Unique potholes detected : {len(self.unique_potholes)}")
        print(f"  Total frame observations : {len(self.records)}")
        print(f"  Unique records  → {unique_path}")
        print(f"  Full session    → {all_path}")
        print(f"{'='*60}")

        final_processed = total_frames if total_frames > 0 else frame_idx
        self._update_progress_meta(
            source_fps=fps,
            is_image=is_im,
            total_frames=(total_frames if total_frames > 0 else final_processed),
            processed_frames=final_processed,
            done=True,
        )

    # ───────────────────── logging helper ───────────────────────

    @staticmethod
    def _log(record: dict, unique_count: int = 0):
        sev = record["severity"]
        gps = record["gps"]
        closure = record.get("loop_closure", {})
        print(
            f'  ✦ {record["pothole_id"]}  '
            f'Severity: {sev["label"]} ({sev["score"]:.2f})  '
            f'GPS: ({gps["latitude"]:.4f}, {gps["longitude"]:.4f})  '
            f'Loop: {closure.get("status", "N/A")}  '
            f'[Unique: {unique_count}]'
        )


# ═══════════════════════════════════════════════════════════════
# CLI Entry Point
# ═══════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(
        description="NETRA — Autonomous Pothole Intelligence Pipeline",
    )
    parser.add_argument(
        "--source", type=str, default="0",
        help="Path to video file, or camera index (default: 0 = webcam).",
    )
    parser.add_argument(
        "--mesh", action="store_true",
        help="Generate 3D PLY point clouds for each confirmed pothole.",
    )
    parser.add_argument(
        "--no-gui", action="store_true",
        help="Run headless without OpenCV GUI windows.",
    )
    parser.add_argument(
        "--sync-api", action="store_true",
        help="Sync detected potholes to the NETRA API in real-time.",
    )
    parser.add_argument(
        "--save-vid", action="store_true",
        help="Save annotated sequence to output folder",
    )
    parser.add_argument(
        "--realtime-mode", action="store_true",
        help="Optimise for live preview FPS (faster, slightly less precise depth updates).",
    )
    args = parser.parse_args()

    # Interpret source
    source: str | int = int(args.source) if args.source.isdigit() else args.source

    pipeline = NETRAPipeline(
        generate_mesh=args.mesh,
        show_gui=not args.no_gui,
        realtime_mode=args.realtime_mode,
    )
    pipeline.run(source, save_vid=args.save_vid)
    
    if args.sync_api:
        from sync_to_api import sync_potholes
        sync_potholes(str(config.OUTPUT_DIR / "unique_potholes.json"))

if __name__ == "__main__":
    main()
