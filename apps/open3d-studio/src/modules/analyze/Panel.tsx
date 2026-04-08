'use client';

import { useState, useCallback } from 'react';
import type { ModulePanelProps } from '@mw/open3d-types';
import { useViewerStore } from '@mw/open3d-viewer';

// ---------- types ----------

interface AnalysisResult {
  volume: string;
  surfaceArea: string;
  bboxX: string;
  bboxY: string;
  bboxZ: string;
  manifold: string;
  triangleCount: number;
  vertexCount: number;
  hasNormals: boolean;
}

// ---------- styles ----------

const styles = {
  panel: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.75rem',
    padding: '0.75rem',
    height: '100%',
    overflowY: 'auto' as const,
    background: '#0a0a1a',
    color: '#e0e0f0',
    fontSize: '0.85rem',
  },
  card: {
    background: '#12122a',
    border: '1px solid #2a2a4a',
    borderRadius: '0.5rem',
    padding: '0.75rem',
  },
  label: {
    display: 'block',
    color: '#8888aa',
    fontSize: '0.7rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: '0.4rem',
  },
  sliderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginTop: '0.25rem',
  },
  slider: {
    flex: 1,
    accentColor: '#4488ff',
  },
  value: {
    color: '#4488ff',
    fontSize: '0.8rem',
    minWidth: '3rem',
    textAlign: 'right' as const,
  },
  resultRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.25rem 0',
    borderBottom: '1px solid #1a1a3a',
  },
  resultLabel: {
    color: '#8888aa',
    fontSize: '0.8rem',
  },
  resultValue: {
    color: '#e0e0f0',
    fontWeight: 600,
    fontSize: '0.8rem',
  },
  statusGood: {
    color: '#44cc88',
    fontWeight: 600,
    fontSize: '0.8rem',
  },
  statusBad: {
    color: '#ff6666',
    fontWeight: 600,
    fontSize: '0.8rem',
  },
  btnPrimary: {
    width: '100%',
    padding: '0.5rem',
    border: 'none',
    borderRadius: '0.35rem',
    background: '#4488ff',
    color: '#fff',
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnSecondary: {
    width: '100%',
    padding: '0.5rem',
    border: '1px solid #2a2a4a',
    borderRadius: '0.35rem',
    background: '#1a1a3a',
    color: '#e0e0f0',
    fontSize: '0.85rem',
    cursor: 'pointer',
  },
  btnRow: {
    display: 'flex',
    gap: '0.4rem',
  },
  btnSmall: {
    flex: 1,
    padding: '0.4rem',
    border: '1px solid #2a2a4a',
    borderRadius: '0.35rem',
    background: '#1a1a3a',
    color: '#e0e0f0',
    fontSize: '0.75rem',
    cursor: 'pointer',
  },
  btnDisabled: {
    opacity: 0.4,
    pointerEvents: 'none' as const,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.25rem',
  },
  title: {
    fontSize: '0.95rem',
    fontWeight: 700,
    color: '#e0e0f0',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#8888aa',
    fontSize: '1.1rem',
    cursor: 'pointer',
    padding: '0.15rem 0.3rem',
    lineHeight: 1,
  },
  noModel: {
    color: '#8888aa',
    fontSize: '0.8rem',
    textAlign: 'center' as const,
    padding: '2rem 1rem',
  },
  sectionTitle: {
    display: 'block',
    color: '#e0e0f0',
    fontSize: '0.8rem',
    fontWeight: 600,
    marginBottom: '0.5rem',
  },
  paramLabel: {
    color: '#8888aa',
    fontSize: '0.75rem',
    marginTop: '0.4rem',
    display: 'block',
  },
  statusMsg: {
    color: '#44cc88',
    fontSize: '0.75rem',
    marginTop: '0.3rem',
    display: 'block',
  },
};

// ---------- component ----------

export function AnalyzePanel({ moduleId: _moduleId, isActive, onClose }: ModulePanelProps) {
  const { meshInfo, boundingBox, modelUrl, loadModelFromBlob } = useViewerStore();

  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [decimating, setDecimating] = useState(false);
  const [decimateRatio, setDecimateRatio] = useState(0.5);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const hasModel = !!(meshInfo || modelUrl);

  const handleAnalyze = useCallback(async () => {
    if (!meshInfo && !boundingBox) return;
    setAnalyzing(true);
    setStatusMessage(null);

    try {
      const meshLib = await import('@mw/open3d-mesh');

      if (meshInfo) {
        // Use meshInfo from the viewer store for basic stats
        const triCount = meshInfo.triangleCount ?? 0;
        const vertCount = meshInfo.vertexCount ?? 0;

        // Compute volume and surface area if we have bounding box
        let volume = 'N/A';
        let surfaceArea = 'N/A';
        let bboxX = 'N/A';
        let bboxY = 'N/A';
        let bboxZ = 'N/A';

        if (boundingBox) {
          const sx = boundingBox.size.x;
          const sy = boundingBox.size.y;
          const sz = boundingBox.size.z;
          bboxX = sx.toFixed(2);
          bboxY = sy.toFixed(2);
          bboxZ = sz.toFixed(2);
          // Approximate volume from bounding box (actual mesh volume would require triangle data)
          volume = (sx * sy * sz).toFixed(2);
          surfaceArea = (2 * (sx * sy + sy * sz + sx * sz)).toFixed(2);
        }

        setAnalysis({
          volume,
          surfaceArea,
          bboxX,
          bboxY,
          bboxZ,
          manifold: meshInfo.isManifold !== undefined ? (meshInfo.isManifold ? 'Yes' : 'No') : 'Unknown',
          triangleCount: triCount,
          vertexCount: vertCount,
          hasNormals: meshInfo.hasNormals ?? false,
        });
      }
    } catch (err) {
      console.error('Analysis failed:', err);
      setStatusMessage('Analysis failed. Check console for details.');
    } finally {
      setAnalyzing(false);
    }
  }, [meshInfo, boundingBox]);

  const handleRepair = useCallback(async () => {
    if (!modelUrl) return;
    setRepairing(true);
    setStatusMessage(null);

    try {
      // Fetch the current model data
      const response = await fetch(modelUrl);
      const buffer = await response.arrayBuffer();

      const meshLib = await import('@mw/open3d-mesh');
      const converter = await import('@mw/open3d-converter');

      // Parse STL to get mesh data
      const stlConverter = new converter.STLConverter();
      const parsed = stlConverter.parseSTL(Buffer.from(buffer));

      const indices = new Uint32Array(Array.from({ length: parsed.vertices.length / 3 }, (_, i) => i));

      // Repair
      const repairer = new meshLib.MeshRepairer();
      const result = repairer.repair(parsed.vertices, indices);

      // Re-export as STL
      const triCount = result.indices.length / 3;
      const buf = new ArrayBuffer(84 + triCount * 50);
      const view = new DataView(buf);
      view.setUint32(80, triCount, true);
      for (let t = 0; t < triCount; t++) {
        const off = 84 + t * 50;
        const i0 = result.indices[t * 3]! * 3;
        view.setFloat32(off, result.normals[i0]!, true);
        view.setFloat32(off + 4, result.normals[i0 + 1]!, true);
        view.setFloat32(off + 8, result.normals[i0 + 2]!, true);
        for (let v = 0; v < 3; v++) {
          const idx = result.indices[t * 3 + v]! * 3;
          view.setFloat32(off + 12 + v * 12, result.vertices[idx]!, true);
          view.setFloat32(off + 16 + v * 12, result.vertices[idx + 1]!, true);
          view.setFloat32(off + 20 + v * 12, result.vertices[idx + 2]!, true);
        }
      }

      const blob = new Blob([new Uint8Array(buf)], { type: 'application/octet-stream' });
      loadModelFromBlob(blob, 'stl');

      setStatusMessage(
        `Repaired: ${result.report.degenerateTrianglesRemoved} degenerate tris removed, ` +
        `${result.report.duplicateVerticesMerged} duplicate verts merged`
      );
    } catch (err) {
      console.error('Repair failed:', err);
      setStatusMessage('Repair failed. Ensure model is loaded as STL.');
    } finally {
      setRepairing(false);
    }
  }, [modelUrl, loadModelFromBlob]);

  const handleCenter = useCallback(async () => {
    if (!modelUrl) return;
    setStatusMessage(null);

    try {
      const response = await fetch(modelUrl);
      const buffer = await response.arrayBuffer();

      const meshLib = await import('@mw/open3d-mesh');
      const converter = await import('@mw/open3d-converter');

      const stlConverter = new converter.STLConverter();
      const parsed = stlConverter.parseSTL(Buffer.from(buffer));

      const transformer = new meshLib.MeshTransformer();
      const centered = transformer.center(parsed.vertices);

      // Re-export
      const triCount = Math.floor(centered.length / 9);
      const buf = new ArrayBuffer(84 + triCount * 50);
      const view = new DataView(buf);
      view.setUint32(80, triCount, true);
      for (let t = 0; t < triCount; t++) {
        const off = 84 + t * 50;
        // zero normal
        view.setFloat32(off, 0, true);
        view.setFloat32(off + 4, 0, true);
        view.setFloat32(off + 8, 0, true);
        for (let v = 0; v < 3; v++) {
          const idx = t * 9 + v * 3;
          view.setFloat32(off + 12 + v * 12, centered[idx]!, true);
          view.setFloat32(off + 16 + v * 12, centered[idx + 1]!, true);
          view.setFloat32(off + 20 + v * 12, centered[idx + 2]!, true);
        }
      }

      const blob = new Blob([new Uint8Array(buf)], { type: 'application/octet-stream' });
      loadModelFromBlob(blob, 'stl');
      setStatusMessage('Model centered at origin.');
    } catch (err) {
      console.error('Center failed:', err);
      setStatusMessage('Center failed. Ensure model is loaded as STL.');
    }
  }, [modelUrl, loadModelFromBlob]);

  const handleDecimate = useCallback(async () => {
    if (!modelUrl) return;
    setDecimating(true);
    setStatusMessage(null);

    try {
      const response = await fetch(modelUrl);
      const buffer = await response.arrayBuffer();

      const meshLib = await import('@mw/open3d-mesh');
      const converter = await import('@mw/open3d-converter');

      const stlConverter = new converter.STLConverter();
      const parsed = stlConverter.parseSTL(Buffer.from(buffer));

      const indices = new Uint32Array(Array.from({ length: parsed.vertices.length / 3 }, (_, i) => i));

      const result = meshLib.decimateMesh(parsed.vertices, parsed.normals, indices, decimateRatio);

      // Re-export
      const triCount = result.indices.length / 3;
      const buf = new ArrayBuffer(84 + triCount * 50);
      const view = new DataView(buf);
      view.setUint32(80, triCount, true);
      for (let t = 0; t < triCount; t++) {
        const off = 84 + t * 50;
        const i0 = result.indices[t * 3]! * 3;
        view.setFloat32(off, result.normals[i0]!, true);
        view.setFloat32(off + 4, result.normals[i0 + 1]!, true);
        view.setFloat32(off + 8, result.normals[i0 + 2]!, true);
        for (let v = 0; v < 3; v++) {
          const idx = result.indices[t * 3 + v]! * 3;
          view.setFloat32(off + 12 + v * 12, result.vertices[idx]!, true);
          view.setFloat32(off + 16 + v * 12, result.vertices[idx + 1]!, true);
          view.setFloat32(off + 20 + v * 12, result.vertices[idx + 2]!, true);
        }
      }

      const blob = new Blob([new Uint8Array(buf)], { type: 'application/octet-stream' });
      loadModelFromBlob(blob, 'stl');

      setStatusMessage(`Decimated: ${result.reductionPercent.toFixed(1)}% reduction (${result.finalVertexCount} vertices)`);
    } catch (err) {
      console.error('Decimate failed:', err);
      setStatusMessage('Decimation failed. Ensure model is loaded as STL.');
    } finally {
      setDecimating(false);
    }
  }, [modelUrl, decimateRatio, loadModelFromBlob]);

  const handleExportRepaired = useCallback(() => {
    if (!modelUrl) return;
    // Download the current model URL as-is (it reflects the latest mutations)
    const a = document.createElement('a');
    a.href = modelUrl;
    a.download = 'repaired.stl';
    a.click();
  }, [modelUrl]);

  if (!isActive) return null;

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.title}>Analyze</span>
        <button style={styles.closeBtn} onClick={onClose}>&times;</button>
      </div>

      {!hasModel ? (
        <div style={styles.noModel}>
          Load a model in the viewer to analyze it.
        </div>
      ) : (
        <>
          {/* Analysis Section */}
          <div style={styles.card}>
            <span style={styles.sectionTitle}>Analysis</span>

            {analysis ? (
              <>
                <div style={styles.resultRow}>
                  <span style={styles.resultLabel}>Triangles</span>
                  <span style={styles.resultValue}>{analysis.triangleCount.toLocaleString()}</span>
                </div>
                <div style={styles.resultRow}>
                  <span style={styles.resultLabel}>Vertices</span>
                  <span style={styles.resultValue}>{analysis.vertexCount.toLocaleString()}</span>
                </div>
                <div style={styles.resultRow}>
                  <span style={styles.resultLabel}>Volume</span>
                  <span style={styles.resultValue}>{analysis.volume}</span>
                </div>
                <div style={styles.resultRow}>
                  <span style={styles.resultLabel}>Surface Area</span>
                  <span style={styles.resultValue}>{analysis.surfaceArea}</span>
                </div>
                <div style={styles.resultRow}>
                  <span style={styles.resultLabel}>Bounding Box</span>
                  <span style={styles.resultValue}>
                    {analysis.bboxX} x {analysis.bboxY} x {analysis.bboxZ}
                  </span>
                </div>
                <div style={styles.resultRow}>
                  <span style={styles.resultLabel}>Manifold</span>
                  <span style={analysis.manifold === 'Yes' ? styles.statusGood : analysis.manifold === 'No' ? styles.statusBad : styles.resultValue}>
                    {analysis.manifold}
                  </span>
                </div>
                <div style={styles.resultRow}>
                  <span style={styles.resultLabel}>Has Normals</span>
                  <span style={analysis.hasNormals ? styles.statusGood : styles.statusBad}>
                    {analysis.hasNormals ? 'Yes' : 'No'}
                  </span>
                </div>
              </>
            ) : (
              <span style={{ color: '#8888aa', fontSize: '0.75rem' }}>
                Click Analyze to inspect the loaded model.
              </span>
            )}

            <button
              style={{
                ...styles.btnPrimary,
                marginTop: '0.5rem',
                ...(analyzing ? styles.btnDisabled : {}),
              }}
              onClick={handleAnalyze}
              disabled={analyzing}
            >
              {analyzing ? 'Analyzing...' : 'Analyze'}
            </button>
          </div>

          {/* Repair Section */}
          <div style={styles.card}>
            <span style={styles.sectionTitle}>Repair</span>
            <div style={styles.btnRow}>
              <button
                style={{
                  ...styles.btnSmall,
                  ...(repairing ? styles.btnDisabled : {}),
                }}
                onClick={handleRepair}
                disabled={repairing}
              >
                {repairing ? 'Repairing...' : 'Repair Mesh'}
              </button>
              <button style={styles.btnSmall} onClick={handleCenter}>
                Center Model
              </button>
            </div>

            {/* Decimate */}
            <span style={styles.paramLabel}>Decimate Target Ratio</span>
            <div style={styles.sliderRow}>
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.05}
                value={decimateRatio}
                onChange={(e) => setDecimateRatio(Number(e.target.value))}
                style={styles.slider}
              />
              <span style={styles.value}>{(decimateRatio * 100).toFixed(0)}%</span>
            </div>
            <button
              style={{
                ...styles.btnSmall,
                width: '100%',
                marginTop: '0.4rem',
                ...(decimating ? styles.btnDisabled : {}),
              }}
              onClick={handleDecimate}
              disabled={decimating}
            >
              {decimating ? 'Decimating...' : 'Decimate'}
            </button>

            {statusMessage && (
              <span style={styles.statusMsg}>{statusMessage}</span>
            )}
          </div>

          {/* Export */}
          <button style={styles.btnSecondary} onClick={handleExportRepaired}>
            Export Repaired STL
          </button>
        </>
      )}
    </div>
  );
}
