import { Hono, type Context } from "hono";
import { serve } from "@hono/node-server";
import { Worker, type Job } from "bullmq";
import { Redis } from "ioredis";
import { processOcr, type OcrJobData } from "./jobs/ocr.js";
import { processClassify, type ClassifyJobData } from "./jobs/classify.js";

// --- Configuration ----------------------------------------------------------

const PORT = parseInt(process.env.PORT ?? "4169", 10);
const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

const QUEUES = {
  OCR: "openpostbox.ocr",
  CLASSIFY: "openpostbox.classify",
} as const;

// --- Redis / BullMQ ---------------------------------------------------------

const connection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

connection.on("error", (err: Error) => {
  console.error("[redis] error:", err.message);
});

// --- Workers ----------------------------------------------------------------

console.log("[openpostbox-worker] starting workers...");

const ocrWorker = new Worker<OcrJobData>(
  QUEUES.OCR,
  async (job: Job<OcrJobData>) => processOcr(job.data),
  { connection, concurrency: 2 },
);

const classifyWorker = new Worker<ClassifyJobData>(
  QUEUES.CLASSIFY,
  async (job: Job<ClassifyJobData>) => processClassify(job.data),
  { connection, concurrency: 4 },
);

for (const [name, w] of [
  ["ocr", ocrWorker],
  ["classify", classifyWorker],
] as const) {
  w.on("completed", (job) => console.log(`[${name}] ✓ ${job.id}`));
  w.on("failed", (job, err) => console.error(`[${name}] ✗ ${job?.id}: ${err.message}`));
}

// --- Health server ----------------------------------------------------------

const app = new Hono();

app.get("/api/health", (c: Context) =>
  c.json({
    status: "ok",
    app: "openpostbox-worker",
    timestamp: new Date().toISOString(),
    queues: {
      ocr: ocrWorker.isRunning(),
      classify: classifyWorker.isRunning(),
    },
  }),
);

app.get("/health", (c) => c.redirect("/api/health"));

serve({ fetch: app.fetch, port: PORT, hostname: "0.0.0.0" }, (info) => {
  console.log(`[openpostbox-worker] health server listening on :${info.port}`);
});

// --- Graceful shutdown ------------------------------------------------------

async function shutdown(signal: string) {
  console.log(`[openpostbox-worker] received ${signal}, shutting down...`);
  await Promise.allSettled([ocrWorker.close(), classifyWorker.close()]);
  await connection.quit();
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
