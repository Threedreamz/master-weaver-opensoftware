"use client";

import { useTranslations } from "next-intl";
import {
  Printer,
  Thermometer,
  Clock,
  Layers,
  Wifi,
  WifiOff,
  AlertCircle,
  Wrench,
  Pause,
} from "lucide-react";

interface PrinterMonitoringState {
  id: string;
  name: string;
  technology: string;
  protocol: string;
  status: string;
  connected: boolean;
  temperature?: {
    hotend?: number;
    bed?: number;
    chamber?: number;
  };
  currentJob?: {
    id: string;
    name: string;
    progress: number;
    currentLayer?: number;
    totalLayers?: number;
    timeElapsed?: number;
    timeRemaining?: number;
  };
  buildVolume?: {
    x: number;
    y: number;
    z: number;
  };
}

const STATUS_STYLES: Record<string, { bg: string; dot: string; text: string }> = {
  online: { bg: "bg-green-50 dark:bg-green-950/20", dot: "bg-green-500", text: "text-green-700 dark:text-green-400" },
  printing: { bg: "bg-blue-50 dark:bg-blue-950/20", dot: "bg-blue-500 animate-pulse", text: "text-blue-700 dark:text-blue-400" },
  paused: { bg: "bg-amber-50 dark:bg-amber-950/20", dot: "bg-amber-500", text: "text-amber-700 dark:text-amber-400" },
  error: { bg: "bg-red-50 dark:bg-red-950/20", dot: "bg-red-500 animate-pulse", text: "text-red-700 dark:text-red-400" },
  maintenance: { bg: "bg-purple-50 dark:bg-purple-950/20", dot: "bg-purple-500", text: "text-purple-700 dark:text-purple-400" },
  offline: { bg: "bg-gray-50 dark:bg-gray-800", dot: "bg-gray-400", text: "text-gray-500" },
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  error: <AlertCircle className="w-4 h-4" />,
  maintenance: <Wrench className="w-4 h-4" />,
  paused: <Pause className="w-4 h-4" />,
};

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function PrinterCard({ printer }: { printer: PrinterMonitoringState }) {
  const t = useTranslations("monitoring");
  const style = STATUS_STYLES[printer.status] ?? STATUS_STYLES.offline;

  return (
    <div className={`rounded-xl border border-gray-200 dark:border-gray-700 p-4 ${style.bg} transition-all hover:shadow-md`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Printer className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">
            {printer.name}
          </h3>
        </div>
        <div className="flex items-center gap-1.5">
          {printer.connected ? (
            <Wifi className="w-3.5 h-3.5 text-green-500" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-gray-400" />
          )}
        </div>
      </div>

      {/* Status badge */}
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-2.5 h-2.5 rounded-full ${style.dot}`} />
        <span className={`text-sm font-medium ${style.text} flex items-center gap-1`}>
          {STATUS_ICONS[printer.status]}
          {t(`status.${printer.status}`)}
        </span>
        <span className="text-xs text-gray-400 uppercase ml-auto">
          {printer.technology}
        </span>
      </div>

      {/* Progress bar (when printing) */}
      {printer.currentJob && (
        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600 dark:text-gray-300 truncate max-w-[70%]">
              {printer.currentJob.name}
            </span>
            <span className="font-mono font-semibold text-gray-900 dark:text-white">
              {printer.currentJob.progress}%
            </span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${printer.currentJob.progress}%` }}
            />
          </div>

          {/* Time info */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            {printer.currentJob.timeElapsed !== undefined && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDuration(printer.currentJob.timeElapsed)}
              </span>
            )}
            {printer.currentJob.timeRemaining !== undefined && (
              <span>{formatDuration(printer.currentJob.timeRemaining)} {t("remaining")}</span>
            )}
          </div>

          {/* Layer info */}
          {printer.currentJob.currentLayer !== undefined && printer.currentJob.totalLayers !== undefined && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Layers className="w-3 h-3" />
              <span>
                {t("layer")} {printer.currentJob.currentLayer}/{printer.currentJob.totalLayers}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Temperature readouts */}
      {printer.temperature && (printer.temperature.hotend || printer.temperature.bed) && (
        <div className="flex items-center gap-3 text-xs text-gray-500 border-t border-gray-200/50 dark:border-gray-700/50 pt-2">
          <Thermometer className="w-3 h-3 flex-shrink-0" />
          {printer.temperature.hotend !== undefined && (
            <span>{t("hotend")}: {Math.round(printer.temperature.hotend)}°C</span>
          )}
          {printer.temperature.bed !== undefined && (
            <span>{t("bed")}: {Math.round(printer.temperature.bed)}°C</span>
          )}
          {printer.temperature.chamber !== undefined && (
            <span>{t("chamber")}: {Math.round(printer.temperature.chamber)}°C</span>
          )}
        </div>
      )}
    </div>
  );
}
