# NETRA — Autonomous Pothole Intelligence System

> **N**eural **E**ngine for **T**errain **R**ecognition & **A**nalysis

A real-time, edge-optimised pipeline that detects, segments, measures, and triages road potholes from dash-cam video using YOLOv8 instance segmentation, monocular depth estimation, and temporal tracking.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        NETRA  Pipeline                              │
│                                                                     │
│  Video Frame                                                        │
│      │                                                              │
│      ├──► [1] PotholeDetector (YOLOv8-seg)  ──► raw detections      │
│      │                                              │               │
│      │                                    [2] TemporalTracker       │
│      │                                    (ByteTrack-style IoU)     │
│      │                                              │               │
│      │                                      confirmed only          │
│      │                                      (≥ N frames)            │
│      │                                              │               │
│      ├──► [3] DepthEstimator (MiDaS)  ──► depth map │               │
│      │                                        │     │               │
│      │                                        ▼     ▼               │
│      │                              [4] Depth Analysis per mask     │
│      │                                        │                     │
│      │                                        ▼                     │
│      │                              [5] SeverityScorer              │
│      │                                  (area+depth+traffic)        │
│      │                                        │                     │
│      │                                        ▼                     │
│      │                              [6] GPSTagger → JSON record     │
│      │                                        │                     │
│      │                                        ▼                     │
│      │                              [7] LoopClosureEngine           │
│      │                                  (repair verification)       │
│      │                                        │                     │
│      │                                        ▼                     │
│      └──────────────────────────► [8] MeshGenerator (3D PLY/OBJ)    │
│                                                                     │
│  Output: Structured JSON + 3D Point Clouds + Annotated Video        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
NETRA/
├── config.py            # Global hyperparameters & paths
├── detector.py          # YOLOv8 instance segmentation inference
├── depth_estimator.py   # MiDaS monocular depth estimation
├── tracker.py           # Temporal frame tracker (ByteTrack-style)
├── severity.py          # Multi-factor severity triage engine
├── gps_tagger.py        # GPS geotagging & JSON structuring
├── loop_closure.py      # Baseline comparison & repair verification
├── mesh_generator.py    # 3D point cloud & mesh export (PLY/OBJ)
├── pipeline.py          # Main orchestrator & CLI entry point
├── train.py             # Fine-tuning & edge export script
├── requirements.txt     # Python dependencies
└── README.md
```

---

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Run on a Video File

```bash
python pipeline.py --source road_video.mp4
```

### 3. Run on Webcam

```bash
python pipeline.py --source 0
```

### 4. Run Headless with 3D Mesh Export

```bash
python pipeline.py --source road_video.mp4 --mesh --no-gui
```

---

## Training & Fine-Tuning

### Dataset Preparation

NETRA expects a YOLO-format instance segmentation dataset:

```
datasets/pothole-seg/
├── data.yaml
├── train/
│   ├── images/    # .jpg / .png frames
│   └── labels/    # .txt polygon annotations
└── val/
    ├── images/
    └── labels/
```

**Label format** (one line per pothole instance):
```
<class_id> <x1> <y1> <x2> <y2> ... <xN> <yN>
```
Where `(xi, yi)` are normalised polygon vertices and `class_id = 0` for pothole.

### Recommended Datasets

| Dataset | Source |
|---------|--------|
| Pothole Detection Dataset | Roboflow Universe |
| Indian Roads Pothole Dataset | Kaggle |
| Road Damage Detection 2022 | IEEE Big Data Cup |

### Train

```bash
# Generate template data.yaml (first time)
python train.py

# Fine-tune on your dataset
python train.py --data datasets/pothole-seg/data.yaml --epochs 100 --batch 16

# Export for edge deployment
python train.py --export-only
```

### Edge Export Formats

| Format | Target Hardware | Command |
|--------|----------------|---------|
| ONNX | Universal (CPU/GPU) | Built-in |
| TensorRT | NVIDIA Jetson / dashcam | Uncomment in `train.py` |
| TFLite | Coral Edge TPU / Android | Uncomment in `train.py` |
| NCNN | ARM microcontrollers | Uncomment in `train.py` |

---

## Module Reference

### `PotholeDetector` — detector.py

```python
detector = PotholeDetector(model_path="weights/yolov8n-seg.pt")
detections = detector.detect(frame)
# Each detection: {bbox, confidence, mask, polygon, area_px}
```

### `DepthEstimator` — depth_estimator.py

```python
depth_est = DepthEstimator(model_type="MiDaS_small")
depth_map = depth_est.estimate(frame)  # (H, W) normalised [0, 1]
stats = DepthEstimator.analyse_pothole_depth(depth_map, mask, polygon)
# stats: {max_depth_rel, mean_depth_rel, diameter_px, bbox_width_px, bbox_height_px}
```

### `TemporalTracker` — tracker.py

```python
tracker = TemporalTracker(confirm_frames=5)
confirmed = tracker.update(raw_detections)
# Only returns detections seen in ≥ 5 consecutive frames
```

### `SeverityScorer` — severity.py

```python
scorer = SeverityScorer()
result = scorer.score(area_px=12000, max_depth=0.7, traffic_density=0.8)
# result: {score: 0.73, label: "Critical", factors: {...}}
```

### `MeshGenerator` — mesh_generator.py

```python
mesh_gen = MeshGenerator()
points = mesh_gen.generate_pointcloud(depth_map, mask, rgb_frame)
MeshGenerator.export_ply("pothole.ply", points)

vertices, faces = mesh_gen.generate_mesh(depth_map, mask)
MeshGenerator.export_obj("pothole.obj", vertices, faces)
```

### `LoopClosureEngine` — loop_closure.py

```python
engine = LoopClosureEngine()
result = engine.check(detection_record)
# result: {status: "NEW"|"PERSISTS"|"REPAIRED", baseline_id, action}
```

---

## Output Format

Each confirmed detection produces a JSON record:

```json
{
  "pothole_id": "NETRA-A3F2B8C1D4E5",
  "timestamp": "2026-03-10T14:22:31.456789+00:00",
  "frame_index": 142,
  "gps": {
    "latitude": 28.6142,
    "longitude": 77.2087
  },
  "detection": {
    "bbox": [120, 340, 280, 420],
    "confidence": 0.8723,
    "area_px": 14520,
    "track_id": 3,
    "track_hits": 7
  },
  "depth": {
    "max_depth_rel": 0.6821,
    "mean_depth_rel": 0.4103,
    "diameter_px": 156,
    "bbox_width_px": 160,
    "bbox_height_px": 80
  },
  "severity": {
    "score": 0.6845,
    "label": "Critical",
    "factors": {
      "area_norm": 0.1815,
      "depth_norm": 0.6821,
      "traffic_norm": 0.75
    }
  },
  "loop_closure": {
    "status": "NEW",
    "baseline_id": null,
    "action": "Log new pothole and create work order."
  }
}
```

---

## Severity Formula

$$
S = w_{\text{area}} \cdot \frac{A}{A_{\max}} + w_{\text{depth}} \cdot \frac{D_{\max}}{D_{\text{ref}}} + w_{\text{traffic}} \cdot T
$$

| Weight | Default | Component |
|--------|---------|-----------|
| $w_{\text{area}}$ | 0.35 | Segmented mask area |
| $w_{\text{depth}}$ | 0.40 | Max relative depth |
| $w_{\text{traffic}}$ | 0.25 | Traffic density + hub proximity |

| Label | Score Range |
|-------|-------------|
| Minor | $[0.0, 0.35)$ |
| Moderate | $[0.35, 0.65)$ |
| Critical | $[0.65, 1.0]$ |

---

## Edge Deployment Notes

- **Model**: YOLOv8n-seg (nano) — 3.4M parameters, ~6 ms on Jetson Nano
- **Depth**: MiDaS_small — ~20 ms on Jetson Nano
- **Quantisation**: INT8 via TensorRT for 2–3× speedup
- **Memory**: < 500 MB peak RAM for full pipeline
- The `model.fuse()` call in `PotholeDetector` merges Conv+BN layers for faster inference

---

## License

MIT
