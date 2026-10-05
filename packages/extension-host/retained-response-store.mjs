export const DEFAULT_MAX_RETAINED_RESPONSES = 64;
export const DEFAULT_MAX_RETAINED_RESPONSE_BYTES = 2 * 1024 * 1024;
export const DEFAULT_MAX_RETAINED_RESPONSE_AGE_MS = 60_000;

const assertBound = (value, label) => {
  if (!Number.isSafeInteger(value) || value <= 0)
    throw new Error(`${label} must be a positive integer`);
};

export class RetainedResponseStore {
  #entries = new Map();
  #bytes = 0;

  constructor({
    maxCount = DEFAULT_MAX_RETAINED_RESPONSES,
    maxBytes = DEFAULT_MAX_RETAINED_RESPONSE_BYTES,
    maxAgeMs = DEFAULT_MAX_RETAINED_RESPONSE_AGE_MS,
    now = () => Date.now(),
  } = {}) {
    assertBound(maxCount, "retained response count");
    assertBound(maxBytes, "retained response bytes");
    assertBound(maxAgeMs, "retained response age");
    if (typeof now !== "function") throw new Error("retained response clock must be callable");
    this.maxCount = maxCount;
    this.maxBytes = maxBytes;
    this.maxAgeMs = maxAgeMs;
    this.now = now;
  }

  get size() {
    this.prune();
    return this.#entries.size;
  }

  get bytes() {
    this.prune();
    return this.#bytes;
  }

  has(key) {
    this.prune();
    return this.#entries.has(key);
  }

  get(key) {
    this.prune();
    return this.#entries.get(key)?.value;
  }

  set(key, value) {
    const createdAt = this.now();
    this.prune(createdAt);
    this.delete(key);
    const serialized = JSON.stringify(value ?? null);
    const responseBytes = Buffer.byteLength(serialized, "utf8");
    if (responseBytes > this.maxBytes) return false;
    this.#entries.set(key, { value, responseBytes, createdAt });
    this.#bytes += responseBytes;
    this.#trim();
    return this.#entries.has(key);
  }

  delete(key) {
    const entry = this.#entries.get(key);
    if (!entry) return false;
    this.#entries.delete(key);
    this.#bytes -= entry.responseBytes;
    return true;
  }

  clear() {
    this.#entries.clear();
    this.#bytes = 0;
  }

  prune(now = this.now()) {
    let removed = 0;
    for (const [key, entry] of this.#entries) {
      if (now - entry.createdAt >= this.maxAgeMs) {
        this.delete(key);
        removed += 1;
      }
    }
    removed += this.#trim();
    return removed;
  }

  #trim() {
    let removed = 0;
    while (this.#entries.size > this.maxCount || this.#bytes > this.maxBytes) {
      const oldest = this.#entries.keys().next().value;
      if (oldest === undefined) break;
      this.delete(oldest);
      removed += 1;
    }
    return removed;
  }
}
