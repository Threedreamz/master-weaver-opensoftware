import { NextResponse } from "next/server";
import { db } from "@/db";
import { invProductionOrders } from "@/db/schema";

export async function GET() {
  try {
    const orders = await db.select().from(invProductionOrders);
    return NextResponse.json({ orders });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch production orders" },
      { status: 500 },
    );
  }
}
