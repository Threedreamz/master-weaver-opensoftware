import { Hono } from "hono";
import { db } from "@opensoftware/openmailer-db";
import { campaigns, campaignEvents } from "@opensoftware/openmailer-db/schema";
import { eq, and, sql } from "drizzle-orm";
import { createQueue, QUEUE_NAMES } from "@opensoftware/openmailer-queue";

const campaignQueue = createQueue(QUEUE_NAMES.CAMPAIGN);

interface CampaignVariables {
  user: { id: string; email: string; name?: string; role?: string };
  workspaceId: string;
}

export const campaignRoutes = new Hono<{ Variables: CampaignVariables }>();

// GET /api/campaigns
campaignRoutes.get("/", async (c) => {
  const workspaceId = c.get("workspaceId");

  const rows = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.workspaceId, workspaceId));

  return c.json({ data: rows });
});

// GET /api/campaigns/:id
campaignRoutes.get("/:id", async (c) => {
  const workspaceId = c.get("workspaceId");
  const id = c.req.param("id")!;

  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(
      and(eq(campaigns.id, id), eq(campaigns.workspaceId, workspaceId)),
    )
    .limit(1);

  if (!campaign) {
    return c.json({ error: "Campaign not found" }, 404);
  }

  // Get event stats
  const stats = await db
    .select({
      eventType: campaignEvents.type,
      count: sql<number>`count(*)`,
    })
    .from(campaignEvents)
    .where(eq(campaignEvents.campaignId, id))
    .groupBy(campaignEvents.type);

  const eventCounts: Record<string, number> = {};
  for (const stat of stats) {
    eventCounts[stat.eventType] = Number(stat.count);
  }

  return c.json({
    data: {
      ...campaign,
      stats: eventCounts,
    },
  });
});

// POST /api/campaigns
campaignRoutes.post("/", async (c) => {
  const workspaceId = c.get("workspaceId");
  const body = await c.req.json();

  const [campaign] = await db
    .insert(campaigns)
    .values({
      ...body,
      workspaceId,
    })
    .returning();

  return c.json({ data: campaign }, 201);
});

// PUT /api/campaigns/:id
campaignRoutes.put("/:id", async (c) => {
  const workspaceId = c.get("workspaceId");
  const id = c.req.param("id")!;
  const body = await c.req.json();

  const [campaign] = await db
    .update(campaigns)
    .set({
      ...body,
      updatedAt: new Date(),
    })
    .where(
      and(eq(campaigns.id, id), eq(campaigns.workspaceId, workspaceId)),
    )
    .returning();

  if (!campaign) {
    return c.json({ error: "Campaign not found" }, 404);
  }

  return c.json({ data: campaign });
});

// DELETE /api/campaigns/:id (only if draft)
campaignRoutes.delete("/:id", async (c) => {
  const workspaceId = c.get("workspaceId");
  const id = c.req.param("id")!;

  const [existing] = await db
    .select()
    .from(campaigns)
    .where(
      and(eq(campaigns.id, id), eq(campaigns.workspaceId, workspaceId)),
    )
    .limit(1);

  if (!existing) {
    return c.json({ error: "Campaign not found" }, 404);
  }

  if (existing.status !== "draft") {
    return c.json(
      { error: "Only draft campaigns can be deleted" },
      400,
    );
  }

  await db.delete(campaigns).where(eq(campaigns.id, id));

  return c.json({ success: true });
});

// POST /api/campaigns/:id/send
campaignRoutes.post("/:id/send", async (c) => {
  const workspaceId = c.get("workspaceId");
  const id = c.req.param("id")!;

  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(
      and(eq(campaigns.id, id), eq(campaigns.workspaceId, workspaceId)),
    )
    .limit(1);

  if (!campaign) {
    return c.json({ error: "Campaign not found" }, 404);
  }

  if (campaign.status !== "draft" && campaign.status !== "scheduled") {
    return c.json(
      { error: "Campaign cannot be sent in its current state" },
      400,
    );
  }

  // Update status to sending
  await db
    .update(campaigns)
    .set({ status: "sending", updatedAt: new Date() })
    .where(eq(campaigns.id, id));

  // Enqueue campaign for sending
  await campaignQueue.add("send-campaign", {
    campaignId: id,
    workspaceId,
  });

  return c.json({ success: true, message: "Campaign queued for sending" });
});
