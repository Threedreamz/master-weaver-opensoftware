import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { getJob } from "@/lib/jobs";

export const runtime = "nodejs";

// V1: full-buffer read. Reels are 10–30s WebM at typical product-rendering
// quality (~5–20 MB) so a single in-memory read is fine. V2 can add
// HTTP range support for seeking on longer outputs.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const job = await getJob(id);
  if (!job || job.status !== "complete" || !job.outputPath) {
    return NextResponse.json({ error: "Not ready" }, { status: 404 });
  }

  try {
    const buf = await readFile(job.outputPath);
    return new NextResponse(buf, {
      headers: {
        "content-type": job.outputMimeType ?? "video/webm",
        "content-length": String(buf.byteLength),
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    console.error("[open3dreel] serve output error:", err);
    return NextResponse.json({ error: "Output missing" }, { status: 404 });
  }
}
