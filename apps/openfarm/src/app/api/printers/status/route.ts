import { NextResponse } from "next/server";
import { getPrinters } from "@/db/queries/printers";
import { createPrinterAdapter, type PrinterProtocol, type PrinterState } from "@/lib/adapters";

const TIMEOUT_MS = 2000;

interface PrinterStatusResult {
  id: string;
  name: string;
  protocol: string;
  status: PrinterState["status"];
  progress?: number;
  temperature?: PrinterState["temperature"];
  currentLayer?: number;
  totalLayers?: number;
  timeRemaining?: number;
  filename?: string;
  connected: boolean;
  error?: string;
}

async function fetchPrinterStatus(printer: {
  id: string;
  name: string;
  protocol: string;
  ipAddress: string | null;
  port: number | null;
  apiKey: string | null;
  accessToken: string | null;
  serialNumber: string | null;
}): Promise<PrinterStatusResult> {
  const base: PrinterStatusResult = {
    id: printer.id,
    name: printer.name,
    protocol: printer.protocol,
    status: "offline",
    connected: false,
  };

  if (!printer.ipAddress && printer.protocol !== "manual") {
    return { ...base, error: "No IP address configured" };
  }

  try {
    const adapter = createPrinterAdapter(printer.protocol as PrinterProtocol, {
      host: printer.ipAddress || "",
      port: printer.port ?? undefined,
      apiKey: printer.apiKey ?? undefined,
      accessToken: printer.accessToken ?? undefined,
      serialNumber: printer.serialNumber ?? undefined,
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      await adapter.connect();
      const state = await adapter.getStatus();
      clearTimeout(timeout);

      try {
        await adapter.disconnect();
      } catch {
        // Ignore disconnect errors
      }

      return {
        ...base,
        status: state.status,
        progress: state.progress,
        temperature: state.temperature,
        currentLayer: state.currentLayer,
        totalLayers: state.totalLayers,
        timeRemaining: state.timeRemaining,
        filename: state.filename,
        connected: true,
      };
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return {
      ...base,
      error: message.includes("abort") ? "Connection timed out" : message,
    };
  }
}

export async function GET() {
  try {
    const printers = await getPrinters();

    const results = await Promise.allSettled(
      printers.map((p) => fetchPrinterStatus(p))
    );

    const statuses: PrinterStatusResult[] = results.map((result, i) => {
      if (result.status === "fulfilled") {
        return result.value;
      }
      return {
        id: printers[i].id,
        name: printers[i].name,
        protocol: printers[i].protocol,
        status: "offline" as const,
        connected: false,
        error: result.reason?.message || "Failed to fetch status",
      };
    });

    return NextResponse.json({
      printers: statuses,
      timestamp: new Date().toISOString(),
      count: statuses.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
