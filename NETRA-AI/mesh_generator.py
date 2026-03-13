"""
NETRA — 3D Structural Mesh & Point Cloud Generator
Converts 2D segmentation mask + monocular depth map into:
    • 3D point cloud (PLY export, CAD-compatible)
    • Optional triangle mesh for the "Micro-Scan" drone pipeline
"""

import numpy as np
import config


class MeshGenerator:
    """
    Back-projects pothole mask pixels into 3D using the depth map and
    camera intrinsics, producing a point cloud or triangle mesh.
    """

    def __init__(
        self,
        fx: float = config.INTRINSIC_FX,
        fy: float = config.INTRINSIC_FY,
        cx: float = config.INTRINSIC_CX,
        cy: float = config.INTRINSIC_CY,
        depth_scale: float = 10.0,  # maps normalised depth → metres
    ):
        self.fx = fx
        self.fy = fy
        self.cx = cx
        self.cy = cy
        self.depth_scale = depth_scale

    # ──────────────────── point cloud generation ────────────────

    def generate_pointcloud(
        self,
        depth_map: np.ndarray,
        mask: np.ndarray,
        rgb_frame: np.ndarray | None = None,
    ) -> np.ndarray:
        """
        Back-project masked depth pixels → 3D point cloud.

        Args:
            depth_map:  Normalised depth (H, W) — higher = closer.
            mask:       Boolean (H, W) pothole mask.
            rgb_frame:  Optional colour frame for coloured points.

        Returns:
            points: np.ndarray of shape (N, 6) — [X, Y, Z, R, G, B]
                    or (N, 3) if no colour is provided.
        """
        ys, xs = np.where(mask)
        if len(xs) == 0:
            return np.empty((0, 3))

        # Invert MiDaS output: higher inverse-depth = closer,
        # so physical depth Z is proportional to (1 / inv_depth).
        inv_depth = depth_map[ys, xs]
        safe_inv = np.clip(inv_depth, 1e-4, None)
        Z = self.depth_scale / safe_inv

        X = (xs.astype(float) - self.cx) * Z / self.fx
        Y = (ys.astype(float) - self.cy) * Z / self.fy

        points = np.stack([X, Y, Z], axis=-1)  # (N, 3)

        if rgb_frame is not None:
            colours = rgb_frame[ys, xs]  # (N, 3) uint8
            points = np.hstack([points, colours.astype(float)])

        return points

    # ───────────────── triangle mesh (simple grid) ──────────────

    def generate_mesh(
        self,
        depth_map: np.ndarray,
        mask: np.ndarray,
    ) -> tuple[np.ndarray, np.ndarray]:
        """
        Build a simple triangle mesh from the masked region.

        Returns:
            vertices: (N, 3)
            faces:    (M, 3) — triangle vertex indices
        """
        ys, xs = np.where(mask)
        if len(xs) < 4:
            return np.empty((0, 3)), np.empty((0, 3), dtype=int)

        # Build a local grid map: pixel coord → vertex index
        coord_to_idx = {}
        for idx, (y, x) in enumerate(zip(ys, xs)):
            coord_to_idx[(y, x)] = idx

        inv_depth = depth_map[ys, xs]
        safe_inv = np.clip(inv_depth, 1e-4, None)
        Z = self.depth_scale / safe_inv
        X = (xs.astype(float) - self.cx) * Z / self.fx
        Y = (ys.astype(float) - self.cy) * Z / self.fy
        vertices = np.stack([X, Y, Z], axis=-1)

        faces = []
        for y, x in zip(ys, xs):
            # Build two triangles per quad (y,x)→(y+1,x)→(y,x+1)→(y+1,x+1)
            i00 = coord_to_idx.get((y, x))
            i10 = coord_to_idx.get((y + 1, x))
            i01 = coord_to_idx.get((y, x + 1))
            i11 = coord_to_idx.get((y + 1, x + 1))
            if i00 is not None and i10 is not None and i01 is not None:
                faces.append([i00, i10, i01])
            if i10 is not None and i11 is not None and i01 is not None:
                faces.append([i10, i11, i01])

        return vertices, np.array(faces, dtype=int) if faces else np.empty((0, 3), dtype=int)

    # ───────────────────── PLY export ───────────────────────────

    @staticmethod
    def export_ply(path: str, points: np.ndarray):
        """
        Write a point cloud to PLY (ASCII) for CAD / MeshLab import.

        Args:
            path:   Output file path (.ply).
            points: (N, 3) or (N, 6) array — XYZ [+ RGB].
        """
        has_colour = points.shape[1] >= 6
        n = len(points)

        header = (
            "ply\n"
            "format ascii 1.0\n"
            f"element vertex {n}\n"
            "property float x\n"
            "property float y\n"
            "property float z\n"
        )
        if has_colour:
            header += (
                "property uchar red\n"
                "property uchar green\n"
                "property uchar blue\n"
            )
        header += "end_header\n"

        with open(path, "w") as f:
            f.write(header)
            for pt in points:
                if has_colour:
                    f.write(
                        f"{pt[0]:.6f} {pt[1]:.6f} {pt[2]:.6f} "
                        f"{int(pt[3])} {int(pt[4])} {int(pt[5])}\n"
                    )
                else:
                    f.write(f"{pt[0]:.6f} {pt[1]:.6f} {pt[2]:.6f}\n")

    @staticmethod
    def export_obj(path: str, vertices: np.ndarray, faces: np.ndarray):
        """
        Write a triangle mesh to OBJ format (CAD-compatible).

        Args:
            path:     Output file path (.obj).
            vertices: (N, 3) vertex positions.
            faces:    (M, 3) triangle indices (0-based).
        """
        with open(path, "w") as f:
            f.write("# NETRA Pothole 3D Mesh\n")
            for v in vertices:
                f.write(f"v {v[0]:.6f} {v[1]:.6f} {v[2]:.6f}\n")
            for face in faces:
                # OBJ is 1-indexed
                f.write(f"f {face[0]+1} {face[1]+1} {face[2]+1}\n")
