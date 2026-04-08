import type { PrinterAdapter, PrinterAdapterConfig, PrinterState, PrintProgress } from "./base";
import { PrinterConnectionError } from "./base";

/**
 * Bambu Lab adapter for X1C, P1S, A1 printers.
 * Communication via MQTT over TLS (port 8883).
 * Based on OpenBambuAPI documentation.
 *
 * MQTT Topics:
 * - device/{serial}/report — Status updates (subscribe)
 * - device/{serial}/request — Commands (publish)
 *
 * Auth: username "bblp", password = LAN access code
 * FTP: ftps://{ip}:990 for G-code upload
 */
export class BambuAdapter implements PrinterAdapter {
  readonly protocol = "bambu_mqtt";
  private lastState: PrinterState = { status: "offline" };

  constructor(private config: PrinterAdapterConfig) {
    if (!config.accessToken) {
      throw new PrinterConnectionError("Bambu Lab LAN access code required", this.protocol);
    }
    if (!config.serialNumber) {
      throw new PrinterConnectionError("Bambu Lab serial number required", this.protocol);
    }
  }

  async connect(): Promise<void> {
    // In production: establish MQTT connection
    // mqtt.connect(`mqtts://${this.config.host}:8883`, {
    //   username: "bblp",
    //   password: this.config.accessToken,
    //   rejectUnauthorized: false,
    // });
    // Subscribe to: `device/${this.config.serialNumber}/report`
    this.lastState = { status: "online" };
  }

  async disconnect(): Promise<void> {
    // Close MQTT connection
    this.lastState = { status: "offline" };
  }

  async getStatus(): Promise<PrinterState> {
    // In production: read from MQTT message cache
    // The report topic sends JSON with:
    // - print.gcode_state: RUNNING, PAUSE, FINISH, FAILED, IDLE
    // - print.mc_percent: progress 0-100
    // - print.mc_remaining_time: minutes remaining
    // - print.layer_num / print.total_layer_num
    // - temperature: nozzle_temper, bed_temper, chamber_temper
    return this.lastState;
  }

  async uploadFile(filePath: string, filename: string): Promise<string> {
    // In production: upload via FTPS
    // const client = new ftp.Client();
    // await client.access({
    //   host: this.config.host,
    //   port: 990,
    //   user: "bblp",
    //   password: this.config.accessToken,
    //   secure: true,
    //   secureOptions: { rejectUnauthorized: false },
    // });
    // await client.uploadFrom(filePath, `/cache/${filename}`);
    // await client.close();
    return `/cache/${filename}`;
  }

  async startPrint(fileRef: string): Promise<void> {
    // In production: publish MQTT command
    // const cmd = {
    //   print: {
    //     command: "project_file",
    //     param: `Metadata/plate_1.gcode`,
    //     subtask_name: fileRef,
    //     url: `ftp://${fileRef}`,
    //     use_ams: false,
    //   }
    // };
    // mqttClient.publish(`device/${this.config.serialNumber}/request`, JSON.stringify(cmd));
  }

  async pausePrint(): Promise<void> {
    // MQTT: { "print": { "command": "pause" } }
  }

  async resumePrint(): Promise<void> {
    // MQTT: { "print": { "command": "resume" } }
  }

  async cancelPrint(): Promise<void> {
    // MQTT: { "print": { "command": "stop" } }
  }

  async getProgress(): Promise<PrintProgress> {
    const state = await this.getStatus();
    return {
      percent: state.progress ?? 0,
      currentLayer: state.currentLayer,
      totalLayers: state.totalLayers,
      timeRemaining: state.timeRemaining,
    };
  }
}
