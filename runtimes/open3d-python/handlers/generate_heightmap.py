"""generate-heightmap: 2D image to 3D heightmap mesh."""

import os


def handle(params: dict) -> dict:
    input_path = params.get('inputPath', '')
    width = params.get('width', 100.0)
    depth = params.get('depth', 100.0)
    max_height = params.get('maxHeight', 10.0)
    invert = params.get('invert', False)
    smooth = params.get('smooth', True)

    if not input_path or not os.path.exists(input_path):
        raise FileNotFoundError(f'Input file not found: {input_path}')

    import numpy as np
    from PIL import Image

    img = Image.open(input_path).convert('L')
    if smooth:
        from PIL import ImageFilter
        img = img.filter(ImageFilter.GaussianBlur(radius=1))

    pixels = np.array(img, dtype=np.float32) / 255.0
    if invert:
        pixels = 1.0 - pixels

    rows, cols = pixels.shape
    vertices = []
    for r in range(rows):
        for c in range(cols):
            x = (c / max(cols - 1, 1)) * width - width / 2
            z = (r / max(rows - 1, 1)) * depth - depth / 2
            y = pixels[r, c] * max_height
            vertices.append([x, y, z])

    faces = []
    for r in range(rows - 1):
        for c in range(cols - 1):
            i = r * cols + c
            faces.append([i, i + cols, i + 1])
            faces.append([i + 1, i + cols, i + cols + 1])

    import trimesh
    mesh = trimesh.Trimesh(vertices=np.array(vertices), faces=np.array(faces))
    mesh.fix_normals()

    output_path = input_path.rsplit('.', 1)[0] + '_heightmap.stl'
    mesh.export(output_path, file_type='stl')

    return {'outputPath': output_path, 'vertexCount': len(vertices), 'triangleCount': len(faces), 'success': True}
