'use client';
import { useCallback, useState, useRef } from 'react';

interface FileUploaderProps {
  accept?: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  label?: string;
}

export function FileUploader({ accept, multiple = false, onFiles, label }: FileUploaderProps) {
  const [dragover, setDragover] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragover(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) onFiles(multiple ? files : [files[0]!]);
  }, [onFiles, multiple]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) onFiles(files);
  }, [onFiles]);

  return (
    <div
      className={`upload-zone ${dragover ? 'dragover' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragover(true); }}
      onDragLeave={() => setDragover(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <p>{label ?? 'Drop file here or click to upload'}</p>
      {accept && <p style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>{accept}</p>}
      <input ref={inputRef} type="file" accept={accept} multiple={multiple} onChange={handleChange} style={{ display: 'none' }} />
    </div>
  );
}
