"use client";
import { useWorkbenchStore } from "@/stores/workbench-store";

export interface TimelineScrubberProps {
  onScrubTo?: (featureId: string) => void;
}
const KIND_COLOR: Record<string, string> = {
  sketch: "bg-blue-600", extrude: "bg-amber-600", revolve: "bg-amber-700",
  cut: "bg-red-600", boolean: "bg-violet-600", "boolean-union": "bg-violet-600",
  "boolean-subtract": "bg-violet-700", "boolean-intersect": "bg-violet-500",
  fillet: "bg-teal-600", chamfer: "bg-teal-500", shell: "bg-cyan-600",
  mirror: "bg-pink-600", "pattern-linear": "bg-orange-600",
  "pattern-circular": "bg-orange-500", sweep: "bg-lime-600",
  loft: "bg-green-600", box: "bg-stone-600", cylinder: "bg-stone-500",
  sphere: "bg-stone-700", cone: "bg-stone-600", torus: "bg-stone-500",
  pyramid: "bg-stone-700", transform: "bg-indigo-600", group: "bg-slate-600",
  hole: "bg-rose-600", thread: "bg-rose-700", draft: "bg-teal-700",
};

export function TimelineScrubber({ onScrubTo }: TimelineScrubberProps) {
  const features = useWorkbenchStore((s) => s.features);
  const selectedId = useWorkbenchStore((s) => s.selectedFeatureId);
  const selectFeature = useWorkbenchStore((s) => s.selectFeature);
  const onClick = (id: string) => { selectFeature(id); onScrubTo?.(id); };
  const onKey = (e: React.KeyboardEvent) => {
    if (!features.length) return;
    const idx = features.findIndex((f) => f.id === selectedId);
    if (e.key === "ArrowLeft" && idx > 0) onClick(features[idx - 1].id);
    else if (e.key === "ArrowRight" && idx < features.length - 1) onClick(features[idx + 1].id);
  };
  return (
    <div
      role="toolbar"
      aria-label="Feature timeline"
      tabIndex={0}
      onKeyDown={onKey}
      className="flex h-10 w-full items-center gap-1 overflow-x-auto border-t border-neutral-800 bg-neutral-900 px-2"
    >
      {features.map((f) => (
        <button
          key={f.id}
          type="button"
          onClick={() => onClick(f.id)}
          title={`${f.kind} · ${f.id.slice(0, 8)}`}
          aria-label={f.kind}
          aria-pressed={selectedId === f.id}
          className={[
            "h-6 w-6 shrink-0 rounded-sm transition",
            KIND_COLOR[f.kind] ?? "bg-neutral-600",
            selectedId === f.id ? "ring-2 ring-white" : "hover:brightness-125",
          ].join(" ")}
        />
      ))}
      {features.length === 0 && (
        <span className="text-xs text-neutral-500">No features yet</span>
      )}
    </div>
  );
}
