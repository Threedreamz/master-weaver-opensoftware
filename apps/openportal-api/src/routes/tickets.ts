import { Hono } from "hono";
import {
  createTicketSchema,
  updateTicketSchema,
  type TicketStatus,
} from "@opensoftware/openportal-core";
import { getAdapter } from "../adapter.js";
import { requireParam } from "../lib/req.js";

type Vars = { workspaceId: string; user: { id: string } };

export const ticketRoutes = new Hono<{ Variables: Vars }>();

ticketRoutes.get("/", async (c) => {
  const statusFilter = c.req.query("status") as TicketStatus | undefined;
  const limit = Number(c.req.query("limit")) || 100;
  const adapter = getAdapter(c.get("workspaceId"), c.get("user").id);
  return c.json(
    await adapter.tickets.list(requireParam(c, "orgId"), { status: statusFilter, limit }),
  );
});

ticketRoutes.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = createTicketSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.format() }, 400);
  const adapter = getAdapter(c.get("workspaceId"), c.get("user").id);
  return c.json(
    await adapter.tickets.create(requireParam(c, "orgId"), parsed.data),
    201,
  );
});

ticketRoutes.get("/:ticketId", async (c) => {
  const adapter = getAdapter(c.get("workspaceId"), c.get("user").id);
  const ticket = await adapter.tickets.get(requireParam(c, "ticketId"));
  if (!ticket) return c.json({ error: "Not found" }, 404);
  return c.json(ticket);
});

ticketRoutes.patch("/:ticketId", async (c) => {
  const body = await c.req.json();
  const parsed = updateTicketSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.format() }, 400);
  const adapter = getAdapter(c.get("workspaceId"), c.get("user").id);
  return c.json(
    await adapter.tickets.update(requireParam(c, "ticketId"), parsed.data),
  );
});

// Flat ticket-detail routes (no org scope) — used by the remote client adapter
// where the caller doesn't know the orgId up-front. Tickets are still
// workspace-scoped via the workspace middleware.
export const ticketDetailRoutes = new Hono<{ Variables: Vars }>();

ticketDetailRoutes.get("/", async (c) => {
  const externalRef = c.req.query("externalRef");
  if (!externalRef) return c.json({ error: "externalRef query required" }, 400);
  const adapter = getAdapter(c.get("workspaceId"), c.get("user").id);
  return c.json(await adapter.tickets.listByExternalRef(externalRef));
});

ticketDetailRoutes.get("/:ticketId", async (c) => {
  const adapter = getAdapter(c.get("workspaceId"), c.get("user").id);
  const ticket = await adapter.tickets.get(requireParam(c, "ticketId"));
  if (!ticket) return c.json({ error: "Not found" }, 404);
  return c.json(ticket);
});

ticketDetailRoutes.patch("/:ticketId", async (c) => {
  const body = await c.req.json();
  const parsed = updateTicketSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.format() }, 400);
  const adapter = getAdapter(c.get("workspaceId"), c.get("user").id);
  return c.json(
    await adapter.tickets.update(requireParam(c, "ticketId"), parsed.data),
  );
});
