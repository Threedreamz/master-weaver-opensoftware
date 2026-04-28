import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { db } from "@/db";
import { imgJobs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getProvider } from "@/lib/providers";
import { CountryGatedError } from "@/lib/providers/types";
import { checkQuota, incrementQuota } from "@/lib/quota-check";
import { isUserClass, type ProviderId, type UserClass } from "@/lib/quotas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  provider: z.enum(["fal", "replicate"]),
  inputType: z.enum(["text", "image"]),
  inputPayload: z.record(z.string(), z.unknown()),
  countryCode: z.string().length(2).optional(),
  userId: z.string().min(1),
  /** Optional in body — header X-User-Class wins when both are present. */
  userClass: z.string().optional(),
});

function resolveUserClass(req: NextRequest, bodyValue: string | undefined): UserClass {
  const headerValue = req.headers.get("x-user-class")?.toLowerCase().trim();
  const candidate = headerValue || bodyValue?.toLowerCase().trim() || "anonymous";
  return isUserClass(candidate) ? candidate : "anonymous";
}

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
  const userClass = resolveUserClass(req, parsed.data.userClass);

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

  // Layer 1 + Layer 2 quota check BEFORE we touch the provider — refusing
  // here is free, refusing after a paid call is not.
  const quota = await checkQuota(userId, userClass, providerId as ProviderId);
  if (!quota.ok) {
    const retryAfterSec = Math.max(1, Math.ceil((quota.resetAt - Date.now()) / 1000));
    return NextResponse.json(
      {
        error: "QUOTA_EXCEEDED",
        scope: quota.scope,
        period: quota.period,
        limit: quota.limit,
        used: quota.used,
        resetAt: quota.resetAt,
        message: quota.reason,
        provider: providerId,
        userClass,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSec),
          "X-RateLimit-Limit": String(quota.limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(quota.resetAt / 1000)),
        },
      },
    );
  }

  const jobId = randomUUID();
  const now = new Date();
  await db.insert(imgJobs).values({
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
    const submitResult = await provider.submit({ inputType, inputPayload, countryCode });

    // Sync providers (some Fal models in sync mode) can return imageUrl on submit.
    if (submitResult.syncImageUrl) {
      const completedAt = new Date();
      await db
        .update(imgJobs)
        .set({
          status: "succeeded",
          providerJobId: submitResult.providerJobId,
          outputImageUrl: submitResult.syncImageUrl,
          outputWidth: submitResult.syncWidth ?? null,
          outputHeight: submitResult.syncHeight ?? null,
          updatedAt: completedAt,
          completedAt,
        })
        .where(eq(imgJobs.id, jobId));
      await incrementQuota(userId, userClass, providerId as ProviderId, completedAt);
      return NextResponse.json({
        jobId,
        status: "succeeded",
        provider: providerId,
        providerJobId: submitResult.providerJobId,
        imageUrl: submitResult.syncImageUrl,
        width: submitResult.syncWidth,
        height: submitResult.syncHeight,
        userClass,
      });
    }

    await db
      .update(imgJobs)
      .set({
        status: "running",
        providerJobId: submitResult.providerJobId,
        updatedAt: new Date(),
      })
      .where(eq(imgJobs.id, jobId));

    // Increment AFTER successful submit — failed submits don't count against
    // the quota. This is conservative: a user could in theory exceed by 1 in a
    // race with a parallel concurrent submit, since the check is non-locking.
    // Acceptable: the global provider killswitch caps absolute spend.
    await incrementQuota(userId, userClass, providerId as ProviderId, new Date());

    return NextResponse.json({
      jobId,
      status: "running",
      provider: providerId,
      providerJobId: submitResult.providerJobId,
      userClass,
    });
  } catch (err) {
    if (err instanceof CountryGatedError) {
      await db
        .update(imgJobs)
        .set({
          status: "failed",
          errorMessage: err.message,
          updatedAt: new Date(),
          completedAt: new Date(),
        })
        .where(eq(imgJobs.id, jobId));
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
      .update(imgJobs)
      .set({
        status: "failed",
        errorMessage: message,
        updatedAt: new Date(),
        completedAt: new Date(),
      })
      .where(eq(imgJobs.id, jobId));
    return NextResponse.json(
      { error: "PROVIDER_SUBMIT_FAILED", message, jobId },
      { status: 502 },
    );
  }
}
