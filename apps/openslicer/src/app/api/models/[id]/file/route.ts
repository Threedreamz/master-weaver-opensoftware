import { NextResponse } from "next/server";
import { getModelById } from "../../../../../db/queries/models";
import { readFileSync } from "fs";
import { resolve } from "path";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const model = await getModelById(id);
    if (!model) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    const filePath = resolve(process.cwd(), model.filePath);
    const buffer = readFileSync(filePath);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `inline; filename="${model.filename}"`,
      },
    });
  } catch (error) {
    console.error("Failed to serve model file:", error);
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
