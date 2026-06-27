import { IncomingMessage, ServerResponse } from 'http';
import { BaseService } from '@microservices/shared';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  createdAt: number;
  updatedAt: number;
}

export class UserService extends BaseService {
  private users: Map<string, User> = new Map();

  async handleServiceRoute(
    req: IncomingMessage,
    res: ServerResponse,
    path: string,
    method: string,
    body: string | null
  ): Promise<void> {
    // GET /users - list all users
    if (path === '/users' && method === 'GET') {
      const users = Array.from(this.users.values());
      return this.sendJson(res, 200, {
        success: true,
        data: users,
        meta: { count: users.length },
      });
    }

    // GET /users/:id - get single user
    const getMatch = path.match(/^\/users\/([^/]+)$/);
    if (getMatch && method === 'GET') {
      const user = this.users.get(getMatch[1]);
      if (!user) {
        return this.sendJson(res, 404, {
          success: false,
          error: { code: 'NOT_FOUND', message: 'User not found' },
        });
      }
      return this.sendJson(res, 200, { success: true, data: user });
    }

    // POST /users - create user
    if (path === '/users' && method === 'POST') {
      if (!body) {
        return this.sendJson(res, 400, {
          success: false,
          error: { code: 'BODY_REQUIRED', message: 'Request body is required' },
        });
      }

      const data = JSON.parse(body);
      if (!data.email || !data.name) {
        return this.sendJson(res, 400, {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'email and name are required' },
        });
      }

      const id = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const user: User = {
        id,
        email: data.email,
        name: data.name,
        role: data.role || 'user',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      this.users.set(id, user);

      // Emit event via event store
      await this.emitEvent('USER_CREATED', {
        userId: id,
        email: data.email,
        name: data.name,
        role: user.role,
      });

      return this.sendJson(res, 201, {
        success: true,
        data: user,
        meta: { event: 'USER_CREATED' },
      });
    }

    // PUT /users/:id - update user
    const putMatch = path.match(/^\/users\/([^/]+)$/);
    if (putMatch && method === 'PUT') {
      const user = this.users.get(putMatch[1]);
      if (!user) {
        return this.sendJson(res, 404, {
          success: false,
          error: { code: 'NOT_FOUND', message: 'User not found' },
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

      if (data.email) { user.email = data.email; changes.email = data.email; }
      if (data.name) { user.name = data.name; changes.name = data.name; }
      if (data.role) { user.role = data.role; changes.role = data.role; }

      user.updatedAt = Date.now();

      await this.emitEvent('USER_UPDATED', { userId: user.id, changes });

      return this.sendJson(res, 200, { success: true, data: user });
    }

    // DELETE /users/:id - delete user
    const deleteMatch = path.match(/^\/users\/([^/]+)$/);
    if (deleteMatch && method === 'DELETE') {
      const user = this.users.get(deleteMatch[1]);
      if (!user) {
        return this.sendJson(res, 404, {
          success: false,
          error: { code: 'NOT_FOUND', message: 'User not found' },
        });
      }

      this.users.delete(user.id);

      await this.emitEvent('USER_DELETED', { userId: user.id });

      return this.sendJson(res, 200, { success: true, data: { deleted: user.id } });
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
          aggregateType: 'user',
          aggregateId: (data as any).userId || 'unknown',
          events: [{
            eventId: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            eventType,
            aggregateId: (data as any).userId || 'unknown',
            aggregateType: 'user',
            version: 1,
            data,
            metadata: {
              correlationId: `corr_${Date.now()}`,
              source: 'user-service',
              timestamp: Date.now(),
            },
            timestamp: Date.now(),
          }],
        }),
      });
    } catch (err) {
      console.error(`[UserService] Failed to emit event:`, err);
    }
  }
}
