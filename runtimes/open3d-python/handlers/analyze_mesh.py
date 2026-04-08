"""analyze-mesh: mesh quality analysis using trimesh."""

import os
from typing import Any


def handle(params: dict) -> dict:
    input_path = params.get('inputPath', '')
    checks = params.get('checks', ['volume', 'surface-area', 'manifold'])

    if not input_path or not os.path.exists(input_path):
        raise FileNotFoundError(f'Input file not found: {input_path}')

    import trimesh
    mesh = trimesh.load(input_path)
    result: dict[str, Any] = {'success': True, 'warnings': []}

    if 'volume' in checks:
        try:
            result['volume'] = float(mesh.volume) if mesh.is_watertight else 0.0
            if not mesh.is_watertight:
                result['warnings'].append('Mesh not watertight — volume inaccurate')
        except Exception:
            result['volume'] = 0.0

    if 'surface-area' in checks:
        result['surfaceArea'] = float(mesh.area)

    if 'manifold' in checks:
        result['isManifold'] = bool(mesh.is_watertight)

    if 'printability' in checks:
        score = 100
        if not mesh.is_watertight:
            score -= 30
        if len(mesh.faces) > 1000000:
            score -= 10
        result['printabilityScore'] = max(0, score)

    return result
