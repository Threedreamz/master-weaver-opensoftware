"""vld4-import: Decode Keyence VLANALYZER .vld4 scan files into STL meshes."""
from __future__ import annotations

import base64
import os
import re
import tempfile
import xml.etree.ElementTree as ET
from typing import Optional, Tuple

import numpy as np
import trimesh
import zstandard as zstd


MAGIC = b"KEYENCE VLANALYZER\x00"
ZSTD_MAGIC = b"\x28\xb5\x2f\xfd"


def handle(params: dict) -> dict:
    input_path = params.get("inputFile") or params.get("filePath") or ""
    if not input_path:
        raise ValueError("inputFile is required")
    if not os.path.isfile(input_path):
        raise FileNotFoundError(f"VLD4 file not found: {input_path}")

    with open(input_path, "rb") as f:
        blob = f.read()

    if not blob.startswith(MAGIC):
        raise ValueError(
            f"Not a VLD4 file (expected KEYENCE VLANALYZER magic, got {blob[:20]!r})"
        )

    zstd_off = blob.find(ZSTD_MAGIC, len(MAGIC))
    if zstd_off < 0:
        raise ValueError("Could not locate zstd-compressed body after BMP preview")

    dctx = zstd.ZstdDecompressor()
    xml_bytes = dctx.decompress(blob[zstd_off:], max_output_size=1 << 31)
    xml_text = xml_bytes.decode("utf-8", errors="replace")

    positions, indices = _extract_mesh(xml_text)
    if positions.size == 0 or indices.size == 0:
        raise ValueError("VLD4 contained no mesh data (empty Vertex/Index arrays)")

    mesh = trimesh.Trimesh(vertices=positions, faces=indices, process=False)

    output_dir = tempfile.mkdtemp(prefix="vld4_import_")
    base_name = os.path.splitext(os.path.basename(input_path))[0]
    output_path = os.path.join(output_dir, f"{base_name}.stl")
    mesh.export(output_path, file_type="stl")

    bounds = mesh.bounds
    size = (bounds[1] - bounds[0]).tolist() if bounds is not None else [0.0, 0.0, 0.0]

    return {
        "outputPath": output_path,
        "format": "stl",
        "fileSize": os.path.getsize(output_path),
        "vertexCount": int(len(mesh.vertices)),
        "faceCount": int(len(mesh.faces)),
        "bbox": size,
        "inputSize": len(blob),
        "success": True,
        "method": "vld4-import",
    }


def _extract_mesh(xml_text: str) -> Tuple[np.ndarray, np.ndarray]:
    """
    Walk the .NET DataContract XML and pull Vertex (base64 float32) + Index
    (base64 uint32) arrays. Keyence VL-series files use a namespaced schema;
    we strip namespaces for simpler traversal.
    """
    root = ET.fromstring(_strip_ns(xml_text))

    vertex_b64 = _first_nonempty_text(root, "Vertex")
    index_b64 = _first_nonempty_text(root, "Index")
    if not vertex_b64 or not index_b64:
        raise ValueError("Vertex or Index element not found in VLD4 XML")

    vertex_bytes = base64.b64decode(vertex_b64)
    index_bytes = base64.b64decode(index_b64)

    verts = np.frombuffer(vertex_bytes, dtype=np.float32)
    if verts.size % 8 != 0:
        raise ValueError(
            f"Unexpected Vertex stride (got {verts.size} float32s, not a multiple of 8)"
        )
    verts = verts.reshape(-1, 8)
    positions = verts[:, 0:3].astype(np.float64, copy=False)

    indices = np.frombuffer(index_bytes, dtype=np.uint32)
    if indices.size % 3 != 0:
        raise ValueError(
            f"Index count {indices.size} is not divisible by 3 (not a triangle list)"
        )
    indices = indices.reshape(-1, 3).astype(np.int64, copy=False)

    return positions, indices


def _strip_ns(xml_text: str) -> str:
    return re.sub(r"\sxmlns(:\w+)?=\"[^\"]*\"", "", xml_text, count=0)


def _first_nonempty_text(root: ET.Element, tag: str) -> Optional[str]:
    for el in root.iter(tag):
        text = (el.text or "").strip()
        if text:
            return text
    return None
