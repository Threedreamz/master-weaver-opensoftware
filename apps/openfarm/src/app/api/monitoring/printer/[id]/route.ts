import { NextRequest, NextResponse } from "next/server";
import { getPrinterWithCurrentJob, getRecentMetrics } from "@/db/queries/monitoring";
import { createPrinterAdapter, type PrinterProtocol } from "@/lib/adapters";

export const dynamic = "force-dynamic";

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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const printer = await getPrinterWithCurrentJob(id);

    if (!printer) {
      return NextResponse.json({ error: "Printer not found" }, { status: 404 });
    }

    const currentJob = printer.printJobs?.[0] ?? null;
    let liveStatus = null;

    try {
      const adapter = createPrinterAdapter(printer.protocol as PrinterProtocol, {
        host: printer.ipAddress ?? "",
        port: printer.port ?? undefined,
        apiKey: printer.apiKey ?? undefined,
        accessToken: printer.accessToken ?? undefined,
        serialNumber: printer.serialNumber ?? undefined,
      });

      await adapter.connect();
      liveStatus = await Promise.race([
        adapter.getStatus(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 3000)),
      ]);

      try { await adapter.disconnect(); } catch { /* ignore */ }
    } catch {
      // Adapter unavailable
    }

    const metrics = await getRecentMetrics(id, 24);

    const timeElapsed = currentJob ? getTimeElapsed(currentJob.printStartedAt) : undefined;
    const timeRemaining = currentJob
      ? getTimeRemaining(currentJob.estimatedPrintTime ?? undefined, timeElapsed)
      : undefined;

    return NextResponse.json({
      printer: {
        ...printer,
        printJobs: undefined,
      },
      currentJob: currentJob
        ? {
            ...currentJob,
            timeElapsed,
            timeRemaining,
          }
        : null,
      liveStatus,
      metrics,
    });
  } catch (error) {
    console.error("Failed to get printer detail:", error);
    return NextResponse.json(
      { error: "Failed to get printer detail" },
      { status: 500 }
    );
  }
}
