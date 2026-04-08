'use client';
import { useState, useCallback } from 'react';
import { FileUploader } from '@/components/FileUploader';
import { InfoPanel } from '@/components/InfoPanel';
import { DownloadButton } from '@/components/DownloadButton';
import { TabSelector } from '@/components/TabSelector';


export default function DrawingTo3DPage() {
  const [mode, setMode] = useState<'upload' | 'result'>('upload');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Record<string, any> | null>(null);
  const [drawingPreview, setDrawingPreview] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [iterationCount, setIterationCount] = useState(0);
  const [backend, setBackend] = useState('ollama');

  const handleFiles = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    // Show drawing preview
    const reader = new FileReader();
    reader.onload = (e) => setDrawingPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    setLoading(true);
    setError(null);

    try {
      // Upload file first
      const formData = new FormData();
      formData.append('drawing', file);

      const uploadRes = await fetch(`/api/drawing-to-3d/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) throw new Error('Upload failed');
      const { drawingPath } = await uploadRes.json();

      // Run the pipeline
      const pipelineRes = await fetch(`/api/drawing-to-3d`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drawingPath, aiBackend: backend }),
      });

      if (!pipelineRes.ok) throw new Error('Pipeline failed');
      const data = await pipelineRes.json();

      setResult(data);
      setIterationCount(1);
      setMode('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [backend]);

  const handleCorrection = useCallback(async () => {
    if (!result || !feedback.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/drawing-to-3d`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          drawingPath: result.stlPath ? result.stlPath.replace('/model.stl', '').replace('/model.scad', '') + '/../drawing' : '',
          aiBackend: backend,
          userFeedback: feedback,
          iterationId: `correction-${Date.now()}`,
        }),
      });

      if (!res.ok) throw new Error('Correction failed');
      const data = await res.json();

      setResult(data);
      setIterationCount(prev => prev + 1);
      setFeedback('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [result, feedback, backend]);

  const handleReset = () => {
    setMode('upload');
    setResult(null);
    setDrawingPreview(null);
    setFeedback('');
    setIterationCount(0);
    setError(null);
  };

  return (
    <div className="page">
      <h1>2D → 3D Converter</h1>

      <div className="page-layout">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
          {mode === 'upload' && (
            <>
              <FileUploader
                accept=".png,.jpg,.jpeg,.pdf,.svg,.bmp"
                onFiles={handleFiles}
                label="Drop technical drawing to convert (PNG, JPG, PDF, SVG)"
              />
              {drawingPreview && (
                <div className="card">
                  <span className="label">Drawing Preview</span>
                  <img src={drawingPreview} alt="Drawing" style={{ maxWidth: '100%', maxHeight: 400, borderRadius: 4, marginTop: 8 }} />
                </div>
              )}
            </>
          )}

          {mode === 'result' && result && (
            <>
              {result.extractedData && (
                <InfoPanel
                  title="Extracted Data"
                  data={{
                    'Part Name': result.extractedData.part_name || result.extractedData.partName || '—',
                    'Dimensions': result.extractedData.overall_dimensions
                      ? `${result.extractedData.overall_dimensions.length} × ${result.extractedData.overall_dimensions.width} × ${result.extractedData.overall_dimensions.height} ${result.extractedData.overall_dimensions.unit}`
                      : '—',
                    'Features': Array.isArray(result.extractedData.features) ? `${result.extractedData.features.length} detected` : '—',
                    'Material': result.extractedData.material || '—',
                    'Views': Array.isArray(result.extractedData.views_detected || result.extractedData.viewsDetected)
                      ? (result.extractedData.views_detected || result.extractedData.viewsDetected).join(', ')
                      : '—',
                  }}
                />
              )}

              {result.openscadCode && (
                <div className="card">
                  <span className="label">OpenSCAD Code</span>
                  <pre style={{ fontSize: '0.75rem', maxHeight: 300, overflow: 'auto', background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: 4, marginTop: 8, whiteSpace: 'pre-wrap' }}>
                    {result.openscadCode}
                  </pre>
                </div>
              )}

              {result.validationResult && result.validationScore != null && (
                <InfoPanel
                  title="Validation"
                  data={{
                    'Match Score': `${(result.validationScore * 100).toFixed(0)}%`,
                    'Accuracy': result.validationResult.dimension_accuracy || result.validationResult.dimensionAccuracy || '—',
                    'Assessment': result.validationResult.overall_assessment || result.validationResult.overallAssessment || '—',
                    'Needs Correction': result.validationResult.needs_correction || result.validationResult.needsCorrection ? 'Yes' : 'No',
                  }}
                />
              )}

              <div className="card">
                <span className="label">Correction Feedback (Iteration {iterationCount})</span>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="Describe what needs to be corrected..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  style={{ marginTop: 8, resize: 'vertical' }}
                />
                <button
                  className="btn btn-secondary"
                  onClick={handleCorrection}
                  disabled={loading || !feedback.trim()}
                  style={{ marginTop: 8 }}
                >
                  {loading ? 'Regenerating...' : 'Apply Correction'}
                </button>
              </div>
            </>
          )}

          {loading && mode === 'upload' && (
            <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
              <div className="spinner" style={{ width: 24, height: 24, margin: '0 auto 0.5rem', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
              <p style={{ color: 'var(--text-muted)' }}>Analyzing drawing and generating 3D model...</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', opacity: 0.7 }}>This may take 30-60 seconds depending on AI backend</p>
            </div>
          )}

          {error && <div className="error-msg">{error}</div>}
        </div>

        <div className="sidebar">
          <div className="card">
            <span className="label">AI Backend</span>
            <select
              value={backend}
              onChange={(e) => setBackend(e.target.value)}
              className="input"
              style={{ marginTop: 4 }}
            >
              <option value="ollama">Ollama (local)</option>
              <option value="claude">Claude API</option>
              <option value="lmstudio">LM Studio</option>
            </select>
          </div>

          <div className="card">
            <span className="label">Info</span>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Upload a 2D technical drawing. AI analyzes dimensions and features,
              generates OpenSCAD code, and renders a 3D STL model.
              Iterative corrections supported.
            </p>
          </div>

          {result?.success && (
            <>
              <InfoPanel
                title="Result"
                data={{
                  'Status': result.success ? 'Success' : 'Failed',
                  'Duration': result.duration ? `${result.duration.toFixed(1)}s` : '—',
                  'Iterations': iterationCount,
                }}
              />
              {result.stlPath && (
                <DownloadButton data={result.openscadCode || ''} filename="model.scad" label="Download SCAD" />
              )}
            </>
          )}

          {mode === 'result' && (
            <button className="btn btn-secondary" onClick={handleReset}>New Drawing</button>
          )}
        </div>
      </div>
    </div>
  );
}
