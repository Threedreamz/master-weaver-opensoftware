/**
 * Tree Support Generation
 *
 * Generates tree-like support structures for FDM prints.
 * Algorithm:
 * 1. Identify overhang points on the mesh (faces angled beyond threshold)
 * 2. Create support tips at each overhang point
 * 3. Grow branches downward, merging nearby branches
 * 4. Connect to the build plate or to the model surface
 */

export type Point3D = { x: number; y: number; z: number };

export interface SupportConfig {
  /** Overhang angle threshold in degrees (typically 45) */
  overhangAngle: number;
  /** Branch diameter at the tip in mm */
  tipDiameter: number;
  /** Branch diameter at the base in mm */
  baseDiameter: number;
  /** Z height step for branch growth in mm */
  layerHeight: number;
  /** Maximum horizontal distance branches can merge at */
  mergeDistance: number;
  /** Angle of branch growth from vertical in degrees (0 = straight down) */
  branchAngle: number;
  /** Gap between support tip and model surface in mm */
  contactGap: number;
}

export interface SupportBranch {
  /** Points along the branch centerline, from tip (top) to base (bottom) */
  path: Point3D[];
  /** Diameter at each point along the path */
  diameters: number[];
  /** Whether this branch touches the build plate */
  touchesBuildPlate: boolean;
}

export interface SupportTree {
  branches: SupportBranch[];
  /** Total number of overhang points detected */
  overhangPointCount: number;
}

export interface MeshTriangle {
  v0: Point3D;
  v1: Point3D;
  v2: Point3D;
  normal: Point3D;
}

/**
 * Detect overhang points on a mesh that need support.
 *
 * A face is considered overhanging when the angle between its normal
 * and the downward Z axis exceeds the overhang threshold.
 *
 * @returns Array of overhang contact points (centroids of overhanging triangles)
 */
export function detectOverhangPoints(
  triangles: MeshTriangle[],
  overhangAngleDeg: number,
): Point3D[] {
  const overhangPoints: Point3D[] = [];
  const cosThreshold = Math.cos(((180 - overhangAngleDeg) * Math.PI) / 180);

  for (const tri of triangles) {
    // Angle between face normal and -Z (downward)
    // Face needs support when normal points downward past threshold
    const nLen = Math.sqrt(
      tri.normal.x * tri.normal.x +
      tri.normal.y * tri.normal.y +
      tri.normal.z * tri.normal.z,
    );
    if (nLen < 1e-10) continue;

    const cosAngle = -tri.normal.z / nLen; // dot with (0,0,-1)

    if (cosAngle > cosThreshold) {
      // Triangle centroid as contact point
      overhangPoints.push({
        x: (tri.v0.x + tri.v1.x + tri.v2.x) / 3,
        y: (tri.v0.y + tri.v1.y + tri.v2.y) / 3,
        z: (tri.v0.z + tri.v1.z + tri.v2.z) / 3,
      });
    }
  }

  return overhangPoints;
}

/**
 * Generate tree supports from overhang points down to the build plate.
 *
 * @param overhangPoints - Points needing support
 * @param config - Support generation configuration
 * @param buildPlateZ - Z height of the build plate (typically 0)
 */
export function generateTreeSupports(
  overhangPoints: Point3D[],
  config: SupportConfig,
  buildPlateZ: number = 0,
): SupportTree {
  if (overhangPoints.length === 0) {
    return { branches: [], overhangPointCount: 0 };
  }

  // Sort overhang points by Z height (process top-down)
  const sorted = [...overhangPoints].sort((a, b) => b.z - a.z);

  // Initialize branches: one per overhang point
  const activeBranches: {
    tip: Point3D;
    currentPos: Point3D;
    path: Point3D[];
    diameters: number[];
    merged: boolean;
  }[] = sorted.map((pt) => ({
    tip: pt,
    currentPos: { x: pt.x, y: pt.y, z: pt.z - config.contactGap },
    path: [{ x: pt.x, y: pt.y, z: pt.z - config.contactGap }],
    diameters: [config.tipDiameter],
    merged: false,
  }));

  // Grow branches downward layer by layer
  const maxSteps = Math.ceil((sorted[0].z - buildPlateZ) / config.layerHeight);
  const branchAngleRad = (config.branchAngle * Math.PI) / 180;

  for (let step = 0; step < maxSteps; step++) {
    // Move each active branch down one layer
    for (const branch of activeBranches) {
      if (branch.merged) continue;
      if (branch.currentPos.z <= buildPlateZ) continue;

      const newZ = Math.max(buildPlateZ, branch.currentPos.z - config.layerHeight);

      // Slight inward movement toward centroid of all branches (tree-like convergence)
      const centroid = computeCentroid(
        activeBranches.filter((b) => !b.merged && b.currentPos.z > buildPlateZ).map((b) => b.currentPos),
      );

      const dx = centroid.x - branch.currentPos.x;
      const dy = centroid.y - branch.currentPos.y;
      const horizontalDist = Math.sqrt(dx * dx + dy * dy);

      let newX = branch.currentPos.x;
      let newY = branch.currentPos.y;

      if (horizontalDist > 0.1) {
        const maxHorizontalStep = config.layerHeight * Math.tan(branchAngleRad);
        const horizontalStep = Math.min(maxHorizontalStep, horizontalDist * 0.1);
        newX += (dx / horizontalDist) * horizontalStep;
        newY += (dy / horizontalDist) * horizontalStep;
      }

      branch.currentPos = { x: newX, y: newY, z: newZ };
      branch.path.push({ ...branch.currentPos });

      // Interpolate diameter
      const progress = 1 - (newZ - buildPlateZ) / (branch.tip.z - buildPlateZ);
      const diameter = config.tipDiameter + progress * (config.baseDiameter - config.tipDiameter);
      branch.diameters.push(diameter);
    }

    // Merge nearby branches
    for (let i = 0; i < activeBranches.length; i++) {
      if (activeBranches[i].merged) continue;
      if (activeBranches[i].currentPos.z <= buildPlateZ) continue;

      for (let j = i + 1; j < activeBranches.length; j++) {
        if (activeBranches[j].merged) continue;

        const dist = horizontalDistance(activeBranches[i].currentPos, activeBranches[j].currentPos);
        if (dist < config.mergeDistance) {
          // Merge j into i (j becomes merged)
          activeBranches[j].merged = true;
        }
      }
    }
  }

  // Convert to output format
  const branches: SupportBranch[] = activeBranches
    .filter((b) => !b.merged)
    .map((b) => ({
      path: b.path,
      diameters: b.diameters,
      touchesBuildPlate: b.currentPos.z <= buildPlateZ + config.layerHeight * 0.5,
    }));

  return {
    branches,
    overhangPointCount: overhangPoints.length,
  };
}

function computeCentroid(points: Point3D[]): Point3D {
  if (points.length === 0) return { x: 0, y: 0, z: 0 };
  let sx = 0, sy = 0, sz = 0;
  for (const p of points) {
    sx += p.x;
    sy += p.y;
    sz += p.z;
  }
  return { x: sx / points.length, y: sy / points.length, z: sz / points.length };
}

function horizontalDistance(a: Point3D, b: Point3D): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Create a default support configuration.
 */
export function createDefaultSupportConfig(): SupportConfig {
  return {
    overhangAngle: 45,
    tipDiameter: 0.6,
    baseDiameter: 2.0,
    layerHeight: 0.2,
    mergeDistance: 5.0,
    branchAngle: 15,
    contactGap: 0.15,
  };
}
