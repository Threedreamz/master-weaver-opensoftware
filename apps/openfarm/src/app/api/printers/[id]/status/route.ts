import { NextRequest, NextResponse } from "next/server";
import { getPrinterById } from "@/db/queries/printers";
import { createPrinterAdapter, type PrinterProtocol } from "@/lib/adapters";

const TIMEOUT_MS = 2000;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const printer = await getPrinterById(id);

    if (!printer) {
      return NextResponse.json(
        { error: "Printer not found" },
        { status: 404 }
      );
    }

    if (!printer.ipAddress && printer.protocol !== "manual") {
      return NextResponse.json({
        id: printer.id,
        name: printer.name,
        protocol: printer.protocol,
        status: "offline",
        connected: false,
        error: "No IP address configured",
      });
    }

    const adapter = createPrinterAdapter(printer.protocol as PrinterProtocol, {
      host: printer.ipAddress || "",
      port: printer.port ?? undefined,
      apiKey: printer.apiKey ?? undefined,
      accessToken: printer.accessToken ?? undefined,
      serialNumber: printer.serialNumber ?? undefined,
    });

    const timeout = setTimeout(() => {
      // If adapter supports cancellation, trigger it here
    }, TIMEOUT_MS);

    try {
      await adapter.connect();
      const [state, progress] = await Promise.all([
        adapter.getStatus(),
        adapter.getProgress().catch(() => null),
      ]);
      clearTimeout(timeout);

      try {
        await adapter.disconnect();
      } catch {
        // Ignore disconnect errors
      }

      return NextResponse.json({
        id: printer.id,
        name: printer.name,
        make: printer.make,
        model: printer.model,
        protocol: printer.protocol,
        technology: printer.technology,
        status: state.status,
        connected: true,
        temperature: state.temperature,
        currentLayer: state.currentLayer ?? progress?.currentLayer,
        totalLayers: state.totalLayers ?? progress?.totalLayers,
        timeRemaining: state.timeRemaining ?? progress?.timeRemaining,
        timeElapsed: progress?.timeElapsed,
        filename: state.filename,
        progress: state.progress ?? progress?.percent,
        buildVolume: {
          x: printer.buildVolumeX,
          y: printer.buildVolumeY,
          z: printer.buildVolumeZ,
        },
        nozzleDiameter: printer.nozzleDiameter,
        hasHeatedBed: printer.hasHeatedBed,
        hasEnclosure: printer.hasEnclosure,
        lastSeenAt: printer.lastSeenAt?.toISOString(),
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
