import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { expect, test } from "vitest";

import { runAutoReplayTick } from "../src/track-b-auto-replay.js";
import { createReplayLedger } from "../src/track-b-replay-ledger.js";
import { buildReplayPolicySet } from "../src/track-b-replay-policy.js";
import type { ReplayRequestRequirements } from "../src/track-b-replay-policy.js";

/**
 * Run 104 SP2 (R2): a replay no eligible arm can serve is refused *by name* - terminally when the
 * configured pool declares it can never serve the capture's input, deferrably when an endpoint that
 * could serve it exists but is unhealthy or excluded. Before this, the class arrived as the generic
 * `no_distinct_candidate_configured` (deferred), so the disposition plane could not count it and the
 * capture re-ran every tick.
 */

const IMAGE_REQUIREMENTS: ReplayRequestRequirements = {
  requiredCapabilities: [],
  requiredModalities: ["image", "text"],
  source: "recorded",
};

const TEXT_REQUIREMENTS: ReplayRequestRequirements = {
  requiredCapabilities: [],
  requiredModalities: ["text"],
  source: "recorded",
};

function tempLedger() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "run104-sp2-"));
  return {
    ledger: createReplayLedger({
      filePath: path.join(dir, "ledger.json"),
      now: () => Date.parse("2026-10-01T06:00:00Z"),
    }),
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}

test("run104 SP2 refuses an unsupported capture terminally, by name, once", async () => {
  const { ledger, cleanup } = tempLedger();
  try {
    let dispatched = 0;
    const result = await runAutoReplayTick({
      captures: [
        {
          captureRef: "req-image-unsupported",
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
    const disposition = result.dispositions[0];
    expect(disposition?.code).toBe("candidate_input_unsupported");
    expect(disposition?.outcome).toBe("refused");
    expect(disposition?.detail).toContain("image");
    expect(disposition?.detail).toContain("endpoint-b");
    expect(disposition?.rejectedArms?.map((row) => [row.endpointId, row.code])).toEqual([
      ["endpoint-b", "MODALITY_UNSUPPORTED"],
    ]);
  } finally {
    cleanup();
  }
});

test("run104 SP2 keeps a capable-but-unavailable pool deferrable, named", async () => {
  const { ledger, cleanup } = tempLedger();
  try {
    let dispatched = 0;
    const result = await runAutoReplayTick({
      captures: [
        {
          captureRef: "req-image-capable-unavailable",
          sourceEndpointId: "text-source",
          hasRecordedToolResults: false,
          requirements: IMAGE_REQUIREMENTS,
        },
      ],
      configuredEndpointIds: ["text-source", "image-arm", "text-arm"],
      healthyEndpointIds: ["text-arm"],
      endpointProfiles: [
        { endpointId: "text-source", capabilities: [], modalities: ["text"] },
        { endpointId: "image-arm", capabilities: [], modalities: ["image", "text"] },
        { endpointId: "text-arm", capabilities: [], modalities: ["text"] },
      ],
      ledger,
      policySet: buildReplayPolicySet(),
      executor: async () => {
        dispatched += 1;
        return { terminal: true, branches: [] };
      },
    });
    expect(dispatched).toBe(0);
    const disposition = result.dispositions[0];
    expect(disposition?.code).toBe("candidate_input_unsupported");
    expect(disposition?.outcome).toBe("deferred");
    expect(disposition?.detail).toContain("image-arm");
  } finally {
    cleanup();
  }
});

test("run104 SP2 leaves a text-only capture's plan and outcome unchanged", async () => {
  const { ledger, cleanup } = tempLedger();
  try {
    const planned: string[][] = [];
    const result = await runAutoReplayTick({
      captures: [
        {
          captureRef: "req-text",
          sourceEndpointId: "text-source",
          hasRecordedToolResults: false,
          requirements: TEXT_REQUIREMENTS,
        },
      ],
      configuredEndpointIds: ["text-source", "text-a", "text-b"],
      endpointProfiles: [
        { endpointId: "text-source", capabilities: [], modalities: ["text"] },
        { endpointId: "text-a", capabilities: [], modalities: ["text"] },
        { endpointId: "text-b", capabilities: [], modalities: ["text"] },
      ],
      ledger,
      policySet: buildReplayPolicySet(),
      executor: async (input: { candidates: readonly string[] }) => {
        planned.push([...input.candidates]);
        return {
          terminal: true,
          branches: input.candidates.map((endpointId) => ({
            endpointId,
            outcome: "complete" as const,
          })),
        };
      },
    });
    expect(result.replayed).toBe(1);
    expect(result.dispositions[0]?.code).toBeUndefined();
    expect(planned).toEqual([["text-a", "text-b"]]);
  } finally {
    cleanup();
  }
});

test("run104 SP2 classifies the shortfall: terminal only when every declared arm cannot serve", async () => {
  const { classifyReplayCandidateShortfall } = await import("../src/track-b-replay-policy.js");
  const terminal = classifyReplayCandidateShortfall({
    configuredEndpointIds: ["endpoint-a", "endpoint-b"],
    sourceEndpointId: "endpoint-a",
    requirements: IMAGE_REQUIREMENTS,
    endpointProfiles: [
      { endpointId: "endpoint-a", capabilities: [], modalities: ["text"] },
      { endpointId: "endpoint-b", capabilities: [], modalities: ["text"] },
    ],
  });
  expect(terminal?.code).toBe("candidate_input_unsupported");
  expect(terminal?.outcome).toBe("refused");
  expect(terminal?.blockedModality).toBe("image");
  expect(terminal?.rejectedEndpointIds).toEqual(["endpoint-b"]);

  const deferrable = classifyReplayCandidateShortfall({
    configuredEndpointIds: ["text-source", "image-arm", "text-arm"],
    sourceEndpointId: "text-source",
    healthyEndpointIds: ["text-arm"],
    requirements: IMAGE_REQUIREMENTS,
    endpointProfiles: [
      { endpointId: "text-source", capabilities: [], modalities: ["text"] },
      { endpointId: "image-arm", capabilities: [], modalities: ["image", "text"] },
      { endpointId: "text-arm", capabilities: [], modalities: ["text"] },
    ],
  });
  expect(deferrable?.outcome).toBe("deferred");
  expect(deferrable?.unavailableEndpointIds).toEqual(["image-arm"]);

  const undeclared = classifyReplayCandidateShortfall({
    configuredEndpointIds: ["mystery-arm", "text-arm"],
    sourceEndpointId: "text-source",
    requirements: IMAGE_REQUIREMENTS,
    endpointProfiles: [{ endpointId: "text-arm", capabilities: [], modalities: ["text"] }],
  });
  expect(undeclared?.outcome).toBe("deferred");
  expect(
    classifyReplayCandidateShortfall({
      configuredEndpointIds: ["mystery-arm"],
      sourceEndpointId: "text-source",
      requirements: IMAGE_REQUIREMENTS,
      endpointProfiles: [],
    }),
  ).toBeNull();

  const served = classifyReplayCandidateShortfall({
    configuredEndpointIds: ["text-source", "text-arm"],
    sourceEndpointId: "text-source",
    requirements: TEXT_REQUIREMENTS,
    endpointProfiles: [
      { endpointId: "text-source", capabilities: [], modalities: ["text"] },
      { endpointId: "text-arm", capabilities: [], modalities: ["text"] },
    ],
  });
  expect(served).toBeNull();
});
