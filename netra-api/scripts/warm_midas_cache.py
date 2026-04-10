#!/usr/bin/env python3
"""
Pre-download MiDaS torch hub repo + weights at build time so runtime
inference works even when outbound internet is limited.
"""

import os
import sys
import time
from pathlib import Path


def _bool_env(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def main() -> int:
    root_dir = Path(__file__).resolve().parents[2]
    ai_dir = Path(os.getenv("AI_DIR", str(root_dir / "NETRA-AI")))
    cache_dir = Path(os.getenv("TORCH_HOME", str(ai_dir / ".torch_cache")))
    model_type = os.getenv("DEPTH_MODEL_TYPE", "MiDaS_small")
    attempts = int(os.getenv("MIDAS_PREWARM_ATTEMPTS", "3"))
    strict = _bool_env("MIDAS_PREWARM_STRICT", False)

    print(f"[NETRA-AI] MiDaS prewarm starting (model={model_type}, cache={cache_dir})")
    cache_dir.mkdir(parents=True, exist_ok=True)

    try:
        import torch
    except Exception as err:
        print(f"[NETRA-AI] Failed to import torch for prewarm: {err}")
        return 1 if strict else 0

    torch.hub.set_dir(str(cache_dir))

    last_err = None
    for idx in range(1, attempts + 1):
        try:
            torch.hub.load("intel-isl/MiDaS", model_type, trust_repo=True)
            torch.hub.load("intel-isl/MiDaS", "transforms", trust_repo=True)
            print("[NETRA-AI] MiDaS prewarm complete.")
            return 0
        except Exception as err:
            last_err = err
            print(f"[NETRA-AI] Prewarm attempt {idx}/{attempts} failed: {err}")
            time.sleep(min(5, idx * 2))

    print(f"[NETRA-AI] MiDaS prewarm failed after {attempts} attempts: {last_err}")
    return 1 if strict else 0


if __name__ == "__main__":
    sys.exit(main())
