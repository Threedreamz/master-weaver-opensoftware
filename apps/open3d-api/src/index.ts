import express from 'express';
import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createQueueFromEnv } from '@opensoftware/queue';
import type { QueueBackend } from '@opensoftware/queue';
import { LRPManager } from './lrp-manager.js';

const app = express();
const PORT = Number(process.env.PORT) || 4173;
const lrp = new LRPManager();

// Shared job queue. Memory backend by default; BullMQ if REDIS_URL is set.
// The worker (apps/open3d-worker) consumes from the same queue.
let queue: QueueBackend;

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// CORS for local development
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (_req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Health
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    app: 'open3d-render-server',
    lrp: lrp.isRunning() ? 'running' : 'stopped',
    capabilities: lrp.getCapabilities().length,
    timestamp: new Date().toISOString(),
  });
});

// Capabilities discovery
app.get('/api/lrp/capabilities', (_req, res) => {
  res.json({ capabilities: lrp.getCapabilities() });
});

// AppStore Manifest — Open3D API (backend-only service, no UI dashboards).
// Surfaces a "capabilities online" KPI tile so the consuming admin can show
// "N LRP handlers available" without poking the LRP itself.
app.get('/api/appstore/manifest', (_req, res) => {
  res.json({
    service: 'open3d-api',
    version: '1.0.0',
    sidebar: null,
    dashboards: [],
    widgets: [
      {
        id: 'open3d-capabilities-count',
        mode: 'local',
        dataFetch: '/api/lrp/capabilities',
        size: '1x1',
        title: 'Open3D LRP capabilities',
      },
      {
        id: 'open3d-api-health',
        mode: 'local',
        dataFetch: '/api/health',
        size: '1x1',
        title: 'Open3D API status',
      },
    ],
    injections: [],
  });
});

// Universal LRP invoke (synchronous — blocks until the handler returns).
// For long-running capabilities (nerf, gaussian splat, photogrammetry) use
// the /async variant below and poll /api/jobs/:id for status instead.
app.post('/api/lrp/:capability', async (req, res) => {
  try {
    const { capability } = req.params;
    const timeout = Number(req.query.timeout) || 120000;
    const result = await lrp.invoke(capability, req.body, timeout);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// ── Async job queue ────────────────────────────────────────────────────────
// POST /api/lrp/:capability/async  body = LRP input
//   → enqueues a job; returns { jobId, status: 'queued' }.
//   Worker (apps/open3d-worker) picks it up, runs lrp.invoke, stores result.
// GET /api/jobs/:id                 → CanonicalJob (status/progress/result/error).
// GET /api/jobs                     → recent jobs; ?kind= + ?status= + ?limit=.
// DELETE /api/jobs/:id              → cancel a queued or running job.
app.post('/api/lrp/:capability/async', async (req, res) => {
  try {
    const { capability } = req.params;
    if (!queue) {
      return res.status(503).json({ error: 'queue backend not ready' });
    }
    const job = await queue.enqueue(capability, {
      kind: capability,
      workspaceId: (req.header('x-workspace-id') ?? null) || null,
      input: req.body ?? {},
      correlationId: req.header('x-correlation-id') ?? undefined,
    });
    res.status(202).json(job);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.get('/api/jobs/:id', async (req, res) => {
  try {
    if (!queue) return res.status(503).json({ error: 'queue backend not ready' });
    const job = await queue.get(req.params.id);
    if (!job) return res.status(404).json({ error: 'job not found' });
    res.json(job);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.get('/api/jobs', async (req, res) => {
  try {
    if (!queue) return res.status(503).json({ error: 'queue backend not ready' });
    const jobs = await queue.list({
      kind: typeof req.query.kind === 'string' ? req.query.kind : undefined,
      status: typeof req.query.status === 'string' ? req.query.status as 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });
    res.json({ jobs });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.delete('/api/jobs/:id', async (req, res) => {
  try {
    if (!queue) return res.status(503).json({ error: 'queue backend not ready' });
    await queue.cancel(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Convenience: Format list
app.get('/api/formats', (_req, res) => {
  res.json({
    supported: ['stl', 'obj', 'gltf', 'glb', '3mf', 'ply', 'step', 'iges', 'f3d', 'fbx', 'dae', 'scad', 'svg', 'dxf'],
    converters: ['stl', 'obj', 'ply', 'dxf', 'svg', 'fusion', 'gltf-optimizer', 'blender'],
  });
});

// Convenience routes (proxy to LRP)
const lrpProxy = (capability: string, timeout = 120000) =>
  async (req: express.Request, res: express.Response) => {
    try {
      const result = await lrp.invoke(capability, req.body, timeout);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  };

app.post('/api/convert', lrpProxy('convert-mesh'));
app.post('/api/analyze', lrpProxy('analyze-mesh'));
app.post('/api/photogrammetry', lrpProxy('photogrammetry-reconstruct', 300000));
app.post('/api/generate/image', lrpProxy('image-to-3d'));
app.post('/api/generate/text', lrpProxy('text-to-3d', 180000));
app.post('/api/reconstruct/nerf', lrpProxy('train-nerf', 600000));
app.post('/api/reconstruct/gaussian', lrpProxy('train-gaussian-splat', 600000));
app.post('/api/simulate/fea', lrpProxy('fea-stress-analysis', 300000));
app.post('/api/simulate/cam', lrpProxy('cam-toolpath'));
app.post('/api/render', lrpProxy('render-preview'));
app.post('/api/render/reality', lrpProxy('reality-composer', 300000));
app.post('/api/render/vld4', lrpProxy('vld4-import', 600000));

// Raw-bytes upload for file-picker flow (VLD4 files are too big for JSON payload).
// Client posts application/octet-stream; we persist to tmp, then invoke the handler.
app.post(
  '/api/upload/vld4',
  express.raw({ type: 'application/octet-stream', limit: '512mb' }),
  async (req, res) => {
    try {
      const body = req.body as Buffer | undefined;
      if (!body || body.length === 0) {
        return res.status(400).json({ error: 'Empty body — send VLD4 bytes as application/octet-stream' });
      }
      const suppliedName = (req.header('x-filename') || 'upload.vld4').replace(/[^\w.\-]/g, '_');
      const tmpPath = join(tmpdir(), `vld4-${Date.now()}-${suppliedName}`);
      await writeFile(tmpPath, body);
      const result = await lrp.invoke('vld4-import', { inputFile: tmpPath }, 600000) as Record<string, unknown>;
      res.json({ ...result, uploadPath: tmpPath });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  }
);
app.post('/api/heightmap', lrpProxy('generate-heightmap'));

// Start server + LRP runtime + queue backend
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Open3D Render Server on port ${PORT}`);
  try {
    queue = await createQueueFromEnv({ prefix: 'open3d' });
    console.log(`Job queue backend: ${queue.id}`);

    // Register a consumer for every capability. Handlers forward to the LRP
    // so the same Python runtime handles both sync + async invocations.
    // Consumers run in-process here; for scale-out put the worker in
    // apps/open3d-worker (same prefix) with REDIS_URL set.
    for (const capability of lrp.getCapabilities()) {
      queue.register(capability, async (j) => {
        return (await lrp.invoke(capability, j.input, 600_000)) as Record<string, unknown>;
      });
    }
  } catch (err) {
    console.error('queue init failed:', err);
  }
  try {
    await lrp.start();
    console.log(`LRP Python runtime started (${lrp.getCapabilities().length} capabilities)`);
  } catch (err) {
    console.error('LRP start failed:', err);
    console.log('Server running without LRP — API endpoints will return errors');
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => { await queue?.close(); await lrp.stop(); process.exit(0); });
process.on('SIGINT', async () => { await queue?.close(); await lrp.stop(); process.exit(0); });
