"""convert-cad: CAD format conversion using pythonOCC (STEP/IGES/BREP) and OpenSCAD CLI (.scad)."""

import os
import shutil
import subprocess
import tempfile


def handle(params: dict) -> dict:
    input_path = params.get('inputPath', '')
    output_format = params.get('outputFormat', 'stl')
    options = params.get('options', {})

    if not input_path or not os.path.exists(input_path):
        raise FileNotFoundError(f'Input file not found: {input_path}')

    input_ext = input_path.rsplit('.', 1)[-1].lower()
    if input_ext in ('step', 'stp', 'iges', 'igs', 'brep'):
        return _convert_with_pythonocc(input_path, output_format, options)
    if input_ext in ('scad', 'jscad'):
        return _convert_openscad(input_path, output_format, options)

    raise ValueError(f'Unsupported CAD input format: {input_ext}')


def _convert_with_pythonocc(input_path: str, output_format: str, options: dict) -> dict:
    try:
        from OCC.Core.STEPControl import STEPControl_Reader
        from OCC.Core.IGESControl import IGESControl_Reader
        from OCC.Core.StlAPI import StlAPI_Writer
        from OCC.Core.BRepMesh import BRepMesh_IncrementalMesh
    except ImportError:
        raise RuntimeError('pythonOCC not installed. Install: conda install -c conda-forge pythonocc-core')

    ext = input_path.rsplit('.', 1)[-1].lower()
    if ext in ('step', 'stp'):
        reader = STEPControl_Reader()
        reader.ReadFile(input_path)
        reader.TransferRoots()
        shape = reader.OneShape()
    elif ext in ('iges', 'igs'):
        reader = IGESControl_Reader()
        reader.ReadFile(input_path)
        reader.TransferRoots()
        shape = reader.OneShape()
    else:
        raise ValueError(f'Unsupported: {ext}')

    ld = options.get('linearDeflection', 0.1)
    ad = options.get('angularDeflection', 0.5)
    BRepMesh_IncrementalMesh(shape, ld, False, ad).Perform()

    output_path = input_path.rsplit('.', 1)[0] + f'.{output_format}'
    if output_format == 'stl':
        StlAPI_Writer().Write(shape, output_path)
    else:
        raise ValueError(f'Unsupported output: {output_format}')

    return {'outputPath': output_path, 'success': True, 'metadata': {'converter': 'pythonocc', 'linearDeflection': ld}}


# ── OpenSCAD ──────────────────────────────────────────────────────────────────

def _find_openscad() -> str:
    """Return the OpenSCAD executable path or raise if not found.

    On macOS the brew-cask wrapper at /opt/homebrew/bin/openscad opens a GUI
    window and hangs in a subprocess call.  Always prefer the app-bundle binary
    which works correctly in headless CLI mode.
    """
    candidates = [
        # Homebrew cask — versioned app bundle (most reliable on macOS)
        '/opt/homebrew/Caskroom/openscad/2021.01/OpenSCAD-2021.01.app/Contents/MacOS/OpenSCAD',
        # Standard macOS Applications folder
        '/Applications/OpenSCAD.app/Contents/MacOS/OpenSCAD',
        # Linux / manual PATH install
    ]
    for path in candidates:
        if os.path.isfile(path) and os.access(path, os.X_OK):
            return path

    # Last resort: PATH lookup — works on Linux; on macOS the brew wrapper may hang
    found = shutil.which('openscad')
    if found:
        return found

    raise RuntimeError(
        'OpenSCAD CLI not found. Install from https://openscad.org/downloads.html '
        'or ensure it is on PATH.'
    )


def _convert_openscad(input_path: str, output_format: str, options: dict) -> dict:
    """Render a .scad file to STL (or OBJ) via the OpenSCAD CLI."""
    if output_format not in ('stl', 'obj', 'off', 'amf', '3mf'):
        raise ValueError(f'OpenSCAD output format "{output_format}" not supported. Use stl, obj, off, amf, or 3mf.')

    openscad = _find_openscad()

    # Build output path alongside the input
    output_path = input_path.rsplit('.', 1)[0] + f'.{output_format}'

    # Collect optional parameter overrides: {"name": value, ...}
    param_overrides: dict = options.get('parameterOverrides', {})

    with tempfile.NamedTemporaryFile(suffix='.scad', delete=False) as tmp_scad:
        tmp_path = tmp_scad.name

    try:
        # Prepend parameter override assignments so they shadow the originals
        if param_overrides:
            with open(input_path, 'r', encoding='utf-8') as f:
                original = f.read()
            overrides = '\n'.join(f'{k} = {v};' for k, v in param_overrides.items())
            with open(tmp_path, 'w', encoding='utf-8') as f:
                f.write(overrides + '\n\n' + original)
            scad_source = tmp_path
        else:
            scad_source = input_path

        cmd = [openscad, '-o', output_path, scad_source]

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=options.get('timeout', 60),
        )

        if result.returncode != 0:
            raise RuntimeError(
                f'OpenSCAD exited with code {result.returncode}.\n'
                f'stderr: {result.stderr.strip()}'
            )
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass

    return {
        'outputPath': output_path,
        'success': True,
        'metadata': {
            'converter': 'openscad',
            'outputFormat': output_format,
            'parameterOverrides': param_overrides,
        },
    }
