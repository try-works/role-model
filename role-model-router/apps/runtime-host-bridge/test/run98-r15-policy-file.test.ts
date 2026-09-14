import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import {
  ACTIVATION_POLICY_RELATIVE_PATH,
  readLearningPolicyFile,
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
    expect(readLearningPolicyFile({ repoRoot: root, channel: "production" })?.effective.stage).toBe("S0");
    // Run 98 R10: the judge configuration resolves from the same versioned policy record.
    expect(readLearningPolicyFile({ repoRoot: root, channel: "stage" })?.effective).toMatchObject({
      judgeMode: "identified",
      judgeOrderPolicy: "source_first",
      judgeMeasureAgreement: false,
    });
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
    expect(readLearningPolicyFile({ repoRoot: missing, channel: "stage" })).toBeNull();

    const broken = writePolicy("{ not json");
    expect(readLearningPolicyFile({ repoRoot: broken, channel: "stage" })).toBeNull();

    const wrongSchema = writePolicy({ ...policy(), schemaVersion: "role-model.other.v9" });
    expect(readLearningPolicyFile({ repoRoot: wrongSchema, channel: "stage" })).toBeNull();

    const unknownStage = writePolicy({
      ...policy(),
      channels: { stage: { stage: "S9" } },
    });
    // An unknown enum value falls back to the shipped default stage rather than widening.
    expect(readLearningPolicyFile({ repoRoot: unknownStage, channel: "stage" })?.effective.stage).toBe("S1");
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
    expect(readLearningPolicyFile({ repoRoot: legacy, channel: "stage" })?.effective).toMatchObject({
      minimumPracticalDelta: 0.07,
      promotionIntervalLevel: 0.95,
      promotionResamples: 10000,
      promotionBootstrapSeed: 0,
      multiplicityAdjustment: "holm_bonferroni",
      promotionSelectionFamilySize: 1,
    });

    // An out-of-bounds value never widens the gate: it clamps to the documented bound.
    const outOfBounds = writePolicy(
      policy({ promotionIntervalLevel: 0.5, promotionResamples: 10, minimumPracticalDelta: -1 }),
    );
    expect(readLearningPolicyFile({ repoRoot: outOfBounds, channel: "stage" })?.effective).toMatchObject({
      minimumPracticalDelta: 0,
      promotionIntervalLevel: 0.8,
      promotionResamples: 1000,
    });
  });
});
