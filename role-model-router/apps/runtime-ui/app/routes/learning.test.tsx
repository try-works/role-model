import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";

import { describe, expect, test } from "vitest";

import { LearningOverviewPage } from "./learning";

/**
 * Run 98 R17: the Learning route exists with its five pages, reads the operator surface
 * rather than hardcoding values, and renders explicit degraded states.
 */

describe("LearningRoute", () => {
  test("registers the Learning section, its five pages, and the route table entries", () => {
    const routeSource = readFileSync(new URL("./learning.tsx", import.meta.url), "utf8");
    const routeConfig = readFileSync(new URL("../routes.ts", import.meta.url), "utf8");
    const navigation = readFileSync(new URL("../lib/design-system.ts", import.meta.url), "utf8");

    for (const path of [
      'route("learning", "routes/learning.tsx"',
      'route("learning/configuration", "routes/learning.tsx"',
      'route("learning/packs", "routes/learning.tsx"',
      'route("learning/decisions", "routes/learning.tsx"',
      'route("learning/evidence", "routes/learning.tsx"',
    ]) {
      expect(routeConfig).toContain(path);
    }
    expect(navigation).toContain('title: "Learning"');
    for (const label of ['label: "Overview"', 'label: "Configuration"', 'label: "Packs"', 'label: "Decisions"', 'label: "Evidence"']) {
      expect(navigation).toContain(label);
    }
    for (const page of [
      "LearningOverviewPage",
      "LearningConfigurationPage",
      "LearningPacksPage",
      "LearningDecisionsPage",
      "LearningEvidencePage",
    ]) {
      expect(routeSource).toContain(page);
    }
  });

  test("publishes the classification columns on the decisions views (run 99 addenda 19-21 S33)", () => {
    const routeSource = readFileSync(new URL("./learning.tsx", import.meta.url), "utf8");
    for (const token of [
      '"Role"',
      '"Taxonomy"',
      '"Taxonomy version"',
      '"Tool classes"',
      "row.roleId",
      "row.taxonomyVersion",
      "row.toolClassIds",
    ]) {
      expect(routeSource).toContain(token);
    }
  });

  test("renders schema-driven configuration with bounds, defaults and confirmations", () => {
    const routeSource = readFileSync(new URL("./learning.tsx", import.meta.url), "utf8");
    for (const token of [
      "validatePolicyDraft",
      "field.uiEditable",
      "field.description",
      "field.unit",
      "field.default",
      "window.confirm",
      "Save policy change",
      "Roll back policy",
      "expectedPolicyVersion",
      // Run 99 R28: the kill switch is reversible from the surface, and a refused mutation must
      // surface the server error instead of a success notice.
      "Release kill switch",
      "engaged: false",
      "Kill switch released; activation is allowed again.",
    ]) {
      expect(routeSource).toContain(token);
    }
    // No fabricated values: degraded states are explicit and the pages read the operator surface.
    expect(routeSource).toContain("No value is fabricated");
    for (const api of [
      "fetchLearningPolicy",
      "fetchLearningRollout",
      "fetchLearningRecords",
      "fetchLearningDecisions",
      "fetchLearningMeasurement",
      "activateLearningPack",
      "rollbackLearningPack",
      "engageLearningKillSwitch",
    ]) {
      expect(routeSource).toContain(api);
    }
  });

  test("the overview page renders without an operator token and without throwing", () => {
    const markup = renderToStaticMarkup(<LearningOverviewPage />);
    expect(markup).toContain("Learning overview");
    expect(markup).toContain("Operator token");
  });

  /**
   * Run 99 R33 (addendum 19 S33/S35): the decision surface must show which task family the
   * request belonged to and which family the advisory was scoped to, so a family-scoped refusal is
   * readable. Absent data renders an explicit "not reported" rather than a fabricated value.
   */
  test("the decisions and overview surfaces render the request and advisory task families", () => {
    const routeSource = readFileSync(new URL("./learning.tsx", import.meta.url), "utf8");
    expect(routeSource).toContain('label="Task family (request)"');
    expect(routeSource).toContain('label="Advisory family"');
    expect(routeSource).toContain('"Request family"');
    // Absent families are reported honestly on both surfaces.
    expect(routeSource).toContain('? show(row.requestTaskTypeId) : "not reported"');
    expect(routeSource).toContain('? show(row.taskTypeId) : "not reported"');
  });
});
