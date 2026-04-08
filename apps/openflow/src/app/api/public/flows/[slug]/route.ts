import { NextRequest, NextResponse } from "next/server";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@/db";
import { flows, flowVersions } from "@/db/schema";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Find the published flow by slug
    const flow = await db.query.flows.findFirst({
      where: and(eq(flows.slug, slug), eq(flows.status, "published")),
    });

    if (!flow) {
      return NextResponse.json({ error: "Flow not found" }, { status: 404 });
    }

    // Get the latest published version snapshot
    const latestVersion = await db.query.flowVersions.findFirst({
      where: eq(flowVersions.flowId, flow.id),
      orderBy: [desc(flowVersions.version)],
    });

    if (!latestVersion) {
      return NextResponse.json(
        { error: "No published version found" },
        { status: 404 }
      );
    }

    const snapshot = JSON.parse(latestVersion.snapshot);

    return NextResponse.json({
      id: flow.id,
      name: flow.name,
      slug: flow.slug,
      description: flow.description,
      version: latestVersion.version,
      publishedAt: latestVersion.publishedAt,
      ...snapshot,
    });
  } catch (error) {
    console.error("[GET /api/public/flows/[slug]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
