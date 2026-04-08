import type { PrinterAdapter, PrinterAdapterConfig, PrinterState, PrintProgress } from "./base";
import { PrinterConnectionError } from "./base";

/**
 * Formlabs PreFormServer Local API adapter.
 * REST API on port 44388.
 * Used for SLA slicing + printer control via PreForm.
 */
export class FormlabsLocalAdapter implements PrinterAdapter {
  readonly protocol = "formlabs_local";
  private baseUrl: string;

  constructor(config: PrinterAdapterConfig) {
    const port = config.port || 44388;
    this.baseUrl = `http://${config.host}:${port}`;
  }

  async connect(): Promise<void> {
    try {
      const res = await fetch(`${this.baseUrl}/api-version/`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      throw new PrinterConnectionError(
        `Cannot connect to PreFormServer at ${this.baseUrl}: ${err}`,
        this.protocol
      );
    }
  }

  async disconnect(): Promise<void> {}

  async getStatus(): Promise<PrinterState> {
    try {
      const res = await fetch(`${this.baseUrl}/devices/`);
      if (!res.ok) return { status: "offline" };
      const data = await res.json();
      const devices = data.devices ?? [];
      if (devices.length === 0) return { status: "offline" };

      const device = devices[0];
      const statusMap: Record<string, PrinterState["status"]> = {
        idle: "online",
        printing: "printing",
        paused: "paused",
        error: "error",
      };

      return {
        status: statusMap[device.status] ?? "online",
        progress: device.print_progress ? Math.round(device.print_progress * 100) : undefined,
      };
    } catch {
      return { status: "offline" };
    }
  }

  async uploadFile(_filePath: string, _filename: string): Promise<string> {
    // Formlabs uses scenes, not direct file upload
    // 1. POST /scene/ to create scene
    // 2. POST /scene/{id}/import-model/ to load STL
    // 3. POST /scene/{id}/auto-orient/
    // 4. POST /scene/{id}/auto-support/
    // 5. POST /scene/{id}/auto-layout/
    return "scene-pending";
  }

  async startPrint(fileRef: string): Promise<void> {
    // POST /print/ with scene reference
    await fetch(`${this.baseUrl}/print/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scene: fileRef }),
    });
  }

  async pausePrint(): Promise<void> {
    // PreFormServer doesn't support remote pause
  }

  async resumePrint(): Promise<void> {
    // PreFormServer doesn't support remote resume
  }

  async cancelPrint(): Promise<void> {
    // PreFormServer doesn't support remote cancel
  }

  async getProgress(): Promise<PrintProgress> {
    const state = await this.getStatus();
    return { percent: state.progress ?? 0 };
  }
}
