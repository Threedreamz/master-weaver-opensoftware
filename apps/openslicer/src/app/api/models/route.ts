import { NextResponse } from "next/server";
import { getAllModels } from "../../../db/queries/models";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const models = await getAllModels();
    return NextResponse.json(models);
  } catch (error) {
    console.error("Failed to get models:", error);
    return NextResponse.json({ error: "Failed to get models" }, { status: 500 });
  }
}
