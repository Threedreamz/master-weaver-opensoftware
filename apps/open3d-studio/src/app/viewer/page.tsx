'use client';
import dynamic from 'next/dynamic';
import { useState, useCallback } from 'react';
import { FileUploader } from '@/components/FileUploader';
import { SliderInput } from '@/components/SliderInput';
import { InfoPanel } from '@/components/InfoPanel';

// Dynamic import to avoid SSR with Three.js
const ViewerScene = dynamic(() => import('./ViewerScene'), { ssr: false });

export default function ViewerPage() {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [format, setFormat] = useState<string | null>(null);
  const [meshInfo, setMeshInfo] = useState<Record<string, any> | null>(null);
  // Viewer settings state
  const [wireframe, setWireframe] = useState(false);
  const [grid, setGrid] = useState(true);
  const [autoRotate, setAutoRotate] = useState(false);
  const [metalness, setMetalness] = useState(0.3);
  const [roughness, setRoughness] = useState(0.7);
  const [activeTool, setActiveTool] = useState<'none' | 'measure' | 'clip'>('none');
  const [clipPosition, setClipPosition] = useState(0);

  const handleFiles = useCallback((files: File[]) => {
    const file = files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    setFileUrl(url);
    setFormat(ext);
    setMeshInfo(null);
  }, []);

  return (
    <div className="page">
      <h1>3D Viewer</h1>
      <div className="page-layout">
        <div className="card viewer-container">
          {fileUrl ? (
            <ViewerScene
              src={fileUrl}
              format={format}
              wireframe={wireframe}
              grid={grid}
              autoRotate={autoRotate}
              metalness={metalness}
              roughness={roughness}
              activeTool={activeTool}
              clipPosition={clipPosition}
              onMeshInfo={setMeshInfo}
            />
          ) : (
            <FileUploader
              accept=".stl,.obj,.gltf,.glb,.ply,.splat,.3mf"
              onFiles={handleFiles}
              label="Drop 3D model to view (STL, OBJ, glTF, PLY, Splat)"
            />
          )}
        </div>
        <div className="sidebar">
          {!fileUrl && <div className="card"><p style={{color:'var(--text-muted)', fontSize:'0.85rem'}}>Upload a 3D model to get started</p></div>}

          {fileUrl && (
            <>
              <div className="card">
                <span className="label">Display</span>
                <div style={{display:'flex',flexDirection:'column',gap:'0.5rem',marginTop:'0.5rem'}}>
                  <label style={{display:'flex',gap:'0.5rem',fontSize:'0.85rem',cursor:'pointer'}}>
                    <input type="checkbox" checked={wireframe} onChange={e=>setWireframe(e.target.checked)}/> Wireframe
                  </label>
                  <label style={{display:'flex',gap:'0.5rem',fontSize:'0.85rem',cursor:'pointer'}}>
                    <input type="checkbox" checked={grid} onChange={e=>setGrid(e.target.checked)}/> Grid
                  </label>
                  <label style={{display:'flex',gap:'0.5rem',fontSize:'0.85rem',cursor:'pointer'}}>
                    <input type="checkbox" checked={autoRotate} onChange={e=>setAutoRotate(e.target.checked)}/> Auto Rotate
                  </label>
                </div>
              </div>

              <div className="card">
                <span className="label">Material</span>
                <SliderInput label="Metalness" min={0} max={1} value={metalness} onChange={setMetalness}/>
                <SliderInput label="Roughness" min={0} max={1} value={roughness} onChange={setRoughness}/>
              </div>

              <div className="card">
                <span className="label">Tools</span>
                <div style={{display:'flex',gap:'0.5rem',marginTop:'0.5rem'}}>
                  <button className={`btn ${activeTool==='measure'?'btn-primary':'btn-secondary'}`} onClick={()=>setActiveTool(activeTool==='measure'?'none':'measure')}>Measure</button>
                  <button className={`btn ${activeTool==='clip'?'btn-primary':'btn-secondary'}`} onClick={()=>setActiveTool(activeTool==='clip'?'none':'clip')}>Clip</button>
                </div>
                {activeTool === 'clip' && (
                  <SliderInput label="Clip Position" min={-5} max={5} step={0.1} value={clipPosition} onChange={setClipPosition}/>
                )}
              </div>

              {meshInfo && <InfoPanel data={meshInfo} title="Model Info"/>}

              <button className="btn btn-secondary" onClick={() => { setFileUrl(null); setFormat(null); setMeshInfo(null); }}>
                Clear
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
