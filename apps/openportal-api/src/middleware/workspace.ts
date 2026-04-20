import { createMiddleware } from "hono/factory";

export const workspaceMiddleware = createMiddleware<{
  Variables: { workspaceId: string };
}>(async (c, next) => {
  const workspaceId = c.req.header("X-Workspace-ID");
  if (!workspaceId) {
    return c.json({ error: "X-Workspace-ID header required" }, 400);
  }
  c.set("workspaceId", workspaceId);
  await next();
});
