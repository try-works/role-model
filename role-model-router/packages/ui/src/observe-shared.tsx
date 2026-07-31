"use client";

import * as React from "react";

import {
  CompositionChart,
  type CompositionRankRow,
  type CompositionSegment,
} from "./chart-composition";
import { ChartGrid, ChartGridCell } from "./chart-grid";
import { RankingBarChart, type RankingChartRow } from "./chart-ranking";
import {
  type ChartSeries,
  type ChartTimeAxisMode,
  TimeSeriesAreaChart,
  TimeSeriesBarChart,
  TimeSeriesLineChart,
} from "./chart-time-series";
import { SegmentedControl, type SegmentedControlOption } from "./segmented-control";
import type { SidebarNavItem } from "./sidebar";

export type ObservePageId = "requests" | "routing" | "activity" | "logs";

export const OBSERVE_PAGE_OPTIONS: readonly SegmentedControlOption<ObservePageId>[] = [
  { value: "requests", label: "Requests" },
  { value: "routing", label: "Routing" },
  { value: "activity", label: "Activity" },
  { value: "logs", label: "Logs" },
] as const;

export function observeNavItems(_active: ObservePageId): SidebarNavItem[] {
  return [
    { id: "overview", label: "Overview" },
    { id: "studio", label: "Studio" },
    { id: "local", label: "Local" },
    { id: "remote", label: "Remote" },
    { id: "models", label: "Models" },
    { id: "router", label: "Router" },
    { id: "observe", label: "Observe", active: true },
    { id: "connect", label: "Connect" },
    { id: "system", label: "System" },
  ];
}

export type ObserveChartBlock = {
  readonly title: string;
  readonly description?: string;
  readonly kind: "area" | "line" | "bar" | "ranking" | "composition";
  readonly span?: 6 | 12;
  /** Time-series rows (`hour` / `t` + metric keys). */
  readonly data?: Record<string, string | number>[];
  readonly series?: ChartSeries[];
  /** Ranking rows (horizontal bars). */
  readonly rows?: readonly RankingChartRow[];
  /** Composition nest segments (roles / capabilities / tools / tasks). */
  readonly segments?: readonly CompositionSegment[];
  /** Optional composition ranking rows under the nest. */
  readonly compositionRanks?: readonly CompositionRankRow[];
  readonly valueLabel?: string;
  readonly xKey?: string;
  readonly xAxisMode?: ChartTimeAxisMode;
  readonly xDomain?: [number, number];
  readonly xTicks?: readonly number[];
  readonly xTickFormatter?: (value: number) => string;
  readonly leftTickFormatter?: (value: number) => string;
  readonly rightTickFormatter?: (value: number) => string;
  readonly valueFormatter?: (value: number) => string;
  readonly categoryWidth?: number;
  readonly plotHeight?: number;
  /** Stack area series when `kind` is `area`. */
  readonly stacked?: boolean;
};

/** Group charts into full-width (12) or half-width (6+6) rows. */
export function groupObserveChartRows(charts: readonly ObserveChartBlock[]): ObserveChartBlock[][] {
  const rows: ObserveChartBlock[][] = [];
  let i = 0;
  while (i < charts.length) {
    const cur = charts[i];
    if (!cur) {
      break;
    }
    const span = cur.span ?? 12;
    if (span === 6) {
      const next = charts[i + 1];
      if (next && (next.span ?? 12) === 6) {
        rows.push([cur, next]);
        i += 2;
        continue;
      }
    }
    rows.push([cur]);
    i += 1;
  }
  return rows;
}

function ObserveChartBlockView({ block }: { block: ObserveChartBlock }) {
  if (block.kind === "ranking") {
    return (
      <RankingBarChart
        title={block.title}
        description={block.description}
        rows={block.rows ?? []}
        valueLabel={block.valueLabel}
        valueFormatter={block.valueFormatter}
        categoryWidth={block.categoryWidth}
        plotHeight={block.plotHeight}
        className="w-full"
      />
    );
  }

  if (block.kind === "composition") {
    return (
      <CompositionChart
        title={block.title}
        description={block.description}
        segments={block.segments ?? []}
        ranks={block.compositionRanks}
        valueLabel={block.valueLabel}
        valueFormatter={block.valueFormatter}
        className="w-full"
      />
    );
  }

  const shared = {
    title: block.title,
    description: block.description,
    data: block.data ?? [],
    series: block.series ?? [],
    xKey: block.xKey,
    xAxisMode: block.xAxisMode,
    xDomain: block.xDomain,
    xTicks: block.xTicks,
    xTickFormatter: block.xTickFormatter,
    leftTickFormatter: block.leftTickFormatter,
    rightTickFormatter: block.rightTickFormatter,
    valueFormatter: block.valueFormatter,
    plotHeight: block.plotHeight,
    stacked: block.stacked,
    className: "w-full" as const,
  };

  if (block.kind === "area") {
    return <TimeSeriesAreaChart {...shared} />;
  }
  if (block.kind === "bar") {
    return <TimeSeriesBarChart {...shared} />;
  }
  return <TimeSeriesLineChart {...shared} />;
}

function ObserveChartGrid({
  charts,
  className,
}: {
  charts: readonly ObserveChartBlock[];
  className?: string;
}) {
  return (
    <ChartGrid className={className}>
      {charts.map((block) => (
        <ChartGridCell key={block.title} span={block.span ?? 12}>
          <ObserveChartBlockView block={block} />
        </ChartGridCell>
      ))}
    </ChartGrid>
  );
}

function ObservePageNav({
  value,
  onChange,
  className,
}: {
  value: ObservePageId;
  onChange?: (value: ObservePageId) => void;
  className?: string;
}) {
  return (
    <SegmentedControl
      className={className}
      aria-label="Observe pages"
      size="md"
      value={value}
      options={OBSERVE_PAGE_OPTIONS}
      onChange={onChange}
    />
  );
}

export { ObserveChartBlockView, ObserveChartGrid, ObservePageNav };
