"use client";

import { useState } from "react";
import { Download, Play, Plus, Upload } from "lucide-react";
import { useCamStore } from "@/stores/cam-store";

type AddOpKind = "face" | "contour" | "pocket" | "drill" | "adaptive" | "3d-parallel";

export function Toolbar() {
  const project = useCamStore((s) => s.project);
  const operations = useCamStore((s) => s.operations);
  const tools = useCamStore((s) => s.tools);
  const importFromOpencad = useCamStore((s) => s.importFromOpencad);
  const generateToolpath = useCamStore((s) => s.generateToolpath);
  const postprocessAll = useCamStore((s) => s.postprocessAll);
  const addOperation = useCamStore((s) => s.addOperation);

  const [busy, setBusy] = useState<string | null>(null);
  const [showAddOp, setShowAddOp] = useState(false);
  const [postMessage, setPostMessage] = useState<string | null>(null);

  const onImport = async () => {
    const openCadProjectId = window.prompt("OpenCAD project ID:");
    if (!openCadProjectId) return;
    setBusy("import");
    try {
      const res = await importFromOpencad({
        openCadProjectId,
        role: "part",
        format: "stl",
      });
      setPostMessage(`Imported bbox: ${JSON.stringify(res.bbox)}`);
    } catch (e) {
      setPostMessage(`Import failed: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  };

  const onGenerateAll = async () => {
    setBusy("generate");
    try {
      for (const op of operations) {
        await generateToolpath(op.id);
      }
      setPostMessage(`Generated ${operations.length} toolpath(s).`);
    } catch (e) {
      setPostMessage(`Generate failed: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  };

  const onPost = async () => {
    setBusy("post");
    try {
      let postId = "grbl-builtin";
      try {
        const r = await fetch("/api/posts");
        if (r.ok) {
          const d = (await r.json()) as { items?: Array<{ id: string }> };
          if (d.items && d.items.length > 0) postId = d.items[0].id;
        }
      } catch {
        /* fall through with default */
      }
      const res = await postprocessAll(postId);
      setPostMessage(`Post OK — ${res.lineCount} lines (gcode: ${res.gcodeId})`);
    } catch (e) {
      setPostMessage(`Post failed: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex items-center gap-2 border-b border-neutral-800 bg-neutral-900 px-3 py-2">
      <div className="mr-3 flex min-w-0 flex-col">
        <div className="truncate text-sm font-medium text-neutral-100">
          {project?.name ?? "(no project)"}
        </div>
        <div className="truncate text-xs text-neutral-500">
          {operations.length} op{operations.length === 1 ? "" : "s"} · {tools.length} tool
          {tools.length === 1 ? "" : "s"}
        </div>
      </div>

      <button
        type="button"
        onClick={onImport}
        disabled={busy !== null}
        className="flex items-center gap-1.5 rounded border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs text-neutral-100 hover:bg-neutral-700 disabled:opacity-50"
      >
        <Upload className="h-3.5 w-3.5" />
        Import from OpenCAD
      </button>

      <button
        type="button"
        onClick={onGenerateAll}
        disabled={busy !== null || operations.length === 0}
        className="flex items-center gap-1.5 rounded border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs text-neutral-100 hover:bg-neutral-700 disabled:opacity-50"
      >
        <Play className="h-3.5 w-3.5" />
        Generate all toolpaths
      </button>

      <button
        type="button"
        onClick={onPost}
        disabled={busy !== null || operations.length === 0}
        className="flex items-center gap-1.5 rounded border border-blue-700 bg-blue-800 px-3 py-1.5 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
      >
        <Download className="h-3.5 w-3.5" />
        Post-process
      </button>

      <div className="relative">
        <button
          type="button"
          onClick={() => setShowAddOp((v) => !v)}
          disabled={busy !== null}
          className="flex items-center gap-1.5 rounded border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs text-neutral-100 hover:bg-neutral-700 disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Add operation
        </button>
        {showAddOp ? (
          <AddOperationPopover
            tools={tools}
            onClose={() => setShowAddOp(false)}
            onSubmit={async (payload) => {
              await addOperation(payload);
              setShowAddOp(false);
            }}
          />
        ) : null}
      </div>

      <div className="ml-auto flex items-center gap-3">
        {busy ? (
          <span className="text-xs text-neutral-400">Working: {busy}…</span>
        ) : null}
        {postMessage ? (
          <span
            className="max-w-[420px] truncate text-xs text-neutral-400"
            title={postMessage}
          >
            {postMessage}
          </span>
        ) : null}
      </div>
    </div>
  );
}

interface AddOpPayload {
  kind: AddOpKind;
  toolId: string;
  feedMmMin: number;
  spindleRpm: number;
  stepoverMm?: number;
  stepdownMm?: number;
  paramsJson: Record<string, unknown>;
}

function AddOperationPopover({
  tools,
  onClose,
  onSubmit,
}: {
  tools: Array<{ id: string; name: string; kind: string; diameterMm: number }>;
  onClose: () => void;
  onSubmit: (payload: AddOpPayload) => void | Promise<void>;
}) {
  const [kind, setKind] = useState<AddOpKind>("pocket");
  const [toolId, setToolId] = useState(tools[0]?.id ?? "");
  const [feed, setFeed] = useState(800);
  const [rpm, setRpm] = useState(12000);
  const [stepover, setStepover] = useState(2);
  const [stepdown, setStepdown] = useState(1);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!toolId) return;
    setSaving(true);
    try {
      await onSubmit({
        kind,
        toolId,
        feedMmMin: feed,
        spindleRpm: rpm,
        stepoverMm: stepover,
        stepdownMm: stepdown,
        paramsJson: {},
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="absolute right-0 top-full z-20 mt-1 w-72 rounded border border-neutral-700 bg-neutral-900 p-3 shadow-lg">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
          New operation
        </h4>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-neutral-500 hover:text-neutral-100"
        >
          ×
        </button>
      </div>
      <div className="space-y-2 text-xs">
        <label className="block">
          <span className="mb-0.5 block text-neutral-400">Kind</span>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as AddOpKind)}
            className="w-full rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-neutral-100"
          >
            <option value="face">face</option>
            <option value="contour">contour</option>
            <option value="pocket">pocket</option>
            <option value="drill">drill</option>
            <option value="adaptive">adaptive</option>
            <option value="3d-parallel">3d-parallel</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-0.5 block text-neutral-400">Tool</span>
          <select
            value={toolId}
            onChange={(e) => setToolId(e.target.value)}
            className="w-full rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-neutral-100"
          >
            {tools.length === 0 ? (
              <option value="">(no tools — add one first)</option>
            ) : null}
            {tools.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} · {t.kind} Ø{t.diameterMm}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label>
            <span className="mb-0.5 block text-neutral-400">Feed (mm/min)</span>
            <input
              type="number"
              value={feed}
              onChange={(e) => setFeed(Number(e.target.value))}
              className="w-full rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-neutral-100"
            />
          </label>
          <label>
            <span className="mb-0.5 block text-neutral-400">RPM</span>
            <input
              type="number"
              value={rpm}
              onChange={(e) => setRpm(Number(e.target.value))}
              className="w-full rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-neutral-100"
            />
          </label>
          <label>
            <span className="mb-0.5 block text-neutral-400">Stepover</span>
            <input
              type="number"
              value={stepover}
              onChange={(e) => setStepover(Number(e.target.value))}
              className="w-full rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-neutral-100"
            />
          </label>
          <label>
            <span className="mb-0.5 block text-neutral-400">Stepdown</span>
            <input
              type="number"
              value={stepdown}
              onChange={(e) => setStepdown(Number(e.target.value))}
              className="w-full rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-neutral-100"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={saving || !toolId}
          className="w-full rounded border border-blue-700 bg-blue-800 px-2 py-1.5 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Adding…" : "Add operation"}
        </button>
      </div>
    </div>
  );
}
