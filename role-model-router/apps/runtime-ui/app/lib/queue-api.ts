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
