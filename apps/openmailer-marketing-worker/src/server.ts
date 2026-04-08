import { Worker } from "bullmq";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { redisConnection, QUEUE_NAMES } from "@opensoftware/openmailer-queue";
import { processSendCampaign } from "./jobs/send-campaign.js";
import { processImportContacts } from "./jobs/import-contacts.js";
import { processEvaluateSegments } from "./jobs/evaluate-segments.js";
import { processAutomation } from "./jobs/process-automation.js";
import { clearTransportCache } from "./services/email-sender.js";

// --- Configuration -----------------------------------------------------------

const PORT = parseInt(process.env.PORT || "4171", 10);

// --- BullMQ Workers ----------------------------------------------------------

console.log("Starting OpenMailer Marketing workers...");

const campaignWorker = new Worker(
  QUEUE_NAMES.CAMPAIGN,
  processSendCampaign,
  {
    connection: redisConnection,
    concurrency: 5,
  }
);

const importWorker = new Worker(
  QUEUE_NAMES.IMPORT,
  processImportContacts,
  {
    connection: redisConnection,
    concurrency: 2,
  }
);

const automationWorker = new Worker(
  QUEUE_NAMES.AUTOMATION,
  processAutomation,
  {
    connection: redisConnection,
    concurrency: 3,
  }
);

// Segment evaluation uses a dedicated queue name not in the original source,
// so we define it here. It can be added to QUEUE_NAMES later.
const SEGMENT_QUEUE = "segment-evaluation";

const segmentWorker = new Worker(
  SEGMENT_QUEUE,
  processEvaluateSegments,
  {
    connection: redisConnection,
    concurrency: 2,
  }
);

// --- Worker Event Handlers ---------------------------------------------------

const workers = [
  { name: "campaign", worker: campaignWorker },
  { name: "import", worker: importWorker },
  { name: "automation", worker: automationWorker },
  { name: "segment", worker: segmentWorker },
];

for (const { name, worker } of workers) {
  worker.on("completed", (job) => {
    console.log(`[${name}] Job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[${name}] Job ${job?.id} failed:`, err.message);
  });

  worker.on("error", (err) => {
    console.error(`[${name}] Worker error:`, err.message);
  });
}

// --- Hono Health Check Server ------------------------------------------------

const app = new Hono();

app.get("/health", (c) => {
  const status = {
    status: "ok",
    service: "openmailer-marketing-worker",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    workers: workers.map(({ name, worker }) => ({
      name,
      running: worker.isRunning(),
    })),
  };
  return c.json(status);
});

app.get("/", (c) => {
  return c.json({
    service: "openmailer-marketing-worker",
    version: "1.0.0",
    endpoints: ["/health"],
  });
});

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`Health check server running on port ${info.port}`);
});

console.log("All workers started successfully");

// --- Graceful Shutdown -------------------------------------------------------

async function shutdown() {
  console.log("Shutting down workers...");

  // Close all workers gracefully (waits for current jobs to finish)
  await Promise.allSettled(
    workers.map(({ name, worker }) =>
      worker.close().then(() => console.log(`[${name}] Worker closed`))
    )
  );

  // Clear transport cache to close SMTP connections
  clearTransportCache();

  console.log("All workers shut down");
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
