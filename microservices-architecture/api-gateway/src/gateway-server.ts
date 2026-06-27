import { createServer, IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import { GatewayConfig, RouteDefinition, ServiceInstance, now, generateId } from '@microservices/shared';
import { ProxyEngine } from './proxy-engine';

export class GatewayServer {
  private server;
  private proxyEngine: ProxyEngine;
  private ready = false;
  private cachedRoutes: RouteDefinition[] = [];

  constructor(
    private config: GatewayConfig,
    private registryUrl: string
  ) {
    this.proxyEngine = new ProxyEngine(config, (name) => this.discoverService(name));
    this.server = createServer((req, res) => this.handleRequest(req, res));
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.config.port, () => {
        this.ready = true;
        // Warm up route cache
        this.refreshServiceDiscovery();
        console.log(`[Gateway] API Gateway listening on port ${this.config.port}`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    this.ready = false;
    return new Promise((resolve) => {
      this.server.close(() => resolve());
    });
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    // ─── Internal gateway routes ─────────────────────────────────────────
    if (req.url === '/__gateway/health' && req.method === 'GET') {
      return this.sendJson(res, 200, {
        success: true,
        data: {
          status: 'UP',
          uptime: process.uptime(),
          ready: this.ready,
          version: '1.0.0',
        },
      });
    }

    if (req.url === '/__gateway/routes' && req.method === 'GET') {
      return this.sendJson(res, 200, {
        success: true,
        data: this.config.routes.map(r => ({
          method: r.method,
          path: r.path,
          targetService: r.targetService,
          rateLimit: r.rateLimit,
          auth: r.auth,
        })),
      });
    }

    if (req.url === '/__gateway/circuits' && req.method === 'GET') {
      return this.sendJson(res, 200, {
        success: true,
        data: this.proxyEngine.getCircuitStats(),
      });
    }

    // ─── Collect body for POST/PUT/PATCH ────────────────────────────────
    let body: string | null = null;
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      body = await this.parseBody(req);
    }

    const clientIp = req.headers['x-forwarded-for'] as string
      || req.socket.remoteAddress
      || '127.0.0.1';

    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    // ─── Proxy to service ────────────────────────────────────────────────
    const result = await this.proxyEngine.proxy(
      req.method || 'GET',
      url.pathname,
      req.headers as Record<string, string>,
      body,
      clientIp
    );

    // Write response headers
    for (const [key, value] of Object.entries(result.headers)) {
      res.setHeader(key, value);
    }

    res.writeHead(result.status);
    res.end(result.body);
  }

  private async discoverService(serviceName: string): Promise<ServiceInstance[]> {
    try {
      const url = `${this.registryUrl}/services?name=${encodeURIComponent(serviceName)}&status=UP`;
      const response = await fetch(url);
      const data = (await response.json()) as { data?: ServiceInstance[] };
      return data.data || [];
    } catch (err) {
      console.error(`[Gateway] Failed to discover service "${serviceName}":`, err);
      return [];
    }
  }

  private async refreshServiceDiscovery(): Promise<void> {
    try {
      const url = `${this.registryUrl}/services`;
      const response = await fetch(url);
      const data = (await response.json()) as { data?: ServiceInstance[] };
      const instances = data.data || [];
      console.log(`[Gateway] Discovered services:`, instances.map((s: ServiceInstance) => `${s.name}@${s.host}:${s.port}`));
    } catch {
      // Registry might not be ready yet
    }
  }

  private parseBody(req: IncomingMessage): Promise<string | null> {
    return new Promise((resolve) => {
      let body = '';
      req.on('data', (chunk: Buffer) => (body += chunk.toString()));
      req.on('end', () => resolve(body || null));
      req.on('error', () => resolve(null));
    });
  }

  private sendJson(res: ServerResponse, status: number, data: unknown): void {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data, null, 2));
  }
}
