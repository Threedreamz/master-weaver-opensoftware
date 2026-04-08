import { NextRequest, NextResponse } from "next/server";
import { getMaintenanceTasks, createMaintenanceTask } from "@/db/queries/maintenance";

export async function GET(request: NextRequest) {
  try {
    const printerId = request.nextUrl.searchParams.get("printerId") ?? undefined;
    const status = request.nextUrl.searchParams.get("status") ?? undefined;
    const tasks = await getMaintenanceTasks({ printerId, status });
    return NextResponse.json({ tasks });
  } catch (error) {
    console.error("Failed to get maintenance tasks:", error);
    return NextResponse.json({ error: "Failed to get tasks" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { printerId, name, description, type, intervalHours, intervalPrints, dueAt } = body;
    if (!printerId || !name || !type) {
      return NextResponse.json({ error: "printerId, name, and type are required" }, { status: 400 });
    }
    const task = await createMaintenanceTask({
      printerId, name, description, type, intervalHours, intervalPrints,
      dueAt: dueAt ? new Date(dueAt) : undefined,
    });
    return NextResponse.json({ task });
  } catch (error) {
    console.error("Failed to create task:", error);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
