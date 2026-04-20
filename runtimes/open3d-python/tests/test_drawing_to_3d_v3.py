"""V3 hierarchy tests — holes + nested contours via RETR_CCOMP."""
import os
import sys
import tempfile

import cv2
import numpy as np
import pytest
import trimesh

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from handlers import drawing_to_3d  # noqa: E402


def _synth_donut(outer_r: int = 70, inner_r: int = 30) -> str:
    """White image with a black ring (annulus)."""
    img = np.ones((200, 200), dtype=np.uint8) * 255
    cv2.circle(img, (100, 100), outer_r, 0, thickness=-1)   # filled black outer
    cv2.circle(img, (100, 100), inner_r, 255, thickness=-1) # filled white hole
    path = os.path.join(tempfile.mkdtemp(prefix="v3_donut_"), "donut.png")
    cv2.imwrite(path, img)
    return path


def _synth_nested_rects() -> str:
    """Outer filled rectangle with a smaller white rectangle inside."""
    img = np.ones((200, 300), dtype=np.uint8) * 255
    cv2.rectangle(img, (40, 40), (260, 160), 0, thickness=-1)    # big black
    cv2.rectangle(img, (80, 70), (220, 130), 255, thickness=-1)   # inner white hole
    path = os.path.join(tempfile.mkdtemp(prefix="v3_rects_"), "rects.png")
    cv2.imwrite(path, img)
    return path


def _synth_solid_square() -> str:
    """Plain solid square — regression guard: no holes should be introduced."""
    img = np.ones((200, 200), dtype=np.uint8) * 255
    cv2.rectangle(img, (50, 50), (150, 150), 0, thickness=-1)
    path = os.path.join(tempfile.mkdtemp(prefix="v3_solid_"), "solid.png")
    cv2.imwrite(path, img)
    return path


def _extract_polys(path: str, min_area_px: int = 100):
    """Call the same internal pipeline the handler uses to get raw polygons."""
    img = drawing_to_3d._load_grayscale(path)
    return drawing_to_3d._extract_polygons(img, min_area_px=min_area_px, epsilon_frac=0.005)


def test_donut_produces_one_polygon_with_one_interior_ring():
    path = _synth_donut()
    polys = _extract_polys(path)
    assert len(polys) == 1, f"Expected 1 polygon for donut, got {len(polys)}"
    assert len(polys[0].interiors) == 1, (
        f"Expected 1 interior ring (the hole), got {len(polys[0].interiors)}"
    )


def test_donut_extruded_mesh_has_a_center_hole():
    path = _synth_donut()
    r = drawing_to_3d.handle({"drawingPath": path, "extrudeMm": 5.0, "scaleMmPerPixel": 0.5})
    assert r["success"] is True
    assert r["polygonCount"] == 1
    assert r["method"].startswith("drawing-to-3d-v3")
    mesh = trimesh.load(r["outputPath"])
    # Mesh should be watertight (single connected donut) and the center point
    # at z=mid must be OUTSIDE the mesh volume (hole goes through).
    bounds = mesh.bounds
    mid = ((bounds[0] + bounds[1]) / 2.0).tolist()
    contains = mesh.contains([mid])[0]
    assert not contains, "Expected center of donut to be OUTSIDE the mesh (hole), but it's inside."


def test_nested_rects_produces_polygon_with_hole():
    path = _synth_nested_rects()
    polys = _extract_polys(path)
    assert len(polys) == 1
    assert len(polys[0].interiors) == 1


def test_solid_square_has_no_spurious_holes():
    path = _synth_solid_square()
    polys = _extract_polys(path)
    assert len(polys) >= 1
    for poly in polys:
        assert len(poly.interiors) == 0, (
            f"A solid shape should have 0 interior rings, got {len(poly.interiors)}"
        )


def test_scad_output_emits_difference_for_holed_polygon():
    path = _synth_donut()
    r = drawing_to_3d.handle({"drawingPath": path, "extrudeMm": 5.0})
    assert "difference()" in r["scadCode"]


def test_v3_scale_polygon_preserves_interior_rings():
    """Regression: _scale_polygon must not drop interiors."""
    path = _synth_donut()
    polys = _extract_polys(path)
    poly = polys[0]
    assert len(poly.interiors) == 1
    scaled = drawing_to_3d._scale_polygon(poly, scale_mm=0.1, rotate_deg=0)
    assert len(scaled.interiors) == 1, "Interior ring lost during scaling"


def test_v3_scale_polygon_applies_rotation_and_keeps_holes():
    path = _synth_donut()
    poly = _extract_polys(path)[0]
    scaled = drawing_to_3d._scale_polygon(poly, scale_mm=0.1, rotate_deg=90)
    assert len(scaled.interiors) == 1
    # After 90deg rotation around centroid, X and Y bounds swap roughly
    b0 = poly.bounds           # (minx, miny, maxx, maxy) in pixels
    b1 = scaled.bounds
    w0 = b0[2] - b0[0]; h0 = b0[3] - b0[1]
    w1 = b1[2] - b1[0]; h1 = b1[3] - b1[1]
    # Scaled-then-rotated should have swapped aspect (width ≈ 0.1 * h0, height ≈ 0.1 * w0)
    assert abs(w1 - h0 * 0.1) < 0.5
    assert abs(h1 - w0 * 0.1) < 0.5
