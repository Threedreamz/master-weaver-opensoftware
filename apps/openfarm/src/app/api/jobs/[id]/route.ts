import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { farmPrintJobs, farmJobLogs } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { notify } from "@/lib/notify";

// Statuses that cannot be deleted
const ACTIVE_STATUSES = new Set(["printing", "slicing", "sending", "post_processing"]);

// Valid status transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  cancel: ["queued", "slicing", "post_processing", "ready", "sending", "printing", "paused"],
  pause: ["printing"],
  resume: ["paused"],
  retry: ["failed", "cancelled"],
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const job = await db.query.farmPrintJobs.findFirst({
      where: eq(farmPrintJobs.id, id),
      with: {
        printer: true,
        model: true,
        profile: true,
        material: true,
        batchJob: true,
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Fetch logs separately
    const logs = await db.query.farmJobLogs.findMany({
      where: eq(farmJobLogs.jobId, id),
      orderBy: [desc(farmJobLogs.createdAt)],
      limit: 100,
    });

    return NextResponse.json({ ...job, logs });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch job";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    if (!action || !["cancel", "pause", "resume", "retry"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Use: cancel, pause, resume, retry" },
        { status: 400 }
      );
    }

    const job = await db.query.farmPrintJobs.findFirst({
      where: eq(farmPrintJobs.id, id),
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const allowedFrom = VALID_TRANSITIONS[action];
    if (!allowedFrom.includes(job.status)) {
      return NextResponse.json(
        { error: `Cannot ${action} a job with status "${job.status}"` },
        { status: 409 }
      );
    }

    const statusMap: Record<string, string> = {
      cancel: "cancelled",
      pause: "paused",
      resume: "printing",
      retry: "queued",
    };

    const newStatus = statusMap[action];
    const updates: Record<string, unknown> = {
      status: newStatus,
      updatedAt: sql`(unixepoch())`,
    };

    if (action === "retry") {
      updates.retryCount = sql`${farmPrintJobs.retryCount} + 1`;
      updates.errorMessage = null;
      updates.progressPercent = 0;
      updates.currentLayer = null;
    }

    if (action === "cancel") {
      updates.printCompletedAt = sql`(unixepoch())`;
    }

    const [updated] = await db
      .update(farmPrintJobs)
      .set(updates)
      .where(eq(farmPrintJobs.id, id))
      .returning();

    // Log the action
    await db.insert(farmJobLogs).values({
      jobId: id,
      level: "info",
      message: `Job ${action}${action === "retry" ? " (attempt " + ((job.retryCount ?? 0) + 2) + ")" : ""}`,
      metadata: { action, previousStatus: job.status, newStatus },
    });

    // Emit notifications for status changes (fire-and-forget)
    if (action === "cancel") {
      notify({
        type: "error_check",
        severity: "warning",
        title: `Job cancelled: ${job.name}`,
        message: `${job.name} was cancelled.`,
        printerId: job.printerId ?? undefined,
        jobId: id,
        metadata: { jobName: job.name, action: "cancelled" },
      });
    }

    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update job";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const job = await db.query.farmPrintJobs.findFirst({
      where: eq(farmPrintJobs.id, id),
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (ACTIVE_STATUSES.has(job.status)) {
      return NextResponse.json(
        { error: `Cannot delete a job with status "${job.status}". Cancel it first.` },
        { status: 409 }
      );
    }

    await db.delete(farmPrintJobs).where(eq(farmPrintJobs.id, id));

    return NextResponse.json({ success: true, id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete job";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
