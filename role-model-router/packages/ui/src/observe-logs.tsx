"use client";

import * as React from "react";

import { cn } from "./lib/utils";
import { MetricStrip, type MetricItem } from "./metric-strip";
import {
  ObservePageNav,
  observeNavItems,
  type ObservePageId,
} from "./observe-shared";
import { PageShell } from "./page-shell";
import { SegmentedControl } from "./segmented-control";
import { Sidebar, type SidebarModel, type SidebarNavItem } from "./sidebar";

export type ObserveLogRow = {
  readonly id: string;
  readonly source: string;
  readonly severity: string;
  readonly message: string;
  readonly timestampLabel: string;
  readonly requestId?: string;
};

export type ObserveLogsProps = {
  readonly models: readonly SidebarModel[];
  readonly cacheHitRate: number;
  readonly routerEndpoint: string;
  readonly routerAlias: string;
  readonly navItems?: readonly SidebarNavItem[];
  readonly metrics: readonly MetricItem[];
  readonly sourceFilter: string;
  readonly onSourceFilterChange?: (source: string) => void;
  readonly sourceOptions: readonly { value: string; label: string }[];
  readonly rows: readonly ObserveLogRow[];
  readonly rawLines: string;
  readonly page?: ObservePageId;
  readonly onPageChange?: (page: ObservePageId) => void;
  readonly className?: string;
  readonly onHomeSelect?: () => void;
};

/**
 * Observe · Logs — preserved raw-host log shell adjacent to canonical Requests.
 * No charts; MetricStrip facts + source filter + table + raw lines.
 */
function ObserveLogs({
  models,
  cacheHitRate,
  routerEndpoint,
  routerAlias,
  navItems,
  metrics,
  sourceFilter,
  onSourceFilterChange,
  sourceOptions,
  rows,
  rawLines,
  page = "logs",
  onPageChange,
  className,
  onHomeSelect,
}: ObserveLogsProps) {
  return (
    <PageShell
      title="Host logs"
      className={className}
      data-slot="role-model-observe-logs"
      sidebar={
        <Sidebar
          models={models}
          cacheHitRate={cacheHitRate}
          routerEndpoint={routerEndpoint}
          routerAlias={routerAlias}
          navItems={navItems ?? observeNavItems("logs")}
          onHomeSelect={onHomeSelect}
          className="h-auto min-h-screen"
        />
      }
    >
      <ObservePageNav value={page} onChange={onPageChange} />
      <MetricStrip variant="panel" items={[...metrics]} />
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-medium text-foreground">Source filter</span>
        <SegmentedControl
          aria-label="Log source filter"
          value={sourceFilter}
          options={sourceOptions.map((o) => ({ value: o.value, label: o.label }))}
          onChange={onSourceFilterChange}
        />
      </div>
      <section className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-medium text-foreground">Structured log history</h2>
        </div>
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">No logs recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="border-b border-border">
                  {["Time", "Source", "Severity", "Message", "Request"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-2 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-border last:border-b-0">
                    <td className="px-4 py-2.5 font-mono text-[12px] tabular-nums text-muted-foreground">
                      {row.timestampLabel}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[12px] text-foreground">
                      {row.source}
                    </td>
                    <td className="px-4 py-2.5 text-[12px] text-foreground">{row.severity}</td>
                    <td className="px-4 py-2.5 text-[13px] text-foreground">{row.message}</td>
                    <td className="px-4 py-2.5 font-mono text-[12px] text-muted-foreground">
                      {row.requestId ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-medium text-foreground">Raw lines</h2>
        </div>
        <pre
          className={cn(
            "max-h-[280px] overflow-auto px-4 py-3 font-mono text-[11px] leading-4 text-foreground whitespace-pre-wrap",
          )}
        >
          {rawLines || "No raw lines match the current source filter."}
        </pre>
      </section>
    </PageShell>
  );
}

export { ObserveLogs };
