import { NextResponse } from "next/server";
import { readFile, stat } from "node:fs/promises";
import { basename } from "node:path";
import { eq } from "drizzle-orm";
import { db } from "../../../../db";
import { slicerGcodes } from "../../../../db/schema";

export async function GET(
  request: Request,
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

  // If ?meta=true, return metadata as JSON instead of the file
  const url = new URL(request.url);
  const wantMeta = url.searchParams.get("meta") === "true";

  if (wantMeta) {
    let fileSizeBytes = gcode.fileSizeBytes;
    try {
      if (!fileSizeBytes) {
        const fileStat = await stat(gcode.filePath);
        fileSizeBytes = fileStat.size;
      }
    } catch {
      // ignore
    }

    return NextResponse.json({
      id: gcode.id,
      historyId: gcode.historyId,
      filePath: gcode.filePath,
      fileSizeBytes,
      metadata: gcode.metadata,
      createdAt: gcode.createdAt,
    });
  }

  try {
    const fileStat = await stat(gcode.filePath);
    const content = await readFile(gcode.filePath);
    const filename = basename(gcode.filePath);

    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(fileStat.size),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "G-code file not found on disk" },
      { status: 404 }
    );
  }
}
