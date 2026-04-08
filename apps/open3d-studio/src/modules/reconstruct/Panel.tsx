'use client';

import { useCallback, useRef, useState } from 'react';
import type { ModulePanelProps } from '@mw/open3d-types';
import { useViewerStore } from '@mw/open3d-viewer';

type ReconstructMethod = 'photogrammetry' | 'nerf' | 'gaussian-splatting' | 'apple-object-capture';
type Quality = 'low' | 'medium' | 'high';
type ProcessingStatus = 'idle' | 'pending' | 'processing' | 'complete' | 'failed';

interface UploadedImage {
  file: File;
  preview: string;
}

const METHODS: { value: ReconstructMethod; label: string }[] = [
  { value: 'photogrammetry', label: 'Photogrammetry' },
  { value: 'nerf', label: 'NeRF' },
  { value: 'gaussian-splatting', label: 'Gaussian Splatting' },
  { value: 'apple-object-capture', label: 'Apple Object Capture' },
];

const QUALITIES: Quality[] = ['low', 'medium', 'high'];

const STATUS_LABELS: Record<ProcessingStatus, string> = {
  idle: 'Ready',
  pending: 'Queued...',
  processing: 'Processing...',
  complete: 'Complete',
  failed: 'Failed',
};

const STATUS_COLORS: Record<ProcessingStatus, string> = {
  idle: '#8888aa',
  pending: '#ffaa44',
  processing: '#4488ff',
  complete: '#44cc88',
  failed: '#ff4444',
};

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
  qualityBtn: (active: boolean): React.CSSProperties => ({
    flex: 1,
    background: active ? '#4488ff' : '#1a1a3a',
    border: active ? 'none' : '1px solid #2a2a4a',
    borderRadius: '6px',
    color: active ? '#ffffff' : '#8888aa',
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: active ? 600 : 400,
    textTransform: 'capitalize' as const,
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
  imageGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(56px, 1fr))',
    gap: '6px',
  } as React.CSSProperties,
  thumbnail: {
    width: '100%',
    aspectRatio: '1',
    objectFit: 'cover' as const,
    borderRadius: '4px',
    border: '1px solid #2a2a4a',
  } as React.CSSProperties,
  row: {
    display: 'flex',
    justifyContent: 'space-between',
  } as React.CSSProperties,
};

export function ReconstructPanel({ moduleId, isActive, onClose }: ModulePanelProps) {
  const [method, setMethod] = useState<ReconstructMethod>('photogrammetry');
  const [quality, setQuality] = useState<Quality>('medium');
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const setModelUrl = useViewerStore((s) => s.setModelUrl);
  const setModelFormat = useViewerStore((s) => s.setModelFormat);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: UploadedImage[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      newImages.push({
        file,
        preview: URL.createObjectURL(file),
      });
    }

    setImages((prev) => [...prev, ...newImages]);
    setError(null);

    // Reset input so the same files can be re-selected
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  const handleRemoveImage = useCallback((index: number) => {
    setImages((prev) => {
      const next = [...prev];
      URL.revokeObjectURL(next[index].preview);
      next.splice(index, 1);
      return next;
    });
  }, []);

  const handleReconstruct = useCallback(async () => {
    if (images.length === 0) return;

    setStatus('pending');
    setProgress(0);
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const formData = new FormData();
      images.forEach((img, idx) => {
        formData.append(`image_${idx}`, img.file);
      });
      formData.append('method', method);
      formData.append('quality', quality);
      formData.append('imageCount', String(images.length));

      const response = await fetch('/api/reconstruct', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Reconstruction failed: ${response.statusText}`);
      }

      setStatus('processing');

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
                if (data.status) {
                  setStatus(data.status as ProcessingStatus);
                }
                if (data.progress !== undefined) {
                  setProgress(data.progress);
                }
                if (data.result) {
                  setModelUrl(data.result.url);
                  setModelFormat(data.result.format ?? 'glb');
                  setStatus('complete');
                  setProgress(100);
                }
                if (data.error) {
                  setError(data.error);
                  setStatus('failed');
                }
              } catch {
                // skip malformed SSE lines
              }
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setStatus('idle');
      } else {
        setError(err instanceof Error ? err.message : 'Reconstruction failed');
        setStatus('failed');
      }
    } finally {
      abortRef.current = null;
    }
  }, [images, method, quality, setModelUrl, setModelFormat]);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
    setStatus('idle');
    setProgress(0);
  }, []);

  if (!isActive) return null;

  const isProcessing = status === 'pending' || status === 'processing';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#e0e0f0' }}>Reconstruct</span>
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
          aria-label="Close reconstruct panel"
        >
          &times;
        </button>
      </div>

      {/* Method Selector */}
      <div>
        <label style={styles.label}>Method</label>
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value as ReconstructMethod)}
          style={styles.select}
          disabled={isProcessing}
        >
          {METHODS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {/* Image Upload Area */}
      <div>
        <label style={styles.label}>
          Images ({images.length} uploaded)
        </label>
        <div
          onClick={() => !isProcessing && inputRef.current?.click()}
          style={{
            ...styles.card,
            textAlign: 'center',
            cursor: isProcessing ? 'default' : 'pointer',
            padding: '16px 12px',
            border: images.length > 0 ? '1px solid #4488ff' : '2px dashed #2a2a4a',
          }}
        >
          {images.length === 0 ? (
            <div>
              <p style={{ color: '#e0e0f0', fontSize: '12px', margin: '0 0 4px' }}>
                Click to upload images
              </p>
              <p style={{ color: '#8888aa', fontSize: '11px', margin: 0 }}>
                Upload multiple photos of the object
              </p>
            </div>
          ) : (
            <div style={styles.imageGrid}>
              {images.map((img, idx) => (
                <div key={idx} style={{ position: 'relative' }}>
                  <img
                    src={img.preview}
                    alt={`Photo ${idx + 1}`}
                    style={styles.thumbnail}
                  />
                  {!isProcessing && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveImage(idx);
                      }}
                      style={{
                        position: 'absolute',
                        top: '-4px',
                        right: '-4px',
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        background: '#ff4444',
                        border: 'none',
                        color: '#fff',
                        fontSize: '10px',
                        lineHeight: '16px',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                      aria-label={`Remove photo ${idx + 1}`}
                    >
                      &times;
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      {/* Quality Selector */}
      <div>
        <label style={styles.label}>Quality</label>
        <div style={{ display: 'flex', gap: '6px' }}>
          {QUALITIES.map((q) => (
            <button
              key={q}
              onClick={() => setQuality(q)}
              disabled={isProcessing}
              style={styles.qualityBtn(quality === q)}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Status */}
      {status !== 'idle' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={styles.row}>
            <span style={{ color: '#8888aa', fontSize: '11px' }}>Status</span>
            <span style={{ color: STATUS_COLORS[status], fontSize: '12px', fontWeight: 600 }}>
              {STATUS_LABELS[status]}
            </span>
          </div>
          {isProcessing && (
            <div style={styles.progressBar}>
              <div style={styles.progressFill(progress)} />
            </div>
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

      {/* Action Button */}
      {isProcessing ? (
        <button
          onClick={handleCancel}
          style={{
            width: '100%',
            background: '#1a1a3a',
            border: '1px solid #2a2a4a',
            borderRadius: '6px',
            color: '#e0e0f0',
            padding: '8px 16px',
            cursor: 'pointer',
            fontSize: '12px',
            transition: 'background 0.15s',
          }}
        >
          Cancel
        </button>
      ) : (
        <button
          onClick={handleReconstruct}
          disabled={images.length === 0}
          style={images.length > 0 ? styles.button : styles.buttonDisabled}
        >
          Reconstruct
        </button>
      )}
    </div>
  );
}
