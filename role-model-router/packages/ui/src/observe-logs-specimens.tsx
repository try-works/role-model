"use client";

import * as React from "react";

import type { MetricItem } from "./metric-strip";
import { ObserveLogs, type ObserveLogRow } from "./observe-logs";
import { SIDEBAR_FIXTURE_MODELS } from "./sidebar-specimens";

export const OBSERVE_LOGS_METRICS: MetricItem[] = [
  { id: "rows", label: "Structured rows", value: "24" },
  { id: "sources", label: "Sources", value: "3" },
  { id: "correlated", label: "Correlated requests", value: "8" },
];

export const OBSERVE_LOGS_SOURCE_OPTIONS = [
  { value: "all", label: "All" },
  { value: "proxy", label: "Proxy" },
  { value: "upstream", label: "Upstream" },
  { value: "runtime", label: "Runtime" },
] as const;

export const OBSERVE_LOGS_ROWS: ObserveLogRow[] = [
  {
    id: "log-1",
    source: "proxy",
    severity: "info",
    message: "Accepted POST /v1/chat/completions",
    timestampLabel: "12:04:17",
    requestId: "req-router-001",
  },
  {
    id: "log-2",
    source: "runtime",
    severity: "info",
    message: "Routing decision baseline → cli.local.coder",
    timestampLabel: "12:04:17",
    requestId: "req-router-001",
  },
  {
    id: "log-3",
    source: "upstream",
    severity: "warn",
    message: "Provider latency elevated (p95 1.2s)",
    timestampLabel: "11:59:03",
  },
  {
    id: "log-4",
    source: "proxy",
    severity: "error",
    message: "Upstream timeout after 30s",
    timestampLabel: "11:40:11",
    requestId: "req-observe-003",
  },
  {
    id: "log-5",
    source: "runtime",
    severity: "info",
    message: "Cache hit rate 73%",
    timestampLabel: "11:35:00",
  },
];

export const OBSERVE_LOGS_RAW = OBSERVE_LOGS_ROWS.map(
  (row) =>
    `${row.timestampLabel} [${row.source}/${row.severity}] ${row.message}${row.requestId ? ` request=${row.requestId}` : ""}`,
).join("\n");

export function ObserveLogsSpecimensDemo() {
  const [sourceFilter, setSourceFilter] = React.useState("all");
  const rows =
    sourceFilter === "all"
      ? OBSERVE_LOGS_ROWS
      : OBSERVE_LOGS_ROWS.filter((row) => row.source === sourceFilter);
  const rawLines =
    sourceFilter === "all"
      ? OBSERVE_LOGS_RAW
      : rows
          .map(
            (row) =>
              `${row.timestampLabel} [${row.source}/${row.severity}] ${row.message}${row.requestId ? ` request=${row.requestId}` : ""}`,
          )
          .join("\n");

  return (
    <ObserveLogs
      models={SIDEBAR_FIXTURE_MODELS}
      cacheHitRate={73}
      routerEndpoint="127.0.0.1:8787/v1"
      routerAlias="baseline.remote-only"
      metrics={OBSERVE_LOGS_METRICS}
      sourceFilter={sourceFilter}
      onSourceFilterChange={setSourceFilter}
      sourceOptions={[...OBSERVE_LOGS_SOURCE_OPTIONS]}
      rows={rows}
      rawLines={rawLines}
    />
  );
}
