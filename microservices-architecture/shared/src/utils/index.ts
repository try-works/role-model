import { randomUUID, createHash } from 'crypto';

export function generateId(): string {
  return randomUUID();
}

export function generateCorrelationId(): string {
  return `corr-${randomUUID().slice(0, 8)}-${Date.now()}`;
}

export function generateTraceId(): string {
  return `trace-${Date.now().toString(36)}-${randomUUID().slice(0, 6)}`;
}

export function hashString(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export function now(): number {
  return Date.now();
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function encodeBase64(data: string): string {
  return Buffer.from(data).toString('base64');
}

export function decodeBase64(data: string): string {
  return Buffer.from(data, 'base64').toString('utf-8');
}

export function retry<T>(
  fn: () => Promise<T>,
  options: { maxRetries: number; baseDelayMs: number; maxDelayMs?: number }
): Promise<T> {
  const { maxRetries, baseDelayMs, maxDelayMs = 30000 } = options;

  let attempt = 0;

  const execute = async (): Promise<T> => {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      if (attempt >= maxRetries) {
        throw error;
      }
      const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
      const jitter = delay * (0.5 + Math.random() * 0.5);
      await sleep(jitter);
      return execute();
    }
  };

  return execute();
}
