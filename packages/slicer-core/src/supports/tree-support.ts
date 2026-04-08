/**
 * Organic tree support generator.
 *
 * Generates natural-looking tree support structures inspired by PrusaSlicer and
 * OrcaSlicer. Uses a bottom-up growth approach with Bezier-interpolated branches,
 * smooth tapering, elliptical cross-sections, and proper interface layers.
 *
 * Algorithm:
 * 1. Detect overhang contact points from face normals exceeding an angle threshold
 * 2. Grow branches upward from the build plate toward contact points
 * 3. Merge nearby branches at each Z level using weighted attraction
 * 4. Interpolate branch paths with cubic Bezier curves for smooth organic shapes
 * 5. Generate tapered elliptical cross-sections (thin tips, thick trunks)
 * 6. Add dense interface layers at contact points and build plate
 */

import type { OverhangZone } from "../arc-overhang";
import type { SupportInterfaceConfig, SupportInterfaceLayer } from "./support-interface";
import { generateInterfaceLayers } from "./support-interface";

// ==================== Types ====================

export interface TreeSupportConfig {
  /** Branch tip radius in mm (at contact point). Default: 0.5 */
  tipRadius?: number;
  /** Branch trunk radius in mm (at base). Default: 2.5 */
  trunkRadius?: number;
  /** Merge distance — branches within this distance merge. Default: 5.0 */
  mergeDistance?: number;
  /** Maximum branch angle from vertical in degrees. Default: 40 */
  maxBranchAngle?: number;
  /** Layer height in mm. Default: 0.2 */
  layerHeight?: number;
  /** Number of segments per cross-section. Default: 12 */
  circleSegments?: number;
  /** Nozzle width for extrusion calculations. Default: 0.4 */
  nozzleWidth?: number;
  /** Overhang angle threshold in degrees. Faces steeper than this get support. Default: 45 */
  overhangAngleThreshold?: number;
  /** Elliptical eccentricity factor (1.0 = circle, >1 = ellipse). Default: 1.3 */
  eccentricity?: number;
  /** Enable Bezier curve smoothing for branch paths. Default: true */
  smoothBranches?: boolean;
  /** Number of Bezier interpolation subdivisions per layer span. Default: 4 */
  bezierSubdivisions?: number;
  /** Support interface configuration. Default: enabled with 3 top / 2 bottom layers */
  interfaceConfig?: SupportInterfaceConfig;
  /** Enable interface layers. Default: true */
  enableInterface?: boolean;
}

interface ResolvedConfig {
  tipRadius: number;
  trunkRadius: number;
  mergeDistance: number;
  maxBranchAngle: number;
  layerHeight: number;
  circleSegments: number;
  nozzleWidth: number;
  overhangAngleThreshold: number;
  eccentricity: number;
  smoothBranches: boolean;
  bezierSubdivisions: number;
  enableInterface: boolean;
  interfaceConfig: SupportInterfaceConfig;
}

/** A point in 3D space used for branch path tracing. */
interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Represents a growing branch from build plate toward a contact point. */
interface OrganicBranch {
  /** Unique ID for this branch */
  id: number;
  /** The overhang contact point this branch aims for */
  target: Vec3;
  /** Current growth tip position */
  tip: Vec3;
  /** Full path of the branch from base to contact (ordered bottom-up) */
  path: Vec3[];
  /** Whether this branch has been absorbed into another */
  merged: boolean;
  /** Number of branches merged into this one (affects trunk thickness) */
  weight: number;
  /** The Z layer at which this branch was last active */
  activeZ: number;
}

/** A support path for one layer: array of polylines (each is a cross-section outline). */
export interface TreeSupportLayer {
  z: number;
  layerIndex: number;
  paths: { x: number; y: number }[][];
  /** Whether this is an interface layer (dense contact layer) */
  isInterface?: boolean;
  /** Interface layer type if applicable */
  interfaceType?: "top" | "bottom";
}

/** Full tree support result across all layers. */
export interface TreeSupportResult {
  layers: TreeSupportLayer[];
  /** Total number of branches at the top (contact points) */
  contactPoints: number;
  /** Number of trunk branches at the base (after merging) */
  baseTrunks: number;
  /** Interface layers generated */
  interfaceLayers: SupportInterfaceLayer[];
}

// ==================== Main Generator ====================

/**
 * Generate organic tree support structures from overhang zones.
 *
 * @param zones - Overhang zones from arc-overhang analysis
 * @param buildPlateZ - Z position of the build plate (usually 0)
 * @param config - Tree support configuration
 * @returns Tree support layers with toolpath polylines
 */
export function generateTreeSupport(
  zones: OverhangZone[],
  buildPlateZ: number = 0,
  config?: TreeSupportConfig,
): TreeSupportResult {
  const cfg = resolveConfig(config);

  // Step 1: Collect contact points using angle-based filtering
  const contactPoints = collectContactPoints(zones, cfg);

  if (contactPoints.length === 0) {
    return { layers: [], contactPoints: 0, baseTrunks: 0, interfaceLayers: [] };
  }

  // Step 2: Initialize branches from build plate growing upward
  const branches = initializeBranches(contactPoints, buildPlateZ, cfg);
  const totalContactPoints = branches.length;

  // Step 3: Grow branches upward layer by layer, merging as they go
  const maxContactZ = Math.max(...contactPoints.map((p) => p.z));
  const totalLayers = Math.ceil((maxContactZ - buildPlateZ) / cfg.layerHeight);

  if (totalLayers <= 0) {
    return { layers: [], contactPoints: totalContactPoints, baseTrunks: 0, interfaceLayers: [] };
  }

  growBranches(branches, buildPlateZ, maxContactZ, cfg);

  // Step 4: Smooth branch paths with Bezier interpolation
  if (cfg.smoothBranches) {
    for (const branch of branches) {
      if (!branch.merged && branch.path.length >= 3) {
        branch.path = smoothPath(branch.path, cfg.bezierSubdivisions);
      }
    }
  }

  // Step 5: Generate cross-section layers from branch paths
  const layers = generateLayers(branches, buildPlateZ, maxContactZ, totalLayers, cfg);

  // Step 6: Generate interface layers
  let interfaceLayers: SupportInterfaceLayer[] = [];
  if (cfg.enableInterface) {
    const activeBranches = branches.filter((b) => !b.merged);
    interfaceLayers = generateInterfaceLayers(
      activeBranches.map((b) => ({
        contactZ: b.target.z,
        baseZ: buildPlateZ,
        position: { x: b.target.x, y: b.target.y },
        radius: cfg.tipRadius,
      })),
      cfg.layerHeight,
      cfg.nozzleWidth,
      cfg.interfaceConfig,
    );

    // Merge interface layers into the main layer array
    for (const iface of interfaceLayers) {
      const existingIdx = layers.findIndex(
        (l) => Math.abs(l.z - iface.z) < cfg.layerHeight * 0.1,
      );
      if (existingIdx >= 0) {
        layers[existingIdx].paths.push(...iface.paths);
        layers[existingIdx].isInterface = true;
        layers[existingIdx].interfaceType = iface.type;
      } else {
        layers.push({
          z: iface.z,
          layerIndex: Math.round((iface.z - buildPlateZ) / cfg.layerHeight),
          paths: iface.paths,
          isInterface: true,
          interfaceType: iface.type,
        });
      }
    }

    // Re-sort layers by Z
    layers.sort((a, b) => a.z - b.z);
  }

  const baseTrunks = branches.filter((b) => !b.merged).length;

  return { layers, contactPoints: totalContactPoints, baseTrunks, interfaceLayers };
}

// ==================== Contact Point Collection ====================

/**
 * Collect overhang contact points using face normal angle threshold.
 * Only generates support where faces exceed the overhang angle threshold.
 */
function collectContactPoints(zones: OverhangZone[], cfg: ResolvedConfig): Vec3[] {
  const points: Vec3[] = [];

  for (const zone of zones) {
    // Filter by angle threshold: only support faces steeper than the threshold
    if (zone.averageAngle < cfg.overhangAngleThreshold) {
      continue;
    }

    // Also accept severe/extreme zones regardless of angle (backwards compat)
    const isSevere = zone.severity === "severe" || zone.severity === "extreme";
    if (!isSevere && zone.averageAngle < cfg.overhangAngleThreshold) {
      continue;
    }

    const bb = zone.boundingBox;
    const cx = (bb.min[0] + bb.max[0]) / 2;
    const cy = (bb.min[1] + bb.max[1]) / 2;
    const cz = bb.min[2]; // bottom of overhang

    // Add center contact point
    points.push({ x: cx, y: cy, z: cz });

    // For large zones, add distributed contact points
    const w = bb.max[0] - bb.min[0];
    const h = bb.max[1] - bb.min[1];
    const spacing = cfg.mergeDistance * 1.5;

    if (w > spacing || h > spacing) {
      const nx = Math.max(2, Math.ceil(w / spacing));
      const ny = Math.max(2, Math.ceil(h / spacing));
      const padding = cfg.tipRadius * 2;

      for (let ix = 0; ix < nx; ix++) {
        for (let iy = 0; iy < ny; iy++) {
          const px = bb.min[0] + padding + (ix / (nx - 1)) * (w - 2 * padding);
          const py = bb.min[1] + padding + (iy / (ny - 1)) * (h - 2 * padding);
          // Skip if too close to center (already added)
          const dx = px - cx;
          const dy = py - cy;
          if (Math.sqrt(dx * dx + dy * dy) > spacing * 0.5) {
            points.push({ x: px, y: py, z: cz });
          }
        }
      }
    }
  }

  return points;
}

// ==================== Branch Initialization ====================

/**
 * Initialize branches from the build plate, one per contact point.
 * Each branch starts at the build plate directly below its contact point.
 */
function initializeBranches(
  contactPoints: Vec3[],
  buildPlateZ: number,
  _cfg: ResolvedConfig,
): OrganicBranch[] {
  return contactPoints.map((target, i) => ({
    id: i,
    target,
    tip: { x: target.x, y: target.y, z: buildPlateZ },
    path: [{ x: target.x, y: target.y, z: buildPlateZ }],
    merged: false,
    weight: 1,
    activeZ: buildPlateZ,
  }));
}

// ==================== Branch Growth ====================

/**
 * Grow branches upward from the build plate toward their contact points.
 * At each Z level, branches move laterally toward their targets while
 * nearby branches merge together (trunk consolidation).
 */
function growBranches(
  branches: OrganicBranch[],
  buildPlateZ: number,
  maxZ: number,
  cfg: ResolvedConfig,
): void {
  const maxLateralPerLayer =
    cfg.layerHeight * Math.tan((cfg.maxBranchAngle * Math.PI) / 180);

  const totalHeight = maxZ - buildPlateZ;
  const layerCount = Math.ceil(totalHeight / cfg.layerHeight);

  for (let li = 1; li <= layerCount; li++) {
    const z = r2(buildPlateZ + li * cfg.layerHeight);
    const heightFraction = (z - buildPlateZ) / totalHeight;

    // Get active (non-merged) branches that haven't reached their contact Z yet
    const active = branches.filter((b) => !b.merged);

    // Merge nearby branches (bottom-up: branches close together consolidate)
    // Use a decreasing merge distance as we go up (tighter grouping near tips)
    const layerMergeDistance = cfg.mergeDistance * (1.5 - heightFraction * 0.8);

    for (let i = 0; i < active.length; i++) {
      if (active[i].merged) continue;
      for (let j = i + 1; j < active.length; j++) {
        if (active[j].merged) continue;

        // Only merge if both branches are still below their contact points
        if (z >= active[i].target.z * 0.85 || z >= active[j].target.z * 0.85) continue;

        const dx = active[i].tip.x - active[j].tip.x;
        const dy = active[i].tip.y - active[j].tip.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < layerMergeDistance) {
          // Merge j into i with weighted average
          const wi = active[i].weight;
          const wj = active[j].weight;
          const totalW = wi + wj;

          // The surviving branch aims for the higher contact point
          const higherTarget =
            active[i].target.z >= active[j].target.z ? active[i].target : active[j].target;

          active[i].tip.x = (active[i].tip.x * wi + active[j].tip.x * wj) / totalW;
          active[i].tip.y = (active[i].tip.y * wi + active[j].tip.y * wj) / totalW;
          active[i].weight = totalW;
          active[i].target = higherTarget;
          active[j].merged = true;
        }
      }
    }

    // Advance each active branch toward its target
    for (const branch of active) {
      if (branch.merged) continue;

      // Skip if already at or past contact Z
      if (z > branch.target.z) continue;

      // Compute lateral movement toward target
      const dx = branch.target.x - branch.tip.x;
      const dy = branch.target.y - branch.tip.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let moveX = 0;
      let moveY = 0;

      if (dist > 0.01) {
        // Accelerate lateral movement as we approach the contact point
        // Near the base, move slowly; near the top, move more aggressively
        const urgency = Math.pow(heightFraction, 1.5);
        const lateralBudget = maxLateralPerLayer * (0.3 + 0.7 * urgency);
        const moveAmount = Math.min(dist, lateralBudget);
        const scale = moveAmount / dist;
        moveX = dx * scale;
        moveY = dy * scale;
      }

      branch.tip = {
        x: r2(branch.tip.x + moveX),
        y: r2(branch.tip.y + moveY),
        z: r2(z),
      };
      branch.path.push({ ...branch.tip });
      branch.activeZ = z;
    }
  }
}

// ==================== Bezier Smoothing ====================

/**
 * Smooth a branch path using cubic Bezier interpolation.
 * Produces natural-looking curves between path waypoints.
 */
function smoothPath(path: Vec3[], subdivisions: number): Vec3[] {
  if (path.length < 3) return path;

  const smoothed: Vec3[] = [path[0]];

  for (let i = 0; i < path.length - 1; i++) {
    const p0 = path[Math.max(0, i - 1)];
    const p1 = path[i];
    const p2 = path[i + 1];
    const p3 = path[Math.min(path.length - 1, i + 2)];

    // Catmull-Rom to Bezier control points
    const cp1: Vec3 = {
      x: p1.x + (p2.x - p0.x) / 6,
      y: p1.y + (p2.y - p0.y) / 6,
      z: p1.z + (p2.z - p0.z) / 6,
    };
    const cp2: Vec3 = {
      x: p2.x - (p3.x - p1.x) / 6,
      y: p2.y - (p3.y - p1.y) / 6,
      z: p2.z - (p3.z - p1.z) / 6,
    };

    // Sample the cubic Bezier curve
    for (let s = 1; s <= subdivisions; s++) {
      const t = s / subdivisions;
      const pt = cubicBezier(p1, cp1, cp2, p2, t);
      smoothed.push(pt);
    }
  }

  return smoothed;
}

/** Evaluate a cubic Bezier curve at parameter t. */
function cubicBezier(p0: Vec3, p1: Vec3, p2: Vec3, p3: Vec3, t: number): Vec3 {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  const t2 = t * t;
  const t3 = t2 * t;

  return {
    x: r2(mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x),
    y: r2(mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y),
    z: r2(mt3 * p0.z + 3 * mt2 * t * p1.z + 3 * mt * t2 * p2.z + t3 * p3.z),
  };
}

// ==================== Layer Generation ====================

/**
 * Generate cross-section layers from the smoothed branch paths.
 * Uses tapered elliptical profiles that thin toward tips and thicken at trunks.
 */
function generateLayers(
  branches: OrganicBranch[],
  buildPlateZ: number,
  maxContactZ: number,
  totalLayers: number,
  cfg: ResolvedConfig,
): TreeSupportLayer[] {
  const layers: TreeSupportLayer[] = [];
  const totalHeight = maxContactZ - buildPlateZ;
  const activeBranches = branches.filter((b) => !b.merged);

  for (let li = 0; li < totalLayers; li++) {
    const z = r2(buildPlateZ + (li + 1) * cfg.layerHeight);
    const layerPaths: { x: number; y: number }[][] = [];

    for (const branch of activeBranches) {
      // Find the closest path point to this Z level
      const pathPoint = findPathPointAtZ(branch.path, z);
      if (!pathPoint) continue;

      // Only generate cross-section if below or at the contact Z
      if (z > branch.target.z + cfg.layerHeight) continue;

      // Radius: smooth taper from trunk (base) to tip (contact)
      const heightFraction = Math.min(1, (z - buildPlateZ) / (totalHeight || 1));
      // Use a smooth easing curve for natural taper
      const taperT = smoothstep(heightFraction);
      const baseRadius = cfg.trunkRadius + (cfg.tipRadius - cfg.trunkRadius) * taperT;

      // Thicken for merged branches (more weight = thicker trunk)
      const weightFactor = 1 + 0.25 * Math.log2(Math.max(branch.weight, 1));
      const radius = baseRadius * weightFactor;

      // Generate elliptical cross-section
      const profile = generateEllipse(
        pathPoint.x,
        pathPoint.y,
        radius,
        radius / cfg.eccentricity,
        cfg.circleSegments,
        // Rotate ellipse based on branch direction for more organic look
        getBranchAngleAtZ(branch.path, z),
      );

      layerPaths.push(profile);
    }

    if (layerPaths.length > 0) {
      layers.push({ z, layerIndex: li, paths: layerPaths });
    }
  }

  return layers;
}

/**
 * Find the XY position on a branch path at a given Z height.
 * Linearly interpolates between the two nearest path points.
 */
function findPathPointAtZ(path: Vec3[], z: number): { x: number; y: number } | null {
  if (path.length === 0) return null;

  // Path is ordered bottom-up by Z
  if (z <= path[0].z) return { x: path[0].x, y: path[0].y };
  if (z >= path[path.length - 1].z) {
    return { x: path[path.length - 1].x, y: path[path.length - 1].y };
  }

  // Find the two points bracketing this Z
  for (let i = 0; i < path.length - 1; i++) {
    if (path[i].z <= z && path[i + 1].z >= z) {
      const dz = path[i + 1].z - path[i].z;
      if (dz < 0.001) return { x: path[i].x, y: path[i].y };
      const t = (z - path[i].z) / dz;
      return {
        x: r2(path[i].x + (path[i + 1].x - path[i].x) * t),
        y: r2(path[i].y + (path[i + 1].y - path[i].y) * t),
      };
    }
  }

  return null;
}

/**
 * Get the lateral direction angle of a branch at a given Z height.
 * Used to orient elliptical cross-sections along the branch direction.
 */
function getBranchAngleAtZ(path: Vec3[], z: number): number {
  if (path.length < 2) return 0;

  for (let i = 0; i < path.length - 1; i++) {
    if (path[i].z <= z && path[i + 1].z >= z) {
      const dx = path[i + 1].x - path[i].x;
      const dy = path[i + 1].y - path[i].y;
      return Math.atan2(dy, dx);
    }
  }

  // Fallback: use last segment direction
  const last = path.length - 1;
  return Math.atan2(
    path[last].y - path[last - 1].y,
    path[last].x - path[last - 1].x,
  );
}

// ==================== Cross-Section Generators ====================

/**
 * Generate an elliptical cross-section polyline.
 * Produces tapered, organic-looking profiles instead of perfect circles.
 *
 * @param cx - Center X
 * @param cy - Center Y
 * @param rx - Radius along the primary axis
 * @param ry - Radius along the secondary axis
 * @param segments - Number of polygon segments
 * @param rotation - Rotation angle in radians
 */
function generateEllipse(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  segments: number,
  rotation: number,
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  const cosR = Math.cos(rotation);
  const sinR = Math.sin(rotation);

  for (let i = 0; i <= segments; i++) {
    const angle = (2 * Math.PI * i) / segments;
    // Ellipse point before rotation
    const ex = rx * Math.cos(angle);
    const ey = ry * Math.sin(angle);
    // Rotate and translate
    points.push({
      x: r2(cx + ex * cosR - ey * sinR),
      y: r2(cy + ex * sinR + ey * cosR),
    });
  }

  return points;
}

// ==================== Utility Functions ====================

/** Smooth Hermite interpolation (smoothstep). */
function smoothstep(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return clamped * clamped * (3 - 2 * clamped);
}

function resolveConfig(config?: TreeSupportConfig): ResolvedConfig {
  return {
    tipRadius: config?.tipRadius ?? 0.5,
    trunkRadius: config?.trunkRadius ?? 2.5,
    mergeDistance: config?.mergeDistance ?? 5.0,
    maxBranchAngle: config?.maxBranchAngle ?? 40,
    layerHeight: config?.layerHeight ?? 0.2,
    circleSegments: config?.circleSegments ?? 12,
    nozzleWidth: config?.nozzleWidth ?? 0.4,
    overhangAngleThreshold: config?.overhangAngleThreshold ?? 45,
    eccentricity: config?.eccentricity ?? 1.3,
    smoothBranches: config?.smoothBranches ?? true,
    bezierSubdivisions: config?.bezierSubdivisions ?? 4,
    enableInterface: config?.enableInterface ?? true,
    interfaceConfig: config?.interfaceConfig ?? {},
  };
}

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}
