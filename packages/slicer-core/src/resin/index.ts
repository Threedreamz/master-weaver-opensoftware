// Resin (SLA/LCD/DLP) slicing types
export type {
  SliceConfig,
  ResinPrinterProfile,
  OutputFormat,
  LayerData,
  ResinSliceResult,
  BoundingBox,
  MeshInfo,
} from "./types";

// Slicer Engine
export {
  calculateLayerCount,
  getLayerZHeight,
  getLayerExposure,
  calculateBoundingBox,
  estimatePrintTime,
  estimateVolume,
  createDefaultConfig,
  type SlicerEngineOptions,
} from "./slicer-engine";

// Anti-Aliasing
export { applyAntiAliasing, detectEdges } from "./anti-aliasing";

// Formats
export { generateSL1Config, getLayerFilename } from "./formats/index";
export type { SL1Config } from "./formats/index";

// Printer Profiles
export {
  ELEGOO_MARS_3,
  ELEGOO_SATURN_3,
  ANYCUBIC_PHOTON_MONO_X2,
  PRUSA_SL1S,
  BUILTIN_PROFILES,
  getProfileById,
} from "./printer-profiles/index";
