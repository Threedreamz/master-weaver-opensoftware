import { NextRequest, NextResponse } from "next/server";
import { checkApiAuth } from "@/lib/api-auth";
import { getFlows, createFlow } from "@/db/queries/flows";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function GET(request: NextRequest) {
  try {
    const authError = await checkApiAuth();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") ?? undefined;
    const search = searchParams.get("search") ?? undefined;
    const limit = parseInt(searchParams.get("limit") ?? "20", 10);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    const flows = await getFlows({ status, search, limit, offset });
    const allFlows = await getFlows({ status, search, limit: 100000, offset: 0 });

    return NextResponse.json({ flows, total: allFlows.length });
  } catch (error) {
    console.error("[GET /api/flows]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authError = await checkApiAuth();
    if (authError) return authError;

    const body = await request.json();
    const { name, description, slug: rawSlug } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const slug = rawSlug ? String(rawSlug) : generateSlug(name);

    const flow = await createFlow({
      name,
      slug,
      description: description ?? undefined,
    });

    return NextResponse.json(flow, { status: 201 });
  } catch (error) {
    console.error("[POST /api/flows]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
