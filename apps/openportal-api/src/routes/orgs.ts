import { Hono } from "hono";
import { createOrgSchema, updateOrgSchema } from "@opensoftware/openportal-core";
import { getAdapter } from "../adapter.js";
import { requireParam } from "../lib/req.js";

type Vars = { workspaceId: string; user: { id: string } };

export const orgRoutes = new Hono<{ Variables: Vars }>();

orgRoutes.get("/", async (c) => {
  const adapter = getAdapter(c.get("workspaceId"), c.get("user").id);
  return c.json(await adapter.orgs.list());
});

orgRoutes.get("/:id", async (c) => {
  const adapter = getAdapter(c.get("workspaceId"), c.get("user").id);
  const org = await adapter.orgs.get(requireParam(c, "id"));
  if (!org) return c.json({ error: "Not found" }, 404);
  return c.json(org);
});

orgRoutes.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = createOrgSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.format() }, 400);
  const adapter = getAdapter(c.get("workspaceId"), c.get("user").id);
  return c.json(await adapter.orgs.create(parsed.data), 201);
});

orgRoutes.patch("/:id", async (c) => {
  const body = await c.req.json();
  const parsed = updateOrgSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.format() }, 400);
  const adapter = getAdapter(c.get("workspaceId"), c.get("user").id);
  return c.json(await adapter.orgs.update(requireParam(c, "id"), parsed.data));
});

orgRoutes.delete("/:id", async (c) => {
  const adapter = getAdapter(c.get("workspaceId"), c.get("user").id);
  await adapter.orgs.remove(requireParam(c, "id"));
  return c.body(null, 204);
});
