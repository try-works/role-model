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
  codeBlockClassName,
  getRuntimeRouteDefinition,
  runtimeNavigationSections,
  runtimeTheme,
  shellQuickLinks,
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
const localLogsSource = readFileSync(new URL("../routes/local-logs.tsx", import.meta.url), "utf8");
const localPeersSource = readFileSync(
  new URL("../routes/local-peers.tsx", import.meta.url),
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
const providersRouteSource = readFileSync(
  new URL("../routes/providers.tsx", import.meta.url),
  "utf8",
);
const requestsRouteSource = readFileSync(
  new URL("../routes/requests.tsx", import.meta.url),
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

  test("keeps the shell on the Apple baseline with explicit chart tokens", () => {
    expect(runtimeTheme.maxContentWidth).toBe("1440px");
    expect(runtimeTheme.radii.sm).toBe("8px");
    expect(runtimeTheme.radii.md).toBe("11px");
    expect(runtimeTheme.radii.lg).toBe("18px");
    expect(runtimeTheme.radii.pill).toBe("9999px");
    expect(runtimeTheme.radii.shell).toBe("18px");
    expect(runtimeTheme.radii.panel).toBe("18px");
    expect(runtimeTheme.radii.field).toBe("11px");
    expect(runtimeTheme.radii.badge).toBe("9999px");
    expect(runtimeTheme.colors.light).toEqual({
      bg: "#f5f5f7",
      surface: "#ffffff",
      surfaceStrong: "#ffffff",
      panel: "#fafafc",
      fg: "#1d1d1f",
      secondary: "rgba(29, 29, 31, 0.72)",
      muted: "rgba(29, 29, 31, 0.48)",
      border: "#e0e0e0",
      borderStrong: "#d2d2d7",
      accent: "#0066CC",
      accentFocus: "#0071E3",
      accentOnDark: "#2997FF",
      accentMuted: "rgba(0, 102, 204, 0.72)",
      accentSubtle: "rgba(0, 102, 204, 0.14)",
      accentGhost: "rgba(0, 102, 204, 0.08)",
      dividerSoft: "#f0f0f0",
      hairline: "#e0e0e0",
      chipTranslucent: "rgba(210, 210, 215, 0.64)",
      telemetryLocal: "#1d1d1f",
      telemetryRemote: "#0066CC",
      telemetryHealthy: "#166534",
      telemetryDegraded: "#b45309",
      telemetryRaw: "#7a7a7a",
      error: "#C8102E",
      errorMuted: "rgba(200, 16, 46, 0.72)",
      errorSubtle: "rgba(200, 16, 46, 0.14)",
      errorGhost: "rgba(200, 16, 46, 0.08)",
      success: "#166534",
      successMuted: "rgba(22, 101, 52, 0.72)",
      successSubtle: "rgba(22, 101, 52, 0.14)",
      warning: "#b45309",
      warningMuted: "rgba(180, 83, 9, 0.72)",
      warningSubtle: "rgba(180, 83, 9, 0.14)",
    });
    expect(runtimeTheme.colors.dark).toEqual({
      bg: "#000000",
      surface: "#272729",
      surfaceStrong: "#2a2a2c",
      panel: "#252527",
      fg: "#FFFFFF",
      secondary: "rgba(255, 255, 255, 0.72)",
      muted: "rgba(255, 255, 255, 0.48)",
      border: "rgba(255, 255, 255, 0.12)",
      borderStrong: "rgba(255, 255, 255, 0.18)",
      accent: "#0066CC",
      accentFocus: "#0071E3",
      accentOnDark: "#2997FF",
      accentMuted: "rgba(0, 102, 204, 0.72)",
      accentSubtle: "rgba(41, 151, 255, 0.18)",
      accentGhost: "rgba(41, 151, 255, 0.10)",
      dividerSoft: "rgba(255, 255, 255, 0.1)",
      hairline: "rgba(255, 255, 255, 0.12)",
      chipTranslucent: "rgba(210, 210, 215, 0.24)",
      telemetryLocal: "#FFFFFF",
      telemetryRemote: "#2997FF",
      telemetryHealthy: "#86efac",
      telemetryDegraded: "#fbbf24",
      telemetryRaw: "#cccccc",
      error: "#FB7185",
      errorMuted: "rgba(251, 113, 133, 0.72)",
      errorSubtle: "rgba(251, 113, 133, 0.18)",
      errorGhost: "rgba(251, 113, 133, 0.10)",
      success: "#86EFAC",
      successMuted: "rgba(134, 239, 172, 0.72)",
      successSubtle: "rgba(134, 239, 172, 0.18)",
      warning: "#FBBF24",
      warningMuted: "rgba(251, 191, 36, 0.72)",
      warningSubtle: "rgba(251, 191, 36, 0.18)",
    });
    expect(designSystemSource).toContain("chartColors");
    expect(designSystemSource).toContain('"observe-routing"');
    expect(appCss).toContain("--rm-chart-local:");
    expect(appCss).toContain("--rm-chart-remote:");
    expect(appCss).toContain("--rm-chart-ink: #171717;");
    expect(appCss).toContain("--rm-chart-cyan: #50e3c2;");
    expect(appCss).toContain("--rm-chart-highlight-pink: #ff0080;");
    expect(appCss).toContain("--rm-chart-violet: #7928ca;");
    expect(appCss).toContain("--rm-chart-link-blue: #0070f3;");
    expect(appCss).toContain("--rm-chart-warning-soft: #ffefcf;");
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

  test("providers surface exposes explicit in-place maintenance actions for saved remote accounts", () => {
    expect(designSystemDocSource).toContain("explicit **Reconnect**");
    expect(designSystemDocSource).toContain("explicit **Update API key**");
    expect(providersRouteSource).toContain("Reconnect");
    expect(providersRouteSource).toContain("Update API key");
  });

  test("providers surface uses an explicit save-cancel modal for api-key maintenance", () => {
    expect(designSystemDocSource).toContain("explicit **Save** and **Cancel** controls");
    expect(providersRouteSource).toContain("<dialog");
    expect(providersRouteSource).toContain('aria-modal="true"');
    expect(providersRouteSource).toContain("API key");
    expect(providersRouteSource).toContain("Save");
    expect(providersRouteSource).toContain("Cancel");
  });

  test("providers surface keeps oauth reconnect as a one-click saved-account action", () => {
    expect(designSystemDocSource).toContain("explicit **Reconnect**");
    expect(providersRouteSource).toContain("Reconnect");
    expect(providersRouteSource).toContain("onReconnectAccount");
  });

  test("providers maintenance flows call explicit repair APIs instead of generic account writes", () => {
    expect(providersRouteSource).toContain("reconnectRuntimeAccount");
    expect(providersRouteSource).toContain("updateRuntimeAccountApiKey");
  });

  test("providers saved-account cards use canonical lifecycle rows and bounded archived diagnostics", () => {
    expect(designSystemDocSource).toContain(
      "lifecycle badge from the canonical backend lifecycle contract",
    );
    expect(designSystemDocSource).toContain("normalized storage-mode/credential posture");
    expect(designSystemDocSource).toContain("bounded diagnostics separate from active accounts");
    expect(providersRouteSource).toContain("buildProviderMaintenanceRows");
    expect(providersRouteSource).toContain("buildArchivedArtifactRows");
    expect(providersRouteSource).toContain("Archived stale diagnostics");
    expect(providersRouteSource).not.toContain("credentialRef.backend");
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
    expect(routerRouteSource).toContain("/app/router/strategy");
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
    expect(routerRouteSource).toContain('value={configuredStrategy ?? "unset"}');
    expect(routerRouteSource).toContain('value={configuredExecutionMode ?? "decision_only"}');
    expect(routerRouteSource).toContain("const configuredAliasRows");
    expect(routerRouteSource).not.toContain("const aliasInventory = summary?.aliasInventory");
    expect(routerRouteSource).toContain("Candidate expansion");
    expect(routerRouteSource).not.toContain("Resolved models");
  });

  test("router overview lists the concrete candidate endpoints behind routing posture", () => {
    expect(routerRouteSource).toContain("fetchRouterCandidates");
    expect(routerRouteSource).toContain("Routing candidates");
    expect(routerRouteSource).toContain("candidate.endpointId");
    expect(routerRouteSource).toContain("candidate.modelId");
    expect(routerRouteSource).toContain("candidate.sourceType");
    expect(routerRouteSource).toContain("candidate.healthStatus");
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

  test("applies the Apple palette, SF Pro / Inter typography, and explicit theme contract in shared app chrome", () => {
    expect(appCss).toContain('--rm-font-display: "SF Pro Display", "Inter"');
    expect(appCss).toContain('--rm-font-body: "SF Pro Text", "Inter"');
    expect(appCss).toContain("--rm-shadow-product: 0 3px 5px 30px rgba(0, 0, 0, 0.22);");
    expect(appCss).not.toContain("--rm-shadow-product: 0 24px 80px rgba(0, 0, 0, 0.22);");
    expect(appCss).toContain("--rm-bg: #f5f5f7;");
    expect(appCss).toContain("--rm-surface: #ffffff;");
    expect(appCss).toContain("--rm-panel: #fafafc;");
    expect(appCss).toContain("--rm-accent: #0066cc;");
    expect(appCss).toContain('html[data-theme="light"]');
    expect(appCss).toContain('html[data-theme="dark"]');
    expect(appCss).toContain("appearance: none;");
    expect(appCss).toContain("background-image: var(--rm-select-chevron);");
    expect(appCss).toContain('"IBM Plex Mono"');
    expect(rootSource).toContain('meta name="color-scheme" content="light dark"');
    expect(rootSource).toContain("family=Inter");
    expect(rootSource).toContain('meta name="theme-color" content="#f5f5f7"');
    expect(rootSource).toContain('meta name="theme-color" content="#000000"');
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

  test("keeps shared states calm: transparent status pills and no section divider chrome", () => {
    expect(pagePrimitivesSource).toContain("bg-transparent text-[var(--rm-accent)]");
    expect(pagePrimitivesSource).toContain("bg-transparent text-[var(--rm-warning)]");
    expect(pagePrimitivesSource).toContain("bg-transparent text-[var(--rm-success)]");
    expect(pagePrimitivesSource).not.toContain("border-b border-[var(--rm-border)] pb-4");
    expect(pagePrimitivesSource).not.toContain("border-t border-[var(--rm-border)] pt-4");
    expect(appShellSource).not.toContain("border-b border-[var(--rm-border)] pb-5");
    expect(appShellSource).not.toContain("border-t border-[var(--rm-border)] pt-4");
    expect(appShellSource).toContain("ThemeToggle");
    expect(appShellSource).toContain("mt-auto");
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
    expect(controlModelsSource).toContain("Save bindings");
    expect(controlModelsSource).toContain("/app/system/runtime-config");
    expect(controlModelsSource).toContain("/app/models/roles");
  });

  test("runtime roles route preserves role-first drill-down language for task detail", () => {
    expect(controlRolesSource).toContain("Role catalog");
    expect(controlRolesSource).toContain("Scan live roles first");
    expect(controlRolesSource).toContain("RoleCatalogHierarchy");
    expect(controlRolesSource).toContain("Tasks stay nested under the selected role");
    expect(controlRolesSource).toContain(
      "Open Task detail on a role to inspect or edit its task memberships.",
    );
    expect(roleTaskHierarchySource).toContain("Task detail");
    expect(roleTaskHierarchySource).toContain("Hide task detail");
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

  test("requests and request detail stay telemetry-first while exposing raw-host handoffs", () => {
    expect(requestsRouteSource).toContain("fetchTelemetryAnalytics");
    expect(requestsRouteSource).toContain("buildObserveRequestsChartDefinitions");
    expect(requestsRouteSource).toContain("Analytics controls");
    expect(requestsRouteSource).toContain("/app/observe/activity");
    expect(requestsRouteSource).toContain("/app/observe/logs");
    expect(requestDetailRouteSource).toContain("/app/observe/activity");
    expect(requestDetailRouteSource).toContain("/app/observe/logs");
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
    expect(dashboardRouteSource).not.toContain('title="Telemetry controls"');
    expect(dashboardRouteSource).not.toContain(">Summary<");
    expect(dashboardRouteSource).toContain('aria-label="Overview telemetry filters"');
    expect(dashboardRouteSource).toContain("justify-between");
    expect(dashboardRouteSource).toContain("xl:ml-auto");
    expect(dashboardRouteSource).toContain("xl:justify-end");
    expect(telemetryControlsSource).toContain("flex-nowrap");
    expect(dashboardRouteSource).toContain("request.primaryLabel");
    expect(designSystemSource).not.toContain("current-state cards and endpoint inventory");
    expect(dashboardRouteSource).toContain("Open request analytics");
  });

  test("workbench and observe routes expose routing controls and receipts in repo-owned UI surfaces", () => {
    expect(workbenchRouteSource).toContain("Routing mode");
    expect(workbenchRouteSource).toContain("routingModeOverride");
    expect(requestsRouteSource).toContain("routingDecisionLabel");
    expect(requestDetailRouteSource).toContain("Routing receipts");
    expect(requestDetailRouteSource).toContain("hybridArbitration");
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

  test("shell header owns route metadata and page actions without duplicate page headers", () => {
    expect(appLayoutSource).toContain("ShellHeaderProvider");
    expect(appShellSource).toContain("useShellHeaderState");
    expect(shellHeaderContextSource).toContain("usePageActions");
    expect(shellHeaderContextSource).toContain("useShellHeaderOverride");
    expect(pagePrimitivesSource).not.toContain("PageHeader");
    expect(pagePrimitivesSource).not.toContain("h-px w-8");
    expect(appShellSource).not.toContain("pages");
    expect(designSystemDocSource).toContain("only** route-level header");
    expect(designSystemDocSource).not.toContain("`PageHeader` begins");
    expect(designSystemDocSource).not.toMatch(/Section.*Template.*Route/i);
    expect(designSystemDocSource).toContain(
      "All templates assume the shell header is already visible.",
    );
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
    expect(routerRouteSource).toContain("usePageActions");
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

  test("production UI sources keep the approved Apple radius grammar", () => {
    expect(findExactSourceViolations("rounded-none")).toEqual([]);
  });

  test("production UI sources avoid unsupported Apple typography weight 500", () => {
    expect(findExactSourceViolations("font-medium")).toEqual([]);
  });

  test("chart primitives use shared design-system geometry and type tokens", () => {
    expect(designSystemSource).toContain("chartAxisTickStyle");
    expect(designSystemSource).toContain("chartBarRadius");
    expect(telemetryChartsSource).toContain("chartAxisTickStyle");
    expect(telemetryChartsSource).toContain("chartBarRadius");
    expect(telemetryChartsSource).not.toContain("fontSize: 12");
    expect(telemetryChartsSource).not.toContain("fontSize: 13");
    expect(telemetryChartsSource).not.toContain("radius={[8, 8, 0, 0]}");
    expect(telemetryChartsSource).not.toContain("radius={[0, 8, 8, 0]}");
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
    expect(requestDetailRouteSource).toContain("DisclosureSection");
    expect(designSystemDocSource).toContain(
      "usePageActions()` only — not `RuntimeRouteDefinition`",
    );
  });
});
