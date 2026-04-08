/**
 * Adaptive Layer Height
 *
 * Calculates variable layer heights based on the local surface angle
 * of the mesh. Steep (near-vertical) surfaces can use thicker layers
 * since the stairstepping is less visible, while shallow (near-horizontal)
 * surfaces need thinner layers for smooth finish.
 */

export interface AdaptiveLayerConfig {
  /** Minimum layer height in mm */
  minLayerHeight: number;
  /** Maximum layer height in mm */
  maxLayerHeight: number;
  /** Base (default) layer height in mm */
  baseLayerHeight: number;
  /** Quality factor 0-1 (higher = more adaptive, thinner on flat surfaces) */
  qualityFactor: number;
  /** Maximum layer height change between adjacent layers in mm */
  maxHeightStep: number;
}

export interface AdaptiveLayer {
  /** Layer index */
  index: number;
  /** Z-height of this layer bottom in mm */
  zBottom: number;
  /** Z-height of this layer top in mm */
  zTop: number;
  /** Layer thickness in mm */
  thickness: number;
}

/**
 * Triangle representation for surface angle calculation.
 */
export interface Triangle {
  v0: { x: number; y: number; z: number };
  v1: { x: number; y: number; z: number };
  v2: { x: number; y: number; z: number };
}

/**
 * Calculate the surface normal angle relative to the Z axis for a triangle.
 * Returns angle in radians: 0 = horizontal face (flat), PI/2 = vertical face.
 */
export function triangleSurfaceAngle(tri: Triangle): number {
  // Edge vectors
  const e1x = tri.v1.x - tri.v0.x;
  const e1y = tri.v1.y - tri.v0.y;
  const e1z = tri.v1.z - tri.v0.z;
  const e2x = tri.v2.x - tri.v0.x;
  const e2y = tri.v2.y - tri.v0.y;
  const e2z = tri.v2.z - tri.v0.z;

  // Cross product = face normal
  const nx = e1y * e2z - e1z * e2y;
  const ny = e1z * e2x - e1x * e2z;
  const nz = e1x * e2y - e1y * e2x;

  const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
  if (len < 1e-12) return Math.PI / 2; // Degenerate triangle

  // Angle between normal and Z-axis
  const cosAngle = Math.abs(nz) / len;
  return Math.acos(Math.min(1, cosAngle));
}

/**
 * Calculate the desired layer height at a given Z based on surrounding triangle angles.
 *
 * Near-vertical surfaces (angle near PI/2) get maxLayerHeight.
 * Near-horizontal surfaces (angle near 0) get minLayerHeight.
 */
export function desiredLayerHeight(
  surfaceAngle: number,
  config: AdaptiveLayerConfig,
): number {
  // surfaceAngle: 0 = horizontal normal (flat surface), PI/2 = vertical normal (wall)
  // For flat surfaces (small angle), we want thinner layers
  // For vertical surfaces (large angle), thicker layers are fine

  const t = Math.min(1, surfaceAngle / (Math.PI / 2));
  const adaptiveT = Math.pow(t, config.qualityFactor);

  return config.minLayerHeight + adaptiveT * (config.maxLayerHeight - config.minLayerHeight);
}

/**
 * Calculate adaptive layer heights for a mesh.
 *
 * @param triangles - Mesh triangles
 * @param totalHeight - Total object height in mm
 * @param config - Adaptive layer configuration
 * @returns Array of adaptive layers from bottom to top
 */
export function calculateAdaptiveLayers(
  triangles: Triangle[],
  totalHeight: number,
  config: AdaptiveLayerConfig,
): AdaptiveLayer[] {
  if (totalHeight <= 0) return [];

  // Pre-compute: for each Z range, find the minimum surface angle
  // (minimum angle = most horizontal surface = needs thinnest layer)
  const zSamples = Math.ceil(totalHeight / config.minLayerHeight);
  const zStep = totalHeight / zSamples;
  const angleAtZ = new Float64Array(zSamples + 1);
  angleAtZ.fill(Math.PI / 2); // Default: vertical (allows thick layers)

  for (const tri of triangles) {
    const angle = triangleSurfaceAngle(tri);
    const zMin = Math.min(tri.v0.z, tri.v1.z, tri.v2.z);
    const zMax = Math.max(tri.v0.z, tri.v1.z, tri.v2.z);

    const iMin = Math.max(0, Math.floor(zMin / zStep));
    const iMax = Math.min(zSamples, Math.ceil(zMax / zStep));

    for (let i = iMin; i <= iMax; i++) {
      angleAtZ[i] = Math.min(angleAtZ[i], angle);
    }
  }

  // Build layers bottom-up with smoothing constraint
  const layers: AdaptiveLayer[] = [];
  let z = 0;
  let prevThickness = config.baseLayerHeight;

  while (z < totalHeight - config.minLayerHeight * 0.5) {
    const sampleIndex = Math.min(zSamples, Math.floor(z / zStep));
    const angle = angleAtZ[sampleIndex];

    let targetThickness = desiredLayerHeight(angle, config);

    // Enforce smoothing: limit change between adjacent layers
    const maxThickness = prevThickness + config.maxHeightStep;
    const minThickness = prevThickness - config.maxHeightStep;
    targetThickness = Math.max(config.minLayerHeight, Math.min(config.maxLayerHeight, targetThickness));
    targetThickness = Math.max(minThickness, Math.min(maxThickness, targetThickness));

    // Don't overshoot total height
    const remaining = totalHeight - z;
    if (remaining < targetThickness * 1.5) {
      targetThickness = remaining;
    }

    layers.push({
      index: layers.length,
      zBottom: z,
      zTop: z + targetThickness,
      thickness: targetThickness,
    });

    prevThickness = targetThickness;
    z += targetThickness;
  }

  return layers;
}
