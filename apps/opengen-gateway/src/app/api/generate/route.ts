import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { db } from "@/db";
import { genJobs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getProvider } from "@/lib/providers";
import { CountryGatedError } from "@/lib/providers/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  provider: z.enum(["meshy", "tripo", "rodin", "triposr", "trellis", "hunyuan3d"]),
  inputType: z.enum(["text", "image", "multiview"]),
  inputPayload: z.record(z.string(), z.unknown()),
  countryCode: z.string().length(2).optional(),
  userId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "BAD_INPUT", message: "request body must be JSON" },
      { status: 400 },
    );
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "BAD_INPUT", message: parsed.error.message },
      { status: 400 },
    );
  }

  const { provider: providerId, inputType, inputPayload, countryCode, userId } = parsed.data;
  const provider = getProvider(providerId);
  if (!provider) {
    return NextResponse.json(
      { error: "UNKNOWN_PROVIDER", message: `provider "${providerId}" is not registered` },
      { status: 400 },
    );
  }

  if (!provider.isEnabled()) {
    return NextResponse.json(
      {
        error: "PROVIDER_DISABLED",
        message: `provider "${providerId}" is not configured on this gateway (missing API key or feature flag)`,
      },
      { status: 503 },
    );
  }

  const jobId = randomUUID();
  const now = new Date();
  await db.insert(genJobs).values({
    id: jobId,
    userId,
    provider: providerId,
    inputType,
    inputPayload: JSON.stringify(inputPayload),
    status: "queued",
    createdAt: now,
    updatedAt: now,
  });

  try {
    const { providerJobId } = await provider.submit({ inputType, inputPayload, countryCode });
    await db
      .update(genJobs)
      .set({ status: "running", providerJobId, updatedAt: new Date() })
      .where(eq(genJobs.id, jobId));
    return NextResponse.json({ jobId, status: "running", providerJobId });
  } catch (err) {
    if (err instanceof CountryGatedError) {
      await db
        .update(genJobs)
        .set({
          status: "failed",
          errorMessage: err.message,
          updatedAt: new Date(),
          completedAt: new Date(),
        })
        .where(eq(genJobs.id, jobId));
      return NextResponse.json(
        {
          error: "COUNTRY_GATED",
          provider: err.providerId,
          countryCode: err.countryCode,
          message: err.message,
          jobId,
        },
        { status: 451 },
      );
    }
    const message = err instanceof Error ? err.message : String(err);
    await db
      .update(genJobs)
      .set({
        status: "failed",
        errorMessage: message,
        updatedAt: new Date(),
        completedAt: new Date(),
      })
      .where(eq(genJobs.id, jobId));
    return NextResponse.json(
      { error: "PROVIDER_SUBMIT_FAILED", message, jobId },
      { status: 502 },
    );
  }
}
