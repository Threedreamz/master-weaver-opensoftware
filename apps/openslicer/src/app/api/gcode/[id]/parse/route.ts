import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { db } from "../../../../../db";
import { slicerGcodes } from "../../../../../db/schema";
import { parseGcodeToolpath, parseGcodeMetadata } from "@opensoftware/slicer-core";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const gcode = db
    .select()
    .from(slicerGcodes)
    .where(eq(slicerGcodes.id, id))
    .get();

  if (!gcode) {
    return NextResponse.json({ error: "G-code not found" }, { status: 404 });
  }

  try {
    const content = await readFile(gcode.filePath, "utf-8");
    const toolpath = parseGcodeToolpath(content);
    const metadata = parseGcodeMetadata(content);

    return NextResponse.json({ toolpath, metadata });
  } catch {
    return NextResponse.json(
      { error: "Failed to parse G-code file" },
      { status: 500 }
    );
  }
}
