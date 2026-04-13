import { Hono } from "hono";
import { db } from "@opensoftware/openmailer-db";
import { campaignEvents, contacts } from "@opensoftware/openmailer-db/schema";
import { eq } from "drizzle-orm";

export const trackingRoutes = new Hono();

// 1x1 transparent GIF pixel
const TRACKING_PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

// GET /api/tracking/t/o/:eventId -- open tracking pixel
trackingRoutes.get("/t/o/:eventId", async (c) => {
  const eventId = c.req.param("eventId")!;

  try {
    // Record open event
    await db
      .update(campaignEvents)
      .set({ type: "open", createdAt: new Date() })
      .where(eq(campaignEvents.id, eventId));
  } catch {
    // Silently fail -- don't break the pixel response
  }

  c.header("Content-Type", "image/gif");
  c.header(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate",
  );
  c.header("Pragma", "no-cache");
  c.header("Expires", "0");
  return c.body(TRACKING_PIXEL);
});

// GET /api/tracking/t/c/:eventId -- click tracking
trackingRoutes.get("/t/c/:eventId", async (c) => {
  const eventId = c.req.param("eventId")!;

  let redirectUrl = process.env.APP_URL || "/";

  try {
    // Look up the event to get the target URL
    const [event] = await db
      .select()
      .from(campaignEvents)
      .where(eq(campaignEvents.id, eventId))
      .limit(1);

    if (
      event?.metadata &&
      typeof event.metadata === "object" &&
      "url" in (event.metadata as Record<string, unknown>)
    ) {
      redirectUrl = (event.metadata as Record<string, unknown>).url as string;
    }

    // Record click event
    await db
      .update(campaignEvents)
      .set({ type: "click", createdAt: new Date() })
      .where(eq(campaignEvents.id, eventId));
  } catch {
    // Silently fail -- still redirect
  }

  return c.redirect(redirectUrl, 302);
});

// GET /api/tracking/unsubscribe/:contactId/:campaignId
trackingRoutes.get(
  "/unsubscribe/:contactId/:campaignId",
  async (c) => {
    const contactId = c.req.param("contactId")!;
    const campaignId = c.req.param("campaignId")!;

    try {
      // Set contact status to unsubscribed
      await db
        .update(contacts)
        .set({
          status: "unsubscribed",
          updatedAt: new Date(),
        })
        .where(eq(contacts.id, contactId));

      // Record unsubscribe event
      await db.insert(campaignEvents).values({
        campaignId,
        contactId,
        type: "unsubscribe",
      });
    } catch {
      // Silently fail
    }

    return c.html(`
    <!DOCTYPE html>
    <html>
      <head><title>Unsubscribed</title></head>
      <body style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h1>You have been unsubscribed</h1>
        <p>You will no longer receive emails from this sender.</p>
      </body>
    </html>
  `);
  },
);
