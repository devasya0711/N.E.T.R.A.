"""
NETRA — Validation Runner
Downloads the pothole validation dataset and evaluates the model
with current config settings (TTA, CLAHE, 1280px, etc.), showing
real-time visual results.
"""
import os
import sys
import urllib.request
import zipfile
import glob
import time
from pathlib import Path

import cv2
import numpy as np
import yaml
from ultralytics import YOLO


def _create_val_from_video(dest):
    """Extract frames from the road video to use as a visual validation set."""
    video_path = Path("weights/road_video.mp4")
    if not video_path.exists():
        print("  No video found at weights/road_video.mp4")
        sys.exit(1)

    img_dir = dest / "val" / "images"
    lbl_dir = dest / "val" / "labels"
    img_dir.mkdir(parents=True, exist_ok=True)
    lbl_dir.mkdir(parents=True, exist_ok=True)

    cap = cv2.VideoCapture(str(video_path))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    # Sample ~50 evenly spaced frames
    n_samples = min(50, total_frames)
    step = max(1, total_frames // n_samples)

    count = 0
    frame_idx = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        if frame_idx % step == 0:
            cv2.imwrite(str(img_dir / f"frame_{count:04d}.jpg"), frame)
            # Empty label file (no ground truth — visual-only validation)
            (lbl_dir / f"frame_{count:04d}.txt").touch()
            count += 1
        frame_idx += 1
    cap.release()

    # Create data.yaml
    yaml_path = str(dest / "data.yaml")
    data_cfg = {
        "path": str(dest),
        "train": "val/images",
        "val": "val/images",
        "names": {0: "pothole"},
        "nc": 1,
    }
    with open(yaml_path, "w") as f:
        yaml.dump(data_cfg, f, sort_keys=False)
    print(f"  Extracted {count} frames from video for visual validation")


def download_dataset(dest="datasets/pothole-seg", api_key=None):
    """Download a pothole dataset for validation."""
    dest = Path(dest)
    # Check if already downloaded
    yamls = list(dest.rglob("data.yaml"))
    if yamls:
        print(f"Dataset already exists at {dest}")
        return str(yamls[0])

    dest.mkdir(parents=True, exist_ok=True)

    if api_key:
        print("Downloading pothole dataset via Roboflow Universe...")
        try:
            from roboflow import Roboflow
            rf = Roboflow(api_key=api_key)
            # Download a public pothole detection dataset from Universe
            project = rf.universe("atikul-islam-sajib").project("pothole-detection-yolov8-3")
            dataset = project.version(1).download("yolov8", location=str(dest))
            print("  Downloaded via Roboflow!")
        except Exception as e:
            print(f"  Roboflow Universe download failed: {e}")
            print("  Falling back to pip dataset method...")
            api_key = None  # fall through to pip method

    if not api_key:
        # Use ultralytics datasets hub or manual download
        print("Downloading pothole dataset via direct HTTP...")
        zip_path = dest / "dataset.zip"
        # Try multiple known public pothole dataset URLs
        urls = [
            "https://huggingface.co/datasets/keremberke/pothole-object-detection/resolve/main/data.zip",
        ]
        downloaded = False
        for url in urls:
            try:
                print(f"  Trying: {url[:60]}...")
                urllib.request.urlretrieve(url, str(zip_path))
                size_mb = os.path.getsize(zip_path) / 1e6
                if size_mb > 0.5:
                    print(f"  Downloaded: {size_mb:.1f} MB")
                    with zipfile.ZipFile(str(zip_path), "r") as z:
                        z.extractall(str(dest))
                    os.remove(zip_path)
                    downloaded = True
                    break
                else:
                    os.remove(zip_path)
            except Exception as e2:
                print(f"  Failed: {e2}")

        if not downloaded:
            # Last resort: create a mini validation set from the video
            print("\n  Direct download failed. Creating validation from video frames...")
            _create_val_from_video(dest)

    # Find or create data.yaml
    yamls = list(dest.rglob("data.yaml"))
    if yamls:
        yaml_path = str(yamls[0])
        with open(yaml_path) as f:
            data_cfg = yaml.safe_load(f)
        data_cfg["path"] = str(Path(yaml_path).parent)
        with open(yaml_path, "w") as f:
            yaml.dump(data_cfg, f, sort_keys=False)
        return yaml_path
    else:
        yaml_path = str(dest / "data.yaml")
        val_name = "valid" if (dest / "valid").exists() else "val"
        data_cfg = {
            "path": str(dest),
            "train": "train/images",
            "val": f"{val_name}/images",
            "names": {0: "pothole"},
            "nc": 1,
        }
        with open(yaml_path, "w") as f:
            yaml.dump(data_cfg, f, sort_keys=False)
        return yaml_path


def run_visual_validation(model, yaml_path, data_cfg):
    """Run detection on validation images, save annotated results."""
    base = str(Path(yaml_path).parent)

    # Find validation images
    val_dir = None
    for d in ("valid/images", "val/images", "test/images"):
        p = os.path.join(base, d)
        if os.path.exists(p) and len(os.listdir(p)) > 0:
            val_dir = p
            break

    if not val_dir:
        print("No validation images found!")
        return None, []

    images = sorted(glob.glob(os.path.join(val_dir, "*")))
    out_dir = str(Path("output") / "validation_results")
    os.makedirs(out_dir, exist_ok=True)

    print(f"\nFound {len(images)} validation images in {val_dir}")
    print(f"Saving annotated results to {out_dir}\n")

    total_detections = 0
    images_with_detections = 0
    det_log = []

    for i, img_path in enumerate(images):
        img = cv2.imread(img_path)
        if img is None:
            continue

        t0 = time.perf_counter()

        # Apply CLAHE if enabled
        display_frame = img.copy()
        inference_frame = img.copy()

        if hasattr(config, 'YOLO_CLAHE') and config.YOLO_CLAHE:
            lab = cv2.cvtColor(inference_frame, cv2.COLOR_BGR2LAB)
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            lab[:, :, 0] = clahe.apply(lab[:, :, 0])
            inference_frame = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)

        # Run inference with current settings
        results = model.predict(
            source=inference_frame,
            conf=config.YOLO_CONF_THRESHOLD,
            iou=config.YOLO_IOU_THRESHOLD,
            imgsz=config.YOLO_IMG_SIZE,
            device=config.YOLO_DEVICE,
            augment=getattr(config, 'YOLO_TTA', False),
            retina_masks=True,
            verbose=False,
        )

        dt = time.perf_counter() - t0
        result = results[0]
        boxes = result.boxes
        n_dets = len(boxes) if boxes is not None else 0
        total_detections += n_dets
        if n_dets > 0:
            images_with_detections += 1

        # Draw detections on the display frame
        vis = display_frame.copy()
        h, w = vis.shape[:2]

        if boxes is not None and len(boxes) > 0:
            has_masks = result.masks is not None
            masks_data = result.masks.data.cpu().numpy() if has_masks else None

            for j in range(len(boxes)):
                conf = float(boxes.conf[j].item())
                x1, y1, x2, y2 = boxes.xyxy[j].cpu().numpy().astype(int)

                # Draw mask overlay
                if has_masks:
                    mask = cv2.resize(masks_data[j], (w, h), interpolation=cv2.INTER_NEAREST)
                    overlay = vis.copy()
                    overlay[mask > 0.5] = [0, 0, 255]  # Red mask
                    vis = cv2.addWeighted(vis, 0.7, overlay, 0.3, 0)

                # Draw bounding box
                cv2.rectangle(vis, (x1, y1), (x2, y2), (0, 255, 0), 2)

                # Label
                label = f"pothole {conf:.2f}"
                (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 1)
                cv2.rectangle(vis, (x1, y1 - th - 8), (x1 + tw, y1), (0, 255, 0), -1)
                cv2.putText(vis, label, (x1, y1 - 4),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 1)

        # Status bar
        status = (
            f"NETRA | Image {i+1}/{len(images)} | "
            f"Detections: {n_dets} | "
            f"{1/max(dt, 1e-6):.1f} FPS | "
            f"TTA={'ON' if getattr(config, 'YOLO_TTA', False) else 'OFF'} "
            f"CLAHE={'ON' if getattr(config, 'YOLO_CLAHE', False) else 'OFF'} "
            f"Sz={config.YOLO_IMG_SIZE}"
        )
        cv2.putText(vis, status, (10, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)

        # Save annotated image
        out_path = os.path.join(out_dir, f"val_{i:04d}.jpg")
        cv2.imwrite(out_path, vis)

        if n_dets > 0:
            print(f"  Image {i+1:>3d}/{len(images)} | {n_dets} detections | {1/max(dt,1e-6):.1f} FPS | saved")
        det_log.append({"image": os.path.basename(img_path), "detections": n_dets, "fps": round(1/max(dt,1e-6), 1)})

    print(f"\n{'='*55}")
    print(f"  Visual Validation Summary")
    print(f"{'='*55}")
    print(f"  Images processed  : {i+1}")
    print(f"  Total detections  : {total_detections}")
    print(f"  Images with dets  : {images_with_detections}")
    print(f"  Annotated images  : {out_dir}")
    print(f"{'='*55}")
    return out_dir, det_log


if __name__ == "__main__":
    import argparse
    import config

    parser = argparse.ArgumentParser(description="NETRA — Model Validation")
    parser.add_argument("--api-key", type=str, default=None,
                        help="Roboflow API key (free signup at roboflow.com)")
    parser.add_argument("--dataset", type=str, default="datasets/pothole-seg",
                        help="Path to dataset directory")
    args = parser.parse_args()

    print("="*55)
    print("  NETRA — Model Validation with Current Settings")
    print("="*55)
    print(f"  Model      : {config.YOLO_MODEL_PATH}")
    print(f"  Device     : {config.YOLO_DEVICE}")
    print(f"  Image Size : {config.YOLO_IMG_SIZE}")
    print(f"  Confidence : {config.YOLO_CONF_THRESHOLD}")
    print(f"  TTA        : {getattr(config, 'YOLO_TTA', False)}")
    print(f"  CLAHE      : {getattr(config, 'YOLO_CLAHE', False)}")
    print(f"  Depth Model: {config.DEPTH_MODEL_TYPE}")
    print("="*55)

    # Step 1: Download dataset
    yaml_path = download_dataset(dest=args.dataset, api_key=args.api_key)
    with open(yaml_path) as f:
        data_cfg = yaml.safe_load(f)

    base = str(Path(yaml_path).parent)
    print(f"\nDataset: {base}")
    for s in ("train", "valid", "val", "test"):
        d = os.path.join(base, s, "images")
        if os.path.exists(d):
            print(f"  {s}: {len(os.listdir(d))} images")

    # Step 2: Run YOLO built-in validation (mAP metrics)
    print("\n" + "="*55)
    print("  Running official YOLO validation (mAP metrics)...")
    print("="*55)

    model = YOLO(config.YOLO_MODEL_PATH)

    metrics = model.val(
        data=yaml_path,
        imgsz=config.YOLO_IMG_SIZE,
        conf=config.YOLO_CONF_THRESHOLD,
        iou=config.YOLO_IOU_THRESHOLD,
        device=config.YOLO_DEVICE,
        augment=getattr(config, 'YOLO_TTA', False),
        verbose=True,
    )

    print(f"\n{'='*55}")
    print("  NETRA Model — Validation Results")
    print(f"  (with TTA={'ON' if getattr(config, 'YOLO_TTA', False) else 'OFF'}, "
          f"CLAHE={'N/A for val'}, ImgSz={config.YOLO_IMG_SIZE})")
    print(f"{'='*55}")
    print(f"  Box  Precision  : {metrics.box.mp:.4f}")
    print(f"  Box  Recall     : {metrics.box.mr:.4f}")
    print(f"  Box  mAP@50     : {metrics.box.map50:.4f}")
    print(f"  Box  mAP@50-95  : {metrics.box.map:.4f}")
    if hasattr(metrics, "seg") and metrics.seg is not None:
        print(f"  ─────────────────────────────────────────")
        print(f"  Mask Precision  : {metrics.seg.mp:.4f}")
        print(f"  Mask Recall     : {metrics.seg.mr:.4f}")
        print(f"  Mask mAP@50     : {metrics.seg.map50:.4f}")
        print(f"  Mask mAP@50-95  : {metrics.seg.map:.4f}")
    print(f"{'='*55}")

    # Step 3: Show visual results on validation images
    print("\nRunning visual validation on frames...")
    out_dir, det_log = run_visual_validation(model, yaml_path, data_cfg)

    if out_dir:
        print(f"\nOpening results folder: {out_dir}")
        import subprocess
        subprocess.Popen(f'explorer "{os.path.abspath(out_dir)}"')
