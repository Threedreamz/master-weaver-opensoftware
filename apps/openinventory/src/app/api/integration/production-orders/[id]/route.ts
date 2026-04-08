import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { invProductionOrders } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const [updated] = await db
      .update(invProductionOrders)
      .set({ ...body, updatedAt: sql`(datetime('now'))` })
      .where(eq(invProductionOrders.id, Number(id)))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Production order not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ order: updated });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update production order" },
      { status: 500 },
    );
  }
}
