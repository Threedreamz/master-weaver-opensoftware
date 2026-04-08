"""convert-mesh: format conversion using trimesh (fast) or Blender (universal)."""

import os


def handle(params: dict) -> dict:
    input_path = params.get('inputPath', '')
    output_format = params.get('outputFormat', 'stl')
    options = params.get('options', {})

    if not input_path or not os.path.exists(input_path):
        raise FileNotFoundError(f'Input file not found: {input_path}')

    try:
        return _convert_with_trimesh(input_path, output_format, options)
    except Exception:
        return _convert_with_blender(input_path, output_format, options)


def _convert_with_trimesh(input_path: str, output_format: str, options: dict) -> dict:
    import trimesh
    mesh = trimesh.load(input_path)
    output_path = input_path.rsplit('.', 1)[0] + f'.{output_format}'
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
    import subprocess
    import tempfile

    output_path = input_path.rsplit('.', 1)[0] + f'.{output_format}'
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
        result = subprocess.run(['blender', '--background', '--python', script_path], capture_output=True, text=True, timeout=120)
        if result.returncode != 0:
            raise RuntimeError(f'Blender failed: {result.stderr[:500]}')
        return {'outputPath': output_path, 'success': True, 'metadata': {'converter': 'blender'}}
    finally:
        os.unlink(script_path)
