"use client";

import { useEffect, useMemo } from "react";
import { useWorkbenchStore, useSelectedFeature } from "@/stores/workbench-store";
import { FeatureTree, type FeatureTreeNode } from "@/components/workbench/FeatureTree";
import { Viewport, type ViewportFeature } from "@/components/workbench/Viewport";
import { SketchOverlay, type SketchEntity as OverlaySketchEntity, type SketchConstraint as OverlaySketchConstraint } from "@/components/workbench/SketchOverlay";
import { PropertiesPanel, type PropertiesFeature } from "@/components/workbench/PropertiesPanel";
import { Toolbar, type ToolbarAction } from "@/components/workbench/Toolbar";
import { TimelineScrubber } from "@/components/workbench/TimelineScrubber";

interface WorkbenchProps {
  projectId: string;
}

export function Workbench({ projectId }: WorkbenchProps) {
  const loadProject = useWorkbenchStore((s) => s.loadProject);
  const loading = useWorkbenchStore((s) => s.loading);
  const error = useWorkbenchStore((s) => s.error);
  const currentProjectId = useWorkbenchStore((s) => s.projectId);
  const features = useWorkbenchStore((s) => s.features);
  const activeSketch = useWorkbenchStore((s) => s.activeSketch);
  const selectedFeatureId = useWorkbenchStore((s) => s.selectedFeatureId);
  const selectFeature = useWorkbenchStore((s) => s.selectFeature);
  const selected = useSelectedFeature();

  useEffect(() => {
    if (projectId && projectId !== currentProjectId) {
      loadProject(projectId);
    }
  }, [projectId, currentProjectId, loadProject]);

  const treeFeatures: FeatureTreeNode[] = useMemo(
    () => features.map((f) => ({ id: f.id, kind: f.kind })),
    [features],
  );

  const viewportFeatures: ViewportFeature[] = useMemo(
    () =>
      features
        .filter((f) => f.positions)
        .map((f) => ({
          id: f.id,
          positions: f.positions as Float32Array,
          indices: f.indices,
          bbox: f.bbox
            ? {
                min: { x: f.bbox.min.x, y: f.bbox.min.y, z: f.bbox.min.z },
                max: { x: f.bbox.max.x, y: f.bbox.max.y, z: f.bbox.max.z },
              }
            : undefined,
        })),
    [features],
  );

  const propertiesFeature: PropertiesFeature | null = useMemo(
    () =>
      selected
        ? { id: selected.id, kind: selected.kind, params: selected.paramsJson }
        : null,
    [selected],
  );

  const sketchEntities = (activeSketch?.entities ?? []) as unknown as OverlaySketchEntity[];
  const sketchConstraints = (activeSketch?.constraints ?? []) as unknown as OverlaySketchConstraint[];

  const handleToolbarAction = (_action: ToolbarAction) => {
    /* wired by parent page; workbench is a view layer */
  };

  return (
    <div className="flex h-screen w-screen flex-col bg-neutral-950 text-neutral-100">
      <Toolbar onAction={handleToolbarAction} />
      <div className="flex min-h-0 flex-1">
        {/* LEFT: Feature tree */}
        <aside className="w-64 shrink-0 border-r border-neutral-800 bg-neutral-950/80">
          <FeatureTree
            features={treeFeatures}
            selectedId={selectedFeatureId}
            onSelect={selectFeature}
          />
        </aside>

        {/* CENTER: Viewport with optional sketch overlay */}
        <section className="relative min-w-0 flex-1 bg-neutral-900">
          <Viewport features={viewportFeatures} />
          <SketchOverlay
            entities={sketchEntities}
            constraints={sketchConstraints}
            activeTool="select"
          />
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-neutral-950/70 text-sm text-neutral-400">
              Loading project…
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-neutral-950/70 text-sm text-red-400">
              Failed to load project.
            </div>
          )}
        </section>

        {/* RIGHT: Properties */}
        <aside className="w-80 shrink-0 border-l border-neutral-800 bg-neutral-950/80">
          <PropertiesPanel feature={propertiesFeature} />
        </aside>
      </div>

      {/* BOTTOM: Feature timeline scrubber */}
      <TimelineScrubber />
    </div>
  );
}

export default Workbench;
