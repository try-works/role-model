import { describe, expect, test } from "vitest";

import {
  selectReplayCandidates,
  type ReplayCandidateEligibilityProfile,
  type ReplayCandidateRejection,
} from "../src/track-b-replay-policy.js";

/**
 * Live finding (isolated production-learning verification, 2026-10-15): a served route was replayed
 * against ITSELF. The capture was served by `...isolated-test.global.deepseek-flash-high`; the
 * configured pool also held `...isolated-alt.global.deepseek-flash-high` - a different endpoint id
 * for the SAME model at the SAME reasoning effort. Arm selection excluded only the exact source
 * endpoint id (`selectReplayCandidates`, cli.ts counterfactual filter), so the self-replay was
 * admitted, the judge dutifully returned 0.50/0.00, and the group finalized as
 * `sourceCandidateRef === counterfactualCandidateRef` modulo the endpoint prefix. That is not a
 * counterfactual: it is one model compared with itself, and every such comparison is unusable
 * learning evidence.
 *
 * The rule: a candidate is ineligible when it serves the same MODEL at the same declared reasoning
 * effort as the source, regardless of which endpoint id carries it. A same-model arm at a DIFFERENT
 * effort stays eligible - that is a real effort counterfactual, not a self-replay.
 */
const profile = (
  endpointId: string,
  modelId: string,
  reasoningEffort: string | null,
): ReplayCandidateEligibilityProfile => ({
  endpointId,
  capabilities: ["text.chat"],
  modalities: ["text"],
  modelId,
  reasoningEffort,
});

const POOL = [
  "isolated-test.global.deepseek-flash-high",
  "isolated-alt.global.deepseek-flash-high",
  "isolated-low.global.deepseek-flash-low",
  "pro.global.deepseek-v4-pro-max",
];

const PROFILES = [
  profile(POOL[0], "deepseek/deepseek-flash", "high"),
  profile(POOL[1], "deepseek/deepseek-flash", "high"),
  profile(POOL[2], "deepseek/deepseek-flash", "low"),
  profile(POOL[3], "deepseek/deepseek-v4-pro", "max"),
];

describe("run 108 replay source-model self-exclusion", () => {
  test("an endpoint serving the source model at the source effort is not a counterfactual", () => {
    const rejections: ReplayCandidateRejection[] = [];
    const selected = selectReplayCandidates({
      configuredEndpointIds: POOL,
      sourceEndpointId: POOL[0],
      sourceModelId: "deepseek/deepseek-flash",
      sourceReasoningEffort: "high",
      endpointProfiles: PROFILES,
      onRejected: (rejection) => rejections.push(rejection),
    });

    // Same model + same effort behind a different endpoint id: the self-replay.
    expect(selected).not.toContain(POOL[1]);
    expect(rejections).toEqual([
      expect.objectContaining({ endpointId: POOL[1], code: "SOURCE_MODEL_SELF_REPLAY" }),
    ]);
    // A same-model arm at a DIFFERENT effort is still a real counterfactual.
    expect(selected).toContain(POOL[2]);
    // And so is a different model.
    expect(selected).toContain(POOL[3]);
  });

  test("effort case and separators cannot smuggle the source model back in", () => {
    const rejections: ReplayCandidateRejection[] = [];
    const selected = selectReplayCandidates({
      configuredEndpointIds: ["src.flash-high", "alt.flash-high"],
      sourceEndpointId: "src.flash-high",
      sourceModelId: "deepseek/deepseek-flash",
      sourceReasoningEffort: "HIGH",
      endpointProfiles: [
        profile("src.flash-high", "deepseek/deepseek-flash", "high"),
        profile("alt.flash-high", "DeepSeek/DeepSeek-Flash", " High "),
      ],
      onRejected: (rejection) => rejections.push(rejection),
    });

    expect(selected).toEqual([]);
    expect(rejections.map((rejection) => rejection.code)).toEqual([
      "SOURCE_MODEL_SELF_REPLAY",
    ]);
  });

  test("a caller that declares no source model keeps the previous behaviour", () => {
    const selected = selectReplayCandidates({
      configuredEndpointIds: POOL,
      sourceEndpointId: POOL[0],
      endpointProfiles: PROFILES,
    });

    expect(selected).toEqual([POOL[1], POOL[2], POOL[3]]);
  });

  test("an arm whose model or effort is undeclared is left to the pre-existing filters", () => {
    const selected = selectReplayCandidates({
      configuredEndpointIds: ["src.flash-high", "unknown.endpoint"],
      sourceEndpointId: "src.flash-high",
      sourceModelId: "deepseek/deepseek-flash",
      sourceReasoningEffort: "high",
      endpointProfiles: [
        profile("src.flash-high", "deepseek/deepseek-flash", "high"),
        { endpointId: "unknown.endpoint", capabilities: [], modalities: [] },
      ],
    });

    expect(selected).toEqual(["unknown.endpoint"]);
  });
});
