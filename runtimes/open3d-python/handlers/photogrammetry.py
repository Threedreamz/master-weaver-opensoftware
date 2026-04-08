"""photogrammetry-reconstruct: 3D reconstruction from photos using COLMAP."""
import os
import subprocess
import tempfile


def handle(params: dict) -> dict:
    images_dir = params.get('imagesDir', '')
    quality = params.get('quality', 'medium')
    output_format = params.get('outputFormat', 'ply')

    if not images_dir or not os.path.isdir(images_dir):
        raise FileNotFoundError(f'Images directory not found: {images_dir}')

    with tempfile.TemporaryDirectory() as workspace:
        db_path = os.path.join(workspace, 'database.db')
        sparse_dir = os.path.join(workspace, 'sparse')
        dense_dir = os.path.join(workspace, 'dense')
        os.makedirs(sparse_dir)
        os.makedirs(dense_dir)

        quality_map = {'low': 2048, 'medium': 8192, 'high': 32768}
        max_features = quality_map.get(quality, 8192)

        # Feature extraction (GPL-isolated subprocess)
        subprocess.run([
            'colmap', 'feature_extractor',
            '--database_path', db_path,
            '--image_path', images_dir,
            '--SiftExtraction.max_num_features', str(max_features),
        ], check=True, capture_output=True, timeout=120)

        # Matching
        subprocess.run([
            'colmap', 'exhaustive_matcher',
            '--database_path', db_path,
        ], check=True, capture_output=True, timeout=120)

        # Sparse reconstruction
        subprocess.run([
            'colmap', 'mapper',
            '--database_path', db_path,
            '--image_path', images_dir,
            '--output_path', sparse_dir,
        ], check=True, capture_output=True, timeout=180)

        # Dense reconstruction
        subprocess.run([
            'colmap', 'image_undistorter',
            '--image_path', images_dir,
            '--input_path', os.path.join(sparse_dir, '0'),
            '--output_path', dense_dir,
        ], check=True, capture_output=True, timeout=60)

        subprocess.run([
            'colmap', 'patch_match_stereo',
            '--workspace_path', dense_dir,
        ], check=True, capture_output=True, timeout=300)

        subprocess.run([
            'colmap', 'stereo_fusion',
            '--workspace_path', dense_dir,
            '--output_path', os.path.join(dense_dir, 'fused.ply'),
        ], check=True, capture_output=True, timeout=60)

        # Convert to requested format
        output_path = os.path.join(workspace, f'output.{output_format}')
        fused_ply = os.path.join(dense_dir, 'fused.ply')

        if output_format == 'ply':
            import shutil
            shutil.copy(fused_ply, output_path)
        else:
            import trimesh
            mesh = trimesh.load(fused_ply)
            mesh.export(output_path, file_type=output_format)

        # Count vertices
        import trimesh
        result_mesh = trimesh.load(output_path)
        vertex_count = len(result_mesh.vertices) if hasattr(result_mesh, 'vertices') else 0

        # Copy to persistent location
        final_path = images_dir.rstrip('/') + f'_reconstruction.{output_format}'
        import shutil
        shutil.copy(output_path, final_path)

        return {
            'outputPath': final_path,
            'pointCount': vertex_count,
            'vertexCount': vertex_count,
            'success': True,
        }
