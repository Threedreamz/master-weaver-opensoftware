'use client';

import { useCallback, useState } from 'react';
import type { ModulePanelProps } from '@mw/open3d-types';
import { useViewerStore } from '@mw/open3d-viewer';

type ConversionStatus = 'idle' | 'converting' | 'done' | 'error';

const OUTPUT_FORMATS = [
  { value: 'stl', label: 'STL' },
  { value: 'obj', label: 'OBJ' },
  { value: 'ply', label: 'PLY' },
  { value: 'glb', label: 'GLB' },
] as const;

export function ConverterPanel({ moduleId, isActive, onClose }: ModulePanelProps) {
  const modelUrl = useViewerStore((s) => s.modelUrl);
  const modelFormat = useViewerStore((s) => s.modelFormat);

  const [outputFormat, setOutputFormat] = useState('stl');
  const [optimize, setOptimize] = useState(false);
  const [draco, setDraco] = useState(false);
  const [status, setStatus] = useState<ConversionStatus>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultSize, setResultSize] = useState<number | null>(null);

  const handleConvert = useCallback(async () => {
    if (!modelUrl) return;

    setStatus('converting');
    setErrorMsg(null);
    setResultUrl(null);
    setResultSize(null);

    try {
      // Fetch the blob from the object URL
      const sourceBlob = await fetch(modelUrl).then((r) => r.blob());
      const formData = new FormData();
      formData.append('file', sourceBlob, `model.${modelFormat ?? 'stl'}`);
      formData.append('targetFormat', outputFormat);
      formData.append('optimize', String(optimize));
      formData.append('draco', String(draco));

      const res = await fetch('/api/convert', { method: 'POST', body: formData });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Conversion failed (${res.status})`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
      setResultSize(blob.size);
      setStatus('done');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStatus('error');
    }
  }, [modelUrl, modelFormat, outputFormat, optimize, draco]);

  const handleDownload = useCallback(() => {
    if (!resultUrl) return;
    const a = document.createElement('a');
    a.href = resultUrl;
    a.download = `converted.${outputFormat}`;
    a.click();
  }, [resultUrl, outputFormat]);

  if (!isActive) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#e0e0f0' }}>
          Format Converter
        </span>
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
          aria-label="Close converter panel"
        >
          &times;
        </button>
      </div>

      {/* Source Info */}
      {modelUrl ? (
        <div
          style={{
            background: '#12122a',
            borderRadius: '6px',
            border: '1px solid #2a2a4a',
            padding: '10px 12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ color: '#8888aa', fontSize: '11px' }}>Source</span>
          <span style={{ color: '#4488ff', fontSize: '12px', fontWeight: 600 }}>
            {modelFormat?.toUpperCase() ?? 'Unknown'}
          </span>
        </div>
      ) : (
        <div
          style={{
            background: '#12122a',
            borderRadius: '6px',
            border: '1px solid #2a2a4a',
            padding: '16px',
            textAlign: 'center',
          }}
        >
          <span style={{ color: '#8888aa', fontSize: '12px' }}>
            Upload a model first to convert
          </span>
        </div>
      )}

      {/* Output Format */}
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
        <span
          style={{
            color: '#8888aa',
            fontSize: '10px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Output Format
        </span>
        <select
          value={outputFormat}
          onChange={(e) => {
            setOutputFormat(e.target.value);
            setStatus('idle');
            setResultUrl(null);
          }}
          style={{
            background: '#0a0a1a',
            border: '1px solid #2a2a4a',
            borderRadius: '4px',
            color: '#e0e0f0',
            padding: '6px 10px',
            fontSize: '12px',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          {OUTPUT_FORMATS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {/* Options */}
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
        <span
          style={{
            color: '#8888aa',
            fontSize: '10px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Options
        </span>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            color: '#e0e0f0',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={optimize}
            onChange={(e) => setOptimize(e.target.checked)}
            style={{ accentColor: '#4488ff', cursor: 'pointer' }}
          />
          Optimize (dedup + weld)
        </label>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            color: '#e0e0f0',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={draco}
            onChange={(e) => setDraco(e.target.checked)}
            style={{ accentColor: '#4488ff', cursor: 'pointer' }}
          />
          Draco Compression
        </label>
      </div>

      {/* Convert Button */}
      <button
        onClick={handleConvert}
        disabled={!modelUrl || status === 'converting'}
        style={{
          background: !modelUrl || status === 'converting' ? '#1a1a3a' : '#4488ff',
          border: 'none',
          borderRadius: '6px',
          color: !modelUrl || status === 'converting' ? '#8888aa' : '#ffffff',
          padding: '10px 16px',
          cursor: !modelUrl || status === 'converting' ? 'not-allowed' : 'pointer',
          fontSize: '13px',
          fontWeight: 600,
          transition: 'background 0.15s',
        }}
      >
        {status === 'converting' ? 'Converting...' : 'Convert'}
      </button>

      {/* Status / Result */}
      {status === 'error' && errorMsg && (
        <div
          style={{
            background: 'rgba(255, 68, 68, 0.1)',
            border: '1px solid rgba(255, 68, 68, 0.3)',
            borderRadius: '6px',
            padding: '10px 12px',
          }}
        >
          <span style={{ color: '#ff6666', fontSize: '12px' }}>{errorMsg}</span>
        </div>
      )}

      {status === 'done' && resultUrl && (
        <div
          style={{
            background: 'rgba(68, 255, 68, 0.06)',
            border: '1px solid rgba(68, 255, 68, 0.2)',
            borderRadius: '6px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#88cc88', fontSize: '11px' }}>Output</span>
            <span style={{ color: '#e0e0f0', fontSize: '12px', fontWeight: 600 }}>
              {outputFormat.toUpperCase()}
            </span>
          </div>
          {resultSize != null && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#88cc88', fontSize: '11px' }}>Size</span>
              <span style={{ color: '#e0e0f0', fontSize: '12px' }}>
                {resultSize < 1024
                  ? `${resultSize} B`
                  : resultSize < 1024 * 1024
                    ? `${(resultSize / 1024).toFixed(1)} KB`
                    : `${(resultSize / (1024 * 1024)).toFixed(1)} MB`}
              </span>
            </div>
          )}
          <button
            onClick={handleDownload}
            style={{
              background: '#1a3a1a',
              border: '1px solid rgba(68, 255, 68, 0.3)',
              borderRadius: '6px',
              color: '#88ff88',
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.background = '#2a4a2a';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.background = '#1a3a1a';
            }}
          >
            Download {outputFormat.toUpperCase()}
          </button>
        </div>
      )}
    </div>
  );
}
