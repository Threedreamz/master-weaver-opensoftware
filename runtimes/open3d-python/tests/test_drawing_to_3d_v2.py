"""V2 tests for drawing_to_3d — AI feedback loop + iteration history + rotation."""
import os
import sys
import tempfile

import cv2
import numpy as np
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from handlers import drawing_to_3d  # noqa: E402
from lib import ai_backends  # noqa: E402


def _synth_image():
    img = np.ones((200, 200), dtype=np.uint8) * 255
    cv2.rectangle(img, (30, 30), (80, 80), 0, 2)
    cv2.circle(img, (140, 140), 30, 0, 2)
    path = os.path.join(tempfile.mkdtemp(prefix="drawing_v2_"), "drawing.png")
    cv2.imwrite(path, img)
    return path


@pytest.fixture(autouse=True)
def _isolated_history(tmp_path, monkeypatch):
    monkeypatch.setenv("DRAWING_TO_3D_HISTORY_DIR", str(tmp_path / "hist"))
    # Re-import to pick up the env var override at module scope
    import importlib
    importlib.reload(drawing_to_3d)
    yield


def test_rule_based_doubles_extrude_on_twice_feedback():
    delta = ai_backends.rule_based("make it twice as thick", {"extrudeMm": 5.0})
    assert delta.get("extrudeMm") == 10.0


def test_rule_based_parses_rotate():
    delta = ai_backends.rule_based("rotate 90 degrees", {})
    assert delta.get("rotateDeg") == 90.0


def test_rule_based_parses_explicit_thickness():
    delta = ai_backends.rule_based("make it 12mm thick", {"extrudeMm": 5.0})
    assert delta.get("extrudeMm") == 12.0


def test_rule_based_clamps_out_of_range():
    delta = ai_backends.rule_based("make it 999999mm thick", {"extrudeMm": 5.0})
    # clamp max is 500
    assert 0 < delta.get("extrudeMm", 0) <= 500


def test_v2_initial_call_records_method():
    path = _synth_image()
    r = drawing_to_3d.handle({"drawingPath": path, "iterationId": "iter-1"})
    assert r["method"] == "drawing-to-3d-v3-initial"
    assert r["polygonCount"] >= 2


def test_v2_iteration_picks_up_history_and_applies_feedback():
    path = _synth_image()
    # Initial extraction with default 5mm extrude
    r1 = drawing_to_3d.handle({"drawingPath": path, "iterationId": "iter-X", "extrudeMm": 5.0})
    assert abs(r1["extrudeMm"] - 5.0) < 0.01
    # Second call with feedback "twice as thick" (rule_based), no explicit param
    r2 = drawing_to_3d.handle({
        "drawingPath": path,
        "iterationId": "iter-X",
        "userFeedback": "make it twice as thick",
        "aiBackend": "rule_based",
    })
    assert r2["method"] == "drawing-to-3d-v3"
    # AI delta should bump extrude to 10
    assert r2["aiDelta"].get("extrudeMm") == 10.0
    assert abs(r2["extrudeMm"] - 10.0) < 0.01
    # bbox Z should reflect new extrude
    assert abs(r2["bbox"][2] - 10.0) < 0.1


def test_v2_rotation_actually_rotates_bbox():
    path = _synth_image()
    r0 = drawing_to_3d.handle({"drawingPath": path, "rotateDeg": 0})
    r90 = drawing_to_3d.handle({"drawingPath": path, "rotateDeg": 90})
    # After 90deg rotation around centroid, X and Y bbox sizes should swap (approximately).
    assert abs(r0["bbox"][0] - r90["bbox"][1]) < 2.0
    assert abs(r0["bbox"][1] - r90["bbox"][0]) < 2.0


def test_v2_unknown_backend_falls_back_to_rule_based(monkeypatch):
    path = _synth_image()
    r = drawing_to_3d.handle({
        "drawingPath": path,
        "iterationId": "iter-Y",
        "userFeedback": "make it 8mm thick",
        "aiBackend": "nonexistent-backend",
    })
    # Rule-based fallback should parse "8mm thick"
    assert r["aiDelta"].get("extrudeMm") == 8.0


def test_v2_no_feedback_leaves_ai_delta_empty():
    path = _synth_image()
    r = drawing_to_3d.handle({"drawingPath": path, "iterationId": "iter-Z"})
    assert r["aiDelta"] == {}
