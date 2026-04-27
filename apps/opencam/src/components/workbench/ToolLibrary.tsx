"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useCamStore } from "@/stores/cam-store";

type ToolKind = "flat" | "ball" | "bull" | "drill" | "chamfer" | "vbit" | "tap";

export function ToolLibrary() {
  const tools = useCamStore((s) => s.tools);
  const loadTools = useCamStore((s) => s.loadTools);

  const [name, setName] = useState("");
  const [kind, setKind] = useState<ToolKind>("flat");
  const [diameterMm, setDiameterMm] = useState(6);
  const [fluteCount, setFluteCount] = useState(2);
  const [lengthMm, setLengthMm] = useState(40);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onAdd = async () => {
    if (!name.trim()) {
      setErr("Name required");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch("/api/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          kind,
          diameterMm,
          fluteCount,
          lengthMm,
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || `HTTP ${res.status}`);
      }
      setName("");
      setDiameterMm(6);
      setFluteCount(2);
      setLengthMm(40);
      await loadTools();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
        Tool library ({tools.length})
      </div>
      <ul className="max-h-40 overflow-auto border-t border-neutral-800">
        {tools.length === 0 ? (
          <li className="px-3 py-2 text-xs text-neutral-500">No tools yet.</li>
        ) : (
          tools.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between gap-2 border-b border-neutral-800 px-3 py-1.5 text-xs"
            >
              <span className="min-w-0 flex-1 truncate text-neutral-100">{t.name}</span>
              <span className="shrink-0 text-[10px] text-neutral-500">
                {t.kind} · Ø{t.diameterMm}
              </span>
            </li>
          ))
        )}
      </ul>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void onAdd();
        }}
        className="space-y-1.5 border-t border-neutral-800 p-2 text-xs"
      >
        <input
          type="text"
          placeholder="Tool name (e.g. 6mm flat endmill)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-neutral-100 placeholder:text-neutral-500"
        />
        <div className="grid grid-cols-2 gap-1.5">
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as ToolKind)}
            className="rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-neutral-100"
          >
            <option value="flat">flat</option>
            <option value="ball">ball</option>
            <option value="bull">bull</option>
            <option value="drill">drill</option>
            <option value="chamfer">chamfer</option>
            <option value="vbit">vbit</option>
            <option value="tap">tap</option>
          </select>
          <input
            type="number"
            step="0.1"
            min="0.1"
            value={diameterMm}
            onChange={(e) => setDiameterMm(Number(e.target.value))}
            placeholder="Ø (mm)"
            className="rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-neutral-100"
          />
          <input
            type="number"
            min="1"
            value={fluteCount}
            onChange={(e) => setFluteCount(Number(e.target.value))}
            placeholder="flutes"
            className="rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-neutral-100"
          />
          <input
            type="number"
            step="0.5"
            min="1"
            value={lengthMm}
            onChange={(e) => setLengthMm(Number(e.target.value))}
            placeholder="length (mm)"
            className="rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-neutral-100"
          />
        </div>
        {err ? <div className="text-[10px] text-red-400">{err}</div> : null}
        <button
          type="submit"
          disabled={saving}
          className="flex w-full items-center justify-center gap-1 rounded border border-neutral-700 bg-neutral-800 px-2 py-1.5 text-neutral-100 hover:bg-neutral-700 disabled:opacity-50"
        >
          <Plus className="h-3 w-3" />
          {saving ? "Adding…" : "Add tool"}
        </button>
      </form>
    </div>
  );
}
