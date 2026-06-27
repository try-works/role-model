import {
  ServiceInstance,
  RegisterServiceRequest,
  HeartbeatRequest,
  ServiceQuery,
  ServiceStatus,
  generateId,
  now,
} from '@microservices/shared';

interface StoredService extends ServiceInstance {
  _removed?: boolean;
}

export class ServiceRegistry {
  private services: Map<string, StoredService> = new Map();
  private indices: Map<string, Set<string>> = new Map(); // name -> set of serviceIds

  register(request: RegisterServiceRequest): ServiceInstance {
    const id = generateId();
    const timestamp = now();

    const instance: StoredService = {
      id,
      name: request.name,
      version: request.version,
      host: request.host,
      port: request.port,
      metadata: request.metadata,
      status: 'UP',
      registeredAt: timestamp,
      lastHeartbeat: timestamp,
      ttl: request.ttl ?? 30,
    };

    this.services.set(id, instance);
    this.addToIndex('name', instance.name, id);

    return { ...instance };
  }

  deregister(serviceId: string): boolean {
    const instance = this.services.get(serviceId);
    if (!instance) return false;

    instance._removed = true;
    instance.status = 'DOWN';
    this.services.delete(serviceId);
    this.removeFromIndex('name', instance.name, serviceId);

    return true;
  }

  heartbeat(request: HeartbeatRequest): ServiceInstance | null {
    const instance = this.services.get(request.serviceId);
    if (!instance || instance._removed) return null;

    instance.lastHeartbeat = now();
    if (request.status) {
      instance.status = request.status;
    }

    return { ...instance };
  }

  query(query: ServiceQuery): ServiceInstance[] {
    const results: ServiceInstance[] = [];

    if (query.name) {
      const serviceIds = this.indices.get(`name:${query.name}`) || new Set();
      for (const id of serviceIds) {
        const svc = this.services.get(id);
        if (svc && !svc._removed && this.matches(svc, query)) {
          results.push({ ...svc });
        }
      }
    } else {
      for (const svc of this.services.values()) {
        if (!svc._removed && this.matches(svc, query)) {
          results.push({ ...svc });
        }
      }
    }

    return results;
  }

  getService(serviceId: string): ServiceInstance | null {
    const svc = this.services.get(serviceId);
    return svc && !svc._removed ? { ...svc } : null;
  }

  getAllServices(): ServiceInstance[] {
    const results: ServiceInstance[] = [];
    for (const svc of this.services.values()) {
      if (!svc._removed) {
        results.push({ ...svc });
      }
    }
    return results;
  }

  // Health checker: identify expired services
  getExpiredServices(): ServiceInstance[] {
    const expired: ServiceInstance[] = [];
    const currentTime = now();

    for (const svc of this.services.values()) {
      if (svc._removed) continue;
      const elapsed = (currentTime - svc.lastHeartbeat) / 1000;
      if (elapsed > svc.ttl * 3) {
        expired.push({ ...svc });
      }
    }

    return expired;
  }

  cleanup(): number {
    const expired = this.getExpiredServices();
    for (const svc of expired) {
      this.deregister(svc.id);
    }
    return expired.length;
  }

  getStats(): {
    totalServices: number;
    healthy: number;
    unhealthy: number;
    byName: Record<string, number>;
  } {
    const healthy: ServiceInstance[] = [];
    const unhealthy: ServiceInstance[] = [];
    const byName: Record<string, number> = {};

    for (const svc of this.services.values()) {
      if (svc._removed) continue;
      if (svc.status === 'UP') healthy.push(svc);
      else unhealthy.push(svc);

      byName[svc.name] = (byName[svc.name] || 0) + 1;
    }

    return {
      totalServices: healthy.length + unhealthy.length,
      healthy: healthy.length,
      unhealthy: unhealthy.length,
      byName,
    };
  }

  // ─── Private helpers ────────────────────────────────────────────────────

  private matches(svc: StoredService, query: ServiceQuery): boolean {
    if (query.status && svc.status !== query.status) return false;
    if (query.version && svc.version !== query.version) return false;
    return true;
  }

  private addToIndex(indexName: string, key: string, serviceId: string): void {
    const indexKey = `${indexName}:${key}`;
    if (!this.indices.has(indexKey)) {
      this.indices.set(indexKey, new Set());
    }
    this.indices.get(indexKey)!.add(serviceId);
  }

  private removeFromIndex(indexName: string, key: string, serviceId: string): void {
    const indexKey = `${indexName}:${key}`;
    const set = this.indices.get(indexKey);
    if (set) {
      set.delete(serviceId);
      if (set.size === 0) {
        this.indices.delete(indexKey);
      }
    }
  }
}
