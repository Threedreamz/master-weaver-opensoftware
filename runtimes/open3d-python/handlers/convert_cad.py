"""convert-cad: CAD format conversion using pythonOCC (STEP/IGES/BREP)."""

import os


def handle(params: dict) -> dict:
    input_path = params.get('inputPath', '')
    output_format = params.get('outputFormat', 'stl')
    options = params.get('options', {})

    if not input_path or not os.path.exists(input_path):
        raise FileNotFoundError(f'Input file not found: {input_path}')

    input_ext = input_path.rsplit('.', 1)[-1].lower()
    if input_ext in ('step', 'stp', 'iges', 'igs', 'brep'):
        return _convert_with_pythonocc(input_path, output_format, options)

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
