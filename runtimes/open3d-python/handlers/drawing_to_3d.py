"""drawing-to-3d V3: closed-shape extraction with holes + AI-driven iterative refinement.

Pipeline (OpenCV + Shapely + trimesh):
  1. Read raster image (PNG/JPG/BMP).
  2. Grayscale -> adaptive threshold -> morphological close to seal gaps.
  3. Extract contours with 2-level hierarchy (cv2.RETR_CCOMP): top-level
     contours become polygon shells, their direct children become interior
     rings (holes). Filter by area, simplify via Douglas-Peucker.
  4. Build Shapely Polygon(shell, holes=[...]) — multi-ring supported.
  5. Scale pixels -> mm via `scaleMmPerPixel` (exterior + interior rings).
  6. Optional rotation (`rotateDeg`) applied in XY around centroid.
  7. Extrude each polygon to `extrudeMm` via trimesh.creation.extrude_polygon
     (native support for holes, no boolean post-processing needed).
  8. Concatenate meshes -> STL + OpenSCAD source (emits `difference()` when
     a polygon has interior rings).

V3 additions (on top of V2):
  - Hierarchy support: donut / ring / nested-rectangle drawings now extrude
    with the expected internal cavities instead of being filled solid.
  - _scale_polygon preserves interior rings.
  - _polygons_to_scad emits `difference() { outer; holes; }` for holed polys.
  - Method tag: "drawing-to-3d-v3" on iterative calls; first call is
    "drawing-to-3d-v3-initial".

V2 (preserved in V3):
  - AI feedback loop: when caller passes `userFeedback` + `iterationId`, the
    handler asks the configured `aiBackend` (ollama / claude / lmstudio /
    rule_based) for a parameter-delta dict, merges it with the current
    params, and re-extracts. The prior result is persisted to
    /tmp/drawing-to-3d-history/<iterationId>.json so the next iteration can
    build on top of it instead of from the raw defaults.
  - Rotation via `rotateDeg` parameter (0..360, applied before extrusion).

Limitations (documented, not silent):
  - Only 2-level hierarchy (shells + direct holes); 3+ nested levels are
    flattened. RETR_TREE would handle deeper nesting but isn't needed today.
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
from shapely.geometry import Polygon, MultiPolygon  # noqa: F401

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
        "method": "drawing-to-3d-v3" if prior else "drawing-to-3d-v3-initial",
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
    """V3 extraction: 2-level hierarchy (RETR_CCOMP) — outer contours become
    the polygon shells; their direct child contours become interior rings
    (holes). trimesh.creation.extrude_polygon accepts Polygons with holes
    natively.

    Hierarchy array semantics from OpenCV:
      hierarchy[i] = [next, prev, firstChild, parent]
    With RETR_CCOMP, parent == -1 marks top-level (external) contours and
    parent >= 0 marks internal (holes) of contour parent.

    Threshold-artifact filters:
      - Adaptive thresholding on clean drawings can produce double-edges
        (outer + inner outline of the same black region) that CCOMP
        interprets as "polygon with a hole nearly as big as itself".
        We drop holes whose area is > 90% of the parent — those are
        artifacts, not real holes.
      - Duplicate top-level contours (bbox ≥ 90% overlap and ≥ 80% area
        ratio) are deduped, keeping the larger.
    """
    # Use Otsu first if the image is bimodal — it produces cleaner edges
    # for high-contrast technical drawings. Fall back to adaptive for
    # non-bimodal (scanned, uneven-lit) inputs.
    _, binary = cv2.threshold(img, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    # If Otsu produced a mostly-empty result, the input isn't bimodal;
    # fall back to adaptive thresholding.
    foreground_ratio = float(np.count_nonzero(binary)) / binary.size
    if foreground_ratio < 0.01 or foreground_ratio > 0.95:
        blurred = cv2.GaussianBlur(img, (5, 5), 0)
        binary = cv2.adaptiveThreshold(
            blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 21, 10
        )
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    closed = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel, iterations=2)
    contours, hierarchy = cv2.findContours(closed, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)

    if hierarchy is None or len(contours) == 0:
        return []

    # hierarchy shape is (1, N, 4) — flatten one level for ergonomics.
    hierarchy_flat = hierarchy[0]

    def _simplify(cnt: np.ndarray) -> Optional[List[Tuple[float, float]]]:
        area = cv2.contourArea(cnt)
        if area < min_area_px:
            return None
        peri = cv2.arcLength(cnt, closed=True)
        approx = cv2.approxPolyDP(cnt, epsilon_frac * peri, closed=True)
        if len(approx) < 3:
            return None
        return [tuple(map(float, pt)) for pt in approx.reshape(-1, 2)]

    # Group children by parent index.
    children_by_parent: dict[int, List[int]] = {}
    for i, node in enumerate(hierarchy_flat):
        parent = int(node[3])
        if parent >= 0:
            children_by_parent.setdefault(parent, []).append(i)

    polys: List[Polygon] = []
    for i, node in enumerate(hierarchy_flat):
        parent = int(node[3])
        if parent != -1:
            continue  # child contour — handled as a hole of its parent

        shell = _simplify(contours[i])
        if shell is None:
            continue

        parent_area = cv2.contourArea(contours[i])
        holes: List[List[Tuple[float, float]]] = []
        for child_idx in children_by_parent.get(i, []):
            child_area = cv2.contourArea(contours[child_idx])
            # Artifact filter: children whose area is ≥ 90% of parent are
            # threshold double-edges, not real holes.
            if parent_area > 0 and child_area / parent_area >= 0.9:
                continue
            child = _simplify(contours[child_idx])
            if child is None:
                continue
            holes.append(child)

        try:
            poly = Polygon(shell, holes=holes) if holes else Polygon(shell)
            if not poly.is_valid:
                poly = poly.buffer(0)
                if poly.geom_type == "MultiPolygon":
                    poly = max(poly.geoms, key=lambda p: p.area)
            if poly.is_empty or poly.area < min_area_px:
                continue
            polys.append(poly)
        except Exception:
            continue

    # Dedupe top-level contours whose bbox + area are ≥ 90% similar.
    return _dedupe_top_level(polys)


def _dedupe_top_level(polys: List[Polygon]) -> List[Polygon]:
    """Drop top-level polygons that are near-duplicates of larger ones
    (threshold double-edge artifact). Keeps the larger polygon's holes.
    """
    if len(polys) <= 1:
        return polys
    # Sort descending by area so we keep the outer (larger) when merging.
    polys_sorted = sorted(polys, key=lambda p: p.area, reverse=True)
    kept: List[Polygon] = []
    for candidate in polys_sorted:
        is_dup = False
        for k in kept:
            inter = k.intersection(candidate)
            if inter.is_empty:
                continue
            # If candidate is mostly inside `k` AND its area is >= 80% of k's,
            # treat as duplicate.
            ratio = inter.area / candidate.area if candidate.area > 0 else 0
            area_ratio = candidate.area / k.area if k.area > 0 else 0
            if ratio > 0.95 and area_ratio > 0.8:
                is_dup = True
                break
        if not is_dup:
            kept.append(candidate)
    return kept


def _scale_polygon(poly: Polygon, scale_mm: float, rotate_deg: float) -> Polygon:
    """Scale px -> mm, flip Y, then optionally rotate around the polygon's
    centroid. Preserves interior rings (holes) added in V3.
    """
    def _scale_ring(ring) -> List[Tuple[float, float]]:
        return [(x * scale_mm, -y * scale_mm) for x, y in ring.coords]

    shell = _scale_ring(poly.exterior)
    holes = [_scale_ring(interior) for interior in poly.interiors]
    scaled = Polygon(shell, holes=holes) if holes else Polygon(shell)
    if rotate_deg and not math.isclose(rotate_deg % 360.0, 0.0):
        scaled = shp_rotate(scaled, rotate_deg, origin="centroid", use_radians=False)
    return scaled


def _polygons_to_scad(polygons: List[Polygon], effective: dict) -> str:
    """Emit OpenSCAD source. Polygons with interior rings become
    difference() { outer; holes }.
    """
    scale_mm = effective["scaleMmPerPixel"]
    extrude_mm = effective["extrudeMm"]
    rotate_deg = effective.get("rotateDeg", 0.0)
    parts = [
        "// Generated by drawing-to-3d V3",
        f"// Extrude: {extrude_mm} mm    Scale: {scale_mm} mm/px    Rotate: {rotate_deg} deg",
    ]
    if rotate_deg:
        parts.append(f"rotate([0, 0, {rotate_deg}])")
    parts.append("linear_extrude(height=" + f"{extrude_mm}" + ")")
    parts.append("  union() {")
    for poly in polygons:
        shell = [(x * scale_mm, -y * scale_mm) for x, y in poly.exterior.coords]
        shell_str = ", ".join(f"[{x:.3f}, {y:.3f}]" for x, y in shell)
        if list(poly.interiors):
            parts.append("    difference() {")
            parts.append(f"      polygon(points=[{shell_str}]);")
            for interior in poly.interiors:
                ring = [(x * scale_mm, -y * scale_mm) for x, y in interior.coords]
                ring_str = ", ".join(f"[{x:.3f}, {y:.3f}]" for x, y in ring)
                parts.append(f"      polygon(points=[{ring_str}]);")
            parts.append("    }")
        else:
            parts.append(f"    polygon(points=[{shell_str}]);")
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
        "method": "drawing-to-3d-v3",
        "success": True,
    }
