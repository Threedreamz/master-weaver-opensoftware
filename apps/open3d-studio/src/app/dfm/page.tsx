'use client';
import { useState, useCallback } from 'react';
import { FileUploader } from '@/components/FileUploader';
import { InfoPanel } from '@/components/InfoPanel';


const MATERIALS = [
  'ABS', 'PP', 'PC', 'PA66', 'PA66-GF30', 'POM', 'PS', 'HIPS', 'PE',
  'PMMA', 'PBT', 'PET', 'TPU', 'PPS', 'PEEK',
];

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ff4444',
  warning: '#ffaa33',
  info: '#4488ff',
  ok: '#44cc88',
};

export default function DFMPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [material, setMaterial] = useState('ABS');
  const [moldDir, setMoldDir] = useState('Z');
  const [minWall, setMinWall] = useState(0.8);
  const [minDraft, setMinDraft] = useState(1.0);

  const moldDirVec = { X: [1,0,0], Y: [0,1,0], Z: [0,0,1] }[moldDir] || [0,0,1];

  const handleFiles = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Upload file
      const formData = new FormData();
      formData.append('drawing', file);  // reuse the multer upload endpoint
      const uploadRes = await fetch(`/api/drawing-to-3d/upload`, {
        method: 'POST',
        body: formData,
      });
      if (!uploadRes.ok) throw new Error('Upload failed');
      const { drawingPath } = await uploadRes.json();

      // Run DFM analysis
      const res = await fetch(`/api/dfm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputPath: drawingPath,
          material,
          moldDirection: moldDirVec,
          minWallThickness: minWall,
          minDraftAngle: minDraft,
        }),
      });
      if (!res.ok) throw new Error('DFM analysis failed');
      setResult(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [material, moldDirVec, minWall, minDraft]);

  return (
    <div className="page">
      <h1>DFM Analysis</h1>
      <p className="subtitle">
        Injection molding manufacturability: wall thickness, draft angles, undercuts, sharp edges, gate feasibility
      </p>

      <div className="page-layout">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
          {!result && (
            <FileUploader
              accept=".step,.stp,.iges,.stl"
              onFiles={handleFiles}
              label="Drop STEP or STL file for DFM analysis"
            />
          )}

          {loading && (
            <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
              <div className="spinner" style={{ width: 24, height: 24, margin: '0 auto 0.5rem', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
              <p style={{ color: 'var(--text-muted)' }}>Running DFM analysis...</p>
            </div>
          )}

          {error && (
            <div className="error-msg">{error}</div>
          )}

          {result?.summary && (
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <div className={`score-circle ${result.summary.overallScore >= 80 ? 'score-good' : result.summary.overallScore >= 50 ? 'score-warning' : 'score-bad'}`}>
                  {result.summary.overallScore}
                </div>
                <div>
                  <h3 style={{ margin: 0 }}>DFM Score</h3>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    Mold complexity: {result.summary.moldComplexity} | Material: {result.summary.material}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem' }}>
                <span className="status status-danger">Critical: {result.summary.critical}</span>
                <span className="status status-warning">Warnings: {result.summary.warnings}</span>
                <span className="status status-success">Passed: {result.summary.passed}</span>
              </div>
            </div>
          )}

          {result?.issues?.map((issue: any, i: number) => (
            <div key={i} className="card" style={{ borderLeft: `3px solid ${SEVERITY_COLORS[issue.severity] || '#666'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, fontSize: '0.9rem' }}>{issue.title}</h4>
                <span className={`severity severity-${issue.severity}`}>{issue.severity}</span>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0.5rem 0' }}>{issue.description}</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--accent)' }}>{issue.recommendation}</p>
            </div>
          ))}

          {result?.wallThickness && (
            <InfoPanel title="Wall Thickness" data={{
              'Min': `${result.wallThickness.min.toFixed(2)} mm`,
              'Max': `${result.wallThickness.max.toFixed(2)} mm`,
              'Mean': `${result.wallThickness.mean.toFixed(2)} mm`,
              'Std Dev': `${result.wallThickness.stdDev.toFixed(2)} mm`,
              'Samples': result.wallThickness.sampleCount,
            }} />
          )}

          {result?.draftAngle && (
            <InfoPanel title="Draft Angles" data={{
              'Total Faces': result.draftAngle.totalFaces,
              'Insufficient Draft': result.draftAngle.facesWithInsufficientDraft,
              'Negative Draft': result.draftAngle.facesWithNegativeDraft,
              'Min Draft': `${result.draftAngle.minDraft.toFixed(1)}°`,
              'Avg Draft': `${result.draftAngle.avgDraft.toFixed(1)}°`,
            }} />
          )}
        </div>

        <div className="sidebar">
          <div className="card">
            <span className="label">Material</span>
            <select value={material} onChange={e => setMaterial(e.target.value)} className="input" style={{ marginTop: 4 }}>
              {MATERIALS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div className="card">
            <span className="label">Mold Pull Direction</span>
            <select value={moldDir} onChange={e => setMoldDir(e.target.value)} className="input" style={{ marginTop: 4 }}>
              <option value="Z">Z (up)</option>
              <option value="Y">Y</option>
              <option value="X">X</option>
            </select>
          </div>

          <div className="card">
            <span className="label">Thresholds</span>
            <div style={{ fontSize: '0.8rem', marginTop: 4 }}>
              <label>Min Wall (mm)</label>
              <input type="number" className="input" value={minWall} step={0.1} min={0.1}
                onChange={e => setMinWall(Number(e.target.value))} style={{ marginBottom: 8 }} />
              <label>Min Draft (°)</label>
              <input type="number" className="input" value={minDraft} step={0.5} min={0}
                onChange={e => setMinDraft(Number(e.target.value))} />
            </div>
          </div>

          {result && (
            <button className="btn btn-secondary" onClick={() => { setResult(null); setError(null); }}>
              New Analysis
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
