import { NextResponse } from "next/server";
import { getAllModels } from "../../../db/queries/models";
import { resolveUser } from "../../../lib/internal-user";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const u = await resolveUser(request);
  if (u instanceof NextResponse) return u;

  try {
    const models = await getAllModels();
    return NextResponse.json(models);
  } catch (error) {
    console.error("Failed to get models:", error);
    return NextResponse.json({ error: "Failed to get models" }, { status: 500 });
  }
}
