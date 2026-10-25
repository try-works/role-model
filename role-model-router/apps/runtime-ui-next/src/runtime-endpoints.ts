/**
 * S26f: one shared path source for the read clients. The drift test correlates these constants
 * with the parsed runtime-host-bridge route table, so a bogus/deleted host handler cannot stay green.
 */
export const OBSERVABILITY_SNAPSHOT_PATH = "/api/role-model/operator/observability-snapshot";

export const READBACK_PATHS = {
  dashboard: "/api/role-model/telemetry/summary",
  localLogs: "/api/role-model/local/logs",
  localPeers: "/api/role-model/local/peers",
  localSwap: "/api/role-model/local/swap",
  queues: "/api/role-model/operator/queues",
  requests: "/api/role-model/telemetry/requests",
  observeActivity: "/api/role-model/operator/status",
  observeLogs: "/api/role-model/local/logs",
  observeRouting: "/api/role-model/telemetry/rows",
  router: "/api/role-model/router/summary",
  routerCandidates: "/api/role-model/router/candidates",
  routerDecisions: "/api/role-model/router/decisions",
  runtime: "/api/role-model/runtime/config",
  sessionReadiness: "/api/role-model/operator/status",
  storeReceipts: "/api/role-model/operator/store-degradation-receipts",
} as const;
