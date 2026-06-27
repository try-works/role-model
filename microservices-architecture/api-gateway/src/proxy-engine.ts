import { request as httpRequest, RequestOptions, IncomingMessage } from 'http';
import { request as httpsRequest } from 'https';
import { URL } from 'url';
import {
  ApiResponse,
  RouteDefinition,
  ServiceInstance,
  GatewayConfig,
  now,
  generateId,

} from '@microservices/shared';
import { CircuitBreaker } from './circuit-breaker';
import { RateLimiter } from './rate-limiter';
import { LoadBalancer } from './load-balancer';

export class ProxyEngine {
  private circuitBreaker: CircuitBreaker;
  private rateLimiter: RateLimiter;
  private loadBalancers: Map<string, LoadBalancer> = new Map();
  private healthyCache: Map<string, { instances: ServiceInstance[]; timestamp: number }> = new Map();
  private cacheTtlMs: number = 5000;

  constructor(
    private config: GatewayConfig,
    private discoverService: (name: string) => Promise<ServiceInstance[]>
  ) {
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeoutMs: 30000,
      halfOpenMaxRequests: 3,
    });
    this.rateLimiter = new RateLimiter();
  }

  /** Main routing + proxying logic */
  async proxy(
    method: string,
    path: string,
    headers: Record<string, string>,
    body: string | null,
    clientIp: string
  ): Promise<{ status: number; headers: Record<string, string>; body: string }> {
    const requestId = generateId();
    const startTime = now();

    try {
      // 1. Find matching route
      const route = this.matchRoute(method, path);
      if (!route) {
        return this.errorResponse(404, 'NOT_FOUND', `Route ${method} ${path} not found`, requestId);
      }

      // 2. Rate limiting
      const rateLimitKey = `${clientIp}:${route.path}`;
      if (route.rateLimit) {
        const check = this.rateLimiter.check(rateLimitKey, route.rateLimit);
        if (!check.allowed) {
          return {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': String(check.resetAt),
              'Retry-After': String(Math.ceil((check.resetAt - now()) / 1000)),
            },
            body: JSON.stringify({
              success: false,
              error: { code: 'RATE_LIMITED', message: 'Too many requests' },
              meta: { timestamp: now(), requestId },
            }),
          };
        }
      }

      // 3. Discover service instances
      const instances = await this.discoverHealthy(route.targetService);
      if (instances.length === 0) {
        return this.errorResponse(503, 'SERVICE_UNAVAILABLE', `No healthy instances of ${route.targetService}`, requestId);
      }

      // 4. Load balancing
      const lb = this.getLoadBalancer(route.targetService);
      const target = lb.select(instances);
      if (!target) {
        return this.errorResponse(503, 'NO_HEALTHY_INSTANCES', `No available instances of ${route.targetService}`, requestId);
      }

      // 5. Circuit breaker check
      const circuitKey = `${route.targetService}:${route.path}`;
      if (!this.circuitBreaker.canPass(circuitKey)) {
        return this.errorResponse(503, 'CIRCUIT_OPEN', `Circuit breaker open for ${circuitKey}`, requestId);
      }

      // 6. Forward request to target service
      const targetPath = route.targetPath + path.replace(route.path, '') || '/';
      const result = await this.forwardRequest(method, target, targetPath, headers, body, circuitKey);

      // 7. Track success/failure
      if (result.status < 500) {
        this.circuitBreaker.onSuccess(circuitKey);
      } else {
        this.circuitBreaker.onFailure(circuitKey);
      }

      // 8. Attach gateway metadata
      const responseHeaders: Record<string, string> = {
        ...result.headers,
        'X-Request-Id': requestId,
        'X-Gateway-Latency': String(now() - startTime),
        'X-Upstream-Service': `${target.name}@${target.id.slice(0, 8)}`,
      };

      return { status: result.status, headers: responseHeaders, body: result.body };
    } catch (err) {
      console.error(`[Proxy] Error:`, err);
      return this.errorResponse(502, 'BAD_GATEWAY', 'Upstream service error', requestId);
    }
  }

  /** Match a request to a configured route */
  private matchRoute(method: string, path: string): RouteDefinition | null {
    for (const route of this.config.routes) {
      if (route.method !== method) continue;
      if (path.startsWith(route.path)) {
        return route;
      }
    }
    return null;
  }

  /** Discover healthy service instances with caching */
  private async discoverHealthy(serviceName: string): Promise<ServiceInstance[]> {
    const cached = this.healthyCache.get(serviceName);
    if (cached && (now() - cached.timestamp) < this.cacheTtlMs) {
      return cached.instances;
    }

    const instances = await this.discoverService(serviceName);
    const healthy = instances.filter(i => i.status === 'UP');

    this.healthyCache.set(serviceName, { instances: healthy, timestamp: now() });
    return healthy;
  }

  /** Forward HTTP request to a service instance */
  private forwardRequest(
    method: string,
    target: ServiceInstance,
    targetPath: string,
    headers: Record<string, string>,
    body: string | null,
    circuitKey: string
  ): Promise<{ status: number; headers: Record<string, string>; body: string }> {
    return new Promise((resolve, reject) => {
      const url = new URL(`http://${target.host}:${target.port}${targetPath}`);

      const options: RequestOptions = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method,
        headers: {
          ...headers,
          'X-Forwarded-For': headers['x-forwarded-for'] || '',
          'X-Forwarded-Host': headers['host'] || '',
          'X-Request-Start': String(now()),
        },
        timeout: 10000,
      };

      const req = httpRequest(options, (res: IncomingMessage) => {
        let responseBody = '';
        res.on('data', (chunk: Buffer) => (responseBody += chunk.toString()));
        res.on('end', () => {
          // Sanitize transfer-encoding / chunked responses
          const responseHeaders: Record<string, string> = {};
          for (const [key, value] of Object.entries(res.headers)) {
            const lower = key.toLowerCase();
            if (lower !== 'transfer-encoding' && lower !== 'connection' && value !== undefined) {
              responseHeaders[key] = Array.isArray(value) ? value.join(', ') : value;
            }
          }

          resolve({
            status: res.statusCode || 502,
            headers: responseHeaders,
            body: responseBody,
          });
        });
      });

      req.on('timeout', () => {
        req.destroy();
        this.circuitBreaker.onFailure(circuitKey);
        reject(new Error('Request timeout'));
      });

      req.on('error', (err) => {
        this.circuitBreaker.onFailure(circuitKey);
        reject(err);
      });

      if (body) {
        req.write(body);
      }
      req.end();
    });
  }

  private getLoadBalancer(serviceName: string): LoadBalancer {
    if (!this.loadBalancers.has(serviceName)) {
      this.loadBalancers.set(serviceName, new LoadBalancer('round-robin'));
    }
    return this.loadBalancers.get(serviceName)!;
  }

  private errorResponse(
    status: number,
    code: string,
    message: string,
    requestId: string
  ): { status: number; headers: Record<string, string>; body: string } {
    return {
      status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: { code, message },
        meta: { timestamp: now(), requestId },
      }),
    };
  }

  /** Rate limiter accessor (for testing/status) */
  getRateLimiter(): RateLimiter {
    return this.rateLimiter;
  }

  /** Circuit breaker stats */
  getCircuitStats(): Record<string, unknown> {
    return this.circuitBreaker.getAllStats();
  }
}
