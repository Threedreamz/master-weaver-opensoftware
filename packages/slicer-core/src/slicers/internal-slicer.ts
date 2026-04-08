import { mkdirSync, writeFileSync } from "fs";
import type { Slicer, SlicerOptions, SlicerResult } from "./base-slicer";
import type { ArcOverhangResult, ArcPath } from "../arc-overhang";
import type { MeshData } from "../mesh-analyzer";
import type { InfillPattern } from "../infill/types";
import { generateInfill } from "../infill";
import { generateTreeSupport } from "../supports/tree-support";
import { generateGcodeThumbnailBlock } from "../thumbnail/generate-thumbnail";

/**
 * Internal basic G-code slicer.
 *
 * Generates layer-by-layer G-code without external tools by computing
 * rectangular perimeter paths from the model bounding box at each Z layer,
 * pattern-based infill (rectilinear, grid, triangles, honeycomb, gyroid, cubic),
 * optional tree or grid support structures, and optional arc overhang moves (G2/G3).
 *
 * G-code includes `;TYPE:` comments for enhanced viewer coloring:
 * - `;TYPE:Outer wall` — outermost perimeter
 * - `;TYPE:Inner wall` — inner perimeters
 * - `;TYPE:Internal infill` — infill paths
 * - `;TYPE:Support material` — support structures
 * - `;TYPE:Overhang perimeter` — arc overhang paths
 *
 * This is intentionally simple -- real slicing should use PrusaSlicer/OrcaSlicer CLI.
 */
export class InternalSlicer implements Slicer {
  readonly name = "OpenSlicer Internal";
  readonly executable = "internal";

  private overhangResult?: ArcOverhangResult;
  private meshData?: MeshData;
  private profileOverrides: InternalSlicerProfile = {};

  /** Provide overhang analysis for arc-aware G-code generation. */
  setOverhangData(result: ArcOverhangResult): void {
    this.overhangResult = result;
  }

  /** Provide parsed mesh data so we use actual bounding box. */
  setMeshData(mesh: MeshData): void {
    this.meshData = mesh;
  }

  /** Set profile parameters for G-code generation. */
  setProfile(profile: InternalSlicerProfile): void {
    this.profileOverrides = profile;
  }

  async isAvailable(): Promise<boolean> {
    return true; // always available
  }

  async slice(options: SlicerOptions): Promise<SlicerResult> {
    try {
      // Resolve profile
      const p = resolveProfile(this.profileOverrides, options.overrides);

      // Spiral vase mode overrides: force 1 wall, 0 infill, 0 top layers
      if (p.spiralVaseMode) {
        p.wallCount = 1;
        p.infillDensity = 0;
      }

      // Determine bounding box from mesh data or fall back to defaults
      const bb = this.meshData?.boundingBox ?? {
        min: [0, 0, 0] as [number, number, number],
        max: [30, 30, 20] as [number, number, number],
      };

      const modelName =
        options.modelPath.split("/").pop()?.replace(/\.\w+$/, "") ?? "model";

      const totalLayers = Math.ceil(
        (bb.max[2] - bb.min[2]) / p.layerHeight,
      );

      // Generate G-code
      const gcodeResult = generateGcode(modelName, bb, p, totalLayers, this.overhangResult, this.meshData);
      const gcode = gcodeResult.gcode;

      // Compute metadata from actual G-code generation
      const { estimatedTime, estimatedMaterial, filamentLengthMm } = computeActualMetadata(
        gcodeResult.finalE,
        gcodeResult.featureDistances,
        p,
      );

      // Write output
      const outputName =
        options.modelPath
          .split("/")
          .pop()
          ?.replace(/\.\w+$/, "") + ".gcode";
      const outputPath = `${options.outputDir}/${outputName}`;

      mkdirSync(options.outputDir, { recursive: true });
      writeFileSync(outputPath, gcode, "utf-8");

      return {
        success: true,
        outputPath,
        estimatedTime: Math.round(estimatedTime),
        estimatedMaterial: round2(estimatedMaterial),
        filamentLengthMm: round2(filamentLengthMm),
        layerCount: totalLayers,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        errors: [`Internal slicer failed: ${msg}`],
      };
    }
  }
}

// ==================== Profile ====================

export interface InternalSlicerProfile {
  layerHeight?: number;
  infillDensity?: number; // 0-100
  infillPattern?: InfillPattern;
  nozzleTemp?: number;
  bedTemp?: number;
  printSpeed?: number; // mm/s
  travelSpeed?: number; // mm/s
  nozzleDiameter?: number;
  filamentDiameter?: number;
  supportEnabled?: boolean;
  /** Use tree supports instead of grid supports. Default: false */
  supportType?: "grid" | "tree";
  /** Number of perimeter walls. Default: 2 */
  wallCount?: number;
  /** Retraction length in mm. Default: 0.8 */
  retractLength?: number;
  /** Retraction speed in mm/s. Default: 30 */
  retractSpeed?: number;
  /** Brim width in mm. 0 = disabled. Default: 0 */
  brimWidth?: number;
  /** Skirt distance from model in mm. Default: 6 */
  skirtDistance?: number;
  /** Number of skirt loops. Default: 1 */
  skirtLoops?: number;
  /** Maximum fan speed 0-100%. Default: 100 */
  fanSpeedMax?: number;
  /** Number of first layers with fan disabled. Default: 1 */
  disableFanFirstLayers?: number;
  /** Custom start G-code with macro variables. Replaces default startup sequence. */
  startGcode?: string;
  /** Custom end G-code with macro variables. Replaces default shutdown sequence. */
  endGcode?: string;
  /** Spiral vase mode: single wall, no infill, no top layers, continuous Z. Default: false */
  spiralVaseMode?: boolean;
  /** Number of solid bottom layers. Default: 3 */
  bottomLayers?: number;
}

interface ResolvedProfile {
  layerHeight: number;
  infillDensity: number;
  infillPattern: InfillPattern;
  nozzleTemp: number;
  bedTemp: number;
  printSpeed: number;
  travelSpeed: number;
  nozzleDiameter: number;
  filamentDiameter: number;
  supportEnabled: boolean;
  supportType: "grid" | "tree";
  wallCount: number;
  retractLength: number;
  retractSpeed: number;
  brimWidth: number;
  skirtDistance: number;
  skirtLoops: number;
  fanSpeedMax: number;
  disableFanFirstLayers: number;
  startGcode: string | undefined;
  endGcode: string | undefined;
  spiralVaseMode: boolean;
  bottomLayers: number;
}

function resolveProfile(
  profile: InternalSlicerProfile,
  overrides?: Record<string, string | number>,
): ResolvedProfile {
  const o = overrides ?? {};
  const patternStr = String(o.infill_pattern ?? o.infillPattern ?? profile.infillPattern ?? "rectilinear");
  const validPatterns: InfillPattern[] = ["rectilinear", "grid", "triangles", "honeycomb", "gyroid", "cubic", "lightning"];
  const infillPattern: InfillPattern = validPatterns.includes(patternStr as InfillPattern)
    ? (patternStr as InfillPattern)
    : "rectilinear";

  const supportTypeStr = String(o.support_type ?? o.supportType ?? profile.supportType ?? "grid");
  const supportType: "grid" | "tree" = supportTypeStr === "tree" ? "tree" : "grid";

  return {
    layerHeight: num(o.layer_height ?? o.layerHeight) ?? profile.layerHeight ?? 0.2,
    infillDensity: num(o.infill_density ?? o.infillDensity) ?? profile.infillDensity ?? 20,
    infillPattern,
    nozzleTemp: num(o.nozzle_temperature ?? o.nozzleTemp) ?? profile.nozzleTemp ?? 210,
    bedTemp: num(o.bed_temperature ?? o.bedTemp) ?? profile.bedTemp ?? 60,
    printSpeed: num(o.print_speed ?? o.printSpeed) ?? profile.printSpeed ?? 60,
    travelSpeed: num(o.travel_speed ?? o.travelSpeed) ?? profile.travelSpeed ?? 120,
    nozzleDiameter: num(o.nozzle_diameter ?? o.nozzleDiameter) ?? profile.nozzleDiameter ?? 0.4,
    filamentDiameter: num(o.filament_diameter ?? o.filamentDiameter) ?? profile.filamentDiameter ?? 1.75,
    supportEnabled: profile.supportEnabled ?? false,
    supportType,
    wallCount: num(o.wall_count ?? o.wallCount) ?? profile.wallCount ?? 2,
    retractLength: num(o.retract_length ?? o.retractLength) ?? profile.retractLength ?? 0.8,
    retractSpeed: num(o.retract_speed ?? o.retractSpeed) ?? profile.retractSpeed ?? 30,
    brimWidth: num(o.brim_width ?? o.brimWidth) ?? profile.brimWidth ?? 0,
    skirtDistance: num(o.skirt_distance ?? o.skirtDistance) ?? profile.skirtDistance ?? 6,
    skirtLoops: num(o.skirt_loops ?? o.skirtLoops) ?? profile.skirtLoops ?? 1,
    fanSpeedMax: num(o.fan_speed_max ?? o.fanSpeedMax) ?? profile.fanSpeedMax ?? 100,
    disableFanFirstLayers: num(o.disable_fan_first_layers ?? o.disableFanFirstLayers) ?? profile.disableFanFirstLayers ?? 1,
    startGcode: profile.startGcode,
    endGcode: profile.endGcode,
    spiralVaseMode: profile.spiralVaseMode ?? false,
    bottomLayers: num(o.bottom_layers ?? o.bottomLayers) ?? profile.bottomLayers ?? 3,
  };
}

function num(v: unknown): number | undefined {
  if (v === undefined || v === null) return undefined;
  const n = Number(v);
  return isNaN(n) ? undefined : n;
}

// ==================== G-code Generation ====================

type BoundingBox = { min: [number, number, number]; max: [number, number, number] };

interface GcodeGenerationResult {
  gcode: string;
  finalE: number;
  totalPathLength: number;
  featureDistances: FeatureDistances;
}

function generateGcode(
  modelName: string,
  bb: BoundingBox,
  p: ResolvedProfile,
  totalLayers: number,
  overhangResult?: ArcOverhangResult,
  meshData?: MeshData,
): GcodeGenerationResult {
  const lines: string[] = [];
  let e = 0; // extruder position
  let totalPathLength = 0; // track actual printed distance
  let retracted = false; // track retraction state

  // Per-feature distance tracking for accurate time estimation
  const featureDistances: FeatureDistances = {
    outerWall: 0,
    innerWall: 0,
    infill: 0,
    travel: 0,
    support: 0,
    overhang: 0,
    skirtBrim: 0,
    segmentCount: 0,
    layerCount: totalLayers,
  };
  let currentFeature: keyof Omit<FeatureDistances, 'segmentCount' | 'layerCount'> = 'outerWall';

  /** Track extrusion distance for current feature */
  function trackExtrusion(dist: number): void {
    totalPathLength += dist;
    featureDistances[currentFeature] += dist;
    featureDistances.segmentCount++;
  }

  const filamentArea =
    Math.PI * (p.filamentDiameter / 2) ** 2;
  const extrusionArea = p.layerHeight * p.nozzleDiameter;
  // E per mm of travel = (extrusion cross-section) / (filament cross-section)
  const ePerMm = extrusionArea / filamentArea;

  const retractFeedrate = p.retractSpeed * 60; // mm/min

  const printFeedrate = p.printSpeed * 60; // mm/min
  const travelFeedrate = p.travelSpeed * 60;
  const infillFeedrate = (p.printSpeed * 1.5) * 60; // infill slightly faster

  /** Insert retraction before a travel move */
  function retract(): void {
    if (!retracted && p.retractLength > 0) {
      e = round4(e - p.retractLength);
      lines.push(`G1 E${e} F${retractFeedrate} ; retract`);
      retracted = true;
    }
  }

  /** Insert unretraction after a travel move, before extrusion */
  function unretract(): void {
    if (retracted && p.retractLength > 0) {
      e = round4(e + p.retractLength);
      lines.push(`G1 E${e} F${retractFeedrate} ; unretract`);
      retracted = false;
    }
  }

  /** Travel to position with retraction */
  let lastX = 0, lastY = 0;
  function travelTo(x: number, y: number): void {
    retract();
    const dist = Math.sqrt((x - lastX) ** 2 + (y - lastY) ** 2);
    featureDistances.travel += dist;
    featureDistances.segmentCount++;
    lines.push(`G1 X${x} Y${y} F${travelFeedrate}`);
    lastX = x;
    lastY = y;
  }

  // ---- Thumbnail (Bambu/Prusa/Orca compatible) ----
  if (meshData && meshData.triangles.length > 0) {
    try {
      const thumbnailBlock = generateGcodeThumbnailBlock(meshData);
      lines.push(thumbnailBlock);
      lines.push(``);
    } catch {
      // Thumbnail generation is best-effort -- never block slicing
    }
  }

  // ---- Header ----
  lines.push(`; Generated by OpenSlicer Internal Engine`);
  lines.push(`; Model: ${modelName}`);
  lines.push(`; Layer height: ${p.layerHeight}mm`);
  lines.push(`; Infill: ${p.infillDensity}% ${p.infillPattern}`);
  lines.push(`; Walls: ${p.wallCount}`);
  if (p.supportEnabled) {
    lines.push(`; Support: ${p.supportType}`);
  }
  if (p.spiralVaseMode) {
    lines.push(`; Mode: Spiral Vase (continuous Z)`);
  }
  lines.push(`; total layers = ${totalLayers}`);
  lines.push(`; layer_height = ${p.layerHeight}`);
  lines.push(`; nozzle_diameter = ${p.nozzleDiameter}`);
  lines.push(`; infill_pattern = ${p.infillPattern}`);
  lines.push(``);

  // ---- Startup ----
  const resolvedStartGcode = resolveGcodeMacros(
    p.startGcode ?? DEFAULT_START_GCODE,
    p,
  );
  lines.push(resolvedStartGcode);
  lines.push(``);

  // Model dimensions
  const xMin = bb.min[0];
  const xMax = bb.max[0];
  const yMin = bb.min[1];
  const yMax = bb.max[1];
  const zMin = bb.min[2];
  const width = xMax - xMin;
  const depth = yMax - yMin;

  // Center the model on the bed if it's at origin
  const offsetX = xMin < 0 ? 0 : (xMin < 10 ? 100 - width / 2 : 0);
  const offsetY = yMin < 0 ? 0 : (yMin < 10 ? 100 - depth / 2 : 0);

  const x1 = round2(xMin + offsetX);
  const y1 = round2(yMin + offsetY);
  const x2 = round2(xMax + offsetX);
  const y2 = round2(yMax + offsetY);

  // Build an index of arc paths by layer Z for quick lookup
  const arcPathsByLayerZ = new Map<number, ArcPath[]>();
  if (overhangResult?.arcPaths) {
    for (const ap of overhangResult.arcPaths) {
      const key = round2(ap.layerZ);
      let list = arcPathsByLayerZ.get(key);
      if (!list) {
        list = [];
        arcPathsByLayerZ.set(key, list);
      }
      list.push(ap);
    }
  }

  // Pre-generate tree support layers if enabled
  const treeSupportLayers = new Map<number, { x: number; y: number }[][]>();
  if (p.supportEnabled && p.supportType === "tree" && overhangResult) {
    const treeResult = generateTreeSupport(overhangResult.zones, zMin, {
      layerHeight: p.layerHeight,
      nozzleWidth: p.nozzleDiameter,
    });
    for (const layer of treeResult.layers) {
      // Offset paths to match model centering
      const offsetPaths = layer.paths.map((path) =>
        path.map((pt) => ({ x: round2(pt.x + offsetX), y: round2(pt.y + offsetY) })),
      );
      treeSupportLayers.set(layer.layerIndex, offsetPaths);
    }
  }

  // ---- Layers ----
  for (let layer = 0; layer < totalLayers; layer++) {
    const z = round2(zMin + (layer + 1) * p.layerHeight);
    lines.push(``);
    lines.push(`; Layer ${layer} (z=${z})`);
    // In spiral vase mode, skip discrete Z-step for spiral layers (Z is interpolated)
    if (!(p.spiralVaseMode && layer >= p.bottomLayers)) {
      lines.push(`G1 Z${z} F600`);
    }

    // -- Fan control --
    if (layer < p.disableFanFirstLayers) {
      lines.push(`M107 ; Fan off for first layer`);
    } else if (layer === p.disableFanFirstLayers) {
      const fanSpeed255 = Math.round(p.fanSpeedMax * 255 / 100);
      lines.push(`M106 S${fanSpeed255} ; Fan on`);
    }

    // -- Skirt (layer 0 only, before model) --
    if (layer === 0 && p.skirtLoops > 0 && p.skirtDistance > 0) {
      lines.push(`;TYPE:Skirt/Brim`);
      currentFeature = 'skirtBrim';
      for (let loop = 0; loop < p.skirtLoops; loop++) {
        const offset = p.skirtDistance + loop * p.nozzleDiameter;
        const sx1 = round2(x1 - offset);
        const sy1 = round2(y1 - offset);
        const sx2 = round2(x2 + offset);
        const sy2 = round2(y2 + offset);

        travelTo(sx1, sy1);
        unretract();

        const skirtMoves: [number, number][] = [
          [sx2, sy1],
          [sx2, sy2],
          [sx1, sy2],
          [sx1, sy1],
        ];
        let prevSX = sx1;
        let prevSY = sy1;
        for (const [nx, ny] of skirtMoves) {
          const dist = Math.sqrt((nx - prevSX) ** 2 + (ny - prevSY) ** 2);
          trackExtrusion(dist);
          e = round4(e + dist * ePerMm);
          lines.push(`G1 X${nx} Y${ny} E${e} F${printFeedrate}`);
          prevSX = nx;
          prevSY = ny;
        }
      }
    }

    // -- Brim (layer 0 only, expanding outward from perimeter) --
    if (layer === 0 && p.brimWidth > 0) {
      const brimLoops = Math.floor(p.brimWidth / p.nozzleDiameter);
      if (brimLoops > 0) {
        lines.push(`;TYPE:Skirt/Brim`);
        currentFeature = 'skirtBrim';
        for (let loop = 1; loop <= brimLoops; loop++) {
          const offset = loop * p.nozzleDiameter;
          const bx1 = round2(x1 - offset);
          const by1 = round2(y1 - offset);
          const bx2 = round2(x2 + offset);
          const by2 = round2(y2 + offset);

          travelTo(bx1, by1);
          unretract();

          const brimMoves: [number, number][] = [
            [bx2, by1],
            [bx2, by2],
            [bx1, by2],
            [bx1, by1],
          ];
          let prevBX = bx1;
          let prevBY = by1;
          for (const [nx, ny] of brimMoves) {
            const dist = Math.sqrt((nx - prevBX) ** 2 + (ny - prevBY) ** 2);
            trackExtrusion(dist);
            e = round4(e + dist * ePerMm);
            lines.push(`G1 X${nx} Y${ny} E${e} F${printFeedrate}`);
            prevBX = nx;
            prevBY = ny;
          }
        }
      }
    }

    // -- Spiral Vase Mode (layers above bottom) --
    const isSpiralLayer = p.spiralVaseMode && layer >= p.bottomLayers;

    if (isSpiralLayer) {
      // Spiral vase: single continuous perimeter with linearly interpolated Z
      // No retraction between layers — one unbroken extrusion spiral
      lines.push(`;TYPE:Outer wall`);
      currentFeature = 'outerWall';

      // Build perimeter points for one full loop
      const perimeterPoints: [number, number][] = [
        [x1, y1],
        [x2, y1],
        [x2, y2],
        [x1, y2],
        [x1, y1], // close the loop back to start
      ];

      // Total number of segments in the perimeter
      const N = perimeterPoints.length - 1; // 4 segments

      // Travel to start only for the first spiral layer (no retraction after that)
      if (layer === p.bottomLayers) {
        travelTo(perimeterPoints[0][0], perimeterPoints[0][1]);
        unretract();
      }

      const baseZ = zMin + (layer + 1) * p.layerHeight;

      for (let i = 1; i <= N; i++) {
        const [nx, ny] = perimeterPoints[i];
        // Linearly interpolate Z within this layer
        const spiralZ = round2(baseZ + (p.layerHeight * i / N));
        const dist = Math.sqrt((nx - lastX) ** 2 + (ny - lastY) ** 2);
        trackExtrusion(dist);
        e = round4(e + dist * ePerMm);
        lines.push(`G1 X${nx} Y${ny} Z${spiralZ} E${e} F${printFeedrate}`);
        lastX = nx;
        lastY = ny;
      }
    } else {
      // -- Normal mode: Outer wall (outermost perimeter) --
      lines.push(`;TYPE:Outer wall`);
      currentFeature = 'outerWall';
      // Travel to start
      travelTo(x1, y1);
      unretract();
      // Perimeter rectangle
      const perimeterMoves: [number, number][] = [
        [x2, y1],
        [x2, y2],
        [x1, y2],
        [x1, y1],
      ];
      let prevX = x1;
      let prevY = y1;
      for (const [nx, ny] of perimeterMoves) {
        const dist = Math.sqrt((nx - prevX) ** 2 + (ny - prevY) ** 2);
        trackExtrusion(dist);
        e = round4(e + dist * ePerMm);
        lines.push(`G1 X${nx} Y${ny} E${e} F${printFeedrate}`);
        prevX = nx;
        prevY = ny;
      }

      // -- Inner walls (additional perimeters inset from outer wall) --
      if (p.wallCount > 1) {
        lines.push(`;TYPE:Inner wall`);
        currentFeature = 'innerWall';
        for (let wall = 1; wall < p.wallCount; wall++) {
          const inset = wall * p.nozzleDiameter;
          const ix1 = round2(x1 + inset);
          const iy1 = round2(y1 + inset);
          const ix2 = round2(x2 - inset);
          const iy2 = round2(y2 - inset);

          // Skip if inset is too large (walls would overlap)
          if (ix1 >= ix2 || iy1 >= iy2) break;

          travelTo(ix1, iy1);
          unretract();
          const innerMoves: [number, number][] = [
            [ix2, iy1],
            [ix2, iy2],
            [ix1, iy2],
            [ix1, iy1],
          ];
          prevX = ix1;
          prevY = iy1;
          for (const [nx, ny] of innerMoves) {
            const dist = Math.sqrt((nx - prevX) ** 2 + (ny - prevY) ** 2);
            trackExtrusion(dist);
            e = round4(e + dist * ePerMm);
            lines.push(`G1 X${nx} Y${ny} E${e} F${printFeedrate}`);
            prevX = nx;
            prevY = ny;
          }
        }
      }
    } // end normal mode

    // -- Infill (skipped in spiral vase mode) --
    if (p.infillDensity > 0 && !isSpiralLayer) {
      lines.push(`;TYPE:Internal infill`);
      currentFeature = 'infill';

      // Inset infill bounds by wall thickness to stay inside perimeters
      const wallInset = p.wallCount * p.nozzleDiameter;
      const infillBounds = {
        minX: x1 + wallInset,
        maxX: x2 - wallInset,
        minY: y1 + wallInset,
        maxY: y2 - wallInset,
      };

      // Only generate infill if there's space inside the walls
      if (infillBounds.minX < infillBounds.maxX && infillBounds.minY < infillBounds.maxY) {
        const infillPaths = generateInfill(
          p.infillPattern,
          infillBounds,
          layer,
          p.layerHeight,
          p.infillDensity,
          p.nozzleDiameter,
        );

        for (const path of infillPaths) {
          if (path.length < 2) continue;

          // Travel to start of path
          travelTo(path[0].x, path[0].y);
          unretract();

          // Extrude along path
          for (let i = 1; i < path.length; i++) {
            const dx = path[i].x - path[i - 1].x;
            const dy = path[i].y - path[i - 1].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            trackExtrusion(dist);
            e = round4(e + dist * ePerMm);
            lines.push(`G1 X${path[i].x} Y${path[i].y} E${e} F${infillFeedrate}`);
          }
        }
      }
    }

    // -- Support structures (skipped in spiral vase mode) --
    if (p.supportEnabled && overhangResult && !isSpiralLayer) {
      currentFeature = 'support';
      if (p.supportType === "tree") {
        // Tree support: use pre-generated circular profiles
        const treePaths = treeSupportLayers.get(layer);
        if (treePaths && treePaths.length > 0) {
          lines.push(`;TYPE:Support material`);
          for (const path of treePaths) {
            if (path.length < 2) continue;
            travelTo(path[0].x, path[0].y);
            unretract();
            for (let i = 1; i < path.length; i++) {
              const dx = path[i].x - path[i - 1].x;
              const dy = path[i].y - path[i - 1].y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              trackExtrusion(dist);
              e = round4(e + dist * ePerMm * 0.5); // reduced flow for support
              lines.push(`G1 X${path[i].x} Y${path[i].y} E${e} F${printFeedrate}`);
            }
          }
        }
      } else {
        // Grid support (original behavior)
        const supportZones = overhangResult.zones.filter(
          (sz) => sz.severity === "severe" || sz.severity === "extreme",
        );
        if (supportZones.length > 0) {
          lines.push(`;TYPE:Support material`);
          for (const zone of supportZones) {
            const zBb = zone.boundingBox;
            // Only generate support below the overhang zone
            if (z < zBb.min[2]) {
              const sx1 = round2(zBb.min[0] + offsetX);
              const sy1 = round2(zBb.min[1] + offsetY);
              const sx2 = round2(zBb.max[0] + offsetX);
              const sy2 = round2(zBb.max[1] + offsetY);
              // Simple support grid
              const supportSpacing = p.nozzleDiameter * 5;
              for (
                let sy = sy1;
                sy <= sy2;
                sy = round2(sy + supportSpacing)
              ) {
                travelTo(sx1, round2(sy));
                unretract();
                const dist = Math.abs(sx2 - sx1);
                trackExtrusion(dist);
                e = round4(e + dist * ePerMm * 0.5); // reduced flow for support
                lines.push(
                  `G1 X${sx2} Y${round2(sy)} E${e} F${printFeedrate}`,
                );
              }
            }
          }
        }
      }
    }

    // -- Arc overhang paths (skipped in spiral vase mode) --
    const layerArcs = arcPathsByLayerZ.get(round2(z - zMin));
    if (layerArcs && layerArcs.length > 0 && !isSpiralLayer) {
      lines.push(``);
      lines.push(`;TYPE:Overhang perimeter`);
      currentFeature = 'overhang';
      for (const arcPath of layerArcs) {
        for (const seg of arcPath.segments) {
          const arcSpeed = Math.round(seg.speed * 60); // mm/min
          const flowComment = `; Speed: ${seg.speed}mm/s, Flow: ${seg.flow}`;

          if (seg.type === "line") {
            const dist = Math.sqrt(
              (seg.end[0] - seg.start[0]) ** 2 +
                (seg.end[1] - seg.start[1]) ** 2,
            );
            trackExtrusion(dist);
            e = round4(e + dist * ePerMm * seg.flow);
            lines.push(
              `G1 X${round2(seg.end[0] + offsetX)} Y${round2(seg.end[1] + offsetY)} E${e} F${arcSpeed} ${flowComment}`,
            );
          } else if (seg.type === "arc" && seg.center) {
            // G2 (clockwise) or G3 (counter-clockwise) arc move
            const gCmd = seg.clockwise ? "G2" : "G3";
            const i = round2(seg.center[0] - seg.start[0]);
            const j = round2(seg.center[1] - seg.start[1]);
            // Approximate arc length
            const chordLen = Math.sqrt(
              (seg.end[0] - seg.start[0]) ** 2 +
                (seg.end[1] - seg.start[1]) ** 2,
            );
            const arcLen =
              seg.radius && seg.radius > 0.001
                ? seg.radius *
                  2 *
                  Math.asin(
                    Math.min(chordLen / (2 * seg.radius), 1),
                  )
                : chordLen;
            trackExtrusion(arcLen);
            e = round4(e + arcLen * ePerMm * seg.flow);
            lines.push(
              `${gCmd} X${round2(seg.end[0] + offsetX)} Y${round2(seg.end[1] + offsetY)} I${i} J${j} E${e} F${arcSpeed} ; Arc move`,
            );
          }
        }
      }
    }
  }

  // ---- End ----
  lines.push(``);
  const resolvedEndGcode = resolveGcodeMacros(
    p.endGcode ?? DEFAULT_END_GCODE,
    p,
  );
  lines.push(resolvedEndGcode);
  lines.push(``);

  // Append accurate metadata comments at the end (parsers check both header and footer)
  const { estimatedTime, estimatedMaterial, filamentLengthMm } = computeActualMetadata(e, featureDistances, p);
  const filamentLengthM = round2(filamentLengthMm / 1000);
  lines.push(`; estimated printing time = ${formatTime(estimatedTime)}`);
  lines.push(`; total filament used [g] = ${round2(estimatedMaterial)}`);
  lines.push(`; total filament used [m] = ${filamentLengthM}`);

  return { gcode: lines.join("\n"), finalE: e, totalPathLength, featureDistances };
}

// ==================== Estimation ====================

interface ActualMetadata {
  estimatedTime: number;
  estimatedMaterial: number;
  filamentLengthMm: number;
}

/**
 * Compute print time and material from actual G-code generation values.
 * Uses per-feature speed estimation and tracked path lengths for accuracy.
 */
function computeActualMetadata(
  finalE: number,
  featureDistances: FeatureDistances,
  p: ResolvedProfile,
): ActualMetadata {
  // Per-feature speed estimation (mm/s)
  const perimeterSpeed = p.printSpeed; // outer wall uses base print speed
  const innerWallSpeed = p.printSpeed * 1.2; // inner walls slightly faster
  const infillSpeed = p.printSpeed * 1.5; // infill faster
  const travelSpeed = p.travelSpeed; // travel moves (non-extrusion)
  const supportSpeed = p.printSpeed * 0.8; // support slower for adhesion
  const bridgeSpeed = p.printSpeed * 0.5; // bridge speed conservative default

  // Compute time per feature type
  let totalTime = 0;
  totalTime += featureDistances.outerWall / perimeterSpeed;
  totalTime += featureDistances.innerWall / innerWallSpeed;
  totalTime += featureDistances.infill / infillSpeed;
  totalTime += featureDistances.travel / travelSpeed;
  totalTime += featureDistances.support / supportSpeed;
  totalTime += featureDistances.overhang / bridgeSpeed;
  totalTime += featureDistances.skirtBrim / perimeterSpeed;

  // Add acceleration overhead: ~0.1s per direction change (rough estimate)
  // Each travel move involves acceleration/deceleration
  const directionChanges = featureDistances.segmentCount;
  const accelOverhead = directionChanges * 0.05; // 50ms per segment for accel/decel
  totalTime += accelOverhead;

  // Add layer change time: ~1s per layer for Z-hop
  const layerChangeTime = featureDistances.layerCount * 1.0;
  totalTime += layerChangeTime;

  // Add retraction time (estimate: 2 retractions per layer, 0.3s each)
  const retractionTime = featureDistances.layerCount * 2 * 0.3;
  totalTime += retractionTime;

  const estimatedTime = totalTime;

  // Material: use actual E-value (filament length consumed in mm)
  const filamentLength_mm = Math.max(0, finalE);
  const filamentArea = Math.PI * (p.filamentDiameter / 2) ** 2;
  const filamentVolume_mm3 = filamentLength_mm * filamentArea;
  // PLA density ~1.24 g/cm^3 = 0.00124 g/mm^3
  const estimatedMaterial = filamentVolume_mm3 * 1.24 / 1000;

  return { estimatedTime, estimatedMaterial, filamentLengthMm: filamentLength_mm };
}

/** Track distances per feature type for accurate time estimation */
interface FeatureDistances {
  outerWall: number;
  innerWall: number;
  infill: number;
  travel: number;
  support: number;
  overhang: number;
  skirtBrim: number;
  segmentCount: number;
  layerCount: number;
}

// ==================== Default G-code Templates ====================

const DEFAULT_START_GCODE = `G28 ; Home all axes
G1 Z5 F3000 ; Raise Z
M104 S{nozzle_temp} ; Set nozzle temp
M140 S{bed_temp} ; Set bed temp
M109 S{nozzle_temp} ; Wait for nozzle
M190 S{bed_temp} ; Wait for bed
G92 E0 ; Reset extruder
G1 Z0.3 F3000 ; Move to first layer`;

const DEFAULT_END_GCODE = `M104 S0 ; Turn off nozzle
M140 S0 ; Turn off bed
M107 ; Turn off fan
G28 X Y ; Home X Y
M84 ; Disable motors`;

/**
 * Replace macro variables in G-code text with resolved profile values.
 * Supported macros: {nozzle_temp}, {bed_temp}, {layer_height},
 * {first_layer_height}, {nozzle_diameter}, {filament_diameter},
 * {print_speed}, {travel_speed}
 */
function resolveGcodeMacros(gcode: string, p: ResolvedProfile): string {
  return gcode
    .replace(/\{nozzle_temp\}/g, String(p.nozzleTemp))
    .replace(/\{bed_temp\}/g, String(p.bedTemp))
    .replace(/\{layer_height\}/g, String(p.layerHeight))
    .replace(/\{first_layer_height\}/g, String(p.layerHeight)) // uses layerHeight as first layer height
    .replace(/\{nozzle_diameter\}/g, String(p.nozzleDiameter))
    .replace(/\{filament_diameter\}/g, String(p.filamentDiameter))
    .replace(/\{print_speed\}/g, String(p.printSpeed))
    .replace(/\{travel_speed\}/g, String(p.travelSpeed));
}

// ==================== Formatting Helpers ====================

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0 || parts.length === 0) parts.push(`${s}s`);
  return parts.join(" ");
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
