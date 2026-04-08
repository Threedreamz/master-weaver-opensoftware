export type MoveType =
  | 'outer_wall'
  | 'inner_wall'
  | 'infill'
  | 'support'
  | 'bridge'
  | 'travel'
  | 'wipe'
  | 'skirt'
  | 'custom';

export interface ToolpathSegment {
  start: [number, number, number];
  end: [number, number, number];
  type: "travel" | "extrude";
  speed: number;
  layer: number;
  z: number;
  /** Detailed move type parsed from ;TYPE: comments or inferred from context */
  moveType: MoveType;
  /** Volumetric flow rate in mm³/s (estimated from speed, extrusion width, layer height) */
  flowRate: number;
  /** Nozzle temperature at this segment (from M104/M109) */
  temperature: number;
  /** True if this segment starts with a retraction event */
  retraction: boolean;
  /** Extrusion width in mm (from ;WIDTH: comment or default) */
  extrusionWidth: number;
}

export interface ToolpathData {
  segments: ToolpathSegment[];
  layerCount: number;
  layerHeights: number[];
  bounds: { min: [number, number, number]; max: [number, number, number] };
}

/**
 * Map slicer ;TYPE: comment values to our MoveType enum.
 */
function parseTypeComment(typeStr: string): MoveType | null {
  const normalized = typeStr.trim().toLowerCase();
  switch (normalized) {
    case 'outer wall':
    case 'external perimeter':
      return 'outer_wall';
    case 'inner wall':
    case 'perimeter':
      return 'inner_wall';
    case 'solid infill':
    case 'internal infill':
    case 'sparse infill':
    case 'top solid infill':
    case 'bottom solid infill':
      return 'infill';
    case 'support material':
    case 'support':
    case 'support interface':
      return 'support';
    case 'bridge infill':
    case 'bridge':
    case 'overhang wall':
      return 'bridge';
    case 'travel':
      return 'travel';
    case 'skirt':
    case 'brim':
    case 'skirt/brim':
      return 'skirt';
    case 'wipe':
      return 'wipe';
    case 'custom':
      return 'custom';
    default:
      return null;
  }
}

export function parseGcodeToolpath(content: string, maxLines?: number): ToolpathData {
  const lines = content.split("\n");
  const limit = maxLines ?? lines.length;
  const segments: ToolpathSegment[] = [];
  const layerHeightsSet = new Set<number>();

  let x = 0, y = 0, z = 0;
  let speed = 1000; // mm/min
  let layer = 0;
  let extruding = false;
  let lastE = 0;
  let currentMoveType: MoveType = 'custom';
  let currentTemperature = 200; // default nozzle temp
  let currentExtrusionWidth = 0.4; // default width
  let pendingRetraction = false;
  let isFirstLayerExtrusion = true;
  let hasTypeComments = false;
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];

  for (let i = 0; i < Math.min(lines.length, limit); i++) {
    const line = lines[i].trim();

    if (!line) continue;

    // Parse comment lines for metadata
    if (line.startsWith(";")) {
      // Layer change detection
      if (line.includes("LAYER:") || line.includes("layer_change")) {
        layer++;
        isFirstLayerExtrusion = true;
      }

      // ;TYPE: comment parsing (OrcaSlicer / PrusaSlicer / BambuStudio)
      const typeMatch = line.match(/^;\s*TYPE:\s*(.+)/i);
      if (typeMatch) {
        const parsed = parseTypeComment(typeMatch[1]);
        if (parsed) {
          currentMoveType = parsed;
          hasTypeComments = true;
        }
      }

      // ;WIDTH: comment parsing
      const widthMatch = line.match(/^;\s*WIDTH:\s*([\d.]+)/i);
      if (widthMatch) {
        currentExtrusionWidth = parseFloat(widthMatch[1]);
      }

      continue;
    }

    const parts = line.split(/\s+/);
    const cmd = parts[0];

    // Temperature tracking: M104 Sxxx (set) or M109 Sxxx (set and wait)
    if (cmd === "M104" || cmd === "M109") {
      for (const part of parts.slice(1)) {
        if (part[0] === "S") {
          const val = parseFloat(part.slice(1));
          if (!isNaN(val)) currentTemperature = val;
        }
      }
      continue;
    }

    // Retraction tracking: G10 = firmware retract
    if (cmd === "G10") {
      pendingRetraction = true;
      continue;
    }
    // G11 = firmware unretract (retraction already flagged)
    if (cmd === "G11") {
      continue;
    }

    if (cmd === "G0" || cmd === "G1") {
      const prev: [number, number, number] = [x, y, z];
      let hasE = false;
      let eVal = lastE;

      for (const part of parts.slice(1)) {
        const key = part[0];
        const val = parseFloat(part.slice(1));
        if (isNaN(val)) continue;
        switch (key) {
          case "X": x = val; break;
          case "Y": y = val; break;
          case "Z":
            if (val !== z) { z = val; layerHeightsSet.add(z); }
            break;
          case "F": speed = val; break;
          case "E": hasE = true; eVal = val; break;
        }
      }

      // Detect retraction from E value decrease (direct retract, not firmware G10/G11)
      if (hasE && eVal < lastE) {
        pendingRetraction = true;
      }
      if (hasE) {
        lastE = eVal;
      }

      extruding = cmd === "G1" && hasE && eVal >= lastE;
      // More precise: extruding if E increased (or stayed same for wipe)
      // But the original logic: G1 with E present = extrude
      extruding = cmd === "G1" && hasE;
      const end: [number, number, number] = [x, y, z];

      if (prev[0] !== end[0] || prev[1] !== end[1] || prev[2] !== end[2]) {
        const isExtrude = extruding;
        let moveType: MoveType;

        if (!isExtrude) {
          moveType = 'travel';
        } else if (hasTypeComments) {
          // Use the slicer-provided type
          moveType = currentMoveType;
        } else {
          // Infer type from context when no ;TYPE: comments available
          moveType = inferMoveType(layer, isFirstLayerExtrusion, speed);
          if (isFirstLayerExtrusion) isFirstLayerExtrusion = false;
        }

        // Estimate flow rate: speed(mm/min) * extrusionWidth * layerHeight / 60 → mm³/s
        // Use a rough layer height estimate from Z changes
        const layerHeight = layerHeightsSet.size >= 2
          ? z - ([...layerHeightsSet].sort((a, b) => a - b).at(-2) ?? 0)
          : 0.2;
        const speedMmPerSec = speed / 60;
        const flowRate = isExtrude ? speedMmPerSec * currentExtrusionWidth * Math.abs(layerHeight) : 0;

        const retraction = pendingRetraction;
        pendingRetraction = false;

        segments.push({
          start: prev,
          end,
          type: isExtrude ? "extrude" : "travel",
          speed,
          layer,
          z,
          moveType,
          flowRate,
          temperature: currentTemperature,
          retraction,
          extrusionWidth: currentExtrusionWidth,
        });

        for (let k = 0; k < 3; k++) {
          if (end[k] < min[k]) min[k] = end[k];
          if (end[k] > max[k]) max[k] = end[k];
        }
      }
    }
  }

  return {
    segments,
    layerCount: layerHeightsSet.size,
    layerHeights: [...layerHeightsSet].sort((a, b) => a - b),
    bounds: { min, max },
  };
}

/**
 * Infer move type from context when G-code has no ;TYPE: comments.
 * Uses heuristics: first extrusion on a layer = skirt (layer 0) or wall,
 * high speed = infill, etc.
 */
function inferMoveType(layer: number, isFirstOnLayer: boolean, speed: number): MoveType {
  // First layer, first extrusion → likely skirt/brim
  if (layer <= 1 && isFirstOnLayer) {
    return 'skirt';
  }
  // Higher speeds typically mean infill
  if (speed > 3000) {
    return 'infill';
  }
  // Lower speeds typically mean outer walls
  if (speed < 1500) {
    return 'outer_wall';
  }
  // Medium speeds → inner wall
  return 'inner_wall';
}
