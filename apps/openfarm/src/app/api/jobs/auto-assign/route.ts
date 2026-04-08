import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { farmPrintJobs } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getAssignmentRules, logAssignment, getPrintersForAssignment } from "@/db/queries/assignment";
import { rankPrinters } from "@opensoftware/openfarm-core";
import { notify } from "@/lib/notify";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobId } = body;

    if (!jobId) {
      return NextResponse.json({ error: "jobId is required" }, { status: 400 });
    }

    const job = await db.query.farmPrintJobs.findFirst({
      where: eq(farmPrintJobs.id, jobId),
      with: { model: true },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.printerId) {
      return NextResponse.json({ error: "Job already has a printer assigned" }, { status: 409 });
    }

    const printers = await getPrintersForAssignment();
    const rules = await getAssignmentRules();

    const assignmentJob = {
      id: job.id,
      name: job.name,
      priority: job.priority,
      boundingBox: job.model?.boundingBoxX ? {
        x: job.model.boundingBoxX,
        y: job.model.boundingBoxY ?? 0,
        z: job.model.boundingBoxZ ?? 0,
      } : undefined,
    };

    const ranked = rankPrinters(
      assignmentJob,
      printers.map((p) => ({ ...p, maintenanceScore: undefined })),
      rules.map((r) => ({
        id: r.id,
        name: r.name,
        priority: r.priority,
        conditions: (r.conditions ?? {}) as Record<string, unknown>,
        preferredPrinterIds: (r.preferredPrinterIds ?? []) as string[],
        enabled: r.enabled,
      }))
    );

    if (ranked.length === 0) {
      return NextResponse.json({
        error: "No suitable printer found",
        candidates: [],
      }, { status: 404 });
    }

    const best = ranked[0];

    // Assign the printer to the job
    await db.update(farmPrintJobs)
      .set({
        printerId: best.printerId,
        updatedAt: sql`(unixepoch())`,
      })
      .where(eq(farmPrintJobs.id, jobId));

    // Log the assignment
    await logAssignment({
      jobId,
      printerId: best.printerId,
      score: best.score,
      reason: best.reason,
      factors: best.factors,
      accepted: true,
    });

    // Also log alternatives
    for (const alt of ranked.slice(1, 4)) {
      await logAssignment({
        jobId,
        printerId: alt.printerId,
        score: alt.score,
        reason: alt.reason,
        factors: alt.factors,
        accepted: false,
      });
    }

    // Notify
    notify({
      type: "printer_assigned",
      title: `Auto-assigned: ${job.name}`,
      message: `${job.name} assigned to ${best.printerName} (score: ${best.score})`,
      printerId: best.printerId,
      jobId: job.id,
      metadata: { jobName: job.name, printerName: best.printerName, score: best.score, reason: best.reason },
    });

    return NextResponse.json({
      assigned: {
        jobId,
        printerId: best.printerId,
        printerName: best.printerName,
        score: best.score,
        reason: best.reason,
        factors: best.factors,
      },
      alternatives: ranked.slice(1, 4),
    });
  } catch (error) {
    console.error("Auto-assign failed:", error);
    return NextResponse.json({ error: "Auto-assign failed" }, { status: 500 });
  }
}
