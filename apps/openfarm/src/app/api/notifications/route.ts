import { NextRequest, NextResponse } from "next/server";
import { getNotifications, markAllRead } from "@/db/queries/notifications";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type") ?? undefined;
    const unreadOnly = searchParams.get("unread") === "true";
    const assignedTo = searchParams.get("assignedTo") ?? undefined;
    const limit = parseInt(searchParams.get("limit") ?? "50", 10);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    const notifications = await getNotifications({
      type,
      unreadOnly,
      assignedTo,
      limit: Math.min(limit, 200),
      offset,
    });

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error("Failed to get notifications:", error);
    return NextResponse.json(
      { error: "Failed to get notifications" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.action === "mark_all_read") {
      await markAllRead(body.assignedTo);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Failed to process notification action:", error);
    return NextResponse.json(
      { error: "Failed to process action" },
      { status: 500 }
    );
  }
}
