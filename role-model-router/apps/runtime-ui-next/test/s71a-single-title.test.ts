import { afterEach, describe, expect, it } from "vitest";
import { mountShell } from "../src/mount";

const routes = [
  "/",
  "/diagnostics/abc",
  "/observe/observability-snapshot",
  "/observe/store-degradation-receipts",
  "/observe/queues",
  "/local/logs",
  "/router/candidates",
  "/requests",
  "/router/decisions",
  "/local/peers",
  "/system/peers",
  "/runtime",
  "/session-readiness",
  "/dashboard",
  "/local/swap",
  "/observe/activity",
  "/observe/logs",
  "/observe/routing",
  "/router",
  "/control/providers",
  "/control/endpoints",
  "/control/controller",
  "/control/queues-config",
  "/integrations/downstream",
  "/integrations/upstream",
  "/local/choose",
  "/local/peer-models",
  "/system/benchmark",
  "/system/storage-retention",
  "/studio",
  "/learning",
  "/models",
  "/requests/req-1",
  "/router/decisions/req-1",
  "/does/not/exist",
] as const;

const mounted: Array<{ container: HTMLElement; handle: { dispose(): void } }> = [];
afterEach(() => {
  for (const entry of mounted.splice(0)) {
    entry.handle.dispose();
    entry.container.remove();
  }
  window.history.replaceState({}, "", "/");
});

describe("S71a one h1 per route", () => {
  for (const route of routes) {
    it(`keeps one shell h1 and renders the page title below it on ${route}`, async () => {
      window.history.replaceState({}, "", route);
      const container = document.createElement("div");
      container.id = `s71a-${route.replaceAll(/[^a-zA-Z0-9]/g, "-")}`;
      document.body.append(container);
      const handle = mountShell(container);
      mounted.push({ container, handle });
      const deadline = Date.now() + 2000;
      while (
        Date.now() < deadline &&
        document.querySelectorAll("[data-shell-route] h1, h1[data-shell-route]").length === 0
      ) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      const shellHeadings = document.querySelectorAll(
        "[data-shell-route] h1, h1[data-shell-route]",
      );
      expect(shellHeadings, route).toHaveLength(1);
      const shellTitle = shellHeadings[0]?.textContent?.trim() ?? "";
      expect(shellTitle.length, route).toBeGreaterThan(0);
      expect(shellTitle.length, route).toBeGreaterThan(0);
      const page = document.querySelector("[data-route]");
      expect(page, route).not.toBeNull();
      // The reference page title is an in-page h2/h3; the shell owns the only h1.
      expect(page?.querySelectorAll("h1").length ?? 0, route).toBe(0);
      expect(page?.querySelectorAll("h2, h3").length ?? 0, route).toBeGreaterThanOrEqual(1);
    });
  }
});
