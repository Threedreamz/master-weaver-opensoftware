"use client";

import { useEffect, useState } from "react";
import { Play } from "lucide-react";
import { useCamStore, useSelectedOperation } from "@/stores/cam-store";

type Params = Record<string, unknown>;

export function PropertiesPanel() {
  const op = useSelectedOperation();
  const tools = useCamStore((s) => s.tools);
  const updateOperation = useCamStore((s) => s.updateOperation);
  const generateToolpath = useCamStore((s) => s.generateToolpath);

  // local state mirrors the selected op so onBlur can persist changes
  const [toolId, setToolId] = useState("");
  const [feed, setFeed] = useState<number>(0);
  const [rpm, setRpm] = useState<number>(0);
  const [stepover, setStepover] = useState<number>(0);
  const [stepdown, setStepdown] = useState<number>(0);
  const [paramsText, setParamsText] = useState("");
  const [generating, setGenerating] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!op) return;
    setToolId(op.toolId);
    setFeed(op.feedMmMin);
    setRpm(op.spindleRpm);
    setStepover(op.stepoverMm ?? 0);
    setStepdown(op.stepdownMm ?? 0);
    setParamsText(JSON.stringify(op.paramsJson ?? {}, null, 2));
    setErr(null);
  }, [op?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!op) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-xs text-neutral-500">
        Select an operation
      </div>
    );
  }

  const saveField = async (patch: Params) => {
    try {
      await updateOperation(op.id, patch as never);
      setErr(null);
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const saveParams = async () => {
    try {
      const parsed = paramsText.trim() ? (JSON.parse(paramsText) as Params) : {};
      await updateOperation(op.id, { paramsJson: parsed } as never);
      setErr(null);
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  // kind-specific helpers (parse/write into params)
  const params: Params = (op.paramsJson ?? {}) as Params;

  const writeParam = async (key: string, value: unknown) => {
    const next = { ...params, [key]: value };
    setParamsText(JSON.stringify(next, null, 2));
    await updateOperation(op.id, { paramsJson: next } as never);
  };

  const onGenerate = async () => {
    setGenerating(true);
    try {
      await generateToolpath(op.id);
      setErr(null);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="border-b border-neutral-800 px-3 py-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Properties
        </div>
        <div className="mt-0.5 text-[10px] text-neutral-500">op: {op.id}</div>
      </div>

      <div className="space-y-3 p-3 text-xs">
        <div>
          <span className="mb-0.5 block text-neutral-400">Kind</span>
          <div className="rounded border border-neutral-800 bg-neutral-950 px-2 py-1 text-neutral-100">
            {op.kind}
          </div>
        </div>

        <label className="block">
          <span className="mb-0.5 block text-neutral-400">Tool</span>
          <select
            value={toolId}
            onChange={(e) => {
              const v = e.target.value;
              setToolId(v);
              void saveField({ toolId: v });
            }}
            className="w-full rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-neutral-100"
          >
            {tools.length === 0 ? <option value="">(no tools)</option> : null}
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
              onBlur={() => void saveField({ feedMmMin: feed })}
              className="w-full rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-neutral-100"
            />
          </label>
          <label>
            <span className="mb-0.5 block text-neutral-400">Spindle RPM</span>
            <input
              type="number"
              value={rpm}
              onChange={(e) => setRpm(Number(e.target.value))}
              onBlur={() => void saveField({ spindleRpm: rpm })}
              className="w-full rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-neutral-100"
            />
          </label>
          {op.kind !== "drill" ? (
            <label>
              <span className="mb-0.5 block text-neutral-400">Stepover (mm)</span>
              <input
                type="number"
                step="0.1"
                value={stepover}
                onChange={(e) => setStepover(Number(e.target.value))}
                onBlur={() =>
                  void saveField({ stepoverMm: stepover > 0 ? stepover : undefined })
                }
                className="w-full rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-neutral-100"
              />
            </label>
          ) : null}
          <label>
            <span className="mb-0.5 block text-neutral-400">Stepdown (mm)</span>
            <input
              type="number"
              step="0.1"
              value={stepdown}
              onChange={(e) => setStepdown(Number(e.target.value))}
              onBlur={() =>
                void saveField({ stepdownMm: stepdown > 0 ? stepdown : undefined })
              }
              className="w-full rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-neutral-100"
            />
          </label>
        </div>

        <KindSpecific kind={op.kind} params={params} onWrite={writeParam} />

        <div>
          <span className="mb-0.5 block text-neutral-400">Raw params (JSON)</span>
          <textarea
            value={paramsText}
            onChange={(e) => setParamsText(e.target.value)}
            onBlur={() => void saveParams()}
            rows={6}
            className="w-full rounded border border-neutral-700 bg-neutral-800 px-2 py-1 font-mono text-[10px] text-neutral-100"
          />
        </div>

        {err ? <div className="text-[10px] text-red-400">{err}</div> : null}

        <button
          type="button"
          onClick={onGenerate}
          disabled={generating}
          className="flex w-full items-center justify-center gap-1.5 rounded border border-blue-700 bg-blue-800 px-3 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Play className="h-3.5 w-3.5" />
          {generating ? "Generating…" : "Generate toolpath"}
        </button>
      </div>
    </div>
  );
}

function KindSpecific({
  kind,
  params,
  onWrite,
}: {
  kind: string;
  params: Params;
  onWrite: (key: string, value: unknown) => void | Promise<void>;
}) {
  if (kind === "pocket") {
    const outlineText =
      typeof params.outline === "string"
        ? (params.outline as string)
        : JSON.stringify(params.outline ?? [], null, 2);
    return (
      <label className="block">
        <span className="mb-0.5 block text-neutral-400">
          Outline (JSON array of {"{x,y}"})
        </span>
        <textarea
          defaultValue={outlineText}
          onBlur={(e) => {
            try {
              const parsed = e.target.value.trim() ? JSON.parse(e.target.value) : [];
              void onWrite("outline", parsed);
            } catch {
              /* ignore invalid JSON on blur */
            }
          }}
          rows={4}
          className="w-full rounded border border-neutral-700 bg-neutral-800 px-2 py-1 font-mono text-[10px] text-neutral-100"
        />
      </label>
    );
  }

  if (kind === "contour") {
    const side = (params.side as string | undefined) ?? "outside";
    return (
      <label className="block">
        <span className="mb-0.5 block text-neutral-400">Side</span>
        <select
          value={side}
          onChange={(e) => void onWrite("side", e.target.value)}
          className="w-full rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-neutral-100"
        >
          <option value="inside">inside</option>
          <option value="outside">outside</option>
          <option value="on">on</option>
        </select>
      </label>
    );
  }

  if (kind === "drill") {
    const holesText = JSON.stringify(params.holes ?? [], null, 2);
    return (
      <label className="block">
        <span className="mb-0.5 block text-neutral-400">Holes (JSON)</span>
        <textarea
          defaultValue={holesText}
          onBlur={(e) => {
            try {
              const parsed = e.target.value.trim() ? JSON.parse(e.target.value) : [];
              void onWrite("holes", parsed);
            } catch {
              /* ignore invalid JSON on blur */
            }
          }}
          rows={4}
          className="w-full rounded border border-neutral-700 bg-neutral-800 px-2 py-1 font-mono text-[10px] text-neutral-100"
        />
      </label>
    );
  }

  if (kind === "face") {
    const bounds =
      (params.bounds as { w?: number; d?: number; h?: number } | undefined) ?? {};
    return (
      <div>
        <span className="mb-0.5 block text-neutral-400">Bounds (W × D × H)</span>
        <div className="grid grid-cols-3 gap-1.5">
          <input
            type="number"
            step="0.1"
            defaultValue={bounds.w ?? 0}
            onBlur={(e) =>
              void onWrite("bounds", { ...bounds, w: Number(e.target.value) })
            }
            placeholder="W"
            className="rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-neutral-100"
          />
          <input
            type="number"
            step="0.1"
            defaultValue={bounds.d ?? 0}
            onBlur={(e) =>
              void onWrite("bounds", { ...bounds, d: Number(e.target.value) })
            }
            placeholder="D"
            className="rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-neutral-100"
          />
          <input
            type="number"
            step="0.1"
            defaultValue={bounds.h ?? 0}
            onBlur={(e) =>
              void onWrite("bounds", { ...bounds, h: Number(e.target.value) })
            }
            placeholder="H"
            className="rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-neutral-100"
          />
        </div>
      </div>
    );
  }

  return null;
}
