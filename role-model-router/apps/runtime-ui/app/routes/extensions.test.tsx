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
    expect(routeSource).toContain('label: "Installed"');
    for (const token of [
      "fetchContributionState",
      "updateContributionState",
      "fetchRecommendations",
      "downloadRecommendations",
      "applyRecommendation",
      "Recommendation ledger",
      "Contribution posture",
      "Extension inventory",
      "Opt out & clear queue",
      "Active pack",
      "Download & validate latest",
      "Validate & apply",
      "Applied",
      "secondaryButtonClassName",
    ])
      expect(routeSource).toContain(token);
    expect(routeSource).toContain("Authorization epoch");
    expect(routeSource).toContain("Retention");
    expect(routeSource).toContain("Degradation");
    expect(routeSource).toContain("Routing dependency");
    expect(routeSource).toContain("Data classes");
    expect(routeSource).toContain("Health probe");
    expect(routeSource).toContain("LIFECYCLE_COPY");
    expect(routeSource).toContain("operatorBoundaryNote");
    expect(routeSource).toContain("shadow-only");
    expect(routeSource).toContain("Direct Track B v1.1");
    expect(routeSource).toContain(
      "cannot change production prompts, routes, weights, or active profiles",
    );
    expect(routeSource).not.toContain("ceremony-bound ON");
    expect(routeSource).not.toContain("production prompt injection");
    expect(routeSource).not.toContain("do not expose a public enable/disable mutation API");
    expect(routeSource).toContain("mutateExtension");
    expect(routeSource).toContain("dismissRecommendation");
    expect(routeSource).toContain("FilterSelect");
    expect(routeSource).toContain("hideLabel");
    expect(routeSource).not.toContain("SelectField");
    expect(routeSource).toContain("Set mode");
    expect(routeSource).toContain("compactFieldButtonClassName");
    expect(routeSource).toContain("compactFieldButtonEmphasisClassName");
    expect(routeSource).not.toMatch(
      /Set mode[\s\S]{0,200}primaryButtonClassName|modeDirty \? primaryButtonClassName/,
    );
    expect(routeSource).toContain("formatModeLabel");
    expect(routeSource).toContain("Set mode");
    expect(routeSource).not.toMatch(/>\s*Enable\s*</);
    expect(routeSource).not.toMatch(/>\s*Disable\s*</);
    expect(routeSource).toContain("Dismiss");
    expect(routeSource).toContain("confirm(");
    expect(routeSource).toContain("isOperatorDisabled");
    expect(routeSource).toContain("lifecyclePillTone");
    expect(routeSource).toContain("Mode draft is");
    expect(routeSource).toContain("applyMode");
    expect(routeSource).toContain("prepareKnowledgeWorkerShadowReady");
    expect(routeSource).toContain("Prepare shadow-ready");
    expect(routeSource).not.toContain("activateKnowledgeWorkerProduction");
    expect(routeSource).not.toContain("deactivateKnowledgeWorkerProduction");
    expect(routeSource).not.toContain("Production ON");
    expect(routeSource).not.toContain("Soft OFF");
    expect(routeSource).toContain("xl:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]");
  });
  test("renders the existing design-system loading shell before operational state arrives", () => {
    const html = renderToStaticMarkup(<ExtensionsRouteView />);
    expect(html).toContain("Installed");
    expect(html).toContain("Loading extension lifecycle");
    expect(html).toContain("Extension inventory");
    expect(html).toContain("Contribution posture");
    expect(html).toContain("Recommendation ledger");
    expect(html).not.toContain("installed: true");
  });
});
