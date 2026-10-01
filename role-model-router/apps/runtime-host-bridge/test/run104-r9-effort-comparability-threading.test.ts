import { expect, test } from "vitest";

import { classifyReplayArmEffort } from "../src/track-b-replay-policy.js";

/**
 * Run 104 R9 (post-closeout): the producer threading. The comparability builder in track-b-runtime.ts now
 * composes the routing-shadow rollouts through classifyReplayArmEffort:
 *
 *   effortComparability: classifyReplayArmEffort({
 *     arms: counterfactualRollouts.map((arm) => ({
 *       endpointId: typeof arm.endpointId === "string" ? arm.endpointId : "",
 *       modelId: typeof arm.modelId === "string" ? arm.modelId : "",
 *       reasoningEffort: typeof arm.reasoningEffort === "string" ? arm.reasoningEffort : null,
 *     })),
 *     sourceModelId: ...,
 *     sourceReasoningEffort: ...,
 *   })
 *
 * This locks in the record shape the consumer (evaluation-core normalizeArmEffortComparability) expects,
 * so the arm_effort_mismatch exclusion can fire on a live comparison.
 */

// Mirrors the builder's type-narrowing glue over Record<string, unknown> rollouts.
const builderArms = (rollouts: readonly Record<string, unknown>[]) =>
  rollouts.map((arm) => ({
    endpointId: typeof arm.endpointId === "string" ? arm.endpointId : "",
    modelId: typeof arm.modelId === "string" ? arm.modelId : "",
    reasoningEffort: typeof arm.reasoningEffort === "string" ? arm.reasoningEffort : null,
  }));

test("R9 threading: builder-shaped arms produce the consumer's effortComparability records", () => {
  const records = classifyReplayArmEffort({
    arms: builderArms([
      { endpointId: "sol-medium", modelId: "sol", reasoningEffort: "medium", rolloutId: "r1" },
      { endpointId: "sol-high", modelId: "sol", reasoningEffort: "high", rolloutId: "r2" },
      { endpointId: "sol-default", modelId: "sol", reasoningEffort: null, rolloutId: "r3" },
    ]),
    sourceModelId: "luna",
    sourceReasoningEffort: "medium",
  });

  expect(records).toEqual([
    { endpointId: "sol-medium", modelId: "sol", sourceModelId: "luna", reasoningEffort: "medium", sourceReasoningEffort: "medium", comparability: "matched" },
    { endpointId: "sol-high", modelId: "sol", sourceModelId: "luna", reasoningEffort: "high", sourceReasoningEffort: "medium", comparability: "mismatched" },
    { endpointId: "sol-default", modelId: "sol", sourceModelId: "luna", reasoningEffort: null, sourceReasoningEffort: "medium", comparability: "arm_effort_unspecified" },
  ]);
});

test("R9 threading: an unspecified source effort is reported, not treated as a mismatch", () => {
  const records = classifyReplayArmEffort({
    arms: builderArms([{ endpointId: "sol-high", modelId: "sol", reasoningEffort: "high" }]),
    sourceModelId: "luna",
    sourceReasoningEffort: null,
  });
  expect(records[0]?.comparability).toBe("source_effort_unspecified");
});
