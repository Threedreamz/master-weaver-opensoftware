"use client";

import { useState, useCallback } from "react";
import { Upload, FileBox, X, Trash2, MousePointerClick } from "lucide-react";
import { useSlicerStore } from "../../stores/slicer-store";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTriangles(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}

const ACCEPTED_EXTENSIONS = [".stl", ".3mf", ".obj"];

export function UploadPanel() {
  const { models, addModel, removeModel, selectModel, selectedModelId } =
    useSlicerStore();
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);

  const isAcceptedFile = (file: File) =>
    ACCEPTED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext));

  const uploadFile = useCallback(
    async (file: File) => {
      if (!isAcceptedFile(file)) return;
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/models/upload", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) throw new Error("Upload failed");
        const data = await res.json();
        addModel({
          id: data.id,
          name: file.name,
          filename: file.name,
          url: data.url ?? `/api/models/${data.id}/file`,
          fileFormat: file.name.split('.').pop() ?? 'stl',
          fileSizeBytes: file.size,
          triangleCount: data.triangleCount ?? 0,
          meshAnalyzed: data.meshAnalyzed ?? false,
        });
      } catch (err) {
        console.error("Upload error:", err);
      } finally {
        setUploading(false);
      }
    },
    [addModel],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const files = Array.from(e.dataTransfer.files);
      files.forEach((f) => uploadFile(f));
    },
    [uploadFile],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      files.forEach((f) => uploadFile(f));
      e.target.value = "";
    },
    [uploadFile],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      removeModel(id);
    },
    [removeModel],
  );

  return (
    <div className="flex flex-col gap-2 p-3">
      {/* Drag-and-drop zone */}
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-5 cursor-pointer transition-colors ${
          isDragOver
            ? "border-blue-500 bg-blue-500/10"
            : "border-zinc-600 bg-zinc-800/50 hover:border-zinc-500"
        }`}
      >
        <Upload size={24} className="text-zinc-400 mb-2" />
        <p className="text-xs font-medium text-zinc-300">
          Drop models here or click to browse
        </p>
        <p className="text-[10px] text-zinc-500 mt-1">STL, 3MF, OBJ</p>
        <input
          type="file"
          accept=".stl,.3mf,.obj"
          multiple
          onChange={handleFileInput}
          className="hidden"
        />
      </label>

      {uploading && (
        <div className="text-xs text-blue-400 text-center py-1">
          Uploading...
        </div>
      )}

      {/* Model list */}
      {models.length > 0 && (
        <div className="flex flex-col gap-1 mt-1">
          {models.map((model) => (
            <div
              key={model.id}
              onClick={() => selectModel(model.id)}
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer transition-colors ${
                selectedModelId === model.id
                  ? "bg-blue-500/20 border border-blue-500/40"
                  : "bg-zinc-800 border border-transparent hover:bg-zinc-700"
              }`}
            >
              <FileBox size={14} className="text-zinc-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-zinc-200 truncate">
                  {model.name}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-zinc-500">
                    {formatSize(model.fileSizeBytes)}
                  </span>
                  {(model.triangleCount ?? 0) > 0 && (
                    <span className="text-[10px] text-zinc-500 bg-zinc-700 px-1 rounded">
                      {formatTriangles(model.triangleCount ?? 0)} tris
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(model.id);
                }}
                className="p-1 rounded hover:bg-zinc-600 text-zinc-500 hover:text-red-400 transition-colors"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {models.length === 0 && !uploading && (
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-600 justify-center py-2">
          <MousePointerClick size={12} />
          <span>No models loaded</span>
        </div>
      )}
    </div>
  );
}
