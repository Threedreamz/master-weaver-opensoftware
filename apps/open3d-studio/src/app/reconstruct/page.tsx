'use client';
import { useState, useCallback } from 'react';
import { FileUploader } from '@/components/FileUploader';
import { TabSelector } from '@/components/TabSelector';
import { InfoPanel } from '@/components/InfoPanel';

const METHODS = [
  { id: 'photogrammetry', label: 'Photogrammetry' },
  { id: 'nerf', label: 'NeRF' },
  { id: 'gaussian-splatting', label: 'Gaussian Splatting' },
  { id: 'apple', label: 'Apple Object Capture' },
];

export default function ReconstructPage() {
  const [method, setMethod] = useState('photogrammetry');
  const [images, setImages] = useState<File[]>([]);
  const [quality, setQuality] = useState('medium');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = useCallback((files: File[]) => {
    setImages(files);
    setResult(null);
    setError(null);
  }, []);

  const handleReconstruct = useCallback(async () => {
    if (images.length === 0) return;
    setProcessing(true);
    setProgress(0);
    setError(null);

    try {
      const formData = new FormData();
      images.forEach((img, i) => formData.append(`image_${i}`, img));
      formData.append('method', method);
      formData.append('quality', quality);

      const res = await fetch('/api/reconstruct', { method: 'POST', body: formData });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResult({
        Method: method,
        Status: data.success ? 'Complete' : 'Failed',
        'Output Path': data.outputPath ?? 'N/A',
        'Point Count': data.pointCount ?? 'N/A',
        'Vertex Count': data.vertexCount ?? 'N/A',
        ...(data.warnings?.length ? { Warnings: data.warnings.join(', ') } : {}),
      });
    } catch (err) {
      setError(String(err));
    }
    setProcessing(false);
  }, [images, method, quality]);

  return (
    <div className="page">
      <h1>3D Reconstruction</h1>
      <div className="page-layout">
        <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
          <div className="card">
            <TabSelector tabs={METHODS} active={method} onChange={setMethod}/>
          </div>
          <FileUploader accept=".jpg,.jpeg,.png,.webp" multiple onFiles={handleFiles}
            label={`Drop ${method === 'photogrammetry' ? '10+' : '20+'} photos for reconstruction`}/>
          {images.length > 0 && (
            <div className="card">
              <span className="label">{images.length} images selected</span>
              <div style={{display:'flex',flexWrap:'wrap',gap:'0.25rem',marginTop:'0.5rem'}}>
                {images.slice(0, 8).map((img, i) => (
                  <span key={i} style={{fontSize:'0.75rem',color:'var(--text-muted)',background:'var(--bg)',padding:'0.15rem 0.4rem',borderRadius:3}}>
                    {img.name}
                  </span>
                ))}
                {images.length > 8 && <span style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>+{images.length - 8} more</span>}
              </div>
            </div>
          )}
          {processing && (
            <div className="card">
              <span className="label">Processing...</span>
              <div className="progress-bar" style={{marginTop:'0.5rem'}}>
                <div className="fill" style={{width:`${progress}%`}}/>
              </div>
              <p style={{fontSize:'0.8rem',color:'var(--text-muted)',marginTop:'0.5rem'}}>
                This can take several minutes depending on image count and method.
              </p>
            </div>
          )}
          {error && <div className="card" style={{borderColor:'var(--danger)'}}><p style={{color:'var(--danger)',fontSize:'0.85rem'}}>{error}</p></div>}
          {result && <InfoPanel data={result} title="Result"/>}
        </div>
        <div className="sidebar">
          <div className="card">
            <span className="label">Quality</span>
            <select value={quality} onChange={e => setQuality(e.target.value)} className="input" style={{marginTop:'0.25rem'}}>
              <option value="low">Low (fast)</option>
              <option value="medium">Medium</option>
              <option value="high">High (slow)</option>
            </select>
          </div>
          <div className="card">
            <span className="label">Method Info</span>
            <p style={{fontSize:'0.8rem',color:'var(--text-muted)'}}>
              {method === 'photogrammetry' && 'COLMAP — Structure from Motion + Dense reconstruction. Best for objects.'}
              {method === 'nerf' && 'nerfstudio — Neural Radiance Fields. Best for complex scenes. Requires GPU.'}
              {method === 'gaussian-splatting' && '3D Gaussian Splatting — Fast, high quality. Best for real-time viewing.'}
              {method === 'apple' && 'Apple Object Capture — macOS only, Apple Silicon. Highest quality, uses RealityKit.'}
            </p>
          </div>
          <button className="btn btn-primary" onClick={handleReconstruct} disabled={images.length === 0 || processing}>
            {processing ? 'Reconstructing...' : 'Start Reconstruction'}
          </button>
        </div>
      </div>
    </div>
  );
}
