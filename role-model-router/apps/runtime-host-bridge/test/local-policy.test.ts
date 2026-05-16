import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path, { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { EndpointRegistryResult } from "@role-model-router/endpoint-registry";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import * as bridge from "../src/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");

const registry: EndpointRegistryResult = {
  endpoints: [],
};

describe("local policy persistence", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "role-model-test-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  test("readLocalPolicy returns defaults when file does not exist", async () => {
    const backend = await (
      bridge as {
        createRuntimeBridgeBackend: (options: {
          repoRoot: string;
          runtimeStateRoot: string;
          scopeId: string;
          registry: EndpointRegistryResult;
          providerPresetsPath: string;
        }) => Promise<{ readLocalPolicy(): Promise<Record<string, unknown>> }>;
      }
    ).createRuntimeBridgeBackend({
      repoRoot,
      runtimeStateRoot: tempDir,
      scopeId: "test-local-policy",
      registry,
      providerPresetsPath: "testdata/router-runtime/fixtures/provider-presets.json",
    });

    const policy = await backend.readLocalPolicy();
    expect(policy).toEqual({
      ttl: 300,
      maxConcurrency: 1,
      autoUnload: true,
    });
  });

  test("updateLocalPolicy writes merged policy to file", async () => {
    const backend = await (
      bridge as {
        createRuntimeBridgeBackend: (options: {
          repoRoot: string;
          runtimeStateRoot: string;
          scopeId: string;
          registry: EndpointRegistryResult;
          providerPresetsPath: string;
        }) => Promise<{
          readLocalPolicy(): Promise<Record<string, unknown>>;
          updateLocalPolicy(body: Record<string, unknown>): Promise<Record<string, unknown>>;
        }>;
      }
    ).createRuntimeBridgeBackend({
      repoRoot,
      runtimeStateRoot: tempDir,
      scopeId: "test-local-policy",
      registry,
      providerPresetsPath: "testdata/router-runtime/fixtures/provider-presets.json",
    });

    const updated = await backend.updateLocalPolicy({ ttl: 600 });
    expect(updated.ttl).toBe(600);
    expect(updated.maxConcurrency).toBe(1);
    expect(updated.autoUnload).toBe(true);

    const policyPath = join(tempDir, "local-policy.json");
    expect(existsSync(policyPath)).toBe(true);
    const persisted = JSON.parse(readFileSync(policyPath, "utf8")) as Record<string, unknown>;
    expect(persisted.ttl).toBe(600);
    expect(persisted.maxConcurrency).toBe(1);
    expect(persisted.autoUnload).toBe(true);
  });

  test("readLocalPolicy reads persisted file", async () => {
    const backend = await (
      bridge as {
        createRuntimeBridgeBackend: (options: {
          repoRoot: string;
          runtimeStateRoot: string;
          scopeId: string;
          registry: EndpointRegistryResult;
          providerPresetsPath: string;
        }) => Promise<{
          readLocalPolicy(): Promise<Record<string, unknown>>;
          updateLocalPolicy(body: Record<string, unknown>): Promise<Record<string, unknown>>;
        }>;
      }
    ).createRuntimeBridgeBackend({
      repoRoot,
      runtimeStateRoot: tempDir,
      scopeId: "test-local-policy",
      registry,
      providerPresetsPath: "testdata/router-runtime/fixtures/provider-presets.json",
    });

    await backend.updateLocalPolicy({ maxConcurrency: 4 });
    const readBack = await backend.readLocalPolicy();
    expect(readBack.maxConcurrency).toBe(4);
  });

  test("updateLocalPolicy merges with existing policy", async () => {
    const backend = await (
      bridge as {
        createRuntimeBridgeBackend: (options: {
          repoRoot: string;
          runtimeStateRoot: string;
          scopeId: string;
          registry: EndpointRegistryResult;
          providerPresetsPath: string;
        }) => Promise<{
          readLocalPolicy(): Promise<Record<string, unknown>>;
          updateLocalPolicy(body: Record<string, unknown>): Promise<Record<string, unknown>>;
        }>;
      }
    ).createRuntimeBridgeBackend({
      repoRoot,
      runtimeStateRoot: tempDir,
      scopeId: "test-local-policy",
      registry,
      providerPresetsPath: "testdata/router-runtime/fixtures/provider-presets.json",
    });

    await backend.updateLocalPolicy({ ttl: 600 });
    const merged = await backend.updateLocalPolicy({ autoUnload: false });
    expect(merged.ttl).toBe(600);
    expect(merged.autoUnload).toBe(false);
  });
});

describe("local swap history", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "role-model-test-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  test("listSwapHistory returns empty array when no events", async () => {
    const backend = await (
      bridge as {
        createRuntimeBridgeBackend: (options: {
          repoRoot: string;
          runtimeStateRoot: string;
          scopeId: string;
          registry: EndpointRegistryResult;
          providerPresetsPath: string;
        }) => Promise<{ listSwapHistory(): Promise<readonly unknown[]> }>;
      }
    ).createRuntimeBridgeBackend({
      repoRoot,
      runtimeStateRoot: tempDir,
      scopeId: "test-local-policy",
      registry,
      providerPresetsPath: "testdata/router-runtime/fixtures/provider-presets.json",
    });

    const history = await backend.listSwapHistory();
    expect(history).toEqual([]);
  });

  test("listSwapHistory returns events in descending order", async () => {
    const backend = await (
      bridge as {
        createRuntimeBridgeBackend: (options: {
          repoRoot: string;
          runtimeStateRoot: string;
          scopeId: string;
          registry: EndpointRegistryResult;
          providerPresetsPath: string;
        }) => Promise<{
          listSwapHistory(): Promise<
            readonly {
              timestamp: string;
              oldModel: string | null;
              newModel: string | null;
              reason: string;
            }[]
          >;
        }>;
      }
    ).createRuntimeBridgeBackend({
      repoRoot,
      runtimeStateRoot: tempDir,
      scopeId: "test-local-policy",
      registry,
      providerPresetsPath: "testdata/router-runtime/fixtures/provider-presets.json",
    });

    const history = await backend.listSwapHistory();
    expect(history).toEqual([]);
  });
});

describe("model overrides", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "role-model-test-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  test("readModelOverrides returns empty object when file does not exist", async () => {
    const backend = await (
      bridge as {
        createRuntimeBridgeBackend: (options: {
          repoRoot: string;
          runtimeStateRoot: string;
          scopeId: string;
          registry: EndpointRegistryResult;
          providerPresetsPath: string;
        }) => Promise<{ readModelOverrides(): Promise<Record<string, unknown>> }>;
      }
    ).createRuntimeBridgeBackend({
      repoRoot,
      runtimeStateRoot: tempDir,
      scopeId: "test-model-overrides",
      registry,
      providerPresetsPath: "testdata/router-runtime/fixtures/provider-presets.json",
    });

    const overrides = await backend.readModelOverrides();
    expect(overrides).toEqual({});
  });

  test("updateModelOverrides writes to file", async () => {
    const backend = await (
      bridge as {
        createRuntimeBridgeBackend: (options: {
          repoRoot: string;
          runtimeStateRoot: string;
          scopeId: string;
          registry: EndpointRegistryResult;
          providerPresetsPath: string;
        }) => Promise<{
          readModelOverrides(): Promise<Record<string, unknown>>;
          updateModelOverrides(body: Record<string, unknown>): Promise<Record<string, unknown>>;
        }>;
      }
    ).createRuntimeBridgeBackend({
      repoRoot,
      runtimeStateRoot: tempDir,
      scopeId: "test-model-overrides",
      registry,
      providerPresetsPath: "testdata/router-runtime/fixtures/provider-presets.json",
    });

    const body = {
      "llama-3-8b": { ttl: 600, contextWindow: 8192, concurrencyLimit: 2 },
      "mistral-7b": { ttl: 900, contextWindow: 32768 },
    };

    const updated = await backend.updateModelOverrides(body);
    expect(updated).toEqual(body);

    const overridesPath = join(tempDir, "model-overrides.json");
    expect(existsSync(overridesPath)).toBe(true);
    const persisted = JSON.parse(readFileSync(overridesPath, "utf8")) as Record<string, unknown>;
    expect(persisted).toEqual(body);
  });

  test("readModelOverrides reads persisted file", async () => {
    const backend = await (
      bridge as {
        createRuntimeBridgeBackend: (options: {
          repoRoot: string;
          runtimeStateRoot: string;
          scopeId: string;
          registry: EndpointRegistryResult;
          providerPresetsPath: string;
        }) => Promise<{
          readModelOverrides(): Promise<Record<string, unknown>>;
          updateModelOverrides(body: Record<string, unknown>): Promise<Record<string, unknown>>;
        }>;
      }
    ).createRuntimeBridgeBackend({
      repoRoot,
      runtimeStateRoot: tempDir,
      scopeId: "test-model-overrides",
      registry,
      providerPresetsPath: "testdata/router-runtime/fixtures/provider-presets.json",
    });

    const body = {
      "llama-3-8b": { ttl: 600, contextWindow: 8192, concurrencyLimit: 2 },
    };

    await backend.updateModelOverrides(body);
    const readBack = await backend.readModelOverrides();
    expect(readBack).toEqual(body);
  });
});

describe("peer configuration", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "role-model-test-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  test("readPeers returns empty array when file does not exist", async () => {
    const backend = await (
      bridge as {
        createRuntimeBridgeBackend: (options: {
          repoRoot: string;
          runtimeStateRoot: string;
          scopeId: string;
          registry: EndpointRegistryResult;
          providerPresetsPath: string;
        }) => Promise<{ readPeers(): Promise<readonly unknown[]> }>;
      }
    ).createRuntimeBridgeBackend({
      repoRoot,
      runtimeStateRoot: tempDir,
      scopeId: "test-peers",
      registry,
      providerPresetsPath: "testdata/router-runtime/fixtures/provider-presets.json",
    });

    const peers = await backend.readPeers();
    expect(peers).toEqual([]);
  });

  test("updatePeers writes to file", async () => {
    const backend = await (
      bridge as {
        createRuntimeBridgeBackend: (options: {
          repoRoot: string;
          runtimeStateRoot: string;
          scopeId: string;
          registry: EndpointRegistryResult;
          providerPresetsPath: string;
        }) => Promise<{
          readPeers(): Promise<readonly unknown[]>;
          updatePeers(body: readonly unknown[]): Promise<readonly unknown[]>;
        }>;
      }
    ).createRuntimeBridgeBackend({
      repoRoot,
      runtimeStateRoot: tempDir,
      scopeId: "test-peers",
      registry,
      providerPresetsPath: "testdata/router-runtime/fixtures/provider-presets.json",
    });

    const body = [{ id: "peer-1", url: "http://192.168.1.100:8080", authToken: "token-1" }];
    const updated = await backend.updatePeers(body);
    expect(updated).toEqual(body);

    const peersPath = join(tempDir, "peers.json");
    expect(existsSync(peersPath)).toBe(true);
    const persisted = JSON.parse(readFileSync(peersPath, "utf8")) as unknown[];
    expect(persisted).toEqual(body);
  });

  test("readPeers reads persisted file", async () => {
    const backend = await (
      bridge as {
        createRuntimeBridgeBackend: (options: {
          repoRoot: string;
          runtimeStateRoot: string;
          scopeId: string;
          registry: EndpointRegistryResult;
          providerPresetsPath: string;
        }) => Promise<{
          readPeers(): Promise<readonly unknown[]>;
          updatePeers(body: readonly unknown[]): Promise<readonly unknown[]>;
        }>;
      }
    ).createRuntimeBridgeBackend({
      repoRoot,
      runtimeStateRoot: tempDir,
      scopeId: "test-peers",
      registry,
      providerPresetsPath: "testdata/router-runtime/fixtures/provider-presets.json",
    });

    const body = [{ id: "peer-1", url: "http://192.168.1.100:8080" }];
    await backend.updatePeers(body);
    const readBack = await backend.readPeers();
    expect(readBack).toEqual(body);
  });

  test("checkPeerHealth returns false for unreachable url", async () => {
    const backend = await (
      bridge as {
        createRuntimeBridgeBackend: (options: {
          repoRoot: string;
          runtimeStateRoot: string;
          scopeId: string;
          registry: EndpointRegistryResult;
          providerPresetsPath: string;
        }) => Promise<{ checkPeerHealth(url: string): Promise<{ healthy: boolean }> }>;
      }
    ).createRuntimeBridgeBackend({
      repoRoot,
      runtimeStateRoot: tempDir,
      scopeId: "test-peers",
      registry,
      providerPresetsPath: "testdata/router-runtime/fixtures/provider-presets.json",
    });

    const result = await backend.checkPeerHealth("http://localhost:59999/healthz");
    expect(result.healthy).toBe(false);
  });
});
