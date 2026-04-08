'use client';
import { useState, useCallback } from 'react';
import { FileUploader } from '@/components/FileUploader';
import { DownloadButton } from '@/components/DownloadButton';
import { InfoPanel } from '@/components/InfoPanel';

const FORMATS = ['stl', 'obj', 'ply', 'glb'];

export default function ConverterPage() {
  const [file, setFile] = useState<File | null>(null);
  const [targetFormat, setTargetFormat] = useState('stl');
  const [optimize, setOptimize] = useState(false);
  const [draco, setDraco] = useState(false);
  const [converting, setConverting] = useState(false);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [info, setInfo] = useState<Record<string, any>>({});

  const handleFiles = useCallback((files: File[]) => {
    setFile(files[0] ?? null);
    setResult(null);
    setInfo({});
    if (files[0]) {
      const ext = files[0].name.split('.').pop()?.toLowerCase() ?? '';
      setInfo({ 'Source': files[0].name, 'Format': ext.toUpperCase(), 'Size': `${(files[0].size / 1024).toFixed(1)} KB` });
    }
  }, []);

  const handleConvert = useCallback(async () => {
    if (!file) return;
    setConverting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('targetFormat', targetFormat);
      formData.append('optimize', String(optimize));
      formData.append('draco', String(draco));

      const res = await fetch('/api/convert', { method: 'POST', body: formData });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const data = new Uint8Array(await blob.arrayBuffer());
      setResult(data);
      setInfo(prev => ({ ...prev, 'Output': `${targetFormat.toUpperCase()}`, 'Output Size': `${(data.length / 1024).toFixed(1)} KB` }));
    } catch (err) {
      setInfo(prev => ({ ...prev, Error: String(err) }));
    }
    setConverting(false);
  }, [file, targetFormat, optimize, draco]);

  return (
    <div className="page">
      <h1>Format Converter</h1>
      <div className="page-layout">
        <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
          <FileUploader accept=".stl,.obj,.ply,.gltf,.glb,.dxf,.svg,.f3d" onFiles={handleFiles} label="Drop 3D file to convert"/>
          {Object.keys(info).length > 0 && <InfoPanel data={info} title="File Info"/>}
        </div>
        <div className="sidebar">
          <div className="card">
            <span className="label">Target Format</span>
            <select value={targetFormat} onChange={e => setTargetFormat(e.target.value)} className="input" style={{marginTop:'0.25rem'}}>
              {FORMATS.map(f => <option key={f} value={f}>{f.toUpperCase()}</option>)}
            </select>
          </div>
          <div className="card">
            <span className="label">Options</span>
            <label style={{display:'flex',gap:'0.5rem',fontSize:'0.85rem',cursor:'pointer',marginTop:'0.5rem'}}>
              <input type="checkbox" checked={optimize} onChange={e=>setOptimize(e.target.checked)}/> Optimize (dedup + weld)
            </label>
            <label style={{display:'flex',gap:'0.5rem',fontSize:'0.85rem',cursor:'pointer'}}>
              <input type="checkbox" checked={draco} onChange={e=>setDraco(e.target.checked)}/> Draco Compression
            </label>
          </div>
          <button className="btn btn-primary" onClick={handleConvert} disabled={!file || converting}>
            {converting ? 'Converting...' : 'Convert'}
          </button>
          {result && <DownloadButton data={result} filename={`converted.${targetFormat}`} label="Download Result"/>}
        </div>
      </div>
    </div>
  );
}
