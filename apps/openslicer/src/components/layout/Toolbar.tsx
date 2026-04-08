"use client";

import {
  Upload,
  Settings,
  Compass,
  Loader2,
  Check,
  Copy,
  FlipHorizontal2,
  LayoutGrid,
  Download,
  FolderOpen,
  Sun,
  Moon,
  Monitor,
  MousePointer,
  Move,
  RotateCcw,
  Maximize2,
  Ruler,
  Sparkles,
  Paintbrush,
  Scissors,
  Undo2,
  Redo2,
} from "lucide-react";
import { useRef, useState, useCallback } from "react";
import { useSlicerStore } from "../../stores/slicer-store";
import { useThemeStore, type Theme } from "../../stores/theme-store";
import type { ToolMode } from "../../stores/slicer-store";

interface ToolbarProps {
  onFileUpload: (files: FileList) => void;
}

function ToolbarButton({
  active,
  onClick,
  title,
  disabled,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  title: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all ${
        disabled
          ? "text-[var(--text-muted)] cursor-not-allowed opacity-40"
          : active
            ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/30"
            : "text-[var(--text-secondary)] hover:bg-[var(--bg-panel-hover)] hover:text-[var(--text-primary)]"
      }`}
    >
      {children}
    </button>
  );
}

function Separator() {
  return <div className="mx-1.5 h-6 w-px bg-[var(--border)]" />;
}

const themeOrder: Theme[] = ["dark", "light", "system"];
const themeLabels: Record<Theme, string> = {
  dark: "Dark",
  light: "Light",
  system: "System",
};

function ThemeToggle() {
  const theme = useThemeStore((s) => s.theme);
  const resolvedTheme = useThemeStore((s) => s.resolvedTheme);
  const setTheme = useThemeStore((s) => s.setTheme);

  const cycleTheme = () => {
    const idx = themeOrder.indexOf(theme);
    const next = themeOrder[(idx + 1) % themeOrder.length];
    setTheme(next);
  };

  const Icon = theme === "system" ? Monitor : resolvedTheme === "dark" ? Moon : Sun;

  return (
    <button
      onClick={cycleTheme}
      title={`Theme: ${themeLabels[theme]}. Click to cycle.`}
      className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-panel-hover)] hover:text-[var(--text-primary)] transition-all"
    >
      <Icon size={20} />
    </button>
  );
}

/** Segmented button group — connected buttons with shared background */
function SegmentedGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center rounded-lg bg-[var(--bg-panel)] ring-1 ring-[var(--border)] overflow-hidden">
      {children}
    </div>
  );
}

function SegmentedButton({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex h-8 w-8 items-center justify-center border-r border-[var(--border)] last:border-r-0 transition-all ${
        active
          ? "bg-indigo-600 text-white"
          : "text-[var(--text-secondary)] hover:bg-[var(--bg-panel-hover)] hover:text-[var(--text-primary)]"
      }`}
    >
      {children}
    </button>
  );
}

interface TransformTool {
  mode: ToolMode;
  icon: React.ReactNode;
  title: string;
}

const transformTools: TransformTool[] = [
  { mode: "select", icon: <MousePointer size={16} />, title: "Select (V)" },
  { mode: "move", icon: <Move size={16} />, title: "Move (M)" },
  { mode: "rotate", icon: <RotateCcw size={16} />, title: "Rotate (R)" },
  { mode: "scale", icon: <Maximize2 size={16} />, title: "Scale (S)" },
];

const utilityTools: TransformTool[] = [
  { mode: "cut", icon: <Scissors size={16} />, title: "Cut (C)" },
  { mode: "measure", icon: <Ruler size={16} />, title: "Measure" },
  { mode: "faceSelect", icon: <Sparkles size={16} />, title: "Place on Face" },
  { mode: "paint", icon: <Paintbrush size={16} />, title: "Paint" },
];

export function Toolbar({ onFileUpload }: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const projectInputRef = useRef<HTMLInputElement>(null);
  const {
    gcodeMode,
    selectedModelId,
    updateModelRotation,
    duplicateModel,
    mirrorModel,
    arrangeModels,
    models,
    plates,
    activePlateId,
    selectedPrinterProfileId,
    selectedFilamentProfileId,
    selectedProcessProfileId,
    perObjectSettings,
    sliceOverrides,
    addModel,
    setSliceOverrides,
    selectPrinterProfile,
    selectFilamentProfile,
    selectProcessProfile,
    toolMode,
    setToolMode,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useSlicerStore();
  const [autoOrientState, setAutoOrientState] = useState<"idle" | "loading" | "done">("idle");
  const [saveState, setSaveState] = useState<"idle" | "saving">("idle");
  const [loadState, setLoadState] = useState<"idle" | "loading">("idle");

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileUpload(e.target.files);
      e.target.value = "";
    }
  };

  const handleAutoOrient = useCallback(async () => {
    if (!selectedModelId || autoOrientState === "loading") return;
    setAutoOrientState("loading");
    try {
      const res = await fetch(`/api/models/${selectedModelId}/auto-orient`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error(`Auto-orient failed: ${res.status}`);
      const data = await res.json();
      updateModelRotation(selectedModelId, data.rotation);
      setAutoOrientState("done");
      setTimeout(() => setAutoOrientState("idle"), 1500);
    } catch (err) {
      console.error("Auto-orient error:", err);
      setAutoOrientState("idle");
    }
  }, [selectedModelId, autoOrientState, updateModelRotation]);

  const handleSaveProject = useCallback(async () => {
    if (models.length === 0 || saveState === "saving") return;
    setSaveState("saving");
    try {
      const activePlate = plates.find((p) => p.id === activePlateId);
      const body = {
        models: models.map((m) => ({
          id: m.id,
          name: m.name,
          position: m.position,
          rotation: m.rotation,
          scale: m.scale,
          plateId: activePlate?.modelIds.includes(m.id) ? activePlateId : undefined,
        })),
        plates,
        profiles: {
          selectedPrinterProfileId,
          selectedFilamentProfileId,
          selectedProcessProfileId,
        },
        perObjectSettings,
        sliceOverrides,
      };
      const res = await fetch("/api/projects/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Save failed: ${res.status}`);
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const filenameMatch = disposition.match(/filename="([^"]+)"/);
      const filename = filenameMatch ? filenameMatch[1] : "project.3mf";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Project save error:", err);
    } finally {
      setSaveState("idle");
    }
  }, [models, plates, activePlateId, selectedPrinterProfileId, selectedFilamentProfileId, selectedProcessProfileId, perObjectSettings, sliceOverrides, saveState]);

  const handleLoadProject = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || loadState === "loading") return;
    e.target.value = "";
    setLoadState("loading");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/projects/load", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error(`Load failed: ${res.status}`);
      const data = await res.json();

      // Add loaded models to scene
      for (const m of data.models) {
        addModel({
          id: m.id,
          name: m.name,
          filename: m.filename,
          url: `/api/models/${m.id}/file`,
          fileFormat: m.fileFormat,
          fileSizeBytes: m.fileSizeBytes,
          triangleCount: m.triangleCount,
          boundingBox: m.boundingBox,
          meshAnalyzed: m.meshAnalyzed,
          position: m.position,
          rotation: m.rotation,
          scale: m.scale,
        });
      }

      // Restore profile selections
      if (data.settings?.profiles) {
        const { selectedPrinterProfileId: pp, selectedFilamentProfileId: fp, selectedProcessProfileId: prp } = data.settings.profiles;
        if (pp) selectPrinterProfile(pp);
        if (fp) selectFilamentProfile(fp);
        if (prp) selectProcessProfile(prp);
      }

      // Restore slice overrides
      if (data.settings?.sliceOverrides) {
        setSliceOverrides(data.settings.sliceOverrides);
      }
    } catch (err) {
      console.error("Project load error:", err);
    } finally {
      setLoadState("idle");
    }
  }, [loadState, addModel, selectPrinterProfile, selectFilamentProfile, selectProcessProfile, setSliceOverrides]);

  const handleToolClick = (mode: ToolMode) => {
    setToolMode(toolMode === mode ? "select" : mode);
  };

  return (
    <div className="flex h-11 shrink-0 items-center border-b border-[var(--border)] bg-[var(--bg-secondary)] px-2 gap-1">
      {/* Upload button */}
      <button
        onClick={handleUploadClick}
        className="flex h-8 items-center gap-1.5 rounded-md bg-indigo-600 px-3 text-xs font-medium text-white hover:bg-indigo-500 transition-colors shadow-sm"
      >
        <Upload size={14} />
        Add
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".stl,.3mf,.obj,.step"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      <Separator />

      {/* Transform tools — segmented group */}
      {!gcodeMode && (
        <>
          <SegmentedGroup>
            {transformTools.map((tool) => (
              <SegmentedButton
                key={tool.mode}
                active={toolMode === tool.mode}
                onClick={() => handleToolClick(tool.mode)}
                title={tool.title}
              >
                {tool.icon}
              </SegmentedButton>
            ))}
          </SegmentedGroup>

          <Separator />

          {/* Utility tools — segmented group */}
          <SegmentedGroup>
            {utilityTools.map((tool) => (
              <SegmentedButton
                key={tool.mode}
                active={toolMode === tool.mode}
                onClick={() => handleToolClick(tool.mode)}
                title={tool.title}
              >
                {tool.icon}
              </SegmentedButton>
            ))}
          </SegmentedGroup>

          <Separator />

          {/* Actions: Auto Orient, Arrange, Duplicate, Mirror */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={handleAutoOrient}
              disabled={!selectedModelId || autoOrientState === "loading"}
              title="Auto Orient"
              className={`flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium transition-all ${
                autoOrientState === "done"
                  ? "bg-green-600 text-white"
                  : autoOrientState === "loading"
                    ? "bg-[var(--bg-panel-hover)] text-[var(--text-secondary)] cursor-wait"
                    : !selectedModelId
                      ? "text-[var(--text-muted)] cursor-not-allowed opacity-40"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-panel-hover)] hover:text-[var(--text-primary)]"
              }`}
            >
              {autoOrientState === "loading" ? (
                <Loader2 size={14} className="animate-spin" />
              ) : autoOrientState === "done" ? (
                <Check size={14} />
              ) : (
                <Compass size={14} />
              )}
              <span className="hidden lg:inline">
                {autoOrientState === "loading" ? "Orienting..." : autoOrientState === "done" ? "Oriented" : "Auto Orient"}
              </span>
            </button>

            <ToolbarButton
              title="Auto-arrange models on plate"
              onClick={arrangeModels}
            >
              <LayoutGrid size={18} />
            </ToolbarButton>

            <ToolbarButton
              title="Duplicate selected model"
              onClick={() => selectedModelId && duplicateModel(selectedModelId)}
              disabled={!selectedModelId}
            >
              <Copy size={18} />
            </ToolbarButton>

            {/* Mirror dropdown */}
            <div className="group relative">
              <ToolbarButton title="Mirror model" disabled={!selectedModelId}>
                <FlipHorizontal2 size={18} />
              </ToolbarButton>
              {selectedModelId && (
                <div className="absolute left-0 top-full z-50 hidden min-w-[100px] rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] py-1 shadow-lg group-hover:block">
                  {(["x", "y", "z"] as const).map((axis) => (
                    <button
                      key={axis}
                      onClick={() =>
                        selectedModelId && mirrorModel(selectedModelId, axis)
                      }
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-panel-hover)]"
                    >
                      <span className={axis === "x" ? "text-red-400" : axis === "y" ? "text-green-400" : "text-blue-400"}>
                        {axis.toUpperCase()}
                      </span>
                      Mirror {axis.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side: Undo/Redo | Save/Open | Theme/Settings */}
      <div className="flex items-center gap-0.5">
        <ToolbarButton title="Undo (Ctrl+Z)" onClick={undo} disabled={!canUndo}>
          <Undo2 size={18} />
        </ToolbarButton>
        <ToolbarButton title="Redo (Ctrl+Shift+Z)" onClick={redo} disabled={!canRedo}>
          <Redo2 size={18} />
        </ToolbarButton>

        <Separator />

        <button
          onClick={handleSaveProject}
          disabled={models.length === 0 || saveState === "saving"}
          title="Save Project as .3mf"
          className={`flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors ${
            models.length === 0
              ? "text-[var(--text-muted)] cursor-not-allowed"
              : saveState === "saving"
                ? "bg-[var(--bg-panel-hover)] text-[var(--text-secondary)] cursor-wait"
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-panel-hover)] hover:text-[var(--text-primary)]"
          }`}
        >
          {saveState === "saving" ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Download size={14} />
          )}
          <span className="hidden sm:inline">Save</span>
        </button>

        <button
          onClick={() => projectInputRef.current?.click()}
          disabled={loadState === "loading"}
          title="Open Project (.3mf)"
          className={`flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors ${
            loadState === "loading"
              ? "bg-[var(--bg-panel-hover)] text-[var(--text-secondary)] cursor-wait"
              : "text-[var(--text-secondary)] hover:bg-[var(--bg-panel-hover)] hover:text-[var(--text-primary)]"
          }`}
        >
          {loadState === "loading" ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <FolderOpen size={14} />
          )}
          <span className="hidden sm:inline">Open</span>
        </button>
        <input
          ref={projectInputRef}
          type="file"
          accept=".3mf"
          onChange={handleLoadProject}
          className="hidden"
        />

        <Separator />

        <ThemeToggle />
        <ToolbarButton title="Settings">
          <Settings size={20} />
        </ToolbarButton>
      </div>
    </div>
  );
}
