# Microservices Architecture Design

## Overview

This document describes a microservices architecture integrating **API Gateway**, **Service Mesh**, **Event Sourcing**, **CQRS**, and **Distributed Tracing**. The system is designed for an e-commerce platform handling orders, payments, inventory, and notifications.

---

## Architecture Diagram (Logical)

```
                          ┌─────────────────────────────────────┐
                          │         External Clients            │
                          │   (Web, Mobile, 3rd-Party APIs)     │
                          └──────────────┬──────────────────────┘
                                         │
                                         ▼
                          ┌─────────────────────────────────────┐
                          │          API Gateway                │
                          │   • Auth / JWT validation           │
                          │   • Rate limiting                   │
                          │   • Request routing                 │
                          │   • Response aggregation            │
                          │   • TLS termination                 │
                          └──────────────┬──────────────────────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    │                    │                    │
                    ▼                    ▼                    ▼
          ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
          │   Order Service  │  │  Payment Service │  │ Inventory Service│
          │   (Commands)     │  │   (Commands)     │  │   (Commands)     │
          └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘
                   │                     │                     │
                   │        ┌──────────────────────┐           │
                   └────────┤    Message Broker    ├───────────┘
                            │  (Event Store: Kafka │
                            │   / Pulsar / NATS)   │
                            └──────────┬───────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
                    ▼                  ▼                  ▼
          ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
          │  Order Projector │  │ Payment Projector│  │Inventory Project.│
          │  (CQRS Read)     │  │  (CQRS Read)     │  │  (CQRS Read)     │
          └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘
                   │                     │                     │
                   ▼                     ▼                     ▼
          ┌─────────────────────────────────────────────────────────┐
          │              Read-Optimized Data Stores                 │
          │     (PostgreSQL / Elasticsearch / Redis / Materialized  │
          │      Views optimized for queries, denormalized)         │
          └─────────────────────────────────────────────────────────┘
                                  ▲
                                  │
          ┌───────────────────────┼───────────────────────┐
          │                       │                       │
          ▼                       ▼                       ▼
   ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
   │Notification  │      │ Analytics    │      │  Audit       │
   │Service       │      │ Service      │      │  Service     │
   └──────────────┘      └──────────────┘      └──────────────┘
```

---

## 1. API Gateway

### Responsibilities

- **Entry point** for all external clients
- **Authentication & Authorization** – validates JWTs, enforces RBAC
- **Rate Limiting** – token bucket per client/route
- **Request Routing** – path-based and header-based routing to downstream services
- **Response Aggregation** – combines responses from multiple services (e.g., order detail + payment status)
- **Protocol Translation** – HTTP/1.1 ↔ gRPC, REST ↔ GraphQL
- **TLS Termination**

### Technology Choices

| Component         | Option 1        | Option 2      | Option 3     |
|-------------------|-----------------|---------------|--------------|
| Gateway runtime   | Envoy           | Kong          | NGINX + Lua  |
| API management    | Tyk             | Apigee        | KrakenD      |
| GraphQL layer     | Apollo Federation | WunderGraph | Hasura       |

### Configuration (Envoy-based)

```yaml
# envoy-gateway.yaml (abbreviated)
static_resources:
  listeners:
  - name: public_listener
    address: { socket_address: { address: 0.0.0.0, port_value: 443 } }
    filter_chains:
    - filters:
      - name: envoy.filters.network.http_connection_manager
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
          stat_prefix: gateway
          route_config:
            virtual_hosts:
            - name: api
              domains: ["api.example.com"]
              routes:
              - match: { prefix: "/api/v1/orders" }
                route: { cluster: order_service }
              - match: { prefix: "/api/v1/payments" }
                route: { cluster: payment_service }
          http_filters:
          - name: envoy.filters.http.jwt_authn
          - name: envoy.filters.http.ratelimit
          - name: envoy.filters.http.router
  clusters:
  - name: order_service
    type: STRICT_DNS
    lb_policy: ROUND_ROBIN
    typed_extension_protocol_options:
      envoy.extensions.upstreams.http.v3.HttpProtocolOptions:
        "@type": type.googleapis.com/envoy.extensions.upstreams.http.v3.HttpProtocolOptions
        explicit_http_config:
          http2_protocol_options: {}
    load_assignment:
      cluster_name: order_service
      endpoints:
      - lb_endpoints:
        - endpoint:
            address: { socket_address: { address: order-svc, port_value: 8080 } }
```

### Route Table

| Method | Path                     | Target Service       | Auth Required |
|--------|--------------------------|----------------------|---------------|
| POST   | /api/v1/orders           | Order Service (Cmd)  | Yes           |
| GET    | /api/v1/orders/:id       | Order Service (Qry)  | Yes           |
| GET    | /api/v1/orders/:id/history | Order Service (Events) | Yes        |
| POST   | /api/v1/payments         | Payment Service      | Yes           |
| GET    | /api/v1/inventory        | Inventory Service    | No            |
| POST   | /api/v1/auth/login       | Auth Service         | No            |

---

## 2. Service Mesh

### Responsibilities

- **Service-to-service communication** – mTLS, retries, circuit breaking
- **Observability** – metrics (RED metrics), access logs
- **Traffic management** – canary deployments, traffic splitting
- **Security** – mTLS between all pods, fine-grained authorization policies
- **Resilience** – configurable timeouts, retry budgets, circuit breakers

### Topology

```
┌──────────────────────────────────────────────────────────────┐
│                   Kubernetes Cluster                         │
│                                                              │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐            │
│  │ Order    │     │ Payment  │     │Inventory │            │
│  │ Pod      │     │ Pod      │     │ Pod      │            │
│  ├──────────┤     ├──────────┤     ├──────────┤            │
│  │ envoy    │     │ envoy    │     │ envoy    │            │
│  │ sidecar  │     │ sidecar  │     │ sidecar  │            │
│  └────┬─────┘     └────┬─────┘     └────┬─────┘            │
│       │                │                │                   │
│       └────────────────┼────────────────┘                   │
│                        │                                    │
│              ┌─────────▼──────────┐                         │
│              │  Istio Pilot /    │                          │
│              │  Control Plane    │                          │
│              │  (Pilot, Mixer,   │                          │
│              │   Citadel, Galley)│                          │
│              └───────────────────┘                          │
│                                                              │
│  ┌──────────────────────────────────────────┐                │
│  │  Observability Stack                     │                │
│  │  • Prometheus (metrics)                  │                │
│  │  • Grafana (dashboards)                  │                │
│  │  • Jaeger / Zipkin (tracing)             │                │
│  │  • Kiali (mesh visualization)           │                │
│  └──────────────────────────────────────────┘                │
└──────────────────────────────────────────────────────────────┘
```

### Istio Configuration (abbreviated)

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: order-svc-routing
spec:
  hosts:
  - order-svc
  http:
  - match:
    - headers:
        x-canary:
          exact: "true"
    route:
    - destination:
        host: order-svc
        subset: v2
      weight: 100
  - route:
    - destination:
        host: order-svc
        subset: v1
      weight: 90
    - destination:
        host: order-svc
        subset: v2
      weight: 10
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: order-svc-destination
spec:
  host: order-svc
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 1024
        http2MaxRequests: 1024
    loadBalancer:
      simple: ROUND_ROBIN
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 60s
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
---
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: order-svc-authz
spec:
  selector:
    matchLabels:
      app: order-svc
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/default/sa/payment-svc"]
    to:
    - operation:
        methods: ["GET"]
        paths: ["/orders/*"]
```

### Resilience Patterns in the Mesh

| Pattern           | Implementation                                  |
|-------------------|--------------------------------------------------|
| Circuit Breaker   | Outlier detection in DestinationRule             |
| Retry             | VirtualService http.retry                        |
| Timeout           | VirtualService http.timeout                      |
| Bulkhead          | Connection pool limits per host                  |
| Rate Limiting     | Envoy local rate limiting / global rate limit    |

---

## 3. Event Sourcing

### Principles

- **Every state change is an event** – immutable, append-only log
- **Current state is derived** – replay events to reconstruct aggregate state
- **Events are the source of truth** – the database is a derived projection

### Event Store

```
┌─────────────────────────────────────────────────────────────┐
│                    Event Store (Apache Kafka)                │
│                                                             │
│  Topics:                                                    │
│                                                             │
│  ┌──────────────┬────────────────────────────────────────┐  │
│  │ order.events  │  Partition 0 │ Partition 1 │ ...     │  │
│  │              │  (order_id % N)                        │  │
│  ├──────────────┼────────────────────────────────────────┤  │
│  │ payment.events│  Partition 0 │ Partition 1 │ ...     │  │
│  ├──────────────┼────────────────────────────────────────┤  │
│  │ inventory.events│  Partition 0 │ Partition 1 │ ...  │  │
│  └──────────────┴────────────────────────────────────────┘  │
│                                                             │
│  Events retained forever (compacted)                        │
│  Key = aggregate_id → ensures ordering per aggregate        │
└─────────────────────────────────────────────────────────────┘
```

### Order Aggregate Events

```protobuf
syntax = "proto3";

package ecommerce.orders;

message OrderEvent {
  string event_id = 1;
  string order_id = 2;
  string aggregate_type = 3;
  int64 aggregate_version = 4;
  string event_type = 5;  // e.g., "OrderCreated", "OrderShipped"
  google.protobuf.Timestamp occurred_at = 6;
  google.protobuf.Struct payload = 7;
  map<string, string> metadata = 8;  // correlation_id, causation_id, user_id
}

message OrderCreated {
  string customer_id = 1;
  repeated LineItem items = 2;
  Money total = 3;
  Address shipping_address = 4;
}

message OrderItemAdded {
  LineItem item = 1;
}

message OrderItemRemoved {
  string sku = 1;
}

message OrderShipped {
  string tracking_number = 1;
  string carrier = 2;
}

message OrderDelivered {
  google.protobuf.Timestamp delivered_at = 1;
}

message OrderCancelled {
  string reason = 1;
}
```

### Event Sourcing Write Path

```python
# Python-like pseudocode for Order Aggregate
class OrderAggregate:
    def __init__(self):
        self.state = None  # Reconstructed from events
        self.version = 0
        self.uncommitted_events = []

    @staticmethod
    def load_from_history(events: list[Event]) -> "OrderAggregate":
        agg = OrderAggregate()
        for event in events:
            agg.apply(event)
            agg.version += 1
        return agg

    def create_order(self, cmd: CreateOrderCommand) -> Event:
        if self.state is not None:
            raise AggregateAlreadyExists()
        event = OrderCreated(
            customer_id=cmd.customer_id,
            items=cmd.items,
            total=cmd.total,
            shipping_address=cmd.shipping_address,
        )
        self.apply(event)
        self.uncommitted_events.append(event)
        return event

    def ship_order(self, cmd: ShipOrderCommand) -> Event:
        if self.state.status != OrderStatus.PAID:
            raise InvalidStateTransition()
        event = OrderShipped(
            tracking_number=cmd.tracking_number,
            carrier=cmd.carrier,
        )
        self.apply(event)
        self.uncommitted_events.append(event)
        return event

    def apply(self, event: Event):
        # Update internal state based on event type
        match event:
            case OrderCreated():
                self.state = OrderState(
                    status=OrderStatus.PENDING,
                    items=event.items,
                    total=event.total,
                    shipping_address=event.shipping_address,
                )
            case OrderShipped():
                self.state.status = OrderStatus.SHIPPED
                self.state.tracking_number = event.tracking_number


# Command Handler (Write Side)
def handle_create_order_command(cmd: CreateOrderCommand):
    # 1. Load existing events for this order from event store
    existing_events = event_store.load_events(order_id=cmd.order_id)

    # 2. Rebuild aggregate state
    aggregate = OrderAggregate.load_from_history(existing_events)

    # 3. Validate & create new event
    new_event = aggregate.create_order(cmd)

    # 4. Optimistic concurrency: append with expected version
    event_store.append_events(
        aggregate_id=cmd.order_id,
        expected_version=aggregate.version,
        events=aggregate.uncommitted_events,
    )

    # 5. Publish to event bus for subscribers
    event_bus.publish(new_event)
```

### Optimistic Concurrency

```sql
-- PostgreSQL-backed event store (one possible implementation)
CREATE TABLE events (
    aggregate_type TEXT NOT NULL,
    aggregate_id   TEXT NOT NULL,
    version        INT  NOT NULL,
    event_type     TEXT NOT NULL,
    event_data     JSONB NOT NULL,
    metadata       JSONB NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (aggregate_type, aggregate_id, version)
);

-- Append with version check (atomic)
INSERT INTO events (aggregate_type, aggregate_id, version, event_type, event_data, metadata)
VALUES ($1, $2, $3, $4, $5, $6)
WHERE NOT EXISTS (
    SELECT 1 FROM events
    WHERE aggregate_type = $1 AND aggregate_id = $2 AND version = $3
);

-- If row already exists → concurrency conflict → retry or reject
```

---

## 4. CQRS (Command Query Responsibility Segregation)

### Separation of Concerns

```
                    ┌──────────────────────────────────────┐
                    │           Client Application         │
                    └────┬─────────────────────────┬───────┘
                         │                         │
                         ▼                         ▼
              ┌──────────────────┐      ┌──────────────────┐
              │   Command Side   │      │    Query Side     │
              │   (Write Model)  │      │   (Read Model)    │
              │                  │      │                  │
              │  • Handles       │      │  • Handles       │
              │    mutations     │      │    queries       │
              │  • Validates     │      │  • Returns       │
              │    business      │      │    denormalized  │
              │    rules         │      │    DTOs          │
              │  • Emits events  │      │  • Fast reads    │
              │  • ACID within   │      │  • No side       │
              │    aggregate     │      │    effects       │
              └────────┬─────────┘      └────────┬─────────┘
                       │                         │
                       │  Event Stream            │  Read Store
                       │  (Kafka topic)           │  (PostgreSQL /
                       ▼                          │   Elasticsearch)
              ┌──────────────────┐                │
              │  Projector /     │────────────────┘
              │  Event Handler   │
              │                  │
              │  • Consumes      │
              │    events        │
              │  • Updates       │
              │    read models   │
              │  • Idempotent    │
              └──────────────────┘
```

### Command Side (Write Model)

- **Commands are imperatives** – "create order", "cancel order"
- **Single writer per aggregate** – ensures consistency
- **Eventual consistency** between write and read models is tolerated

```python
# Command models
@dataclass
class CreateOrderCommand:
    order_id: str
    customer_id: str
    items: list[LineItem]
    total: Money
    shipping_address: Address
    idempotency_key: str  # For exactly-once semantics

@dataclass
class CancelOrderCommand:
    order_id: str
    reason: str
    cancelled_by: str
```

### Query Side (Read Model)

- **Read models are denormalized** – optimized for specific query patterns
- **Multiple read models per aggregate** – different views for different use cases
- **No business logic** in query handlers – just data retrieval

```sql
-- Read model: Order Summary (denormalized for list queries)
CREATE MATERIALIZED VIEW order_summary AS
SELECT
    oa.order_id,
    oa.customer_id,
    oa.customer_name,
    oa.status,
    oa.total_amount,
    oa.total_currency,
    oa.item_count,
    oa.created_at,
    oa.updated_at,
    oa.shipping_city,
    oa.shipping_country,
    COALESCE(pay.status, 'unpaid') AS payment_status,
    COALESCE(ship.tracking_number, '') AS tracking_number
FROM order_aggregate oa
LEFT JOIN payment_status pay USING (order_id)
LEFT JOIN shipment_info ship USING (order_id);
```

### Projectors (Event → Read Model)

```python
class OrderSummaryProjector:
    """Consumes OrderEvents and updates the order_summary read model."""

    def __init__(self, db_session, event_store):
        self.db = db_session
        self.event_store = event_store

    async def handle(self, event: OrderEvent):
        # Idempotency: check if already processed
        if await self._is_processed(event.event_id):
            return

        async with self.db.transaction():
            match event.event_type:
                case "OrderCreated":
                    await self._handle_created(event)
                case "OrderShipped":
                    await self._handle_shipped(event)
                case "OrderDelivered":
                    await self._handle_delivered(event)
                case "OrderCancelled":
                    await self._handle_cancelled(event)

            # Record processing to enable exactly-once
            await self._mark_processed(event.event_id)

    async def _handle_created(self, event: OrderEvent):
        payload = OrderCreated(**event.payload)
        await self.db.execute("""
            INSERT INTO order_summary
                (order_id, customer_id, status, total_amount, total_currency,
                 item_count, created_at, updated_at, shipping_city, shipping_country)
            VALUES ($1, $2, 'PENDING', $3, $4, $5, $6, $6, $7, $8)
        """, event.order_id, payload.customer_id,
            payload.total.amount, payload.total.currency,
            len(payload.items), event.occurred_at,
            payload.shipping_address.city, payload.shipping_address.country,
        )

    async def _handle_shipped(self, event):
        payload = OrderShipped(**event.payload)
        await self.db.execute(
            "UPDATE order_summary SET status = 'SHIPPED', updated_at = $1 WHERE order_id = $2",
            event.occurred_at, event.order_id,
        )
```

### CQRS Read Service API

```python
# FastAPI-based read service
from fastapi import FastAPI, Query

app = FastAPI(title="Order Query Service")

@app.get("/api/v1/orders/{order_id}")
async def get_order(order_id: str, customer_id: str = Query(None)):
    """Returns the full order summary from the read model."""
    query = "SELECT * FROM order_summary WHERE order_id = $1"
    if customer_id:
        query += " AND customer_id = $2"
    row = await db.fetchrow(query, order_id, customer_id)
    return OrderSummaryDTO(**row)

@app.get("/api/v1/orders")
async def list_orders(
    customer_id: str,
    status: str = Query(None),
    limit: int = Query(20, le=100),
    offset: int = Query(0),
):
    """Lists orders with filtering and pagination. No write-side overhead."""
    conditions = ["customer_id = $1"]
    params = [customer_id]
    if status:
        conditions.append("status = $2")
        params.append(status)
    rows = await db.fetch(
        f"SELECT * FROM order_summary WHERE {' AND '.join(conditions)} "
        f"ORDER BY created_at DESC LIMIT ${len(params)+1} OFFSET ${len(params)+2}",
        *params, limit, offset,
    )
    return [OrderSummaryDTO(**r) for r in rows]

@app.get("/api/v1/orders/{order_id}/events")
async def get_order_events(order_id: str):
    """Returns the full event history for an order (from event store)."""
    events = await event_store.load_events(order_id)
    return [EventDTO.from_event(e) for e in events]
```

### Data Consistency Strategy

| Aspect              | Approach                                              |
|---------------------|-------------------------------------------------------|
| Consistency model   | **Eventual consistency** between write and read sides |
| Staleness           | Read models typically < 100ms behind writes           |
| Conflict resolution | Last-writer-wins per read model field                 |
| Failure handling    | Projector restarts from last committed offset         |
| Exactly-once        | Idempotent projections + dedup table                  |

---

## 5. Distributed Tracing

### Trace Model

```
Trace (root span)
│
├── Span: API Gateway receive request
│   ├── Span: JWT validation
│   ├── Span: Rate limit check
│   └── Span: Route to Order Service
│       └── Span: Order Service handle command
│           ├── Span: Validate command
│           ├── Span: Load aggregate events (parent: handle command)
│           ├── Span: Append new event (parent: handle command)
│           └── Span: Publish event to Kafka (parent: handle command)
│               └── Span: Kafka produce (parent: publish event)
│                   └── Span: OrderSummaryProjector consume
│                       ├── Span: Deserialize event
│                       └── Span: Update read model (DB write)
```

### Context Propagation Headers

```yaml
# W3C Trace Context (Traceparent / Tracestate)
traceparent: 00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01
#   │  │           trace-id                   span-id         trace-flags
#   │  └─ version
#   └── version

tracestate: vendor1=value1,vendor2=value2

# Also supported: Uber's b3 headers or Lightstep's ottracer
```

### OpenTelemetry Instrumentation (Python)

```python
# tracing.py — shared tracing initialization
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.instrumentation.kafka import KafkaInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor

def setup_tracing(service_name: str, otlp_endpoint: str = "http://otel-collector:4317"):
    provider = TracerProvider(resource=Resource.create({
        "service.name": service_name,
        "service.version": os.getenv("VERSION", "1.0.0"),
        "deployment.environment": os.getenv("ENV", "development"),
    }))
    processor = BatchSpanProcessor(OTLPSpanExporter(endpoint=otlp_endpoint))
    provider.add_span_processor(processor)
    trace.set_tracer_provider(provider)
    return provider


# order_service/main.py
from tracing import setup_tracing

provider = setup_tracing("order-service")
FastAPIInstrumentor.instrument_app(app)
HTTPXClientInstrumentor().instrument()
KafkaInstrumentor().instrument()
SQLAlchemyInstrumentor().instrument()

tracer = trace.get_tracer(__name__)

@app.post("/api/v1/orders")
async def create_order(cmd: CreateOrderRequest):
    with tracer.start_as_current_span("create_order_handler") as span:
        span.set_attribute("order_id", cmd.order_id)
        span.set_attribute("customer_id", cmd.customer_id)

        # Propagate context to downstream calls
        with tracer.start_as_current_span("validate_payment_method") as child:
            child.set_attribute("payment_method", cmd.payment_method)
            response = await http_client.post(
                "http://payment-svc/api/v1/validate",
                json={"method": cmd.payment_method},
                headers=inject_trace_headers(),  # Propagate trace context
            )

        # ... rest of handler
        return result
```

### Headers Propagation Helper

```python
from opentelemetry.propagate import inject

def inject_trace_headers() -> dict:
    """Inject trace context into outgoing request headers."""
    headers = {}
    inject(headers)
    return headers
```

### OpenTelemetry Collector Configuration

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 1s
    send_batch_size: 1024
  attributes:
    actions:
    - key: environment
      value: production
      action: upsert
  memory_limiter:
    check_interval: 1s
    limit_mib: 512
    spike_limit_mib: 128

exporters:
  jaeger:
    endpoint: jaeger-collector:14250
    tls:
      insecure: true
  prometheus:
    endpoint: 0.0.0.0:8889
  debug:
    verbosity: basic

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [jaeger, debug]
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [prometheus, debug]
```

### Trace Sampling

```yaml
# Tail-based sampling in the collector
processors:
  tail_sampling:
    decision_wait: 30s
    num_traces: 100000
    expected_new_traces_per_sec: 1000
    policies:
      # Always sample errors
      - name: errors-policy
        type: status_code
        properties:
          status_codes:
            - ERROR
            - UNSET
      # Always sample slow requests
      - name: slow-policy
        type: latency
        properties:
          threshold_ms: 500
      # Sample high-value endpoints at higher rate
      - name: high-value-endpoints
        type: string_attribute
        properties:
          key: http.target
          values:
            - /api/v1/orders/*
            - /api/v1/payments/*
          min_number_of_span_attributes: 1

  # Head-based probabilistic sampling
  probabilistic_sampler:
    sampling_percentage: 10  # Sample 10% of all traces
```

### Visualization (Jaeger / Grafana Tempo)

```
                              ┌─────────────────┐
                              │    Grafana       │
                              │   (Unified UI)   │
                              └────────┬────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
                    ▼                  ▼                  ▼
            ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
            │   Jaeger     │  │   Tempo      │  │   Prometheus  │
            │   (Traces)   │  │   (Traces)   │  │   (Metrics)   │
            └──────────────┘  └──────────────┘  └──────────────┘
                       │              │                  │
                       └──────────────┼──────────────────┘
                                      ▼
                          ┌──────────────────────┐
                          │ OpenTelemetry        │
                          │ Collector            │
                          └──────────────────────┘
                                   │
                                   ▼
                          ┌──────────────────────┐
                          │ Instrumented Services│
                          │ (gRPC, HTTP, Kafka)  │
                          └──────────────────────┘
```

---

## 6. End-to-End Flow: Place Order

### Sequence Diagram

```
Client     API Gateway    Auth Svc   Order Svc(Cmd)   Event Store   Payment Svc   Order Proj.   Read DB
  │             │            │            │               │             │             │            │
  │  POST /orders           │            │               │             │             │            │
  │────────────►            │            │               │             │             │            │
  │             │  Auth JWT │            │               │             │             │            │
  │             ├──────────►│            │               │             │             │            │
  │             │◄──────────┤            │               │             │             │            │
  │             │           │            │               │             │             │            │
  │             │  Route to Order Svc    │               │             │             │            │
  │             ├───────────────────────►│               │             │             │            │
  │             │           │            │  Load events  │             │             │            │
  │             │           │            ├──────────────►│             │             │            │
  │             │           │            │◄──────────────┤             │             │            │
  │             │           │            │               │             │             │            │
  │             │           │            │  Append event │             │             │            │
  │             │           │            ├──────────────►│             │             │            │
  │             │           │            │◄──────────────┤             │             │            │
  │             │           │            │               │             │             │            │
  │             │           │            │  Publish evt  │             │             │            │
  │             │           │            │──────────────►│             │             │            │
  │             │           │            │               │  Consume    │             │            │
  │             │           │            │               ├────────────►│             │            │
  │             │           │            │               │             │  Process    │            │
  │             │           │            │               │             ├────────────►│            │
  │             │           │            │               │             │             │  Update    │
  │             │           │            │               │             │             ├───────────►│
  │ 201 Created │           │            │               │             │             │            │
  │◄────────────┤           │            │               │             │             │            │
  │             │           │            │               │             │             │            │
  │  GET /orders/123        │            │               │             │             │            │
  │────────────►            │            │               │             │             │            │
  │             │  Route to Read Svc    │               │             │             │            │
  │             ├────────────────────────────────────────────────────────────────────►│            │
  │             │           │            │               │             │             │  SELECT    │
  │             │◄────────────────────────────────────────────────────────────────────┤            │
  │◄────────────┤           │            │               │             │             │            │
```

### Detailed Trace with Span Attributes

```json
{
  "traceId": "0af7651916cd43dd8448eb211c80319c",
  "spans": [
    {
      "spanId": "b7ad6b7169203331",
      "parentSpanId": null,
      "name": "POST /api/v1/orders",
      "kind": "SERVER",
      "service": "api-gateway",
      "attributes": {
        "http.method": "POST",
        "http.target": "/api/v1/orders",
        "http.status_code": 201,
        "net.peer.ip": "203.0.113.42",
        "user.id": "usr_abc123"
      },
      "startTime": "2026-06-27T10:00:00.000Z",
      "endTime": "2026-06-27T10:00:00.450Z",
      "status": { "code": "OK" }
    },
    {
      "spanId": "8c5f7a2e1d4b9f03",
      "parentSpanId": "b7ad6b7169203331",
      "name": "jwt_authn",
      "kind": "INTERNAL",
      "service": "api-gateway",
      "attributes": {
        "jwt.sub": "usr_abc123",
        "jwt.roles": "customer",
        "auth.result": "valid"
      },
      "startTime": "2026-06-27T10:00:00.010Z",
      "endTime": "2026-06-27T10:00:00.025Z"
    },
    {
      "spanId": "3e1a8c4b6f2d7905",
      "parentSpanId": "b7ad6b7169203331",
      "name": "handle_create_order",
      "kind": "SERVER",
      "service": "order-service",
      "attributes": {
        "order.id": "ord_456",
        "order.customer_id": "usr_abc123",
        "order.item_count": 3,
        "order.total": "149.99",
        "messaging.system": "kafka",
        "messaging.destination": "order.events"
      },
      "startTime": "2026-06-27T10:00:00.035Z",
      "endTime": "2026-06-27T10:00:00.210Z"
    },
    {
      "spanId": "f9072b4a1c6e8d03",
      "parentSpanId": "3e1a8c4b6f2d7905",
      "name": "load_aggregate_events",
      "kind": "CLIENT",
      "service": "order-service",
      "attributes": {
        "db.system": "postgresql",
        "db.operation": "SELECT",
        "db.aggregate_id": "ord_456",
        "db.aggregate_version": 0,
        "db.row_count": 0
      },
      "startTime": "2026-06-27T10:00:00.040Z",
      "endTime": "2026-06-27T10:00:00.055Z"
    },
    {
      "spanId": "5d2b8f1a7c4e0693",
      "parentSpanId": "3e1a8c4b6f2d7905",
      "name": "append_event OrderCreated",
      "kind": "CLIENT",
      "service": "order-service",
      "attributes": {
        "db.system": "postgresql",
        "db.operation": "INSERT",
        "db.aggregate_id": "ord_456",
        "db.aggregate_version": 1,
        "event.type": "OrderCreated"
      },
      "startTime": "2026-06-27T10:00:00.060Z",
      "endTime": "2026-06-27T10:00:00.080Z"
    },
    {
      "spanId": "a1c3e5b7d9f20846",
      "parentSpanId": "3e1a8c4b6f2d7905",
      "name": "kafka_produce order.events",
      "kind": "PRODUCER",
      "service": "order-service",
      "attributes": {
        "messaging.system": "kafka",
        "messaging.destination": "order.events",
        "messaging.kafka.partition": 2,
        "messaging.kafka.offset": 15042
      },
      "startTime": "2026-06-27T10:00:00.085Z",
      "endTime": "2026-06-27T10:00:00.100Z"
    },
    {
      "spanId": "6e8f2a4c1d7b0593",
      "parentSpanId": "a1c3e5b7d9f20846",
      "name": "order_summary_projector",
      "kind": "CONSUMER",
      "service": "order-projector",
      "attributes": {
        "messaging.system": "kafka",
        "messaging.destination": "order.events",
        "messaging.kafka.partition": 2,
        "messaging.kafka.offset": 15042,
        "event.type": "OrderCreated",
        "event.aggregate_id": "ord_456"
      },
      "startTime": "2026-06-27T10:00:00.105Z",
      "endTime": "2026-06-27T10:00:00.145Z"
    },
    {
      "spanId": "b8d0f2a4c6e81937",
      "parentSpanId": "6e8f2a4c1d7b0593",
      "name": "db_update order_summary",
      "kind": "CLIENT",
      "service": "order-projector",
      "attributes": {
        "db.system": "postgresql",
        "db.operation": "INSERT",
        "db.table": "order_summary",
        "db.row_count": 1
      },
      "startTime": "2026-06-27T10:00:00.115Z",
      "endTime": "2026-06-27T10:00:00.130Z"
    }
  ]
}
```

---

## 7. Technology Stack Summary

| Layer                 | Technology                            | Purpose                      |
|-----------------------|---------------------------------------|------------------------------|
| API Gateway           | Envoy / Kong                          | TLS, auth, routing           |
| Service Mesh          | Istio / Linkerd                       | mTLS, traffic mgmt, ops     |
| Service Runtime       | Kubernetes + Docker                   | Orchestration                |
| Event Store           | Apache Kafka / Pulsar / NATS JetStream | Durable event log           |
| Command Side (Write)  | Python (FastAPI) / Go / Java Quarkus  | Business logic, validation   |
| Query Side (Read)     | Python (FastAPI) / Node.js            | Fast reads, denormalized DTOs|
| Projectors            | Kafka Streams / Flink / Python        | Event → read model pipeline  |
| Read Database         | PostgreSQL (materialized views) / Elasticsearch / Redis | Query-optimized storage |
| Tracing               | OpenTelemetry + Jaeger / Grafana Tempo | Distributed traces          |
| Observability         | Prometheus + Grafana + Loki           | Metrics, logs, dashboards    |
| Service Discovery     | Kubernetes DNS + Istio DNS            | Dynamic routing              |

---

## 8. Deployment Architecture (Kubernetes)

```yaml
# order-service.yaml (deployment)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
  labels:
    app: order-service
    tier: backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
        version: v1
      annotations:
        sidecar.istio.io/inject: "true"
        instrumentation.opentelemetry.io/inject-python: "true"
    spec:
      serviceAccountName: order-svc
      containers:
      - name: order-service
        image: myrepo/order-service:1.2.3
        ports:
        - containerPort: 8080
          protocol: TCP
        env:
        - name: OTEL_SERVICE_NAME
          value: "order-service"
        - name: OTEL_EXPORTER_OTLP_ENDPOINT
          value: "http://otel-collector:4317"
        - name: KAFKA_BOOTSTRAP_SERVERS
          value: "kafka-cluster:9092"
        - name: EVENT_STORE_URL
          value: "postgresql://events-db:5432/eventstore"
        resources:
          requests:
            cpu: "250m"
            memory: "512Mi"
          limits:
            cpu: "1"
            memory: "1Gi"
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8080
          initialDelaySeconds: 10
        readinessProbe:
          httpGet:
            path: /readyz
            port: 8080
          initialDelaySeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: order-svc
spec:
  selector:
    app: order-service
  ports:
  - name: http
    port: 8080
    targetPort: 8080
```

---

## 9. Security Considerations

| Area                 | Implementation                                     |
|----------------------|----------------------------------------------------|
| mTLS                 | Istio automatic mTLS between all services          |
| JWT Auth             | API Gateway validates JWT, passes claims in headers |
| Event integrity      | Append-only log, event signing (optional)          |
| Read model access    | Separate read service with its own auth policy     |
| Secrets              | Kubernetes Secrets / Vault                         |
| Audit trail          | Event store = complete audit log by design         |

---

## 10. Failure Scenarios & Mitigations

| Scenario                    | Impact                              | Mitigation                                         |
|-----------------------------|--------------------------------------|----------------------------------------------------|
| Event Store down            | Cannot create new writes             | Circuit breaker in command handler; retry; queue   |
| Read DB down                | Query failures                       | Fallback to event store replay (slow)              |
| Projector crash / lag       | Stale read models                    | Idempotent replays from latest offset              |
| Duplicate events            | Inconsistent projections             | Idempotency keys + dedup table in projectors       |
| Service mesh control plane down | mTLS cert refresh fails          | Cached certs valid for 24h                         |
| Network partition           | Split-brain commands                 | Kafka quorum-based leader election                 |

---

## 11. Key Metrics & SLIs

| Metric                           | Source              | Target              |
|----------------------------------|---------------------|---------------------|
| Write latency (p99)              | Order Svc traces    | < 200ms             |
| Read latency (p99)               | Read Svc traces     | < 50ms              |
| Event propagation delay (p99)    | Kafka consumer lag  | < 500ms             |
| Projector lag (events behind)    | Kafka consumer lag  | < 1000 events       |
| Trace ingestion rate             | OTel Collector      | 10k spans/sec       |
| mTLS handshake failure rate      | Istio metrics       | < 0.01%             |

---

## 12. Getting Started (Local Development)

```bash
# 1. Infrastructure
docker compose up -d kafka postgres otel-collector jaeger prometheus grafana

# 2. Services (each in its own terminal)
cd services/auth-service && python -m uvicorn main:app --port 8001
cd services/order-service && python -m uvicorn main:app --port 8002
cd services/payment-service && python -m uvicorn main:app --port 8003
cd services/order-projector && python -m main
cd services/read-service && python -m uvicorn main:app --port 8010

# 3. Observability
open http://localhost:16686  # Jaeger UI
open http://localhost:3000   # Grafana
open http://localhost:20001  # Kiali (if Istio installed)
```

### Docker Compose for Local Dev

```yaml
# docker-compose.yml
version: "3.9"
services:
  zookeeper:
    image: confluentinc/cp-zookeeper:latest
    ports: ["2181:2181"]
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181

  kafka:
    image: confluentinc/cp-kafka:latest
    ports: ["9092:9092"]
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
    depends_on: [zookeeper]

  postgres-events:
    image: postgres:16
    ports: ["5432:5432"]
    environment:
      POSTGRES_DB: eventstore
      POSTGRES_USER: events
      POSTGRES_PASSWORD: events_pass

  postgres-read:
    image: postgres:16
    ports: ["5433:5432"]
    environment:
      POSTGRES_DB: readstore
      POSTGRES_USER: reader
      POSTGRES_PASSWORD: reader_pass

  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    ports: ["4317:4317", "4318:4318"]
    volumes:
      - ./otel-collector-config.yaml:/etc/otel/config.yaml
    command: ["--config", "/etc/otel/config.yaml"]

  jaeger:
    image: jaegertracing/all-in-one:latest
    ports: ["16686:16686", "14250:14250"]
    environment:
      COLLECTOR_OTLP_ENABLED: "true"

  prometheus:
    image: prom/prometheus:latest
    ports: ["9090:9090"]
    volumes:
      - ./prometheus.yaml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana:latest
    ports: ["3000:3000"]
    environment:
      GF_AUTH_ANONYMOUS_ENABLED: "true"
```

---

## Summary

This architecture provides:

| Requirement          | How It's Met                                                    |
|----------------------|-----------------------------------------------------------------|
| **API Gateway**      | Single entry point handling auth, rate limiting, routing         |
| **Service Mesh**     | Istio handles mTLS, traffic splitting, circuit breaking, metrics |
| **Event Sourcing**   | Kafka-based append-only event log as system of record            |
| **CQRS**             | Separate write (command) and read (query) services + projectors  |
| **Distributed Tracing** | OpenTelemetry + Jaeger providing end-to-end trace visibility  |

The design favors **eventual consistency** between write and read sides, with the event store serving as the immutable source of truth. All services are independently deployable, and the mesh provides resilience, observability, and security at the infrastructure layer.
