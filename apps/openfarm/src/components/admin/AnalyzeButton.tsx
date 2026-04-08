"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Scan } from "lucide-react";

export function AnalyzeButton({
  modelId,
  modelFormat,
}: {
  modelId: string;
  modelFormat: string;
}) {
  const t = useTranslations("feasibility");
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setError(null);
    try {
      const res = await fetch(`/api/models/${modelId}/analyze`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Analysis failed");
      }
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
      setAnalyzing(false);
    }
  };

  if (modelFormat !== "stl") {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-sm text-gray-500">
        {t("onlyStl")}
      </div>
    );
  }

  return (
    <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
          {t("notAnalyzed")}
        </p>
        <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
          {t("analyzeDescription")}
        </p>
      </div>
      <button
        onClick={handleAnalyze}
        disabled={analyzing}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {analyzing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Scan className="w-4 h-4" />
        )}
        {analyzing ? t("analyzing") : t("analyze")}
      </button>
      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
    </div>
  );
}
