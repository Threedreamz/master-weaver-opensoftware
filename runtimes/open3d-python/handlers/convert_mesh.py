"""convert-mesh: format conversion using trimesh / usdcat / Blender."""

import os
import re
import shutil
import subprocess
import tempfile


def handle(params: dict) -> dict:
    input_path = params.get('inputPath', '')
    output_format = params.get('outputFormat', 'stl').lower()
    options = params.get('options', {})

    if not input_path or not os.path.exists(input_path):
        raise FileNotFoundError(f'Input file not found: {input_path}')

    ext = input_path.rsplit('.', 1)[-1].lower()

    # USDZ: extract mesh via usdcat, then convert
    if ext == 'usdz':
        return _convert_from_usdz(input_path, output_format)

    # General path: trimesh first, Blender fallback
    try:
        return _convert_with_trimesh(input_path, output_format, options)
    except Exception as trimesh_err:
        try:
            return _convert_with_blender(input_path, output_format, options)
        except Exception as blender_err:
            raise RuntimeError(
                f'trimesh failed: {trimesh_err} | blender failed: {blender_err}'
            )


def _convert_from_usdz(input_path: str, output_format: str) -> dict:
    """
    Extract geometry from USDZ via `usdcat --flatten`, parse the USDA,
    then write to the requested format (STL, OBJ, PLY, GLB).
    """
    usdcat = shutil.which('usdcat')
    if not usdcat:
        raise RuntimeError('usdcat not found — install Xcode Command Line Tools or USD library.')

    # Flatten USDZ → USDA text
    with tempfile.NamedTemporaryFile(mode='w', suffix='.usda', delete=False) as f:
        usda_path = f.name
    try:
        result = subprocess.run(
            [usdcat, '--flatten', '--out', usda_path, input_path],
            capture_output=True, text=True, timeout=60,
        )
        if result.returncode != 0:
            raise RuntimeError(f'usdcat failed: {result.stderr[:300]}')

        vertices, faces = _parse_usda_mesh(usda_path)
    finally:
        if os.path.exists(usda_path):
            os.unlink(usda_path)

    if not vertices or not faces:
        raise RuntimeError('No mesh geometry found in USDZ file.')

    output_dir = tempfile.mkdtemp(prefix='convert_mesh_')
    base = os.path.splitext(os.path.basename(input_path))[0]
    output_path = os.path.join(output_dir, f'{base}.{output_format}')

    import numpy as np
    import trimesh
    mesh = trimesh.Trimesh(vertices=np.array(vertices), faces=np.array(faces))
    mesh.export(output_path, file_type=output_format)

    return {
        'outputPath': output_path,
        'success': True,
        'metadata': {
            'converter': 'usdcat+trimesh',
            'vertices': len(vertices),
            'faces': len(faces),
        },
    }


def _parse_usda_mesh(usda_path: str) -> tuple:
    """Parse vertices and face indices from a USDA text file."""
    with open(usda_path, 'r') as f:
        content = f.read()

    # Extract points array: point3f[] points = [(x,y,z), ...]
    points_match = re.search(r'point3f\[\]\s+points\s*=\s*\[([^\]]+)\]', content, re.DOTALL)
    if not points_match:
        return [], []
    vertices = [
        [float(v) for v in pt.strip().strip('()').split(',')]
        for pt in re.findall(r'\([^)]+\)', points_match.group(1))
    ]

    # Extract face vertex indices: int[] faceVertexIndices = [0, 1, 2, ...]
    indices_match = re.search(r'int\[\]\s+faceVertexIndices\s*=\s*\[([^\]]+)\]', content, re.DOTALL)
    if not indices_match:
        return vertices, []
    flat = [int(i.strip()) for i in indices_match.group(1).split(',') if i.strip()]

    # All faces are triangles (faceVertexCounts all = 3)
    faces = [flat[i:i+3] for i in range(0, len(flat)-2, 3)]
    return vertices, faces


def _convert_with_trimesh(input_path: str, output_format: str, options: dict) -> dict:
    import trimesh
    mesh = trimesh.load(input_path)
    output_dir = tempfile.mkdtemp(prefix='convert_mesh_')
    base = os.path.splitext(os.path.basename(input_path))[0]
    output_path = os.path.join(output_dir, f'{base}.{output_format}')
    mesh.export(output_path, file_type=output_format)
    return {
        'outputPath': output_path,
        'success': True,
        'metadata': {
            'converter': 'trimesh',
            'vertices': len(mesh.vertices) if hasattr(mesh, 'vertices') else 0,
            'faces': len(mesh.faces) if hasattr(mesh, 'faces') else 0,
        },
    }


def _convert_with_blender(input_path: str, output_format: str, options: dict) -> dict:
    output_dir = tempfile.mkdtemp(prefix='convert_mesh_')
    base = os.path.splitext(os.path.basename(input_path))[0]
    output_path = os.path.join(output_dir, f'{base}.{output_format}')
    script = f'''
import bpy
bpy.ops.wm.read_homefile(use_empty=True)
ext = "{input_path}".rsplit(".", 1)[-1].lower()
importers = {{"stl": lambda p: bpy.ops.wm.stl_import(filepath=p), "obj": lambda p: bpy.ops.wm.obj_import(filepath=p), "fbx": lambda p: bpy.ops.import_scene.fbx(filepath=p), "gltf": lambda p: bpy.ops.import_scene.gltf(filepath=p), "glb": lambda p: bpy.ops.import_scene.gltf(filepath=p)}}
if ext in importers: importers[ext]("{input_path}")
out_ext = "{output_path}".rsplit(".", 1)[-1].lower()
exporters = {{"stl": lambda p: bpy.ops.wm.stl_export(filepath=p), "obj": lambda p: bpy.ops.wm.obj_export(filepath=p), "glb": lambda p: bpy.ops.export_scene.gltf(filepath=p, export_format="GLB")}}
if out_ext in exporters: exporters[out_ext]("{output_path}")
'''
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
        f.write(script)
        script_path = f.name
    try:
        result = subprocess.run(
            ['blender', '--background', '--python', script_path],
            capture_output=True, text=True, timeout=120,
        )
        if result.returncode != 0:
            raise RuntimeError(f'Blender failed: {result.stderr[:500]}')
        return {'outputPath': output_path, 'success': True, 'metadata': {'converter': 'blender'}}
    finally:
        os.unlink(script_path)
