import { NextRequest, NextResponse } from "next/server";
import { checkApiAuth } from "@/lib/api-auth";
import { getAssets, createAsset } from "@/db/queries/collaboration";

export async function GET(request: NextRequest) {
  try {
    const authError = await checkApiAuth();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") ?? undefined;
    const limit = parseInt(searchParams.get("limit") ?? "50");
    const offset = parseInt(searchParams.get("offset") ?? "0");

    const assets = await getAssets({ type, limit, offset });
    return NextResponse.json(assets);
  } catch (error) {
    console.error("[GET /api/assets]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authError = await checkApiAuth();
    if (authError) return authError;

    const body = await request.json();

    if (!body.name || !body.url) {
      return NextResponse.json({ error: "name and url are required" }, { status: 400 });
    }

    // Basic URL validation
    try {
      new URL(body.url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    const asset = await createAsset({
      name: body.name,
      url: body.url,
      type: body.type ?? "image",
      mimeType: body.mimeType,
      sizeBytes: body.sizeBytes,
      width: body.width,
      height: body.height,
      altText: body.altText,
      uploadedBy: body.uploadedBy,
    });

    return NextResponse.json(asset, { status: 201 });
  } catch (error) {
    console.error("[POST /api/assets]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
