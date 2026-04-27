import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { PipelineEngine, defaultRegistry, STLConverter, OBJConverter } from '@mw/open3d-converter';
import { createQueueFromEnv, type QueueBackend } from '@opensoftware/queue';
import { createPublisher, nullPublisher, type Publisher } from '@opensoftware/openpipeline-client';

const PORT = Number(process.env.PORT) || 4182;
const OPEN3D_API_URL = process.env.OPEN3D_API_URL || 'http://localhost:4173';
const OPENPIPELINE_URL = process.env.OPENPIPELINE_URL;

// Register built-in converters (legacy @mw pipeline — unchanged)
defaultRegistry.registerConverter(new STLConverter());
defaultRegistry.registerConverter(new OBJConverter());
const engine = new PipelineEngine(defaultRegistry);

// Stats for /api/health
let jobsProcessed = 0;
let jobsFailed = 0;
let lastJobAt: string | null = null;

let queue: QueueBackend | null = null;
const publisher: Publisher = OPENPIPELINE_URL
  ? createPublisher({ baseUrl: OPENPIPELINE_URL, apiKey: process.env.OPENSOFTWARE_API_KEY })
  : nullPublisher;

/**
 * Every LRP capability the worker can process. The API-side registers the
 * same kinds; if REDIS_URL is set, multiple workers can run side-by-side and
 * BullMQ distributes jobs across them. In memory mode this list is just for
 * documentation / preflight — the API's in-process queue already picks jobs
 * up without us.
 */
const HANDLED_CAPABILITIES = [
  'convert-mesh',
  'convert-cad',
  'analyze-mesh',
  'generate-heightmap',
  'photogrammetry-reconstruct',
  'cam-toolpath',
  'fea-stress-analysis',
  'train-gaussian-splat',
  'image-to-3d',
  'text-to-3d',
  'train-nerf',
  'apple-photogrammetry',
  'reality-composer',
  'vld4-import',
  'drawing-to-3d',
];

async function invokeLrpViaApi(capability: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await fetch(`${OPEN3D_API_URL}/api/lrp/${capability}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(600_000),
  });
  if (!res.ok) {
    throw new Error(`LRP ${capability} failed (${res.status}): ${await res.text().catch(() => '')}`);
  }
  return (await res.json()) as Record<string, unknown>;
}

async function startQueue(): Promise<void> {
  queue = await createQueueFromEnv({ prefix: 'open3d' });
  console.log(`Open3D Worker queue backend: ${queue.id}`);

  for (const capability of HANDLED_CAPABILITIES) {
    queue.register(capability, async (j) => {
      const startedAt = new Date().toISOString();
      try {
        const result = await invokeLrpViaApi(capability, j.input);
        jobsProcessed++;
        lastJobAt = new Date().toISOString();
        await publisher.emit({
          type: 'job.completed',
          eventId: randomUUID(),
          occurredAt: lastJobAt,
          source: 'open3d-worker',
          workspaceId: j.workspaceId,
          correlationId: j.correlationId ?? undefined,
          payload: {
            id: j.id,
            workspaceId: j.workspaceId,
            kind: capability,
            status: 'completed',
            progress: 1,
            input: j.input,
            result,
            error: null,
            startedAt,
            finishedAt: lastJobAt,
            createdAt: startedAt,
          },
        });
        return result;
      } catch (err) {
        jobsFailed++;
        lastJobAt = new Date().toISOString();
        const message = err instanceof Error ? err.message : String(err);
        await publisher.emit({
          type: 'job.failed',
          eventId: randomUUID(),
          occurredAt: lastJobAt,
          source: 'open3d-worker',
          workspaceId: j.workspaceId,
          correlationId: j.correlationId ?? undefined,
          payload: {
            id: j.id,
            workspaceId: j.workspaceId,
            kind: capability,
            status: 'failed',
            progress: null,
            input: j.input,
            result: null,
            error: message,
            startedAt,
            finishedAt: lastJobAt,
            createdAt: startedAt,
          },
        });
        throw err;
      }
    }, { concurrency: Number(process.env.OPEN3D_WORKER_CONCURRENCY) || 1 });
  }
}

// ── HTTP surface ────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  if (!req.url) return notFound(res);
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'GET' && url.pathname === '/api/health') {
    return json(res, {
      status: 'ok',
      app: 'open3d-worker',
      converters: defaultRegistry.listConverters().map((c) => c.name),
      queue: queue?.id ?? 'unavailable',
      jobsProcessed,
      jobsFailed,
      lastJobAt,
      capabilities: HANDLED_CAPABILITIES,
      timestamp: new Date().toISOString(),
    });
  }

  if (req.method === 'GET' && url.pathname === '/api/appstore/manifest') {
    return json(res, {
      service: 'open3d-worker',
      version: '0.2.0',
      sidebar: null,
      dashboards: [],
      widgets: [
        {
          id: 'open3d-worker-status',
          mode: 'local',
          dataFetch: '/api/health',
          size: '1x1',
          title: 'Open3D Worker',
        },
      ],
      injections: [],
    });
  }

  return notFound(res);
});

function json(res: http.ServerResponse, payload: unknown, status = 200): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function notFound(res: http.ServerResponse): void {
  json(res, { error: 'Not found' }, 404);
}

server.listen(PORT, '0.0.0.0', async () => {
  console.log(`Open3D Worker HTTP on port ${PORT}`);
  console.log(`Registered converters: ${defaultRegistry.listConverters().map((c) => c.name).join(', ')}`);
  try {
    await startQueue();
    console.log(`Worker registered ${HANDLED_CAPABILITIES.length} LRP kinds (forwarding to ${OPEN3D_API_URL}).`);
  } catch (err) {
    console.error('queue init failed:', err);
  }
});

process.on('SIGTERM', async () => { await queue?.close(); server.close(() => process.exit(0)); });
process.on('SIGINT',  async () => { await queue?.close(); server.close(() => process.exit(0)); });

void engine;
