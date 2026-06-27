"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseService = void 0;
const http_1 = require("http");
class BaseService {
    server;
    instanceId = '';
    heartbeatTimer = null;
    registered = false;
    config;
    constructor(config) {
        this.config = config;
        this.server = (0, http_1.createServer)((req, res) => this.handleRequest(req, res));
    }
    async start() {
        await this.register();
        this.startHeartbeat();
        return new Promise((resolve) => {
            this.server.listen(this.config.port, () => {
                console.log(`[${this.config.name}] Service listening on port ${this.config.port}`);
                resolve();
            });
        });
    }
    async stop() {
        if (this.heartbeatTimer)
            clearInterval(this.heartbeatTimer);
        await this.deregister();
        return new Promise((resolve) => {
            this.server.close(() => resolve());
        });
    }
    getConfig() {
        return this.config;
    }
    // ─── Registry integration ─────────────────────────────────────────────
    async register() {
        const request = {
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
            const data = await response.json();
            if (data.success && data.data) {
                this.instanceId = data.data.id;
                this.registered = true;
                console.log(`[${this.config.name}] Registered with ID ${this.instanceId}`);
            }
        }
        catch (err) {
            console.error(`[${this.config.name}] Failed to register:`, err);
        }
    }
    async deregister() {
        if (!this.instanceId)
            return;
        try {
            await fetch(`${this.config.registryUrl}/deregister/${this.instanceId}`, { method: 'DELETE' });
            this.registered = false;
            console.log(`[${this.config.name}] Deregistered`);
        }
        catch {
            // Best effort
        }
    }
    startHeartbeat() {
        this.heartbeatTimer = setInterval(async () => {
            if (!this.instanceId || !this.registered)
                return;
            try {
                await fetch(`${this.config.registryUrl}/heartbeat`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ serviceId: this.instanceId, status: 'UP' }),
                });
            }
            catch {
                // Re-register on failure
                this.registered = false;
                await this.register();
            }
        }, 10000); // Every 10 seconds
    }
    // ─── HTTP handling ────────────────────────────────────────────────────
    async handleRequest(req, res) {
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
            let body = null;
            if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
                body = await this.parseBody(req);
            }
            await this.handleServiceRoute(req, res, path, method, body);
        }
        catch (err) {
            console.error(`[${this.config.name}] Error handling request:`, err);
            this.sendJson(res, 500, {
                success: false,
                error: { code: 'INTERNAL_ERROR', message: 'Internal service error' },
            });
        }
    }
    sendJson(res, status, data) {
        res.writeHead(status);
        res.end(JSON.stringify(data, null, 2));
    }
    parseBody(req) {
        return new Promise((resolve) => {
            let body = '';
            req.on('data', (chunk) => (body += chunk.toString()));
            req.on('end', () => resolve(body || null));
            req.on('error', () => resolve(null));
        });
    }
}
exports.BaseService = BaseService;
//# sourceMappingURL=base-service.js.map