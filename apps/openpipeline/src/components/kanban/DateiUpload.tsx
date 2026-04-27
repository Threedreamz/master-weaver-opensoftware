"use client";

import { useCallback, useState, useRef } from "react";
import { Upload } from "lucide-react";
import type { Anhang } from "@opensoftware/db/openpipeline";

interface DateiUploadProps {
  karteId: string;
  onHochgeladen: (anhang: Anhang) => void;
}

export function DateiUpload({ karteId, onHochgeladen }: DateiUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/karten/${karteId}/anhaenge`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        onHochgeladen(await res.json());
      }
    } finally {
      setUploading(false);
    }
  }, [karteId, onHochgeladen]);

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }

  function onFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      className={`
        border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors
        ${dragOver ? "border-blue-500 bg-blue-500/10" : "border-zinc-700 hover:border-zinc-600"}
        ${uploading ? "opacity-50 pointer-events-none" : ""}
      `}
    >
      <Upload className="w-6 h-6 mx-auto mb-1 text-zinc-500" />
      <p className="text-xs text-zinc-400">
        {uploading ? "Wird hochgeladen..." : "Datei hierher ziehen oder klicken"}
      </p>
      <input ref={inputRef} type="file" className="hidden" onChange={onFileSelect} />
    </div>
  );
}
