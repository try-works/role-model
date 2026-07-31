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
import { Sidebar, type SidebarModel, type SidebarNavItem } from "./sidebar";

export type ObserveActivityEntry = {
  readonly id: string;
  readonly kind: string;
  readonly summary: string;
  readonly timestampLabel: string;
  readonly hasCapture: boolean;
};

export type ObserveActivityCapture = {
  readonly id: string;
  readonly title: string;
  readonly body: string;
};

export type ObserveActivityProps = {
  readonly models: readonly SidebarModel[];
  readonly cacheHitRate: number;
  readonly routerEndpoint: string;
  readonly routerAlias: string;
  readonly navItems?: readonly SidebarNavItem[];
  readonly metrics: readonly MetricItem[];
  readonly entries: readonly ObserveActivityEntry[];
  readonly selectedEntryId?: string | null;
  readonly onSelectEntry?: (id: string) => void;
  readonly capture?: ObserveActivityCapture | null;
  readonly page?: ObservePageId;
  readonly onPageChange?: (page: ObservePageId) => void;
  readonly className?: string;
  readonly onHomeSelect?: () => void;
};

/**
 * Observe · Activity — raw-host ledger adjacent to canonical Requests telemetry.
 * No charts; MetricStrip facts + 8+4 ledger / capture inspector.
 */
function ObserveActivity({
  models,
  cacheHitRate,
  routerEndpoint,
  routerAlias,
  navItems,
  metrics,
  entries,
  selectedEntryId = null,
  onSelectEntry,
  capture = null,
  page = "activity",
  onPageChange,
  className,
  onHomeSelect,
}: ObserveActivityProps) {
  return (
    <PageShell
      title="Host activity and metrics"
      className={className}
      data-slot="role-model-observe-activity"
      sidebar={
        <Sidebar
          models={models}
          cacheHitRate={cacheHitRate}
          routerEndpoint={routerEndpoint}
          routerAlias={routerAlias}
          navItems={navItems ?? observeNavItems("activity")}
          onHomeSelect={onHomeSelect}
          className="h-auto min-h-screen"
        />
      }
    >
      <ObservePageNav value={page} onChange={onPageChange} />
      <MetricStrip variant="panel" items={[...metrics]} />
      <div className="grid w-full gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <section className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-medium text-foreground">Recent host activity</h2>
          </div>
          {entries.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">No host activity.</p>
          ) : (
            <ul className="divide-y divide-border">
              {entries.map((entry) => {
                const active = entry.id === selectedEntryId;
                return (
                  <li key={entry.id}>
                    <button
                      type="button"
                      onClick={() => onSelectEntry?.(entry.id)}
                      className={cn(
                        "flex w-full flex-col gap-1 px-4 py-3 text-left",
                        active ? "bg-accent" : "hover:bg-muted/40",
                      )}
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="font-mono text-[12px] font-medium text-foreground">
                          {entry.kind}
                        </span>
                        <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                          {entry.timestampLabel}
                        </span>
                      </div>
                      <span className="text-[13px] text-muted-foreground">{entry.summary}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <section className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-medium text-foreground">Capture inspector</h2>
          </div>
          {!capture ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              Choose a ledger row with a capture to inspect.
            </p>
          ) : (
            <div className="flex flex-col gap-2 px-4 py-3">
              <p className="font-mono text-[12px] font-medium text-foreground">{capture.title}</p>
              <pre className="max-h-[360px] overflow-auto rounded-md border border-border bg-muted/30 p-3 font-mono text-[11px] leading-4 text-foreground whitespace-pre-wrap">
                {capture.body}
              </pre>
            </div>
          )}
        </section>
      </div>
    </PageShell>
  );
}

export { ObserveActivity };
