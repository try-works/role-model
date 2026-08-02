import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { type ReactElement, createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RouterProvider, createMemoryRouter } from "react-router";
import { describe, expect, test } from "vitest";

import ControlRolesRoute from "../routes/control-roles";
import ControlRoutingStrategyRoute from "../routes/control-routing-strategy";
import ControlRuntimeConfigRoute from "../routes/control-runtime-config";
import IntegrationsUpstreamRoute from "../routes/integrations-upstream";
import RouterOverviewRoute from "../routes/router";
import RouterCandidatesRoute from "../routes/router-candidates";
import RouterDecisionDetailRoute from "../routes/router-decision-detail";
import RouterDecisionsRoute from "../routes/router-decisions";
import StudioAdvancedRoute from "../routes/studio-advanced";
import StudioAudioRoute from "../routes/studio-audio";
import StudioImagesRoute from "../routes/studio-images";
import StudioRerankRoute from "../routes/studio-rerank";
import SystemPeersRoute from "../routes/system-peers";
import {
  chartHorizontalRankingLegend,
  codeBlockClassName,
  getRuntimeRouteDefinition,
  resolveTelemetryChartLayout,
  runtimeNavigationSections,
  runtimeTheme,
  shellQuickLinks,
  telemetryChartLayoutContract,
  telemetryChartStates,
} from "./design-system";
import { ShellHeaderProvider } from "./shell-header-context";

function renderRoute(pathname: string, element: ReactElement): string {
  const wrapped = createElement(ShellHeaderProvider, null, element);
  const router = createMemoryRouter([{ path: pathname, element: wrapped }], {
    initialEntries: [pathname],
  });
  return renderToStaticMarkup(createElement(RouterProvider, { router }));
}

/** Match JSX text nodes that Biome may split across lines (`>Overall<` vs `>\n  Overall\n<`). */
function expectJsxText(source: string, text: string): void {
  expect(source).toMatch(new RegExp(`>\\s*${text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*<`));
}

const appCss = readFileSync(new URL("../app.css", import.meta.url), "utf8");
const rm3TokensCss = readFileSync(new URL("../rm3-tokens.css", import.meta.url), "utf8");
const rootAppCss = appCss.slice(0, appCss.indexOf('html[data-theme="light"]'));
const lightAppCss = `${rootAppCss}\n${appCss.slice(
  appCss.indexOf('html[data-theme="light"]'),
  appCss.indexOf('html[data-theme="dark"]'),
)}`;
const darkAppCss = `${rootAppCss}\n${appCss.slice(appCss.indexOf('html[data-theme="dark"]'))}`;
const appShellSource = readFileSync(
  new URL("../components/app-shell.tsx", import.meta.url),
  "utf8",
);
const themeToggleSource = readFileSync(
  new URL("../components/theme-toggle.tsx", import.meta.url),
  "utf8",
);
const telemetryChartsSource = readFileSync(
  new URL("../components/telemetry-charts.tsx", import.meta.url),
  "utf8",
);
const overviewChartBlockSource = readFileSync(
  new URL("../components/overview-chart-block.tsx", import.meta.url),
  "utf8",
);
const observeChartBlockSource = readFileSync(
  new URL("../components/observe-chart-block.tsx", import.meta.url),
  "utf8",
);
const chartKitStatePanelSource = readFileSync(
  new URL("../components/chart-kit-state-panel.tsx", import.meta.url),
  "utf8",
);
const telemetryControlsSource = readFileSync(
  new URL("../components/telemetry-controls.tsx", import.meta.url),
  "utf8",
);
const themedSelectSource = readFileSync(
  new URL("../components/themed-select.tsx", import.meta.url),
  "utf8",
);
const pagePrimitivesSource = readFileSync(
  new URL("../components/page-primitives.tsx", import.meta.url),
  "utf8",
);
const controlControllerSource = readFileSync(
  new URL("../routes/control-controller.tsx", import.meta.url),
  "utf8",
);
const controlRuntimeConfigSource = readFileSync(
  new URL("../routes/control-runtime-config.tsx", import.meta.url),
  "utf8",
);
const controlRoutingStrategySource = readFileSync(
  new URL("../routes/control-routing-strategy.tsx", import.meta.url),
  "utf8",
);
const controlBenchmarkSource = readFileSync(
  new URL("../routes/control-benchmark.tsx", import.meta.url),
  "utf8",
);
const controlRolesSource = readFileSync(
  new URL("../routes/control-roles.tsx", import.meta.url),
  "utf8",
);
const roleTaskHierarchySource = readFileSync(
  new URL("./role-task-hierarchy.tsx", import.meta.url),
  "utf8",
);
const routingModeSource = readFileSync(new URL("./routing-mode.ts", import.meta.url), "utf8");
const controlModelsSource = readFileSync(
  new URL("../routes/control-models.tsx", import.meta.url),
  "utf8",
);
const localPeerModelsSource = readFileSync(
  new URL("../routes/local-peer-models.tsx", import.meta.url),
  "utf8",
);

function extractCssVariableValue(source: string, variableName: string): string {
  const escapedVariableName = variableName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(new RegExp(`${escapedVariableName}:\\s*([^;]+);`));
  if (!match?.[1]) {
    throw new Error(`Missing CSS variable ${variableName}`);
  }
  return match[1].trim();
}
const localLlamaSwapModelsSource = readFileSync(
  new URL("../routes/local-llama-swap-models.tsx", import.meta.url),
  "utf8",
);
const localMatrixSource = readFileSync(
  new URL("../routes/local-matrix.tsx", import.meta.url),
  "utf8",
);
const localPolicySource = readFileSync(
  new URL("../routes/local-policy.tsx", import.meta.url),
  "utf8",
);
const localSwapSource = readFileSync(new URL("../routes/local-swap.tsx", import.meta.url), "utf8");
const localLogsSource = readFileSync(new URL("../routes/local-logs.tsx", import.meta.url), "utf8");
const localPeersSource = readFileSync(
  new URL("../routes/local-peers.tsx", import.meta.url),
  "utf8",
);
const localChooseSource = readFileSync(
  new URL("../routes/local-choose.tsx", import.meta.url),
  "utf8",
);
const observeLogsSource = readFileSync(
  new URL("../routes/observe-logs.tsx", import.meta.url),
  "utf8",
);
const endpointsRouteSource = readFileSync(
  new URL("../routes/endpoints.tsx", import.meta.url),
  "utf8",
);
const integrationsDownstreamRouteSource = readFileSync(
  new URL("../routes/integrations-downstream.tsx", import.meta.url),
  "utf8",
);
const integrationsUpstreamRouteSource = readFileSync(
  new URL("../routes/integrations-upstream.tsx", import.meta.url),
  "utf8",
);
const providersRouteSource = readFileSync(
  new URL("../routes/providers.tsx", import.meta.url),
  "utf8",
);
const requestsRouteSource = readFileSync(
  new URL("../routes/requests.tsx", import.meta.url),
  "utf8",
);
const observeRoutingRouteSource = readFileSync(
  new URL("../routes/observe-routing.tsx", import.meta.url),
  "utf8",
);
const rootSource = readFileSync(new URL("../root.tsx", import.meta.url), "utf8");
const runtimeRouteSource = readFileSync(new URL("../routes/runtime.tsx", import.meta.url), "utf8");
const requestDetailRouteSource = readFileSync(
  new URL("../routes/request-detail.tsx", import.meta.url),
  "utf8",
);
const sessionReadinessRouteSource = readFileSync(
  new URL("../routes/session-readiness.tsx", import.meta.url),
  "utf8",
);
const systemPeersRouteSource = readFileSync(
  new URL("../routes/system-peers.tsx", import.meta.url),
  "utf8",
);
const routerCandidatesRouteSource = readFileSync(
  new URL("../routes/router-candidates.tsx", import.meta.url),
  "utf8",
);
const routerDecisionDetailRouteSource = readFileSync(
  new URL("../routes/router-decision-detail.tsx", import.meta.url),
  "utf8",
);
const routerDecisionsRouteSource = readFileSync(
  new URL("../routes/router-decisions.tsx", import.meta.url),
  "utf8",
);
const routerRouteSource = readFileSync(new URL("../routes/router.tsx", import.meta.url), "utf8");
const studioAdvancedRouteSource = readFileSync(
  new URL("../routes/studio-advanced.tsx", import.meta.url),
  "utf8",
);
const studioAudioRouteSource = readFileSync(
  new URL("../routes/studio-audio.tsx", import.meta.url),
  "utf8",
);
const studioImagesRouteSource = readFileSync(
  new URL("../routes/studio-images.tsx", import.meta.url),
  "utf8",
);
const studioRerankRouteSource = readFileSync(
  new URL("../routes/studio-rerank.tsx", import.meta.url),
  "utf8",
);
const workbenchRouteSource = readFileSync(
  new URL("../routes/workbench.tsx", import.meta.url),
  "utf8",
);
const designSystemDocSource = readFileSync(
  new URL("../../DESIGN_SYSTEM.md", import.meta.url),
  "utf8",
);
const appleReferenceDocSource = readFileSync(
  new URL("../../DESIGN_APPLE_REFERENCE.md", import.meta.url),
  "utf8",
);
const designSystemSource = readFileSync(new URL("./design-system.ts", import.meta.url), "utf8");
const dashboardRouteSource = readFileSync(
  new URL("../routes/dashboard.tsx", import.meta.url),
  "utf8",
);
const candidateSpaceChartSource = readFileSync(
  new URL("../components/candidate-space-chart.tsx", import.meta.url),
  "utf8",
);
const observeActivityRouteSource = readFileSync(
  new URL("../routes/observe-activity.tsx", import.meta.url),
  "utf8",
);
const appLayoutSource = readFileSync(new URL("../routes/app-layout.tsx", import.meta.url), "utf8");
const shellHeaderContextSource = readFileSync(
  new URL("./shell-header-context.tsx", import.meta.url),
  "utf8",
);
const routesSource = readFileSync(new URL("../routes.ts", import.meta.url), "utf8");
const legacyRedirectSource = readFileSync(
  new URL("../routes/legacy-redirect.tsx", import.meta.url),
  "utf8",
);
const routesDir = path.dirname(fileURLToPath(new URL("../routes", import.meta.url)));
const routeSources = readdirSync(routesDir)
  .filter((name) => name.endsWith(".tsx"))
  .map((name) => readFileSync(path.join(routesDir, name), "utf8"));
const componentSourcesDir = path.dirname(fileURLToPath(new URL("../components", import.meta.url)));
const productionUiSources = [
  ...readdirSync(routesDir)
    .filter((name) => name.endsWith(".tsx"))
    .map((name) => ({
      path: `app/routes/${name}`,
      source: readFileSync(path.join(routesDir, name), "utf8"),
    })),
  ...readdirSync(componentSourcesDir)
    .filter((name) => name.endsWith(".tsx"))
    .map((name) => ({
      path: `app/components/${name}`,
      source: readFileSync(path.join(componentSourcesDir, name), "utf8"),
    })),
  {
    path: "app/lib/design-system.ts",
    source: designSystemSource,
  },
];

function findSourceViolations(pattern: RegExp): string[] {
  return productionUiSources.flatMap(({ path: sourcePath, source }) =>
    source
      .split("\n")
      .map((line, index) => ({ line, lineNumber: index + 1 }))
      .filter(({ line }) => line.match(pattern))
      .map(({ line, lineNumber }) => `${sourcePath}:${lineNumber}: ${line.trim()}`),
  );
}

function findExactSourceViolations(term: string): string[] {
  return productionUiSources.flatMap(({ path: sourcePath, source }) =>
    source
      .split("\n")
      .map((line, index) => ({ line, lineNumber: index + 1 }))
      .filter(({ line }) => line.includes(term))
      .map(({ line, lineNumber }) => `${sourcePath}:${lineNumber}: ${line.trim()}`),
  );
}

const nativeSelectAuditSources = [
  { path: "app/routes/control-benchmark.tsx", source: controlBenchmarkSource },
  { path: "app/routes/control-roles.tsx", source: controlRolesSource },
  { path: "app/routes/control-routing-strategy.tsx", source: controlRoutingStrategySource },
  { path: "app/routes/studio-advanced.tsx", source: studioAdvancedRouteSource },
  { path: "app/routes/studio-audio.tsx", source: studioAudioRouteSource },
  { path: "app/routes/studio-images.tsx", source: studioImagesRouteSource },
  { path: "app/routes/studio-rerank.tsx", source: studioRerankRouteSource },
  { path: "app/routes/workbench.tsx", source: workbenchRouteSource },
];

function findNativeSelectViolations(): string[] {
  return nativeSelectAuditSources.flatMap(({ path: sourcePath, source }) =>
    source
      .split("\n")
      .map((line, index) => ({ line, lineNumber: index + 1 }))
      .filter(({ line }) => line.includes("<select"))
      .map(({ line, lineNumber }) => `${sourcePath}:${lineNumber}: ${line.trim()}`),
  );
}

describe("runtime design system", () => {
  test("defines navigation groups and layout templates for every runtime route", () => {
    expect(
      runtimeNavigationSections.map((section) => ({
        title: section.title,
        routes: section.items.map((item) => item.to),
      })),
    ).toEqual([
      {
        title: "Overview",
        routes: ["/app"],
      },
      {
        title: "Studio",
        routes: [
          "/app/studio/chat",
          "/app/studio/images",
          "/app/studio/audio",
          "/app/studio/rerank",
          "/app/studio/advanced",
        ],
      },
      {
        title: "Local",
        routes: [
          "/app/local/endpoints",
          "/app/local/peer-models",
          "/app/local/llama-swap/models",
          "/app/local/llama-swap/swap",
          "/app/local/llama-swap/policy",
          "/app/local/llama-swap/logs",
          "/app/local/llama-swap/matrix",
        ],
      },
      {
        title: "Remote",
        routes: ["/app/remote/providers"],
      },
      {
        title: "Models",
        routes: ["/app/models", "/app/models/roles", "/app/models/benchmark"],
      },
      {
        title: "Router",
        routes: [
          "/app/router",
          "/app/router/strategy",
          "/app/router/controller",
          "/app/router/candidates",
          "/app/router/decisions",
        ],
      },
      {
        title: "Observe",
        routes: [
          "/app/observe/requests",
          "/app/observe/routing",
          "/app/observe/activity",
          "/app/observe/logs",
        ],
      },
      {
        title: "Connect",
        routes: ["/app/connect", "/app/connect/downstream", "/app/connect/upstream"],
      },
      {
        title: "System",
        routes: [
          "/app/system/session-readiness",
          "/app/system/runtime",
          "/app/system/runtime-config",
          "/app/system/peers",
          "/app/system/extensions",
          "/app/system/storage-retention",
        ],
      },
    ]);

    expect(getRuntimeRouteDefinition("/app")).toEqual(
      expect.objectContaining({
        id: "overview-summary",
        template: "summary-board",
        title: "Runtime overview",
        description:
          "Current runtime state, endpoint inventory, controller posture, and recent request flow with a separate recent telemetry window.",
      }),
    );
    expect(getRuntimeRouteDefinition("/app/models")).toEqual(
      expect.objectContaining({
        id: "models-inventory",
        template: "model-inventory",
      }),
    );
    expect(getRuntimeRouteDefinition("/app/models/roles")).toEqual(
      expect.objectContaining({
        id: "models-roles",
        template: "registry-detail",
      }),
    );
    expect(getRuntimeRouteDefinition("/app/models/benchmark")).toEqual(
      expect.objectContaining({
        id: "models-benchmark",
        section: "Models",
        template: "registry-detail",
      }),
    );
    expect(getRuntimeRouteDefinition("/app/local/peer-models")).toEqual(
      expect.objectContaining({
        id: "local-peer-models",
        title: "Peer models",
      }),
    );
    expect(getRuntimeRouteDefinition("/app/local/llama-swap/models")).toEqual(
      expect.objectContaining({
        id: "local-llama-swap-models",
        title: "Llama-swap models",
      }),
    );
    expect(getRuntimeRouteDefinition("/app/local/endpoints")).toEqual(
      expect.objectContaining({
        id: "local-endpoints",
        label: "Endpoints",
        title: "Local endpoints",
      }),
    );
    expect(getRuntimeRouteDefinition("/app/system/runtime-config")).toEqual(
      expect.objectContaining({
        id: "system-runtime-config",
        template: "registry-detail",
      }),
    );
    expect(getRuntimeRouteDefinition("/app/router/strategy")).toEqual(
      expect.objectContaining({
        id: "router-strategy",
        template: "registry-detail",
      }),
    );
    expect(getRuntimeRouteDefinition("/app/router/controller")).toEqual(
      expect.objectContaining({
        id: "router-controller",
        template: "registry-detail",
      }),
    );
    expect(getRuntimeRouteDefinition("/app/router")).toEqual(
      expect.objectContaining({
        id: "router-overview",
        template: "registry-detail",
      }),
    );
    expect(getRuntimeRouteDefinition("/app/router/decisions/req-runtime-bridge-route-001")).toEqual(
      expect.objectContaining({
        id: "router-decision-detail",
        template: "ledger-inspector",
      }),
    );
    expect(getRuntimeRouteDefinition("/app/observe/requests/req-runtime-bridge-route-001")).toEqual(
      expect.objectContaining({
        id: "observe-request-detail",
        template: "ledger-inspector",
      }),
    );
    expect(getRuntimeRouteDefinition("/app/system/runtime")).toEqual(
      expect.objectContaining({
        id: "system-runtime",
        template: "system-topology",
      }),
    );
    expect(getRuntimeRouteDefinition("/app/system/session-readiness")).toEqual(
      expect.objectContaining({
        id: "system-session-readiness",
        template: "system-topology",
        title: "Session readiness",
      }),
    );
    expect(getRuntimeRouteDefinition("/app/connect")).toEqual(
      expect.objectContaining({
        id: "connect-registry",
        label: "Registry",
        section: "Connect",
        title: "Available models & endpoints",
      }),
    );
    expect(getRuntimeRouteDefinition("/app/connect/downstream")).toEqual(
      expect.objectContaining({
        id: "connect-downstream",
        section: "Connect",
        title: "Connect your application",
      }),
    );
    expect(getRuntimeRouteDefinition("/app/endpoints")).toEqual(
      expect.objectContaining({
        id: "connect-registry",
        section: "Connect",
      }),
    );
    expect(getRuntimeRouteDefinition("/app/endpoints/downstream")).toEqual(
      expect.objectContaining({
        id: "connect-downstream",
      }),
    );
    expect(getRuntimeRouteDefinition("/app/observe")).toEqual(
      expect.objectContaining({
        id: "observe-requests",
        section: "Observe",
        title: "Telemetry request ledger",
      }),
    );
    expect(getRuntimeRouteDefinition("/app/observe/logs")).toEqual(
      expect.objectContaining({
        id: "observe-logs",
        title: "Host logs",
      }),
    );
    expect(getRuntimeRouteDefinition("/app/observe/routing")).toEqual(
      expect.objectContaining({
        id: "observe-routing",
        section: "Observe",
        template: "ledger-inspector",
      }),
    );
  });

  test("uses analytics charts as the primary Observe entry point", () => {
    const observeSection = runtimeNavigationSections.find((section) => section.title === "Observe");

    expect(observeSection?.items[0]?.to).toBe("/app/observe/requests");
    expect(observeSection?.items[1]?.to).toBe("/app/observe/routing");
    expect(observeSection?.items.map((item) => item.to)).toContain("/app/observe/activity");
    expect(observeSection?.items.map((item) => item.to)).toContain("/app/observe/logs");
  });

  test("keeps the shell on the RM3 baseline with explicit chart tokens", () => {
    expect(runtimeTheme.maxContentWidth).toBe("1216px");
    expect(runtimeTheme.radii.sm).toBe("5px");
    expect(runtimeTheme.radii.md).toBe("6px");
    expect(runtimeTheme.radii.lg).toBe("8px");
    expect(runtimeTheme.radii.pill).toBe("9999px");
    expect(runtimeTheme.radii.shell).toBe("0px");
    expect(runtimeTheme.radii.panel).toBe("8px");
    expect(runtimeTheme.radii.field).toBe("6px");
    expect(runtimeTheme.radii.badge).toBe("9999px");
    expect(runtimeTheme.colors.light).toEqual({
      bg: "#FFFFFF",
      panelMuted: "#FAFAFA",
      surface: "#FFFFFF",
      surfaceStrong: "#FFFFFF",
      panel: "#FAFAFA",
      fg: "#111111",
      secondary: "#666666",
      muted: "#888888",
      border: "#EAEAEA",
      borderStrong: "#D4D4D4",
      accent: "#0A0A0A",
      accentInk: "#0A0A0A",
      accentFocus: "#888888",
      accentOnDark: "#FFFFFF",
      accentMuted: "rgba(10, 10, 10, 0.72)",
      accentSubtle: "rgba(10, 10, 10, 0.08)",
      accentGhost: "rgba(10, 10, 10, 0.04)",
      dividerSoft: "#EAEAEA",
      hairline: "#EAEAEA",
      chipTranslucent: "rgba(17, 17, 17, 0.06)",
      onPrimary: "#FFFFFF",
      telemetryLocal: "#111111",
      telemetryRemote: "#666666",
      telemetryHealthy: "#166534",
      telemetryDegraded: "#B67A11",
      telemetryRaw: "#666666",
      error: "#B4261A",
      errorMuted: "rgba(180, 38, 26, 0.76)",
      errorSubtle: "rgba(180, 38, 26, 0.14)",
      errorGhost: "rgba(180, 38, 26, 0.10)",
      success: "#166534",
      successMuted: "rgba(22, 101, 52, 0.76)",
      successSubtle: "rgba(22, 101, 52, 0.10)",
      warning: "#B67A11",
      warningMuted: "rgba(182, 122, 17, 0.78)",
      warningSubtle: "rgba(182, 122, 17, 0.14)",
      info: "#666666",
      advisory: "#888888",
    });
    expect(runtimeTheme.colors.dark).toEqual({
      bg: "#0A0A0A",
      surface: "#0F0F0F",
      surfaceStrong: "#141414",
      panel: "#141414",
      panelMuted: "#141414",
      fg: "#EDEDED",
      secondary: "#9A9A9A",
      muted: "#9A9A9A",
      border: "#1F1F1F",
      borderStrong: "#333333",
      accent: "#FFFFFF",
      accentInk: "#EDEDED",
      accentFocus: "#777777",
      accentOnDark: "#FFFFFF",
      accentMuted: "rgba(237, 237, 237, 0.72)",
      accentSubtle: "rgba(255, 255, 255, 0.08)",
      accentGhost: "rgba(255, 255, 255, 0.04)",
      dividerSoft: "rgba(237, 237, 237, 0.08)",
      hairline: "#1F1F1F",
      chipTranslucent: "rgba(237, 237, 237, 0.08)",
      onPrimary: "#0A0A0A",
      telemetryLocal: "#EDEDED",
      telemetryRemote: "#9A9A9A",
      telemetryHealthy: "#159D5A",
      telemetryDegraded: "#D9A441",
      telemetryRaw: "#9A9A9A",
      error: "#E0726A",
      errorMuted: "rgba(224, 114, 106, 0.82)",
      errorSubtle: "rgba(224, 114, 106, 0.20)",
      errorGhost: "rgba(224, 114, 106, 0.10)",
      success: "#159D5A",
      successMuted: "rgba(21, 157, 90, 0.82)",
      successSubtle: "rgba(21, 157, 90, 0.14)",
      warning: "#D9A441",
      warningMuted: "rgba(217, 164, 65, 0.82)",
      warningSubtle: "rgba(217, 164, 65, 0.12)",
      info: "#9A9A9A",
      advisory: "#9A9A9A",
    });
    expect(designSystemSource).toContain("chartColors");
    expect(designSystemSource).toContain('"observe-routing"');
    expect(appCss).toContain("--rm-chart-local:");

    expect(appCss).toContain("--rm-chart-remote:");
    expect(appCss).toContain("--rm-chart-ink: #171717;");
    expect(appCss).toContain("--rm-chart-cyan: var(--rm3-black-200);");
    expect(appCss).toContain("--rm-chart-highlight-pink: var(--rm3-chart-pink);");
    expect(appCss).toContain("--rm-chart-violet: var(--rm3-chart-violet);");
    expect(appCss).toContain("--rm-chart-link-blue: var(--rm3-chart-blue);");
    expect(appCss).toContain("--rm-chart-warning-soft: var(--rm3-di-serria-50);");
  });

  test("chart tokens used together resolve to distinct visual colors in each theme", () => {
    const tokenUsageSeries = ["--rm-chart-link-blue", "--rm-chart-cyan", "--rm-chart-tokens"];
    const costSeries = ["--rm-chart-cost", "--rm-chart-link-blue", "--rm-chart-cyan"];
    const avoidedCostSeries = ["--rm-chart-violet", "--rm-chart-link-blue", "--rm-chart-cyan"];
    const cacheSeries = ["--rm-chart-cache-hit", "--rm-chart-cache-rate"];

    for (const source of [lightAppCss, darkAppCss]) {
      for (const series of [tokenUsageSeries, costSeries, avoidedCostSeries, cacheSeries]) {
        const values = series.map((variableName) => extractCssVariableValue(source, variableName));
        expect(new Set(values).size).toBe(values.length);
      }
    }
  });

  test("global shell chrome keeps legacy vendor ui out of the main runtime contract", () => {
    expect(shellQuickLinks.map((link) => link.href)).not.toContain("/ui");
    expect(appShellSource).not.toContain('href="/ui"');
    expect(renderRoute("/app/studio/images", createElement(StudioImagesRoute))).not.toContain(
      "Open preserved UI",
    );
    expect(renderRoute("/app/studio/audio", createElement(StudioAudioRoute))).not.toContain(
      "Open preserved UI",
    );
    expect(renderRoute("/app/studio/rerank", createElement(StudioRerankRoute))).not.toContain(
      "Open preserved UI",
    );
    expect(renderRoute("/app/studio/advanced", createElement(StudioAdvancedRoute))).not.toContain(
      "Open preserved UI",
    );
    expect(
      renderRoute("/app/connect/upstream", createElement(IntegrationsUpstreamRoute)),
    ).not.toContain("Open preserved UI");
    expect(renderRoute("/app/system/peers", createElement(SystemPeersRoute))).not.toContain(
      "Open raw health",
    );
  });

  test("studio implementation targets render repo-owned workspace sections instead of placeholder blueprints", () => {
    const imagesMarkup = renderRoute("/app/studio/images", createElement(StudioImagesRoute));
    expect(imagesMarkup).toContain("Image request modes");
    expect(imagesMarkup).toContain("Image result stage");
    expect(imagesMarkup).toContain("Raw response");
    expect(imagesMarkup).not.toContain("Open preserved UI");

    const audioMarkup = renderRoute("/app/studio/audio", createElement(StudioAudioRoute));
    expect(audioMarkup).toContain("Audio mode and request");
    expect(audioMarkup).toContain("Audio result stage");
    expect(audioMarkup).toContain("Voice inventory");
    expect(audioMarkup).not.toContain("Open preserved UI");

    const rerankMarkup = renderRoute("/app/studio/rerank", createElement(StudioRerankRoute));
    expect(rerankMarkup).toContain("Rerank request");
    expect(rerankMarkup).toContain("Ranked results");
    expect(rerankMarkup).toContain("Contract details");
    expect(rerankMarkup).not.toContain("Open preserved UI");

    const advancedMarkup = renderRoute("/app/studio/advanced", createElement(StudioAdvancedRoute));
    expect(advancedMarkup).toContain("Endpoint family");
    expect(advancedMarkup).toContain("Response workspace");
    expect(advancedMarkup).toContain("Request template");
    expect(advancedMarkup).not.toContain("Open preserved UI");
  });

  test("studio workspace routes use shared form-label and payload typography tokens", () => {
    for (const source of [
      workbenchRouteSource,
      studioImagesRouteSource,
      studioAudioRouteSource,
      studioRerankRouteSource,
      studioAdvancedRouteSource,
    ]) {
      expect(source).not.toContain('className="grid gap-2 text-sm"');
      expect(source).not.toContain('className="font-semibold text-[var(--rm-fg)]"');
    }

    expect(studioImagesRouteSource).not.toContain('CodeBlock className="min-h-60 text-sm"');
    expect(studioAudioRouteSource).not.toContain('CodeBlock className="min-h-44 text-sm"');
    expect(studioRerankRouteSource).not.toContain('CodeBlock className="min-h-60 text-sm"');
    expect(studioAdvancedRouteSource).not.toContain('CodeBlock className="min-h-72 text-sm"');
    expect(studioAdvancedRouteSource).not.toContain('CodeBlock className="min-h-52 text-sm"');
    expect(workbenchRouteSource).not.toContain('CodeBlock className="min-h-72 text-sm"');
    expect(workbenchRouteSource).not.toContain("${utilityLabelClassName} text-[var(--rm-fg)]");
    expect(studioImagesRouteSource).not.toContain("${utilityLabelClassName} text-[var(--rm-fg)]");
    expect(studioAudioRouteSource).not.toContain("${utilityLabelClassName} text-[var(--rm-fg)]");
    expect(studioRerankRouteSource).not.toContain("${utilityLabelClassName} text-[var(--rm-fg)]");
    expect(studioAdvancedRouteSource).not.toContain("${utilityLabelClassName} text-[var(--rm-fg)]");
    expect(workbenchRouteSource).not.toContain("${bodyTextClassName} text-[var(--rm-fg)]");
    expect(studioAudioRouteSource).not.toContain("${bodyTextClassName} text-[var(--rm-fg)]");
  });

  test("integration and system implementation targets render live upstream and peer surfaces", () => {
    const upstreamMarkup = renderRoute(
      "/app/endpoints/upstream",
      createElement(IntegrationsUpstreamRoute),
    );
    expect(upstreamMarkup).toContain("Upstream target inventory");
    expect(upstreamMarkup).toContain("Provider accounts in scope");
    expect(upstreamMarkup).toContain("Boundary guidance");
    expect(integrationsUpstreamRouteSource).toContain("/upstream/");
    expect(upstreamMarkup).not.toContain("Boundary notes");
    expect(upstreamMarkup).not.toContain("When to use `/upstream/`");
    expect(upstreamMarkup).not.toContain("Open preserved UI");
    expect(integrationsDownstreamRouteSource).toContain("Connection contract");
    expect(integrationsDownstreamRouteSource).toContain("Consumer setup");
    expect(integrationsDownstreamRouteSource).toContain(
      "OpenAI-compatible base URLs, endpoints, and auth header",
    );
    expect(integrationsDownstreamRouteSource).not.toContain("Compatibility posture");
    expect(integrationsDownstreamRouteSource).not.toContain("API family");
    expect(integrationsDownstreamRouteSource).toContain(
      "xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]",
    );
    expect(integrationsDownstreamRouteSource).toContain("min-w-0 space-y-4");
    expect(integrationsDownstreamRouteSource).toContain("max-w-full");
    expect(codeBlockClassName).toContain("max-w-full");
    expect(codeBlockClassName).toContain("whitespace-pre-wrap");
    expect(codeBlockClassName).toContain("[overflow-wrap:anywhere]");

    const peersMarkup = renderRoute("/app/system/peers", createElement(SystemPeersRoute));
    expect(peersMarkup).toContain("Peer inventory");
    expect(peersMarkup).toContain("Contract fields");
    expect(peersMarkup).not.toContain("Runtime policy boundary");
    expect(peersMarkup).not.toContain("Groups and matrix");
    expect(peersMarkup).not.toContain("Empty-state rule");
    expect(peersMarkup).not.toContain("Raw diagnostics");
    expect(peersMarkup).not.toContain("Open raw health");
  });

  test("router implementation targets render repo-owned routing explanation surfaces", () => {
    expect(getRuntimeRouteDefinition("/app/router")?.title).toBe("Routing overview");
    expect(getRuntimeRouteDefinition("/app/local/llama-swap/matrix")?.title).toBe(
      "Llama-swap matrix",
    );
    expect(getRuntimeRouteDefinition("/app/router/candidates")?.title).toBe("Candidate inventory");
    expect(getRuntimeRouteDefinition("/app/router/decisions")?.title).toBe("Routing decisions");
    expect(
      getRuntimeRouteDefinition("/app/router/decisions/req-runtime-bridge-route-001")?.title,
    ).toBe("Routing decision detail");
    expect(routerRouteSource).toContain("Alias inventory");
    expect(routerCandidatesRouteSource).toContain("Loading routing candidates");
  });

  test("router, connect registry, and remote surfaces expose alias/readiness ownership instead of generic filler", () => {
    expect(routerRouteSource).toContain("Alias inventory");
    expect(routerRouteSource).not.toContain("Execution-ready aliases");
    expect(routerRouteSource).not.toContain("Guidance provenance");
    expect(routerRouteSource).not.toContain("Policy inputs");
    expect(routerRouteSource).toContain("Effective models");
    expect(routerRouteSource).toContain("Candidate expansion");
    expect(routerRouteSource).not.toContain("Allowed endpoints");
    expect(routerRouteSource).not.toContain("Control remains the editing surface");
    expect(endpointsRouteSource).not.toContain("Alias readiness");
    expect(endpointsRouteSource).not.toContain("Alias coverage");
    expect(endpointsRouteSource).not.toContain("View alias posture");
    expect(endpointsRouteSource).toContain("Runtime connections");
    expect(endpointsRouteSource).not.toContain("MetricStrip");
    expect(endpointsRouteSource).not.toContain("Provider onboarding pending");
    expect(endpointsRouteSource).not.toContain('title="Configured providers"');
    expect(endpointsRouteSource).not.toContain('title="Runtime endpoint rows"');
    expect(providersRouteSource).toContain("LiteLLM");
    expect(providersRouteSource).not.toContain("Models.dev metadata");
    expect(providersRouteSource).not.toContain("View in Connect registry");
    expect(providersRouteSource).not.toContain("Catalog models:");
    expect(providersRouteSource).not.toContain("Model roles");
    expect(providersRouteSource).toContain("${effectiveRoleIds.length} roles");
    expect(providersRouteSource).not.toContain("routing eligible");
    expect(providersRouteSource).not.toContain("benchmark eligible");
    expect(providersRouteSource).not.toContain('providerKind === "local-engine"');
  });

  test("providers surface omits saved-provider maintenance and archived diagnostics", () => {
    expect(designSystemDocSource).not.toContain("repairing saved accounts in place");
    expect(providersRouteSource).not.toContain("Saved provider maintenance");
    expect(providersRouteSource).not.toContain("provider-maintenance-");
    expect(providersRouteSource).not.toContain("buildProviderMaintenanceRows");
    expect(providersRouteSource).not.toContain("buildArchivedArtifactRows");
    expect(providersRouteSource).not.toContain("Archived stale diagnostics");
    expect(providersRouteSource).not.toContain("onReconnectAccount");
    expect(providersRouteSource).not.toContain("updateRuntimeAccountApiKey");
  });

  test("runtime, session readiness, workbench, and advanced surfaces use canonical lifecycle diagnostics", () => {
    expect(designSystemDocSource).toContain(
      "Provisional-vs-authoritative bootstrap posture must read consistently across these surfaces.",
    );
    expect(runtimeRouteSource).toContain("buildCredentialLifecycleBanner");
    expect(sessionReadinessRouteSource).toContain("buildCredentialLifecycleBanner");
    expect(sessionReadinessRouteSource).toContain("buildCredentialLifecycleAccountRows");
    expect(sessionReadinessRouteSource).toContain("Canonical lifecycle");
    expect(sessionReadinessRouteSource).not.toContain("Archived stale diagnostics");
    expect(sessionReadinessRouteSource).not.toContain("buildArchivedArtifactRows");
    expect(sessionReadinessRouteSource).not.toContain("Related surfaces");
    expect(sessionReadinessRouteSource).not.toContain("Runtime topology");
    expect(sessionReadinessRouteSource).not.toContain("Remote providers");
    expect(workbenchRouteSource).not.toContain("buildCredentialLifecycleBanner");
    expect(studioAdvancedRouteSource).not.toContain("buildCredentialLifecycleBanner");
    expect(studioAdvancedRouteSource).not.toContain("Execution readiness");
  });

  test("router routes preserve empty-state and observe-link affordances", () => {
    expect(routerRouteSource).toContain("LoadingState");
    expect(routerCandidatesRouteSource).toContain("EmptyState");
    expect(routerDecisionsRouteSource).toContain("/app/router/decisions/");
    expect(routerDecisionDetailRouteSource).toContain("/app/observe/requests/");
  });

  test("merged router overview stays observational while routing strategy owns editing controls", () => {
    expect(routerRouteSource).not.toContain("updateRuntimeConfig");
    expect(routerRouteSource).not.toContain("Save and apply strategy");
    expect(routerRouteSource).not.toContain("Guidance provenance");
    expect(routerRouteSource).not.toContain("Policy inputs");
    expect(routerRouteSource).not.toContain("/app/router/strategy");
    expect(routerRouteSource).not.toContain("configuredAliasRows.slice(0, 3)");
    expect(routerRouteSource).toContain("selectOverviewRouterCandidates(candidates)");
    expect(routingModeSource).toContain("Strategy A - Baseline");
    expect(controlRoutingStrategySource).toContain("updateRuntimeConfig");
    expect(
      runtimeNavigationSections
        .find((section) => section.title === "Router")
        ?.items.map((item) => item.id),
    ).not.toContain("router-config");
    expect(
      runtimeNavigationSections
        .find((section) => section.title === "Router")
        ?.items.map((item) => item.id),
    ).not.toContain("router-decision-detail");
  });

  test("router overview presents runtime-config posture as source of truth", () => {
    expect(routerRouteSource).toContain("const config = configRecord.config;");
    expect(routerRouteSource).toContain("const configuredStrategy");
    expect(routerRouteSource).toContain("const configuredExecutionMode");
    expect(routerRouteSource).toContain("const configuredAliasId =");
    expect(routerRouteSource).toContain("const activeAliasRow =");
    expect(routerRouteSource).toContain(
      "configuredAliasRows.find((row) => row.aliasId === configuredAliasId) ?? null",
    );
    expect(routerRouteSource).toContain(
      "configuredAliasRows.find((row) => row.effectiveModels.includes(controllerModelId)) ?? null",
    );
    expect(routerRouteSource).toContain("Browse all alias pools");
    expect(routerRouteSource).toContain("Alias readiness");
    expect(routerRouteSource).toContain("Alias modes");
    expect(routerRouteSource).toContain("Current active alias");
    expect(routerRouteSource).not.toContain('label: "Active alias"');
    expect(routerRouteSource).not.toContain('label: "Strategy"');
    expect(routerRouteSource).not.toContain('label: "Execution mode"');
    expect(routerRouteSource).not.toContain("xl:grid-cols-5");
    expect(routerRouteSource).toContain("const configuredAliasRows");
    expect(routerRouteSource).not.toContain("Config-owned posture");
    expect(routerRouteSource).not.toContain("Alias source of truth");
    expect(routerRouteSource).not.toContain("Candidate visibility");
    expect(routerRouteSource).not.toContain("FactCard");
    expect(routerRouteSource).not.toContain("const aliasInventory = summary?.aliasInventory");
    expect(routerRouteSource).toContain("Candidate expansion");
    expect(routerRouteSource).not.toContain("Resolved models");
  });

  test("router overview lists the concrete candidate endpoints behind routing posture", () => {
    expect(routerRouteSource).toContain("fetchRouterCandidates");
    expect(routerRouteSource).toContain("Routing candidates");
    expect(routerRouteSource).toContain('Badge tone="accent">active</Badge>');
    expect(routerRouteSource).toContain("DisclosureSection");
    expect(routerRouteSource).toContain("candidate.endpointId");
    expect(routerRouteSource).toContain("candidate.modelId");
    expect(routerRouteSource).toContain("candidate.sourceType");
    expect(routerRouteSource).toContain("candidate.healthStatus");
    expect(routerRouteSource).toContain('row.effectiveModels.join(", ")');
    expect(routerRouteSource).toContain('candidate.healthStatus === "warming"');
    expect(routerRouteSource).not.toContain(
      "Showing {overviewAliasRows.length} of {configuredAliasRows.length} alias pools on",
    );
    expect(routerRouteSource).not.toContain(
      "Showing {overviewCandidates.length} of {candidates.length} candidates on the",
    );
  });

  test("routing decision detail stays in-page and follows the compact Paper detail layout", () => {
    expect(routerDecisionDetailRouteSource).not.toContain("usePageActions");
    expect(routerDecisionDetailRouteSource).not.toContain("Open Observe detail");
    expect(routerDecisionDetailRouteSource).not.toContain("FactCard");
    expect(routerDecisionDetailRouteSource).toContain(
      "xl:grid-cols-[minmax(0,1fr)_minmax(320px,372px)]",
    );
    expect(routerDecisionDetailRouteSource).toContain("Models → Benchmark");
    expect(routerDecisionDetailRouteSource).toContain(
      'fallback ${String(index + 1).padStart(2, "0")}',
    );
    expect(routerDecisionDetailRouteSource).toContain("Judge score");
    expect(routerDecisionDetailRouteSource).toContain("Profile measured");
    expect(routerDecisionDetailRouteSource).toContain("Benchmark samples");
  });

  test("routing strategy omits the old benchmark advisory card and candidate fetch fan-out", () => {
    expect(controlRoutingStrategySource).not.toContain("Benchmark-informed difficulty advisory");
    expect(controlRoutingStrategySource).not.toContain("fetchRouterCandidates");
    expect(controlRoutingStrategySource).not.toContain("advisoryMaxDifficultyRecommendation");
    expect(controlRoutingStrategySource).not.toContain("{candidates.length === 0 ? (");
  });

  test("routing strategy uses Paper master-detail + Active posture rail without shell actions", () => {
    expect(controlRoutingStrategySource).toContain('title="Routing strategy"');
    expect(controlRoutingStrategySource).toContain("Active posture");
    expect(controlRoutingStrategySource).toContain("hasUnsavedChanges");
    expect(controlRoutingStrategySource).toContain('role="listbox"');
    expect(controlRoutingStrategySource).toContain("w-[3px]");
    expect(controlRoutingStrategySource).toContain("bg-[var(--rm-panel-muted)]");
    expect(controlRoutingStrategySource).toContain("border-r border-[var(--rm-border)]");
    expect(controlRoutingStrategySource).toContain("monoEyebrowClassName");
    expect(controlRoutingStrategySource).toContain("Save and apply strategy");
    expect(controlRoutingStrategySource).toContain("await loadState();");
    expect(controlRoutingStrategySource).toContain('variant="inventory"');
    expect(controlRoutingStrategySource).not.toContain("border-l-2 border-[var(--rm-accent)]");
    expect(controlRoutingStrategySource).not.toContain("usePageActions");
    expect(controlRoutingStrategySource).not.toContain("Advanced config");
    expect(controlRoutingStrategySource).not.toContain("Benchmark-informed difficulty advisory");
    expect(controlRoutingStrategySource).not.toContain("Saved routing settings");
    expect(controlRoutingStrategySource).not.toContain("Draft selection");
    expect(controlRoutingStrategySource).not.toContain("RoutingStrategyOptionCard");
  });

  test("routing controller uses MetricStrip inventory cards without a posture side rail", () => {
    expect(controlControllerSource).toContain("Controller assignment");
    expect(controlControllerSource).toContain("Use as controller");
    expect(controlControllerSource).toContain("Current controller");
    expect(controlControllerSource).toContain("summarizeRoleCoverage");
    expect(controlControllerSource).toContain('variant="inventory"');
    expect(controlControllerSource).toContain("xl:grid-cols-2");
    expect(controlControllerSource).toContain("cardClassName");
    expect(controlControllerSource).not.toContain("Candidate posture");
    expect(controlControllerSource).not.toContain("controller assigned");
    expect(controlControllerSource).not.toContain(
      "xl:grid-cols-[minmax(0,1fr)_minmax(320px,372px)]",
    );
    expect(controlControllerSource).not.toContain("FactCard");
  });

  test("routing candidates use MetricStrip inventory cards without a posture side rail", () => {
    expect(routerCandidatesRouteSource).toContain("Candidate inventory");
    expect(routerCandidatesRouteSource).toContain('variant="inventory"');
    expect(routerCandidatesRouteSource).toContain("xl:grid-cols-2");
    expect(routerCandidatesRouteSource).toContain("cardClassName");
    expect(routerCandidatesRouteSource).toContain('label: "Cap"');
    expect(routerCandidatesRouteSource).toContain('label: "p50"');
    expect(routerCandidatesRouteSource).not.toContain("Candidate posture");
    expect(routerCandidatesRouteSource).not.toContain("FactCard");
    expect(routerCandidatesRouteSource).not.toContain(
      "xl:grid-cols-[minmax(0,1fr)_minmax(320px,372px)]",
    );
  });

  test("routing decisions use MetricStrip ledger cards without a KPI posture rail", () => {
    expect(routerDecisionsRouteSource).toContain("Decision ledger");
    expect(routerDecisionsRouteSource).toContain('variant="inventory"');
    expect(routerDecisionsRouteSource).toContain("Router · Open detail");
    expect(routerDecisionsRouteSource).toContain("Observe · Open detail");
    expect(routerDecisionsRouteSource).not.toContain("Decision posture");
    expect(routerDecisionsRouteSource).not.toContain("Latest decision");
    expect(routerDecisionsRouteSource).not.toContain("FactCard");
    expect(routerDecisionsRouteSource).not.toContain(
      "xl:grid-cols-[minmax(0,1fr)_minmax(320px,372px)]",
    );
  });

  test("router config is catalog redirect-only (Fixed Decision #15), not a live Router route", () => {
    expect(designSystemSource).toContain("runtimeLegacyRedirectRoutes");
    expect(designSystemSource).toContain('from: "/app/router/config"');
    expect(designSystemSource).toContain('to: "/app/router/strategy"');
    expect(designSystemSource).not.toContain('id: "router-config"');
    expect(getRuntimeRouteDefinition("/app/router/config")).toBeUndefined();
    expect(designSystemDocSource).toContain("| `/app/router/config` | redirect | — |");
    expect(designSystemDocSource).toContain("redirect-only");
    expect(designSystemDocSource).not.toContain(
      "| `/app/router/config` | live | `registry-detail` |",
    );
  });

  test("meta-guidance panels stay removed from overview and observe routes", () => {
    expect(dashboardRouteSource).not.toContain("Reading order");
    expect(requestsRouteSource).not.toContain("Inspection path");
    expect(requestsRouteSource).not.toContain("Adjacent surfaces");
    expect(observeActivityRouteSource).not.toContain("Reading order");
  });

  test("design system doc marks the converted pages as live routes", () => {
    expect(designSystemDocSource).toContain(
      "| `/app/router/strategy` | live | `registry-detail` |",
    );
    expect(designSystemDocSource).toContain(
      "| `/app/system/runtime-config` | live | `registry-detail` |",
    );
    expect(designSystemDocSource).toContain(
      "| `/app/remote/providers` | live | `registry-detail` |",
    );
    expect(designSystemDocSource).toContain("| `/app/models` | live | `model-inventory` |");
    expect(designSystemDocSource).toContain("| `/app/models/roles` | live | `registry-detail` |");
    expect(designSystemDocSource).toContain(
      "| `/app/models/benchmark` | live | `registry-detail` |",
    );
    expect(designSystemDocSource).toContain("| `/app/router` | live | `registry-detail` |");
    expect(designSystemDocSource).toContain(
      "| `/app/router/controller` | live | `registry-detail` |",
    );
    expect(designSystemDocSource).not.toContain(
      "| `/app/router/config` | live | `registry-detail` |",
    );
    expect(designSystemDocSource).toContain(
      "| `/app/router/candidates` | live | `ledger-inspector` |",
    );
    expect(designSystemDocSource).toContain(
      "| `/app/router/decisions` | live | `ledger-inspector` |",
    );
    expect(designSystemDocSource).toContain(
      "| `/app/router/decisions/:requestId` | live | `ledger-inspector` |",
    );
    expect(designSystemDocSource).not.toContain("| `/app/control/accounts` |");
    expect(designSystemDocSource).toContain("| `/app/studio/images` | live | `studio-workspace` |");
    expect(designSystemDocSource).toContain("| `/app/studio/audio` | live | `studio-workspace` |");
    expect(designSystemDocSource).toContain("| `/app/studio/rerank` | live | `studio-workspace` |");
    expect(designSystemDocSource).toContain(
      "| `/app/studio/advanced` | live | `studio-workspace` |",
    );
    expect(designSystemDocSource).toContain(
      "| `/app/connect/upstream` | live | `contract-reference` |",
    );
    expect(designSystemDocSource).toContain("| `/app/connect` | live | `registry-detail` |");
    expect(designSystemDocSource).toContain(
      "| `/app/connect/downstream` | live | `contract-reference` |",
    );
    expect(designSystemDocSource).toContain("| `/app/system/peers` | live | `system-topology` |");
    expect(designSystemDocSource).not.toContain("| `/app/studio/images` | implementation target |");
    expect(designSystemDocSource).not.toContain(
      "even if the repo-owned page implementation is still in progress",
    );
  });

  test("control routes tolerate an unassigned controller before endpoint activation", () => {
    expect(controlModelsSource).not.toContain("if (!snapshot || !controller)");
    expect(controlControllerSource).not.toContain("if (!snapshot || !controller)");
    expect(runtimeRouteSource).not.toContain("if (!snapshot || !controller || !version)");
    expect(controlModelsSource).toContain("Controller pending");
    expect(controlControllerSource).toContain("No endpoints are available yet");
    expect(controlControllerSource).toContain("Current controller");
    expect(runtimeRouteSource).toContain("No controller assigned");
  });

  test("applies the RM3 palette + Geist contract in live CSS and DESIGN_SYSTEM", () => {
    expect(appCss).toContain('@import "./rm3-tokens.css";');
    expect(appCss).toContain("--rm-font-display: var(--rm3-font-display);");
    expect(appCss).toContain("--rm-font-body: var(--rm3-font-sans);");
    expect(appCss).toContain("--rm-font-mono: var(--rm3-font-mono);");
    expect(appCss).not.toContain("SF Pro");
    expect(designSystemDocSource).toContain("Paper RM3");
    expect(designSystemDocSource).toContain("Paper RM3 Badge geometry is fixed");
    expect(designSystemDocSource).toContain('"Geist", ui-sans-serif, system-ui, sans-serif');
    expect(designSystemDocSource).toContain(
      '"Geist Mono", ui-monospace, "SF Mono", Menlo, monospace',
    );
    expect(designSystemDocSource).toContain("Apple reference remains historical only.");
    expect(designSystemDocSource).toContain(
      "not allowed to override Paper, this document, or the live runtime UI",
    );
    expect(designSystemDocSource).toContain(
      "Packaged runtime startup must not depend on remote font fetches.",
    );
    expect(designSystemDocSource).toContain("bundled font assets");
    expect(designSystemDocSource).not.toContain("Status pills stay transparent");
    expect(designSystemDocSource).not.toContain('"Inter", "Segoe UI", sans-serif');
    expect(appCss).toContain('@source "../../../packages/ui/src/**/*.{ts,tsx}";');
    expect(appCss).not.toContain('@source "../../packages/ui/src/**/*.{ts,tsx}";');
    expect(appCss).toContain(
      "@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));",
    );
    expect(appCss).toContain("--rm-chart-tokens: var(--rm3-chart-throughput);");
    expect(appCss).toContain("--rm-chart-tokens: var(--rm3-light-chart-throughput);");
    expect(appCss).not.toContain("--rm-chart-tokens: var(--rm3-chart-anomaly);");
    expect(appCss).not.toContain("--rm-chart-tokens: var(--rm3-light-chart-anomaly);");
    expect(appCss).toContain('@font-face {\n  font-family: "Geist";');
    expect(appCss).toContain('url("/assets/fonts/geist-latin-400-normal.woff2")');
    expect(appCss).toContain('url("/assets/fonts/geist-latin-600-normal.woff2")');
    expect(appCss).toContain('url("/assets/fonts/geist-latin-700-normal.woff2")');
    expect(appCss).toContain('@font-face {\n  font-family: "Geist Mono";');
    expect(appCss).toContain('url("/assets/fonts/geist-mono-latin-400-normal.woff2")');
    expect(appCss).toContain('url("/assets/fonts/geist-mono-latin-500-normal.woff2")');
    expect(appCss).toContain('url("/assets/fonts/geist-mono-latin-600-normal.woff2")');
    expect(appCss).not.toContain('font-family: "Inter"');
    expect(appCss).not.toContain('font-family: "IBM Plex Mono"');
    expect(appCss).toContain("font-synthesis-weight: none;");
    expect(appCss).toContain("--rm-shadow-product: 0 3px 5px 30px rgb(0 0 0 / 22%);");
    expect(appCss).not.toContain("--rm-shadow-product: 0 24px 80px rgba(0, 0, 0, 0.22);");
    expect(appCss).toContain("--rm-bg: var(--rm3-light-background);");
    expect(appCss).toContain("--rm-surface: var(--rm3-light-card);");
    expect(appCss).toContain("--rm-panel: var(--rm3-light-muted);");
    expect(appCss).toContain("--rm-accent: var(--rm3-light-primary);");
    expect(appCss).toContain("--rm-bg: var(--rm3-background);");
    expect(appCss).toContain("--rm-accent: var(--rm3-primary);");
    expect(appCss).not.toContain("--rm-accent: var(--linear-accent-primary);");
    expect(appCss).toContain('html[data-theme="light"]');
    expect(appCss).toContain('html[data-theme="dark"]');
    expect(appCss).toContain("appearance: none;");
    expect(appCss).toContain("background-image: var(--rm-select-chevron);");
    expect(rootSource).toContain('meta name="color-scheme" content="light dark"');
    expect(rootSource).not.toContain("fonts.googleapis.com");
    expect(rootSource).not.toContain("fonts.gstatic.com");
    expect(rootSource).toContain('meta name="theme-color" content="#0a0a0a"');
    expect(rootSource).not.toContain('meta name="theme-color" content="#010102"');
    expect(rootSource).not.toContain('meta name="theme-color" content="#fbfbfc"');
  });

  test("shared panels and provider selectors are owned by Apple-theme primitives", () => {
    expect(designSystemSource).not.toContain("rounded-none");
    expect(designSystemSource).toContain("export const selectFieldClassName");
    expect(designSystemSource).toContain('backgroundImage: "var(--rm-select-chevron)"');
    expect(designSystemSource).toContain("rounded-[var(--rm-radius-panel)]");
    expect(pagePrimitivesSource).not.toContain("<select");
    expect(pagePrimitivesSource).toContain('role="listbox"');
    expect(pagePrimitivesSource).toContain('role="option"');
    expect(pagePrimitivesSource).toContain("aria-expanded");
    expect(providersRouteSource).not.toContain("<select");
    expect(providersRouteSource).toContain("SelectField");
    expect(providersRouteSource).not.toContain("LiteLLM-backed remote onboarding");
  });

  test("router strategy execution mode uses the themed select primitive", () => {
    expect(controlRoutingStrategySource).not.toContain("<select");
    expect(controlRoutingStrategySource).not.toContain("execution-mode-select");
    expect(controlRoutingStrategySource).toContain("SelectField");
  });

  test("production UI dropdowns use themed select primitives instead of native selects", () => {
    expect(findNativeSelectViolations()).toEqual([]);
  });

  test("shared route effects avoid action identity loops and peer refresh feedback", () => {
    expect(shellHeaderContextSource).toContain("useRef");
    expect(shellHeaderContextSource).not.toContain("[actions, setActions, ...deps]");
    expect(shellHeaderContextSource).not.toContain("[override, setOverride, ...deps]");
    expect(localPeersSource).not.toContain("}, [healthStatus]);");
    expect(localPeersSource).toContain("setHealthStatus((previousStatus)");
  });

  test("keeps shared states on Paper soft-fill Badge tokens and no section divider chrome", () => {
    const badgeSource = readFileSync(
      new URL("../../../../packages/ui/src/badge.tsx", import.meta.url),
      "utf8",
    );
    expect(pagePrimitivesSource).toContain('from "@role-model/ui"');
    expect(pagePrimitivesSource).toContain("Badge");
    expect(pagePrimitivesSource).toContain("<Badge tone={tone}");
    expect(pagePrimitivesSource).toContain("@deprecated Prefer kit `Badge`");
    expect(pagePrimitivesSource).not.toContain("pillLabelClassName");
    expect(providersRouteSource).toContain("Badge");
    expect(providersRouteSource).not.toContain("StatusPill");
    expect(localPeersSource).toContain("Badge");
    expect(localPeersSource).not.toContain("StatusPill");
    expect(controlModelsSource).toContain("Badge");
    expect(controlModelsSource).not.toContain("StatusPill");
    expect(badgeSource).toContain("h-[22px]");
    expect(badgeSource).toContain("rounded-full");
    expect(badgeSource).toContain("font-mono");
    expect(badgeSource).toContain("text-[11px]");
    expect(badgeSource).toContain("bg-[var(--rm-pill-soft-bg)]");
    expect(badgeSource).not.toContain("border-[var(--rm-pill-border)]");
    expect(badgeSource).toContain(
      "bg-[var(--rm-pill-accent-bg)] !text-[var(--rm-pill-accent-ink)]",
    );
    expect(badgeSource).toContain("text-[var(--rm-pill-success-ink)]");
    expect(badgeSource).toContain("text-[var(--rm-pill-warning-ink)]");
    expect(appCss).toContain("--rm-pill-warning-ink: var(--rm3-light-muted-foreground);");
    expect(appCss).toContain("--rm-pill-warning-ink: var(--rm3-muted-foreground);");
    expect(appCss).not.toContain("--rm-pill-warning-ink: var(--rm-warning);");
    expect(badgeSource).toContain("text-[var(--rm-pill-error-ink)]");
    expect(badgeSource).not.toContain("font-medium");
    expect(pagePrimitivesSource).not.toContain("bg-transparent text-[var(--rm-accent)]");
    expect(pagePrimitivesSource).toContain(
      "flex flex-col gap-1.5 overflow-hidden rounded-t-[inherit] border-b border-[var(--rm-border)] px-5 py-4",
    );
    expect(pagePrimitivesSource).toContain('className="overflow-visible p-5"');
    expect(pagePrimitivesSource).not.toContain("border-t border-[var(--rm-border)] pt-4");
    expect(pagePrimitivesSource).toContain("relative min-w-0");
    expect(pagePrimitivesSource).not.toContain("min-w-0 overflow-hidden");
    expect(pagePrimitivesSource).not.toContain("min-w-0 p-4");
    expect(appShellSource).not.toContain("border-b border-[var(--rm-border)] pb-5");
    expect(appShellSource).not.toContain("border-t border-[var(--rm-border)] pt-4");
    expect(appShellSource).toContain("SubPageHeaderBar");
    expect(appShellSource).toContain("onThemeChange");
    expect(appShellSource).not.toContain("ThemeToggle");
    expect(appShellSource).toContain('data-slot="role-model-page-shell"');
    expect(themeToggleSource).toContain("size-8");
    expect(themeToggleSource).not.toContain("h-[44px] w-[104px]");
  });

  test("configured model chips follow the Paper tone map instead of generic success pills", () => {
    expect(controlModelsSource).toContain("buildConfiguredModelInventoryPills");
    expect(controlModelsSource).toContain("buildSelectedModelEvidencePills");
    expect(controlModelsSource).toContain('tone: input.toolCallingSupported ? "info" : "neutral"');
    expect(controlModelsSource).toContain('tone: "neutral",');
    expect(controlModelsSource).not.toContain(
      'tone: input.toolCallingSupported ? "success" : "neutral"',
    );
    expect(controlModelsSource).not.toContain(
      '<StatusPill tone="success">\r\n                          Capability',
    );
    expect(controlModelsSource).toContain(
      "label: `assigned role evidence ${Math.round(strongestAssignedRoleScore * 100)}%`",
    );
    expect(controlModelsSource).toContain('tone: "info",');
    expect(controlModelsSource).toContain(
      'tone: strongestGroup.lowCoverage ? "warning" : "advisory"',
    );
  });

  test("configured models keeps Paper 6+6 inventory with footer actions inside the card", () => {
    expect(controlModelsSource).toContain("xl:grid-cols-2");
    expect(controlModelsSource).toContain("Make primary controller");
    expect(controlModelsSource).not.toContain('summary="Model diagnostics"');
    expect(controlModelsSource).not.toContain("Save bindings");
    expect(controlModelsSource).toContain("ModelRoleBindingTree");
    expect(controlModelsSource).toContain("buildSelectedModelMetaPanel");
    expect(controlModelsSource).toContain(">Cost<");
    expect(controlModelsSource).toContain(">Benchmark<");
    expect(controlModelsSource).toContain("selectedMetaPanel.facts");
    expect(controlModelsSource).toContain("selectedMetaPanel.cost");
    expect(controlModelsSource).toContain("selectedMetaPanel.benchmark");
    expect(controlModelsSource).toContain("compactFieldButtonClassName");
    expect(controlModelsSource).toContain("border-l-[3px]");
    expect(controlModelsSource).toContain("inventoryEyebrowClassName");
    expect(workbenchRouteSource).toContain("xl:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]");
    expect(studioImagesRouteSource).toContain("xl:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]");
    expect(studioAudioRouteSource).toContain("xl:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]");
    expect(studioRerankRouteSource).toContain("xl:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]");
    expect(studioAdvancedRouteSource).toContain("xl:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]");
    expect(studioRerankRouteSource).toContain("Ordered ledger");
    expect(studioRerankRouteSource).toContain("tabular-nums");
    expect(studioRerankRouteSource).not.toContain("StatusPill");
    expect(studioAudioRouteSource).toContain("SpeechPlayer");
    expect(studioAudioRouteSource).toContain("SPEECH_WAVEFORM_HEIGHTS");
    expect(studioAudioRouteSource).not.toContain('<audio className="w-full" controls');
    expect(controlModelsSource).not.toContain('summary="Edit role bindings"');
  });

  test("benchmark scores use a Paper dense table instead of circular score badges", () => {
    expect(controlBenchmarkSource).toContain("benchmarkDenseHeaderCellClassName");
    expect(controlBenchmarkSource).toContain("benchmarkDenseCellClassName");
    for (const label of ["Overall", "Profile", "Easy", "Medium", "Hard", "p50", "p95", "Scope"]) {
      expectJsxText(controlBenchmarkSource, label);
    }
    expect(controlBenchmarkSource).toContain('? "Clearing…" : "Clear"');
    expect(controlBenchmarkSource).not.toContain("const benchmarkScoreBadgeClassName =");
    expect(controlBenchmarkSource).not.toContain("routing detail");
    expect(controlBenchmarkSource).not.toContain("describeRoutingImpact");
    expect(controlBenchmarkSource).not.toContain("EndpointModeRunSnapshot");
    expect(controlBenchmarkSource).not.toContain("fetchBenchmarkSummariesByMode");
  });

  test("benchmark page keeps controls and scores in a single runtime column", () => {
    expect(controlBenchmarkSource).toContain('title="Benchmark scores"');
    expect(controlBenchmarkSource).not.toContain('title="Model scores and routing profiles"');
    expect(controlBenchmarkSource).not.toContain("MetricStrip");
    expect(controlBenchmarkSource).not.toContain('aria-label="Benchmark run summary"');
    expect(controlBenchmarkSource).not.toContain("FactCard");
    expect(controlRolesSource).not.toContain("MetricStrip");
    expect(controlRolesSource).not.toContain('label: "Selected role"');
    expect(controlBenchmarkSource).not.toContain(
      'className="grid gap-6 xl:items-start xl:grid-cols-[minmax(0,760px)_minmax(0,1fr)]"',
    );
    expect(controlBenchmarkSource).toContain('title="Taxonomy dimensions"');
    expect(controlBenchmarkSource).toContain("Filters switch which dimension is active.");
    expect(controlBenchmarkSource).not.toContain(
      "The runtime exposes advisory benchmark scores by role, task, and capability.",
    );
    expect(controlBenchmarkSource).not.toContain(
      'StatusPill tone="success">{formatScore(entry.score)}</StatusPill>',
    );
    expect(controlBenchmarkSource).toContain(
      "<p className={benchmarkDenseCellClassName}>{formatScore(entry.score)}</p>",
    );
    expect(controlBenchmarkSource).toContain("Run capability benchmark");
    expect(controlBenchmarkSource).toContain("Run history");
    expect(controlBenchmarkSource.indexOf('title="Run capability benchmark"')).toBeLessThan(
      controlBenchmarkSource.indexOf('title="Benchmark scores"'),
    );
    expect(controlBenchmarkSource).toContain(
      "Select mode and judge, then grade runnable endpoints.",
    );
    expect(controlBenchmarkSource).toContain('summary="Excluded by current execution mode"');
    expect(controlBenchmarkSource).not.toContain('className="grid gap-3 xl:grid-cols-2"');
    for (const label of ["Model", "Path", "Scope", "Status"]) {
      expectJsxText(controlBenchmarkSource, label);
    }
    expect(controlBenchmarkSource).toContain("CheckboxControl");
    expect(controlBenchmarkSource).not.toContain("aria-pressed={selected}");
    expect(controlBenchmarkSource).toContain("excludedCandidates.map((candidate) => (");
    expect(controlBenchmarkSource).not.toContain("candidates.map((candidate) => (");
    expect(controlBenchmarkSource).not.toContain(
      'className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]"',
    );
  });

  test("benchmark page shows honest empty states without fixture preview rows", () => {
    expect(controlBenchmarkSource).not.toContain("benchmarkScorePreviewRows");
    expect(controlBenchmarkSource).not.toContain("benchmarkTaxonomyPreviewGroups");
    expect(controlBenchmarkSource).not.toContain("benchmarkHistoryPreviewRows");
    expect(controlBenchmarkSource).not.toContain("Preview dense table until this runtime records");
    expect(controlBenchmarkSource).not.toContain("Preview taxonomy score slices");
    expect(controlBenchmarkSource).not.toContain("Preview recent run ledger");
    expect(controlBenchmarkSource).toContain(
      "No benchmark scores are in routing profiles yet. Run the benchmark to grade each configured model and update observed routing profiles.",
    );
    expect(controlBenchmarkSource).toContain(
      "No taxonomy dimension data is available yet. Benchmark results with taxonomy-tagged cases will appear here.",
    );
    expect(controlBenchmarkSource).toContain("No completed benchmark runs yet.");
    expect(controlBenchmarkSource).toContain("benchmarkDenseActionClassName");
  });

  test("benchmark page uses shared text tokens instead of route-local hardcoded typography", () => {
    expect(controlBenchmarkSource).toContain("monoEyebrowClassName");
    expect(controlBenchmarkSource).toContain("compactTitleClassName");
    expect(controlBenchmarkSource).toContain("supportingTextClassName");
    expect(controlBenchmarkSource).not.toContain(
      'className="text-sm font-semibold text-[var(--rm-fg)]"',
    );
    expect(controlBenchmarkSource).not.toContain(
      'className="mt-2 text-sm text-[var(--rm-secondary)]"',
    );
    expect(controlBenchmarkSource).not.toContain(
      'className="text-xs font-semibold uppercase tracking-wider text-[var(--rm-secondary)]"',
    );
    expect(controlBenchmarkSource).not.toContain('className="font-semibold text-[var(--rm-fg)]"');
    expect(controlBenchmarkSource).not.toContain('className="text-sm text-[var(--rm-secondary)]"');
  });

  test("remaining system boards follow the Paper runtime-page layout contracts", () => {
    expect(runtimeRouteSource).toContain("xl:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]");
    expect(runtimeRouteSource).toContain('variant="panel"');
    expect(runtimeRouteSource).toContain("MetricStrip");
    expect(runtimeRouteSource).toContain("Controller posture");
    expect(runtimeRouteSource).toContain("Applied runtime policy");
    expect(runtimeRouteSource).toContain("Execution readiness");
    expect(runtimeRouteSource).toContain("Version facts");
    expect(runtimeRouteSource).toContain("fetchRuntimeShellSnapshot");
    expect(runtimeRouteSource).toContain('to="/app/system/runtime-config"');
    expect(runtimeRouteSource).toContain('to="/app/system/session-readiness"');
    expect(runtimeRouteSource).not.toContain("Lifecycle summary");
    expect(runtimeRouteSource).not.toContain("Open session readiness");
    expect(runtimeRouteSource).not.toContain("md:grid-cols-3");

    expect(controlRuntimeConfigSource).toContain('title="Page actions"');
    expect(controlRuntimeConfigSource).toContain('title="Applied snapshot"');
    expect(controlRuntimeConfigSource).toContain("MetricStrip");
    expect(controlRuntimeConfigSource).toContain("xl:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]");
    expect(controlRuntimeConfigSource).not.toContain("usePageActions(");
    expect(controlRuntimeConfigSource).not.toContain("Applied config snapshot");

    expect(sessionReadinessRouteSource).toContain("xl:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]");
    expect(sessionReadinessRouteSource).toContain("Session bootstrap");
    expect(sessionReadinessRouteSource).toContain("Canonical lifecycle");
    expect(sessionReadinessRouteSource).toContain("Operator intent manifest");
    expect(sessionReadinessRouteSource).toContain("Alias drift warnings");
    expect(sessionReadinessRouteSource).toContain("Routable inventory");
    expect(sessionReadinessRouteSource).not.toContain("Archived stale diagnostics");

    expect(systemPeersRouteSource).toContain("xl:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]");
    expect(systemPeersRouteSource).toContain("fetchPeers");
    expect(systemPeersRouteSource).toContain('title="Peer config"');
    expect(systemPeersRouteSource).toContain("auth configured");
    expect(systemPeersRouteSource).toContain('title="Contract fields"');
    expect(systemPeersRouteSource).toContain("<table");
  });

  test("remote, models, router, and system runtime config routes are first-class pages in the retained taxonomy", () => {
    expect(
      renderRoute("/app/router/strategy", createElement(ControlRoutingStrategyRoute)),
    ).toContain("Loading routing strategy");
    expect(controlRoutingStrategySource).toContain("updateRuntimeConfig");
    expect(controlRoutingStrategySource).toContain("Save and apply strategy");
    expect(controlRoutingStrategySource).toContain("formatDraftRoutingAlias");
    expect(controlRoutingStrategySource).toContain("Active posture");
    expect(routingModeSource).toContain("Strategy A - Baseline");
    expect(routingModeSource).toContain("Strategy B - Intelligent");
    expect(routingModeSource).toContain("Strategy C - Difficulty");
    expect(controlRoutingStrategySource).not.toContain("Balanced");
    expect(getRuntimeRouteDefinition("/app/system/runtime-config")?.title).toBe("Runtime config");
    expect(
      renderRoute("/app/system/runtime-config", createElement(ControlRuntimeConfigRoute)),
    ).toContain("Save and apply");
    expect(getRuntimeRouteDefinition("/app/models/roles")?.title).toBe("Runtime roles");
    expect(renderRoute("/app/models/roles", createElement(ControlRolesRoute))).toContain(
      "Loading runtime role policy",
    );
    expect(controlModelsSource).not.toContain("MetricStrip");
    expect(controlModelsSource).not.toContain("Inspect");
    expect(controlModelsSource).not.toContain('"Selected" : "Inspect"');
    expect(controlModelsSource).toContain("Make primary controller");
    expect(controlModelsSource).not.toContain("Save bindings");
    expect(controlModelsSource).toContain("ModelRoleBindingTree");
    expect(controlModelsSource).toContain("tasks under each role");
    expect(controlModelsSource).not.toContain("LocalModelRolePicker");
    expect(controlModelsSource).not.toContain('summary="Edit role bindings"');
    expect(controlModelsSource).not.toContain('summary="Model diagnostics"');
    expect(controlModelsSource).toContain("/app/models/roles");
    expect(controlModelsSource).toContain("Model inventory");
    expect(controlModelsSource).toContain("xl:grid-cols-2");
    expect(controlModelsSource).toContain("border-l-[3px]");
    expect(controlModelsSource).toContain("inventoryEyebrowClassName");
    expect(controlModelsSource).toContain("compactFieldButtonClassName");
    expect(controlModelsSource).not.toContain(
      'className="text-xs uppercase tracking-[0.18em] text-[var(--rm-muted)]"',
    );
    expect(controlModelsSource).not.toContain(
      'className="mt-2 truncate text-lg font-semibold leading-6 text-[var(--rm-fg)]"',
    );
    expect(controlModelsSource).not.toContain(
      'className="mt-2 break-all text-sm leading-[18px] text-[var(--rm-secondary)]"',
    );
    expect(controlModelsSource).not.toContain(
      'className="text-base font-semibold leading-5 text-[var(--rm-fg)]"',
    );
    expect(controlModelsSource).not.toContain(
      'className="text-[22px] font-semibold leading-7 text-[var(--rm-fg)]"',
    );
    expect(controlModelsSource).not.toContain("fixed inset-0 z-50");
  });

  test("routing analytics uses full-width ChartGrid without a slice summary side rail", () => {
    expect(observeRoutingRouteSource).toContain("PageFilters");
    expect(observeRoutingRouteSource).toContain("ChartGrid");
    expect(observeRoutingRouteSource).not.toContain("Current routing slice");
    expect(observeRoutingRouteSource).not.toContain("Most active roles");
    expect(observeRoutingRouteSource).not.toContain("usePageActions");
    expect(observeRoutingRouteSource).not.toContain("Open router configuration");
    expect(observeRoutingRouteSource).not.toContain("xl:grid-cols-[minmax(0,1.1fr)_320px]");
  });

  test("connect and system routes rely on shared secondary-text tokens instead of route-local color overrides", () => {
    expect(endpointsRouteSource).toContain("supportingTextClassName");
    expect(endpointsRouteSource).not.toContain("bodyTextClassName} text-[var(--rm-secondary)]");
    expect(integrationsDownstreamRouteSource).not.toContain(
      "bodyTextClassName} text-[var(--rm-secondary)]",
    );
    expect(integrationsUpstreamRouteSource).not.toContain(
      "bodyTextClassName} text-[var(--rm-secondary)]",
    );
    expect(sessionReadinessRouteSource).not.toContain(
      "bodyTextClassName} text-[var(--rm-secondary)]",
    );
  });

  test("upstream passthrough derives live inventory from configured providers in scope, not the full provider catalog", () => {
    expect(integrationsUpstreamRouteSource).toContain("providerCards.length");
    expect(integrationsUpstreamRouteSource).toContain("modelTargets.length");
    expect(integrationsUpstreamRouteSource).not.toContain(
      "value: String(snapshot?.providers.length ?? 0)",
    );
    expect(integrationsUpstreamRouteSource).not.toContain("value: snapshot?.providers.length ?? 0");
    expect(integrationsUpstreamRouteSource).not.toContain(
      "value={snapshot?.providers.length ?? 0}",
    );
  });

  test("connect contract-reference routes expose live compatibility notes with Paper upstream boundary guidance", () => {
    expect(integrationsDownstreamRouteSource).toContain("Compatibility notes");
    expect(integrationsDownstreamRouteSource).toContain("provider.setup.notes");
    expect(integrationsUpstreamRouteSource).toContain("Upstream target inventory");
    expect(integrationsUpstreamRouteSource).toContain("Provider accounts in scope");
    expect(integrationsUpstreamRouteSource).toContain("Boundary guidance");
    expect(integrationsUpstreamRouteSource).toContain(
      "Alias routing and telemetry stay on the runtime shell",
    );
    expect(integrationsUpstreamRouteSource).not.toContain("MetricStrip");
  });

  test("runtime roles route preserves role-first drill-down language for task detail", () => {
    expect(controlRolesSource).toContain("Role catalog");
    expect(controlRolesSource).toContain("Select a role to edit identity and task allowlists.");
    expect(controlRolesSource).toContain("RoleCatalogHierarchy");
    expect(controlRolesSource).toContain("Tasks stay nested under the selected role");
    expect(controlRolesSource).toContain(
      "Open Task detail on a role to inspect or edit its task memberships.",
    );
    expect(controlRolesSource).toContain('className="grid gap-6 xl:grid-cols-2 xl:items-start"');
    expect(controlRolesSource).not.toContain(
      'className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-start"',
    );
    expect(controlRolesSource).toContain('className="max-h-[68vh] overflow-auto"');
    expect(controlRolesSource).toContain('className="max-h-[52vh] overflow-auto pr-1"');
    expect(controlRolesSource).toContain(
      "Add a router-visible role with identity, instructions, and policy fields.",
    );
    expect(controlRolesSource).not.toContain("Open create role form");
    expect(controlRolesSource).not.toContain('summary="Edit all role fields"');
    expect(controlRolesSource).toContain(
      "Update identity, instructions, tool policy, and routing overrides.",
    );
    expect(controlRolesSource).toContain('summary="Advanced policy fields"');
    expect(controlRolesSource.split('summary="Advanced policy fields"').length - 1).toBe(1);
    expect(controlRolesSource).toContain("includeDescription={false}");
    expect(controlRolesSource).not.toContain("includeRoleKind={false}");
    expect(controlRolesSource).not.toContain("includeToolPolicy={false}");
    expect(controlRolesSource).toContain("<RoleDescriptionField");
    expect(controlRolesSource).toContain("<RoleKindField");
    expect(controlRolesSource).toContain("<RoleToolPolicyField");
    expect(controlRolesSource).toContain("Routing policy overrides (JSON)");
    expect(controlRolesSource).toContain("tool policy ");
    expect(controlRolesSource).toContain("supported tasks ");
    expect(controlRolesSource).toContain("tasks in allowlist");
    expect(controlRolesSource).toContain('label="Kind"');
    expect(controlRolesSource).toContain('["assistant", "capability"]');
    expect(controlRolesSource).not.toContain("tool policy mode:");
    expect(controlRolesSource).not.toContain("supported tasks:");
    expect(controlRolesSource).not.toContain(" +1 more");
    expect(controlRolesSource).toContain("<SectionCard");
    expect(roleTaskHierarchySource).toContain("Task detail");
    expect(roleTaskHierarchySource).toContain("Hide task detail");
    expect(roleTaskHierarchySource).toContain("border-l-[var(--rm-accent)]");
    expect(roleTaskHierarchySource).not.toContain("Select role");
    expect(roleTaskHierarchySource).not.toContain("xl:grid-cols-2");
  });

  test("models routes use shared supporting and field tokens instead of route-local secondary text overrides", () => {
    expect(controlModelsSource).not.toContain("bodyTextClassName} text-[var(--rm-secondary)]");
    expect(controlRolesSource).not.toContain("font-mono text-xs");
    expect(controlRolesSource).not.toContain(
      'className="flex items-center gap-2 rounded-[var(--rm-radius-panel)] border border-[var(--rm-border)] px-3 py-2 text-sm text-[var(--rm-secondary)]"',
    );
  });

  test("routing strategy route uses shared text and field tokens instead of route-local small-text styling", () => {
    expect(controlRoutingStrategySource).not.toContain('className="grid gap-2 text-sm"');
    expect(controlRoutingStrategySource).not.toContain(
      'className="font-semibold text-[var(--rm-fg)]"',
    );
    expect(controlRoutingStrategySource).not.toContain(
      'className="text-sm text-[var(--rm-secondary)]"',
    );
    expect(controlRoutingStrategySource).not.toContain(
      "className={`${mutedPanelClassName} p-4 text-sm text-[var(--rm-secondary)]`",
    );
  });

  test("router routes use shared supporting and emphasis tokens instead of route-local secondary text overrides", () => {
    expect(routerRouteSource).toContain("supportingTextClassName");
    expect(routerRouteSource).not.toContain("bodyTextClassName} text-[var(--rm-secondary)]");
    expect(routerRouteSource).not.toContain("font-semibold text-[var(--rm-fg)]");

    expect(routerCandidatesRouteSource).toContain('variant="inventory"');
    expect(routerCandidatesRouteSource).toContain("bodyStrongTextClassName");
    expect(routerCandidatesRouteSource).not.toContain(
      "bodyTextClassName} text-[var(--rm-secondary)]",
    );

    expect(routerDecisionDetailRouteSource).toContain("supportingTextClassName");
    expect(routerDecisionDetailRouteSource).not.toContain(
      "bodyTextClassName} text-[var(--rm-secondary)]",
    );
    expect(routerDecisionDetailRouteSource).not.toContain("text-[15px] text-[var(--rm-fg)]");
    expect(routerDecisionDetailRouteSource).not.toContain("text-sm text-[var(--rm-secondary)]");

    expect(routerDecisionsRouteSource).not.toContain("text-sm text-[var(--rm-secondary)]");

    expect(controlControllerSource).toContain("supportingTextClassName");
    expect(controlControllerSource).not.toContain("bodyTextClassName} text-[var(--rm-secondary)]");
  });

  test("observe routes use shared supporting, utility, and title tokens instead of route-local telemetry typography overrides", () => {
    expect(requestsRouteSource).not.toContain("bodyTextClassName} text-[var(--rm-secondary)]");

    expect(observeRoutingRouteSource).not.toContain(
      "bodyTextClassName} text-[var(--rm-secondary)]",
    );

    expect(observeActivityRouteSource).toContain("divide-y divide-[var(--rm-border)]");
    expect(observeActivityRouteSource).toContain("Capture inspector");
    expect(observeActivityRouteSource).not.toContain(
      "bodyTextClassName} text-[var(--rm-secondary)]",
    );
    expect(observeActivityRouteSource).not.toContain(
      "className={`${mutedPanelClassName} p-4 ${bodyTextClassName} text-[var(--rm-secondary)]`",
    );
    expect(observeActivityRouteSource).not.toContain("listRowClassName");

    expect(observeLogsSource).toContain("supportingTextClassName");
    expect(observeLogsSource).not.toContain("bodyTextClassName} text-[var(--rm-secondary)]");

    expect(requestDetailRouteSource).toContain("compactTitleClassName");
    expect(requestDetailRouteSource).toContain("fieldLabelClassName");
    expect(requestDetailRouteSource).toContain("bodyStrongTextClassName");
    expect(requestDetailRouteSource).toContain("supportingTextClassName");
    expect(requestDetailRouteSource).not.toContain("font-semibold text-[var(--rm-fg)]");
    expect(requestDetailRouteSource).not.toContain("text-sm text-[var(--rm-secondary)]");
    expect(requestDetailRouteSource).not.toContain(
      "text-xs uppercase tracking-[0.24em] text-[var(--rm-muted)]",
    );

    expect(telemetryChartsSource).toContain("supportingTextClassName");
    expect(telemetryChartsSource).not.toContain(
      "bodyTextClassName} max-w-[65ch] text-[var(--rm-secondary)]",
    );
    expect(telemetryChartsSource).not.toContain("bodyTextClassName} text-[var(--rm-secondary)]");
  });

  test("local routes use shared supporting, meta, code, and button tokens instead of route-local typography drift", () => {
    expect(localChooseSource).toContain("primaryButtonClassName");
    expect(localChooseSource).toContain("secondaryButtonClassName");
    expect(localChooseSource).not.toContain("chooserPrimaryActionClassName");
    expect(localChooseSource).not.toContain("chooserSecondaryActionClassName");

    expect(localMatrixSource).toContain("<Navigate");
    expect(localMatrixSource).toContain("/app/local/llama-swap/models?view=grid");
    expect(localMatrixSource).not.toContain("bodyTextClassName} text-[var(--rm-secondary)]");
    expect(localMatrixSource).not.toContain("utilityLabelClassName} text-[var(--rm-muted)]");

    expect(localPeerModelsSource).toContain("supportingTextClassName");
    expect(localPeerModelsSource).not.toContain("bodyTextClassName} text-[var(--rm-secondary)]");
    expect(localPeerModelsSource).not.toContain("utilityLabelClassName} text-[var(--rm-muted)]");

    expect(localLlamaSwapModelsSource).toContain("supportingTextClassName");
    expect(localLlamaSwapModelsSource).not.toContain(
      "bodyTextClassName} text-[var(--rm-secondary)]",
    );
    expect(localLlamaSwapModelsSource).not.toContain(
      "utilityLabelClassName} text-[var(--rm-muted)]",
    );

    expect(localPolicySource).toContain("compactTitleClassName");
    expect(localPolicySource).toContain("codeBlockClassName");
    expect(localPolicySource).not.toContain("bodyTextClassName} text-[var(--rm-secondary)]");
    expect(localPolicySource).not.toContain("text-sm font-semibold text-[var(--rm-fg)]");
    expect(localPolicySource).not.toContain("utilityLabelClassName} text-[var(--rm-muted)]");

    expect(localPeersSource).toContain("<table");
    expect(localPeersSource).toContain("supportingTextClassName");
    expect(localPeersSource).toContain("font-mono text-[13px]");
    expect(localPeersSource).not.toContain("bodyTextClassName} text-[var(--rm-secondary)]");
    expect(localPeersSource).not.toContain("utilityLabelClassName} text-[var(--rm-muted)]");

    expect(localSwapSource).toContain("metaTextClassName");
    expect(localSwapSource).toContain("compactTitleClassName");
    expect(localSwapSource).toContain("codeBlockClassName");
    expect(localSwapSource).not.toContain("bodyTextClassName} text-[var(--rm-secondary)]");
    expect(localSwapSource).not.toContain("text-[11px] font-semibold uppercase");
    expect(localSwapSource).not.toContain("text-sm font-semibold text-[var(--rm-fg)]");

    expect(localLogsSource).toContain("monoEyebrowClassName");
    expect(localLogsSource).toContain("compactTitleClassName");
    expect(localLogsSource).toContain("codeBlockClassName");
    expect(localLogsSource).not.toContain(
      'className="flex items-center gap-2 text-sm text-[var(--rm-fg)]',
    );
    expect(localLogsSource).not.toContain('className="min-w-full text-left text-sm"');
    expect(localLogsSource).not.toContain("text-xs text-[var(--rm-muted)]");
    expect(localLogsSource).not.toContain("text-sm font-semibold text-[var(--rm-fg)]");
  });

  test("local chooser uses two backend option cards with in-card actions instead of detached fact strips", () => {
    expect(localChooseSource).toContain(
      'className="grid gap-5 xl:grid-cols-[minmax(0,6fr)_minmax(0,6fr)]"',
    );
    expect(localChooseSource).toContain("External server");
    expect(localChooseSource).toContain("Managed by role-model");
    expect(localChooseSource).toContain(
      "role-model routes to your server; it does not load GGUF files for you.",
    );
    expect(localChooseSource).toContain("role-model runs the local llama-swap process");
    expect(localChooseSource).toContain("Open peer models");
    expect(localChooseSource).toContain("Open llama-swap models");
    expect(localChooseSource).not.toContain("FactCard");
  });

  test("peer models keeps the register surface visible and uses stacked registry rows", () => {
    expect(localPeerModelsSource).not.toContain("FactCard");
    expect(localPeerModelsSource).not.toContain(
      'className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"',
    );
    expect(localPeerModelsSource).toContain(
      'className="grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_auto]"',
    );
    expect(localPeerModelsSource).toContain('className="space-y-3"');
    expect(localPeerModelsSource).toContain("Open endpoints");
    expect(localPeerModelsSource).toContain("disabled={!peersReady || actioning.__register__}");
    expect(localPeerModelsSource).toContain("No peer models registered yet.");
  });

  test("llama-swap models stays single-column and uses stacked loaded-model rows", () => {
    expect(localLlamaSwapModelsSource).toContain("Load a runtime-config-declared model");
    expect(localLlamaSwapModelsSource).toContain("manage the in-memory");
    expect(localLlamaSwapModelsSource).not.toContain("Related routes");
    expect(localLlamaSwapModelsSource).not.toContain("View modes");
    expect(localLlamaSwapModelsSource).not.toContain(
      "Use list or grid for the same loaded-model inventory.",
    );
    expect(localLlamaSwapModelsSource).not.toContain("Open matrix");
    expect(localLlamaSwapModelsSource).not.toContain("md:grid-cols-2 xl:grid-cols-3");
    expect(localLlamaSwapModelsSource).toContain('className="space-y-3"');
    expect(localLlamaSwapModelsSource).not.toContain("LlamaSwapSetupHint");
    expect(localLlamaSwapModelsSource).not.toContain("Assign roles before loading");
    expect(localPolicySource).not.toContain("LlamaSwapSetupBanner");
    expect(localSwapSource).not.toContain("LlamaSwapSetupBanner");
    expect(localLogsSource).not.toContain("LlamaSwapSetupBanner");
  });

  test("llama-swap matrix is a stub redirect to models grid view", () => {
    expect(localMatrixSource).toContain("<Navigate");
    expect(localMatrixSource).toContain("/app/local/llama-swap/models?view=grid");
    expect(localMatrixSource).not.toContain("Llama-swap matrix");
    expect(localMatrixSource).not.toContain("capability matrix");
  });

  test("local setup surfaces stay discoverable from navigation and empty registry states", () => {
    expect(localPeerModelsSource).toContain("Register model");
    expect(localPeerModelsSource).toContain("Peer-backed");
    expect(localLlamaSwapModelsSource).toContain("Load model");
    expect(localLlamaSwapModelsSource).toContain("Llama-swap");
    expect(localPeersSource).toContain("Endpoint inventory");
    expect(localPeersSource).toContain("Add endpoint");
    expect(localPeersSource).toContain("<table");
    expect(localPeersSource).toContain("<th");
    expect(localPeersSource).toContain("Endpoint");
    expect(localPeersSource).toContain("Status");
    expect(localPeersSource).toContain("Type");
    expect(localPeersSource).toContain("Actions");
    expect(localPeersSource).toContain("OpenAI-compatible peer");
    expect(endpointsRouteSource).toContain("/app/local/endpoints");
    expect(endpointsRouteSource).toContain("/app/connect/downstream");
    expect(controlModelsSource).toContain("/app/local/choose");
    expect(controlModelsSource).toContain("/app/local/endpoints");
  });

  test("local host policy, endpoint, and swap surfaces keep low-data states actionable", () => {
    expect(localPolicySource).toContain("Open models");
    expect(localPolicySource).toContain("Persisted JSON stays visible here");
    expect(localPolicySource).toContain("Auto-unload idle models");
    expect(localPeersSource).not.toContain("Open peer models");
    expect(localPeersSource).not.toContain("role-model normalizes the URL");
    expect(localPeersSource).toContain("OpenAI-compatible peer");
    expect(localSwapSource).toContain(
      "Events appear here when the managed host loads a first model",
    );
    expect(localSwapSource).toContain("Ledger semantics");
    expect(localSwapSource).toContain("Open host policy");
  });

  test("observe and local log surfaces render structured ledgers rather than raw iframe placeholders", () => {
    expect(observeLogsSource).not.toContain("<iframe");
    expect(observeLogsSource).toContain("Structured log rows");
    expect(observeLogsSource).toContain("Source");
    expect(observeLogsSource).toContain("Level");
    expect(observeLogsSource).toContain("Source filter");
    expect(observeLogsSource).toContain("Raw lines");
    expect(localLogsSource).not.toContain("<iframe");
    expect(localLogsSource).toContain("Structured local log history");
    expect(localLogsSource).toContain("Request");
    expect(localLogsSource).toContain("Proxy log stream");
    expect(localLogsSource).toContain("Llama-swap log stream");
    expect(localLogsSource).toContain("Auto-refresh (3s)");
    expect(localLogsSource).toContain("Refresh retains the structured parser");
  });

  test("observe ownership keeps requests canonical and raw-host surfaces adjacent", () => {
    expect(routesSource).toContain('route("observe", "routes/legacy-redirect.tsx"');
    expect(legacyRedirectSource).toContain('"/app/observe": "/app/observe/requests"');
    expect(designSystemDocSource).toContain(
      "| `/app/observe` | redirect | — | Redirects to `/app/observe/requests`. |",
    );
    expect(designSystemDocSource).toContain(
      "| `/app/observe/activity` | live | `ledger-inspector` | Preserved raw-host activity ledger",
    );
    expect(designSystemDocSource).toContain(
      "| `/app/observe/requests` | live | `ledger-inspector` | Canonical telemetry request ledger",
    );
    expect(designSystemDocSource).toContain(
      "| `/app/observe/logs` | live | `dual-console` | Preserved raw-host log shell",
    );
  });

  test("requests and request detail stay telemetry-first without redundant raw-host handoff cards", () => {
    expect(requestsRouteSource).toContain("fetchTelemetryAnalytics");
    expect(requestsRouteSource).toContain("buildObserveRequestsChartDefinitions");
    expect(requestsRouteSource).toContain("PageFilters");
    expect(requestsRouteSource).toContain("ChartGrid");
    expect(requestsRouteSource).toContain("adaptObserveChartBlock");
    expect(requestsRouteSource).toContain("ObserveKitChartBlock");
    expect(requestsRouteSource).not.toContain("TelemetryAnalyticsChartCard");
    expect(requestsRouteSource).not.toContain("../components/telemetry-charts");
    expect(requestsRouteSource).not.toContain("TelemetryTimeRangeControl");
    expect(requestsRouteSource).not.toContain("FactCard");
    expect(requestsRouteSource).not.toContain("Dashboard mode");
    expect(requestsRouteSource).toContain("Advanced controls");
    expect(requestsRouteSource).toContain("DisclosureSection");
    expect(requestsRouteSource).toContain("fromPageTimeRange");
    expect(requestsRouteSource).not.toContain('previewMode === "mock"');
    expect(requestsRouteSource).toContain("Taxonomy group id");
    expect(requestsRouteSource).toContain("Taxonomy capability ids");
    expect(requestsRouteSource).not.toContain("?preview=mock");
    expect(requestsRouteSource).not.toContain("Adjacent raw-host tools");
    expect(requestsRouteSource).not.toContain("/app/observe/activity");
    expect(requestsRouteSource).not.toContain("/app/observe/logs");
    expect(requestDetailRouteSource).not.toContain("FactCard");
    expect(requestDetailRouteSource).toContain("Request summary");
    expect(requestDetailRouteSource).not.toContain('previewMode === "mock"');
    expect(requestDetailRouteSource).not.toContain("buildMockObserveRequestDetail");
    expect(requestDetailRouteSource).not.toContain("Adjacent raw-host tools");
    expect(requestDetailRouteSource).not.toContain("/app/observe/activity");
    expect(requestDetailRouteSource).not.toContain("/app/observe/logs");
    expect(routerDecisionDetailRouteSource).not.toContain('previewMode === "mock"');
    expect(routerDecisionDetailRouteSource).not.toContain("buildMockRouterDecisionDetail");
    expect(designSystemDocSource).toContain("Must not embed Activity/Logs");
    expect(designSystemDocSource).toContain(
      "must not embed a redundant “Adjacent raw-host tools” panel",
    );
  });

  test("observe chart routes use RM3 ChartGrid and PageFilters instead of legacy telemetry cards", () => {
    expect(observeRoutingRouteSource).toContain("PageFilters");
    expect(observeRoutingRouteSource).toContain("ChartGrid");
    expect(observeRoutingRouteSource).toContain("adaptObserveChartBlock");
    expect(observeRoutingRouteSource).not.toContain("TelemetryAnalyticsChartCard");
    expect(observeRoutingRouteSource).not.toContain("../components/telemetry-charts");
    expect(observeRoutingRouteSource).not.toContain("TelemetryTimeRangeControl");
    expect(observeRoutingRouteSource).not.toContain("StatusPill");
    expect(observeActivityRouteSource).toContain("MetricStrip");
    expect(observeActivityRouteSource).not.toContain("FactCard");
    expect(observeLogsSource).toContain("MetricStrip");
    expect(observeLogsSource).toContain("SegmentedControl");
    expect(observeLogsSource).not.toContain("FactCard");
  });

  test("routing analytics controls expose richer taxonomy pivots for observe charts", () => {
    expect(observeRoutingRouteSource).not.toContain("Dashboard mode");
    expect(observeRoutingRouteSource).toContain("Advanced controls");
    expect(observeRoutingRouteSource).toContain("DisclosureSection");
    expect(observeRoutingRouteSource).not.toContain('previewMode === "mock"');
    expect(observeRoutingRouteSource).toContain("Taxonomy group id");
    expect(observeRoutingRouteSource).toContain("Taxonomy task variant");
    expect(observeRoutingRouteSource).toContain("Taxonomy capability ids");
    expect(observeRoutingRouteSource).toContain("Taxonomy tool class ids");
  });

  test("activity route is MetricStrip + 8+4 ledger without header stream chrome", () => {
    expect(observeActivityRouteSource).toContain("MetricStrip");
    expect(observeActivityRouteSource).toContain("Recent host activity");
    expect(observeActivityRouteSource).toContain("Capture inspector");
    expect(observeActivityRouteSource).toContain("xl:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]");
    expect(observeActivityRouteSource).not.toContain("usePageActions");
    expect(observeActivityRouteSource).not.toContain("Canonical structured telemetry");
    expect(observeActivityRouteSource).not.toContain("Raw metrics");
    expect(integrationsDownstreamRouteSource).not.toContain("usePageActions");
    expect(integrationsDownstreamRouteSource).not.toContain("Provider JSON");
  });

  test("logs route keeps request-detail links without meta handoff or raw-stream chrome", () => {
    expect(observeLogsSource).toContain("/app/observe/requests/");
    expect(observeLogsSource).toContain("Source filter");
    expect(observeLogsSource).toContain("Raw lines");
    expect(observeLogsSource).not.toContain("Canonical telemetry handoff");
    expect(observeLogsSource).not.toContain("usePageActions");
    expect(observeLogsSource).not.toContain("Open raw proxy stream");
    expect(observeLogsSource).not.toContain("Raw stream endpoints");
  });

  test("registry and system layouts avoid redundant KPI strips and placeholder note panels", () => {
    expect(providersRouteSource).not.toContain("FactCard");
    expect(endpointsRouteSource).not.toContain("FactCard");
    expect(controlControllerSource).not.toContain("FactCard");
    expect(controlRuntimeConfigSource).not.toContain("FactCard");
    expect(runtimeRouteSource).not.toContain("Runtime contract notes");
    expect(runtimeRouteSource).not.toContain("Health posture");
    expect(runtimeRouteSource).not.toContain("Preserved host surfaces");
    expect(runtimeRouteSource).not.toContain("Raw host log output");
    expect(runtimeRouteSource).not.toContain("Vendor metrics and capture ids");
    expect(runtimeRouteSource).not.toContain("Raw host health endpoint");
    expect(designSystemDocSource).not.toContain("fact strips before the registry rail");
  });

  test("studio workspace routes omit happy-path FactCard strips", () => {
    for (const source of [
      studioImagesRouteSource,
      studioAudioRouteSource,
      studioRerankRouteSource,
      studioAdvancedRouteSource,
    ]) {
      expect(source).not.toContain("FactCard");
      expect(source).not.toContain("xl:grid-cols-3");
    }
    expect(workbenchRouteSource).not.toContain("FactCard");
    expect(workbenchRouteSource).not.toContain("xl:grid-cols-4");
    expect(workbenchRouteSource).toContain("MetricStrip");
    expect(workbenchRouteSource).toContain('variant="inline"');
  });

  test("dashboard is chart-led and keeps routing analytics as a first-class handoff", () => {
    expect(dashboardRouteSource).toContain("ChartGrid");
    expect(dashboardRouteSource).toContain("ChartGridCell");
    expect(dashboardRouteSource).toContain("adaptOverviewChartBlock");
    expect(dashboardRouteSource).toContain("OverviewKitChartBlock");
    expect(dashboardRouteSource).toContain("buildOverviewChartDefinitions");
    expect(dashboardRouteSource).not.toContain("TelemetryAnalyticsChartCard");
    expect(dashboardRouteSource).not.toContain("../components/telemetry-charts");
    expect(dashboardRouteSource).not.toContain("RuntimeOverview");
    expect(dashboardRouteSource).not.toContain("Open routing analytics");
    expect(dashboardRouteSource).toContain("Model pool");
    expect(dashboardRouteSource).toContain("CandidateSpaceChart");
    expect(dashboardRouteSource).toContain("fetchRouterCandidates");
    expect(dashboardRouteSource).toContain("fetchRuntimeModels");
    expect(dashboardRouteSource).toContain("buildCandidateSpacePoints");
    expect(dashboardRouteSource).not.toContain(
      "Full quality/cost/speed axes land with router candidate telemetry",
    );
    // Paper Model pool empty: keep axes, candidates rail = title + CTA to Remote/Local.
    expect(candidateSpaceChartSource).toContain("No models configured");
    expect(candidateSpaceChartSource).toContain("/app/remote/providers");
    expect(candidateSpaceChartSource).toContain("/app/local/choose");
    expect(candidateSpaceChartSource).not.toContain("No routable candidates");
    expect(candidateSpaceChartSource).not.toContain("No candidates to list.");
  });

  test("chart empty and unsupported states use RM3 dashed muted panels on every graph page", () => {
    expect(designSystemSource).toContain("export const chartEmptyStateClassName =");
    expect(designSystemSource).toContain("border-dashed border-border");
    expect(designSystemSource).toContain("text-muted-foreground");
    expect(chartKitStatePanelSource).toContain("chartEmptyStateClassName");
    expect(chartKitStatePanelSource).toContain("chartErrorStateClassName");
    expect(chartKitStatePanelSource).not.toContain("rm-warning");
    expect(overviewChartBlockSource).toContain("ChartKitStatePanel");
    expect(observeChartBlockSource).toContain("ChartKitStatePanel");
    expect(overviewChartBlockSource).not.toContain("rm-warning");
    expect(observeChartBlockSource).not.toContain("rm-warning");
    expect(telemetryChartsSource).toContain("chartEmptyStateClassName");
    expect(telemetryChartsSource).toContain("chartErrorStateClassName");
    expect(telemetryChartsSource).not.toContain("border-[var(--rm-warning)]");
    expect(requestsRouteSource).toContain("ObserveKitChartBlock");
    expect(observeRoutingRouteSource).toContain("ObserveKitChartBlock");
    expect(dashboardRouteSource).toContain("OverviewKitChartBlock");
  });

  test("overview metadata and design doc describe a telemetry-first summary with an interaction rail", () => {
    expect(dashboardRouteSource).not.toContain('label: "Providers"');
    expect(dashboardRouteSource).not.toContain('label: "Execution-ready"');
    expect(appShellSource).not.toContain("xl:grid-cols-[minmax(0,1fr)_auto]");
    expect(appShellSource).toContain("hasSecondaryNavigation");
    expect(appShellSource).toContain("isSecondaryNavPath");
    expect(appShellSource).toContain("activeSection.items.length > 1 && isSecondaryNavPath");
    expect(appShellSource).toContain("section.hubTo");
    expect(designSystemSource).toContain('hubTo: "/app/local/choose"');
    expect(dashboardRouteSource).not.toContain("usePageActions");
    expect(dashboardRouteSource).not.toContain(">Summary<");
    expect(dashboardRouteSource).toContain('useState<TelemetryTimeRangeValue>("day")');
    expect(dashboardRouteSource).toContain('useState<"" | RuntimeTelemetryAnalyticsDimension>(');
    expect(dashboardRouteSource).toContain('"endpointId"');
    expect(dashboardRouteSource).not.toContain("Overview filters");
    expect(dashboardRouteSource).not.toContain('SectionCard title="Overview filters"');
    expect(dashboardRouteSource).toContain("telemetryBreakdownOptions");
    expect(dashboardRouteSource).toContain('"requestedRoleId"');
    expect(dashboardRouteSource).toContain('"difficultyBucket"');
    expect(dashboardRouteSource).toContain('"statusFamily"');
    expect(dashboardRouteSource).toContain('label: "Status"');
    expect(dashboardRouteSource).toContain('label: "Difficulty"');
    expect(dashboardRouteSource).not.toContain('label="Provider"');
    expect(dashboardRouteSource).not.toContain('label="Requested role"');
    expect(dashboardRouteSource).toContain("Model pool");
    expect(dashboardRouteSource).toContain("onFieldChange");
    expect(dashboardRouteSource).toContain("fetchTelemetryRequests({");
    expect(dashboardRouteSource).toContain("filters,");
    expect(dashboardRouteSource).not.toContain('previewMode === "mock"');
    expect(dashboardRouteSource).not.toContain("buildMockOverviewPreview");
    expect(dashboardRouteSource).not.toContain('to="/app/observe/requests"');
    expect(dashboardRouteSource).toContain("PageFilters");
    expect(dashboardRouteSource).not.toContain("FilterSelect");
    expect(dashboardRouteSource).not.toContain(
      'className="grid gap-4 xl:items-start xl:grid-cols-2"',
    );
    expect(dashboardRouteSource).not.toContain(
      'className="grid gap-4 xl:items-start xl:grid-cols-[minmax(0,1.45fr)_minmax(0,0.8fr)_minmax(0,0.8fr)]"',
    );
    expect(dashboardRouteSource).not.toContain('SectionCard title="Latest requests"');
    expect(dashboardRouteSource).not.toContain('SectionCard title="Current endpoint inventory"');
    expect(dashboardRouteSource).toContain("sortOverviewChartBlocks");
    expect(telemetryControlsSource).toContain("flex-nowrap");
    expect(telemetryControlsSource).toContain('from "@role-model/ui"');
    expect(telemetryControlsSource).toContain("SegmentedControl");
    expect(telemetryControlsSource).not.toContain("rounded-[var(--rm-radius-pill)]");
    expect(dashboardRouteSource).not.toContain("request.primaryLabel");
    expect(designSystemSource).not.toContain("current-state cards and endpoint inventory");
    expect(dashboardRouteSource).not.toContain("Open request analytics");
    expect(designSystemDocSource).not.toContain(
      "horizontal latest-requests strip above current endpoint inventory",
    );
  });

  test("workbench chat matches Paper Studio Chat (Model · Prompt only; no invent receipts)", () => {
    expect(workbenchRouteSource).toContain('title="Request"');
    expect(workbenchRouteSource).not.toContain('title="Composer"');
    expect(workbenchRouteSource).toContain('label="Model"');
    expect(workbenchRouteSource).toContain("Prompt");
    expect(workbenchRouteSource).toContain("Run request");
    expect(workbenchRouteSource).not.toContain('label="Endpoint"');
    expect(workbenchRouteSource).not.toContain('label="Routing mode"');
    expect(workbenchRouteSource).not.toContain("routingModeOverride");
    expect(workbenchRouteSource).not.toContain("Routing receipt handoff");
    expect(workbenchRouteSource).not.toContain("Execution receipts");
    expect(workbenchRouteSource).toContain("MetricStrip");
    expect(workbenchRouteSource).toContain('variant="inline"');
    expect(workbenchRouteSource).toContain("Tool calls");
    expect(workbenchRouteSource).toContain("Raw response");
    expect(workbenchRouteSource).toContain("toolExecutions");
    expect(workbenchRouteSource).toContain("durationMs");
    expect(workbenchRouteSource).toContain("size-2 shrink-0 rounded-full");
    expect(workbenchRouteSource).not.toContain('StatusPill tone="success">ok</StatusPill>');
    expect(requestsRouteSource).toContain("Recent telemetry requests");
    expect(requestsRouteSource).toContain('variant="inventory"');
    expect(requestsRouteSource).toContain("Observe · Open detail");
    expect(requestsRouteSource).toContain("MetricStrip");
    expect(requestsRouteSource).toContain("border-l-2 border-[var(--rm-accent)]");
    expect(requestsRouteSource).not.toContain("listRowClassName");
    expect(requestDetailRouteSource).toContain("Routing receipts");
    expect(requestDetailRouteSource).toContain("hybridArbitration");
  });

  test("request detail and model detail expose structured taxonomy evidence rather than raw-only telemetry", () => {
    expect(requestDetailRouteSource).toContain("Taxonomy classification");
    expect(requestDetailRouteSource).toContain("Telemetry handling");
    expect(requestDetailRouteSource).toContain("Ledger fallback only");
    expect(requestDetailRouteSource).toContain("Original role hint");
    expect(requestDetailRouteSource).toContain("Derived capabilities");
    expect(requestDetailRouteSource).toContain("predates the richer taxonomy contract");
    expect(controlModelsSource).not.toContain('summary="Model diagnostics"');
    expect(controlModelsSource).toContain("telemetryRollup?.strengths[0]");
    expect(controlModelsSource).toContain("buildSelectedModelEvidencePills");
    expect(controlModelsSource).not.toContain("Telemetry taxonomy rollup (advisory)");
    expect(controlModelsSource).not.toContain("Recent groups");
  });

  test("request detail route renders authoritative stored cost metadata", () => {
    expect(requestDetailRouteSource).toContain("effectiveCostUsd");
    expect(requestDetailRouteSource).toContain("costCalculationBasis");
    expect(requestDetailRouteSource).toContain("costCalculationVersion");
    expect(requestDetailRouteSource).toContain("selectedUncachedCostUsd");
    expect(requestDetailRouteSource).toContain("baselineMaxEligibleCostUsd");
    expect(requestDetailRouteSource).toContain("routingCostSavingsUsd");
    expect(requestDetailRouteSource).toContain("cacheCostSavingsUsd");
    expect(requestDetailRouteSource).toContain("totalAvoidedCostUsd");
    expect(requestDetailRouteSource).toContain("costBaselineSource");
    expect(requestDetailRouteSource).toContain("costSavingsSupport");
    expect(requestDetailRouteSource).not.toContain("formatUsd(actualCostUsd ?? estimatedCostUsd)");
  });

  test("request detail keeps top-line telemetry facts readable instead of compressing them into a six-column strip", () => {
    expect(requestDetailRouteSource).not.toContain("xl:grid-cols-6");
    expect(requestDetailRouteSource).toContain("xl:grid-cols-4");
  });

  test("shell header owns route metadata without duplicate page headers", () => {
    expect(appLayoutSource).toContain("ShellHeaderProvider");
    expect(appShellSource).toContain("useShellHeaderState");
    expect(appShellSource).toContain("getRuntimeRouteDefinition");
    expect(appShellSource).toContain("<Sidebar");
    expect(appShellSource).toContain("SegmentedControl");
    expect(appShellSource).toContain("buildSidebarModels");
    expect(appShellSource).toContain("subscribeTelemetryStream");
    expect(appShellSource).not.toContain("SIDEBAR_FOOTER_STUB");
    expect(appShellSource).not.toContain("function primarySectionLinkClass");
    expect(appShellSource).not.toContain("function secondaryNavLinkClass");
    expect(shellHeaderContextSource).toContain("usePageActions");
    expect(shellHeaderContextSource).toContain("useShellHeaderOverride");
    expect(pagePrimitivesSource).not.toContain("PageHeader");
    expect(pagePrimitivesSource).not.toContain("h-px w-8");
    expect(appShellSource).not.toContain("pages");
    expect(designSystemDocSource).toContain("only** route-level header");
    expect(designSystemDocSource).not.toContain("`PageHeader` begins");
    expect(designSystemDocSource).toContain(
      "Page content begins directly with template primitives (`SectionCard`, `MetricStrip`, `ChartCard`, …)",
    );
    expect(designSystemDocSource).toContain(
      "All templates assume the shell header is already visible.",
    );
    expect(designSystemSource).toContain("export function getPrimarySectionLinkClassName");
    expect(designSystemSource).toContain("export function getSecondaryNavigationLinkClassName");
    for (const template of [
      "summary-board",
      "studio-workspace",
      "registry-detail",
      "model-inventory",
      "ledger-inspector",
      "dual-console",
      "contract-reference",
      "matrix-grid",
      "system-topology",
    ]) {
      expect(designSystemDocSource).toContain(
        `\`${template}\` | Content starts under the shell header.`,
      );
    }
    for (const source of routeSources) {
      expect(source).not.toContain("<PageHeader");
      expect(source).not.toContain("PageHeader,");
    }
    expect(requestDetailRouteSource).toContain("useShellHeaderOverride");
    expect(appShellSource).not.toContain("bodyTextClassName");
    expect(appShellSource).not.toContain("<p className=");
    expect(routerRouteSource).not.toContain("usePageActions");
  });

  test("shell headers do not render section eyebrow labels", () => {
    expect(appShellSource).not.toContain('{route?.section ?? "Overview"}');
    expect(appShellSource).not.toContain("uppercase tracking-[0.24em]");
    expect(designSystemDocSource).not.toContain("section eyebrow");
  });

  test("routes do not register refresh controls as shell header actions", () => {
    for (const source of [localLlamaSwapModelsSource, localPeerModelsSource, localPeersSource]) {
      const pageActionBlocks = [...source.matchAll(/usePageActions\(([\s\S]*?)\r?\n {2}\);/g)].map(
        ([, block]) => block,
      );
      for (const block of pageActionBlocks) {
        expect(block).not.toMatch(/Refresh(?:ing…)?/);
      }
    }
  });

  test("session readiness summary uses MetricStrip panel instead of FactCard walls", () => {
    expect(sessionReadinessRouteSource).toContain('from "@role-model/ui"');
    expect(sessionReadinessRouteSource).toContain("MetricStrip");
    expect(sessionReadinessRouteSource).toContain('variant="panel"');
    expect(sessionReadinessRouteSource).not.toContain("FactCard");
    expect(sessionReadinessRouteSource).toContain("bodyStrongTextClassName");
  });

  test("production UI sources do not bypass Apple theme token primitives", () => {
    expect(
      findSourceViolations(
        /\b(?:text|border|bg)-(?:red|amber|orange|yellow|blue|gray|slate|zinc)-\d+\b/,
      ),
    ).toEqual([]);
    expect(findExactSourceViolations("text-white")).toEqual([]);
    expect(appCss).toContain("--rm-on-primary:");
    expect(designSystemDocSource).toContain("`--rm-on-primary`");
  });

  test("app css derives runtime tokens from RM3 token families with thin linear stubs only", () => {
    expect(appCss).toContain('@import "./rm3-tokens.css";');
    expect(rm3TokensCss).toContain("--rm3-background:");
    expect(rm3TokensCss).toContain("--rm3-card:");
    expect(rm3TokensCss).toContain("--rm3-muted:");
    expect(rm3TokensCss).toContain("--rm3-foreground:");
    expect(rm3TokensCss).toContain("--rm3-font-sans:");
    expect(rm3TokensCss).toContain("--rm3-font-mono:");
    expect(appCss).toContain("--rm-bg: var(--rm3-background);");
    expect(appCss).toContain("--rm-surface: var(--rm3-card);");
    expect(appCss).toContain("--rm-surface-strong: var(--rm3-secondary);");
    expect(appCss).toContain("--rm-fg: var(--rm3-foreground);");
    expect(appCss).toContain("--rm-font-display: var(--rm3-font-display);");
    expect(appCss).toContain("--rm-font-body: var(--rm3-font-sans);");
    expect(appCss).toContain("--rm-font-mono: var(--rm3-font-mono);");
    expect(appCss).toContain("--rm-pill-soft-bg:");
    expect(appCss).toContain("--rm-pill-border:");
    expect(appCss).toContain("--rm-pill-info-bg:");
    expect(appCss).toContain("--rm-pill-advisory-bg:");
    expect(appCss).toContain("--rm-radius-sm: var(--rm3-radius-lg);");
    expect(appCss).toContain("--rm-field-height: 34px;");
    expect(appCss).toContain("--rm-icon-button-size: 34px;");
    expect(appCss).not.toContain("var(--linear-radius");
    expect(appCss).not.toContain("var(--linear-space");
    expect(appCss).not.toContain("--linear-font-sans:");
    expect(appCss).not.toContain("--linear-telemetry-local:");
    // Historical Linear names remain as thin stubs only (not live authority).
    expect(appCss).toContain("--linear-bg-canvas: var(--rm3-background);");
    expect(appCss).toContain("--linear-accent-primary: var(--rm3-primary);");
  });

  test("shell chrome does not render separate card surfaces for the sidebar and header", () => {
    expect(appShellSource).not.toContain(
      "<aside\n          className={`${cardClassName} flex flex-col p-5",
    );
    expect(appShellSource).not.toContain("<header className={`${cardClassName} px-5 py-5`}>");
    expect(appShellSource).not.toContain("max-w-[var(--rm-shell-width)]");
    expect(appShellSource).not.toContain("rounded-[var(--rm-radius-shell)]");
    expect(appShellSource).toContain('from "@role-model/ui"');
    expect(appShellSource).toContain("<Sidebar");
  });

  test("shell keeps chrome fixed while only the page-content frame scrolls", () => {
    expect(appShellSource).toContain("useRef");
    expect(appShellSource).toContain("contentScrollRef");
    expect(appShellSource).toContain('scrollTo({ top: 0, behavior: "auto" })');
    expect(appShellSource).toContain(
      'className="flex h-screen w-full overflow-hidden bg-background text-foreground"',
    );
    expect(appShellSource).not.toContain("max-w-[var(--rm-shell-width)]");
    expect(appShellSource).not.toContain("px-10 py-10");
    expect(appShellSource).not.toContain("rounded-[var(--rm-radius-shell)]");
    expect(appShellSource).toContain("<Sidebar");
    expect(appShellSource).toContain("<SubPageHeaderBar");
    expect(appShellSource).not.toContain(
      'className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-border px-4"',
    );
    expect(appShellSource).toContain("<PageContent");
    expect(appShellSource).toContain('className="runtime-shell-content-scroll"');
    expect(runtimeTheme.maxContentWidth).toBe("1216px");
    expect(appCss).toContain(".runtime-shell-content-scroll");
    expect(appCss).toContain("scrollbar-width: none;");
    expect(appCss).toContain(".runtime-shell-content-scroll::-webkit-scrollbar");
    expect(designSystemDocSource).toContain("only the page-content frame scrolls");
    expect(designSystemDocSource).toContain("content-frame scrollbar is hidden");
  });

  test("shell navigation follows the text-first Paper runtime shell without route icons", () => {
    expect(appShellSource).not.toContain("<section.icon");
    expect(appShellSource).not.toContain("<item.icon");
    expect(appShellSource).toContain("runtimeNavigationSections");
    expect(appShellSource).toContain("SegmentedControl");
    expect(appShellSource).toContain('size="md"');
    expect(appShellSource).not.toContain('size="sm"');
    expect(appShellSource).toContain("useNavigate");
    expect(appShellSource).toContain("getRuntimeRouteDefinition");
  });

  test("design system doc records the Paper text-only shell and compact evidence preview rules", () => {
    expect(designSystemDocSource).toContain("Sidebar navigation is text-only");
    expect(designSystemDocSource).toContain("No visible divider separates the sidebar");
    expect(designSystemDocSource).toContain("Overview analytics empty states stay compact");
    expect(designSystemDocSource).toContain(
      "Configured-model detail code blocks show the compact preview payload",
    );
    expect(designSystemDocSource).toContain(
      "Compact advanced-filter rows use `DisclosureSection` in compact mode",
    );
    expect(designSystemDocSource).toContain("grouped category rows with a leading checkbox");
    expect(designSystemDocSource).toContain("`--rm-pill-info-bg`");
    expect(designSystemDocSource).toContain("`--rm-pill-advisory-bg`");
  });

  test("design artifacts clearly separate the current runtime authority from the historical Apple reference", () => {
    expect(designSystemDocSource).toContain(
      "The intended visual source of truth for both the design system and the actual runtime page implementations is the **Paper RM3** design file",
    );
    expect(designSystemDocSource).toContain(
      "Approved runtime implementation may temporarily lead Paper",
    );
    expect(designSystemDocSource).toContain(
      "Paper must be resynced after approved design/code changes",
    );
    expect(designSystemDocSource).toContain(
      "older Apple reference, or the superseded **Paper Linear review** board as current runtime UI authority",
    );
    expect(appleReferenceDocSource).toContain("This document is historical reference only.");
    expect(appleReferenceDocSource).toContain(
      "It is **not** the active authority for the runtime UI.",
    );
    expect(appleReferenceDocSource).toContain("The active repo-owned authority is");
    expect(appleReferenceDocSource).toContain(
      "The current runtime shell follows the Paper RM3 design system",
    );
  });

  test("design system doc includes page-by-page layout and content contracts for live runtime pages", () => {
    expect(designSystemDocSource).toContain("## Per-page layout and content contracts");
    expect(designSystemDocSource).toContain(
      "This section is the repo-owned page-by-page source of truth for live runtime pages.",
    );
    expect(designSystemDocSource).toContain(
      "the canonical implementation record when Paper temporarily lags the latest approved runtime UI",
    );
    for (const routePath of [
      "/app",
      "/app/studio/chat",
      "/app/studio/images",
      "/app/studio/audio",
      "/app/studio/rerank",
      "/app/studio/advanced",
      "/app/remote/providers",
      "/app/models",
      "/app/models/roles",
      "/app/models/benchmark",
      "/app/router",
      "/app/router/strategy",
      "/app/router/controller",
      "/app/router/candidates",
      "/app/router/decisions",
      "/app/router/decisions/:requestId",
      "/app/local/choose",
      "/app/local/endpoints",
      "/app/local/peer-models",
      "/app/local/llama-swap/models",
      "/app/local/llama-swap/swap",
      "/app/local/llama-swap/policy",
      "/app/local/llama-swap/logs",
      "/app/local/llama-swap/matrix",
      "/app/connect",
      "/app/observe/activity",
      "/app/observe/requests",
      "/app/observe/routing",
      "/app/observe/requests/:requestId",
      "/app/observe/logs",
      "/app/connect/downstream",
      "/app/connect/upstream",
      "/app/system/runtime",
      "/app/system/runtime-config",
      "/app/system/session-readiness",
      "/app/system/peers",
    ]) {
      expect(designSystemDocSource).toContain(`| \`${routePath}\` |`);
    }
    expect(designSystemDocSource).toContain(
      "Redirect-only routes inherit the contract of their live destination",
    );
    expect(designSystemDocSource).toContain(
      "Advanced controls stay behind a compact expand/collapse row",
    );
    expect(designSystemDocSource).toContain("Role groups default collapsed");
    expect(designSystemDocSource).toContain("Model pool");
  });

  test("shell typography and pill navigation follow the Paper runtime shell scale", () => {
    expect(designSystemSource).toContain("export const displayTitleClassName =");
    expect(designSystemSource).toContain(
      '"[font-family:var(--rm-font-display)] text-[22px] font-normal leading-[28px] tracking-[-0.018em]"',
    );
    expect(designSystemSource).toContain(
      'export const navLabelClassName = "text-[13px] font-normal leading-[18px] tracking-[0em]"',
    );
    expect(designSystemSource).toContain("min-h-[31px]");
    expect(designSystemSource).toContain("bg-primary !text-primary-foreground");
    expect(designSystemSource).toContain("bg-[var(--rm-panel-muted)] text-[var(--rm-secondary)]");
  });

  test("shared form controls and telemetry filter pills stay at sidebar-scale typography", () => {
    expect(designSystemSource).toContain("export const fieldClassName =");
    expect(designSystemSource).toContain(
      '"w-full min-h-[34px] rounded-md border border-input bg-background px-3 py-1.5 font-sans !text-[13px] !font-normal !leading-[18px] !tracking-[0em] text-foreground shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"',
    );
    expect(designSystemSource).toContain("export const selectFieldClassName =");
    expect(designSystemSource).toContain(
      '"w-full h-[34px] min-h-[34px] rounded-md border border-input bg-background py-0 pl-3 pr-9 text-left font-sans !text-[13px] !font-normal !leading-[18px] !tracking-[0em] text-foreground shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"',
    );
    expect(designSystemSource).toMatch(
      /export const fieldLabelClassName =\s*"font-sans text-xs leading-4 text-foreground"/,
    );
    expect(designSystemSource).toContain(
      "h-[34px] min-h-[34px] items-center justify-center rounded-[var(--rm-radius-field)]",
    );
    expect(telemetryChartsSource).not.toContain("StatusPill");
    expect(telemetryChartsSource).toContain("TelemetryChartStateBadge");
    expect(telemetryControlsSource).toContain("SegmentedControl");
    expect(telemetryControlsSource).toContain('aria-label="Telemetry time range"');
    expect(telemetryControlsSource).toContain("fieldLabelClassName");
    expect(telemetryControlsSource).not.toContain("utilityLabelClassName");
    expect(telemetryControlsSource).not.toContain(
      "inline-flex min-h-[32px] items-center justify-center",
    );
    expect(themedSelectSource).toContain("h-[34px] min-h-[34px]");
    expect(themedSelectSource).not.toContain("min-h-[44px]");
    expect(themedSelectSource).toContain("bg-[var(--rm-panel)] text-[var(--rm-fg)]");
    expect(themedSelectSource).not.toContain(
      "bg-[var(--rm-accent)] text-[color:var(--rm-on-primary)]",
    );
    expect(themedSelectSource).toContain("block ${navLabelClassName}");
    expect(pagePrimitivesSource).toContain("fieldLabelClassName");
    expect(pagePrimitivesSource).not.toContain("pillLabelClassName");
    expect(pagePrimitivesSource).not.toContain("utilityLabelClassName");
    expect(pagePrimitivesSource).toContain("bg-accent text-accent-foreground");
    expect(pagePrimitivesSource).not.toContain(
      "bg-[var(--rm-accent)] text-[color:var(--rm-on-primary)]",
    );
  });

  test("content-frame headings step down below the shell page title scale", () => {
    expect(designSystemSource).toContain("export const sectionTitleClassName =");
    expect(designSystemSource).toContain(
      '"text-sm font-semibold leading-5 tracking-tight text-foreground"',
    );
    expect(designSystemSource).toContain(
      'export const inlineTitleClassName = "text-[16px] font-semibold leading-[22px] text-[var(--rm-fg)]"',
    );
    expect(designSystemSource).toContain(
      'export const compactTitleClassName = "text-[15px] font-semibold leading-5 text-[var(--rm-fg)]"',
    );
  });

  test("accent-filled actions keep a light foreground for stronger token contrast", () => {
    expect(appCss).toContain("--rm-on-primary: var(--rm3-primary-foreground);");
    expect(appCss).toContain("--rm-pill-accent-ink: var(--rm3-light-primary-foreground);");
    expect(appCss).toContain("--rm-pill-success-ink: var(--rm3-light-chart-cache);");
    // Anchor color must not inherit over primary Link CTA ink.
    expect(appCss).toContain("@layer base");
    expect(appCss).not.toMatch(/@layer base\s*\{[\s\S]*?a\s*\{[\s\S]*?color:\s*inherit/);
    expect(designSystemSource).toContain("primaryButtonClassName =");
    expect(designSystemSource).toContain("!text-primary-foreground");
  });

  test("remote provider action feedback uses a block success notice, not pill badge tokens", () => {
    expect(designSystemSource).toContain("successNoticeClassName");
    expect(designSystemSource).toContain("bg-[var(--rm-success-subtle)]");
    expect(designSystemSource).toContain("text-[var(--rm-success)]");
    expect(providersRouteSource).toContain("successNoticeClassName");
    expect(providersRouteSource).not.toContain("rm-pill-success-bg");
    expect(appCss).toContain("--rm-success: var(--rm3-chart-cache);");
  });

  test("production UI sources keep the approved Apple radius grammar", () => {
    expect(findExactSourceViolations("rounded-none")).toEqual([]);
  });

  test("production UI sources avoid unsupported Apple typography weight 500", () => {
    expect(findExactSourceViolations("font-medium")).toEqual([]);
  });

  test("chart primitives use shared design-system geometry and type tokens", () => {
    expect(designSystemSource).toContain("chartAxisTickStyle");
    expect(designSystemSource).toContain("chartBarRadius");
    expect(chartHorizontalRankingLegend).toEqual({
      placement: "bottom",
      axisCategoryWidth: 0,
    });
    expect(telemetryChartsSource).toContain("chartAxisTickStyle");
    expect(telemetryChartsSource).toContain("chartBarRadius");
    expect(telemetryChartsSource).toContain("chartHorizontalRankingLegend");
    expect(telemetryChartsSource).toContain(
      "data-chart-horizontal-legend={chartHorizontalRankingLegend.placement}",
    );
    expect(telemetryChartsSource).toContain('data-chart-horizontal-plot="true"');
    expect(telemetryChartsSource).toContain("resolveTimeSeriesLayout");
    expect(telemetryChartsSource).toContain("style={{ height: layout.plotHeight }}");
    expect(telemetryChartsSource).not.toContain('className="h-[280px] w-full"');
    expect(telemetryChartsSource).not.toContain("width={128}");
    expect(telemetryChartsSource).not.toContain("fontSize: 12");
    expect(telemetryChartsSource).not.toContain("fontSize: 13");
    expect(telemetryChartsSource).not.toContain("radius={[8, 8, 0, 0]}");
    expect(telemetryChartsSource).not.toContain("radius={[0, 8, 8, 0]}");
    expect(telemetryChartLayoutContract.plotMargin).toEqual({
      top: 4,
      right: 0,
      bottom: 0,
      left: 0,
    });
    expect(
      resolveTelemetryChartLayout({ leftTickLabels: ["0", "120,000"] }).leftAxisGutter,
    ).toBeGreaterThan(40);
  });

  test("telemetry chart states are shared design-system vocabulary", () => {
    expect(Object.keys(telemetryChartStates)).toEqual([
      "loading",
      "refreshing",
      "empty",
      "unsupported",
      "partial",
      "truncated",
      "error",
      "populated",
    ]);
    expect(telemetryChartStates.unsupported).toEqual(
      expect.objectContaining({
        tone: "warning",
      }),
    );
    for (const stateName of Object.keys(telemetryChartStates)) {
      expect(designSystemDocSource).toContain(`\`${stateName}\``);
    }
    expect(designSystemDocSource).toContain(
      "background refresh keeps the last populated chart visible",
    );
    expect(designSystemDocSource).toContain(
      "initial chart-request failures render per-card error states instead of collapsing the entire analytics page",
    );
  });

  test("runtime route definitions stay slim and future scaffolds avoid duplicate header props", () => {
    expect(designSystemSource).not.toMatch(/\beyebrow:/);
    expect(designSystemSource).not.toMatch(/\bnoteTitle:/);
    expect(designSystemSource).not.toMatch(/\bnoteBody:/);
    expect(designSystemSource).not.toContain("readonly eyebrow:");
    expect(designSystemSource).not.toContain("readonly noteTitle:");
    expect(designSystemSource).not.toContain("readonly noteBody:");
    expect(getRuntimeRouteDefinition("/app/local/llama-swap/models")).toEqual(
      expect.objectContaining({
        section: "Local",
        title: "Llama-swap models",
      }),
    );
    expect(Object.keys(getRuntimeRouteDefinition("/app") ?? {})).not.toContain("eyebrow");
    expect(pagePrimitivesSource).toContain("DisclosureSection");
    expect(pagePrimitivesSource).toContain("group-open:rotate-180");
    expect(pagePrimitivesSource).toContain('aria-hidden="true"');
    expect(requestDetailRouteSource).toContain("DisclosureSection");
    expect(designSystemDocSource).toContain(
      "usePageActions()` only — not `RuntimeRouteDefinition`",
    );
  });

  test("disclosure summaries use compact body tokens instead of section-heading scale", () => {
    expect(pagePrimitivesSource).toContain(
      "${compact ? navLabelClassName : bodyStrongTextClassName}",
    );
  });
});
