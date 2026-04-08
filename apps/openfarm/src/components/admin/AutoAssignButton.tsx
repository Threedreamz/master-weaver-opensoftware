"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Zap, Loader2 } from "lucide-react";

export function AutoAssignButton({ jobId }: { jobId: string }) {
  const t = useTranslations("assignment");
  const [assigning, setAssigning] = useState(false);
  const [result, setResult] = useState<{ printerName: string; score: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAssign = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setAssigning(true);
    setError(null);
    try {
      const res = await fetch("/api/jobs/auto-assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Assignment failed");
      }
      setResult({ printerName: data.assigned.printerName, score: data.assigned.score });
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
      setAssigning(false);
    }
  };

  if (result) {
    return (
      <span className="text-xs text-green-600 font-medium">
        &rarr; {result.printerName} ({result.score}pts)
      </span>
    );
  }

  return (
    <div className="inline-flex items-center gap-1">
      <button
        onClick={handleAssign}
        disabled={assigning}
        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 dark:text-amber-400 dark:bg-amber-950/30 dark:hover:bg-amber-950/50 rounded-md transition-colors disabled:opacity-50"
        title={t("autoAssign")}
      >
        {assigning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
        {t("autoAssign")}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
