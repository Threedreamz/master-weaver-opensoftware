import { NextRequest, NextResponse } from "next/server";
import { getSpareParts, createSparePart } from "@/db/queries/maintenance";

export async function GET() {
  try {
    const parts = await getSpareParts();
    return NextResponse.json({ parts });
  } catch (error) {
    console.error("Failed to get spare parts:", error);
    return NextResponse.json({ error: "Failed to get parts" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, partNumber, category, compatiblePrinterIds, quantity, minQuantity, costPerUnit, supplier, supplierUrl, notes } = body;
    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    const part = await createSparePart({
      name, partNumber, category, compatiblePrinterIds, quantity, minQuantity, costPerUnit, supplier, supplierUrl, notes,
    });
    return NextResponse.json({ part });
  } catch (error) {
    console.error("Failed to create part:", error);
    return NextResponse.json({ error: "Failed to create part" }, { status: 500 });
  }
}
