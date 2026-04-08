import { NextRequest, NextResponse } from "next/server";
import { getUnreadCount } from "@/db/queries/notifications";

export async function GET(request: NextRequest) {
  try {
    const assignedTo = request.nextUrl.searchParams.get("assignedTo") ?? undefined;
    const count = await getUnreadCount(assignedTo);
    return NextResponse.json({ count });
  } catch (error) {
    console.error("Failed to get unread count:", error);
    return NextResponse.json({ count: 0 });
  }
}
