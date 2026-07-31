"use client";

import type * as React from "react";

import { ChartGrid, ChartGridCell } from "./chart-grid";
import {
  type ChartSeries,
  type ChartTimeAxisMode,
  TimeSeriesAreaChart,
  TimeSeriesBarChart,
  TimeSeriesLineChart,
} from "./chart-time-series";
import {
  DEFAULT_PAGE_TIME_RANGES,
  type PageFilterField,
  type PageFilterOption,
  PageFilters,
  type PageTimeRange,
} from "./page-filters";
import { PageShell } from "./page-shell";
import { Sidebar, type SidebarModel, type SidebarNavItem } from "./sidebar";

export type OverviewTimeRange = PageTimeRange;
export type OverviewFilterOption = PageFilterOption;

export type OverviewFiltersState = {
  readonly timeRange: OverviewTimeRange;
  readonly breakdown: string;
  readonly source: string;
  readonly status: string;
  readonly difficulty: string;
};

export type RuntimeOverviewChartBlock = {
  readonly title: string;
  readonly description?: string;
  readonly data: Record<string, string | number>[];
  readonly series: ChartSeries[];
  readonly kind: "area" | "line" | "bar";
  readonly xKey?: string;
  readonly xAxisMode?: ChartTimeAxisMode;
  readonly xDomain?: [number, number];
  readonly xTicks?: readonly number[];
  readonly xTickFormatter?: (value: number) => string;
  readonly leftTickFormatter?: (value: number) => string;
  readonly rightTickFormatter?: (value: number) => string;
  readonly valueFormatter?: (value: number) => string;
  /** 12-col span: 12 full width, 6 half. */
  readonly span?: 6 | 12;
};

export type RuntimeOverviewProps = {
  readonly models: readonly SidebarModel[];
  readonly cacheHitRate: number;
  readonly routerEndpoint: string;
  readonly routerAlias: string;
  readonly navItems?: readonly SidebarNavItem[];
  readonly filters: OverviewFiltersState;
  readonly onFiltersChange?: (next: OverviewFiltersState) => void;
  readonly breakdownOptions?: readonly OverviewFilterOption[];
  readonly sourceOptions?: readonly OverviewFilterOption[];
  readonly statusOptions?: readonly OverviewFilterOption[];
  readonly difficultyOptions?: readonly OverviewFilterOption[];
  /** Charts in display order. Pair consecutive `span: 6` into one row. */
  readonly charts: readonly RuntimeOverviewChartBlock[];
  /**
   * Optional first full-width grid cell (e.g. Model pool).
   * Renders inside the shared-border ChartGrid above chart cells.
   */
  readonly leading?: React.ReactNode;
  readonly className?: string;
  readonly onHomeSelect?: () => void;
};

export const OVERVIEW_TIME_RANGES = DEFAULT_PAGE_TIME_RANGES;

export const DEFAULT_OVERVIEW_NAV: readonly SidebarNavItem[] = [
  { id: "overview", label: "Overview", active: true },
  { id: "studio", label: "Studio" },
  { id: "local", label: "Local" },
  { id: "remote", label: "Remote" },
  { id: "models", label: "Models" },
  { id: "router", label: "Router" },
  { id: "observe", label: "Observe" },
  { id: "connect", label: "Connect" },
  { id: "system", label: "System" },
];

function overviewFilterFields(
  filters: OverviewFiltersState,
  breakdownOptions: readonly OverviewFilterOption[],
  sourceOptions: readonly OverviewFilterOption[],
  statusOptions: readonly OverviewFilterOption[],
  difficultyOptions: readonly OverviewFilterOption[],
): PageFilterField[] {
  return [
    {
      id: "breakdown",
      label: "Breakdown",
      value: filters.breakdown,
      options: breakdownOptions,
    },
    {
      id: "source",
      label: "Source filter",
      value: filters.source,
      options: sourceOptions,
    },
    {
      id: "status",
      label: "Status",
      value: filters.status,
      options: statusOptions,
    },
    {
      id: "difficulty",
      label: "Difficulty",
      value: filters.difficulty,
      options: difficultyOptions,
    },
  ];
}

/** Overview filter bar — thin wrapper over shared `PageFilters`. */
function OverviewFilters({
  filters,
  onFiltersChange,
  breakdownOptions,
  sourceOptions,
  statusOptions,
  difficultyOptions,
  className,
}: {
  filters: OverviewFiltersState;
  onFiltersChange?: (next: OverviewFiltersState) => void;
  breakdownOptions: readonly OverviewFilterOption[];
  sourceOptions: readonly OverviewFilterOption[];
  statusOptions: readonly OverviewFilterOption[];
  difficultyOptions: readonly OverviewFilterOption[];
  className?: string;
}) {
  return (
    <PageFilters
      className={className}
      timeRange={filters.timeRange}
      onTimeRangeChange={(timeRange) => onFiltersChange?.({ ...filters, timeRange })}
      fields={overviewFilterFields(
        filters,
        breakdownOptions,
        sourceOptions,
        statusOptions,
        difficultyOptions,
      )}
      onFieldChange={(id, value) => {
        if (id === "breakdown" || id === "source" || id === "status" || id === "difficulty") {
          onFiltersChange?.({ ...filters, [id]: value });
        }
      }}
    />
  );
}

function ChartBlock({ block }: { block: RuntimeOverviewChartBlock }) {
  const shared = {
    title: block.title,
    description: block.description,
    data: block.data,
    series: block.series,
    xKey: block.xKey,
    xAxisMode: block.xAxisMode,
    xDomain: block.xDomain,
    xTicks: block.xTicks,
    xTickFormatter: block.xTickFormatter,
    leftTickFormatter: block.leftTickFormatter,
    rightTickFormatter: block.rightTickFormatter,
    valueFormatter: block.valueFormatter,
    className: "w-full",
  };

  if (block.kind === "area") {
    return <TimeSeriesAreaChart {...shared} />;
  }
  if (block.kind === "bar") {
    return <TimeSeriesBarChart {...shared} />;
  }
  return <TimeSeriesLineChart {...shared} />;
}

/** Group charts into full-width (12) or half-width (6+6) rows. */
export function groupChartRows(
  charts: readonly RuntimeOverviewChartBlock[],
): RuntimeOverviewChartBlock[][] {
  const rows: RuntimeOverviewChartBlock[][] = [];
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

/** @deprecated Prefer `groupChartRows` — same pairing helper. */
export const groupOverviewChartRows = groupChartRows;

/**
 * Production Runtime overview page — Sidebar + filters + shared-border ChartGrid.
 * Source of truth for role-model; Paper artboards should be synced from this render.
 */
function RuntimeOverview({
  models,
  cacheHitRate,
  routerEndpoint,
  routerAlias,
  navItems = DEFAULT_OVERVIEW_NAV,
  filters,
  onFiltersChange,
  breakdownOptions = [{ value: "endpoint", label: "By endpoint" }],
  sourceOptions = [{ value: "all", label: "All sources" }],
  statusOptions = [{ value: "all", label: "All statuses" }],
  difficultyOptions = [{ value: "all", label: "All buckets" }],
  charts,
  leading,
  className,
  onHomeSelect,
}: RuntimeOverviewProps) {
  return (
    <PageShell
      title="Runtime overview"
      className={className}
      data-slot="role-model-runtime-overview"
      sidebar={
        <Sidebar
          models={models}
          cacheHitRate={cacheHitRate}
          routerEndpoint={routerEndpoint}
          routerAlias={routerAlias}
          navItems={navItems}
          onHomeSelect={onHomeSelect}
          className="h-auto min-h-screen"
        />
      }
    >
      <OverviewFilters
        filters={filters}
        onFiltersChange={onFiltersChange}
        breakdownOptions={breakdownOptions}
        sourceOptions={sourceOptions}
        statusOptions={statusOptions}
        difficultyOptions={difficultyOptions}
      />

      <ChartGrid>
        {leading ? <ChartGridCell span={12}>{leading}</ChartGridCell> : null}
        {charts.map((block) => (
          <ChartGridCell key={block.title} span={block.span ?? 12}>
            <ChartBlock block={block} />
          </ChartGridCell>
        ))}
      </ChartGrid>
    </PageShell>
  );
}

export { RuntimeOverview, OverviewFilters };
