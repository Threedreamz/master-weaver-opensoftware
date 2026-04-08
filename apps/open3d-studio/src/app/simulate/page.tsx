'use client';
import { useState, useCallback } from 'react';
import { FileUploader } from '@/components/FileUploader';
import { TabSelector } from '@/components/TabSelector';
import { SliderInput } from '@/components/SliderInput';
import { InfoPanel } from '@/components/InfoPanel';
import { DownloadButton } from '@/components/DownloadButton';

export default function SimulatePage() {
  const [tab, setTab] = useState('fea');
  // FEA state
  const [feaFile, setFeaFile] = useState<File | null>(null);
  const [youngsModulus, setYoungsModulus] = useState(210e9);
  const [poissonsRatio, setPoissonsRatio] = useState(0.3);
  const [forceMagnitude, setForceMagnitude] = useState(1000);
  const [feaResult, setFeaResult] = useState<Record<string, any> | null>(null);
  const [feaLoading, setFeaLoading] = useState(false);
  // CAM state
  const [camFile, setCamFile] = useState<File | null>(null);
  const [toolDiameter, setToolDiameter] = useState(3);
  const [stepDown, setStepDown] = useState(1);
  const [strategy, setStrategy] = useState('roughing');
  const [gcode, setGcode] = useState<string | null>(null);
  const [camResult, setCamResult] = useState<Record<string, any> | null>(null);
  const [camLoading, setCamLoading] = useState(false);

  const handleFEA = useCallback(async () => {
    if (!feaFile) return;
    setFeaLoading(true);
    try {
      const res = await fetch('/api/simulate/fea', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputPath: feaFile.name,
          material: { youngsModulus, poissonsRatio },
          loads: [{ type: 'force', magnitude: forceMagnitude, direction: { x: 0, y: -1, z: 0 } }],
          constraints: [{ type: 'fixed', faceIds: [0] }],
        }),
      });
      const data = await res.json();
      setFeaResult({
        'Max Stress': `${data.maxStress?.toFixed(2) ?? 'N/A'} Pa`,
        'Max Displacement': `${data.maxDisplacement?.toFixed(4) ?? 'N/A'} mm`,
        'Safety Factor': data.safetyFactor?.toFixed(2) ?? 'N/A',
        ...(data.warnings?.length ? { Warnings: data.warnings.join(', ') } : {}),
      });
    } catch (err) {
      setFeaResult({ Error: String(err) });
    }
    setFeaLoading(false);
  }, [feaFile, youngsModulus, poissonsRatio, forceMagnitude]);

  const handleCAM = useCallback(async () => {
    if (!camFile) return;
    setCamLoading(true);
    try {
      const res = await fetch('/api/simulate/cam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputPath: camFile.name, toolDiameter, stepDown, strategy }),
      });
      const data = await res.json();
      setGcode(data.gcode ?? null);
      setCamResult({
        'Est. Time': `${Math.floor((data.estimatedTime ?? 0) / 60)}m`,
        'Toolpath Length': `${(data.toolpathLength ?? 0).toFixed(0)} mm`,
        Strategy: strategy,
      });
    } catch (err) {
      setCamResult({ Error: String(err) });
    }
    setCamLoading(false);
  }, [camFile, toolDiameter, stepDown, strategy]);

  return (
    <div className="page">
      <h1>Simulate</h1>
      <div className="page-layout">
        <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
          <div className="card">
            <TabSelector tabs={[{id:'fea',label:'FEA Stress'},{id:'cam',label:'CNC / CAM'}]} active={tab} onChange={setTab}/>
          </div>

          {tab === 'fea' && (
            <>
              <FileUploader accept=".stl,.obj" onFiles={f => setFeaFile(f[0] ?? null)} label="Drop mesh for FEA analysis"/>
              {feaFile && <p style={{fontSize:'0.85rem',color:'var(--text-muted)'}}>Loaded: {feaFile.name}</p>}
              {feaResult && <InfoPanel data={feaResult} title="FEA Results"/>}
            </>
          )}

          {tab === 'cam' && (
            <>
              <FileUploader accept=".stl,.obj" onFiles={f => setCamFile(f[0] ?? null)} label="Drop mesh for CNC toolpath"/>
              {camFile && <p style={{fontSize:'0.85rem',color:'var(--text-muted)'}}>Loaded: {camFile.name}</p>}
              {camResult && <InfoPanel data={camResult} title="CAM Results"/>}
            </>
          )}
        </div>
        <div className="sidebar">
          {tab === 'fea' && (
            <>
              <div className="card">
                <span className="label">Material</span>
                <SliderInput label="Young's Modulus (GPa)" min={1} max={500} step={1} value={youngsModulus / 1e9} onChange={v => setYoungsModulus(v * 1e9)}/>
                <SliderInput label="Poisson's Ratio" min={0.1} max={0.5} step={0.05} value={poissonsRatio} onChange={setPoissonsRatio}/>
              </div>
              <div className="card">
                <span className="label">Load</span>
                <SliderInput label="Force (N)" min={10} max={10000} step={10} value={forceMagnitude} onChange={setForceMagnitude}/>
              </div>
              <button className="btn btn-primary" onClick={handleFEA} disabled={!feaFile || feaLoading}>
                {feaLoading ? 'Analyzing...' : 'Run FEA'}
              </button>
            </>
          )}
          {tab === 'cam' && (
            <>
              <div className="card">
                <span className="label">Tool</span>
                <SliderInput label="Diameter (mm)" min={0.5} max={12} step={0.5} value={toolDiameter} onChange={setToolDiameter}/>
                <SliderInput label="Step Down (mm)" min={0.1} max={5} step={0.1} value={stepDown} onChange={setStepDown}/>
              </div>
              <div className="card">
                <span className="label">Strategy</span>
                <select value={strategy} onChange={e => setStrategy(e.target.value)} className="input">
                  <option value="roughing">Roughing</option>
                  <option value="finishing">Finishing</option>
                  <option value="contour">Contour</option>
                  <option value="pocket">Pocket</option>
                </select>
              </div>
              <button className="btn btn-primary" onClick={handleCAM} disabled={!camFile || camLoading}>
                {camLoading ? 'Generating...' : 'Generate G-code'}
              </button>
              {gcode && <DownloadButton data={gcode} filename="toolpath.gcode" label="Download G-code"/>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
