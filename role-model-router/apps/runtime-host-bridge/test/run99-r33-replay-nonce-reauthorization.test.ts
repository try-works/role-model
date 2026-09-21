import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  createProductionReplayAdapter,
  resolveProductionReplayAuthorizationNonceStorePath,
} from "../src/cli.js";
import type { createRouterReplayAdapter } from "../src/track-b-runtime.js";

/**
 * Run 99 R33 live finding (stage v155/:3457, real DeepSeek-Harness captures).
 *
 * Five real coding-agent captures were replayed as counterfactuals. Every job completed its first
 * candidate, then wedged on the next one: the host consumed the adapter authorization nonce, the
 * provider dispatch failed (`fetch failed` / `private Track B operation timed out after 120000ms`),
 * and the failure receipt could not be recorded because that path needs the same saturated graph
 * append. The durable dispatch therefore stayed `dispatching`, `prepareDispatch` correctly resumed
 * the *same* prepared envelope (nonce included), and the nonce owner refused it as a replay:
 *
 *   `replay endpoint HTTP 409: {"error":"replayed replay adapter authorization nonce"}`
 *
 * The capture then burned its deferral budget and was refused, so nothing reached evaluation or the
 * learner — the exact end-to-end verification the family-scoping addenda need on real traffic.
 *
 * The nonce stays single-use per *dispatch identity*: a re-presentation is only honored for the same
 * `dispatchIdempotencyKey`, and only while that identity has no completed dispatch receipt. The
 * dispatch ledger keeps owning "did the provider work happen", so a captured authorization still
 * cannot authorize different work and an indeterminate restart still cannot repeat a provider call.
 */

const channel = "development";
const scope = "run99-nonce-reauthorization";
const authorizationEpoch = 99;
const authorizationSecret = "run99-nonce-reauthorization-secret";
const dispatchIdempotencyKey = "a".repeat(64);
const otherDispatchIdempotencyKey = "b".repeat(64);

function envelope(nonce: string, key = dispatchIdempotencyKey) {
  return {
    schemaVersion: "role-model.replay-dispatch.v1",
    channel,
    scope,
    replayJobId: "replay:nonce-reauthorization",
    sourceGeneration: 1,
    sourceDecisionId: "decision:nonce-reauthorization",
    normalizedRequestRef: "artifact:request:nonce-reauthorization",
    candidateEndpointId: "endpoint:nonce-reauthorization",
    dispatchIdempotencyKey: key,
    candidatePackage: {
      endpointId: "endpoint:nonce-reauthorization",
      modelId: "model:nonce-reauthorization",
      reasoningEffort: null,
      promptAdapterId: "prompt:stable-v1",
      toolPolicy: "deny",
      experiencePackId: "experience:none",
      samplingProfileId: "sampling:stable-v1",
    },
    budget: {
      maxCandidates: 1,
      maxProviderCalls: 1,
      maxCostMicros: 5_000,
      maxBytes: 16_384,
      deadlineMs: 10_000,
    },
    toolPolicy: "deny",
    authorizationEpoch,
    nonce,
    capability: "replay:provider-dispatch",
  } satisfies Record<string, unknown>;
}

const receipt = () => ({
  dispatchReceiptId: "dispatch:nonce-reauthorization",
  routerDecisionId: "decision:nonce-reauthorization",
  providerResultRef: "artifact:provider-result:nonce-reauthorization",
  observedCostMicros: 0,
  observedResponseBytes: 0,
});

type DispatchImpl = (request: Record<string, unknown>) => Promise<Record<string, unknown>>;

function adapter(runtimeStateRoot: string, dispatchImpl: DispatchImpl) {
  return createProductionReplayAdapter({
    channel,
    scope,
    authorizationEpoch,
    authorizationSecret,
    runtimeStateRoot,
    scopeId: scope,
    dispatch: dispatchImpl,
  } as unknown as Parameters<typeof createRouterReplayAdapter>[0] & {
    readonly runtimeStateRoot: string;
    readonly scopeId: string;
  });
}

function withRoot(run: (root: string) => Promise<void>): Promise<void> {
  const root = mkdtempSync(path.join(tmpdir(), "run99-replay-nonce-reauthorization-"));
  return run(root).finally(() => rmSync(root, { recursive: true, force: true }));
}

describe("run99 R33 replay authorization nonce re-authorization", () => {
  it("re-authorizes a dispatch whose provider attempt failed without a receipt", async () => {
    await withRoot(async (root) => {
      let dispatches = 0;
      const live = adapter(root, async () => {
        dispatches += 1;
        if (dispatches === 1) throw new Error("provider connection dropped after dispatch");
        return receipt();
      });
      const attempt = envelope("run99-nonce-retry");
      const authorization = await live.authorize({ envelope: attempt });
      await expect(live.dispatch(attempt, { authorization })).rejects.toThrow(/dropped/i);
      expect(dispatches).toBe(1);

      // The producer resumes the same prepared envelope; the nonce is the same, the dispatch identity
      // is the same, and no receipt was ever recorded, so the retry must be authorized.
      const retryAuthorization = await live.authorize({ envelope: attempt });
      await expect(
        live.dispatch(attempt, { authorization: retryAuthorization }),
      ).resolves.toMatchObject({
        dispatchReceiptId: "dispatch:nonce-reauthorization",
      });
      expect(dispatches).toBe(2);
    });
  });

  it("still refuses a re-authorization for a dispatch that already completed", async () => {
    await withRoot(async (root) => {
      const completed = adapter(root, async () => receipt());
      const attempt = envelope("run99-nonce-completed");
      const authorization = await completed.authorize({ envelope: attempt });
      await expect(completed.dispatch(attempt, { authorization })).resolves.toMatchObject({
        dispatchReceiptId: "dispatch:nonce-reauthorization",
      });

      const restarted = adapter(root, async () => receipt());
      await expect(restarted.authorize({ envelope: attempt })).rejects.toThrow(/nonce/i);
    });
  });

  it("refuses to lend one dispatch's nonce to a different dispatch", async () => {
    await withRoot(async (root) => {
      const live = adapter(root, async () => {
        throw new Error("provider connection dropped after dispatch");
      });
      const attempt = envelope("run99-nonce-foreign");
      const authorization = await live.authorize({ envelope: attempt });
      await expect(live.dispatch(attempt, { authorization })).rejects.toThrow(/dropped/i);

      await expect(
        live.authorize({ envelope: envelope("run99-nonce-foreign", otherDispatchIdempotencyKey) }),
      ).rejects.toThrow(/nonce/i);
      const persisted = JSON.parse(
        readFileSync(
          resolveProductionReplayAuthorizationNonceStorePath({
            runtimeStateRoot: root,
            scopeId: scope,
          }),
          "utf8",
        ),
      ) as { readonly bindings?: Record<string, string> };
      expect(persisted.bindings?.["run99-nonce-foreign"]).toBe(dispatchIdempotencyKey);
    });
  });

  it("keeps the re-authorized dispatch idempotent across a host restart", async () => {
    await withRoot(async (root) => {
      let dispatches = 0;
      const failing = adapter(root, async () => {
        dispatches += 1;
        throw new Error("provider connection dropped after dispatch");
      });
      const attempt = envelope("run99-nonce-restart");
      const authorization = await failing.authorize({ envelope: attempt });
      await expect(failing.dispatch(attempt, { authorization })).rejects.toThrow(/dropped/i);
      expect(dispatches).toBe(1);

      const restarted = adapter(root, async () => {
        dispatches += 1;
        return receipt();
      });
      const resumed = await restarted.authorize({ envelope: attempt });
      await expect(restarted.dispatch(attempt, { authorization: resumed })).rejects.toThrow(
        /indeterminate/i,
      );
      expect(dispatches).toBe(1);
    });
  });
});
