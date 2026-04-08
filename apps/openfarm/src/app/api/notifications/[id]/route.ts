import { NextRequest, NextResponse } from "next/server";
import { markNotificationRead, dismissNotification } from "@/db/queries/notifications";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (body.action === "read") {
      const notification = await markNotificationRead(id);
      return NextResponse.json({ notification });
    }

    if (body.action === "dismiss") {
      const notification = await dismissNotification(id);
      return NextResponse.json({ notification });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Failed to update notification:", error);
    return NextResponse.json(
      { error: "Failed to update notification" },
      { status: 500 }
    );
  }
}
