import { readFileSync } from "node:fs";
import { type ReactElement, createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RouterProvider, createMemoryRouter } from "react-router";
import { describe, expect, test } from "vitest";

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
  getRuntimeRouteDefinition,
  runtimeNavigationSections,
  runtimeTheme,
  shellQuickLinks,
} from "./design-system";

function renderRoute(pathname: string, element: ReactElement): string {
  const router = createMemoryRouter([{ path: pathname, element }], {
    initialEntries: [pathname],
  });
  return renderToStaticMarkup(createElement(RouterProvider, { router }));
}

const appCss = readFileSync(new URL("../app.css", import.meta.url), "utf8");
const appShellSource = readFileSync(
  new URL("../components/app-shell.tsx", import.meta.url),
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
const controlModelsSource = readFileSync(
  new URL("../routes/control-models.tsx", import.meta.url),
  "utf8",
);
const localModelsSource = readFileSync(
  new URL("../routes/local-models.tsx", import.meta.url),
  "utf8",
);
const localPeersSource = readFileSync(
  new URL("../routes/local-peers.tsx", import.meta.url),
  "utf8",
);
const endpointsRouteSource = readFileSync(
  new URL("../routes/endpoints.tsx", import.meta.url),
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
const workbenchRouteSource = readFileSync(
  new URL("../routes/workbench.tsx", import.meta.url),
  "utf8",
);
const designSystemDocSource = readFileSync(
  new URL("../../DESIGN_SYSTEM.md", import.meta.url),
  "utf8",
);

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
          "/app/local/models",
          "/app/local/swap",
          "/app/local/policy",
          "/app/local/logs",
          "/app/local/matrix",
          "/app/local/peers",
        ],
      },
      {
        title: "Control",
        routes: [
          "/app/control/providers",
          "/app/control/routing-strategy",
          "/app/control/runtime-config",
          "/app/control/controller",
          "/app/control/endpoints",
          "/app/control/models",
        ],
      },
      {
        title: "Router",
        routes: [
          "/app/router",
          "/app/router/config",
          "/app/router/candidates",
          "/app/router/decisions",
        ],
      },
      {
        title: "Observe",
        routes: ["/app/observe/activity", "/app/observe/requests", "/app/observe/logs"],
      },
      {
        title: "Integrations",
        routes: ["/app/integrations/downstream", "/app/integrations/upstream"],
      },
      {
        title: "System",
        routes: ["/app/system/runtime", "/app/system/peers"],
      },
    ]);

    expect(getRuntimeRouteDefinition("/app")).toEqual(
      expect.objectContaining({
        id: "overview-summary",
        template: "summary-board",
      }),
    );
    expect(getRuntimeRouteDefinition("/app/control/models")).toEqual(
      expect.objectContaining({
        id: "control-models",
        template: "model-inventory",
      }),
    );
    expect(getRuntimeRouteDefinition("/app/local/models")).toEqual(
      expect.objectContaining({
        id: "local-models",
        title: "Local models",
        description: "Load and inspect llama-swap-managed local models and runtime overrides.",
      }),
    );
    expect(getRuntimeRouteDefinition("/app/local/peers")).toEqual(
      expect.objectContaining({
        id: "local-peers",
        label: "Endpoints",
        title: "Local endpoints",
        description: "Generic OpenAI-compatible local peer endpoint inventory and management.",
      }),
    );
    expect(getRuntimeRouteDefinition("/app/control/runtime-config")).toEqual(
      expect.objectContaining({
        id: "control-runtime-config",
        template: "registry-detail",
      }),
    );
    expect(getRuntimeRouteDefinition("/app/control/routing-strategy")).toEqual(
      expect.objectContaining({
        id: "control-routing-strategy",
        template: "registry-detail",
      }),
    );
    expect(getRuntimeRouteDefinition("/app/control/controller")).toEqual(
      expect.objectContaining({
        id: "control-controller",
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
  });

  test("keeps the shell on restrained radii and explicit content widths", () => {
    expect(runtimeTheme.maxContentWidth).toBe("1480px");
    expect(runtimeTheme.radii.shell).toBe("0px");
    expect(runtimeTheme.radii.panel).toBe("0px");
    expect(runtimeTheme.radii.field).toBe("0px");
    expect(runtimeTheme.radii.badge).toBe("0px");
    expect(runtimeTheme.colors.light).toEqual({
      bg: "#fafaf9",
      surface: "#f5f5f4",
      surfaceStrong: "#f5f5f4",
      panel: "#e7e5e4",
      fg: "#1c1917",
      secondary: "rgba(28, 25, 23, 0.70)",
      muted: "rgba(28, 25, 23, 0.40)",
      border: "#e7e5e4",
      borderStrong: "#f5f5f4",
      accent: "#003B8E",
      accentMuted: "rgba(0, 59, 142, 0.60)",
      accentSubtle: "rgba(0, 59, 142, 0.20)",
      accentGhost: "rgba(0, 59, 142, 0.10)",
      telemetryLocal: "#1f2937",
      telemetryRemote: "#003B8E",
      telemetryHealthy: "#166534",
      telemetryDegraded: "#b45309",
      telemetryRaw: "#57534e",
      error: "#C8102E",
      errorMuted: "rgba(200, 16, 46, 0.60)",
      errorSubtle: "rgba(200, 16, 46, 0.20)",
      errorGhost: "rgba(200, 16, 46, 0.10)",
      success: "#166534",
      successMuted: "rgba(22, 101, 52, 0.60)",
      successSubtle: "rgba(22, 101, 52, 0.20)",
      warning: "#b45309",
      warningMuted: "rgba(180, 83, 9, 0.60)",
    });
    expect(runtimeTheme.colors.dark).toEqual({
      bg: "#0c0a09",
      surface: "#1c1917",
      surfaceStrong: "#1c1917",
      panel: "#292524",
      fg: "#fafaf9",
      secondary: "rgba(250, 250, 249, 0.70)",
      muted: "rgba(250, 250, 249, 0.40)",
      border: "#292524",
      borderStrong: "#1c1917",
      telemetryLocal: "#d6d3d1",
      telemetryRemote: "#60a5fa",
      telemetryHealthy: "#86efac",
      telemetryDegraded: "#fbbf24",
      telemetryRaw: "#a8a29e",
      accent: "#60a5fa",
      accentMuted: "rgba(96, 165, 250, 0.60)",
      accentSubtle: "rgba(96, 165, 250, 0.20)",
      accentGhost: "rgba(96, 165, 250, 0.10)",
      error: "#fb7185",
      errorMuted: "rgba(251, 113, 133, 0.60)",
      errorSubtle: "rgba(251, 113, 133, 0.20)",
      errorGhost: "rgba(251, 113, 133, 0.10)",
      success: "#86efac",
      successMuted: "rgba(134, 239, 172, 0.60)",
      successSubtle: "rgba(134, 239, 172, 0.20)",
      warning: "#fbbf24",
      warningMuted: "rgba(251, 191, 36, 0.60)",
    });
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
      renderRoute("/app/integrations/upstream", createElement(IntegrationsUpstreamRoute)),
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
      "/app/integrations/upstream",
      createElement(IntegrationsUpstreamRoute),
    );
    expect(upstreamMarkup).toContain("Upstream target inventory");
    expect(upstreamMarkup).toContain("Provider accounts in scope");
    expect(upstreamMarkup).toContain("/upstream/");
    expect(upstreamMarkup).not.toContain("Open preserved UI");

    const peersMarkup = renderRoute("/app/system/peers", createElement(SystemPeersRoute));
    expect(peersMarkup).toContain("Peer inventory");
    expect(peersMarkup).toContain("Peer contract fields");
    expect(peersMarkup).toContain("Runtime policy boundary");
    expect(peersMarkup).not.toContain("Open raw health");
  });

  test("router implementation targets render repo-owned routing explanation surfaces", () => {
    expect(renderRoute("/app/router", createElement(RouterOverviewRoute))).toContain(
      "Routing overview",
    );
    expect(renderRoute("/app/router/config", createElement(RouterConfigRoute))).toContain(
      "Routing config",
    );
    expect(renderRoute("/app/router/candidates", createElement(RouterCandidatesRoute))).toContain(
      "Candidate inventory",
    );
    expect(renderRoute("/app/router/decisions", createElement(RouterDecisionsRoute))).toContain(
      "Routing decisions",
    );
    expect(
      renderRoute(
        "/app/router/decisions/req-runtime-bridge-route-001",
        createElement(RouterDecisionDetailRoute),
      ),
    ).toContain("Routing decision detail");
  });

  test("router routes preserve empty-state and observe-link affordances", () => {
    expect(routerRouteSource).toContain("LoadingState");
    expect(routerConfigRouteSource).toContain("ErrorState");
    expect(routerCandidatesRouteSource).toContain("EmptyState");
    expect(routerDecisionsRouteSource).toContain("/app/router/decisions/");
    expect(routerDecisionDetailRouteSource).toContain("/app/observe/requests/");
  });

  test("router config exposes proposal strategy modes and keeps the dynamic detail route out of section tabs", () => {
    expect(routerConfigRouteSource).toContain("Choose routing strategy");
    expect(routerConfigRouteSource).toContain("Strategy A");
    expect(routerConfigRouteSource).toContain("Strategy B");
    expect(routerConfigRouteSource).toContain("Strategy C");
    expect(routerConfigRouteSource).toContain("Open workbench with strategy");
    expect(routerConfigRouteSource).toContain("routingModeOverride");
    expect(workbenchRouteSource).toContain("useLocation");
    expect(
      runtimeNavigationSections
        .find((section) => section.title === "Router")
        ?.items.map((item) => item.id),
    ).not.toContain("router-decision-detail");
  });

  test("design system doc marks the converted pages as live routes", () => {
    expect(designSystemDocSource).toContain(
      "| `/app/control/routing-strategy` | live | `registry-detail` |",
    );
    expect(designSystemDocSource).toContain(
      "| `/app/control/runtime-config` | live | `registry-detail` |",
    );
    expect(designSystemDocSource).toContain("| `/app/router` | live | `registry-detail` |");
    expect(designSystemDocSource).toContain("| `/app/router/config` | live | `registry-detail` |");
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
      "| `/app/integrations/upstream` | live | `contract-reference` |",
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

  test("applies the swiss stone palette, ibm plex typography, and dual-scheme browser contract in shared app chrome", () => {
    expect(appCss).toContain("--rm-bg: #fafaf9;");
    expect(appCss).toContain("--rm-surface: #f5f5f4;");
    expect(appCss).toContain("--rm-surface-strong: #f5f5f4;");
    expect(appCss).toContain("--rm-panel: #e7e5e4;");
    expect(appCss).toContain("--rm-fg: #1c1917;");
    expect(appCss).toContain("--rm-secondary: rgba(28, 25, 23, 0.7);");
    expect(appCss).toContain("--rm-muted: rgba(28, 25, 23, 0.4);");
    expect(appCss).toContain("--rm-accent: #003b8e;");
    expect(appCss).toContain('"IBM Plex Mono"');
    expect(appCss).toContain("@media (prefers-color-scheme: dark)");
    expect(appCss).toContain("color-scheme: light dark;");
    expect(rootSource).toContain('meta name="color-scheme" content="light dark"');
    expect(rootSource).toContain("family=IBM+Plex+Mono");
  });

  test("keeps shared states on the stone plus single-accent palette", () => {
    expect(pagePrimitivesSource).not.toMatch(/amber|emerald|rose/);
    expect(controlModelsSource).not.toContain("bg-black");
    expect(rootSource).not.toContain("bg-white");
    expect(rootSource).not.toMatch(/rose-/);
  });

  test("control runtime config is a first-class route and models stays inspect-only", () => {
    expect(
      renderRoute("/app/control/runtime-config", createElement(ControlRuntimeConfigRoute)),
    ).toContain("Runtime config");
    expect(
      renderRoute("/app/control/runtime-config", createElement(ControlRuntimeConfigRoute)),
    ).toContain("Save and apply");
    expect(controlModelsSource).toContain("Inspect");
    expect(controlModelsSource).not.toContain(">Settings<");
    expect(controlModelsSource).toContain("/app/control/runtime-config");
  });

  test("local setup surfaces stay discoverable from navigation and empty registry states", () => {
    expect(localModelsSource).toContain("Load local model");
    expect(localModelsSource).toContain("llama-swap-managed local models");
    expect(localModelsSource).toContain("Open peer endpoints");
    expect(localPeersSource).toContain("Local endpoints");
    expect(localPeersSource).toContain("OpenAI-compatible peer endpoints");
    expect(localPeersSource).toContain("Add endpoint");
    expect(endpointsRouteSource).toContain("/app/local/peers");
    expect(endpointsRouteSource).toContain("/app/local/models");
    expect(controlModelsSource).toContain("/app/local/models");
    expect(controlModelsSource).toContain("/app/local/peers");
  });

  test("registry and system layouts avoid redundant KPI strips and placeholder note panels", () => {
    expect(providersRouteSource).not.toContain("FactCard");
    expect(endpointsRouteSource).not.toContain("FactCard");
    expect(controlControllerSource).not.toContain("FactCard");
    expect(controlRuntimeConfigSource).not.toContain("FactCard");
    expect(runtimeRouteSource).not.toContain("Runtime contract notes");
    expect(runtimeRouteSource).not.toContain("Health posture");
    expect(designSystemDocSource).not.toContain("fact strips before the registry rail");
  });

  test("workbench and observe routes expose routing controls and receipts in repo-owned UI surfaces", () => {
    expect(workbenchRouteSource).toContain("Routing mode");
    expect(workbenchRouteSource).toContain("routingModeOverride");
    expect(requestsRouteSource).toContain("routingDecisionLabel");
    expect(requestDetailRouteSource).toContain("Routing receipts");
    expect(requestDetailRouteSource).toContain("hybridArbitration");
  });
});
