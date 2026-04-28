import { NextRequest, NextResponse } from "next/server";
import { readQuotaSnapshot } from "@/lib/quota-check";
import {
  getClassQuota,
  getProviderCap,
  isUserClass,
  resolvePromotedClass,
  type ProviderId,
  type UserClass,
  USER_CLASSES,
} from "@/lib/quotas";
import { PROVIDER_IDS } from "@/lib/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/quota?userId=<id>&provider=<provider>
 *
 * Returns a snapshot of all four counters (user/day, user/month, provider/day,
 * provider/month) plus the configured limits and reset times. Used by the
 * admin AppStore tile and by hub-side UI to grey out exhausted providers.
 *
 * Auth model: same as /api/generate — server-to-server via OPENSOFTWARE_API_KEY
 * + trusted X-User-Class / X-User-Id headers from the calling admin/hub. The
 * gateway DOES NOT validate the user-class — the consumer is trusted because
 * it shares the OpenSoftware API key. This is the same trust model used by
 * every other opensoftware service.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId") ?? req.headers.get("x-user-id");
  const providerParam = url.searchParams.get("provider");

  const userClassRaw =
    (req.headers.get("x-user-class") ?? url.searchParams.get("userClass") ?? "anonymous")
      .toLowerCase()
      .trim();
  const baseClass: UserClass = isUserClass(userClassRaw) ? userClassRaw : "anonymous";
  const email =
    req.headers.get("x-hub-user-email") ??
    req.headers.get("x-user-email") ??
    url.searchParams.get("email");
  const userClass: UserClass = resolvePromotedClass(email, baseClass);

  if (!userId) {
    return NextResponse.json(
      {
        error: "BAD_INPUT",
        message: "missing userId — pass as ?userId= or X-User-Id header",
      },
      { status: 400 },
    );
  }

  if (providerParam) {
    if (!PROVIDER_IDS.includes(providerParam as never)) {
      return NextResponse.json(
        { error: "UNKNOWN_PROVIDER", message: `provider "${providerParam}" not registered` },
        { status: 400 },
      );
    }
    const snapshot = await readQuotaSnapshot(
      userId,
      userClass,
      providerParam as ProviderId,
    );
    return NextResponse.json({
      userId,
      userClass,
      providerId: providerParam,
      user: snapshot.user,
      provider: snapshot.provider,
    });
  }

  // No provider specified — return a per-provider snapshot for all enabled providers.
  const all = await Promise.all(
    PROVIDER_IDS.map(async (p) => {
      const snap = await readQuotaSnapshot(userId, userClass, p as ProviderId);
      return {
        providerId: p,
        user: snap.user,
        provider: snap.provider,
      };
    }),
  );

  return NextResponse.json({
    userId,
    userClass,
    classLimits: getClassQuota(userClass),
    providers: all,
    config: {
      classes: USER_CLASSES.map((c) => ({ id: c, ...getClassQuota(c) })),
      providerCaps: PROVIDER_IDS.map((p) => ({
        id: p,
        ...getProviderCap(p as ProviderId),
      })),
    },
  });
}
