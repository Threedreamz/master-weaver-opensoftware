/**
 * Auto printer assignment engine for OpenFarm.
 * Scores printers for a given job based on technology match, volume fit,
 * material availability, queue length, and rules.
 */

export interface AssignmentJob {
  id: string;
  name: string;
  technology?: string;
  materialId?: string;
  boundingBox?: { x: number; y: number; z: number };
  priority: number;
}

export interface AssignmentPrinter {
  id: string;
  name: string;
  technology: string;
  status: string;
  buildVolumeX?: number | null;
  buildVolumeY?: number | null;
  buildVolumeZ?: number | null;
  currentJobCount: number;
  loadedMaterialId?: string | null;
  maintenanceScore?: number; // 0-100, 100 = fully maintained
}

export interface AssignmentRule {
  id: string;
  name: string;
  priority: number;
  conditions: Record<string, unknown>;
  preferredPrinterIds: string[];
  enabled: boolean;
}

export interface AssignmentResult {
  printerId: string;
  printerName: string;
  score: number;
  reason: string;
  factors: Record<string, number>;
}

/**
 * Find the best printer for a job. Returns scored list of candidates.
 */
export function rankPrinters(
  job: AssignmentJob,
  printers: AssignmentPrinter[],
  rules: AssignmentRule[] = []
): AssignmentResult[] {
  const candidates: AssignmentResult[] = [];

  for (const printer of printers) {
    // Hard filters
    if (printer.status === "offline" || printer.status === "error" || printer.status === "maintenance") {
      continue;
    }

    // Technology match (if job has a technology requirement)
    if (job.technology && printer.technology !== job.technology) {
      continue;
    }

    // Volume fit check
    if (job.boundingBox && printer.buildVolumeX && printer.buildVolumeY && printer.buildVolumeZ) {
      const fits =
        job.boundingBox.x <= printer.buildVolumeX &&
        job.boundingBox.y <= printer.buildVolumeY &&
        job.boundingBox.z <= printer.buildVolumeZ;
      if (!fits) continue;
    }

    // Score factors
    const factors: Record<string, number> = {};

    // Material match (0 or 50)
    if (job.materialId && printer.loadedMaterialId) {
      factors.materialMatch = job.materialId === printer.loadedMaterialId ? 50 : 0;
    } else {
      factors.materialMatch = 25; // Unknown, neutral
    }

    // Queue length (fewer = better, max 20 points)
    factors.queueLength = Math.max(0, 20 - printer.currentJobCount * 5);

    // Availability (is it idle? +15)
    factors.availability = printer.status === "online" ? 15 : (printer.status === "printing" ? 5 : 0);

    // Maintenance health (max 10)
    factors.maintenanceHealth = printer.maintenanceScore !== undefined
      ? Math.round(printer.maintenanceScore / 10)
      : 5; // neutral if unknown

    // Rule-based preferences (max 15)
    factors.rulePreference = 0;
    for (const rule of rules) {
      if (!rule.enabled) continue;
      if (rule.preferredPrinterIds.includes(printer.id)) {
        // Check if rule conditions match job
        const conditionsMatch = matchConditions(rule.conditions, job, printer);
        if (conditionsMatch) {
          factors.rulePreference = Math.min(15, factors.rulePreference + rule.priority);
        }
      }
    }

    const totalScore = Object.values(factors).reduce((sum, v) => sum + v, 0);
    const reasons: string[] = [];
    if (factors.materialMatch >= 50) reasons.push("material match");
    if (factors.availability >= 15) reasons.push("idle");
    if (factors.queueLength >= 15) reasons.push("short queue");
    if (factors.rulePreference > 0) reasons.push("rule preference");

    candidates.push({
      printerId: printer.id,
      printerName: printer.name,
      score: totalScore,
      reason: reasons.length > 0 ? reasons.join(", ") : "available",
      factors,
    });
  }

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score);
  return candidates;
}

/**
 * Assign a batch of jobs to printers (greedy algorithm).
 */
export function assignBatch(
  jobs: AssignmentJob[],
  printers: AssignmentPrinter[],
  rules: AssignmentRule[] = []
): Map<string, AssignmentResult> {
  const assignments = new Map<string, AssignmentResult>();
  const printerLoad = new Map<string, number>();

  // Initialize load counts
  for (const p of printers) {
    printerLoad.set(p.id, p.currentJobCount);
  }

  // Sort jobs by priority descending
  const sortedJobs = [...jobs].sort((a, b) => b.priority - a.priority);

  for (const job of sortedJobs) {
    // Create updated printer list with current load
    const updatedPrinters = printers.map((p) => ({
      ...p,
      currentJobCount: printerLoad.get(p.id) ?? p.currentJobCount,
    }));

    const ranked = rankPrinters(job, updatedPrinters, rules);
    if (ranked.length > 0) {
      const best = ranked[0];
      assignments.set(job.id, best);
      printerLoad.set(best.printerId, (printerLoad.get(best.printerId) ?? 0) + 1);
    }
  }

  return assignments;
}

function matchConditions(
  conditions: Record<string, unknown>,
  job: AssignmentJob,
  printer: AssignmentPrinter
): boolean {
  for (const [key, value] of Object.entries(conditions)) {
    switch (key) {
      case "technology":
        if (value !== printer.technology) return false;
        break;
      case "materialType":
        // Would need material type lookup — skip for now
        break;
      case "minBuildVolume":
        if (typeof value === "number" && printer.buildVolumeX) {
          const vol = (printer.buildVolumeX ?? 0) * (printer.buildVolumeY ?? 0) * (printer.buildVolumeZ ?? 0);
          if (vol < value) return false;
        }
        break;
    }
  }
  return true;
}
