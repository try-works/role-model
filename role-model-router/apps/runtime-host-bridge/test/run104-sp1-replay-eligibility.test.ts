import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { expect, test } from "vitest";

import { runAutoReplayTick } from "../src/track-b-auto-replay.js";
import { createReplayLedger } from "../src/track-b-replay-ledger.js";
import { buildReplayPolicySet } from "../src/track-b-replay-policy.js";
import type {
  ReplayCandidateEligibilityProfile,
  ReplayCandidateRejection,
  ReplayRequestRequirements,
} from "../src/track-b-replay-policy.js";

const policy = async () => import("../src/track-b-replay-policy.js");

const IMAGE_REQUIREMENTS: ReplayRequestRequirements = {
  requiredCapabilities: [],
  requiredModalities: ["image", "text"],
  source: "recorded",
};

const IMAGE_CAPTURE = {
  messages: [
    {
      role: "user",
      content: [
        { type: "text", text: "what is in this picture?" },
        { type: "image_url", image_url: { url: "data:image/png;base64,AAAA" } },
      ],
    },
  ],
};

function tempLedger() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "run104-sp1-"));
  return {
    ledger: createReplayLedger({
      filePath: path.join(dir, "ledger.json"),
      now: () => Date.parse("2026-10-01T06:00:00Z"),
    }),
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}

test("run104 SP1 reads the capture's recorded decision and marks it recorded", async () => {
  const { readReplayRequestRequirements } = await policy();
  expect(
    readReplayRequestRequirements({
      routingDecision: {
        required_capabilities: ["code.read"],
        required_modalities: ["image", "text"],
      },
    }),
  ).toEqual({
    requiredCapabilities: ["code.read"],
    requiredModalities: ["image", "text"],
    source: "recorded",
  });
});

test("run104 SP1 infers the requirement from message content and records the inference", async () => {
  const { readReplayRequestRequirements } = await policy();
  const inferred = readReplayRequestRequirements(IMAGE_CAPTURE);
  expect(inferred.source).toBe("inferred");
  expect(inferred.requiredModalities).toContain("image");
  expect(inferred.requiredCapabilities).toEqual([]);
  expect(readReplayRequestRequirements({ messages: [] }).requiredModalities).toEqual(["text"]);
});

test("run104 SP1 plans no arm against a text-only pool and records every rejected arm", async () => {
  const { selectReplayCandidates } = await policy();
  const rejected: ReplayCandidateRejection[] = [];
  const selected = selectReplayCandidates({
    configuredEndpointIds: ["text-a", "text-b"],
    requirements: IMAGE_REQUIREMENTS,
    endpointProfiles: [
      { endpointId: "text-a", capabilities: [], modalities: ["text"] },
      { endpointId: "text-b", capabilities: [], modalities: ["text"] },
    ],
    onRejected: (row) => rejected.push(row),
  });
  expect(selected).toEqual([]);
  expect(rejected.map((row) => [row.endpointId, row.code])).toEqual([
    ["text-a", "MODALITY_UNSUPPORTED"],
    ["text-b", "MODALITY_UNSUPPORTED"],
  ]);
});

test("run104 SP1 plans the image arm and records the text-only arm's reason", async () => {
  const { selectReplayCandidates } = await policy();
  const rejected: ReplayCandidateRejection[] = [];
  const selected = selectReplayCandidates({
    configuredEndpointIds: ["text-arm", "image-arm"],
    requirements: IMAGE_REQUIREMENTS,
    endpointProfiles: [
      { endpointId: "text-arm", capabilities: [], modalities: ["text"] },
      { endpointId: "image-arm", capabilities: [], modalities: ["image", "text"] },
    ],
    onRejected: (row) => rejected.push(row),
  });
  expect(selected).toEqual(["image-arm"]);
  expect(rejected.map((row) => [row.endpointId, row.code])).toEqual([
    ["text-arm", "MODALITY_UNSUPPORTED"],
  ]);
});

test("run104 SP1 satisfies capability requirements through the router's exported rule only", async () => {
  const { selectReplayCandidates } = await policy();
  const rejected: ReplayCandidateRejection[] = [];
  const selected = selectReplayCandidates({
    configuredEndpointIds: ["editor", "plain"],
    requirements: {
      requiredCapabilities: ["code.read"],
      requiredModalities: ["text"],
      source: "recorded",
    },
    endpointProfiles: [
      { endpointId: "editor", capabilities: ["code.edit"], modalities: ["text"] },
      { endpointId: "plain", capabilities: ["text.chat"], modalities: ["text"] },
    ],
    onRejected: (row) => rejected.push(row),
  });
  expect(selected).toEqual(["editor"]);
  expect(rejected.map((row) => [row.endpointId, row.code])).toEqual([
    ["plain", "CAPABILITY_MISSING"],
  ]);
});

test("run104 SP1 pre-dispatch re-check fails a stale arm cheaply with the reason", async () => {
  const { recheckReplayCandidatesForDispatch } = await policy();
  const profiles: ReplayCandidateEligibilityProfile[] = [
    { endpointId: "image-arm", capabilities: [], modalities: ["text"] },
  ];
  expect(
    recheckReplayCandidatesForDispatch({
      endpointIds: ["image-arm"],
      requirements: IMAGE_REQUIREMENTS,
      endpointProfiles: profiles,
    }).map((row) => [row.endpointId, row.code]),
  ).toEqual([["image-arm", "MODALITY_UNSUPPORTED"]]);
});

test("run104 SP1 auto-replay tick dispatches nothing for an ineligible arm and records it", async () => {
  const { ledger, cleanup } = tempLedger();
  try {
    let dispatched = 0;
    const result = await runAutoReplayTick({
      captures: [
        {
          captureRef: "req-image",
          sourceEndpointId: "endpoint-a",
          hasRecordedToolResults: false,
          requirements: IMAGE_REQUIREMENTS,
        },
      ],
      configuredEndpointIds: ["endpoint-a", "endpoint-b"],
      endpointProfiles: [
        { endpointId: "endpoint-a", capabilities: [], modalities: ["text"] },
        { endpointId: "endpoint-b", capabilities: [], modalities: ["text"] },
      ],
      ledger,
      policySet: buildReplayPolicySet(),
      executor: async () => {
        dispatched += 1;
        return { terminal: true, branches: [] };
      },
    });
    expect(dispatched).toBe(0);
    expect(result.replayed).toBe(0);
    expect(result.dispositions).toHaveLength(1);
    // Run 104 SP2 supersedes this assertion: when every declared arm fails the router's own eligibility rule
    // the capture is refused terminally by name (R2), instead of being deferred under the generic
    // `no_distinct_candidate_configured` code that had no blocking modality or capability attached.
    expect(result.dispositions[0]?.code).toBe("candidate_input_unsupported");
    expect(result.dispositions[0]?.outcome).toBe("refused");
    expect(
      result.dispositions[0]?.rejectedArms?.map((row) => [row.endpointId, row.code]),
    ).toEqual([["endpoint-b", "MODALITY_UNSUPPORTED"]]);
  } finally {
    cleanup();
  }
});
