import { describe, expect, test } from "vitest";

import {
  readTrackBRouteAdvisoryFromRollout,
  resolveAdvisoryCohortPercent,
} from "../src/route-advisory-source.js";

/**
 * Run 99 R24 / addendum 06: the routing advisory has to be sourced from the durable
 * rollout state and the activated pack, not from one transient replay candidate. Observed
 * live on the stage root: every cached advisory carried candidateId=null,
 * preferredRoutePackage=null and confidence=0 while the Knowledge Store held validated
 * packs with route-package attribution, so no operator activation could ever influence a
 * decision.
 */

const NOW = 1_789_438_500_000;
const SCOPE = "standalone-runtime-stage";

interface InvokeCall {
  readonly capability: string;
  readonly value: Record<string, unknown>;
}

const rolloutState = (overrides: Record<string, unknown> = {}) => ({
  schemaVersion: "role-model.route-package-rollout-state.v1",
  scopeId: SCOPE,
  activePackageId: "pack-4f96d9b16fce94b8cae484f87bea903285cb333bcafc6d0ee1ebf7dde70e1f17",
  cohortPercent: 10,
  cohortStep: 1,
  ladder: [10, 25, 50, 100],
  priorPackageId: "baseline:route-package",
  killSwitchAtMs: null,
  receipts: [],
  breaches: [],
  ...overrides,
});

const packRecord = (overrides: Record<string, unknown> = {}) => ({
  recordId: "pack-4f96d9b16fce94b8cae484f87bea903285cb333bcafc6d0ee1ebf7dde70e1f17",
  kind: "pack",
  state: "validated",
  scopeId: SCOPE,
  record: {
    contract: "ExperiencePackCandidateV1",
    packId: "pack-4f96d9b16fce94b8cae484f87bea903285cb333bcafc6d0ee1ebf7dde70e1f17",
    validationReceiptId:
      "validation-0a461682ae96dd6c4bafcaa5fbdf3ff01b7c2bca11ef63f15f883f4966bd547b",
    experienceIds: ["shadow-9225c90200b0c67b51e9071a0cc7e53d62dec3f572eddaffa829beca3d9f5f84"],
    createdAt: "2026-09-15T01:30:42.858Z",
    scope: { channel: "stage", scopeId: SCOPE, routePackage: "deepseek.flash-high" },
    ...overrides,
  },
});

const validationRecord = (overrides: Record<string, unknown> = {}) => ({
  recordId: "validation-0a461682ae96dd6c4bafcaa5fbdf3ff01b7c2bca11ef63f15f883f4966bd547b",
  kind: "validation_receipt",
  state: "validate",
  scopeId: SCOPE,
  record: {
    contract: "RouteLearningValidationReceiptV1",
    receiptId:
      "validation-0a461682ae96dd6c4bafcaa5fbdf3ff01b7c2bca11ef63f15f883f4966bd547b",
    decision: "validate",
    createdAt: "2026-09-15T01:30:42.816Z",
    qualityDelta: 0.5,
    confidenceLower: 0.82,
    confidenceUpper: 0.94,
    holdoutSampleCount: 2,
    ...overrides,
  },
});

function createInvoke(input: {
  readonly rollout?: unknown;
  readonly packs?: unknown;
  readonly validations?: unknown;
  readonly calls?: InvokeCall[];
}) {
  return async (capability: string, value: Record<string, unknown>) => {
    input.calls?.push({ capability, value });
    if (capability === "knowledge:rollout-state")
      return input.rollout ?? rolloutState();
    if (capability === "knowledge:list-learning") {
      const kind = String(value.kind ?? "");
      if (kind === "pack") return input.packs ?? { records: [packRecord()] };
      if (kind === "validation_receipt")
        return input.validations ?? { records: [validationRecord()] };
    }
    throw new Error(`unexpected capability ${capability}`);
  };
}

describe("run99 R24 durable route advisory source", () => {
  test("derives a fresh advisory from the activated pack and its validation receipt", async () => {
    const calls: InvokeCall[] = [];
    const advisory = await readTrackBRouteAdvisoryFromRollout({
      invoke: createInvoke({ calls }),
      scopeId: SCOPE,
      nowMs: NOW,
      evidenceMaxAgeMs: 30 * 24 * 60 * 60 * 1_000,
    });

    expect(advisory).toEqual({
      preferredRoutePackage: "deepseek.flash-high",
      advisoryState: "fresh",
      confidence: 0.82,
      candidateId: "shadow-9225c90200b0c67b51e9071a0cc7e53d62dec3f572eddaffa829beca3d9f5f84",
      advisoryId: "pack-4f96d9b16fce94b8cae484f87bea903285cb333bcafc6d0ee1ebf7dde70e1f17",
      cohortPercent: 10,
      reason: null,
      // Run 99 R33: a pack that declares no family yields an unscoped advisory, which the
      // router refuses once the request declares a family (`advisory_task_unscoped`).
      taskTypeId: null,
      taxonomyVersion: null,
    });
    expect(calls.map((call) => call.capability)).toEqual([
      "knowledge:rollout-state",
      "knowledge:list-learning",
      "knowledge:list-learning",
    ]);
  });

  test("carries the activated pack's task family and taxonomy to the router", async () => {
    const advisory = await readTrackBRouteAdvisoryFromRollout({
      invoke: createInvoke({
        packs: {
          records: [
            packRecord({
              scope: {
                channel: "stage",
                scopeId: SCOPE,
                routePackage: "deepseek.flash-high",
                taskTypeId: "coder.review",
                taxonomyVersion: "taxonomy-v1-alpha.1",
              },
            }),
          ],
        },
      }),
      scopeId: SCOPE,
      nowMs: NOW,
      evidenceMaxAgeMs: 30 * 24 * 60 * 60 * 1_000,
    });

    expect(advisory.taskTypeId).toBe("coder.review");
    expect(advisory.taxonomyVersion).toBe("taxonomy-v1-alpha.1");
    expect(advisory.advisoryState).toBe("fresh");
  });

  test("reads the route package from the durable pack scope the Knowledge Store writes", async () => {
    // Observed on the stage root (pack-4f96d9b1…): the stored pack carries
    // `scope.endpointId`, not `scope.routePackage`, so the resolver has to accept the shape the
    // store actually writes or an activated pack publishes an empty advisory.
    const advisory = await readTrackBRouteAdvisoryFromRollout({
      invoke: createInvoke({
        packs: {
          records: [
            packRecord({
              scope: {
                endpointId: "deepseek.personal.deepseek-api-key.global.deepseek-flash-high",
              },
            }),
          ],
        },
      }),
      scopeId: SCOPE,
      nowMs: NOW,
      evidenceMaxAgeMs: 30 * 24 * 60 * 60 * 1_000,
    });
    expect(advisory).toMatchObject({
      preferredRoutePackage:
        "deepseek.personal.deepseek-api-key.global.deepseek-flash-high",
      advisoryState: "fresh",
      confidence: 0.82,
    });
  });

  test("stays unavailable without an active pack or with the kill switch engaged", async () => {
    const inactive = await readTrackBRouteAdvisoryFromRollout({
      invoke: createInvoke({ rollout: rolloutState({ activePackageId: null, cohortPercent: 0 }) }),
      scopeId: SCOPE,
      nowMs: NOW,
      evidenceMaxAgeMs: 1_000,
    });
    expect(inactive).toMatchObject({
      preferredRoutePackage: null,
      advisoryState: "unavailable",
      confidence: 0,
      reason: "no active pack",
    });

    const killed = await readTrackBRouteAdvisoryFromRollout({
      invoke: createInvoke({ rollout: rolloutState({ killSwitchAtMs: NOW - 1_000 }) }),
      scopeId: SCOPE,
      nowMs: NOW,
      evidenceMaxAgeMs: 1_000,
    });
    expect(killed).toMatchObject({
      advisoryState: "unavailable",
      reason: "kill switch engaged",
    });
  });

  test("marks evidence beyond the operator window stale instead of fresh", async () => {
    const advisory = await readTrackBRouteAdvisoryFromRollout({
      invoke: createInvoke({
        validations: {
          records: [validationRecord({ createdAt: "2026-08-01T00:00:00.000Z" })],
        },
      }),
      scopeId: SCOPE,
      nowMs: NOW,
      evidenceMaxAgeMs: 24 * 60 * 60 * 1_000,
    });
    expect(advisory).toMatchObject({
      advisoryState: "stale",
      confidence: 0.82,
      reason: "validation evidence beyond the evidence window",
    });
  });

  test("fails closed on a missing record, a non-validating receipt, or a missing confidence", async () => {
    const missingPack = await readTrackBRouteAdvisoryFromRollout({
      invoke: createInvoke({ packs: { records: [] } }),
      scopeId: SCOPE,
      nowMs: NOW,
      evidenceMaxAgeMs: 1_000,
    });
    expect(missingPack).toMatchObject({
      advisoryState: "unavailable",
      reason: "active pack record unavailable",
    });

    const rejected = await readTrackBRouteAdvisoryFromRollout({
      invoke: createInvoke({
        validations: { records: [validationRecord({ decision: "reject" })] },
      }),
      scopeId: SCOPE,
      nowMs: NOW,
      evidenceMaxAgeMs: 1_000,
    });
    expect(rejected).toMatchObject({
      advisoryState: "unavailable",
      reason: "validation receipt does not validate",
    });

    const noConfidence = await readTrackBRouteAdvisoryFromRollout({
      invoke: createInvoke({
        validations: { records: [validationRecord({ confidenceLower: null })] },
      }),
      scopeId: SCOPE,
      nowMs: NOW,
      evidenceMaxAgeMs: 1_000,
    });
    expect(noConfidence).toMatchObject({
      advisoryState: "unavailable",
      confidence: 0,
      reason: "validation receipt carries no confidence",
    });
  });

  test("degrades to unavailable when the extension answers with a bounded receipt", async () => {
    const advisory = await readTrackBRouteAdvisoryFromRollout({
      invoke: async () => ({
        schemaVersion: "role-model.bounded-degradation-receipt.v1",
        degraded: true,
        reason: "knowledge store unreachable",
      }),
      scopeId: SCOPE,
      nowMs: NOW,
      evidenceMaxAgeMs: 1_000,
    });
    expect(advisory).toMatchObject({
      preferredRoutePackage: null,
      advisoryState: "unavailable",
      confidence: 0,
      cohortPercent: 0,
    });
    expect(advisory.reason).toBeTruthy();
  });

  test("bounds the live cohort by the receipted activation step", () => {
    // Run 99 R30: the canonical ladder makes cohorts an S3/S4 mechanism ("S3 bounded cohorts");
    // S2 is "advisory-considered" for every eligible decision after hard filters. Bounding S2 by
    // the activation step made 104 live decisions `cohort_excluded` at a stage that must not
    // cohort-gate, so S2 keeps the policy value and S3/S4 follow the receipted step.
    expect(
      resolveAdvisoryCohortPercent({
        stage: "S2",
        policyCohortPercent: 100,
        rolloutCohortPercent: 10,
      }),
    ).toBe(100);
    expect(
      resolveAdvisoryCohortPercent({
        stage: "S3",
        policyCohortPercent: 10,
        rolloutCohortPercent: 25,
      }),
    ).toBe(25);
    expect(
      resolveAdvisoryCohortPercent({
        stage: "S4",
        policyCohortPercent: 10,
        rolloutCohortPercent: 0,
      }),
    ).toBe(10);
    // Without an activated pack the policy value stands and is always clamped into 0-100.
    expect(
      resolveAdvisoryCohortPercent({
        stage: "S2",
        policyCohortPercent: 140,
        rolloutCohortPercent: null,
      }),
    ).toBe(100);
    expect(
      resolveAdvisoryCohortPercent({
        stage: "S1",
        policyCohortPercent: -5,
        rolloutCohortPercent: 25,
      }),
    ).toBe(0);
    // S1 never consults an advisory, so the clamp still applies to whatever the policy says.
    expect(
      resolveAdvisoryCohortPercent({
        stage: "S2",
        policyCohortPercent: 100,
        rolloutCohortPercent: null,
      }),
    ).toBe(100);
  });
});
