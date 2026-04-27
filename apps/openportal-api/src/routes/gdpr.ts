import { Hono } from "hono";

type Vars = { workspaceId: string; user: { id: string } };

export const gdprRoutes = new Hono<{ Variables: Vars }>();

gdprRoutes.post("/", async (c) => {
  // Kickoff a GDPR export — actual export is async.
  // For MVP this is a placeholder that marks the request; a worker job will build the zip.
  return c.json(
    {
      status: "queued",
      message: "GDPR export requested. Check status via /api/orgs/:orgId/gdpr/:id.",
    },
    202,
  );
});

gdprRoutes.get("/:id", async (c) => {
  return c.json({ status: "pending", downloadUrl: null });
});
