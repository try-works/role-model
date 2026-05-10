import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path, { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { EndpointRegistryResult } from "@role-model-router/endpoint-registry";

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
          listSwapHistory(): Promise<readonly { timestamp: string; oldModel: string | null; newModel: string | null; reason: string }[]>;
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
