import { now } from '@microservices/shared';

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitOptions {
  failureThreshold: number;
  resetTimeoutMs: number;
  halfOpenMaxRequests?: number;
}

interface CircuitStats {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime: number;
  lastSuccessTime: number;
  openedAt: number | null;
}

export class CircuitBreaker {
  private circuits: Map<string, CircuitStats> = new Map();
  private halfOpenRequests: Map<string, number> = new Map();

  constructor(private defaultOptions: CircuitOptions = {
    failureThreshold: 5,
    resetTimeoutMs: 30000,
    halfOpenMaxRequests: 3,
  }) {}

  /** Check if the circuit allows a request through */
  canPass(serviceKey: string): boolean {
    this.ensureCircuit(serviceKey);
    const stats = this.circuits.get(serviceKey)!;

    if (stats.state === 'CLOSED') return true;

    if (stats.state === 'OPEN') {
      // Check if reset timeout has elapsed
      if (stats.openedAt && (now() - stats.openedAt) >= this.defaultOptions.resetTimeoutMs) {
        // Transition to HALF_OPEN
        stats.state = 'HALF_OPEN';
        this.halfOpenRequests.set(serviceKey, 0);
        return this.tryHalfOpenRequest(serviceKey);
      }
      return false;
    }

    // HALF_OPEN: allow limited requests
    return this.tryHalfOpenRequest(serviceKey);
  }

  /** Record a successful call */
  onSuccess(serviceKey: string): void {
    this.ensureCircuit(serviceKey);
    const stats = this.circuits.get(serviceKey)!;

    stats.successCount++;
    stats.lastSuccessTime = now();

    if (stats.state === 'HALF_OPEN') {
      // Enough success in half-open → close the circuit
      stats.state = 'CLOSED';
      stats.failureCount = 0;
      this.halfOpenRequests.delete(serviceKey);
      console.log(`[CircuitBreaker] ${serviceKey} circuit CLOSED (recovered)`);
    }
  }

  /** Record a failed call */
  onFailure(serviceKey: string): void {
    this.ensureCircuit(serviceKey);
    const stats = this.circuits.get(serviceKey)!;

    stats.failureCount++;
    stats.lastFailureTime = now();

    if (stats.state === 'HALF_OPEN') {
      // Single failure in half-open → back to open
      stats.state = 'OPEN';
      stats.openedAt = now();
      this.halfOpenRequests.delete(serviceKey);
      console.log(`[CircuitBreaker] ${serviceKey} circuit OPEN (failed in half-open)`);
    } else if (stats.state === 'CLOSED' && stats.failureCount >= this.defaultOptions.failureThreshold) {
      stats.state = 'OPEN';
      stats.openedAt = now();
      console.log(`[CircuitBreaker] ${serviceKey} circuit OPEN (threshold reached)`);
    }
  }

  /** Get current state */
  getState(serviceKey: string): CircuitState {
    this.ensureCircuit(serviceKey);
    return this.circuits.get(serviceKey)!.state;
  }

  getStats(serviceKey: string): CircuitStats | null {
    return this.circuits.get(serviceKey) || null;
  }

  getAllStats(): Record<string, CircuitStats> {
    const result: Record<string, CircuitStats> = {};
    for (const [key, stats] of this.circuits.entries()) {
      result[key] = { ...stats };
    }
    return result;
  }

  reset(serviceKey: string): void {
    this.circuits.delete(serviceKey);
    this.halfOpenRequests.delete(serviceKey);
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  private ensureCircuit(serviceKey: string): void {
    if (!this.circuits.has(serviceKey)) {
      this.circuits.set(serviceKey, {
        state: 'CLOSED',
        failureCount: 0,
        successCount: 0,
        lastFailureTime: 0,
        lastSuccessTime: 0,
        openedAt: null,
      });
    }
  }

  private tryHalfOpenRequest(serviceKey: string): boolean {
    const current = this.halfOpenRequests.get(serviceKey) || 0;
    const max = this.defaultOptions.halfOpenMaxRequests || 3;
    if (current < max) {
      this.halfOpenRequests.set(serviceKey, current + 1);
      return true;
    }
    return false;
  }
}
