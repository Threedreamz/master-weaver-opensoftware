/**
 * Arc overhang detection and optimization engine for slicer-core.
 *
 * Detects overhang regions in a triangle mesh, classifies them by severity,
 * and generates arc-shaped toolpaths for improved overhang print quality.
 * Inspired by OrcaSlicer/Cura arc fitting and PrusaSlicer overhang perimeters.
 */

import type { Triangle } from "./mesh-analyzer";

// ==================== Types ====================

export interface OverhangFace {
  triangleIndex: number;
  normal: [number, number, number];
  /** Angle from vertical (build direction) in degrees */
  angle: number;
  severity: "none" | "mild" | "moderate" | "severe" | "extreme";
  centroid: [number, number, number];
  /** Triangle area in mm^2 */
  area: number;
}

export interface OverhangZone {
  id: string;
  severity: "mild" | "moderate" | "severe" | "extreme";
  faces: OverhangFace[];
  boundingBox: { min: [number, number, number]; max: [number, number, number] };
  /** Total overhang area in mm^2 */
  totalArea: number;
  /** Average overhang angle in degrees */
  averageAngle: number;
  /** Recommended print parameters for this zone */
  recommendations: OverhangRecommendation;
}

export interface OverhangRecommendation {
  /** Speed multiplier relative to base speed (0.3 - 1.0, lower for steeper overhangs) */
  speedMultiplier: number;
  /** Cooling multiplier relative to base fan (1.0 - 3.0, higher for overhangs) */
  coolingMultiplier: number;
  /** Flow rate multiplier (0.85 - 1.0, slightly reduced for overhangs) */
  flowMultiplier: number;
  /** Whether arc paths should be used instead of straight lines */
  arcEnabled: boolean;
  /** Radius of arc paths in mm */
  arcRadius: number;
  /** Number of segments per arc */
  arcSegments: number;
  /** Optimal bridge infill direction in degrees (if applicable) */
  bridgeInfillAngle?: number;
}

export interface ArcOverhangOptions {
  /** Minimum angle (degrees from vertical) to consider as overhang. Default: 25 */
  minOverhangAngle?: number;
  /** Angle thresholds for severity classification (degrees) */
  thresholds?: {
    mild: number;     // default: 25
    moderate: number; // default: 45
    severe: number;   // default: 60
    extreme: number;  // default: 75
  };
  /** Enable arc path generation. Default: true */
  enableArcPaths?: boolean;
  /** Minimum arc radius in mm. Default: 2.0 */
  minArcRadius?: number;
  /** Maximum arc radius in mm. Default: 20.0 */
  maxArcRadius?: number;
  /** Number of segments per full arc. Default: 24 */
  arcResolution?: number;
  /** Merge nearby overhang faces into zones. Default: true */
  mergeZones?: boolean;
  /** Maximum distance (mm) between centroids to merge faces into same zone. Default: 5.0 */
  mergeDistance?: number;
  /** Layer height in mm, used for arc path generation. Default: 0.2 */
  layerHeight?: number;
}

export interface ArcOverhangResult {
  totalFaces: number;
  overhangFaces: number;
  overhangPercentage: number;
  zones: OverhangZone[];
  arcPaths: ArcPath[];
  summary: {
    mildCount: number;
    moderateCount: number;
    severeCount: number;
    extremeCount: number;
    /** Number of zones where supports are strongly recommended */
    recommendedSupportZones: number;
    /** Estimated quality improvement (0-100) vs straight perimeters */
    estimatedQualityGain: number;
  };
}

export interface ArcPath {
  zoneId: string;
  /** Z height of this path layer in mm */
  layerZ: number;
  segments: ArcSegment[];
  /** Total path length in mm */
  totalLength: number;
}

export interface ArcSegment {
  type: "arc" | "line";
  /** XY start point in mm */
  start: [number, number];
  /** XY end point in mm */
  end: [number, number];
  /** Arc center point (only for arc type) */
  center?: [number, number];
  /** Arc radius in mm (only for arc type) */
  radius?: number;
  /** Arc winding direction (only for arc type) */
  clockwise?: boolean;
  /** Recommended print speed in mm/s */
  speed: number;
  /** Flow rate multiplier */
  flow: number;
}

// ==================== Default Options ====================

const DEFAULT_OPTIONS: Required<ArcOverhangOptions> = {
  minOverhangAngle: 25,
  thresholds: { mild: 25, moderate: 45, severe: 60, extreme: 75 },
  enableArcPaths: true,
  minArcRadius: 2.0,
  maxArcRadius: 20.0,
  arcResolution: 24,
  mergeZones: true,
  mergeDistance: 5.0,
  layerHeight: 0.2,
};

// ==================== Public API ====================

/**
 * Main entry point: detect overhangs, classify zones, and generate arc paths.
 *
 * @param triangles - Array of mesh triangles with vertices and normals
 * @param options - Detection and path generation options
 * @returns Complete overhang analysis with zones, arc paths, and summary
 */
export function analyzeOverhangs(
  triangles: Triangle[],
  options?: ArcOverhangOptions
): ArcOverhangResult {
  const opts = resolveOptions(options);

  // Step 1: Detect overhang faces
  const allFaces = detectOverhangs(triangles, opts);
  const overhangFaces = allFaces.filter((f) => f.severity !== "none");

  // Step 2: Classify into zones
  const zones = classifyOverhangZones(overhangFaces, opts);

  // Step 3: Generate arc paths
  const arcPaths = opts.enableArcPaths
    ? generateArcPaths(zones, opts.layerHeight, opts)
    : [];

  // Step 4: Build summary
  const mildCount = overhangFaces.filter((f) => f.severity === "mild").length;
  const moderateCount = overhangFaces.filter((f) => f.severity === "moderate").length;
  const severeCount = overhangFaces.filter((f) => f.severity === "severe").length;
  const extremeCount = overhangFaces.filter((f) => f.severity === "extreme").length;

  const recommendedSupportZones = zones.filter(
    (z) => z.severity === "severe" || z.severity === "extreme"
  ).length;

  // Quality gain estimate: more severe overhangs benefit more from arc paths
  const totalOverhangArea = zones.reduce((sum, z) => sum + z.totalArea, 0);
  const weightedSeverity = zones.reduce((sum, z) => {
    const weight = severityWeight(z.severity);
    return sum + z.totalArea * weight;
  }, 0);
  const estimatedQualityGain =
    totalOverhangArea > 0
      ? Math.round(Math.min(100, (weightedSeverity / totalOverhangArea) * 30))
      : 0;

  return {
    totalFaces: triangles.length,
    overhangFaces: overhangFaces.length,
    overhangPercentage:
      triangles.length > 0
        ? round2((overhangFaces.length / triangles.length) * 100)
        : 0,
    zones,
    arcPaths,
    summary: {
      mildCount,
      moderateCount,
      severeCount,
      extremeCount,
      recommendedSupportZones,
      estimatedQualityGain,
    },
  };
}

/**
 * Detect overhang faces in a triangle mesh.
 *
 * For each triangle, computes the angle between its face normal and the
 * vertical build direction (Z-up). Faces whose downward-facing angle exceeds
 * the minimum threshold are classified by severity.
 *
 * @param triangles - Array of mesh triangles
 * @param options - Detection options (thresholds, minimum angle)
 * @returns Array of overhang face descriptors for every input triangle
 */
export function detectOverhangs(
  triangles: Triangle[],
  options?: ArcOverhangOptions
): OverhangFace[] {
  const opts = resolveOptions(options);
  const { thresholds, minOverhangAngle } = opts;
  const buildDir: [number, number, number] = [0, 0, 1]; // Z-up

  const faces: OverhangFace[] = [];

  for (let i = 0; i < triangles.length; i++) {
    const tri = triangles[i];

    // Use the triangle's stored normal, or compute it from vertices
    const normal = isZeroVector(tri.normal)
      ? computeNormal(tri.v0, tri.v1, tri.v2)
      : tri.normal;

    // Angle between normal and build direction
    // For overhang detection we care about the angle from the downward direction:
    // a face pointing straight down has normal (0,0,-1), angle from vertical = 180 degrees,
    // but the "overhang angle" is measured as the angle the face makes with horizontal.
    // Convention: overhang angle = angle between the inverted normal and the build direction
    // when the normal points downward (dotUp < 0).
    const dotUp = dot3(normal, buildDir);

    let overhangAngle = 0;
    if (dotUp < 0) {
      // Face points downward — compute angle from vertical for the downward component
      // acos(-dotUp) gives the angle between the inverted normal and Z-up
      overhangAngle = Math.acos(clamp(-dotUp, -1, 1)) * RAD2DEG;
    }

    const severity = classifySeverity(overhangAngle, minOverhangAngle, thresholds);
    const centroid = triangleCentroid(tri.v0, tri.v1, tri.v2);
    const area = triangleArea(tri.v0, tri.v1, tri.v2);

    faces.push({
      triangleIndex: i,
      normal,
      angle: round2(overhangAngle),
      severity,
      centroid,
      area: round2(area),
    });
  }

  return faces;
}

/**
 * Group overhang faces into spatial zones by proximity clustering.
 *
 * Uses a simple distance-based merging strategy: faces whose centroids
 * are within `mergeDistance` of any face already in a zone are added to
 * that zone. Zones receive print-parameter recommendations based on
 * their aggregate severity.
 *
 * @param faces - Overhang faces (severity !== 'none') from detectOverhangs
 * @param options - Merge distance and zone options
 * @returns Array of overhang zones with recommendations
 */
export function classifyOverhangZones(
  faces: OverhangFace[],
  options?: ArcOverhangOptions
): OverhangZone[] {
  const opts = resolveOptions(options);

  if (faces.length === 0) return [];

  // Filter to actual overhang faces
  const overhangFaces = faces.filter((f) => f.severity !== "none");
  if (overhangFaces.length === 0) return [];

  if (!opts.mergeZones) {
    // Each face is its own zone
    return overhangFaces.map((face, idx) =>
      buildZone(`zone-${idx}`, [face])
    );
  }

  // Distance-based clustering using union-find
  const n = overhangFaces.length;
  const parent = Array.from({ length: n }, (_, i) => i);

  function find(x: number): number {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]]; // path compression
      x = parent[x];
    }
    return x;
  }

  function union(a: number, b: number): void {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  }

  const mergeDistSq = opts.mergeDistance * opts.mergeDistance;

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const distSq = distanceSquared3(
        overhangFaces[i].centroid,
        overhangFaces[j].centroid
      );
      if (distSq <= mergeDistSq) {
        union(i, j);
      }
    }
  }

  // Group faces by their root
  const groups = new Map<number, OverhangFace[]>();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    let group = groups.get(root);
    if (!group) {
      group = [];
      groups.set(root, group);
    }
    group.push(overhangFaces[i]);
  }

  // Build zones
  const zones: OverhangZone[] = [];
  let zoneIdx = 0;
  for (const group of groups.values()) {
    zones.push(buildZone(`zone-${zoneIdx++}`, group));
  }

  // Sort by severity (most severe first) then by area
  const severityOrder: Record<string, number> = {
    extreme: 0,
    severe: 1,
    moderate: 2,
    mild: 3,
  };
  zones.sort(
    (a, b) =>
      severityOrder[a.severity] - severityOrder[b.severity] ||
      b.totalArea - a.totalArea
  );

  return zones;
}

/**
 * Generate arc-shaped toolpath segments for overhang zones.
 *
 * For each zone, at each layer Z within the zone's vertical extent,
 * generates arc segments that follow the zone's contour. Arc radius
 * is inversely proportional to overhang severity (steeper = tighter arcs).
 *
 * @param zones - Overhang zones from classifyOverhangZones
 * @param layerHeight - Slice layer height in mm
 * @param options - Arc generation options (resolution, radius bounds)
 * @returns Array of arc paths, one per zone per layer
 */
export function generateArcPaths(
  zones: OverhangZone[],
  layerHeight: number,
  options?: ArcOverhangOptions
): ArcPath[] {
  const opts = resolveOptions(options);
  const paths: ArcPath[] = [];

  if (!opts.enableArcPaths || layerHeight <= 0) return paths;

  for (const zone of zones) {
    const rec = zone.recommendations;
    const minZ = zone.boundingBox.min[2];
    const maxZ = zone.boundingBox.max[2];

    // Generate path for each layer within this zone's height range
    const startLayer = Math.ceil(minZ / layerHeight);
    const endLayer = Math.floor(maxZ / layerHeight);

    for (let layer = startLayer; layer <= endLayer; layer++) {
      const z = layer * layerHeight;
      const segments = generateArcSegmentsForLayer(zone, z, rec, opts);
      if (segments.length === 0) continue;

      let totalLength = 0;
      for (const seg of segments) {
        totalLength += segmentLength(seg);
      }

      paths.push({
        zoneId: zone.id,
        layerZ: round2(z),
        segments,
        totalLength: round2(totalLength),
      });
    }
  }

  return paths;
}

/**
 * Get recommended print parameters for a given overhang severity level.
 *
 * @param severity - Overhang severity classification
 * @returns Print parameter recommendations tuned for that severity
 */
export function getOverhangRecommendation(
  severity: "mild" | "moderate" | "severe" | "extreme"
): OverhangRecommendation {
  switch (severity) {
    case "mild":
      return {
        speedMultiplier: 0.8,
        coolingMultiplier: 1.2,
        flowMultiplier: 0.95,
        arcEnabled: true,
        arcRadius: 15,
        arcSegments: 12,
      };
    case "moderate":
      return {
        speedMultiplier: 0.6,
        coolingMultiplier: 1.5,
        flowMultiplier: 0.92,
        arcEnabled: true,
        arcRadius: 10,
        arcSegments: 16,
      };
    case "severe":
      return {
        speedMultiplier: 0.4,
        coolingMultiplier: 2.0,
        flowMultiplier: 0.88,
        arcEnabled: true,
        arcRadius: 5,
        arcSegments: 20,
        bridgeInfillAngle: 0,
      };
    case "extreme":
      return {
        speedMultiplier: 0.3,
        coolingMultiplier: 3.0,
        flowMultiplier: 0.85,
        arcEnabled: true,
        arcRadius: 3,
        arcSegments: 24,
        bridgeInfillAngle: 0,
      };
  }
}

// ==================== Internal Helpers ====================

const RAD2DEG = 180 / Math.PI;
const DEG2RAD = Math.PI / 180;

function resolveOptions(options?: ArcOverhangOptions): Required<ArcOverhangOptions> {
  return {
    minOverhangAngle: options?.minOverhangAngle ?? DEFAULT_OPTIONS.minOverhangAngle,
    thresholds: {
      ...DEFAULT_OPTIONS.thresholds,
      ...options?.thresholds,
    },
    enableArcPaths: options?.enableArcPaths ?? DEFAULT_OPTIONS.enableArcPaths,
    minArcRadius: options?.minArcRadius ?? DEFAULT_OPTIONS.minArcRadius,
    maxArcRadius: options?.maxArcRadius ?? DEFAULT_OPTIONS.maxArcRadius,
    arcResolution: options?.arcResolution ?? DEFAULT_OPTIONS.arcResolution,
    mergeZones: options?.mergeZones ?? DEFAULT_OPTIONS.mergeZones,
    mergeDistance: options?.mergeDistance ?? DEFAULT_OPTIONS.mergeDistance,
    layerHeight: options?.layerHeight ?? DEFAULT_OPTIONS.layerHeight,
  };
}

function classifySeverity(
  angle: number,
  minAngle: number,
  thresholds: { mild: number; moderate: number; severe: number; extreme: number }
): "none" | "mild" | "moderate" | "severe" | "extreme" {
  if (angle < minAngle) return "none";
  if (angle >= thresholds.extreme) return "extreme";
  if (angle >= thresholds.severe) return "severe";
  if (angle >= thresholds.moderate) return "moderate";
  return "mild";
}

function severityWeight(severity: "mild" | "moderate" | "severe" | "extreme"): number {
  switch (severity) {
    case "mild": return 1;
    case "moderate": return 2;
    case "severe": return 3;
    case "extreme": return 4;
  }
}

function buildZone(id: string, faces: OverhangFace[]): OverhangZone {
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  let totalArea = 0;
  let weightedAngle = 0;

  for (const face of faces) {
    totalArea += face.area;
    weightedAngle += face.angle * face.area;
    for (let axis = 0; axis < 3; axis++) {
      if (face.centroid[axis] < min[axis]) min[axis] = face.centroid[axis];
      if (face.centroid[axis] > max[axis]) max[axis] = face.centroid[axis];
    }
  }

  const averageAngle = totalArea > 0 ? weightedAngle / totalArea : 0;

  // Determine zone severity from the most common severity among faces
  const severityCounts: Record<string, number> = { mild: 0, moderate: 0, severe: 0, extreme: 0 };
  for (const face of faces) {
    if (face.severity !== "none") {
      severityCounts[face.severity]++;
    }
  }
  const zoneSeverity = (
    Object.entries(severityCounts).sort((a, b) => b[1] - a[1])[0][0]
  ) as "mild" | "moderate" | "severe" | "extreme";

  return {
    id,
    severity: zoneSeverity,
    faces,
    boundingBox: { min, max },
    totalArea: round2(totalArea),
    averageAngle: round2(averageAngle),
    recommendations: getOverhangRecommendation(zoneSeverity),
  };
}

/**
 * Generate arc segments for a single layer Z within a zone.
 * Projects the zone's bounding box onto the XY plane and creates
 * arc-shaped perimeter paths along the overhang contour.
 */
function generateArcSegmentsForLayer(
  zone: OverhangZone,
  z: number,
  rec: OverhangRecommendation,
  opts: Required<ArcOverhangOptions>
): ArcSegment[] {
  const segments: ArcSegment[] = [];

  // Determine the bounding rectangle of the zone in XY at this Z height
  const bb = zone.boundingBox;
  const xMin = bb.min[0];
  const xMax = bb.max[0];
  const yMin = bb.min[1];
  const yMax = bb.max[1];

  const width = xMax - xMin;
  const height = yMax - yMin;

  // Skip degenerate zones
  if (width < 0.01 && height < 0.01) return segments;

  // Compute arc radius: inversely proportional to overhang severity
  // Steeper overhangs get tighter arcs for better material support
  const angleNormalized = clamp(zone.averageAngle / 90, 0, 1);
  const arcRadius = clamp(
    opts.maxArcRadius - angleNormalized * (opts.maxArcRadius - opts.minArcRadius),
    opts.minArcRadius,
    opts.maxArcRadius
  );

  // Base print speed (assumed 60 mm/s, scaled by recommendation)
  const baseSpeed = 60;
  const speed = round2(baseSpeed * rec.speedMultiplier);
  const flow = rec.flowMultiplier;

  // Generate arc segments along the zone contour
  // Strategy: create arc paths that trace the bounding contour with arc segments
  const centerX = (xMin + xMax) / 2;
  const centerY = (yMin + yMax) / 2;

  // Number of arc segments to generate around the perimeter
  const perimeter = 2 * (width + height);
  const numSegments = Math.max(
    4,
    Math.min(opts.arcResolution, Math.ceil(perimeter / arcRadius))
  );
  const angleStep = (2 * Math.PI) / numSegments;

  // Approximate the zone contour as an ellipse for arc generation
  const rx = Math.max(width / 2, 0.1);
  const ry = Math.max(height / 2, 0.1);

  for (let i = 0; i < numSegments; i++) {
    const theta0 = i * angleStep;
    const theta1 = (i + 1) * angleStep;

    const x0 = centerX + rx * Math.cos(theta0);
    const y0 = centerY + ry * Math.sin(theta0);
    const x1 = centerX + rx * Math.cos(theta1);
    const y1 = centerY + ry * Math.sin(theta1);

    // Determine if this segment should be an arc or line
    // Use arc segments when the arc radius fits within bounds
    const chordLength = Math.sqrt((x1 - x0) ** 2 + (y1 - y0) ** 2);
    const useArc = chordLength > 0.1 && arcRadius >= opts.minArcRadius;

    if (useArc) {
      // Compute the arc center: offset from the midpoint of the chord
      // perpendicular to the chord direction, towards the contour center
      const midX = (x0 + x1) / 2;
      const midY = (y0 + y1) / 2;

      // Arc center at the zone center (creates arcs curving inward)
      const arcCenterX = centerX;
      const arcCenterY = centerY;

      // Effective radius from center to the points
      const effectiveRadius = Math.sqrt(
        ((x0 - arcCenterX) ** 2 + (y0 - arcCenterY) ** 2 +
          (x1 - arcCenterX) ** 2 + (y1 - arcCenterY) ** 2) / 2
      );

      segments.push({
        type: "arc",
        start: [round2(x0), round2(y0)],
        end: [round2(x1), round2(y1)],
        center: [round2(arcCenterX), round2(arcCenterY)],
        radius: round2(effectiveRadius),
        clockwise: true,
        speed,
        flow,
      });
    } else {
      segments.push({
        type: "line",
        start: [round2(x0), round2(y0)],
        end: [round2(x1), round2(y1)],
        speed,
        flow,
      });
    }
  }

  return segments;
}

function segmentLength(seg: ArcSegment): number {
  if (seg.type === "line") {
    const dx = seg.end[0] - seg.start[0];
    const dy = seg.end[1] - seg.start[1];
    return Math.sqrt(dx * dx + dy * dy);
  }
  // Arc length approximation: chord length * correction factor
  // For small arcs this is close enough; for large arcs the full
  // 2*r*arcsin(chord/2r) formula applies
  if (!seg.radius || seg.radius < 0.001) {
    const dx = seg.end[0] - seg.start[0];
    const dy = seg.end[1] - seg.start[1];
    return Math.sqrt(dx * dx + dy * dy);
  }
  const dx = seg.end[0] - seg.start[0];
  const dy = seg.end[1] - seg.start[1];
  const chord = Math.sqrt(dx * dx + dy * dy);
  const halfChordOverR = clamp(chord / (2 * seg.radius), -1, 1);
  const arcAngle = 2 * Math.asin(halfChordOverR);
  return seg.radius * arcAngle;
}

// ==================== Vector Math Utilities ====================

function dot3(a: [number, number, number], b: [number, number, number]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross3(
  a: [number, number, number],
  b: [number, number, number]
): [number, number, number] {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function magnitude3(v: [number, number, number]): number {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}

function normalize3(v: [number, number, number]): [number, number, number] {
  const len = magnitude3(v);
  if (len < 1e-10) return [0, 0, 0];
  return [v[0] / len, v[1] / len, v[2] / len];
}

function subtract3(
  a: [number, number, number],
  b: [number, number, number]
): [number, number, number] {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function computeNormal(
  v0: [number, number, number],
  v1: [number, number, number],
  v2: [number, number, number]
): [number, number, number] {
  const edge1 = subtract3(v1, v0);
  const edge2 = subtract3(v2, v0);
  return normalize3(cross3(edge1, edge2));
}

function triangleCentroid(
  v0: [number, number, number],
  v1: [number, number, number],
  v2: [number, number, number]
): [number, number, number] {
  return [
    (v0[0] + v1[0] + v2[0]) / 3,
    (v0[1] + v1[1] + v2[1]) / 3,
    (v0[2] + v1[2] + v2[2]) / 3,
  ];
}

function triangleArea(
  v0: [number, number, number],
  v1: [number, number, number],
  v2: [number, number, number]
): number {
  const edge1 = subtract3(v1, v0);
  const edge2 = subtract3(v2, v0);
  const cp = cross3(edge1, edge2);
  return magnitude3(cp) / 2;
}

function distanceSquared3(
  a: [number, number, number],
  b: [number, number, number]
): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return dx * dx + dy * dy + dz * dz;
}

function isZeroVector(v: [number, number, number]): boolean {
  return v[0] === 0 && v[1] === 0 && v[2] === 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
