"use client";

import { useTranslations } from "next-intl";
import { Activity, Printer, AlertCircle, Wrench } from "lucide-react";

interface Summary {
  total: number;
  online: number;
  printing: number;
  idle: number;
  error: number;
  maintenance: number;
  offline: number;
  utilizationPercent: number;
}

export function FarmUtilizationBar({ summary }: { summary: Summary }) {
  const t = useTranslations("monitoring");

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center gap-3 mb-4">
        <Activity className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        <h3 className="font-semibold text-gray-900 dark:text-white">
          {t("farmUtilization")}
        </h3>
        <span className="ml-auto text-2xl font-bold text-gray-900 dark:text-white">
          {summary.utilizationPercent}%
        </span>
      </div>

      {/* Utilization bar */}
      <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-700"
          style={{ width: `${summary.utilizationPercent}%` }}
        />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="flex items-center gap-2 text-sm">
          <Printer className="w-4 h-4 text-gray-400" />
          <span className="text-gray-500">{t("totalPrinters")}:</span>
          <span className="font-semibold text-gray-900 dark:text-white">{summary.total}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-gray-500">{t("printing")}:</span>
          <span className="font-semibold text-blue-600">{summary.printing}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span className="text-gray-500">{t("errors")}:</span>
          <span className="font-semibold text-red-600">{summary.error}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Wrench className="w-4 h-4 text-purple-400" />
          <span className="text-gray-500">{t("inMaintenance")}:</span>
          <span className="font-semibold text-purple-600">{summary.maintenance}</span>
        </div>
      </div>
    </div>
  );
}
