import { expect, test } from "vitest";

import {
  assertReplayReceiptMetadataOnly,
  classifyReplayArtifactRetention,
} from "../src/track-b-replay-retention.js";

test("run97 replay receipts must be metadata only", () => {
  expect(() =>
    assertReplayReceiptMetadataOnly({
      captureRef: "req-1",
      policySetDigest: "digest",
      counterfactualRef: "cf:req-1",
      candidateEndpointId: "endpoint-a",
      dispatchKind: "candidate",
      attempt: 1,
      costMicros: 12,
      bytes: 345,
      outcome: "complete",
    }),
  ).not.toThrow();
});

test("run97 replay receipts reject raw content and secret fields", () => {
  for (const forbidden of [
    { messages: [{ role: "user", content: "hello" }] },
    { content: "raw model output" },
    { prompt: "system prompt" },
    { toolArguments: { path: "C:/secret" } },
    { apiKey: "sk-live-123" },
    { providerBody: { choices: [] } },
  ]) {
    expect(() => assertReplayReceiptMetadataOnly({ captureRef: "req-1", ...forbidden })).toThrow(
      /raw content|secret/i,
    );
  }
});

test("run97 replay artifacts inherit the source privacy class and retention policy", () => {
  const source = {
    privacyClass: "private_local",
    retentionPolicyIds: {
      localRich: "local-rich-off.v1",
      localSamples: "local-samples-bounded.v1",
      cloudStaging: "cloud-staging-short.v1",
      cloudAccepted: "cloud-accepted-aggregate.v1",
    },
  };
  for (const kind of ["replay_branch", "counterfactual_branch"] as const) {
    const classification = classifyReplayArtifactRetention({ ...source, kind });
    expect(classification.kind).toBe(kind);
    expect(classification.privacyClass).toBe(source.privacyClass);
    expect(classification.retentionPolicyIds).toEqual(source.retentionPolicyIds);
    expect(classification.egress).toBe("none");
  }
});

test("run97 replay artifacts never loosen classification and refuse unknown kinds", () => {
  const classification = classifyReplayArtifactRetention({
    privacyClass: "private_local",
    retentionPolicyIds: { localRich: "local-rich-off.v1" },
    kind: "counterfactual_branch",
  });
  expect(classification.privacyClass).not.toBe("aggregate_only");
  expect(classification.egress).toBe("none");
  expect(() =>
    classifyReplayArtifactRetention({
      privacyClass: "private_local",
      retentionPolicyIds: {},
      kind: "unbounded_export" as never,
    }),
  ).toThrow(/unsupported replay artifact kind/i);
});
