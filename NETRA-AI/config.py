"""
NETRA — Autonomous Pothole Intelligence System
Global configuration constants and tunable hyperparameters.
"""
from pathlib import Path
import torch

# ──────────────────────────────────────────────────────────────
# Paths
# ──────────────────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent
WEIGHTS_DIR = PROJECT_ROOT / "weights"
OUTPUT_DIR = PROJECT_ROOT / "output"
BASELINE_DB_PATH = OUTPUT_DIR / "baseline_detections.json"

# ──────────────────────────────────────────────────────────────
# YOLO Instance-Segmentation
# ──────────────────────────────────────────────────────────────
YOLO_MODEL_PATH = str(WEIGHTS_DIR / "best.pt")  # fine-tuned on pothole data
# Lower confidence (0.25) to maximise recall; the temporal tracker
# filters false positives so we can afford to be generous here.
YOLO_CONF_THRESHOLD = 0.25
YOLO_IOU_THRESHOLD = 0.45
YOLO_IMG_SIZE = 960            # Restored to 960 for perfect masks & finding smaller potholes
YOLO_DEVICE = "cuda:0" if torch.cuda.is_available() else "cpu"
YOLO_TTA = True                  # Enabled Test-Time Augmentation for high quality robust segmentation
YOLO_CLAHE = True               # CLAHE contrast enhancement before inference
POTHOLE_CLASS_ID = 0  # class index after fine-tuning on pothole dataset

# ──────────────────────────────────────────────────────────────
# Depth Estimation (MiDaS / Depth Anything)
# ──────────────────────────────────────────────────────────────
DEPTH_MODEL_TYPE = "MiDaS_small"   # more accurate than MiDaS_small
DEPTH_DEVICE = "cuda:0" if torch.cuda.is_available() else "cpu"

# ──────────────────────────────────────────────────────────────
# Temporal Tracking
# ──────────────────────────────────────────────────────────────
TRACK_CONFIRM_FRAMES = 3       # reduced from 5: TTA gives higher-quality detections
TRACK_MAX_AGE = 30             # max frames to keep lost track alive
TRACK_IOU_THRESHOLD = 0.25    # slightly more lenient to handle motion between frames

# ──────────────────────────────────────────────────────────────
# Severity Scoring
# ──────────────────────────────────────────────────────────────
SEVERITY_AREA_WEIGHT = 0.35
SEVERITY_DEPTH_WEIGHT = 0.40
SEVERITY_TRAFFIC_WEIGHT = 0.25

SEVERITY_THRESHOLDS = {
    "Minor":    (0.0, 0.35),
    "Moderate": (0.35, 0.65),
    "Critical": (0.65, 1.0),
}

# ──────────────────────────────────────────────────────────────
# Segmentation Visualization
# ──────────────────────────────────────────────────────────────
SEG_MASK_ALPHA = 0.45           # transparency for mask overlay (0=invisible, 1=opaque)
SEG_CONTOUR_THICKNESS = 2       # polygon contour line thickness
SEG_SHOW_AREA = True            # show area (px²) on label
SEG_SHOW_DIAMETER = True        # show diameter (px) on label
SEG_COLOR_PALETTE = [           # BGR — single uniform blue for all masks
    (255, 85, 0),     # vivid blue
]

# ──────────────────────────────────────────────────────────────
# GPS Mock
# ──────────────────────────────────────────────────────────────
MOCK_GPS_LAT_BASE = 28.6139    # New Delhi latitude
MOCK_GPS_LON_BASE = 77.2090    # New Delhi longitude
GPS_MATCH_RADIUS_M = 10.0      # metres – radius for loop closure

# ──────────────────────────────────────────────────────────────
# 3D Mesh / Point Cloud
# ──────────────────────────────────────────────────────────────
INTRINSIC_FX = 500.0  # focal length x (mock camera intrinsics)
INTRINSIC_FY = 500.0
INTRINSIC_CX = 320.0  # principal point
INTRINSIC_CY = 240.0

# ──────────────────────────────────────────────────────────────
# Export / ONNX (edge optimisation)
# ──────────────────────────────────────────────────────────────
ONNX_EXPORT_PATH = str(WEIGHTS_DIR / "yolov8n-seg.onnx")
ONNX_OPSET = 12
