"""
NETRA — Training & Fine-Tuning Script
Fine-tunes a YOLOv8-seg model on a custom pothole segmentation dataset.

Dataset structure expected (YOLO format):
    datasets/
      pothole-seg/
        data.yaml            ← class names + paths
        train/
          images/  labels/
        val/
          images/  labels/

Label format (instance segmentation):
    Each .txt has lines: <class_id> <x1> <y1> <x2> <y2> ... <xN> <yN>
    where (xi, yi) are normalised polygon vertices.

Usage:
    # Fine-tune (recommended — yolov8s-seg for best accuracy/speed trade-off):
    python train.py --data datasets/pothole-seg/data.yaml --epochs 150

    # Use a larger backbone for maximum accuracy:
    python train.py --data datasets/pothole-seg/data.yaml --model yolov8m-seg.pt --epochs 200

    # Resume an interrupted run:
    python train.py --resume runs/pothole-seg/netra/weights/last.pt

    # Hyperparameter search (requires ray[tune]):
    python train.py --data datasets/pothole-seg/data.yaml --tune --tune-epochs 50

    # Validate best.pt on val split:
    python train.py --data datasets/pothole-seg/data.yaml --validate-only

    # Export for edge deployment (ONNX / TFLite / NCNN):
    python train.py --export-only
"""

import argparse
import shutil
from pathlib import Path

from ultralytics import YOLO

import config


def create_sample_data_yaml(out_dir: str = "datasets/pothole-seg") -> str:
    """Generate a template data.yaml for a single-class pothole dataset."""
    Path(out_dir).mkdir(parents=True, exist_ok=True)
    yaml_path = Path(out_dir) / "data.yaml"

    if not yaml_path.exists():
        yaml_path.write_text(
            "# NETRA Pothole Segmentation Dataset\n"
            f"path: {Path(out_dir).resolve()}\n"
            "train: train/images\n"
            "val: val/images\n\n"
            "names:\n"
            "  0: pothole\n"
        )
        for split in ("train", "val"):
            (Path(out_dir) / split / "images").mkdir(parents=True, exist_ok=True)
            (Path(out_dir) / split / "labels").mkdir(parents=True, exist_ok=True)

        print(f"[NETRA] Template dataset created at {yaml_path}")
        print("        Place your images in train/images & val/images,")
        print("        and polygon labels in train/labels & val/labels.")

    return str(yaml_path)


def train(
    data_yaml: str,
    model_size: str = "yolov8s-seg.pt",   # ↑ small > nano: +3-5 mAP, 2× compute
    epochs: int = 150,
    img_size: int = config.YOLO_IMG_SIZE,
    batch: int = 16,
    device: str = config.YOLO_DEVICE,
    project: str = "runs/pothole-seg",
    name: str = "netra",
    freeze: int = 0,
    resume: str = "",
    cache: bool = False,
):
    """
    Fine-tune YOLOv8 instance segmentation on the pothole dataset.

    Key accuracy improvements over baseline:
        • yolov8s-seg backbone  — ~+3-5 mAP vs nano
        • cos_lr=True           — cosine LR schedule for smoother convergence
        • close_mosaic=15       — disables mosaic the last 15 epochs so the
                                  model converges on clean, unblended images
        • auto_augment          — RandAugment policy (brightness/contrast/
                                  sharpness) on top of geometric augmentations
        • erasing=0.4           — random rectangular erasing simulates debris
                                  and partial occlusion common on roads
        • overlap_mask=True     — overlapping mask training; improves recall
                                  when potholes are adjacent
        • patience=50           — more room to escape plateaus before stopping

    Args:
        data_yaml:  Path to data.yaml.
        model_size: Base model variant (yolov8n-seg, yolov8s-seg, yolov8m-seg).
        epochs:     Number of training epochs.
        img_size:   Input image size (must match config.YOLO_IMG_SIZE in pipeline).
        batch:      Batch size (reduce if GPU OOM; -1 for auto-batch).
        device:     "cpu", "cuda:0", "mps".
        project:    Output project directory.
        name:       Experiment name (subdirectory under project).
        freeze:     Number of backbone layers to freeze during warm-up.
                    0 = full fine-tune from epoch 1.
                    10 = freeze first 10 backbone layers (useful for tiny datasets).
        resume:     Path to last.pt to resume an interrupted run.
        cache:      Cache images in RAM ("ram") or disk ("disk") for faster
                    training.  Requires enough free memory.
    """
    if resume:
        # Ultralytics handles resume internally when the weights path is last.pt
        model = YOLO(resume)
        results = model.train(resume=True)
    else:
        model = YOLO(model_size)

        train_kwargs = dict(
            data=data_yaml,
            epochs=epochs,
            imgsz=img_size,
            batch=batch,
            device=device,
            project=project,
            name=name,
            plots=True,
            # ── Transfer-learning: freeze backbone layers ──────────────
            # Freeze first N layers so the head adapts first; use 0 for
            # full fine-tuning on large/diverse datasets.
            freeze=freeze if freeze > 0 else None,
            # ── Augmentation (tuned for road / dashcam scenes) ─────────
            hsv_h=0.015,          # ±hue shift (colour cast between cameras)
            hsv_s=0.6,            # ↑ saturation (wet/dry road vary a lot)
            hsv_v=0.4,            # ↑ value (shadow / tunnel variation)
            degrees=5.0,          # small rotation (roads are mostly level)
            translate=0.1,
            scale=0.5,            # ↑ scale jitter (near/far potholes)
            shear=2.0,            # slight shear (camera angle variation)
            perspective=0.0001,   # subtle perspective warp
            flipud=0.0,           # NO vertical flip for road scenes
            fliplr=0.5,           # horizontal flip OK
            mosaic=1.0,
            mixup=0.15,           # ↑ mixup (helps generalise texture)
            copy_paste=0.1,       # instance copy-paste for seg tasks
            auto_augment="randaugment",  # RandAugment policy on top of above
            erasing=0.4,          # random rectangular erasing (occlusion sim)
            # ── Segmentation ────────────────────────────────────────────
            overlap_mask=True,    # train on overlapping mask instances
            # ── LR schedule ─────────────────────────────────────────────
            cos_lr=True,          # cosine annealing (smoother than linear)
            lr0=0.01,
            lrf=0.005,            # ↑ final LR floor (prevents over-decay)
            warmup_epochs=3,
            warmup_momentum=0.8,
            weight_decay=0.0005,
            # ── Mosaic warm-down ────────────────────────────────────────
            # Disable mosaic the last N epochs so the model fine-tunes on
            # clean, unblended images — consistently improves mAP by ~1-2%.
            close_mosaic=15,
            # ── Saving & monitoring ──────────────────────────────────────
            save_period=10,
            patience=50,          # ↑ patience before early stopping
            verbose=True,
        )
        if cache:
            train_kwargs["cache"] = "ram"

        results = model.train(**train_kwargs)

    # ── Copy best weights to the NETRA weights directory ────────────────
    run_dir = Path(project) / name
    best_pt = run_dir / "weights" / "best.pt"
    if best_pt.exists():
        config.WEIGHTS_DIR.mkdir(parents=True, exist_ok=True)
        dest = config.WEIGHTS_DIR / "best.pt"
        shutil.copy2(best_pt, dest)
        print(f"\n[NETRA] Best weights copied → {dest}")
        print(f"[NETRA] Training plots saved in {run_dir}")
    else:
        print(f"[NETRA] Warning: best.pt not found at {best_pt}")

    return results


def validate(
    data_yaml: str,
    weights: str = config.YOLO_MODEL_PATH,
    img_size: int = config.YOLO_IMG_SIZE,
    device: str = config.YOLO_DEVICE,
):
    """
    Run validation on the val split and print key metrics.

    Reports:
        mAP@50, mAP@50-95, Precision, Recall (bounding box)
        Mask mAP@50, Mask mAP@50-95 (segmentation)
    """
    model = YOLO(weights)
    metrics = model.val(data=data_yaml, imgsz=img_size, device=device)

    sep = "=" * 52
    print(f"\n{sep}")
    print("  NETRA Model Validation Results")
    print(sep)
    print(f"  Box  mAP@50    : {metrics.box.map50:.4f}")
    print(f"  Box  mAP@50-95 : {metrics.box.map:.4f}")
    print(f"  Box  Precision : {metrics.box.mp:.4f}")
    print(f"  Box  Recall    : {metrics.box.mr:.4f}")
    if hasattr(metrics, "seg") and metrics.seg is not None:
        print(f"  Mask mAP@50   : {metrics.seg.map50:.4f}")
        print(f"  Mask mAP@50-95: {metrics.seg.map:.4f}")
    print(sep)
    return metrics


def tune(
    data_yaml: str,
    model_size: str = "yolov8s-seg.pt",
    tune_epochs: int = 50,
    iterations: int = 300,
    device: str = config.YOLO_DEVICE,
    img_size: int = config.YOLO_IMG_SIZE,
):
    """
    Automated hyperparameter search using Ultralytics' built-in tuner.

    Requires:  pip install ray[tune]

    After this completes, the best hyperparameters are printed and saved to
    runs/pothole-seg/netra-tune/best_hyperparameters.yaml.  Plug them into
    the train() call above for a full training run.

    Args:
        tune_epochs:  Epochs per trial (keep short — 30-50 is usually enough).
        iterations:   Number of hyperparameter combinations to try.
    """
    model = YOLO(model_size)
    model.tune(
        data=data_yaml,
        epochs=tune_epochs,
        iterations=iterations,
        optimizer="AdamW",
        imgsz=img_size,
        device=device,
        plots=True,
        save=True,
        val=True,
    )


def export_edge(weights: str = config.YOLO_MODEL_PATH):
    """
    Export the trained model for edge deployment.

    Supported formats:
        • ONNX        — universal, any ONNX Runtime backend
        • TensorRT    — NVIDIA Jetson / dashcam GPUs
        • TFLite      — Coral Edge TPU / Android
        • NCNN        — ARM microcontrollers
    """
    model = YOLO(weights)
    model.export(format="onnx", imgsz=config.YOLO_IMG_SIZE, opset=config.ONNX_OPSET, simplify=True)
    print("[NETRA] ONNX export complete.")

    # Uncomment for other edge targets:
    # model.export(format="engine", imgsz=config.YOLO_IMG_SIZE, half=True)  # TensorRT FP16
    # model.export(format="tflite", imgsz=config.YOLO_IMG_SIZE)             # TFLite INT8
    # model.export(format="ncnn",   imgsz=config.YOLO_IMG_SIZE)             # NCNN ARM


# ═══════════════════════════════════════════════════════════════
# CLI
# ═══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="NETRA — Train / Validate / Tune / Export")
    # Dataset & model
    parser.add_argument("--data", type=str, default=None, help="Path to data.yaml")
    parser.add_argument(
        "--model", type=str, default="yolov8s-seg.pt",
        help="YOLOv8 model variant: yolov8n-seg.pt | yolov8s-seg.pt | yolov8m-seg.pt | yolov8l-seg.pt",
    )
    # Training options
    parser.add_argument("--epochs", type=int, default=150)
    parser.add_argument("--batch", type=int, default=16, help="Batch size (-1 for auto-batch)")
    parser.add_argument("--img-size", type=int, default=config.YOLO_IMG_SIZE)
    parser.add_argument("--device", type=str, default=config.YOLO_DEVICE)
    parser.add_argument("--freeze", type=int, default=0, help="Freeze first N backbone layers")
    parser.add_argument("--cache", action="store_true", help="Cache images in RAM for faster training")
    parser.add_argument("--resume", type=str, default="", metavar="LAST_PT",
                        help="Resume training from last.pt checkpoint")
    # Mode flags
    parser.add_argument("--export-only", action="store_true", help="Only export, skip training")
    parser.add_argument("--validate-only", action="store_true", help="Only validate best.pt, skip training")
    parser.add_argument("--tune", action="store_true", help="Run hyperparameter search (requires ray[tune])")
    parser.add_argument("--tune-epochs", type=int, default=50, help="Epochs per tuning trial")
    parser.add_argument("--tune-iterations", type=int, default=300, help="Number of tuning trials")
    args = parser.parse_args()

    if args.export_only:
        export_edge()
    elif args.validate_only:
        data_yaml = args.data or create_sample_data_yaml()
        validate(data_yaml=data_yaml, img_size=args.img_size, device=args.device)
    elif args.tune:
        data_yaml = args.data or create_sample_data_yaml()
        tune(
            data_yaml=data_yaml,
            model_size=args.model,
            tune_epochs=args.tune_epochs,
            iterations=args.tune_iterations,
            device=args.device,
            img_size=args.img_size,
        )
    elif args.resume:
        train(resume=args.resume, data_yaml="")
    else:
        data_yaml = args.data or create_sample_data_yaml()
        train(
            data_yaml=data_yaml,
            model_size=args.model,
            epochs=args.epochs,
            batch=args.batch,
            img_size=args.img_size,
            device=args.device,
            freeze=args.freeze,
            cache=args.cache,
        )
