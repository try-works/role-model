import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { ExtensionsRouteView } from "./extensions";

describe("ExtensionsRoute", () => {
  test("registers an operational extension lifecycle and health shell", () => {
    const routeSource = readFileSync(new URL("./extensions.tsx", import.meta.url), "utf8");
    const routeConfig = readFileSync(new URL("../routes.ts", import.meta.url), "utf8");
    expect(routeConfig).toContain('route("system/extensions", "routes/extensions.tsx")');
    expect(routeSource).toContain("fetchExtensions");
    expect(routeSource).toContain("Installed extensions");
    for (const token of [
      "fetchContributionState",
      "updateContributionState",
      "fetchRecommendations",
      "downloadRecommendations",
      "applyRecommendation",
      "Signed recommendations",
      "Opt out & clear queue",
      "Active pack",
      "Download & validate latest",
      "secondaryButtonClassName",
    ])
      expect(routeSource).toContain(token);
    expect(routeSource).toContain("Authorization epoch");
    expect(routeSource).toContain("Retention");
    expect(routeSource).toContain("Degradation");
  });
  test("renders the existing design-system loading shell before operational state arrives", () => {
    const html = renderToStaticMarkup(<ExtensionsRouteView />);
    expect(html).toContain("Installed extensions");
    expect(html).toContain("Loading extension lifecycle");
    expect(html).toContain("Extension boundary");
    expect(html).not.toContain("installed: true");
  });
});
