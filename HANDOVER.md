# Open3D Studio — Session Handover

**Date:** 2026-04-17  
**Branch:** dev  
**Session scope:** Reality Composer iPhone scan feature + VLD4 import + CAD STL viewer

---

## What Was Built

### 1. Reality Composer — iPhone Scan Processing

Full pipeline for processing `.objcap` bundles (iPhone Object Capture) and single scan files on macOS with Xcode.

**Flow:**
```
Browser (4172) → POST /api/reconstruct (FormData: localPath or scanFile)
  → Next.js route.ts → proxy to open3d-api (4173) /api/render/reality
  → LRP JSON-RPC → Python reality_composer.handle()
    → Strategy A: return prebuilt USDZ from models/ (fast, no reprocessing)
    → Strategy B: re-run PhotogrammetrySession via apple_photogrammetry.py
  → { outputPath, format, fileSize, vertexCount, success, method }
```

**Key files:**
| File | Change |
|------|--------|
| `runtimes/open3d-python/handlers/reality_composer.py` | **NEW** — .objcap bundle + single file handler |
| `runtimes/open3d-python/handlers/apple_photogrammetry.py` | Rewritten — full `PhotogrammetrySession.Configuration` support |
| `runtimes/open3d-python/main.py` | +2 lines — registers `reality-composer` handler |
| `apps/open3d-api/src/index.ts` | +1 line — `/api/render/reality` route |
| `apps/open3d-api/src/lrp-manager.ts` | Uses `.venv/bin/python3` if available (PEP 668 fix) |
| `apps/open3d-studio/src/app/api/reconstruct/route.ts` | Handles `apple`, `reality-composer`, generic LRP methods |
| `apps/open3d-studio/src/app/reconstruct/page.tsx` | Reality Composer tab with full Xcode settings UI |
| `apps/open3d-studio/src/app/api/download/route.ts` | **NEW** — serve output files with correct MIME types |
| `apps/open3d-studio/src/app/api/export/route.ts` | **NEW** — convert to STL/OBJ/PLY/GLB/STEP/IGES via LRP |
| `capabilities/open3d/reality-composer.yaml` | **NEW** — capability definition |

**Reality Composer UI features:**
- Local Path input for `.objcap` bundles (directories can't be uploaded via browser)
- File upload for single scan files (`.usdz`, `.obj`, `.ply`, `.glb`, `.fbx`)
- Full Xcode PhotogrammetrySession settings: Quality (5 levels), Feature Sensitivity, Sample Ordering, Object Masking, Reprocess checkbox
- Result card: output path, format, file size, vertex count, method used, warnings
- Export card: STL / OBJ / PLY / STEP / IGES buttons → POST /api/export
- Download card: Download button + AR Quick Look link (Safari `rel="ar"`)

**Test scan:** `Untitled Object 4.objcap` — 134 HEIC images, prebuilt 8.4 MB USDZ  
**STL export tested:** 13,471 vertices, 26,934 faces from the prebuilt USDZ

---

### 2. Python venv (PEP 668 fix)

System Python3 is locked on macOS 14+. Created a venv with trimesh + numpy:

```bash
cd runtimes/open3d-python
python3 -m venv .venv
.venv/bin/pip install trimesh numpy
```

`lrp-manager.ts` now auto-detects and uses `.venv/bin/python3` if present.

**Note:** `.venv/` is gitignored — run setup above on any new machine.

---

### 3. USDZ → STL/OBJ Export Pipeline

`runtimes/open3d-python/handlers/convert_mesh.py` — added USDZ-specific path:
1. `usdcat --flatten --out /tmp/out.usda input.usdz` (requires Xcode CLT, already installed)
2. Parse USDA text: regex extracts `point3f[] points` and `int[] faceVertexIndices`
3. Build trimesh → export to requested format
4. Output always goes to `tempfile.mkdtemp()` — avoids collision with input file

`xcrun realityconverter` is **not** available (requires full Xcode.app, not just CLT). The pipeline uses `usdcat` instead.

---

### 4. CAD Page — STL Import + Measurements

**`apps/open3d-studio/src/app/cad/page.tsx`** — two modes:

- **Parametric** — existing shape builder (Box, Sphere, Cylinder, Cone, Torus, Wedge, Hemisphere)
- **Import STL** — click button → pick `.stl` file → mesh loads in viewer

Browser-side STL parser (binary STL → unindexed Float32Array vertices/normals).

**Measurements card** shows Width/Depth/Height in mm + center coordinates for imported meshes.

**`apps/open3d-studio/src/app/cad/CADPreview.tsx`** changes:
- Handles unindexed geometry (skips `setIndex` if `indices.length === 0`)
- Centers mesh at origin after import (translates by bounding box center)
- `CameraFit` component auto-frames camera distance + near/far clip to mesh size
- Grid scaled to 2000×2000 with 10mm cells (works for mm-scale scan data)

---

### 5. VLD4 Format (Keyence VLANALYZER)

Investigated and decoded `glovebox.vld4` (196 MB, Keyence VL-series 3D scanner):

**Format structure:**
```
[0x00]  Magic: "KEYENCE VLANALYZER\x00" (19 bytes)
[0x14]  Header metadata (little-endian uint32 fields)
[0x38]  BMP preview image (256×192, 32-bit RGBA, 196,662 bytes)
[0x3006E] zstd-compressed body → .NET DataContract XML
         └── AnalysisModel → MeshElement → ModelMesh → _meshDataModel
             ├── Vertex: base64(float32[]) — 32 bytes/vertex
             │   Layout: [pos.xyz (12B)] [norm.xyz (12B)] [uv.xy (8B)]
             ├── Index: base64(uint32[]) — triangle face indices
             ├── Transformation: 4×4 matrix
             └── BC6HHdrImages: HDR texture data (BC6H compressed)
```

**Exported:** `glovebox.stl` on Desktop — 531,398 vertices, 1,061,398 triangles, 258×201×40 mm bounding box.

**To add VLD4 import to the app** (not yet implemented, for next session):
- Add `runtimes/open3d-python/handlers/vld4_import.py`
- Logic: read BMP header → skip to zstd offset → decompress → parse XML → extract Vertex/Index base64 → build trimesh → export
- Register in `main.py` as `'vld4-import': vld4_import.handle`
- Add route in `open3d-api/src/index.ts`
- Add upload button in CAD page or new import page

---

## Running the App

```bash
cd /Users/ms_m3_p/Documents/Coding/master-weaver-opensoftware-starter
pnpm dev
# Frontend: http://localhost:4172
# API:      http://localhost:4173
```

**Ports:**
- 4172 — open3d-studio (Next.js)
- 4173 — open3d-api (Express + Python LRP)

**Python venv** (if not set up):
```bash
cd runtimes/open3d-python
python3 -m venv .venv && .venv/bin/pip install trimesh numpy zstd
```

---

## Known Limitations / Next Steps

| Item | Status | Notes |
|------|--------|-------|
| VLD4 native import in app | Not implemented | Parser logic proven in Python, see section 5 above |
| `xcrun realityconverter` | Not available | Requires full Xcode.app (not just CLT) |
| `.venv` not in git | By design | Must be recreated on each machine |
| Large STL in CAD viewer | Works but slow | 1M tri mesh takes ~3s to parse in browser |
| STEP/IGES export | Route exists | Requires `FreeCAD` or `Open CASCADE` in the Python runtime |
| AR Quick Look link | Safari only | Chrome/Firefox don't support `rel="ar"` |

---

## Test Files on Desktop

| File | Size | Description |
|------|------|-------------|
| `glovebox.stl` | 50.6 MB | Exported from glovebox.vld4 — 531k verts, 1M tris |
| `glovebox.vld4` | 196 MB | Original Keyence VL-series scan |
| `Untitled Object 4.objcap` | ~134 images + 8.4MB USDZ | iPhone Object Capture bundle |
