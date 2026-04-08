'use client';

import { useState, useCallback } from 'react';
import type { ModulePanelProps } from '@mw/open3d-types';
import { useViewerStore } from '@mw/open3d-viewer';

// ---------- constants ----------

type Technology = 'fdm' | 'sla';

interface PrinterProfile {
  id: string;
  name: string;
  tech: Technology;
  buildX: number;
  buildY: number;
  buildZ: number;
}

const PRINTERS: PrinterProfile[] = [
  { id: 'bambu-x1c', name: 'Bambu Lab X1 Carbon', tech: 'fdm', buildX: 256, buildY: 256, buildZ: 256 },
  { id: 'bambu-a1', name: 'Bambu Lab A1', tech: 'fdm', buildX: 256, buildY: 256, buildZ: 256 },
  { id: 'prusa-mk4', name: 'Prusa MK4', tech: 'fdm', buildX: 250, buildY: 210, buildZ: 220 },
  { id: 'ender-3-v3', name: 'Creality Ender-3 V3', tech: 'fdm', buildX: 220, buildY: 220, buildZ: 250 },
  { id: 'voron-2.4', name: 'Voron 2.4 (350)', tech: 'fdm', buildX: 350, buildY: 350, buildZ: 350 },
  { id: 'elegoo-mars-4', name: 'Elegoo Mars 4 Ultra', tech: 'sla', buildX: 153, buildY: 77, buildZ: 165 },
  { id: 'anycubic-m5s', name: 'Anycubic Photon M5s', tech: 'sla', buildX: 218, buildY: 123, buildZ: 200 },
  { id: 'formlabs-form4', name: 'Formlabs Form 4', tech: 'sla', buildX: 200, buildY: 125, buildZ: 210 },
  { id: 'phrozen-mega-8k', name: 'Phrozen Sonic Mega 8K', tech: 'sla', buildX: 330, buildY: 185, buildZ: 400 },
];

interface SliceResult {
  layers: number;
  estimatedMinutes: number;
  materialGrams: number;
  materialMl: number;
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
  tabs: {
    display: 'flex',
    gap: '0.25rem',
  },
  tab: (active: boolean) => ({
    flex: 1,
    padding: '0.4rem',
    border: 'none',
    borderRadius: '0.35rem',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: 600,
    background: active ? '#4488ff' : '#1a1a3a',
    color: active ? '#fff' : '#8888aa',
  }),
  select: {
    width: '100%',
    padding: '0.4rem',
    background: '#1a1a3a',
    border: '1px solid #2a2a4a',
    borderRadius: '0.35rem',
    color: '#e0e0f0',
    fontSize: '0.8rem',
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
    minWidth: '3.5rem',
    textAlign: 'right' as const,
  },
  toggle: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.25rem 0',
  },
  toggleSwitch: (on: boolean) => ({
    width: '2rem',
    height: '1.1rem',
    borderRadius: '0.6rem',
    background: on ? '#4488ff' : '#2a2a4a',
    cursor: 'pointer',
    position: 'relative' as const,
    border: 'none',
    transition: 'background 0.2s',
  }),
  toggleKnob: (on: boolean) => ({
    width: '0.8rem',
    height: '0.8rem',
    borderRadius: '50%',
    background: '#e0e0f0',
    position: 'absolute' as const,
    top: '0.15rem',
    left: on ? '1.05rem' : '0.15rem',
    transition: 'left 0.2s',
  }),
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
  resultRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.2rem 0',
    borderBottom: '1px solid #1a1a3a',
  },
  resultLabel: {
    color: '#8888aa',
  },
  resultValue: {
    color: '#e0e0f0',
    fontWeight: 600,
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

export function SlicerPanel({ moduleId: _moduleId, isActive, onClose }: ModulePanelProps) {
  const { meshInfo, boundingBox } = useViewerStore();

  const [technology, setTechnology] = useState<Technology>('fdm');
  const [printerId, setPrinterId] = useState('bambu-x1c');

  // FDM
  const [layerHeight, setLayerHeight] = useState(0.2);
  const [infill, setInfill] = useState(20);
  const [wallCount, setWallCount] = useState(2);
  const [supportEnabled, setSupportEnabled] = useState(false);

  // SLA
  const [slaLayerHeight, setSlaLayerHeight] = useState(0.05);
  const [exposureTime, setExposureTime] = useState(2.5);
  const [bottomExposure, setBottomExposure] = useState(30);

  const [result, setResult] = useState<SliceResult | null>(null);
  const [gcodeBlob, setGcodeBlob] = useState<Blob | null>(null);

  const hasModel = !!(meshInfo && boundingBox);
  const filteredPrinters = PRINTERS.filter((p) => p.tech === technology);

  const handleSlice = useCallback(() => {
    if (!boundingBox) return;

    const sizeZ = boundingBox.size.z;
    const sizeX = boundingBox.size.x;
    const sizeY = boundingBox.size.y;

    if (technology === 'fdm') {
      const layers = Math.ceil(sizeZ / layerHeight);
      const volume = sizeX * sizeY * sizeZ;
      const shellVolume = volume * 0.15;
      const infillVolume = volume * (infill / 100) * 0.85;
      const totalVolume = shellVolume + infillVolume;
      const materialGrams = totalVolume * 1.24 * 0.001; // PLA density
      const timePerLayer = 0.5 + (sizeX * sizeY * 0.0002);
      const estimatedMinutes = layers * timePerLayer;

      setResult({ layers, estimatedMinutes, materialGrams, materialMl: 0 });

      // Generate simple G-code
      const lines: string[] = [
        '; Generated by Open3D Studio Slicer',
        `; Layers: ${layers}`,
        `; Layer Height: ${layerHeight}mm`,
        `; Infill: ${infill}%`,
        'G28 ; Home all axes',
        'G90 ; Absolute positioning',
        'M82 ; Absolute extrusion',
        'M104 S210 ; Set nozzle temp',
        'M140 S60 ; Set bed temp',
        'M109 S210 ; Wait for nozzle',
        'M190 S60 ; Wait for bed',
        'G1 Z5 F3000 ; Lift nozzle',
        '',
      ];

      let e = 0;
      for (let layer = 0; layer < layers; layer++) {
        const z = (layer + 1) * layerHeight;
        lines.push(`; Layer ${layer + 1}`);
        lines.push(`G1 Z${z.toFixed(3)} F600`);
        // Simplified perimeter
        const x0 = -sizeX / 2;
        const y0 = -sizeY / 2;
        const x1 = sizeX / 2;
        const y1 = sizeY / 2;
        const perimLength = 2 * (sizeX + sizeY);
        e += perimLength * layerHeight * 0.4 * 1.05 / (Math.PI * 0.8125);
        lines.push(`G1 X${x0.toFixed(2)} Y${y0.toFixed(2)} F3000`);
        lines.push(`G1 X${x1.toFixed(2)} Y${y0.toFixed(2)} E${e.toFixed(4)} F1500`);
        lines.push(`G1 X${x1.toFixed(2)} Y${y1.toFixed(2)} E${(e += perimLength * 0.25 * layerHeight * 0.4 / (Math.PI * 0.8125)).toFixed(4)}`);
        lines.push(`G1 X${x0.toFixed(2)} Y${y1.toFixed(2)} E${(e += perimLength * 0.25 * layerHeight * 0.4 / (Math.PI * 0.8125)).toFixed(4)}`);
        lines.push(`G1 X${x0.toFixed(2)} Y${y0.toFixed(2)} E${(e += perimLength * 0.25 * layerHeight * 0.4 / (Math.PI * 0.8125)).toFixed(4)}`);
      }

      lines.push('', 'G1 Z50 F3000', 'M104 S0', 'M140 S0', 'M84 ; Disable steppers');
      const gcodeStr = lines.join('\n');
      setGcodeBlob(new Blob([gcodeStr], { type: 'text/plain' }));
    } else {
      const layers = Math.ceil(sizeZ / slaLayerHeight);
      const volume = sizeX * sizeY * sizeZ * 0.6; // solid fill estimate
      const materialMl = volume * 0.001;
      const bottomLayers = 6;
      const totalSeconds =
        bottomLayers * bottomExposure +
        (layers - bottomLayers) * exposureTime +
        layers * 3; // 3s peel per layer
      const estimatedMinutes = totalSeconds / 60;

      setResult({ layers, estimatedMinutes, materialGrams: 0, materialMl });
      setGcodeBlob(null); // SLA doesn't produce G-code
    }
  }, [boundingBox, technology, layerHeight, infill, slaLayerHeight, exposureTime, bottomExposure, wallCount, supportEnabled]);

  const handleDownloadGcode = useCallback(() => {
    if (!gcodeBlob) return;
    const url = URL.createObjectURL(gcodeBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'output.gcode';
    a.click();
    URL.revokeObjectURL(url);
  }, [gcodeBlob]);

  if (!isActive) return null;

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.title}>Slicer</span>
        <button style={styles.closeBtn} onClick={onClose}>&times;</button>
      </div>

      {/* Technology Tabs */}
      <div style={styles.card}>
        <span style={styles.label}>Technology</span>
        <div style={styles.tabs}>
          <button
            style={styles.tab(technology === 'fdm')}
            onClick={() => { setTechnology('fdm'); setResult(null); setGcodeBlob(null); }}
          >
            FDM
          </button>
          <button
            style={styles.tab(technology === 'sla')}
            onClick={() => { setTechnology('sla'); setResult(null); setGcodeBlob(null); }}
          >
            SLA
          </button>
        </div>
      </div>

      {/* Printer Profile */}
      <div style={styles.card}>
        <span style={styles.label}>Printer Profile</span>
        <select
          style={styles.select}
          value={printerId}
          onChange={(e) => setPrinterId(e.target.value)}
        >
          {filteredPrinters.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Settings */}
      <div style={styles.card}>
        <span style={styles.label}>Settings</span>

        {technology === 'fdm' ? (
          <>
            {/* Layer Height */}
            <div style={{ marginTop: '0.4rem' }}>
              <span style={{ color: '#8888aa', fontSize: '0.75rem' }}>Layer Height</span>
              <div style={styles.sliderRow}>
                <input
                  type="range"
                  min={0.1}
                  max={0.4}
                  step={0.05}
                  value={layerHeight}
                  onChange={(e) => setLayerHeight(Number(e.target.value))}
                  style={styles.slider}
                />
                <span style={styles.value}>{layerHeight.toFixed(2)} mm</span>
              </div>
            </div>

            {/* Infill */}
            <div style={{ marginTop: '0.4rem' }}>
              <span style={{ color: '#8888aa', fontSize: '0.75rem' }}>Infill %</span>
              <div style={styles.sliderRow}>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={infill}
                  onChange={(e) => setInfill(Number(e.target.value))}
                  style={styles.slider}
                />
                <span style={styles.value}>{infill}%</span>
              </div>
            </div>

            {/* Wall Count */}
            <div style={{ marginTop: '0.4rem' }}>
              <span style={{ color: '#8888aa', fontSize: '0.75rem' }}>Wall Count</span>
              <div style={styles.sliderRow}>
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={1}
                  value={wallCount}
                  onChange={(e) => setWallCount(Number(e.target.value))}
                  style={styles.slider}
                />
                <span style={styles.value}>{wallCount}</span>
              </div>
            </div>

            {/* Support Toggle */}
            <div style={styles.toggle}>
              <span style={{ color: '#8888aa', fontSize: '0.75rem' }}>Supports</span>
              <button
                style={styles.toggleSwitch(supportEnabled)}
                onClick={() => setSupportEnabled(!supportEnabled)}
              >
                <div style={styles.toggleKnob(supportEnabled)} />
              </button>
            </div>
          </>
        ) : (
          <>
            {/* SLA Layer Height */}
            <div style={{ marginTop: '0.4rem' }}>
              <span style={{ color: '#8888aa', fontSize: '0.75rem' }}>Layer Height</span>
              <div style={styles.sliderRow}>
                <input
                  type="range"
                  min={0.025}
                  max={0.1}
                  step={0.005}
                  value={slaLayerHeight}
                  onChange={(e) => setSlaLayerHeight(Number(e.target.value))}
                  style={styles.slider}
                />
                <span style={styles.value}>{slaLayerHeight.toFixed(3)} mm</span>
              </div>
            </div>

            {/* Exposure Time */}
            <div style={{ marginTop: '0.4rem' }}>
              <span style={{ color: '#8888aa', fontSize: '0.75rem' }}>Exposure Time</span>
              <div style={styles.sliderRow}>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={0.5}
                  value={exposureTime}
                  onChange={(e) => setExposureTime(Number(e.target.value))}
                  style={styles.slider}
                />
                <span style={styles.value}>{exposureTime.toFixed(1)} s</span>
              </div>
            </div>

            {/* Bottom Exposure */}
            <div style={{ marginTop: '0.4rem' }}>
              <span style={{ color: '#8888aa', fontSize: '0.75rem' }}>Bottom Exposure</span>
              <div style={styles.sliderRow}>
                <input
                  type="range"
                  min={10}
                  max={60}
                  step={1}
                  value={bottomExposure}
                  onChange={(e) => setBottomExposure(Number(e.target.value))}
                  style={styles.slider}
                />
                <span style={styles.value}>{bottomExposure} s</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Slice Button */}
      <button
        style={{
          ...styles.btnPrimary,
          ...(!hasModel ? styles.btnDisabled : {}),
        }}
        onClick={handleSlice}
        disabled={!hasModel}
      >
        {hasModel ? 'Slice' : 'Load a model first'}
      </button>

      {/* Results */}
      {result && (
        <div style={styles.card}>
          <span style={styles.label}>Slice Result</span>
          <div style={styles.resultRow}>
            <span style={styles.resultLabel}>Layers</span>
            <span style={styles.resultValue}>{result.layers.toLocaleString()}</span>
          </div>
          <div style={styles.resultRow}>
            <span style={styles.resultLabel}>Est. Time</span>
            <span style={styles.resultValue}>
              {result.estimatedMinutes >= 60
                ? `${Math.floor(result.estimatedMinutes / 60)}h ${Math.round(result.estimatedMinutes % 60)}m`
                : `${Math.round(result.estimatedMinutes)}m`}
            </span>
          </div>
          <div style={styles.resultRow}>
            <span style={styles.resultLabel}>Material</span>
            <span style={styles.resultValue}>
              {technology === 'fdm'
                ? `${result.materialGrams.toFixed(1)} g`
                : `${result.materialMl.toFixed(1)} ml`}
            </span>
          </div>
        </div>
      )}

      {/* Export G-code */}
      {technology === 'fdm' && gcodeBlob && (
        <button style={styles.btnSecondary} onClick={handleDownloadGcode}>
          Export G-code
        </button>
      )}
    </div>
  );
}
