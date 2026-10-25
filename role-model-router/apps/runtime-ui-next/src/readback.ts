import type { Html, HtmlBuilder } from "@role-model-router/foldkit/html";
import { Schema } from "effect";

import type { Message } from "./message";
import { READBACK_PATHS } from "./runtime-endpoints";

/** S26e/R13 wave 2: one shared readback surface for four read routes. */
export type ReadbackKey =
  | "storeReceipts"
  | "queues"
  | "localLogs"
  | "routerCandidates"
  | "requests"
  | "routerDecisions"
  | "localPeers"
  | "systemPeers"
  | "runtime"
  | "sessionReadiness"
  | "dashboard"
  | "localSwap"
  | "observeActivity"
  | "observeLogs"
  | "observeRouting"
  | "router"
  | "requestDetail"
  | "routerDecisionDetail"
  | "localPeerModels"
  | "queueConfig"
  | "downstreamOpenAI"
  | "integrationProviders"
  | "benchmarkSuite"
  | "storageRetention"
  | "models"
  | "runtimeSummary"
  | "health";

export const ReadbackKeySchema = Schema.Literals([
  "storeReceipts",
  "queues",
  "localLogs",
  "routerCandidates",
  "requests",
  "routerDecisions",
  "localPeers",
  "systemPeers",
  "runtime",
  "sessionReadiness",
  "dashboard",
  "localSwap",
  "observeActivity",
  "observeLogs",
  "observeRouting",
  "router",
  "requestDetail",
  "routerDecisionDetail",
  "localPeerModels",
  "queueConfig",
  "downstreamOpenAI",
  "integrationProviders",
  "benchmarkSuite",
  "storageRetention",
  "models",
  "runtimeSummary",
  "health",
]);

export interface ReadbackRow {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly meta: string;
}

export const ReadbackRowSchema = Schema.Struct({
  id: Schema.String,
  label: Schema.String,
  meta: Schema.String,
  value: Schema.String,
});

export const ReadbackState = Schema.Struct({
  detailId: Schema.optional(Schema.String),
  message: Schema.optional(Schema.String),
  rows: Schema.Array(ReadbackRowSchema),
  status: Schema.Literals(["idle", "loading", "ok", "empty", "error"]),
  token: Schema.Number,
});
export type ReadbackState = typeof ReadbackState.Type;

export const ReadbacksState = Schema.Struct({
  dashboard: ReadbackState,
  localLogs: ReadbackState,
  localPeers: ReadbackState,
  systemPeers: ReadbackState,
  localSwap: ReadbackState,
  observeActivity: ReadbackState,
  observeLogs: ReadbackState,
  observeRouting: ReadbackState,
  queues: ReadbackState,
  requests: ReadbackState,
  routerCandidates: ReadbackState,
  routerDecisions: ReadbackState,
  router: ReadbackState,
  requestDetail: ReadbackState,
  routerDecisionDetail: ReadbackState,
  localPeerModels: ReadbackState,
  queueConfig: ReadbackState,
  downstreamOpenAI: ReadbackState,
  integrationProviders: ReadbackState,
  benchmarkSuite: ReadbackState,
  storageRetention: ReadbackState,
  models: ReadbackState,
  runtimeSummary: ReadbackState,
  health: ReadbackState,
  runtime: ReadbackState,
  sessionReadiness: ReadbackState,
  storeReceipts: ReadbackState,
});
export type ReadbacksState = typeof ReadbacksState.Type;

export const idleReadback = (): ReadbackState => ({ rows: [], status: "idle", token: 0 });
export const loadingReadback = (token: number): ReadbackState => ({
  rows: [],
  status: "loading",
  token,
});
export const failedReadback = (message: string, token: number): ReadbackState => ({
  message,
  rows: [],
  status: "error",
  token,
});

export const emptyReadbacks = (): ReadbacksState => ({
  dashboard: idleReadback(),
  localLogs: idleReadback(),
  localPeers: idleReadback(),
  systemPeers: idleReadback(),
  localSwap: idleReadback(),
  observeActivity: idleReadback(),
  observeLogs: idleReadback(),
  observeRouting: idleReadback(),
  queues: idleReadback(),
  requests: idleReadback(),
  routerCandidates: idleReadback(),
  routerDecisions: idleReadback(),
  router: idleReadback(),
  requestDetail: idleReadback(),
  routerDecisionDetail: idleReadback(),
  localPeerModels: idleReadback(),
  queueConfig: idleReadback(),
  downstreamOpenAI: idleReadback(),
  integrationProviders: idleReadback(),
  benchmarkSuite: idleReadback(),
  storageRetention: idleReadback(),
  models: idleReadback(),
  runtimeSummary: idleReadback(),
  health: idleReadback(),
  runtime: idleReadback(),
  sessionReadiness: idleReadback(),
  storeReceipts: idleReadback(),
});

export const readbackErrorMessage = (label: string, status: number, reason?: string): string => {
  if (reason !== undefined) {
    return `${label} read failed: HTTP ${String(status)} (${reason})`;
  }
  if (status === 401) return `${label} read failed: HTTP 401 (not authorized)`;
  if (status === 403) return `${label} read failed: HTTP 403 (forbidden)`;
  return `${label} read failed: HTTP ${String(status)}`;
};

export interface ReadbackResult {
  readonly body: unknown;
  readonly status: number;
}

export type ReadbackReader = (input: { readonly signal: AbortSignal; readonly id?: string }) => Promise<ReadbackResult>;

const asRecord = (value: unknown): Readonly<Record<string, unknown>> | undefined =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Readonly<Record<string, unknown>>)
    : undefined;

const asArray = (value: unknown): readonly unknown[] => (Array.isArray(value) ? value : []);

const reasonOf = (body: unknown): string | undefined => {
  const record = asRecord(body);
  return typeof record?.reason === "string"
    ? record.reason
    : typeof record?.message === "string"
      ? record.message
      : undefined;
};

const okRows = (rows: readonly ReadbackRow[], token: number): ReadbackState =>
  rows.length === 0 ? { rows: [], status: "empty", token } : { rows, status: "ok", token };

export interface ReadbackRouteSpec {
  readonly key: ReadbackKey;
  readonly label: string;
  readonly path: string;
  readonly pathFor?: (id: string) => string;
  readonly emptyText: string;
  readonly parse: (body: unknown, token: number) => ReadbackState;
}

const row = (id: string, label: string, value: string, meta: string): ReadbackRow => ({
  id,
  label,
  meta,
  value,
});

const parseRequests = (body: unknown, token: number): ReadbackState => {
  const record = asRecord(body);
  if (!Array.isArray(body) && !Array.isArray(record?.requests)) {
    return failedReadback("Requests read failed: invalid response", token);
  }
  const list = Array.isArray(body) ? body : asArray(record?.requests);
  const rows = list.flatMap((value, index) => {
    const request = asRecord(value);
    if (request === undefined) return [];
    const id = String(request.requestId ?? request.id ?? index);
    return [
      row(
        id,
        String(request.modelId ?? request.model ?? id),
        String(request.status ?? request.statusCode ?? ""),
        String(request.endpointId ?? request.providerId ?? ""),
      ),
    ];
  });
  return okRows(rows, token);
};

const parseRouterDecisions = (body: unknown, token: number): ReadbackState => {
  const record = asRecord(body);
  if (!Array.isArray(body) && !Array.isArray(record?.decisions)) {
    return failedReadback("Router decisions read failed: invalid response", token);
  }
  const list = Array.isArray(body) ? body : asArray(record?.decisions);
  const rows = list.flatMap((value, index) => {
    const decision = asRecord(value);
    if (decision === undefined) return [];
    const id = String(decision.requestId ?? decision.id ?? index);
    return [
      row(
        id,
        String(decision.modelId ?? decision.selectedModel ?? id),
        String(decision.confidence ?? decision.score ?? ""),
        String(decision.endpointId ?? decision.providerId ?? ""),
      ),
    ];
  });
  return okRows(rows, token);
};

const parseLocalPeers = (body: unknown, token: number): ReadbackState => {
  const record = asRecord(body);
  if (!Array.isArray(body) && !Array.isArray(record?.peers)) {
    return failedReadback("Local peers read failed: invalid response", token);
  }
  const list = Array.isArray(body) ? body : asArray(record?.peers);
  const rows = list.flatMap((value, index) => {
    const peer = asRecord(value);
    if (peer === undefined) return [];
    const id = String(peer.id ?? index);
    return [row(id, String(peer.url ?? id), peer.authToken === undefined ? "no auth" : "auth", "")];
  });
  return okRows(rows, token);
};

const parseRuntime = (body: unknown, token: number): ReadbackState => {
  const record = asRecord(body);
  if (
    record === undefined ||
    (record.config !== undefined && record.config !== null && asRecord(record.config) === undefined)
  ) {
    return failedReadback("Runtime read failed: invalid response", token);
  }
  const config = asRecord(record.config) ?? record;
  const rows = Object.entries(config)
    .filter(
      ([, value]) =>
        typeof value === "string" || typeof value === "number" || typeof value === "boolean",
    )
    .slice(0, 40)
    .map(([key, value]) => row(key, key, String(value), "config"));
  return okRows(rows, token);
};

const parseSessionReadiness = (body: unknown, token: number): ReadbackState => {
  const record = asRecord(body);
  if (record === undefined) return failedReadback("Session readiness read failed: invalid response", token);
  const overall = typeof record.overall === "string" ? record.overall : undefined;
  if (overall === undefined) return { rows: [], status: "empty", token };
  const context = asRecord(record.context);
  const rows = [
    row("overall", "Overall", overall, typeof record.observationSource === "string" ? record.observationSource : ""),
    row("channel", "Channel", String(context?.channel ?? "—"), String(context?.scope ?? "")),
    row("observedAt", "Observed", String(record.observedAt ?? "—"), "timestamp"),
  ];
  return okRows(rows, token);
};

const parseDashboard = (body: unknown, token: number): ReadbackState => {
  const record = asRecord(body);
  if (record === undefined || typeof record.requestCount !== "number") {
    return failedReadback("Dashboard read failed: invalid response", token);
  }
  const value = (key: string): string => {
    const field = record[key];
    return typeof field === "number" ? String(field) : typeof field === "string" ? field : "—";
  };
  if (record.requestCount === 0) return { rows: [], status: "empty", token };
  const rows = [
    row("requestCount", "Requests", value("requestCount"), `${value("successCount")} success / ${value("failureCount")} failed`),
    row("tokens", "Tokens", value("totalTokens"), `${value("totalInputTokens")} in / ${value("totalOutputTokens")} out`),
    row("latency", "Latency", value("averageLatencyMs"), `p95 ${value("p95LatencyMs")} ms`),
    row("cost", "Cost", value("totalEffectiveCostUsd"), `actual ${value("totalActualCostUsd")} / estimated ${value("totalEstimatedCostUsd")}`),
    row("cached", "Cached requests", value("cachedRequestCount"), "prompt cache"),
    row("excluded", "Excluded", value("excludedRequestCount"), "traffic-class exclusion"),
  ];
  return okRows(rows, token);
};

const parseLocalSwap = (body: unknown, token: number): ReadbackState => {
  const record = asRecord(body);
  const list = Array.isArray(body) ? body : asArray(record?.events);
  const rows = list.flatMap((value, index) => {
    const event = asRecord(value);
    if (event === undefined) return [];
    return [
      row(
        String(event.id ?? index),
        String(event.model ?? event.newModel ?? "swap"),
        String(event.reason ?? event.oldModel ?? ""),
        String(event.atMs ?? event.timestamp ?? ""),
      ),
    ];
  });
  return okRows(rows, token);
};

const parseObserveActivity = (body: unknown, token: number): ReadbackState => {
  const record = asRecord(body);
  const list = Array.isArray(body) ? body : asArray(record?.items);
  const rows = list.flatMap((value, index) => {
    const entry = asRecord(value);
    if (entry === undefined) return [];
    return [
      row(
        String(entry.id ?? entry.requestId ?? index),
        String(entry.request_id ?? entry.id ?? entry.kind ?? "activity"),
        String(entry.status ?? entry.model_id ?? entry.request_operation ?? ""),
        String(entry.atMs ?? ""),
      ),
    ];
  });
  return okRows(rows, token);
};

const parseObserveLogs = (body: unknown, token: number): ReadbackState => {
  const record = asRecord(body);
  if (record === undefined || (record.logs !== undefined && typeof record.logs !== "string")) {
    return failedReadback("Observe logs read failed: invalid response", token);
  }
  const logs = typeof record.logs === "string" ? record.logs.trim() : "";
  return logs.length === 0
    ? { rows: [], status: "empty", token }
    : okRows(
        [
          row(
            "logs",
            "Observe logs",
            String(logs.split("\n").length),
            `${String(logs.length)} chars`,
          ),
        ],
        token,
      );
};

const parseObserveRouting = (body: unknown, token: number): ReadbackState => {
  const record = asRecord(body);
  const list = Array.isArray(body) ? body : asArray(record?.rows);
  const rows = list.flatMap((value, index) => {
    const entry = asRecord(value);
    if (entry === undefined) return [];
    return [
      row(
        String(entry.model ?? entry.modelId ?? index),
        String(entry.model ?? entry.modelId ?? "row"),
        String(entry.count ?? entry.requests ?? ""),
        String(entry.endpointId ?? ""),
      ),
    ];
  });
  return okRows(rows, token);
};

const parseRouter = (body: unknown, token: number): ReadbackState => {
  const record = asRecord(body);
  if (record === undefined) return failedReadback("Router read failed: invalid response", token);
  const rows = Object.entries(record)
    .filter(
      ([, value]) =>
        typeof value === "string" || typeof value === "number" || typeof value === "boolean",
    )
    .slice(0, 40)
    .map(([key, value]) => row(key, key, String(value), "summary"));
  return okRows(rows, token);
};

/** Store degradation receipts: two readback sources, each with a receipts array. */
const parseStoreReceipts = (body: unknown, token: number): ReadbackState => {
  const record = asRecord(body);
  if (record === undefined) {
    return failedReadback("Store receipts read failed: invalid response", token);
  }
  if (record.store === undefined && record.worker === undefined) {
    return failedReadback("Store receipts read failed: invalid response", token);
  }
  const rows: ReadbackRow[] = [];
  for (const sourceName of ["store", "worker"] as const) {
    const source = asRecord(record[sourceName]);
    if (source === undefined) continue;
    const receipts = asArray(source.receipts);
    for (const [index, value] of receipts.entries()) {
      const receipt = asRecord(value);
      if (receipt === undefined) continue;
      rows.push(
        row(
          `${sourceName}:${String(receipt.id ?? index)}`,
          `${sourceName} · ${String(receipt.code ?? receipt.reason ?? "receipt")}`,
          String(receipt.count ?? receipt.atMs ?? ""),
          String(receipt.level ?? receipt.reason ?? ""),
        ),
      );
    }
  }
  return okRows(rows, token);
};

/** Queue list: an unavailable readback is an error; a queue list is rows. */
const parseQueues = (body: unknown, token: number): ReadbackState => {
  const record = asRecord(body);
  if (record === undefined) return failedReadback("Queues read failed: invalid response", token);
  if (record.available === false) {
    return failedReadback(
      readbackErrorMessage("Queues", 503, reasonOf(record) ?? "unavailable"),
      token,
    );
  }
  if (record.queues !== undefined && !Array.isArray(record.queues)) {
    return failedReadback("Queues read failed: invalid response", token);
  }
  if (record.queues === undefined) {
    return failedReadback("Queues read failed: invalid response", token);
  }
  const rows = asArray(record.queues).flatMap((value) => {
    const queue = asRecord(value);
    if (queue === undefined) return [];
    const name = String(queue.name ?? "unnamed");
    return [
      row(
        name,
        name,
        String(queue.active ?? 0),
        `waiting ${String(queue.waiting ?? 0)} · failed ${String(queue.failed ?? 0)}`,
      ),
    ];
  });
  return okRows(rows, token);
};

/** Local logs: a non-empty log body is the single row; an empty body is the empty state. */
const parseLocalLogs = (body: unknown, token: number): ReadbackState => {
  const record = asRecord(body);
  if (record === undefined)
    return failedReadback("Local logs read failed: invalid response", token);
  const logs = typeof record.logs === "string" ? record.logs.trim() : "";
  return logs.length === 0
    ? { rows: [], status: "empty", token }
    : okRows(
        [
          row(
            "logs",
            "Local logs",
            String(logs.split("\n").length),
            `${String(logs.length)} chars`,
          ),
        ],
        token,
      );
};

/** Router candidates: the host returns an array (or a bounded candidates envelope). */
const parseRouterCandidates = (body: unknown, token: number): ReadbackState => {
  const record = asRecord(body);
  if (!Array.isArray(body) && !Array.isArray(record?.candidates)) {
    return failedReadback("Router candidates read failed: invalid response", token);
  }
  const candidates = Array.isArray(body) ? body : asArray(record?.candidates);
  const rows = candidates.flatMap((value, index) => {
    const candidate = asRecord(value);
    if (candidate === undefined) return [];
    const id = String(candidate.id ?? candidate.modelId ?? index);
    return [
      row(
        id,
        String(candidate.modelId ?? candidate.id ?? "candidate"),
        String(candidate.score ?? candidate.totalScore ?? ""),
        String(candidate.endpointId ?? candidate.providerId ?? ""),
      ),
    ];
  });
  return okRows(rows, token);
};

const parseScalarRows = (label: string) => (body: unknown, token: number): ReadbackState => {
  const record = asRecord(body);
  if (record === undefined) return failedReadback(label + " read failed: invalid response", token);
  const rows = Object.entries(record)
    .filter(([, value]) => typeof value === "string" || typeof value === "number" || typeof value === "boolean")
    .slice(0, 40)
    .map(([key, value]) => row(key, key, String(value), label));
  return okRows(rows, token);
};
const parseLocalPeerModels = (body: unknown, token: number): ReadbackState => {
  const list = Array.isArray(body) ? body : asArray(asRecord(body)?.models);
  const rows = list.flatMap((value, index) => {
    const model = asRecord(value);
    if (model === undefined) return [];
    const id = String(model.modelId ?? model.id ?? index);
    return [row(id, String(model.modelId ?? model.id ?? id), String(model.status ?? model.provider ?? ""), String(model.peerId ?? model.endpointId ?? ""))];
  });
  return okRows(rows, token);
};
const parseQueueConfig = parseScalarRows("Queue config");
const parseDownstreamOpenAI = parseScalarRows("Downstream OpenAI");
const parseIntegrationProviders = (body: unknown, token: number): ReadbackState => {
  const list = Array.isArray(body) ? body : asArray(asRecord(body)?.providers);
  const rows = list.flatMap((value, index) => {
    const provider = asRecord(value);
    if (provider === undefined) return [];
    const id = String(provider.providerId ?? provider.id ?? index);
    return [row(id, String(provider.providerId ?? provider.id ?? id), String(provider.providerKind ?? provider.kind ?? ""), String(provider.status ?? ""))];
  });
  return okRows(rows, token);
};

const parseModelList = (body: unknown, token: number): ReadbackState => {
  const list = Array.isArray(body) ? body : asArray(asRecord(body)?.data);
  const rows = list.flatMap((value, index) => {
    const model = asRecord(value);
    if (model === undefined || (model.id === undefined && model.modelId === undefined)) return [];
    return [row(String(model.id ?? model.modelId ?? index), String(model.displayName ?? model.id ?? index), String(model.providerId ?? ""), "model")];
  });
  if (list.length > 0 && rows.length === 0) return failedReadback("Models read failed: invalid response", token);
  return okRows(rows, token);
};
const parseRuntimeSummary = (body: unknown, token: number): ReadbackState => {
  const record = asRecord(body);
  if (record === undefined) return failedReadback("Runtime summary read failed: invalid response", token);
  const runtime = asRecord(record.runtime);
  if (runtime === undefined || typeof record.endpointCount !== "number") return failedReadback("Runtime summary read failed: invalid response", token);
  const rows = [
    row("endpoint", "Endpoint", String(runtime?.endpoint ?? "—"), String(runtime?.channel ?? "")),
    row("endpointCount", "Endpoints", String(record.endpointCount ?? "—"), "runtime"),
    row("providerCount", "Providers", String(record.providerCount ?? "—"), "runtime"),
    row("accountCount", "Accounts", String(record.accountCount ?? "—"), "runtime"),
    row("executionMode", "Execution mode", String(record.executionMode ?? "—"), "runtime"),
  ];
  return okRows(rows, token);
};
const parseHealth = (body: unknown, token: number): ReadbackState => {
  const record = asRecord(body);
  if (record === undefined) return failedReadback("Health read failed: invalid response", token);
  const runtime = asRecord(record.runtime);
  const rows = [
    row("status", "Status", String(record.status ?? "—"), "health"),
    row("endpoint", "Endpoint", String(runtime?.endpoint ?? "—"), String(runtime?.version ?? "")),
    row("executionMode", "Execution mode", String(record.executionMode ?? "—"), "health"),
  ];
  return okRows(rows, token);
};
const parseBenchmarkSuite = (body: unknown, token: number): ReadbackState => {
  const record = asRecord(body);
  const list = asArray(record?.cases);
  const rows = list.flatMap((value, index) => {
    const item = asRecord(value);
    if (item === undefined) return [];
    return [row(String(item.case_id ?? index), String(item.case_id ?? index), String(item.difficulty_bucket ?? ""), String(item.category ?? ""))];
  });
  return okRows(rows, token);
};
const parseStorageRetention = (body: unknown, token: number): ReadbackState => {
  const record = asRecord(body);
  if (record === undefined) return failedReadback("Storage retention read failed: invalid response", token);
  if (record.totalCount === 0 && asArray(record.categories).length === 0 && asArray(record.receipts).length === 0) return { rows: [], status: "empty", token };
  const rows = [
    row("totalBytes", "Total bytes", String(record.totalBytes ?? "—"), "retention"),
    row("totalCount", "Total rows", String(record.totalCount ?? "—"), "retention"),
    row("categories", "Categories", String(asArray(record.categories).length), "retention"),
    row("receipts", "Receipts", String(asArray(record.receipts).length), "retention"),
  ];
  return okRows(rows, token);
};

const parseObservationDetail = (body: unknown, token: number): ReadbackState => {
  const record = asRecord(body);
  if (record === undefined) return failedReadback("Detail read failed: invalid response", token);
  if (record.requestId === undefined && record.routingDecisionId === undefined) {
    return { rows: [], status: "empty", token };
  }
  const rows = [
    row("request", "Request", String(record.requestId ?? "—"), "requestId"),
    row("decision", "Decision", String(record.routingDecisionId ?? "—"), "routingDecisionId"),
    row("endpoint", "Endpoint", String(record.endpointId ?? record.selectedEndpointId ?? "—"), "endpoint"),
    row("status", "Status", String(record.statusFamily ?? record.status ?? "—"), "status"),
  ];
  return okRows(rows, token);
};

export const READBACK_SPECS: Readonly<Record<ReadbackKey, ReadbackRouteSpec>> = {
  localLogs: {
    emptyText: "No local logs recorded yet.",
    key: "localLogs",
    label: "Local logs",
    parse: parseLocalLogs,
    path: READBACK_PATHS.localLogs,
  },
  queues: {
    emptyText: "No queues configured yet.",
    key: "queues",
    label: "Queues",
    parse: parseQueues,
    path: READBACK_PATHS.queues,
  },
  routerCandidates: {
    emptyText: "No router candidates yet.",
    key: "routerCandidates",
    label: "Router candidates",
    parse: parseRouterCandidates,
    path: READBACK_PATHS.routerCandidates,
  },
  storeReceipts: {
    emptyText: "No store degradation receipts yet.",
    key: "storeReceipts",
    label: "Store receipts",
    parse: parseStoreReceipts,
    path: READBACK_PATHS.storeReceipts,
  },
  dashboard: {
    emptyText: "No dashboard requests recorded yet.",
    key: "dashboard",
    label: "Dashboard",
    parse: parseDashboard,
    path: READBACK_PATHS.dashboard,
  },
  localSwap: {
    emptyText: "No local swap events recorded yet.",
    key: "localSwap",
    label: "Local swap",
    parse: parseLocalSwap,
    path: READBACK_PATHS.localSwap,
  },
  observeActivity: {
    emptyText: "No host activity recorded yet.",
    key: "observeActivity",
    label: "Observe activity",
    parse: parseObserveActivity,
    path: READBACK_PATHS.observeActivity,
  },
  observeLogs: {
    emptyText: "No observe logs recorded yet.",
    key: "observeLogs",
    label: "Observe logs",
    parse: parseObserveLogs,
    path: READBACK_PATHS.observeLogs,
  },
  observeRouting: {
    emptyText: "No routing rows recorded yet.",
    key: "observeRouting",
    label: "Observe routing",
    parse: parseObserveRouting,
    path: READBACK_PATHS.observeRouting,
  },
  router: {
    emptyText: "No router summary available.",
    key: "router",
    label: "Router",
    parse: parseRouter,
    path: READBACK_PATHS.router,
  },
  requestDetail: {
    emptyText: "No request detail available.",
    key: "requestDetail",
    label: "Request detail",
    parse: parseObservationDetail,
    path: READBACK_PATHS.requestDetail,
    pathFor: (id) => READBACK_PATHS.requestDetail + encodeURIComponent(id),
  },
  routerDecisionDetail: {
    emptyText: "No router decision detail available.",
    key: "routerDecisionDetail",
    label: "Router decision detail",
    parse: parseObservationDetail,
    path: READBACK_PATHS.routerDecisionDetail,
    pathFor: (id) => READBACK_PATHS.routerDecisionDetail + encodeURIComponent(id),
  },
  localPeerModels: {
    emptyText: "No peer models configured yet.",
    key: "localPeerModels",
    label: "Peer models",
    parse: parseLocalPeerModels,
    path: READBACK_PATHS.localPeerModels,
  },
  queueConfig: {
    emptyText: "No queue configuration available.",
    key: "queueConfig",
    label: "Queue configuration",
    parse: parseQueueConfig,
    path: READBACK_PATHS.queueConfig,
  },
  downstreamOpenAI: {
    emptyText: "No downstream OpenAI configuration available.",
    key: "downstreamOpenAI",
    label: "Downstream OpenAI",
    parse: parseDownstreamOpenAI,
    path: READBACK_PATHS.downstreamOpenAI,
  },
  integrationProviders: {
    emptyText: "No integration providers configured yet.",
    key: "integrationProviders",
    label: "Integration providers",
    parse: parseIntegrationProviders,
    path: READBACK_PATHS.integrationProviders,
  },
  benchmarkSuite: {
    emptyText: "No benchmark suite available.",
    key: "benchmarkSuite",
    label: "Benchmark suite",
    parse: parseBenchmarkSuite,
    path: READBACK_PATHS.benchmarkSuite,
  },
  storageRetention: {
    emptyText: "No storage retention records available.",
    key: "storageRetention",
    label: "Storage retention",
    parse: parseStorageRetention,
    path: READBACK_PATHS.storageRetention,
  },
  models: {
    emptyText: "No models configured.",
    key: "models",
    label: "Models",
    parse: parseModelList,
    path: READBACK_PATHS.models,
  },
  runtimeSummary: {
    emptyText: "No runtime summary available.",
    key: "runtimeSummary",
    label: "Runtime summary",
    parse: parseRuntimeSummary,
    path: READBACK_PATHS.runtimeSummary,
  },
  health: {
    emptyText: "No health state available.",
    key: "health",
    label: "Health",
    parse: parseHealth,
    path: READBACK_PATHS.health,
  },
  requests: {
    emptyText: "No telemetry requests recorded yet.",
    key: "requests",
    label: "Requests",
    parse: parseRequests,
    path: READBACK_PATHS.requests,
  },
  routerDecisions: {
    emptyText: "No router decisions recorded yet.",
    key: "routerDecisions",
    label: "Router decisions",
    parse: parseRouterDecisions,
    path: READBACK_PATHS.routerDecisions,
  },
  systemPeers: {
    emptyText: "No system peers configured yet.",
    key: "systemPeers",
    label: "System peers",
    parse: parseLocalPeers,
    path: READBACK_PATHS.systemPeers,
  },
  localPeers: {
    emptyText: "No local peers configured yet.",
    key: "localPeers",
    label: "Local peers",
    parse: parseLocalPeers,
    path: READBACK_PATHS.localPeers,
  },
  runtime: {
    emptyText: "No runtime configuration available.",
    key: "runtime",
    label: "Runtime",
    parse: parseRuntime,
    path: READBACK_PATHS.runtime,
  },
  sessionReadiness: {
    emptyText: "No session readiness state available.",
    key: "sessionReadiness",
    label: "Session readiness",
    parse: parseSessionReadiness,
    path: READBACK_PATHS.sessionReadiness,
  },
};

export interface ReadbackClientOptions {
  readonly fetchImpl?: typeof fetch;
  readonly baseUrl?: string;
  readonly token?: string;
}

export const createReadbackClient = (
  spec: ReadbackRouteSpec,
  options: ReadbackClientOptions = {},
): ReadbackReader => {
  const fetchImpl = options.fetchImpl ?? fetch;
  const base = new URL(options.baseUrl ?? globalThis.location?.origin ?? "http://127.0.0.1");
  return async (input) => {
    const url = new URL(spec.pathFor?.(input.id ?? "") ?? spec.path, base);
    const headers: Record<string, string> = { accept: "application/json" };
    if (options.token !== undefined && options.token.length > 0) {
      headers.authorization = `Bearer ${options.token}`;
    }
    const response = await fetchImpl(url.toString(), {
      cache: "no-store",
      headers,
      method: "GET",
      signal: input.signal,
    });
    const text = await response.text();
    let body: unknown = {};
    if (text.trim().length > 0) {
      try {
        body = JSON.parse(text);
      } catch {
        body = { message: "non-JSON body" };
      }
    }
    return { body, status: response.status };
  };
};

export const createReadbackClients = (
  options: ReadbackClientOptions = {},
): Readonly<Record<ReadbackKey, ReadbackReader>> => ({
  dashboard: createReadbackClient(READBACK_SPECS.dashboard, options),
  localLogs: createReadbackClient(READBACK_SPECS.localLogs, options),
  localPeers: createReadbackClient(READBACK_SPECS.localPeers, options),
  systemPeers: createReadbackClient(READBACK_SPECS.systemPeers, options),
  localSwap: createReadbackClient(READBACK_SPECS.localSwap, options),
  observeActivity: createReadbackClient(READBACK_SPECS.observeActivity, options),
  observeLogs: createReadbackClient(READBACK_SPECS.observeLogs, options),
  observeRouting: createReadbackClient(READBACK_SPECS.observeRouting, options),
  queues: createReadbackClient(READBACK_SPECS.queues, options),
  requests: createReadbackClient(READBACK_SPECS.requests, options),
  router: createReadbackClient(READBACK_SPECS.router, options),
  routerCandidates: createReadbackClient(READBACK_SPECS.routerCandidates, options),
  routerDecisions: createReadbackClient(READBACK_SPECS.routerDecisions, options),
  runtime: createReadbackClient(READBACK_SPECS.runtime, options),
  sessionReadiness: createReadbackClient(READBACK_SPECS.sessionReadiness, options),
  storeReceipts: createReadbackClient(READBACK_SPECS.storeReceipts, options),
  requestDetail: createReadbackClient(READBACK_SPECS.requestDetail, options),
  routerDecisionDetail: createReadbackClient(READBACK_SPECS.routerDecisionDetail, options),
  localPeerModels: createReadbackClient(READBACK_SPECS.localPeerModels, options),
  queueConfig: createReadbackClient(READBACK_SPECS.queueConfig, options),
  downstreamOpenAI: createReadbackClient(READBACK_SPECS.downstreamOpenAI, options),
  integrationProviders: createReadbackClient(READBACK_SPECS.integrationProviders, options),
  benchmarkSuite: createReadbackClient(READBACK_SPECS.benchmarkSuite, options),
  storageRetention: createReadbackClient(READBACK_SPECS.storageRetention, options),
  models: createReadbackClient(READBACK_SPECS.models, options),
  runtimeSummary: createReadbackClient(READBACK_SPECS.runtimeSummary, options),
  health: createReadbackClient(READBACK_SPECS.health, options),
});

export const readbackFromResult = (
  spec: ReadbackRouteSpec,
  result: ReadbackResult,
  token: number,
  id?: string,
): ReadbackState => {
  if (result.status !== 200) {
    return failedReadback(
      readbackErrorMessage(spec.label, result.status, reasonOf(result.body)),
      token,
    );
  }
  const parsed = spec.parse(result.body, token);
  return id === undefined ? parsed : { ...parsed, detailId: id };
};
export const renderReadbackPage = (
  spec: ReadbackRouteSpec,
  state: ReadbackState,
  h: HtmlBuilder<Message>,
): Html => {
  const statusText = (() => {
    switch (state.status) {
      case "loading":
        return `Loading ${spec.label.toLowerCase()}…`;
      case "error":
        return state.message ?? `${spec.label} read failed: unknown error`;
      case "empty":
        return spec.emptyText;
      case "ok":
        return `${String(state.rows.length)} row(s) from the live host read`;
      case "idle":
        return `Waiting for the ${spec.label.toLowerCase()} read.`;
    }
  })();
  return h.section(
    [
      h.Class("rm3-next-route mt-4"),
      h.DataAttribute("route", "readback"),
      h.DataAttribute("readback-route", spec.key),
      h.DataAttribute("readback-state", state.status),
      h.DataAttribute("state", state.status),
      ...(state.status === "error" ? [h.Role("alert")] : []),
    ],
    [
      h.p(
        [h.Class("text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--rm-muted)]")],
        ["Runtime readback"],
      ),
      h.h1([h.Class("rm3-next-route-title")], [spec.label]),
      h.p(
        [
          h.Role("status"),
          h.AriaLive("polite"),
          h.AriaBusy(state.status === "loading"),
          h.Class("mt-1 text-[13px] leading-5 text-[var(--rm-secondary)]"),
        ],
        [statusText],
      ),
      ...(state.status === "ok"
        ? [
            h.ul(
              [h.Class("mt-3 space-y-1.5")],
              state.rows.map((item) =>
                h.li(
                  [
                    h.Class(
                      "flex flex-wrap items-baseline gap-2 rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] bg-[var(--rm-surface)] px-2 py-1.5 text-[12px] leading-4",
                    ),
                  ],
                  [
                    h.span([h.Class("break-all font-mono text-[var(--rm-fg)]")], [item.label]),
                    h.span([h.Class("ml-auto font-medium text-[var(--rm-fg)]")], [item.value]),
                    h.span([h.Class("text-[11px] text-[var(--rm-secondary)]")], [item.meta]),
                  ],
                ),
              ),
            ),
          ]
        : []),
      h.p(
        [h.Class("mt-3 text-[11px] leading-4 text-[var(--rm-muted)]")],
        [
          "Refresh follows the shell's single runtime subscription; this page does not open its own.",
        ],
      ),
    ],
  );
};
export const readbackKeyForRouteTag = (tag: string): ReadbackKey | null =>
  tag === "StoreReceipts"
    ? "storeReceipts"
    : tag === "Queues"
      ? "queues"
      : tag === "LocalLogs"
        ? "localLogs"
        : tag === "RouterCandidates"
          ? "routerCandidates"
          : tag === "Requests"
            ? "requests"
            : tag === "RouterDecisions"
              ? "routerDecisions"
              : tag === "LocalPeers"
                ? "localPeers"
                : tag === "SystemPeers"
                  ? "systemPeers"
                  : tag === "Runtime"
                    ? "runtime"
                    : tag === "SessionReadiness"
                      ? "sessionReadiness"
                      : tag === "Dashboard"
                        ? "dashboard"
                        : tag === "LocalSwap"
                          ? "localSwap"
                          : tag === "ObserveActivity"
                            ? "observeActivity"
                            : tag === "ObserveLogs"
                              ? "observeLogs"
                              : tag === "ObserveRouting"
                                ? "observeRouting"
                                : tag === "Router"
                                  ? "router"
                                  : tag === "RequestDetail"
                                    ? "requestDetail"
                                    : tag === "RouterDecisionDetail"
                                      ? "routerDecisionDetail"
                                      : tag === "LocalPeerModels"
                                        ? "localPeerModels"
                                        : tag === "QueuesConfiguration"
                                          ? "queueConfig"
                                          : tag === "IntegrationsDownstream"
                                            ? "downstreamOpenAI"
                                            : tag === "IntegrationsUpstream"
                                              ? "integrationProviders"
                                              : tag === "Benchmark"
                                                ? "benchmarkSuite"
                                                : tag === "StorageRetention"
                                                  ? "storageRetention"
                                              : null;
export const parseReadbackFixture = (key: ReadbackKey, body: unknown, token = 1): ReadbackState =>
  READBACK_SPECS[key].parse(body, token);