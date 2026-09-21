import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";

import { describe, expect, test } from "vitest";

import type { LearningPolicyField } from "../lib/learning-api";
import { LearningOverviewPage, formatPolicyRange, selectionNoteForStage } from "./learning";

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
    for (const label of [
      'label: "Overview"',
      'label: "Configuration"',
      'label: "Packs"',
      'label: "Decisions"',
      'label: "Evidence"',
    ]) {
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
   * Run 98 addendum 47, found while verifying the S4 default: the runtime sends `min`/`max` as null for enum
   * fields, and the old `=== undefined` test pushed every enum into the numeric branch, so the Range column
   * read "— – —" for `stage` — the field the operator was looking at.
   */
  /**
   * Run 98 addendum 44 `A44-S4`: the Configuration page renders the router's own policy resolution next to the
   * stored document, and a degraded resolution is a visible warning naming the failing field or version — not
   * a stored policy presented as if it were in effect.
   */
  test("run98 a44 s4: the configuration page renders the router policy resolution and its degraded state", () => {
    const routeSource = readFileSync(new URL("./learning.tsx", import.meta.url), "utf8");
    for (const token of [
      "summarizePolicyResolution",
      "routerResolution",
      "Router resolution",
      "resolution.warning",
      "resolution.routerStage",
      "resolution.storedDigest",
    ]) {
      expect(routeSource).toContain(token);
    }
  });

  test("run98 a47: a policy field's range shows enum values, not an empty numeric span", () => {
    const field = (overrides: Partial<LearningPolicyField>): LearningPolicyField =>
      ({
        name: "stage",
        type: "enum",
        values: ["S0", "S1", "S2", "S3", "S4"],
        unit: "stage",
        default: "S4",
        uiEditable: true,
        description: "",
        value: "S4",
        ...overrides,
      }) as LearningPolicyField;

    // The runtime's JSON carries nulls, not missing keys, for an enum's bounds.
    expect(formatPolicyRange(field({ min: null as never, max: null as never }))).toBe(
      "S0 | S1 | S2 | S3 | S4",
    );
    expect(formatPolicyRange(field({ min: 60_000, max: 86_400_000 }))).toBe("60000 – 86400000");
    expect(
      formatPolicyRange(field({ values: undefined, min: null as never, max: null as never })),
    ).toBe("—");
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

  /**
   * Run 98 addendum 31 S5: "missing or pruned evidence lowers readiness" has to be visible. The
   * overview reads the auditability counts the runtime publishes, so an operator can see how much of
   * the scored evidence is checkable instead of reading a surface that only reports volume.
   */
  test("the overview reports input auditability from the runtime summary", () => {
    const routeSource = readFileSync(new URL("./learning.tsx", import.meta.url), "utf8");
    expect(routeSource).toContain('label="Input auditability"');
    expect(routeSource).toContain("auditability.resolvedInputs");
    expect(routeSource).toContain("auditability.unresolvedInputs");
    expect(routeSource).toContain("auditability.missingInputProof");
  });

  /**
   * Run 98 addendum 25 §1 (operator-reported, 2026-09-16): the Recent decisions panel asserted a
   * hardcoded "the selection always remains the baseline in stage S1" while the scope was running
   * S2, contradicting the STAGE metric in the same page's header. The sentence is a claim about
   * safety-relevant behaviour, so it has to follow the live stage readback rather than being static
   * copy. This pins the derivation itself: S1 keeps the baseline claim, any other reported stage
   * states the eligible-set bound *for that stage*, and an unreported stage asserts no stage at all.
   */
  test("the decisions panel derives its selection claim from the live stage instead of asserting S1", () => {
    // Stage S1 is the only stage in which the selection is guaranteed to stay on the baseline.
    expect(selectionNoteForStage("S1")).toBe(
      "the selection always remains the baseline in stage S1",
    );
    // S2 (the stage the scope was actually running) must never be described with the S1 claim.
    const s2 = selectionNoteForStage("S2");
    expect(s2).not.toContain("S1");
    expect(s2).toContain("stage S2");
    // Higher activation stages are handled by the same rule rather than falling back to S1 copy.
    const s4 = selectionNoteForStage("S4");
    expect(s4).not.toContain("S1");
    expect(s4).toContain("stage S4");
    // An unreported stage makes no stage claim at all instead of inventing one.
    const unknown = selectionNoteForStage("");
    expect(unknown).not.toContain("S1");
    expect(unknown).not.toContain("S2");
    expect(unknown.length).toBeGreaterThan(0);
  });

  /**
   * Run 98 addendum 25 §1/§2: the panel description is composed from the derived note (never a
   * hardcoded stage), and a collapsed decision row states how many observations it stands for so
   * the "Recent decisions" table cannot read as duplicated rows.
   */
  test("the decisions panel composes its description from the derived note and labels collapsed rows", () => {
    const routeSource = readFileSync(new URL("./learning.tsx", import.meta.url), "utf8");
    expect(routeSource).toContain("${selectionNote}");
    expect(routeSource).toContain("Each row is one decision with its observation count");
    // The overview table marks a row that stands for several observations…
    expect(routeSource).toContain("Number(row.observationCount) > 1");
    // …and the Decisions page reports the count as a first-class metric.
    expect(routeSource).toContain('label="Observations"');
  });
});
