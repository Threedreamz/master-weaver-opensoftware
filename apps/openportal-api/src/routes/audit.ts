import { Hono } from "hono";
import { getAdapter } from "../adapter.js";
import { requireParam } from "../lib/req.js";

type Vars = { workspaceId: string; user: { id: string } };

export const auditRoutes = new Hono<{ Variables: Vars }>();

auditRoutes.get("/", async (c) => {
  const adapter = getAdapter(c.get("workspaceId"), c.get("user").id);
  const limit = Number(c.req.query("limit")) || 100;
  return c.json(
    await adapter.audit.list(requireParam(c, "orgId"), { limit }),
  );
});
