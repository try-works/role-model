import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  createEmptyOperatorIntent,
  persistOperatorIntent,
  readOperatorIntent,
  readOperatorIntentResult,
  removePeerLoad,
  removeRemoteActivation,
  resolveOperatorIntentPath,
  upsertLlamaSwapLoad,
  upsertPeerLoad,
  upsertRemoteActivation,
  validateOperatorIntent,
  writeOperatorIntent,
} from "./operator-intent.js";

describe("operator-intent", () => {
  it("validates schema version 1 with required collections", () => {
    const intent = validateOperatorIntent({
      schemaVersion: 1,
      updatedAt: "2026-06-08T00:00:00.000Z",
      remoteActivations: [],
      peerLoads: [],
      llamaSwapLoads: [],
    });

    expect(intent.schemaVersion).toBe(1);
    expect(intent.remoteActivations).toEqual([]);
  });

  it("rejects unsupported schema versions", () => {
    expect(() =>
      validateOperatorIntent({
        schemaVersion: 2,
        updatedAt: "2026-06-08T00:00:00.000Z",
        remoteActivations: [],
        peerLoads: [],
        llamaSwapLoads: [],
      }),
    ).toThrow(/schemaVersion/i);
  });

  it("writes and reads operator intent atomically", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "operator-intent-"));
    const location = { runtimeStateRoot, scopeId: "test-scope" };
    const intentPath = resolveOperatorIntentPath(location);

    try {
      writeOperatorIntent(location, createEmptyOperatorIntent());
      expect(existsSync(intentPath)).toBe(true);
      expect(readOperatorIntent(location)).toEqual(
        expect.objectContaining({
          schemaVersion: 1,
          remoteActivations: [],
          peerLoads: [],
          llamaSwapLoads: [],
        }),
      );
    } finally {
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  });

  it("upserts remote activations by endpoint id", () => {
    const base = createEmptyOperatorIntent();
    const withActivation = upsertRemoteActivation(base, {
      providerAccountId: "moonshot.personal.kimi-code",
      modelId: "moonshot/kimi-k2.6",
      region: "global",
      endpointId: "moonshot.personal.kimi-code.global.kimi-k2.6",
      modelRoleBindings: [{ modelId: "moonshot/kimi-k2.6", roleIds: ["general.chat"] }],
    });
    const replaced = upsertRemoteActivation(withActivation, {
      providerAccountId: "moonshot.personal.kimi-code",
      modelId: "moonshot/kimi-k2.6",
      region: "global",
      endpointId: "moonshot.personal.kimi-code.global.kimi-k2.6",
      modelRoleBindings: [{ modelId: "moonshot/kimi-k2.6", roleIds: ["tool.agent"] }],
    });

    expect(withActivation.remoteActivations).toHaveLength(1);
    expect(replaced.remoteActivations).toHaveLength(1);
    expect(replaced.remoteActivations[0]?.modelRoleBindings?.[0]?.roleIds).toEqual(["tool.agent"]);
  });

  it("tracks peer and llama-swap loads independently", () => {
    const base = createEmptyOperatorIntent();
    const withPeer = upsertPeerLoad(base, {
      peerId: "default",
      modelId: "lfm2.5-8b-a1b",
      roleIds: ["general.chat", "tool.agent"],
      autoReload: true,
    });
    const withBoth = upsertLlamaSwapLoad(withPeer, {
      modelId: "local-model",
      roleIds: ["general.chat"],
      autoReload: true,
    });

    expect(withBoth.peerLoads).toHaveLength(1);
    expect(withBoth.llamaSwapLoads).toHaveLength(1);
  });

  it("removes remote activations and peer loads", () => {
    const intent = upsertPeerLoad(
      upsertRemoteActivation(createEmptyOperatorIntent(), {
        providerAccountId: "moonshot.personal.kimi-code",
        modelId: "moonshot/kimi-k2.6",
        region: "global",
        endpointId: "moonshot.personal.kimi-code.global.kimi-k2.6",
      }),
      {
        peerId: "default",
        modelId: "lfm2.5-8b-a1b",
        roleIds: ["general.chat"],
        autoReload: true,
      },
    );

    const withoutRemote = removeRemoteActivation(intent, "moonshot.personal.kimi-code.global.kimi-k2.6");
    const withoutPeer = removePeerLoad(withoutRemote, "default", "lfm2.5-8b-a1b");

    expect(withoutRemote.remoteActivations).toHaveLength(0);
    expect(withoutPeer.peerLoads).toHaveLength(0);
  });

  it("returns corrupt diagnostics for invalid operator intent JSON", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "operator-intent-corrupt-"));
    const location = { runtimeStateRoot, scopeId: "corrupt-scope" };
    const intentPath = resolveOperatorIntentPath(location);

    try {
      mkdirSync(path.dirname(intentPath), { recursive: true });
      writeFileSync(intentPath, "{ invalid", "utf8");
      const readResult = readOperatorIntentResult(location);
      expect(readResult.intent).toBeNull();
      expect(readResult.diagnostic).toEqual({
        status: "corrupt",
        message: expect.any(String),
      });
      expect(() =>
        persistOperatorIntent(location, (current) => current),
      ).toThrow(/corrupt/i);
    } finally {
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  });

  it("persistOperatorIntent updates updatedAt and writes JSON", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "operator-intent-persist-"));
    const location = { runtimeStateRoot, scopeId: "persist-scope" };

    try {
      persistOperatorIntent(location, (current) =>
        upsertRemoteActivation(current, {
          providerAccountId: "moonshot.personal.kimi-code",
          modelId: "moonshot/kimi-k2.6",
          region: "global",
          endpointId: "moonshot.personal.kimi-code.global.kimi-k2.6",
        }),
      );

      const raw = JSON.parse(
        readFileSync(resolveOperatorIntentPath(location), "utf8"),
      ) as Record<string, unknown>;
      expect(raw.schemaVersion).toBe(1);
      expect(raw.updatedAt).toEqual(expect.any(String));
      expect(raw.remoteActivations).toEqual([
        expect.objectContaining({
          endpointId: "moonshot.personal.kimi-code.global.kimi-k2.6",
        }),
      ]);
    } finally {
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  });
});
