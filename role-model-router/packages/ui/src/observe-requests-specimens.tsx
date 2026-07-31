"use client";

import * as React from "react";

import {
  CACHE_DATA,
  CACHE_SERIES,
  LATENCY_DATA,
  LATENCY_SERIES,
  TOKEN_USAGE_DATA,
  TOKEN_USAGE_SERIES,
} from "./chart-specimens";
import type { CompositionSegment } from "./chart-composition";
import type { RankingChartRow } from "./chart-ranking";
import type { ChartSeries } from "./chart-time-series";
import {
  ObserveRequests,
  type ObserveRequestLedgerRow,
  type ObserveRequestsFiltersState,
} from "./observe-requests";
import type { ObserveChartBlock } from "./observe-shared";
import { SIDEBAR_FIXTURE_MODELS } from "./sidebar-specimens";

const HOURS = [0, 4, 8, 12, 16, 20, 24] as const;
/** Six 4h buckets — bar charts (24:00 is axis end-rail only). */
const BUCKETS = [0, 4, 8, 12, 16, 20] as const;

function ramp(base: number, step: number, n = HOURS.length) {
  return Array.from({ length: n }, (_, i) => base + step * i);
}

function formatK(value: number): string {
  if (Math.abs(value) >= 1000) {
    return `${Math.round(value / 1000)}k`;
  }
  return String(value);
}

function formatMs(value: number): string {
  return `${value}ms`;
}

function formatPct(value: number): string {
  return `${value}%`;
}

function formatUsd(value: number): string {
  return `$${value.toFixed(2)}`;
}

/** Request volume broken down by endpoint/model-id (legend keys = those ids). */
export const REQUEST_VOLUME_DATA = HOURS.map((hour, i) => ({
  hour,
  cli_local_coder: ramp(28, 18)[i]!,
  openai_gpt_5_4: ramp(22, 14)[i]!,
  anthropic_sonnet: ramp(14, 10)[i]!,
}));

export const REQUEST_VOLUME_SERIES: ChartSeries[] = [
  {
    key: "cli_local_coder",
    label: "cli.local.coder",
    color: "var(--chart-1)",
  },
  {
    key: "openai_gpt_5_4",
    label: "openai.gpt-5.4",
    color: "var(--chart-2)",
  },
  {
    key: "anthropic_sonnet",
    label: "anthropic.sonnet",
    color: "var(--chart-3)",
  },
];

/** Taxonomy group mix — composition, not a time-series bar. */
export const TAXONOMY_DEMAND_SEGMENTS: CompositionSegment[] = [
  {
    key: "coding",
    label: "coding",
    value: 420,
    color: "var(--chart-cache)",
    children: [
      { key: "code.edit", label: "code.edit", value: 240, color: "var(--chart-cache)" },
      { key: "code.review", label: "code.review", value: 180, color: "var(--chart-2)" },
    ],
  },
  {
    key: "research",
    label: "research",
    value: 280,
    color: "var(--chart-remote)",
    children: [
      { key: "rag.retrieve", label: "rag.retrieve", value: 160, color: "var(--chart-remote)" },
      { key: "summarize", label: "summarize", value: 120, color: "var(--chart-6)" },
    ],
  },
  {
    key: "ops",
    label: "ops",
    value: 160,
    color: "var(--chart-throughput)",
    children: [
      { key: "ops.diagnose", label: "ops.diagnose", value: 160, color: "var(--chart-throughput)" },
    ],
  },
  {
    key: "chat",
    label: "chat",
    value: 110,
    color: "var(--chart-latency)",
    children: [
      { key: "chat.general", label: "chat.general", value: 110, color: "var(--chart-latency)" },
    ],
  },
];

/** Success vs failure over time (both positive — never bidirectional). */
export const TASK_SUCCESS_DATA = BUCKETS.map((hour, i) => ({
  hour,
  successCount: 60 + i * 28,
  failureCount: 8 + i * 4,
}));

export const TASK_SUCCESS_SERIES: ChartSeries[] = [
  { key: "successCount", label: "successCount", color: "var(--chart-cache)" },
  { key: "failureCount", label: "failureCount", color: "var(--chart-error)" },
];

export const EFFECTIVE_COST_DATA = HOURS.map((hour, i) => ({
  hour,
  actualCostUsd: ramp(0.9, 0.4)[i]!,
  estimatedCostUsd: ramp(1.1, 0.35)[i]!,
  effectiveCostUsd: ramp(0.85, 0.38)[i]!,
}));

export const EFFECTIVE_COST_SERIES: ChartSeries[] = [
  { key: "actualCostUsd", label: "actualCostUsd", color: "var(--chart-cost)" },
  { key: "estimatedCostUsd", label: "estimatedCostUsd", color: "var(--chart-5)" },
  { key: "effectiveCostUsd", label: "effectiveCostUsd", color: "var(--chart-6)" },
];

export const FAILURE_TREND_DATA = BUCKETS.map((hour, i) => ({
  hour,
  failureCount: ramp(6, 5, BUCKETS.length)[i]!,
}));

export const FAILURE_TREND_SERIES: ChartSeries[] = [
  { key: "failureCount", label: "failureCount", color: "var(--chart-error)" },
];

/** Flat capability mix — legend must list capabilities, not roles. */
export const CAPABILITY_LEADERS_SEGMENTS: CompositionSegment[] = [
  { key: "code.edit", label: "code.edit", value: 420, color: "var(--chart-1)" },
  { key: "chat.general", label: "chat.general", value: 380, color: "var(--chart-2)" },
  { key: "rag.retrieve", label: "rag.retrieve", value: 310, color: "var(--chart-3)" },
  { key: "tools.execute", label: "tools.execute", value: 260, color: "var(--chart-6)" },
  { key: "summarize", label: "summarize", value: 190, color: "var(--chart-5)" },
  { key: "embed", label: "embed", value: 140, color: "var(--chart-7)" },
  { key: "rerank", label: "rerank", value: 95, color: "var(--chart-8)" },
  { key: "vision", label: "vision", value: 60, color: "var(--chart-4)" },
];

/** @deprecated Prefer CAPABILITY_LEADERS_SEGMENTS (composition). */
export const CAPABILITY_LEADERS_ROWS: RankingChartRow[] = CAPABILITY_LEADERS_SEGMENTS.map(
  (seg) => ({
    key: seg.key,
    label: seg.label,
    value: seg.value,
    color: seg.color,
  }),
);

/** Latency ranking (lower ms = better); bar length uses inverted display in Paper. */
export const RANKED_COMPARISON_ROWS: RankingChartRow[] = [
  { key: "ep1", label: "cli.local.coder", value: 420, color: "var(--chart-latency)" },
  { key: "ep2", label: "openai.gpt-5.4", value: 890, color: "var(--chart-latency)" },
  { key: "ep3", label: "moonshot.kimi", value: 1200, color: "var(--chart-latency)" },
  { key: "ep4", label: "local/llama-70b", value: 2400, color: "var(--chart-latency)" },
  { key: "ep5", label: "anthropic.sonnet", value: 3100, color: "var(--chart-latency)" },
  { key: "ep6", label: "groq.llama-70b", value: 3600, color: "var(--chart-latency)" },
  { key: "ep7", label: "azure.gpt-4.1", value: 4200, color: "var(--chart-latency)" },
];

export const DEFAULT_OBSERVE_REQUESTS_FILTERS: ObserveRequestsFiltersState = {
  timeRange: "week",
  breakdown: "none",
  rankingMetric: "averageLatencyMs",
  rankingDimension: "endpointId",
  source: "all",
};

export const OBSERVE_REQUESTS_BREAKDOWN_OPTIONS = [
  { value: "none", label: "None" },
  { value: "sourceType", label: "Source type" },
  { value: "endpointId", label: "Endpoint" },
  { value: "modelId", label: "Model" },
] as const;

export const OBSERVE_REQUESTS_RANKING_METRIC_OPTIONS = [
  { value: "averageLatencyMs", label: "Average latency" },
  { value: "requestCount", label: "Request count" },
  { value: "effectiveCostUsd", label: "Effective cost" },
] as const;

export const OBSERVE_REQUESTS_RANKING_DIMENSION_OPTIONS = [
  { value: "endpointId", label: "Endpoint" },
  { value: "modelId", label: "Model" },
  { value: "taxonomyCapabilityId", label: "Capability" },
] as const;

export const OBSERVE_REQUESTS_SOURCE_OPTIONS = [
  { value: "all", label: "All sources" },
  { value: "local", label: "Local" },
  { value: "remote", label: "Remote" },
] as const;

export const OBSERVE_REQUESTS_LEDGER: readonly ObserveRequestLedgerRow[] = [
  {
    requestId: "req-router-001",
    endpointId: "cli.local.coder",
    modelId: "gpt-5.4",
    source: "local",
    status: "ok",
    latencyMs: 420,
    tokens: 1840,
    costUsd: 0.012,
  },
  {
    requestId: "req-router-002",
    endpointId: "moonshot.personal.primary",
    modelId: "kimi-k2.5",
    source: "remote",
    status: "ok",
    latencyMs: 890,
    tokens: 3200,
    costUsd: 0.041,
  },
  {
    requestId: "req-observe-003",
    endpointId: "openai.gpt-5.4",
    modelId: "gpt-5.4",
    source: "remote",
    status: "error",
    latencyMs: 1200,
    tokens: 640,
    costUsd: 0.008,
  },
];

/** Canonical Observe · Requests chart stack (sentence-case titles). */
export function buildObserveRequestsCharts(): ObserveChartBlock[] {
  return [
    {
      title: "Request volume over time",
      description: "Historical request volume across the selected structured telemetry slice.",
      kind: "line",
      span: 12,
      data: REQUEST_VOLUME_DATA,
      series: REQUEST_VOLUME_SERIES,
      leftTickFormatter: formatK,
    },
    {
      title: "Taxonomy demand by group",
      description: "Share of request volume by top-level taxonomy group.",
      kind: "composition",
      span: 6,
      segments: TAXONOMY_DEMAND_SEGMENTS,
      valueLabel: "requestCount",
      valueFormatter: formatK,
    },
    {
      title: "Task success vs failure",
      description: "Compare successful and failed requests over the selected slice.",
      kind: "bar",
      span: 6,
      data: TASK_SUCCESS_DATA,
      series: TASK_SUCCESS_SERIES,
      leftTickFormatter: formatK,
    },
    {
      title: "Token usage over time",
      description: "Token flow for the selected slice.",
      kind: "area",
      span: 12,
      data: TOKEN_USAGE_DATA,
      series: TOKEN_USAGE_SERIES,
      leftTickFormatter: formatK,
      valueFormatter: formatK,
    },
    {
      title: "Effective cost over time",
      description: "Stored per-request cost rolled up through the selected historical slice.",
      kind: "line",
      span: 6,
      data: EFFECTIVE_COST_DATA,
      series: EFFECTIVE_COST_SERIES,
      leftTickFormatter: formatUsd,
      valueFormatter: formatUsd,
    },
    {
      title: "Latency trend",
      description: "Average and p95 latency for the filtered request slice.",
      kind: "line",
      span: 6,
      data: LATENCY_DATA,
      series: LATENCY_SERIES,
      leftTickFormatter: formatMs,
      valueFormatter: formatMs,
    },
    {
      title: "Cache efficiency trend",
      description: "Cache-hit token volume and cache-hit rate for the filtered slice.",
      kind: "line",
      span: 6,
      data: CACHE_DATA,
      series: CACHE_SERIES,
      leftTickFormatter: formatK,
      rightTickFormatter: formatPct,
      valueFormatter: formatK,
    },
    {
      title: "Failure trend",
      description: "Failed request volume across the filtered slice.",
      kind: "bar",
      span: 6,
      data: FAILURE_TREND_DATA,
      series: FAILURE_TREND_SERIES,
      leftTickFormatter: formatK,
    },
    {
      title: "Capability leaders",
      description: "Rank the most active taxonomy capabilities in the selected window.",
      kind: "composition",
      span: 6,
      segments: CAPABILITY_LEADERS_SEGMENTS,
      valueLabel: "requestCount",
      valueFormatter: formatK,
    },
    {
      title: "Ranked comparison",
      description: "Top contributors or outliers for the selected metric and ranking target.",
      kind: "ranking",
      span: 12,
      rows: RANKED_COMPARISON_ROWS,
      valueLabel: "averageLatencyMs",
      valueFormatter: formatMs,
      categoryWidth: 160,
    },
  ];
}

export function ObserveRequestsSpecimensDemo() {
  const [filters, setFilters] = React.useState(DEFAULT_OBSERVE_REQUESTS_FILTERS);

  return (
    <ObserveRequests
      models={SIDEBAR_FIXTURE_MODELS}
      cacheHitRate={73}
      routerEndpoint="127.0.0.1:8787/v1"
      routerAlias="baseline.remote-only"
      filters={filters}
      onFiltersChange={setFilters}
      breakdownOptions={[...OBSERVE_REQUESTS_BREAKDOWN_OPTIONS]}
      rankingMetricOptions={[...OBSERVE_REQUESTS_RANKING_METRIC_OPTIONS]}
      rankingDimensionOptions={[...OBSERVE_REQUESTS_RANKING_DIMENSION_OPTIONS]}
      sourceOptions={[...OBSERVE_REQUESTS_SOURCE_OPTIONS]}
      charts={buildObserveRequestsCharts()}
      ledger={OBSERVE_REQUESTS_LEDGER}
    />
  );
}
