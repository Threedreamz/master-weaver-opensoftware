import { NextResponse } from "next/server";
import { getPrintersWithCurrentJobs } from "@/db/queries/monitoring";
import { createPrinterAdapter, type PrinterProtocol } from "@/lib/adapters";

export const dynamic = "force-dynamic";

interface PrinterMonitoringState {
  id: string;
  name: string;
  technology: string;
  protocol: string;
  status: string;
  connected: boolean;
  temperature?: { hotend?: number; bed?: number; chamber?: number };
  currentJob?: {
    id: string;
    name: string;
    progress: number;
    currentLayer?: number;
    totalLayers?: number;
    printStartedAt: Date | null;
    estimatedPrintTime?: number;
    timeElapsed?: number;
    timeRemaining?: number;
  };
  buildVolume?: { x: number; y: number; z: number };
  lastSeenAt: Date | null;
}

function getTimeElapsed(printStartedAt: Date | null): number | undefined {
  if (!printStartedAt) return undefined;
  return Math.floor((Date.now() - new Date(printStartedAt).getTime()) / 1000);
}

function getTimeRemaining(
  estimatedPrintTime: number | undefined,
  timeElapsed: number | undefined
): number | undefined {
  if (!estimatedPrintTime || !timeElapsed) return undefined;
  const remaining = estimatedPrintTime - timeElapsed;
  return remaining > 0 ? remaining : 0;
}

export async function GET() {
  try {
    const printers = await getPrintersWithCurrentJobs();

    const monitoringStates: PrinterMonitoringState[] = await Promise.all(
      printers.map(async (printer) => {
        const currentJob = printer.printJobs?.[0] ?? null;
        let connected = false;
        let temperature: PrinterMonitoringState["temperature"];

        // Try to get live status from adapter
        try {
          const adapter = createPrinterAdapter(printer.protocol as PrinterProtocol, {
            host: printer.ipAddress ?? "",
            port: printer.port ?? undefined,
            apiKey: printer.apiKey ?? undefined,
            accessToken: printer.accessToken ?? undefined,
            serialNumber: printer.serialNumber ?? undefined,
          });

          await adapter.connect();
          const state = await Promise.race([
            adapter.getStatus(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 2000)),
          ]) as any;

          connected = true;
          temperature = state.temperature;

          try { await adapter.disconnect(); } catch { /* ignore */ }
        } catch {
          connected = false;
        }

        const timeElapsed = currentJob ? getTimeElapsed(currentJob.printStartedAt) : undefined;
        const timeRemaining = currentJob
          ? getTimeRemaining(currentJob.estimatedPrintTime ?? undefined, timeElapsed)
          : undefined;

        return {
          id: printer.id,
          name: printer.name,
          technology: printer.technology,
          protocol: printer.protocol,
          status: printer.status,
          connected,
          temperature,
          currentJob: currentJob
            ? {
                id: currentJob.id,
                name: currentJob.name,
                progress: currentJob.progressPercent ?? 0,
                currentLayer: currentJob.currentLayer ?? undefined,
                totalLayers: currentJob.totalLayers ?? undefined,
                printStartedAt: currentJob.printStartedAt,
                estimatedPrintTime: currentJob.estimatedPrintTime ?? undefined,
                timeElapsed,
                timeRemaining,
              }
            : undefined,
          buildVolume:
            printer.buildVolumeX && printer.buildVolumeY && printer.buildVolumeZ
              ? {
                  x: printer.buildVolumeX,
                  y: printer.buildVolumeY,
                  z: printer.buildVolumeZ,
                }
              : undefined,
          lastSeenAt: printer.lastSeenAt,
        } satisfies PrinterMonitoringState;
      })
    );

    // Compute summary
    const summary = {
      total: monitoringStates.length,
      online: monitoringStates.filter((p) => p.connected && p.status !== "error" && p.status !== "maintenance").length,
      printing: monitoringStates.filter((p) => p.status === "printing").length,
      idle: monitoringStates.filter((p) => p.status === "online" && !p.currentJob).length,
      error: monitoringStates.filter((p) => p.status === "error").length,
      maintenance: monitoringStates.filter((p) => p.status === "maintenance").length,
      offline: monitoringStates.filter((p) => !p.connected || p.status === "offline").length,
      utilizationPercent: monitoringStates.length > 0
        ? Math.round(
            (monitoringStates.filter((p) => p.status === "printing").length /
              monitoringStates.length) *
              100
          )
        : 0,
    };

    return NextResponse.json({
      printers: monitoringStates,
      summary,
    });
  } catch (error) {
    console.error("Failed to get monitoring overview:", error);
    return NextResponse.json(
      { error: "Failed to get monitoring overview" },
      { status: 500 }
    );
  }
}
