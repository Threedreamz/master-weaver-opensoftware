"""apple-photogrammetry: Apple Object Capture via RealityKit PhotogrammetrySession (macOS only)."""
import os
import subprocess
import platform
import shutil
import tempfile


def handle(params: dict) -> dict:
    images_dir = params.get('imagesDir', '')
    quality = params.get('quality', 'medium')
    output_format = params.get('outputFormat', 'usdz')

    # PhotogrammetrySession.Configuration settings
    feature_sensitivity = params.get('featureSensitivity', 'normal')   # normal | high
    sample_ordering = params.get('sampleOrdering', 'unordered')         # unordered | sequential
    object_masking = params.get('isObjectMaskingEnabled', True)          # Bool
    checkpoint_dir = params.get('checkpointDirectory', '')              # optional path

    if not images_dir or not os.path.isdir(images_dir):
        raise FileNotFoundError(f'Images directory not found: {images_dir}')

    if platform.system() != 'Darwin':
        return _fallback_colmap(images_dir, output_format)

    output_path = os.path.join(images_dir, f'apple_capture.{output_format}')

    cfg = {
        'quality': quality,
        'output_format': output_format,
        'feature_sensitivity': feature_sensitivity,
        'sample_ordering': sample_ordering,
        'object_masking': object_masking,
        'checkpoint_dir': checkpoint_dir,
    }

    # Try Apple's photogrammetry Swift CLI first
    try:
        swift_cli = _find_swift_cli()
        if swift_cli:
            return _run_apple_capture_cli(swift_cli, images_dir, output_path, cfg)
    except Exception:
        pass

    # Try inline Swift via RealityKit
    try:
        return _run_swift_inline(images_dir, output_path, cfg)
    except Exception:
        pass

    return _fallback_colmap(images_dir, output_format)


def _find_swift_cli():
    locations = [
        '/usr/local/bin/apple-photogrammetry',
        os.path.expanduser('~/bin/apple-photogrammetry'),
    ]
    for loc in locations:
        if os.path.isfile(loc) and os.access(loc, os.X_OK):
            return loc
    return None


def _run_apple_capture_cli(cli_path, images_dir, output_path, cfg):
    cmd = [
        cli_path,
        '--input', images_dir,
        '--output', output_path,
        '--detail', cfg['quality'],
        '--format', cfg['output_format'],
        '--feature-sensitivity', cfg['feature_sensitivity'],
        '--sample-ordering', cfg['sample_ordering'],
    ]
    if cfg['object_masking']:
        cmd.append('--object-masking')
    if cfg['checkpoint_dir']:
        cmd += ['--checkpoint-directory', cfg['checkpoint_dir']]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
    if result.returncode != 0:
        raise RuntimeError(f'Apple Object Capture CLI failed: {result.stderr[:500]}')

    return _make_result(output_path, cfg['output_format'], 'apple-object-capture-cli')


def _run_swift_inline(images_dir, output_path, cfg):
    """Run PhotogrammetrySession via inline Swift with full Configuration support."""

    object_masking_swift = 'true' if cfg['object_masking'] else 'false'

    checkpoint_swift = ''
    if cfg['checkpoint_dir'] and os.path.isdir(cfg['checkpoint_dir']):
        checkpoint_swift = f'''
    let checkpointURL = URL(fileURLWithPath: "{cfg['checkpoint_dir']}")
    configuration.checkpointDirectory = checkpointURL'''

    swift_code = f'''
import Foundation
import RealityKit

let inputDir = URL(fileURLWithPath: "{images_dir}")
let outputURL = URL(fileURLWithPath: "{output_path}")

var configuration = PhotogrammetrySession.Configuration()
configuration.featureSensitivity = .{cfg['feature_sensitivity']}
configuration.sampleOrdering = .{cfg['sample_ordering']}
configuration.isObjectMaskingEnabled = {object_masking_swift}{checkpoint_swift}

do {{
    let session = try PhotogrammetrySession(input: inputDir, configuration: configuration)
    try session.process(requests: [
        .modelFile(url: outputURL, detail: .{cfg['quality']})
    ])

    for try await output in session.outputs {{
        switch output {{
        case .requestComplete(_, _):
            print("COMPLETE")
            exit(0)
        case .requestError(_, let error):
            print("ERROR: \\(error.localizedDescription)")
            exit(1)
        case .processingComplete:
            break
        default:
            break
        }}
    }}
}} catch {{
    print("SWIFT_ERROR: \\(error.localizedDescription)")
    exit(1)
}}
'''

    with tempfile.NamedTemporaryFile(mode='w', suffix='.swift', delete=False) as f:
        f.write(swift_code)
        swift_path = f.name

    try:
        result = subprocess.run(
            ['swift', swift_path],
            capture_output=True, text=True, timeout=1800,
        )
        output_text = result.stdout + result.stderr
        if result.returncode != 0 or 'SWIFT_ERROR' in output_text or 'ERROR:' in output_text:
            raise RuntimeError(f'Swift PhotogrammetrySession failed: {output_text[:600]}')
        return _make_result(output_path, cfg['output_format'], 'apple-swift-photogrammetry')
    finally:
        os.unlink(swift_path)


def _make_result(output_path, fmt, method):
    vertex_count = 0
    try:
        import trimesh
        mesh = trimesh.load(output_path)
        vertex_count = len(mesh.vertices) if hasattr(mesh, 'vertices') else 0
    except Exception:
        pass
    return {
        'outputPath': output_path,
        'outputFormat': fmt,
        'vertexCount': vertex_count,
        'success': True,
        'method': method,
    }


def _fallback_colmap(images_dir, output_format):
    from handlers.photogrammetry import handle as colmap_handle
    return {
        **colmap_handle({
            'imagesDir': images_dir,
            'quality': 'medium',
            'outputFormat': 'ply' if output_format == 'usdz' else output_format,
        }),
        'method': 'colmap-fallback',
        'warnings': ['Not on macOS — using COLMAP instead of Apple Object Capture'],
    }
