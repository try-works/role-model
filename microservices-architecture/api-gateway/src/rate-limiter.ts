import { RateLimitEntry, now } from '@microservices/shared';

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
}

export class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Periodic cleanup every 60 seconds
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  /** Check if a request is allowed. Returns remaining requests. */
  check(key: string, options: RateLimitOptions): { allowed: boolean; remaining: number; resetAt: number } {
    const nowMs = now();
    let entry = this.store.get(key);

    if (!entry || nowMs >= entry.resetAt) {
      entry = { count: 0, resetAt: nowMs + options.windowMs };
      this.store.set(key, entry);
    }

    entry.count++;
    const remaining = Math.max(0, options.maxRequests - entry.count);
    const allowed = entry.count <= options.maxRequests;

    return { allowed, remaining, resetAt: entry.resetAt };
  }

  /** Get the remaining time in ms for the rate limit window */
  getTimeToReset(key: string): number {
    const entry = this.store.get(key);
    if (!entry) return 0;
    return Math.max(0, entry.resetAt - now());
  }

  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  private cleanup(): void {
    const nowMs = now();
    for (const [key, entry] of this.store.entries()) {
      if (nowMs >= entry.resetAt) {
        this.store.delete(key);
      }
    }
  }
}
