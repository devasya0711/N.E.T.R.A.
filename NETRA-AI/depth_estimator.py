"""
NETRA — Monocular Depth Estimation Module
Runs MiDaS (or Depth Anything) in parallel with YOLO to produce
per-pixel relative depth maps. Extracts max depth & diameter within
segmented pothole masks.
"""

import cv2
import numpy as np
import torch

import config


class DepthEstimator:
    """Monocular depth estimation via MiDaS (torch hub)."""

    def __init__(
        self,
        model_type: str = config.DEPTH_MODEL_TYPE,
        device: str = config.DEPTH_DEVICE,
    ):
        self.device = torch.device(device)

        # Load MiDaS from torch hub
        self.model = torch.hub.load(
            "intel-isl/MiDaS", model_type, trust_repo=True,
        )
        self.model.to(self.device).eval()

        # Load corresponding transforms
        midas_transforms = torch.hub.load(
            "intel-isl/MiDaS", "transforms", trust_repo=True,
        )
        if model_type in ("DPT_Large", "DPT_Hybrid"):
            self.transform = midas_transforms.dpt_transform
        else:
            self.transform = midas_transforms.small_transform

    # ───────────────────── full-frame depth map ─────────────────

    @torch.no_grad()
    def estimate(self, frame_bgr: np.ndarray) -> np.ndarray:
        """
        Compute a relative inverse-depth map for the full frame.

        Args:
            frame_bgr: Input image in BGR (OpenCV default).

        Returns:
            depth_map: np.ndarray of shape (H, W) with normalised
                       depth values in [0, 1] (higher = closer).
        """
        frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        input_batch = self.transform(frame_rgb).to(self.device)

        prediction = self.model(input_batch)

        # Resize prediction to original frame size
        depth_map = torch.nn.functional.interpolate(
            prediction.unsqueeze(1),
            size=frame_bgr.shape[:2],
            mode="bicubic",
            align_corners=False,
        ).squeeze().cpu().numpy()

        # Normalise to [0, 1]
        d_min, d_max = depth_map.min(), depth_map.max()
        if d_max - d_min > 1e-6:
            depth_map = (depth_map - d_min) / (d_max - d_min)
        else:
            depth_map = np.zeros_like(depth_map)

        return depth_map

    # ─────────────── mask-level depth & dimension stats ─────────

    @staticmethod
    def analyse_pothole_depth(
        depth_map: np.ndarray,
        mask: np.ndarray,
        polygon: np.ndarray,
    ) -> dict:
        """
        Extract depth & physical dimension estimates for one pothole.

        Args:
            depth_map: Normalised depth map (H, W) — higher = closer.
            mask:      Boolean mask (H, W) of the pothole.
            polygon:   Contour points (N, 2).

        Returns:
            dict with:
                max_depth_rel  – max relative depth inside mask
                mean_depth_rel – mean relative depth inside mask
                diameter_px    – bounding circle diameter in pixels
                bbox_width_px  – bbox width
                bbox_height_px – bbox height
        """
        masked_depth = depth_map[mask]

        if masked_depth.size == 0:
            return {
                "max_depth_rel": 0.0,
                "mean_depth_rel": 0.0,
                "diameter_px": 0,
                "bbox_width_px": 0,
                "bbox_height_px": 0,
            }

        # MiDaS returns inverse depth → higher = closer.
        # For a pothole (depression), the deepest point is the *lowest*
        # inverse-depth value inside the mask.
        # We invert so that "depth" means "how deep the hole is".
        inv_depth = 1.0 - masked_depth
        max_depth = float(np.max(inv_depth))
        mean_depth = float(np.mean(inv_depth))

        # Minimum enclosing circle for diameter estimate
        diameter_px = 0
        bbox_w, bbox_h = 0, 0
        if polygon is not None and len(polygon) >= 3:
            (_, _), radius = cv2.minEnclosingCircle(polygon.astype(np.float32))
            diameter_px = int(radius * 2)
            x, y, bbox_w, bbox_h = cv2.boundingRect(polygon)

        return {
            "max_depth_rel": round(max_depth, 4),
            "mean_depth_rel": round(mean_depth, 4),
            "diameter_px": diameter_px,
            "bbox_width_px": int(bbox_w),
            "bbox_height_px": int(bbox_h),
        }

    # ───────────────────── visualisation helper ─────────────────

    @staticmethod
    def colorise_depth(depth_map: np.ndarray) -> np.ndarray:
        """Convert normalised depth map to a coloured heatmap (BGR)."""
        depth_u8 = (depth_map * 255).astype(np.uint8)
        return cv2.applyColorMap(depth_u8, cv2.COLORMAP_MAGMA)
