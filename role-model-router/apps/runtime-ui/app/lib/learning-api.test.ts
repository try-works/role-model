import { describe, expect, test } from "vitest";

import {
  type LearningPolicyField,
  fetchLearningActivity,
  fetchLearningPolicy,
  fetchLearningRollout,
  validatePolicyDraft,
} from "./learning-api";

/**
 * Run 98 R17 (AC-R17-03a/04): the Configuration page renders whatever the R15 schema
 * publishes and refuses drafts that violate its bounds or edit a read-only field, before
 * anything reaches the server (which repeats the same validation).
 */

const field = (input: Partial<LearningPolicyField> & { name: string }): LearningPolicyField => ({
  type: "number",
  unit: "",
  default: 0,
  uiEditable: true,
  description: `${input.name} description`,
  value: 0,
  ...input,
});

const fields: readonly LearningPolicyField[] = [
  field({ name: "minAdvisoryConfidence", min: 0.5, max: 1, value: 0.7, default: 0.7 }),
  field({
    name: "minDecisiveComparisons",
    type: "integer",
    min: 1,
    max: 100,
    value: 3,
    default: 3,
  }),
  field({
    name: "promotionAnalysisMethod",
    type: "enum",
    values: ["paired_cluster_bootstrap"],
    value: "paired_cluster_bootstrap",
    default: "paired_cluster_bootstrap",
    uiEditable: false,
  }),
  field({
    name: "stage",
    type: "enum",
    values: ["S0", "S1", "S2", "S3", "S4"],
    value: "S1",
    default: "S1",
  }),
  field({
    name: "cohortLadder",
    type: "percent-list",
    value: [10, 25, 50, 100],
    default: [10, 25, 50, 100],
  }),
];

describe("learning policy draft validation", () => {
  /**
   * Run 98 addendum 47, operator-reported: "bug, should accept true". The Configuration page renders every
   * field as a text input, so a boolean field's value arrives as `"true"` and the draft validation (and the
   * server) refused it with `latencySelectionEnabled must be a boolean (saw true)`. The draft validation now
   * normalises the boolean text to a real boolean before it is compared or sent.
   */
  test("run98 a47: a boolean field accepts the text its input produces", () => {
    const booleanFields = [
      field({ name: "latencySelectionEnabled", type: "boolean", value: false, default: false }),
    ];

    const enabled = validatePolicyDraft(booleanFields, { latencySelectionEnabled: "true" });
    expect(enabled.errors).toEqual({});
    expect(enabled.changes).toEqual({ latencySelectionEnabled: true });

    const disabled = validatePolicyDraft(booleanFields, { latencySelectionEnabled: "false" });
    expect(disabled.errors).toEqual({});
    // Unchanged from the published value: no change to send.
    expect(disabled.changes).toEqual({});

    const realBoolean = validatePolicyDraft(booleanFields, { latencySelectionEnabled: true });
    expect(realBoolean.errors).toEqual({});
    expect(realBoolean.changes).toEqual({ latencySelectionEnabled: true });

    const nonsense = validatePolicyDraft(booleanFields, { latencySelectionEnabled: "yes" });
    expect(nonsense.errors.latencySelectionEnabled).toMatch(/true or false/i);
    expect(nonsense.changes).toEqual({});
  });

  test("accepts an in-bounds change and reports only the changed field", () => {
    const result = validatePolicyDraft(fields, { minAdvisoryConfidence: 0.75 });
    expect(result.errors).toEqual({});
    expect(result.changes).toEqual({ minAdvisoryConfidence: 0.75 });
  });

  test("refuses out-of-range, wrong-type and fractional-integer values", () => {
    expect(
      validatePolicyDraft(fields, { minAdvisoryConfidence: 1.4 }).errors.minAdvisoryConfidence,
    ).toMatch(/at most 1/);
    expect(
      validatePolicyDraft(fields, { minAdvisoryConfidence: 0.2 }).errors.minAdvisoryConfidence,
    ).toMatch(/at least 0.5/);
    expect(
      validatePolicyDraft(fields, { minDecisiveComparisons: 2.5 }).errors.minDecisiveComparisons,
    ).toMatch(/integer/);
    expect(
      validatePolicyDraft(fields, { minAdvisoryConfidence: "many" }).errors.minAdvisoryConfidence,
    ).toMatch(/number/);
  });

  test("refuses read-only fields and unknown fields", () => {
    expect(
      validatePolicyDraft(fields, { promotionAnalysisMethod: "none" }).errors
        .promotionAnalysisMethod,
    ).toMatch(/read-only/);
    expect(validatePolicyDraft(fields, { brandNewParameter: 1 }).errors.brandNewParameter).toMatch(
      /unknown field/,
    );
  });

  test("validates enum values and the monotone percentage ladder", () => {
    expect(validatePolicyDraft(fields, { stage: "S3" }).changes).toEqual({ stage: "S3" });
    expect(validatePolicyDraft(fields, { stage: "S9" }).errors.stage).toMatch(/must be one of/);
    expect(validatePolicyDraft(fields, { cohortLadder: [10, 25, 50, 100] }).changes).toEqual({});
    expect(
      validatePolicyDraft(fields, { cohortLadder: [25, 10, 50, 100] }).errors.cohortLadder,
    ).toMatch(/non-decreasing/);
    expect(validatePolicyDraft(fields, { cohortLadder: [5, 25] }).errors.cohortLadder).toMatch(
      /10-100/,
    );
  });

  test("does not report unchanged values as changes", () => {
    const result = validatePolicyDraft(fields, {
      minAdvisoryConfidence: 0.7,
      minDecisiveComparisons: 3,
      stage: "S1",
      cohortLadder: [10, 25, 50, 100],
    });
    expect(result.errors).toEqual({});
    expect(result.changes).toEqual({});
  });
});

/**
 * Run 99 R33 (Learning surface, observed live on stage v138/v139): the Overview answered
 *
 *   `Learning surface unavailable: Request to /api/role-model/operator/learning/rollout failed with
 *    503: operator_capability_unavailable. No value is fabricated.`
 *
 * while the same readback succeeded seconds later, because the runtime was still bringing its
 * learning domain up. The readback now retries the two start-up 503 shapes (a booting runtime and a
 * warming operator capability) before it reports the surface as unavailable.
 */
describe("learning readback start-up retry", () => {
  test("retries a warming operator capability and then returns the durable state", async () => {
    let attempts = 0;
    const fetcher = (async () => {
      attempts += 1;
      if (attempts === 1) {
        return new Response(
          JSON.stringify({
            error: "operator_capability_unavailable",
            capability: "learning rollout readback",
          }),
          { status: 503, headers: { "content-type": "application/json" } },
        );
      }
      return new Response(JSON.stringify({ state: "active", activePackageId: "pack-retry" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as unknown as typeof fetch;

    const rollout = await fetchLearningRollout(fetcher);
    expect(rollout).toMatchObject({ state: "active", activePackageId: "pack-retry" });
    expect(attempts).toBe(2);
  });

  // The same warm-up answered `/learning/policy` and `/learning/activity` with 503 while the runtime
  // brought its learning domain up, so every Learning readback retries the two start-up shapes.
  test("retries a warming capability for the policy and activity readbacks too", async () => {
    const attemptCounts: Record<string, number> = {};
    const fetcher = (async (path: string) => {
      attemptCounts[path] = (attemptCounts[path] ?? 0) + 1;
      if (attemptCounts[path] === 1) {
        return new Response(
          JSON.stringify({ error: "operator_capability_unavailable", capability: path }),
          { status: 503, headers: { "content-type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify(path.includes("/policy") ? { policyVersion: 28 } : { windowMinutes: 60 }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }) as unknown as typeof fetch;

    await expect(fetchLearningPolicy(fetcher)).resolves.toMatchObject({ policyVersion: 28 });
    await expect(fetchLearningActivity(fetcher)).resolves.toMatchObject({ windowMinutes: 60 });
  });
});
