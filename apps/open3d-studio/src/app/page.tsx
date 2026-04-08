const FEATURES = [
  { href: '/viewer', title: '3D Viewer', desc: 'View STL, OBJ, glTF, PLY, Gaussian Splats. Measure, clip, inspect.', badge: '6 formats' },
  { href: '/converter', title: 'Format Converter', desc: 'Convert between 3D formats with glTF-Transform optimization + Draco compression.', badge: '7 converters' },
  { href: '/slicer', title: '3D Print Slicer', desc: 'Slice for FDM and SLA printers. G-code export, 12 printer profiles.', badge: 'FDM + SLA' },
  { href: '/cad', title: 'Parametric CAD', desc: '8 primitives, extrude, revolve. Live preview with parameter sliders.', badge: '8 shapes' },
  { href: '/generate', title: 'AI 3D Generation', desc: 'Image to 3D (TripoSR, 0.5s) and Text to 3D (Shap-E). Neural mesh generation.', badge: 'AI powered' },
  { href: '/reconstruct', title: '3D Reconstruction', desc: 'Photos to 3D via COLMAP, NeRF (nerfstudio), or Gaussian Splatting.', badge: '3 methods' },
  { href: '/analyze', title: 'Mesh Analysis', desc: 'Volume, area, manifold check. Repair, decimate, transform, CSG booleans.', badge: '8 tools' },
  { href: '/simulate', title: 'Simulate', desc: 'Physics simulation, FEA stress analysis (CalculiX), CNC toolpath generation.', badge: 'FEA + CAM' },
];

export default function Home() {
  return (
    <main className="page">
      <h1>Open3D Studio</h1>
      <p style={{ color: 'var(--text-muted)', maxWidth: 600 }}>
        Unified 3D platform — 65 features across viewer, converter, slicer, CAD,
        AI generation, reconstruction, mesh processing, and simulation.
      </p>
      <div className="feature-grid">
        {FEATURES.map((f) => (
          <a key={f.href} href={f.href} className="feature-card">
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
            <span className="badge">{f.badge}</span>
          </a>
        ))}
      </div>
    </main>
  );
}
