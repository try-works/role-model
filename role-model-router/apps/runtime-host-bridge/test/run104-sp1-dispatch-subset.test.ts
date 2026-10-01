import { expect, test } from "vitest";

import {
  planReplayDispatchArms,
  recheckReplayCandidatesForDispatch,
} from "../src/track-b-replay-policy.js";
import type {
  ReplayCandidateEligibilityProfile,
  ReplayCandidateRejection,
  ReplayRequestRequirements,
} from "../src/track-b-replay-policy.js";

/**
 * Run 104 R1 acceptance: "When at least one eligible arm exists, the replay is planned against it; the
 * ineligible arms are recorded with their reasons rather than silently dropped."
 *
 * The durable tick already satisfied this; the on-demand planner did not - it built its dispatch set from the
 * caller's unfiltered `candidateEndpointIds` and threw if any requested arm was ineligible, so the image-capture
 * + `[text-only, image]` case either dispatched a text-only arm or aborted the whole replay.
 */

const IMAGE_REQUIREMENTS: ReplayRequestRequirements = {
  requiredCapabilities: [],
  requiredModalities: ["image", "text"],
  source: "recorded",
};

const PROFILES: ReplayCandidateEligibilityProfile[] = [
  { endpointId: "image-arm", capabilities: [], modalities: ["text", "image"] },
  { endpointId: "text-arm", capabilities: [], modalities: ["text"] },
];

const selectionRejection = (endpointId: string): ReplayCandidateRejection => ({
  endpointId,
  code: "MODALITY_UNSUPPORTED",
  detail: `${endpointId} cannot serve the request`,
  blockedModality: "image",
});

test("R1: an image capture plans only the eligible arm and records the rejected one", () => {
  const plan = planReplayDispatchArms({
    requestedEndpointIds: ["text-arm", "image-arm"],
    selectionRejections: [selectionRejection("text-arm")],
    requirements: IMAGE_REQUIREMENTS,
    endpointProfiles: PROFILES,
  });

  expect(plan.plannedEndpointIds).toEqual(["image-arm"]);
  expect(plan.rejections.map((row) => [row.endpointId, row.code])).toEqual([
    ["text-arm", "MODALITY_UNSUPPORTED"],
  ]);
  expect(plan.rejections[0]?.blockedModality).toBe("image");
});

test("R1: an all-ineligible pool yields an empty plan with every rejection recorded", () => {
  const plan = planReplayDispatchArms({
    requestedEndpointIds: ["text-arm-a", "text-arm-b"],
    selectionRejections: [selectionRejection("text-arm-a"), selectionRejection("text-arm-b")],
    requirements: IMAGE_REQUIREMENTS,
    endpointProfiles: [
      { endpointId: "text-arm-a", capabilities: [], modalities: ["text"] },
      { endpointId: "text-arm-b", capabilities: [], modalities: ["text"] },
    ],
  });

  expect(plan.plannedEndpointIds).toEqual([]);
  expect(plan.rejections).toHaveLength(2);
});

test("R1: a capability requirement rejects the incapable arm and keeps the capable one", () => {
  const plan = planReplayDispatchArms({
    requestedEndpointIds: ["plain-arm", "tool-arm"],
    selectionRejections: [],
    requirements: { requiredCapabilities: ["tools"], requiredModalities: [], source: "recorded" },
    endpointProfiles: [
      { endpointId: "plain-arm", capabilities: [], modalities: ["text"] },
      { endpointId: "tool-arm", capabilities: ["tools"], modalities: ["text"] },
    ],
  });

  expect(plan.plannedEndpointIds).toEqual(["tool-arm"]);
  expect(plan.rejections.map((row) => [row.endpointId, row.code])).toEqual([
    ["plain-arm", "CAPABILITY_MISSING"],
  ]);
});

test("R1: an arm with no declared profile stays planned, and the plan never invents or reorders arms", () => {
  const plan = planReplayDispatchArms({
    requestedEndpointIds: ["undeclared-arm", "image-arm", "undeclared-arm"],
    selectionRejections: [],
    requirements: IMAGE_REQUIREMENTS,
    endpointProfiles: PROFILES,
  });

  expect(plan.plannedEndpointIds).toEqual(["undeclared-arm", "image-arm"]);
  expect(plan.rejections).toEqual([]);
});

test("R1: a declared pool that the pre-dispatch re-check empties is recorded, not dispatched into", () => {
  // The selection pass admitted the arm, but the profile that reaches the dispatch boundary no longer
  // serves the request (the configuration changed in between). The planner must not dispatch it.
  const stale = recheckReplayCandidatesForDispatch({
    endpointIds: ["image-arm"],
    requirements: IMAGE_REQUIREMENTS,
    endpointProfiles: [{ endpointId: "image-arm", capabilities: [], modalities: ["text"] }],
  });
  expect(stale).toHaveLength(1);

  const plan = planReplayDispatchArms({
    requestedEndpointIds: ["image-arm"],
    selectionRejections: [],
    requirements: IMAGE_REQUIREMENTS,
    endpointProfiles: [{ endpointId: "image-arm", capabilities: [], modalities: ["text"] }],
  });

  expect(plan.plannedEndpointIds).toEqual([]);
  expect(plan.rejections.map((row) => [row.endpointId, row.code])).toEqual([
    ["image-arm", "MODALITY_UNSUPPORTED"],
  ]);
});

test("R1: no recorded requirements leaves the requested arms untouched", () => {
  const plan = planReplayDispatchArms({
    requestedEndpointIds: ["text-arm", "image-arm"],
    selectionRejections: [],
    endpointProfiles: PROFILES,
  });

  expect(plan.plannedEndpointIds).toEqual(["text-arm", "image-arm"]);
  expect(plan.rejections).toEqual([]);
});
