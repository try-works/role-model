#!/usr/bin/env node

/**
 * Microservices Architecture Demo
 *
 * Demonstrates the full system:
 *   1. Service Registry (health checks, heartbeats)
 *   2. Event Store (event sourcing with subscriptions)
 *   3. User Service (CRUD + events)
 *   4. Order Service (CRUD + events)
 *   5. Payment Service (CRUD + events, simulated gateway)
 *
 * Run: node scripts/demo.js
 */

const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const BASE = process.cwd();

// ─── Utilities ─────────────────────────────────────────────────────────────

function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const opts = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: { 'Content-Type': 'application/json', ...options.headers },
      timeout: 5000,
    };

    const req = http.request(opts, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk.toString()));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });

    if (options.body) req.write(options.body);
    req.end();
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function log(emoji, msg) {
  const time = new Date().toISOString().slice(11, 19);
  console.log(`  ${time}  ${emoji}  ${msg}`);
}

// ─── Process Management ────────────────────────────────────────────────────

const processes = [];

function startService(name, cwd, command, args) {
  return new Promise((resolve, reject) => {
    log('⚙️', `Starting ${name}...`);
    const proc = spawn(command, args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, FORCE_COLOR: '1' },
    });

    proc.stdout.on('data', (data) => {
      const line = data.toString().trim();
      // Only log startup messages from the services
      if (line.includes('listening') || line.includes('Registered') || line.includes('error')) {
        log('📡', `[${name}] ${line}`);
      }
    });

    proc.stderr.on('data', (data) => {
      const line = data.toString().trim();
      if (line && !line.includes('ExperimentalWarning')) {
        log('🔴', `[${name}] ${line}`);
      }
    });

    proc.on('error', reject);
    proc.on('exit', (code) => {
      log('⏹️', `${name} exited with code ${code}`);
      const idx = processes.findIndex((p) => p.name === name);
      if (idx >= 0) processes.splice(idx, 1);
    });

    processes.push({ name, proc });
    log('✅', `${name} started (pid: ${proc.pid})`);

    // Give it time to start
    setTimeout(resolve, 1500);
  });
}

function startAll() {
  const root = BASE;

  // Use compiled JS from dist directories directly
  function nodeScript(pkgPath, entry = 'dist/index.js') {
    return path.join(BASE, pkgPath, entry);
  }

  return Promise.all([
    startService('Registry', BASE, 'node', [nodeScript('service-registry')]),
    startService('EventStore', BASE, 'node', [nodeScript('event-store')]),
  ])
    .then(() => sleep(2000))
    .then(() =>
      Promise.all([
        startService('Gateway', BASE, 'node', [nodeScript('api-gateway')]),
        startService('UserService', BASE, 'node', [nodeScript('services/user-service')]),
        startService('OrderService', BASE, 'node', [nodeScript('services/order-service')]),
        startService('PaymentService', BASE, 'node', [nodeScript('services/payment-service')]),
      ])
    )
    .then(() => sleep(2000));
}

function stopAll() {
  log('🛑', 'Shutting down all services...');
  for (const { name, proc } of [...processes].reverse()) {
    try {
      proc.kill('SIGTERM');
    } catch {}
  }
}

// ─── Demo Scenarios ────────────────────────────────────────────────────────

async function runDemo() {
  log('🚀', '====== MICROSERVICES ARCHITECTURE DEMO ======');

  // ─── 1. Discover Services ──────────────────────────────────────────────
  log('\n📋', '─── 1. Service Discovery: Check registry ───');
  await sleep(500);

  const svcResponse = await fetch('http://localhost:3001/services');
  const services = svcResponse.data?.data || [];
  log('🔍', `Registry has ${services.length} registered services:`);
  for (const svc of services) {
    log('   •', `${svc.name}@${svc.host}:${svc.port} (${svc.status}, ID: ${svc.id.slice(0, 8)}…)`);
  }

  // ─── 2. Registry Stats ─────────────────────────────────────────────────
  log('\n📊', '─── 2. Registry Statistics ───');
  const statsResponse = await fetch('http://localhost:3001/stats');
  log('📈', JSON.stringify(statsResponse.data?.data, null, 2));

  // ─── 3. Create Users ───────────────────────────────────────────────────
  log('\n👤', '─── 3. User Service: Create Users ───');
  await sleep(300);

  const users = [];
  for (const userData of [
    { name: 'Alice Johnson', email: 'alice@example.com', role: 'admin' },
    { name: 'Bob Smith', email: 'bob@example.com', role: 'user' },
    { name: 'Carol Davis', email: 'carol@example.com', role: 'user' },
  ]) {
    const res = await fetch('http://localhost:3003/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    if (res.data?.success) {
      const user = res.data.data;
      users.push(user);
      log('✅', `Created user: ${user.name} (${user.email}) [${user.id}]`);
    } else {
      log('❌', `Failed to create user: ${JSON.stringify(res.data)}`);
    }
  }

  // ─── 4. Create Orders ──────────────────────────────────────────────────
  log('\n📦', '─── 4. Order Service: Create Orders ───');
  await sleep(300);

  const orders = [];
  for (const [idx, user] of users.entries()) {
    const orderData = {
      userId: user.id,
      items: [
        { productId: `prod_${idx}_1`, name: 'Widget A', quantity: 1 + idx, unitPrice: 19.99 },
        { productId: `prod_${idx}_2`, name: 'Gadget B', quantity: 1, unitPrice: 49.99 },
      ],
      currency: 'USD',
    };
    const res = await fetch('http://localhost:3004/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
    if (res.data?.success) {
      const order = res.data.data;
      orders.push(order);
      log('✅', `Created order: ${order.id} for user ${user.id.slice(0, 8)}… total: $${order.total}`);
    } else {
      log('❌', `Failed to create order: ${JSON.stringify(res.data)}`);
    }
  }

  // ─── 5. Process Payments ───────────────────────────────────────────────
  log('\n💳', '─── 5. Payment Service: Process Payments ───');
  await sleep(300);

  for (const order of orders) {
    const paymentData = {
      orderId: order.id,
      userId: order.userId,
      amount: order.total,
      currency: order.currency,
    };
    const res = await fetch('http://localhost:3005/payments', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
    if (res.data?.success) {
      const payment = res.data.data;
      log('✅', `Payment ${payment.status}: ${payment.id} for order ${order.id.slice(0, 8)}… ($${payment.amount})`);
    } else {
      log('❌', `Payment failed: ${JSON.stringify(res.data)}`);
    }
  }

  // ─── 6. Check Event Store ──────────────────────────────────────────────
  log('\n📜', '─── 6. Event Store: Verify Event Sourcing ───');
  await sleep(500);

  const esStats = await fetch('http://localhost:3002/stats');
  log('📊', `Event Store stats: ${JSON.stringify(esStats.data?.data, null, 2)}`);

  const events = await fetch('http://localhost:3002/events?limit=10');
  log('📝', `Recent events (${events.data?.data?.length || 0}):`);
  for (const evt of (events.data?.data || []).slice(0, 8)) {
    log('   •', `${evt.eventType} | ${evt.aggregateType}:${evt.aggregateId.slice(0, 8)}… | globalPos: ${evt.globalPosition}`);
  }

  // ─── 7. API Gateway Proxy ──────────────────────────────────────────────
  log('\n🌐', '─── 7. API Gateway: Proxy Requests ───');
  await sleep(300);

  const gatewayHealth = await fetch('http://localhost:8080/__gateway/health');
  log('🏥', `Gateway health: ${gatewayHealth.data?.data?.status}`);

  const gatewayRoutes = await fetch('http://localhost:8080/__gateway/routes');
  const routeCount = gatewayRoutes.data?.data?.length || 0;
  log('🗺️', `Gateway routes configured: ${routeCount}`);

  // Test a proxied request
  log('🌉', 'Testing proxied request through gateway → /api/users…');
  const proxiedUsers = await fetch('http://localhost:8080/api/users');
  const userCount = proxiedUsers.data?.data?.length || 0;
  log('✅', `Gateway proxied to user-service: got ${userCount} users`);

  const proxiedOrders = await fetch('http://localhost:8080/api/orders');
  const orderCount = proxiedOrders.data?.data?.length || 0;
  log('✅', `Gateway proxied to order-service: got ${orderCount} orders`);

  // ─── 8. Event Store Subscriptions ──────────────────────────────────────
  log('\n🔔', '─── 8. Event Store: Create Subscription ───');
  await sleep(300);

  const subResponse = await fetch('http://localhost:3002/subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      subscriberName: 'audit-logger',
      eventTypes: ['USER_CREATED', 'ORDER_CREATED', 'PAYMENT_PROCESSED', 'PAYMENT_FAILED'],
      callbackUrl: 'http://localhost:9999/webhook/audit',
    }),
  });
  if (subResponse.data?.success) {
    log('✅', `Subscription created: ${subResponse.data.data.id}`);
  }

  const subs = await fetch('http://localhost:3002/subscriptions');
  log('📋', `Active subscriptions: ${subs.data?.data?.length || 0}`);

  // ─── 9. Refund a Payment ───────────────────────────────────────────────
  log('\n💸', '─── 9. Payment Service: Process Refund ───');
  await sleep(300);

  const allPayments = await fetch('http://localhost:3005/payments');
  const successfulPayment = (allPayments.data?.data || []).find(p => p.status === 'success');
  if (successfulPayment) {
    const refundRes = await fetch('http://localhost:3005/payments/refund', {
      method: 'POST',
      body: JSON.stringify({
        paymentId: successfulPayment.id,
        reason: 'Customer requested cancellation',
      }),
    });
    if (refundRes.data?.success) {
      log('✅', `Payment ${successfulPayment.id.slice(0, 8)}… refunded successfully`);
    }
  }

  // ─── 10. Final Event Store Summary ─────────────────────────────────────
  log('\n📊', '─── 10. Final Event Store Summary ───');
  const finalStats = await fetch('http://localhost:3002/stats');
  const stats = finalStats.data?.data;
  if (stats) {
    log('📦', `Total streams:   ${stats.totalStreams}`);
    log('📝', `Total events:    ${stats.totalEvents}`);
    log('🔔', `Subscriptions:   ${stats.totalSubscriptions}`);
    log('📈', `Events by type:  ${JSON.stringify(stats.eventsByType, null, 2)}`);
  }

  log('\n🎉', '====== DEMO COMPLETE ======');
  log('💡', 'Services are still running. Press Ctrl+C to stop all.\n');
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n');
  log('🏗️', 'Building and starting microservices...\n');

  try {
    await startAll();
    await runDemo();
  } catch (err) {
    log('💥', `Error: ${err.message}`);
    stopAll();
    process.exit(1);
  }

  // Wait for Ctrl+C
  process.on('SIGINT', () => {
    console.log('\n');
    stopAll();
    process.exit(0);
  });
}

main();
