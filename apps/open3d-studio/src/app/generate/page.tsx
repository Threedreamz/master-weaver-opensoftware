'use client';
import { useState, useCallback } from 'react';
import { FileUploader } from '@/components/FileUploader';
import { TabSelector } from '@/components/TabSelector';

export default function GeneratePage() {
  const [mode, setMode] = useState('image');
  const [prompt, setPrompt] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ url: string; info: Record<string, any> } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    setResult(null);

    try {
      if (mode === 'text') {
        const res = await fetch('/api/generate/text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, outputFormat: 'glb' }),
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setResult({ url: data.meshPath ?? '', info: { Model: data.model, Duration: `${data.duration?.toFixed(1)}s`, Success: data.success } });
      } else if (mode === 'image' && imageFile) {
        const formData = new FormData();
        formData.append('image', imageFile);
        formData.append('outputFormat', 'glb');
        const res = await fetch('/api/generate/image', { method: 'POST', body: formData });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setResult({ url: data.meshPath ?? '', info: { Model: data.model, Vertices: data.vertexCount, Duration: `${data.duration?.toFixed(1)}s` } });
      }
    } catch (err) {
      setError(String(err));
    }
    setGenerating(false);
  }, [mode, prompt, imageFile]);

  return (
    <div className="page">
      <h1>AI 3D Generation</h1>
      <div className="page-layout">
        <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
          <div className="card">
            <TabSelector tabs={[{id:'image',label:'Image → 3D'},{id:'text',label:'Text → 3D'}]} active={mode} onChange={setMode}/>
          </div>

          {mode === 'image' && (
            <div className="card">
              <span className="label">Upload Image</span>
              <FileUploader accept=".jpg,.jpeg,.png,.webp" onFiles={(f) => setImageFile(f[0] ?? null)}
                label="Drop an image to generate 3D model (TripoSR)" />
              {imageFile && <p style={{fontSize:'0.85rem',marginTop:'0.5rem',color:'var(--text-muted)'}}>Selected: {imageFile.name}</p>}
            </div>
          )}

          {mode === 'text' && (
            <div className="card">
              <span className="label">Text Prompt</span>
              <textarea className="input" rows={3} placeholder="Describe the 3D object... e.g. 'a red chair'" value={prompt} onChange={e => setPrompt(e.target.value)} style={{marginTop:'0.25rem'}}/>
            </div>
          )}

          {error && <div className="card" style={{borderColor:'var(--danger)'}}><p style={{color:'var(--danger)',fontSize:'0.85rem'}}>{error}</p></div>}

          {result && (
            <div className="card">
              <span className="label">Result</span>
              <div className="info-grid" style={{marginTop:'0.5rem'}}>
                {Object.entries(result.info).map(([k, v]) => (
                  <div key={k} className="info-item"><span className="label">{k}</span><span className="value">{String(v)}</span></div>
                ))}
              </div>
              {result.url && <p style={{fontSize:'0.8rem',color:'var(--text-muted)',marginTop:'0.5rem'}}>Output: {result.url}</p>}
            </div>
          )}
        </div>
        <div className="sidebar">
          <div className="card">
            <span className="label">Model</span>
            <p style={{fontSize:'0.8rem',color:'var(--text-muted)'}}>
              {mode === 'image' ? 'TripoSR (0.5s, MIT license)' : 'Shap-E (OpenAI, ~13s)'}
            </p>
            <p style={{fontSize:'0.75rem',color:'var(--text-muted)',marginTop:'0.5rem'}}>
              Requires Python runtime with ML dependencies. Falls back to basic primitives if not installed.
            </p>
          </div>
          <button className="btn btn-primary" onClick={handleGenerate}
            disabled={generating || (mode === 'text' && !prompt) || (mode === 'image' && !imageFile)}>
            {generating ? 'Generating...' : 'Generate 3D'}
          </button>
        </div>
      </div>
    </div>
  );
}
