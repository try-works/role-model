import { readFileSync } from "node:fs";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RouterProvider, createMemoryRouter } from "react-router";
import { describe, expect, test } from "vitest";

import { getRuntimeRouteDefinition, runtimeNavigationSections, runtimeTheme, shellQuickLinks } from "./design-system";
import IntegrationsUpstreamRoute from "../routes/integrations-upstream";
import StudioAdvancedRoute from "../routes/studio-advanced";
import StudioAudioRoute from "../routes/studio-audio";
import StudioImagesRoute from "../routes/studio-images";
import StudioRerankRoute from "../routes/studio-rerank";
import SystemPeersRoute from "../routes/system-peers";

function renderRoute(pathname: string, element: ReactElement): string {
  const router = createMemoryRouter([{ path: pathname, element }], {
    initialEntries: [pathname],
  });
  return renderToStaticMarkup(createElement(RouterProvider, { router }));
}

const appCss = readFileSync(new URL("../app.css", import.meta.url), "utf8");
const appShellSource = readFileSync(new URL("../components/app-shell.tsx", import.meta.url), "utf8");
const pagePrimitivesSource = readFileSync(new URL("../components/page-primitives.tsx", import.meta.url), "utf8");
const controlModelsSource = readFileSync(new URL("../routes/control-models.tsx", import.meta.url), "utf8");
const rootSource = readFileSync(new URL("../root.tsx", import.meta.url), "utf8");
const designSystemDocSource = readFileSync(new URL("../../DESIGN_SYSTEM.md", import.meta.url), "utf8");

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
        title: "Control",
        routes: [
          "/app/control/providers",
          "/app/control/accounts",
          "/app/control/controller",
          "/app/control/endpoints",
          "/app/control/models",
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
    expect(getRuntimeRouteDefinition("/app/control/controller")).toEqual(
      expect.objectContaining({
        id: "control-controller",
        template: "registry-detail",
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
      accent: "#C8102E",
      accentMuted: "rgba(200, 16, 46, 0.60)",
      accentSubtle: "rgba(200, 16, 46, 0.20)",
      accentGhost: "rgba(200, 16, 46, 0.10)",
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
    });
  });

  test("global shell chrome keeps legacy vendor ui out of the main runtime contract", () => {
    expect(shellQuickLinks.map((link) => link.href)).not.toContain("/ui");
    expect(appShellSource).not.toContain('href="/ui"');
    expect(renderRoute("/app/studio/images", createElement(StudioImagesRoute))).not.toContain("Open preserved UI");
    expect(renderRoute("/app/studio/audio", createElement(StudioAudioRoute))).not.toContain("Open preserved UI");
    expect(renderRoute("/app/studio/rerank", createElement(StudioRerankRoute))).not.toContain("Open preserved UI");
    expect(renderRoute("/app/studio/advanced", createElement(StudioAdvancedRoute))).not.toContain("Open preserved UI");
    expect(renderRoute("/app/integrations/upstream", createElement(IntegrationsUpstreamRoute))).not.toContain("Open preserved UI");
    expect(renderRoute("/app/system/peers", createElement(SystemPeersRoute))).not.toContain("Open raw health");
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
    const upstreamMarkup = renderRoute("/app/integrations/upstream", createElement(IntegrationsUpstreamRoute));
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

  test("design system doc marks the converted pages as live routes", () => {
    expect(designSystemDocSource).toContain("| `/app/studio/images` | live | `studio-workspace` |");
    expect(designSystemDocSource).toContain("| `/app/studio/audio` | live | `studio-workspace` |");
    expect(designSystemDocSource).toContain("| `/app/studio/rerank` | live | `studio-workspace` |");
    expect(designSystemDocSource).toContain("| `/app/studio/advanced` | live | `studio-workspace` |");
    expect(designSystemDocSource).toContain("| `/app/integrations/upstream` | live | `contract-reference` |");
    expect(designSystemDocSource).toContain("| `/app/system/peers` | live | `system-topology` |");
    expect(designSystemDocSource).not.toContain("| `/app/studio/images` | implementation target |");
    expect(designSystemDocSource).not.toContain("even if the repo-owned page implementation is still in progress");
  });

  test("applies the swiss stone palette, ibm plex typography, and dual-scheme browser contract in shared app chrome", () => {
    expect(appCss).toContain("--rm-bg: #fafaf9;");
    expect(appCss).toContain("--rm-surface: #f5f5f4;");
    expect(appCss).toContain("--rm-surface-strong: #f5f5f4;");
    expect(appCss).toContain("--rm-panel: #e7e5e4;");
    expect(appCss).toContain("--rm-fg: #1c1917;");
    expect(appCss).toContain("--rm-secondary: rgba(28, 25, 23, 0.70);");
    expect(appCss).toContain("--rm-muted: rgba(28, 25, 23, 0.40);");
    expect(appCss).toContain("--rm-accent: #C8102E;");
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
});
