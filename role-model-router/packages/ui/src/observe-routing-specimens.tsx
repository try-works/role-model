"use client";

import * as React from "react";

import type { CompositionSegment } from "./chart-composition";
import type { RankingChartRow } from "./chart-ranking";
import type { ChartSeries } from "./chart-time-series";
import {
  ObserveRouting,
  type ObserveRoutingFiltersState,
  type ObserveRoutingRoleRow,
  type ObserveRoutingSliceSummary,
} from "./observe-routing";
import type { ObserveChartBlock } from "./observe-shared";
import { SIDEBAR_FIXTURE_MODELS } from "./sidebar-specimens";

const HOURS = [0, 4, 8, 12, 16, 20, 24] as const;

function ramp(base: number, step: number, n = HOURS.length) {
  return Array.from({ length: n }, (_, i) => base + step * i);
}

function formatK(value: number): string {
  if (Math.abs(value) >= 1000) {
    return `${Math.round(value / 1000)}k`;
  }
  return String(value);
}

function formatUsd(value: number): string {
  return `$${value.toFixed(2)}`;
}

const costAvoidedRoutingRamp = ramp(0.4, 0.22);
const costAvoidedCacheRamp = ramp(0.15, 0.12);
const costAvoidedTotalRamp = ramp(0.6, 0.32);
export const COST_AVOIDED_DATA = HOURS.map((hour, i) => ({
  hour,
  routingCostSavingsUsd: costAvoidedRoutingRamp[i] ?? 0,
  cacheCostSavingsUsd: costAvoidedCacheRamp[i] ?? 0,
  totalAvoidedCostUsd: costAvoidedTotalRamp[i] ?? 0,
}));

export const COST_AVOIDED_SERIES: ChartSeries[] = [
  {
    key: "totalAvoidedCostUsd",
    label: "totalAvoidedCostUsd",
    color: "var(--chart-throughput)",
  },
  {
    key: "routingCostSavingsUsd",
    label: "routingCostSavingsUsd",
    color: "var(--chart-2)",
  },
  {
    key: "cacheCostSavingsUsd",
    label: "cacheCostSavingsUsd",
    color: "var(--chart-cache)",
  },
];

const routingVolumeRamp = ramp(50, 40, 6);
export const ROUTING_VOLUME_DATA = [0, 4, 8, 12, 16, 20].map((hour, i) => ({
  hour,
  requestCount: routingVolumeRamp[i] ?? 0,
}));

export const ROUTING_VOLUME_SERIES: ChartSeries[] = [
  { key: "requestCount", label: "requestCount", color: "var(--chart-1)" },
];

const strategyBaselineRamp = ramp(30, 20, 6);
const strategyCostAwareRamp = ramp(18, 14, 6);
const strategyLatencyFirstRamp = ramp(12, 10, 6);
export const STRATEGY_TREND_DATA = [0, 4, 8, 12, 16, 20].map((hour, i) => ({
  hour,
  baseline: strategyBaselineRamp[i] ?? 0,
  "cost-aware": strategyCostAwareRamp[i] ?? 0,
  "latency-first": strategyLatencyFirstRamp[i] ?? 0,
}));

export const STRATEGY_TREND_SERIES: ChartSeries[] = [
  { key: "baseline", label: "baseline", color: "var(--chart-1)" },
  { key: "cost-aware", label: "cost-aware", color: "var(--chart-6)" },
  { key: "latency-first", label: "latency-first", color: "var(--chart-latency)" },
];

export const AVOIDED_BY_TASK_SEGMENTS: CompositionSegment[] = [
  { key: "code.edit", label: "code.edit", value: 12.4, color: "var(--chart-cost)" },
  { key: "chat.general", label: "chat.general", value: 9.1, color: "var(--chart-2)" },
  { key: "rag.retrieve", label: "rag.retrieve", value: 7.6, color: "var(--chart-3)" },
  { key: "summarize", label: "summarize", value: 4.2, color: "var(--chart-6)" },
  { key: "tools.execute", label: "tools.execute", value: 3.1, color: "var(--chart-5)" },
  { key: "embed", label: "embed", value: 1.8, color: "var(--chart-7)" },
  { key: "rerank", label: "rerank", value: 1.1, color: "var(--chart-8)" },
  { key: "vision", label: "vision", value: 0.6, color: "var(--chart-4)" },
];

export const DIFFICULTY_SEGMENTS: CompositionSegment[] = [
  { key: "easy", label: "easy", value: 520, color: "var(--chart-cache)" },
  { key: "medium", label: "medium", value: 410, color: "var(--chart-1)" },
  { key: "hard", label: "hard", value: 180, color: "var(--chart-error)" },
  { key: "unknown", label: "unknown", value: 45, color: "var(--chart-5)" },
];

/** Role mix — composition, not a time-series bar. */
export const ROLE_VOLUME_SEGMENTS: CompositionSegment[] = [
  {
    key: "coder",
    label: "coder",
    value: 380,
    color: "var(--chart-cache)",
    children: [
      { key: "code.edit", label: "code.edit", value: 210, color: "var(--chart-cache)" },
      { key: "tools.execute", label: "tools.execute", value: 170, color: "var(--chart-2)" },
    ],
  },
  {
    key: "researcher",
    label: "researcher",
    value: 260,
    color: "var(--chart-remote)",
    children: [
      { key: "rag.retrieve", label: "rag.retrieve", value: 260, color: "var(--chart-remote)" },
    ],
  },
  {
    key: "ops",
    label: "ops",
    value: 180,
    color: "var(--chart-throughput)",
    children: [
      { key: "ops.diagnose", label: "ops.diagnose", value: 180, color: "var(--chart-throughput)" },
    ],
  },
  {
    key: "chat",
    label: "chat",
    value: 120,
    color: "var(--chart-latency)",
    children: [
      { key: "chat.general", label: "chat.general", value: 120, color: "var(--chart-latency)" },
    ],
  },
];

export const ROLE_DEMAND_SEGMENTS: CompositionSegment[] = [
  {
    key: "coder",
    label: "coder",
    value: 380,
    color: "var(--chart-cache)",
    children: [
      { key: "code.edit", label: "code.edit", value: 210, color: "var(--chart-cache)" },
      { key: "tools.execute", label: "tools.execute", value: 170, color: "var(--chart-2)" },
    ],
  },
  {
    key: "assistant",
    label: "assistant",
    value: 290,
    color: "var(--chart-remote)",
    children: [
      { key: "chat.general", label: "chat.general", value: 180, color: "var(--chart-remote)" },
      { key: "summarize", label: "summarize", value: 110, color: "var(--chart-6)" },
    ],
  },
  {
    key: "researcher",
    label: "researcher",
    value: 210,
    color: "var(--chart-throughput)",
    children: [
      { key: "rag.retrieve", label: "rag.retrieve", value: 210, color: "var(--chart-throughput)" },
    ],
  },
  {
    key: "reviewer",
    label: "reviewer",
    value: 160,
    color: "var(--chart-latency)",
    children: [
      { key: "code.review", label: "code.review", value: 160, color: "var(--chart-latency)" },
    ],
  },
];

export const CAPABILITY_MIX_SEGMENTS: CompositionSegment[] = [
  { key: "code.edit", label: "code.edit", value: 340, color: "var(--chart-cache)" },
  { key: "chat.general", label: "chat.general", value: 280, color: "var(--chart-remote)" },
  { key: "rag.retrieve", label: "rag.retrieve", value: 200, color: "var(--chart-throughput)" },
  { key: "tools.execute", label: "tools.execute", value: 150, color: "var(--chart-latency)" },
  { key: "summarize", label: "summarize", value: 90, color: "var(--chart-cost)" },
];

export const TOOL_CLASS_SEGMENTS: CompositionSegment[] = [
  { key: "filesystem", label: "filesystem", value: 210, color: "var(--chart-1)" },
  { key: "shell", label: "shell", value: 180, color: "var(--chart-2)" },
  { key: "http", label: "http", value: 140, color: "var(--chart-3)" },
  { key: "browser", label: "browser", value: 70, color: "var(--chart-6)" },
  { key: "none", label: "none", value: 40, color: "var(--chart-5)" },
];

export const MODEL_SELECTION_SEGMENTS: CompositionSegment[] = [
  { key: "gpt-5.4", label: "gpt-5.4", value: 410, color: "var(--chart-remote)" },
  { key: "kimi-k2.5", label: "kimi-k2.5", value: 320, color: "var(--chart-1)" },
  { key: "claude-sonnet-4", label: "claude-sonnet-4", value: 260, color: "var(--chart-2)" },
  { key: "qwen2.5-coder", label: "qwen2.5-coder", value: 190, color: "var(--chart-local)" },
  { key: "llama-3.3-70b", label: "llama-3.3-70b", value: 110, color: "var(--chart-3)" },
];

/** @deprecated Prefer ranking rows; kept for composition specimens. */
export const AVOIDED_BY_TASK_ROWS: RankingChartRow[] = [
  { key: "code", label: "code.edit", value: 12.4, color: "var(--chart-cost)" },
  { key: "chat", label: "chat.general", value: 9.1, color: "var(--chart-2)" },
  { key: "rag", label: "rag.retrieve", value: 7.6, color: "var(--chart-3)" },
  { key: "sum", label: "summarize", value: 4.2, color: "var(--chart-6)" },
  { key: "tool", label: "tools.execute", value: 3.1, color: "var(--chart-5)" },
  { key: "embed", label: "embed", value: 1.8, color: "var(--chart-7)" },
  { key: "rerank", label: "rerank", value: 1.1, color: "var(--chart-8)" },
  { key: "vision", label: "vision", value: 0.6, color: "var(--chart-4)" },
];

export const DIFFICULTY_ROWS: RankingChartRow[] = [
  { key: "easy", label: "easy", value: 520, color: "var(--chart-cache)" },
  { key: "medium", label: "medium", value: 410, color: "var(--chart-1)" },
  { key: "hard", label: "hard", value: 180, color: "var(--chart-error)" },
  { key: "unknown", label: "unknown", value: 45, color: "var(--chart-5)" },
];

export const ROLE_DEMAND_ROWS: RankingChartRow[] = [
  { key: "coder", label: "coder", value: 380, color: "var(--chart-1)" },
  { key: "assistant", label: "assistant", value: 290, color: "var(--chart-2)" },
  { key: "researcher", label: "researcher", value: 210, color: "var(--chart-3)" },
  { key: "reviewer", label: "reviewer", value: 160, color: "var(--chart-6)" },
  { key: "planner", label: "planner", value: 95, color: "var(--chart-5)" },
];

export const CAPABILITY_MIX_ROWS: RankingChartRow[] = [
  { key: "code", label: "code.edit", value: 340, color: "var(--chart-cache)" },
  { key: "chat", label: "chat.general", value: 280, color: "var(--chart-remote)" },
  { key: "rag", label: "rag.retrieve", value: 200, color: "var(--chart-throughput)" },
  { key: "tool", label: "tools.execute", value: 150, color: "var(--chart-latency)" },
  { key: "sum", label: "summarize", value: 90, color: "var(--chart-cost)" },
];

export const TOOL_CLASS_ROWS: RankingChartRow[] = [
  { key: "fs", label: "filesystem", value: 210, color: "var(--chart-1)" },
  { key: "shell", label: "shell", value: 180, color: "var(--chart-2)" },
  { key: "http", label: "http", value: 140, color: "var(--chart-3)" },
  { key: "browser", label: "browser", value: 70, color: "var(--chart-6)" },
  { key: "none", label: "none", value: 40, color: "var(--chart-5)" },
];

export const MODEL_SELECTION_ROWS: RankingChartRow[] = [
  { key: "gpt", label: "gpt-5.4", value: 410, color: "var(--chart-remote)" },
  { key: "kimi", label: "kimi-k2.5", value: 320, color: "var(--chart-1)" },
  { key: "sonnet", label: "claude-sonnet-4", value: 260, color: "var(--chart-2)" },
  { key: "qwen", label: "qwen2.5-coder", value: 190, color: "var(--chart-local)" },
  { key: "groq", label: "llama-3.3-70b", value: 110, color: "var(--chart-3)" },
];

export const DEFAULT_OBSERVE_ROUTING_FILTERS: ObserveRoutingFiltersState = {
  timeRange: "week",
  breakdown: "selectedStrategy",
  source: "all",
  difficulty: "all",
};

export const OBSERVE_ROUTING_BREAKDOWN_OPTIONS = [
  { value: "selectedStrategy", label: "Selected strategy" },
  { value: "sourceType", label: "Source type" },
  { value: "modelId", label: "Model" },
  { value: "endpointId", label: "Endpoint" },
] as const;

export const OBSERVE_ROUTING_SOURCE_OPTIONS = [
  { value: "all", label: "All sources" },
  { value: "local", label: "Local" },
  { value: "remote", label: "Remote" },
] as const;

export const OBSERVE_ROUTING_DIFFICULTY_OPTIONS = [
  { value: "all", label: "All buckets" },
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
] as const;

export const DEFAULT_OBSERVE_ROUTING_SLICE: ObserveRoutingSliceSummary = {
  timeRangeLabel: "Week",
  breakdownLabel: "Selected strategy",
  sourceLabel: "All sources",
  difficultyLabel: "All buckets",
};

export const OBSERVE_ROUTING_ACTIVE_ROLES: readonly ObserveRoutingRoleRow[] =
  ROLE_DEMAND_ROWS.slice(0, 5).map((row) => ({
    roleId: row.label,
    requestCount: row.value,
  }));

/** Canonical Observe · Routing chart stack (sentence-case titles). */
export function buildObserveRoutingCharts(): ObserveChartBlock[] {
  return [
    {
      title: "Cost avoided by routing",
      description:
        "Avoided spend based on the selected route versus the highest-cost eligible configured candidate, plus cache savings.",
      kind: "area",
      span: 12,
      data: COST_AVOIDED_DATA,
      series: COST_AVOIDED_SERIES,
      leftTickFormatter: formatUsd,
      valueFormatter: formatUsd,
    },
    {
      title: "Routing decision volume",
      description: "Historical routed decision volume across the filtered slice.",
      kind: "line",
      span: 12,
      data: ROUTING_VOLUME_DATA,
      series: ROUTING_VOLUME_SERIES,
      leftTickFormatter: formatK,
    },
    {
      title: "Routing volume by taxonomy role",
      description: "Share of routing decisions by taxonomy role.",
      kind: "composition",
      span: 6,
      segments: ROLE_VOLUME_SEGMENTS,
      valueLabel: "requestCount",
      valueFormatter: formatK,
    },
    {
      title: "Avoided cost by taxonomy task",
      description: "Compare routing-driven avoided cost across normalized taxonomy tasks.",
      kind: "ranking",
      span: 6,
      rows: AVOIDED_BY_TASK_ROWS,
      valueLabel: "totalAvoidedCostUsd",
      valueFormatter: formatUsd,
    },
    {
      title: "Difficulty distribution",
      description: "Easy, medium, and hard demand mix for the selected historical slice.",
      kind: "ranking",
      span: 6,
      rows: DIFFICULTY_ROWS,
      valueLabel: "requestCount",
      valueFormatter: formatK,
    },
    {
      title: "Strategy selection trend",
      description: "Which routing strategies are being selected over time.",
      kind: "area",
      span: 6,
      stacked: true,
      data: STRATEGY_TREND_DATA,
      series: STRATEGY_TREND_SERIES,
      leftTickFormatter: formatK,
    },
    {
      title: "Capability routing mix",
      description: "Rank the taxonomy capabilities currently driving routed traffic.",
      kind: "ranking",
      span: 6,
      rows: CAPABILITY_MIX_ROWS,
      valueLabel: "requestCount",
      valueFormatter: formatK,
    },
    {
      title: "Tool class routing mix",
      description: "See which tool-class patterns are most associated with routed requests.",
      kind: "ranking",
      span: 6,
      rows: TOOL_CLASS_ROWS,
      valueLabel: "requestCount",
      valueFormatter: formatK,
    },
    {
      title: "Model selection",
      description: "Selected model distribution across the filtered routing slice.",
      kind: "ranking",
      span: 6,
      rows: MODEL_SELECTION_ROWS,
      valueLabel: "requestCount",
      valueFormatter: formatK,
    },
  ];
}

export function ObserveRoutingSpecimensDemo() {
  const [filters, setFilters] = React.useState(DEFAULT_OBSERVE_ROUTING_FILTERS);

  return (
    <ObserveRouting
      models={SIDEBAR_FIXTURE_MODELS}
      cacheHitRate={73}
      routerEndpoint="127.0.0.1:8787/v1"
      routerAlias="baseline.remote-only"
      filters={filters}
      onFiltersChange={setFilters}
      breakdownOptions={[...OBSERVE_ROUTING_BREAKDOWN_OPTIONS]}
      sourceOptions={[...OBSERVE_ROUTING_SOURCE_OPTIONS]}
      difficultyOptions={[...OBSERVE_ROUTING_DIFFICULTY_OPTIONS]}
      charts={buildObserveRoutingCharts()}
      slice={DEFAULT_OBSERVE_ROUTING_SLICE}
      activeRoles={OBSERVE_ROUTING_ACTIVE_ROLES}
    />
  );
}
