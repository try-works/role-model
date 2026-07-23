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
import RouterConfigRoute from "../routes/router-config";
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

const appCss = readFileSync(new URL("../app.css", import.meta.url), "utf8");
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
const telemetryChartsSource = readFileSync(
  new URL("../components/telemetry-charts.tsx", import.meta.url),
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
const routerConfigRouteSource = readFileSync(
  new URL("../routes/router-config.tsx", import.meta.url),
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

  test("keeps the shell on the Paper Linear baseline with explicit chart tokens", () => {
    expect(runtimeTheme.maxContentWidth).toBe("1840px");
    expect(runtimeTheme.radii.sm).toBe("8px");
    expect(runtimeTheme.radii.md).toBe("12px");
    expect(runtimeTheme.radii.lg).toBe("16px");
    expect(runtimeTheme.radii.pill).toBe("9999px");
    expect(runtimeTheme.radii.shell).toBe("28px");
    expect(runtimeTheme.radii.panel).toBe("16px");
    expect(runtimeTheme.radii.field).toBe("12px");
    expect(runtimeTheme.radii.badge).toBe("9999px");
    expect(runtimeTheme.colors.light).toEqual({
      bg: "#FFFFFF",
      panelMuted: "#ECEEF2",
      surface: "#F7F8F8",
      surfaceStrong: "#FFFFFF",
      panel: "#F3F4F6",
      fg: "#0F1115",
      secondary: "#3A4150",
      muted: "#69707D",
      border: "#E3E6EC",
      borderStrong: "#CED3DE",
      accent: "#5E6AD2",
      accentInk: "#5E6AD2",
      accentFocus: "#828FFF",
      accentOnDark: "#828FFF",
      accentMuted: "rgba(94, 106, 210, 0.78)",
      accentSubtle: "rgba(94, 106, 210, 0.14)",
      accentGhost: "rgba(94, 106, 210, 0.08)",
      dividerSoft: "#E3E6EC",
      hairline: "#E3E6EC",
      chipTranslucent: "rgba(9, 11, 17, 0.06)",
      onPrimary: "#FFFFFF",
      telemetryLocal: "#0F1115",
      telemetryRemote: "#5E6AD2",
      telemetryHealthy: "#27A644",
      telemetryDegraded: "#B67A11",
      telemetryRaw: "#69707D",
      error: "#D84F6A",
      errorMuted: "rgba(216, 79, 106, 0.76)",
      errorSubtle: "rgba(216, 79, 106, 0.14)",
      errorGhost: "rgba(216, 79, 106, 0.10)",
      success: "#27A644",
      successMuted: "rgba(39, 166, 68, 0.76)",
      successSubtle: "rgba(39, 166, 68, 0.10)",
      warning: "#B67A11",
      warningMuted: "rgba(182, 122, 17, 0.78)",
      warningSubtle: "rgba(182, 122, 17, 0.14)",
      info: "#3F87F5",
      advisory: "#9664E8",
    });
    expect(runtimeTheme.colors.dark).toEqual({
      bg: "#010102",
      surface: "#0F1011",
      surfaceStrong: "#141516",
      panel: "#18191A",
      panelMuted: "#191A1B",
      fg: "#F7F8F8",
      secondary: "#D0D6E0",
      muted: "#8A8F98",
      border: "#23252A",
      borderStrong: "#34343A",
      accent: "#5E6AD2",
      accentInk: "#F7F8F8",
      accentFocus: "#828FFF",
      accentOnDark: "#828FFF",
      accentMuted: "rgba(130, 143, 255, 0.86)",
      accentSubtle: "rgba(94, 106, 210, 0.20)",
      accentGhost: "rgba(94, 106, 210, 0.12)",
      dividerSoft: "rgba(247, 248, 248, 0.06)",
      hairline: "#23252A",
      chipTranslucent: "rgba(247, 248, 248, 0.08)",
      onPrimary: "#FFFFFF",
      telemetryLocal: "#9DA8C8",
      telemetryRemote: "#5E6AD2",
      telemetryHealthy: "#27A644",
      telemetryDegraded: "#D9A441",
      telemetryRaw: "#62666D",
      error: "#E06C89",
      errorMuted: "rgba(224, 108, 137, 0.82)",
      errorSubtle: "rgba(224, 108, 137, 0.20)",
      errorGhost: "rgba(255, 125, 166, 0.10)",
      success: "#27A644",
      successMuted: "rgba(39, 166, 68, 0.82)",
      successSubtle: "rgba(39, 166, 68, 0.14)",
      warning: "#D9A441",
      warningMuted: "rgba(217, 164, 65, 0.82)",
      warningSubtle: "rgba(217, 164, 65, 0.12)",
      info: "#6EA8FF",
      advisory: "#B479FF",
    });
    expect(designSystemSource).toContain("chartColors");
    expect(designSystemSource).toContain('"observe-routing"');
    expect(appCss).toContain("--rm-chart-local:");
    expect(appCss).toContain("--rm-chart-remote:");
    expect(appCss).toContain("--rm-chart-ink: #171717;");
    expect(appCss).toContain("--rm-chart-cyan: #9da8c8;");
    expect(appCss).toContain("--rm-chart-highlight-pink: #d95d7b;");
    expect(appCss).toContain("--rm-chart-violet: #8a78ff;");
    expect(appCss).toContain("--rm-chart-link-blue: var(--linear-accent-primary);");
    expect(appCss).toContain("--rm-chart-warning-soft: #fff1cd;");
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
    expect(upstreamMarkup).toContain("/upstream/");
    expect(upstreamMarkup).not.toContain("Boundary notes");
    expect(upstreamMarkup).not.toContain("When to use `/upstream/`");
    expect(upstreamMarkup).not.toContain("Open preserved UI");
    expect(integrationsDownstreamRouteSource).toContain("Connection contract");
    expect(integrationsDownstreamRouteSource).toContain("Consumer setup");
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
    expect(peersMarkup).toContain("Peer contract fields");
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
    expect(endpointsRouteSource).toContain("View alias posture");
    expect(endpointsRouteSource).toContain("Runtime connections");
    expect(endpointsRouteSource).not.toContain('title="Configured providers"');
    expect(endpointsRouteSource).not.toContain('title="Runtime endpoint rows"');
    expect(providersRouteSource).toContain("LiteLLM");
    expect(providersRouteSource).toContain("Models.dev metadata");
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
    expect(sessionReadinessRouteSource).toContain("buildArchivedArtifactRows");
    expect(sessionReadinessRouteSource).toContain("Archived stale diagnostics");
    expect(sessionReadinessRouteSource).not.toContain("Related surfaces");
    expect(sessionReadinessRouteSource).not.toContain("Runtime topology");
    expect(sessionReadinessRouteSource).not.toContain("Remote providers");
    expect(workbenchRouteSource).toContain("buildCredentialLifecycleBanner");
    expect(studioAdvancedRouteSource).toContain("buildCredentialLifecycleBanner");
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
    expect(routerRouteSource).toContain('label: "Active alias"');
    expect(routerRouteSource).toContain("Browse all alias pools");
    expect(routerRouteSource).toContain("Alias readiness");
    expect(routerRouteSource).toContain("Alias modes");
    expect(routerRouteSource).toContain('label: "Strategy"');
    expect(routerRouteSource).toContain('value: configuredStrategy ?? "unset"');
    expect(routerRouteSource).toContain('label: "Execution mode"');
    expect(routerRouteSource).toContain('value: configuredExecutionMode ?? "decision_only"');
    expect(routerRouteSource).toContain("const configuredAliasRows");
    expect(routerRouteSource).toContain("Config-owned posture");
    expect(routerRouteSource).toContain("Alias source of truth");
    expect(routerRouteSource).not.toContain("FactCard");
    expect(routerRouteSource).not.toContain("const aliasInventory = summary?.aliasInventory");
    expect(routerRouteSource).toContain("Candidate expansion");
    expect(routerRouteSource).not.toContain("Resolved models");
  });

  test("router overview lists the concrete candidate endpoints behind routing posture", () => {
    expect(routerRouteSource).toContain("fetchRouterCandidates");
    expect(routerRouteSource).toContain("Routing candidates");
    expect(routerRouteSource).toContain('StatusPill tone="accent">active</StatusPill>');
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

  test("routing strategy benchmark advisory does not leak JSX control flow as page text", () => {
    expect(controlRoutingStrategySource).toContain("{candidates.length === 0 ? (");
    expect(controlRoutingStrategySource).not.toContain(
      "        candidates.length === 0 ? (\r\n        <p",
    );
    expect(controlRoutingStrategySource).not.toContain("\r\n        )\r\n        <div");
  });

  test("routing strategy settings separate saved posture from draft edits and refresh derived state after save", () => {
    expect(controlRoutingStrategySource).toContain("Saved routing settings");
    expect(controlRoutingStrategySource).toContain("Draft selection");
    expect(controlRoutingStrategySource).toContain("hasUnsavedChanges");
    expect(controlRoutingStrategySource).toContain("onChange={() => onChange(value)}");
    expect(controlRoutingStrategySource).not.toContain("onClick={() => onChange(value)}");
    expect(controlRoutingStrategySource).toContain("await loadState();");
    expect(controlRoutingStrategySource).not.toContain("void Promise.all([");
  });

  test("routing strategy follows the Paper in-page rail layout without shell action buttons", () => {
    expect(controlRoutingStrategySource).not.toContain("usePageActions");
    expect(controlRoutingStrategySource).not.toContain("Advanced config");
    expect(controlRoutingStrategySource).not.toContain("Router detail");
    expect(controlRoutingStrategySource).toContain(
      "xl:grid-cols-[minmax(0,1fr)_minmax(320px,372px)]",
    );
    expect(controlRoutingStrategySource).toContain("grid gap-3 xl:grid-cols-3");
  });

  test("routing controller uses the tokenized registry-detail split instead of generic summary strips", () => {
    expect(controlControllerSource).toContain("Controller assignment");
    expect(controlControllerSource).toContain("Candidate posture");
    expect(controlControllerSource).toContain("controller assigned");
    expect(controlControllerSource).toContain("summarizeRoleCoverage");
    expect(controlControllerSource).toContain("Role coverage");
    expect(controlControllerSource).toContain("xl:grid-cols-[minmax(0,1fr)_minmax(320px,372px)]");
    expect(controlControllerSource).toContain("utilityLabelClassName");
    expect(controlControllerSource).toContain("cardClassName");
    expect(controlControllerSource).not.toContain("Current assignment");
    expect(controlControllerSource).not.toContain("grid gap-3 md:grid-cols-3");
  });

  test("routing candidates use a ledger-style inventory rail instead of detached fact cards", () => {
    expect(routerCandidatesRouteSource).toContain("Candidate inventory");
    expect(routerCandidatesRouteSource).toContain("Candidate posture");
    expect(routerCandidatesRouteSource).toContain("const availableCandidates = candidates ?? [];");
    expect(routerCandidatesRouteSource).toContain("summarizeRoleCoverage");
    expect(routerCandidatesRouteSource).toContain(
      "xl:grid-cols-[minmax(0,1fr)_minmax(320px,372px)]",
    );
    expect(routerCandidatesRouteSource).toContain("cardClassName");
    expect(routerCandidatesRouteSource).toContain("utilityLabelClassName");
    expect(routerCandidatesRouteSource).not.toContain("FactCard");
    expect(routerCandidatesRouteSource).not.toContain("grid gap-4 md:grid-cols-3");
  });

  test("routing decisions use a ledger rail instead of a KPI strip", () => {
    expect(routerDecisionsRouteSource).toContain("Decision ledger");
    expect(routerDecisionsRouteSource).toContain("Decision posture");
    expect(routerDecisionsRouteSource).toContain("Latest decision");
    expect(routerDecisionsRouteSource).toContain(
      "xl:grid-cols-[minmax(0,1fr)_minmax(320px,372px)]",
    );
    expect(routerDecisionsRouteSource).not.toContain("FactCard");
    expect(routerDecisionsRouteSource).not.toContain("grid gap-4 md:grid-cols-3");
  });

  test("routing config is a first-class read-only provenance surface instead of a redirect", () => {
    expect(routerConfigRouteSource).toContain("fetchRuntimeConfig");
    expect(routerConfigRouteSource).toContain("fetchControllerAssignment");
    expect(routerConfigRouteSource).toContain("fetchRouterSummary");
    expect(routerConfigRouteSource).toContain("Persisted config record");
    expect(routerConfigRouteSource).toContain("Controller context");
    expect(routerConfigRouteSource).toContain("Policy inputs");
    expect(routerConfigRouteSource).not.toContain("Navigate");
  });

  test("meta-guidance panels stay removed from overview and observe routes", () => {
    expect(dashboardRouteSource).not.toContain("Reading order");
    expect(requestsRouteSource).not.toContain("Inspection path");
    expect(requestsRouteSource).not.toContain("Adjacent surfaces");
    expect(observeActivityRouteSource).not.toContain("Reading order");
    expect(routerConfigRouteSource).not.toContain("Editing boundary");
    expect(routerConfigRouteSource).not.toContain("Where to edit");
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
    expect(controlControllerSource).toContain("No controller is assigned yet");
    expect(runtimeRouteSource).toContain("No controller assigned");
  });

  test("applies the Paper Linear palette, bundled Inter typography, and explicit theme contract in shared app chrome", () => {
    expect(appCss).toContain("--rm-font-display: var(--linear-font-display);");
    expect(appCss).toContain("--rm-font-body: var(--linear-font-sans);");
    expect(appCss).not.toContain("SF Pro");
    expect(designSystemDocSource).toContain("Paper Linear review design-system board");
    expect(designSystemDocSource).toContain("Status pills use solid token-backed backgrounds");
    expect(designSystemDocSource).toContain('"Inter", "Segoe UI", sans-serif');
    expect(designSystemDocSource).toContain(
      '"IBM Plex Mono", "JetBrains Mono", ui-monospace, monospace',
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
    expect(appCss).toContain('@font-face {\n  font-family: "Inter";');
    expect(appCss).toContain('url("/assets/fonts/inter-latin-400-normal.woff2")');
    expect(appCss).toContain('url("/assets/fonts/inter-latin-600-normal.woff2")');
    expect(appCss).toContain('url("/assets/fonts/inter-latin-700-normal.woff2")');
    expect(appCss).toContain('@font-face {\n  font-family: "IBM Plex Mono";');
    expect(appCss).toContain('url("/assets/fonts/ibm-plex-mono-latin-400-normal.woff2")');
    expect(appCss).toContain('url("/assets/fonts/ibm-plex-mono-latin-500-normal.woff2")');
    expect(appCss).toContain('url("/assets/fonts/ibm-plex-mono-latin-600-normal.woff2")');
    expect(appCss).toContain(
      '--linear-font-sans: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;',
    );
    expect(appCss).toContain(
      '--linear-font-display: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;',
    );
    expect(appCss).toContain('--linear-font-mono: "IBM Plex Mono", ui-monospace, monospace;');
    expect(appCss).toContain("font-synthesis-weight: none;");
    expect(appCss).toContain("--rm-shadow-product: 0 3px 5px 30px rgb(0 0 0 / 22%);");
    expect(appCss).not.toContain("--rm-shadow-product: 0 24px 80px rgba(0, 0, 0, 0.22);");
    expect(appCss).toContain("--rm-bg: var(--linear-light-canvas);");
    expect(appCss).toContain("--rm-surface: var(--linear-light-surface-1);");
    expect(appCss).toContain("--rm-panel: var(--linear-light-surface-2);");
    expect(appCss).toContain("--rm-accent: var(--linear-accent-primary);");
    expect(appCss).toContain('html[data-theme="light"]');
    expect(appCss).toContain('html[data-theme="dark"]');
    expect(appCss).toContain("appearance: none;");
    expect(appCss).toContain("background-image: var(--rm-select-chevron);");
    expect(rootSource).toContain('meta name="color-scheme" content="light dark"');
    expect(rootSource).not.toContain("fonts.googleapis.com");
    expect(rootSource).not.toContain("fonts.gstatic.com");
    expect(rootSource).toContain('meta name="theme-color" content="#010102"');
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

  test("keeps shared states on solid token-backed pills and no section divider chrome", () => {
    expect(pagePrimitivesSource).toContain(
      "bg-[var(--rm-pill-accent-bg)] text-[var(--rm-pill-accent-ink)]",
    );
    expect(pagePrimitivesSource).toContain(
      "bg-[var(--rm-pill-warning-bg)] text-[var(--rm-pill-warning-ink)]",
    );
    expect(pagePrimitivesSource).toContain(
      "bg-[var(--rm-pill-success-bg)] text-[var(--rm-pill-success-ink)]",
    );
    expect(pagePrimitivesSource).toContain(
      "bg-[var(--rm-pill-error-bg)] text-[var(--rm-pill-error-ink)]",
    );
    expect(pagePrimitivesSource).not.toContain("bg-transparent text-[var(--rm-accent)]");
    expect(pagePrimitivesSource).not.toContain("border-b border-[var(--rm-border)] pb-4");
    expect(pagePrimitivesSource).not.toContain("border-t border-[var(--rm-border)] pt-4");
    expect(appShellSource).not.toContain("border-b border-[var(--rm-border)] pb-5");
    expect(appShellSource).not.toContain("border-t border-[var(--rm-border)] pt-4");
    expect(appShellSource).toContain("ThemeToggle");
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

  test("configured models keeps the selected detail compact and moves deep diagnostics behind a disclosure", () => {
    expect(controlModelsSource).toContain(
      "xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.92fr)] 2xl:grid-cols-[minmax(0,760px)_minmax(0,1fr)]",
    );
    expect(controlModelsSource).toContain('summary="Model diagnostics"');
    expect(controlModelsSource).toContain('summary="Edit role bindings"');
  });

  test("benchmark score badges use a dedicated centered circular badge instead of loose pill text", () => {
    expect(controlBenchmarkSource).toContain("const benchmarkScoreBadgeClassName =");
    expect(controlBenchmarkSource).toContain("items-center justify-center rounded-full");
    expect(controlBenchmarkSource).toContain("shrink-0");
    expect(controlBenchmarkSource).toContain("text-center");
    expect(controlBenchmarkSource).toContain("[font-family:var(--rm-font-display)]");
    expect(controlBenchmarkSource).toContain("leading-none");
    expect(controlBenchmarkSource).toContain("[font-variant-numeric:tabular-nums]");
    expect(controlBenchmarkSource).not.toContain(
      '<StatusPill tone="success">{formatScore(row.overallScore)}</StatusPill>',
    );
  });

  test("benchmark page keeps controls and scores in a single runtime column", () => {
    expect(controlBenchmarkSource).toContain('title="Benchmark scores"');
    expect(controlBenchmarkSource).not.toContain('title="Model scores and routing profiles"');
    expect(controlBenchmarkSource).toContain('className="grid gap-4 xl:grid-cols-3"');
    expect(controlBenchmarkSource).not.toContain(
      'className="grid gap-6 xl:items-start xl:grid-cols-[minmax(0,760px)_minmax(0,1fr)]"',
    );
    expect(controlBenchmarkSource).toContain('title="Taxonomy dimensions"');
    expect(controlBenchmarkSource).toContain("Run capability benchmark");
    expect(controlBenchmarkSource).toContain("Run history");
    expect(controlBenchmarkSource.indexOf('title="Run capability benchmark"')).toBeLessThan(
      controlBenchmarkSource.indexOf('title="Benchmark scores"'),
    );
    expect(controlBenchmarkSource).toContain(
      "Only benchmark-runnable endpoints appear in the active checklist.",
    );
    expect(controlBenchmarkSource).toContain('summary="Excluded by current execution mode"');
    expect(controlBenchmarkSource).not.toContain('className="grid gap-3 xl:grid-cols-2"');
    expect(controlBenchmarkSource).toContain('className="grid gap-3"');
    expect(controlBenchmarkSource).toContain("excludedCandidates.map((candidate) => (");
    expect(controlBenchmarkSource).not.toContain("candidates.map((candidate) => (");
    expect(controlBenchmarkSource).not.toContain(
      'className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]"',
    );
  });

  test("benchmark page shows populated preview content when runtime data is empty", () => {
    expect(controlBenchmarkSource).toContain("Preview routing profile inventory");
    expect(controlBenchmarkSource).toContain("role.planner");
    expect(controlBenchmarkSource).toContain("bench-2026-07-04-full");
    expect(controlBenchmarkSource).toContain(
      "items-end gap-3 md:w-[120px] md:shrink-0 md:self-start",
    );
    expect(controlBenchmarkSource).toContain("flex flex-col items-end gap-2");
    expect(controlBenchmarkSource).toContain(
      "self-end whitespace-nowrap rounded-[var(--rm-radius-pill)]",
    );
    expect(controlBenchmarkSource).not.toContain("flex flex-wrap items-start justify-end gap-2");
    expect(controlBenchmarkSource).not.toContain(
      "className={`${secondaryButtonClassName} w-full`}",
    );
    expect(controlBenchmarkSource).not.toContain(
      "No benchmark scores are in routing profiles yet. Run the benchmark to grade each configured model and update observed routing profiles.",
    );
    expect(controlBenchmarkSource).not.toContain(
      "No taxonomy dimension data is available yet. Benchmark results with taxonomy-tagged cases will appear here.",
    );
    expect(controlBenchmarkSource).not.toContain("No completed benchmark runs yet.");
  });

  test("benchmark page uses shared text tokens instead of route-local hardcoded typography", () => {
    expect(controlBenchmarkSource).toContain("metaTextClassName");
    expect(controlBenchmarkSource).toContain("inlineTitleClassName");
    expect(controlBenchmarkSource).toContain("compactTitleClassName");
    expect(controlBenchmarkSource).toContain("supportingTextClassName");
    expect(controlBenchmarkSource).toContain("foregroundEmphasisClassName");
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
    expect(runtimeRouteSource).toContain("xl:grid-cols-[minmax(0,1.08fr)_minmax(280px,0.72fr)]");
    expect(runtimeRouteSource).toContain("Lifecycle summary");
    expect(runtimeRouteSource).toContain("Controller posture");
    expect(runtimeRouteSource).toContain("Applied runtime policy");
    expect(runtimeRouteSource).toContain("fetchRuntimeShellSnapshot");
    expect(runtimeRouteSource).toContain("Runtime config");
    expect(runtimeRouteSource).not.toContain("Open session readiness");
    expect(runtimeRouteSource).not.toContain("md:grid-cols-3");

    expect(controlRuntimeConfigSource).toContain('title="Page actions"');
    expect(controlRuntimeConfigSource).toContain(
      "xl:grid-cols-[minmax(0,1fr)_minmax(240px,0.28fr)]",
    );
    expect(controlRuntimeConfigSource).not.toContain("usePageActions(");

    expect(sessionReadinessRouteSource).toContain(
      "xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.72fr)]",
    );
    expect(sessionReadinessRouteSource).toContain("Session bootstrap");
    expect(sessionReadinessRouteSource).toContain("Canonical lifecycle");
    expect(sessionReadinessRouteSource).toContain("Operator intent manifest");
    expect(sessionReadinessRouteSource).toContain("Alias drift warnings");

    expect(systemPeersRouteSource).toContain("xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.68fr)]");
    expect(systemPeersRouteSource).toContain("fetchPeers");
    expect(systemPeersRouteSource).toContain("Peer config inventory");
    expect(systemPeersRouteSource).toContain("Auth configured");
    expect(systemPeersRouteSource).toContain("Peer contract fields");
  });

  test("remote, models, router, and system runtime config routes are first-class pages in the retained taxonomy", () => {
    expect(
      renderRoute("/app/router/strategy", createElement(ControlRoutingStrategyRoute)),
    ).toContain("Loading routing strategy");
    expect(controlRoutingStrategySource).toContain("updateRuntimeConfig");
    expect(controlRoutingStrategySource).toContain("Save and apply strategy");
    expect(controlRoutingStrategySource).toContain("formatRoutingModeLabel");
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
    expect(controlModelsSource).toContain("Inspect");
    expect(controlModelsSource).toContain('"Selected" : "Inspect"');
    expect(controlModelsSource).toContain("Save bindings");
    expect(controlModelsSource).toContain("/app/system/runtime-config");
    expect(controlModelsSource).toContain("/app/models/roles");
    expect(controlModelsSource).toContain("Selected model detail");
    expect(controlModelsSource).toContain("xl:items-start");
    expect(controlModelsSource).toContain(
      'selectedModelId === card.modelId ? "border-[var(--rm-accent)]" : ""',
    );
    expect(controlModelsSource).toContain("metaTextClassName");
    expect(controlModelsSource).toContain("inlineTitleClassName");
    expect(controlModelsSource).toContain("sectionTitleClassName");
    expect(controlModelsSource).toContain("compactTitleClassName");
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

  test("routing analytics exposes the Paper-style current-slice summary rail", () => {
    expect(observeRoutingRouteSource).toContain("Current routing slice");
    expect(observeRoutingRouteSource).toContain("Most active roles");
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

  test("upstream passthrough overview counts configured providers in scope, not the full provider catalog", () => {
    expect(integrationsUpstreamRouteSource).toContain("value={providerCards.length}");
    expect(integrationsUpstreamRouteSource).not.toContain(
      "value={snapshot?.providers.length ?? 0}",
    );
  });

  test("connect contract-reference routes expose live compatibility and passthrough guidance", () => {
    expect(integrationsDownstreamRouteSource).toContain("Compatibility notes");
    expect(integrationsDownstreamRouteSource).toContain("provider.setup.notes");
    expect(integrationsUpstreamRouteSource).toContain("Boundary guidance");
    expect(integrationsUpstreamRouteSource).toContain(
      "Alias routing and telemetry stay on the runtime shell",
    );
  });

  test("runtime roles route preserves role-first drill-down language for task detail", () => {
    expect(controlRolesSource).toContain("Role catalog");
    expect(controlRolesSource).toContain("Scan live roles first");
    expect(controlRolesSource).toContain("RoleCatalogHierarchy");
    expect(controlRolesSource).toContain("Tasks stay nested under the selected role");
    expect(controlRolesSource).toContain(
      "Open Task detail on a role to inspect or edit its task memberships.",
    );
    expect(controlRolesSource).toContain(
      'className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-start"',
    );
    expect(controlRolesSource).toContain('className="max-h-[68vh] overflow-auto pr-1"');
    expect(controlRolesSource).toContain('className="max-h-[52vh] overflow-auto pr-1"');
    expect(controlRolesSource).toContain(
      "The runtime page leads with a role-first catalog before task detail editing.",
    );
    expect(controlRolesSource).toContain(
      "Add a new router-visible role with the runtime policy fields required by the bridge.",
    );
    expect(controlRolesSource).toContain("Open create role form");
    expect(controlRolesSource).toContain("Update the active runtime role definition in-place");
    expect(controlRolesSource).toContain('summary="Advanced policy fields"');
    expect(controlRolesSource).toContain('summary="Edit all role fields"');
    expect(controlRolesSource).toContain("Routing policy overrides (JSON)");
    expect(controlRolesSource).toContain("tool policy mode:");
    expect(controlRolesSource).toContain("supported tasks:");
    expect(controlRolesSource).toContain("<SectionCard");
    expect(roleTaskHierarchySource).toContain("Task detail");
    expect(roleTaskHierarchySource).toContain("Hide task detail");
  });

  test("models routes use shared supporting and field tokens instead of route-local secondary text overrides", () => {
    expect(controlModelsSource).not.toContain("bodyTextClassName} text-[var(--rm-secondary)]");
    expect(controlRolesSource).not.toContain("font-mono text-xs");
    expect(controlRolesSource).not.toContain(
      'className="flex items-center gap-2 rounded-[var(--rm-radius-panel)] border border-[var(--rm-border)] px-3 py-2 text-sm text-[var(--rm-secondary)]"',
    );
  });

  test("routing config keeps raw provenance payloads bounded behind compact disclosures", () => {
    expect(routerConfigRouteSource).toContain("Routing provenance");
    expect(routerConfigRouteSource).toContain("View raw source payload");
    expect(routerConfigRouteSource).toContain("View raw policy payload");
    expect(routerConfigRouteSource).toContain("View applied routing record");
    expect(routerConfigRouteSource).toContain('className="max-h-[360px] overflow-auto pr-1"');
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

    expect(routerConfigRouteSource).toContain("supportingTextClassName");
    expect(routerConfigRouteSource).not.toContain("bodyTextClassName} text-[var(--rm-secondary)]");

    expect(routerCandidatesRouteSource).toContain("supportingTextClassName");
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

    expect(observeActivityRouteSource).toContain("supportingTextClassName");
    expect(observeActivityRouteSource).not.toContain(
      "bodyTextClassName} text-[var(--rm-secondary)]",
    );
    expect(observeActivityRouteSource).not.toContain(
      "className={`${mutedPanelClassName} p-4 ${bodyTextClassName} text-[var(--rm-secondary)]`",
    );

    expect(observeLogsSource).toContain("supportingTextClassName");
    expect(observeLogsSource).not.toContain("bodyTextClassName} text-[var(--rm-secondary)]");

    expect(requestDetailRouteSource).toContain("compactTitleClassName");
    expect(requestDetailRouteSource).toContain("utilityLabelClassName");
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

    expect(localMatrixSource).toContain("supportingTextClassName");
    expect(localMatrixSource).toContain("codeBlockClassName");
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

    expect(localPeersSource).toContain("codeBlockClassName");
    expect(localPeersSource).toContain("supportingTextClassName");
    expect(localPeersSource).not.toContain("bodyTextClassName} text-[var(--rm-secondary)]");
    expect(localPeersSource).not.toContain("font-mono text-sm text-[var(--rm-fg)]");
    expect(localPeersSource).not.toContain("utilityLabelClassName} text-[var(--rm-muted)]");

    expect(localSwapSource).toContain("metaTextClassName");
    expect(localSwapSource).toContain("compactTitleClassName");
    expect(localSwapSource).toContain("codeBlockClassName");
    expect(localSwapSource).not.toContain("bodyTextClassName} text-[var(--rm-secondary)]");
    expect(localSwapSource).not.toContain("text-[11px] font-semibold uppercase");
    expect(localSwapSource).not.toContain("text-sm font-semibold text-[var(--rm-fg)]");

    expect(localLogsSource).toContain("metaTextClassName");
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
    expect(localChooseSource).toContain('className="grid gap-5 xl:grid-cols-2"');
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
    expect(localPeerModelsSource).toContain(
      "Open endpoints to start registering peer-backed models.",
    );
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
  });

  test("llama-swap matrix renders an explanatory matrix entry page instead of a bare redirect", () => {
    expect(localMatrixSource).not.toContain("<Navigate");
    expect(localMatrixSource).toContain("Llama-swap matrix");
    expect(localMatrixSource).toContain("Redirect target");
    expect(localMatrixSource).toContain("Shared inventory");
    expect(localMatrixSource).toContain("Resolution");
    expect(localMatrixSource).toContain("/app/local/llama-swap/models?view=grid");
  });

  test("local setup surfaces stay discoverable from navigation and empty registry states", () => {
    expect(localPeerModelsSource).toContain("Register model");
    expect(localPeerModelsSource).toContain("Peer-backed");
    expect(localLlamaSwapModelsSource).toContain("Load model");
    expect(localLlamaSwapModelsSource).toContain("Llama-swap");
    expect(localPeersSource).toContain("Endpoint inventory");
    expect(localPeersSource).toContain("Add endpoint");
    expect(endpointsRouteSource).toContain("/app/local/endpoints");
    expect(endpointsRouteSource).toContain("/app/connect/downstream");
    expect(controlModelsSource).toContain("/app/local/choose");
    expect(controlModelsSource).toContain("/app/local/endpoints");
  });

  test("local host policy, endpoint, and swap surfaces keep low-data states actionable", () => {
    expect(localPolicySource).toContain("Open models");
    expect(localPolicySource).toContain("Persisted JSON stays visible here");
    expect(localPolicySource).toContain("Auto-unload idle models");
    expect(localPeersSource).toContain("Open peer models");
    expect(localPeersSource).toContain("role-model normalizes the URL");
    expect(localPeersSource).toContain("OpenAI-compatible peer endpoint");
    expect(localSwapSource).toContain(
      "Events appear here when the managed host loads a first model",
    );
    expect(localSwapSource).toContain("Ledger semantics");
    expect(localSwapSource).toContain("Open host policy");
  });

  test("observe and local log surfaces render structured ledgers rather than raw iframe placeholders", () => {
    expect(observeLogsSource).not.toContain("<iframe");
    expect(observeLogsSource).toContain("Structured log history");
    expect(observeLogsSource).toContain("Source");
    expect(observeLogsSource).toContain("Severity");
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
    expect(requestsRouteSource).toContain("Analytics controls");
    expect(requestsRouteSource).not.toContain("Dashboard mode");
    expect(requestsRouteSource).toContain("Advanced controls");
    expect(requestsRouteSource).toContain("DisclosureSection");
    expect(requestsRouteSource).not.toContain('previewMode === "mock"');
    expect(requestsRouteSource).toContain("Taxonomy group id");
    expect(requestsRouteSource).toContain("Taxonomy capability ids");
    expect(requestsRouteSource).not.toContain("?preview=mock");
    expect(requestsRouteSource).not.toContain("Adjacent raw-host tools");
    expect(requestsRouteSource).not.toContain("/app/observe/activity");
    expect(requestsRouteSource).not.toContain("/app/observe/logs");
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

  test("activity route frames raw-host metrics as adjacent to canonical telemetry", () => {
    expect(observeActivityRouteSource).toContain("/app/observe/requests");
    expect(observeActivityRouteSource).toContain("canonical structured telemetry");
    expect(observeActivityRouteSource).toContain("Raw metrics");
  });

  test("logs route exposes request-detail handoffs while preserving raw-host framing", () => {
    expect(observeLogsSource).toContain("/app/observe/requests/");
    expect(observeLogsSource).toContain("canonical telemetry");
    expect(observeLogsSource).toContain("Open raw proxy stream");
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

  test("dashboard is chart-led and keeps routing analytics as a first-class handoff", () => {
    expect(dashboardRouteSource).toContain("TelemetryAnalyticsChartCard");
    expect(dashboardRouteSource).toContain("buildOverviewChartDefinitions");
    expect(dashboardRouteSource).toContain("Open routing analytics");
  });

  test("overview metadata and design doc describe a telemetry-first summary with an interaction rail", () => {
    expect(dashboardRouteSource).not.toContain('label: "Providers"');
    expect(dashboardRouteSource).not.toContain('label: "Execution-ready"');
    expect(appShellSource).not.toContain("xl:grid-cols-[minmax(0,1fr)_auto]");
    expect(appShellSource).toContain("hasSecondaryNavigation");
    expect(appShellSource).toContain("activeSection.items.length > 1");
    expect(dashboardRouteSource).toContain("usePageActions");
    expect(dashboardRouteSource).not.toContain(">Summary<");
    expect(dashboardRouteSource).toContain('useState<TelemetryTimeRangeValue>("day")');
    expect(dashboardRouteSource).toContain('useState<"" | RuntimeTelemetryAnalyticsDimension>(');
    expect(dashboardRouteSource).toContain('"endpointId"');
    expect(dashboardRouteSource).toContain("Overview filters");
    expect(dashboardRouteSource).not.toContain('SectionCard title="Overview filters"');
    expect(dashboardRouteSource).toContain("telemetryBreakdownOptions");
    expect(dashboardRouteSource).toContain('"requestedRoleId"');
    expect(dashboardRouteSource).toContain('"difficultyBucket"');
    expect(dashboardRouteSource).toContain('"statusFamily"');
    expect(dashboardRouteSource).toContain('label="Status family"');
    expect(dashboardRouteSource).toContain('label="Difficulty bucket"');
    expect(dashboardRouteSource).toContain('label="Provider"');
    expect(dashboardRouteSource).toContain('label="Model"');
    expect(dashboardRouteSource).toContain('label="Endpoint"');
    expect(dashboardRouteSource).toContain('label="Requested role"');
    expect(dashboardRouteSource).toContain("fetchTelemetryRequests({");
    expect(dashboardRouteSource).toContain("filters,");
    expect(dashboardRouteSource).not.toContain('previewMode === "mock"');
    expect(dashboardRouteSource).not.toContain("buildMockOverviewPreview");
    expect(dashboardRouteSource).toContain('to="/app/observe/requests"');
    expect(dashboardRouteSource).toContain('className="grid gap-4 xl:items-start xl:grid-cols-2"');
    expect(dashboardRouteSource).toContain(
      'className="grid gap-4 xl:items-start xl:grid-cols-[minmax(0,1.45fr)_minmax(0,0.8fr)_minmax(0,0.8fr)]"',
    );
    expect(dashboardRouteSource).toContain('SectionCard title="Latest requests"');
    expect(dashboardRouteSource).toContain("xl:grid-cols-[repeat(3,minmax(0,1fr))]");
    expect(dashboardRouteSource.indexOf('SectionCard title="Latest requests"')).toBeLessThan(
      dashboardRouteSource.indexOf('SectionCard title="Current endpoint inventory"'),
    );
    expect(dashboardRouteSource).toContain(
      'className="grid gap-4 xl:items-start xl:grid-cols-[minmax(0,1.45fr)_minmax(0,0.8fr)_minmax(0,0.8fr)]"',
    );
    expect(telemetryControlsSource).toContain("flex-nowrap");
    expect(dashboardRouteSource).toContain("request.primaryLabel");
    expect(designSystemSource).not.toContain("current-state cards and endpoint inventory");
    expect(dashboardRouteSource).toContain("Open request analytics");
    expect(designSystemDocSource).toContain(
      "horizontal latest-requests strip above current endpoint inventory",
    );
  });

  test("workbench and observe routes expose routing controls and receipts in repo-owned UI surfaces", () => {
    expect(workbenchRouteSource).toContain("Routing mode");
    expect(workbenchRouteSource).toContain("routingModeOverride");
    expect(requestsRouteSource).toContain("routingDecisionLabel");
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
    expect(controlModelsSource).toContain("Telemetry taxonomy rollup (advisory)");
    expect(controlModelsSource).toContain("Recent groups");
    expect(controlModelsSource).toContain("Observed strengths");
    expect(controlModelsSource).toContain("Observed warnings");
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
    expect(appShellSource).toContain("getPrimarySectionLinkClassName");
    expect(appShellSource).toContain("getSecondaryNavigationLinkClassName");
    expect(appShellSource).toContain('color: "var(--rm-on-primary)"');
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
      "Page content begins directly with template primitives (`FactCard`, `SectionCard`, …)",
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

  test("long fact-card values use compact text roles instead of display value typography", () => {
    expect(pagePrimitivesSource).toContain("valueClassName");
    expect(sessionReadinessRouteSource).toContain("bodyStrongTextClassName");
    const sessionFactCardCount = [...sessionReadinessRouteSource.matchAll(/<FactCard\b/g)].length;
    const compactValueCount = [
      ...sessionReadinessRouteSource.matchAll(/valueClassName={bodyStrongTextClassName}/g),
    ].length;
    expect(compactValueCount).toBe(sessionFactCardCount);
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

  test("app css derives runtime tokens from the Paper linear token families", () => {
    expect(appCss).toContain("--linear-bg-canvas:");
    expect(appCss).toContain("--linear-surface-1:");
    expect(appCss).toContain("--linear-surface-2:");
    expect(appCss).toContain("--linear-ink:");
    expect(appCss).toContain("--linear-font-sans:");
    expect(appCss).toContain("--linear-font-mono:");
    expect(appCss).toContain("--rm-bg: var(--linear-bg-canvas);");
    expect(appCss).toContain("--rm-surface: var(--linear-surface-1);");
    expect(appCss).toContain("--rm-surface-strong: var(--linear-surface-2);");
    expect(appCss).toContain("--rm-fg: var(--linear-ink);");
    expect(appCss).toContain("--rm-font-display: var(--linear-font-display);");
    expect(appCss).toContain("--rm-font-body: var(--linear-font-sans);");
    expect(appCss).toContain("--rm-font-mono: var(--linear-font-mono);");
    expect(appCss).toContain("--rm-pill-info-bg:");
    expect(appCss).toContain("--rm-pill-advisory-bg:");
  });

  test("shell chrome does not render separate card surfaces for the sidebar and header", () => {
    expect(appShellSource).not.toContain(
      "<aside\n          className={`${cardClassName} flex flex-col p-5",
    );
    expect(appShellSource).not.toContain("<header className={`${cardClassName} px-5 py-5`}>");
    expect(appShellSource).toContain(
      "rounded-[var(--rm-radius-shell)] border border-[var(--rm-border)]",
    );
    expect(appShellSource).not.toContain("lg:border-r");
  });

  test("shell keeps chrome fixed while only the page-content frame scrolls", () => {
    expect(appShellSource).toContain("useRef");
    expect(appShellSource).toContain("contentScrollRef");
    expect(appShellSource).toContain('scrollTo({ top: 0, behavior: "auto" })');
    expect(appShellSource).toContain(
      'className="h-screen overflow-hidden bg-[var(--rm-bg)] text-[var(--rm-fg)]"',
    );
    expect(appShellSource).toContain(
      'className="mx-auto h-full max-w-[var(--rm-shell-width)] px-10 py-10"',
    );
    expect(appShellSource).toContain(
      'className="h-full overflow-hidden rounded-[var(--rm-radius-shell)] border border-[var(--rm-border)] bg-[var(--rm-surface)] px-5 py-5"',
    );
    expect(appShellSource).toContain(
      'className="grid h-full min-h-0 gap-5 lg:grid-cols-[240px_minmax(0,1fr)]"',
    );
    expect(appShellSource).toContain(
      'className="flex h-full flex-col gap-3 overflow-hidden lg:pt-5"',
    );
    expect(appShellSource).toContain('className="space-y-2 overflow-y-auto pr-1"');
    expect(appShellSource).toContain('className="flex min-h-0 min-w-0 flex-col gap-4"');
    expect(appShellSource).toContain('className="min-w-0 shrink-0"');
    expect(appShellSource).toContain(
      'className="runtime-shell-content-scroll min-h-0 flex-1 overflow-y-auto pr-2"',
    );
    expect(appCss).toContain(".runtime-shell-content-scroll");
    expect(appCss).toContain("scrollbar-width: none;");
    expect(appCss).toContain(".runtime-shell-content-scroll::-webkit-scrollbar");
    expect(designSystemDocSource).toContain("only the page-content frame scrolls");
    expect(designSystemDocSource).toContain("content-frame scrollbar is hidden");
  });

  test("shell navigation follows the text-first Paper runtime shell without route icons", () => {
    expect(appShellSource).not.toContain("<section.icon");
    expect(appShellSource).not.toContain("<item.icon");
    expect(appShellSource).toContain("<NavLink");
    expect(appShellSource).toContain("to={item.to}");
    expect(appShellSource).toContain("end");
    expect(appShellSource).not.toContain('end={item.to === "/app"}');
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
      "The intended visual source of truth for both the design system and the actual runtime page implementations is the Paper Linear review file",
    );
    expect(designSystemDocSource).toContain(
      "Approved runtime implementation may temporarily lead Paper",
    );
    expect(designSystemDocSource).toContain(
      "Paper must be resynced after approved design/code changes",
    );
    expect(designSystemDocSource).toContain(
      "older Apple reference as current runtime UI authority",
    );
    expect(appleReferenceDocSource).toContain("This document is historical reference only.");
    expect(appleReferenceDocSource).toContain(
      "It is **not** the active authority for the runtime UI.",
    );
    expect(appleReferenceDocSource).toContain("The active repo-owned authority is");
    expect(appleReferenceDocSource).toContain(
      "The current runtime shell follows the Paper Linear review system",
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
    expect(designSystemDocSource).toContain("The old right-hand request rail is not allowed");
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
    expect(designSystemSource).toContain("bg-[var(--rm-accent)] text-[color:var(--rm-on-primary)]");
    expect(designSystemSource).toContain("bg-[var(--rm-panel-muted)] text-[var(--rm-secondary)]");
  });

  test("shared form controls and telemetry filter pills stay at sidebar-scale typography", () => {
    expect(designSystemSource).toContain("export const fieldClassName =");
    expect(designSystemSource).toContain(
      '"w-full rounded-[var(--rm-radius-field)] border border-[var(--rm-border-strong)] bg-[var(--rm-surface)] px-[20px] py-3 !text-[13px] !font-normal !leading-[18px] !tracking-[0em] text-[var(--rm-fg)] outline-none transition placeholder:text-[var(--rm-muted)] focus:border-[var(--rm-accent-focus)] focus:ring-2 focus:ring-[var(--rm-accent-subtle)]"',
    );
    expect(designSystemSource).toContain("export const selectFieldClassName =");
    expect(designSystemSource).toContain(
      '"w-full min-h-[40px] rounded-[var(--rm-radius-field)] border border-[var(--rm-border-strong)] bg-[var(--rm-surface)] py-2 pl-[20px] pr-10 !text-[13px] !font-normal !leading-[18px] !tracking-[0em] text-[var(--rm-fg)] outline-none transition focus:border-[var(--rm-accent-focus)] focus:ring-2 focus:ring-[var(--rm-accent-subtle)]"',
    );
    expect(telemetryControlsSource).toContain(
      "inline-flex min-h-[32px] items-center justify-center",
    );
    expect(telemetryControlsSource).toContain(
      "!text-[13px] !font-normal !leading-[18px] !tracking-[0em] transition-colors",
    );
    expect(themedSelectSource).toContain("bg-[var(--rm-accent)] text-[color:var(--rm-on-primary)]");
    expect(themedSelectSource).toContain("block ${navLabelClassName}");
    expect(pagePrimitivesSource).toContain("pillLabelClassName");
  });

  test("content-frame headings step down below the shell page title scale", () => {
    expect(designSystemSource).toContain("export const sectionTitleClassName =");
    expect(designSystemSource).toContain(
      '"[font-family:var(--rm-font-display)] text-[18px] font-normal leading-6 tracking-[-0.016em]"',
    );
    expect(designSystemSource).toContain(
      'export const inlineTitleClassName = "text-[16px] font-semibold leading-[22px] text-[var(--rm-fg)]"',
    );
    expect(designSystemSource).toContain(
      'export const compactTitleClassName = "text-[15px] font-semibold leading-5 text-[var(--rm-fg)]"',
    );
  });

  test("accent-filled actions keep a light foreground for stronger token contrast", () => {
    expect(appCss).toContain("--rm-on-primary: var(--linear-light-canvas);");
    expect(appCss).toContain("--rm-pill-accent-ink: var(--linear-light-canvas);");
    expect(appCss).toContain("--rm-pill-success-ink: var(--linear-light-canvas);");
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
