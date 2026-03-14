"""
NETRA — Loop Closure & Repair Verification Module
Compares new detections against a saved "baseline" database at the
same GPS coordinates. Determines whether:
    • The pothole still exists (escalate priority).
    • A repair has occurred (close the ticket).
    • A new pothole has appeared.
"""

import json
import math
from pathlib import Path
from datetime import datetime, timezone

import config


def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance in metres between two GPS points."""
    R = 6_371_000  # Earth radius in metres
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))


class LoopClosureEngine:
    """
    Maintains a baseline database of previously detected potholes.
    On each new confirmed detection it checks:

    1. **Match** — a baseline exists within GPS_MATCH_RADIUS_M:
       • If severity is similar → "PERSISTS" (auto-escalate).
       • If new confidence / area is much smaller → "REPAIRED".
    2. **No match** — "NEW" detection → insert into baseline.
    """

    def __init__(self, db_path: str = str(config.BASELINE_DB_PATH)):
        self.db_path = Path(db_path)
        self.baselines: list[dict] = self._load()

    # ───────────────────── persistence ──────────────────────────

    def _load(self) -> list[dict]:
        if self.db_path.exists():
            try:
                with open(self.db_path) as f:
                    return json.load(f)
            except (json.JSONDecodeError, ValueError):
                return []
        return []

    def _save(self):
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        with open(self.db_path, "w") as f:
            json.dump(self.baselines, f, indent=2)

    # ───────────────────── core logic ───────────────────────────

    def check(
        self,
        record: dict,
        radius_m: float = config.GPS_MATCH_RADIUS_M,
        repair_area_ratio: float = 0.25,
    ) -> dict:
        """
        Compare a new detection record against baselines.

        Args:
            record:            Structured detection record from GPSTagger.
            radius_m:          GPS matching radius in metres.
            repair_area_ratio: If new area / baseline area < this,
                               consider it repaired.

        Returns:
            {
                "status":       "NEW" | "PERSISTS" | "REPAIRED",
                "baseline_id":  str | None,
                "action":       str,  # recommended action
            }
        """
        new_lat = record["gps"]["latitude"]
        new_lon = record["gps"]["longitude"]
        new_area = record["detection"]["area_px"] or 0

        best_match = None
        best_dist = float("inf")

        for bl in self.baselines:
            bl_lat = bl["gps"]["latitude"]
            bl_lon = bl["gps"]["longitude"]
            dist = _haversine(new_lat, new_lon, bl_lat, bl_lon)
            if dist < radius_m and dist < best_dist:
                best_dist = dist
                best_match = bl

        if best_match is None:
            # New pothole — add to baseline
            self.baselines.append(record)
            self._save()
            return {
                "status": "NEW",
                "baseline_id": None,
                "action": "Log new pothole and create work order.",
            }

        bl_area = best_match["detection"]["area_px"] or 1

        if new_area / bl_area < repair_area_ratio:
            # Pothole likely repaired
            best_match["_closed"] = True
            best_match["_closed_at"] = datetime.now(timezone.utc).isoformat()
            self._save()
            return {
                "status": "REPAIRED",
                "baseline_id": best_match["pothole_id"],
                "action": "Mark work order as resolved.",
            }

        # Still there — escalate
        best_match["severity"] = record["severity"]
        best_match["_last_seen"] = datetime.now(timezone.utc).isoformat()
        self._save()
        return {
            "status": "PERSISTS",
            "baseline_id": best_match["pothole_id"],
            "action": (
                f"Escalate priority — pothole persists "
                f"(severity {record['severity'].get('label', '?')})."
            ),
        }
