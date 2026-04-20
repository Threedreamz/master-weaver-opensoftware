import { Worker } from "bullmq";
import { Redis } from "ioredis";
import { Hono, type Context } from "hono";
import { serve } from "@hono/node-server";
import { processMeeting } from "./jobs/process-meeting.js";

const PORT = Number(process.env.PORT) || 4180;
const MEETING_QUEUE = "openportal.meeting";

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });

console.log("Starting OpenPortal worker...");

const meetingWorker = new Worker(MEETING_QUEUE, processMeeting, {
  connection,
  concurrency: 2,
});

const workers = [{ name: "meeting", worker: meetingWorker }];

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

const app = new Hono();

const healthHandler = (c: Context) =>
  c.json({
    status: "ok",
    service: "openportal-worker",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    workers: workers.map(({ name, worker }) => ({
      name,
      running: worker.isRunning(),
    })),
  });

app.get("/health", healthHandler);
app.get("/api/health", healthHandler);

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`OpenPortal worker health endpoint on port ${info.port}`);
});

async function shutdown() {
  console.log("Shutting down OpenPortal worker...");
  await Promise.allSettled(workers.map(({ worker }) => worker.close()));
  await connection.quit();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
