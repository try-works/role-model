import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, test } from "vitest";

import { createRuntimeBridgeBackend } from "../src/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");
const testFixtureRoot = path.join(__dirname, "fixtures");

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
      fixtureRoot: testFixtureRoot,
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
      fixtureRoot: testFixtureRoot,
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
      fixtureRoot: testFixtureRoot,
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

  test("surfaces normalized provider docs and npm metadata through listProviders", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-run32-provider-metadata-"));
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
      fixtureRoot: path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
      runtimeStateRoot,
      scopeId: "runtime-host-provider-metadata",
      unifiedRuntimeConfigPath,
    });

    await expect(backend.listProviders()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          providerId: "anthropic",
          npmPackage: "@ai-sdk/anthropic",
          docsUrl: "https://docs.anthropic.com/en/docs/about-claude/models",
        }),
      ]),
    );

    await backend.shutdown();
  });

  test("surfaces LiteLLM-backed Moonshot models and endpoints from unified runtime config", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-run16-litellm-models-"));
    tempRoots.push(tempRoot);
    const runtimeStateRoot = path.join(tempRoot, "state");
    const unifiedRuntimeConfigPath = path.join(tempRoot, "runtime-config.yaml");

    await writeFile(
      unifiedRuntimeConfigPath,
      [
        'version: "1.0"',
        "litellm_proxy:",
        '  command: "node"',
        "  args:",
        '    - "-e"',
        `    - 'const http=require("node:http");const port=Number(process.env.PORT);const server=http.createServer((req,res)=>{if(req.url==="/health/liveliness"){res.statusCode=200;res.end("ok");return;}res.statusCode=404;res.end("missing");});server.listen(port,"127.0.0.1");const shutdown=()=>server.close(()=>process.exit(0));process.on("SIGTERM",shutdown);process.on("SIGINT",shutdown);'`,
        "  providers:",
        "    moonshot:",
        '      api_key: "${MOONSHOT_API_KEY}"',
        "      model_list:",
        '        - model_name: "moonshot/kimi-k2.6"',
        "          litellm_params:",
        '            model: "moonshot/kimi-k2.6"',
        '            api_base: "https://api.moonshot.ai/v1"',
        '        - model_name: "moonshot/kimi-k2.5"',
        "          litellm_params:",
        '            model: "moonshot/kimi-k2.5"',
        '            api_base: "https://api.moonshot.ai/v1"',
        "",
      ].join("\n"),
      "utf8",
    );

    const backend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: testFixtureRoot,
      runtimeStateRoot,
      scopeId: "runtime-host-unified-litellm-models",
      unifiedRuntimeConfigPath,
    });

    await expect(backend.listProviders()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          providerId: "moonshot",
          modelIds: ["moonshot/kimi-k2.6", "moonshot/kimi-k2.5"],
          variants: expect.arrayContaining([
            expect.objectContaining({
              variantId: "moonshot-api-key",
              modelIds: ["moonshot/kimi-k2.6", "moonshot/kimi-k2.5"],
            }),
            expect.objectContaining({
              variantId: "moonshot-oauth",
              modelIds: ["moonshot/kimi-k2.6", "moonshot/kimi-k2.5"],
            }),
          ]),
        }),
      ]),
    );

    await expect(backend.listEndpoints()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          endpointId: "moonshot.litellm.global.moonshot-kimi-k2-6",
          modelId: "moonshot/kimi-k2.6",
        }),
        expect.objectContaining({
          endpointId: "moonshot.litellm.global.moonshot-kimi-k2-5",
          modelId: "moonshot/kimi-k2.5",
        }),
      ]),
    );

    await backend.shutdown();
  });
});
