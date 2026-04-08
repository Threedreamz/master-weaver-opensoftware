export type PrintTechnology = "fdm" | "sla" | "sls";

export type SlicerEngine =
  | "prusaslicer" | "orcaslicer" | "bambu_studio"
  | "preform" | "chitubox" | "lychee" | "sls4all" | "custom";

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
