import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { acctOrders } from "@/db/schema";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    const orders = await db.select().from(acctOrders);
    return NextResponse.json({ orders });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      customerId,
      items,
      netAmount,
      taxRate,
      taxAmount,
      grossAmount,
      notes,
    } = body;

    if (!customerId || !items) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Generate order number
    const year = new Date().getFullYear();
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(acctOrders);
    const count = (countResult[0]?.count ?? 0) + 1;
    const number = `AB-${year}-${String(count).padStart(4, "0")}`;

    const [order] = await db
      .insert(acctOrders)
      .values({
        number,
        customerId,
        items: JSON.stringify(items),
        netAmount: netAmount || 0,
        taxRate: taxRate || 19,
        taxAmount: taxAmount || 0,
        grossAmount: grossAmount || 0,
        status: "neu",
        notes,
      })
      .returning();

    return NextResponse.json({ order });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 },
    );
  }
}
