import { createHash } from "node:crypto";
import { mkdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, test, vi } from "vitest";

import { createTrackBOperations } from "../src/track-b-operations.js";
import * as trackBRuntime from "../src/track-b-runtime.js";

const repoRoot = path.resolve(import.meta.dirname, "..", "..", "..", "..");
const fixtureModule = path.join(
  import.meta.dirname,
  "fixtures",
  "recursive-87-synthetic-extension.mjs",
);
const roots: string[] = [];
const runtimes: Array<{ close(): Promise<void> }> = [];

afterEach(async () => {
  await Promise.allSettled(runtimes.splice(0).map((runtime) => runtime.close()));
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function syntheticExtensions(count: number) {
  const bytes = await readFile(fixtureModule);
  const artifactSha256 = createHash("sha256").update(bytes).digest("hex");
  return Array.from({ length: count }, (_, index) => ({
    descriptor: {
      id:
        index === 13
          ? "synthetic-future-extension"
          : `canonical-${String(index + 1).padStart(2, "0")}`,
      protocolVersion: "1.1.0",
      capabilities: ["health:probe", "fixture:echo"],
    },
    modulePath: fixtureModule,
    artifactSha256,
  }));
}

describe("recursive run 87 SP0 registry and lifecycle authority", () => {
  test("a synthetic future extension uses the same generic runtime path as the fixed release set", async () => {
    expect(typeof trackBRuntime.createExtensionRuntime).toBe("function");
    const stateRoot = path.join(os.tmpdir(), `run87-generic-runtime-${Date.now()}`);
    roots.push(stateRoot);
    const runtime = await trackBRuntime.createExtensionRuntime({
      stateRoot,
      authorizationEpoch: 7,
      repoRoot,
      extensions: await syntheticExtensions(14),
    });
    runtimes.push(runtime);

    expect(runtime.listExtensions()).toHaveLength(14);
    await expect(
      runtime.invoke("synthetic-future-extension", {
        requestId: "run87:synthetic:echo",
        protocolVersion: "1.1.0",
        channel: "development",
        scope: "tenant:run87",
        authorizationEpoch: 7,
        capability: "fixture:echo",
        payload: { value: 87 },
      }),
    ).resolves.toMatchObject({ echoed: { value: 87 }, requestId: "run87:synthetic:echo" });
  });

  test("process extension business output survives a supervised worker restart", async () => {
    const stateRoot = path.join(os.tmpdir(), `run94-durable-extension-output-${Date.now()}`);
    roots.push(stateRoot);
    const runtime = await trackBRuntime.createExtensionRuntime({
      stateRoot,
      authorizationEpoch: 94,
      repoRoot,
      extensions: await syntheticExtensions(1),
    });
    runtimes.push(runtime);

    const output = await runtime.invoke("canonical-01", {
      requestId: "run94:durable-output",
      protocolVersion: "1.1.0",
      channel: "development",
      scope: "tenant:run94",
      authorizationEpoch: 94,
      capability: "fixture:echo",
      payload: { value: 94 },
    });
    expect(output).toMatchObject({
      readCapability: "extension-output:read",
      businessOutput: { echoed: { value: 94 }, requestId: "run94:durable-output" },
      durableLocator: {
        extensionId: "canonical-01",
        requestId: "run94:durable-output",
        capability: "fixture:echo",
      },
    });

    const before = runtime.listExtensions()[0];
    const restarted = await runtime.mutateExtension({
      id: "canonical-01",
      action: "restart",
      mutationId: "run94:restart:durable-output",
      expectedRevision: before.revision,
    });
    expect(restarted.state.pid).not.toBe(before.pid);
    await expect(
      runtime.invoke("canonical-01", {
        requestId: "run94:durable-output:readback",
        protocolVersion: "1.1.0",
        channel: "development",
        scope: "tenant:run94",
        authorizationEpoch: 94,
        capability: "extension-output:read",
        payload: {
          durableLocator: output.durableLocator,
          durableOutputId: "sha256:host-bound-output",
        },
      }),
    ).resolves.toMatchObject({
      readbackOutputId: "sha256:host-bound-output",
      durableLocator: output.durableLocator,
    });
  });

  test("the production constructor keeps thirteen release extensions while admitting an explicit QA extension", async () => {
    const stateRoot = path.join(os.tmpdir(), `run87-packaged-qa-runtime-${Date.now()}`);
    roots.push(stateRoot);
    const canonical = await syntheticExtensions(13);
    const qaExtension = (await syntheticExtensions(14))[13];
    const runtime = await trackBRuntime.createProductionExtensionRuntime({
      stateRoot,
      authorizationEpoch: 87,
      repoRoot,
      extensions: canonical,
      qaExtensions: [qaExtension],
    });
    runtimes.push(runtime);

    expect(runtime.listExtensions()).toHaveLength(14);
    await expect(
      runtime.invoke("synthetic-future-extension", {
        requestId: "run87:packaged-qa:echo",
        protocolVersion: "1.1.0",
        channel: "development",
        scope: "tenant:run87",
        authorizationEpoch: 87,
        capability: "fixture:echo",
        payload: { packagedQa: true },
      }),
    ).resolves.toMatchObject({ echoed: { packagedQa: true } });
  });

  test("durable lifecycle mutations change observed worker state and are idempotent", async () => {
    const stateRoot = path.join(os.tmpdir(), `run87-production-runtime-${Date.now()}`);
    roots.push(stateRoot);
    const extensions = await syntheticExtensions(13);
    const runtime = await trackBRuntime.createProductionExtensionRuntime({
      stateRoot,
      authorizationEpoch: 11,
      repoRoot,
      extensions,
    });
    runtimes.push(runtime);

    expect(typeof runtime.listExtensions).toBe("function");
    expect(typeof runtime.mutateExtension).toBe("function");
    const initial = runtime.listExtensions().find((row) => row.id === "canonical-01");
    expect(initial).toMatchObject({ lifecycle: "ready", desiredState: "enabled", revision: 1 });
    expect(initial?.pid).toBeGreaterThan(0);

    const disabled = await runtime.mutateExtension({
      id: "canonical-01",
      action: "disable",
      mutationId: "run87:disable:canonical-01",
      expectedRevision: initial?.revision,
    });
    expect(disabled.state).toMatchObject({
      lifecycle: "stopped",
      desiredState: "disabled",
      pid: null,
    });
    const repeated = await runtime.mutateExtension({
      id: "canonical-01",
      action: "disable",
      mutationId: "run87:disable:canonical-01",
      expectedRevision: initial?.revision,
    });
    expect(repeated).toEqual(disabled);
    await expect(
      runtime.mutateExtension({
        id: "canonical-01",
        action: "enable",
        mutationId: "run87:disable:canonical-01",
        expectedRevision: disabled.state.revision,
      }),
    ).rejects.toThrow(/mutation.*conflict|idempotency/i);
    await expect(
      runtime.invoke("canonical-01", {
        requestId: "run87:disabled:invoke",
        protocolVersion: "1.1.0",
        channel: "development",
        scope: "tenant:run87",
        authorizationEpoch: 11,
        capability: "fixture:echo",
        payload: {},
      }),
    ).rejects.toThrow(/disabled|stopped/i);

    const enabled = await runtime.mutateExtension({
      id: "canonical-01",
      action: "enable",
      mutationId: "run87:enable:canonical-01",
      expectedRevision: disabled.state.revision,
    });
    expect(enabled.state.lifecycle).toBe("ready");
    expect(enabled.state.pid).toBeGreaterThan(0);
    expect(enabled.state.pid).not.toBe(initial?.pid);

    const restarted = await runtime.mutateExtension({
      id: "canonical-01",
      action: "restart",
      mutationId: "run87:restart:canonical-01",
      expectedRevision: enabled.state.revision,
    });
    expect(restarted.state.lifecycle).toBe("ready");
    expect(restarted.state.pid).toBeGreaterThan(0);
    expect(restarted.state.pid).not.toBe(enabled.state.pid);

    const rolledBack = await runtime.mutateExtension({
      id: "canonical-01",
      action: "rollback",
      mutationId: "run87:rollback:canonical-01",
      expectedRevision: restarted.state.revision,
    });
    expect(rolledBack.state).toMatchObject({ lifecycle: "ready", desiredState: "enabled" });
  });

  test("operations API delegates list and mutation to supervisor authority instead of bridge JSON", async () => {
    const stateRoot = path.join(os.tmpdir(), `run87-operations-runtime-${Date.now()}`);
    roots.push(stateRoot);
    const statePath = path.join(stateRoot, "bridge-state.json");
    const expectedRows = [
      { id: "canonical-01", lifecycle: "ready", desiredState: "enabled", pid: 8701, revision: 4 },
    ];
    const listExtensions = vi.fn(async () => expectedRows);
    const mutateExtension = vi.fn(async (input: Record<string, unknown>) => ({
      mutationId: input.mutationId,
      state: { id: input.id, lifecycle: "ready", desiredState: "enabled", pid: 8702, revision: 5 },
    }));
    const operations = createTrackBOperations({
      statePath,
      catalog: [{ id: "canonical-01" }],
      extensionRuntime: { listExtensions, mutateExtension },
    });

    await expect(operations.listExtensions()).resolves.toEqual([
      expect.objectContaining({
        ...expectedRows[0],
        installed: true,
        enabled: true,
        enabledMode: "active",
        health: { available: true, routingDependency: false },
      }),
    ]);
    expect(listExtensions).toHaveBeenCalledOnce();
    const receipt = await operations.mutateExtension({
      id: "canonical-01",
      action: "restart",
      mutationId: "run87:operations:restart",
      expectedRevision: 4,
    });
    expect(mutateExtension).toHaveBeenCalledWith({
      id: "canonical-01",
      action: "restart",
      mutationId: "run87:operations:restart",
      expectedRevision: 4,
    });
    expect(receipt).toMatchObject({ state: { pid: 8702, revision: 5 } });
  });

  test("operations API preserves the packaged runtime channel for supervised extensions", async () => {
    const stateRoot = path.join(os.tmpdir(), `run94-stage-extension-channel-${Date.now()}`);
    roots.push(stateRoot);
    const operations = createTrackBOperations({
      statePath: path.join(stateRoot, "bridge-state.json"),
      catalog: [{ id: "artifact-store" }],
      runtimeChannel: "stage",
      extensionRuntime: {
        listExtensions: async () => [
          {
            id: "artifact-store",
            lifecycle: "ready",
            desiredState: "enabled",
            pid: 9401,
            revision: 1,
          },
        ],
        mutateExtension: async () => ({}),
      },
    });

    await expect(operations.listExtensions()).resolves.toEqual([
      expect.objectContaining({ id: "artifact-store", channel: "stage" }),
    ]);
  });

  test("Phase 3.5 journal replay preserves stopped state and never resurrects removed extensions", async () => {
    const stateRoot = path.join(os.tmpdir(), `run87-journal-replay-${Date.now()}`);
    roots.push(stateRoot);
    const journalPath = path.join(stateRoot, "extension-host.jsonl");
    const hostModule = (await import("../../../../packages/extension-host/index.mjs")) as {
      ExtensionHost: new (
        input: Record<string, unknown>,
      ) => {
        registerProcess(descriptor: Record<string, unknown>, moduleUrl: string): Promise<void>;
        stopProcess(id: string): Promise<unknown>;
        removeProcess(id: string): Promise<void>;
        restoreJournal(): Promise<void>;
        listExtensionStates(): Array<{ id: string; lifecycle: string }>;
        shutdown(): Promise<void>;
      };
    };
    const descriptor = (id: string) => ({
      id,
      protocolVersion: "1.1.0",
      capabilities: ["health:probe", "fixture:echo"],
    });
    const first = new hostModule.ExtensionHost({
      journalPath,
      authorizationEpoch: 1,
      protocolVersion: "1.1.0",
    });
    await first.registerProcess(descriptor("stopped-extension"), fixtureModule);
    await first.registerProcess(descriptor("removed-extension"), fixtureModule);
    await first.stopProcess("stopped-extension");
    await first.removeProcess("removed-extension");
    await first.shutdown();

    const restored = new hostModule.ExtensionHost({
      journalPath,
      authorizationEpoch: 1,
      protocolVersion: "1.1.0",
    });
    await restored.restoreJournal();
    expect(restored.listExtensionStates()).toEqual([
      expect.objectContaining({ id: "stopped-extension", lifecycle: "stopped" }),
    ]);
    await restored.shutdown();
  });

  test("Phase 3.5 failed durable mutation is compensated before returning an error", async () => {
    const stateRoot = path.join(os.tmpdir(), `run87-mutation-compensation-${Date.now()}`);
    roots.push(stateRoot);
    const runtime = await trackBRuntime.createExtensionRuntime({
      stateRoot,
      authorizationEpoch: 1,
      repoRoot,
      extensions: await syntheticExtensions(1),
    });
    runtimes.push(runtime);
    const initial = runtime.listExtensions()[0];
    const statePath = path.join(stateRoot, "extension-runtime-state.json");
    await rm(statePath);
    await mkdir(statePath);
    await expect(
      runtime.mutateExtension({
        id: initial.id,
        action: "disable",
        mutationId: "run87:forced-persist-failure",
        expectedRevision: initial.revision,
      }),
    ).rejects.toThrow();
    expect(runtime.listExtensions()[0]).toMatchObject({
      desiredState: "enabled",
      lifecycle: "ready",
      revision: initial.revision,
    });
  });
});
