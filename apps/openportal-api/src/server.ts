import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
import { errorHandler } from "./middleware/error.js";
import { authMiddleware } from "./middleware/auth.js";
import { workspaceMiddleware } from "./middleware/workspace.js";
import { healthRoutes } from "./routes/health.js";
import { appstoreManifestRoutes } from "./routes/appstore-manifest.js";
import { orgRoutes } from "./routes/orgs.js";
import { memberRoutes } from "./routes/members.js";
import { invitationRoutes } from "./routes/invitations.js";
import { channelRoutes, messageRoutes } from "./routes/channels.js";
import { meetingRoutes, meetingDetailRoutes } from "./routes/meetings.js";
import { auditRoutes } from "./routes/audit.js";
import { gdprRoutes } from "./routes/gdpr.js";

const app = new Hono();

const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim())
  : ["*"];

app.use(
  "*",
  cors({
    origin:
      corsOrigins.length === 1 && corsOrigins[0] === "*" ? "*" : corsOrigins,
    credentials: true,
  }),
);
app.use("*", logger());
app.onError(errorHandler);

// ---- Public routes ----
app.route("/api/health", healthRoutes);
app.route("/api/appstore/manifest", appstoreManifestRoutes);

// ---- Protected routes (auth + workspace) ----
const protectedApp = new Hono();
protectedApp.use("*", authMiddleware);
protectedApp.use("*", workspaceMiddleware);

protectedApp.route("/orgs", orgRoutes);
protectedApp.route("/orgs/:orgId/members", memberRoutes);
protectedApp.route("/orgs/:orgId/invitations", invitationRoutes);
protectedApp.route("/orgs/:orgId/channels", channelRoutes);
protectedApp.route("/orgs/:orgId/meetings", meetingRoutes);
protectedApp.route("/orgs/:orgId/audit", auditRoutes);
protectedApp.route("/orgs/:orgId/gdpr", gdprRoutes);
protectedApp.route("/channels/:channelId/messages", messageRoutes);
protectedApp.route("/meetings/:meetingId", meetingDetailRoutes);

app.route("/api", protectedApp);

const port = Number(process.env.PORT) || 4179;

console.log(`OpenPortal API starting on port ${port}`);

serve({ fetch: app.fetch, port });

export default app;
