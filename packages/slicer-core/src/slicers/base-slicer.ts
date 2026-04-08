export interface SlicerResult {
  success: boolean;
  outputPath?: string;
  estimatedTime?: number;
  estimatedMaterial?: number;
  filamentLengthMm?: number;
  layerCount?: number;
  errors?: string[];
  stdout?: string;
  stderr?: string;
}

export interface SlicerOptions {
  modelPath: string;
  outputDir: string;
  profilePath?: string;
  overrides?: Record<string, string | number>;
}

export interface Slicer {
  readonly name: string;
  readonly executable: string;
  isAvailable(): Promise<boolean>;
  slice(options: SlicerOptions): Promise<SlicerResult>;
}
