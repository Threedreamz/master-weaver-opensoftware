import { Hono } from "hono";
import { inviteMemberSchema } from "@opensoftware/openportal-core";
import { getAdapter } from "../adapter.js";
import { requireParam } from "../lib/req.js";

type Vars = { workspaceId: string; user: { id: string } };

export const invitationRoutes = new Hono<{ Variables: Vars }>();

invitationRoutes.get("/", async (c) => {
  const adapter = getAdapter(c.get("workspaceId"), c.get("user").id);
  return c.json(await adapter.invitations.list(requireParam(c, "orgId")));
});

invitationRoutes.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = inviteMemberSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.format() }, 400);
  const adapter = getAdapter(c.get("workspaceId"), c.get("user").id);
  return c.json(
    await adapter.invitations.create(requireParam(c, "orgId"), parsed.data),
    201,
  );
});

invitationRoutes.delete("/:invitationId", async (c) => {
  const adapter = getAdapter(c.get("workspaceId"), c.get("user").id);
  await adapter.invitations.revoke(
    requireParam(c, "orgId"),
    requireParam(c, "invitationId"),
  );
  return c.body(null, 204);
});
