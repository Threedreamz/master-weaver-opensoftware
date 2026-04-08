"""text-to-3d: Text prompt to 3D mesh using Shap-E."""
import os


def handle(params: dict) -> dict:
    prompt = params.get('prompt', '')
    num_samples = params.get('numSamples', 1)
    guidance_scale = params.get('guidanceScale', 15.0)
    output_format = params.get('outputFormat', 'glb')

    if not prompt:
        raise ValueError('Prompt is required')

    output_path = os.path.join(os.getcwd(), f'text_to_3d_output.{output_format}')

    import time
    start = time.time()

    try:
        import torch
        from shap_e.diffusion.sample import sample_latents
        from shap_e.diffusion.gaussian_diffusion import diffusion_from_config
        from shap_e.models.download import load_model, load_config
        from shap_e.util.notebooks import decode_latent_mesh

        device = 'cuda' if torch.cuda.is_available() else 'cpu'
        xm = load_model('transmitter', device=device)
        model = load_model('text300M', device=device)
        diffusion = diffusion_from_config(load_config('diffusion'))

        latents = sample_latents(
            batch_size=num_samples, model=model, diffusion=diffusion,
            guidance_scale=guidance_scale,
            model_kwargs=dict(texts=[prompt] * num_samples),
            progress=False, clip_denoised=True, use_fp16=True,
            use_karras=True, karras_steps=64, sigma_min=1e-3, sigma_max=160, s_churn=0,
        )

        mesh = decode_latent_mesh(xm, latents[0]).tri_mesh()
        import trimesh
        t_mesh = trimesh.Trimesh(vertices=mesh.verts, faces=mesh.faces)
        t_mesh.export(output_path, file_type=output_format)

        return {
            'meshPath': output_path, 'format': output_format,
            'duration': time.time() - start, 'model': 'shap-e', 'success': True,
        }
    except ImportError:
        # Fallback: generate basic primitive from prompt keywords
        import trimesh
        p = prompt.lower()
        if 'sphere' in p or 'ball' in p:
            mesh = trimesh.creation.icosphere(radius=1.0)
        elif 'cube' in p or 'box' in p:
            mesh = trimesh.creation.box(extents=[2, 2, 2])
        elif 'cylinder' in p or 'tube' in p:
            mesh = trimesh.creation.cylinder(radius=0.5, height=2.0)
        else:
            mesh = trimesh.creation.icosphere(radius=1.0)

        mesh.export(output_path, file_type=output_format)
        return {
            'meshPath': output_path, 'format': output_format,
            'duration': time.time() - start, 'model': 'fallback-primitive', 'success': True,
            'warnings': [f'Shap-E not installed — generated basic primitive for "{prompt}"'],
        }
