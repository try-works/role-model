import { PageContent, SegmentedControl, Sidebar, SubPageHeaderBar } from "@role-model/ui";
import { type ReactNode, startTransition, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";

import {
  type RuntimeNavigationSection,
  getRuntimeRouteDefinition,
  runtimeNavigationSections,
} from "../lib/design-system";
import { startDeferredLiveRefresh } from "../lib/live-refresh";
import {
  type RuntimeTelemetryStreamEvent,
  fetchDownstreamOpenAIProviderConfig,
  fetchRouterSummary,
  fetchRuntimeConfig,
  fetchRuntimeEndpoints,
  fetchRuntimeModels,
  fetchTelemetryDashboard,
  fetchTelemetryRequests,
  subscribeTelemetryStream,
} from "../lib/runtime-api";
import { useShellHeaderState } from "../lib/shell-header-context";
import {
  type SidebarFooterState,
  buildSidebarModels,
  cacheHitRateFromRequest,
  createEmptySidebarFooter,
  formatRouterEndpointHost,
  resolveActiveRouterAlias,
} from "../lib/sidebar-footer";
import {
  type RuntimeTheme,
  THEME_STORAGE_KEY,
  normalizeStoredTheme,
  resolveInitialTheme,
  syncDocumentTheme,
} from "../lib/theme";

function resolveSecondaryPath(pathname: string, section: RuntimeNavigationSection): string {
  const match = [...section.items]
    .sort((left, right) => right.to.length - left.to.length)
    .find(
      (item) => pathname === item.to || (item.to !== "/app" && pathname.startsWith(`${item.to}/`)),
    );
  return match?.to ?? section.items[0]?.to ?? "/app";
}

function isSecondaryNavPath(pathname: string, section: RuntimeNavigationSection): boolean {
  return section.items.some(
    (item) => pathname === item.to || (item.to !== "/app" && pathname.startsWith(`${item.to}/`)),
  );
}

function readResolvedTheme(): RuntimeTheme {
  const storedTheme = normalizeStoredTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
  return resolveInitialTheme({
    storedTheme,
    systemPrefersDark: window.matchMedia("(prefers-color-scheme: dark)").matches,
  });
}

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const contentScrollRef = useRef<HTMLElement | null>(null);
  const { actions, override } = useShellHeaderState();
  const [footer, setFooter] = useState<SidebarFooterState>(() => createEmptySidebarFooter());
  const [theme, setTheme] = useState<RuntimeTheme>("dark");
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
    const initialTheme = readResolvedTheme();
    setTheme(initialTheme);
    syncDocumentTheme(initialTheme);
  }, []);

  useEffect(() => {
    if (pathname) {
      contentScrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [pathname]);

  useEffect(() => {
    // pathname dep: refresh footer inventory after navigating from Models/Remote.
    void pathname;
    let disposed = false;

    const load = async () => {
      try {
        // Inventory (models/endpoints) must not be gated on telemetry — newly configured
        // models should appear in the sidebar even before any requests are routed.
        const [
          models,
          endpoints,
          dashboardResult,
          latestRequestsResult,
          downstream,
          routerSummary,
          configRecord,
        ] = await Promise.all([
          fetchRuntimeModels(),
          fetchRuntimeEndpoints(),
          fetchTelemetryDashboard().then(
            (dashboard) => ({ ok: true as const, dashboard }),
            () => ({ ok: false as const, dashboard: null }),
          ),
          fetchTelemetryRequests({ limit: 1 }).then(
            (requests) => ({ ok: true as const, requests }),
            () => ({ ok: false as const, requests: [] as const }),
          ),
          fetchDownstreamOpenAIProviderConfig().catch(() => null),
          fetchRouterSummary().catch(() => null),
          fetchRuntimeConfig().catch(() => null),
        ]);
        if (disposed) {
          return;
        }
        const telemetryRows = dashboardResult.dashboard?.rows ?? [];
        const latestRequest =
          latestRequestsResult.requests[0] ?? dashboardResult.dashboard?.requests[0];
        setFooter({
          models: buildSidebarModels({
            models,
            endpoints,
            telemetryRows,
          }),
          cacheHitRate: cacheHitRateFromRequest(latestRequest),
          routerEndpoint: formatRouterEndpointHost(downstream),
          routerAlias: resolveActiveRouterAlias({
            config: configRecord?.config,
            summary: routerSummary,
          }),
        });
      } catch {
        if (!disposed) {
          // Keep any previously loaded inventory; only repair the router host on first-load failure.
          setFooter((current) =>
            current.models.length > 0
              ? current
              : {
                  ...createEmptySidebarFooter(),
                  cacheHitRate: current.cacheHitRate,
                  routerAlias: current.routerAlias,
                },
          );
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

    // Poll inventory so Models/Remote configuration shows up without waiting for SSE traffic.
    const pollId = window.setInterval(() => {
      void load();
    }, 10_000);

    return () => {
      disposed = true;
      window.clearInterval(pollId);
      dispose();
    };
  }, [pathname]);

  function handleThemeChange(nextTheme: RuntimeTheme): void {
    startTransition(() => {
      setTheme(nextTheme);
    });
    syncDocumentTheme(nextTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  }

  return (
    <div
      data-slot="role-model-page-shell"
      className="flex h-screen w-full overflow-hidden bg-background text-foreground"
    >
      <Sidebar {...footer} navItems={navItems} className="h-full shrink-0" />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
        <SubPageHeaderBar title={title} theme={theme} onThemeChange={handleThemeChange}>
          {actions}
        </SubPageHeaderBar>
        <PageContent ref={contentScrollRef} className="runtime-shell-content-scroll">
          {hasSecondaryNavigation ? (
            <SegmentedControl
              aria-label={`${activeSection.title} secondary navigation`}
              options={secondaryOptions}
              // Match Overview PageFilters SegmentedControl text (14px / size md).
              size="md"
              value={secondaryValue}
              onChange={(to) => navigate(to)}
            />
          ) : null}
          {children}
        </PageContent>
      </div>
    </div>
  );
}
