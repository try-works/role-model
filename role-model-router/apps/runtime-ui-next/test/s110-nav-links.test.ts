import { describe, expect, it } from "vitest";

import { routeFromUrl } from "../src/route.js";

/**
 * Run 115 S110: every navigation link the shell renders must resolve to a real route.
 *
 * Audited by hand in the browser against the shipped build (25 unique hrefs, zero dead), and
 * pinned here so a renamed or dropped route cannot leave a link that renders NotFound.
 */
const NAV_HREFS = [
  "/",
  "/diagnostics/42",
  "/observe/observability-snapshot",
  "/observe/store-degradation-receipts",
  "/observe/queues",
  "/local/logs",
  "/requests",
  "/observe/activity",
  "/observe/logs",
  "/observe/routing",
  "/router/candidates",
  "/router/decisions",
  "/control/providers",
  "/control/endpoints",
  "/control/controller",
  "/router",
  "/system/peers",
  "/local/peers",
  "/runtime",
  "/session-readiness",
  "/dashboard",
  "/local/swap",
  "/studio",
  "/learning",
  "/models",
] as const;

describe("S110 navigation links resolve", () => {
  it.each(NAV_HREFS)("%s is a real route", (href) => {
    const route = routeFromUrl(new URL("http://127.0.0.1:1" + href));
    expect(route.tag).not.toBe("NotFound");
  });
});
