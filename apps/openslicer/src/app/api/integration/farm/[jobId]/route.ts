import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { like } from "drizzle-orm";
import { db } from "../../../../../db";
import { slicerHistory, slicerGcodes, slicerModels } from "../../../../../db/schema";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await params;

    // Find the model that was imported for this farm job
    const model = db
      .select()
      .from(slicerModels)
      .where(like(slicerModels.description, `%job: ${jobId}%`))
      .get();

    if (!model) {
      return NextResponse.json(
        { error: "No model found for this farm job" },
        { status: 404 },
      );
    }

    // Find the latest history entry for this model
    const history = db
      .select()
      .from(slicerHistory)
      .where(like(slicerHistory.modelId, model.id))
      .all();

    if (history.length === 0) {
      return NextResponse.json({
        farmJobId: jobId,
        status: "no_slice_job",
        slicerModelId: model.id,
      });
    }

    // Get the most recent history entry
    const latest = history[history.length - 1];

    // Fetch associated gcodes if completed
    let gcodeUrl: string | null = null;
    if (latest.status === "completed") {
      const gcodes = db
        .select()
        .from(slicerGcodes)
        .where(like(slicerGcodes.historyId, latest.id))
        .all();

      if (gcodes.length > 0) {
        gcodeUrl = `/api/gcode/${gcodes[0].id}`;
      }
    }

    return NextResponse.json({
      farmJobId: jobId,
      slicerModelId: model.id,
      historyId: latest.id,
      status: latest.status,
      gcodeUrl,
      estimatedTime: latest.estimatedTime,
      estimatedMaterial: latest.estimatedMaterial,
      layerCount: latest.layerCount,
      errorMessage: latest.errorMessage,
    });
  } catch (err) {
    console.error("Farm integration status error:", err);
    return NextResponse.json(
      { error: "Failed to get slice status" },
      { status: 500 },
    );
  }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await params;

    // Find the model for this farm job
    const model = db
      .select()
      .from(slicerModels)
      .where(like(slicerModels.description, `%job: ${jobId}%`))
      .get();

    if (!model) {
      return NextResponse.json(
        { error: "No model found for this farm job" },
        { status: 404 },
      );
    }

    // Find completed history entry
    const history = db
      .select()
      .from(slicerHistory)
      .where(like(slicerHistory.modelId, model.id))
      .all();

    const completed = history.find((h) => h.status === "completed");
    if (!completed) {
      return NextResponse.json(
        { error: "No completed slice job found" },
        { status: 404 },
      );
    }

    // Get gcode files
    const gcodes = db
      .select()
      .from(slicerGcodes)
      .where(like(slicerGcodes.historyId, completed.id))
      .all();

    if (gcodes.length === 0 || !gcodes[0].filePath) {
      return NextResponse.json(
        { error: "No G-code file found" },
        { status: 404 },
      );
    }

    // Read and return gcode as base64
    const gcodeContent = await readFile(gcodes[0].filePath);
    const gcodeBase64 = gcodeContent.toString("base64");

    return NextResponse.json({
      farmJobId: jobId,
      gcodeBase64,
      fileSizeBytes: gcodeContent.length,
      metadata: gcodes[0].metadata,
    });
  } catch (err) {
    console.error("Farm integration gcode retrieval error:", err);
    return NextResponse.json(
      { error: "Failed to retrieve G-code" },
      { status: 500 },
    );
  }
}
