import { NextResponse } from "next/server";
import { encrypt } from "@/lib/crypto";
import { db } from "@/db";
import { apiCredentials } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { resolveCredential } from "@/lib/credential-resolver";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const locale = searchParams.get("state") || "de";

  if (!code) {
    return NextResponse.redirect(new URL(`/${locale}/sem/settings?error=no_code`, request.url));
  }

  const clientId = await resolveCredential("google_ads", "client_id");
  const clientSecret = await resolveCredential("google_ads", "client_secret");

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL(`/${locale}/sem/settings?error=missing_config`, request.url));
  }

  const redirectUri = `${process.env.NEXTAUTH_URL || "http://localhost:4166"}/api/auth/google-ads/callback`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL(`/${locale}/sem/settings?error=token_exchange_failed`, request.url));
  }

  const tokens = await tokenRes.json() as { refresh_token?: string; access_token: string };

  if (tokens.refresh_token) {
    const encrypted = encrypt(tokens.refresh_token);
    const existing = await db.select().from(apiCredentials)
      .where(and(eq(apiCredentials.provider, "google_ads"), eq(apiCredentials.credentialKey, "refresh_token")))
      .limit(1);

    if (existing.length > 0) {
      await db.update(apiCredentials)
        .set({ encryptedValue: encrypted, testStatus: "success", updatedAt: new Date() })
        .where(eq(apiCredentials.id, existing[0].id));
    } else {
      await db.insert(apiCredentials).values({
        provider: "google_ads",
        credentialKey: "refresh_token",
        encryptedValue: encrypted,
        testStatus: "success",
      });
    }
  }

  return NextResponse.redirect(new URL(`/${locale}/sem/settings?success=google_ads_connected`, request.url));
}
