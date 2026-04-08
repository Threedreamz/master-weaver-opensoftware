'use client';

import { useCallback, useRef, useState } from 'react';
import type { ModulePanelProps } from '@mw/open3d-types';
import type { MeshFormat } from '@mw/open3d-types';
import { useViewerStore } from '@mw/open3d-viewer';

const ACCEPTED_EXTENSIONS = [
  '.stl', '.obj', '.gltf', '.glb', '.ply', '.3mf', '.dxf', '.svg', '.f3d',
];
const ACCEPT_STRING = ACCEPTED_EXTENSIONS.join(',');

const FORMAT_MAP: Record<string, MeshFormat> = {
  stl: 'stl',
  obj: 'obj',
  gltf: 'gltf',
  glb: 'glb',
  ply: 'ply',
  '3mf': '3mf',
  dxf: 'dxf',
  svg: 'svg',
  f3d: 'f3d',
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface UploadedFileInfo {
  name: string;
  size: number;
  format: string;
}

export function UploadPanel({ moduleId, isActive, onClose }: ModulePanelProps) {
  const [dragover, setDragover] = useState(false);
  const [fileInfo, setFileInfo] = useState<UploadedFileInfo | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const setModelUrl = useViewerStore((s) => s.setModelUrl);
  const setModelFormat = useViewerStore((s) => s.setModelFormat);
  const reset = useViewerStore((s) => s.reset);
  const modelUrl = useViewerStore((s) => s.modelUrl);

  const handleFile = useCallback(
    (file: File) => {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
      const format = FORMAT_MAP[ext];
      if (!format) return;

      const url = URL.createObjectURL(file);
      setModelUrl(url);
      setModelFormat(format);
      setFileInfo({ name: file.name, size: file.size, format: ext.toUpperCase() });
    },
    [setModelUrl, setModelFormat],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragover(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleClear = useCallback(() => {
    reset();
    setFileInfo(null);
    if (inputRef.current) inputRef.current.value = '';
  }, [reset]);

  if (!isActive) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#e0e0f0' }}>Upload Model</span>
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
          aria-label="Close upload panel"
        >
          &times;
        </button>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragover(true);
        }}
        onDragLeave={() => setDragover(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragover ? '#4488ff' : '#2a2a4a'}`,
          borderRadius: '8px',
          padding: '32px 16px',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragover ? 'rgba(68, 136, 255, 0.08)' : '#12122a',
          transition: 'border-color 0.2s, background 0.2s',
        }}
      >
        <div style={{ fontSize: '32px', marginBottom: '8px' }}>
          {dragover ? '📂' : '📁'}
        </div>
        <p style={{ color: '#e0e0f0', fontSize: '13px', margin: '0 0 6px' }}>
          Drop a 3D file here or click to browse
        </p>
        <p style={{ color: '#8888aa', fontSize: '11px', margin: 0 }}>
          STL, OBJ, glTF, GLB, PLY, 3MF, DXF, SVG, F3D
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_STRING}
          onChange={handleChange}
          style={{ display: 'none' }}
        />
      </div>

      {/* File Info */}
      {fileInfo && (
        <div
          style={{
            background: '#12122a',
            borderRadius: '6px',
            border: '1px solid #2a2a4a',
            padding: '12px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#8888aa', fontSize: '11px' }}>Name</span>
              <span
                style={{
                  color: '#e0e0f0',
                  fontSize: '12px',
                  maxWidth: '240px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {fileInfo.name}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#8888aa', fontSize: '11px' }}>Format</span>
              <span style={{ color: '#4488ff', fontSize: '12px', fontWeight: 600 }}>
                {fileInfo.format}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#8888aa', fontSize: '11px' }}>Size</span>
              <span style={{ color: '#e0e0f0', fontSize: '12px' }}>
                {formatFileSize(fileInfo.size)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Clear Button */}
      {modelUrl && (
        <button
          onClick={handleClear}
          style={{
            background: '#1a1a3a',
            border: '1px solid #2a2a4a',
            borderRadius: '6px',
            color: '#e0e0f0',
            padding: '8px 16px',
            cursor: 'pointer',
            fontSize: '12px',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLButtonElement).style.background = '#2a2a4a';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.background = '#1a1a3a';
          }}
        >
          Clear Model
        </button>
      )}
    </div>
  );
}
