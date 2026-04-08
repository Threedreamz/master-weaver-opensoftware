import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq, isNull } from "drizzle-orm";

// GET /api/pipelines — List all root pipelines
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const nurHaupt = url.searchParams.get("nurHaupt") !== "false";

  let pipelines;
  if (nurHaupt) {
    pipelines = db.select().from(schema.pipPipelines).where(isNull(schema.pipPipelines.elternPipelineId)).all();
  } else {
    pipelines = db.select().from(schema.pipPipelines).all();
  }

  return NextResponse.json(pipelines);
}

// POST /api/pipelines — Create a new pipeline
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, beschreibung, typ, farbe, icon, ecosystemId, elternPipelineId, templateId, teamsChannelId, bountyProjektId } = body;

  if (!name) {
    return NextResponse.json({ error: "Name ist erforderlich" }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const now = new Date();

  db.insert(schema.pipPipelines)
    .values({
      id,
      name,
      beschreibung: beschreibung ?? null,
      typ: typ ?? "projekt",
      status: "entwurf",
      farbe: farbe ?? null,
      icon: icon ?? null,
      ecosystemId: ecosystemId ?? null,
      elternPipelineId: elternPipelineId ?? null,
      templateId: templateId ?? null,
      teamsChannelId: teamsChannelId ?? null,
      bountyProjektId: bountyProjektId ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  const pipeline = db.select().from(schema.pipPipelines).where(eq(schema.pipPipelines.id, id)).get();

  return NextResponse.json(pipeline, { status: 201 });
}
