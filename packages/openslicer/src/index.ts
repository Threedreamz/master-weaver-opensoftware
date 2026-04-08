// Types — SLA (Resin)
export type {
  SliceConfig,
  ResinPrinterProfile,
  OutputFormat,
  LayerData,
  SliceResult,
  BoundingBox,
  MeshInfo,
} from "./types";

// Types — FDM
export type {
  FDMPrinterProfile,
  MultiMaterialSystem,
  SlicerBackend,
  FDMSliceConfig,
  InfillPattern,
  SupportType,
  SeamPosition,
  FilamentAssignment,
  SliceOutput,
  ThreeMFMaterial,
  ThreeMFModel,
  ThreeMFAssembly,
  PrinterProfile,
} from "./types";
export { isFDMProfile } from "./types";

// Slicer Engine
export {
  calculateLayerCount,
  getLayerZHeight,
  getLayerExposure,
  calculateBoundingBox,
  estimatePrintTime,
  estimateVolume,
  createDefaultConfig,
} from "./slicer-engine";

// Slicer CLI (FDM)
export { SlicerCLI, type SlicerDetectionResult } from "./slicer-cli";

// Anti-Aliasing
export {
  applyAntiAliasing,
  detectEdges,
} from "./anti-aliasing";

// Formats
export {
  generateSL1Config,
  getLayerFilename,
  type SL1Config,
  generateContentTypes,
  generateRelationships,
  generateModelXML,
  generateThreeMFFiles,
  parseGCodeLine,
  parseGCode,
  getFilamentPerLayer,
  type GCodeCommand,
  type GCodeLayer,
  type GCodeAnalysis,
} from "./formats";

// Printer Profiles — SLA
export {
  ELEGOO_MARS_3,
  ELEGOO_SATURN_3,
  ANYCUBIC_PHOTON_MONO_X2,
  PRUSA_SL1S,
  BUILTIN_PROFILES,
  getProfileById,
} from "./printer-profiles";

// Printer Profiles — FDM
export {
  BAMBU_X1C,
  BAMBU_P1S,
  BAMBU_A1,
  PRUSA_MK4_MMU3,
  PRUSA_XL,
  GENERIC_KLIPPER,
  FDM_PROFILES,
  getFDMProfileById,
} from "./printer-profiles";

// Algorithms (FDM)
export {
  generateGridInfill,
  generateGyroidCrossSection,
  generateHoneycombInfill,
  fitArcOverhangs,
  calculateAdaptiveLayers,
  desiredLayerHeight,
  triangleSurfaceAngle,
  chooseSeamPosition,
  detectOverhangPoints,
  generateTreeSupports,
  createDefaultSupportConfig,
  type Point2D,
  type Path,
  type ArcSegment,
  type LinearSegment,
  type OverhangSegment,
  type AdaptiveLayerConfig,
  type AdaptiveLayer,
  type Triangle,
  type PerimeterLoop,
  type SeamResult,
  type SupportConfig,
  type SupportBranch,
  type SupportTree,
  type MeshTriangle,
  type Point3D,
} from "./algorithms";
