// ─── Service Registry Types ────────────────────────────────────────────────

export interface ServiceInstance {
  id: string;
  name: string;
  version: string;
  host: string;
  port: number;
  metadata?: Record<string, string>;
  status: 'UP' | 'DOWN' | 'OUT_OF_SERVICE';
  registeredAt: number;
  lastHeartbeat: number;
  ttl: number; // seconds
}

export type ServiceStatus = ServiceInstance['status'];

export interface RegisterServiceRequest {
  name: string;
  version: string;
  host: string;
  port: number;
  metadata?: Record<string, string>;
  ttl?: number;
}

export interface HeartbeatRequest {
  serviceId: string;
  status?: ServiceStatus;
}

export interface ServiceQuery {
  name?: string;
  status?: ServiceStatus;
  version?: string;
}

// ─── Event Sourcing Types ──────────────────────────────────────────────────

export type EventType =
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_DELETED'
  | 'ORDER_CREATED'
  | 'ORDER_UPDATED'
  | 'ORDER_CANCELLED'
  | 'PAYMENT_PROCESSED'
  | 'PAYMENT_REFUNDED'
  | 'PAYMENT_FAILED';

export interface DomainEvent<T = unknown> {
  eventId: string;
  eventType: EventType;
  aggregateId: string;
  aggregateType: string;
  version: number;
  data: T;
  metadata: EventMetadata;
  timestamp: number;
}

export interface EventMetadata {
  correlationId: string;
  causationId?: string;
  userId?: string;
  source: string;
  traceId?: string;
}

export interface EventEnvelope extends DomainEvent {
  streamId: string;
  streamPosition: number;
  globalPosition: number;
}

export interface EventStream {
  streamId: string;
  aggregateType: string;
  aggregateId: string;
  currentVersion: number;
  events: EventEnvelope[];
  createdAt: number;
  updatedAt: number;
}

export interface Subscription {
  id: string;
  subscriberName: string;
  eventTypes: EventType[];
  callbackUrl: string;
  createdAt: number;
}

// ─── API Gateway Types ─────────────────────────────────────────────────────

export interface RouteDefinition {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  targetService: string;
  targetPath: string;
  rateLimit?: {
    windowMs: number;
    maxRequests: number;
  };
  circuitBreaker?: {
    failureThreshold: number;
    resetTimeoutMs: number;
  };
  auth?: boolean;
  requiredRole?: string;
}

export interface GatewayConfig {
  port: number;
  registryUrl: string;
  routes: RouteDefinition[];
}

export interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// ─── Common API Types ──────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    timestamp: number;
    requestId: string;
    serviceVersion: string;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ─── Service-specific Events ───────────────────────────────────────────────

export interface UserCreatedEvent {
  userId: string;
  email: string;
  name: string;
  role: string;
}

export interface UserUpdatedEvent {
  userId: string;
  changes: Partial<{
    email: string;
    name: string;
    role: string;
  }>;
}

export interface OrderCreatedEvent {
  orderId: string;
  userId: string;
  items: OrderItem[];
  total: number;
  currency: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface PaymentProcessedEvent {
  paymentId: string;
  orderId: string;
  userId: string;
  amount: number;
  currency: string;
  status: 'success' | 'failed';
  transactionId: string;
}

export interface PaymentRefundedEvent {
  paymentId: string;
  orderId: string;
  amount: number;
  reason: string;
}

// ─── HTTP Client Types ────────────────────────────────────────────────────

export interface HttpClientConfig {
  baseUrl?: string;
  timeout?: number;
  headers?: Record<string, string>;
  retries?: number;
  circuitBreaker?: {
    failureThreshold: number;
    resetTimeoutMs: number;
  };
}
