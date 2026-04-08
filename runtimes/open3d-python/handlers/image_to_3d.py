"""image-to-3d: Single image to 3D mesh using TripoSR."""
import os


def handle(params: dict) -> dict:
    image_path = params.get('imagePath', '')
    model = params.get('model', 'triposr')
    quality = params.get('quality', 'medium')
    output_format = params.get('outputFormat', 'glb')
    remove_bg = params.get('removeBackground', True)

    if not image_path or not os.path.exists(image_path):
        raise FileNotFoundError(f'Image not found: {image_path}')

    output_path = image_path.rsplit('.', 1)[0] + f'_3d.{output_format}'

    import time
    start = time.time()

    if model == 'triposr':
        result = _generate_triposr(image_path, output_path, output_format, remove_bg)
    elif model == 'instantmesh':
        result = _generate_instantmesh(image_path, output_path, output_format)
    else:
        result = _generate_triposr(image_path, output_path, output_format, remove_bg)

    result['duration'] = time.time() - start
    return result


def _generate_triposr(image_path, output_path, output_format, remove_bg):
    """Generate 3D mesh using TripoSR (MIT license)."""
    try:
        import torch
        from tsr.system import TSR
        from PIL import Image

        # Load model (auto-downloads from HuggingFace)
        device = 'cuda' if torch.cuda.is_available() else 'cpu'
        model = TSR.from_pretrained('stabilityai/TripoSR', config_name='config.yaml', weight_name='model.ckpt')
        model.to(device)

        # Load and preprocess image
        image = Image.open(image_path).convert('RGB')

        if remove_bg:
            try:
                from rembg import remove
                image = remove(image)
            except ImportError:
                pass  # Continue without background removal

        # Generate 3D
        with torch.no_grad():
            scene_codes = model([image], device)

        # Extract mesh
        meshes = model.extract_mesh(scene_codes)
        mesh = meshes[0]

        # Export
        import trimesh
        t_mesh = trimesh.Trimesh(
            vertices=mesh.v_pos.cpu().numpy(),
            faces=mesh.t_pos_idx.cpu().numpy(),
        )
        t_mesh.export(output_path, file_type=output_format)

        return {
            'meshPath': output_path,
            'vertexCount': len(t_mesh.vertices),
            'textured': False,
            'model': 'triposr',
            'success': True,
        }
    except ImportError:
        return _fallback_basic(image_path, output_path, output_format)


def _generate_instantmesh(image_path, output_path, output_format):
    """Generate using InstantMesh (if available)."""
    try:
        import subprocess
        result = subprocess.run([
            'python', '-m', 'instantmesh', '--input', image_path, '--output', output_path,
        ], capture_output=True, text=True, timeout=120)
        if result.returncode == 0:
            return {'meshPath': output_path, 'success': True, 'model': 'instantmesh'}
    except Exception:
        pass
    return _fallback_basic(image_path, output_path, output_format)


def _fallback_basic(image_path, output_path, output_format):
    """Fallback: generate a depth-based heightmap mesh from the image."""
    from PIL import Image
    import numpy as np

    img = Image.open(image_path).convert('L')
    img = img.resize((128, 128))
    pixels = np.array(img, dtype=np.float32) / 255.0

    rows, cols = pixels.shape
    vertices = []
    faces = []
    for r in range(rows):
        for c in range(cols):
            x = (c / max(cols - 1, 1)) * 10 - 5
            z = (r / max(rows - 1, 1)) * 10 - 5
            y = pixels[r, c] * 2
            vertices.append([x, y, z])

    for r in range(rows - 1):
        for c in range(cols - 1):
            i = r * cols + c
            faces.append([i, i + cols, i + 1])
            faces.append([i + 1, i + cols, i + cols + 1])

    import trimesh
    mesh = trimesh.Trimesh(vertices=np.array(vertices), faces=np.array(faces))
    mesh.fix_normals()
    mesh.export(output_path, file_type=output_format)

    return {
        'meshPath': output_path,
        'vertexCount': len(vertices),
        'textured': False,
        'model': 'fallback-heightmap',
        'success': True,
        'warnings': ['TripoSR not installed — using depth heightmap fallback'],
    }
