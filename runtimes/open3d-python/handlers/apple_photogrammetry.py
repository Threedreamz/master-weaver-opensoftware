"""apple-photogrammetry: Apple Object Capture via Swift CLI (macOS only)."""
import os
import subprocess
import platform
import shutil


def handle(params: dict) -> dict:
    images_dir = params.get('imagesDir', '')
    quality = params.get('quality', 'medium')
    output_format = params.get('outputFormat', 'usdz')

    if not images_dir or not os.path.isdir(images_dir):
        raise FileNotFoundError(f'Images directory not found: {images_dir}')

    # Check if we're on macOS
    if platform.system() != 'Darwin':
        return _fallback_colmap(images_dir, output_format)

    output_path = os.path.join(images_dir, f'apple_capture.{output_format}')

    # Try Apple's photogrammetry CLI tool
    try:
        # Check for the apple-photogrammetry Swift CLI
        swift_cli = _find_swift_cli()
        if swift_cli:
            return _run_apple_capture(swift_cli, images_dir, output_path, quality, output_format)
    except Exception:
        pass

    # Try using Apple's built-in Object Capture via Swift subprocess
    try:
        return _run_swift_inline(images_dir, output_path, quality, output_format)
    except Exception:
        pass

    # Fallback to COLMAP
    return _fallback_colmap(images_dir, output_format)


def _find_swift_cli():
    """Find the apple-photogrammetry Swift CLI binary."""
    locations = [
        '/usr/local/bin/apple-photogrammetry',
        os.path.expanduser('~/bin/apple-photogrammetry'),
        # Check in the repos directory
        os.path.join(os.path.dirname(os.path.abspath(__file__)),
                     '..', '..', '..', '..', '..', 'master-weaver-master',
                     'repos', 'apple-photogrammetry', 'build', 'apple-photogrammetry'),
    ]
    for loc in locations:
        if os.path.isfile(loc) and os.access(loc, os.X_OK):
            return loc
    return None


def _run_apple_capture(cli_path, images_dir, output_path, quality, output_format):
    """Run Apple Object Capture via the Swift CLI tool."""
    result = subprocess.run([
        cli_path,
        '--input', images_dir,
        '--output', output_path,
        '--detail', quality,
        '--format', output_format,
    ], capture_output=True, text=True, timeout=600)

    if result.returncode != 0:
        raise RuntimeError(f'Apple Object Capture failed: {result.stderr[:500]}')

    vertex_count = 0
    try:
        import trimesh
        mesh = trimesh.load(output_path)
        vertex_count = len(mesh.vertices) if hasattr(mesh, 'vertices') else 0
    except Exception:
        pass

    return {
        'outputPath': output_path,
        'vertexCount': vertex_count,
        'success': True,
        'method': 'apple-object-capture',
    }


def _run_swift_inline(images_dir, output_path, quality, output_format):
    """Run Object Capture using inline Swift code via subprocess."""
    import tempfile

    quality_map = {
        'preview': 'preview', 'reduced': 'reduced',
        'medium': 'medium', 'full': 'full', 'raw': 'raw',
    }
    swift_quality = quality_map.get(quality, 'medium')

    swift_code = f'''
import Foundation
import RealityKit

let inputDir = URL(fileURLWithPath: "{images_dir}")
let outputURL = URL(fileURLWithPath: "{output_path}")

let session = try PhotogrammetrySession(input: inputDir)
try session.process(requests: [
    .modelFile(url: outputURL, detail: .{swift_quality})
])

for try await output in session.outputs {{
    switch output {{
    case .requestComplete(_, let result):
        print("COMPLETE")
    case .requestError(_, let error):
        print("ERROR: \\(error)")
    default:
        break
    }}
}}
'''

    with tempfile.NamedTemporaryFile(mode='w', suffix='.swift', delete=False) as f:
        f.write(swift_code)
        swift_path = f.name

    try:
        result = subprocess.run(
            ['swift', swift_path],
            capture_output=True, text=True, timeout=600,
        )
        if result.returncode != 0:
            raise RuntimeError(f'Swift Object Capture failed: {result.stderr[:500]}')

        return {
            'outputPath': output_path,
            'vertexCount': 0,
            'success': True,
            'method': 'apple-swift-inline',
        }
    finally:
        os.unlink(swift_path)


def _fallback_colmap(images_dir, output_format):
    """Fallback to COLMAP when not on macOS."""
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
