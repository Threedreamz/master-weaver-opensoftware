"""reality-composer: Convert iPhone scan / .objcap bundle to USDZ via Xcode tools (macOS only)."""
import os
import glob
import shutil
import platform
import subprocess
import tempfile


SUPPORTED_INPUTS = {'.usdz', '.obj', '.ply', '.glb', '.fbx', '.dae', '.abc', '.objcap'}


def handle(params: dict) -> dict:
    input_path = params.get('inputFile', '')
    output_format = params.get('outputFormat', 'usdz')
    reprocess = params.get('reprocess', False)  # force re-run photogrammetry from images

    # PhotogrammetrySession settings (forwarded to apple_photogrammetry)
    ap_config = {
        'quality':               params.get('quality', 'medium'),
        'featureSensitivity':    params.get('featureSensitivity', 'normal'),
        'sampleOrdering':        params.get('sampleOrdering', 'unordered'),
        'isObjectMaskingEnabled': params.get('isObjectMaskingEnabled', True),
        'checkpointDirectory':   params.get('checkpointDirectory', ''),
    }

    if not input_path:
        raise ValueError('inputFile is required')

    if platform.system() != 'Darwin':
        raise RuntimeError('Reality Composer processing requires macOS.')

    # ── .objcap bundle (directory produced by iPhone Object Capture) ──────────
    if os.path.isdir(input_path) or input_path.endswith('.objcap'):
        return _handle_objcap(input_path, output_format, reprocess, ap_config)

    if not os.path.isfile(input_path):
        raise FileNotFoundError(f'Scan file not found: {input_path}')

    ext = os.path.splitext(input_path)[1].lower()
    if ext not in SUPPORTED_INPUTS:
        raise ValueError(f'Unsupported format: {ext}. Supported: {", ".join(sorted(SUPPORTED_INPUTS))}')

    output_dir = tempfile.mkdtemp(prefix='reality_composer_')
    base_name = os.path.splitext(os.path.basename(input_path))[0]
    output_path = os.path.join(output_dir, f'{base_name}.{output_format}')
    return _convert_file(input_path, output_path, output_format)


def _handle_objcap(bundle_path: str, output_format: str, reprocess: bool, ap_config: dict) -> dict:
    """
    Process an iPhone Object Capture bundle (.objcap directory).

    Strategy:
      1. Use prebuilt USDZ from models/ (fast) — unless reprocess=True.
      2. Re-run PhotogrammetrySession from images/ with full configuration.
    """
    models_dir = os.path.join(bundle_path, 'models')
    images_dir = os.path.join(bundle_path, 'images')

    # Use checkpoint dir inside the bundle if not overridden
    checkpoint_dir = ap_config.get('checkpointDirectory', '')
    if not checkpoint_dir:
        bundle_checkpoint = os.path.join(bundle_path, 'checkpoint')
        if os.path.isdir(bundle_checkpoint):
            ap_config = {**ap_config, 'checkpointDirectory': bundle_checkpoint}

    # Strategy 1: prebuilt USDZ (skip if reprocess requested)
    existing = glob.glob(os.path.join(models_dir, '*.usdz'))
    if existing and not reprocess:
        usdz_path = existing[0]
        if output_format == 'usdz':
            return _success_result(usdz_path, 'usdz', 'objcap-prebuilt', bundle_path)
        output_dir = tempfile.mkdtemp(prefix='reality_composer_')
        base = os.path.splitext(os.path.basename(usdz_path))[0]
        output_path = os.path.join(output_dir, f'{base}.{output_format}')
        return _convert_file(usdz_path, output_path, output_format)

    # Strategy 2: (re-)process images with PhotogrammetrySession
    if os.path.isdir(images_dir) and len(os.listdir(images_dir)) > 0:
        from handlers.apple_photogrammetry import handle as ap_handle
        ap_params = {
            'imagesDir': images_dir,
            'outputFormat': output_format if output_format in ('usdz', 'obj', 'ply') else 'usdz',
            **ap_config,
        }
        result = ap_handle(ap_params)
        result['method'] = 'objcap-reprocess-' + result.get('method', 'photogrammetry')
        result['bundlePath'] = bundle_path
        result['imageCount'] = len(os.listdir(images_dir))
        return result

    raise RuntimeError(f'No processable content found in .objcap bundle: {bundle_path}')


def _convert_file(input_file: str, output_path: str, output_format: str) -> dict:
    """Convert a single mesh/scene file to the target format."""
    # Try xcrun realityconverter (requires full Xcode, not just CLI tools)
    converter = _find_xcrun_tool('realityconverter')
    if converter:
        cmd = [converter, '-i', input_file, '-o', output_path, '--optimize']
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        if result.returncode == 0 and os.path.isfile(output_path):
            return _success_result(output_path, output_format, 'xcrun-realityconverter')

    # Try trimesh for format conversion (Python, no Xcode needed)
    try:
        import trimesh
        mesh = trimesh.load(input_file)
        mesh.export(output_path)
        if os.path.isfile(output_path):
            return _success_result(output_path, output_format, 'trimesh-convert')
    except Exception as e:
        raise RuntimeError(
            f'Could not convert {os.path.basename(input_file)} to {output_format}. '
            f'Install Xcode for RealityConverter support, or trimesh for mesh conversion. '
            f'Detail: {e}'
        )


def _find_xcrun_tool(tool_name: str) -> str | None:
    try:
        result = subprocess.run(
            ['xcrun', '--find', tool_name],
            capture_output=True, text=True, timeout=10,
        )
        if result.returncode == 0:
            path = result.stdout.strip()
            return path if os.path.isfile(path) else None
    except Exception:
        pass
    return None


def _success_result(output_path: str, fmt: str, method: str, bundle_path: str = '') -> dict:
    file_size = os.path.getsize(output_path) if os.path.isfile(output_path) else 0
    vertex_count = 0
    try:
        import trimesh
        mesh = trimesh.load(output_path)
        vertex_count = len(mesh.vertices) if hasattr(mesh, 'vertices') else 0
    except Exception:
        pass
    result = {
        'outputPath': output_path,
        'format': fmt,
        'fileSize': file_size,
        'vertexCount': vertex_count,
        'success': True,
        'method': method,
    }
    if bundle_path:
        result['bundlePath'] = bundle_path
    return result
