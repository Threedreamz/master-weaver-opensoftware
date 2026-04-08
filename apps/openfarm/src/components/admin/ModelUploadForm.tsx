"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

const ALLOWED_EXTENSIONS = [".stl", ".3mf", ".obj", ".step"];
const MAX_SIZE_MB = 100;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

interface UploadState {
  status: "idle" | "uploading" | "success" | "error";
  progress: number;
  error?: string;
}

export function ModelUploadForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [upload, setUpload] = useState<UploadState>({
    status: "idle",
    progress: 0,
  });

  const validateFile = useCallback((f: File): string | null => {
    const ext = "." + f.name.split(".").pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return `Invalid file type: ${ext}. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`;
    }
    if (f.size > MAX_SIZE_BYTES) {
      return `File too large: ${(f.size / 1024 / 1024).toFixed(1)}MB. Maximum: ${MAX_SIZE_MB}MB`;
    }
    return null;
  }, []);

  const handleFileSelect = useCallback(
    (f: File) => {
      const error = validateFile(f);
      if (error) {
        setUpload({ status: "error", progress: 0, error });
        return;
      }
      setFile(f);
      setUpload({ status: "idle", progress: 0 });
      // Auto-fill name from filename if empty
      if (!name) {
        const baseName = f.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ");
        setName(baseName);
      }
    },
    [name, validateFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFileSelect(f);
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) handleFileSelect(f);
    },
    [handleFileSelect]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      setUpload({ status: "error", progress: 0, error: "Please select a file" });
      return;
    }

    if (!name.trim()) {
      setUpload({ status: "error", progress: 0, error: "Name is required" });
      return;
    }

    setUpload({ status: "uploading", progress: 0 });

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", name.trim());
      if (description.trim()) formData.append("description", description.trim());
      if (tags.trim()) formData.append("tags", tags.trim());

      const xhr = new XMLHttpRequest();

      await new Promise<void>((resolve, reject) => {
        xhr.upload.addEventListener("progress", (ev) => {
          if (ev.lengthComputable) {
            const pct = Math.round((ev.loaded / ev.total) * 100);
            setUpload({ status: "uploading", progress: pct });
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            try {
              const body = JSON.parse(xhr.responseText);
              reject(new Error(body.error || `Upload failed (${xhr.status})`));
            } catch {
              reject(new Error(`Upload failed (${xhr.status})`));
            }
          }
        });

        xhr.addEventListener("error", () => reject(new Error("Network error")));
        xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")));

        xhr.open("POST", "/api/models/upload");
        xhr.send(formData);
      });

      setUpload({ status: "success", progress: 100 });

      // Redirect to models list after short delay
      setTimeout(() => {
        router.push("/admin/models");
        router.refresh();
      }, 1500);
    } catch (err) {
      setUpload({
        status: "error",
        progress: 0,
        error: err instanceof Error ? err.message : "Upload failed",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${dragOver ? "border-blue-500 bg-blue-50 dark:bg-blue-950" : "border-gray-300 dark:border-gray-600 hover:border-gray-400"}
          ${file ? "bg-green-50 dark:bg-green-950 border-green-300" : ""}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_EXTENSIONS.join(",")}
          onChange={handleInputChange}
          className="hidden"
        />
        {file ? (
          <div>
            <p className="text-sm font-medium text-green-700 dark:text-green-300">
              {file.name}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
            <p className="text-xs text-gray-400 mt-1">Click or drop to replace</p>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Drag and drop a 3D model file here, or click to browse
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Supported: {ALLOWED_EXTENSIONS.join(", ")} (max {MAX_SIZE_MB}MB)
            </p>
          </div>
        )}
      </div>

      {/* Name */}
      <div>
        <label htmlFor="model-name" className="block text-sm font-medium mb-1">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          id="model-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Benchy v2"
          className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-800"
          required
        />
      </div>

      {/* Description */}
      <div>
        <label htmlFor="model-desc" className="block text-sm font-medium mb-1">
          Description
        </label>
        <textarea
          id="model-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description..."
          rows={3}
          className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-800"
        />
      </div>

      {/* Tags */}
      <div>
        <label htmlFor="model-tags" className="block text-sm font-medium mb-1">
          Tags
        </label>
        <input
          id="model-tags"
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="e.g. functional, prototype, benchy"
          className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-800"
        />
        <p className="text-xs text-gray-400 mt-1">Comma-separated</p>
      </div>

      {/* Progress Bar */}
      {upload.status === "uploading" && (
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${upload.progress}%` }}
          />
          <p className="text-xs text-gray-500 mt-1 text-center">
            Uploading... {upload.progress}%
          </p>
        </div>
      )}

      {/* Status Messages */}
      {upload.status === "error" && upload.error && (
        <div className="rounded-md bg-red-50 dark:bg-red-950 p-3">
          <p className="text-sm text-red-700 dark:text-red-300">{upload.error}</p>
        </div>
      )}

      {upload.status === "success" && (
        <div className="rounded-md bg-green-50 dark:bg-green-950 p-3">
          <p className="text-sm text-green-700 dark:text-green-300">
            Model uploaded successfully! Redirecting...
          </p>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={upload.status === "uploading" || !file}
        className={`
          w-full rounded-md px-4 py-2 text-sm font-medium text-white
          ${upload.status === "uploading" || !file
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700"
          }
        `}
      >
        {upload.status === "uploading" ? "Uploading..." : "Upload Model"}
      </button>
    </form>
  );
}
