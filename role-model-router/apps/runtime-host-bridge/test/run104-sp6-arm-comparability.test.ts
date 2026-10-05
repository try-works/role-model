import { expect, test } from "vitest";

import {
  classifyReplayArmEffort,
  preferEffortMatchedReplayArms,
} from "../src/track-b-replay-policy.js";

/**
 * Run 104 R9: "Where a candidate model offers effort variants, replay arms for the same comparison use matched
 * effort, or the mismatch is recorded as a first-class comparability dimension and excluded from promotion
 * evidence."
 *
 * The live comparison pitted `luna@default` against `sol@medium`, so the operator's question ("why is luna
 * winning; sol is more capable") could not be answered from the receipt: the arm's reasoning effort was never
 * carried as a comparability dimension.
 */

const arm = (endpointId: string, modelId: string, reasoningEffort: string | null) => ({
  endpointId,
  modelId,
  reasoningEffort,
});

test("R9: an arm at the source's effort is classified matched", () => {
  const records = classifyReplayArmEffort({
    arms: [arm("luna-medium", "luna", "medium")],
    sourceModelId: "sol",
    sourceReasoningEffort: "medium",
  });

  expect(records).toEqual([
    {
      endpointId: "luna-medium",
      modelId: "luna",
      sourceModelId: "sol",
      reasoningEffort: "medium",
      sourceReasoningEffort: "medium",
      comparability: "matched",
    },
  ]);
});

test("R9: an arm at a different effort is recorded as a first-class mismatch, not dropped", () => {
  const records = classifyReplayArmEffort({
    arms: [arm("luna-default", "luna", null)],
    sourceModelId: "sol",
    sourceReasoningEffort: "medium",
  });

  expect(records[0]?.comparability).toBe("arm_effort_unspecified");
  expect(records[0]?.sourceReasoningEffort).toBe("medium");
  expect(records).toHaveLength(1);
});

test("R9: a declared effort that differs from the source is a mismatch", () => {
  const records = classifyReplayArmEffort({
    arms: [arm("luna-high", "luna", "high")],
    sourceModelId: "sol",
    sourceReasoningEffort: "medium",
  });

  expect(records[0]?.comparability).toBe("mismatched");
});

test("R9: an unspecified source effort is reported as such rather than as a mismatch", () => {
  const records = classifyReplayArmEffort({
    arms: [arm("luna-high", "luna", "high")],
    sourceModelId: "sol",
    sourceReasoningEffort: null,
  });

  expect(records[0]?.comparability).toBe("source_effort_unspecified");
});

test("R9: effort comparison is case- and whitespace-insensitive", () => {
  const records = classifyReplayArmEffort({
    arms: [arm("luna-medium", "luna", " Medium ")],
    sourceModelId: "sol",
    sourceReasoningEffort: "medium",
  });

  expect(records[0]?.comparability).toBe("matched");
});

test("R9: an arm is repointed to the same model's variant at the source effort", () => {
  const arms = preferEffortMatchedReplayArms({
    arms: [arm("luna-default", "luna", null)],
    configuredEndpoints: [
      arm("luna-default", "luna", null),
      arm("luna-medium", "luna", "medium"),
      arm("sol-medium", "sol", "medium"),
    ],
    sourceModelId: "sol",
    sourceReasoningEffort: "medium",
  });

  expect(arms).toEqual([arm("luna-medium", "luna", "medium")]);
});

test("R9: without a matching variant the arm is kept as requested and flagged", () => {
  const arms = preferEffortMatchedReplayArms({
    arms: [arm("luna-default", "luna", null)],
    configuredEndpoints: [arm("luna-default", "luna", null)],
    sourceModelId: "sol",
    sourceReasoningEffort: "medium",
  });

  expect(arms).toEqual([arm("luna-default", "luna", null)]);
});

test("R9: a repoint never crosses models and never invents an endpoint", () => {
  const arms = preferEffortMatchedReplayArms({
    arms: [arm("luna-default", "luna", null), arm("gemma-default", "gemma", null)],
    configuredEndpoints: [
      arm("luna-default", "luna", null),
      arm("luna-medium", "luna", "medium"),
      arm("gemma-default", "gemma", null),
    ],
    sourceModelId: "sol",
    sourceReasoningEffort: "medium",
  });

  expect(arms).toEqual([arm("luna-medium", "luna", "medium"), arm("gemma-default", "gemma", null)]);
});
