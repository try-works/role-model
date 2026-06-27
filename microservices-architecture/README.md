# Microservices Architecture Reference Implementation

A complete, production-ready microservices architecture with **API Gateway**, **Service Discovery**, and **Event Sourcing** — all in-memory, fully functional, and ready to run.

## Architecture Overview

```
                          ┌─────────────┐
                          │   Clients   │
                          └──────┬──────┘
                                 │
                          ┌──────▼──────┐
                          │ API Gateway │  (port 8080)
                          │   RateLimit │
                          │  CircuitBrkr│
                          │ LoadBalance │
                          └──┬───┬───┬──┘
                             │   │   │
              ┌──────────────┤   │   ├──────────────┐
              │              │   │   │              │
       ┌──────▼──────┐ ┌────▼───▼───▼────┐ ┌───────▼──────┐
       │User Service  │ │Order Service   │ │Payment Service│
       │(port 3003)   │ │(port 3004)     │ │(port 3005)   │
       └──────┬───────┘ └──────┬─────────┘ └───────┬───────┘
              │                │                    │
              └──────┬─────────┴──────────┬─────────┘
                     │                    │
              ┌──────▼──────┐    ┌───────▼───────┐
              │Event Store  │    │Service Registry│
              │(port 3002)  │    │(port 3001)    │
              │ Subscriptions│    │ Health Checks │
              └─────────────┘    └───────────────┘
```

## Components

### 1. Service Registry (`service-registry/`)
- **Port:** 3001
- **Features:**
  - Register/deregister service instances
  - Heartbeat-based health monitoring
  - Automatic expiration of dead services (TTL × 3)
  - Query by name, version, status
  - Indices for fast lookups
  - Statistics dashboard

### 2. API Gateway (`api-gateway/`)
- **Port:** 8080
- **Features:**
  - **Route-based proxying** — configurable route → service mapping
  - **Rate Limiting** — per-IP, per-route sliding window
  - **Circuit Breaker** — 3-state (CLOSED → OPEN → HALF_OPEN) with automatic recovery
  - **Load Balancing** — round-robin, random, least-connections strategies
  - **Service Discovery integration** — resolves target service via registry
  - **Health caching** — 5-second TTL for discovered instances
  - **Gateway introspection endpoints** at `/__gateway/*`

### 3. Event Store (`event-store/`)
- **Port:** 3002
- **Features:**
  - **Event sourcing** — append-only event streams per aggregate
  - **Optimistic concurrency** — version checks on stream writes
  - **Global position** — monotonically increasing across all streams
  - **Query by stream**, event type, or global position
  - **Subscriptions** — fire-and-forget HTTP delivery to registered subscribers
  - **Statistics** — event counts by type, stream counts

### 4. Business Services (`services/`)
- **User Service** (port 3003) — CRUD + USER_CREATED/UPDATED/DELETED events
- **Order Service** (port 3004) — CRUD + ORDER_CREATED/UPDATED/CANCELLED events
- **Payment Service** (port 3005) — Process, refund + PAYMENT_PROCESSED/FAILED/REFUNDED events
- **Each service:**
  - Auto-registers with the Service Registry on startup
  - Sends heartbeats every 10 seconds
  - Emits domain events to the Event Store on mutations

### 5. Shared Library (`shared/`)
- TypeScript types for all inter-service contracts
- Utility functions (ID generation, retry, etc.)

## Quick Start

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Or run directly with ts-node (no build needed)
npx ts-node service-registry/src/index.ts    # Terminal 1
npx ts-node event-store/src/index.ts         # Terminal 2
npx ts-node api-gateway/src/index.ts         # Terminal 3
npx ts-node services/user-service/src/index.ts   # Terminal 4
npx ts-node services/order-service/src/index.ts  # Terminal 5
npx ts-node services/payment-service/src/index.ts # Terminal 6
```

## Running the Demo

```bash
# One-command demo (starts all services, runs test scenarios, leaves them running)
node scripts/demo.js
```

The demo walks through all 10 scenarios:
1. **Service Discovery** — check registered services
2. **Registry Statistics** — health metrics
3. **Create Users** — via user-service
4. **Create Orders** — via order-service
5. **Process Payments** — via payment-service (80% success simulation)
6. **Event Sourcing** — verify events stored in event store
7. **API Gateway** — proxy requests through the gateway
8. **Event Subscriptions** — create and list subscribers
9. **Refund a Payment** — test the refund flow
10. **Final Summary** — aggregate event stats

## API Reference

### Service Registry
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Register a service instance |
| DELETE | `/deregister/:id` | Deregister a service |
| PUT | `/heartbeat` | Send heartbeat |
| GET | `/services` | List services (query params: name, status, version) |
| GET | `/services/:id` | Get single service |
| GET | `/stats` | Registry statistics |
| GET | `/health` | Health check |

### Event Store
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/events` | Append events to a stream |
| GET | `/events` | Query events (params: aggregateType, aggregateId, eventTypes, fromPosition) |
| GET | `/events/streams` | List all streams |
| GET | `/events/stream/:type/:id` | Get single stream |
| POST | `/subscriptions` | Create subscription |
| GET | `/subscriptions` | List subscriptions |
| DELETE | `/subscriptions/:id` | Remove subscription |
| GET | `/stats` | Event store statistics |

### API Gateway
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/__gateway/health` | Gateway health |
| GET | `/__gateway/routes` | Configured routes |
| GET | `/__gateway/circuits` | Circuit breaker states |

All other requests are proxied to services:
- `GET/POST/PUT/DELETE /api/users` → User Service
- `GET/POST/PUT/DELETE /api/orders` → Order Service
- `GET/POST /api/payments`, `POST /api/payments/refund` → Payment Service
- `GET/POST /api/events` → Event Store

### Business Services (direct)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users` | List users |
| GET | `/users/:id` | Get user |
| POST | `/users` | Create user `{name, email, role?}` |
| PUT | `/users/:id` | Update user |
| DELETE | `/users/:id` | Delete user |
| GET | `/orders` | List orders (params: userId, status) |
| GET | `/orders/:id` | Get order |
| POST | `/orders` | Create order `{userId, items[], currency?}` |
| PUT | `/orders/:id` | Update order status |
| DELETE | `/orders/:id` | Cancel order |
| GET | `/payments` | List payments (params: orderId, userId) |
| GET | `/payments/:id` | Get payment |
| POST | `/payments` | Process payment `{orderId, userId, amount, currency?}` |
| POST | `/payments/refund` | Refund payment `{paymentId, reason}` |

### All Services
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health (name, version, uptime, instanceId) |

## Docker

```bash
# Build all services
docker compose build

# Run all services
docker compose up

# Scale individual services
docker compose up -d --scale user-service=3
```

## Key Design Patterns

### Event Sourcing Flow
```
Client → API Gateway → Service → Event Store
                                    │
                            ┌───────┴───────┐
                            │  Subscribers  │
                            │  (audit,      │
                            │   analytics,  │
                            │   projections)│
                            └───────────────┘
```

### Circuit Breaker States
```
CLOSED (normal) ──failures > threshold──▶ OPEN (rejecting)
     ▲                                       │
     │                              timeout  │
     │                              elapsed  │
     │                                       ▼
     └───── successes >= threshold ──── HALF_OPEN (probing)
```

### Service Lifecycle
```
START → register() → heartbeat() every 10s → ... → deregister() → STOP
                         │
                    TTL expired?
                         │
                    Registry cleans up → instance removed
```

## Project Structure

```
microservices-architecture/
├── api-gateway/            # API Gateway (rate limit, circuit breaker, LB)
│   ├── src/
│   │   ├── index.ts        # Entry point with route config
│   │   ├── gateway-server.ts
│   │   ├── proxy-engine.ts  # Core proxying logic
│   │   ├── circuit-breaker.ts
│   │   ├── rate-limiter.ts
│   │   └── load-balancer.ts
│   └── package.json
├── service-registry/       # Service Discovery
│   ├── src/
│   │   ├── index.ts
│   │   ├── server.ts       # HTTP server
│   │   └── registry.ts     # Core registry with indices
│   └── package.json
├── event-store/            # Event Sourcing store
│   ├── src/
│   │   ├── index.ts
│   │   ├── server.ts       # HTTP server
│   │   └── store.ts        # Append-only event store
│   └── package.json
├── services/
│   ├── base-service.ts     # Shared base (registration, heartbeat, HTTP)
│   ├── user-service/       # User CRUD + domain events
│   ├── order-service/      # Order CRUD + domain events
│   └── payment-service/    # Payment processing + domain events
├── shared/                 # Shared types, utilities
│   └── src/
│       ├── types/index.ts  # All TypeScript interfaces
│       └── utils/index.ts  # ID generation, retry, etc.
├── docker/
│   └── Dockerfile          # Multi-stage Docker builds
├── docker-compose.yml      # Full stack orchestration
├── scripts/
│   └── demo.js             # Automated demo script
├── package.json            # Root workspace config
└── README.md
```

## License

MIT
