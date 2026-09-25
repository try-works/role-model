import { expect, test } from "vitest";

import { decodeShadowPipelineReadback } from "../src/track-b-runtime.js";

/**
 * Run 107: the packaged host answers every business invoke inside its own envelope, and that envelope
 * carries `schemaVersion` beside `businessOutput`.
 *
 * Measured live on `0.0.14-…-geb21e369`: every supervised replay's profile step degraded with
 * `finalized decisive evaluation provenance required for profile learning`, because the pipeline handed the
 * worker the envelope (no `groupId`, no `status`) instead of the comparison the extension had answered with.
 * The comparison itself was fine - reading the same group from the extension directly returns
 * `{groupId, status: "finalized", outcome: "candidate", members, comparability}` - so the defect is purely the
 * boundary decode.
 */

const comparison = {
  groupId:
    "comparison:supervised-replay:ff5c3f191a09ab50c59286a3991a3b11f605338c522fa2990f2b7bd6e1b69b1c",
  status: "finalized",
  outcome: "candidate",
  members: [{ trialId: "trial:candidate", score: 0.7 }],
  comparability: { sourceCandidateRef: "moonshot.personal.kimi-code.global.kimi-k3" },
};

const decode = (raw: unknown) =>
  decodeShadowPipelineReadback({
    raw,
    extensionId: "evaluation-core",
    scopeId: "standalone-runtime-stage",
  }) as Record<string, unknown>;

test("run107 a host envelope carrying schemaVersion still yields the comparison it wraps", () => {
  const decoded = decode({
    schemaVersion: "role-model.extension-business-result.v1",
    businessOutput: comparison,
    durableLocator: {
      extensionId: "evaluation-core",
      capability: "evaluation:read-comparison-group",
    },
    readCapability: "evaluation:read-comparison-group",
    workerPid: 4242,
  });
  expect(decoded.groupId).toBe(comparison.groupId);
  expect(decoded.status).toBe("finalized");
  expect(decoded.outcome).toBe("candidate");
});

test("run107 a degradation receipt stays the payload, even though it carries schemaVersion and businessOutput", () => {
  const receipt = {
    schemaVersion: "role-model.extension-degradation.v1",
    degraded: true,
    capability: "evaluation:read-comparison-group",
    reason: "finalized decisive evaluation provenance required for profile learning",
    businessOutput: null,
    durableLocator: null,
    readCapability: "evaluation:read-comparison-group",
    workerPid: 4242,
  };
  const decoded = decode(receipt);
  expect(decoded.degraded).toBe(true);
  expect(decoded.reason).toBe(receipt.reason);
});

test("run107 a business record with its own schemaVersion is not mistaken for an envelope", () => {
  const record = {
    schemaVersion: "role-model.route-advisory-observation.v1",
    decisionId: "decision:1",
  };
  expect(decode(record)).toMatchObject({ decisionId: "decision:1" });
});

test("run107 the bare businessOutput wrapper keeps decoding, as it always did", () => {
  expect(decode({ businessOutput: comparison }).groupId).toBe(comparison.groupId);
});

test("run107 a nested business envelope unwraps to the innermost record", () => {
  const decoded = decode({
    schemaVersion: "role-model.extension-business-result.v1",
    businessOutput: {
      schemaVersion: "role-model.extension-business-result.v1",
      businessOutput: comparison,
      durableLocator: null,
    },
    durableLocator: null,
  });
  expect(decoded.groupId).toBe(comparison.groupId);
});
