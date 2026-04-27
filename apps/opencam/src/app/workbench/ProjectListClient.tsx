"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useProjectsStore } from "@/stores/projects-store";

export default function ProjectListClient() {
  const { items, loading, error, load, create, remove } = useProjectsStore();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [material, setMaterial] = useState("");
  const [widthMm, setWidthMm] = useState("");
  const [depthMm, setDepthMm] = useState("");
  const [heightMm, setHeightMm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    load().catch(() => {
      /* error already set on the store */
    });
  }, [load]);

  function resetForm() {
    setName("");
    setMaterial("");
    setWidthMm("");
    setDepthMm("");
    setHeightMm("");
    setFormError(null);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setFormError("Name is required");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const w = widthMm ? Number(widthMm) : NaN;
      const d = depthMm ? Number(depthMm) : NaN;
      const h = heightMm ? Number(heightMm) : NaN;
      const hasStock =
        Number.isFinite(w) && Number.isFinite(d) && Number.isFinite(h) && w > 0 && d > 0 && h > 0;
      await create({
        name: name.trim(),
        material: material.trim() || undefined,
        stockBbox: hasStock
          ? {
              min: { x: 0, y: 0, z: 0 },
              max: { x: w, y: d, z: h },
            }
          : undefined,
      });
      resetForm();
      setShowForm(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this project? This cannot be undone.")) return;
    try {
      await remove(id);
    } catch {
      /* error surfaced via store */
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-xs text-neutral-500">
          {loading ? "Loading…" : `${items.length} project${items.length === 1 ? "" : "s"}`}
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
        >
          {showForm ? "Cancel" : "New project"}
        </button>
      </div>

      {error && (
        <p className="rounded border border-red-800/50 bg-red-950/50 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-6"
        >
          <div className="space-y-1">
            <label htmlFor="proj-name" className="block text-xs font-medium text-neutral-400">
              Name
            </label>
            <input
              id="proj-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm"
              placeholder="Bracket v1"
              required
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="proj-material" className="block text-xs font-medium text-neutral-400">
              Material <span className="text-neutral-600">(optional)</span>
            </label>
            <input
              id="proj-material"
              type="text"
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
              className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm"
              placeholder="Aluminum 6061"
            />
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-neutral-400">
              Stock dimensions (mm) <span className="text-neutral-600">— optional</span>
            </p>
            <div className="grid grid-cols-3 gap-3">
              <input
                type="number"
                min={0}
                step="any"
                placeholder="W"
                value={widthMm}
                onChange={(e) => setWidthMm(e.target.value)}
                className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm"
              />
              <input
                type="number"
                min={0}
                step="any"
                placeholder="D"
                value={depthMm}
                onChange={(e) => setDepthMm(e.target.value)}
                className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm"
              />
              <input
                type="number"
                min={0}
                step="any"
                placeholder="H"
                value={heightMm}
                onChange={(e) => setHeightMm(e.target.value)}
                className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm"
              />
            </div>
          </div>

          {formError && (
            <p className="rounded border border-red-800/50 bg-red-950/50 px-3 py-2 text-xs text-red-300">
              {formError}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Creating…" : "Create project"}
            </button>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowForm(false);
              }}
              className="rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm text-neutral-200 transition hover:bg-neutral-700"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p) => (
          <li
            key={p.id}
            className="flex flex-col justify-between rounded-2xl border border-neutral-800 bg-neutral-900 p-5 transition hover:border-neutral-700"
          >
            <div>
              <Link
                href={`/workbench/${encodeURIComponent(p.id)}`}
                className="text-base font-medium text-neutral-100 hover:text-indigo-400"
              >
                {p.name}
              </Link>
              <p className="mt-1 text-xs text-neutral-500">
                {p.operationCount} operation{p.operationCount === 1 ? "" : "s"}
                {p.linkedOpencadProjectId ? " · linked to OpenCAD" : ""}
              </p>
              <p className="mt-0.5 text-[11px] text-neutral-600">
                Updated {new Date(p.updatedAt).toLocaleString()}
              </p>
            </div>

            <div className="mt-4 flex gap-2">
              <Link
                href={`/workbench/${encodeURIComponent(p.id)}`}
                className="rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs text-neutral-200 transition hover:bg-neutral-700"
              >
                Open
              </Link>
              <button
                type="button"
                onClick={() => handleDelete(p.id)}
                className="rounded-md border border-red-900/60 bg-red-950/40 px-3 py-1.5 text-xs text-red-300 transition hover:bg-red-900/40"
              >
                Delete
              </button>
            </div>
          </li>
        ))}

        {!loading && items.length === 0 && (
          <li className="col-span-full rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/40 p-8 text-center text-sm text-neutral-500">
            No projects yet. Click{" "}
            <span className="font-medium text-neutral-300">New project</span> to get started.
          </li>
        )}
      </ul>
    </section>
  );
}
