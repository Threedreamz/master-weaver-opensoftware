"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Upload,
  Save,
  X,
  FileInput,
} from "lucide-react";
import type { PrintTechnology, SlicerEngine } from "@opensoftware/slicer-core";

interface Profile {
  id: string;
  name: string;
  technology: PrintTechnology;
  engine: SlicerEngine;
  layerHeight?: number;
  infillPercent?: number;
  supportsEnabled?: boolean;
}

const TECHNOLOGIES: PrintTechnology[] = ["fdm", "sla", "sls"];
const ENGINES: SlicerEngine[] = [
  "prusaslicer",
  "orcaslicer",
  "bambu_studio",
  "preform",
  "chitubox",
  "lychee",
  "sls4all",
  "custom",
];

const TECH_COLORS: Record<PrintTechnology, string> = {
  fdm: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  sla: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  sls: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

type FormMode = "idle" | "create" | "edit";

export function ProfileManager() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [mode, setMode] = useState<FormMode>("idle");
  const [editId, setEditId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formTech, setFormTech] = useState<PrintTechnology>("fdm");
  const [formEngine, setFormEngine] = useState<SlicerEngine>("prusaslicer");
  const [formLayerHeight, setFormLayerHeight] = useState(0.2);
  const [formInfill, setFormInfill] = useState(20);
  const [formSupports, setFormSupports] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchProfiles = useCallback(async () => {
    try {
      const res = await fetch("/api/profiles");
      if (res.ok) {
        setProfiles(await res.json());
      }
    } catch (err) {
      console.error("Failed to load profiles:", err);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const resetForm = () => {
    setMode("idle");
    setEditId(null);
    setFormName("");
    setFormTech("fdm");
    setFormEngine("prusaslicer");
    setFormLayerHeight(0.2);
    setFormInfill(20);
    setFormSupports(false);
  };

  const openCreate = () => {
    resetForm();
    setMode("create");
  };

  const openEdit = (profile: Profile) => {
    setMode("edit");
    setEditId(profile.id);
    setFormName(profile.name);
    setFormTech(profile.technology);
    setFormEngine(profile.engine);
    setFormLayerHeight(profile.layerHeight ?? 0.2);
    setFormInfill(profile.infillPercent ?? 20);
    setFormSupports(profile.supportsEnabled ?? false);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    setLoading(true);
    try {
      const body = {
        name: formName.trim(),
        technology: formTech,
        engine: formEngine,
        layerHeight: formLayerHeight,
        infillPercent: formInfill,
        supportsEnabled: formSupports,
      };

      if (mode === "create") {
        await fetch("/api/profiles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else if (mode === "edit" && editId) {
        await fetch(`/api/profiles/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }

      resetForm();
      await fetchProfiles();
    } catch (err) {
      console.error("Save profile error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/profiles/${id}`, { method: "DELETE" });
      await fetchProfiles();
    } catch (err) {
      console.error("Delete profile error:", err);
    }
  };

  const handleImportIni = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/profiles/import", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        await fetchProfiles();
      }
    } catch (err) {
      console.error("Import error:", err);
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-2 p-3">
      {/* Action buttons */}
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
        >
          <Plus size={12} />
          New
        </button>
        <label className="flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors cursor-pointer">
          <FileInput size={12} />
          Import .ini
          <input
            type="file"
            accept=".ini,.cfg"
            onChange={handleImportIni}
            className="hidden"
          />
        </label>
      </div>

      {/* Create / Edit form */}
      {mode !== "idle" && (
        <div className="rounded-md border border-zinc-700 bg-zinc-800/80 p-2.5 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-300">
              {mode === "create" ? "New Profile" : "Edit Profile"}
            </span>
            <button
              type="button"
              onClick={resetForm}
              className="p-0.5 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <X size={12} />
            </button>
          </div>

          <input
            type="text"
            placeholder="Profile name"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            className="w-full rounded-md border border-zinc-600 bg-zinc-900 px-2 py-1 text-xs text-zinc-200 placeholder-zinc-600 focus:border-blue-500 outline-none"
          />

          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <label className="block text-[10px] text-zinc-500 mb-0.5">
                Technology
              </label>
              <select
                value={formTech}
                onChange={(e) => setFormTech(e.target.value as PrintTechnology)}
                className="w-full rounded border border-zinc-600 bg-zinc-900 px-1.5 py-1 text-xs text-zinc-200 outline-none"
              >
                {TECHNOLOGIES.map((t) => (
                  <option key={t} value={t}>
                    {t.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-zinc-500 mb-0.5">
                Engine
              </label>
              <select
                value={formEngine}
                onChange={(e) => setFormEngine(e.target.value as SlicerEngine)}
                className="w-full rounded border border-zinc-600 bg-zinc-900 px-1.5 py-1 text-xs text-zinc-200 outline-none"
              >
                {ENGINES.map((eng) => (
                  <option key={eng} value={eng}>
                    {eng.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <label className="block text-[10px] text-zinc-500 mb-0.5">
                Layer Height (mm)
              </label>
              <input
                type="number"
                min={0.04}
                max={0.4}
                step={0.02}
                value={formLayerHeight}
                onChange={(e) => setFormLayerHeight(parseFloat(e.target.value))}
                className="w-full rounded border border-zinc-600 bg-zinc-900 px-1.5 py-1 text-xs text-zinc-200 outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] text-zinc-500 mb-0.5">
                Infill %
              </label>
              <input
                type="number"
                min={0}
                max={100}
                step={5}
                value={formInfill}
                onChange={(e) => setFormInfill(parseInt(e.target.value, 10))}
                className="w-full rounded border border-zinc-600 bg-zinc-900 px-1.5 py-1 text-xs text-zinc-200 outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              role="switch"
              aria-checked={formSupports}
              onClick={() => setFormSupports(!formSupports)}
              className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                formSupports ? "bg-blue-500" : "bg-zinc-600"
              }`}
            >
              <span
                className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                  formSupports ? "translate-x-3.5" : "translate-x-0.5"
                }`}
              />
            </button>
            <span className="text-[10px] text-zinc-400">Supports</span>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={loading || !formName.trim()}
            className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-md bg-blue-600 text-xs text-white font-medium hover:bg-blue-500 transition-colors disabled:opacity-40"
          >
            <Save size={12} />
            {mode === "create" ? "Create" : "Save"}
          </button>
        </div>
      )}

      {/* Profile list */}
      {profiles.length === 0 && mode === "idle" && (
        <div className="text-xs text-zinc-500 text-center py-3">
          No profiles available
        </div>
      )}

      {profiles.map((profile) => (
        <div
          key={profile.id}
          className="flex items-center gap-2 rounded-md bg-zinc-800 border border-zinc-700/50 px-2 py-1.5"
        >
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-zinc-200 truncate">
              {profile.name}
            </p>
          </div>
          <span
            className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded border ${TECH_COLORS[profile.technology]}`}
          >
            {profile.technology}
          </span>
          <button
            type="button"
            onClick={() => openEdit(profile)}
            className="p-1 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <Pencil size={11} />
          </button>
          <button
            type="button"
            onClick={() => handleDelete(profile.id)}
            className="p-1 rounded hover:bg-zinc-700 text-zinc-500 hover:text-red-400 transition-colors"
          >
            <Trash2 size={11} />
          </button>
        </div>
      ))}
    </div>
  );
}
