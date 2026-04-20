"""drawing-to-3d V2: closed-shape extraction + AI-driven iterative refinement.

Pipeline (OpenCV + Shapely + trimesh):
  1. Read raster image (PNG/JPG/BMP).
  2. Grayscale -> adaptive threshold -> morphological close to seal gaps.
  3. Extract external contours (cv2.RETR_EXTERNAL), filter by area,
     simplify via Douglas-Peucker.
  4. Build Shapely Polygons (drawing units = pixels).
  5. Scale pixels -> mm via `scaleMmPerPixel`.
  6. Optional rotation (`rotateDeg`) applied in XY before extrude.
  7. Extrude each polygon to `extrudeMm` via trimesh.
  8. Concatenate meshes -> STL + OpenSCAD source.

V2 additions (on top of V1):
  - AI feedback loop: when caller passes `userFeedback` + `iterationId`, the
    handler asks the configured `aiBackend` (ollama / claude / lmstudio /
    rule_based) for a parameter-delta dict, merges it with the current
    params, and re-extracts. The prior result is persisted to
    /tmp/drawing-to-3d-history/<iterationId>.json so the next iteration can
    build on top of it instead of from the raw defaults.
  - Rotation via `rotateDeg` parameter (0..360, applied before extrusion).
  - Method tag switches to "drawing-to-3d-v2" on iterative calls; first
    call still reports "drawing-to-3d-v2-initial".

Limitations (documented, not silent):
  - Only outermost outlines; no holes / nested shapes (TODO: handle hierarchy).
  - No dimension OCR -- scale is uniform across the drawing.
  - Iteration history lives in /tmp and does not survive a reboot; a durable
    backing store (Postgres / Railway volume) is out of scope here.
  - SVG / PDF inputs are not yet supported (raise ValueError).
"""
from __future__ import annotations

import json
import math
import os
import sys
import tempfile
from typing import List, Optional, Tuple

import cv2
import numpy as np
import trimesh
from PIL import Image
from shapely.affinity import rotate as shp_rotate
from shapely.geometry import Polygon

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from lib.ai_backends import suggest_params, rule_based  # noqa: E402


HISTORY_ROOT = os.environ.get(
    "DRAWING_TO_3D_HISTORY_DIR",
    os.path.join(tempfile.gettempdir(), "drawing-to-3d-history"),
)


def handle(params: dict) -> dict:
    drawing_path = params.get("drawingPath") or params.get("filePath") or ""
    if not drawing_path:
        raise ValueError("drawingPath is required")
    if not os.path.isfile(drawing_path):
        raise FileNotFoundError(f"Drawing not found: {drawing_path}")

    iteration_id: Optional[str] = params.get("iterationId")
    user_feedback: Optional[str] = params.get("userFeedback")
    ai_backend: str = (params.get("aiBackend") or "rule_based").lower()

    # Start with the caller's params (or history defaults) then apply AI delta.
    prior = _load_history(iteration_id) if iteration_id else None
    base_params = {
        "extrudeMm": float(params.get("extrudeMm", (prior or {}).get("extrudeMm", 5.0))),
        "scaleMmPerPixel": float(params.get("scaleMmPerPixel", (prior or {}).get("scaleMmPerPixel", 0.1))),
        "minAreaPx": int(params.get("minAreaPx", (prior or {}).get("minAreaPx", 100))),
        "rotateDeg": float(params.get("rotateDeg", (prior or {}).get("rotateDeg", 0.0))),
    }
    epsilon_frac = float(params.get("simplifyEpsilonFrac", 0.005))

    ai_delta: dict = {}
    if user_feedback:
        try:
            ai_delta = suggest_params(ai_backend, user_feedback, base_params)
        except Exception as e:
            ai_delta = rule_based(user_feedback, base_params)
            print(f"drawing-to-3d: AI backend failed, fell back to rule_based ({e})")
    effective = {**base_params, **ai_delta}

    img = _load_grayscale(drawing_path)
    polygons = _extract_polygons(
        img,
        min_area_px=effective["minAreaPx"],
        epsilon_frac=epsilon_frac,
    )

    if not polygons:
        return _empty_result(
            drawing_path,
            iteration_id,
            effective,
            ai_delta,
            ai_backend,
            warning="No closed outlines detected. Adjust drawing contrast or pass smaller minAreaPx.",
        )

    meshes: List[trimesh.Trimesh] = []
    for poly in polygons:
        scaled = _scale_polygon(poly, effective["scaleMmPerPixel"], effective["rotateDeg"])
        try:
            extruded = trimesh.creation.extrude_polygon(scaled, effective["extrudeMm"])
            meshes.append(extruded)
        except Exception as e:
            print(f"drawing-to-3d: skipping polygon ({e})")

    if not meshes:
        return _empty_result(
            drawing_path,
            iteration_id,
            effective,
            ai_delta,
            ai_backend,
            warning="Outlines were detected but none could be extruded (degenerate geometry).",
        )

    combined = trimesh.util.concatenate(meshes) if len(meshes) > 1 else meshes[0]
    out_dir = tempfile.mkdtemp(prefix="drawing_to_3d_")
    base = os.path.splitext(os.path.basename(drawing_path))[0]
    stl_path = os.path.join(out_dir, f"{base}.stl")
    combined.export(stl_path, file_type="stl")

    bounds = combined.bounds
    size = (bounds[1] - bounds[0]).tolist()

    scad_code = _polygons_to_scad(polygons, effective)
    scad_path = os.path.join(out_dir, f"{base}.scad")
    with open(scad_path, "w", encoding="utf-8") as f:
        f.write(scad_code)

    result = {
        "outputPath": stl_path,
        "stlPath": stl_path,
        "scadPath": scad_path,
        "scadCode": scad_code,
        "format": "stl",
        "fileSize": os.path.getsize(stl_path),
        "vertexCount": int(len(combined.vertices)),
        "faceCount": int(len(combined.faces)),
        "bbox": size,
        "polygonCount": len(polygons),
        # Effective params that produced this mesh (incl. AI delta)
        "extrudeMm": effective["extrudeMm"],
        "scaleMmPerPixel": effective["scaleMmPerPixel"],
        "minAreaPx": effective["minAreaPx"],
        "rotateDeg": effective["rotateDeg"],
        "userFeedback": user_feedback,
        "iterationId": iteration_id,
        "aiBackend": ai_backend,
        "aiDelta": ai_delta,
        "method": "drawing-to-3d-v2" if prior else "drawing-to-3d-v2-initial",
        "success": True,
    }

    if iteration_id:
        _save_history(iteration_id, {**effective, "lastStl": stl_path})

    return result


# ---------------------------------------------------------------------------
# Extraction pipeline (unchanged from V1, plus optional rotation)
# ---------------------------------------------------------------------------

def _load_grayscale(path: str) -> np.ndarray:
    ext = os.path.splitext(path)[1].lower()
    if ext == ".svg":
        raise ValueError("SVG input not yet supported — convert to PNG first.")
    pil = Image.open(path).convert("L")
    return np.asarray(pil, dtype=np.uint8)


def _extract_polygons(img: np.ndarray, min_area_px: int, epsilon_frac: float) -> List[Polygon]:
    blurred = cv2.GaussianBlur(img, (5, 5), 0)
    binary = cv2.adaptiveThreshold(
        blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 21, 10
    )
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    closed = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel, iterations=2)
    contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)

    polys: List[Polygon] = []
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < min_area_px:
            continue
        peri = cv2.arcLength(cnt, closed=True)
        approx = cv2.approxPolyDP(cnt, epsilon_frac * peri, closed=True)
        if len(approx) < 3:
            continue
        pts = approx.reshape(-1, 2).astype(float).tolist()
        try:
            poly = Polygon(pts)
            if not poly.is_valid:
                poly = poly.buffer(0)
            if poly.is_empty or poly.area < min_area_px:
                continue
            polys.append(poly)
        except Exception:
            continue
    return polys


def _scale_polygon(poly: Polygon, scale_mm: float, rotate_deg: float) -> Polygon:
    """Scale px -> mm, flip Y, then optionally rotate around the polygon's origin."""
    coords: List[Tuple[float, float]] = [
        (x * scale_mm, -y * scale_mm) for x, y in poly.exterior.coords
    ]
    scaled = Polygon(coords)
    if rotate_deg and not math.isclose(rotate_deg % 360.0, 0.0):
        scaled = shp_rotate(scaled, rotate_deg, origin="centroid", use_radians=False)
    return scaled


def _polygons_to_scad(polygons: List[Polygon], effective: dict) -> str:
    scale_mm = effective["scaleMmPerPixel"]
    extrude_mm = effective["extrudeMm"]
    rotate_deg = effective.get("rotateDeg", 0.0)
    parts = [
        "// Generated by drawing-to-3d V2",
        f"// Extrude: {extrude_mm} mm    Scale: {scale_mm} mm/px    Rotate: {rotate_deg} deg",
    ]
    if rotate_deg:
        parts.append(f"rotate([0, 0, {rotate_deg}])")
    parts.append("linear_extrude(height=" + f"{extrude_mm}" + ")")
    parts.append("  union() {")
    for poly in polygons:
        coords = [(x * scale_mm, -y * scale_mm) for x, y in poly.exterior.coords]
        pts_str = ", ".join(f"[{x:.3f}, {y:.3f}]" for x, y in coords)
        parts.append(f"    polygon(points=[{pts_str}]);")
    parts.append("  }")
    return "\n".join(parts) + "\n"


# ---------------------------------------------------------------------------
# Iteration history persistence
# ---------------------------------------------------------------------------

def _history_path(iteration_id: str) -> str:
    safe = "".join(c for c in iteration_id if c.isalnum() or c in "-_.")[:128] or "x"
    os.makedirs(HISTORY_ROOT, exist_ok=True)
    return os.path.join(HISTORY_ROOT, f"{safe}.json")


def _load_history(iteration_id: str) -> Optional[dict]:
    p = _history_path(iteration_id)
    if not os.path.isfile(p):
        return None
    try:
        with open(p, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def _save_history(iteration_id: str, data: dict) -> None:
    try:
        with open(_history_path(iteration_id), "w", encoding="utf-8") as f:
            json.dump(data, f)
    except Exception as e:
        print(f"drawing-to-3d: failed to persist iteration history ({e})")


# ---------------------------------------------------------------------------
# Empty-result helper
# ---------------------------------------------------------------------------

def _empty_result(
    drawing_path: str,
    iteration_id: Optional[str],
    effective: dict,
    ai_delta: dict,
    ai_backend: str,
    warning: str,
) -> dict:
    out_dir = tempfile.mkdtemp(prefix="drawing_to_3d_")
    base = os.path.splitext(os.path.basename(drawing_path))[0]
    stl_path = os.path.join(out_dir, f"{base}.stl")
    placeholder = trimesh.creation.box(extents=[1.0, 1.0, 1.0])
    placeholder.export(stl_path, file_type="stl")
    return {
        "outputPath": stl_path,
        "stlPath": stl_path,
        "scadPath": None,
        "scadCode": "// drawing-to-3d V2: no closed outlines detected\n",
        "format": "stl",
        "fileSize": os.path.getsize(stl_path),
        "vertexCount": int(len(placeholder.vertices)),
        "faceCount": int(len(placeholder.faces)),
        "bbox": [1.0, 1.0, 1.0],
        "polygonCount": 0,
        "extrudeMm": effective["extrudeMm"],
        "scaleMmPerPixel": effective["scaleMmPerPixel"],
        "minAreaPx": effective["minAreaPx"],
        "rotateDeg": effective.get("rotateDeg", 0.0),
        "iterationId": iteration_id,
        "aiBackend": ai_backend,
        "aiDelta": ai_delta,
        "warning": warning,
        "method": "drawing-to-3d-v2",
        "success": True,
    }
