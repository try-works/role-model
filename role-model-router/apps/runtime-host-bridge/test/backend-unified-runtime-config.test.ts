import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, test } from "vitest";

import { createRuntimeBridgeBackend } from "../src/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");

const tempRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempRoots.splice(0).map(async (tempRoot) => {
      await rm(tempRoot, { recursive: true, force: true });
    }),
  );
});

describe("runtime-host-bridge unified runtime backend", () => {
  test("surfaces the derived execution mode in the runtime summary when a unified config file is provided", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-run15-config-"));
    tempRoots.push(tempRoot);
    const runtimeStateRoot = path.join(tempRoot, "state");
    const unifiedRuntimeConfigPath = path.join(tempRoot, "runtime-config.yaml");

    await writeFile(
      unifiedRuntimeConfigPath,
      `
version: "1.0"
`,
      "utf8",
    );

    const backend = await createRuntimeBridgeBackend({
      repoRoot,
      runtimeStateRoot,
      scopeId: "runtime-host-unified-config",
      unifiedRuntimeConfigPath,
    });

    await expect(backend.readRuntimeSummary()).resolves.toEqual(
      expect.objectContaining({
        executionMode: "decision_only",
        unifiedConfig: {
          path: unifiedRuntimeConfigPath,
          enabled: true,
        },
      }),
    );

    await backend.shutdown();
  });

  test("reads and updates unified runtime config through the backend", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-run16-config-"));
    tempRoots.push(tempRoot);
    const runtimeStateRoot = path.join(tempRoot, "state");
    const unifiedRuntimeConfigPath = path.join(tempRoot, "runtime-config.yaml");

    await writeFile(
      unifiedRuntimeConfigPath,
      `
version: "1.0"
`,
      "utf8",
    );

    const backend = await createRuntimeBridgeBackend({
      repoRoot,
      runtimeStateRoot,
      scopeId: "runtime-host-unified-config-update",
      unifiedRuntimeConfigPath,
    });

    await expect(backend.readRuntimeConfig()).resolves.toEqual(
      expect.objectContaining({
        applied: true,
        path: unifiedRuntimeConfigPath,
        config: expect.objectContaining({
          executionMode: "decision_only",
          llamaSwap: expect.objectContaining({
            models: [],
          }),
          liteLLM: expect.objectContaining({
            providers: [],
          }),
        }),
      }),
    );

    await expect(
      backend.updateRuntimeConfig({
        version: "1.0",
        routingStrategy: "latency-first",
        llamaSwap: {
          models: [],
          process: {
            command: null,
            args: [],
            env: {},
            cwd: null,
            startupTimeoutMs: null,
          },
        },
        liteLLM: {
          providers: [],
          process: {
            command: null,
            args: [],
            env: {},
            cwd: null,
            startupTimeoutMs: null,
          },
        },
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        applied: true,
        path: unifiedRuntimeConfigPath,
        config: expect.objectContaining({
          routingStrategy: "latency-first",
          executionMode: "decision_only",
          llamaSwap: expect.objectContaining({
            models: [],
          }),
          liteLLM: expect.objectContaining({
            providers: [],
          }),
        }),
      }),
    );

    await expect(backend.readRuntimeSummary()).resolves.toEqual(
      expect.objectContaining({
        executionMode: "decision_only",
        unifiedConfig: {
          enabled: true,
          path: unifiedRuntimeConfigPath,
        },
      }),
    );

    await expect(readFile(unifiedRuntimeConfigPath, "utf8")).resolves.toContain("latency-first");

    await backend.shutdown();
  });

  test("returns no controller assignment when the unified config has no endpoints yet", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-run16-empty-controller-"));
    tempRoots.push(tempRoot);
    const runtimeStateRoot = path.join(tempRoot, "state");
    const unifiedRuntimeConfigPath = path.join(tempRoot, "runtime-config.yaml");

    await writeFile(
      unifiedRuntimeConfigPath,
      `
version: "1.0"
`,
      "utf8",
    );

    const backend = await createRuntimeBridgeBackend({
      repoRoot,
      runtimeStateRoot,
      scopeId: "runtime-host-empty-controller",
      unifiedRuntimeConfigPath,
    });

    await expect(backend.readRuntimeSummary()).resolves.toEqual(
      expect.objectContaining({
        endpointCount: 0,
        executionMode: "decision_only",
      }),
    );

    await expect(backend.readControllerAssignment()).resolves.toBeNull();

    await backend.shutdown();
  });
});
