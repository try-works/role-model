import { expect, test } from "vitest";

import { buildReplayAppendExecution, resolveResumedReplayAppendDispatch } from "../src/cli.js";

/**
 * Run 104 Phase 3 (R8, the last strand source the run's census named): the durable branch-append
 * receipt gate strands resumed replays.
 *
 * Live `:3457`, frozen disposition store (`replay-disposition.sqlite`, `track-b/`), the only row in
 * the whole ledger with this class:
 *
 *   capture_ref  req-a29409df-11de-4660-9439-b8ee671f8f3b
 *   refusal_code replay_branch_append_unavailable
 *   detail       replay endpoint HTTP 409: {"error":"durable replay branch append has no host
 *                dispatch receipt"}
 *
 * Replay Core re-presents `append_recovery` when a previous attempt persisted the provider receipt
 * but not the branch. The host's recovery leg reads the replay's own route capture through the
 * private boundary (`POST /capture/read`) and rebuilds the execution identity from it — but the
 * projection the boundary returns publishes the bounded assistant text as **`responseText`**, the
 * field every other recovered-capture consumer in this package reads
 * (`track-b-replay-evaluation-criteria.ts`, `cli.ts` `responseText` fallbacks), while
 * `buildReplayAppendExecution` only ever accepted the **write-side** name `outputText`. The rebuilt
 * execution was therefore always `undefined`, the dispatch was never re-attached, and the append
 * refused — for a capture that was present and readable the whole time.
 *
 * The live ring proves the capture was readable: `retention_captures` holds
 * `replay-req-a29409df-11de-4660-9439-b8ee671f8f3b-84165abdc60fa3af` for that source capture.
 */
const RECOVERED_REPLAY_REQUEST_ID =
  "replay-req-a29409df-11de-4660-9439-b8ee671f8f3b-84165abdc60fa3af";

/**
 * Verbatim shape of `POST /capture/read` (`runtime-operations-server.mjs` `readRouteCapture`) — the
 * projection the recovery leg actually receives, not the write-side request it was authored against.
 */
function boundaryCaptureProjection(): Record<string, unknown> {
  return {
    schemaVersion: "role-model.route-capture-read.v2",
    requestId: RECOVERED_REPLAY_REQUEST_ID,
    routingDecisionId: `decision-${RECOVERED_REPLAY_REQUEST_ID}`,
    scope: "runtime:399ae69e18716735bfec8207ad95da45",
    endpointId: "deepseek.deepproxy.global.deepseek-flash-high",
    modelId: "deepseek/deepseek-flash",
    reasoningEffort: "high",
    effortSource: "variant",
    rootArtifactId: "artifact:recovered-root",
    rootArtifactDigest: "sha256:1",
    providerArtifactIds: ["artifact:provider"],
    messageArtifactIds: ["artifact:message"],
    ...{
      responseText: "the bounded provider output the durable capture recorded",
    },
    response: {
      nodeId: "artifact:response",
      role: "assistant",
      content: [{ type: "text", text: "the bounded provider output the durable capture recorded" }],
    },
    providers: [
      {
        nodeId: "artifact:provider",
        providerId: "deepseek",
        adapterFamily: "openai-compatible",
        statusCode: 200,
      },
    ],
    messages: [],
    subagents: [],
    tools: [],
    projectionCompleteness: "transcript_full",
    terminalState: "completed",
    capturedAt: "2026-10-01T07:14:21.000Z",
  };
}

function resumedAppendRecoveryRequest(): Record<string, unknown> {
  return {
    replayJobId: "replay-job-a29409df",
    scope: "runtime:399ae69e18716735bfec8207ad95da45",
    sourceGeneration: 1,
    candidateEndpointId: "deepseek.deepproxy.global.deepseek-flash-high",
    sourceDecisionId: "decision-req-a29409df",
    routerDecisionId: `decision-${RECOVERED_REPLAY_REQUEST_ID}`,
    providerResultRef: `route-capture:${RECOVERED_REPLAY_REQUEST_ID}`,
    dispatchReceiptId: `router-replay:${RECOVERED_REPLAY_REQUEST_ID}`,
  };
}

test("the durable read projection rebuilds the execution identity the recovery append needs", () => {
  const execution = buildReplayAppendExecution({
    capture: boundaryCaptureProjection(),
    routerDecisionId: `decision-${RECOVERED_REPLAY_REQUEST_ID}`,
    replayRequestId: RECOVERED_REPLAY_REQUEST_ID,
  });
  expect(execution).toMatchObject({
    routingDecisionId: `decision-${RECOVERED_REPLAY_REQUEST_ID}`,
    model: "deepseek/deepseek-flash",
    outputText: "the bounded provider output the durable capture recorded",
    vendorId: "deepseek",
    adapterFamily: "openai-compatible",
  });
});

test("a resumed append-recovery re-attaches to the durable capture instead of refusing", () => {
  const recovered = resolveResumedReplayAppendDispatch({
    branchRequest: resumedAppendRecoveryRequest(),
    capture: boundaryCaptureProjection(),
  });
  expect(recovered.replayRequestId).toBe(RECOVERED_REPLAY_REQUEST_ID);
  expect(recovered.execution).toMatchObject({
    model: "deepseek/deepseek-flash",
    outputText: "the bounded provider output the durable capture recorded",
  });
});

test("an append with no durable capture at all still refuses", () => {
  // The gate's protective purpose: a dispatch whose capture the boundary cannot answer for is not
  // re-attached. The refusal text is what `track-b-auto-replay.ts` classifies on, so it is pinned.
  expect(() =>
    resolveResumedReplayAppendDispatch({
      branchRequest: resumedAppendRecoveryRequest(),
      capture: null,
    }),
  ).toThrowError("durable replay branch append has no host dispatch receipt");
  expect(() =>
    resolveResumedReplayAppendDispatch({
      branchRequest: {
        ...resumedAppendRecoveryRequest(),
        providerResultRef: "artifact:provider:1",
      },
      capture: boundaryCaptureProjection(),
    }),
  ).toThrowError("durable replay branch append has no host dispatch receipt");
});

test("a recovery must not re-attach a branch to a different capture's evidence", () => {
  expect(
    buildReplayAppendExecution({
      capture: {
        ...boundaryCaptureProjection(),
        requestId: "replay-req-someone-else-0000000000000000",
      },
      routerDecisionId: `decision-${RECOVERED_REPLAY_REQUEST_ID}`,
      replayRequestId: RECOVERED_REPLAY_REQUEST_ID,
    }),
  ).toBeUndefined();
  expect(() =>
    resolveResumedReplayAppendDispatch({
      branchRequest: resumedAppendRecoveryRequest(),
      capture: {
        ...boundaryCaptureProjection(),
        requestId: "replay-req-someone-else-0000000000000000",
      },
    }),
  ).toThrowError("durable replay branch append has no host dispatch receipt");
});

test("a resumed recovery re-runs idempotently from the same durable capture", () => {
  const first = resolveResumedReplayAppendDispatch({
    branchRequest: resumedAppendRecoveryRequest(),
    capture: boundaryCaptureProjection(),
  });
  const second = resolveResumedReplayAppendDispatch({
    branchRequest: resumedAppendRecoveryRequest(),
    capture: boundaryCaptureProjection(),
  });
  // The rebuilt dispatch names the same replay request id, so the branch capture id it derives
  // (`<replayRequestId>-branch`) is the same on every pass: one branch, not one per retry.
  expect(second.replayRequestId).toBe(first.replayRequestId);
  expect(second.execution).toEqual(first.execution);
});
