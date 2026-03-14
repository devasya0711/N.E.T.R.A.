"""
NETRA — GPS Geotagging & Structured Data Output
Generates mock GPS coordinates and packages each confirmed pothole
detection into a JSON-serialisable record with a unique Pothole ID.
"""

import hashlib
import json
import csv
import random
import uuid
from datetime import datetime, timezone

import numpy as np

import config


class GPSTagger:
    """
    Simulates GPS geotagging by assigning coordinates derived from
    a base location with small random offsets (representing real
    dash-cam GPS drift).  Outputs structured JSON detection records.
    """

    def __init__(
        self,
        lat_base: float = config.MOCK_GPS_LAT_BASE,
        lon_base: float = config.MOCK_GPS_LON_BASE,
    ):
        self.lat_base = lat_base
        self.lon_base = lon_base
        self._frame_counter = 0

    # ──────────────────── mock GPS coordinate ───────────────────

    def get_mock_gps(self) -> tuple[float, float]:
        """
        Return a mock GPS position near the base with small jitter.
        In production, this would read from a USB GPS dongle.
        """
        self._frame_counter += 1
        lat = self.lat_base + random.gauss(0, 0.0005)
        lon = self.lon_base + random.gauss(0, 0.0005)
        return round(lat, 6), round(lon, 6)

    # ──────────────────── structured record ─────────────────────

    @staticmethod
    def build_record(
        detection: dict,
        depth_stats: dict,
        severity: dict,
        gps: tuple[float, float],
        frame_index: int = 0,
    ) -> dict:
        """
        Package a single pothole detection into a structured JSON
        record ready for API transmission or database storage.

        Args:
            detection:   Dict from PotholeDetector / Tracker.
            depth_stats: Dict from DepthEstimator.analyse_pothole_depth.
            severity:    Dict from SeverityScorer.score.
            gps:         (latitude, longitude).
            frame_index: Video frame number.

        Returns:
            Structured dict (JSON-serialisable).
        """
        pothole_id = str(uuid.uuid4())[:12].upper()

        record = {
            "pothole_id": f"NETRA-{pothole_id}",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "frame_index": frame_index,
            "gps": {
                "latitude": gps[0],
                "longitude": gps[1],
            },
            "detection": {
                "bbox": detection.get("bbox"),
                "confidence": detection.get("confidence"),
                "area_px": detection.get("area_px"),
                "track_id": detection.get("track_id"),
                "track_hits": detection.get("track_hits"),
            },
            "depth": {
                "max_depth_rel": depth_stats.get("max_depth_rel"),
                "mean_depth_rel": depth_stats.get("mean_depth_rel"),
                "diameter_px": depth_stats.get("diameter_px"),
                "bbox_width_px": depth_stats.get("bbox_width_px"),
                "bbox_height_px": depth_stats.get("bbox_height_px"),
            },
            "severity": severity,
        }
        return record

    # ───────────────── batch export ─────────────────────────────

    @staticmethod
    def export_json(records: list[dict], path: str):
        """Write a list of detection records to a JSON file."""

        class _Encoder(json.JSONEncoder):
            def default(self, obj):
                if isinstance(obj, np.integer):
                    return int(obj)
                if isinstance(obj, np.floating):
                    return float(obj)
                if isinstance(obj, np.ndarray):
                    return obj.tolist()
                return super().default(obj)

        with open(path, "w") as f:
            json.dump(records, f, indent=2, cls=_Encoder)

    # ───────────────── GPS fingerprint for loop closure ─────────


    @staticmethod
    def export_csv(records: list[dict], path: str):
        import csv
        if not records:
            return
            
        headers = [
            "Pothole ID", "Timestamp", "Frame Index", "Latitude", "Longitude",
            "Severity Label", "Severity Score", "Max Depth", "Loop Closure"
        ]
        
        with open(path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(headers)
            for r in records:
                writer.writerow([
                    r.get("pothole_id", ""),
                    r.get("timestamp", ""),
                    r.get("frame_index", ""),
                    r.get("gps", {}).get("latitude", ""),
                    r.get("gps", {}).get("longitude", ""),
                    r.get("severity", {}).get("label", ""),
                    r.get("severity", {}).get("final_score", ""),
                    r.get("depth", {}).get("max_depth_rel", ""),
                    r.get("loop_closure", {}).get("status", "")
                ])

    @staticmethod
    def gps_fingerprint(lat: float, lon: float, precision: int = 4) -> str:
        """
        Produce a reproducible hash for a GPS cell so that nearby
        coordinates map to the same bucket.
        """
        key = f"{round(lat, precision)}:{round(lon, precision)}"
        return hashlib.sha256(key.encode()).hexdigest()[:16]
