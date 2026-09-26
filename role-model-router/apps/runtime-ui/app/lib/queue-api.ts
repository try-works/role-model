/**
 * Run 101 / R9-R10: the client for the operator queue read model.
 *
 * It reads the same `/operator/queues*` surface the sidecar serves over the
 * shared queue store, so every number a page shows is queue truth rather than a
 * store-derived approximation. The refresh contract is the design's §4.5: the
 * drill-in polls about once a second, while the Overview keeps its existing
 * cadence.
 */
import { type RuntimeFetcher, fetchJson } from "./runtime-api";

export interface QueueSummary {
  readonly name: string;
  readonly owner: string;
  readonly jobIdRule: string;
  readonly mode: "legacy" | "shadow" | "queue" | string;
  readonly concurrency: number | null;
  readonly attempts: number | null;
  readonly retentionDays: number | null;
  readonly killSwitch: boolean;
  readonly waiting: number;
  readonly active: number;
  readonly delayed: number;
  readonly failed: number;
  readonly completedRecent: number;
  readonly stalled: number;
  readonly oldestWaitingMs: number | null;
  readonly p50Ms?: number | null;
  readonly p95Ms?: number | null;
  readonly lastError: string | null;
}

export interface QueueListResponse {
  readonly schemaVersion: string;
  readonly policyVersion: number;
  readonly available: boolean;
  readonly reason?: string;
  readonly queues: readonly QueueSummary[];
}

export interface QueueJobRow {
  readonly id: string;
  readonly state: string;
  readonly attempts: number;
  readonly visibleAt: string | null;
  readonly acquiredAt: string | null;
  readonly acquiredBy: string | null;
  readonly createdAt: string | null;
  readonly updatedAt: string | null;
  readonly lastError: string | null;
  readonly terminal: boolean;
}

export interface QueueJobsResponse {
  readonly schemaVersion: string;
  readonly queue: string;
  readonly available: boolean;
  readonly jobs: readonly QueueJobRow[];
}

export interface QueueJobDetailResponse {
  readonly schemaVersion: string;
  readonly available: boolean;
  readonly job: (QueueJobRow & { readonly queue: string; readonly payload: unknown }) | null;
}

/** The pages pass the app's runtime fetcher, exactly like every other read. */
export async function fetchQueues(fetcher: RuntimeFetcher = fetch): Promise<QueueListResponse> {
  return fetchJson<QueueListResponse>("/api/role-model/operator/queues", fetcher);
}

export async function fetchQueueJobs(
  queueName: string,
  options: { readonly state?: string | null; readonly limit?: number } = {},
  fetcher: RuntimeFetcher = fetch,
): Promise<QueueJobsResponse> {
  const params = new URLSearchParams();
  if (options.state) params.set("state", options.state);
  if (options.limit) params.set("limit", String(options.limit));
  const query = params.toString();
  return fetchJson<QueueJobsResponse>(
    `/api/role-model/operator/queues/${encodeURIComponent(queueName)}/jobs${query ? `?${query}` : ""}`,
    fetcher,
  );
}

export async function fetchQueueJob(
  queueName: string,
  jobId: string,
  fetcher: RuntimeFetcher = fetch,
): Promise<QueueJobDetailResponse> {
  return fetchJson<QueueJobDetailResponse>(
    `/api/role-model/operator/queues/${encodeURIComponent(queueName)}/jobs/${encodeURIComponent(jobId)}`,
    fetcher,
  );
}

/** `oldestWaitingMs` as a short age, for the table cell. */
export function formatQueueAge(ageMs: number | null): string {
  if (ageMs === null || !Number.isFinite(ageMs)) return "—";
  const seconds = Math.floor(ageMs / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export interface QueuePolicyField {
  readonly name: string;
  readonly type: "enum" | "integer" | "boolean" | string;
  readonly unit: string;
  readonly default: unknown;
  readonly min?: number;
  readonly max?: number;
  readonly values?: readonly string[];
  readonly uiEditable: boolean;
  readonly description: string;
}

export interface QueueConfigResponse {
  readonly schemaVersion: string;
  readonly policyVersion: number;
  readonly updatedAt: number | null;
  readonly path: string;
  readonly global: Record<string, unknown>;
  readonly catalogue: readonly {
    readonly name: string;
    readonly owner: string;
    readonly jobIdRule: string;
    readonly fields: readonly QueuePolicyField[];
  }[];
  readonly effective: readonly (Record<string, unknown> & { readonly queue: string })[];
  readonly receipts: readonly Record<string, unknown>[];
}

export interface QueueConfigChangeResponse {
  readonly ok: boolean;
  readonly receipt: {
    readonly queue: string;
    readonly name: string;
    readonly from: unknown;
    readonly to: unknown;
    readonly actor: string;
    readonly at: number;
    readonly policyVersion: number;
  };
  readonly effective: Record<string, unknown> & { readonly queue: string };
}

/** The catalogue, its bounds and the values in force right now. */
export async function fetchQueueConfig(
  fetcher: RuntimeFetcher = fetch,
): Promise<QueueConfigResponse> {
  return fetchJson<QueueConfigResponse>("/api/role-model/operator/queues/config", fetcher);
}

/**
 * One operator change. The bounds are enforced server-side; a refused value
 * comes back as an error naming the queue and field rather than a new value.
 */
export async function setQueueParameter(
  change: {
    readonly queue: string;
    readonly name: string;
    readonly value: unknown;
    readonly reason?: string;
  },
  fetcher: RuntimeFetcher = fetch,
): Promise<QueueConfigChangeResponse> {
  return fetchJson<QueueConfigChangeResponse>("/api/role-model/operator/queues/config", fetcher, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(change),
  });
}
