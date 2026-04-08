import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
import { errorHandler } from "./middleware/error.js";
import { authMiddleware } from "./middleware/auth.js";
import { workspaceMiddleware } from "./middleware/workspace.js";
import { healthRoutes } from "./routes/health.js";
import { contactRoutes } from "./routes/contacts.js";
import { segmentRoutes } from "./routes/segments.js";
import { tagRoutes } from "./routes/tags.js";
import { campaignRoutes } from "./routes/campaigns.js";
import { templateRoutes } from "./routes/templates.js";
import { formRoutes } from "./routes/forms.js";
import { trackingRoutes } from "./routes/tracking.js";
import { automationRoutes } from "./routes/automations.js";
import { whitelistRoutes } from "./routes/whitelist.js";

const app = new Hono();

// ------------------------------------------------------------------
// Global middleware
// ------------------------------------------------------------------
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim())
  : ["*"];

app.use(
  "*",
  cors({
    origin: corsOrigins.length === 1 && corsOrigins[0] === "*"
      ? "*"
      : corsOrigins,
    credentials: true,
  }),
);
app.use("*", logger());
app.onError(errorHandler);

// ------------------------------------------------------------------
// Public routes (no auth, no workspace)
// ------------------------------------------------------------------
app.route("/api/health", healthRoutes);
app.route("/api/tracking", trackingRoutes);

// Forms have mixed auth: CRUD is protected, but /:id/submit is public.
// The formRoutes file applies auth+workspace per-handler where needed.
app.route("/api/forms", formRoutes);

// ------------------------------------------------------------------
// Protected routes (auth + workspace middleware applied globally)
// ------------------------------------------------------------------
const protectedApp = new Hono();
protectedApp.use("*", authMiddleware);
protectedApp.use("*", workspaceMiddleware);

protectedApp.route("/contacts", contactRoutes);
protectedApp.route("/segments", segmentRoutes);
protectedApp.route("/tags", tagRoutes);
protectedApp.route("/campaigns", campaignRoutes);
protectedApp.route("/templates", templateRoutes);
protectedApp.route("/automations", automationRoutes);
protectedApp.route("/whitelist", whitelistRoutes);

app.route("/api", protectedApp);

// ------------------------------------------------------------------
// Start server
// ------------------------------------------------------------------
const port = Number(process.env.PORT) || 4170;

console.log(`OpenMailer Marketing API starting on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});

export default app;
