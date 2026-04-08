/**
 * Feasibility analysis engine for OpenFarm.
 * Checks if a mesh is printable with FDM, SLA, or SLS.
 */
import type { MeshMetrics, FeasibilityIssue, FeasibilityVerdict } from "./mesh-analyzer";

export type PrintTechnology = "fdm" | "sla" | "sls";

export interface FeasibilityResult {
  technology: PrintTechnology;
  overallScore: number; // 0-100
  verdict: FeasibilityVerdict;
  issues: FeasibilityIssue[];
  metrics: Record<string, unknown>;
}

// ==================== Technology-specific thresholds ====================

const FDM_THRESHOLDS = {
  overhangAngle: 45,       // degrees
  thinWall: 0.8,           // mm (typical nozzle: 0.4mm * 2 walls)
  smallDetail: 0.4,        // mm (nozzle diameter)
  bridgeDistance: 10,       // mm
  maxDimension: 300,       // mm (typical build volume)
  minDimension: 1,         // mm
};

const SLA_THRESHOLDS = {
  thinWall: 0.3,           // mm
  smallDetail: 0.1,        // mm (pixel size ~50µm)
  suctionAreaPercent: 30,  // large flat bottom surfaces
  maxDimension: 200,       // mm
  minDimension: 0.5,       // mm
};

const SLS_THRESHOLDS = {
  thinWall: 0.8,           // mm
  smallDetail: 0.5,        // mm
  trappedVolumeThreshold: 5, // mm (min hole for powder escape)
  maxDimension: 300,       // mm
  minDimension: 1,         // mm
};

// ==================== Analysis Functions ====================

export function checkFeasibility(
  metrics: MeshMetrics,
  technology: PrintTechnology
): FeasibilityResult {
  switch (technology) {
    case "fdm": return checkFDM(metrics);
    case "sla": return checkSLA(metrics);
    case "sls": return checkSLS(metrics);
  }
}

export function checkAllTechnologies(metrics: MeshMetrics): FeasibilityResult[] {
  return (["fdm", "sla", "sls"] as const).map((tech) => checkFeasibility(metrics, tech));
}

function checkFDM(metrics: MeshMetrics): FeasibilityResult {
  const issues: FeasibilityIssue[] = [];

  // Non-manifold check
  if (!metrics.isManifold) {
    issues.push({
      type: "non_manifold",
      severity: "critical",
      description: "Mesh is not watertight. Slicers may produce unexpected results.",
    });
  }

  // Size check
  const maxDim = Math.max(metrics.dimensions.x, metrics.dimensions.y, metrics.dimensions.z);
  const minDim = Math.min(metrics.dimensions.x, metrics.dimensions.y, metrics.dimensions.z);
  if (maxDim > FDM_THRESHOLDS.maxDimension) {
    issues.push({
      type: "too_large",
      severity: "critical",
      description: `Part is ${maxDim.toFixed(1)}mm in largest dimension (max ${FDM_THRESHOLDS.maxDimension}mm for typical FDM).`,
    });
  }
  if (minDim < FDM_THRESHOLDS.minDimension) {
    issues.push({
      type: "too_small",
      severity: "warning",
      description: `Part has a dimension of ${minDim.toFixed(2)}mm which may be too small for FDM.`,
    });
  }

  // Overhang check
  if (metrics.overhangAngleMax > FDM_THRESHOLDS.overhangAngle) {
    issues.push({
      type: "overhang",
      severity: metrics.unsupportedAreaPercent > 30 ? "critical" : "warning",
      description: `Maximum overhang angle: ${metrics.overhangAngleMax.toFixed(1)}° (${metrics.unsupportedAreaPercent}% of faces unsupported). Supports will be needed.`,
    });
  }

  // Thin wall check
  if (metrics.thinWallMin < FDM_THRESHOLDS.thinWall) {
    issues.push({
      type: "thin_wall",
      severity: metrics.thinWallMin < FDM_THRESHOLDS.thinWall / 2 ? "critical" : "warning",
      description: `Thinnest feature: ${metrics.thinWallMin.toFixed(2)}mm (minimum ${FDM_THRESHOLDS.thinWall}mm for FDM).`,
    });
  }

  // Bridge check
  if (metrics.bridgeDistanceMax > FDM_THRESHOLDS.bridgeDistance) {
    issues.push({
      type: "bridge",
      severity: metrics.bridgeDistanceMax > FDM_THRESHOLDS.bridgeDistance * 2 ? "critical" : "warning",
      description: `Longest bridge span: ${metrics.bridgeDistanceMax.toFixed(1)}mm (max ${FDM_THRESHOLDS.bridgeDistance}mm recommended).`,
    });
  }

  // Small detail check
  if (metrics.smallDetailMin < FDM_THRESHOLDS.smallDetail) {
    issues.push({
      type: "small_detail",
      severity: "info",
      description: `Smallest detail: ${metrics.smallDetailMin.toFixed(2)}mm. May not resolve at standard nozzle diameter.`,
    });
  }

  return buildResult("fdm", issues, metrics);
}

function checkSLA(metrics: MeshMetrics): FeasibilityResult {
  const issues: FeasibilityIssue[] = [];

  if (!metrics.isManifold) {
    issues.push({
      type: "non_manifold",
      severity: "critical",
      description: "Mesh is not watertight. SLA printing requires a closed mesh.",
    });
  }

  const maxDim = Math.max(metrics.dimensions.x, metrics.dimensions.y, metrics.dimensions.z);
  if (maxDim > SLA_THRESHOLDS.maxDimension) {
    issues.push({
      type: "too_large",
      severity: "critical",
      description: `Part is ${maxDim.toFixed(1)}mm (max ${SLA_THRESHOLDS.maxDimension}mm for typical SLA).`,
    });
  }

  if (metrics.thinWallMin < SLA_THRESHOLDS.thinWall) {
    issues.push({
      type: "thin_wall",
      severity: "warning",
      description: `Thinnest feature: ${metrics.thinWallMin.toFixed(2)}mm (minimum ${SLA_THRESHOLDS.thinWall}mm for SLA).`,
    });
  }

  // Suction cup effect: large flat area facing the build plate
  if (metrics.unsupportedAreaPercent > SLA_THRESHOLDS.suctionAreaPercent) {
    issues.push({
      type: "suction_cup",
      severity: "warning",
      description: `${metrics.unsupportedAreaPercent}% of faces are flat and facing down. Risk of suction/peel failure. Consider adding drainage holes.`,
    });
  }

  if (metrics.smallDetailMin < SLA_THRESHOLDS.smallDetail) {
    issues.push({
      type: "small_detail",
      severity: "info",
      description: `Smallest detail: ${metrics.smallDetailMin.toFixed(3)}mm. Near the pixel resolution limit.`,
    });
  }

  return buildResult("sla", issues, metrics);
}

function checkSLS(metrics: MeshMetrics): FeasibilityResult {
  const issues: FeasibilityIssue[] = [];

  if (!metrics.isManifold) {
    issues.push({
      type: "non_manifold",
      severity: "critical",
      description: "Mesh is not watertight. SLS requires a closed mesh for proper sintering.",
    });
  }

  const maxDim = Math.max(metrics.dimensions.x, metrics.dimensions.y, metrics.dimensions.z);
  if (maxDim > SLS_THRESHOLDS.maxDimension) {
    issues.push({
      type: "too_large",
      severity: "critical",
      description: `Part is ${maxDim.toFixed(1)}mm (max ${SLS_THRESHOLDS.maxDimension}mm for typical SLS).`,
    });
  }

  if (metrics.thinWallMin < SLS_THRESHOLDS.thinWall) {
    issues.push({
      type: "thin_wall",
      severity: metrics.thinWallMin < SLS_THRESHOLDS.thinWall / 2 ? "critical" : "warning",
      description: `Thinnest feature: ${metrics.thinWallMin.toFixed(2)}mm (minimum ${SLS_THRESHOLDS.thinWall}mm for SLS).`,
    });
  }

  // Trapped volume: if the part has enclosed cavities, powder can't escape
  // Heuristic: check volume-to-surface-area ratio
  if (metrics.volumeCm3 > 0 && metrics.surfaceAreaCm2 > 0) {
    const ratio = metrics.volumeCm3 / metrics.surfaceAreaCm2;
    if (ratio > 0.5) {
      issues.push({
        type: "trapped_volume",
        severity: "warning",
        description: "High volume-to-surface ratio suggests possible trapped powder. Ensure escape holes (min 5mm diameter).",
      });
    }
  }

  return buildResult("sls", issues, metrics);
}

// ==================== Scoring ====================

function buildResult(
  technology: PrintTechnology,
  issues: FeasibilityIssue[],
  metrics: MeshMetrics
): FeasibilityResult {
  const score = computeScore(issues);
  const verdict = scoreToVerdict(score, issues);

  return {
    technology,
    overallScore: score,
    verdict,
    issues,
    metrics: {
      overhangAngleMax: metrics.overhangAngleMax,
      thinWallMin: metrics.thinWallMin,
      smallDetailMin: metrics.smallDetailMin,
      unsupportedAreaPercent: metrics.unsupportedAreaPercent,
      bridgeDistanceMax: metrics.bridgeDistanceMax,
      volumeCm3: metrics.volumeCm3,
      surfaceAreaCm2: metrics.surfaceAreaCm2,
      isManifold: metrics.isManifold,
    },
  };
}

function computeScore(issues: FeasibilityIssue[]): number {
  let score = 100;
  for (const issue of issues) {
    switch (issue.severity) {
      case "critical": score -= 30; break;
      case "warning": score -= 10; break;
      case "info": score -= 2; break;
    }
  }
  return Math.max(0, Math.min(100, score));
}

function scoreToVerdict(score: number, issues: FeasibilityIssue[]): FeasibilityVerdict {
  const criticalCount = issues.filter((i) => i.severity === "critical").length;
  if (criticalCount >= 3 || score < 20) return "needs_redesign";
  if (criticalCount >= 1 || score < 50) return "needs_rework";
  if (score < 80) return "printable_with_issues";
  return "printable";
}
