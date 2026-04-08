export {
  generateGridInfill,
  generateGyroidCrossSection,
  generateHoneycombInfill,
  type Point2D,
  type Path,
} from "./infill-patterns";

export {
  fitArcOverhangs,
  type ArcSegment,
  type LinearSegment,
  type OverhangSegment,
} from "./arc-overhangs";

export {
  calculateAdaptiveLayers,
  desiredLayerHeight,
  triangleSurfaceAngle,
  type AdaptiveLayerConfig,
  type AdaptiveLayer,
  type Triangle,
} from "./adaptive-layers";

export {
  chooseSeamPosition,
  type PerimeterLoop,
  type SeamResult,
} from "./seam-optimization";

export {
  detectOverhangPoints,
  generateTreeSupports,
  createDefaultSupportConfig,
  type SupportConfig,
  type SupportBranch,
  type SupportTree,
  type MeshTriangle,
  type Point3D,
} from "./support-generation";
