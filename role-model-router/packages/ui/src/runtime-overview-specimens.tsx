"use client";

import * as React from "react";

import {
  CACHE_DATA,
  CACHE_SERIES,
  LATENCY_DATA,
  LATENCY_SERIES,
  SUCCESS_DATA,
  SUCCESS_SERIES,
  TOKEN_USAGE_DATA,
  TOKEN_USAGE_SERIES,
} from "./chart-specimens";
import type { ChartSeries } from "./chart-time-series";
import {
  DEFAULT_OVERVIEW_NAV,
  RuntimeOverview,
  type OverviewFiltersState,
  type RuntimeOverviewChartBlock,
} from "./runtime-overview";
import { SIDEBAR_FIXTURE_MODELS } from "./sidebar-specimens";

/** Fixture hours matching Paper TimeAxis ticks. */
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

function formatMs(value: number): string {
  return `${value}ms`;
}

function formatPct(value: number): string {
  return `${value}%`;
}

function formatUsd(value: number): string {
  return `$${value.toFixed(2)}`;
}

/** Paper specimen: Effective cost over time (line, single Y). */
export const EFFECTIVE_COST_DATA = HOURS.map((hour, i) => ({
  hour,
  effectiveCostUsd: ramp(1.0, 0.45)[i]!,
  estimatedCostUsd: ramp(0.35, 0.28)[i]!,
}));

export const EFFECTIVE_COST_SERIES: ChartSeries[] = [
  { key: "effectiveCostUsd", label: "effectiveCostUsd", color: "var(--chart-cost)" },
  { key: "estimatedCostUsd", label: "estimatedCostUsd", color: "var(--chart-5)" },
];

/** Paper specimen: Cost avoided over time (area, single Y). */
export const AVOIDED_COST_DATA = HOURS.map((hour, i) => ({
  hour,
  totalAvoidedCostUsd: ramp(0.8, 0.35)[i]!,
  routingCostSavingsUsd: ramp(0.25, 0.18)[i]!,
}));

export const AVOIDED_COST_SERIES: ChartSeries[] = [
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
];

export const DEFAULT_OVERVIEW_FILTERS: OverviewFiltersState = {
  timeRange: "week",
  breakdown: "endpoint",
  source: "all",
  status: "all",
  difficulty: "all",
};

/** Canonical RuntimeOverview chart stack matching Paper production page. */
export function buildRuntimeOverviewCharts(): RuntimeOverviewChartBlock[] {
  return [
    {
      title: "Token usage over time",
      description: "Input, output, and total token flow across the selected telemetry window.",
      data: TOKEN_USAGE_DATA,
      series: TOKEN_USAGE_SERIES,
      kind: "area",
      span: 12,
      leftTickFormatter: formatK,
      valueFormatter: formatK,
    },
    {
      title: "Cache efficiency trend",
      description: "Cache-hit token volume and cache-hit rate.",
      data: CACHE_DATA,
      series: CACHE_SERIES,
      kind: "line",
      span: 12,
      leftTickFormatter: formatK,
      rightTickFormatter: formatPct,
      valueFormatter: (v) => (v <= 100 ? formatPct(v) : formatK(v)),
    },
    {
      title: "Effective cost over time",
      description: "Authoritative effective cost based on stored request-time pricing facts.",
      data: EFFECTIVE_COST_DATA,
      series: EFFECTIVE_COST_SERIES,
      kind: "line",
      span: 6,
      leftTickFormatter: formatUsd,
      valueFormatter: formatUsd,
    },
    {
      title: "Cost avoided over time",
      description: "Routing and cache savings versus list price across the selected window.",
      data: AVOIDED_COST_DATA,
      series: AVOIDED_COST_SERIES,
      kind: "area",
      span: 6,
      leftTickFormatter: formatUsd,
      valueFormatter: formatUsd,
    },
    {
      title: "Latency trend",
      description: "Average and p95 latency across the selected window.",
      data: LATENCY_DATA,
      series: LATENCY_SERIES,
      kind: "line",
      span: 6,
      leftTickFormatter: formatMs,
      valueFormatter: formatMs,
    },
    {
      title: "Success vs failure volume",
      description: "Successful and failed request volume by time bucket.",
      data: SUCCESS_DATA,
      series: SUCCESS_SERIES,
      kind: "bar",
      span: 6,
    },
  ];
}

/** Interactive fixture for visual review — same composition as Paper RuntimeOverview. */
function RuntimeOverviewSpecimensDemo({ className }: { className?: string }) {
  const [filters, setFilters] = React.useState(DEFAULT_OVERVIEW_FILTERS);
  const charts = React.useMemo(() => buildRuntimeOverviewCharts(), []);

  return (
    <RuntimeOverview
      className={className}
      models={SIDEBAR_FIXTURE_MODELS}
      cacheHitRate={72}
      routerEndpoint="127.0.0.1:3456/v1"
      routerAlias="baseline.remote-only"
      navItems={DEFAULT_OVERVIEW_NAV}
      filters={filters}
      onFiltersChange={setFilters}
      breakdownOptions={[
        { value: "endpoint", label: "By endpoint" },
        { value: "model", label: "By model" },
      ]}
      sourceOptions={[
        { value: "all", label: "All sources" },
        { value: "local", label: "Local" },
        { value: "remote", label: "Remote" },
      ]}
      statusOptions={[
        { value: "all", label: "All statuses" },
        { value: "success", label: "Success" },
        { value: "error", label: "Error" },
      ]}
      difficultyOptions={[
        { value: "all", label: "All buckets" },
        { value: "easy", label: "Easy" },
        { value: "hard", label: "Hard" },
      ]}
      charts={charts}
    />
  );
}

export { RuntimeOverviewSpecimensDemo };
