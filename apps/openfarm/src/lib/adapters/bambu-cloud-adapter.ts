import type { PrinterAdapter, PrinterAdapterConfig, PrinterState, PrintProgress } from "./base";
import { PrinterConnectionError } from "./base";

const BAMBU_API = "https://bambulab.com";
const BAMBU_IOT_API = "https://api.bambulab.com";

/**
 * Bambu Lab Cloud adapter.
 * Uses the Bambu Cloud HTTP API to fetch device info and status.
 * Auth: email + password → JWT token (stored in settings)
 * The accessToken field on the printer holds the Bambu JWT token.
 *
 * API docs (community-documented):
 * - Login: POST https://bambulab.com/api/sign-in/form
 * - Devices: GET https://api.bambulab.com/v1/iot-service/api/user/device
 * - Device status: included in device list response
 */

export interface BambuDevice {
  dev_id: string;             // Serial number (e.g. "00M00A123456789")
  name: string;               // User-given name
  dev_product_name: string;   // "X1C", "P1S", "A1 Mini", etc.
  dev_access_code?: string;   // LAN access code
  online?: boolean;
  print_status?: string;      // "RUNNING", "PAUSE", "FINISH", "IDLE", "FAILED"
  nozzle_diameter?: number;
  dev_model_name?: string;
  cover_img_url?: string;
  has_ams?: boolean;
}

interface BambuDeviceListResponse {
  devices?: BambuDevice[];
  message?: {
    devices?: BambuDevice[];
  };
}

export async function bambuLogin(email: string, password: string): Promise<string> {
  const res = await fetch(`${BAMBU_API}/api/sign-in/form`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ account: email, password }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Bambu Cloud login failed (${res.status}): ${text}`);
  }

  const data = await res.json() as { token?: string; refreshToken?: string; success?: boolean };
  if (!data.token) {
    throw new Error("Bambu Cloud login: no token returned. Check credentials.");
  }
  return data.token;
}

export async function bambuListDevices(token: string): Promise<BambuDevice[]> {
  const res = await fetch(`${BAMBU_IOT_API}/v1/iot-service/api/user/device`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch Bambu devices (${res.status})`);
  }

  const data = await res.json() as BambuDeviceListResponse;
  return data.devices ?? data.message?.devices ?? [];
}

function mapBambuStatus(printStatus?: string, online?: boolean): PrinterState["status"] {
  if (!online) return "offline";
  switch (printStatus?.toUpperCase()) {
    case "RUNNING": return "printing";
    case "PAUSE":   return "paused";
    case "FAILED":  return "error";
    case "FINISH":
    case "IDLE":
    default:        return "online";
  }
}

export class BambuCloudAdapter implements PrinterAdapter {
  readonly protocol = "bambu_cloud";
  private deviceData: BambuDevice | null = null;

  constructor(private config: PrinterAdapterConfig) {
    if (!config.accessToken) {
      throw new PrinterConnectionError(
        "Bambu Cloud JWT token required (accessToken field). Log in via Settings → Bambu Cloud.",
        this.protocol
      );
    }
    if (!config.serialNumber) {
      throw new PrinterConnectionError(
        "Bambu serial number required (serialNumber field).",
        this.protocol
      );
    }
  }

  async connect(): Promise<void> {
    const devices = await bambuListDevices(this.config.accessToken!);
    this.deviceData = devices.find((d) => d.dev_id === this.config.serialNumber) ?? null;

    if (!this.deviceData) {
      throw new PrinterConnectionError(
        `Printer with serial ${this.config.serialNumber} not found in Bambu Cloud account.`,
        this.protocol
      );
    }
  }

  async disconnect(): Promise<void> {
    this.deviceData = null;
  }

  async getStatus(): Promise<PrinterState> {
    if (!this.deviceData) {
      return { status: "offline" };
    }

    const status = mapBambuStatus(this.deviceData.print_status, this.deviceData.online);
    return {
      status,
      filename: undefined,
      progress: undefined,
      currentLayer: undefined,
      totalLayers: undefined,
      timeRemaining: undefined,
      temperature: undefined,
    };
  }

  async getProgress(): Promise<PrintProgress> {
    return { percent: 0 };
  }

  async uploadFile(_filePath: string, filename: string): Promise<string> {
    // Cloud mode: upload via Bambu Cloud API (future implementation)
    // For now returns placeholder — use LAN FTPS for actual uploads
    return `/cache/${filename}`;
  }

  async startPrint(_fileRef: string): Promise<void> {
    // Cloud mode: publish via cloud MQTT (future: mqtt package)
    throw new Error("Cloud print dispatch not yet implemented. Use LAN mode for print control.");
  }

  async pausePrint(): Promise<void> {
    throw new Error("Cloud print control not yet implemented. Use LAN mode.");
  }

  async resumePrint(): Promise<void> {
    throw new Error("Cloud print control not yet implemented. Use LAN mode.");
  }

  async cancelPrint(): Promise<void> {
    throw new Error("Cloud print control not yet implemented. Use LAN mode.");
  }
}
