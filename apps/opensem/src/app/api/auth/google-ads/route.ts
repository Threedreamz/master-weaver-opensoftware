import { NextResponse } from "next/server";
import { resolveCredential } from "@/lib/credential-resolver";

export async function POST(request: Request) {
  const body = await request.json();
  const locale = body.locale || "de";

  const clientId = await resolveCredential("google_ads", "client_id");
  if (!clientId) {
    return NextResponse.json({ error: "Google Ads client_id not configured" }, { status: 400 });
  }

  const redirectUri = `${process.env.NEXTAUTH_URL || "http://localhost:4166"}/api/auth/google-ads/callback`;
  const scopes = ["https://www.googleapis.com/auth/adwords"];
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", scopes.join(" "));
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("state", locale);

  return NextResponse.json({ authUrl: authUrl.toString() });
}
