import * as React from "react";

import { ChartGrid, ChartGridCell } from "./chart-grid";
import {
  type ChartSeries,
  TimeSeriesAreaChart,
  TimeSeriesBarChart,
  TimeSeriesLineChart,
} from "./chart-time-series";

/** Fixture hours matching Paper TimeAxis ticks (bucket starts + 24:00). */
const HOURS = [0, 4, 8, 12, 16, 20, 24] as const;

function ramp(base: number, step: number, n = HOURS.length) {
  return Array.from({ length: n }, (_, i) => base + step * i);
}

/** Paper specimen: Token usage over time (area, single Y). */
const tokenUsageTotalRamp = ramp(60_000, 25_000);
const tokenUsageInputRamp = ramp(35_000, 14_000);
const tokenUsageOutputRamp = ramp(18_000, 8_000);
export const TOKEN_USAGE_DATA = HOURS.map((hour, i) => ({
  hour,
  totalTokens: tokenUsageTotalRamp[i] ?? 0,
  inputTokens: tokenUsageInputRamp[i] ?? 0,
  outputTokens: tokenUsageOutputRamp[i] ?? 0,
}));

export const TOKEN_USAGE_SERIES: ChartSeries[] = [
  { key: "totalTokens", label: "totalTokens", color: "var(--chart-local)" },
  { key: "inputTokens", label: "inputTokens", color: "var(--chart-remote)" },
  { key: "outputTokens", label: "outputTokens", color: "var(--chart-latency)" },
];

/** Paper specimen: Latency trend (line, single Y). */
const latencyAverageRamp = ramp(120, 80);
const latencyP95Ramp = ramp(280, 90);
export const LATENCY_DATA = HOURS.map((hour, i) => ({
  hour,
  averageLatencyMs: latencyAverageRamp[i] ?? 0,
  p95LatencyMs: latencyP95Ramp[i] ?? 0,
}));

export const LATENCY_SERIES: ChartSeries[] = [
  { key: "averageLatencyMs", label: "averageLatencyMs", color: "var(--chart-latency)" },
  { key: "p95LatencyMs", label: "p95LatencyMs", color: "var(--chart-5)" },
];

/** Paper specimen: Cache efficiency (line, dual Y). */
const cacheHitTokensRamp = ramp(12_000, 16_000);
export const CACHE_DATA = HOURS.map((hour, i) => ({
  hour,
  cacheHitTokens: cacheHitTokensRamp[i] ?? 0,
  cacheHitTokenRate: Math.min(100, 28 + i * 10),
}));

export const CACHE_SERIES: ChartSeries[] = [
  { key: "cacheHitTokens", label: "cacheHitTokens", color: "var(--chart-cache)", yAxis: "left" },
  {
    key: "cacheHitTokenRate",
    label: "cacheHitTokenRate",
    color: "var(--chart-2)",
    yAxis: "right",
  },
];

/** Paper specimen: Success vs failure volume (bar). Six buckets; 24:00 is axis-only. */
export const SUCCESS_DATA = [0, 4, 8, 12, 16, 20].map((hour, i) => ({
  hour,
  successCount: 80 + i * 45,
  failureCount: -(12 + i * 7),
}));

export const SUCCESS_SERIES: ChartSeries[] = [
  { key: "successCount", label: "successCount", color: "var(--chart-cache)" },
  { key: "failureCount", label: "failureCount", color: "var(--chart-error)" },
];

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

/** Canonical Paper ChartGrid specimens for visual review. Prefer RuntimeOverviewSpecimensDemo for the full page. */
function ChartSpecimensDemo({ className }: { className?: string }) {
  return (
    <div className={className ?? "mx-auto flex w-full max-w-[1184px] flex-col gap-6 p-6"}>
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold tracking-tight">Chart specimens</h1>
        <p className="text-sm text-muted-foreground">
          Shared-border ChartGrid (Token, Cache, Latency, Success). Full page:{" "}
          <code className="font-mono text-xs">rm3/runtime-overview-specimens</code>.
        </p>
      </div>

      <ChartGrid>
        <ChartGridCell span={12}>
          <TimeSeriesAreaChart
            title="Token usage over time"
            description="Input, output, and total token flow across the selected telemetry window."
            data={TOKEN_USAGE_DATA}
            series={TOKEN_USAGE_SERIES}
            leftTickFormatter={formatK}
            valueFormatter={formatK}
          />
        </ChartGridCell>

        <ChartGridCell span={12}>
          <TimeSeriesLineChart
            title="Cache efficiency trend"
            description="Cache-hit token volume and cache-hit rate."
            data={CACHE_DATA}
            series={CACHE_SERIES}
            leftTickFormatter={formatK}
            rightTickFormatter={formatPct}
            valueFormatter={(v) => (v <= 100 ? formatPct(v) : formatK(v))}
          />
        </ChartGridCell>

        <ChartGridCell span={6}>
          <TimeSeriesLineChart
            title="Latency trend"
            description="Average and p95 latency across the selected window."
            data={LATENCY_DATA}
            series={LATENCY_SERIES}
            leftTickFormatter={formatMs}
            valueFormatter={formatMs}
          />
        </ChartGridCell>

        <ChartGridCell span={6}>
          <TimeSeriesBarChart
            title="Success vs failure volume"
            description="Successful and failed request volume by time bucket."
            data={SUCCESS_DATA}
            series={SUCCESS_SERIES}
          />
        </ChartGridCell>
      </ChartGrid>
    </div>
  );
}

export { ChartSpecimensDemo };
