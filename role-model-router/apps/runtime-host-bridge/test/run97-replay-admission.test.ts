import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const sourceRoot = path.resolve(here, "../src");

test("run97 admission admits every capture when no policy input blocks it", async () => {
  const { decideReplayAdmission } = await import("../src/track-b-replay-policy.js");
  const decision = decideReplayAdmission({
    channelReplayEnabled: true,
    captureAvailable: true,
    scopeAuthorized: true,
    authorizationEpochValid: true,
    retentionReplayable: true,
    privacyReplayable: true,
    distinctCandidateCount: 4,
    budgetAvailable: true,
    alreadyProcessed: false,
    sourceIsReplayProduced: false,
    policyIdsResolvable: true,
    dependenciesAvailable: true,
  });
  expect(decision).toEqual({ admitted: true });
});

test("run97 admission maps every blocking input to one closed refusal code", async () => {
  const { decideReplayAdmission, REPLAY_REFUSAL_CODES } = await import(
    "../src/track-b-replay-policy.js"
  );
  const base = {
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
  } as const;
  const cases: Array<[Record<string, unknown>, string]> = [
    [{ channelReplayEnabled: false }, "replay_disabled_channel"],
    [{ captureAvailable: false }, "capture_unavailable"],
    [{ scopeAuthorized: false }, "scope_denied"],
    [{ authorizationEpochValid: false }, "authorization_revoked"],
    [{ retentionReplayable: false }, "retention_expired"],
    [{ privacyReplayable: false }, "privacy_denied"],
    [{ budgetAvailable: false }, "budget_exhausted"],
    [{ alreadyProcessed: true }, "duplicate_already_processed"],
    [{ sourceIsReplayProduced: true }, "amplification_depth_exceeded"],
    [{ policyIdsResolvable: false }, "policy_unknown"],
    [{ dependenciesAvailable: false }, "dependency_unavailable"],
  ];
  for (const [override, expectedCode] of cases) {
    const decision = decideReplayAdmission({ ...base, ...override });
    expect(decision.admitted, expectedCode).toBe(false);
    if (!decision.admitted) {
      expect(decision.code, expectedCode).toBe(expectedCode);
      expect(REPLAY_REFUSAL_CODES).toContain(decision.code);
    }
  }
  const noCandidate = decideReplayAdmission({ ...base, distinctCandidateCount: 0 });
  expect(noCandidate.admitted).toBe(false);
  if (!noCandidate.admitted) expect(noCandidate.code).toBe("no_distinct_candidate_configured");
});

test("run97 refusal codes never encode tool use, capability, or transcript shape", async () => {
  const { REPLAY_REFUSAL_CODES } = await import("../src/track-b-replay-policy.js");
  for (const code of REPLAY_REFUSAL_CODES) {
    expect(code).not.toMatch(/tool|capab|classification|role|model|transcript|endpoint/);
  }
});

test("run97 candidate selection uses the configured set, excludes the source, and caps at three", async () => {
  const { selectReplayCandidates } = await import("../src/track-b-replay-policy.js");
  const configured = [
    "deepseek.personal.deepseek-api-key.global.deepseek-flash-max",
    "moonshot.personal.primary.global.kimi-k2.5",
    "local.llama-swap.lfm2.5-1.2b-instruct",
    "openai.subscription.primary.global.gpt-5",
  ];
  const selected = selectReplayCandidates({
    configuredEndpointIds: configured,
    sourceEndpointId: "deepseek.personal.deepseek-api-key.global.deepseek-flash-max",
  });
  expect(selected).toHaveLength(3);
  expect(selected).not.toContain("deepseek.personal.deepseek-api-key.global.deepseek-flash-max");
  expect(new Set(selected).size).toBe(selected.length);
  expect(
    selectReplayCandidates({
      configuredEndpointIds: configured,
      sourceEndpointId: null,
      cap: 2,
    }),
  ).toHaveLength(2);
  expect(
    selectReplayCandidates({
      configuredEndpointIds: ["only.endpoint"],
      sourceEndpointId: "only.endpoint",
    }),
  ).toEqual([]);
});

test("run97 tool policy defaults to recorded results and executes only when needed", async () => {
  const { resolveReplayToolPolicy } = await import("../src/track-b-replay-policy.js");
  expect(resolveReplayToolPolicy({ hasRecordedToolResults: true }).toolPolicy).toBe(
    "recorded_results_only",
  );
  expect(resolveReplayToolPolicy({ hasRecordedToolResults: false }).toolPolicy).toBe(
    "sandboxed_allowlist",
  );
  expect(
    resolveReplayToolPolicy({ hasRecordedToolResults: true, policyAllowsExecution: false })
      .toolPolicy,
  ).toBe("recorded_results_only");
});

test("run97 policy set records stable ids, versions, and digests", async () => {
  const { buildReplayPolicySet } = await import("../src/track-b-replay-policy.js");
  const first = buildReplayPolicySet();
  const second = buildReplayPolicySet();
  expect(first.policySetDigest).toBe(second.policySetDigest);
  expect(first.policySetVersion).toMatch(/^run97\.replay-policy-set\.v\d+$/);
  expect(first.trigger.policyId).toBeTruthy();
  expect(first.tool.policyId).toBeTruthy();
  expect(first.candidateSelection.policyId).toBeTruthy();
  expect(first.budget.policyId).toBeTruthy();
  const changed = buildReplayPolicySet({ candidateCap: 2 });
  expect(changed.policySetDigest).not.toBe(first.policySetDigest);
});

test("run97 guard: the removed replay restrictions cannot reappear in the host CLI", () => {
  const cli = readFileSync(path.join(sourceRoot, "cli.ts"), "utf8");
  expect(cli).not.toContain("supervised replay currently accepts only complete tool-free");
  expect(cli).not.toContain(
    "supervised replay candidate was not eligible in the frozen source decision",
  );
  expect(cli).not.toContain(
    "supervised replay source is missing its frozen eligible endpoint snapshot",
  );
  expect(cli).not.toContain('toolPolicy: "deny"');
});
