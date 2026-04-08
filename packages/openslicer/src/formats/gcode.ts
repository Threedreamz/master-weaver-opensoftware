/**
 * G-code Parser
 *
 * Parses G-code files into structured layer data. Extracts move commands,
 * tracks Z-height changes to identify layers, and calculates filament usage.
 */

export interface GCodeCommand {
  /** Raw line text */
  raw: string;
  /** Command letter + number (e.g., "G1", "M104") */
  command: string;
  /** Parsed parameters */
  params: Record<string, number>;
  /** Comment text (after semicolon) */
  comment?: string;
}

export interface GCodeLayer {
  /** Layer index (0-based) */
  index: number;
  /** Z height in mm */
  zHeight: number;
  /** Commands in this layer */
  commands: GCodeCommand[];
  /** Estimated extrusion length in this layer (mm) */
  extrusionMm: number;
}

export interface GCodeAnalysis {
  /** Parsed layers */
  layers: GCodeLayer[];
  /** Total filament used in mm */
  totalFilamentMm: number;
  /** Estimated filament weight in grams (assuming PLA at 1.24 g/cm3, 1.75mm) */
  estimatedWeightG: number;
  /** Total number of G-code lines */
  totalLines: number;
  /** Max Z height reached */
  maxZ: number;
  /** Detected slicer from comments */
  detectedSlicer?: string;
  /** Print time if found in comments (seconds) */
  estimatedTimeS?: number;
}

/**
 * Parse a single G-code line into a structured command.
 */
export function parseGCodeLine(line: string): GCodeCommand {
  const trimmed = line.trim();
  const commentIdx = trimmed.indexOf(";");

  const codePart = commentIdx >= 0 ? trimmed.substring(0, commentIdx).trim() : trimmed;
  const comment = commentIdx >= 0 ? trimmed.substring(commentIdx + 1).trim() : undefined;

  const params: Record<string, number> = {};
  let command = "";

  if (codePart.length > 0) {
    const tokens = codePart.split(/\s+/);
    command = tokens[0].toUpperCase();

    for (let i = 1; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.length >= 2) {
        const key = token[0].toUpperCase();
        const value = parseFloat(token.substring(1));
        if (!isNaN(value)) {
          params[key] = value;
        }
      }
    }
  }

  return { raw: trimmed, command, params, comment };
}

/**
 * Parse G-code text into layers grouped by Z-height changes.
 */
export function parseGCode(gcode: string): GCodeAnalysis {
  const lines = gcode.split("\n");
  const layers: GCodeLayer[] = [];
  let currentZ = 0;
  let currentLayer: GCodeLayer | null = null;
  let totalFilament = 0;
  let lastE = 0;
  let absoluteE = true;
  let detectedSlicer: string | undefined;
  let estimatedTimeS: number | undefined;

  for (const line of lines) {
    const cmd = parseGCodeLine(line);

    // Detect slicer from comments
    if (cmd.comment) {
      if (!detectedSlicer) {
        if (cmd.comment.includes("PrusaSlicer")) detectedSlicer = "PrusaSlicer";
        else if (cmd.comment.includes("BambuStudio")) detectedSlicer = "BambuStudio";
        else if (cmd.comment.includes("OrcaSlicer")) detectedSlicer = "OrcaSlicer";
        else if (cmd.comment.includes("Cura")) detectedSlicer = "Cura";
        else if (cmd.comment.includes("Slic3r")) detectedSlicer = "Slic3r";
      }

      // Try to extract print time
      const timeMatch = cmd.comment.match(/estimated printing time.*?=\s*(.+)/i)
        ?? cmd.comment.match(/TIME:(\d+)/i);
      if (timeMatch && estimatedTimeS === undefined) {
        const parsed = parseTimeString(timeMatch[1]);
        if (parsed !== null) estimatedTimeS = parsed;
      }
    }

    // Track absolute/relative extrusion mode
    if (cmd.command === "M82") absoluteE = true;
    if (cmd.command === "M83") absoluteE = false;

    // Track Z changes (G0/G1 with Z parameter)
    if ((cmd.command === "G0" || cmd.command === "G1") && "Z" in cmd.params) {
      const newZ = cmd.params["Z"];
      if (newZ !== currentZ) {
        currentZ = newZ;
        currentLayer = {
          index: layers.length,
          zHeight: currentZ,
          commands: [],
          extrusionMm: 0,
        };
        layers.push(currentLayer);
      }
    }

    // Initialize first layer if needed
    if (!currentLayer && (cmd.command === "G0" || cmd.command === "G1")) {
      currentLayer = {
        index: 0,
        zHeight: currentZ,
        commands: [],
        extrusionMm: 0,
      };
      layers.push(currentLayer);
    }

    // Track extrusion
    if ((cmd.command === "G1" || cmd.command === "G0") && "E" in cmd.params) {
      const e = cmd.params["E"];
      if (absoluteE) {
        const delta = e - lastE;
        if (delta > 0) {
          totalFilament += delta;
          if (currentLayer) currentLayer.extrusionMm += delta;
        }
        lastE = e;
      } else {
        if (e > 0) {
          totalFilament += e;
          if (currentLayer) currentLayer.extrusionMm += e;
        }
      }
    }

    // Reset E
    if (cmd.command === "G92" && "E" in cmd.params) {
      lastE = cmd.params["E"];
    }

    if (currentLayer) {
      currentLayer.commands.push(cmd);
    }
  }

  // Estimate weight (PLA: 1.24 g/cm3, 1.75mm filament)
  const filamentRadiusMm = 1.75 / 2;
  const filamentAreaMm2 = Math.PI * filamentRadiusMm * filamentRadiusMm;
  const volumeMm3 = totalFilament * filamentAreaMm2;
  const volumeCm3 = volumeMm3 / 1000;
  const estimatedWeightG = volumeCm3 * 1.24;

  return {
    layers,
    totalFilamentMm: totalFilament,
    estimatedWeightG: Math.round(estimatedWeightG * 100) / 100,
    totalLines: lines.length,
    maxZ: currentZ,
    detectedSlicer,
    estimatedTimeS,
  };
}

/**
 * Extract a summary of filament usage per layer.
 */
export function getFilamentPerLayer(analysis: GCodeAnalysis): { z: number; mm: number }[] {
  return analysis.layers.map((l) => ({ z: l.zHeight, mm: Math.round(l.extrusionMm * 100) / 100 }));
}

/**
 * Parse time strings like "1h 23m 45s" or raw seconds.
 */
function parseTimeString(str: string): number | null {
  const trimmed = str.trim();

  // Raw number (seconds)
  const rawNum = parseFloat(trimmed);
  if (!isNaN(rawNum) && /^\d+$/.test(trimmed)) return rawNum;

  // "1h 23m 45s" format
  let total = 0;
  const hMatch = trimmed.match(/(\d+)\s*h/);
  const mMatch = trimmed.match(/(\d+)\s*m/);
  const sMatch = trimmed.match(/(\d+)\s*s/);

  if (hMatch || mMatch || sMatch) {
    if (hMatch) total += parseInt(hMatch[1], 10) * 3600;
    if (mMatch) total += parseInt(mMatch[1], 10) * 60;
    if (sMatch) total += parseInt(sMatch[1], 10);
    return total;
  }

  return null;
}
