'use client';
import { useCallback } from 'react';

interface DownloadButtonProps {
  data: Uint8Array | string | null;
  filename: string;
  label?: string;
  disabled?: boolean;
}

export function DownloadButton({ data, filename, label = 'Download', disabled = false }: DownloadButtonProps) {
  const handleDownload = useCallback(() => {
    if (!data) return;
    const blob = typeof data === 'string'
      ? new Blob([data], { type: 'text/plain' })
      : new Blob([data], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [data, filename]);

  return (
    <button className="btn btn-primary" onClick={handleDownload} disabled={disabled || !data}>
      {label}
    </button>
  );
}
