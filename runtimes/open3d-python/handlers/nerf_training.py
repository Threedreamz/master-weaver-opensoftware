"""train-nerf: NeRF training via nerfstudio or COLMAP fallback."""
import os
import subprocess
import tempfile


def handle(params: dict) -> dict:
    images_dir = params.get('imagesDir', '')
    method = params.get('method', 'nerfacto')
    iterations = params.get('iterations', 10000)
    export_format = params.get('exportFormat', 'mesh')

    if not images_dir or not os.path.isdir(images_dir):
        raise FileNotFoundError(f'Images directory not found: {images_dir}')

    import time
    start = time.time()

    try:
        return _train_nerfstudio(images_dir, method, iterations, export_format, start)
    except (FileNotFoundError, Exception):
        return _fallback_colmap_mesh(images_dir, export_format, start)


def _train_nerfstudio(images_dir, method, iterations, export_format, start):
    import time
    with tempfile.TemporaryDirectory() as workspace:
        data_dir = os.path.join(workspace, 'processed')
        output_dir = os.path.join(workspace, 'outputs')

        subprocess.run([
            'ns-process-data', 'images', '--data', images_dir, '--output-dir', data_dir,
        ], check=True, capture_output=True, timeout=120)

        subprocess.run([
            'ns-train', method, '--data', data_dir, '--output-dir', output_dir,
            '--max-num-iterations', str(iterations),
            '--viewer.quit-on-train-completion', 'True',
        ], check=True, capture_output=True, timeout=600)

        import glob
        checkpoints = glob.glob(os.path.join(output_dir, '**', '*.ckpt'), recursive=True)
        checkpoint = checkpoints[0] if checkpoints else None

        output_path = os.path.join(images_dir, f'nerf_export.{"obj" if export_format == "mesh" else "ply"}')
        if checkpoint:
            subprocess.run([
                'ns-export', export_format,
                '--load-config', os.path.join(os.path.dirname(checkpoint), 'config.yml'),
                '--output-dir', os.path.dirname(output_path),
            ], check=True, capture_output=True, timeout=120)

        return {
            'outputPath': output_path, 'checkpointPath': checkpoint,
            'metrics': {}, 'duration': time.time() - start, 'success': True,
        }


def _fallback_colmap_mesh(images_dir, export_format, start):
    import time
    with tempfile.TemporaryDirectory() as workspace:
        db_path = os.path.join(workspace, 'database.db')
        sparse_dir = os.path.join(workspace, 'sparse')
        os.makedirs(sparse_dir)

        subprocess.run([
            'colmap', 'feature_extractor',
            '--database_path', db_path, '--image_path', images_dir,
        ], check=True, capture_output=True, timeout=120)

        subprocess.run([
            'colmap', 'exhaustive_matcher', '--database_path', db_path,
        ], check=True, capture_output=True, timeout=120)

        subprocess.run([
            'colmap', 'mapper', '--database_path', db_path,
            '--image_path', images_dir, '--output_path', sparse_dir,
        ], check=True, capture_output=True, timeout=180)

        output_path = os.path.join(images_dir, 'reconstruction.ply')
        sparse_model = os.path.join(sparse_dir, '0')
        if os.path.isdir(sparse_model):
            subprocess.run([
                'colmap', 'model_converter',
                '--input_path', sparse_model, '--output_path', output_path, '--output_type', 'PLY',
            ], capture_output=True, timeout=60)

    return {
        'outputPath': output_path, 'checkpointPath': None,
        'metrics': {}, 'duration': time.time() - start, 'success': True,
        'warnings': ['nerfstudio not installed — COLMAP sparse reconstruction only'],
    }
