"use client";

import * as React from "react";

import { cn } from "./lib/utils";
import {
  ObserveChartGrid,
  ObservePageNav,
  observeNavItems,
  type ObserveChartBlock,
  type ObservePageId,
} from "./observe-shared";
import {
  PageFilters,
  type PageFilterField,
  type PageFilterOption,
  type PageTimeRange,
} from "./page-filters";
import { PageShell } from "./page-shell";
import { Sidebar, type SidebarModel, type SidebarNavItem } from "./sidebar";

export type ObserveRequestsFiltersState = {
  readonly timeRange: PageTimeRange;
  readonly breakdown: string;
  readonly rankingMetric: string;
  readonly rankingDimension: string;
  readonly source: string;
};

export type ObserveRequestLedgerRow = {
  readonly requestId: string;
  readonly endpointId: string;
  readonly modelId: string;
  readonly source: string;
  readonly status: string;
  readonly latencyMs: number;
  readonly tokens: number;
  readonly costUsd: number;
};

export type ObserveRequestsProps = {
  readonly models: readonly SidebarModel[];
  readonly cacheHitRate: number;
  readonly routerEndpoint: string;
  readonly routerAlias: string;
  readonly navItems?: readonly SidebarNavItem[];
  readonly filters: ObserveRequestsFiltersState;
  readonly onFiltersChange?: (next: ObserveRequestsFiltersState) => void;
  readonly breakdownOptions?: readonly PageFilterOption[];
  readonly rankingMetricOptions?: readonly PageFilterOption[];
  readonly rankingDimensionOptions?: readonly PageFilterOption[];
  readonly sourceOptions?: readonly PageFilterOption[];
  readonly charts: readonly ObserveChartBlock[];
  readonly ledger: readonly ObserveRequestLedgerRow[];
  readonly page?: ObservePageId;
  readonly onPageChange?: (page: ObservePageId) => void;
  readonly className?: string;
  readonly onHomeSelect?: () => void;
};

function requestsFilterFields(
  filters: ObserveRequestsFiltersState,
  breakdownOptions: readonly PageFilterOption[],
  rankingMetricOptions: readonly PageFilterOption[],
  rankingDimensionOptions: readonly PageFilterOption[],
  sourceOptions: readonly PageFilterOption[],
): PageFilterField[] {
  return [
    {
      id: "breakdown",
      label: "Breakdown",
      value: filters.breakdown,
      options: breakdownOptions,
    },
    {
      id: "rankingMetric",
      label: "Ranking metric",
      value: filters.rankingMetric,
      options: rankingMetricOptions,
    },
    {
      id: "rankingDimension",
      label: "Ranking target",
      value: filters.rankingDimension,
      options: rankingDimensionOptions,
    },
    {
      id: "source",
      label: "Source",
      value: filters.source,
      options: sourceOptions,
    },
  ];
}

function ObserveRequestsLedger({
  rows,
  className,
}: {
  rows: readonly ObserveRequestLedgerRow[];
  className?: string;
}) {
  return (
    <section
      data-slot="observe-requests-ledger"
      className={cn(
        "flex w-full flex-col overflow-hidden rounded-lg border border-border bg-card",
        className,
      )}
    >
      <div className="-mx-0 flex flex-col gap-1 border-b border-border px-4 py-3">
        <h2 className="text-sm font-medium leading-5 tracking-tight text-foreground">
          Recent telemetry requests
        </h2>
        <p className="text-xs leading-4 text-muted-foreground">
          Canonical structured rows — open a request to inspect captures and receipts.
        </p>
      </div>
      <div className="divide-y divide-border">
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            No requests match the current analytics filters.
          </p>
        ) : (
          rows.map((row) => (
            <div
              key={row.requestId}
              className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-4 py-3"
            >
              <span className="min-w-0 flex-1 truncate font-mono text-[13px] font-medium tabular-nums text-foreground">
                {row.requestId}
              </span>
              <span className="font-mono text-[12px] text-muted-foreground">{row.endpointId}</span>
              <span className="font-mono text-[12px] text-muted-foreground">{row.modelId}</span>
              <span className="text-[12px] text-muted-foreground">{row.source}</span>
              <span className="text-[12px] text-muted-foreground">{row.status}</span>
              <span className="font-mono text-[12px] tabular-nums text-muted-foreground">
                {row.latencyMs}ms
              </span>
              <span className="font-mono text-[12px] tabular-nums text-muted-foreground">
                {row.tokens}
              </span>
              <span className="font-mono text-[12px] tabular-nums text-muted-foreground">
                ${row.costUsd.toFixed(3)}
              </span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

/**
 * Observe · Requests — telemetry analytics chart grid + recent request ledger.
 * Charts are real Recharts ChartCards (area / line / bar / ranking).
 */
function ObserveRequests({
  models,
  cacheHitRate,
  routerEndpoint,
  routerAlias,
  navItems,
  filters,
  onFiltersChange,
  breakdownOptions = [{ value: "none", label: "None" }],
  rankingMetricOptions = [{ value: "averageLatencyMs", label: "Average latency" }],
  rankingDimensionOptions = [{ value: "endpointId", label: "Endpoint" }],
  sourceOptions = [{ value: "all", label: "All sources" }],
  charts,
  ledger,
  page = "requests",
  onPageChange,
  className,
  onHomeSelect,
}: ObserveRequestsProps) {
  return (
    <PageShell
      title="Telemetry request ledger"
      className={className}
      data-slot="role-model-observe-requests"
      sidebar={
        <Sidebar
          models={models}
          cacheHitRate={cacheHitRate}
          routerEndpoint={routerEndpoint}
          routerAlias={routerAlias}
          navItems={navItems ?? observeNavItems("requests")}
          onHomeSelect={onHomeSelect}
          className="h-auto min-h-screen"
        />
      }
    >
      <ObservePageNav value={page} onChange={onPageChange} />
      <PageFilters
        timeRange={filters.timeRange}
        onTimeRangeChange={(timeRange) => onFiltersChange?.({ ...filters, timeRange })}
        fields={requestsFilterFields(
          filters,
          breakdownOptions,
          rankingMetricOptions,
          rankingDimensionOptions,
          sourceOptions,
        )}
        onFieldChange={(id, value) => {
          if (
            id === "breakdown" ||
            id === "rankingMetric" ||
            id === "rankingDimension" ||
            id === "source"
          ) {
            onFiltersChange?.({ ...filters, [id]: value });
          }
        }}
      />
      <ObserveChartGrid charts={charts} />
      <ObserveRequestsLedger rows={ledger} />
    </PageShell>
  );
}

export { ObserveRequests, ObserveRequestsLedger };
