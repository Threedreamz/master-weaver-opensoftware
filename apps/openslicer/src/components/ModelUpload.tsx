"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Upload, FileBox, X, Loader2 } from "lucide-react";

interface UploadedModel {
  id: string;
  name: string;
  filename: string;
  fileFormat: string;
  fileSizeBytes: number;
  triangleCount?: number;
  boundingBox?: { x: number; y: number; z: number };
  volumeCm3?: number;
  surfaceAreaCm2?: number;
  isManifold?: boolean;
  meshAnalyzed: boolean;
}

interface ModelUploadProps {
  onModelUploaded?: (model: UploadedModel) => void;
  onModelRemoved?: () => void;
}

export function ModelUpload({ onModelUploaded, onModelRemoved }: ModelUploadProps) {
  const t = useTranslations("slice");
  const [uploadedModel, setUploadedModel] = useState<UploadedModel | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const uploadFile = useCallback(async (file: File) => {
    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/models/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(err.error || `Upload failed (${res.status})`);
      }

      const model: UploadedModel = await res.json();
      setUploadedModel(model);
      onModelUploaded?.(model);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }, [onModelUploaded]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      uploadFile(droppedFile);
    }
  }, [uploadFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      uploadFile(selectedFile);
    }
  }, [uploadFile]);

  const handleRemove = useCallback(() => {
    setUploadedModel(null);
    setUploadError(null);
    onModelRemoved?.();
  }, [onModelRemoved]);

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (isUploading) {
    return (
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-8 flex flex-col items-center justify-center gap-3">
        <Loader2 size={32} className="text-blue-500 animate-spin" />
        <p className="text-sm font-medium text-blue-700">Uploading & analyzing model...</p>
      </div>
    );
  }

  return (
    <div>
      {!uploadedModel ? (
        <div>
          <label
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 cursor-pointer transition-colors ${
              isDragOver
                ? "border-blue-400 bg-blue-50"
                : "border-gray-300 bg-white hover:border-gray-400"
            }`}
          >
            <Upload size={32} className="text-gray-400 mb-3" />
            <p className="text-sm font-medium text-gray-700">{t("dragDropModel")}</p>
            <p className="text-xs text-gray-400 mt-1">{t("supportedFormats")}</p>
            <input
              type="file"
              accept=".stl,.3mf,.obj"
              onChange={handleFileInput}
              className="hidden"
            />
          </label>
          {uploadError && (
            <p className="text-sm text-red-600 mt-2">{uploadError}</p>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <FileBox size={20} className="text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{uploadedModel.filename}</p>
              <p className="text-xs text-gray-400">{formatSize(uploadedModel.fileSizeBytes)}</p>
            </div>
            <button
              type="button"
              onClick={handleRemove}
              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
          {uploadedModel.meshAnalyzed && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-500">
              {uploadedModel.triangleCount != null && (
                <div>
                  <span className="font-medium text-gray-700">Triangles:</span>{" "}
                  {uploadedModel.triangleCount.toLocaleString()}
                </div>
              )}
              {uploadedModel.boundingBox && (
                <div>
                  <span className="font-medium text-gray-700">Size:</span>{" "}
                  {uploadedModel.boundingBox.x.toFixed(1)} x {uploadedModel.boundingBox.y.toFixed(1)} x {uploadedModel.boundingBox.z.toFixed(1)} mm
                </div>
              )}
              {uploadedModel.volumeCm3 != null && (
                <div>
                  <span className="font-medium text-gray-700">Volume:</span>{" "}
                  {uploadedModel.volumeCm3.toFixed(1)} cm3
                </div>
              )}
              {uploadedModel.isManifold != null && (
                <div>
                  <span className="font-medium text-gray-700">Manifold:</span>{" "}
                  {uploadedModel.isManifold ? "Yes" : "No"}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
