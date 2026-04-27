import { NextRequest, NextResponse } from "next/server";
import { createModel } from "@/db/queries/models";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { createHash } from "crypto";

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_FORMATS = ["stl", "3mf", "obj", "step"] as const;
type FileFormat = (typeof ALLOWED_FORMATS)[number];

// Maps alternate extensions to their canonical FileFormat
const EXT_TO_FORMAT: Record<string, FileFormat> = { stp: "step" };

const MODELS_DIR = join(process.cwd(), "data", "models");

function getFileExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() || "";
}

function isValidFormat(ext: string): boolean {
  if (ext in EXT_TO_FORMAT) return true;
  return ALLOWED_FORMATS.includes(ext as FileFormat);
}

function normalizeExt(ext: string): FileFormat {
  return (EXT_TO_FORMAT[ext] ?? ext) as FileFormat;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const file = formData.get("file") as File | null;
    const name = formData.get("name") as string | null;
    const description = (formData.get("description") as string) || undefined;
    const tagsRaw = formData.get("tags") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Validate file type
    const ext = getFileExtension(file.name);
    if (!isValidFormat(ext)) {
      return NextResponse.json(
        { error: `Invalid file type: .${ext}. Allowed: ${ALLOWED_FORMATS.join(", ")}, stp` },
        { status: 400 }
      );
    }
    const fileFormat = normalizeExt(ext);

    // Parse tags
    let tags: string[] | undefined;
    if (tagsRaw) {
      try {
        tags = JSON.parse(tagsRaw);
      } catch {
        tags = tagsRaw.split(",").map((t) => t.trim()).filter(Boolean);
      }
    }

    // Read file buffer and compute hash
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileHash = createHash("sha256").update(buffer).digest("hex");

    // Ensure models directory exists
    await mkdir(MODELS_DIR, { recursive: true });

    // Generate unique filename to avoid collisions
    const timestamp = Date.now();
    const safeFilename = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const filePath = join(MODELS_DIR, safeFilename);

    // Write file to disk
    await writeFile(filePath, buffer);

    // Insert into database
    const model = await createModel({
      name: name.trim(),
      filename: file.name,
      filePath: `data/models/${safeFilename}`,
      fileFormat,
      fileSizeBytes: file.size,
      description,
      uploadedBy: undefined, // Could be populated from auth session
    });

    // Update model with hash and tags via a separate update if needed
    // For now the createModel query doesn't support hash/tags, so we return them alongside
    return NextResponse.json(
      {
        ...model,
        fileHash,
        tags: tags || [],
      },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
