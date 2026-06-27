import { ServiceInstance } from '@microservices/shared';

export type LoadBalanceStrategy = 'round-robin' | 'random' | 'least-connections';

export class LoadBalancer {
  private roundRobinCounters: Map<string, number> = new Map();
  private connectionCounts: Map<string, number> = new Map();
  private strategy: LoadBalanceStrategy;

  constructor(strategy: LoadBalanceStrategy = 'round-robin') {
    this.strategy = strategy;
  }

  setStrategy(strategy: LoadBalanceStrategy): void {
    this.strategy = strategy;
    if (strategy !== 'round-robin') {
      this.roundRobinCounters.clear();
    }
  }

  select(instances: ServiceInstance[]): ServiceInstance | null {
    if (instances.length === 0) return null;

    const healthy = instances.filter(i => i.status === 'UP');
    if (healthy.length === 0) return null;

    switch (this.strategy) {
      case 'random':
        return this.random(healthy);
      case 'least-connections':
        return this.leastConnections(healthy);
      case 'round-robin':
      default:
        return this.roundRobin(healthy);
    }
  }

  incrementConnection(serviceId: string): void {
    const current = this.connectionCounts.get(serviceId) || 0;
    this.connectionCounts.set(serviceId, current + 1);
  }

  decrementConnection(serviceId: string): void {
    const current = this.connectionCounts.get(serviceId) || 0;
    if (current <= 1) {
      this.connectionCounts.delete(serviceId);
    } else {
      this.connectionCounts.set(serviceId, current - 1);
    }
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  private roundRobin(instances: ServiceInstance[]): ServiceInstance {
    const serviceName = instances[0].name;
    let counter = this.roundRobinCounters.get(serviceName) || 0;
    const index = counter % instances.length;
    this.roundRobinCounters.set(serviceName, counter + 1);
    return instances[index];
  }

  private random(instances: ServiceInstance[]): ServiceInstance {
    const index = Math.floor(Math.random() * instances.length);
    return instances[index];
  }

  private leastConnections(instances: ServiceInstance[]): ServiceInstance {
    let min = Infinity;
    let selected = instances[0];

    for (const inst of instances) {
      const count = this.connectionCounts.get(inst.id) || 0;
      if (count < min) {
        min = count;
        selected = inst;
      }
    }

    return selected;
  }
}
