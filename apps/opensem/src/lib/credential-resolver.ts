import { db } from "@/db";
import { apiCredentials } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { decrypt } from "./crypto";

type Provider = "google_ads" | "semrush";

export async function resolveCredential(provider: Provider, key: string): Promise<string | null> {
  // Try DB first
  const row = await db.query.apiCredentials?.findFirst({
    where: and(eq(apiCredentials.provider, provider), eq(apiCredentials.credentialKey, key)),
  });
  if (row?.encryptedValue) {
    try { return decrypt(row.encryptedValue); } catch { /* fall through */ }
  }
  // Fallback to env vars
  const envKey = `${provider.toUpperCase()}_${key.toUpperCase()}`;
  return process.env[envKey] ?? null;
}

export async function resolveGoogleAdsCredentials() {
  const [developerToken, clientId, clientSecret, refreshToken, customerId] = await Promise.all([
    resolveCredential("google_ads", "developer_token"),
    resolveCredential("google_ads", "client_id"),
    resolveCredential("google_ads", "client_secret"),
    resolveCredential("google_ads", "refresh_token"),
    resolveCredential("google_ads", "customer_id"),
  ]);
  if (!developerToken || !clientId || !clientSecret || !refreshToken || !customerId) return null;
  return { developerToken, clientId, clientSecret, refreshToken, customerId };
}

export async function resolveSemrushApiKey(): Promise<string | null> {
  return resolveCredential("semrush", "api_key");
}
