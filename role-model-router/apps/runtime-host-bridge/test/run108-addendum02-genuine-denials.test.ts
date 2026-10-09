import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import type {
  EndpointCandidate,
  RouteRequestInput,
  RouterDecisionRecord,
  RoutingRequest,
} from "@role-model-router/core";
import { routeRequest } from "@role-model-router/core";
import { expect, test } from "vitest";

import { runAutoReplayTick } from "../src/track-b-auto-replay.js";
import { createReplayLedger } from "../src/track-b-replay-ledger.js";
import { buildReplayPolicySet } from "../src/track-b-replay-policy.js";

/**
 * Run 108 addendum-02, mandated test (2): GENUINE denials must still deny.
 *
 * The defect was that a live capture planned ONE counterfactual arm, so the promotion floor was
 * unreachable. The fix widens the PLAN (the tick's candidate pool) back to the configured pool under the
 * operator's `maxCounterfactualArms` bound - it does not touch the policy snapshot, the allow list, the
 * floor, or the acceptance scope. This file pins the half of that contract that a careless fix would
 * break: every denial the router owns must still deny.
 *
 * The assertions run against the router's OWN rule (`packages/core/src/router.ts`), which is the single
 * authority that turns a denied arm into `POLICY_DENY_ENDPOINT` at :1661-1678, `PROVIDER_OFFLINE` /
 * `REVOKED` at :1652-1657, and `POLICY_DENY_REMOTE` at :1679-1681.
 */

function candidate(
  endpointId: string,
  providerKind: EndpointCandidate["identity"]["provider_kind"] = "remote_openai_compat",
  overrides: Partial<EndpointCandidate> = {},
): EndpointCandidate {
  return {
    identity: {
      endpoint_id: endpointId,
      endpoint_kind: "remote_api",
      provider_kind: providerKind,
      serving_source: "remote-service",
      model_id: endpointId,
      runtime_version: "1",
      region: "global",
    },
    declared: {
      endpoint_id: endpointId,
      capabilities: ["text.chat"],
      modalities: ["text"],
      max_context_tokens: 100_000,
      tool_calling: { supported: false, style: "openai" },
      supports_embeddings: false,
    },
    status: "active",
    ...overrides,
  };
}

const baseRequest: RoutingRequest = {
  requestId: "run108-addendum02-denials",
  taskType: "text.chat",
  requiredCapabilities: [],
  preferredCapabilities: [],
  requiredModalities: ["text"],
  contextTokens: 1000,
  needsTools: false,
  strategy: "balanced",
  preferLocal: false,
};

function route(
  request: Partial<RoutingRequest>,
  candidates: readonly EndpointCandidate[],
): RouterDecisionRecord {
  const input: RouteRequestInput = {
    request: { ...baseRequest, ...request },
    candidates: [...candidates],
    roleDefinitions: [],
    taskDefinitions: [],
  };
  return routeRequest(input);
}

/**
 * The same bounded read the production probe uses (`packages/protocol-routing/src/index.ts:361-400`):
 * `CandidateEligibility` carries its verdict as `exclusions: CandidateExclusion[]`, each with a `code`.
 */
function denialCodes(decision: RouterDecisionRecord, endpointId: string): string[] {
  const entry = decision.eligibility.find((item) => item.endpoint_id === endpointId) as
    | { readonly exclusions?: readonly { readonly code?: unknown }[] }
    | undefined;
  return (entry?.exclusions ?? [])
    .map((exclusion) => exclusion?.code)
    .filter((code): code is string => typeof code === "string");
}

function isEligible(decision: RouterDecisionRecord, endpointId: string): boolean {
  return decision.eligibility.find((item) => item.endpoint_id === endpointId)?.eligible === true;
}

const OPENAI = candidate("deepseek.flash");
const MOONSHOT = candidate("moonshot.kimi-k3");
const CLI_ADAPTER = candidate("local.cli-adapter", "cli");
const LOCAL = candidate("local.engine", "gguf", {
  identity: {
    endpoint_id: "local.engine",
    endpoint_kind: "local_engine",
    provider_kind: "gguf",
    serving_source: "local-process",
    model_id: "local.engine",
    runtime_version: "1",
    region: "local",
  },
});

test("Run108 addendum-02: a deny_endpoints rule still denies the arm", () => {
  const decision = route({ denyEndpoints: [MOONSHOT.identity.endpoint_id] }, [
    OPENAI,
    MOONSHOT,
    CLI_ADAPTER,
  ]);
  expect(denialCodes(decision, MOONSHOT.identity.endpoint_id)).toContain("POLICY_DENY_ENDPOINT");
  expect(isEligible(decision, MOONSHOT.identity.endpoint_id)).toBe(false);
  // The rule is per-endpoint, so the arm the operator did not deny stays eligible: the fix widens the
  // PLAN, never the operator's denials.
  expect(isEligible(decision, OPENAI.identity.endpoint_id)).toBe(true);
});

test("Run108 addendum-02: deny_provider_kinds and allow_provider_kinds still deny the arm", () => {
  const denied = route({ denyProviderKinds: [CLI_ADAPTER.identity.provider_kind] }, [
    OPENAI,
    CLI_ADAPTER,
  ]);
  expect(denialCodes(denied, CLI_ADAPTER.identity.endpoint_id)).toContain("POLICY_DENY_ENDPOINT");
  expect(isEligible(denied, CLI_ADAPTER.identity.endpoint_id)).toBe(false);

  const notAllowed = route({ allowProviderKinds: [OPENAI.identity.provider_kind] }, [
    OPENAI,
    CLI_ADAPTER,
  ]);
  expect(denialCodes(notAllowed, CLI_ADAPTER.identity.endpoint_id)).toContain(
    "POLICY_DENY_ENDPOINT",
  );
  expect(isEligible(notAllowed, CLI_ADAPTER.identity.endpoint_id)).toBe(false);
  expect(isEligible(notAllowed, OPENAI.identity.endpoint_id)).toBe(true);
});

test("Run108 addendum-02: offline, revoked and providerUnavailable arms still deny", () => {
  const offline = candidate("endpoint.offline", "remote_openai_compat", { status: "offline" });
  const revoked = candidate("endpoint.revoked", "remote_openai_compat", { status: "revoked" });
  const unavailable = candidate("endpoint.unavailable", "remote_openai_compat", {
    runtimeEligibility: { providerUnavailable: true },
  });
  const decision = route({}, [OPENAI, offline, revoked, unavailable]);
  expect(denialCodes(decision, offline.identity.endpoint_id)).toContain("PROVIDER_OFFLINE");
  expect(denialCodes(decision, revoked.identity.endpoint_id)).toContain("REVOKED");
  expect(denialCodes(decision, unavailable.identity.endpoint_id)).toContain("PROVIDER_OFFLINE");
  expect(isEligible(decision, OPENAI.identity.endpoint_id)).toBe(true);
});

test("Run108 addendum-02: the privacy rule still keeps remote arms out of a local-only request", () => {
  const decision = route({ denyRemote: true }, [OPENAI, LOCAL]);
  expect(denialCodes(decision, OPENAI.identity.endpoint_id)).toContain("POLICY_DENY_REMOTE");
  expect(isEligible(decision, OPENAI.identity.endpoint_id)).toBe(false);
  expect(isEligible(decision, LOCAL.identity.endpoint_id)).toBe(true);
});

test("Run108 addendum-02: a policy-denied arm is denied even when nothing else excludes it", () => {
  const flagged = candidate("endpoint.denied-by-policy", "remote_openai_compat", {
    deniedByPolicy: true,
  });
  const decision = route({}, [OPENAI, flagged]);
  expect(denialCodes(decision, flagged.identity.endpoint_id)).toContain("POLICY_DENY_ENDPOINT");
  expect(isEligible(decision, flagged.identity.endpoint_id)).toBe(false);
});

test("Run108 addendum-02: the widened focus plan still drops an arm the runtime cannot dispatch to", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "run108-a02-denials-"));
  try {
    const ledger = createReplayLedger({ filePath: path.join(dir, "ledger.json") });
    const livePool = [
      "deepseek.personal.deepseek-api-key.global.deepseek-flash",
      "deepseek.personal.deepseek-api-key.global.deepseek-flash-low",
      "deepseek.personal.deepseek-api-key.global.deepseek-v4-pro",
      "deepseek.personal.deepseek-api-key.global.deepseek-v4-pro-high",
      "moonshot.personal.kimi-code.global.kimi-k3",
      "moonshot.personal.kimi-code.global.kimi-k3-max",
    ] as const;
    const judge = livePool[0] as string;
    const source = livePool[2] as string;
    const focus = livePool[5] as string;
    // The runtime reports every configured endpoint as dispatchable except this one (offline / revoked /
    // credential-less): a genuine denial that the widened plan must not re-admit.
    const unreachable = livePool[1] as string;
    let planned: readonly string[] = [];
    await runAutoReplayTick({
      captures: [
        {
          captureRef: "req-108-a02-denials",
          sourceEndpointId: source,
          hasRecordedToolResults: true,
        },
      ],
      configuredEndpointIds: livePool,
      healthyEndpointIds: livePool.filter((endpointId) => endpointId !== unreachable),
      judgeEndpointId: judge,
      focusCandidateEndpointId: focus,
      focusCaptureRef: "req-108-a02-denials",
      maxCounterfactualArms: 4,
      ledger,
      policySet: buildReplayPolicySet(),
      executor: async ({ candidates }) => {
        planned = candidates;
        return {
          terminal: true,
          branches: candidates.map((endpointId) => ({ endpointId, outcome: "complete" as const })),
        };
      },
    });

    expect(planned[0]).toBe(focus);
    expect(planned).not.toContain(unreachable);
    expect(planned).not.toContain(source);
    expect(planned).not.toContain(judge);
    // The plan is still bounded: six configured, minus the source, the judge and the unreachable arm.
    expect(planned.length).toBe(3);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
