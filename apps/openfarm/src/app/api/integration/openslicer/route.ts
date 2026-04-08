import { NextResponse } from "next/server";
import {
  sendToSlicer,
  checkConnection,
} from "../../../../lib/openslicer-client";
import { getModelById } from "../../../../db/queries/models";

/**
 * POST: Send a model from OpenFarm to OpenSlicer for slicing.
 * Body: { modelId: string, profileId?: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { modelId, profileId } = body as {
      modelId?: string;
      profileId?: string;
    };

    if (!modelId) {
      return NextResponse.json(
        { error: "Missing required field: modelId" },
        { status: 400 },
      );
    }

    // Look up the model in openfarm DB
    const model = await getModelById(modelId);
    if (!model) {
      return NextResponse.json(
        { error: "Model not found" },
        { status: 404 },
      );
    }

    // Send to OpenSlicer
    const result = await sendToSlicer(
      model.id,
      model.filePath,
      model.name,
      model.fileFormat,
      profileId,
    );

    return NextResponse.json(result);
  } catch (err) {
    console.error("OpenSlicer integration error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to send model to OpenSlicer";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

/**
 * GET: Check OpenSlicer connection status.
 */
export async function GET() {
  try {
    const status = await checkConnection();
    return NextResponse.json(status);
  } catch (err) {
    console.error("OpenSlicer connection check error:", err);
    return NextResponse.json(
      { connected: false, error: "Connection check failed" },
      { status: 503 },
    );
  }
}
