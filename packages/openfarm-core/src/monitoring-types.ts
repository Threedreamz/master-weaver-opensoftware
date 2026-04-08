import type { PrinterStatus, PrintTechnology, PrinterProtocol } from "./types";

export interface PrinterMonitoringState {
  id: string;
  name: string;
  technology: PrintTechnology;
  protocol: PrinterProtocol;
  status: PrinterStatus;
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
    printStartedAt?: Date | null;
    estimatedPrintTime?: number;
    timeElapsed?: number;
    timeRemaining?: number;
  };
  buildVolume?: {
    x: number;
    y: number;
    z: number;
  };
  lastSeenAt?: Date | null;
}

export interface MonitoringOverview {
  printers: PrinterMonitoringState[];
  summary: {
    total: number;
    online: number;
    printing: number;
    idle: number;
    error: number;
    maintenance: number;
    offline: number;
    utilizationPercent: number;
  };
}

export function computeMonitoringSummary(
  printers: PrinterMonitoringState[]
): MonitoringOverview["summary"] {
  const total = printers.length;
  const online = printers.filter((p) => p.status !== "offline").length;
  const printing = printers.filter((p) => p.status === "printing").length;
  const idle = printers.filter((p) => p.status === "online").length;
  const error = printers.filter((p) => p.status === "error").length;
  const maintenance = printers.filter((p) => p.status === "maintenance").length;
  const offline = printers.filter((p) => p.status === "offline").length;
  const utilizationPercent = total > 0 ? Math.round((printing / total) * 100) : 0;

  return { total, online, printing, idle, error, maintenance, offline, utilizationPercent };
}

export function getTimeElapsed(printStartedAt: Date | null | undefined): number | undefined {
  if (!printStartedAt) return undefined;
  return Math.floor((Date.now() - new Date(printStartedAt).getTime()) / 1000);
}

export function getTimeRemaining(
  estimatedPrintTime: number | undefined,
  timeElapsed: number | undefined
): number | undefined {
  if (!estimatedPrintTime || !timeElapsed) return undefined;
  const remaining = estimatedPrintTime - timeElapsed;
  return remaining > 0 ? remaining : 0;
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
