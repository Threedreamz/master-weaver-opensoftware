"use client";

/**
 * opencad — PropertiesPanel
 *
 * Right sidebar. Lists the parameters of the currently-selected feature and
 * lets the user edit them. Debounces onSubmit so the caller (workbench
 * store) can POST to /api/feature/evaluate once the user pauses typing.
 *
 * Parameter shape inferred from `Record<string, unknown>`:
 *   number  → number input
 *   boolean → checkbox
 *   string  → text input
 *   other   → read-only JSON stringified
 */

import { useEffect, useMemo, useRef, useState } from "react";

export interface PropertiesFeature {
  id: string;
  kind: string;
  name?: string;
  params: Record<string, unknown>;
  error?: string | null;
}

export interface PropertiesPanelProps {
  feature: PropertiesFeature | null;
  onSubmit?: (id: string, params: Record<string, unknown>) => void | Promise<void>;
  onRename?: (id: string, name: string) => void;
  busy?: boolean;
  debounceMs?: number;
}

type ParamKind = "number" | "string" | "boolean" | "unknown";

function kindOf(v: unknown): ParamKind {
  if (typeof v === "number") return "number";
  if (typeof v === "boolean") return "boolean";
  if (typeof v === "string") return "string";
  return "unknown";
}

export function PropertiesPanel({
  feature,
  onSubmit,
  onRename,
  busy = false,
  debounceMs = 400,
}: PropertiesPanelProps) {
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [nameDraft, setNameDraft] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset draft when selection changes
  useEffect(() => {
    if (feature) {
      setDraft(feature.params ?? {});
      setNameDraft(feature.name ?? "");
      setError(null);
    } else {
      setDraft({});
      setNameDraft("");
    }
  }, [feature?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const paramEntries = useMemo(
    () => (feature ? Object.entries(draft) : []),
    [draft, feature],
  );

  const scheduleSubmit = (next: Record<string, unknown>) => {
    if (!feature) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      Promise.resolve(onSubmit?.(feature.id, next)).catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Submit failed");
      });
    }, debounceMs);
  };

  const updateParam = (key: string, value: unknown) => {
    setDraft((prev) => {
      const next = { ...prev, [key]: value };
      scheduleSubmit(next);
      return next;
    });
  };

  return (
    <aside
      className="flex h-full w-72 shrink-0 flex-col border-l border-neutral-800 bg-neutral-900 text-neutral-100"
      aria-label="Properties panel"
    >
      <header className="flex h-10 items-center justify-between border-b border-neutral-800 px-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">
        <span>Properties</span>
        {busy && (
          <span className="text-blue-300" role="status">
            …
          </span>
        )}
      </header>

      {!feature && (
        <div className="flex flex-1 items-center justify-center p-4 text-center text-xs text-neutral-500">
          Select a feature in the tree to edit its parameters.
        </div>
      )}

      {feature && (
        <div className="flex-1 overflow-y-auto p-3 text-sm">
          <div className="mb-4">
            <label
              htmlFor="feature-name"
              className="mb-1 block text-[10px] uppercase tracking-wide text-neutral-400"
            >
              Name
            </label>
            <input
              id="feature-name"
              type="text"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={() => {
                if (nameDraft !== (feature.name ?? "")) {
                  onRename?.(feature.id, nameDraft);
                }
              }}
              className="w-full rounded border border-neutral-800 bg-neutral-950 px-2 py-1 text-neutral-100 outline-none focus:border-blue-500"
            />
            <div className="mt-1 text-[10px] uppercase tracking-wide text-neutral-500">
              {feature.kind} · {feature.id.slice(0, 8)}
            </div>
          </div>

          {feature.error && (
            <div
              role="alert"
              className="mb-3 rounded border border-red-900/60 bg-red-950/40 px-2 py-1.5 text-xs text-red-200"
            >
              {feature.error}
            </div>
          )}

          {paramEntries.length === 0 && (
            <div className="text-xs text-neutral-500">
              This feature has no editable parameters.
            </div>
          )}

          <ul className="space-y-3">
            {paramEntries.map(([key, value]) => {
              const kind = kindOf(value);
              const inputId = `param-${feature.id}-${key}`;
              return (
                <li key={key} className="flex flex-col">
                  <label
                    htmlFor={inputId}
                    className="mb-1 text-[10px] uppercase tracking-wide text-neutral-400"
                  >
                    {key}
                  </label>

                  {kind === "number" && (
                    <input
                      id={inputId}
                      type="number"
                      value={Number.isFinite(value as number) ? (value as number) : 0}
                      step="any"
                      onChange={(e) => {
                        const n = e.target.valueAsNumber;
                        updateParam(key, Number.isFinite(n) ? n : 0);
                      }}
                      className="w-full rounded border border-neutral-800 bg-neutral-950 px-2 py-1 text-neutral-100 outline-none focus:border-blue-500"
                    />
                  )}

                  {kind === "string" && (
                    <input
                      id={inputId}
                      type="text"
                      value={value as string}
                      onChange={(e) => updateParam(key, e.target.value)}
                      className="w-full rounded border border-neutral-800 bg-neutral-950 px-2 py-1 text-neutral-100 outline-none focus:border-blue-500"
                    />
                  )}

                  {kind === "boolean" && (
                    <label className="inline-flex items-center gap-2 text-sm text-neutral-200">
                      <input
                        id={inputId}
                        type="checkbox"
                        checked={value as boolean}
                        onChange={(e) => updateParam(key, e.target.checked)}
                        className="h-4 w-4 rounded border-neutral-700 bg-neutral-950 text-blue-500 focus:ring-blue-500"
                      />
                      <span>{(value as boolean) ? "enabled" : "disabled"}</span>
                    </label>
                  )}

                  {kind === "unknown" && (
                    <pre className="max-h-24 overflow-auto rounded border border-neutral-800 bg-neutral-950 px-2 py-1 text-[11px] text-neutral-400">
                      {JSON.stringify(value, null, 2)}
                    </pre>
                  )}
                </li>
              );
            })}
          </ul>

          {error && (
            <div
              role="alert"
              className="mt-3 rounded border border-red-900/60 bg-red-950/40 px-2 py-1.5 text-xs text-red-200"
            >
              {error}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

export default PropertiesPanel;
