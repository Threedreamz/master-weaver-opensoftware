"use client";

import { useState, useEffect } from "react";
import { Search, Filter, X } from "lucide-react";
import type { Label, PipelineMitglied } from "@opensoftware/db/openpipeline";

export interface FilterState {
  suche: string;
  labels: string[];
  mitglieder: string[];
  status: string[];
  prioritaet: string[];
}

const EMPTY_FILTER: FilterState = { suche: "", labels: [], mitglieder: [], status: [], prioritaet: [] };

interface FilterBarProps {
  pipelineId: string;
  filter: FilterState;
  onFilterChange: (filter: FilterState) => void;
}

export function FilterBar({ pipelineId, filter, onFilterChange }: FilterBarProps) {
  const [labels, setLabels] = useState<Label[]>([]);
  const [mitglieder, setMitglieder] = useState<PipelineMitglied[]>([]);
  const [showFilter, setShowFilter] = useState(false);

  useEffect(() => {
    if (showFilter) {
      Promise.all([
        fetch(`/api/pipelines/${pipelineId}/labels`).then((r) => r.ok ? r.json() : []),
        fetch(`/api/pipelines/${pipelineId}/mitglieder`).then((r) => r.ok ? r.json() : []),
      ]).then(([l, m]) => {
        setLabels(l);
        setMitglieder(m);
      });
    }
  }, [showFilter, pipelineId]);

  const hasActiveFilter = filter.labels.length > 0 || filter.mitglieder.length > 0 || filter.status.length > 0 || filter.prioritaet.length > 0;

  function toggleArrayFilter(key: keyof FilterState, value: string) {
    const arr = filter[key] as string[];
    const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
    onFilterChange({ ...filter, [key]: next });
  }

  return (
    <div className="px-4 py-2 border-b border-zinc-800 space-y-2">
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="flex items-center gap-1 flex-1 bg-zinc-800 rounded-lg px-3 py-1.5">
          <Search className="w-4 h-4 text-zinc-500" />
          <input
            value={filter.suche}
            onChange={(e) => onFilterChange({ ...filter, suche: e.target.value })}
            placeholder="Karten suchen..."
            className="flex-1 bg-transparent text-sm text-zinc-100 outline-none"
          />
          {filter.suche && (
            <button onClick={() => onFilterChange({ ...filter, suche: "" })}>
              <X className="w-3 h-3 text-zinc-500" />
            </button>
          )}
        </div>

        {/* Filter toggle */}
        <button
          onClick={() => setShowFilter(!showFilter)}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm ${
            hasActiveFilter ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Filter className="w-4 h-4" />
          Filter
          {hasActiveFilter && (
            <span className="text-[10px] bg-white/20 rounded-full px-1.5">{
              filter.labels.length + filter.mitglieder.length + filter.status.length + filter.prioritaet.length
            }</span>
          )}
        </button>

        {hasActiveFilter && (
          <button
            onClick={() => onFilterChange(EMPTY_FILTER)}
            className="text-xs text-zinc-500 hover:text-zinc-300"
          >
            Zuruecksetzen
          </button>
        )}
      </div>

      {/* Filter dropdowns */}
      {showFilter && (
        <div className="grid grid-cols-4 gap-3">
          {/* Labels */}
          <div>
            <span className="text-[10px] text-zinc-500 uppercase">Labels</span>
            <div className="space-y-0.5 mt-1 max-h-32 overflow-y-auto">
              {labels.map((l) => (
                <label key={l.id} className="flex items-center gap-1.5 cursor-pointer text-xs text-zinc-300 hover:text-zinc-100">
                  <input
                    type="checkbox"
                    checked={filter.labels.includes(l.id)}
                    onChange={() => toggleArrayFilter("labels", l.id)}
                    className="rounded bg-zinc-700 border-zinc-600 w-3 h-3"
                  />
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: l.farbe }} />
                  {l.name}
                </label>
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <span className="text-[10px] text-zinc-500 uppercase">Status</span>
            <div className="space-y-0.5 mt-1">
              {["offen", "in_arbeit", "blockiert", "erledigt", "abgebrochen"].map((s) => (
                <label key={s} className="flex items-center gap-1.5 cursor-pointer text-xs text-zinc-300 hover:text-zinc-100">
                  <input
                    type="checkbox"
                    checked={filter.status.includes(s)}
                    onChange={() => toggleArrayFilter("status", s)}
                    className="rounded bg-zinc-700 border-zinc-600 w-3 h-3"
                  />
                  {s.replace("_", " ")}
                </label>
              ))}
            </div>
          </div>

          {/* Prioritaet */}
          <div>
            <span className="text-[10px] text-zinc-500 uppercase">Prioritaet</span>
            <div className="space-y-0.5 mt-1">
              {["kritisch", "hoch", "mittel", "niedrig"].map((p) => (
                <label key={p} className="flex items-center gap-1.5 cursor-pointer text-xs text-zinc-300 hover:text-zinc-100">
                  <input
                    type="checkbox"
                    checked={filter.prioritaet.includes(p)}
                    onChange={() => toggleArrayFilter("prioritaet", p)}
                    className="rounded bg-zinc-700 border-zinc-600 w-3 h-3"
                  />
                  {p}
                </label>
              ))}
            </div>
          </div>

          {/* Mitglieder */}
          <div>
            <span className="text-[10px] text-zinc-500 uppercase">Mitglieder</span>
            <div className="space-y-0.5 mt-1 max-h-32 overflow-y-auto">
              {mitglieder.map((m) => (
                <label key={m.userId} className="flex items-center gap-1.5 cursor-pointer text-xs text-zinc-300 hover:text-zinc-100">
                  <input
                    type="checkbox"
                    checked={filter.mitglieder.includes(m.userId)}
                    onChange={() => toggleArrayFilter("mitglieder", m.userId)}
                    className="rounded bg-zinc-700 border-zinc-600 w-3 h-3"
                  />
                  {m.name || m.userId.slice(0, 8)}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { EMPTY_FILTER };
