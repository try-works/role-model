import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import {
  ACTIVATION_POLICY_RELATIVE_PATH,
  readLearningPolicyFile,
  resolveLearningPolicyStateRoot,
} from "../src/learning-policy-file.js";

/**
 * Run 98 R15/R17: the packaged host resolves the effective activation policy from the
 * operator's versioned config file, with scope over channel over global precedence, and
 * fails closed to the documented defaults when the file is missing or malformed.
 */

const roots: string[] = [];
const writePolicy = (document: unknown): string => {
  const root = mkdtempSync(path.join(os.tmpdir(), "run98-r15-file-"));
  roots.push(root);
  mkdirSync(path.join(root, "shared"), { recursive: true });
  writeFileSync(
    path.join(root, ACTIVATION_POLICY_RELATIVE_PATH),
    typeof document === "string" ? document : JSON.stringify(document, null, 2),
    "utf8",
  );
  return root;
};

const makeRoot = (prefix: string): string => {
  const root = mkdtempSync(path.join(os.tmpdir(), prefix));
  roots.push(root);
  return root;
};

/**
 * The durable operator policy state written by `shared/route-learning/policy-store.mjs`.
 * It is the record the Learning > Configuration page reads and writes, so the packaged
 * host has to resolve it as well or the UI knob is inert for live routing.
 */
const writePolicyState = (stateRoot: string, state: unknown): string => {
  mkdirSync(path.join(stateRoot, "learning"), { recursive: true });
  writeFileSync(
    path.join(stateRoot, "learning", "activation-policy-state.json"),
    typeof state === "string" ? state : JSON.stringify(state, null, 2),
    "utf8",
  );
  return stateRoot;
};

const policyState = (document: unknown, overrides: Record<string, unknown> = {}) => ({
  schemaVersion: "role-model.route-learning-policy-state.v1",
  policyVersion: 22,
  document,
  updatedAtMs: 1789399521632,
  receipts: [],
  ...overrides,
});

const policyDocument = (overrides: Record<string, unknown> = {}) => ({
  schemaVersion: "role-model.route-learning-activation-policy.v1",
  policyVersion: 22,
  global: { ...policy().global },
  channels: {},
  scopes: {},
  ...overrides,
});

afterEach(() => {
  while (roots.length) rmSync(roots.pop() as string, { recursive: true, force: true });
});

const policy = (overrides: Record<string, unknown> = {}) => ({
  schemaVersion: "role-model.route-learning-activation-policy.v1",
  policyVersion: 3,
  global: {
    stage: "S1",
    cohortLadder: [10, 25, 50, 100],
    scoreBand: 0.05,
    minAdvisoryConfidence: 0.7,
    qualityMinDelta: -0.02,
    costMaxMultiplier: 1.5,
    latencyP95MaxDeltaMs: 10000,
    errorRateMaxDeltaPp: 2,
    ...overrides,
  },
  channels: { development: { stage: "S1" }, stage: { stage: "S2" }, production: { stage: "S0" } },
  scopes: {},
});

describe("run98 R15 packaged policy file", () => {
  test("resolves the channel stage and carries the policy version plus digest", () => {
    const root = writePolicy(policy());
    const stageChannel = readLearningPolicyFile({ repoRoot: root, channel: "stage" });
    expect(stageChannel).toMatchObject({
      policyVersion: 3,
      source: ACTIVATION_POLICY_RELATIVE_PATH,
      effective: { stage: "S2", cohortPercent: 100, scoreBand: 0.05, minAdvisoryConfidence: 0.7 },
    });
    expect(stageChannel?.digest).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(readLearningPolicyFile({ repoRoot: root, channel: "production" })?.effective.stage).toBe(
      "S0",
    );
    // Run 98 R10: the judge configuration resolves from the same versioned policy record.
    expect(readLearningPolicyFile({ repoRoot: root, channel: "stage" })?.effective).toMatchObject({
      judgeMode: "identified",
      judgeOrderPolicy: "source_first",
      judgeMeasureAgreement: false,
    });
  });

  /**
   * Run 98 addendum 30 S1 introduced a designated judge endpoint; addendum 45 J1 retired it on the operator's
   * instruction: the judge is the configured controller, and no endpoint id is read from policy at all. The
   * schema strips the retired field, so a record that still carries one resolves to the controller source
   * rather than to the named endpoint.
   */
  test("run98 a45 the judge resolves to the controller and a retired endpoint designation is not honored", () => {
    const designated = writePolicy({
      ...policy(),
      global: {
        ...policy().global,
        judgeEndpointId: "deepseek.personal.deepseek-api-key.global.deepseek-v4-pro-high",
      },
    });
    const designatedEffective = readLearningPolicyFile({
      repoRoot: designated,
      channel: "stage",
    })?.effective;
    expect(designatedEffective?.judgeSource).toBe("controller");
    expect(designatedEffective).not.toHaveProperty("judgeEndpointId");

    // A scope override cannot reintroduce a judge endpoint either: the field is retired everywhere.
    const scoped = writePolicy({
      ...policy(),
      scopes: { "tenant:a30": { judgeEndpointId: "moonshot.personal.kimi-code.global.kimi-k3" } },
    });
    const scopedEffective = readLearningPolicyFile({
      repoRoot: scoped,
      channel: "stage",
      scopeId: "tenant:a30",
    })?.effective;
    expect(scopedEffective?.judgeSource).toBe("controller");
    expect(scopedEffective).not.toHaveProperty("judgeEndpointId");

    // Malformed, empty, or wrong-typed values are not a designation either.
    for (const bad of ["", "   ", "has space", "../escape", 42, {}]) {
      const root = writePolicy({
        ...policy(),
        global: { ...policy().global, judgeEndpointId: bad as never },
      });
      expect(
        readLearningPolicyFile({ repoRoot: root, channel: "stage" })?.effective.judgeSource,
      ).toBe("controller");
    }
  });

  test("scope overrides beat channel overrides beat global", () => {
    const root = writePolicy({
      ...policy({ stage: "S1" }),
      scopes: { "tenant:run98": { stage: "S3", scoreBand: 0.1 } },
    });
    const scoped = readLearningPolicyFile({
      repoRoot: root,
      channel: "stage",
      scopeId: "tenant:run98",
    });
    expect(scoped?.effective).toMatchObject({ stage: "S3", scoreBand: 0.1 });
    // S3+ is cohort-gated, so the effective share starts at the first ladder rung.
    expect(scoped?.effective.cohortPercent).toBe(10);
  });

  test("fails closed to the documented defaults when the file is missing or malformed", () => {
    const missing = mkdtempSync(path.join(os.tmpdir(), "run98-r15-none-"));
    roots.push(missing);
    /**
     * Addendum 45 J1 onward: a missing or malformed source is not "no policy" — the host fails closed to the
     * documented defaults and says so in a degraded receipt, so live routing keeps a defined, conservative
     * policy instead of an undefined one.
     */
    const missingPolicy = readLearningPolicyFile({ repoRoot: missing, channel: "stage" });
    expect(missingPolicy).not.toBeNull();
    expect(missingPolicy?.degraded?.reason).toBe("policy_source_missing");
    expect(missingPolicy?.effective.stage).toBe("S0");

    const broken = writePolicy("{ not json");
    const brokenPolicy = readLearningPolicyFile({ repoRoot: broken, channel: "stage" });
    expect(brokenPolicy?.degraded?.reason).toBeTruthy();
    expect(brokenPolicy?.effective.stage).toBe("S0");

    const wrongSchema = writePolicy({ ...policy(), schemaVersion: "role-model.other.v9" });
    const wrongSchemaPolicy = readLearningPolicyFile({ repoRoot: wrongSchema, channel: "stage" });
    expect(wrongSchemaPolicy?.degraded?.reason).toBeTruthy();
    expect(wrongSchemaPolicy?.effective.stage).toBe("S0");

    const unknownStage = writePolicy({
      ...policy(),
      channels: { stage: { stage: "S9" } },
    });
    // An unknown enum value degrades the record and the fail-closed default stage applies — never a wider one.
    expect(
      readLearningPolicyFile({ repoRoot: unknownStage, channel: "stage" })?.effective.stage,
    ).toBe("S0");
  });

  test("run98 R19 resolves the predeclared promotion protocol from the same policy record", () => {
    const root = writePolicy(
      policy({
        minimumPracticalDelta: 0.08,
        promotionIntervalLevel: 0.9,
        promotionResamples: 12000,
        promotionBootstrapSeed: 98,
        promotionAnalysisMethod: "paired_cluster_bootstrap",
        multiplicityAdjustment: "holm_bonferroni",
        promotionSelectionFamilySize: 3,
      }),
    );
    expect(readLearningPolicyFile({ repoRoot: root, channel: "stage" })?.effective).toMatchObject({
      minimumPracticalDelta: 0.08,
      promotionIntervalLevel: 0.9,
      promotionResamples: 12000,
      promotionBootstrapSeed: 98,
      promotionAnalysisMethod: "paired_cluster_bootstrap",
      multiplicityAdjustment: "holm_bonferroni",
      promotionSelectionFamilySize: 3,
    });

    // The legacy name of the same value still resolves, and the documented defaults apply when
    // the config predates the promotion protocol.
    const legacy = writePolicy(policy({ qualityClaimedImprovement: 0.07 }));
    expect(readLearningPolicyFile({ repoRoot: legacy, channel: "stage" })?.effective).toMatchObject(
      {
        minimumPracticalDelta: 0.07,
        promotionIntervalLevel: 0.95,
        promotionResamples: 10000,
        promotionBootstrapSeed: 0,
        multiplicityAdjustment: "holm_bonferroni",
        promotionSelectionFamilySize: 1,
      },
    );

    /**
     * An out-of-bounds value never widens the gate. The document bounds reject the record (the whole record,
     * not the single field), and the effective policy falls back to the documented, conservative defaults,
     * which are inside every bound.
     */
    const outOfBounds = writePolicy(
      policy({ promotionIntervalLevel: 0.5, promotionResamples: 10, minimumPracticalDelta: -1 }),
    );
    const outOfBoundsPolicy = readLearningPolicyFile({ repoRoot: outOfBounds, channel: "stage" });
    expect(outOfBoundsPolicy?.degraded).toBeTruthy();
    expect(outOfBoundsPolicy?.effective.minimumPracticalDelta).toBeGreaterThanOrEqual(0);
    expect(outOfBoundsPolicy?.effective.minimumPracticalDelta).toBeLessThanOrEqual(0.5);
    expect(outOfBoundsPolicy?.effective.promotionIntervalLevel).toBeGreaterThanOrEqual(0.8);
    expect(outOfBoundsPolicy?.effective.promotionIntervalLevel).toBeLessThanOrEqual(0.99);
    expect(outOfBoundsPolicy?.effective.promotionResamples).toBeGreaterThanOrEqual(1000);
    expect(outOfBoundsPolicy?.effective.promotionResamples).toBeLessThanOrEqual(20_000);
  });
});

/**
 * Run 99 R23: a UI policy change has to reach live routing.
 *
 * Observed on the stage release (2026-09-15): the SEA packaging never copied
 * `shared/route-learning-activation-policy.json` into the release directory, so the host
 * fell back to the hardcoded S1 defaults while the Learning > Configuration page showed the
 * durable state. Both sides now resolve the durable operator state first, with the staged
 * file as the shipped seed and the documented defaults as the fail-closed last resort.
 */
describe("run99 R23 durable operator policy state", () => {
  test("the durable state governs live routing over the staged file", () => {
    const repoRoot = writePolicy({
      ...policy(),
      channels: {
        development: { stage: "S1" },
        stage: { stage: "S1" },
        production: { stage: "S0" },
      },
    });
    const stateRoot = writePolicyState(
      makeRoot("run99-r23-state-"),
      policyState(
        policyDocument({
          channels: { stage: { stage: "S4" } },
          scopes: { "stage/standalone-runtime-stage": { scoreBand: 0.12 } },
        }),
      ),
    );

    const snapshot = readLearningPolicyFile({
      repoRoot,
      stateRoot,
      channel: "stage",
      scopeId: "standalone-runtime-stage",
    });
    expect(snapshot).toMatchObject({
      policyVersion: 22,
      source: "learning/activation-policy-state.json",
      effective: { stage: "S4", scoreBand: 0.12, cohortPercent: 10 },
    });
    expect(snapshot?.digest).toMatch(/^sha256:[a-f0-9]{64}$/);
    // Without the state root (a source checkout, or before the operator ever changed the
    // policy) the staged file still resolves exactly as before.
    expect(
      readLearningPolicyFile({ repoRoot, channel: "stage", scopeId: "standalone-runtime-stage" })
        ?.effective.stage,
    ).toBe("S1");
  });

  test("a missing, malformed, or foreign state file falls back to the staged policy", () => {
    const repoRoot = writePolicy({ ...policy(), channels: { stage: { stage: "S2" } } });
    const emptyStateRoot = makeRoot("run99-r23-empty-state-");
    expect(
      readLearningPolicyFile({ repoRoot, stateRoot: emptyStateRoot, channel: "stage" })?.effective
        .stage,
    ).toBe("S2");

    const brokenStateRoot = writePolicyState(makeRoot("run99-r23-broken-state-"), "{ not json");
    expect(
      readLearningPolicyFile({ repoRoot, stateRoot: brokenStateRoot, channel: "stage" })?.effective
        .stage,
    ).toBe("S2");

    const foreignStateRoot = writePolicyState(
      makeRoot("run99-r23-foreign-state-"),
      policyState(policyDocument(), { schemaVersion: "role-model.other-state.v9" }),
    );
    expect(
      readLearningPolicyFile({ repoRoot, stateRoot: foreignStateRoot, channel: "stage" })?.effective
        .stage,
    ).toBe("S2");

    // A durable document with the wrong activation schema must not widen activation either.
    const wrongDocumentRoot = writePolicyState(
      makeRoot("run99-r23-wrong-document-"),
      policyState({ ...policyDocument(), schemaVersion: "role-model.other.v9" }),
    );
    expect(
      readLearningPolicyFile({ repoRoot, stateRoot: wrongDocumentRoot, channel: "stage" })
        ?.effective.stage,
    ).toBe("S2");
  });

  test("resolves the durable state from the Track B state root the sidecar writes", () => {
    const runtimeStateRoot = makeRoot("run99-r23-runtime-state-");
    const scopeId = "standalone-runtime-stage";
    const stateRoot = resolveLearningPolicyStateRoot({ runtimeStateRoot, scopeId });
    expect(stateRoot).toBe(path.join(runtimeStateRoot, scopeId, "track-b"));
    writePolicyState(
      stateRoot,
      policyState(policyDocument({ channels: { stage: { stage: "S3" } } })),
    );
    const repoRoot = writePolicy({
      ...policy(),
      channels: {
        development: { stage: "S1" },
        stage: { stage: "S1" },
        production: { stage: "S0" },
      },
    });

    expect(
      readLearningPolicyFile({ repoRoot, stateRoot, channel: "stage", scopeId })?.effective,
    ).toMatchObject({ stage: "S3", cohortPercent: 10 });
    // Handing the base runtime state root to the resolver is a real defect: the store lives
    // under the scope's track-b directory, so the resolver would fall back to the shipped file.
    expect(
      readLearningPolicyFile({
        repoRoot,
        stateRoot: runtimeStateRoot,
        channel: "stage",
        scopeId,
      })?.effective.stage,
    ).toBe("S1");
  });
});
