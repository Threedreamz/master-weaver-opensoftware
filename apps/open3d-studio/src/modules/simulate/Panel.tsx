'use client';

import { useCallback, useState } from 'react';
import type { ModulePanelProps } from '@mw/open3d-types';
import { useViewerStore } from '@mw/open3d-viewer';

type SimulateMode = 'fea' | 'cam';
type ForceDirection = 'X' | 'Y' | 'Z';
type CamStrategy = 'roughing' | 'finishing' | 'contour' | 'pocket';

interface FeaResult {
  maxStress: number;
  maxDisplacement: number;
  safetyFactor: number;
}

interface CamResult {
  gcodeUrl: string;
  toolpathLength: number;
  estimatedTime: number;
}

const CAM_STRATEGIES: { value: CamStrategy; label: string }[] = [
  { value: 'roughing', label: 'Roughing' },
  { value: 'finishing', label: 'Finishing' },
  { value: 'contour', label: 'Contour' },
  { value: 'pocket', label: 'Pocket' },
];

const styles = {
  card: {
    background: '#12122a',
    borderRadius: '6px',
    border: '1px solid #2a2a4a',
    padding: '12px',
  } as React.CSSProperties,
  label: {
    color: '#8888aa',
    fontSize: '11px',
    marginBottom: '4px',
    display: 'block',
  } as React.CSSProperties,
  input: {
    width: '100%',
    background: '#0a0a1a',
    border: '1px solid #2a2a4a',
    borderRadius: '4px',
    color: '#e0e0f0',
    padding: '8px 10px',
    fontSize: '12px',
    outline: 'none',
    boxSizing: 'border-box' as const,
  } as React.CSSProperties,
  select: {
    width: '100%',
    background: '#0a0a1a',
    border: '1px solid #2a2a4a',
    borderRadius: '4px',
    color: '#e0e0f0',
    padding: '8px 10px',
    fontSize: '12px',
    outline: 'none',
    boxSizing: 'border-box' as const,
    cursor: 'pointer',
  } as React.CSSProperties,
  button: {
    width: '100%',
    background: '#4488ff',
    border: 'none',
    borderRadius: '6px',
    color: '#ffffff',
    padding: '10px 16px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 600,
    transition: 'background 0.15s',
  } as React.CSSProperties,
  buttonDisabled: {
    width: '100%',
    background: '#2a2a4a',
    border: 'none',
    borderRadius: '6px',
    color: '#8888aa',
    padding: '10px 16px',
    cursor: 'not-allowed',
    fontSize: '13px',
    fontWeight: 600,
  } as React.CSSProperties,
  secondaryButton: {
    width: '100%',
    background: '#1a1a3a',
    border: '1px solid #2a2a4a',
    borderRadius: '6px',
    color: '#e0e0f0',
    padding: '8px 16px',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'background 0.15s',
  } as React.CSSProperties,
  tab: (active: boolean): React.CSSProperties => ({
    flex: 1,
    background: active ? '#4488ff' : '#1a1a3a',
    border: active ? 'none' : '1px solid #2a2a4a',
    borderRadius: '6px',
    color: active ? '#ffffff' : '#8888aa',
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: active ? 600 : 400,
    transition: 'background 0.15s, color 0.15s',
  }),
  dirBtn: (active: boolean): React.CSSProperties => ({
    flex: 1,
    background: active ? '#4488ff' : '#1a1a3a',
    border: active ? 'none' : '1px solid #2a2a4a',
    borderRadius: '4px',
    color: active ? '#ffffff' : '#8888aa',
    padding: '6px 10px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: active ? 600 : 400,
    transition: 'background 0.15s',
  }),
  row: {
    display: 'flex',
    justifyContent: 'space-between',
  } as React.CSSProperties,
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  } as React.CSSProperties,
};

function safetyColor(factor: number): string {
  if (factor >= 2.0) return '#44cc88';
  if (factor >= 1.0) return '#ffaa44';
  return '#ff4444';
}

export function SimulatePanel({ moduleId, isActive, onClose }: ModulePanelProps) {
  const [mode, setMode] = useState<SimulateMode>('fea');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // FEA state
  const [youngsModulus, setYoungsModulus] = useState(200000);
  const [poissonsRatio, setPoissonsRatio] = useState(0.3);
  const [forceMagnitude, setForceMagnitude] = useState(1000);
  const [forceDirection, setForceDirection] = useState<ForceDirection>('Y');
  const [feaResult, setFeaResult] = useState<FeaResult | null>(null);

  // CAM state
  const [toolDiameter, setToolDiameter] = useState(6);
  const [stepDown, setStepDown] = useState(1);
  const [strategy, setStrategy] = useState<CamStrategy>('roughing');
  const [camResult, setCamResult] = useState<CamResult | null>(null);

  const modelUrl = useViewerStore((s) => s.modelUrl);

  const handleRunFea = useCallback(async () => {
    if (!modelUrl) return;

    setRunning(true);
    setError(null);
    setFeaResult(null);

    try {
      const response = await fetch('/api/simulate/fea', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelUrl,
          material: {
            youngsModulus,
            poissonsRatio,
          },
          load: {
            magnitude: forceMagnitude,
            direction: forceDirection,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`FEA analysis failed: ${response.statusText}`);
      }

      const data = await response.json();
      setFeaResult({
        maxStress: data.maxStress,
        maxDisplacement: data.maxDisplacement,
        safetyFactor: data.safetyFactor,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'FEA analysis failed');
    } finally {
      setRunning(false);
    }
  }, [modelUrl, youngsModulus, poissonsRatio, forceMagnitude, forceDirection]);

  const handleRunCam = useCallback(async () => {
    if (!modelUrl) return;

    setRunning(true);
    setError(null);
    setCamResult(null);

    try {
      const response = await fetch('/api/simulate/cam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelUrl,
          toolDiameter,
          stepDown,
          strategy,
        }),
      });

      if (!response.ok) {
        throw new Error(`CAM generation failed: ${response.statusText}`);
      }

      const data = await response.json();
      setCamResult({
        gcodeUrl: data.gcodeUrl,
        toolpathLength: data.toolpathLength,
        estimatedTime: data.estimatedTime,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'CAM generation failed');
    } finally {
      setRunning(false);
    }
  }, [modelUrl, toolDiameter, stepDown, strategy]);

  const handleDownloadGcode = useCallback(() => {
    if (!camResult?.gcodeUrl) return;
    const link = document.createElement('a');
    link.href = camResult.gcodeUrl;
    link.download = 'toolpath.gcode';
    link.click();
  }, [camResult]);

  if (!isActive) return null;

  const hasModel = !!modelUrl;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#e0e0f0' }}>Simulate</span>
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
          aria-label="Close simulate panel"
        >
          &times;
        </button>
      </div>

      {/* Mode Tabs */}
      <div style={{ display: 'flex', gap: '6px' }}>
        <button onClick={() => setMode('fea')} style={styles.tab(mode === 'fea')}>
          FEA Stress
        </button>
        <button onClick={() => setMode('cam')} style={styles.tab(mode === 'cam')}>
          CNC/CAM
        </button>
      </div>

      {/* No model warning */}
      {!hasModel && (
        <div
          style={{
            ...styles.card,
            borderColor: '#ffaa44',
            background: 'rgba(255, 170, 68, 0.06)',
          }}
        >
          <span style={{ color: '#ffaa44', fontSize: '12px' }}>
            Load a model first to run simulations.
          </span>
        </div>
      )}

      {/* FEA Mode */}
      {mode === 'fea' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Material Properties */}
          <div style={styles.card}>
            <span
              style={{ color: '#e0e0f0', fontSize: '12px', fontWeight: 600, marginBottom: '8px', display: 'block' }}
            >
              Material
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Young&apos;s Modulus (MPa)</label>
                <input
                  type="number"
                  value={youngsModulus}
                  onChange={(e) => setYoungsModulus(Number(e.target.value))}
                  disabled={running}
                  style={styles.input}
                />
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Poisson&apos;s Ratio</label>
                <input
                  type="number"
                  value={poissonsRatio}
                  onChange={(e) => setPoissonsRatio(Number(e.target.value))}
                  step={0.05}
                  min={0}
                  max={0.5}
                  disabled={running}
                  style={styles.input}
                />
              </div>
            </div>
          </div>

          {/* Load Configuration */}
          <div style={styles.card}>
            <span
              style={{ color: '#e0e0f0', fontSize: '12px', fontWeight: 600, marginBottom: '8px', display: 'block' }}
            >
              Load
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Force Magnitude (N)</label>
                <input
                  type="number"
                  value={forceMagnitude}
                  onChange={(e) => setForceMagnitude(Number(e.target.value))}
                  disabled={running}
                  style={styles.input}
                />
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Force Direction</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {(['X', 'Y', 'Z'] as ForceDirection[]).map((dir) => (
                    <button
                      key={dir}
                      onClick={() => setForceDirection(dir)}
                      disabled={running}
                      style={styles.dirBtn(forceDirection === dir)}
                    >
                      {dir}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Run Analysis Button */}
          <button
            onClick={handleRunFea}
            disabled={!hasModel || running}
            style={hasModel && !running ? styles.button : styles.buttonDisabled}
          >
            {running ? 'Analyzing...' : 'Run Analysis'}
          </button>

          {/* FEA Results */}
          {feaResult && (
            <div style={styles.card}>
              <span
                style={{ color: '#e0e0f0', fontSize: '12px', fontWeight: 600, marginBottom: '8px', display: 'block' }}
              >
                Results
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={styles.row}>
                  <span style={{ color: '#8888aa', fontSize: '11px' }}>Max Stress</span>
                  <span style={{ color: '#e0e0f0', fontSize: '12px' }}>
                    {feaResult.maxStress.toFixed(2)} MPa
                  </span>
                </div>
                <div style={styles.row}>
                  <span style={{ color: '#8888aa', fontSize: '11px' }}>Max Displacement</span>
                  <span style={{ color: '#e0e0f0', fontSize: '12px' }}>
                    {feaResult.maxDisplacement.toFixed(4)} mm
                  </span>
                </div>
                <div style={styles.row}>
                  <span style={{ color: '#8888aa', fontSize: '11px' }}>Safety Factor</span>
                  <span
                    style={{
                      color: safetyColor(feaResult.safetyFactor),
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                  >
                    {feaResult.safetyFactor.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CAM Mode */}
      {mode === 'cam' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={styles.card}>
            <span
              style={{ color: '#e0e0f0', fontSize: '12px', fontWeight: 600, marginBottom: '8px', display: 'block' }}
            >
              Tool Settings
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Tool Diameter (mm)</label>
                <input
                  type="number"
                  value={toolDiameter}
                  onChange={(e) => setToolDiameter(Number(e.target.value))}
                  min={0.1}
                  step={0.5}
                  disabled={running}
                  style={styles.input}
                />
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Step Down (mm)</label>
                <input
                  type="number"
                  value={stepDown}
                  onChange={(e) => setStepDown(Number(e.target.value))}
                  min={0.05}
                  step={0.25}
                  disabled={running}
                  style={styles.input}
                />
              </div>
            </div>
          </div>

          <div>
            <label style={styles.label}>Strategy</label>
            <select
              value={strategy}
              onChange={(e) => setStrategy(e.target.value as CamStrategy)}
              style={styles.select}
              disabled={running}
            >
              {CAM_STRATEGIES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Generate Toolpath Button */}
          <button
            onClick={handleRunCam}
            disabled={!hasModel || running}
            style={hasModel && !running ? styles.button : styles.buttonDisabled}
          >
            {running ? 'Generating...' : 'Generate Toolpath'}
          </button>

          {/* CAM Results */}
          {camResult && (
            <>
              <div style={styles.card}>
                <span
                  style={{
                    color: '#e0e0f0',
                    fontSize: '12px',
                    fontWeight: 600,
                    marginBottom: '8px',
                    display: 'block',
                  }}
                >
                  Toolpath
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={styles.row}>
                    <span style={{ color: '#8888aa', fontSize: '11px' }}>Path Length</span>
                    <span style={{ color: '#e0e0f0', fontSize: '12px' }}>
                      {(camResult.toolpathLength / 1000).toFixed(1)} m
                    </span>
                  </div>
                  <div style={styles.row}>
                    <span style={{ color: '#8888aa', fontSize: '11px' }}>Est. Time</span>
                    <span style={{ color: '#e0e0f0', fontSize: '12px' }}>
                      {Math.floor(camResult.estimatedTime / 60)}m {camResult.estimatedTime % 60}s
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={handleDownloadGcode} style={styles.secondaryButton}>
                Download G-code
              </button>
            </>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          style={{
            ...styles.card,
            borderColor: '#ff4444',
            background: 'rgba(255, 68, 68, 0.08)',
          }}
        >
          <span style={{ color: '#ff6666', fontSize: '12px' }}>{error}</span>
        </div>
      )}
    </div>
  );
}
