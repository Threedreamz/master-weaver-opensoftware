import type { PrinterAdapter, PrinterAdapterConfig, PrinterState, PrintProgress } from "./base";
import { PrinterConnectionError } from "./base";

/**
 * Moonraker adapter for Klipper-based FDM printers.
 * REST API: http://{host}:{port}/api/...
 * WebSocket: ws://{host}:{port}/websocket (JSON-RPC 2.0)
 */
export class MoonrakerAdapter implements PrinterAdapter {
  readonly protocol = "moonraker";
  private baseUrl: string;

  constructor(private config: PrinterAdapterConfig) {
    const port = config.port || 7125;
    this.baseUrl = `http://${config.host}:${port}`;
  }

  async connect(): Promise<void> {
    try {
      const res = await fetch(`${this.baseUrl}/server/info`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      throw new PrinterConnectionError(
        `Cannot connect to Moonraker at ${this.baseUrl}: ${err}`,
        this.protocol
      );
    }
  }

  async disconnect(): Promise<void> {
    // REST-based, no persistent connection to close
  }

  async getStatus(): Promise<PrinterState> {
    const res = await fetch(
      `${this.baseUrl}/printer/objects/query?print_stats&display_status&heater_bed&extruder`
    );
    if (!res.ok) throw new PrinterConnectionError(`Status query failed: HTTP ${res.status}`, this.protocol);

    const data = await res.json();
    const printStats = data.result?.status?.print_stats ?? {};
    const extruder = data.result?.status?.extruder ?? {};
    const bed = data.result?.status?.heater_bed ?? {};
    const display = data.result?.status?.display_status ?? {};

    const statusMap: Record<string, PrinterState["status"]> = {
      standby: "online",
      printing: "printing",
      paused: "paused",
      error: "error",
      complete: "online",
    };

    return {
      status: statusMap[printStats.state] ?? "offline",
      temperature: {
        hotend: extruder.temperature,
        bed: bed.temperature,
      },
      progress: display.progress ? Math.round(display.progress * 100) : undefined,
      filename: printStats.filename || undefined,
    };
  }

  async uploadFile(filePath: string, filename: string): Promise<string> {
    const fileBuffer = await (await import("fs/promises")).readFile(filePath);
    const formData = new FormData();
    formData.append("file", new Blob([fileBuffer]), filename);
    formData.append("root", "gcodes");

    const res = await fetch(`${this.baseUrl}/server/files/upload`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new PrinterConnectionError(`Upload failed: HTTP ${res.status}`, this.protocol);

    const data = await res.json();
    return data.result?.item?.path ?? filename;
  }

  async startPrint(fileRef: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/printer/print/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: fileRef }),
    });
    if (!res.ok) throw new PrinterConnectionError(`Start print failed: HTTP ${res.status}`, this.protocol);
  }

  async pausePrint(): Promise<void> {
    await fetch(`${this.baseUrl}/printer/print/pause`, { method: "POST" });
  }

  async resumePrint(): Promise<void> {
    await fetch(`${this.baseUrl}/printer/print/resume`, { method: "POST" });
  }

  async cancelPrint(): Promise<void> {
    await fetch(`${this.baseUrl}/printer/print/cancel`, { method: "POST" });
  }

  async getProgress(): Promise<PrintProgress> {
    const status = await this.getStatus();
    return {
      percent: status.progress ?? 0,
      timeRemaining: status.timeRemaining,
    };
  }
}
