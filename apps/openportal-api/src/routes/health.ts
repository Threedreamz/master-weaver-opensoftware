import { Hono } from "hono";

export const healthRoutes = new Hono();

healthRoutes.get("/", (c) =>
  c.json({
    status: "ok",
    service: "openportal-api",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  }),
);
