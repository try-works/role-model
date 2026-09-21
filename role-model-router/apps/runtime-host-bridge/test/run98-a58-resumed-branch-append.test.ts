import { expect, test } from "vitest";

import { buildReplayAppendExecution, replayRequestIdFromProviderResultRef } from "../src/cli.js";

/**
 * Run 98 addendum 58 §23 (live v316, 2026-09-21 08:33Z):
 *
 *   `replay endpoint HTTP 409: {"error":"durable replay branch append has no host dispatch receipt"}`
 *
 * Replay Core answers `replay:prepare-dispatch` with `append_recovery` when a previous attempt already
 * burned the authorization nonce and persisted the provider receipt but never appended the branch. On
 * that resume the host's in-process dispatch map is empty by construction — the production adapter
 * answers the re-presented dispatch from the durable ledger — so the branch append threw instead of
 * finishing the work the receipt already paid for.
 *
 * The recovery request Replay Core re-presents (`#branchAppendRequest`) carries the durable identity the
 * host needs: `routerDecisionId` and `providerResultRef`, where the provider result ref names the
 * replay's own route capture (`route-capture:<replayRequestId>`). The append therefore recovers the
 * provider execution from the durable capture instead of demanding an in-process dispatch.
 */
test("a provider result ref names the replay request the append must recover", () => {
  expect(replayRequestIdFromProviderResultRef("route-capture:replay-req-1-abcdef")).toBe(
    "replay-req-1-abcdef",
  );
  // Anything that does not name a replay route capture is not a recovery source.
  expect(replayRequestIdFromProviderResultRef("artifact:provider-result:1")).toBeUndefined();
  expect(replayRequestIdFromProviderResultRef("route-capture:")).toBeUndefined();
  expect(replayRequestIdFromProviderResultRef(undefined)).toBeUndefined();
});

test("the recovered capture rebuilds the execution identity the branch append needs", () => {
  const execution = buildReplayAppendExecution({
    capture: {
      schemaVersion: "role-model.route-capture-read.v2",
      requestId: "replay-req-1-abcdef",
      routingDecisionId: "decision:recovered",
      modelId: "deepseek/deepseek-flash",
      outputText: "recovered provider output",
    },
    routerDecisionId: "decision:recovered",
  });
  expect(execution).toMatchObject({
    routingDecisionId: "decision:recovered",
    model: "deepseek/deepseek-flash",
    outputText: "recovered provider output",
  });
});

test("a capture that carries no provider output is not a recovery source", () => {
  expect(
    buildReplayAppendExecution({
      capture: { requestId: "replay-req-1-abcdef", modelId: "deepseek/deepseek-flash" },
      routerDecisionId: "decision:recovered",
    }),
  ).toBeUndefined();
  expect(
    buildReplayAppendExecution({ capture: null, routerDecisionId: "decision:recovered" }),
  ).toBe(undefined);
});
