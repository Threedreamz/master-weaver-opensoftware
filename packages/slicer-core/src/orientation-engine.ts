/**
 * Automatic part orientation engine for slicer-core.
 * Finds optimal print orientations to minimize support material
 * while respecting cosmetic surface constraints.
 */
import type { MeshData, Triangle } from "./mesh-analyzer";

export interface OrientationCandidate {
  rotationX: number;  // degrees
  rotationY: number;
  rotationZ: number;
  supportVolumeCm3: number;
  printTimeEstimate: number;  // seconds
  surfaceQualityScore: number;  // 0-100
  unsupportedFaceCount: number;
  cosmeticFacePenalty: number;
}

export interface OrientationOptions {
  technology: "fdm" | "sla" | "sls";
  cosmeticFaceIndices?: number[];  // Triangle indices marked as cosmetic
  overhangAngle?: number;  // Override default (45 for FDM)
  maxCandidates?: number;  // Return top N (default: 5)
}

// 26 sampling directions: 6 face normals + 12 edge midpoints + 8 corner directions
const SAMPLE_DIRECTIONS: [number, number, number][] = [
  // Face normals (6)
  [0, 0, 1], [0, 0, -1],
  [0, 1, 0], [0, -1, 0],
  [1, 0, 0], [-1, 0, 0],
  // Edge midpoints (12)
  [1, 1, 0], [1, -1, 0], [-1, 1, 0], [-1, -1, 0],
  [1, 0, 1], [1, 0, -1], [-1, 0, 1], [-1, 0, -1],
  [0, 1, 1], [0, 1, -1], [0, -1, 1], [0, -1, -1],
  // Corners (8)
  [1, 1, 1], [1, 1, -1], [1, -1, 1], [1, -1, -1],
  [-1, 1, 1], [-1, 1, -1], [-1, -1, 1], [-1, -1, -1],
];

/**
 * Compute optimal orientations for a mesh.
 * Returns top candidates sorted by composite score.
 */
export function computeOrientations(
  mesh: MeshData,
  options: OrientationOptions
): OrientationCandidate[] {
  const {
    technology,
    cosmeticFaceIndices = [],
    maxCandidates = 5,
  } = options;

  const overhangAngle = options.overhangAngle ?? getDefaultOverhangAngle(technology);
  const cosmeticSet = new Set(cosmeticFaceIndices);

  const candidates: OrientationCandidate[] = [];

  for (const dir of SAMPLE_DIRECTIONS) {
    // Normalize direction
    const len = Math.sqrt(dir[0] ** 2 + dir[1] ** 2 + dir[2] ** 2);
    const ndir: [number, number, number] = [dir[0] / len, dir[1] / len, dir[2] / len];

    // Compute rotation to align this direction with Z-up
    const rotation = directionToEuler(ndir);

    // Evaluate this orientation
    const evaluation = evaluateOrientation(
      mesh.triangles,
      ndir,
      overhangAngle,
      cosmeticSet,
      technology
    );

    candidates.push({
      rotationX: round2(rotation[0]),
      rotationY: round2(rotation[1]),
      rotationZ: round2(rotation[2]),
      ...evaluation,
    });
  }

  // Sort by composite score (lower penalty = better)
  candidates.sort((a, b) => {
    const scoreA = compositeScore(a);
    const scoreB = compositeScore(b);
    return scoreB - scoreA; // Higher score = better
  });

  return candidates.slice(0, maxCandidates);
}

function evaluateOrientation(
  triangles: Triangle[],
  buildDirection: [number, number, number],
  overhangAngle: number,
  cosmeticFaces: Set<number>,
  technology: string
): Omit<OrientationCandidate, "rotationX" | "rotationY" | "rotationZ"> {
  const overhangThreshold = Math.cos((180 - overhangAngle) * (Math.PI / 180));
  let unsupportedArea = 0;
  let totalArea = 0;
  let unsupportedFaceCount = 0;
  let cosmeticFacePenalty = 0;

  for (let i = 0; i < triangles.length; i++) {
    const tri = triangles[i];
    const area = triangleArea(tri);
    totalArea += area;

    // Check if face needs support: face normal points against build direction
    const dotProduct = dot3(tri.normal, buildDirection);
    const needsSupport = dotProduct < overhangThreshold;

    if (needsSupport) {
      unsupportedArea += area;
      unsupportedFaceCount++;

      // Extra penalty for cosmetic faces that need support
      if (cosmeticFaces.has(i)) {
        cosmeticFacePenalty += area * 3; // 3x weight for cosmetic surfaces
      }
    }
  }

  // Estimate support volume (rough: unsupported area * average depth)
  const supportDensity = technology === "sls" ? 0 : 0.15; // SLS needs no supports
  const supportVolumeCm3 = (unsupportedArea * 2 * supportDensity) / 1000; // mm3 to cm3

  // Estimate print time impact (more supports = more time)
  const baseTime = totalArea * 0.5; // rough seconds per mm2 of area
  const supportTime = unsupportedArea * 0.3;
  const printTimeEstimate = Math.round(baseTime + supportTime);

  // Surface quality: penalize orientations where cosmetic faces get support marks
  const qualityBase = totalArea > 0
    ? 100 - Math.round((unsupportedArea / totalArea) * 50)
    : 100;
  const cosmeticPenaltyNorm = cosmeticFaces.size > 0
    ? Math.round((cosmeticFacePenalty / (totalArea || 1)) * 50)
    : 0;
  const surfaceQualityScore = Math.max(0, Math.min(100, qualityBase - cosmeticPenaltyNorm));

  return {
    supportVolumeCm3: round2(supportVolumeCm3),
    printTimeEstimate,
    surfaceQualityScore,
    unsupportedFaceCount,
    cosmeticFacePenalty: round2(cosmeticFacePenalty),
  };
}

function compositeScore(c: OrientationCandidate): number {
  // Higher = better. Weight: 40% surface quality, 40% low support, 20% time
  const supportPenalty = Math.min(c.supportVolumeCm3 * 10, 40);
  const timePenalty = Math.min(c.printTimeEstimate / 100, 20);
  return c.surfaceQualityScore * 0.4 + (40 - supportPenalty) + (20 - timePenalty);
}

// ==================== Math Helpers ====================

function getDefaultOverhangAngle(technology: string): number {
  switch (technology) {
    case "fdm": return 45;
    case "sla": return 30;   // SLA is more sensitive to overhangs
    case "sls": return 90;   // SLS is self-supporting
    default: return 45;
  }
}

function triangleArea(tri: Triangle): number {
  const e1: [number, number, number] = [
    tri.v1[0] - tri.v0[0],
    tri.v1[1] - tri.v0[1],
    tri.v1[2] - tri.v0[2],
  ];
  const e2: [number, number, number] = [
    tri.v2[0] - tri.v0[0],
    tri.v2[1] - tri.v0[1],
    tri.v2[2] - tri.v0[2],
  ];
  const cp = cross3(e1, e2);
  return Math.sqrt(cp[0] ** 2 + cp[1] ** 2 + cp[2] ** 2) / 2;
}

function dot3(a: [number, number, number], b: [number, number, number]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross3(a: [number, number, number], b: [number, number, number]): [number, number, number] {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function directionToEuler(dir: [number, number, number]): [number, number, number] {
  // Convert a direction vector to Euler angles (XYZ convention, degrees)
  // that would rotate the object so this direction points DOWN (onto the build plate).
  // Three.js uses Y-up with build plate in XZ plane.
  // We want the chosen face normal to align with -Y (facing down onto plate).
  const [dx, dy, dz] = dir;

  // Rotation around X-axis to tilt the direction toward -Y
  const rotX = Math.atan2(dz, -dy) * (180 / Math.PI);
  // Rotation around Z-axis for the remaining alignment
  const rotZ = Math.atan2(dx, Math.sqrt(dy * dy + dz * dz)) * (180 / Math.PI);

  return [rotX, 0, rotZ];
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
