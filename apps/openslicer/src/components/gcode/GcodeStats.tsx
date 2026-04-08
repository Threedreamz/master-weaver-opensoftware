"use client";

import { Clock, Layers, Ruler, Weight, DollarSign } from "lucide-react";

interface GcodeStatsProps {
  estimatedTimeSeconds: number;
  materialUsageGrams: number;
  layerCount: number;
  filamentLengthMeters: number;
  estimatedCost?: number | null;
}

/**
 * Format seconds into a human-readable print time string.
 * Under 1 hour: "45m 30s"
 * 1-24 hours: "2h 15m"
 * Over 24 hours: "1d 3h 15m"
 */
function formatPrintTime(seconds: number): string {
  if (seconds <= 0) return "0s";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);

  if (d > 0) {
    // Over 24 hours: "1d 3h 15m"
    const parts: string[] = [`${d}d`];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    return parts.join(" ");
  }
  if (h > 0) {
    // 1-24 hours: "2h 15m"
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  // Under 1 hour: "45m 30s"
  if (m > 0) {
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  }
  return `${s}s`;
}

/**
 * Compact card showing parsed G-code metadata.
 */
export function GcodeStats({
  estimatedTimeSeconds,
  materialUsageGrams,
  layerCount,
  filamentLengthMeters,
  estimatedCost,
}: GcodeStatsProps) {
  const stats = [
    {
      icon: Clock,
      label: "Print Time",
      value: formatPrintTime(estimatedTimeSeconds),
      color: "text-blue-400",
    },
    {
      icon: Weight,
      label: "Material",
      value: `${materialUsageGrams.toFixed(1)} g`,
      color: "text-emerald-400",
    },
    {
      icon: Layers,
      label: "Layers",
      value: layerCount.toLocaleString(),
      color: "text-amber-400",
    },
    {
      icon: Ruler,
      label: "Filament",
      value: `${filamentLengthMeters.toFixed(2)} m`,
      color: "text-violet-400",
    },
  ];

  // Add cost card if cost data is available
  if (estimatedCost != null && estimatedCost > 0) {
    stats.push({
      icon: DollarSign,
      label: "Cost",
      value: new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(estimatedCost),
      color: "text-rose-400",
    });
  }

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        G-Code Stats
      </h4>
      <div className="grid grid-cols-2 gap-2">
        {stats.map(({ icon: Icon, label, value, color }) => (
          <div
            key={label}
            className="flex items-center gap-2 rounded bg-zinc-800 px-2.5 py-2"
          >
            <Icon className={`h-4 w-4 shrink-0 ${color}`} />
            <div className="min-w-0">
              <p className="text-[10px] text-zinc-500">{label}</p>
              <p className="text-sm font-medium text-zinc-100">{value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
