// ==================== Technology Types ====================

export type PrintTechnology = "fdm" | "sla" | "sls";

export type PrinterProtocol =
  | "moonraker"
  | "octoprint"
  | "bambu_mqtt"
  | "bambu_cloud"
  | "formlabs_local"
  | "formlabs_cloud"
  | "sls4all"
  | "manual";

export type PrinterStatus = "online" | "offline" | "printing" | "paused" | "error" | "maintenance";

export type JobStatus =
  | "queued"
  | "slicing"
  | "post_processing"
  | "ready"
  | "sending"
  | "printing"
  | "paused"
  | "washing"       // SLA
  | "curing"        // SLA
  | "cooling"       // SLS
  | "depowdering"   // SLS
  | "completed"
  | "failed"
  | "cancelled";

export type BatchStatus = "pending" | "running" | "completed" | "partially_failed" | "failed" | "cancelled";

export type SlicerEngine =
  | "prusaslicer"
  | "orcaslicer"
  | "bambu_studio"
  | "preform"
  | "chitubox"
  | "lychee"
  | "sls4all"
  | "custom";

export type MaterialUnit = "g" | "ml" | "kg" | "l";

// ==================== Printer Types ====================

export interface PrinterState {
  status: PrinterStatus;
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

export interface PrinterConnection {
  protocol: PrinterProtocol;
  host: string;
  port?: number;
  apiKey?: string;
  accessToken?: string;
  serialNumber?: string;
}

// ==================== Batch Types ====================

export interface BatchParameterMatrix {
  technology: PrintTechnology;
  nozzleDiameters?: number[];
  layerHeights?: number[];
  infillDensities?: number[];
  materialIds?: string[];
  exposureTimes?: number[];
  liftSpeeds?: number[];
  laserPowers?: number[];
  scanSpeeds?: number[];
  profileIds?: string[];
  printerIds?: string[];
}

// ==================== Slicer Types ====================

export interface SlicerConfig {
  engine: SlicerEngine;
  executablePath: string;
  version?: string;
}

export interface SliceRequest {
  modelPath: string;
  profileId: string;
  outputDir: string;
  technology: PrintTechnology;
  overrides?: Record<string, string | number>;
}

export interface SliceResult {
  success: boolean;
  outputPath?: string;
  estimatedTime?: number;
  estimatedMaterial?: number;
  layerCount?: number;
  errors?: string[];
  stdout?: string;
  stderr?: string;
}

// ==================== Job Pipeline Types ====================

export interface JobTransition {
  from: JobStatus;
  to: JobStatus;
  technology: PrintTechnology | "all";
  action: string;
  automatic: boolean;
}
