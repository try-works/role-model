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
  learningRecentDecisionRows,
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
   * Run 101 addendum 49 `A49-R8`, found by live verification: the Overview panel asked for the newest ten
   * observations and rendered them whatever they were. On `rc-5aab133d8025` all ten were candidate-less shadow judge
   * calls, so the panel showed a grid of `not reported` beside a Decisions page that was fully populated.
   */
  test("run101 a49: the overview panel keeps replay decisions and drops candidate-less observations", () => {
    const decision = decisionRowFixture();
    const observation = {
      ...decisionRowFixture(),
      decisionId: "decision-replay-judge-x",
      candidateId: null,
      evidence: null,
    };
    const rows = [observation, decision, { ...observation, decisionId: "decision-replay-judge-y" }];
    const kept = learningRecentDecisionRows(rows);
    expect(kept).toHaveLength(1);
    expect(kept[0].decisionId).toBe(decision.decisionId);
    // A window that holds no replay decision yields nothing, which is the caller's cue to explain rather than
    // print a table of absences.
    expect(learningRecentDecisionRows([observation, { ...observation }])).toHaveLength(0);
    // The limit still bounds what the panel shows.
    expect(learningRecentDecisionRows([decision, decision, decision], 2)).toHaveLength(2);
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

    const absent = renderToStaticMarkup(
      <LearningDecisionRow row={{ decisionId: "decision-req-1" }} />,
    );
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
    expect(markup).toContain("judge controller · deepseek-v4-flash-max");
    expect(markup).toContain("claim not recorded");
  });

  /**
   * Run 101 addendum 48 follow-up (the `Pack model` correction): the pack model is the pack's own routing target,
   * so `record.scope.endpointId` renders whether or not the comparison `evidence` object has landed yet. Gating the
   * cell on a winner made a value the live readback already carries read as absent, which is the opposite failure
   * from the one `A48-R7` guards against.
   */
  test("run101 a48 packmodel: a pack without comparison evidence still names its own routing target", () => {
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
        }}
      />,
    );
    expect(markup).toContain("openai.personal.openai-codex-subscription.global.gpt-5.6-sol-low");
    // The muted second line carries the scope the endpoint was recorded for, and the pack's own state stands.
    expect(markup).toContain("routing target for tester · taxonomy 1.0.0-alpha.1");
    expect(markup).toContain("validated");
    expect(markup).toContain("Δ -0.04 over baseline");
    // An endpoint the readback carries is never reported as missing…
    expect(markup).not.toContain("pack carries no model");
    expect(markup).not.toContain("no model recorded");
    // …while the replay-models column still states that nothing was compared for this pack yet.
    expect(markup).toContain("not reported");
  });

  /**
   * Run 101 addendum 48 `A48-R3`: only the winner mark is driven by the replayed comparison's
   * `winnerCandidateRef` - exactly one line is marked when the readback names a winner and none when it does not -
   * and a readback that disagrees with the pack's own target is shown as it states it, not reconciled in the UI.
   */
  test("run101 a48 packmodel: the winner mark follows the replay readback, not the pack model", () => {
    const marked = renderToStaticMarkup(
      <LearningPackRow activePackageId={null} onActivate={() => {}} row={packRowFixture()} />,
    );
    expect(marked.match(/>won</g) ?? []).toHaveLength(1);
    expect(marked).toContain("deepseek.personal.deepseek-api-key.global.deepseek-v4-flash");

    const unmarked = renderToStaticMarkup(
      <LearningPackRow
        activePackageId={null}
        onActivate={() => {}}
        row={{
          ...packRowFixture(),
          evidence: {
            ...packRowFixture().evidence,
            outcome: "insufficient",
            winnerCandidateRef: null,
          },
        }}
      />,
    );
    expect(unmarked.match(/>won</g) ?? []).toHaveLength(0);
    // A pack the comparison did not decide still names the model it routes with.
    expect(unmarked).toContain("deepseek.personal.deepseek-api-key.global.deepseek-v4-flash");

    const disagreeing = renderToStaticMarkup(
      <LearningPackRow
        activePackageId={null}
        onActivate={() => {}}
        row={{
          ...packRowFixture(),
          evidence: { ...packRowFixture().evidence, winnerCandidateRef: "gpt-5.6-terra" },
        }}
      />,
    );
    // Both readings stay visible as the readback states them: the pack's own target and its recorded winner.
    expect(disagreeing).toContain("deepseek.personal.deepseek-api-key.global.deepseek-v4-flash");
    expect(disagreeing).toContain("readback winner gpt-5.6-terra");
  });

  /**
   * Run 101 addendum 48 `A48-R7`: a pack whose scope carries no endpoint says so - the surfaces never invent a
   * model, and never claim a winner the replay readback did not record.
   */
  test("run101 a48 packmodel: a pack with no endpoint in its scope says so instead of inventing one", () => {
    const markup = renderToStaticMarkup(
      <LearningPackRow
        activePackageId={null}
        onActivate={() => {}}
        row={{ recordId: "pack-narrowed", state: "validated", record: {} }}
      />,
    );
    expect(markup).toContain("pack-narrowed");
    expect(markup).toContain("no model recorded");
    expect(markup).not.toContain("no winner");
    expect(markup).toContain("validated");
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
    expect(narrowedPack).toContain("no model recorded");
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

/**
 * Run 101 addendum 49: the readback gains the validation-receipt join (`verdict`, `validationRef`,
 * `qualityDelta`, `claim`, `counts`, `countsState`) and every pack gains its resolved `scope`. These fixtures
 * carry the operator's own quoted row - comparison `abfb1e72…`, candidate `shadow-b4075c88…`, receipt
 * `validation-30747b01…` reading `decision: "validate"` with `qualityDelta: 1` - with the endpoint ids the live
 * runtime records, which is what `A49-R3` displays as leaf model ids.
 */
const a49DecisionRowFixture = () => ({
  decisionId: "decision-req-abfb1e72",
  requestTaskTypeId: "coder.review",
  roleId: "writer",
  taxonomyVersion: "1.0.0-alpha.1",
  candidateId: "shadow-b4075c888729347c0adbd4cee3f3cf2ae5dce8877af486f84ddb3c23f615853d",
  evidence: {
    comparisonId:
      "comparison:supervised-replay:abfb1e728477a127f10d8eb6790707ea70f41ffa1029272e48d9e1c20612ffc9",
    judgeEndpointId: "deepseek.personal.deepseek-api-key.global.deepseek-v4-flash-max",
    judgeSource: "controller",
    outcome: "candidate",
    winnerCandidateRef: "openai.personal.openai-codex-subscription.global.gpt-5.5",
    replayRef: null,
    captureRef: null,
    members: [
      {
        candidateRef: "openai.personal.openai-codex-subscription.global.gpt-5.5",
        role: "source",
        score: 1,
        disposition: "positive",
      },
      {
        candidateRef: "openai.personal.openai-codex-subscription.global.gpt-5.6-luna",
        role: "counterfactual",
        score: 0.5,
        disposition: "negative",
      },
    ],
    verdict: "validate",
    validationRef: "validation-30747b01eb9819d7a00f71bb337e1f0fe0481ce82fcd2b249d293ba7981ef5bc",
    qualityDelta: 1,
    counts: { comparisons: 3, decisive: 1, holdout: 2 },
    countsState: "reported",
  },
});

const a49PackRowFixture = () => ({
  recordId: "pack-7f02060cc3fe0c6436a2f2dee6cd2502f2da0d762012998d01ed5cfc92ec57bf",
  kind: "pack",
  state: "validated",
  scopeId: "standalone-runtime-stage",
  scope: {
    roleId: "writer",
    taskTypeId: "coder.explain",
    taxonomyVersion: "1.0.0-alpha.1",
    scopeWide: false,
  },
  record: {
    scope: {
      endpointId: "openai.personal.openai-codex-subscription.global.gpt-5.5",
      roleId: "writer",
      taxonomyVersion: "1.0.0-alpha.1",
    },
  },
  evidence: {
    comparisonId:
      "comparison:supervised-replay:abfb1e728477a127f10d8eb6790707ea70f41ffa1029272e48d9e1c20612ffc9",
    judgeEndpointId: "deepseek.personal.deepseek-api-key.global.deepseek-v4-flash-max",
    judgeSource: "controller",
    outcome: "candidate",
    winnerCandidateRef: "openai.personal.openai-codex-subscription.global.gpt-5.5",
    replayRef: null,
    captureRef: null,
    members: [
      {
        candidateRef: "openai.personal.openai-codex-subscription.global.gpt-5.5",
        role: "source",
        score: 1,
        disposition: "positive",
      },
      {
        candidateRef: "openai.personal.openai-codex-subscription.global.gpt-5.6-luna",
        role: "counterfactual",
        score: 0.5,
        disposition: "negative",
      },
    ],
    claim:
      "openai.personal.openai-codex-subscription.global.gpt-5.5 outperformed openai.personal.openai-codex-subscription.global.gpt-5.6-luna for decision-replay-req-1e9d20ff on run96-semantic-criteria@3",
    validationRef: "validation-30747b01eb9819d7a00f71bb337e1f0fe0481ce82fcd2b249d293ba7981ef5bc",
    qualityDelta: 1,
    counts: null,
    countsState: "receipt_carries_none",
  },
});

describe("run101 addendum 49", () => {
  /**
   * `A49-R3` (operator-reported): "only the model id should be displayed, gpt-5.5 instead of
   * openai.personal.openai-codex-subscription.global.gpt-5.5". The visible text is the leaf model; the full
   * endpoint id stays in the cell's `title`, and no cell prints the dotted path where a model belongs.
   */
  test("run101 a49 r3: the model and judge cells show the leaf model id, never a dotted endpoint path", () => {
    const markup = renderToStaticMarkup(
      <LearningDecisionRow receipt row={a49DecisionRowFixture()} />,
    );
    // Models column: one leaf id per replayed candidate.
    expect(markup).toContain(">gpt-5.5<");
    expect(markup).toContain(">gpt-5.6-luna<");
    // Judge column: the judge is named by its leaf model.
    expect(markup).toContain(">deepseek-v4-flash-max<");
    // The endpoint path never appears as a cell's text…
    expect(markup).not.toContain(">openai.personal");
    expect(markup).not.toContain(">deepseek.personal");
    // …and nothing is lost: each cell keeps the full endpoint id in its title.
    expect(markup).toContain('title="openai.personal.openai-codex-subscription.global.gpt-5.5"');
    expect(markup).toContain(
      'title="deepseek.personal.deepseek-api-key.global.deepseek-v4-flash-max"',
    );

    const packMarkup = renderToStaticMarkup(
      <LearningPackRow activePackageId={null} onActivate={() => {}} row={a49PackRowFixture()} />,
    );
    expect(packMarkup).toContain(">gpt-5.5<");
    // No cell shows the endpoint path where a model belongs - the claim prose names endpoints as prose, and a
    // model cell whose `title` is an endpoint id still shows only the leaf.
    expect(packMarkup).not.toMatch(/title="[^"]*">(?:openai|deepseek)\.personal/);
    expect(packMarkup).toContain(
      'title="openai.personal.openai-codex-subscription.global.gpt-5.5"',
    );
  });

  /**
   * `A49-R1`: a candidate with a validation receipt reports it - the verdict word mapped from the receipt's
   * `decision`, the receipt id, and its `qualityDelta` - instead of `no verdict recorded` /
   * `validation not reported`.
   */
  test("run101 a49 r1: a row whose candidate has a validation receipt names the verdict, receipt and delta", () => {
    const markup = renderToStaticMarkup(
      <LearningDecisionRow receipt row={a49DecisionRowFixture()} />,
    );
    expect(markup).toContain("promoted");
    expect(markup).toContain("Δ +1.00");
    expect(markup).toContain("validation validation-307…f5bc");
    expect(markup).toContain(
      'title="validation-30747b01eb9819d7a00f71bb337e1f0fe0481ce82fcd2b249d293ba7981ef5bc"',
    );
    expect(markup).toContain("1 dec · 2 holdout");
    // A verdict word the runtime does not emit still reads as bounded absence rather than a verdict.
    const unknown = renderToStaticMarkup(
      <LearningDecisionRow
        receipt
        row={{
          ...a49DecisionRowFixture(),
          evidence: { ...a49DecisionRowFixture().evidence, verdict: "shadow_validating" },
        }}
      />,
    );
    expect(unknown).toContain("no verdict recorded");
    expect(unknown).not.toContain(">shadow_validating<");
  });

  /**
   * `A49-R2`: the pack's claim prose is recorded and renders. `claim not recorded` is reserved for a pack whose
   * candidate genuinely has no text row - it is no longer a hardcoded sentence.
   */
  test("run101 a49 r2: a pack renders the claim it carries, and says 'not recorded' only without one", () => {
    const markup = renderToStaticMarkup(
      <LearningPackRow activePackageId={null} onActivate={() => {}} row={a49PackRowFixture()} />,
    );
    expect(markup).toContain("outperformed");
    expect(markup).toContain("run96-semantic-criteria@3");
    expect(markup).not.toContain("claim not recorded");

    const withoutClaim = renderToStaticMarkup(
      <LearningPackRow
        activePackageId={null}
        onActivate={() => {}}
        row={{
          ...a49PackRowFixture(),
          evidence: { ...a49PackRowFixture().evidence, claim: null },
        }}
      />,
    );
    expect(withoutClaim).toContain("claim not recorded");
  });

  /**
   * `A49-R4`: every pack names the role, task and taxonomy it routes for, and a pack that is genuinely
   * scope-wide says so instead of rendering the same `not reported` a missing value would.
   */
  test("run101 a49 r4: a pack names role · task · taxonomy, and a scope-wide pack says so", () => {
    const markup = renderToStaticMarkup(
      <LearningPackRow activePackageId={null} onActivate={() => {}} row={a49PackRowFixture()} />,
    );
    expect(markup).toContain("writer · coder.explain · taxonomy 1.0.0-alpha.1");

    const scopeWide = renderToStaticMarkup(
      <LearningPackRow
        activePackageId={null}
        onActivate={() => {}}
        row={{
          ...a49PackRowFixture(),
          scope: {
            roleId: null,
            taskTypeId: null,
            taxonomyVersion: null,
            scopeWide: true,
          },
        }}
      />,
    );
    expect(scopeWide).toContain("scope-wide");
    expect(scopeWide).not.toContain("writer · coder.explain · taxonomy");
  });

  /**
   * `A49-R5`: evidence counts are either present or stated absent for a reason - a receipt that carries no
   * family evidence says so instead of leaving a bare `not reported`.
   */
  test("run101 a49 r5: evidence counts are present, or the receipt is said to carry none", () => {
    const reported = renderToStaticMarkup(
      <LearningDecisionRow receipt row={a49DecisionRowFixture()} />,
    );
    expect(reported).toContain("1 dec · 2 holdout");

    const carriesNone = {
      ...a49DecisionRowFixture(),
      evidence: {
        ...a49DecisionRowFixture().evidence,
        counts: null,
        countsState: "receipt_carries_none",
      },
    };
    const absent = renderToStaticMarkup(<LearningDecisionRow receipt row={carriesNone} />);
    expect(absent).toContain("the receipt carries no comparison counts");
    expect(absent).not.toContain("dec ·");

    // The pack's claim cell states the same reason in place of its Δ line when no delta was recorded either.
    const pack = renderToStaticMarkup(
      <LearningPackRow
        activePackageId={null}
        onActivate={() => {}}
        row={{
          ...a49PackRowFixture(),
          evidence: { ...a49PackRowFixture().evidence, qualityDelta: null },
        }}
      />,
    );
    expect(pack).toContain("the receipt carries no comparison counts");
  });
});
