"use client";

/**
 * opencad — ImportDialog
 *
 * Modal dialog for importing an STL or 3MF into a new project. Streams the
 * file body as application/octet-stream to POST /api/import/[format].
 *
 *   CRITICAL: matches api-contracts.ts — the server expects a streaming body
 *   and MUST NOT call req.arrayBuffer()/formData(). We pass file.stream() to
 *   fetch with `duplex: "half"` (Node 20+ web-streams contract).
 *
 *   See .claude/rules/known-pitfalls.md → "Upload Proxy OOM (Railway 502)".
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { FileUp, X, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

export type ImportFormat = "stl" | "3mf";

export interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImported?: (result: ImportedResult) => void;
  /** Override the base import URL (testing). */
  baseUrl?: string;
}

export interface ImportedResult {
  projectId: string;
  importedFeatureId: string;
  bbox?: unknown;
  triangleCount?: number;
  warnings?: string[];
}

type Phase = "idle" | "uploading" | "done" | "error";

/** Max upload size (matches server MAX_UPLOAD_BYTES default). */
const MAX_BYTES = 500 * 1024 * 1024; // 500 MB

export function ImportDialog({
  open,
  onClose,
  onImported,
  baseUrl = "/api/import",
}: ImportDialogProps) {
  const [format, setFormat] = useState<ImportFormat>("stl");
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const controllerRef = useRef<AbortController | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  const reset = useCallback(() => {
    setFile(null);
    setPhase("idle");
    setError(null);
    setProgress(0);
    controllerRef.current?.abort();
    controllerRef.current = null;
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && phase !== "uploading") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, phase, onClose]);

  // Reset when reopened
  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  const pickFile = (f: File | null) => {
    if (!f) return;
    if (f.size > MAX_BYTES) {
      setError(`File too large (max ${Math.round(MAX_BYTES / 1024 / 1024)} MB).`);
      setPhase("error");
      return;
    }
    // Auto-detect format from extension
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (ext === "stl" || ext === "3mf") setFormat(ext as ImportFormat);
    setFile(f);
    setError(null);
    setPhase("idle");
  };

  const upload = async () => {
    if (!file) return;
    setPhase("uploading");
    setError(null);
    setProgress(0);

    const controller = new AbortController();
    controllerRef.current = controller;

    // Track progress by wrapping the file stream in a TransformStream.
    const total = file.size;
    let sent = 0;
    const progressStream = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, ctrl) {
        sent += chunk.byteLength;
        setProgress(total > 0 ? Math.min(100, (sent / total) * 100) : 0);
        ctrl.enqueue(chunk);
      },
    });

    try {
      // `duplex: "half"` is required by Node 20+ web-streams for duplex uploads.
      const res = await fetch(`${baseUrl}/${format}`, {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/octet-stream",
          "x-filename": file.name,
        },
        body: file.stream().pipeThrough(progressStream),
        // @ts-expect-error — non-standard fetch option required for streaming bodies in Node 20+.
        duplex: "half",
        signal: controller.signal,
      });

      if (!res.ok) {
        let detail = `${res.status} ${res.statusText}`;
        try {
          const j = (await res.json()) as { error?: string };
          if (j?.error) detail = j.error;
        } catch {
          /* non-JSON error body */
        }
        throw new Error(detail);
      }

      const result = (await res.json()) as ImportedResult;
      setPhase("done");
      setProgress(100);
      onImported?.(result);
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        setPhase("idle");
        return;
      }
      setError(err instanceof Error ? err.message : "Upload failed");
      setPhase("error");
    } finally {
      controllerRef.current = null;
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && phase !== "uploading") onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-md rounded-lg border border-neutral-800 bg-neutral-900 p-5 text-neutral-100 shadow-xl"
      >
        <header className="mb-4 flex items-center justify-between">
          <h2 id="import-dialog-title" className="text-base font-semibold">
            Import model
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={phase === "uploading"}
            className="rounded p-1 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100 disabled:opacity-40"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="mb-4">
          <label className="mb-1 block text-[10px] uppercase tracking-wide text-neutral-400">
            Format
          </label>
          <div className="flex gap-2">
            {(["stl", "3mf"] as ImportFormat[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFormat(f)}
                disabled={phase === "uploading"}
                className={[
                  "rounded-md border px-3 py-1.5 text-sm uppercase tracking-wide",
                  format === f
                    ? "border-blue-500 bg-blue-600/20 text-blue-200"
                    : "border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-neutral-700",
                ].join(" ")}
                aria-pressed={format === f}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label
            htmlFor="import-file"
            className="mb-1 block text-[10px] uppercase tracking-wide text-neutral-400"
          >
            File
          </label>
          <div className="flex items-center gap-2">
            <label
              htmlFor="import-file"
              className={[
                "flex flex-1 cursor-pointer items-center gap-2 rounded-md border border-dashed px-3 py-4 text-sm",
                phase === "uploading"
                  ? "cursor-not-allowed border-neutral-800 text-neutral-500"
                  : "border-neutral-700 text-neutral-300 hover:border-blue-500 hover:text-blue-300",
              ].join(" ")}
            >
              <FileUp className="h-4 w-4" aria-hidden />
              <span className="truncate">
                {file ? file.name : `Choose a .${format.toUpperCase()} file`}
              </span>
            </label>
            <input
              id="import-file"
              type="file"
              accept=".stl,.3mf,model/stl,model/3mf"
              disabled={phase === "uploading"}
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />
          </div>
          {file && (
            <div className="mt-1 text-[11px] text-neutral-500">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </div>
          )}
        </div>

        {phase === "uploading" && (
          <div className="mb-4" role="status" aria-live="polite">
            <div className="mb-1 flex items-center justify-between text-xs text-neutral-400">
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                Uploading…
              </span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div
              className="h-1.5 overflow-hidden rounded bg-neutral-800"
              role="progressbar"
              aria-valuenow={Math.round(progress)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full bg-blue-500 transition-[width]"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {phase === "done" && (
          <div
            className="mb-4 flex items-center gap-2 rounded border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200"
            role="status"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            Import complete.
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-2 rounded border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span className="break-all">{error}</span>
          </div>
        )}

        <footer className="flex items-center justify-end gap-2">
          {phase === "uploading" ? (
            <button
              type="button"
              onClick={() => controllerRef.current?.abort()}
              className="rounded-md border border-neutral-700 px-3 py-1.5 text-sm text-neutral-200 hover:bg-neutral-800"
            >
              Cancel
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-neutral-800 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-800"
            >
              Close
            </button>
          )}
          <button
            type="button"
            onClick={() => void upload()}
            disabled={!file || phase === "uploading" || phase === "done"}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-neutral-700"
          >
            Import
          </button>
        </footer>
      </div>
    </div>
  );
}

export default ImportDialog;
