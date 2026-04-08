"use client";

import { CheckCircle2, XCircle, Clock, Loader2, SkipForward } from "lucide-react";

export type StageStatus = "pending" | "running" | "success" | "failed" | "skipped";

export interface EnrichmentStageDisplay {
  stage: string;
  label: string;
  status: StageStatus;
  durationMs?: number;
  error?: string;
}

const STAGE_LABELS: Record<string, string> = {
  vies: "VAT Validation (VIES)",
  register: "Trade Register Lookup",
  enrichment: "Company Enrichment",
  credit: "Credit Scoring",
  contacts: "Contact Discovery",
  insolvency: "Insolvency Check",
  scoring: "Lead Scoring",
};

const STATUS_ICONS: Record<StageStatus, React.ReactNode> = {
  pending: <Clock className="w-4 h-4 text-gray-400" />,
  running: <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />,
  success: <CheckCircle2 className="w-4 h-4 text-green-500" />,
  failed: <XCircle className="w-4 h-4 text-red-500" />,
  skipped: <SkipForward className="w-4 h-4 text-gray-400" />,
};

const STATUS_COLORS: Record<StageStatus, string> = {
  pending: "border-gray-200 dark:border-gray-700",
  running: "border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20",
  success: "border-green-200 dark:border-green-800",
  failed: "border-red-200 dark:border-red-800",
  skipped: "border-gray-200 dark:border-gray-700 opacity-60",
};

interface Props {
  stages: EnrichmentStageDisplay[];
}

export function EnrichmentProgress({ stages }: Props) {
  return (
    <div className="space-y-2">
      {stages.map((s) => (
        <div
          key={s.stage}
          className={`flex items-center gap-3 p-3 rounded-lg border ${STATUS_COLORS[s.status]}`}
        >
          <div className="flex items-center justify-center w-6 h-6">
            {STATUS_ICONS[s.status]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {STAGE_LABELS[s.stage] ?? s.stage}
            </div>
            {s.error && (
              <div className="text-xs text-red-500 mt-0.5 truncate">{s.error}</div>
            )}
          </div>
          {s.durationMs != null && s.status !== "pending" && (
            <div className="text-xs text-gray-400 shrink-0">
              {s.durationMs < 1000
                ? `${s.durationMs}ms`
                : `${(s.durationMs / 1000).toFixed(1)}s`}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
