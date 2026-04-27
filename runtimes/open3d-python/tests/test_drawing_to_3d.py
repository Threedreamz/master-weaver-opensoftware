"""Smoke tests for drawing_to_3d V1 — exercise the OpenCV → trimesh extrusion path."""
import os
import sys
import tempfile

import cv2
import numpy as np
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from handlers import drawing_to_3d  # noqa: E402


def _synth_image(with_shapes: bool) -> str:
    img = np.ones((200, 200), dtype=np.uint8) * 255
    if with_shapes:
        cv2.rectangle(img, (30, 30), (80, 80), 0, 2)
        cv2.circle(img, (140, 140), 30, 0, 2)
    path = os.path.join(tempfile.mkdtemp(prefix="drawing_test_"), "drawing.png")
    cv2.imwrite(path, img)
    return path


def test_extrudes_two_shapes():
    path = _synth_image(with_shapes=True)
    r = drawing_to_3d.handle({"drawingPath": path, "extrudeMm": 5.0, "scaleMmPerPixel": 0.5})
    assert r["success"] is True
    assert r["polygonCount"] >= 2
    assert r["vertexCount"] > 8
    assert r["method"].startswith("drawing-to-3d-")
    assert os.path.isfile(r["outputPath"])
    # bbox Z should equal extrudeMm
    assert abs(r["bbox"][2] - 5.0) < 0.01


def test_empty_drawing_returns_placeholder():
    path = _synth_image(with_shapes=False)
    r = drawing_to_3d.handle({"drawingPath": path, "minAreaPx": 10_000_000})
    assert r["success"] is True
    assert r["polygonCount"] == 0
    assert "warning" in r


def test_rejects_missing_file():
    with pytest.raises(FileNotFoundError):
        drawing_to_3d.handle({"drawingPath": "/nonexistent/drawing.png"})


def test_rejects_missing_params():
    with pytest.raises(ValueError, match="required"):
        drawing_to_3d.handle({})


def test_svg_not_supported_in_v1():
    # Touch an actual .svg file so the existence check doesn't fire first.
    svg_path = os.path.join(tempfile.mkdtemp(prefix="drawing_test_"), "x.svg")
    with open(svg_path, "w") as f:
        f.write("<svg/>")
    with pytest.raises(ValueError, match="SVG"):
        drawing_to_3d.handle({"drawingPath": svg_path})
