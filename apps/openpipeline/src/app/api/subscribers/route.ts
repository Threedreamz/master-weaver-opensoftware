import { NextRequest, NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../../db";
import { pipCanonicalSubscribers } from "../../../db/schema";

/**
 * Manage canonical-event subscribers.
 *
 * GET  /api/subscribers            — list all (enabled + disabled).
 * POST /api/subscribers            — register a new subscriber.
 *
 * Auth: X-API-Key (OPENSOFTWARE_API_KEY).
 */
const subscriberInput = z.object({
  name: z.string().min(1).max(120),
  eventType: z.string().min(1),
  webhookUrl: z.string().url(),
  secret: z.string().optional(),
  enabled: z.boolean().optional(),
});

function authed(request: NextRequest): NextResponse | null {
  const expected = process.env.OPENSOFTWARE_API_KEY;
  if (!expected) return NextResponse.json({ error: "OPENSOFTWARE_API_KEY not configured" }, { status: 503 });
  if (request.headers.get("x-api-key") !== expected) return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  return null;
}

export async function GET(request: NextRequest) {
  const err = authed(request);
  if (err) return err;
  const rows = await db
    .select()
    .from(pipCanonicalSubscribers)
    .orderBy(desc(pipCanonicalSubscribers.createdAt));
  return NextResponse.json({ subscribers: rows });
}

export async function POST(request: NextRequest) {
  const err = authed(request);
  if (err) return err;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = subscriberInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid subscriber payload", issues: parsed.error.issues }, { status: 400 });
  }

  const [row] = await db.insert(pipCanonicalSubscribers).values({
    name: parsed.data.name,
    eventType: parsed.data.eventType,
    webhookUrl: parsed.data.webhookUrl,
    secret: parsed.data.secret ?? null,
    enabled: parsed.data.enabled ?? true,
  }).returning();

  return NextResponse.json(row, { status: 201 });
}
