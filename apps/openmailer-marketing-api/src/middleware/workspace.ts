import { createMiddleware } from "hono/factory";
import { db } from "@opensoftware/openmailer-db";
import { workspaces } from "@opensoftware/openmailer-db/schema";
import { eq } from "drizzle-orm";

export const workspaceMiddleware = createMiddleware<{
  Variables: { workspaceId: string };
}>(async (c, next) => {
  const workspaceId = c.req.header("X-Workspace-ID");
  if (!workspaceId) {
    return c.json({ error: "X-Workspace-ID header required" }, 400);
  }

  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, workspaceId),
  });

  if (!workspace) {
    return c.json({ error: "Workspace not found" }, 404);
  }

  c.set("workspaceId", workspaceId);
  await next();
});
