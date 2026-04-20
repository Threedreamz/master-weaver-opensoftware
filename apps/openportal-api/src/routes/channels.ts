import { Hono } from "hono";
import {
  createChannelSchema,
  postMessageSchema,
} from "@opensoftware/openportal-core";
import { getAdapter } from "../adapter.js";
import { requireParam } from "../lib/req.js";

type Vars = { workspaceId: string; user: { id: string } };

export const channelRoutes = new Hono<{ Variables: Vars }>();

channelRoutes.get("/", async (c) => {
  const adapter = getAdapter(c.get("workspaceId"), c.get("user").id);
  return c.json(await adapter.channels.list(requireParam(c, "orgId")));
});

channelRoutes.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = createChannelSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.format() }, 400);
  const adapter = getAdapter(c.get("workspaceId"), c.get("user").id);
  return c.json(
    await adapter.channels.create(requireParam(c, "orgId"), parsed.data),
    201,
  );
});

channelRoutes.delete("/:channelId", async (c) => {
  const adapter = getAdapter(c.get("workspaceId"), c.get("user").id);
  await adapter.channels.remove(
    requireParam(c, "orgId"),
    requireParam(c, "channelId"),
  );
  return c.body(null, 204);
});

export const messageRoutes = new Hono<{ Variables: Vars }>();

messageRoutes.get("/", async (c) => {
  const adapter = getAdapter(c.get("workspaceId"), c.get("user").id);
  const limit = Number(c.req.query("limit")) || 50;
  const beforeRaw = c.req.query("before");
  const before = beforeRaw ? new Date(beforeRaw) : undefined;
  return c.json(
    await adapter.messages.list(requireParam(c, "channelId"), { limit, before }),
  );
});

messageRoutes.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = postMessageSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.format() }, 400);
  const adapter = getAdapter(c.get("workspaceId"), c.get("user").id);
  return c.json(
    await adapter.messages.post(requireParam(c, "channelId"), parsed.data.body),
    201,
  );
});
