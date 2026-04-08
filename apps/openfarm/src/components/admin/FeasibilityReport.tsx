"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle, AlertCircle, CheckCircle, Info } from "lucide-react";

interface FeasibilityCheck {
  id: string;
  technology: string;
  overallScore: number;
  verdict: string;
  issues: Array<{ type: string; severity: string; description: string }> | null;
  metrics: Record<string, unknown> | null;
}

const VERDICT_STYLES: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  printable: {
    bg: "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800",
    text: "text-green-700 dark:text-green-400",
    icon: <CheckCircle className="w-5 h-5 text-green-500" />,
  },
  printable_with_issues: {
    bg: "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800",
    text: "text-amber-700 dark:text-amber-400",
    icon: <AlertTriangle className="w-5 h-5 text-amber-500" />,
  },
  needs_rework: {
    bg: "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800",
    text: "text-orange-700 dark:text-orange-400",
    icon: <AlertTriangle className="w-5 h-5 text-orange-500" />,
  },
  needs_redesign: {
    bg: "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800",
    text: "text-red-700 dark:text-red-400",
    icon: <AlertCircle className="w-5 h-5 text-red-500" />,
  },
};

const SEVERITY_ICONS: Record<string, React.ReactNode> = {
  critical: <AlertCircle className="w-4 h-4 text-red-500" />,
  warning: <AlertTriangle className="w-4 h-4 text-amber-500" />,
  info: <Info className="w-4 h-4 text-blue-500" />,
};

export function FeasibilityReport({ checks }: { checks: FeasibilityCheck[] }) {
  const t = useTranslations("feasibility");

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {checks.map((check) => {
        const style = VERDICT_STYLES[check.verdict] ?? VERDICT_STYLES.printable;
        const issues = (check.issues ?? []) as Array<{ type: string; severity: string; description: string }>;

        return (
          <div
            key={check.id}
            className={`rounded-xl border p-4 ${style.bg}`}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold uppercase text-gray-500">
                {check.technology.toUpperCase()}
              </span>
              <div className="flex items-center gap-2">
                {style.icon}
                <span className={`text-2xl font-bold ${style.text}`}>
                  {check.overallScore}
                </span>
              </div>
            </div>

            {/* Verdict */}
            <p className={`text-sm font-medium mb-3 ${style.text}`}>
              {t(`verdicts.${check.verdict}`)}
            </p>

            {/* Score bar */}
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
              <div
                className={`h-full rounded-full transition-all ${
                  check.overallScore >= 80 ? "bg-green-500" :
                  check.overallScore >= 50 ? "bg-amber-500" :
                  check.overallScore >= 20 ? "bg-orange-500" : "bg-red-500"
                }`}
                style={{ width: `${check.overallScore}%` }}
              />
            </div>

            {/* Issues */}
            {issues.length > 0 && (
              <div className="space-y-1.5">
                {issues.map((issue, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    {SEVERITY_ICONS[issue.severity] ?? SEVERITY_ICONS.info}
                    <span className="text-gray-600 dark:text-gray-300">
                      {issue.description}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {issues.length === 0 && (
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                {t("noIssues")}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
