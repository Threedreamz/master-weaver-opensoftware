"use client";

import { useSlicerStore } from "../../stores/slicer-store";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatPrintTime(seconds: number): string {
  if (seconds <= 0) return "0s";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);

  if (d > 0) {
    const parts: string[] = [`${d}d`];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    return parts.join(" ");
  }
  if (h > 0) {
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  if (m > 0) {
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  }
  return `${s}s`;
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded bg-[var(--badge-bg)] px-1.5 py-0.5 text-[10px] text-[var(--badge-text)] font-mono">
      {children}
    </span>
  );
}

export function StatusBar() {
  const { models, selectedModelId, gcodeMode, currentLayer, totalLayers, gcodeMetadata } = useSlicerStore();
  const selectedModel = models.find((m) => m.id === selectedModelId);

  return (
    <div className="flex h-8 shrink-0 items-center justify-between border-t border-[var(--border)] bg-[var(--bg-secondary)] px-3 text-xs text-[var(--text-secondary)]">
      {/* Left side: model or gcode info */}
      <div className="flex items-center gap-3">
        {gcodeMode ? (
          <>
            <span className="text-amber-400 font-medium">G-Code View</span>
            <Badge>
              Layer {currentLayer} / {Math.max(totalLayers - 1, 0)}
            </Badge>
            {gcodeMetadata?.estimatedTime != null && (
              <Badge>{formatPrintTime(gcodeMetadata.estimatedTime)}</Badge>
            )}
            {gcodeMetadata?.filamentUsedGrams != null && (
              <Badge>{gcodeMetadata.filamentUsedGrams.toFixed(1)}g</Badge>
            )}
          </>
        ) : selectedModel ? (
          <>
            <span className="text-[var(--text-primary)] font-medium">{selectedModel.filename}</span>
            {selectedModel.triangleCount != null && (
              <Badge>
                <svg className="h-2.5 w-2.5" viewBox="0 0 12 12" fill="currentColor"><path d="M6 1L11 10H1L6 1z" /></svg>
                {selectedModel.triangleCount.toLocaleString()}
              </Badge>
            )}
            {selectedModel.volumeCm3 != null && (
              <Badge>{selectedModel.volumeCm3.toFixed(1)} cm3</Badge>
            )}
            {selectedModel.boundingBox && (
              <Badge>
                {selectedModel.boundingBox.x.toFixed(1)} x{" "}
                {selectedModel.boundingBox.y.toFixed(1)} x{" "}
                {selectedModel.boundingBox.z.toFixed(1)} mm
              </Badge>
            )}
            <span className="text-[var(--text-muted)]">{formatBytes(selectedModel.fileSizeBytes)}</span>
          </>
        ) : (
          <span className="text-[var(--text-muted)]">
            {models.length === 0
              ? "No models loaded"
              : `${models.length} model${models.length !== 1 ? "s" : ""} loaded`}
          </span>
        )}
      </div>

      {/* Right side: branding */}
      <div className="flex items-center gap-3">
        <span className="text-[var(--text-muted)]">{models.length} model{models.length !== 1 ? "s" : ""}</span>
        <span className="font-semibold text-[var(--text-primary)] tracking-wide">OpenSlicer</span>
      </div>
    </div>
  );
}
