import { IncomingMessage, ServerResponse } from 'http';
import { BaseService } from '@microservices/shared';

interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  total: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: number;
  updatedAt: number;
}

export class OrderService extends BaseService {
  private orders: Map<string, Order> = new Map();

  async handleServiceRoute(
    req: IncomingMessage,
    res: ServerResponse,
    path: string,
    method: string,
    body: string | null
  ): Promise<void> {
    // GET /orders - list all orders (with optional userId filter)
    if (path === '/orders' && method === 'GET') {
      const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
      const userId = url.searchParams.get('userId');
      const status = url.searchParams.get('status');

      let orders = Array.from(this.orders.values());
      if (userId) orders = orders.filter(o => o.userId === userId);
      if (status) orders = orders.filter(o => o.status === status);

      return this.sendJson(res, 200, {
        success: true,
        data: orders,
        meta: { count: orders.length },
      });
    }

    // GET /orders/:id
    const getMatch = path.match(/^\/orders\/([^/]+)$/);
    if (getMatch && method === 'GET') {
      const order = this.orders.get(getMatch[1]);
      if (!order) {
        return this.sendJson(res, 404, {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Order not found' },
        });
      }
      return this.sendJson(res, 200, { success: true, data: order });
    }

    // POST /orders - create order
    if (path === '/orders' && method === 'POST') {
      if (!body) {
        return this.sendJson(res, 400, {
          success: false,
          error: { code: 'BODY_REQUIRED', message: 'Request body is required' },
        });
      }

      const data = JSON.parse(body);
      if (!data.userId || !data.items?.length) {
        return this.sendJson(res, 400, {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'userId and items[] are required' },
        });
      }

      const total = data.items.reduce(
        (sum: number, item: OrderItem) => sum + item.quantity * item.unitPrice,
        0
      );

      const id = `ord_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const order: Order = {
        id,
        userId: data.userId,
        items: data.items,
        total,
        currency: data.currency || 'USD',
        status: 'pending',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      this.orders.set(id, order);

      await this.emitEvent('ORDER_CREATED', {
        orderId: id,
        userId: data.userId,
        items: data.items,
        total,
        currency: order.currency,
      });

      return this.sendJson(res, 201, {
        success: true,
        data: order,
        meta: { event: 'ORDER_CREATED' },
      });
    }

    // PUT /orders/:id - update order (status changes)
    const putMatch = path.match(/^\/orders\/([^/]+)$/);
    if (putMatch && method === 'PUT') {
      const order = this.orders.get(putMatch[1]);
      if (!order) {
        return this.sendJson(res, 404, {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Order not found' },
        });
      }

      if (!body) {
        return this.sendJson(res, 400, {
          success: false,
          error: { code: 'BODY_REQUIRED', message: 'Request body is required' },
        });
      }

      const data = JSON.parse(body);
      const changes: Record<string, unknown> = {};

      if (data.status) {
        const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
        if (!validStatuses.includes(data.status)) {
          return this.sendJson(res, 400, {
            success: false,
            error: { code: 'INVALID_STATUS', message: `Status must be one of: ${validStatuses.join(', ')}` },
          });
        }
        order.status = data.status;
        changes.status = data.status;
      }

      order.updatedAt = Date.now();

      await this.emitEvent('ORDER_UPDATED', {
        orderId: order.id,
        userId: order.userId,
        changes,
      });

      return this.sendJson(res, 200, { success: true, data: order });
    }

    // DELETE /orders/:id - cancel order
    const deleteMatch = path.match(/^\/orders\/([^/]+)$/);
    if (deleteMatch && method === 'DELETE') {
      const order = this.orders.get(deleteMatch[1]);
      if (!order) {
        return this.sendJson(res, 404, {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Order not found' },
        });
      }

      order.status = 'cancelled';
      order.updatedAt = Date.now();

      await this.emitEvent('ORDER_CANCELLED', {
        orderId: order.id,
        userId: order.userId,
      });

      return this.sendJson(res, 200, {
        success: true,
        data: order,
        meta: { event: 'ORDER_CANCELLED' },
      });
    }

    return this.sendJson(res, 404, {
      success: false,
      error: { code: 'NOT_FOUND', message: `Route ${method} ${path} not found` },
    });
  }

  private async emitEvent(eventType: string, data: unknown): Promise<void> {
    try {
      const eventStoreUrl = process.env.EVENT_STORE_URL || 'http://localhost:3002';
      await fetch(`${eventStoreUrl}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aggregateType: 'order',
          aggregateId: (data as any).orderId || 'unknown',
          events: [{
            eventId: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            eventType,
            aggregateId: (data as any).orderId || 'unknown',
            aggregateType: 'order',
            version: 1,
            data,
            metadata: {
              correlationId: `corr_${Date.now()}`,
              source: 'order-service',
              timestamp: Date.now(),
            },
            timestamp: Date.now(),
          }],
        }),
      });
    } catch (err) {
      console.error(`[OrderService] Failed to emit event:`, err);
    }
  }
}
