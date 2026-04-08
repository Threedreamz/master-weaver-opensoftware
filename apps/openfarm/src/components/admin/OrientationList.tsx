"use client";

import { useTranslations } from "next-intl";
import { RotateCcw, Check, Clock, Layers } from "lucide-react";
import { useState } from "react";

interface Orientation {
  id: string;
  technology: string;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  supportVolumeCm3: number | null;
  printTimeEstimate: number | null;
  surfaceQualityScore: number | null;
  isSelected: boolean | null;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function OrientationList({
  orientations,
  modelId,
}: {
  orientations: Orientation[];
  modelId: string;
}) {
  const t = useTranslations("orientation");
  const [selecting, setSelecting] = useState<string | null>(null);

  const handleSelect = async (orientId: string) => {
    setSelecting(orientId);
    try {
      await fetch(`/api/models/${modelId}/orientations/${orientId}`, {
        method: "PATCH",
      });
      window.location.reload();
    } catch {
      setSelecting(null);
    }
  };

  // Group by technology
  const grouped = orientations.reduce<Record<string, Orientation[]>>((acc, o) => {
    (acc[o.technology] ??= []).push(o);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([technology, orients]) => (
        <div key={technology}>
          <h3 className="text-sm font-bold uppercase text-gray-500 mb-3">
            {technology.toUpperCase()} {t("orientations")}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {orients.map((o, index) => (
              <div
                key={o.id}
                className={`rounded-lg border p-4 transition-all ${
                  o.isSelected
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20 ring-1 ring-blue-500"
                    : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {t("option")} {index + 1}
                  </span>
                  {o.isSelected && (
                    <span className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                      <Check className="w-3.5 h-3.5" />
                      {t("selected")}
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-400 mb-3">
                  <div className="flex items-center gap-1.5">
                    <RotateCcw className="w-3 h-3" />
                    <span>
                      X: {o.rotationX} Y: {o.rotationY} Z: {o.rotationZ}
                    </span>
                  </div>
                  {o.supportVolumeCm3 !== null && (
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3 h-3" />
                      <span>{t("supportVolume")}: {o.supportVolumeCm3} cm3</span>
                    </div>
                  )}
                  {o.printTimeEstimate !== null && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      <span>{t("estTime")}: {formatDuration(o.printTimeEstimate)}</span>
                    </div>
                  )}
                </div>

                {/* Quality score bar */}
                {o.surfaceQualityScore !== null && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-500">{t("surfaceQuality")}</span>
                      <span className="font-semibold">{o.surfaceQualityScore}/100</span>
                    </div>
                    <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          o.surfaceQualityScore >= 80 ? "bg-green-500" :
                          o.surfaceQualityScore >= 50 ? "bg-amber-500" : "bg-red-500"
                        }`}
                        style={{ width: `${o.surfaceQualityScore}%` }}
                      />
                    </div>
                  </div>
                )}

                {!o.isSelected && (
                  <button
                    onClick={() => handleSelect(o.id)}
                    disabled={selecting === o.id}
                    className="w-full py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-md border border-blue-200 dark:border-blue-800 transition-colors disabled:opacity-50"
                  >
                    {selecting === o.id ? t("selecting") : t("selectThis")}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
