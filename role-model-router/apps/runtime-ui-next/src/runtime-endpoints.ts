/**
 * S26f: one shared path source for the read clients. The drift test correlates these constants
 * with the parsed runtime-host-bridge route table, so a bogus/deleted host handler cannot stay green.
 */
export const OBSERVABILITY_SNAPSHOT_PATH = "/api/role-model/operator/observability-snapshot";

export const READBACK_PATHS = {
  dashboard: "/api/role-model/telemetry/summary",
  localLogs: "/api/role-model/local/logs",
  localPeers: "/api/role-model/local/peers",
  localPeerModels: "/api/role-model/local/peer/models",
  queueConfig: "/api/role-model/operator/queues/config",
  downstreamOpenAI: "/api/role-model/downstream/openai",
  integrationProviders: "/api/role-model/providers",
  systemPeers: "/api/role-model/local/peers",
  localSwap: "/api/role-model/local/swap",
  queues: "/api/role-model/operator/queues",
  requests: "/api/role-model/telemetry/requests",
  requestDetail: "/api/role-model/requests/",
  observeActivity: "/api/metrics/page",
  observeLogs: "/api/role-model/local/logs",
  observeRouting: "/api/role-model/telemetry/rows",
  router: "/api/role-model/router/summary",
  routerCandidates: "/api/role-model/router/candidates",
  routerDecisions: "/api/role-model/router/decisions",
  routerDecisionDetail: "/api/role-model/router/decisions/",
  runtime: "/api/role-model/runtime/config",
  sessionReadiness: "/api/role-model/operator/status",
  storeReceipts: "/api/role-model/operator/store-degradation-receipts",
} as const;
export type ControlMethod = "GET" | "PATCH" | "POST";
export interface ControlEndpoint {
  readonly method: ControlMethod;
  readonly path: string;
}
/** S26k: control reads and their non-destructive action; the tie asserts method and path. */
export const CONTROL_ENDPOINTS = {
  controllerRead: { method: "GET", path: "/api/role-model/controller" },
  controllerUpdate: { method: "PATCH", path: "/api/role-model/controller" },
  endpointsActivate: { method: "POST", path: "/api/role-model/endpoints" },
  endpointsRead: { method: "GET", path: "/api/role-model/endpoints" },
  providersRead: { method: "GET", path: "/api/role-model/accounts" },
  providersReconnect: { method: "POST", path: "/api/role-model/accounts/repair/reconnect" },
} as const satisfies Record<string, ControlEndpoint>;