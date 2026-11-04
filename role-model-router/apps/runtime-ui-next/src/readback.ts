import type { Html, HtmlBuilder } from "@role-model-router/foldkit/html";
import { Schema } from "effect";

import type { Message } from "./message";
import { createReadbackFlightTransport } from "./readback-flight";
import { type LearningPayloadJson, learningLadderRowKey, parseLearningLadderPayload } from "./learning-ranking";
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
  | "providerCatalog"
  | "providerAccounts"
  | "roles"
  | "rolePolicy"
  | "benchmarkSuite"
  | "benchmarkSummary"
  | "benchmarkRuns"
  | "benchmarkPreferences"
  | "benchmarkActiveRun"
  | "storageRetention"
  | "models"
  | "runtimeSummary"
  | "health"
  | "overviewMetrics"
  | "learning"
  | "learningConfiguration"
  | "learningPacks"
  | "learningDecisions"
  | "learningEvidence"
  | "learningHistory"
  | "localLlamaSwapModels"
  | "localPolicy"
  | "operatorStatus"
  | "operatorTraceRoots"
  | "extensions"
  | "replayJobs"
  | "evaluationJobs"
  | "learningProfile"
  | "learningAdvisory"
  | "contribution"
  | "recommendations"
  | "replayAutomation"
  | "configuredModels"
  | "modelEndpoints"
  | "runtimeConfig"
  | "routerConfig";

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
  "providerCatalog",
  "providerAccounts",
  "roles",
  "rolePolicy",
  "benchmarkSuite",
  "benchmarkSummary",
  "benchmarkRuns",
  "benchmarkPreferences",
  "benchmarkActiveRun",
  "storageRetention",
  "models",
  "runtimeSummary",
  "health",
  "overviewMetrics",
  "learning",
  "learningConfiguration",
  "learningPacks",
  "learningDecisions",
  "learningEvidence",
  "learningHistory",
  "localLlamaSwapModels",
  "localPolicy",
  "operatorStatus",
  "operatorTraceRoots",
  "extensions",
  "replayJobs",
  "evaluationJobs",
  "learningProfile",
  "learningAdvisory",
  "contribution",
  "recommendations",
  "replayAutomation",
  "configuredModels",
  "modelEndpoints",
  "runtimeConfig",
  "routerConfig",
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
  scopeId: Schema.optional(Schema.String),
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
  providerCatalog: ReadbackState,
  providerAccounts: ReadbackState,
  roles: ReadbackState,
  rolePolicy: ReadbackState,
  benchmarkSuite: ReadbackState,
  benchmarkSummary: ReadbackState,
  benchmarkRuns: ReadbackState,
  benchmarkPreferences: ReadbackState,
  benchmarkActiveRun: ReadbackState,
  storageRetention: ReadbackState,
  models: ReadbackState,
  runtimeSummary: ReadbackState,
  health: ReadbackState,
  overviewMetrics: ReadbackState,
  learning: ReadbackState,
  learningConfiguration: ReadbackState,
  learningPacks: ReadbackState,
  learningDecisions: ReadbackState,
  learningEvidence: ReadbackState,
  learningHistory: ReadbackState,
  localLlamaSwapModels: ReadbackState,
  localPolicy: ReadbackState,
  operatorStatus: ReadbackState,
  operatorTraceRoots: ReadbackState,
  extensions: ReadbackState,
  replayJobs: ReadbackState,
  evaluationJobs: ReadbackState,
  learningProfile: ReadbackState,
  learningAdvisory: ReadbackState,
  contribution: ReadbackState,
  recommendations: ReadbackState,
  replayAutomation: ReadbackState,
  configuredModels: ReadbackState,
  modelEndpoints: ReadbackState,
  runtimeConfig: ReadbackState,
  routerConfig: ReadbackState,
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
  providerCatalog: idleReadback(),
  providerAccounts: idleReadback(),
  roles: idleReadback(),
  rolePolicy: idleReadback(),
  benchmarkSuite: idleReadback(),
  benchmarkSummary: idleReadback(),
  benchmarkRuns: idleReadback(),
  benchmarkPreferences: idleReadback(),
  benchmarkActiveRun: idleReadback(),
  storageRetention: idleReadback(),
  models: idleReadback(),
  runtimeSummary: idleReadback(),
  health: idleReadback(),
  overviewMetrics: idleReadback(),
  learning: idleReadback(),
  learningConfiguration: idleReadback(),
  learningPacks: idleReadback(),
  learningDecisions: idleReadback(),
  learningEvidence: idleReadback(),
  learningHistory: idleReadback(),
  localLlamaSwapModels: idleReadback(),
  localPolicy: idleReadback(),
  operatorStatus: idleReadback(),
  operatorTraceRoots: idleReadback(),
  extensions: idleReadback(),
  replayJobs: idleReadback(),
  evaluationJobs: idleReadback(),
  learningProfile: idleReadback(),
  learningAdvisory: idleReadback(),
  contribution: idleReadback(),
  recommendations: idleReadback(),
  replayAutomation: idleReadback(),
  configuredModels: idleReadback(),
  modelEndpoints: idleReadback(),
  runtimeConfig: idleReadback(),
  routerConfig: idleReadback(),
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

export type ReadbackReader = (input: { readonly signal: AbortSignal; readonly id?: string; readonly query?: string }) => Promise<ReadbackResult>;

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
    return [row(id, String(peer.url ?? id), peer.authToken === undefined ? "no auth" : "auth", JSON.stringify({ authToken: typeof peer.authToken === "string" ? peer.authToken : null, id, url: String(peer.url ?? id) }))];
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
        String(entry.model_id ?? entry.modelId ?? entry.request_id ?? "activity"),
        String(entry.status ?? ""),
        JSON.stringify(entry),
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
  if (logs.length === 0) return { rows: [], status: "empty", token };
  const rows = logs.split("\n").flatMap((line, index) => {
    const trimmed = line.trim();
    if (trimmed.length === 0) return [];
    const match = trimmed.match(/^(\S+)\s+(\S+)\s+(.*)$/);
    return [row("log:" + String(index), match?.[1] ?? "log:" + String(index), match?.[2] ?? "combined", trimmed)];
  });
  return okRows(rows, token);
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
        JSON.stringify({ endpointId: candidate.endpointId ?? null, healthStatus: candidate.healthStatus ?? null, pricing: candidate.pricing ?? null, providerId: candidate.providerId ?? null, routingEligible: candidate.routingEligible ?? null, speed: candidate.recentSamples ?? null }),
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

const parseConfiguredModels = (body: unknown, token: number): ReadbackState => {
  const list = Array.isArray(body) ? body : asRecord(body)?.data;
  if (!Array.isArray(list)) return failedReadback("Configured models read failed: invalid response", token);
  const rows = list.flatMap((value, index) => {
    const model = asRecord(value);
    if (model === undefined) return [];
    const id = typeof model.id === "string" ? model.id : typeof model.modelId === "string" ? model.modelId : undefined;
    if (id === undefined) return [];
    return [row(id, String(model.displayName ?? id), String(model.providerId ?? "—"), JSON.stringify({ endpointIds: model.endpoint_ids ?? model.endpointIds ?? [], capabilities: model.capabilities ?? [], contextWindow: model.contextWindow ?? null, id, providerId: model.providerId ?? null }))];
  });
  if (list.length > 0 && rows.length === 0) return failedReadback("Configured models read failed: invalid response", token);
  return okRows(rows, token);
};
const parseModelEndpoints = (body: unknown, token: number): ReadbackState => {
  const list = Array.isArray(body) ? body : asRecord(body)?.endpoints;
  if (!Array.isArray(list)) return failedReadback("Model endpoints read failed: invalid response", token);
  const rows = list.flatMap((value, index) => {
    const endpoint = asRecord(value);
    if (endpoint === undefined) return [];
    const id = typeof endpoint.endpointId === "string" ? endpoint.endpointId : typeof endpoint.id === "string" ? endpoint.id : undefined;
    if (id === undefined) return [];
    return [row(id, id, String(endpoint.modelId ?? "—"), JSON.stringify({ benchmarkEligible: endpoint.benchmarkEligible ?? endpoint.benchmark_eligible ?? null, endpointId: id, executionModeEligible: endpoint.executionModeEligible ?? endpoint.execution_mode_eligible ?? null, healthStatus: endpoint.healthStatus ?? null, modelId: endpoint.modelId ?? null, providerAccountId: endpoint.providerAccountId ?? null, providerId: endpoint.providerId ?? null, reasoningEffort: endpoint.reasoningEffort ?? null, reasoningEffortLevels: endpoint.reasoningEffortLevels ?? [], roleIds: endpoint.roleIds ?? [], sourceType: endpoint.sourceType ?? null, status: endpoint.status ?? null }))];
  });
  if (list.length > 0 && rows.length === 0) return failedReadback("Model endpoints read failed: invalid response", token);
  return okRows(rows, token);
};
const parseLearningFamily = (label: string) => (body: unknown, token: number): ReadbackState => {
  if (body === null || body === undefined) return failedReadback(label + " read failed: invalid response", token);
  const record = asRecord(body);
  const rawScope = record?.scopeId;
  const scopeId = Schema.is(Schema.String)(rawScope) && rawScope.trim().length > 0 ? rawScope.trim() : undefined;
  const list = Array.isArray(body)
    ? body
    : Array.isArray(record?.records)
      ? record.records
      : Array.isArray(record?.items)
        ? record.items
        : Array.isArray(record?.rows)
          ? record.rows
          : record?.data !== undefined
            ? (Array.isArray(record.data) ? record.data : [record.data])
            : record === undefined
              ? []
              : [record];
  const rows = list.slice(0, 40).flatMap((value, index) => {
    const entry = asRecord(value);
    if (entry === undefined) return [row(String(index), label + " " + String(index), String(value), "readback")];
    const id = String(entry.id ?? entry.decisionId ?? entry.packId ?? entry.recordId ?? index);
    const labelText = String(entry.label ?? entry.title ?? entry.kind ?? entry.name ?? id);
    const valueText = String(entry.value ?? entry.status ?? entry.outcome ?? entry.summary ?? entry.origin ?? "");
    return [row(labelText, labelText, valueText, JSON.stringify(entry))];
  });
  const scoped = scopeId === undefined ? undefined : { scopeId };
  return rows.length === 0 ? { rows: [], status: "empty", token, ...scoped } : { ...okRows(rows, token), ...scoped };
};
export const localPolicyReadback = (policy: LocalPolicyObject, token: number): ReadbackState =>
  // SAFETY: LocalPolicyObject is a JSON object record; parseLocalPolicy re-validates the body.
  parseLocalPolicy(policy as LearningPayloadJson, token);

export interface LocalPolicyObject {
  readonly autoUnload?: boolean;
  readonly maxConcurrency?: number;
  readonly ttl?: number;
}

export interface LocalPolicyControls {
  readonly autoUnload: boolean;
  readonly maxConcurrency: number;
  readonly ttl: number;
}

export const localPolicyControls = (draft: LocalPolicyObject | undefined): LocalPolicyControls => ({
  autoUnload: Schema.is(Schema.Boolean)(draft?.autoUnload) ? draft.autoUnload : true,
  maxConcurrency: Schema.is(Schema.Number)(draft?.maxConcurrency) ? draft.maxConcurrency : 1,
  ttl: Schema.is(Schema.Number)(draft?.ttl) ? draft.ttl : 300,
});

const parseLocalPolicy = (body: LearningPayloadJson, token: number): ReadbackState => {
  const policy = asRecord(body);
  if (policy === undefined) return failedReadback("Local policy read failed: invalid response", token);
  const meta = JSON.stringify(policy);
  return {
    rows: [row("policy", "Persisted policy", "", meta), row("draft", "Draft policy", "", meta)],
    status: "ok",
    token,
  };
};

export const localPolicyFromReadback = (state: ReadbackState): LocalPolicyObject | undefined => {
  const meta = state.rows.find((entry) => entry.id === "policy")?.meta;
  if (meta === undefined) return undefined;
  try {
    // SAFETY: readback meta for this row is JSON serialized by parseLocalPolicy from an object.
    return JSON.parse(meta) as LocalPolicyObject;
  } catch {
    return undefined;
  }
};

export const localPolicyDraftFromReadback = (state: ReadbackState): LocalPolicyObject | undefined => {
  const meta = state.rows.find((entry) => entry.id === "draft")?.meta;
  if (meta === undefined) return undefined;
  try {
    // SAFETY: readback meta for this row is JSON serialized by parseLocalPolicy or withLocalPolicyDraft.
    return JSON.parse(meta) as LocalPolicyObject;
  } catch {
    return undefined;
  }
};

export const withLocalPolicyDraft = (state: ReadbackState, draft: LocalPolicyObject): ReadbackState => {
  const meta = JSON.stringify(draft);
  return {
    ...state,
    rows: state.rows.map((entry) => entry.id === "draft" ? { ...entry, meta } : entry),
  };
};

const parseLearning = (body: unknown, token: number): ReadbackState => {
  const record = asRecord(body);
  const knowledge = asRecord(record?.knowledge);
  if (knowledge === undefined) return failedReadback("Learning read failed: invalid response", token);
  if (knowledge.available === false) return { rows: [], status: "empty", token };
  const rows = [
    row("available", "Available", String(knowledge.available ?? "—"), "knowledge"),
    row("schema", "Schema", String(knowledge.schemaVersion ?? "—"), String(knowledge.backend ?? "")),
    row("candidates", "Candidates", String(knowledge.candidates ?? "—"), "knowledge"),
    row("documents", "Indexed documents", String(knowledge.indexedDocuments ?? "—"), "knowledge"),
    row("production", "Production activation", knowledge.productionActivation === true ? "active" : knowledge.productionActivation === false ? "disabled" : "unknown (field absent)", "knowledge"),
    row("receipts", "Receipts", String(knowledge.retrievalReceipts ?? 0) + " retrieval / " + String(knowledge.rollbackReceipts ?? 0) + " rollback / " + String(knowledge.recoveryReceipts ?? 0) + " recovery", "knowledge"),
    row("degradation", "Degradation count", String(knowledge.degradationCount ?? 0), "knowledge"),
  ];
  if (body !== null && body !== undefined && asRecord(body)?.ladders !== undefined) {
    // SAFETY: readback bodies are decoded JSON; the parser validates the ladder shape before use.
    const parsed = parseLearningLadderPayload(body as LearningPayloadJson);
    if (!parsed.ok) return failedReadback("Learning ranking read failed: " + parsed.error, token);
    for (const ladder of parsed.rows) {
      rows.push(row("ladder:" + learningLadderRowKey(ladder), ladder.roleId + " \u00b7 " + ladder.taskTypeId, ladder.rolledBack?.on === true ? "rolled back" : "active", JSON.stringify(ladder)));
    }
  }
  return okRows(rows, token);
};
const parseJobList = (label: string) => (body: unknown, token: number): ReadbackState => {
  const list = Array.isArray(body) ? body : asArray(asRecord(body)?.jobs);
  const rows = list.flatMap((value, index) => {
    const job = asRecord(value);
    if (job === undefined) return [];
    const id = typeof job.id === "string" ? job.id : typeof job.jobId === "string" ? job.jobId : undefined;
    const status = typeof job.status === "string" ? job.status : typeof job.state === "string" ? job.state : undefined;
    if (id === undefined || (status === undefined && job.createdAt === undefined)) return [];
    return [row(id, id, status ?? "recorded", String(job.createdAt ?? ""))];
  });
  if (list.length > 0 && rows.length === 0) return failedReadback(label + " read failed: invalid response", token);
  return okRows(rows, token);
};
const parseReplayJobs = parseJobList("Replay jobs");
const parseEvaluationJobs = parseJobList("Evaluation jobs");
const parseOverviewMetrics = (body: unknown, token: number): ReadbackState => {
  const record = asRecord(body);
  if (record === undefined || !Array.isArray(record.items) || asRecord(record.window) === undefined) {
    return failedReadback("Overview metrics read failed: invalid response", token);
  }
  if (record.items.length === 0) return { rows: [], status: "empty", token };
  return okRows([row("overview", "Items", String(record.items.length), JSON.stringify({ items: record.items, window: record.window }))], token);
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
const parseRouterConfig = (body: unknown, token: number): ReadbackState => {
  const record = asRecord(body);
  if (record === undefined) return failedReadback("Router config read failed: invalid response", token);
  const rows: ReadbackRow[] = [];
  const persisted = asRecord(record.persisted);
  if (persisted?.strategy !== undefined) rows.push(row("strategy", "Routing strategy", String(persisted.strategy), "persisted"));
  if (persisted?.executionMode !== undefined) rows.push(row("executionMode", "Execution mode", String(persisted.executionMode), "persisted"));
  const routing = asRecord(record.routing);
  if (routing !== undefined) {
    for (const [key, value] of Object.entries(routing)) {
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") rows.push(row("routing." + key, "Routing posture: " + key, String(value), "routing"));
      else if (key === "weights" && value !== null && typeof value === "object") rows.push(row("routing.weights", "Routing posture: weights", "custom", JSON.stringify(value)));
    }
  }
  for (const kind of ["agentStrategies", "workloads"] as const) {
    const prefix = kind === "agentStrategies" ? "agentStrategy." : "workload.";
    for (const value of asArray(record[kind])) {
      const entry = asRecord(value);
      if (entry === undefined) continue;
      const name = String(entry.name ?? kind);
      const detail = [entry.routingMode, entry.scoringStrategy].filter((part) => typeof part === "string" && part.length > 0).join(" / ");
      rows.push(row(prefix + name, (kind === "agentStrategies" ? "Agent strategy: " : "Workload: ") + name, detail, "posture"));
    }
  }
  const diagnostics = asRecord(record.postureDiagnostics);
  if (rows.length === 0 && persisted === undefined && routing === undefined && record.agentStrategies === undefined && record.workloads === undefined) {
    return failedReadback("Router config read failed: invalid response", token);
  }
  const violations = asArray(diagnostics?.violations);
  for (const [index, value] of violations.entries()) {
    const violation = asRecord(value);
    rows.push(row("diagnostics.violation." + String(index), "Posture violation", String(violation?.message ?? value), "diagnostics"));
  }
  return okRows(rows, token);
};
const parseRuntimeConfig = (body: unknown, token: number): ReadbackState => {
  const record = asRecord(body);
  if (record === undefined || !("config" in record)) return failedReadback("Runtime config read failed: invalid response", token);
  const config = record.config === null ? {} : asRecord(record.config);
  if (config === undefined) return failedReadback("Runtime config read failed: invalid response", token);
  const replay = asRecord(config.replay);
  const autoQueue = asRecord(replay?.autoQueue) ?? asRecord(replay?.auto_queue);
  const enabled = autoQueue?.enabled === undefined ? true : autoQueue.enabled === true;
  const rawCap = Number(autoQueue?.dailyCap ?? autoQueue?.daily_cap);
  const dailyCap = Number.isInteger(rawCap) && rawCap >= 1 && rawCap <= 1_000_000 ? rawCap : 100;
  return okRows([
    row("runtimeConfig", "Runtime config", JSON.stringify(config, null, 2), JSON.stringify({ applied: record.applied === true, config, path: record.path === undefined ? null : String(record.path) })),
    row("replay.autoQueue", "Replay auto-queue", enabled ? "on" : "off", JSON.stringify({ dailyCap, enabled })),
  ], token);
};
/** Test-only typed entry to the same parser; the readback client still passes its unknown JSON body. */
export const parseRuntimeConfigFixture = (body: { readonly applied?: unknown; readonly config?: unknown; readonly path?: unknown }, token: number): ReadbackState =>
  parseRuntimeConfig(body, token);
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
    return [row(String(item.case_id ?? index), String(item.case_id ?? index), String(item.difficulty_bucket ?? ""), JSON.stringify({
      benchmarkEligible: item.benchmark_eligible === true,
      category: String(item.category ?? ""),
      difficulty: String(item.difficulty_bucket ?? ""),
      quickBenchmark: item.quick_benchmark === true,
    }))];
  });
  return okRows(rows, token);
};
const parseBenchmarkSummary = (body: unknown, token: number): ReadbackState => {
  const record = asRecord(body);
  if (record === undefined) return failedReadback("Benchmark summary read failed: invalid response", token);
  const header = row("summary", "Benchmark summary", String(record.mode ?? ""), JSON.stringify({
    completedAtMs: record.completedAtMs ?? null,
    judgeEndpointId: record.judgeEndpointId ?? null,
    judgeModelId: record.judgeModelId ?? null,
    mode: record.mode ?? null,
    caseAudits: record.caseAudits ?? [],
    runId: record.runId ?? null,
    suiteId: record.suiteId ?? null,
  }));
  const subjects = asArray(record.subjects).flatMap((value) => {
    const subject = asRecord(value);
    if (subject === undefined) return [];
    return [row(String(subject.endpointId ?? ""), String(subject.displayName ?? subject.modelId ?? subject.endpointId ?? ""), String(subject.overallScore ?? ""), JSON.stringify(subject))];
  });
  return okRows([header, ...subjects], token);
};
const parseBenchmarkPreferences = (body: unknown, token: number): ReadbackState => {
  const record = asRecord(body);
  if (record === undefined) return failedReadback("Benchmark preferences read failed: invalid response", token);
  return { rows: [row("preferences", "Benchmark preferences", String(record.judgeEndpointId ?? ""), JSON.stringify(record))], status: "ok", token };
};

const parseBenchmarkActiveRun = (body: unknown, token: number): ReadbackState => {
  const record = asRecord(body);
  if (record === undefined || record.status !== "running") return { rows: [], status: "empty", token };
  return { rows: [row("active-run", "Active benchmark run", String(record.runId ?? ""), JSON.stringify(record))], status: "ok", token };
};

const parseBenchmarkRuns = (body: unknown, token: number): ReadbackState => {
  const list = Array.isArray(body) ? body : asArray(asRecord(body)?.runs);
  const rows = list.flatMap((value, index) => {
    const entry = asRecord(value);
    if (entry === undefined) return [];
    return [row(String(entry.runId ?? index), String(entry.mode ?? ""), String(entry.caseCount ?? ""), JSON.stringify(entry))];
  });
  if (rows.length === 0) return { rows: [], status: "empty", token };
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

const parseProviderCatalog = (body: unknown, token: number): ReadbackState => {
  const list = Array.isArray(body) ? body : [];
  const rows = list.flatMap((value, index) => {
    const entry = asRecord(value);
    if (entry === undefined || typeof entry.providerId !== "string") return [];
    return [row("provider:" + String(index), typeof entry.displayName === "string" ? entry.displayName : entry.providerId, typeof entry.providerKind === "string" ? entry.providerKind : "", JSON.stringify(entry))];
  });
  return okRows(rows, token);
};

const parseProviderAccounts = (body: unknown, token: number): ReadbackState => {
  const list = Array.isArray(body) ? body : [];
  const rows = list.flatMap((value, index) => {
    const entry = asRecord(value);
    if (entry === undefined || typeof entry.providerAccountId !== "string") return [];
    return [row("account:" + String(index), entry.providerAccountId, typeof entry.providerKind === "string" ? entry.providerKind : "", JSON.stringify(entry))];
  });
  return okRows(rows, token);
};

const parseRolePolicy = (body: unknown, token: number): ReadbackState => {
  const record = asRecord(body);
  const roles = record?.roleDefinitions;
  const tasks = record?.taskDefinitions;
  if (!Array.isArray(roles) || !Array.isArray(tasks)) {
    return failedReadback("Role policy read failed: invalid response", token);
  }
  if (roles.length === 0 && tasks.length === 0) return { rows: [], status: "empty", token };
  return {
    rows: [row(
      "role-policy",
      "Runtime role policy",
      String(roles.length) + " roles · " + String(tasks.length) + " tasks",
      JSON.stringify({ roleDefinitions: roles, taskDefinitions: tasks }),
    )],
    status: "ok",
    token,
  };
};

const parseRoles = (body: unknown, token: number): ReadbackState => {
  const list = Array.isArray(body) ? body : [];
  const rows = list.flatMap((value, index) => {
    const entry = asRecord(value);
    if (entry === undefined || typeof entry.roleId !== "string") return [];
    return [row("role:" + String(index), typeof entry.label === "string" ? entry.label : entry.roleId, entry.roleId, JSON.stringify(entry))];
  });
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
    // An empty id used to produce "?windowMs=" (owner-reported malformed query). Default to one day.
    pathFor: (windowMs) => `${READBACK_PATHS.dashboard}?windowMs=${encodeURIComponent(windowMs.length > 0 ? windowMs : "86400000")}`,
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
  routerConfig: {
    emptyText: "No router config rows available.",
    key: "routerConfig",
    label: "Router config",
    parse: parseRouterConfig,
    path: READBACK_PATHS.routerConfig,
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
  providerCatalog: {
    emptyText: "No provider catalog available.",
    key: "providerCatalog",
    label: "Provider catalog",
    parse: parseProviderCatalog,
    path: READBACK_PATHS.providerCatalog,
  },
  roles: {
    emptyText: "No routing roles configured.",
    key: "roles",
    label: "Roles",
    parse: parseRoles,
    path: READBACK_PATHS.roles,
  },
  rolePolicy: {
    emptyText: "No runtime role policy configured.",
    key: "rolePolicy",
    label: "Runtime role policy",
    parse: parseRolePolicy,
    path: READBACK_PATHS.rolePolicy,
  },
  providerAccounts: {
    emptyText: "No provider accounts configured yet.",
    key: "providerAccounts",
    label: "Provider accounts",
    parse: parseProviderAccounts,
    path: READBACK_PATHS.providerAccounts,
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
  benchmarkSummary: {
    emptyText: "No benchmark summary available.",
    key: "benchmarkSummary",
    label: "Benchmark summary",
    parse: parseBenchmarkSummary,
    path: READBACK_PATHS.benchmarkSummary,
  },
  benchmarkRuns: {
    emptyText: "No completed benchmark runs yet.",
    key: "benchmarkRuns",
    label: "Benchmark runs",
    parse: parseBenchmarkRuns,
    path: READBACK_PATHS.benchmarkRuns,
  },
  benchmarkPreferences: {
    emptyText: "No benchmark preferences stored yet.",
    key: "benchmarkPreferences",
    label: "Benchmark preferences",
    parse: parseBenchmarkPreferences,
    path: READBACK_PATHS.benchmarkPreferences,
  },
  benchmarkActiveRun: {
    emptyText: "No active benchmark run.",
    key: "benchmarkActiveRun",
    label: "Active benchmark run",
    parse: parseBenchmarkActiveRun,
    path: READBACK_PATHS.benchmarkActiveRun,
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
  configuredModels: {
    emptyText: "No configured models.",
    key: "configuredModels",
    label: "Configured models",
    parse: parseConfiguredModels,
    path: READBACK_PATHS.configuredModels,
  },
  modelEndpoints: {
    emptyText: "No configured endpoints.",
    key: "modelEndpoints",
    label: "Model endpoints",
    parse: parseModelEndpoints,
    path: READBACK_PATHS.modelEndpoints,
  },
  learning: {
    emptyText: "No knowledge worker state available.",
    key: "learning",
    label: "Knowledge worker",
    parse: parseLearning,
    path: READBACK_PATHS.learning,
  },
  learningConfiguration: { emptyText: "No learning configuration rows.", key: "learningConfiguration", label: "Learning configuration", parse: parseLearningFamily("Learning configuration"), path: READBACK_PATHS.learningConfiguration },
  learningPacks: { emptyText: "No learning packs rows.", key: "learningPacks", label: "Learning packs", parse: parseLearningFamily("Learning packs"), path: READBACK_PATHS.learningPacks },
  learningDecisions: { emptyText: "No learning decisions rows.", key: "learningDecisions", label: "Learning decisions", parse: parseLearningFamily("Learning decisions"), path: READBACK_PATHS.learningDecisions },
  learningEvidence: { emptyText: "No learning evidence rows.", key: "learningEvidence", label: "Learning evidence", parse: parseLearningFamily("Learning evidence"), path: READBACK_PATHS.learningEvidence },
  learningHistory: { emptyText: "No learning history rows.", key: "learningHistory", label: "Learning history", parse: parseLearningFamily("Learning history"), path: READBACK_PATHS.learningHistory },
  localLlamaSwapModels: { emptyText: "No llama-swap models rows.", key: "localLlamaSwapModels", label: "llama-swap models", parse: parseLearningFamily("llama-swap models"), path: READBACK_PATHS.localLlamaSwapModels },
  localPolicy: {
    emptyText: "No local policy configured. Save a policy to see it here.",
    key: "localPolicy",
    label: "Local policy",
    // SAFETY: local policy bodies are JSON records; parseLocalPolicy rejects non-objects.
    parse: (body, token) => parseLocalPolicy(body as LearningPayloadJson, token),
    path: READBACK_PATHS.localPolicy,
  },
  operatorStatus: { emptyText: "No operator status rows.", key: "operatorStatus", label: "Operator status", parse: parseLearningFamily("Operator status"), path: READBACK_PATHS.operatorStatus },
  operatorTraceRoots: { emptyText: "No operator trace-root rows.", key: "operatorTraceRoots", label: "Operator trace roots", parse: parseLearningFamily("Operator trace roots"), path: READBACK_PATHS.operatorTraceRoots },
  learningProfile: { emptyText: "No learning profile rows.", key: "learningProfile", label: "Learning profile", parse: parseLearningFamily("Learning profile"), path: READBACK_PATHS.learningProfile },
  learningAdvisory: { emptyText: "No learning advisory rows.", key: "learningAdvisory", label: "Learning advisory", parse: parseLearningFamily("Learning advisory"), path: READBACK_PATHS.learningAdvisory },
  contribution: { emptyText: "No contribution policy rows.", key: "contribution", label: "Contribution policy", parse: parseLearningFamily("Contribution policy"), path: READBACK_PATHS.contribution },
  recommendations: { emptyText: "No recommendation rows.", key: "recommendations", label: "Recommendations", parse: parseLearningFamily("Recommendations"), path: READBACK_PATHS.recommendations },
  replayAutomation: { emptyText: "No replay automation rows.", key: "replayAutomation", label: "Replay automation", parse: parseLearningFamily("Replay automation"), path: READBACK_PATHS.replayAutomation },
  extensions: { emptyText: "No extension rows.", key: "extensions", label: "Extensions", parse: parseLearningFamily("Extensions"), path: READBACK_PATHS.extensions },
  replayJobs: {
    emptyText: "No replay jobs.",
    key: "replayJobs",
    label: "Replay jobs",
    parse: parseReplayJobs,
    path: READBACK_PATHS.replayJobs,
  },
  evaluationJobs: {
    emptyText: "No evaluation jobs.",
    key: "evaluationJobs",
    label: "Evaluation jobs",
    parse: parseEvaluationJobs,
    path: READBACK_PATHS.evaluationJobs,
  },
  overviewMetrics: {
    emptyText: "No telemetry requests in this window.",
    key: "overviewMetrics",
    label: "Overview metrics",
    parse: parseOverviewMetrics,
    path: READBACK_PATHS.overviewMetrics,
    pathFor: (windowMs) => `${READBACK_PATHS.overviewMetrics}?windowMs=${encodeURIComponent(windowMs.length > 0 ? windowMs : "86400000")}`,
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
  runtimeConfig: {
    emptyText: "No runtime config available.",
    key: "runtimeConfig",
    label: "Runtime config",
    parse: parseRuntimeConfig,
    path: READBACK_PATHS.runtimeConfig,
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
  /** Resolve the operator bearer at request time (the Learning token field updates storage). */
  readonly tokenProvider?: () => string | undefined;
}

export const createReadbackClient = (
  spec: ReadbackRouteSpec,
  options: ReadbackClientOptions = {},
): ReadbackReader => {
  const fetchImpl = options.fetchImpl ?? fetch;
  const base = new URL(options.baseUrl ?? globalThis.location?.origin ?? "http://127.0.0.1");
  return async (input) => {
    const url = new URL(spec.pathFor?.(input.id ?? "") ?? spec.path, base);
    if (input.query !== undefined) url.search = input.query;
    const headers: Record<string, string> = { accept: "application/json" };
    const token = options.tokenProvider?.() ?? options.token;
    if (token !== undefined && token.length > 0) {
      headers.authorization = `Bearer ${token}`;
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
): Readonly<Record<ReadbackKey, ReadbackReader>> => {
  // S279 (R12): one owner-local in-flight transport per createReadbackClients call. Aliases with
  // the same effective GET share only while it is pending; there is no settled-response cache and
  // no global/shared-shell transport. A standalone createReadbackClient keeps its own fetch impl
  // and the caller's exact signal identity.
  const transport = createReadbackFlightTransport(options.fetchImpl ?? fetch);
  const clientOptions: ReadbackClientOptions = { ...options, fetchImpl: transport.fetch };
  const client = (spec: ReadbackRouteSpec): ReadbackReader =>
    createReadbackClient(spec, clientOptions);
  return {
    dashboard: client(READBACK_SPECS.dashboard),
    localLogs: client(READBACK_SPECS.localLogs),
    localPeers: client(READBACK_SPECS.localPeers),
    systemPeers: client(READBACK_SPECS.systemPeers),
    localSwap: client(READBACK_SPECS.localSwap),
    observeActivity: client(READBACK_SPECS.observeActivity),
    observeLogs: client(READBACK_SPECS.observeLogs),
    observeRouting: client(READBACK_SPECS.observeRouting),
    queues: client(READBACK_SPECS.queues),
    requests: client(READBACK_SPECS.requests),
    router: client(READBACK_SPECS.router),
    routerCandidates: client(READBACK_SPECS.routerCandidates),
    routerDecisions: client(READBACK_SPECS.routerDecisions),
    runtime: client(READBACK_SPECS.runtime),
    runtimeConfig: client(READBACK_SPECS.runtimeConfig),
  routerConfig: client(READBACK_SPECS.routerConfig),
    sessionReadiness: client(READBACK_SPECS.sessionReadiness),
    storeReceipts: client(READBACK_SPECS.storeReceipts),
    requestDetail: client(READBACK_SPECS.requestDetail),
    routerDecisionDetail: client(READBACK_SPECS.routerDecisionDetail),
    localPeerModels: client(READBACK_SPECS.localPeerModels),
    queueConfig: client(READBACK_SPECS.queueConfig),
    downstreamOpenAI: client(READBACK_SPECS.downstreamOpenAI),
    integrationProviders: client(READBACK_SPECS.integrationProviders),
  providerCatalog: client(READBACK_SPECS.providerCatalog),
  providerAccounts: client(READBACK_SPECS.providerAccounts),
  roles: client(READBACK_SPECS.roles),
  rolePolicy: client(READBACK_SPECS.rolePolicy),
    benchmarkSuite: client(READBACK_SPECS.benchmarkSuite),
  benchmarkPreferences: client(READBACK_SPECS.benchmarkPreferences),
  benchmarkActiveRun: client(READBACK_SPECS.benchmarkActiveRun),
    benchmarkSummary: client(READBACK_SPECS.benchmarkSummary),
    benchmarkRuns: client(READBACK_SPECS.benchmarkRuns),
    storageRetention: client(READBACK_SPECS.storageRetention),
    models: client(READBACK_SPECS.models),
    runtimeSummary: client(READBACK_SPECS.runtimeSummary),
    health: client(READBACK_SPECS.health),
    learning: client(READBACK_SPECS.learning),
  learningConfiguration: client(READBACK_SPECS.learningConfiguration),
  learningPacks: client(READBACK_SPECS.learningPacks),
  learningDecisions: client(READBACK_SPECS.learningDecisions),
  learningEvidence: client(READBACK_SPECS.learningEvidence),
  learningHistory: client(READBACK_SPECS.learningHistory),
  localLlamaSwapModels: client(READBACK_SPECS.localLlamaSwapModels),
  localPolicy: client(READBACK_SPECS.localPolicy),
  operatorStatus: client(READBACK_SPECS.operatorStatus),
  operatorTraceRoots: client(READBACK_SPECS.operatorTraceRoots),
  learningProfile: client(READBACK_SPECS.learningProfile),
  learningAdvisory: client(READBACK_SPECS.learningAdvisory),
  contribution: client(READBACK_SPECS.contribution),
  recommendations: client(READBACK_SPECS.recommendations),
  replayAutomation: client(READBACK_SPECS.replayAutomation),
  extensions: client(READBACK_SPECS.extensions),
    configuredModels: client(READBACK_SPECS.configuredModels),
    modelEndpoints: client(READBACK_SPECS.modelEndpoints),
    replayJobs: client(READBACK_SPECS.replayJobs),
    evaluationJobs: client(READBACK_SPECS.evaluationJobs),
    overviewMetrics: client(READBACK_SPECS.overviewMetrics),
  };
};

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
      h.Class("rm3-next-route"),
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
      h.h2([h.Class("rm3-next-route-title text-[16px] font-semibold")], [spec.label]),
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
                    h.span([h.Class("ml-auto min-w-0 max-w-full break-words text-right font-medium text-[var(--rm-fg)]"), h.Title(item.value)], [item.value]),
                    h.span([h.Class("min-w-0 max-w-full break-words text-[11px] text-[var(--rm-secondary)]"), h.Title(item.meta)], [item.meta]),
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
  tag === "RuntimeConfig"
    ? "runtimeConfig"
    : tag === "LocalPolicy"
    ? "localPolicy"
    : tag === "LearningConfiguration"
    ? "learningConfiguration"
    : tag === "LearningPacks"
      ? "learningPacks"
      : tag === "LearningDecisions"
        ? "learningDecisions"
        : tag === "LearningEvidence"
          ? "learningEvidence"
          : tag === "LearningHistory"
            ? "learningHistory"
            : tag === "LocalLlamaSwapModels"
              ? "localLlamaSwapModels"
              : tag === "SystemExtensions"
                ? "extensions"
                : tag === "ModelsRoles"
                  ? "configuredModels"
                  : tag === "SystemOperator"
                    ? "operatorStatus"
    :  tag === "RouterStrategy" || tag === "RouterWorkloads" || tag === "RouterConfig" || tag === "RouterAgentStrategy"
    ? "routerConfig"
    :
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
                      : tag === "Index"
                        ? "overviewMetrics"
                        : tag === "Models"
                        ? "configuredModels"
                        : tag === "Providers"
                        ? "integrationProviders"
                        : tag === "Endpoints"
                        ? "modelEndpoints"
                        : tag === "Learning"
                        ? "learning"
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
