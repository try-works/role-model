import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

/**
 * Run 98 addendum 40 (L2): route captures are deferred through this durable queue so a live request
 * never waits on the Track B operations boundary. Enqueue is one bounded SQLite write; the boundary
 * call happens in the background drain, which keeps a failing capture for a later attempt and records
 * a receipt once the boundary accepts it.
 *
 * The byte budget and the bounded degradation semantics match the inline capture they replace: an
 * oversized capture fails closed at enqueue (the caller records the same degradation it recorded when
 * the boundary refused the capture) instead of being queued and failing later.
 */
export interface TrackBRouteCaptureQueueItem {
  readonly requestId: string;
  readonly routingDecisionId: string;
  readonly endpointId: string;
  readonly payload: Readonly<Record<string, unknown>>;
}

export interface TrackBRouteCaptureEnqueueResult {
  readonly status: "enqueued" | "duplicate";
  readonly bytes: number;
}

export interface TrackBRouteCaptureQueue {
  enqueue(
    item: TrackBRouteCaptureQueueItem & { readonly enqueuedAtMs?: number },
  ): Promise<TrackBRouteCaptureEnqueueResult>;
  readPending(): Promise<
    ReadonlyArray<{
      readonly requestId: string;
      readonly routingDecisionId: string;
      readonly endpointId: string;
      readonly payload: Readonly<Record<string, unknown>>;
      readonly attempts: number;
      readonly lastError: string | null;
      readonly enqueuedAtMs: number;
      readonly nextAttemptAtMs: number;
      readonly deadlineAtMs: number;
    }>
  >;
  readReceipts(): Promise<
    ReadonlyArray<{
      readonly requestId: string;
      readonly result: unknown;
      readonly completedAtMs: number;
    }>
  >;
  /**
   * Run 98 addendum 48: a handler may answer with `{ deferredUntilMs }` to say "the boundary is not available
   * yet; try this item again at that time". A deferral is **not** an attempt — the item keeps its attempt
   * count and its deadline — so a cooling-down boundary can no longer burn a captured backlog out.
   */
  drain(
    handler: (
      item: TrackBRouteCaptureQueueItem,
    ) => Promise<unknown | { readonly deferredUntilMs: number }>,
    options?: { readonly nowMs?: number },
  ): Promise<{ readonly delivered: number; readonly failed: number; readonly remaining: number }>;
}

export const readDeferredUntilMs = (outcome: unknown): number | null => {
  if (!outcome || typeof outcome !== "object" || Array.isArray(outcome)) return null;
  const value = (outcome as { readonly deferredUntilMs?: unknown }).deferredUntilMs;
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
};

const DEFAULT_MAX_PAYLOAD_BYTES = 512 * 1024;
const DEFAULT_MAX_ITEMS = 4096;
const MAX_RETRY_BACKOFF_MS = 5 * 60 * 1000;
// v1.1 guidance 05 §"Track B maintenance job state machines": every job has bounded attempts and a
// deadline, so a stuck capture reaches a typed `failed`/`expired` disposition instead of retrying
// forever.
const DEFAULT_MAX_ATTEMPTS = 8;
const DEFAULT_DEADLINE_MS = 24 * 60 * 60 * 1000;

function captureQueueSchema(database: DatabaseSync): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS track_b_route_capture_pending (
      request_id TEXT PRIMARY KEY,
      routing_decision_id TEXT NOT NULL,
      endpoint_id TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      next_attempt_at_ms INTEGER NOT NULL,
      enqueued_at_ms INTEGER NOT NULL,
      deadline_at_ms INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS track_b_route_capture_pending_order
      ON track_b_route_capture_pending(next_attempt_at_ms, enqueued_at_ms, request_id);
    CREATE TABLE IF NOT EXISTS track_b_route_capture_receipts (
      request_id TEXT PRIMARY KEY,
      result_json TEXT NOT NULL,
      completed_at_ms INTEGER NOT NULL
    );
  `);
  // Existing queues created before the deadline column was added.
  const columns = database
    .prepare("PRAGMA table_info(track_b_route_capture_pending)")
    .all() as Array<{ name: string }>;
  if (!columns.some((column) => column.name === "deadline_at_ms")) {
    database.exec(
      "ALTER TABLE track_b_route_capture_pending ADD COLUMN deadline_at_ms INTEGER NOT NULL DEFAULT 0",
    );
  }
}

function parsePayload(value: string): Readonly<Record<string, unknown>> {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export function createTrackBRouteCaptureQueue(options: {
  readonly filePath: string;
  readonly maxItems?: number;
  readonly maxPayloadBytes?: number;
  readonly maxAttempts?: number;
  readonly deadlineMs?: number;
}): TrackBRouteCaptureQueue {
  const filePath = options.filePath;
  const maxItems = options.maxItems ?? DEFAULT_MAX_ITEMS;
  const maxPayloadBytes = options.maxPayloadBytes ?? DEFAULT_MAX_PAYLOAD_BYTES;
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const deadlineMs = options.deadlineMs ?? DEFAULT_DEADLINE_MS;
  if (!filePath || !Number.isInteger(maxItems) || maxItems < 1) {
    throw new Error("valid Track B route capture queue configuration required");
  }

  let initialized = false;
  let operation = Promise.resolve<unknown>(undefined);
  const withDatabase = <T>(run: (database: DatabaseSync) => T): T => {
    if (!initialized) {
      mkdirSync(path.dirname(filePath), { recursive: true });
      initialized = true;
    }
    const database = new DatabaseSync(filePath);
    try {
      captureQueueSchema(database);
      return run(database);
    } finally {
      database.close();
    }
  };
  // Enqueue and the drain's claim/receipt steps share one lane so a live request's write never races
  // the drain. The boundary call itself stays outside the lane.
  const exclusive = <T>(run: () => Promise<T>): Promise<T> => {
    const result = operation.then(run, run);
    operation = result.catch(() => undefined);
    return result;
  };

  return {
    async enqueue(item) {
      const payloadJson = JSON.stringify(item.payload ?? {});
      const bytes = Buffer.byteLength(payloadJson, "utf8");
      if (bytes > maxPayloadBytes) {
        throw new Error(
          `route capture skipped: ${bytes} bytes exceeds the ${maxPayloadBytes}-byte deferred capture budget`,
        );
      }
      const enqueuedAtMs = item.enqueuedAtMs ?? Date.now();
      return exclusive(async () =>
        withDatabase((database) => {
          database.exec("BEGIN IMMEDIATE");
          try {
            const existing = database
              .prepare(
                "SELECT 1 AS found FROM track_b_route_capture_pending WHERE request_id=? UNION ALL SELECT 1 FROM track_b_route_capture_receipts WHERE request_id=? LIMIT 1",
              )
              .get(item.requestId, item.requestId);
            if (existing) {
              database.exec("COMMIT");
              return { status: "duplicate", bytes } as const;
            }
            const count = database
              .prepare("SELECT COUNT(*) AS count FROM track_b_route_capture_pending")
              .get() as { count: number };
            if (count.count >= maxItems) {
              throw new Error("Track B route capture queue is full");
            }
            database
              .prepare(
                `INSERT INTO track_b_route_capture_pending
                   (request_id, routing_decision_id, endpoint_id, payload_json, attempts, last_error,
                    next_attempt_at_ms, enqueued_at_ms, deadline_at_ms)
                 VALUES (?, ?, ?, ?, 0, NULL, ?, ?, ?)`,
              )
              .run(
                item.requestId,
                item.routingDecisionId,
                item.endpointId,
                payloadJson,
                enqueuedAtMs,
                enqueuedAtMs,
                enqueuedAtMs + deadlineMs,
              );
            database.exec("COMMIT");
            return { status: "enqueued", bytes } as const;
          } catch (error) {
            database.exec("ROLLBACK");
            throw error;
          }
        }),
      );
    },

    async readPending() {
      return exclusive(async () =>
        withDatabase((database) => {
          const rows = database
            .prepare(
              `SELECT request_id, routing_decision_id, endpoint_id, payload_json, attempts, last_error,
                      enqueued_at_ms, next_attempt_at_ms
               FROM track_b_route_capture_pending
               ORDER BY enqueued_at_ms, request_id`,
            )
            .all() as Array<{
            request_id: string;
            routing_decision_id: string;
            endpoint_id: string;
            payload_json: string;
            attempts: number;
            last_error: string | null;
            enqueued_at_ms: number;
            next_attempt_at_ms: number;
            deadline_at_ms: number;
          }>;
          return rows.map((row) => ({
            requestId: row.request_id,
            routingDecisionId: row.routing_decision_id,
            endpointId: row.endpoint_id,
            payload: parsePayload(row.payload_json),
            attempts: row.attempts,
            lastError: row.last_error,
            enqueuedAtMs: row.enqueued_at_ms,
            nextAttemptAtMs: row.next_attempt_at_ms,
            deadlineAtMs: row.deadline_at_ms,
          }));
        }),
      );
    },

    async readReceipts() {
      return exclusive(async () =>
        withDatabase((database) => {
          const rows = database
            .prepare(
              "SELECT request_id, result_json, completed_at_ms FROM track_b_route_capture_receipts ORDER BY completed_at_ms, request_id",
            )
            .all() as Array<{ request_id: string; result_json: string; completed_at_ms: number }>;
          return rows.map((row) => ({
            requestId: row.request_id,
            result: (() => {
              try {
                return JSON.parse(row.result_json) as unknown;
              } catch {
                return null;
              }
            })(),
            completedAtMs: row.completed_at_ms,
          }));
        }),
      );
    },

    async drain(handler, drainOptions) {
      const nowMs = drainOptions?.nowMs ?? Date.now();
      let delivered = 0;
      let failed = 0;
      for (let iteration = 0; iteration < maxItems; iteration += 1) {
        const claimed = await exclusive(async () =>
          withDatabase((database) => {
            const row = database
              .prepare(
                `SELECT request_id, routing_decision_id, endpoint_id, payload_json, attempts,
                        deadline_at_ms
                 FROM track_b_route_capture_pending
                 WHERE next_attempt_at_ms <= ?
                 ORDER BY enqueued_at_ms, request_id LIMIT 1`,
              )
              .get(nowMs) as
              | {
                  request_id: string;
                  routing_decision_id: string;
                  endpoint_id: string;
                  payload_json: string;
                  attempts: number;
                  deadline_at_ms: number;
                }
              | undefined;
            if (!row) return null;
            return {
              item: {
                requestId: row.request_id,
                routingDecisionId: row.routing_decision_id,
                endpointId: row.endpoint_id,
                payload: parsePayload(row.payload_json),
              } as TrackBRouteCaptureQueueItem,
              attempts: row.attempts,
              deadlineAtMs: row.deadline_at_ms,
            };
          }),
        );
        if (!claimed) break;

        try {
          const result = await handler(claimed.item);
          const deferredUntilMs = readDeferredUntilMs(result);
          if (deferredUntilMs !== null) {
            // Run 98 addendum 48: the boundary asked to wait. Leave the item pending — attempts, deadline and
            // payload untouched — and stop this pass, because every remaining item would get the same answer.
            await exclusive(async () =>
              withDatabase((database) => {
                database
                  .prepare(
                    "UPDATE track_b_route_capture_pending SET next_attempt_at_ms=?, last_error=? WHERE request_id=?",
                  )
                  .run(
                    deferredUntilMs,
                    `deferred: boundary unavailable until ${new Date(deferredUntilMs).toISOString()}`,
                    claimed.item.requestId,
                  );
              }),
            );
            break;
          }
          await exclusive(async () =>
            withDatabase((database) => {
              database.exec("BEGIN IMMEDIATE");
              try {
                database
                  .prepare("DELETE FROM track_b_route_capture_pending WHERE request_id=?")
                  .run(claimed.item.requestId);
                database
                  .prepare(
                    "INSERT OR REPLACE INTO track_b_route_capture_receipts (request_id, result_json, completed_at_ms) VALUES (?, ?, ?)",
                  )
                  .run(
                    claimed.item.requestId,
                    JSON.stringify({ status: "delivered", result: result ?? null }),
                    Date.now(),
                  );
                database.exec("COMMIT");
              } catch (error) {
                database.exec("ROLLBACK");
                throw error;
              }
            }),
          );
          delivered += 1;
        } catch (error) {
          const attempts = claimed.attempts + 1;
          const lastError = String((error as { message?: unknown })?.message ?? error).slice(
            0,
            512,
          );
          const expired = claimed.deadlineAtMs > 0 && nowMs >= claimed.deadlineAtMs;
          const exhausted = attempts >= maxAttempts;
          if (expired || exhausted) {
            // Terminal disposition: the capture stops consuming attempts and the operator can read why.
            await exclusive(async () =>
              withDatabase((database) => {
                database.exec("BEGIN IMMEDIATE");
                try {
                  database
                    .prepare("DELETE FROM track_b_route_capture_pending WHERE request_id=?")
                    .run(claimed.item.requestId);
                  database
                    .prepare(
                      "INSERT OR REPLACE INTO track_b_route_capture_receipts (request_id, result_json, completed_at_ms) VALUES (?, ?, ?)",
                    )
                    .run(
                      claimed.item.requestId,
                      JSON.stringify({
                        status: expired ? "expired" : "failed",
                        attempts,
                        lastError,
                      }),
                      Date.now(),
                    );
                  database.exec("COMMIT");
                } catch (error) {
                  database.exec("ROLLBACK");
                  throw error;
                }
              }),
            );
          } else {
            const backoffMs = Math.min(1_000 * 2 ** Math.min(attempts, 8), MAX_RETRY_BACKOFF_MS);
            await exclusive(async () =>
              withDatabase((database) => {
                database
                  .prepare(
                    `UPDATE track_b_route_capture_pending
                     SET attempts=?, last_error=?, next_attempt_at_ms=?
                     WHERE request_id=?`,
                  )
                  .run(attempts, lastError, nowMs + backoffMs, claimed.item.requestId);
              }),
            );
          }
          failed += 1;
        }
      }
      const remaining = await exclusive(async () =>
        withDatabase((database) => {
          const row = database
            .prepare("SELECT COUNT(*) AS count FROM track_b_route_capture_pending")
            .get() as { count: number };
          return row.count;
        }),
      );
      return { delivered, failed, remaining };
    },
  };
}
