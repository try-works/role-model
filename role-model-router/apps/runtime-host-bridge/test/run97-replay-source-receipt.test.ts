import { expect, test } from "vitest";

import { createReplaySourceAttestation } from "../src/track-b-runtime.js";

const baseReplaySource = {
  schemaVersion: "role-model.route-capture-replay-source.v1",
  normalizedRequestRef: "artifact:request-1",
  sharedPrefixRef: "artifact:prefix-1",
  forkOccurrenceId: "occurrence:1",
  policySnapshotRef: "artifact:policy-1",
  capturePolicyRef: "artifact:capture-policy-1",
} as const;

const attest = (capture: Record<string, unknown>, eligibleEndpointIds: readonly string[]) =>
  createReplaySourceAttestation({
    channel: "development",
    scope: "tenant:run97",
    authorizationEpoch: 97,
    capture,
    eligibleEndpointIds,
  });

test("run97 attests a complete traced capture (baseline)", () => {
  const attestation = attest(
    {
      schemaVersion: "role-model.route-capture-read.v2",
      scope: "tenant:run97",
      rootArtifactId: "artifact:root-1",
      routingDecisionId: "decision:1",
      endpointId: "endpoint:source",
      trace: {
        generation: 1,
        readiness: "ready",
        rootOccurrenceId: "occurrence:1",
        headOccurrenceId: "occurrence:1",
        leafOccurrenceIds: ["occurrence:1"],
        lastSequence: 0,
        traversalDigest: `sha256:${"0".repeat(64)}`,
      },
      replaySource: baseReplaySource,
    },
    ["endpoint:source", "endpoint:counterfactual"],
  );
  expect(attestation.traceRoot.selectedEndpointId).toBe("endpoint:source");
  expect(attestation.traceRoot.eligibleEndpointIds).toEqual([
    "endpoint:counterfactual",
    "endpoint:source",
  ]);
});

test("run97 attests a durable capture that carries no graph trace block", () => {
  // The packaged runtime records route captures without an inline trace block in
  // some channels; those captures are still durable and must be replayable (R1).
  const attestation = attest(
    {
      schemaVersion: "role-model.route-capture-read.v1",
      scope: "tenant:run97",
      rootArtifactId: "artifact:root-2",
      routingDecisionId: "decision:2",
      endpointId: "endpoint:source",
      replaySource: baseReplaySource,
    },
    ["endpoint:source", "endpoint:counterfactual"],
  );
  expect(attestation.traceRoot.selectedEndpointId).toBe("endpoint:source");
  expect(attestation.traceRoot.readiness).toBe("unavailable");
});

test("run97 attests a capture whose trace reports a numeric readiness level", () => {
  const attestation = attest(
    {
      schemaVersion: "role-model.route-capture-read.v2",
      scope: "tenant:run97",
      rootArtifactId: "artifact:root-3",
      routingDecisionId: "decision:3",
      endpointId: "endpoint:source",
      trace: {
        generation: 1,
        readiness: 5,
        rootOccurrenceId: "occurrence:3",
        headOccurrenceId: "occurrence:3",
        leafOccurrenceIds: ["occurrence:3"],
        lastSequence: 0,
        traversalDigest: `sha256:${"3".repeat(64)}`,
      },
      replaySource: baseReplaySource,
    },
    ["endpoint:source"],
  );
  expect(attestation.traceRoot.selectedEndpointId).toBe("endpoint:source");
});

test("run97 still refuses a capture without a durable replay source", () => {
  expect(() =>
    attest(
      {
        schemaVersion: "role-model.route-capture-read.v1",
        scope: "tenant:run97",
        rootArtifactId: "artifact:root-4",
        routingDecisionId: "decision:4",
        endpointId: "endpoint:source",
        replaySource: { ...baseReplaySource, sharedPrefixRef: "" },
      },
      ["endpoint:source"],
    ),
  ).toThrow(/shared prefix reference/);
});
