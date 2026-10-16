import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { expect, test } from "vitest";

import { runAutoReplayTick } from "../src/track-b-auto-replay.js";
import { createReplayLedger } from "../src/track-b-replay-ledger.js";
import { buildReplayPolicySet } from "../src/track-b-replay-policy.js";

/**
 * Live finding (isolated production-learning verification, 2026-10-15): the LIVE tick planned a
 * counterfactual that was the served model itself. Two configured endpoints served the same model at
 * the same reasoning effort under different endpoint ids, and the planner excluded only the source
 * ENDPOINT id - so the capture was replayed against its own model, the judge scored it against
 * itself, and the comparison still reached the learner's evidence floor.
 *
 * This suite drives the real planner (`runAutoReplayTick`), so it proves the exclusion is WIRED,
 * not merely available: passing the profiles into the tick is what makes any eligibility rule take
 * effect on the live path.
 */
const SOURCE = "endpoint:src-flash-high";
const SAME_MODEL = "endpoint:alt-flash-high";
const SAME_MODEL_OTHER_EFFORT = "endpoint:src-flash-low";
const DIFFERENT_MODEL = "endpoint:pro-max";

const profile = (endpointId: string, modelId: string, reasoningEffort: string) => ({
  endpointId,
  modelId,
  reasoningEffort,
  capabilities: ["text.chat"],
  modalities: ["text"],
});

function tempLedger() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "run108-selfreplay-"));
  return {
    ledger: createReplayLedger({ filePath: path.join(dir, "ledger.json") }),
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}

test("run108 the live tick never plans the source model as its own counterfactual", async () => {
  const { ledger, cleanup } = tempLedger();
  try {
    const dispatches: string[][] = [];
    await runAutoReplayTick({
      captures: [
        {
          captureRef: "req-source-model-self-replay",
          sourceEndpointId: SOURCE,
          sourceModelId: "deepseek/deepseek-flash",
          sourceReasoningEffort: "high",
          hasRecordedToolResults: true,
        },
      ],
      configuredEndpointIds: [SOURCE, SAME_MODEL, SAME_MODEL_OTHER_EFFORT, DIFFERENT_MODEL],
      endpointProfiles: [
        profile(SOURCE, "deepseek/deepseek-flash", "high"),
        profile(SAME_MODEL, "deepseek/deepseek-flash", "high"),
        profile(SAME_MODEL_OTHER_EFFORT, "deepseek/deepseek-flash", "low"),
        profile(DIFFERENT_MODEL, "deepseek/deepseek-v4-pro", "max"),
      ],
      ledger,
      policySet: buildReplayPolicySet(),
      executor: async ({ candidates }) => {
        dispatches.push([...candidates]);
        return {
          terminal: true,
          branches: candidates.map((endpointId) => ({ endpointId, outcome: "complete" as const })),
        };
      },
    });

    expect(dispatches).toHaveLength(1);
    // The same model at the same effort behind another endpoint id is the source, not a counterfactual.
    expect(dispatches[0]).not.toContain(SAME_MODEL);
    expect(dispatches[0]).not.toContain(SOURCE);
    // A same-model arm at a DIFFERENT effort is a real effort counterfactual and stays eligible.
    expect(dispatches[0]).toContain(SAME_MODEL_OTHER_EFFORT);
    expect(dispatches[0]).toContain(DIFFERENT_MODEL);
  } finally {
    cleanup();
  }
});

test("run108 a tick with no endpoint profiles keeps its previous arm planning", async () => {
  const { ledger, cleanup } = tempLedger();
  try {
    const dispatches: string[][] = [];
    await runAutoReplayTick({
      captures: [
        {
          captureRef: "req-no-profiles",
          sourceEndpointId: SOURCE,
          sourceModelId: "deepseek/deepseek-flash",
          sourceReasoningEffort: "high",
          hasRecordedToolResults: true,
        },
      ],
      configuredEndpointIds: [SOURCE, SAME_MODEL, DIFFERENT_MODEL],
      ledger,
      policySet: buildReplayPolicySet(),
      executor: async ({ candidates }) => {
        dispatches.push([...candidates]);
        return {
          terminal: true,
          branches: candidates.map((endpointId) => ({ endpointId, outcome: "complete" as const })),
        };
      },
    });

    // No declaration means eligibility is unknown, not false: the pre-existing endpoint-id rule applies.
    expect(dispatches[0]).toContain(SAME_MODEL);
    expect(dispatches[0]).not.toContain(SOURCE);
  } finally {
    cleanup();
  }
});
