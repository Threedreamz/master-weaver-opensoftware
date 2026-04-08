import { NextResponse } from "next/server";
import { unlink } from "node:fs/promises";
import { getModelById, deleteModel } from "../../../../db/queries/models";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const model = getModelById(id);

  if (!model) {
    return NextResponse.json({ error: "Model not found" }, { status: 404 });
  }

  return NextResponse.json(model);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const model = getModelById(id);

  if (!model) {
    return NextResponse.json({ error: "Model not found" }, { status: 404 });
  }

  // Remove file from disk
  try {
    await unlink(model.filePath);
  } catch {
    // File may already be deleted — continue
  }

  deleteModel(id);

  return NextResponse.json({ success: true });
}
