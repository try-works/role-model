import { expect, test } from "vitest";

import {
  buildReplayPolicyRegistry,
  buildReplayPolicySet,
  decideReplayAdmission,
  resolveReplayPolicySet,
  withAdditionalReplayPolicy,
} from "../src/track-b-replay-policy.js";

test("run97 policy registry resolves the built-in policy set", () => {
  const registry = buildReplayPolicyRegistry();
  expect(registry.schemaVersion).toBe("run97.replay-policy-registry.v1");
  expect(registry.entries.length).toBeGreaterThanOrEqual(5);
  expect(resolveReplayPolicySet(buildReplayPolicySet(), registry)).toEqual({ ok: true });
});

test("run97 unknown policy ids and versions fail closed", () => {
  const registry = buildReplayPolicyRegistry();
  const unknownId = {
    ...buildReplayPolicySet(),
    trigger: { policyId: "replay.trigger.experimental.v9", policyVersion: "1", policyDigest: "x" },
  };
  const unknownVersion = {
    ...buildReplayPolicySet(),
    budget: { policyId: "replay.budget.daily.v1", policyVersion: "99", policyDigest: "x" },
  };
  expect(resolveReplayPolicySet(unknownId, registry)).toMatchObject({
    ok: false,
    code: "policy_unknown",
  });
  expect(resolveReplayPolicySet(unknownVersion, registry)).toMatchObject({
    ok: false,
    code: "policy_unknown",
  });
});

test("run97 policy registry accepts N-1 versions and reports the missing policy", () => {
  const previous = buildReplayPolicyRegistry({ policyVersions: { trigger: "0" } });
  const previousSet = buildReplayPolicySet({ policyVersions: { trigger: "0" } });
  expect(resolveReplayPolicySet(previousSet, previous)).toEqual({ ok: true });
  const current = buildReplayPolicyRegistry();
  const result = resolveReplayPolicySet(previousSet, current);
  expect(result).toMatchObject({ ok: false, code: "policy_unknown" });
  if (!result.ok) expect(result.detail).toContain("replay.trigger");
});

test("run97 registry extension is additive and does not change admission", () => {
  const extended = withAdditionalReplayPolicy(buildReplayPolicyRegistry(), {
    policyId: "replay.sampling.uniform.v1",
    supportedVersions: ["1"],
  });
  const set = buildReplayPolicySet();
  expect(resolveReplayPolicySet(set, extended)).toEqual({ ok: true });
  expect(
    decideReplayAdmission({
      channelReplayEnabled: true,
      captureAvailable: true,
      scopeAuthorized: true,
      authorizationEpochValid: true,
      retentionReplayable: true,
      privacyReplayable: true,
      distinctCandidateCount: 2,
      budgetAvailable: true,
      alreadyProcessed: false,
      sourceIsReplayProduced: false,
      policyIdsResolvable: true,
      dependenciesAvailable: true,
    }),
  ).toEqual({ admitted: true });
});
