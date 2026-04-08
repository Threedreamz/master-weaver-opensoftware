import type { PrinterAdapter, PrinterAdapterConfig, PrinterState, PrintProgress } from "./base";
import { PrinterConnectionError } from "./base";

/**
 * Formlabs Web API adapter for remote fleet monitoring.
 * OAuth2 authenticated REST API.
 */
export class FormlabsCloudAdapter implements PrinterAdapter {
  readonly protocol = "formlabs_cloud";
  private baseUrl = "https://api.formlabs.com/developer/v1";
  private token: string;

  constructor(config: PrinterAdapterConfig) {
    this.token = config.accessToken || "";
    if (!this.token) {
      throw new PrinterConnectionError("Formlabs Web API token required", this.protocol);
    }
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
    };
  }

  async connect(): Promise<void> {
    const res = await fetch(`${this.baseUrl}/printers/`, { headers: this.headers });
    if (!res.ok) throw new PrinterConnectionError(`Formlabs Cloud auth failed: HTTP ${res.status}`, this.protocol);
  }

  async disconnect(): Promise<void> {}

  async getStatus(): Promise<PrinterState> {
    const res = await fetch(`${this.baseUrl}/printers/`, { headers: this.headers });
    if (!res.ok) return { status: "offline" };
    const data = await res.json();
    if (!data.results?.length) return { status: "offline" };
    const printer = data.results[0];
    return {
      status: printer.is_connected ? "online" : "offline",
      progress: printer.current_print?.progress ? Math.round(printer.current_print.progress * 100) : undefined,
    };
  }

  async uploadFile(_filePath: string, _filename: string): Promise<string> {
    return "cloud-upload-pending";
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
