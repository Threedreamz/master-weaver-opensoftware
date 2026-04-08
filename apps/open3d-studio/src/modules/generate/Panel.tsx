'use client';

import { useCallback, useRef, useState } from 'react';
import type { ModulePanelProps } from '@mw/open3d-types';
import { useViewerStore } from '@mw/open3d-viewer';

type GenerateMode = 'image' | 'text';
type Engine = 'triposr' | 'tripo-api' | 'meshy-api';

interface GenerationResult {
  url: string;
  vertices: number;
  duration: number;
  engine: string;
}

const ENGINES: { value: Engine; label: string }[] = [
  { value: 'triposr', label: 'TripoSR (Local)' },
  { value: 'tripo-api', label: 'Tripo API' },
  { value: 'meshy-api', label: 'Meshy API' },
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
  cancelButton: {
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
  progressBar: {
    width: '100%',
    height: '6px',
    background: '#1a1a3a',
    borderRadius: '3px',
    overflow: 'hidden',
  } as React.CSSProperties,
  progressFill: (pct: number): React.CSSProperties => ({
    width: `${pct}%`,
    height: '100%',
    background: '#4488ff',
    borderRadius: '3px',
    transition: 'width 0.3s ease',
  }),
  row: {
    display: 'flex',
    justifyContent: 'space-between',
  } as React.CSSProperties,
};

export function GeneratePanel({ moduleId, isActive, onClose }: ModulePanelProps) {
  const [mode, setMode] = useState<GenerateMode>('image');
  const [engine, setEngine] = useState<Engine>('triposr');
  const [textPrompt, setTextPrompt] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const setModelUrl = useViewerStore((s) => s.setModelUrl);
  const setModelFormat = useViewerStore((s) => s.setModelFormat);

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setResult(null);
      setError(null);
    }
  }, []);

  const loadResult = useCallback(
    (url: string) => {
      setModelUrl(url);
      setModelFormat('glb');
    },
    [setModelUrl, setModelFormat],
  );

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setProgress(0);
    setError(null);
    setResult(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      if (mode === 'image') {
        if (!imageFile) return;
        const formData = new FormData();
        formData.append('image', imageFile);
        formData.append('engine', engine);

        const response = await fetch('/api/generate/image', {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Generation failed: ${response.statusText}`);
        }

        // SSE progress stream
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (reader) {
          let buffer = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  if (data.progress !== undefined) {
                    setProgress(data.progress);
                  }
                  if (data.result) {
                    const genResult: GenerationResult = {
                      url: data.result.url,
                      vertices: data.result.vertices ?? 0,
                      duration: data.result.duration ?? 0,
                      engine: data.result.engine ?? engine,
                    };
                    setResult(genResult);
                    loadResult(genResult.url);
                  }
                  if (data.error) {
                    setError(data.error);
                  }
                } catch {
                  // skip malformed SSE lines
                }
              }
            }
          }
        }
      } else {
        if (!textPrompt.trim()) return;

        const response = await fetch('/api/generate/text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: textPrompt, engine }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Generation failed: ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (reader) {
          let buffer = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  if (data.progress !== undefined) {
                    setProgress(data.progress);
                  }
                  if (data.result) {
                    const genResult: GenerationResult = {
                      url: data.result.url,
                      vertices: data.result.vertices ?? 0,
                      duration: data.result.duration ?? 0,
                      engine: data.result.engine ?? engine,
                    };
                    setResult(genResult);
                    loadResult(genResult.url);
                  }
                  if (data.error) {
                    setError(data.error);
                  }
                } catch {
                  // skip malformed SSE lines
                }
              }
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // user cancelled
      } else {
        setError(err instanceof Error ? err.message : 'Generation failed');
      }
    } finally {
      setGenerating(false);
      abortRef.current = null;
    }
  }, [mode, engine, imageFile, textPrompt, loadResult]);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
    setGenerating(false);
    setProgress(0);
  }, []);

  if (!isActive) return null;

  const canGenerate = mode === 'image' ? !!imageFile : textPrompt.trim().length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#e0e0f0' }}>AI Generate</span>
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
          aria-label="Close generate panel"
        >
          &times;
        </button>
      </div>

      {/* Mode Tabs */}
      <div style={{ display: 'flex', gap: '6px' }}>
        <button onClick={() => setMode('image')} style={styles.tab(mode === 'image')}>
          Image &rarr; 3D
        </button>
        <button onClick={() => setMode('text')} style={styles.tab(mode === 'text')}>
          Text &rarr; 3D
        </button>
      </div>

      {/* Image Mode */}
      {mode === 'image' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div
            onClick={() => inputRef.current?.click()}
            style={{
              ...styles.card,
              textAlign: 'center',
              cursor: 'pointer',
              padding: '20px 12px',
              border: imageFile ? '1px solid #4488ff' : '2px dashed #2a2a4a',
            }}
          >
            {imageFile ? (
              <div>
                <p style={{ color: '#e0e0f0', fontSize: '12px', margin: '0 0 4px' }}>
                  {imageFile.name}
                </p>
                <p style={{ color: '#8888aa', fontSize: '11px', margin: 0 }}>
                  {(imageFile.size / 1024).toFixed(1)} KB - Click to change
                </p>
              </div>
            ) : (
              <div>
                <p style={{ color: '#e0e0f0', fontSize: '12px', margin: '0 0 4px' }}>
                  Click to upload an image
                </p>
                <p style={{ color: '#8888aa', fontSize: '11px', margin: 0 }}>
                  PNG, JPG, WebP supported
                </p>
              </div>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              style={{ display: 'none' }}
            />
          </div>

          <div>
            <label style={styles.label}>Engine</label>
            <select
              value={engine}
              onChange={(e) => setEngine(e.target.value as Engine)}
              style={styles.select}
              disabled={generating}
            >
              {ENGINES.map((eng) => (
                <option key={eng.value} value={eng.value}>
                  {eng.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Text Mode */}
      {mode === 'text' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <label style={styles.label}>Prompt</label>
            <textarea
              value={textPrompt}
              onChange={(e) => setTextPrompt(e.target.value)}
              placeholder="Describe the 3D model you want to generate..."
              disabled={generating}
              rows={3}
              style={{
                ...styles.input,
                resize: 'vertical',
                minHeight: '60px',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div>
            <label style={styles.label}>Engine</label>
            <select
              value={engine}
              onChange={(e) => setEngine(e.target.value as Engine)}
              style={styles.select}
              disabled={generating}
            >
              {ENGINES.map((eng) => (
                <option key={eng.value} value={eng.value}>
                  {eng.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Progress */}
      {generating && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={styles.progressBar}>
            <div style={styles.progressFill(progress)} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#8888aa', fontSize: '11px' }}>
              Generating... {Math.round(progress)}%
            </span>
          </div>
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

      {/* Generate / Cancel Buttons */}
      {generating ? (
        <button onClick={handleCancel} style={styles.cancelButton}>
          Cancel
        </button>
      ) : (
        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          style={canGenerate ? styles.button : styles.buttonDisabled}
        >
          Generate
        </button>
      )}

      {/* Result */}
      {result && (
        <div style={styles.card}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={styles.row}>
              <span style={{ color: '#8888aa', fontSize: '11px' }}>Vertices</span>
              <span style={{ color: '#e0e0f0', fontSize: '12px' }}>
                {result.vertices.toLocaleString()}
              </span>
            </div>
            <div style={styles.row}>
              <span style={{ color: '#8888aa', fontSize: '11px' }}>Duration</span>
              <span style={{ color: '#e0e0f0', fontSize: '12px' }}>
                {(result.duration / 1000).toFixed(1)}s
              </span>
            </div>
            <div style={styles.row}>
              <span style={{ color: '#8888aa', fontSize: '11px' }}>Engine</span>
              <span style={{ color: '#4488ff', fontSize: '12px', fontWeight: 600 }}>
                {result.engine}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
