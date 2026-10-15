import { describe, expect, test } from "vitest";

import {
  planReplayDispatchArms,
  preferEffortMatchedReplayArms,
  type ReplayCandidateEligibilityProfile,
} from "../src/track-b-replay-policy.js";

/**
 * Live finding (isolated production-learning verification, 2026-10-15): after the source-model self-replay
 * exclusion was added, effort repointing re-created the very arm that had just been rejected. The only
 * surviving arm (same model, LOWER effort) was repointed onto the same-model/same-effort twin, the
 * pre-dispatch re-check then dropped it as SOURCE_MODEL_SELF_REPLAY, and the whole capture was refused:
 *
 *   "replay arm cannot serve the capture's request requirements:
 *    selfcheck-b.global.deepseek-flash-high (SOURCE_MODEL_SELF_REPLAY)"
 *
 * A same-model arm at a DIFFERENT effort is a legitimate effort counterfactual, so repointing must leave it
 * at its own effort rather than collapsing it onto the source.
 */
const SOURCE = "acct-a.global.flash-high";
const SAME_MODEL_TWIN = "acct-b.global.flash-high";
const SAME_MODEL_LOW = "acct-a.global.flash-low";
const OTHER_MODEL_MAX = "acct-a.global.pro-max";

const profile = (
  endpointId: string,
  modelId: string,
  reasoningEffort: string,
): ReplayCandidateEligibilityProfile => ({
  endpointId,
  modelId,
  reasoningEffort,
  capabilities: ["text.chat"],
  modalities: ["text"],
});

const PROFILES = [
  profile(SOURCE, "deepseek/deepseek-flash", "high"),
  profile(SAME_MODEL_TWIN, "deepseek/deepseek-flash", "high"),
  profile(SAME_MODEL_LOW, "deepseek/deepseek-flash", "low"),
  profile(OTHER_MODEL_MAX, "deepseek/deepseek-v4-pro", "max"),
];

describe("run 108 effort repointing must not recreate the source self-replay", () => {
  test("a same-model arm keeps its own effort instead of collapsing onto the source", () => {
    const arms = [
      { endpointId: SAME_MODEL_LOW, modelId: "deepseek/deepseek-flash", reasoningEffort: "low" },
      { endpointId: OTHER_MODEL_MAX, modelId: "deepseek/deepseek-v4-pro", reasoningEffort: "max" },
    ];
    const repointed = preferEffortMatchedReplayArms({
      arms,
      configuredEndpoints: [
        { endpointId: SOURCE, modelId: "deepseek/deepseek-flash", reasoningEffort: "high" },
        { endpointId: SAME_MODEL_TWIN, modelId: "deepseek/deepseek-flash", reasoningEffort: "high" },
        { endpointId: SAME_MODEL_LOW, modelId: "deepseek/deepseek-flash", reasoningEffort: "low" },
        { endpointId: OTHER_MODEL_MAX, modelId: "deepseek/deepseek-v4-pro", reasoningEffort: "max" },
      ],
      sourceModelId: "deepseek/deepseek-flash",
      sourceReasoningEffort: "high",
      sourceEndpointId: SOURCE,
    });

    // The same-model arm stays at its own (different) effort: a real effort counterfactual.
    expect(repointed[0].endpointId).toBe(SAME_MODEL_LOW);
    expect(repointed[0].reasoningEffort).toBe("low");
    // A DIFFERENT model may still be repointed to the source effort (no self-replay is created).
    expect(repointed[1].endpointId).toBe(OTHER_MODEL_MAX);
  });

  test("the repointed plan still dispatches the surviving effort counterfactual", () => {
    const plan = planReplayDispatchArms({
      requestedEndpointIds: [SAME_MODEL_LOW, OTHER_MODEL_MAX],
      selectionRejections: [
        {
          endpointId: SAME_MODEL_TWIN,
          code: "SOURCE_MODEL_SELF_REPLAY",
          detail: "serves the source model at the source effort",
        },
      ],
      requirements: { requiredCapabilities: ["text.chat"], requiredModalities: ["text"] },
      endpointProfiles: PROFILES,
    });

    expect(plan.plannedEndpointIds).toContain(SAME_MODEL_LOW);
    expect(plan.plannedEndpointIds).toContain(OTHER_MODEL_MAX);
    expect(plan.rejections.map((rejection) => rejection.endpointId)).toContain(SAME_MODEL_TWIN);
  });
});
