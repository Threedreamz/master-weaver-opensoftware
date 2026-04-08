import type { PrinterAdapter, PrinterAdapterConfig, PrinterState, PrintProgress } from "./base";
import { PrinterConnectionError } from "./base";

/**
 * OctoPrint adapter for legacy FDM printers.
 * REST API: http://{host}:{port}/api/...
 * Auth via X-Api-Key header
 */
export class OctoPrintAdapter implements PrinterAdapter {
  readonly protocol = "octoprint";
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(private config: PrinterAdapterConfig) {
    const port = config.port || 80;
    this.baseUrl = `http://${config.host}:${port}`;
    this.headers = {
      "X-Api-Key": config.apiKey || "",
      "Content-Type": "application/json",
    };
  }

  async connect(): Promise<void> {
    try {
      const res = await fetch(`${this.baseUrl}/api/version`, { headers: this.headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      throw new PrinterConnectionError(
        `Cannot connect to OctoPrint at ${this.baseUrl}: ${err}`,
        this.protocol
      );
    }
  }

  async disconnect(): Promise<void> {}

  async getStatus(): Promise<PrinterState> {
    const res = await fetch(`${this.baseUrl}/api/printer`, { headers: this.headers });
    if (res.status === 409) return { status: "offline" };
    if (!res.ok) throw new PrinterConnectionError(`Status query failed: HTTP ${res.status}`, this.protocol);

    const data = await res.json();
    const flags = data.state?.flags ?? {};

    let status: PrinterState["status"] = "online";
    if (flags.printing) status = "printing";
    else if (flags.paused || flags.pausing) status = "paused";
    else if (flags.error) status = "error";
    else if (!flags.operational) status = "offline";

    return {
      status,
      temperature: {
        hotend: data.temperature?.tool0?.actual,
        bed: data.temperature?.bed?.actual,
      },
    };
  }

  async uploadFile(filePath: string, filename: string): Promise<string> {
    const fileBuffer = await (await import("fs/promises")).readFile(filePath);
    const formData = new FormData();
    formData.append("file", new Blob([fileBuffer]), filename);
    formData.append("select", "false");
    formData.append("print", "false");

    const res = await fetch(`${this.baseUrl}/api/files/local`, {
      method: "POST",
      headers: { "X-Api-Key": this.config.apiKey || "" },
      body: formData,
    });
    if (!res.ok) throw new PrinterConnectionError(`Upload failed: HTTP ${res.status}`, this.protocol);

    const data = await res.json();
    return data.files?.local?.name ?? filename;
  }

  async startPrint(fileRef: string): Promise<void> {
    await fetch(`${this.baseUrl}/api/files/local/${fileRef}`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ command: "select", print: true }),
    });
  }

  async pausePrint(): Promise<void> {
    await fetch(`${this.baseUrl}/api/job`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ command: "pause", action: "pause" }),
    });
  }

  async resumePrint(): Promise<void> {
    await fetch(`${this.baseUrl}/api/job`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ command: "pause", action: "resume" }),
    });
  }

  async cancelPrint(): Promise<void> {
    await fetch(`${this.baseUrl}/api/job`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ command: "cancel" }),
    });
  }

  async getProgress(): Promise<PrintProgress> {
    const res = await fetch(`${this.baseUrl}/api/job`, { headers: this.headers });
    if (!res.ok) return { percent: 0 };
    const data = await res.json();
    return {
      percent: Math.round((data.progress?.completion ?? 0)),
      timeElapsed: data.progress?.printTime,
      timeRemaining: data.progress?.printTimeLeft,
    };
  }
}
