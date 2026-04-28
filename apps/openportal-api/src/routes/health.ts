import { Hono } from "hono";
import { sql } from "drizzle-orm";
import { getDb } from "@opensoftware/openportal-db";

export const healthRoutes = new Hono();

healthRoutes.get("/", async (c) => {
  const deps: Record<string, "ok" | "error"> = {};

  try {
    const db = getDb();
    await db.execute(sql`SELECT 1`);
    deps.db = "ok";
  } catch {
    deps.db = "error";
  }

  const status = Object.values(deps).every((v) => v === "ok") ? "ok" : "degraded";

  return c.json({
    status,
    service: "openportal-api",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    deps,
  });
});
