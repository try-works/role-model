import { expect, test } from "vitest";

import {
  claimExecutionCircuitProbe,
  classifyExecutionFailureCategory,
  createEmptyExecutionCircuitState,
  evaluateExecutionCircuitEligibility,
  recordExecutionCircuitFailure,
  settleExecutionCircuitProbe,
} from "../src/execution-circuit-breaker.js";
import { classifyUpstreamExecutionFailure } from "../src/index.js";

/**
 * Run 101 addendum 45 - a provider saying "this model is not available to this account" is not a
 * malformed request, and it must not reach the caller as a 400.
 *
 * Measured live on `:3457`: four alias requests produced a byte-identical body (SHA256 `4148df54…`):
 *
 *   HTTP 400  endpointId: openai.personal.openai-codex-subscription.global.gpt-5.4
 *   {"error":{"type":"invalid_request","code":"invalid_request","retryable":false,
 *             "fallbackEligible":false,"errorPreview":{"statusCode":400},
 *             "upstreamBody":{"detail":"The 'gpt-5.4' model is not supported when using Codex with a
 *                             ChatGPT account."}}}
 *
 * Telemetry for that endpoint reads **19 requests, 19 failures, 0 successes** (10 live alias requests and
 * 9 `replay-req-*` dispatches), and the failure row shows a second eligible candidate existed and was never
 * tried (`candidateCount: 2`, `eligibleModelIds: [chatgpt/gpt-5.4, chatgpt/gpt-5.6-sol]`, `rerouteCount: 0`).
 *
 * The classifier already holds the body: `searchText` folds in `JSON.stringify(input.body)`. What it did
 * with it was fall through to the status-only 400 branch, which marks every 400 `fallbackEligible: false`.
 * For a genuinely malformed request that is right - rerouting a bad payload wastes a second call. For an
 * entitlement rejection it is wrong: the request is fine, this endpoint simply cannot serve the model, and
 * another candidate can.
 */

const ENTITLEMENT_400 = {
  statusCode: 400,
  endpointId: "openai.personal.openai-codex-subscription.global.gpt-5.4",
  body: {
    error: {
      message: "Provider request failed with HTTP 400.",
      type: "invalid_request",
      code: "invalid_request",
    },
    detail: "The 'gpt-5.4' model is not supported when using Codex with a ChatGPT account.",
  },
} as const;

test("run101 an entitlement rejection is its own class and is fallback-eligible", () => {
  const failure = classifyUpstreamExecutionFailure(ENTITLEMENT_400 as never);

  expect(failure.errorClass).toBe("model_unavailable");
  expect(failure.fallbackEligible).toBe(true);
  // Still not retryable on the *same* endpoint: the entitlement does not change between two attempts.
  expect(failure.retryable).toBe(false);
});

test("run101 a genuinely malformed 400 keeps the old classification", () => {
  const failure = classifyUpstreamExecutionFailure({
    statusCode: 400,
    endpointId: "openai.personal.primary.us-east-1.fast",
    body: { error: { message: "Invalid value for 'temperature'.", type: "invalid_request" } },
  } as never);

  // The control matters more than the new case: rerouting a bad payload would waste a second call and
  // hide a caller defect.
  expect(failure.errorClass).toBe("invalid_request");
  expect(failure.fallbackEligible).toBe(false);
});

test("run101 the entitlement class has a durable circuit category so the pair is skipped", () => {
  // Without a category, `recordExecutionCircuitFailure` returns the state unchanged
  // (execution-circuit-breaker.ts:387-392), so the endpoint stays healthy and keeps being selected -
  // which is how one dead pair absorbed 19 requests.
  expect(classifyExecutionFailureCategory("model_unavailable", 400)).toBe("model_unavailable");
  // And the neighbouring categories are untouched.
  expect(classifyExecutionFailureCategory("invalid_request", 400)).toBeUndefined();
  expect(classifyExecutionFailureCategory("provider_auth_error", 401)).toBe("auth");
  expect(classifyExecutionFailureCategory("upstream_error", 503)).toBe("provider_5xx");
});

test("run101 the entitlement cooldown opens long, escalates, and self-clears on a successful probe", () => {
  const endpointId = "openai.personal.openai-codex-subscription.global.gpt-5.4";
  const failureAt = (state: ReturnType<typeof createEmptyExecutionCircuitState>, nowMs: number) =>
    recordExecutionCircuitFailure({
      state,
      endpointId,
      errorClass: "model_unavailable",
      nowMs,
      trafficClass: "live",
      statusCode: 400,
    });

  // 300 s on the first sighting: an entitlement is a plan fact, not a transient blip, so the pair is
  // skipped for longer than a transport failure from the very first observation. It used to get no
  // record at all, which is how one dead pair absorbed 19 requests.
  const first = failureAt(createEmptyExecutionCircuitState(), 1_000_000);
  expect(first.record?.circuitState).toBe("open");
  expect(first.record?.failureCategory).toBe("model_unavailable");
  expect(first.record?.nextProbeAtMs).toBe(1_000_000 + 300_000);

  // Within the 5-minute sequence window (EXECUTION_CIRCUIT_RESET_AFTER_MS) a second failure escalates -
  // 30 min - and the third saturates the ladder at 2 h. The ladder must not be clamped by the 5-minute
  // rate-limit ceiling that the old fall-through branch would have applied.
  const second = failureAt(first.state, 1_000_000 + 299_999);
  expect(second.record?.failureCount).toBe(2);
  expect(second.record?.nextProbeAtMs).toBe(1_000_000 + 299_999 + 1_800_000);

  const third = failureAt(second.state, 1_000_000 + 299_999 + 299_999);
  expect(third.record?.failureCount).toBe(3);
  expect(third.record?.nextProbeAtMs).toBe(1_000_000 + 599_998 + 7_200_000);

  // Bounded: a fourth failure inside the window repeats the ceiling rather than growing without limit.
  const fourth = failureAt(third.state, 1_000_000 + 599_998 + 299_999);
  expect(fourth.record?.failureCount).toBe(4);
  expect(fourth.record?.nextProbeAtMs).toBe(1_000_000 + 899_997 + 7_200_000);

  // The record is not a permanent ban: once `nextProbeAtMs` passes, the next request is required to be a
  // probe, and a probe that succeeds removes the record entirely - so an account that later gains the
  // model recovers by itself.
  const probeAtMs = fourth.record?.nextProbeAtMs as number;
  const beforeProbe = evaluateExecutionCircuitEligibility(fourth.state, endpointId, probeAtMs - 1);
  expect(beforeProbe).toEqual({ eligible: false, probeRequired: false });

  const probation = evaluateExecutionCircuitEligibility(fourth.state, endpointId, probeAtMs);
  expect(probation).toEqual({ eligible: true, probeRequired: true });

  const claimed = claimExecutionCircuitProbe({
    state: fourth.state,
    endpointId,
    nowMs: probeAtMs,
    probeOwnerId: "addendum45-test",
  });
  expect(claimed.claimed).toBe(true);
  expect(claimed.state.endpoints[endpointId]?.circuitState).toBe("half_open");

  const settled = settleExecutionCircuitProbe({
    state: claimed.state,
    endpointId,
    probeOwnerId: "addendum45-test",
    nowMs: probeAtMs + 100,
    result: { outcome: "success" },
  });
  expect(settled.settled).toBe(true);
  expect(settled.state.endpoints[endpointId]).toBeUndefined();
});
