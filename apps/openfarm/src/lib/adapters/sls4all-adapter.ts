import type { PrinterAdapter, PrinterAdapterConfig, PrinterState, PrintProgress } from "./base";
import { PrinterConnectionError } from "./base";

/**
 * SLS4All.Compact adapter for SLS printers.
 * Web API on port 5000.
 */
export class SLS4AllAdapter implements PrinterAdapter {
  readonly protocol = "sls4all";
  private baseUrl: string;

  constructor(config: PrinterAdapterConfig) {
    const port = config.port || 5000;
    this.baseUrl = `http://${config.host}:${port}`;
  }

  async connect(): Promise<void> {
    try {
      const res = await fetch(`${this.baseUrl}/api/status`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      throw new PrinterConnectionError(
        `Cannot connect to SLS4All at ${this.baseUrl}: ${err}`,
        this.protocol
      );
    }
  }

  async disconnect(): Promise<void> {}

  async getStatus(): Promise<PrinterState> {
    try {
      const res = await fetch(`${this.baseUrl}/api/status`);
      if (!res.ok) return { status: "offline" };
      const data = await res.json();
      return {
        status: data.state === "printing" ? "printing" : "online",
        temperature: { chamber: data.chamber_temp },
        progress: data.progress,
      };
    } catch {
      return { status: "offline" };
    }
  }

  async uploadFile(_filePath: string, _filename: string): Promise<string> {
    return "sls-upload-pending";
  }

  async startPrint(_fileRef: string): Promise<void> {}
  async pausePrint(): Promise<void> {}
  async resumePrint(): Promise<void> {}
  async cancelPrint(): Promise<void> {}

  async getProgress(): Promise<PrintProgress> {
    const state = await this.getStatus();
    return { percent: state.progress ?? 0 };
  }
}
