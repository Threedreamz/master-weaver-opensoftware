"""Smoke tests for vld4_import — exercise the decoder against synthesized VLD4 blobs."""
import base64
import os
import sys
import tempfile

import numpy as np
import pytest
import zstandard as zstd

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from handlers import vld4_import  # noqa: E402


def _build_fake_vld4(verts_xyz: np.ndarray, tris: np.ndarray) -> bytes:
    n = verts_xyz.shape[0]
    interleaved = np.zeros((n, 8), dtype=np.float32)
    interleaved[:, 0:3] = verts_xyz.astype(np.float32)
    vertex_b64 = base64.b64encode(interleaved.tobytes()).decode("ascii")
    index_b64 = base64.b64encode(tris.astype(np.uint32).tobytes()).decode("ascii")
    xml = (
        '<?xml version="1.0" encoding="utf-8"?>'
        '<AnalysisModel xmlns="http://schemas.datacontract.org/2004/07/Keyence.VLA">'
        '<MeshElement><ModelMesh><_meshDataModel>'
        f'<Vertex>{vertex_b64}</Vertex><Index>{index_b64}</Index>'
        '</_meshDataModel></ModelMesh></MeshElement></AnalysisModel>'
    ).encode("utf-8")
    compressed = zstd.ZstdCompressor().compress(xml)
    header_filler = b"\x00" * (0x38 - len(vld4_import.MAGIC))
    bmp_filler = b"BM" + b"\x00" * 128
    return vld4_import.MAGIC + header_filler + bmp_filler + compressed


def _write_blob(blob: bytes, name: str) -> str:
    path = os.path.join(tempfile.mkdtemp(prefix="vld4_test_"), name)
    with open(path, "wb") as f:
        f.write(blob)
    return path


def test_single_triangle():
    tri = np.array([[0, 0, 0], [1, 0, 0], [0, 1, 0]], dtype=np.float32)
    idx = np.array([[0, 1, 2]], dtype=np.uint32)
    path = _write_blob(_build_fake_vld4(tri, idx), "mini.vld4")
    r = vld4_import.handle({"inputFile": path})
    assert r["success"] is True
    assert r["vertexCount"] == 3
    assert r["faceCount"] == 1
    assert r["format"] == "stl"
    assert os.path.isfile(r["outputPath"])


def test_unit_cube():
    verts = np.array([
        [0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0],
        [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1],
    ], dtype=np.float32)
    tris = np.array([
        [0, 1, 2], [0, 2, 3], [4, 6, 5], [4, 7, 6],
        [0, 4, 5], [0, 5, 1], [2, 6, 7], [2, 7, 3],
        [1, 5, 6], [1, 6, 2], [0, 3, 7], [0, 7, 4],
    ], dtype=np.uint32)
    path = _write_blob(_build_fake_vld4(verts, tris), "cube.vld4")
    r = vld4_import.handle({"inputFile": path})
    assert r["vertexCount"] == 8
    assert r["faceCount"] == 12
    assert tuple(round(x, 2) for x in r["bbox"]) == (1.0, 1.0, 1.0)


def test_rejects_missing_file():
    with pytest.raises(FileNotFoundError):
        vld4_import.handle({"inputFile": "/nonexistent/scan.vld4"})


def test_rejects_non_vld4_magic():
    path = _write_blob(b"NOT A VLD4 FILE" + b"\x00" * 100, "bad.vld4")
    with pytest.raises(ValueError, match="KEYENCE"):
        vld4_import.handle({"inputFile": path})


def test_rejects_missing_params():
    with pytest.raises(ValueError, match="required"):
        vld4_import.handle({})
