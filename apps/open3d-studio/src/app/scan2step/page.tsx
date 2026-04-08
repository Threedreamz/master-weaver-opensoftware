'use client';
import { useState, useCallback } from 'react';
import { FileUploader } from '@/components/FileUploader';
import { InfoPanel } from '@/components/InfoPanel';
import { SliderInput } from '@/components/SliderInput';


export default function Scan2StepPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [voxelSize, setVoxelSize] = useState(1.0);
  const [outlierRemoval, setOutlierRemoval] = useState(true);

  const handleFiles = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('drawing', file);
      const uploadRes = await fetch(`/api/drawing-to-3d/upload`, {
        method: 'POST',
        body: formData,
      });
      if (!uploadRes.ok) throw new Error('Upload failed');
      const { drawingPath } = await uploadRes.json();

      const res = await fetch(`/api/scan2step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scanPath: drawingPath,
          downsampleVoxelSize: voxelSize,
          outlierRemoval,
        }),
      });
      if (!res.ok) throw new Error('Scan-to-STEP failed');
      setResult(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [voxelSize, outlierRemoval]);

  return (
    <div className="page">
      <h1>Scan → STEP</h1>
      <p className="subtitle">
        Reverse engineer 3D scans into STEP solids via primitive fitting (planes, cylinders, spheres, cones)
      </p>

      <div className="page-layout">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
          {!result && (
            <FileUploader
              accept=".ply,.obj,.stl,.xyz,.pcd"
              onFiles={handleFiles}
              label="Drop 3D scan file (PLY, OBJ, STL, XYZ, PCD)"
            />
          )}

          {loading && (
            <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
              <div className="spinner" style={{ width: 24, height: 24, margin: '0 auto 0.5rem', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
              <p style={{ color: 'var(--text-muted)' }}>Processing scan...</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', opacity: 0.7 }}>Cleaning, fitting primitives, building STEP solid</p>
            </div>
          )}

          {error && <div className="error-msg">{error}</div>}

          {result && (
            <>
              <InfoPanel title="Result" data={{
                'Status': result.success ? 'Success' : 'Failed',
                'Points (original)': result.pointCount?.toLocaleString(),
                'Points (cleaned)': result.pointCountAfterCleanup?.toLocaleString(),
                'Primitives Found': result.primitives?.length || 0,
                'Duration': result.duration ? `${result.duration.toFixed(1)}s` : '—',
                'Output': result.stepPath || '—',
              }} />

              {result.primitives?.map((prim: any, i: number) => (
                <div key={i} className="card">
                  <h4 style={{ margin: 0, textTransform: 'capitalize' }}>{prim.type}</h4>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    {Object.entries(prim.parameters).map(([k, v]) => (
                      <span key={k} style={{ marginRight: 12 }}>
                        {k}: {typeof v === 'number' ? (v as number).toFixed(2) : String(v)}
                      </span>
                    ))}
                  </div>
                  <p style={{ fontSize: '0.75rem', margin: '4px 0 0' }}>
                    Inliers: {prim.inlierCount} | Fit error: {prim.fitError?.toFixed(3)}
                  </p>
                </div>
              ))}

              {result.warnings?.length > 0 && (
                <div className="card" style={{ borderColor: '#ffaa33' }}>
                  <span className="label" style={{ color: '#ffaa33' }}>Warnings</span>
                  {result.warnings.map((w: string, i: number) => (
                    <p key={i} style={{ fontSize: '0.8rem', margin: '4px 0' }}>{w}</p>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="sidebar">
          <div className="card">
            <SliderInput label="Voxel Size" min={0.1} max={5} step={0.1} value={voxelSize} onChange={setVoxelSize} unit="mm" />
          </div>
          <div className="card">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
              <input type="checkbox" checked={outlierRemoval} onChange={e => setOutlierRemoval(e.target.checked)} />
              Outlier Removal
            </label>
          </div>
          <div className="card">
            <span className="label">Info</span>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
              v1: Fits planes and cylinders via RANSAC.
              Builds B-Rep solids with pythonoCC and exports STEP.
              Best for mechanical parts with flat and cylindrical surfaces.
            </p>
          </div>
          {result && (
            <button className="btn btn-secondary" onClick={() => { setResult(null); setError(null); }}>
              New Scan
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
