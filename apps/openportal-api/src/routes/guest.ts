import { Hono } from "hono";
import { and, eq, isNull } from "drizzle-orm";
import { guestAuthMiddleware, type GuestClaims } from "../middleware/auth.js";
import { getDb, tickets, guestSessions, meetings } from "@opensoftware/openportal-db";

type Vars = { guest: GuestClaims };

export const guestRoutes = new Hono<{ Variables: Vars }>();

guestRoutes.use("*", guestAuthMiddleware);

guestRoutes.get("/my-orders", async (c) => {
  const guest = c.get("guest");
  const db = getDb();
  const rows = await db
    .select()
    .from(tickets)
    .where(eq(tickets.externalRef, guest.orderId));
  return c.json(rows);
});

guestRoutes.post("/join-call", async (c) => {
  const guest = c.get("guest");
  const db = getDb();

  // Persist / refresh guest session
  const expiresAt = new Date(Date.now() + 86_400_000);
  const existing = await db.query.guestSessions.findFirst({
    where: eq(guestSessions.guestToken, guest.sub),
  });
  if (existing) {
    await db
      .update(guestSessions)
      .set({ expiresAt })
      .where(eq(guestSessions.id, existing.id));
  } else {
    await db.insert(guestSessions).values({
      guestToken: guest.sub,
      orderId: guest.orderId,
      guestEmail: guest.email ?? null,
      expiresAt,
    });
  }

  // Resolve orgId from the ticket for this order
  const ticket = await db.query.tickets.findFirst({
    where: eq(tickets.externalRef, guest.orderId),
  });

  const activeMeeting = ticket
    ? await db.query.meetings.findFirst({
        where: and(eq(meetings.orgId, ticket.orgId), isNull(meetings.endedAt)),
      })
    : null;

  const jitsiBase = process.env.JITSI_BASE_URL ?? "https://meet.jit.si";
  const safeOrderId = guest.orderId.replace(/[^a-zA-Z0-9-]/g, "-");
  const roomName = activeMeeting
    ? `openportal-${activeMeeting.id}`
    : `openportal-order-${safeOrderId}`;

  if (activeMeeting) {
    await db
      .update(guestSessions)
      .set({ joinedCallId: activeMeeting.id })
      .where(eq(guestSessions.guestToken, guest.sub));
  }

  return c.json({
    callUrl: `${jitsiBase}/${roomName}`,
    roomName,
    meetingId: activeMeeting?.id ?? null,
    orderId: guest.orderId,
  });
});

guestRoutes.get("/tickets/:ticketId", async (c) => {
  const guest = c.get("guest");
  const ticketId = c.req.param("ticketId");
  const db = getDb();
  const ticket = await db.query.tickets.findFirst({
    where: and(eq(tickets.id, ticketId), eq(tickets.externalRef, guest.orderId)),
  });
  if (!ticket) return c.json({ error: "Not found" }, 404);
  return c.json(ticket);
});
