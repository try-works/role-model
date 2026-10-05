import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { expect, test } from "vitest";

import {
  createProductionReplayAdapter,
  resolveProductionReplayAuthorizationNonceStorePath,
} from "../src/cli.js";
import type { createRouterReplayAdapter } from "../src/track-b-runtime.js";

const channel = "development";
const scope = "run96-nonce-durability";
const authorizationEpoch = 96;
const authorizationSecret = "run96-replay-nonce-durability-secret";

function envelope(nonce = "run96-dispatch-nonce") {
  return {
    schemaVersion: "role-model.replay-dispatch.v1",
    channel,
    scope,
    replayJobId: "replay:nonce-durability",
    sourceGeneration: 1,
    sourceDecisionId: "decision:nonce-durability",
    normalizedRequestRef: "artifact:request:nonce-durability",
    candidateEndpointId: "endpoint:nonce-durability",
    dispatchIdempotencyKey: "a".repeat(64),
    candidatePackage: {
      endpointId: "endpoint:nonce-durability",
      modelId: "model:nonce-durability",
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

function adapter(
  runtimeStateRoot: string,
  dispatches: { count: number },
  dispatchImpl?: (request: Record<string, unknown>) => Promise<Record<string, unknown>>,
) {
  const options = {
    channel,
    scope,
    authorizationEpoch,
    authorizationSecret,
    dispatch:
      dispatchImpl ??
      (async () => {
        dispatches.count += 1;
        return {
          dispatchReceiptId: "dispatch:nonce-durability",
          routerDecisionId: "decision:nonce-durability",
          providerResultRef: "artifact:provider-result:nonce-durability",
          observedCostMicros: 0,
          observedResponseBytes: 0,
        };
      }),
  } as unknown as Parameters<typeof createRouterReplayAdapter>[0];
  return createProductionReplayAdapter({
    ...options,
    runtimeStateRoot,
    scopeId: scope,
  });
}

test("Run96 replay adapter nonce consumption survives a public-host restart", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "run96-replay-nonce-durability-"));
  try {
    const dispatches = { count: 0 };
    const first = adapter(root, dispatches);
    const firstEnvelope = envelope();
    const authorization = await first.authorize({ envelope: firstEnvelope });
    expect(
      (await first.verifyAuthorization({ envelope: firstEnvelope, authorization })).verified,
    ).toBe(true);
    await first.dispatch(firstEnvelope, { authorization });
    expect(dispatches.count).toBe(1);
    expect(
      existsSync(
        resolveProductionReplayAuthorizationNonceStorePath({
          runtimeStateRoot: root,
          scopeId: scope,
        }),
      ),
    ).toBe(true);

    // Run 98 addendum 58 §21: the nonce stays single-use per *dispatch identity*; a restart that
    // re-presents the same prepared envelope is answered by the durable ledger with the stored
    // receipt, so the provider dispatch happens exactly once across both hosts.
    const restarted = adapter(root, dispatches);
    const resumed = await restarted.authorize({ envelope: firstEnvelope });
    await expect(
      restarted.dispatch(firstEnvelope, { authorization: resumed }),
    ).resolves.toMatchObject({ dispatchReceiptId: "dispatch:nonce-durability" });
    expect(dispatches.count).toBe(1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("Run96 F190: a completed dispatch is returned from the durable ledger after restart", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "run96-replay-dispatch-ledger-"));
  try {
    const dispatches = { count: 0 };
    const first = adapter(root, dispatches);
    const firstEnvelope = envelope("run96-f190-complete");
    const firstAuthorization = await first.authorize({ envelope: firstEnvelope });
    const firstReceipt = await first.dispatch(firstEnvelope, {
      authorization: firstAuthorization,
    });
    expect(dispatches.count).toBe(1);

    const restarted = adapter(root, dispatches);
    const restartedEnvelope = envelope("run96-f190-complete-restart");
    const restartedAuthorization = await restarted.authorize({
      envelope: restartedEnvelope,
    });
    await expect(
      restarted.dispatch(restartedEnvelope, { authorization: restartedAuthorization }),
    ).resolves.toEqual(firstReceipt);
    expect(dispatches.count).toBe(1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("Run96 F190: an indeterminate restart cannot repeat a provider dispatch", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "run96-replay-dispatch-indeterminate-"));
  try {
    const dispatches = { count: 0 };
    const crashAfterProvider = async () => {
      dispatches.count += 1;
      throw new Error("provider connection dropped after dispatch");
    };
    const first = adapter(root, dispatches, crashAfterProvider);
    const firstEnvelope = envelope("run96-f190-crash");
    const firstAuthorization = await first.authorize({ envelope: firstEnvelope });
    await expect(
      first.dispatch(firstEnvelope, { authorization: firstAuthorization }),
    ).rejects.toThrow(/provider connection dropped/i);
    expect(dispatches.count).toBe(1);

    const restarted = adapter(root, dispatches, async () => {
      dispatches.count += 1;
      return {
        dispatchReceiptId: "dispatch:must-not-run",
        routerDecisionId: "decision:must-not-run",
        providerResultRef: "artifact:provider-result:must-not-run",
        observedCostMicros: 0,
        observedResponseBytes: 0,
      };
    });
    const restartedEnvelope = envelope("run96-f190-crash-restart");
    const restartedAuthorization = await restarted.authorize({
      envelope: restartedEnvelope,
    });
    await expect(
      restarted.dispatch(restartedEnvelope, { authorization: restartedAuthorization }),
    ).rejects.toThrow(/indeterminate|in-flight/i);
    expect(dispatches.count).toBe(1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("Run96 production replay nonce path keeps hostile scope IDs beneath runtime state", () => {
  const root = mkdtempSync(path.join(tmpdir(), "run96-replay-nonce-path-"));
  try {
    const hostileScope = "..\\..\\outside-replay-scope";
    const first = resolveProductionReplayAuthorizationNonceStorePath({
      runtimeStateRoot: root,
      scopeId: hostileScope,
    });
    const second = resolveProductionReplayAuthorizationNonceStorePath({
      runtimeStateRoot: root,
      scopeId: hostileScope,
    });
    expect(first).toBe(second);
    const relative = path.relative(root, first);
    expect(relative).not.toMatch(/^\.\.(?:[\\/]|$)|^[A-Za-z]:/u);
    expect(relative).toMatch(
      /^scopes[\\/]sha256-[a-f0-9]{64}[\\/]track-b[\\/]replay-authorization-nonces\.json$/u,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
