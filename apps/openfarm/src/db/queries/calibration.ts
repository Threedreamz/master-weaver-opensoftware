import { eq, desc, and, sql, inArray, count } from "drizzle-orm";
import { db } from "../index";
import {
  farmCalibrationProcedures,
  farmCalibrationSessions,
  farmCalibrationMeasurements,
  farmCalibrationResults,
} from "../schema";

// ==================== Procedures ====================

export async function getCalibrationProcedures(filters?: { tier?: string; technology?: string }) {
  const conditions = [];
  if (filters?.tier) conditions.push(eq(farmCalibrationProcedures.tier, filters.tier as any));
  if (filters?.technology) conditions.push(eq(farmCalibrationProcedures.technology, filters.technology as any));

  return db.query.farmCalibrationProcedures.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    orderBy: [farmCalibrationProcedures.sortOrder],
  });
}

export async function getCalibrationProcedure(id: string) {
  return db.query.farmCalibrationProcedures.findFirst({
    where: eq(farmCalibrationProcedures.id, id),
  });
}

// ==================== Sessions ====================

export async function getCalibrationSessions(filters?: {
  printerId?: string;
  procedureId?: string;
  materialId?: string;
  status?: string;
  limit?: number;
}) {
  const conditions = [];
  if (filters?.printerId) conditions.push(eq(farmCalibrationSessions.printerId, filters.printerId));
  if (filters?.procedureId) conditions.push(eq(farmCalibrationSessions.procedureId, filters.procedureId));
  if (filters?.materialId) conditions.push(eq(farmCalibrationSessions.materialId, filters.materialId));
  if (filters?.status) conditions.push(eq(farmCalibrationSessions.status, filters.status as any));

  return db.query.farmCalibrationSessions.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    orderBy: [desc(farmCalibrationSessions.startedAt)],
    limit: filters?.limit ?? 50,
    with: {
      procedure: true,
      printer: true,
      material: true,
      measurements: true,
      results: true,
    },
  });
}

export async function getCalibrationSession(id: string) {
  return db.query.farmCalibrationSessions.findFirst({
    where: eq(farmCalibrationSessions.id, id),
    with: {
      procedure: true,
      printer: true,
      material: true,
      measurements: true,
      results: true,
      printJob: true,
      verificationJob: true,
    },
  });
}

export async function createCalibrationSession(data: {
  procedureId: string;
  printerId: string;
  materialId?: string;
  initiatedBy?: string;
  notes?: string;
  printerHoursAtCalibration?: number;
  printerCountAtCalibration?: number;
}) {
  const [session] = await db.insert(farmCalibrationSessions).values(data).returning();
  return session;
}

export async function updateCalibrationSessionStatus(
  id: string,
  status: string,
  updates?: Record<string, unknown>
) {
  const setValues: Record<string, unknown> = {
    status,
    updatedAt: sql`(unixepoch())`,
    ...updates,
  };
  if (status === "completed" || status === "failed" || status === "cancelled") {
    setValues.completedAt = sql`(unixepoch())`;
  }

  const [session] = await db
    .update(farmCalibrationSessions)
    .set(setValues)
    .where(eq(farmCalibrationSessions.id, id))
    .returning();
  return session;
}

// ==================== Measurements ====================

export async function getCalibrationMeasurements(sessionId: string) {
  return db.query.farmCalibrationMeasurements.findMany({
    where: eq(farmCalibrationMeasurements.sessionId, sessionId),
    orderBy: [farmCalibrationMeasurements.pointIndex],
  });
}

export async function createCalibrationMeasurement(data: {
  sessionId: string;
  measurementType: string;
  axis?: string;
  pointIndex?: number;
  nominalValue?: number;
  measuredValue: number;
  unit?: string;
  notes?: string;
}) {
  const [measurement] = await db
    .insert(farmCalibrationMeasurements)
    .values({
      ...data,
      measurementType: data.measurementType as any,
      unit: (data.unit as any) ?? "mm",
    })
    .returning();
  return measurement;
}

export async function createCalibrationMeasurementsBatch(
  measurements: Array<{
    sessionId: string;
    measurementType: string;
    axis?: string;
    pointIndex?: number;
    nominalValue?: number;
    measuredValue: number;
    unit?: string;
    notes?: string;
  }>
) {
  return db
    .insert(farmCalibrationMeasurements)
    .values(
      measurements.map((m) => ({
        ...m,
        measurementType: m.measurementType as any,
        unit: (m.unit as any) ?? "mm",
      }))
    )
    .returning();
}

// ==================== Results ====================

export async function getCalibrationResults(sessionId: string) {
  return db.query.farmCalibrationResults.findMany({
    where: eq(farmCalibrationResults.sessionId, sessionId),
  });
}

export async function createCalibrationResult(data: {
  sessionId: string;
  resultType: string;
  value?: number;
  valueJson?: Record<string, unknown>;
  confidence?: number;
  previousValue?: number;
}) {
  const [result] = await db
    .insert(farmCalibrationResults)
    .values({
      ...data,
      resultType: data.resultType as any,
    })
    .returning();
  return result;
}

export async function markResultApplied(resultId: string) {
  const [result] = await db
    .update(farmCalibrationResults)
    .set({
      applied: true,
      appliedAt: sql`(unixepoch())`,
    })
    .where(eq(farmCalibrationResults.id, resultId))
    .returning();
  return result;
}

// ==================== History & Trends ====================

export async function getCalibrationHistory(filters: {
  printerId: string;
  procedureId?: string;
  materialId?: string;
  limit?: number;
}) {
  const conditions = [
    eq(farmCalibrationSessions.printerId, filters.printerId),
    eq(farmCalibrationSessions.status, "completed"),
  ];
  if (filters.procedureId) conditions.push(eq(farmCalibrationSessions.procedureId, filters.procedureId));
  if (filters.materialId) conditions.push(eq(farmCalibrationSessions.materialId, filters.materialId));

  return db.query.farmCalibrationSessions.findMany({
    where: and(...conditions),
    orderBy: [desc(farmCalibrationSessions.completedAt)],
    limit: filters.limit ?? 20,
    with: {
      procedure: true,
      material: true,
      results: true,
    },
  });
}

export async function getLatestCalibration(printerId: string, procedureId: string) {
  return db.query.farmCalibrationSessions.findFirst({
    where: and(
      eq(farmCalibrationSessions.printerId, printerId),
      eq(farmCalibrationSessions.procedureId, procedureId),
      eq(farmCalibrationSessions.status, "completed")
    ),
    orderBy: [desc(farmCalibrationSessions.completedAt)],
    with: { results: true },
  });
}

export async function getCalibrationTrend(
  printerId: string,
  procedureId: string,
  resultType: string,
  limit = 10
) {
  const sessions = await db.query.farmCalibrationSessions.findMany({
    where: and(
      eq(farmCalibrationSessions.printerId, printerId),
      eq(farmCalibrationSessions.procedureId, procedureId),
      eq(farmCalibrationSessions.status, "completed")
    ),
    orderBy: [desc(farmCalibrationSessions.completedAt)],
    limit,
    with: {
      results: true,
      material: true,
    },
  });

  return sessions.map((s) => {
    const result = s.results.find((r) => r.resultType === resultType);
    return {
      sessionId: s.id,
      date: s.completedAt ?? s.startedAt,
      value: result?.value ?? 0,
      materialId: s.materialId,
      materialName: s.material?.name,
    };
  });
}

export async function getPrinterCalibrationStatus(printerId: string) {
  const procedures = await getCalibrationProcedures({ technology: "sls" });
  const statusMap = [];

  for (const proc of procedures) {
    const latest = await getLatestCalibration(printerId, proc.id);
    const sessionCountResult = await db
      .select({ count: count() })
      .from(farmCalibrationSessions)
      .where(
        and(
          eq(farmCalibrationSessions.printerId, printerId),
          eq(farmCalibrationSessions.procedureId, proc.id)
        )
      );

    const lastCalibrated = latest?.completedAt ?? undefined;
    let isDue = false;
    let isOverdue = false;
    let nextDueAt: Date | undefined;

    if (proc.intervalHours || proc.intervalPrints) {
      if (!lastCalibrated) {
        isDue = true;
        isOverdue = true;
      } else if (proc.intervalHours) {
        const hoursSinceLast = (Date.now() - lastCalibrated.getTime()) / (1000 * 60 * 60);
        isDue = hoursSinceLast >= proc.intervalHours * 0.8;
        isOverdue = hoursSinceLast >= proc.intervalHours;
        nextDueAt = new Date(lastCalibrated.getTime() + proc.intervalHours * 60 * 60 * 1000);
      }
    }

    const lastResult = latest?.results?.[0];

    statusMap.push({
      procedureId: proc.id,
      procedureName: proc.name,
      tier: proc.tier,
      lastCalibrated,
      lastResult: lastResult?.value != null ? `${lastResult.value}` : undefined,
      isDue,
      isOverdue,
      nextDueAt,
      sessionCount: sessionCountResult[0]?.count ?? 0,
    });
  }

  return statusMap;
}

// ==================== Seed Check ====================

export async function ensureCalibrationProceduresSeeded() {
  const existing = await db.select({ count: count() }).from(farmCalibrationProcedures);
  if ((existing[0]?.count ?? 0) === 0) {
    // Seed the 4 core SLS procedures inline (the full 22-procedure seed is in packages/db/src/seed/)
    const coreProcedures = [
      { id: "btmt", name: "Bed Temperature Measurement Tool (BTMT)", tier: "core" as const, technology: "sls" as const, description: "Print calibration plaques to determine optimal bed temperature offset.", requiresPrint: true, estimatedDurationMinutes: 480, intervalPrints: 50, sortOrder: 1 },
      { id: "xy_scaling", name: "X/Y Scaling Calibration", tier: "core" as const, technology: "sls" as const, description: "Print 24-point test piece and measure with calipers for horizontal accuracy.", requiresPrint: true, estimatedDurationMinutes: 600, intervalPrints: 100, sortOrder: 2 },
      { id: "z_scaling", name: "Z Scaling Calibration", tier: "core" as const, technology: "sls" as const, description: "Print Z test piece and measure heights for vertical accuracy.", requiresPrint: true, estimatedDurationMinutes: 540, intervalPrints: 100, sortOrder: 3 },
      { id: "diagnostic", name: "Diagnostic Test Print", tier: "core" as const, technology: "sls" as const, description: "Full-system evaluation print to determine which calibrations are needed.", firmwareMinVersion: "1.24.1", requiresPrint: true, estimatedDurationMinutes: 480, intervalPrints: 200, sortOrder: 4 },
      { id: "leveling", name: "Printer Leveling", tier: "mechanical" as const, technology: "sls" as const, description: "Accelerometer-based foot adjustment.", requiresPrint: false, estimatedDurationMinutes: 15, sortOrder: 10 },
      { id: "doser", name: "Doser Recalibration", tier: "mechanical" as const, technology: "sls" as const, description: "Recalibrate powder dosing mechanism.", requiresPrint: false, estimatedDurationMinutes: 30, sortOrder: 11 },
      { id: "powder_flipper", name: "Powder Flipper Calibration", tier: "mechanical" as const, technology: "sls" as const, description: "Calibrate recoater flipper alignment.", requiresPrint: false, estimatedDurationMinutes: 20, sortOrder: 12 },
      { id: "optical_cassette_clean", name: "Optical Cassette Cleaning", tier: "maintenance" as const, technology: "sls" as const, description: "Clean laser/camera windows.", requiresPrint: false, estimatedDurationMinutes: 15, intervalPrints: 1, sortOrder: 20 },
      { id: "ir_sensor_clean", name: "IR Sensor / Housing Cleaning", tier: "maintenance" as const, technology: "sls" as const, description: "Clean IR sensor for accurate temperature readings.", requiresPrint: false, estimatedDurationMinutes: 10, intervalPrints: 5, intervalHours: 100, sortOrder: 21 },
      { id: "laser_window_clean", name: "Upper Laser Window Cleaning", tier: "maintenance" as const, technology: "sls" as const, description: "Clean fixed window above galvo mirrors.", requiresPrint: false, estimatedDurationMinutes: 30, intervalHours: 1000, sortOrder: 22 },
      { id: "camera_lens_clean", name: "Camera Lens Cleaning", tier: "maintenance" as const, technology: "sls" as const, description: "Clean monitoring camera lens.", requiresPrint: false, estimatedDurationMinutes: 10, intervalHours: 500, sortOrder: 23 },
    ];
    for (const proc of coreProcedures) {
      await db.insert(farmCalibrationProcedures).values(proc).onConflictDoNothing();
    }
  }
}
