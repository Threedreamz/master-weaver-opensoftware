#!/usr/bin/env python3
"""
Open3D Python LRP Runtime

Handles heavy 3D processing via JSON-RPC 2.0 over stdio:
- Blender-based format conversion
- pythonOCC for STEP/IGES/BREP
- trimesh for mesh analysis
- Pillow + numpy for 2D-to-3D heightmaps
"""

import sys
import json
import traceback

from handlers import convert_mesh, convert_cad, analyze_mesh, generate_heightmap
from handlers import photogrammetry, cam_toolpath, fea_solver
from handlers import gaussian_splat, image_to_3d, text_to_3d, nerf_training
from handlers import apple_photogrammetry
from handlers import reality_composer
from handlers import vld4_import
from handlers import drawing_to_3d


HANDLERS = {
    'convert-mesh': convert_mesh.handle,
    'convert-cad': convert_cad.handle,
    'analyze-mesh': analyze_mesh.handle,
    'generate-heightmap': generate_heightmap.handle,
    'photogrammetry-reconstruct': photogrammetry.handle,
    'cam-toolpath': cam_toolpath.handle,
    'fea-stress-analysis': fea_solver.handle,
    'train-gaussian-splat': gaussian_splat.handle,
    'image-to-3d': image_to_3d.handle,
    'text-to-3d': text_to_3d.handle,
    'train-nerf': nerf_training.handle,
    'apple-photogrammetry': apple_photogrammetry.handle,
    'reality-composer': reality_composer.handle,
    'vld4-import': vld4_import.handle,
    'drawing-to-3d': drawing_to_3d.handle,
}


def handle_request(request: dict) -> dict:
    method = request.get('method', '')
    params = request.get('params', {})
    req_id = request.get('id')

    handler = HANDLERS.get(method)
    if not handler:
        return {
            'jsonrpc': '2.0',
            'error': {'code': -32601, 'message': f'Method not found: {method}'},
            'id': req_id,
        }

    try:
        result = handler(params)
        return {'jsonrpc': '2.0', 'result': result, 'id': req_id}
    except Exception as e:
        return {
            'jsonrpc': '2.0',
            'error': {'code': -32000, 'message': str(e), 'data': traceback.format_exc()},
            'id': req_id,
        }


def main():
    sys.stderr.write('Open3D Python LRP runtime started\n')
    sys.stderr.flush()

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            request = json.loads(line)
        except json.JSONDecodeError as e:
            resp = {'jsonrpc': '2.0', 'error': {'code': -32700, 'message': f'Parse error: {e}'}, 'id': None}
            sys.stdout.write(json.dumps(resp) + '\n')
            sys.stdout.flush()
            continue

        response = handle_request(request)
        sys.stdout.write(json.dumps(response) + '\n')
        sys.stdout.flush()


if __name__ == '__main__':
    main()
