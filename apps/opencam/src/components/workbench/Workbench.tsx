"use client";

import { useEffect } from "react";
import { useCamStore } from "@/stores/cam-store";
import { Toolbar } from "./Toolbar";
import { Viewport } from "./Viewport";
import { OperationTree } from "./OperationTree";
import { ToolLibrary } from "./ToolLibrary";
import { PropertiesPanel } from "./PropertiesPanel";

export default function Workbench({ projectId }: { projectId: string }) {
  const loadProject = useCamStore((s) => s.loadProject);
  const loadTools = useCamStore((s) => s.loadTools);
  const loading = useCamStore((s) => s.loading);
  const error = useCamStore((s) => s.error);
  const project = useCamStore((s) => s.project);

  useEffect(() => {
    void loadProject(projectId);
    void loadTools();
  }, [projectId, loadProject, loadTools]);

  return (
    <div className="flex h-screen w-full flex-col bg-neutral-900 text-neutral-100">
      {error ? (
        <div className="border-b border-red-800 bg-red-950 px-4 py-2 text-sm text-red-200">
          {error}
        </div>
      ) : null}
      <Toolbar />
      {loading && !project ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="animate-pulse text-sm text-neutral-500">Loading project…</div>
        </div>
      ) : (
        <div
          className="grid flex-1 overflow-hidden"
          style={{ gridTemplateColumns: "260px 1fr 320px" }}
        >
          <aside className="flex flex-col overflow-hidden border-r border-neutral-800">
            <div className="flex-1 overflow-auto">
              <OperationTree />
            </div>
            <div className="border-t border-neutral-800">
              <ToolLibrary />
            </div>
          </aside>
          <main className="relative overflow-hidden">
            <Viewport />
          </main>
          <aside className="overflow-auto border-l border-neutral-800">
            <PropertiesPanel />
          </aside>
        </div>
      )}
    </div>
  );
}
