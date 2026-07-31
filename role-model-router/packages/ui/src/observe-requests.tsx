"use client";

import * as React from "react";

import { cn } from "./lib/utils";
import { MetricStrip } from "./metric-strip";
import {
  type ObserveChartBlock,
  ObserveChartGrid,
  type ObservePageId,
  ObservePageNav,
  observeNavItems,
} from "./observe-shared";
import {
  type PageFilterField,
  type PageFilterOption,
  PageFilters,
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
      className={cn("flex w-full flex-col gap-4", className)}
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold leading-5 tracking-tight text-foreground">
          Recent telemetry requests
        </h2>
        <p className="text-xs leading-4 text-muted-foreground">
          Explainable request ledger with endpoint, model, status, and direct Observe drill-in.
        </p>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-lg border border-border bg-card px-4 py-6 text-sm text-muted-foreground">
          No requests match the current analytics filters.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {rows.map((row) => {
            const sourceKey = row.source.toLowerCase();
            return (
              <div
                key={row.requestId}
                className="space-y-4 rounded-lg border border-border bg-card p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 border-l-2 border-primary pl-3">
                    <p className="break-all text-sm font-semibold leading-5 text-foreground">
                      {row.requestId}
                    </p>
                  </div>
                  <span className="inline-flex h-6 items-center rounded-full border border-border bg-secondary px-2.5 font-mono text-[11px] leading-[14px] text-muted-foreground">
                    {sourceKey}
                  </span>
                </div>

                <MetricStrip
                  aria-label={`${row.requestId} telemetry request`}
                  variant="inventory"
                  className="max-w-none"
                  items={[
                    { id: "model", label: "Model", value: row.modelId },
                    { id: "endpoint", label: "Endpoint", value: row.endpointId },
                    { id: "status", label: "Status", value: row.status },
                    {
                      id: "latency",
                      label: "Latency",
                      value: `${row.latencyMs} ms`,
                    },
                    {
                      id: "tokens",
                      label: "Tokens",
                      value: String(row.tokens),
                    },
                    {
                      id: "cost",
                      label: "Cost",
                      value: `$${row.costUsd.toFixed(4)}`,
                    },
                  ]}
                />

                <div className="text-sm font-semibold text-primary">Observe · Open detail</div>
              </div>
            );
          })}
        </div>
      )}
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
