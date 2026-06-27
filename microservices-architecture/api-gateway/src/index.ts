import { GatewayServer } from './gateway-server';
import { GatewayConfig } from '@microservices/shared';

const REGISTRY_URL = process.env.REGISTRY_URL || 'http://localhost:3001';
const GATEWAY_PORT = parseInt(process.env.GATEWAY_PORT || '8080', 10);

const config: GatewayConfig = {
  port: GATEWAY_PORT,
  registryUrl: REGISTRY_URL,
  routes: [
    // ─── User Service Routes ──────────────────────────────────────────
    {
      path: '/api/users',
      method: 'GET',
      targetService: 'user-service',
      targetPath: '/users',
      rateLimit: { windowMs: 60000, maxRequests: 100 },
      circuitBreaker: { failureThreshold: 5, resetTimeoutMs: 30000 },
    },
    {
      path: '/api/users',
      method: 'POST',
      targetService: 'user-service',
      targetPath: '/users',
      rateLimit: { windowMs: 60000, maxRequests: 30 },
    },
    {
      path: '/api/users',
      method: 'PUT',
      targetService: 'user-service',
      targetPath: '/users',
    },
    {
      path: '/api/users',
      method: 'DELETE',
      targetService: 'user-service',
      targetPath: '/users',
      auth: true,
      requiredRole: 'admin',
    },
    // ─── Order Service Routes ─────────────────────────────────────────
    {
      path: '/api/orders',
      method: 'GET',
      targetService: 'order-service',
      targetPath: '/orders',
      rateLimit: { windowMs: 60000, maxRequests: 50 },
    },
    {
      path: '/api/orders',
      method: 'POST',
      targetService: 'order-service',
      targetPath: '/orders',
      rateLimit: { windowMs: 60000, maxRequests: 20 },
    },
    {
      path: '/api/orders',
      method: 'PUT',
      targetService: 'order-service',
      targetPath: '/orders',
    },
    {
      path: '/api/orders',
      method: 'DELETE',
      targetService: 'order-service',
      targetPath: '/orders',
    },
    // ─── Payment Service Routes ───────────────────────────────────────
    {
      path: '/api/payments',
      method: 'GET',
      targetService: 'payment-service',
      targetPath: '/payments',
    },
    {
      path: '/api/payments',
      method: 'POST',
      targetService: 'payment-service',
      targetPath: '/payments',
      rateLimit: { windowMs: 60000, maxRequests: 10 },
    },
    {
      path: '/api/payments/refund',
      method: 'POST',
      targetService: 'payment-service',
      targetPath: '/payments/refund',
    },
    // ─── Event Store Routes ──────────────────────────────────────────
    {
      path: '/api/events',
      method: 'GET',
      targetService: 'event-store',
      targetPath: '/events',
    },
    {
      path: '/api/events',
      method: 'POST',
      targetService: 'event-store',
      targetPath: '/events',
    },
  ],
};

async function main() {
  const server = new GatewayServer(config, REGISTRY_URL);
  await server.start();

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n[Gateway] Shutting down...');
    await server.stop();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    await server.stop();
    process.exit(0);
  });
}

main().catch(console.error);
