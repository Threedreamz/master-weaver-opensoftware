import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { getJob, completeJob, failJob } from "@/lib/jobs";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const job = await getJob(id);
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (job.status === "complete") return NextResponse.json({ job });

  try {
    const buf = Buffer.from(await req.arrayBuffer());
    const mimeType = req.headers.get("content-type") ?? "video/webm";
    const ext = mimeType.includes("mp4") ? "mp4" : "webm";

    const reelsDir = process.env.REELS_DIR || "./data/reels";
    await mkdir(reelsDir, { recursive: true });
    const outputPath = path.join(reelsDir, `${id}.${ext}`);
    await writeFile(outputPath, buf);

    const updated = await completeJob(id, outputPath, mimeType, buf.byteLength);
    return NextResponse.json({ job: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await failJob(id, msg).catch(() => {});
    console.error("[open3dreel] upload-output error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
