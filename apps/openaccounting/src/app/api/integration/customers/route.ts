import { NextResponse } from "next/server";
import { db } from "@/db";
import { acctCustomers } from "@/db/schema";

export async function GET() {
  try {
    const customers = await db.select().from(acctCustomers);
    return NextResponse.json({ customers });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch customers" },
      { status: 500 },
    );
  }
}
