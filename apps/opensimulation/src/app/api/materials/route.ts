export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { db, schema } from "@/db";
import { desc, eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth-helpers";
import { CreateMaterialBody } from "@/lib/api-contracts";

/* GET /api/materials — list ALL materials for current user (no pagination in M1) */
export async function GET(_req: NextRequest) {
  const s = await requireSession();
  if (!s) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rows = await db
    .select()
    .from(schema.opensimulationMaterials)
    .where(eq(schema.opensimulationMaterials.userId, s.userId))
    .orderBy(desc(schema.opensimulationMaterials.createdAt));

  const items = rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    name: row.name,
    density: row.density,
    youngModulus: row.youngModulus,
    poisson: row.poisson,
    thermalConductivity: row.thermalConductivity,
    specificHeat: row.specificHeat,
    yieldStrength: row.yieldStrength,
    createdAt: new Date(row.createdAt).toISOString(),
  }));

  return NextResponse.json({ items });
}

/* POST /api/materials — create a user-owned material preset */
export async function POST(req: NextRequest) {
  const s = await requireSession();
  if (!s) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = CreateMaterialBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const [row] = await db
    .insert(schema.opensimulationMaterials)
    .values({
      userId: s.userId,
      name: parsed.data.name,
      density: parsed.data.density,
      youngModulus: parsed.data.youngModulus,
      poisson: parsed.data.poisson,
      thermalConductivity: parsed.data.thermalConductivity,
      specificHeat: parsed.data.specificHeat,
      yieldStrength: parsed.data.yieldStrength,
    })
    .returning();

  return NextResponse.json(
    {
      id: row.id,
      userId: row.userId,
      name: row.name,
      density: row.density,
      youngModulus: row.youngModulus,
      poisson: row.poisson,
      thermalConductivity: row.thermalConductivity,
      specificHeat: row.specificHeat,
      yieldStrength: row.yieldStrength,
      createdAt: new Date(row.createdAt).toISOString(),
    },
    { status: 201 },
  );
}
