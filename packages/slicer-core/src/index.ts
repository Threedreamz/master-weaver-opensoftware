// Types
export type { PrintTechnology, SlicerEngine, SlicerConfig, SliceRequest, SliceResult } from "./types";

// Parsers
export { parseSTL, parseOBJ, parse3MF, parseOpenSCAD, parseModel, extractParameters, applyParameters, isOpenSCADInstalled } from "./parsers";
// parseSTEP is lazy-loaded via parseModel("step") to avoid loading 63MB WASM at startup
export type { ScadParameter } from "./parsers";

// Mesh Analysis
export type { Triangle, MeshData, MeshMetrics, FeasibilityIssue, FeasibilityVerdict } from "./mesh-analyzer";
export { computeMeshMetrics } from "./mesh-analyzer";

// Feasibility
export type { FeasibilityResult } from "./feasibility-engine";
export { checkFeasibility, checkAllTechnologies } from "./feasibility-engine";

// Orientation
export type { OrientationCandidate, OrientationOptions } from "./orientation-engine";
export { computeOrientations } from "./orientation-engine";

// Bin Packing
export type { PackingItem, PackedItem, PackingResult, PackingOptions } from "./bin-packing-3d";
export { pack3D, estimateSLSPrintTime, estimateMaterialCost } from "./bin-packing-3d";

// Slicers
export type { Slicer, SlicerOptions, SlicerResult } from "./slicers/base-slicer";
export { createSlicer, InternalSlicer } from "./slicers";
export type { InternalSlicerProfile } from "./slicers";

// G-code
export type { GcodeMetadata } from "./gcode/parser";
export { parseGcodeMetadata } from "./gcode/parser";
export type { ToolpathSegment, ToolpathData, MoveType } from "./gcode/visualizer";
export { parseGcodeToolpath } from "./gcode/visualizer";

// Resin (SLA/LCD/DLP) slicing
export * from "./resin/index";

// Infill Patterns
export type { InfillBounds, InfillPath, InfillPattern } from "./infill";
export { generateInfill, generateRectilinearInfill, generateGridInfill, generateTrianglesInfill, generateHoneycombInfill, generateGyroidInfill, generateCubicInfill } from "./infill";

// Tree Supports
export type { TreeSupportConfig, TreeSupportLayer, TreeSupportResult } from "./supports";
export { generateTreeSupport } from "./supports";

// Support Interface Layers
export type { SupportInterfaceConfig, SupportContactPoint, SupportInterfaceLayer } from "./supports";
export { generateInterfaceLayers } from "./supports";

// Thumbnail
export type { ThumbnailOptions } from "./thumbnail/generate-thumbnail";
export { generateThumbnailSvg, generateGcodeThumbnailBlock } from "./thumbnail/generate-thumbnail";

// Arc Overhang
export type { OverhangFace, OverhangZone, OverhangRecommendation, ArcOverhangOptions, ArcOverhangResult, ArcPath, ArcSegment } from "./arc-overhang";
export { analyzeOverhangs, detectOverhangs, classifyOverhangZones, generateArcPaths, getOverhangRecommendation } from "./arc-overhang";
