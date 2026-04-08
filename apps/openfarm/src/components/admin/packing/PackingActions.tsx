"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Play, CheckCircle, Loader2 } from "lucide-react";

export function PackingActions({ jobId, status }: { jobId: string; status: string }) {
  const t = useTranslations("packing");
  const [loading, setLoading] = useState(false);

  const handlePack = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/packing/${jobId}/pack`, { method: "POST" });
      if (res.ok) window.location.reload();
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handleApprove = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/packing/${jobId}/approve`, { method: "POST" });
      if (res.ok) window.location.reload();
    } catch { /* ignore */ }
    setLoading(false);
  };

  return (
    <div className="flex gap-3">
      {status === "draft" && (
        <button
          onClick={handlePack}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {t("runPacking")}
        </button>
      )}
      {status === "packed" && (
        <button
          onClick={handleApprove}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
          {t("approveAndCreateJobs")}
        </button>
      )}
    </div>
  );
}
