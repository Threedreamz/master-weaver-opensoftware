import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { farmPrintJobs } from "@/db/schema";
import { eq, and, desc, asc, inArray, sql } from "drizzle-orm";

// Statuses considered "in queue" (not yet completed/failed/cancelled)
const QUEUE_STATUSES = [
  "queued",
  "slicing",
  "post_processing",
  "ready",
  "sending",
  "printing",
  "paused",
  "washing",
  "curing",
  "cooling",
  "depowdering",
] as const;

export async function GET() {
  try {
    const queue = await db.query.farmPrintJobs.findMany({
      where: inArray(farmPrintJobs.status, [...QUEUE_STATUSES]),
      orderBy: [desc(farmPrintJobs.priority), asc(farmPrintJobs.queuedAt)],
      with: {
        printer: true,
        model: true,
        material: true,
      },
    });

    return NextResponse.json({
      queue,
      count: queue.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch queue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, jobId, priority, direction } = body;

    if (!jobId || typeof jobId !== "string") {
      return NextResponse.json({ error: "jobId is required" }, { status: 400 });
    }

    const job = await db.query.farmPrintJobs.findFirst({
      where: eq(farmPrintJobs.id, jobId),
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (action === "set-priority") {
      if (typeof priority !== "number") {
        return NextResponse.json(
          { error: "priority must be a number" },
          { status: 400 }
        );
      }

      const [updated] = await db
        .update(farmPrintJobs)
        .set({
          priority,
          updatedAt: sql`(unixepoch())`,
        })
        .where(eq(farmPrintJobs.id, jobId))
        .returning();

      return NextResponse.json(updated);
    }

    if (action === "move") {
      if (!["up", "down"].includes(direction)) {
        return NextResponse.json(
          { error: "direction must be 'up' or 'down'" },
          { status: 400 }
        );
      }

      // Move up = increase priority, move down = decrease priority
      const delta = direction === "up" ? 1 : -1;
      const newPriority = (job.priority ?? 0) + delta;

      const [updated] = await db
        .update(farmPrintJobs)
        .set({
          priority: newPriority,
          updatedAt: sql`(unixepoch())`,
        })
        .where(eq(farmPrintJobs.id, jobId))
        .returning();

      return NextResponse.json(updated);
    }

    return NextResponse.json(
      { error: "Invalid action. Use: set-priority, move" },
      { status: 400 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update queue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
