"""
NETRA — Temporal Frame Tracker (IoU-based ByteTrack-style)
Tracks pothole detections across consecutive frames.  A detection
is promoted to "confirmed" only after it persists for N frames,
eliminating false positives from shadows, puddles, or single-frame
noise.
"""

from dataclasses import dataclass, field
import numpy as np

import config


def _iou(box_a: list[int], box_b: list[int]) -> float:
    """Compute IoU between two [x1, y1, x2, y2] boxes."""
    xa = max(box_a[0], box_b[0])
    ya = max(box_a[1], box_b[1])
    xb = min(box_a[2], box_b[2])
    yb = min(box_a[3], box_b[3])
    inter = max(0, xb - xa) * max(0, yb - ya)
    area_a = (box_a[2] - box_a[0]) * (box_a[3] - box_a[1])
    area_b = (box_b[2] - box_b[0]) * (box_b[3] - box_b[1])
    union = area_a + area_b - inter
    return inter / union if union > 0 else 0.0


@dataclass
class Track:
    """Internal state for a single tracked pothole."""
    track_id: int
    bbox: list[int]
    hits: int = 1               # consecutive frames seen
    age: int = 0                # frames since last match
    confirmed: bool = False
    last_detection: dict = field(default_factory=dict)


class TemporalTracker:
    """
    Lightweight ByteTrack-style IoU tracker.

    A detection is only promoted to *confirmed* status once it has
    been consistently matched across `confirm_frames` consecutive
    frames.  This virtually eliminates false positives from shadows,
    water puddles, or single-frame sensor glitches.
    """

    def __init__(
        self,
        confirm_frames: int = config.TRACK_CONFIRM_FRAMES,
        max_age: int = config.TRACK_MAX_AGE,
        iou_threshold: float = config.TRACK_IOU_THRESHOLD,
    ):
        self.confirm_frames = confirm_frames
        self.max_age = max_age
        self.iou_threshold = iou_threshold
        self._tracks: list[Track] = []
        self._next_id: int = 1

    # ────────────────────────── public API ──────────────────────

    def update(self, detections: list[dict]) -> list[dict]:
        """
        Match current-frame detections to existing tracks.

        Args:
            detections: List of detection dicts from PotholeDetector.

        Returns:
            confirmed: List of detection dicts that have been
                       consistently seen for ≥ N frames.  Each dict
                       gets an extra key ``track_id``.
        """
        # ── Step 1: build cost matrix (IoU) ──
        det_boxes = [d["bbox"] for d in detections]
        cost = np.zeros((len(self._tracks), len(detections)))
        for ti, trk in enumerate(self._tracks):
            for di, dbox in enumerate(det_boxes):
                cost[ti, di] = _iou(trk.bbox, dbox)

        # ── Step 2: greedy assignment (highest IoU first) ──
        matched_t: set[int] = set()
        matched_d: set[int] = set()
        # Flatten and sort by descending IoU
        pairs = [
            (ti, di, cost[ti, di])
            for ti in range(len(self._tracks))
            for di in range(len(detections))
        ]
        pairs.sort(key=lambda x: x[2], reverse=True)

        for ti, di, iou_val in pairs:
            if ti in matched_t or di in matched_d:
                continue
            if iou_val < self.iou_threshold:
                break
            # Match!
            self._tracks[ti].bbox = det_boxes[di]
            self._tracks[ti].hits += 1
            self._tracks[ti].age = 0
            self._tracks[ti].last_detection = detections[di]
            if self._tracks[ti].hits >= self.confirm_frames:
                self._tracks[ti].confirmed = True
            matched_t.add(ti)
            matched_d.add(di)

        # ── Step 3: create new tracks for unmatched detections ──
        for di in range(len(detections)):
            if di not in matched_d:
                self._tracks.append(Track(
                    track_id=self._next_id,
                    bbox=det_boxes[di],
                    last_detection=detections[di],
                ))
                self._next_id += 1

        # ── Step 4: age out unmatched tracks ──
        for ti in range(len(self._tracks)):
            if ti not in matched_t:
                self._tracks[ti].age += 1

        self._tracks = [t for t in self._tracks if t.age <= self.max_age]

        # ── Step 5: return confirmed detections ──
        confirmed: list[dict] = []
        for trk in self._tracks:
            if trk.confirmed and trk.age == 0:
                det = dict(trk.last_detection)
                det["track_id"] = trk.track_id
                det["track_hits"] = trk.hits
                confirmed.append(det)

        return confirmed

    def reset(self):
        """Clear all tracks (e.g. on scene change)."""
        self._tracks.clear()
        self._next_id = 1
