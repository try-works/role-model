import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";

import { describe, expect, test } from "vitest";

import type { LearningPolicyField } from "../lib/learning-api";
import {
  LearningDecisionRow,
  LearningOverviewPage,
  LearningPackRow,
  formatLearningScore,
  formatPolicyRange,
  learningVerdictWord,
  selectionNoteForStage,
} from "./learning";

/**
 * Run 101 addendum 48: the fixtures below are the readback shapes the three rebuilt Learning tables render -
 * `/learning/decisions` and `/learning/records` rows carrying the addendum's `evidence` object plus the fields
 * those rows already publish.
 */
const decisionRowFixture = () => ({
  decisionId: "decision-req-c0eb7e1b",
  requestTaskTypeId: "coder.review",
  taskTypeId: null,
  roleId: "coder",
  taxonomyVersion: "1.0.0-alpha.1",
  toolClassIds: ["tools.shell"],
  qualityDelta: 0.06,
  validationReceiptId: "validation-2403",
  observedAtMs: 1790633174907,
  observationCount: 3,
  decision: "validate",
  classification: {
    roleId: "coder",
    taskTypeId: "coder.review",
    taxonomyVersion: "1.0.0-alpha.1",
  },
  familyEvidence: { decisiveComparisons: 1, holdoutComparisons: 1 },
  evidence: {
    comparisonId: "comparison:supervised-replay:9a2a9ab3583fe47f1ea1",
    judgeEndpointId: "kimi-k3",
    judgeSource: "controller",
    outcome: "candidate",
    winnerCandidateRef: "deepseek-v4-flash",
    replayRef: null,
    captureRef: null,
    members: [
      {
        candidateRef: "deepseek-v4-flash",
        role: "source",
        score: 0.82,
        disposition: "positive",
        dimensionScores: [],
      },
      {
        candidateRef: "deepseek-v4-pro",
        role: "counterfactual",
        score: 0.79,
        disposition: "negative",
        dimensionScores: [],
      },
    ],
  },
});

const packRowFixture = () => ({
  recordId: "pack-3b704362a26e5b599dd502a01fd9894f",
  kind: "pack",
  state: "validated",
  scopeId: "standalone-runtime-stage",
  record: {
    scope: {
      endpointId: "deepseek.personal.deepseek-api-key.global.deepseek-v4-flash",
      roleId: "writer",
      taxonomyVersion: "1.0.0-alpha.1",
    },
    validationReceiptId: "validation-23f8a106423cd4a00703c377fe58e325",
    qualityDelta: 0.06,
    familyEvidence: { decisiveComparisons: 9, holdoutComparisons: 4 },
  },
  evidence: {
    comparisonId: "comparison:supervised-replay:9a2a9ab3583fe47f1ea1",
    judgeEndpointId: "deepseek.personal.deepseek-api-key.global.deepseek-v4-flash-max",
    judgeSource: "controller",
    outcome: "candidate",
    winnerCandidateRef: "deepseek-v4-flash",
    replayRef: "replay-c0eb7e1b",
    captureRef: "req-c0eb7e1b",
    members: [
      { candidateRef: "deepseek-v4-flash", role: "source", score: 0.82, disposition: "positive" },
      {
        candidateRef: "deepseek-v4-pro",
        role: "counterfactual",
        score: 0.79,
        disposition: "negative",
      },
      {
        candidateRef: "gpt-5.6-terra",
        role: "counterfactual",
        score: null,
        disposition: "incomplete",
      },
    ],
  },
});

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

  /**
   * Run 101 addendum 48 `A48-R6`: the three surfaces are the operator-approved column tables. The columns are
   * asserted here as source tokens and again against the live runtime by the two Learning Playwright specs.
   */
  test("run101 a48: the three surfaces publish the approved column headers", () => {
    const routeSource = readFileSync(new URL("./learning.tsx", import.meta.url), "utf8");
    for (const token of [
      '"Role · task"',
      '"Models · judge score"',
      '"Judge"',
      '"Evidence"',
      '"Decision"',
      '"Receipt"',
      '"Replay models · score"',
      '"Pack model"',
      '"Claim · evidence"',
      '"State"',
      '"Action"',
    ]) {
      expect(routeSource).toContain(token);
    }
    // Run 99 addenda 19-21 S33: the classification facts the decision views published stay on the surface.
    for (const token of ["row.roleId", "row.taxonomyVersion", "row.toolClassIds"]) {
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

  /**
   * Run 100 R6.1: the operator must be able to see *why* evidence is excluded without reading stores.
   * The evidence page renders the learner's own receipts - per-family evidence against the floor and
   * the exclusions by reason - from the learning summary's `learnerEvidence` section. Phase 5 inspects
   * the rendered page against the same readback with live traffic; this test pins the contract.
   */
  test("run100 r6.1: the evidence page renders per-family evidence and exclusions by reason", () => {
    const routeSource = readFileSync(new URL("./learning.tsx", import.meta.url), "utf8");
    for (const token of [
      "learnerEvidence",
      "excludedByReason",
      "byFamily",
      "Evidence loss by reason",
      "Exclusion reason",
      "Distinct captures",
      "Floor met",
      "No learner validation receipt has been recorded yet.",
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
   * Run 99 R33 (addendum 19 S33/S35) under the run-101 addendum 48 tables: a family-scoped refusal stays
   * readable, so the `Role · task` cell states the classified task and the request family whenever the two
   * differ - and an absent classification renders `not reported` rather than a fabricated value.
   */
  test("the role · task cell states the classification and the request family when it differs", () => {
    const differing = {
      ...decisionRowFixture(),
      requestTaskTypeId: "creative.copywriting",
      toolClassIds: ["tools.http", "tools.filesystem"],
    };
    const markup = renderToStaticMarkup(<LearningDecisionRow row={differing} />);
    expect(markup).toContain("coder.review");
    expect(markup).toContain("coder · taxonomy 1.0.0-alpha.1");
    expect(markup).toContain("tool classes tools.http, tools.filesystem");
    expect(markup).toContain("request creative.copywriting");

    const absent = renderToStaticMarkup(<LearningDecisionRow row={{ decisionId: "decision-req-1" }} />);
    expect(absent).toContain("not reported");
    expect(absent).not.toContain("coder.review");
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
    // …and the Decisions table stands for the same collapsed row rather than rendering it twice.
    expect(routeSource).toContain("<ObservationCountMarker row={row} />");
  });

  /**
   * Run 101 addendum 48 `A48-R2`/`A48-R3`: the pack table lists the models that were replayed with their judge
   * scores, marks exactly one winner, and names the model the pack routes with (`record.scope.endpointId`).
   */
  test("run101 a48: a pack row names its replay models, the winner and the pack model", () => {
    const markup = renderToStaticMarkup(
      <LearningPackRow activePackageId={null} onActivate={() => {}} row={packRowFixture()} />,
    );
    expect(markup).toContain("pack-3b704362a26e5b599dd502a01fd9894f");
    expect(markup).toContain("writer · taxonomy 1.0.0-alpha.1");
    expect(markup).toContain("deepseek-v4-flash");
    expect(markup).toContain("0.82");
    expect(markup).toContain("deepseek-v4-pro");
    expect(markup).toContain("0.79");
    expect(markup).toContain("gpt-5.6-terra");
    expect(markup).toContain("excluded");
    // Only the winner is marked, and it is marked with the design system's green ink.
    expect(markup.match(/>won</g) ?? []).toHaveLength(1);
    expect(markup).toContain("text-[var(--rm-success)]");
    // The pack model is the pack's own routing target, and the recorded evidence is stated, not invented.
    expect(markup).toContain("deepseek.personal.deepseek-api-key.global.deepseek-v4-flash");
    expect(markup).toContain("9 decisive · holdout 4");
    expect(markup).toContain("Δ +0.06 over baseline");
    expect(markup).toContain("judge controller · deepseek.personal");
    expect(markup).toContain("claim not recorded");
  });

  /**
   * Run 101 addendum 48 `A48-R3`: a pack with no winner says so instead of naming a model, and the pack's own
   * recorded state is what the State column shows.
   */
  test("run101 a48 a48-r3: a pack with no winner says so instead of naming a model", () => {
    const markup = renderToStaticMarkup(
      <LearningPackRow
        activePackageId={null}
        onActivate={() => {}}
        row={{
          recordId: "pack-62aa9b",
          kind: "pack",
          state: "validated",
          scopeId: "standalone-runtime-stage",
          record: {
            scope: {
              endpointId: "openai.personal.openai-codex-subscription.global.gpt-5.6-sol-low",
              roleId: "tester",
              taxonomyVersion: "1.0.0-alpha.1",
            },
            qualityDelta: -0.04,
          },
          evidence: { outcome: "insufficient", winnerCandidateRef: null, members: [] },
        }}
      />,
    );
    expect(markup).toContain("no winner");
    expect(markup).toContain("pack carries no model");
    expect(markup).not.toContain("openai.personal.openai-codex-subscription.global.gpt-5.6-sol-low");
    expect(markup).toContain("validated");
    expect(markup).toContain("Δ -0.04 over baseline");
  });

  /**
   * Run 101 addendum 48 `A48-R4`/`A48-R5`: a decision row names the role · task, the models with their scores,
   * the judge, the evidence it was adjudicated on, the verdict, and the receipt chain to the depth the store
   * holds - a replay or capture ref the readback does not carry renders as absent.
   */
  test("run101 a48: a decision row names role · task, models, judge, evidence, verdict and receipt", () => {
    const markup = renderToStaticMarkup(<LearningDecisionRow receipt row={decisionRowFixture()} />);
    expect(markup).toContain("coder.review");
    expect(markup).toContain("coder · taxonomy 1.0.0-alpha.1");
    expect(markup).toContain("deepseek-v4-flash");
    expect(markup).toContain("0.82");
    expect(markup).toContain("deepseek-v4-pro");
    expect(markup).toContain("0.79");
    expect(markup).toContain("controller");
    expect(markup).toContain("kimi-k3");
    expect(markup).toContain("1 dec · 1 holdout");
    expect(markup).toContain("Δ +0.06");
    expect(markup).toContain("promoted");
    expect(markup).toContain("outcome candidate");
    expect(markup).toContain("validation validation-2403");
    expect(markup).toContain("comparison 9a2a9ab3583fe4");
    expect(markup).toContain("replay not reported · capture not reported");

    const deeper = {
      ...decisionRowFixture(),
      evidence: {
        ...decisionRowFixture().evidence,
        replayRef: "replay-c0eb7e1b",
        captureRef: "req-c0eb7e1b",
      },
    };
    const deeperMarkup = renderToStaticMarkup(<LearningDecisionRow receipt row={deeper} />);
    expect(deeperMarkup).toContain("replay replay-c0eb7e1b · capture req-c0eb7e1b");
  });

  /**
   * Run 101 addendum 48 `A48-R7`: the runtime's verdict vocabulary is four words plus "not recorded", and a
   * score exists only where the readback supplies one - the surfaces never derive either.
   */
  test("run101 a48: the recorded verdict vocabulary maps to the four operator words and nothing else", () => {
    expect(learningVerdictWord("validate")).toBe("promoted");
    expect(learningVerdictWord("reject")).toBe("rejected");
    expect(learningVerdictWord("insufficient_evidence")).toBe("insufficient");
    expect(learningVerdictWord("insufficient")).toBe("insufficient");
    expect(learningVerdictWord("refused")).toBe("refused");
    // Words the runtime never emits as a validation decision map to nothing rather than to a plausible verdict.
    expect(learningVerdictWord("candidate")).toBeNull();
    expect(learningVerdictWord("shadow_validating")).toBeNull();
    expect(learningVerdictWord(null)).toBeNull();

    expect(formatLearningScore(0.5)).toBe("0.50");
    expect(formatLearningScore(0.824)).toBe("0.82");
    expect(formatLearningScore(null)).toBeNull();
    expect(formatLearningScore(undefined)).toBeNull();
    expect(formatLearningScore("0.9")).toBeNull();
  });

  /**
   * Run 101 addendum 48 `A48-R7`: with a deliberately narrowed readback the affected cells render the bounded
   * absence text and the row still renders - no value appears that the readback did not supply.
   */
  test("run101 a48 a48-r7: a narrowed readback renders bounded absence, never a substitute", () => {
    const narrowed = {
      decisionId: "decision-req-narrowed",
      requestTaskTypeId: "coder.review",
      roleId: "coder",
      taxonomyVersion: "1.0.0-alpha.1",
      qualityDelta: 0.06,
    };
    const markup = renderToStaticMarkup(<LearningDecisionRow receipt row={narrowed} />);
    // The row still renders what the readback did carry…
    expect(markup).toContain("coder.review");
    expect(markup).toContain("coder · taxonomy 1.0.0-alpha.1");
    expect(markup).toContain("Δ +0.06");
    // …and every field it did not carry is bounded absence: no score, judge, verdict, outcome or receipt id.
    expect(markup).toContain("not reported");
    expect(markup).not.toContain("0.82");
    expect(markup).not.toContain("kimi-k3");
    expect(markup).not.toContain("promoted");
    expect(markup).not.toContain("outcome candidate");
    expect(markup).toContain("validation not reported");
    expect(markup).toContain("comparison not reported");

    const narrowedPack = renderToStaticMarkup(
      <LearningPackRow
        activePackageId={null}
        onActivate={() => {}}
        row={{ recordId: "pack-narrowed", state: "validated", record: {} }}
      />,
    );
    expect(narrowedPack).toContain("pack-narrowed");
    expect(narrowedPack).toContain("no winner");
    expect(narrowedPack).toContain("not reported");
    expect(narrowedPack).not.toContain("0.82");
  });

  /**
   * Run 101 addendum 48: the Decisions table keeps its filters (role, task, outcome and the observation origin
   * that selects which readback the page asks for) and pages the bounded list it was handed.
   */
  test("run101 a48: the decisions table keeps its filters and pages the bounded list", () => {
    const routeSource = readFileSync(new URL("./learning.tsx", import.meta.url), "utf8");
    for (const token of [
      'label="Role"',
      'label="Task"',
      'label="Outcome"',
      "Observation origin",
      "Show more decisions",
      "the readback is truncated",
    ]) {
      expect(routeSource).toContain(token);
    }
  });
});
