import { createServer, IncomingMessage, ServerResponse } from 'http';
import { ServiceRegistry } from './registry';

export class RegistryServer {
  private server;
  private registry: ServiceRegistry;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private port: number = 3001,
    private cleanupIntervalMs: number = 15000
  ) {
    this.registry = new ServiceRegistry();
    this.server = createServer((req, res) => this.handleRequest(req, res));
  }

  start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.port, () => {
        // Periodic cleanup of expired services
        this.cleanupInterval = setInterval(() => {
          const cleaned = this.registry.cleanup();
          if (cleaned > 0) {
            console.log(`[Registry] Cleaned up ${cleaned} expired service(s)`);
          }
        }, this.cleanupIntervalMs);

        console.log(`[Registry] Service Registry listening on port ${this.port}`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    return new Promise((resolve) => {
      this.server.close(() => resolve());
    });
  }

  getRegistry(): ServiceRegistry {
    return this.registry;
  }

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

    try {
      await this.route(req, res);
    } catch (err) {
      console.error('[Registry] Error:', err);
      this.sendJson(res, 500, {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      });
    }
  }

  private async route(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const path = url.pathname;
    const method = req.method || 'GET';

    // ─── Health check ──────────────────────────────────────────────────
    if (path === '/health' && method === 'GET') {
      return this.sendJson(res, 200, {
        success: true,
        data: { status: 'UP', timestamp: Date.now() },
      });
    }

    // ─── Stats ──────────────────────────────────────────────────────────
    if (path === '/stats' && method === 'GET') {
      return this.sendJson(res, 200, {
        success: true,
        data: this.registry.getStats(),
      });
    }

    // ─── Register ───────────────────────────────────────────────────────
    if (path === '/register' && method === 'POST') {
      const body = await this.parseBody<import('@microservices/shared').RegisterServiceRequest>(req);
      const instance = this.registry.register(body);
      return this.sendJson(res, 201, {
        success: true,
        data: instance,
        meta: { timestamp: Date.now(), requestId: instance.id },
      });
    }

    // ─── Deregister ─────────────────────────────────────────────────────
    if (path.startsWith('/deregister/') && method === 'DELETE') {
      const serviceId = path.split('/').pop()!;
      const removed = this.registry.deregister(serviceId);
      if (removed) {
        return this.sendJson(res, 200, { success: true });
      }
      return this.sendJson(res, 404, {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Service not found' },
      });
    }

    // ─── Heartbeat ──────────────────────────────────────────────────────
    if (path === '/heartbeat' && method === 'PUT') {
      const body = await this.parseBody<import('@microservices/shared').HeartbeatRequest>(req);
      const instance = this.registry.heartbeat(body);
      if (instance) {
        return this.sendJson(res, 200, {
          success: true,
          data: instance,
        });
      }
      return this.sendJson(res, 404, {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Service not found or expired' },
      });
    }

    // ─── Query services ────────────────────────────────────────────────
    if (path === '/services' && method === 'GET') {
      const query: import('@microservices/shared').ServiceQuery = {};
      if (url.searchParams.has('name')) query.name = url.searchParams.get('name')!;
      if (url.searchParams.has('status')) query.status = url.searchParams.get('status')! as any;
      if (url.searchParams.has('version')) query.version = url.searchParams.get('version')!;

      const svc = url.searchParams.has('name') || url.searchParams.has('status') || url.searchParams.has('version')
        ? this.registry.query(query)
        : this.registry.getAllServices();

      return this.sendJson(res, 200, {
        success: true,
        data: svc,
        meta: { count: svc.length, timestamp: Date.now() },
      });
    }

    // ─── Get single service ────────────────────────────────────────────
    if (path.startsWith('/services/') && method === 'GET') {
      const serviceId = path.split('/').pop()!;
      const instance = this.registry.getService(serviceId);
      if (instance) {
        return this.sendJson(res, 200, { success: true, data: instance });
      }
      return this.sendJson(res, 404, {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Service not found' },
      });
    }

    // ─── 404 ────────────────────────────────────────────────────────────
    return this.sendJson(res, 404, {
      success: false,
      error: { code: 'NOT_FOUND', message: `Route ${method} ${path} not found` },
    });
  }

  private parseBody<T>(req: IncomingMessage): Promise<T> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', (chunk: Buffer) => (body += chunk.toString()));
      req.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch {
          reject(new Error('Invalid JSON'));
        }
      });
      req.on('error', reject);
    });
  }

  private sendJson(res: ServerResponse, status: number, data: unknown): void {
    res.writeHead(status);
    res.end(JSON.stringify(data, null, 2));
  }
}
