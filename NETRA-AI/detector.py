"""
NETRA — YOLO Detection / Segmentation Inference Engine
Handles model loading, inference, mask extraction, and ONNX export
for edge-optimised pothole detection.
Supports both detection-only (bbox) and instance-segmentation models.
"""

import cv2
import numpy as np
import torch
from ultralytics import YOLO

import config


class PotholeDetector:
    """YOLOv8 detection/segmentation wrapper optimised for edge deployment."""

    def __init__(
        self,
        model_path: str = config.YOLO_MODEL_PATH,
        conf: float = config.YOLO_CONF_THRESHOLD,
        iou: float = config.YOLO_IOU_THRESHOLD,
        img_size: int = config.YOLO_IMG_SIZE,
        device: str = config.YOLO_DEVICE,
        target_class: int = config.POTHOLE_CLASS_ID,
        tta: bool = config.YOLO_TTA,
        clahe: bool = config.YOLO_CLAHE,
    ):
        self.conf = conf
        self.iou = iou
        self.img_size = img_size
        self.device = device
        self.target_class = target_class
        self.tta = tta
        self.clahe = clahe

        # CLAHE instance for contrast-limited adaptive histogram equalisation
        if self.clahe:
            self._clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))

        # Load the YOLO model (detect or segment)
        self.model = YOLO(model_path)
        self.is_seg = self.model.task == "segment"
        # Fuse layers for faster inference on edge
        self.model.fuse()

    # ───────────────────────── inference ─────────────────────────

    def detect(self, frame: np.ndarray) -> list[dict]:
        """
        Run detection (or segmentation) on a single BGR frame.

        Returns a list of detection dicts:
            {
                "bbox":       [x1, y1, x2, y2],
                "confidence": float,
                "mask":       np.ndarray (H×W bool),
                "polygon":    np.ndarray (N×2 int),
                "area_px":    int,
            }

        For detection-only models, an elliptical mask is synthesised
        from the bounding box to feed downstream depth & mesh modules.
        """
        # Optional CLAHE contrast enhancement (helps in shadows / low-light)
        if self.clahe:
            lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
            lab[:, :, 0] = self._clahe.apply(lab[:, :, 0])
            frame = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)

        predict_kwargs = dict(
            source=frame,
            conf=self.conf,
            iou=self.iou,
            imgsz=self.img_size,
            device=self.device,
            verbose=False,
            augment=self.tta,        # Test-Time Augmentation
        )
        if self.is_seg:
            predict_kwargs["retina_masks"] = True

        results = self.model.predict(**predict_kwargs)

        detections: list[dict] = []
        result = results[0]
        boxes = result.boxes
        if boxes is None or len(boxes) == 0:
            return detections

        has_masks = self.is_seg and result.masks is not None
        masks_data = result.masks.data.cpu().numpy() if has_masks else None

        h, w = frame.shape[:2]

        for i in range(len(boxes)):
            cls_id = int(boxes.cls[i].item())
            if cls_id != self.target_class:
                continue

            conf_score = float(boxes.conf[i].item())
            x1, y1, x2, y2 = boxes.xyxy[i].cpu().numpy().astype(int)

            if has_masks:
                # Use true segmentation mask
                mask = cv2.resize(
                    masks_data[i], (w, h),
                    interpolation=cv2.INTER_NEAREST,
                ).astype(bool)
            else:
                # Synthesise elliptical mask from bounding box
                mask = np.zeros((h, w), dtype=np.uint8)
                cx = (x1 + x2) // 2
                cy = (y1 + y2) // 2
                rx = (x2 - x1) // 2
                ry = (y2 - y1) // 2
                cv2.ellipse(mask, (cx, cy), (rx, ry), 0, 0, 360, 255, -1)
                mask = mask.astype(bool)

            # Extract polygon contour from mask
            contours, _ = cv2.findContours(
                mask.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE,
            )
            polygon = contours[0].squeeze(1) if contours else np.array([])

            detections.append({
                "bbox": [int(x1), int(y1), int(x2), int(y2)],
                "confidence": round(conf_score, 4),
                "mask": mask,
                "polygon": polygon,
                "area_px": int(mask.sum()),
            })

        return detections

    # ───────────────────────── visualisation ─────────────────────

    @staticmethod
    def draw_detections(
        frame: np.ndarray,
        detections: list[dict],
        color: tuple[int, int, int] = (0, 0, 255),
        alpha: float = config.SEG_MASK_ALPHA,
    ) -> np.ndarray:
        """
        Render pixel-accurate segmentation overlays with:
          1. Semi-transparent mask fill (per-pothole color)
          2. Polygon contour outline
          3. Bounding box
          4. Rich label: confidence, severity, depth, area, diameter
        """
        if not detections:
            return frame.copy()

        vis = frame.copy()
        overlay = frame.copy()
        palette = config.SEG_COLOR_PALETTE

        for idx, det in enumerate(detections):
            color_bgr = palette[idx % len(palette)]
            mask = det.get("mask")
            polygon = det.get("polygon")
            bbox = det["bbox"]
            x1, y1, x2, y2 = bbox

            # ── 1. Segmentation mask fill ──────────────────────────
            if mask is not None and mask.any():
                overlay[mask] = color_bgr

            # ── 2. Polygon contour ─────────────────────────────────
            if polygon is not None and len(polygon) >= 3:
                pts = polygon.reshape((-1, 1, 2)).astype(np.int32)
                cv2.polylines(
                    vis, [pts], isClosed=True,
                    color=color_bgr,
                    thickness=config.SEG_CONTOUR_THICKNESS,
                    lineType=cv2.LINE_AA,
                )

            # ── 3. Bounding box ────────────────────────────────────
            cv2.rectangle(vis, (x1, y1), (x2, y2), color_bgr, 2, cv2.LINE_AA)

            # ── 4. Build rich label ────────────────────────────────
            parts = [f"Pothole {det['confidence']:.2f}"]

            depth = det.get("last_depth", 0.0)
            sev = det.get("last_severity", "")
            if sev and sev != "Wait.":
                parts.append(sev)
                parts.append(f"D:{depth:.2f}m")

            area_px = det.get("area_px", 0)
            if config.SEG_SHOW_AREA and area_px > 0:
                parts.append(f"A:{area_px}px²")

            if config.SEG_SHOW_DIAMETER and polygon is not None and len(polygon) >= 3:
                (_, _), radius = cv2.minEnclosingCircle(polygon.astype(np.float32))
                parts.append(f"Ø:{int(radius * 2)}px")

            label = " | ".join(parts)

            # ── 5. Draw label background + text ───────────────────
            font = cv2.FONT_HERSHEY_SIMPLEX
            font_scale = 0.5
            thickness = 1
            (tw, th), baseline = cv2.getTextSize(label, font, font_scale, thickness)

            label_y = max(y1 - 8, th + 4)
            cv2.rectangle(
                vis,
                (x1, label_y - th - 4),
                (x1 + tw + 6, label_y + baseline),
                color_bgr, -1,
            )
            cv2.putText(
                vis, label,
                (x1 + 3, label_y - 2),
                font, font_scale, (255, 255, 255), thickness, cv2.LINE_AA,
            )

        # Blend the mask overlay with the drawn frame
        cv2.addWeighted(overlay, alpha, vis, 1 - alpha, 0, vis)

        return vis

    # ───────────────────────── edge export ───────────────────────

    def export_onnx(self, path: str = config.ONNX_EXPORT_PATH, opset: int = config.ONNX_OPSET):
        """Export the model to ONNX for deployment on edge devices."""
        self.model.export(format="onnx", imgsz=self.img_size, opset=opset)
        print(f"[NETRA] ONNX model exported → {path}")

    def export_engine(self):
        """Export to TensorRT engine for NVIDIA Jetson / dashcam GPUs."""
        self.model.export(format="engine", imgsz=self.img_size, half=True)
        print("[NETRA] TensorRT engine exported.")
