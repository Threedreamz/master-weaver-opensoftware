import { NextRequest, NextResponse } from "next/server";
import { updateMaintenanceTaskStatus } from "@/db/queries/maintenance";
import { notify } from "@/lib/notify";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, notes } = body;

    if (!status) {
      return NextResponse.json({ error: "status is required" }, { status: 400 });
    }

    const task = await updateMaintenanceTaskStatus(id, status, notes);

    if (status === "completed") {
      notify({
        type: "maintenance_required",
        severity: "info",
        title: `Maintenance completed: ${task.name}`,
        message: `${task.name} has been completed.`,
        printerId: task.printerId,
        metadata: { taskName: task.name },
      });
    }

    return NextResponse.json({ task });
  } catch (error) {
    console.error("Failed to update task:", error);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}
