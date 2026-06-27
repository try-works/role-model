import { createServer, IncomingMessage, ServerResponse } from 'http';
import { EventStore } from './store';
import { DomainEvent, EventType, now, generateId } from '@microservices/shared';

export class EventStoreServer {
  private server;
  private store: EventStore;

  constructor(private port: number = 3002) {
    this.store = new EventStore();
    this.server = createServer((req, res) => this.handleRequest(req, res));
  }

  start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.port, () => {
        console.log(`[EventStore] Event Store listening on port ${this.port}`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      this.server.close(() => resolve());
    });
  }

  getStore(): EventStore {
    return this.store;
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
      console.error('[EventStore] Error:', err);
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

    // Health check
    if (path === '/health' && method === 'GET') {
      return this.sendJson(res, 200, { success: true, data: { status: 'UP' } });
    }

    // Stats
    if (path === '/stats' && method === 'GET') {
      return this.sendJson(res, 200, { success: true, data: this.store.getStats() });
    }

    // ─── Events CRUD ──────────────────────────────────────────────────────

    // POST /events - append events to a stream
    if (path === '/events' && method === 'POST') {
      const body = await this.parseBody<{
        aggregateType: string;
        aggregateId: string;
        events: DomainEvent[];
        expectedVersion?: number;
      }>(req);

      if (!body.aggregateType || !body.aggregateId || !body.events?.length) {
        return this.sendJson(res, 400, {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'aggregateType, aggregateId, and events[] are required' },
        });
      }

      const result = this.store.appendToStream(
        body.aggregateType,
        body.aggregateId,
        body.events,
        body.expectedVersion
      );

      if (!result.success) {
        return this.sendJson(res, 409, {
          success: false,
          error: { code: 'CONCURRENCY_CONFLICT', message: result.error },
        });
      }

      return this.sendJson(res, 201, {
        success: true,
        data: result.stream,
      });
    }

    // GET /events - query events
    if (path === '/events' && method === 'GET') {
      const aggregateType = url.searchParams.get('aggregateType');
      const aggregateId = url.searchParams.get('aggregateId');
      const eventTypes = url.searchParams.get('eventTypes');
      const fromPosition = parseInt(url.searchParams.get('fromPosition') || '1', 10);
      const limit = parseInt(url.searchParams.get('limit') || '100', 10);

      let events;

      if (aggregateType && aggregateId) {
        // Stream-specific events
        events = this.store.readStreamEvents(aggregateType, aggregateId, fromPosition, limit);
      } else if (eventTypes) {
        // Filter by event types
        const types = eventTypes.split(',').map(t => t.trim()) as EventType[];
        events = this.store.readEventsByType(types, fromPosition, limit);
      } else {
        // All events
        events = this.store.readAllEvents(fromPosition, limit);
      }

      return this.sendJson(res, 200, {
        success: true,
        data: events,
        meta: { count: events.length, timestamp: now() },
      });
    }

    // GET /events/streams - list all streams
    if (path === '/events/streams' && method === 'GET') {
      const streams = this.store.getAllStreams().map(s => ({
        streamId: s.streamId,
        aggregateType: s.aggregateType,
        aggregateId: s.aggregateId,
        currentVersion: s.currentVersion,
        eventCount: s.events.length,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      }));

      return this.sendJson(res, 200, { success: true, data: streams });
    }

    // GET /events/stream/:aggregateType/:aggregateId - get single stream
    const streamMatch = path.match(/^\/events\/stream\/([^/]+)\/([^/]+)$/);
    if (streamMatch && method === 'GET') {
      const [, aggType, aggId] = streamMatch;
      const stream = this.store.readStream(aggType, aggId);
      if (!stream) {
        return this.sendJson(res, 404, {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Stream not found' },
        });
      }
      return this.sendJson(res, 200, { success: true, data: stream });
    }

    // ─── Subscriptions ───────────────────────────────────────────────────

    // POST /subscriptions
    if (path === '/subscriptions' && method === 'POST') {
      const body = await this.parseBody<{
        subscriberName: string;
        eventTypes: EventType[];
        callbackUrl: string;
      }>(req);

      if (!body.subscriberName || !body.eventTypes?.length || !body.callbackUrl) {
        return this.sendJson(res, 400, {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'subscriberName, eventTypes[], and callbackUrl are required' },
        });
      }

      const sub = this.store.createSubscription(body.subscriberName, body.eventTypes, body.callbackUrl);
      return this.sendJson(res, 201, { success: true, data: sub });
    }

    // GET /subscriptions
    if (path === '/subscriptions' && method === 'GET') {
      return this.sendJson(res, 200, { success: true, data: this.store.getSubscriptions() });
    }

    // DELETE /subscriptions/:id
    if (path.startsWith('/subscriptions/') && method === 'DELETE') {
      const subId = path.split('/').pop()!;
      const removed = this.store.removeSubscription(subId);
      return this.sendJson(res, removed ? 200 : 404, {
        success: removed,
        ...(removed ? {} : { error: { code: 'NOT_FOUND', message: 'Subscription not found' } }),
      });
    }

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
