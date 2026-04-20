import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { db } from "@/db";
import { uploads } from "@/db/schema";
import { checkApiAuth } from "@/lib/api-auth";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const UPLOAD_DIR = path.join(process.cwd(), ".uploads");

const ALLOWED_MIME_PREFIXES = ["image/", "text/"];
const ALLOWED_MIME_EXACT = new Set([
  "application/pdf",
  "application/zip",
  "application/octet-stream",
]);

function isMimeAllowed(mime: string): boolean {
  if (ALLOWED_MIME_EXACT.has(mime)) return true;
  return ALLOWED_MIME_PREFIXES.some((p) => mime.startsWith(p));
}

function extFromName(name: string, mime: string): string {
  const idx = name.lastIndexOf(".");
  if (idx >= 0 && idx < name.length - 1) {
    const ext = name.slice(idx + 1).toLowerCase().replace(/[^a-z0-9]/g, "");
    if (ext && ext.length <= 10) return ext;
  }
  // Fallback from mime
  if (mime === "application/pdf") return "pdf";
  if (mime === "application/zip") return "zip";
  if (mime.startsWith("image/")) return mime.slice(6).replace(/[^a-z0-9]/g, "") || "bin";
  if (mime.startsWith("text/")) return "txt";
  return "bin";
}

export async function POST(request: NextRequest) {
  const authError = await checkApiAuth();
  if (authError) return authError;

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `File too large. Max ${Math.round(MAX_SIZE / (1024 * 1024))} MB.` },
        { status: 413 }
      );
    }

    const mime = file.type || "application/octet-stream";
    if (!isMimeAllowed(mime)) {
      return NextResponse.json({ error: `Mime type not allowed: ${mime}` }, { status: 415 });
    }

    const flowId = typeof form.get("flowId") === "string" ? (form.get("flowId") as string) : null;
    const submissionId =
      typeof form.get("submissionId") === "string" ? (form.get("submissionId") as string) : null;

    const id = crypto.randomUUID();
    const ext = extFromName(file.name, mime);
    const filename = `${id}.${ext}`;
    const absPath = path.join(UPLOAD_DIR, filename);

    await mkdir(UPLOAD_DIR, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(absPath, buffer);

    await db.insert(uploads).values({
      id,
      flowId: flowId || null,
      submissionId: submissionId || null,
      originalName: file.name,
      mimeType: mime,
      sizeBytes: file.size,
      storagePath: filename,
      createdAt: new Date(),
    });

    return NextResponse.json(
      {
        id,
        url: `/api/uploads/${id}`,
        name: file.name,
        size: file.size,
        type: mime,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/uploads]", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
