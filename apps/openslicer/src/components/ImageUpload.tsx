"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Upload, X } from "lucide-react";

interface ImageInfo {
  name: string;
  size: number;
  previewUrl: string;
}

export function ImageUpload() {
  const t = useTranslations("litophane");
  const [image, setImage] = useState<ImageInfo | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFile = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    setImage({ name: file.name, size: file.size, previewUrl: url });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFile(droppedFile);
  }, [handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) handleFile(selectedFile);
  }, [handleFile]);

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const removeImage = useCallback(() => {
    if (image?.previewUrl) URL.revokeObjectURL(image.previewUrl);
    setImage(null);
  }, [image]);

  return (
    <div>
      {!image ? (
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
          <p className="text-sm font-medium text-gray-700">{t("dragDropImage")}</p>
          <p className="text-xs text-gray-400 mt-1">{t("supportedImageFormats")}</p>
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            onChange={handleFileInput}
            className="hidden"
          />
        </label>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-start gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.previewUrl}
              alt={image.name}
              className="w-32 h-32 object-cover rounded-lg border border-gray-200"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{image.name}</p>
              <p className="text-xs text-gray-400 mt-1">{formatSize(image.size)}</p>
            </div>
            <button
              type="button"
              onClick={removeImage}
              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
