import { Hono } from "hono";
import { startMeetingSchema } from "@opensoftware/openportal-core";
import { getAdapter } from "../adapter.js";
import { requireParam } from "../lib/req.js";

type Vars = { workspaceId: string; user: { id: string } };

export const meetingRoutes = new Hono<{ Variables: Vars }>();

meetingRoutes.get("/", async (c) => {
  const adapter = getAdapter(c.get("workspaceId"), c.get("user").id);
  return c.json(await adapter.meetings.list(requireParam(c, "orgId")));
});

meetingRoutes.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = startMeetingSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.format() }, 400);
  const adapter = getAdapter(c.get("workspaceId"), c.get("user").id);
  return c.json(
    await adapter.meetings.start(requireParam(c, "orgId"), parsed.data.title),
    201,
  );
});

export const meetingDetailRoutes = new Hono<{ Variables: Vars }>();

meetingDetailRoutes.post("/stop", async (c) => {
  const adapter = getAdapter(c.get("workspaceId"), c.get("user").id);
  return c.json(await adapter.meetings.stop(requireParam(c, "meetingId")));
});

meetingDetailRoutes.post("/recording", async (c) => {
  const body = (await c.req.json()) as { url?: string };
  if (!body.url) return c.json({ error: "url required" }, 400);
  const adapter = getAdapter(c.get("workspaceId"), c.get("user").id);
  return c.json(
    await adapter.meetings.attachRecording(
      requireParam(c, "meetingId"),
      body.url,
    ),
  );
});
