/** Configuration for a resin (SLA/LCD/DLP) slice job */
export interface SliceConfig {
  /** Layer height in mm (typically 0.025 - 0.1 for resin) */
  layerHeight: number;
  /** Bottom layer count (typically 4-8) */
  bottomLayers: number;
  /** Normal exposure time in seconds */
  exposureTime: number;
  /** Bottom layer exposure time in seconds */
  bottomExposureTime: number;
  /** Lift height in mm after each layer */
  liftHeight: number;
  /** Lift speed in mm/min */
  liftSpeed: number;
  /** Retract speed in mm/min */
  retractSpeed: number;
  /** Anti-aliasing level (1 = off, 2-8 = levels) */
  antiAliasingLevel: number;
  /** Whether to hollow the model */
  hollow: boolean;
  /** Wall thickness for hollowing in mm */
  hollowWallThickness?: number;
  /** Whether to generate supports */
  generateSupports: boolean;
}

/** Printer profile for LCD/DLP resin printers */
export interface ResinPrinterProfile {
  id: string;
  name: string;
  manufacturer: string;
  /** Display resolution X in pixels */
  resolutionX: number;
  /** Display resolution Y in pixels */
  resolutionY: number;
  /** Physical display width in mm */
  displayWidth: number;
  /** Physical display height in mm */
  displayHeight: number;
  /** Maximum build height in mm */
  buildHeight: number;
  /** Pixel size in mm (derived: displayWidth / resolutionX) */
  pixelSize: number;
  /** Whether the display is mirrored */
  mirrorX: boolean;
  mirrorY: boolean;
  /** Output file format */
  outputFormat: OutputFormat;
}

export type OutputFormat = "sl1" | "ctb" | "cbddlp" | "goo" | "png_zip";

/** Data for a single sliced layer */
export interface LayerData {
  /** Layer index (0-based) */
  index: number;
  /** Z height in mm */
  zHeight: number;
  /** Exposure time for this layer in seconds */
  exposureTime: number;
  /** Layer image as PNG buffer */
  imageData: Uint8Array;
  /** Width of the layer image */
  width: number;
  /** Height of the layer image */
  height: number;
}

/** Result of a complete resin slice operation */
export interface ResinSliceResult {
  success: boolean;
  /** Total number of layers */
  layerCount: number;
  /** Estimated print time in seconds */
  estimatedPrintTime: number;
  /** Estimated resin volume in ml */
  estimatedVolumeMl: number;
  /** Layers data */
  layers: LayerData[];
  /** Output file as binary (for download) */
  outputFile?: Uint8Array;
  /** Output format used */
  outputFormat: OutputFormat;
  /** Errors if any */
  errors?: string[];
}

/** Mesh bounding box */
export interface BoundingBox {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
}

/** Mesh metadata */
export interface MeshInfo {
  triangleCount: number;
  boundingBox: BoundingBox;
  volumeCm3: number;
  isManifold: boolean;
}
