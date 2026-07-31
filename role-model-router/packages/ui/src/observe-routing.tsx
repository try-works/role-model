"use client";

import * as React from "react";

import { cn } from "./lib/utils";
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

export type ObserveRoutingFiltersState = {
  readonly timeRange: PageTimeRange;
  readonly breakdown: string;
  readonly source: string;
  readonly difficulty: string;
};

export type ObserveRoutingRoleRow = {
  readonly roleId: string;
  readonly requestCount: number;
};

export type ObserveRoutingSliceSummary = {
  readonly timeRangeLabel: string;
  readonly breakdownLabel: string;
  readonly sourceLabel: string;
  readonly difficultyLabel: string;
};

export type ObserveRoutingProps = {
  readonly models: readonly SidebarModel[];
  readonly cacheHitRate: number;
  readonly routerEndpoint: string;
  readonly routerAlias: string;
  readonly navItems?: readonly SidebarNavItem[];
  readonly filters: ObserveRoutingFiltersState;
  readonly onFiltersChange?: (next: ObserveRoutingFiltersState) => void;
  readonly breakdownOptions?: readonly PageFilterOption[];
  readonly sourceOptions?: readonly PageFilterOption[];
  readonly difficultyOptions?: readonly PageFilterOption[];
  readonly charts: readonly ObserveChartBlock[];
  readonly slice: ObserveRoutingSliceSummary;
  readonly activeRoles: readonly ObserveRoutingRoleRow[];
  readonly page?: ObservePageId;
  readonly onPageChange?: (page: ObservePageId) => void;
  readonly className?: string;
  readonly onHomeSelect?: () => void;
};

function routingFilterFields(
  filters: ObserveRoutingFiltersState,
  breakdownOptions: readonly PageFilterOption[],
  sourceOptions: readonly PageFilterOption[],
  difficultyOptions: readonly PageFilterOption[],
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
      label: "Source",
      value: filters.source,
      options: sourceOptions,
    },
    {
      id: "difficulty",
      label: "Difficulty",
      value: filters.difficulty,
      options: difficultyOptions,
    },
  ];
}

function ObserveRoutingRail({
  slice,
  activeRoles,
  className,
}: {
  slice: ObserveRoutingSliceSummary;
  activeRoles: readonly ObserveRoutingRoleRow[];
  className?: string;
}) {
  return (
    <aside className={cn("flex w-full flex-col gap-4", className)}>
      <section className="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-medium leading-5 tracking-tight text-foreground">
            Current routing slice
          </h2>
          <p className="mt-1 text-xs leading-4 text-muted-foreground">
            Active filters for the routing analytics window.
          </p>
        </div>
        <dl className="flex flex-col gap-3 px-4 py-3">
          {(
            [
              ["Time range", slice.timeRangeLabel],
              ["Breakdown", slice.breakdownLabel],
              ["Source", slice.sourceLabel],
              ["Difficulty", slice.difficultyLabel],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="flex flex-col gap-0.5">
              <dt className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                {label}
              </dt>
              <dd className="text-[13px] font-medium text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-medium leading-5 tracking-tight text-foreground">
            Most active roles
          </h2>
          <p className="mt-1 text-xs leading-4 text-muted-foreground">
            Top requested roles in the current slice.
          </p>
        </div>
        {activeRoles.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            No role demand in this slice yet.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {activeRoles.map((role) => (
              <li
                key={role.roleId}
                className="flex items-baseline justify-between gap-3 px-4 py-2.5"
              >
                <span className="min-w-0 truncate font-mono text-[13px] text-foreground">
                  {role.roleId}
                </span>
                <span className="shrink-0 font-mono text-[12px] tabular-nums text-muted-foreground">
                  {role.requestCount}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
}

/**
 * Observe · Routing — routing analytics chart grid + posture rail.
 * Charts are real Recharts ChartCards (area / line / bar / ranking).
 */
function ObserveRouting({
  models,
  cacheHitRate,
  routerEndpoint,
  routerAlias,
  navItems,
  filters,
  onFiltersChange,
  breakdownOptions = [{ value: "selectedStrategy", label: "Selected strategy" }],
  sourceOptions = [{ value: "all", label: "All sources" }],
  difficultyOptions = [{ value: "all", label: "All buckets" }],
  charts,
  slice,
  activeRoles,
  page = "routing",
  onPageChange,
  className,
  onHomeSelect,
}: ObserveRoutingProps) {
  return (
    <PageShell
      title="Routing analytics"
      className={className}
      data-slot="role-model-observe-routing"
      sidebar={
        <Sidebar
          models={models}
          cacheHitRate={cacheHitRate}
          routerEndpoint={routerEndpoint}
          routerAlias={routerAlias}
          navItems={navItems ?? observeNavItems("routing")}
          onHomeSelect={onHomeSelect}
          className="h-auto min-h-screen"
        />
      }
    >
      <ObservePageNav value={page} onChange={onPageChange} />
      <PageFilters
        timeRange={filters.timeRange}
        onTimeRangeChange={(timeRange) => onFiltersChange?.({ ...filters, timeRange })}
        fields={routingFilterFields(filters, breakdownOptions, sourceOptions, difficultyOptions)}
        onFieldChange={(id, value) => {
          if (id === "breakdown" || id === "source" || id === "difficulty") {
            onFiltersChange?.({ ...filters, [id]: value });
          }
        }}
      />
      <div className="grid w-full gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <ObserveChartGrid charts={charts} />
        <ObserveRoutingRail slice={slice} activeRoles={activeRoles} />
      </div>
    </PageShell>
  );
}

export { ObserveRouting, ObserveRoutingRail };
