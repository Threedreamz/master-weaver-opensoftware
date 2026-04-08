/**
 * Support interface layer generator.
 *
 * Generates dense interface layers at the top (where support contacts the model)
 * and bottom (where support contacts the build plate) of tree support structures.
 * Interface layers improve print quality by providing a stable surface for the
 * model to print on and enabling clean separation after printing.
 *
 * Top interface: 2-3 dense rectilinear layers at each contact point
 * Bottom interface: 1-2 dense rectilinear layers at the build plate
 * Pattern: rectilinear lines perpendicular to the model surface
 */

// ==================== Types ====================

export interface SupportInterfaceConfig {
  /** Number of dense top interface layers (at model contact). Default: 3 */
  topLayers?: number;
  /** Number of dense bottom interface layers (at build plate). Default: 2 */
  bottomLayers?: number;
  /** Interface layer line spacing in mm (smaller = denser). Default: 0.3 */
  lineSpacing?: number;
  /** Interface pattern rotation angle in degrees. Default: 0 (aligned with X axis) */
  patternAngle?: number;
  /** Gap between interface and model in mm (for easy separation). Default: 0.1 */
  contactGap?: number;
}

interface ResolvedInterfaceConfig {
  topLayers: number;
  bottomLayers: number;
  lineSpacing: number;
  patternAngle: number;
  contactGap: number;
}

/** Describes where a support branch contacts the model or build plate. */
export interface SupportContactPoint {
  /** Z height of the overhang contact */
  contactZ: number;
  /** Z height of the build plate base */
  baseZ: number;
  /** XY position of the contact */
  position: { x: number; y: number };
  /** Radius of the support at this contact */
  radius: number;
}

/** A generated interface layer with dense fill paths. */
export interface SupportInterfaceLayer {
  z: number;
  type: "top" | "bottom";
  paths: { x: number; y: number }[][];
}

// ==================== Main Generator ====================

/**
 * Generate dense interface layers for support contact points.
 *
 * Creates rectilinear fill patterns at the top (model contact) and bottom
 * (build plate) of each support branch for clean adhesion and separation.
 *
 * @param contacts - Support contact points (one per branch)
 * @param layerHeight - Layer height in mm
 * @param nozzleWidth - Nozzle width in mm (used for line width)
 * @param config - Interface configuration
 * @returns Array of interface layers with dense fill paths
 */
export function generateInterfaceLayers(
  contacts: SupportContactPoint[],
  layerHeight: number,
  nozzleWidth: number,
  config?: SupportInterfaceConfig,
): SupportInterfaceLayer[] {
  const cfg = resolveInterfaceConfig(config);
  const layers: SupportInterfaceLayer[] = [];

  for (const contact of contacts) {
    // Top interface layers (at model contact)
    for (let i = 0; i < cfg.topLayers; i++) {
      const z = r2(contact.contactZ - cfg.contactGap - i * layerHeight);
      if (z <= contact.baseZ) continue;

      // Alternate pattern angle by 90 degrees on alternating layers for strength
      const angle = cfg.patternAngle + (i % 2 === 0 ? 0 : 90);
      const fill = generateRectilinearFill(
        contact.position.x,
        contact.position.y,
        contact.radius * 1.2, // Slightly wider than the branch for coverage
        cfg.lineSpacing,
        angle,
        nozzleWidth,
      );

      if (fill.length > 0) {
        layers.push({ z, type: "top", paths: fill });
      }
    }

    // Bottom interface layers (at build plate)
    for (let i = 0; i < cfg.bottomLayers; i++) {
      const z = r2(contact.baseZ + (i + 1) * layerHeight);
      if (z >= contact.contactZ) continue;

      const angle = cfg.patternAngle + (i % 2 === 0 ? 0 : 90);
      const fill = generateRectilinearFill(
        contact.position.x,
        contact.position.y,
        contact.radius * 1.5, // Wider base for better adhesion
        cfg.lineSpacing,
        angle,
        nozzleWidth,
      );

      if (fill.length > 0) {
        layers.push({ z, type: "bottom", paths: fill });
      }
    }
  }

  return layers;
}

// ==================== Fill Pattern Generator ====================

/**
 * Generate rectilinear fill lines within a circular region.
 *
 * Creates parallel lines at the specified angle, clipped to a circle
 * centered at (cx, cy) with the given radius. This produces a dense,
 * flat surface ideal for model contact.
 *
 * @param cx - Center X of the fill region
 * @param cy - Center Y of the fill region
 * @param radius - Radius of the fill region
 * @param spacing - Distance between fill lines
 * @param angleDeg - Angle of the fill lines in degrees
 * @param lineWidth - Width of each line (for offset calculations)
 * @returns Array of polylines (each line is a 2-point path)
 */
function generateRectilinearFill(
  cx: number,
  cy: number,
  radius: number,
  spacing: number,
  angleDeg: number,
  _lineWidth: number,
): { x: number; y: number }[][] {
  const paths: { x: number; y: number }[][] = [];
  const angleRad = (angleDeg * Math.PI) / 180;
  const cosA = Math.cos(angleRad);
  const sinA = Math.sin(angleRad);

  // Generate parallel lines perpendicular to the angle
  // Lines are offset from center by `spacing` increments
  const numLines = Math.ceil((radius * 2) / spacing);

  for (let i = -numLines; i <= numLines; i++) {
    const offset = i * spacing;

    // Line perpendicular to the angle direction, offset from center
    // Line direction: (cosA, sinA), offset direction: (-sinA, cosA)
    const offsetX = -sinA * offset;
    const offsetY = cosA * offset;

    // Line extends along the angle direction, clipped to the circle
    // Find intersection of the line with the circle
    const distFromCenter = Math.abs(offset);
    if (distFromCenter >= radius) continue;

    // Half-length of the chord at this offset
    const halfChord = Math.sqrt(radius * radius - offset * offset);

    const x1 = r2(cx + offsetX - cosA * halfChord);
    const y1 = r2(cy + offsetY - sinA * halfChord);
    const x2 = r2(cx + offsetX + cosA * halfChord);
    const y2 = r2(cy + offsetY + sinA * halfChord);

    paths.push([
      { x: x1, y: y1 },
      { x: x2, y: y2 },
    ]);
  }

  return paths;
}

// ==================== Helpers ====================

function resolveInterfaceConfig(config?: SupportInterfaceConfig): ResolvedInterfaceConfig {
  return {
    topLayers: config?.topLayers ?? 3,
    bottomLayers: config?.bottomLayers ?? 2,
    lineSpacing: config?.lineSpacing ?? 0.3,
    patternAngle: config?.patternAngle ?? 0,
    contactGap: config?.contactGap ?? 0.1,
  };
}

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}
