"use client";

import * as React from "react";

import { cn } from "./lib/utils";
import { usePrefersReducedMotion } from "./use-prefers-reduced-motion";

/** Model health in the sidebar inventory: maps to success / warning / muted dots. */
export type ModelStatus = "active" | "degraded" | "offline";

export type SidebarModel = {
  readonly id: string;
  readonly status: ModelStatus;
  /** Requests routed via alias or direct model id. */
  readonly requestCount: number;
};

export type SidebarNavItem = {
  readonly id: string;
  readonly label: string;
  readonly active?: boolean;
  readonly onSelect?: () => void;
};

export type SidebarIntegration = {
  readonly id: string;
  readonly label: string;
  readonly onSelect?: () => void;
};

export type SidebarProps = {
  readonly models: readonly SidebarModel[];
  /** Most recent request’s cache hit rate, 0–100. */
  readonly cacheHitRate: number;
  /** Host URL, e.g. `127.0.0.1:3456/v1`. */
  readonly routerEndpoint: string;
  /** Active alias, e.g. `baseline.remote-only`. */
  readonly routerAlias: string;
  readonly navItems?: readonly SidebarNavItem[];
  readonly integrations?: readonly SidebarIntegration[];
  readonly integrationsLabel?: string;
  /** Optional update promo above the footer stack. */
  readonly updateCard?: React.ReactNode;
  readonly className?: string;
  readonly onHomeSelect?: () => void;
};

export const MODEL_STATUS_DOT_CLASS: Record<ModelStatus, string> = {
  active: "bg-chart-cache",
  degraded: "bg-status-warning",
  offline: "bg-muted-foreground",
};

export function formatRequestCount(count: number): string {
  const n = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  return new Intl.NumberFormat("en-US").format(n);
}

export function clampCacheHitRate(rate: number): number {
  if (!Number.isFinite(rate)) return 0;
  return Math.min(100, Math.max(0, rate));
}

export function formatCacheHitRate(rate: number): string {
  return `${Math.round(clampCacheHitRate(rate))}%`;
}

/** Flash a CSS animation class when `value` changes (skipped under reduced motion). */
function useFlashOnChange(value: string | number, durationMs: number): boolean {
  const reduced = usePrefersReducedMotion();
  const [flash, setFlash] = React.useState(false);
  const prev = React.useRef(value);
  const mounted = React.useRef(false);

  React.useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      prev.current = value;
      return;
    }
    if (prev.current === value) return;
    prev.current = value;
    if (reduced) return;
    setFlash(true);
    const t = window.setTimeout(() => setFlash(false), durationMs);
    return () => window.clearTimeout(t);
  }, [value, durationMs, reduced]);

  return flash;
}

function SidebarEyebrow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "font-mono text-[11px] leading-4 tracking-[0.08em] text-muted-foreground uppercase",
        className,
      )}
    >
      {children}
    </div>
  );
}

function ModelStatusDot({ status }: { status: ModelStatus }) {
  const flash = useFlashOnChange(status, 150);
  return (
    <span
      aria-hidden
      className={cn(
        "size-2 shrink-0 rounded-full transition-colors duration-150 ease-out",
        MODEL_STATUS_DOT_CLASS[status],
        flash && "rm3-status-pop",
      )}
    />
  );
}

function PulsingMetric({
  value,
  children,
  className,
}: {
  value: string | number;
  children: React.ReactNode;
  className?: string;
}) {
  const flash = useFlashOnChange(value, 150);
  return <span className={cn(className, flash && "rm3-metric-pulse")}>{children}</span>;
}

function ModelInventory({ models }: { models: readonly SidebarModel[] }) {
  return (
    <div
      data-slot="role-model-model-inventory"
      className="flex shrink-0 flex-col gap-1 border-t border-sidebar-border p-2"
    >
      <div className="flex h-6 w-full shrink-0 items-center justify-between px-2.5">
        <SidebarEyebrow>Models</SidebarEyebrow>
        <SidebarEyebrow className="text-right">Requests</SidebarEyebrow>
      </div>
      {models.map((model, index) => (
        <div
          key={model.id}
          className="group relative flex h-8 shrink-0 items-center gap-2 rounded-md px-2.5"
        >
          <ModelStatusDot status={model.status} />
          <div
            aria-describedby={`sidebar-model-identity-${index}`}
            className="min-w-0 flex-1 truncate rounded-sm font-mono text-xs leading-4 text-foreground"
          >
            {model.id}
          </div>
          <span
            id={`sidebar-model-identity-${index}`}
            role="tooltip"
            className="pointer-events-none absolute bottom-full left-2.5 z-50 mb-1.5 max-w-72 rounded-md border border-border bg-popover px-2.5 py-1.5 font-mono text-xs leading-4 text-popover-foreground opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
          >
            {model.id}
          </span>
          <PulsingMetric
            value={model.requestCount}
            className="shrink-0 text-right font-mono text-[11px] leading-4 text-muted-foreground tabular-nums"
          >
            {formatRequestCount(model.requestCount)}
          </PulsingMetric>
        </div>
      ))}
    </div>
  );
}

function CacheHitRate({ rate }: { rate: number }) {
  const pct = clampCacheHitRate(rate);
  const label = formatCacheHitRate(rate);
  const reduced = usePrefersReducedMotion();

  return (
    <div
      data-slot="role-model-cache"
      className="flex shrink-0 flex-col gap-1.5 border-t border-sidebar-border p-2"
    >
      <div className="flex h-6 shrink-0 items-center justify-between gap-2 px-2.5">
        <SidebarEyebrow>Cache</SidebarEyebrow>
        <PulsingMetric
          value={label}
          className="shrink-0 text-right font-mono text-[11px] leading-4 text-foreground tabular-nums"
        >
          {label}
        </PulsingMetric>
      </div>
      <div
        className="mx-2.5 mb-1 flex h-1.5 shrink-0 items-center overflow-hidden rounded-full bg-border"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        aria-label="Cache hit rate"
      >
        <div
          className={cn(
            "rm3-cache-bar-fill h-full shrink-0 rounded-full bg-chart-cache",
            !reduced && "transition-[width] duration-[250ms] ease-out",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function RouterEndpoint({
  endpoint,
  alias,
}: {
  endpoint: string;
  alias: string;
}) {
  return (
    <div
      data-slot="role-model-router-endpoint"
      className="flex shrink-0 flex-col gap-1 border-t border-sidebar-border p-2"
    >
      <div className="flex h-6 shrink-0 items-center px-2.5">
        <SidebarEyebrow>Router endpoint</SidebarEyebrow>
      </div>
      <div className="flex min-h-5 items-center overflow-hidden px-2.5">
        <div className="truncate font-mono text-xs leading-4 text-foreground">{endpoint}</div>
      </div>
      <div className="flex min-h-5 items-center overflow-hidden px-2.5 pb-1">
        <div className="truncate font-mono text-xs leading-4 text-muted-foreground">{alias}</div>
      </div>
    </div>
  );
}

/**
 * RM3 app sidebar: wordmark, nav, optional update card, then footer stack
 * Model inventory → Cache → Router endpoint.
 */
function Sidebar({
  models,
  cacheHitRate,
  routerEndpoint,
  routerAlias,
  navItems = [],
  integrations = [],
  integrationsLabel = "Integrations",
  updateCard,
  className,
  onHomeSelect,
}: SidebarProps) {
  return (
    <aside
      data-slot="role-model-sidebar"
      className={cn(
        "flex h-full w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-xs leading-4",
        className,
      )}
    >
      <div className="flex h-12 shrink-0 items-center border-b border-sidebar-border px-4">
        {onHomeSelect ? (
          <button
            type="button"
            onClick={onHomeSelect}
            className="font-sans text-sm leading-[18px] font-semibold tracking-[-0.02em] text-foreground"
          >
            role-model
          </button>
        ) : (
          <div className="font-sans text-sm leading-[18px] font-semibold tracking-[-0.02em] text-foreground">
            role-model
          </div>
        )}
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-px overflow-hidden p-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={item.onSelect}
            data-active={item.active ? "true" : undefined}
            className={cn(
              "flex items-center rounded-md px-2.5 py-1.5 text-left font-sans text-sm leading-5",
              item.active
                ? "bg-sidebar-active font-medium text-foreground"
                : "font-normal text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            {item.label}
          </button>
        ))}

        {integrations.length > 0 ? (
          <>
            <div className="mt-5 mb-1 px-2.5 font-sans text-xs leading-4 font-medium tracking-[0.1em] text-muted-foreground uppercase">
              {integrationsLabel}
            </div>
            {integrations.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={item.onSelect}
                className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <span aria-hidden className="size-3.5 shrink-0 rounded-[3px] bg-accent" />
                <span className="font-sans text-xs leading-4">{item.label}</span>
              </button>
            ))}
          </>
        ) : null}
      </nav>

      {updateCard ? <div className="flex shrink-0 flex-col gap-2 p-2">{updateCard}</div> : null}

      <div data-slot="role-model-sidebar-footer" className="flex shrink-0 flex-col">
        <ModelInventory models={models} />
        <CacheHitRate rate={cacheHitRate} />
        <RouterEndpoint endpoint={routerEndpoint} alias={routerAlias} />
      </div>
    </aside>
  );
}

export {
  Sidebar,
  ModelInventory as SidebarModelInventory,
  CacheHitRate as SidebarCache,
  RouterEndpoint as SidebarRouterEndpoint,
};
