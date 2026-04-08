'use client';

import { useState, useMemo, useCallback } from 'react';
import type { ModulePanelProps } from '@mw/open3d-types';
import { useViewerStore } from '@mw/open3d-viewer';

// ---------- shape types ----------

type ShapeType = 'box' | 'sphere' | 'cylinder' | 'cone' | 'torus' | 'wedge' | 'hemisphere';

interface ShapeDef {
  id: ShapeType;
  label: string;
}

const SHAPES: ShapeDef[] = [
  { id: 'box', label: 'Box' },
  { id: 'sphere', label: 'Sphere' },
  { id: 'cylinder', label: 'Cylinder' },
  { id: 'cone', label: 'Cone' },
  { id: 'torus', label: 'Torus' },
  { id: 'wedge', label: 'Wedge' },
  { id: 'hemisphere', label: 'Hemisphere' },
];

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
  shapeGrid: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '0.3rem',
  },
  shapeBtn: (active: boolean) => ({
    padding: '0.35rem 0.55rem',
    border: 'none',
    borderRadius: '0.35rem',
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: 600,
    background: active ? '#4488ff' : '#1a1a3a',
    color: active ? '#fff' : '#8888aa',
  }),
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
  paramLabel: {
    color: '#8888aa',
    fontSize: '0.75rem',
    marginTop: '0.4rem',
    display: 'block',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.4rem',
    marginTop: '0.3rem',
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.1rem',
  },
  infoLabel: {
    color: '#8888aa',
    fontSize: '0.65rem',
  },
  infoValue: {
    color: '#e0e0f0',
    fontWeight: 600,
    fontSize: '0.85rem',
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
};

// ---------- component ----------

export function CADPanel({ moduleId: _moduleId, isActive, onClose }: ModulePanelProps) {
  const { loadModelFromBlob } = useViewerStore();

  const [shape, setShape] = useState<ShapeType>('box');
  const [generating, setGenerating] = useState(false);

  // Box / Wedge
  const [width, setWidth] = useState(1);
  const [height, setHeight] = useState(1);
  const [depth, setDepth] = useState(1);

  // Sphere / Hemisphere / Torus
  const [radius, setRadius] = useState(1);
  const [segments, setSegments] = useState(32);

  // Cylinder / Cone
  const [radiusTop, setRadiusTop] = useState(0.5);
  const [radiusBottom, setRadiusBottom] = useState(0.5);

  // Cached STL/OBJ data after generation
  const [stlBlob, setStlBlob] = useState<Blob | null>(null);
  const [objBlob, setObjBlob] = useState<Blob | null>(null);
  const [meshStats, setMeshStats] = useState<{ triangles: number; vertices: number } | null>(null);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      const cad = await import('@mw/open3d-cad');

      let mesh: { vertices: Float32Array; normals: Float32Array; indices: Uint32Array };
      switch (shape) {
        case 'box':
          mesh = cad.createBox(width, height, depth);
          break;
        case 'sphere':
          mesh = cad.createSphere(radius, segments);
          break;
        case 'cylinder':
          mesh = cad.createCylinder(radiusTop, radiusBottom, height, segments);
          break;
        case 'cone':
          mesh = cad.createCone(radius, height, segments);
          break;
        case 'torus':
          mesh = cad.createTorus(radius, radius * 0.3, segments, Math.floor(segments / 2));
          break;
        case 'wedge':
          mesh = cad.createWedge(width, height, depth);
          break;
        case 'hemisphere':
          mesh = cad.createHemisphere(radius, segments);
          break;
        default:
          mesh = cad.createBox(1, 1, 1);
      }

      // Generate exports
      const stlData = cad.toSTL(mesh);
      const objData = cad.toOBJ(mesh);

      const stl = new Blob([stlData], { type: 'application/octet-stream' });
      const obj = new Blob([objData], { type: 'text/plain' });

      setStlBlob(stl);
      setObjBlob(obj);
      setMeshStats({
        triangles: mesh.indices.length / 3,
        vertices: mesh.vertices.length / 3,
      });

      // Load into viewer
      loadModelFromBlob(stl, 'stl');
    } catch (err) {
      console.error('CAD generation failed:', err);
    } finally {
      setGenerating(false);
    }
  }, [shape, width, height, depth, radius, segments, radiusTop, radiusBottom, loadModelFromBlob]);

  const handleDownload = useCallback((blob: Blob | null, ext: string) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${shape}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [shape]);

  if (!isActive) return null;

  // Determine which parameters to show
  const showWidthHeightDepth = shape === 'box' || shape === 'wedge';
  const showRadius = shape === 'sphere' || shape === 'hemisphere' || shape === 'torus' || shape === 'cone';
  const showRadiusTopBottom = shape === 'cylinder';
  const showHeight = shape === 'cylinder' || shape === 'cone';

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.title}>CAD</span>
        <button style={styles.closeBtn} onClick={onClose}>&times;</button>
      </div>

      {/* Shape Selector */}
      <div style={styles.card}>
        <span style={styles.label}>Shape</span>
        <div style={styles.shapeGrid}>
          {SHAPES.map((s) => (
            <button
              key={s.id}
              style={styles.shapeBtn(shape === s.id)}
              onClick={() => setShape(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dynamic Parameters */}
      <div style={styles.card}>
        <span style={styles.label}>Parameters</span>

        {showWidthHeightDepth && (
          <>
            <span style={styles.paramLabel}>Width</span>
            <div style={styles.sliderRow}>
              <input type="range" min={0.1} max={10} step={0.1} value={width} onChange={(e) => setWidth(Number(e.target.value))} style={styles.slider} />
              <span style={styles.value}>{width.toFixed(1)}</span>
            </div>
            <span style={styles.paramLabel}>Height</span>
            <div style={styles.sliderRow}>
              <input type="range" min={0.1} max={10} step={0.1} value={height} onChange={(e) => setHeight(Number(e.target.value))} style={styles.slider} />
              <span style={styles.value}>{height.toFixed(1)}</span>
            </div>
            <span style={styles.paramLabel}>Depth</span>
            <div style={styles.sliderRow}>
              <input type="range" min={0.1} max={10} step={0.1} value={depth} onChange={(e) => setDepth(Number(e.target.value))} style={styles.slider} />
              <span style={styles.value}>{depth.toFixed(1)}</span>
            </div>
          </>
        )}

        {showRadius && (
          <>
            <span style={styles.paramLabel}>Radius</span>
            <div style={styles.sliderRow}>
              <input type="range" min={0.1} max={5} step={0.1} value={radius} onChange={(e) => setRadius(Number(e.target.value))} style={styles.slider} />
              <span style={styles.value}>{radius.toFixed(1)}</span>
            </div>
          </>
        )}

        {showRadiusTopBottom && (
          <>
            <span style={styles.paramLabel}>Radius Top</span>
            <div style={styles.sliderRow}>
              <input type="range" min={0.1} max={5} step={0.1} value={radiusTop} onChange={(e) => setRadiusTop(Number(e.target.value))} style={styles.slider} />
              <span style={styles.value}>{radiusTop.toFixed(1)}</span>
            </div>
            <span style={styles.paramLabel}>Radius Bottom</span>
            <div style={styles.sliderRow}>
              <input type="range" min={0.1} max={5} step={0.1} value={radiusBottom} onChange={(e) => setRadiusBottom(Number(e.target.value))} style={styles.slider} />
              <span style={styles.value}>{radiusBottom.toFixed(1)}</span>
            </div>
          </>
        )}

        {(showHeight || showRadiusTopBottom) && (
          <>
            <span style={styles.paramLabel}>Height</span>
            <div style={styles.sliderRow}>
              <input type="range" min={0.1} max={10} step={0.1} value={height} onChange={(e) => setHeight(Number(e.target.value))} style={styles.slider} />
              <span style={styles.value}>{height.toFixed(1)}</span>
            </div>
          </>
        )}

        <span style={styles.paramLabel}>Segments</span>
        <div style={styles.sliderRow}>
          <input type="range" min={6} max={64} step={2} value={segments} onChange={(e) => setSegments(Number(e.target.value))} style={styles.slider} />
          <span style={styles.value}>{segments}</span>
        </div>
      </div>

      {/* Generate */}
      <button
        style={{
          ...styles.btnPrimary,
          ...(generating ? styles.btnDisabled : {}),
        }}
        onClick={handleGenerate}
        disabled={generating}
      >
        {generating ? 'Generating...' : 'Generate'}
      </button>

      {/* Info */}
      {meshStats && (
        <div style={styles.card}>
          <span style={styles.label}>Mesh Info</span>
          <div style={styles.infoGrid}>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Triangles</span>
              <span style={styles.infoValue}>{meshStats.triangles.toLocaleString()}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Vertices</span>
              <span style={styles.infoValue}>{meshStats.vertices.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Export Buttons */}
      <button
        style={{
          ...styles.btnSecondary,
          ...(!stlBlob ? styles.btnDisabled : {}),
        }}
        onClick={() => handleDownload(stlBlob, 'stl')}
        disabled={!stlBlob}
      >
        Export STL
      </button>
      <button
        style={{
          ...styles.btnSecondary,
          ...(!objBlob ? styles.btnDisabled : {}),
        }}
        onClick={() => handleDownload(objBlob, 'obj')}
        disabled={!objBlob}
      >
        Export OBJ
      </button>
    </div>
  );
}
