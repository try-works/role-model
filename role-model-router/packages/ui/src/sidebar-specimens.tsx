"use client";

import * as React from "react";

import {
  Sidebar,
  type SidebarIntegration,
  type SidebarModel,
  type SidebarNavItem,
} from "./sidebar";

/** Paper App shell fixture models. */
export const SIDEBAR_FIXTURE_MODELS: readonly SidebarModel[] = [
  { id: "claude-sonnet-4", status: "active", requestCount: 12_482 },
  { id: "gpt-4.1", status: "active", requestCount: 8_201 },
  { id: "gemini-2.5-pro", status: "degraded", requestCount: 1_044 },
  { id: "local/llama-70b", status: "offline", requestCount: 0 },
];

export const SIDEBAR_FIXTURE_NAV: readonly SidebarNavItem[] = [
  { id: "integrations", label: "Integrations", active: true },
  { id: "providers", label: "Providers" },
  { id: "policies", label: "Policies" },
  { id: "toolkits", label: "Toolkits" },
];

export const SIDEBAR_FIXTURE_INTEGRATIONS: readonly SidebarIntegration[] = [
  { id: "slack", label: "Slack" },
  { id: "github", label: "GitHub" },
  { id: "linear", label: "Linear" },
];

function FixtureUpdateCard() {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted p-3">
      <div className="font-sans text-[13px] leading-4 font-medium text-foreground">
        Update available
      </div>
      <div className="font-sans text-xs leading-4 text-muted-foreground">
        v0.4.2 is ready to install.
      </div>
      <button
        type="button"
        className="inline-flex h-7 w-fit shrink-0 items-center rounded-md bg-primary px-2.5 font-sans text-xs leading-4 font-medium text-primary-foreground"
      >
        Install
      </button>
    </div>
  );
}

/** Interactive Paper fixture — bump counts / status / cache to preview live motion. */
function SidebarSpecimensDemo({ className }: { className?: string }) {
  const [models, setModels] = React.useState(SIDEBAR_FIXTURE_MODELS);
  const [cacheHitRate, setCacheHitRate] = React.useState(73);

  const bumpRequests = () => {
    setModels((prev) =>
      prev.map((m, i) =>
        i === 0 ? { ...m, requestCount: m.requestCount + 1 } : m,
      ),
    );
  };

  const cycleStatus = () => {
    const order = ["active", "degraded", "offline"] as const;
    setModels((prev) =>
      prev.map((m, i) => {
        if (i !== 2) return m;
        const next = order[(order.indexOf(m.status) + 1) % order.length]!;
        return { ...m, status: next };
      }),
    );
  };

  const nudgeCache = () => {
    setCacheHitRate((r) => (r >= 90 ? 40 : r + 7));
  };

  return (
    <div className={className ?? "flex min-h-screen gap-8 bg-background p-6"}>
      <Sidebar
        models={models}
        cacheHitRate={cacheHitRate}
        routerEndpoint="127.0.0.1:3456/v1"
        routerAlias="baseline.remote-only"
        navItems={SIDEBAR_FIXTURE_NAV}
        integrations={SIDEBAR_FIXTURE_INTEGRATIONS}
        updateCard={<FixtureUpdateCard />}
      />

      <div className="flex max-w-sm flex-col gap-3 pt-2">
        <h1 className="text-lg font-semibold tracking-tight">RM3 sidebar</h1>
        <p className="text-sm text-muted-foreground">
          Production sidebar matching Paper App shell: model inventory, cache hit rate, and
          router endpoint with live-update motion.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={bumpRequests}
            className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            Bump requests
          </button>
          <button
            type="button"
            onClick={cycleStatus}
            className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            Cycle gemini status
          </button>
          <button
            type="button"
            onClick={nudgeCache}
            className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            Nudge cache %
          </button>
        </div>
      </div>
    </div>
  );
}

export { SidebarSpecimensDemo };
