"""
NETRA — Severity Triage Engine (The Brain)
Computes a dynamic risk score by fusing:
    • Segmented area (from YOLO mask)
    • Maximum relative depth (from monocular depth model)
    • Localised traffic density & hub proximity (mock variable)
Outputs a normalised score ∈ [0, 1] and a categorical label.
"""

import config


class SeverityScorer:
    """
    Multi-factor severity scoring for detected potholes.

    Score = w_area × area_norm + w_depth × depth_norm + w_traffic × traffic_norm

    Where each component is individually normalised to [0, 1].
    """

    def __init__(
        self,
        w_area: float = config.SEVERITY_AREA_WEIGHT,
        w_depth: float = config.SEVERITY_DEPTH_WEIGHT,
        w_traffic: float = config.SEVERITY_TRAFFIC_WEIGHT,
        thresholds: dict = None,
        # Reference values for normalisation
        max_area_px: int = 80_000,   # pixel² considered extreme
        max_depth_rel: float = 1.0,  # already normalised
    ):
        self.w_area = w_area
        self.w_depth = w_depth
        self.w_traffic = w_traffic
        self.thresholds = thresholds or config.SEVERITY_THRESHOLDS
        self.max_area_px = max_area_px
        self.max_depth_rel = max_depth_rel

    # ────────────────────────── scoring ─────────────────────────

    def score(
        self,
        area_px: int,
        max_depth: float,
        traffic_density: float = 0.5,
    ) -> dict:
        """
        Compute severity.

        Args:
            area_px:          Segmented mask area in pixels.
            max_depth:        Maximum relative depth inside the mask
                              (0 = flush with road, 1 = very deep).
            traffic_density:  Normalised mock variable ∈ [0, 1]
                              combining traffic volume and proximity
                              to transit hubs / hospitals / schools.

        Returns:
            {
                "score":    float ∈ [0, 1],
                "label":    "Minor" | "Moderate" | "Critical",
                "factors":  {area_norm, depth_norm, traffic_norm},
            }
        """
        area_norm = min(area_px / self.max_area_px, 1.0)
        depth_norm = min(max_depth / self.max_depth_rel, 1.0)
        traffic_norm = float(max(0.0, min(traffic_density, 1.0)))

        raw = (
            self.w_area * area_norm
            + self.w_depth * depth_norm
            + self.w_traffic * traffic_norm
        )
        score = round(max(0.0, min(raw, 1.0)), 4)

        label = self._classify(score)

        return {
            "score": score,
            "label": label,
            "factors": {
                "area_norm": round(area_norm, 4),
                "depth_norm": round(depth_norm, 4),
                "traffic_norm": round(traffic_norm, 4),
            },
        }

    # ───────────────────── classification ───────────────────────

    def _classify(self, score: float) -> str:
        for label, (lo, hi) in self.thresholds.items():
            if lo <= score < hi:
                return label
        return "Critical"  # fallback for score == 1.0
