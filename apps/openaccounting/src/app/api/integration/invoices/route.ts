import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { acctInvoices } from "@/db/schema";
import { sql } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      orderId,
      customerId,
      items,
      netAmount,
      taxRate,
      taxAmount,
      grossAmount,
    } = body;

    if (!customerId || !items) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const year = new Date().getFullYear();
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(acctInvoices);
    const count = (countResult[0]?.count ?? 0) + 1;
    const invoiceNumber = `RE-${year}-${String(count).padStart(4, "0")}`;

    // Calculate due date (14 days from now)
    const now = new Date();
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + 14);

    const [invoice] = await db
      .insert(acctInvoices)
      .values({
        invoiceNumber,
        orderId: orderId || null,
        customerId,
        items: JSON.stringify(items),
        netAmount: netAmount || 0,
        taxRate: taxRate || 19,
        taxAmount: taxAmount || 0,
        grossAmount: grossAmount || 0,
        status: "entwurf",
        issueDate: now.toISOString().slice(0, 10),
        dueDate: dueDate.toISOString().slice(0, 10),
      })
      .returning();

    return NextResponse.json({ invoice });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create invoice" },
      { status: 500 },
    );
  }
}
