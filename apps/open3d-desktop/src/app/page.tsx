'use client';
import { useState, useEffect } from 'react';

export default function DesktopHome() {
  const [serverRunning, setServerRunning] = useState(false);
  const [statusMsg, setStatusMsg] = useState('Checking...');

  useEffect(() => {
    // Check if render server is accessible
    fetch('http://localhost:4173/api/health')
      .then(r => r.json())
      .then(d => { setServerRunning(true); setStatusMsg(`Server running — ${d.capabilities} capabilities`); })
      .catch(() => { setServerRunning(false); setStatusMsg('Server offline'); });
  }, []);

  return (
    <main style={{ padding: '2rem', maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem' }}>Open3D Desktop</h1>
      <p style={{ color: '#8888aa', marginBottom: '2rem' }}>Local 3D processing — no cloud needed</p>

      <div style={{ background: '#12122a', border: '1px solid #2a2a4a', borderRadius: 8, padding: '1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: serverRunning ? '#44cc88' : '#ff4444' }} />
          <span style={{ fontSize: '0.9rem' }}>{statusMsg}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <a href="http://localhost:4172/viewer" target="_blank" style={{ background: '#12122a', border: '1px solid #2a2a4a', borderRadius: 8, padding: '1rem', color: '#e0e0f0', textDecoration: 'none' }}>
          <h3 style={{ fontSize: '0.95rem' }}>3D Viewer</h3>
          <p style={{ fontSize: '0.8rem', color: '#8888aa' }}>STL, OBJ, glTF, Gaussian Splats</p>
        </a>
        <a href="http://localhost:4172/converter" target="_blank" style={{ background: '#12122a', border: '1px solid #2a2a4a', borderRadius: 8, padding: '1rem', color: '#e0e0f0', textDecoration: 'none' }}>
          <h3 style={{ fontSize: '0.95rem' }}>Converter</h3>
          <p style={{ fontSize: '0.8rem', color: '#8888aa' }}>7 format converters</p>
        </a>
        <a href="http://localhost:4172/slicer" target="_blank" style={{ background: '#12122a', border: '1px solid #2a2a4a', borderRadius: 8, padding: '1rem', color: '#e0e0f0', textDecoration: 'none' }}>
          <h3 style={{ fontSize: '0.95rem' }}>Slicer</h3>
          <p style={{ fontSize: '0.8rem', color: '#8888aa' }}>FDM + SLA, 12 printers</p>
        </a>
        <a href="http://localhost:4172/generate" target="_blank" style={{ background: '#12122a', border: '1px solid #2a2a4a', borderRadius: 8, padding: '1rem', color: '#e0e0f0', textDecoration: 'none' }}>
          <h3 style={{ fontSize: '0.95rem' }}>AI Generate</h3>
          <p style={{ fontSize: '0.8rem', color: '#8888aa' }}>Image->3D, Text->3D</p>
        </a>
        <a href="http://localhost:4172/reconstruct" target="_blank" style={{ background: '#12122a', border: '1px solid #2a2a4a', borderRadius: 8, padding: '1rem', color: '#e0e0f0', textDecoration: 'none' }}>
          <h3 style={{ fontSize: '0.95rem' }}>Reconstruct</h3>
          <p style={{ fontSize: '0.8rem', color: '#8888aa' }}>COLMAP, NeRF, 3DGS, Apple</p>
        </a>
        <a href="http://localhost:4172/simulate" target="_blank" style={{ background: '#12122a', border: '1px solid #2a2a4a', borderRadius: 8, padding: '1rem', color: '#e0e0f0', textDecoration: 'none' }}>
          <h3 style={{ fontSize: '0.95rem' }}>Simulate</h3>
          <p style={{ fontSize: '0.8rem', color: '#8888aa' }}>FEA, CNC CAM</p>
        </a>
      </div>
    </main>
  );
}
