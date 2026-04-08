import { spawn, type ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

interface LRPRequest {
  jsonrpc: '2.0';
  method: string;
  params: Record<string, unknown>;
  id: number;
}

interface LRPResponse {
  jsonrpc: '2.0';
  result?: unknown;
  error?: { code: number; message: string; data?: string };
  id: number;
}

export class LRPManager extends EventEmitter {
  private process: ChildProcess | null = null;
  private pendingRequests = new Map<number, { resolve: (v: LRPResponse) => void; reject: (e: Error) => void; timer: NodeJS.Timeout }>();
  private requestId = 0;
  private buffer = '';
  private runtimePath: string;
  private capabilities: string[] = [];

  constructor(runtimePath?: string) {
    super();
    this.runtimePath = runtimePath ?? resolve(import.meta.dirname, '../../runtimes/open3d-python/main.py');
  }

  async start(): Promise<void> {
    if (this.process) return;

    this.process = spawn('python3', [this.runtimePath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: resolve(this.runtimePath, '..', '..', '..'),
    });

    this.process.stdout!.on('data', (data: Buffer) => {
      this.buffer += data.toString();
      const lines = this.buffer.split('\n');
      this.buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const response = JSON.parse(line) as LRPResponse;
          const pending = this.pendingRequests.get(response.id);
          if (pending) {
            clearTimeout(pending.timer);
            this.pendingRequests.delete(response.id);
            pending.resolve(response);
          }
        } catch { /* ignore non-JSON */ }
      }
    });

    this.process.stderr!.on('data', (data: Buffer) => {
      const msg = data.toString().trim();
      if (msg) this.emit('log', msg);
    });

    this.process.on('close', (code) => {
      this.emit('close', code);
      this.process = null;
      for (const [, pending] of this.pendingRequests) {
        clearTimeout(pending.timer);
        pending.reject(new Error(`LRP process exited with code ${code}`));
      }
      this.pendingRequests.clear();
    });

    // Wait for startup
    await new Promise<void>((resolve) => {
      const handler = (data: Buffer) => {
        if (data.toString().includes('started')) {
          this.process?.stderr!.off('data', handler);
          resolve();
        }
      };
      this.process!.stderr!.on('data', handler);
      setTimeout(resolve, 2000); // Fallback timeout
    });

    // Discover capabilities from YAML files
    await this.discoverCapabilities();
  }

  async invoke(capability: string, params: Record<string, unknown>, timeout = 120000): Promise<unknown> {
    if (!this.process) await this.start();

    const id = ++this.requestId;
    const request: LRPRequest = { jsonrpc: '2.0', method: capability, params, id };

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`LRP timeout after ${timeout}ms for ${capability}`));
      }, timeout);

      this.pendingRequests.set(id, { resolve: (resp) => {
        if (resp.error) reject(new Error(resp.error.message));
        else resolve(resp.result);
      }, reject, timer });

      this.process!.stdin!.write(JSON.stringify(request) + '\n');
    });
  }

  async stop(): Promise<void> {
    if (this.process) {
      this.process.kill('SIGTERM');
      this.process = null;
    }
  }

  isRunning(): boolean {
    return this.process !== null && !this.process.killed;
  }

  getCapabilities(): string[] {
    return this.capabilities;
  }

  private async discoverCapabilities(): Promise<void> {
    try {
      const capsDir = resolve(this.runtimePath, '..', '..', '..', 'capabilities', 'open3d');
      const files = await readdir(capsDir);
      this.capabilities = files.filter(f => f.endsWith('.yaml')).map(f => f.replace('.yaml', ''));
    } catch {
      this.capabilities = [
        'convert-mesh', 'convert-cad', 'analyze-mesh', 'generate-heightmap',
        'photogrammetry-reconstruct', 'cam-toolpath', 'fea-stress-analysis',
        'train-gaussian-splat', 'image-to-3d', 'text-to-3d', 'train-nerf',
      ];
    }
  }
}
