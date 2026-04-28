"use client";

/**
 * opensimulation — landing-page live demo.
 *
 * Fetches `/api/demo/cantilever` (a precomputed FEA run on a small canonical
 * beam) on mount and renders the result through FeaViewer. This lets
 * anonymous visitors see a real 3D simulator in their browser without any
 * sign-in. The viewer's warp slider lets them dial up the deformation.
 */

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const FeaViewer = dynamic(() => import("@/components/viewer/fea-viewer"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] items-center justify-center rounded-lg border border-neutral-800 bg-neutral-950 text-xs text-neutral-500">
      Loading 3D viewer…
    </div>
  ),
});

interface DemoPayload {
  vertices: number[];
  surfaceIndices: number[];
  vonMises: number[];
  displacements: number[];
  maxStressMPa: number;
  maxDisplacementMm: number;
  meta: {
    label: string;
    description: string;
    materialName: string;
    loadDescription: string;
  };
}

export default function CantileverDemo() {
  const [data, setData] = useState<DemoPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/demo/cantilever")
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as DemoPayload;
      })
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="rounded-lg border border-red-700/40 bg-red-900/10 p-4 text-sm text-red-300">
        Demo failed to load: {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-lg border border-neutral-800 bg-neutral-950 text-xs text-neutral-500">
        Solving cantilever beam…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <FeaViewer
        vertices={Float32Array.from(data.vertices)}
        indices={Uint32Array.from(data.surfaceIndices)}
        scalar={Float32Array.from(data.vonMises)}
        displacement={Float32Array.from(data.displacements)}
        style={{ height: 420 }}
      />
      <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
        <DemoStat label="Material" value={data.meta.materialName} />
        <DemoStat
          label="Max stress"
          value={`${data.maxStressMPa.toFixed(2)} MPa`}
        />
        <DemoStat
          label="Max displacement"
          value={`${data.maxDisplacementMm.toFixed(4)} mm`}
        />
      </div>
      <p className="text-xs leading-relaxed text-neutral-400">
        {data.meta.description}
      </p>
    </div>
  );
}

function DemoStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-neutral-800 bg-neutral-950/80 p-2">
      <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">
        {label}
      </div>
      <div className="mt-0.5 font-mono text-neutral-100">{value}</div>
    </div>
  );
}
