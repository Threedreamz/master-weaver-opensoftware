import { NextResponse } from "next/server";
import { getPrinters } from "@/db/queries/printers";

export async function GET() {
  try {
    const printers = await getPrinters();
    return NextResponse.json(printers);
  } catch (error) {
    console.error("Failed to get printers:", error);
    return NextResponse.json({ error: "Failed to get printers" }, { status: 500 });
  }
}
