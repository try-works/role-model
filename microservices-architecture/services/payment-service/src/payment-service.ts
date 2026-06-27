import { IncomingMessage, ServerResponse } from 'http';
import { BaseService } from '@microservices/shared';

interface Payment {
  id: string;
  orderId: string;
  userId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'success' | 'failed' | 'refunded';
  transactionId: string;
  createdAt: number;
  updatedAt: number;
}

export class PaymentService extends BaseService {
  private payments: Map<string, Payment> = new Map();

  async handleServiceRoute(
    req: IncomingMessage,
    res: ServerResponse,
    path: string,
    method: string,
    body: string | null
  ): Promise<void> {
    // GET /payments - list payments
    if (path === '/payments' && method === 'GET') {
      const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
      const orderId = url.searchParams.get('orderId');
      const userId = url.searchParams.get('userId');

      let payments = Array.from(this.payments.values());
      if (orderId) payments = payments.filter(p => p.orderId === orderId);
      if (userId) payments = payments.filter(p => p.userId === userId);

      return this.sendJson(res, 200, {
        success: true,
        data: payments,
        meta: { count: payments.length },
      });
    }

    // GET /payments/:id
    const getMatch = path.match(/^\/payments\/([^/]+)$/);
    if (getMatch && method === 'GET') {
      const payment = this.payments.get(getMatch[1]);
      if (!payment) {
        return this.sendJson(res, 404, {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Payment not found' },
        });
      }
      return this.sendJson(res, 200, { success: true, data: payment });
    }

    // POST /payments - process a payment
    if (path === '/payments' && method === 'POST') {
      if (!body) {
        return this.sendJson(res, 400, {
          success: false,
          error: { code: 'BODY_REQUIRED', message: 'Request body is required' },
        });
      }

      const data = JSON.parse(body);
      if (!data.orderId || !data.userId || !data.amount) {
        return this.sendJson(res, 400, {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'orderId, userId, and amount are required' },
        });
      }

      const id = `pay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const txnId = `txn_${Date.now()}_${Math.random().toString(36).slice(2, 12).toUpperCase()}`;

      // Simulate payment processing
      const paymentSuccess = Math.random() > 0.2; // 80% success rate

      const payment: Payment = {
        id,
        orderId: data.orderId,
        userId: data.userId,
        amount: data.amount,
        currency: data.currency || 'USD',
        status: paymentSuccess ? 'success' : 'failed',
        transactionId: paymentSuccess ? txnId : 'FAILED',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      this.payments.set(id, payment);

      if (paymentSuccess) {
        await this.emitEvent('PAYMENT_PROCESSED', {
          paymentId: id,
          orderId: data.orderId,
          userId: data.userId,
          amount: data.amount,
          currency: payment.currency,
          status: 'success',
          transactionId: txnId,
        });
      } else {
        await this.emitEvent('PAYMENT_FAILED', {
          paymentId: id,
          orderId: data.orderId,
          userId: data.userId,
          amount: data.amount,
          currency: payment.currency,
          reason: 'Insufficient funds',
        });
      }

      return this.sendJson(res, 201, {
        success: true,
        data: payment,
        meta: {
          event: paymentSuccess ? 'PAYMENT_PROCESSED' : 'PAYMENT_FAILED',
        },
      });
    }

    // POST /payments/refund - refund a payment
    if (path === '/payments/refund' && method === 'POST') {
      if (!body) {
        return this.sendJson(res, 400, {
          success: false,
          error: { code: 'BODY_REQUIRED', message: 'Request body is required' },
        });
      }

      const data = JSON.parse(body);
      if (!data.paymentId || !data.reason) {
        return this.sendJson(res, 400, {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'paymentId and reason are required' },
        });
      }

      const payment = this.payments.get(data.paymentId);
      if (!payment) {
        return this.sendJson(res, 404, {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Payment not found' },
        });
      }

      if (payment.status !== 'success') {
        return this.sendJson(res, 400, {
          success: false,
          error: { code: 'INVALID_STATUS', message: 'Can only refund successful payments' },
        });
      }

      payment.status = 'refunded';
      payment.updatedAt = Date.now();

      await this.emitEvent('PAYMENT_REFUNDED', {
        paymentId: payment.id,
        orderId: payment.orderId,
        amount: payment.amount,
        reason: data.reason,
      });

      return this.sendJson(res, 200, {
        success: true,
        data: payment,
        meta: { event: 'PAYMENT_REFUNDED' },
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
          aggregateType: 'payment',
          aggregateId: (data as any).paymentId || 'unknown',
          events: [{
            eventId: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            eventType,
            aggregateId: (data as any).paymentId || 'unknown',
            aggregateType: 'payment',
            version: 1,
            data,
            metadata: {
              correlationId: `corr_${Date.now()}`,
              source: 'payment-service',
              timestamp: Date.now(),
            },
            timestamp: Date.now(),
          }],
        }),
      });
    } catch (err) {
      console.error(`[PaymentService] Failed to emit event:`, err);
    }
  }
}
