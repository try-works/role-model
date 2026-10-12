/**
 * Run 108 addendum-01 A2 (R3 acceptance + R6b): UI registration for the store degradation
 * receipts page.
 *
 * a3fe207a shipped the view (app/routes/store-degradation-receipts.tsx) and its host client,
 * but nothing registered it: the route file was unreachable and the page had no sidebar entry,
 * so "the receipts surface in the operator UI" was still false on a running host. This suite
 * pins the registration in the two places the runtime shell reads:
 *
 *  1. app/routes.ts - the React Router route (the file must be reachable at
 *     /app/observe/store-degradation-receipts);
 *  2. the Observe section of the runtime navigation registry, which is what renders the sidebar
 *     entry and what the shell uses to resolve the page's title/section. NOTE: that registry lives
 *     in app/lib/design-system.ts (runtimeNavigationSections), NOT in app/routes/app-layout.tsx -
 *     app-layout.tsx is the 14-line Outlet shell and holds no navigation data. An entry added
 *     there would be inert, so the sidebar entry is pinned where it actually renders.
 */
import { readFileSync } from "node:fs";

import { describe, expect, test } from "vitest";

import { getRuntimeRouteDefinition, runtimeNavigationSections } from "./design-system";

const routesSource = (): string => readFileSync(new URL("../routes.ts", import.meta.url), "utf8");

const STORE_DEGRADATION_PATH = "/app/observe/store-degradation-receipts";

describe("run108 addendum-01 A2 store degradation receipts UI registration", () => {
  test("registers the route file in the app route config", () => {
    const source = routesSource();
    expect(source).toContain(
      'route("observe/store-degradation-receipts", "routes/store-degradation-receipts.tsx")',
    );
  });

  test("lists the page in the Observe navigation section", () => {
    const observe = runtimeNavigationSections.find((section) => section.title === "Observe");
    expect(observe).toBeDefined();
    expect(observe?.items.map((item) => item.to)).toContain(STORE_DEGRADATION_PATH);
  });

  test("resolves the page to its own route definition", () => {
    expect(getRuntimeRouteDefinition(STORE_DEGRADATION_PATH)).toEqual(
      expect.objectContaining({
        id: "observe-store-degradation-receipts",
        label: "Degradation receipts",
        section: "Observe",
      }),
    );
  });

  test("the registered route file exports the receipts view component", () => {
    const view = readFileSync(
      new URL("../routes/store-degradation-receipts.tsx", import.meta.url),
      "utf8",
    );
    expect(view).toContain("export default StoreDegradationReceiptsRouteView");
  });
});
