'use client';

import { useCallback } from 'react';
import type { ModulePanelProps } from '@mw/open3d-types';
import { useViewerStore } from '@mw/open3d-viewer';

// ── Inline Slider ──────────────────────────────────────────────────────────────

interface SliderProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

function Slider({ label, value, onChange, min = 0, max = 1, step = 0.01 }: SliderProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#8888aa', fontSize: '11px' }}>{label}</span>
        <span style={{ color: '#e0e0f0', fontSize: '11px', fontFamily: 'monospace' }}>
          {value.toFixed(step < 1 ? 2 : 0)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          width: '100%',
          accentColor: '#4488ff',
          height: '4px',
          cursor: 'pointer',
        }}
      />
    </div>
  );
}

// ── Toggle Checkbox ────────────────────────────────────────────────────────────

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

function Toggle({ label, checked, onChange }: ToggleProps) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '12px',
        color: '#e0e0f0',
        cursor: 'pointer',
        padding: '2px 0',
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ accentColor: '#4488ff', cursor: 'pointer' }}
      />
      {label}
    </label>
  );
}

// ── Section ────────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: '#12122a',
        borderRadius: '6px',
        border: '1px solid #2a2a4a',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      <span style={{ color: '#8888aa', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {title}
      </span>
      {children}
    </div>
  );
}

// ── Main Panel ─────────────────────────────────────────────────────────────────

export function ViewerControlsPanel({ moduleId, isActive, onClose }: ModulePanelProps) {
  // Display
  const wireframe = useViewerStore((s) => s.wireframe);
  const setWireframe = useViewerStore((s) => s.setWireframe);
  const grid = useViewerStore((s) => s.grid);
  const setGrid = useViewerStore((s) => s.setGrid);
  const axes = useViewerStore((s) => s.axes);
  const setAxes = useViewerStore((s) => s.setAxes);
  const autoRotate = useViewerStore((s) => s.autoRotate);
  const setAutoRotate = useViewerStore((s) => s.setAutoRotate);
  const shadows = useViewerStore((s) => s.shadows);
  const setShadows = useViewerStore((s) => s.setShadows);

  // Material
  const metalness = useViewerStore((s) => s.metalness);
  const setMetalness = useViewerStore((s) => s.setMetalness);
  const roughness = useViewerStore((s) => s.roughness);
  const setRoughness = useViewerStore((s) => s.setRoughness);
  const opacity = useViewerStore((s) => s.opacity);
  const setOpacity = useViewerStore((s) => s.setOpacity);
  const color = useViewerStore((s) => s.color);
  const setColor = useViewerStore((s) => s.setColor);

  // Mesh info
  const meshInfo = useViewerStore((s) => s.meshInfo);

  const handleColorChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setColor(e.target.value),
    [setColor],
  );

  if (!isActive) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#e0e0f0' }}>View Settings</span>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#8888aa',
            cursor: 'pointer',
            fontSize: '18px',
            padding: '2px 6px',
            lineHeight: 1,
          }}
          aria-label="Close view panel"
        >
          &times;
        </button>
      </div>

      {/* Display Section */}
      <Section title="Display">
        <Toggle label="Wireframe" checked={wireframe} onChange={setWireframe} />
        <Toggle label="Grid" checked={grid} onChange={setGrid} />
        <Toggle label="Axes" checked={axes} onChange={setAxes} />
        <Toggle label="Auto-Rotate" checked={autoRotate} onChange={setAutoRotate} />
        <Toggle label="Shadows" checked={shadows} onChange={setShadows} />
      </Section>

      {/* Material Section */}
      <Section title="Material">
        <Slider label="Metalness" value={metalness} onChange={setMetalness} />
        <Slider label="Roughness" value={roughness} onChange={setRoughness} />
        <Slider label="Opacity" value={opacity} onChange={setOpacity} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#8888aa', fontSize: '11px' }}>Color</span>
          <input
            type="color"
            value={color}
            onChange={handleColorChange}
            style={{
              width: '28px',
              height: '22px',
              padding: 0,
              border: '1px solid #2a2a4a',
              borderRadius: '4px',
              background: 'none',
              cursor: 'pointer',
            }}
          />
          <span style={{ color: '#e0e0f0', fontSize: '11px', fontFamily: 'monospace' }}>
            {color}
          </span>
        </div>
      </Section>

      {/* Model Info Section */}
      {meshInfo && (
        <Section title="Model Info">
          <InfoRow label="Triangles" value={meshInfo.triangleCount.toLocaleString()} />
          <InfoRow label="Vertices" value={meshInfo.vertexCount.toLocaleString()} />
          {meshInfo.boundingBox && (
            <>
              <InfoRow
                label="Size X"
                value={`${meshInfo.boundingBox.size.x.toFixed(2)} mm`}
              />
              <InfoRow
                label="Size Y"
                value={`${meshInfo.boundingBox.size.y.toFixed(2)} mm`}
              />
              <InfoRow
                label="Size Z"
                value={`${meshInfo.boundingBox.size.z.toFixed(2)} mm`}
              />
            </>
          )}
          {meshInfo.volume != null && (
            <InfoRow label="Volume" value={`${meshInfo.volume.toFixed(2)} mm³`} />
          )}
          {meshInfo.surfaceArea != null && (
            <InfoRow label="Surface" value={`${meshInfo.surfaceArea.toFixed(2)} mm²`} />
          )}
          <InfoRow label="Normals" value={meshInfo.hasNormals ? 'Yes' : 'No'} />
          <InfoRow label="UVs" value={meshInfo.hasUVs ? 'Yes' : 'No'} />
          {meshInfo.isManifold != null && (
            <InfoRow label="Manifold" value={meshInfo.isManifold ? 'Yes' : 'No'} />
          )}
        </Section>
      )}
    </div>
  );
}

// ── Info Row ───────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ color: '#8888aa', fontSize: '11px' }}>{label}</span>
      <span style={{ color: '#e0e0f0', fontSize: '11px', fontFamily: 'monospace' }}>{value}</span>
    </div>
  );
}
