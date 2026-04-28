import { NextResponse } from "next/server";
import { unlink } from "node:fs/promises";
import { getModelById, deleteModel } from "../../../../db/queries/models";
import { resolveUser } from "../../../../lib/internal-user";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const u = await resolveUser(request);
  if (u instanceof NextResponse) return u;

  const { id } = await params;
  const model = getModelById(id);

  if (!model) {
    return NextResponse.json({ error: "Model not found" }, { status: 404 });
  }

  return NextResponse.json(model);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const u = await resolveUser(request);
  if (u instanceof NextResponse) return u;

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
