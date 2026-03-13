"""
NETRA — Synthetic Demo Runner
Generates synthetic road frames with fake pothole-like dark elliptical
regions, then runs the full pipeline to verify all modules end-to-end.

Since YOLOv8 is not fine-tuned on potholes yet, this demo bypasses the
YOLO detector and injects synthetic detections directly — exercising
the depth estimator, tracker, severity scorer, GPS tagger, loop closure,
and 3D mesh generator with realistic data flow.

Usage:
    python demo.py
    python demo.py --frames 60 --mesh
"""

import argparse
import random
import time

import cv2
import numpy as np

import config
from depth_estimator import DepthEstimator
from tracker import TemporalTracker
from severity import SeverityScorer
from gps_tagger import GPSTagger
from loop_closure import LoopClosureEngine
from mesh_generator import MeshGenerator


# ═══════════════════════════════════════════════════════════════
# Synthetic frame & detection generators
# ═══════════════════════════════════════════════════════════════

def generate_road_frame(
    width: int = 640,
    height: int = 480,
    pothole_specs: list[dict] | None = None,
) -> tuple[np.ndarray, list[dict]]:
    """
    Render a synthetic road image with dark elliptical 'potholes'.

    Returns:
        frame:      BGR image (H, W, 3).
        gt_dets:    List of ground-truth detection dicts matching
                    the PotholeDetector output format.
    """
    # Asphalt-grey base with noise
    frame = np.full((height, width, 3), (90, 90, 90), dtype=np.uint8)
    noise = np.random.randint(-15, 15, frame.shape, dtype=np.int16)
    frame = np.clip(frame.astype(np.int16) + noise, 0, 255).astype(np.uint8)

    # Road lane lines
    cv2.line(frame, (width // 3, 0), (width // 3, height), (180, 180, 180), 2)
    cv2.line(frame, (2 * width // 3, 0), (2 * width // 3, height), (180, 180, 180), 2)

    if pothole_specs is None:
        # Generate 1–3 random potholes
        n = random.randint(1, 3)
        pothole_specs = []
        for _ in range(n):
            cx = random.randint(width // 4, 3 * width // 4)
            cy = random.randint(height // 3, 3 * height // 4)
            rx = random.randint(30, 80)
            ry = random.randint(20, 50)
            pothole_specs.append({"cx": cx, "cy": cy, "rx": rx, "ry": ry})

    gt_dets: list[dict] = []

    for spec in pothole_specs:
        cx, cy, rx, ry = spec["cx"], spec["cy"], spec["rx"], spec["ry"]

        # Draw dark ellipse (pothole)
        mask_full = np.zeros((height, width), dtype=np.uint8)
        cv2.ellipse(mask_full, (cx, cy), (rx, ry), 0, 0, 360, 255, -1)
        bool_mask = mask_full > 0

        # Darken the pothole region
        frame[bool_mask] = np.clip(
            frame[bool_mask].astype(np.int16) - 60, 0, 255
        ).astype(np.uint8)

        # Add some texture inside
        for _ in range(5):
            px = cx + random.randint(-rx // 2, rx // 2)
            py = cy + random.randint(-ry // 2, ry // 2)
            cv2.circle(frame, (px, py), random.randint(2, 6), (40, 35, 30), -1)

        # Build detection dict
        x1, y1 = max(cx - rx, 0), max(cy - ry, 0)
        x2, y2 = min(cx + rx, width), min(cy + ry, height)

        contours, _ = cv2.findContours(
            mask_full, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE,
        )
        polygon = contours[0].squeeze(1) if contours else np.array([])

        gt_dets.append({
            "bbox": [x1, y1, x2, y2],
            "confidence": round(random.uniform(0.7, 0.95), 4),
            "mask": bool_mask,
            "polygon": polygon,
            "area_px": int(bool_mask.sum()),
        })

    return frame, gt_dets


# ═══════════════════════════════════════════════════════════════
# Demo pipeline
# ═══════════════════════════════════════════════════════════════

def run_demo(num_frames: int = 40, generate_mesh: bool = False, show_gui: bool = True):
    """
    Run the full NETRA pipeline on synthetic frames.

    This bypasses PotholeDetector (since the model isn't trained on
    potholes yet) but exercises every other module end-to-end.
    """
    print("=" * 65)
    print("  NETRA — Synthetic Demo Mode")
    print("  Generating synthetic road frames with mock potholes")
    print("=" * 65, "\n")

    # Initialise modules (skip YOLO detector — we inject detections)
    print("[NETRA] Loading depth estimator (MiDaS) …")
    depth_est = DepthEstimator()
    tracker = TemporalTracker()
    scorer = SeverityScorer()
    gps = GPSTagger()
    loop_closure = LoopClosureEngine()
    mesh_gen = MeshGenerator() if generate_mesh else None
    print("[NETRA] All modules ready.\n")

    all_records: list[dict] = []

    # Use consistent pothole positions so the tracker can accumulate hits
    fixed_potholes = [
        {"cx": 200, "cy": 300, "rx": 60, "ry": 35},
        {"cx": 450, "cy": 280, "rx": 45, "ry": 30},
    ]

    for frame_idx in range(num_frames):
        t0 = time.perf_counter()

        # ── 1. Generate synthetic frame + injected detections ──
        # Add small jitter to simulate camera motion
        jittered = []
        for p in fixed_potholes:
            jittered.append({
                "cx": p["cx"] + random.randint(-3, 3),
                "cy": p["cy"] + random.randint(-3, 3),
                "rx": p["rx"] + random.randint(-2, 2),
                "ry": p["ry"] + random.randint(-2, 2),
            })
        frame, raw_dets = generate_road_frame(pothole_specs=jittered)

        # ── 2. Temporal tracking ──
        confirmed = tracker.update(raw_dets)

        if confirmed:
            # ── 3. Depth estimation ──
            depth_map = depth_est.estimate(frame)

            for det in confirmed:
                mask = det["mask"]
                polygon = det.get("polygon", np.array([]))

                # ── 4. Depth analysis ──
                depth_stats = DepthEstimator.analyse_pothole_depth(
                    depth_map, mask, polygon,
                )

                # ── 5. Severity scoring ──
                sev = scorer.score(
                    area_px=det["area_px"],
                    max_depth=depth_stats["max_depth_rel"],
                    traffic_density=random.uniform(0.3, 0.85),
                )

                # ── 6. GPS tagging ──
                gps_coord = gps.get_mock_gps()
                record = GPSTagger.build_record(
                    detection=det,
                    depth_stats=depth_stats,
                    severity=sev,
                    gps=gps_coord,
                    frame_index=frame_idx,
                )

                # ── 7. Loop closure ──
                closure = loop_closure.check(record)
                record["loop_closure"] = closure

                # ── 8. Optional mesh ──
                if mesh_gen is not None:
                    pc = mesh_gen.generate_pointcloud(
                        depth_map, mask,
                        rgb_frame=cv2.cvtColor(frame, cv2.COLOR_BGR2RGB),
                    )
                    config.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
                    ply_path = str(config.OUTPUT_DIR / f"{record['pothole_id']}.ply")
                    MeshGenerator.export_ply(ply_path, pc)
                    record["mesh_ply"] = ply_path

                all_records.append(record)

                # Log
                s = record["severity"]
                g = record["gps"]
                lc = record.get("loop_closure", {})
                print(
                    f"  Frame {frame_idx:>3d} | "
                    f'{record["pothole_id"]}  '
                    f'Severity: {s["label"]:<8s} ({s["score"]:.2f})  '
                    f'Depth: {depth_stats["max_depth_rel"]:.3f}  '
                    f'Area: {det["area_px"]:>5d}px  '
                    f'GPS: ({g["latitude"]:.4f}, {g["longitude"]:.4f})  '
                    f'Loop: {lc.get("status", "?")}'
                )

        dt = time.perf_counter() - t0

        # ── GUI ──
        if show_gui:
            vis = frame.copy()
            # Draw masks on frame
            for det in raw_dets:
                vis[det["mask"]] = (0, 0, 200)  # red overlay
                x1, y1, x2, y2 = det["bbox"]
                cv2.rectangle(vis, (x1, y1), (x2, y2), (0, 255, 255), 2)
                label = f'conf={det["confidence"]:.2f}'
                cv2.putText(vis, label, (x1, y1 - 6),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 255, 255), 1)

            status = "TRACKING" if not confirmed else f"CONFIRMED ({len(confirmed)})"
            cv2.putText(
                vis,
                f"NETRA DEMO | Frame {frame_idx}/{num_frames} | "
                f"{1/max(dt,1e-6):.0f} FPS | {status}",
                (8, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 255, 0), 2,
            )

            # Show depth map side-by-side if we ran depth
            if confirmed:
                depth_vis = DepthEstimator.colorise_depth(depth_map)
                depth_vis = cv2.resize(depth_vis, (vis.shape[1], vis.shape[0]))
                combined = np.hstack([vis, depth_vis])
            else:
                combined = vis

            cv2.imshow("NETRA Demo — Synthetic Potholes", combined)
            if cv2.waitKey(60) & 0xFF == ord("q"):
                break

    if show_gui:
        cv2.destroyAllWindows()

    # ── Export results ──
    config.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = str(config.OUTPUT_DIR / "demo_detections.json")
    GPSTagger.export_json(all_records, out_path)

    print("\n" + "=" * 65)
    print(f"  Demo complete — {len(all_records)} confirmed detections")
    print(f"  JSON output  → {out_path}")
    if generate_mesh:
        print(f"  PLY meshes   → {config.OUTPUT_DIR}")
    print("=" * 65)


# ═══════════════════════════════════════════════════════════════
# CLI
# ═══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="NETRA — Synthetic Demo")
    parser.add_argument("--frames", type=int, default=40, help="Number of synthetic frames")
    parser.add_argument("--mesh", action="store_true", help="Export 3D PLY point clouds")
    parser.add_argument("--no-gui", action="store_true", help="Run headless")
    args = parser.parse_args()

    run_demo(
        num_frames=args.frames,
        generate_mesh=args.mesh,
        show_gui=not args.no_gui,
    )
