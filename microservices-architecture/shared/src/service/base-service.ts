import { createServer, IncomingMessage, ServerResponse } from 'http';
import { ServiceInstance, RegisterServiceRequest } from '../types';
import { now, generateId } from '../utils';

export interface ServiceConfig {
  name: string;
  version: string;
  port: number;
  registryUrl: string;
  metadata?: Record<string, string>;
  ttl?: number;
}

export abstract class BaseService {
  protected server;
  protected instanceId: string = '';
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private registered = false;
  private config: ServiceConfig;

  constructor(config: ServiceConfig) {
    this.config = config;
    this.server = createServer((req, res) => this.handleRequest(req, res));
  }

  abstract handleServiceRoute(req: IncomingMessage, res: ServerResponse, path: string, method: string, body: string | null): Promise<void>;

  async start(): Promise<void> {
    await this.register();
    this.startHeartbeat();

    return new Promise((resolve) => {
      this.server.listen(this.config.port, () => {
        console.log(`[${this.config.name}] Service listening on port ${this.config.port}`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    await this.deregister();
    return new Promise((resolve) => {
      this.server.close(() => resolve());
    });
  }

  getConfig(): ServiceConfig {
    return this.config;
  }

  // ─── Registry integration ─────────────────────────────────────────────

  private async register(): Promise<void> {
    const request: RegisterServiceRequest = {
      name: this.config.name,
      version: this.config.version,
      host: 'localhost',
      port: this.config.port,
      metadata: this.config.metadata,
      ttl: this.config.ttl || 30,
    };

    try {
      const response = await fetch(`${this.config.registryUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      const json = (await response.json()) as { success: boolean; data?: { id: string } };
      if (json.success && json.data) {
        this.instanceId = json.data.id;
        this.registered = true;
        console.log(`[${this.config.name}] Registered with ID ${this.instanceId}`);
      }
    } catch (err) {
      console.error(`[${this.config.name}] Failed to register:`, err);
    }
  }

  private async deregister(): Promise<void> {
    if (!this.instanceId) return;
    try {
      await fetch(`${this.config.registryUrl}/deregister/${this.instanceId}`, { method: 'DELETE' });
      this.registered = false;
      console.log(`[${this.config.name}] Deregistered`);
    } catch {
      // Best effort
    }
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(async () => {
      if (!this.instanceId || !this.registered) return;
      try {
        await fetch(`${this.config.registryUrl}/heartbeat`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ serviceId: this.instanceId, status: 'UP' }),
        });
      } catch {
        // Re-register on failure
        this.registered = false;
        await this.register();
      }
    }, 10000); // Every 10 seconds
  }

  // ─── HTTP handling ────────────────────────────────────────────────────

  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const path = url.pathname;
    const method = req.method || 'GET';

    try {
      // Service health endpoint
      if (path === '/health' && method === 'GET') {
        return this.sendJson(res, 200, {
          success: true,
          data: {
            service: this.config.name,
            version: this.config.version,
            instanceId: this.instanceId,
            status: 'UP',
            uptime: process.uptime(),
          },
        });
      }

      // Collect body for mutations
      let body: string | null = null;
      if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
        body = await this.parseBody(req);
      }

      await this.handleServiceRoute(req, res, path, method, body);
    } catch (err) {
      console.error(`[${this.config.name}] Error handling request:`, err);
      this.sendJson(res, 500, {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Internal service error' },
      });
    }
  }

  protected sendJson(res: ServerResponse, status: number, data: unknown): void {
    res.writeHead(status);
    res.end(JSON.stringify(data, null, 2));
  }

  protected parseBody(req: IncomingMessage): Promise<string | null> {
    return new Promise((resolve) => {
      let body = '';
      req.on('data', (chunk: Buffer) => (body += chunk.toString()));
      req.on('end', () => resolve(body || null));
      req.on('error', () => resolve(null));
    });
  }
}
