import { PageContent, SegmentedControl, Sidebar } from "@role-model/ui";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";

import {
  getRuntimeRouteDefinition,
  runtimeNavigationSections,
  type RuntimeNavigationSection,
} from "../lib/design-system";
import { startDeferredLiveRefresh } from "../lib/live-refresh";
import {
  fetchDownstreamOpenAIProviderConfig,
  fetchRouterSummary,
  fetchRuntimeConfig,
  fetchRuntimeEndpoints,
  fetchRuntimeModels,
  fetchTelemetryDashboard,
  fetchTelemetryRequests,
  subscribeTelemetryStream,
  type RuntimeTelemetryStreamEvent,
} from "../lib/runtime-api";
import {
  EMPTY_SIDEBAR_FOOTER,
  buildSidebarModels,
  cacheHitRateFromRequest,
  formatRouterEndpointHost,
  resolveActiveRouterAlias,
  type SidebarFooterState,
} from "../lib/sidebar-footer";
import { useShellHeaderState } from "../lib/shell-header-context";
import { ThemeToggle } from "./theme-toggle";

function resolveSecondaryPath(
  pathname: string,
  section: RuntimeNavigationSection,
): string {
  const match = [...section.items]
    .sort((left, right) => right.to.length - left.to.length)
    .find(
      (item) =>
        pathname === item.to ||
        (item.to !== "/app" && pathname.startsWith(`${item.to}/`)),
    );
  return match?.to ?? section.items[0]?.to ?? "/app";
}

function isSecondaryNavPath(pathname: string, section: RuntimeNavigationSection): boolean {
  return section.items.some(
    (item) =>
      pathname === item.to ||
      (item.to !== "/app" && pathname.startsWith(`${item.to}/`)),
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const contentScrollRef = useRef<HTMLElement | null>(null);
  const { actions, override } = useShellHeaderState();
  const [footer, setFooter] = useState<SidebarFooterState>(EMPTY_SIDEBAR_FOOTER);
  const route = getRuntimeRouteDefinition(location.pathname) ?? getRuntimeRouteDefinition("/app");
  const activeSection =
    runtimeNavigationSections.find((section) => section.title === route?.section) ??
    runtimeNavigationSections[0];
  const title = override?.title ?? route?.title ?? "Runtime overview";
  const pathname = location.pathname;
  const hasSecondaryNavigation =
    activeSection.items.length > 1 && isSecondaryNavPath(pathname, activeSection);

  const navItems = useMemo(
    () =>
      runtimeNavigationSections.map((section) => ({
        id: section.title,
        label: section.title,
        active: route?.section === section.title,
        onSelect: () => navigate(section.hubTo ?? section.items[0]?.to ?? "/app"),
      })),
    [navigate, route?.section],
  );

  const secondaryOptions = useMemo(
    () =>
      activeSection.items.map((item) => ({
        value: item.to,
        label: item.label,
      })),
    [activeSection.items],
  );

  const secondaryValue = resolveSecondaryPath(pathname, activeSection);

  useEffect(() => {
    if (pathname) {
      contentScrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [pathname]);

  useEffect(() => {
    let disposed = false;

    const load = async () => {
      try {
        const [models, endpoints, dashboard, latestRequests, downstream, routerSummary, configRecord] =
          await Promise.all([
            fetchRuntimeModels(),
            fetchRuntimeEndpoints(),
            fetchTelemetryDashboard(),
            fetchTelemetryRequests({ limit: 1 }),
            fetchDownstreamOpenAIProviderConfig().catch(() => null),
            fetchRouterSummary().catch(() => null),
            fetchRuntimeConfig().catch(() => null),
          ]);
        if (disposed) {
          return;
        }
        setFooter({
          models: buildSidebarModels({
            models,
            endpoints,
            telemetryRows: dashboard.rows,
          }),
          cacheHitRate: cacheHitRateFromRequest(latestRequests[0] ?? dashboard.requests[0]),
          routerEndpoint: formatRouterEndpointHost(downstream),
          routerAlias: resolveActiveRouterAlias({
            config: configRecord?.config,
            summary: routerSummary,
          }),
        });
      } catch {
        if (!disposed) {
          setFooter((current) => current);
        }
      }
    };

    const dispose = startDeferredLiveRefresh({
      load: async () => {
        await load();
      },
      subscribe: (onEvent) =>
        subscribeTelemetryStream((event: RuntimeTelemetryStreamEvent) => {
          setFooter((current) => ({
            ...current,
            cacheHitRate: cacheHitRateFromRequest(event.request),
          }));
          onEvent();
        }),
    });

    return () => {
      disposed = true;
      dispose();
    };
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar {...footer} navItems={navItems} className="h-full shrink-0" />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-border px-4">
          <h1 className="min-w-0 truncate font-sans text-sm font-medium leading-5 tracking-tight text-foreground">
            {title}
          </h1>
          <div className="flex shrink-0 items-center gap-2">
            {actions}
            <ThemeToggle />
          </div>
        </header>
        {hasSecondaryNavigation ? (
          <div className="shrink-0 px-4 py-2">
            <SegmentedControl
              aria-label={`${activeSection.title} secondary navigation`}
              options={secondaryOptions}
              value={secondaryValue}
              onChange={(to) => navigate(to)}
            />
          </div>
        ) : null}
        <PageContent ref={contentScrollRef} className="runtime-shell-content-scroll">
          {children}
        </PageContent>
      </div>
    </div>
  );
}
