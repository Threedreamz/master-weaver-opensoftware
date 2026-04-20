import { NextRequest, NextResponse } from "next/server";
import { readFile, unlink } from "fs/promises";
import path from "path";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { uploads } from "@/db/schema";
import { checkApiAuth } from "@/lib/api-auth";

const UPLOAD_DIR = path.join(process.cwd(), ".uploads");

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const row = await db.query.uploads.findFirst({ where: eq(uploads.id, id) });
    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const absPath = path.join(UPLOAD_DIR, row.storagePath);
    let buffer: Buffer;
    try {
      buffer = await readFile(absPath);
    } catch {
      return NextResponse.json({ error: "File missing on disk" }, { status: 404 });
    }

    // Sanitize filename for Content-Disposition — strip quotes/newlines
    const safeName = row.originalName.replace(/["\r\n]/g, "_");
    // Copy into a fresh ArrayBuffer to satisfy BodyInit typing (avoid SharedArrayBuffer unions)
    const body = new Uint8Array(buffer.byteLength);
    body.set(buffer);
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": row.mimeType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${safeName}"`,
        "Content-Length": String(row.sizeBytes),
      },
    });
  } catch (error) {
    console.error("[GET /api/uploads/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await checkApiAuth();
    if (authError) return authError;

    const { id } = await params;
    const row = await db.query.uploads.findFirst({ where: eq(uploads.id, id) });
    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const absPath = path.join(UPLOAD_DIR, row.storagePath);
    try {
      await unlink(absPath);
    } catch {
      // File already missing — continue with DB cleanup.
    }
    await db.delete(uploads).where(eq(uploads.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/uploads/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
