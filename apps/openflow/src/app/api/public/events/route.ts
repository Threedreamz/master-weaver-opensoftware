import { NextRequest, NextResponse } from "next/server";
import { eq, and, gte } from "drizzle-orm";
import { db } from "@/db";
import { flowEvents } from "@/db/schema";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      flowId,
      type,
      stepId,
      sessionId,
      device,
      userAgent,
      referrer,
      utmSource,
      utmMedium,
      utmCampaign,
    } = body;

    if (!flowId || !type) {
      return NextResponse.json(
        { error: "flowId and type are required" },
        { status: 400 }
      );
    }

    const validTypes = ["view", "step_view", "submission", "exit"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: "Invalid event type" },
        { status: 400 }
      );
    }

    // Simple dedup: skip if same sessionId+type+stepId within last 5 seconds
    if (sessionId) {
      const fiveSecondsAgo = new Date(Date.now() - 5000);
      const conditions = [
        eq(flowEvents.sessionId, sessionId),
        eq(flowEvents.type, type),
        gte(flowEvents.createdAt, fiveSecondsAgo),
      ];
      if (stepId) {
        conditions.push(eq(flowEvents.stepId, stepId));
      }

      const existing = await db
        .select({ id: flowEvents.id })
        .from(flowEvents)
        .where(and(...conditions))
        .limit(1);

      if (existing.length > 0) {
        return NextResponse.json({ deduplicated: true }, { status: 200 });
      }
    }

    const [event] = await db
      .insert(flowEvents)
      .values({
        flowId,
        type,
        stepId: stepId ?? null,
        sessionId: sessionId ?? null,
        device: device ?? null,
        userAgent: userAgent ?? null,
        referrer: referrer ?? null,
        utmSource: utmSource ?? null,
        utmMedium: utmMedium ?? null,
        utmCampaign: utmCampaign ?? null,
      })
      .returning();

    return NextResponse.json({ id: event.id }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/public/events]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
