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
  | "runtime"
  | "sessionReadiness"
  | "dashboard"
  | "localSwap"
  | "observeActivity"
  | "observeLogs"
  | "observeRouting"
  | "router";

export const ReadbackKeySchema = Schema.Literals([
  "storeReceipts",
  "queues",
  "localLogs",
  "routerCandidates",
  "requests",
  "routerDecisions",
  "localPeers",
  "runtime",
  "sessionReadiness",
  "dashboard",
  "localSwap",
  "observeActivity",
  "observeLogs",
  "observeRouting",
  "router",
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
  localSwap: ReadbackState,
  observeActivity: ReadbackState,
  observeLogs: ReadbackState,
  observeRouting: ReadbackState,
  queues: ReadbackState,
  requests: ReadbackState,
  routerCandidates: ReadbackState,
  routerDecisions: ReadbackState,
  router: ReadbackState,
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
  localSwap: idleReadback(),
  observeActivity: idleReadback(),
  observeLogs: idleReadback(),
  observeRouting: idleReadback(),
  queues: idleReadback(),
  requests: idleReadback(),
  routerCandidates: idleReadback(),
  routerDecisions: idleReadback(),
  router: idleReadback(),
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

export type ReadbackReader = (input: { readonly signal: AbortSignal }) => Promise<ReadbackResult>;

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
    (record.config !== undefined && asRecord(record.config) === undefined)
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
  const status = asRecord(record?.status) ?? record;
  if (status === undefined)
    return failedReadback("Session readiness read failed: invalid response", token);
  const state = typeof status.status === "string" ? status.status : undefined;
  if (state === undefined) return { rows: [], status: "empty", token };
  return okRows(
    [
      row(
        "status",
        state,
        status.ready === true ? "ready" : "not ready",
        typeof status.message === "string" ? status.message : "",
      ),
    ],
    token,
  );
};

const parseDashboard = (body: unknown, token: number): ReadbackState => {
  const record = asRecord(body);
  const list = Array.isArray(body) ? body : asArray(record?.requests);
  const rows = list.flatMap((value, index) => {
    const request = asRecord(value);
    if (request === undefined) return [];
    return [
      row(
        String(request.requestId ?? request.id ?? index),
        String(request.modelId ?? request.model ?? "request"),
        String(request.status ?? request.statusCode ?? ""),
        String(request.endpointId ?? ""),
      ),
    ];
  });
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
  const list = Array.isArray(body)
    ? body
    : asArray(record?.activity ?? record?.entries ?? record?.requests);
  const rows = list.flatMap((value, index) => {
    const entry = asRecord(value);
    if (entry === undefined) return [];
    return [
      row(
        String(entry.id ?? entry.requestId ?? index),
        String(entry.kind ?? entry.modelId ?? "activity"),
        String(entry.detail ?? entry.status ?? ""),
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
  const url = new URL(spec.path, base);
  return async (input) => {
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
});

export const readbackFromResult = (
  spec: ReadbackRouteSpec,
  result: ReadbackResult,
  token: number,
): ReadbackState => {
  if (result.status !== 200) {
    return failedReadback(
      readbackErrorMessage(spec.label, result.status, reasonOf(result.body)),
      token,
    );
  }
  return spec.parse(result.body, token);
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
                                : null;
