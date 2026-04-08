import express from 'express';
import { LRPManager } from './lrp-manager.js';

const app = express();
const PORT = Number(process.env.PORT) || 4173;
const lrp = new LRPManager();

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

// Universal LRP invoke
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
app.post('/api/heightmap', lrpProxy('generate-heightmap'));

// Start server + LRP runtime
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Open3D Render Server on port ${PORT}`);
  try {
    await lrp.start();
    console.log(`LRP Python runtime started (${lrp.getCapabilities().length} capabilities)`);
  } catch (err) {
    console.error('LRP start failed:', err);
    console.log('Server running without LRP — API endpoints will return errors');
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => { await lrp.stop(); process.exit(0); });
process.on('SIGINT', async () => { await lrp.stop(); process.exit(0); });
