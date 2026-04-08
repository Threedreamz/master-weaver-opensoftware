"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Play, Loader2, Server } from "lucide-react";
import { Toolbar } from "./Toolbar";
import { StatusBar } from "./StatusBar";
import { PlateTabBar } from "./PlateTabBar";
import { PanelContainer } from "./PanelContainer";
import { ModelViewer } from "../viewer/ModelViewer";
import { ModelWithTransform } from "../viewer/ModelWithTransform";
import { MeasureTool } from "../viewer/MeasureTool";
import { CutTool } from "../viewer/CutTool";
import { BuildPlate } from "../viewer/BuildPlate";
import { OverhangOverlay } from "../viewer/OverhangOverlay";
import { ArcPathPreview } from "../viewer/ArcPathPreview";
import { FaceSelector } from "../viewer/FaceSelector";
import { PaintTool } from "../viewer/PaintTool";
import { AutoOrient } from "../viewer/AutoOrient";
import { OverhangPanel } from "../panels/OverhangPanel";
import { PaintToolbar } from "../panels/PaintToolbar";
import { ObjectTree } from "../panels/ObjectTree";
import { SlicePanel } from "../panels/SlicePanel";
import { TransformPanel } from "../panels/TransformPanel";
import { GcodeViewer } from "../gcode/GcodeViewer";
import { LayerSlider } from "../gcode/LayerSlider";
import { GcodeStats } from "../gcode/GcodeStats";
import { GcodeControls } from "../gcode/GcodeControls";
import { useSlicerStore } from "../../stores/slicer-store";
import { useToastStore } from "../../stores/toast-store";
import { ToastContainer } from "../ui/Toast";
import { ContextMenu } from "../ui/ContextMenu";
import { CameraPresetController } from "../viewer/CameraPresets";
import { ViewCube } from "../viewer/ViewCube";
import { ViewToggles } from "../viewer/ViewToggles";
import { useKeyboardShortcuts } from "../../hooks/use-keyboard-shortcuts";

export function SlicerLayout() {
  const store = useSlicerStore();
  const addToast = useToastStore((s) => s.addToast);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Mount global keyboard shortcuts
  useKeyboardShortcuts();

  // Load models + profiles from DB on mount
  useEffect(() => {
    const { addModel, setProfiles } = store;
    fetch("/api/models")
      .then((r) => r.json())
      .then((models) => {
        if (Array.isArray(models)) {
          for (const m of models) {
            addModel({
              id: m.id,
              name: m.name,
              filename: m.filename,
              url: `/api/models/${m.id}/file`,
              fileFormat: m.fileFormat || "stl",
              fileSizeBytes: m.fileSizeBytes || 0,
              triangleCount: m.triangleCount,
              boundingBox: m.boundingBoxX
                ? { x: m.boundingBoxX, y: m.boundingBoxY, z: m.boundingBoxZ }
                : undefined,
              volumeCm3: m.volumeCm3,
              surfaceAreaCm2: m.surfaceAreaCm2,
              isManifold: m.isManifold === 1,
              meshAnalyzed: m.meshAnalyzed === 1,
            });
          }
        }
      })
      .catch(() => {});
    fetch("/api/profiles")
      .then((r) => r.json())
      .then((profiles) => {
        if (Array.isArray(profiles)) {
          setProfiles(
            profiles.map((p: Record<string, unknown>) => ({
              id: p.id as string,
              name: p.name as string,
              technology: p.technology as "fdm" | "sla" | "sls",
              slicerEngine: p.slicerEngine as string,
              layerHeight: p.layerHeight as number | undefined,
              infillDensity: p.infillDensity as number | undefined,
              supportEnabled: p.supportEnabled === 1,
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  const {
    models,
    selectedModelId,
    selectModel,
    addModel,
    leftPanelOpen,
    rightPanelOpen,
    toggleLeftPanel,
    toggleRightPanel,
    overhangResult,
    showOverhangOverlay,
    showArcPaths,
    toolMode,
    faceSelectionEnabled,
    selectedFace,
    setSelectedFace,
    updateModelPosition,
    updateModelRotation,
    updateModelScale,
    gcodeMode,
    gcodeData,
    gcodeMetadata,
    currentLayer,
    totalLayers,
    gcodeColorMode,
    gcodeVisibility,
    showRetractions,
    setCurrentLayer,
    setGcodeMode,
    plates,
    activePlateId,
    printerProfiles,
    selectedPrinterProfileId,
    paintMode,
    rightPanelTab,
    setRightPanelTab,
  } = store;

  // Get the active plate and filter models to only those on it
  const activePlate = plates.find((p) => p.id === activePlateId);
  const activePlateModelIds = useMemo(
    () => new Set(activePlate?.modelIds ?? []),
    [activePlate]
  );
  const plateModels = useMemo(
    () => models.filter((m) => activePlateModelIds.has(m.id)),
    [models, activePlateModelIds]
  );

  // Get printer bed dimensions (fall back to defaults)
  const selectedPrinter = printerProfiles.find(
    (p) => p.id === selectedPrinterProfileId
  );
  const bedWidth = selectedPrinter?.bedSizeX ?? 250;
  const bedDepth = selectedPrinter?.bedSizeY ?? 210;
  const bedHeight = selectedPrinter?.bedSizeZ ?? 210;

  const handleFileUpload = useCallback(
    async (files: FileList) => {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);

        try {
          const res = await fetch("/api/models/upload", {
            method: "POST",
            body: formData,
          });
          if (!res.ok) {
            console.error("Upload failed:", await res.text());
            continue;
          }
          const data = await res.json();
          addModel({
            id: data.id,
            name: data.name,
            filename: data.filename,
            url: `/api/models/${data.id}/file`,
            fileFormat: data.fileFormat || "stl",
            fileSizeBytes: data.fileSizeBytes || file.size,
            triangleCount: data.triangleCount,
            boundingBox: data.boundingBox,
            volumeCm3: data.volumeCm3,
            surfaceAreaCm2: data.surfaceAreaCm2,
            isManifold: data.isManifold,
            meshAnalyzed: data.meshAnalyzed ?? false,
          });
        } catch (err) {
          console.error("Upload error:", err);
        }
      }
    },
    [addModel]
  );

  // --- Drag-and-drop handlers ---
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only leave if we actually left the viewport (not entering a child)
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (!files || files.length === 0) return;

      // Filter for supported formats
      const supported = [".stl", ".3mf", ".obj", ".step", ".stp"];
      const validFiles: File[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
        if (supported.includes(ext)) {
          validFiles.push(file);
        } else {
          addToast({ message: `Unsupported format: ${file.name}`, type: "error" });
        }
      }

      if (validFiles.length === 0) return;

      for (const file of validFiles) {
        const formData = new FormData();
        formData.append("file", file);
        try {
          const res = await fetch("/api/models/upload", {
            method: "POST",
            body: formData,
          });
          if (!res.ok) {
            addToast({ message: `Upload failed: ${file.name}`, type: "error" });
            continue;
          }
          const data = await res.json();
          addModel({
            id: data.id,
            name: data.name,
            filename: data.filename,
            url: `/api/models/${data.id}/file`,
            fileFormat: data.fileFormat || "stl",
            fileSizeBytes: data.fileSizeBytes || file.size,
            triangleCount: data.triangleCount,
            boundingBox: data.boundingBox,
            volumeCm3: data.volumeCm3,
            surfaceAreaCm2: data.surfaceAreaCm2,
            isManifold: data.isManifold,
            meshAnalyzed: data.meshAnalyzed ?? false,
          });
          addToast({ message: `Loaded ${file.name}`, type: "success" });
        } catch {
          addToast({ message: `Upload error: ${file.name}`, type: "error" });
        }
      }
    },
    [addModel, addToast]
  );

  const selectedModel = models.find((m) => m.id === selectedModelId);

  // --- Slice button (rendered as sticky footer in right panel) ---
  const sliceFooter = (
    <SliceButton />
  );

  // --- Right panel tab headers ---
  const rightPanelTabs = (
    <div className="flex h-10 w-full items-stretch">
      {(["global", "objects", "project"] as const).map((tab) => (
        <button
          key={tab}
          onClick={() => setRightPanelTab(tab)}
          className={`flex flex-1 items-center justify-center text-[11px] font-semibold uppercase tracking-widest transition-colors ${
            rightPanelTab === tab
              ? "border-b-2 border-indigo-500 text-zinc-200"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex h-screen w-screen flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Top toolbar */}
      <Toolbar onFileUpload={handleFileUpload} />

      {/* Main content: left panel | viewport | right panel */}
      <div className="flex min-h-0 flex-1">
        {/* Left panel: models list */}
        <PanelContainer
          title="Models"
          side="left"
          isOpen={leftPanelOpen}
          onToggle={toggleLeftPanel}
        >
          <div className="p-2">
            {/* Active plate header */}
            {activePlate && (
              <p className="mb-1.5 px-2 text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                {activePlate.name}
              </p>
            )}
            <ObjectTree />

            {/* OpenFarm link */}
            <a
              href="/de/openfarm"
              className="mt-3 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-medium text-zinc-500 hover:bg-[var(--bg-panel-hover)] hover:text-zinc-300 transition-colors"
            >
              <Server size={13} />
              OpenFarm
            </a>
          </div>
        </PanelContainer>

        {/* 3D Viewport — clean, no overlay tool buttons */}
        <div
          ref={viewportRef}
          className={`relative min-w-0 flex-1 bg-[#e5e5e5] ${isDragging ? "ring-2 ring-inset ring-blue-500" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Drag-drop overlay */}
          {isDragging && (
            <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-blue-500/20 backdrop-blur-[1px]">
              <div className="rounded-xl border-2 border-dashed border-blue-400 bg-blue-900/60 px-8 py-6">
                <p className="text-lg font-semibold text-white">Drop STL / 3MF / OBJ files here</p>
              </div>
            </div>
          )}

          <ModelViewer>
            <BuildPlate width={bedWidth} depth={bedDepth} height={bedHeight} />

            {/* Model view (hidden when in gcode mode) — only models on active plate */}
            {!gcodeMode && (
              <>
                {plateModels.map((model) => (
                  <Suspense key={model.id} fallback={null}>
                    <ModelWithTransform
                      model={model}
                      selected={model.id === selectedModelId}
                      toolMode={toolMode}
                      onSelect={() => selectModel(model.id)}
                      onTransformChange={(position, rotation, scale) => {
                        updateModelPosition(model.id, position);
                        updateModelRotation(model.id, rotation);
                        updateModelScale(model.id, scale);
                      }}
                    />
                    {toolMode === "faceSelect" && model.id === selectedModelId && (
                      <FaceSelector
                        url={model.url}
                        enabled={faceSelectionEnabled}
                        onFaceSelected={(faceIndex, normal) => {
                          setSelectedFace({
                            modelId: model.id,
                            faceIndex,
                            normal,
                          });
                        }}
                      />
                    )}
                  </Suspense>
                ))}

                {/* Paint tool overlay for selected model */}
                {toolMode === "paint" && paintMode && selectedModel && (
                  <Suspense fallback={null}>
                    <PaintTool url={selectedModel.url} modelId={selectedModel.id} />
                  </Suspense>
                )}

                {/* Measure tool */}
                <MeasureTool active={toolMode === "measure"} />

                {/* Cut tool */}
                <CutTool active={toolMode === "cut"} />

                {overhangResult && selectedModel && showOverhangOverlay && (
                  <Suspense fallback={null}>
                    <OverhangOverlay
                      url={selectedModel.url}
                      overhangResult={overhangResult}
                      visible={showOverhangOverlay}
                    />
                  </Suspense>
                )}
                {overhangResult && showArcPaths && (
                  <ArcPathPreview
                    arcPaths={overhangResult.arcPaths}
                    visible={showArcPaths}
                  />
                )}
              </>
            )}

            {/* G-code view */}
            {gcodeMode && gcodeData && (
              <GcodeViewer
                gcodeData={gcodeData}
                currentLayer={currentLayer}
                colorMode={gcodeColorMode}
                visibility={gcodeVisibility}
                showRetractions={showRetractions}
              />
            )}

            {/* Camera preset controller (inside Canvas) */}
            <CameraPresetController />
          </ModelViewer>

          {/* View toggle buttons (HTML overlay, top-left) */}
          {!gcodeMode && <ViewToggles />}

          {/* ViewCube (Fusion 360-style 3D cube overlay) */}
          {!gcodeMode && <ViewCube />}

          {/* Right-click context menu */}
          <ContextMenu containerRef={viewportRef} />

          {/* Plate number overlay (Bambu Studio style) */}
          {!gcodeMode && (
            <div className="pointer-events-none absolute bottom-4 right-4 z-10 select-none">
              <span className="text-5xl font-bold text-indigo-500/40 tabular-nums">
                {String(Math.max(plates.findIndex((p) => p.id === activePlateId), 0) + 1).padStart(2, "0")}
              </span>
            </div>
          )}

          {/* Face selection overlay (model mode only) */}
          {!gcodeMode && toolMode === "faceSelect" && selectedFace && <AutoOrient />}

          {/* Layer slider overlay (gcode mode only) */}
          {gcodeMode && gcodeData && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
              <LayerSlider
                currentLayer={currentLayer}
                totalLayers={totalLayers}
                onChange={setCurrentLayer}
              />
            </div>
          )}
        </div>

        {/* Right panel: Global / Objects / Project tabs */}
        <PanelContainer
          title=""
          side="right"
          isOpen={rightPanelOpen}
          onToggle={toggleRightPanel}
          width={300}
          headerSlot={rightPanelTabs}
          footerSlot={sliceFooter}
        >
          <div className="p-2 space-y-4">
            {rightPanelTab === "global" && (
              <>
                {/* Paint toolbar takes priority when paint mode is active */}
                {paintMode && <PaintToolbar />}

                {/* Slice panel: profile selectors + settings tabs */}
                <SlicePanel />

                {/* Overhang analysis */}
                <div className="space-y-2">
                  <h3 className="px-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Overhangs
                  </h3>
                  <OverhangPanel />
                </div>

                {/* G-code controls (when in preview mode) */}
                {gcodeMode && (
                  <>
                    {gcodeMetadata && (
                      <GcodeStats
                        estimatedTimeSeconds={gcodeMetadata.estimatedTime ?? 0}
                        materialUsageGrams={gcodeMetadata.filamentUsedGrams ?? 0}
                        layerCount={gcodeMetadata.layerCount ?? totalLayers}
                        filamentLengthMeters={gcodeMetadata.filamentUsedMeters ?? 0}
                      />
                    )}
                    <GcodeControls />
                    {gcodeData && (
                      <div className="rounded-md bg-zinc-800/50 p-2 text-xs text-zinc-400">
                        <p>Layer: {currentLayer + 1} / {totalLayers}</p>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {rightPanelTab === "objects" && (
              <>
                {/* Transform inputs for selected model */}
                <TransformPanel />

                {/* Per-object model analysis */}
                {selectedModel && selectedModel.meshAnalyzed && (
                  <div className="space-y-2">
                    <h3 className="px-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Analysis
                    </h3>
                    <div className="space-y-1 rounded-md bg-zinc-800/50 p-2 text-xs text-zinc-400">
                      {selectedModel.triangleCount != null && (
                        <p>Triangles: {selectedModel.triangleCount.toLocaleString()}</p>
                      )}
                      {selectedModel.volumeCm3 != null && (
                        <p>Volume: {selectedModel.volumeCm3.toFixed(2)} cm3</p>
                      )}
                      {selectedModel.surfaceAreaCm2 != null && (
                        <p>Surface: {selectedModel.surfaceAreaCm2.toFixed(2)} cm2</p>
                      )}
                      {selectedModel.isManifold != null && (
                        <p>
                          Manifold:{" "}
                          <span
                            className={
                              selectedModel.isManifold
                                ? "text-green-400"
                                : "text-red-400"
                            }
                          >
                            {selectedModel.isManifold ? "Yes" : "No"}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Placeholder for per-object settings */}
                {selectedModel && (
                  <div className="space-y-2">
                    <h3 className="px-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Per-Object Settings
                    </h3>
                    <p className="px-1 text-[11px] text-zinc-500">
                      Right-click a model in the object list to set per-object overrides.
                    </p>
                  </div>
                )}

                {!selectedModel && (
                  <div className="flex items-center justify-center py-12 text-xs text-zinc-500">
                    Select a model to see object settings
                  </div>
                )}
              </>
            )}

            {rightPanelTab === "project" && (
              <>
                {/* Project summary */}
                <div className="space-y-2">
                  <h3 className="px-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Project Info
                  </h3>
                  <div className="space-y-1 rounded-md bg-zinc-800/50 p-3 text-xs text-zinc-400">
                    <div className="flex justify-between">
                      <span>Plates</span>
                      <span className="text-zinc-200 font-mono">{plates.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Models</span>
                      <span className="text-zinc-200 font-mono">{models.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Active Plate</span>
                      <span className="text-zinc-200">{activePlate?.name ?? "-"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Models on Plate</span>
                      <span className="text-zinc-200 font-mono">{activePlate?.modelIds.length ?? 0}</span>
                    </div>
                  </div>
                </div>

                {/* Plate overview */}
                <div className="space-y-2">
                  <h3 className="px-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Plate Overview
                  </h3>
                  <div className="space-y-1.5">
                    {plates.map((plate, idx) => (
                      <div
                        key={plate.id}
                        className={`rounded-md p-2 text-xs ${
                          plate.id === activePlateId
                            ? "bg-indigo-600/20 ring-1 ring-indigo-500/30 text-zinc-200"
                            : "bg-zinc-800/50 text-zinc-400"
                        }`}
                      >
                        <div className="flex justify-between">
                          <span className="font-medium">{plate.name}</span>
                          <span className="font-mono">{plate.modelIds.length} model{plate.modelIds.length !== 1 ? "s" : ""}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Print summary (if sliced) */}
                {gcodeMetadata && (
                  <div className="space-y-2">
                    <h3 className="px-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Print Summary
                    </h3>
                    <div className="space-y-1 rounded-md bg-zinc-800/50 p-3 text-xs text-zinc-400">
                      {gcodeMetadata.estimatedTime != null && (
                        <div className="flex justify-between">
                          <span>Estimated Time</span>
                          <span className="text-zinc-200 font-mono">
                            {(() => {
                              const s = gcodeMetadata.estimatedTime!;
                              const h = Math.floor(s / 3600);
                              const m = Math.floor((s % 3600) / 60);
                              return h > 0 ? `${h}h ${m}m` : `${m}m`;
                            })()}
                          </span>
                        </div>
                      )}
                      {gcodeMetadata.filamentUsedGrams != null && (
                        <div className="flex justify-between">
                          <span>Filament Weight</span>
                          <span className="text-zinc-200 font-mono">{gcodeMetadata.filamentUsedGrams.toFixed(1)}g</span>
                        </div>
                      )}
                      {gcodeMetadata.filamentUsedMeters != null && (
                        <div className="flex justify-between">
                          <span>Filament Length</span>
                          <span className="text-zinc-200 font-mono">{gcodeMetadata.filamentUsedMeters.toFixed(2)}m</span>
                        </div>
                      )}
                      {gcodeMetadata.layerCount != null && (
                        <div className="flex justify-between">
                          <span>Layers</span>
                          <span className="text-zinc-200 font-mono">{gcodeMetadata.layerCount.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </PanelContainer>
      </div>

      {/* Build plate tabs + view toggle */}
      <PlateTabBar />

      {/* Bottom status bar */}
      <StatusBar />

      {/* Toast notifications */}
      <ToastContainer />
    </div>
  );
}

/**
 * Sticky SLICE button — always visible at the bottom of the right panel.
 * Reads slice state from the store directly.
 */
function SliceButton() {
  const {
    selectedModelId,
    selectedProcessProfileId,
    selectedPrinterProfileId,
    selectedFilamentProfileId,
    sliceOverrides,
    setGcodeData,
    setGcodeMetadata,
    setGcodeMode,
  } = useSlicerStore();

  const [status, setStatus] = useState<"idle" | "slicing">("idle");

  const canSlice = !!selectedModelId && !!selectedProcessProfileId && status !== "slicing";

  const handleSlice = useCallback(async () => {
    if (!selectedModelId || !selectedProcessProfileId) return;
    setStatus("slicing");
    try {
      const res = await fetch("/api/slice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelId: selectedModelId,
          profileId: selectedProcessProfileId,
          printerProfileId: selectedPrinterProfileId,
          filamentProfileId: selectedFilamentProfileId,
          processProfileId: selectedProcessProfileId,
          overrides: sliceOverrides,
        }),
      });
      if (!res.ok) throw new Error("Slice request failed");
      const data = await res.json();

      if (data.gcodeId) {
        // Auto-load gcode view after successful slice
        const parseRes = await fetch(`/api/gcode/${data.gcodeId}/parse`);
        if (parseRes.ok) {
          const parseData = await parseRes.json();
          setGcodeData(parseData.toolpath);
          setGcodeMetadata(parseData.metadata);
        }
      }
    } catch (err) {
      console.error("Slice error:", err);
    } finally {
      setStatus("idle");
    }
  }, [selectedModelId, selectedPrinterProfileId, selectedFilamentProfileId, selectedProcessProfileId, sliceOverrides, setGcodeData, setGcodeMetadata, setGcodeMode]);

  return (
    <div className="p-2">
      <button
        type="button"
        onClick={handleSlice}
        disabled={!canSlice}
        className="relative flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-base font-bold tracking-wide hover:from-indigo-500 hover:to-blue-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-indigo-500/20 overflow-hidden"
      >
        {status === "slicing" ? (
          <>
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-400/30 to-blue-400/30 animate-pulse" />
            <Loader2 size={18} className="animate-spin relative z-10" />
            <span className="relative z-10">Slicing...</span>
          </>
        ) : (
          <>
            <Play size={18} fill="currentColor" />
            SLICE
          </>
        )}
      </button>
    </div>
  );
}
