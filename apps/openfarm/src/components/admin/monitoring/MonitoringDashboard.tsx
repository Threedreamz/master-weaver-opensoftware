"use client";

import { useMonitoring } from "@/hooks/use-monitoring";
import { PrinterCard } from "./PrinterCard";
import { FarmUtilizationBar } from "./FarmUtilizationBar";
import { useTranslations } from "next-intl";
import { Loader2, Monitor } from "lucide-react";

export function MonitoringDashboard() {
  const { overview, loading, error } = useMonitoring(5000);
  const t = useTranslations("monitoring");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-500">
        <p>{error}</p>
      </div>
    );
  }

  if (overview.printers.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Monitor className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>{t("noPrinters")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FarmUtilizationBar summary={overview.summary} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {overview.printers.map((printer) => (
          <PrinterCard key={printer.id} printer={printer} />
        ))}
      </div>
    </div>
  );
}
