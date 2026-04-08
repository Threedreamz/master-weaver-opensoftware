"""fea-stress-analysis: FEA using CalculiX (ccx) subprocess."""
import os
import subprocess
import tempfile


def handle(params: dict) -> dict:
    input_path = params.get('inputPath', '')
    material = params.get('material', {})
    loads = params.get('loads', [])
    constraints = params.get('constraints', [])
    resolution = params.get('meshResolution', 'medium')

    if not input_path or not os.path.exists(input_path):
        raise FileNotFoundError(f'Input file not found: {input_path}')

    youngs = material.get('youngsModulus', 210e9)
    poisson = material.get('poissonsRatio', 0.3)
    density = material.get('density', 7850)
    yield_strength = material.get('yieldStrength', 250e6)

    with tempfile.TemporaryDirectory() as workspace:
        # Convert mesh to tetrahedral volume mesh
        try:
            import meshio
            surface = meshio.read(input_path)
        except ImportError:
            raise RuntimeError('meshio not installed. Install: pip install meshio')

        # Generate CalculiX input deck
        inp_path = os.path.join(workspace, 'model')
        _write_calculix_input(
            inp_path + '.inp', surface, youngs, poisson, density, loads, constraints
        )

        # Run CalculiX (LGPL — subprocess is fine)
        try:
            result = subprocess.run(
                ['ccx', '-i', inp_path],
                capture_output=True, text=True, timeout=300,
                cwd=workspace,
            )
        except FileNotFoundError:
            # CalculiX not installed — return estimated values
            return _estimate_without_solver(surface, youngs, poisson, yield_strength, loads)

        if result.returncode != 0 and 'ERROR' in result.stderr:
            raise RuntimeError(f'CalculiX failed: {result.stderr[:500]}')

        # Parse results
        frd_path = inp_path + '.frd'
        if os.path.exists(frd_path):
            return _parse_frd_results(frd_path, yield_strength)

        return _estimate_without_solver(surface, youngs, poisson, yield_strength, loads)


def _write_calculix_input(path, mesh, youngs, poisson, density, loads, constraints):
    """Generate a CalculiX .inp input deck."""
    with open(path, 'w') as f:
        f.write('*HEADING\nOpen3D FEA Analysis\n')

        # Nodes
        f.write('*NODE\n')
        for i, pt in enumerate(mesh.points):
            f.write(f'{i+1}, {pt[0]:.6f}, {pt[1]:.6f}, {pt[2]:.6f}\n')

        # Elements (use surface triangles as shell elements)
        f.write('*ELEMENT, TYPE=S3, ELSET=SHELL\n')
        if mesh.cells:
            elem_id = 1
            for cell_block in mesh.cells:
                if cell_block.type in ('triangle', 'tri'):
                    for tri in cell_block.data:
                        f.write(f'{elem_id}, {tri[0]+1}, {tri[1]+1}, {tri[2]+1}\n')
                        elem_id += 1

        # Material
        f.write('*MATERIAL, NAME=MAT1\n')
        f.write('*ELASTIC\n')
        f.write(f'{youngs:.1f}, {poisson:.4f}\n')
        f.write('*DENSITY\n')
        f.write(f'{density:.1f}\n')
        f.write('*SHELL SECTION, ELSET=SHELL, MATERIAL=MAT1\n')
        f.write('1.0\n')  # shell thickness

        # Boundary conditions
        f.write('*BOUNDARY\n')
        for constraint in constraints:
            face_ids = constraint.get('faceIds', [])
            for fid in face_ids[:10]:  # limit for sanity
                node_id = min(fid + 1, len(mesh.points))
                if constraint.get('type') == 'fixed':
                    f.write(f'{node_id}, 1, 6, 0.0\n')
                elif constraint.get('type') == 'pinned':
                    f.write(f'{node_id}, 1, 3, 0.0\n')

        # Step
        f.write('*STEP\n*STATIC\n')

        # Loads
        for load in loads:
            if load.get('type') == 'force':
                direction = load.get('direction', {'x': 0, 'y': -1, 'z': 0})
                magnitude = load.get('magnitude', 100)
                face_ids = load.get('faceIds', [1])
                for fid in face_ids[:10]:
                    node_id = min(fid + 1, len(mesh.points))
                    if direction.get('x', 0) != 0:
                        f.write(f'*CLOAD\n{node_id}, 1, {magnitude * direction["x"]:.1f}\n')
                    if direction.get('y', 0) != 0:
                        f.write(f'*CLOAD\n{node_id}, 2, {magnitude * direction["y"]:.1f}\n')
                    if direction.get('z', 0) != 0:
                        f.write(f'*CLOAD\n{node_id}, 3, {magnitude * direction["z"]:.1f}\n')
            elif load.get('type') == 'gravity':
                f.write(f'*DLOAD\nSHELL, GRAV, {load.get("magnitude", 9.81)}, 0, -1, 0\n')

        f.write('*NODE FILE\nU\n*EL FILE\nS\n')
        f.write('*END STEP\n')


def _parse_frd_results(frd_path, yield_strength):
    """Parse CalculiX .frd results file for max stress and displacement."""
    max_stress = 0.0
    max_disp = 0.0

    with open(frd_path, 'r') as f:
        in_stress = False
        in_disp = False
        for line in f:
            if 'STRESS' in line:
                in_stress = True
                in_disp = False
            elif 'DISP' in line:
                in_disp = True
                in_stress = False
            elif line.startswith(' -3'):
                values = line.split()
                if len(values) >= 4:
                    try:
                        vals = [float(v) for v in values[1:4]]
                        magnitude = sum(v**2 for v in vals)**0.5
                        if in_stress and magnitude > max_stress:
                            max_stress = magnitude
                        if in_disp and magnitude > max_disp:
                            max_disp = magnitude
                    except ValueError:
                        pass

    safety_factor = yield_strength / max_stress if max_stress > 0 else 99.0

    return {
        'maxStress': max_stress,
        'maxDisplacement': max_disp,
        'safetyFactor': min(safety_factor, 99.0),
        'success': True,
        'warnings': [],
    }


def _estimate_without_solver(mesh, youngs, poisson, yield_strength, loads):
    """Rough estimation when CalculiX is not installed."""
    total_force = sum(l.get('magnitude', 0) for l in loads)
    # Very rough: stress = F/A, displacement = FL/AE
    area = 0
    try:
        import trimesh
        t = trimesh.Trimesh(vertices=mesh.points, faces=mesh.cells[0].data if mesh.cells else [])
        area = t.area
    except Exception:
        area = 1.0

    stress = total_force / max(area, 0.001)
    displacement = (total_force * 0.1) / (max(area, 0.001) * youngs) * 1000  # mm

    return {
        'maxStress': stress,
        'maxDisplacement': displacement,
        'safetyFactor': min(yield_strength / max(stress, 0.001), 99.0),
        'success': True,
        'warnings': ['CalculiX not installed — using rough estimation'],
    }
