import { Hono } from "hono";
import { updateMemberRoleSchema } from "@opensoftware/openportal-core";
import { getAdapter } from "../adapter.js";
import { requireParam } from "../lib/req.js";

type Vars = { workspaceId: string; user: { id: string } };

export const memberRoutes = new Hono<{ Variables: Vars }>();

memberRoutes.get("/", async (c) => {
  const orgId = requireParam(c, "orgId");
  const adapter = getAdapter(c.get("workspaceId"), c.get("user").id);
  return c.json(await adapter.members.list(orgId));
});

memberRoutes.patch("/:memberId", async (c) => {
  const body = await c.req.json();
  const parsed = updateMemberRoleSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.format() }, 400);
  const adapter = getAdapter(c.get("workspaceId"), c.get("user").id);
  return c.json(
    await adapter.members.updateRole(
      requireParam(c, "orgId"),
      requireParam(c, "memberId"),
      parsed.data.role,
    ),
  );
});

memberRoutes.delete("/:memberId", async (c) => {
  const adapter = getAdapter(c.get("workspaceId"), c.get("user").id);
  await adapter.members.remove(
    requireParam(c, "orgId"),
    requireParam(c, "memberId"),
  );
  return c.body(null, 204);
});
