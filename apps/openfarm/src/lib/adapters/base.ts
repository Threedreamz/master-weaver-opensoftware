export interface PrinterState {
  status: "online" | "offline" | "printing" | "paused" | "error" | "maintenance";
  temperature?: {
    hotend?: number;
    bed?: number;
    chamber?: number;
  };
  progress?: number;
  currentLayer?: number;
  totalLayers?: number;
  timeRemaining?: number;
  filename?: string;
}

export interface PrintProgress {
  percent: number;
  currentLayer?: number;
  totalLayers?: number;
  timeElapsed?: number;
  timeRemaining?: number;
}

export interface PrinterAdapter {
  readonly protocol: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getStatus(): Promise<PrinterState>;
  uploadFile(filePath: string, filename: string): Promise<string>;
  startPrint(fileRef: string): Promise<void>;
  pausePrint(): Promise<void>;
  resumePrint(): Promise<void>;
  cancelPrint(): Promise<void>;
  getProgress(): Promise<PrintProgress>;
}

export interface PrinterAdapterConfig {
  host: string;
  port?: number;
  apiKey?: string;
  accessToken?: string;
  serialNumber?: string;
}

export class PrinterConnectionError extends Error {
  constructor(message: string, public readonly protocol: string) {
    super(message);
    this.name = "PrinterConnectionError";
  }
}
