import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { genJobs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getProvider } from "@/lib/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const rows = await db.select().from(genJobs).where(eq(genJobs.id, id)).limit(1);
  const job = rows[0];
  if (!job) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: `job ${id} not found` },
      { status: 404 },
    );
  }

  if (job.status === "succeeded" || job.status === "failed") {
    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      provider: job.provider,
      providerJobId: job.providerJobId,
      glbUrl: job.outputGlbUrl,
      triangleCount: job.outputTriangleCount,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      completedAt: job.completedAt,
    });
  }

  if (!job.providerJobId) {
    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      provider: job.provider,
      providerJobId: null,
    });
  }

  const provider = getProvider(job.provider);
  if (!provider) {
    return NextResponse.json(
      {
        error: "UNKNOWN_PROVIDER",
        message: `provider "${job.provider}" no longer registered on this gateway`,
      },
      { status: 500 },
    );
  }

  try {
    const result = await provider.poll(job.providerJobId);
    const now = new Date();

    if (result.status === "succeeded") {
      await db
        .update(genJobs)
        .set({
          status: "succeeded",
          outputGlbUrl: result.glbUrl,
          outputTriangleCount: result.triangleCount,
          updatedAt: now,
          completedAt: now,
        })
        .where(eq(genJobs.id, id));
      return NextResponse.json({
        jobId: job.id,
        status: "succeeded",
        provider: job.provider,
        providerJobId: job.providerJobId,
        glbUrl: result.glbUrl,
        triangleCount: result.triangleCount,
      });
    }

    if (result.status === "failed") {
      await db
        .update(genJobs)
        .set({
          status: "failed",
          errorMessage: result.errorMessage ?? "provider reported failure",
          updatedAt: now,
          completedAt: now,
        })
        .where(eq(genJobs.id, id));
      return NextResponse.json({
        jobId: job.id,
        status: "failed",
        provider: job.provider,
        providerJobId: job.providerJobId,
        errorMessage: result.errorMessage,
      });
    }

    await db
      .update(genJobs)
      .set({ status: "running", updatedAt: now })
      .where(eq(genJobs.id, id));
    return NextResponse.json({
      jobId: job.id,
      status: "running",
      provider: job.provider,
      providerJobId: job.providerJobId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "PROVIDER_POLL_FAILED", message, jobId: id },
      { status: 502 },
    );
  }
}
