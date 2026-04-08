import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { farmPrintJobs, farmModels, farmPrinters } from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const printerId = url.searchParams.get("printer");
    const priority = url.searchParams.get("priority");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 200);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);

    const conditions = [];
    if (status) {
      conditions.push(eq(farmPrintJobs.status, status as typeof farmPrintJobs.status.enumValues[number]));
    }
    if (printerId) {
      conditions.push(eq(farmPrintJobs.printerId, printerId));
    }
    if (priority) {
      conditions.push(eq(farmPrintJobs.priority, parseInt(priority, 10)));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const jobs = await db.query.farmPrintJobs.findMany({
      where,
      orderBy: [desc(farmPrintJobs.priority), desc(farmPrintJobs.createdAt)],
      limit,
      offset,
      with: {
        printer: true,
        model: true,
        material: true,
      },
    });

    return NextResponse.json({
      jobs,
      count: jobs.length,
      limit,
      offset,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch jobs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { name, modelId, printerId, profileId, materialId, priority, notes, createdBy } = body;

    // Validate required fields
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Validate model exists if provided
    if (modelId) {
      const model = await db.query.farmModels.findFirst({
        where: eq(farmModels.id, modelId),
      });
      if (!model) {
        return NextResponse.json({ error: "Model not found" }, { status: 400 });
      }
    }

    // Validate printer exists if provided
    if (printerId) {
      const printer = await db.query.farmPrinters.findFirst({
        where: eq(farmPrinters.id, printerId),
      });
      if (!printer) {
        return NextResponse.json({ error: "Printer not found" }, { status: 400 });
      }
    }

    const [job] = await db
      .insert(farmPrintJobs)
      .values({
        name: name.trim(),
        modelId: modelId || undefined,
        printerId: printerId || undefined,
        profileId: profileId || undefined,
        materialId: materialId || undefined,
        priority: typeof priority === "number" ? priority : 0,
        notes: notes || undefined,
        createdBy: createdBy || undefined,
      })
      .returning();

    return NextResponse.json(job, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create job";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
