import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { acctOrders } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { status } = await request.json();

    const validStatuses = [
      "neu",
      "in_bearbeitung",
      "in_produktion",
      "versendet",
      "abgeschlossen",
      "storniert",
    ];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        {
          error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const [updated] = await db
      .update(acctOrders)
      .set({ status, updatedAt: sql`(datetime('now'))` })
      .where(eq(acctOrders.id, Number(id)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ order: updated });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update order status" },
      { status: 500 },
    );
  }
}
