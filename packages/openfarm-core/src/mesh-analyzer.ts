/**
 * Mesh analysis engine for OpenFarm.
 * Analyzes triangle mesh data for printability issues.
 */

export interface Triangle {
  v0: [number, number, number];
  v1: [number, number, number];
  v2: [number, number, number];
  normal: [number, number, number];
}

export interface MeshData {
  triangles: Triangle[];
  vertexCount: number;
  boundingBox: {
    min: [number, number, number];
    max: [number, number, number];
  };
}

export interface MeshMetrics {
  triangleCount: number;
  vertexCount: number;
  boundingBox: { min: [number, number, number]; max: [number, number, number] };
  dimensions: { x: number; y: number; z: number };
  volumeCm3: number;
  surfaceAreaCm2: number;
  isManifold: boolean;
  overhangAngleMax: number;
  thinWallMin: number;
  smallDetailMin: number;
  unsupportedAreaPercent: number;
  bridgeDistanceMax: number;
}

export interface FeasibilityIssue {
  type: "overhang" | "thin_wall" | "small_detail" | "bridge" | "suction_cup" | "trapped_volume" | "non_manifold" | "too_large" | "too_small";
  severity: "info" | "warning" | "critical";
  description: string;
  affectedArea?: { x: number; y: number; z: number };
}

export type FeasibilityVerdict = "printable" | "printable_with_issues" | "needs_rework" | "needs_redesign";

/**
 * Compute basic mesh metrics from triangle data.
 */
export function computeMeshMetrics(mesh: MeshData): MeshMetrics {
  const { triangles, vertexCount, boundingBox } = mesh;
  const dims = {
    x: boundingBox.max[0] - boundingBox.min[0],
    y: boundingBox.max[1] - boundingBox.min[1],
    z: boundingBox.max[2] - boundingBox.min[2],
  };

  let totalVolume = 0;
  let totalSurfaceArea = 0;
  let maxOverhangAngle = 0;
  let minWallThickness = Infinity;
  let minDetailSize = Infinity;
  let unsupportedTriangles = 0;
  let maxBridgeDistance = 0;

  const upVector: [number, number, number] = [0, 0, 1]; // Z-up

  for (const tri of triangles) {
    // Surface area of triangle (half cross product magnitude)
    const edge1 = subtract(tri.v1, tri.v0);
    const edge2 = subtract(tri.v2, tri.v0);
    const crossProd = cross(edge1, edge2);
    const area = magnitude(crossProd) / 2;
    totalSurfaceArea += area;

    // Signed volume contribution (divergence theorem)
    totalVolume += signedVolumeOfTriangle(tri.v0, tri.v1, tri.v2);

    // Overhang detection: angle between face normal and build direction (Z-up)
    const normal = tri.normal;
    const dotUp = dot(normal, upVector);
    // Overhang faces point downward (negative Z component in normal)
    if (dotUp < 0) {
      const angle = Math.acos(Math.max(-1, Math.min(1, -dotUp))) * (180 / Math.PI);
      maxOverhangAngle = Math.max(maxOverhangAngle, angle);
      if (angle > 45) {
        unsupportedTriangles++;
      }
    }

    // Approximate thin wall detection: check edge lengths as proxy
    const edgeLengths = [
      magnitude(edge1),
      magnitude(edge2),
      magnitude(subtract(tri.v2, tri.v1)),
    ];
    const shortestEdge = Math.min(...edgeLengths);
    minDetailSize = Math.min(minDetailSize, shortestEdge);

    // Bridge detection: horizontal spans without support underneath
    if (Math.abs(dotUp) < 0.1) {
      // Nearly horizontal face — check horizontal span
      const span = Math.max(...edgeLengths);
      maxBridgeDistance = Math.max(maxBridgeDistance, span);
    }
  }

  const volumeCm3 = Math.abs(totalVolume) / 1000; // mm³ to cm³
  const surfaceAreaCm2 = totalSurfaceArea / 100; // mm² to cm²
  const unsupportedAreaPercent = triangles.length > 0
    ? Math.round((unsupportedTriangles / triangles.length) * 100)
    : 0;

  // Simple manifold heuristic: check if volume is positive (closed mesh)
  const isManifold = Math.abs(totalVolume) > 0.001;

  // Thin wall estimation (very rough — proper ray casting would be needed for accuracy)
  minWallThickness = minDetailSize;

  return {
    triangleCount: triangles.length,
    vertexCount,
    boundingBox,
    dimensions: dims,
    volumeCm3,
    surfaceAreaCm2,
    isManifold,
    overhangAngleMax: maxOverhangAngle,
    thinWallMin: minWallThickness,
    smallDetailMin: minDetailSize,
    unsupportedAreaPercent,
    bridgeDistanceMax: maxBridgeDistance,
  };
}

// ==================== Vector Math Helpers ====================

function subtract(a: [number, number, number], b: [number, number, number]): [number, number, number] {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function cross(a: [number, number, number], b: [number, number, number]): [number, number, number] {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function dot(a: [number, number, number], b: [number, number, number]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function magnitude(v: [number, number, number]): number {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}

function signedVolumeOfTriangle(
  v0: [number, number, number],
  v1: [number, number, number],
  v2: [number, number, number]
): number {
  return (
    (v0[0] * (v1[1] * v2[2] - v2[1] * v1[2]) -
     v1[0] * (v0[1] * v2[2] - v2[1] * v0[2]) +
     v2[0] * (v0[1] * v1[2] - v1[1] * v0[2])) / 6
  );
}
