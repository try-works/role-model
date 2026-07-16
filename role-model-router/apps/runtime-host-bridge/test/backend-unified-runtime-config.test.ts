import { createServer } from "node:http";
import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

import { afterEach, describe, expect, test } from "vitest";

import * as bridge from "../src/index.js";
import { createRuntimeBridgeBackend } from "../src/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");
const testFixtureRoot = path.join(__dirname, "fixtures");

const tempRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempRoots.splice(0).map(async (tempRoot) => {
      await rm(tempRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }),
  );
});

describe("runtime-host-bridge unified runtime backend", () => {
  test("router candidates expose every configured endpoint and mark current execution-mode eligibility", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-run49-candidates-"));
    tempRoots.push(tempRoot);
    const runtimeStateRoot = path.join(tempRoot, "state");
    const unifiedRuntimeConfigPath = path.join(tempRoot, "runtime-config.yaml");

    await writeFile(
      unifiedRuntimeConfigPath,
      `
version: "1.0"
execution_mode: remote_only
llama_swap:
  models:
    lfm2.5-1.2b-instruct:
      path: ./models/lfm2.5-1.2b-instruct.gguf
litellm_proxy:
  command: "node"
  args:
    - "-e"
    - 'const http=require("node:http");const port=Number(process.env.PORT);const server=http.createServer((req,res)=>{if(req.url==="/health/liveliness"){res.statusCode=200;res.end("ok");return;}res.statusCode=404;res.end("missing");});server.listen(port,"127.0.0.1");const shutdown=()=>server.close(()=>process.exit(0));process.on("SIGTERM",shutdown);process.on("SIGINT",shutdown);'
  providers:
    moonshot:
      api_key: "$\{MOONSHOT_API_KEY}"
      model_list:
        - model_name: moonshot/kimi-k2.6
          litellm_params:
            model: moonshot/kimi-k2.6
            api_base: https://api.moonshot.ai/v1
`,
      "utf8",
    );

    const seedBackend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: testFixtureRoot,
      runtimeStateRoot,
      scopeId: "runtime-host-run49-candidates",
    });
    await seedBackend.upsertProviderAccount({
      providerAccountId: "moonshot.litellm",
      providerId: "moonshot",
      providerKind: "provider-openai",
      orgScope: "personal",
      accountScope: "workspace-default",
      credentialRef: {
        backend: "env",
        ref: "MOONSHOT_API_KEY",
      },
      authMode: "api-key-static",
      regionPolicy: {
        mode: "prefer",
        regions: ["global"],
      },
      baseUrlOverride: "https://api.moonshot.ai/v1",
      allowedModels: ["moonshot/kimi-k2.6"],
      modelRoleBindings: [
        {
          modelId: "moonshot/kimi-k2.6",
          roleIds: ["writer"],
        },
      ],
      deniedModels: [],
      entitlementTags: ["chat"],
      budgetPolicyRef: "budget.default",
      quotaPolicyRef: "quota.default",
      status: "active",
      healthStatus: "healthy",
      rotationState: "stable",
    });
    await seedBackend.shutdown();

    const backend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: testFixtureRoot,
      runtimeStateRoot,
      scopeId: "runtime-host-run49-candidates",
      unifiedRuntimeConfigPath,
      runtimeVendorStartup: "disabled",
    });

    const candidates = (await backend.listRouterCandidates()) as Array<Record<string, unknown>>;

    expect(candidates.map((candidate) => candidate.modelId).sort()).toEqual([
      "lfm2.5-1.2b-instruct",
      "moonshot/kimi-k2.6",
    ]);
    expect(candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          modelId: "moonshot/kimi-k2.6",
          sourceType: "remote",
          executionModeEligible: true,
        }),
        expect.objectContaining({
          modelId: "lfm2.5-1.2b-instruct",
          sourceType: "local",
          executionModeEligible: false,
        }),
      ]),
    );

    await backend.shutdown();
  }, 20_000);

  test("rejects benchmark runs that target endpoints excluded by execution mode", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-run49-benchmark-mode-"));
    tempRoots.push(tempRoot);
    const runtimeStateRoot = path.join(tempRoot, "state");
    const unifiedRuntimeConfigPath = path.join(tempRoot, "runtime-config.yaml");

    await writeFile(
      unifiedRuntimeConfigPath,
      `
version: "1.0"
execution_mode: local_only
llama_swap:
  models:
    lfm2.5-1.2b-instruct:
      path: ./models/lfm2.5-1.2b-instruct.gguf
litellm_proxy:
  providers:
    moonshot:
      api_key: "$\{MOONSHOT_API_KEY}"
      model_list:
        - model_name: moonshot/kimi-k2.6
          litellm_params:
            model: moonshot/kimi-k2.6
            api_base: https://api.moonshot.ai/v1
`,
      "utf8",
    );

    const seedBackend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: testFixtureRoot,
      runtimeStateRoot,
      scopeId: "runtime-host-run49-benchmark-mode",
    });
    await seedBackend.upsertProviderAccount({
      providerAccountId: "moonshot.litellm",
      providerId: "moonshot",
      providerKind: "provider-openai",
      orgScope: "personal",
      accountScope: "workspace-default",
      credentialRef: {
        backend: "env",
        ref: "MOONSHOT_API_KEY",
      },
      authMode: "api-key-static",
      regionPolicy: {
        mode: "prefer",
        regions: ["global"],
      },
      baseUrlOverride: "https://api.moonshot.ai/v1",
      allowedModels: ["moonshot/kimi-k2.6"],
      modelRoleBindings: [
        {
          modelId: "moonshot/kimi-k2.6",
          roleIds: ["writer"],
        },
      ],
      deniedModels: [],
      entitlementTags: ["chat"],
      budgetPolicyRef: "budget.default",
      quotaPolicyRef: "quota.default",
      status: "active",
      healthStatus: "healthy",
      rotationState: "stable",
    });
    await seedBackend.shutdown();

    const backend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: testFixtureRoot,
      runtimeStateRoot,
      scopeId: "runtime-host-run49-benchmark-mode",
      unifiedRuntimeConfigPath,
      runtimeVendorStartup: "disabled",
    });

    const candidates = (await backend.listRouterCandidates()) as Array<Record<string, unknown>>;
    const remoteEndpoint = candidates.find((candidate) => candidate.sourceType === "remote");
    const localEndpoint = candidates.find((candidate) => candidate.sourceType === "local");

    await expect(
      backend.runBenchmark({
        endpointIds: [remoteEndpoint?.endpointId, localEndpoint?.endpointId],
        judgeEndpointId: remoteEndpoint?.endpointId,
        mode: "quick",
        useJudge: true,
      }),
    ).rejects.toThrow("execution_mode_ineligible_endpoints");

    await backend.shutdown();
  }, 20_000);

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

  test("merges partial runtime config updates without dropping existing routing strategy", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-run36-config-merge-"));
    tempRoots.push(tempRoot);
    const runtimeStateRoot = path.join(tempRoot, "state");
    const unifiedRuntimeConfigPath = path.join(tempRoot, "runtime-config.yaml");

    await writeFile(
      unifiedRuntimeConfigPath,
      `
version: "1.0"
routing:
  strategy: difficulty
observed_data:
  enabled: true
`,
      "utf8",
    );

    const backend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: testFixtureRoot,
      runtimeStateRoot,
      scopeId: "runtime-host-unified-config-merge",
      unifiedRuntimeConfigPath,
    });

    await expect(
      backend.updateRuntimeConfig({
        model_aliases: {
          "mixed.local-remote": {
            mode: "difficulty",
            model_ids: ["lfm2.5-1.2b-instruct", "moonshot/kimi-k2.6"],
          },
        },
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        config: expect.objectContaining({
          routingStrategy: "difficulty",
          modelAliases: [
            expect.objectContaining({
              aliasId: "difficulty.decision-only",
            }),
          ],
        }),
      }),
    );

    await expect(readFile(unifiedRuntimeConfigPath, "utf8")).resolves.toContain(
      "strategy: difficulty",
    );
    await expect(backend.readRouterSummary()).resolves.toEqual(
      expect.objectContaining({
        aliasInventory: expect.arrayContaining([
          expect.objectContaining({
            aliasId: "difficulty.decision-only",
            mode: "difficulty",
            configuredHintModelIds: ["lfm2.5-1.2b-instruct", "moonshot/kimi-k2.6"],
            allowEndpointIds: expect.any(Array),
            resolvedModelIds: expect.any(Array),
            driftWarnings: expect.any(Array),
          }),
        ]),
      }),
    );

    await backend.shutdown();
  });

  test("canonicalizes the primary routing alias to the live routing matrix on startup", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-run47-alias-drift-clear-"));
    tempRoots.push(tempRoot);
    const runtimeStateRoot = path.join(tempRoot, "state");
    const unifiedRuntimeConfigPath = path.join(tempRoot, "runtime-config.yaml");

    await writeFile(
      unifiedRuntimeConfigPath,
      [
        'version: "1.0"',
        "routing:",
        "  strategy: difficulty",
        "execution_mode: hybrid",
        "model_aliases:",
        "  difficulty.hybrid:",
        '    mode: "difficulty"',
        "    model_ids:",
        '      - "lfm2.5-1.2b-instruct"',
        '      - "moonshot/kimi-k2.6"',
        "litellm_proxy:",
        '  command: "node"',
        "  args:",
        '    - "-e"',
        `    - 'const http=require("node:http");const port=Number(process.env.PORT);const server=http.createServer((req,res)=>{if(req.url==="/health/liveliness"){res.statusCode=200;res.end("ok");return;}res.statusCode=404;res.end("missing");});server.listen(port,"127.0.0.1");const shutdown=()=>server.close(()=>process.exit(0));process.on("SIGTERM",shutdown);process.on("SIGINT",shutdown);'`,
        "  providers:",
        "    moonshot:",
        '      api_key: "${MOONSHOT_API_KEY}"',
        "      model_list:",
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
      scopeId: "runtime-host-alias-drift-clear",
      unifiedRuntimeConfigPath,
    });

    await expect(backend.readRuntimeConfig()).resolves.toEqual(
      expect.objectContaining({
        config: expect.objectContaining({
          modelAliases: expect.arrayContaining([
            {
              aliasId: "difficulty.hybrid",
              mode: "difficulty",
              modelIds: ["moonshot/kimi-k2.5"],
            },
          ]),
        }),
      }),
    );

    await expect(backend.readRuntimeSummary()).resolves.toEqual(
      expect.objectContaining({
        aliasDrift: [],
      }),
    );
    await expect(backend.readRouterSummary()).resolves.toEqual(
      expect.objectContaining({
        aliasInventory: expect.arrayContaining([
          expect.objectContaining({
            aliasId: "difficulty.hybrid",
            configuredHintModelIds: ["moonshot/kimi-k2.5"],
            driftWarnings: expect.not.arrayContaining([
              expect.objectContaining({
                hintModelId: "moonshot/kimi-k2.6",
              }),
            ]),
          }),
        ]),
      }),
    );

    await backend.shutdown();
  });

  test("creates and updates unified runtime config when the configured path does not exist yet", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-run35-config-create-"));
    tempRoots.push(tempRoot);
    const runtimeStateRoot = path.join(tempRoot, "state");
    const unifiedRuntimeConfigPath = path.join(runtimeStateRoot, "runtime-config.yaml");

    const backend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: testFixtureRoot,
      runtimeStateRoot,
      scopeId: "runtime-host-unified-config-create",
      unifiedRuntimeConfigPath,
    });

    await expect(backend.readRuntimeConfig()).resolves.toEqual({
      applied: false,
      path: unifiedRuntimeConfigPath,
      config: null,
    });

    await expect(
      backend.updateRuntimeConfig({
        version: "1.0",
        routingStrategy: "hybrid",
        executionMode: "hybrid",
        llamaSwap: {
          enabled: true,
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
          enabled: true,
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
          routingStrategy: "hybrid",
        }),
      }),
    );

    await expect(readFile(unifiedRuntimeConfigPath, "utf8")).resolves.toContain("strategy: hybrid");

    await backend.shutdown();
  });

  test("persists explicit hybrid execution mode from routing strategy updates", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-run49-execution-mode-"));
    tempRoots.push(tempRoot);
    const runtimeStateRoot = path.join(tempRoot, "state");
    const unifiedRuntimeConfigPath = path.join(tempRoot, "runtime-config.yaml");

    await writeFile(
      unifiedRuntimeConfigPath,
      [
        'version: "1.0"',
        "llama_swap:",
        "  models:",
        "    lfm2.5-1.2b-instruct:",
        '      path: "./models/lfm2.5-1.2b-instruct.gguf"',
        "",
      ].join("\n"),
      "utf8",
    );

    const backend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: testFixtureRoot,
      runtimeStateRoot,
      scopeId: "runtime-host-explicit-execution-mode",
      unifiedRuntimeConfigPath,
      runtimeVendorStartup: "disabled",
    });

    const updated = await backend.updateRuntimeConfig({
      version: "1.1",
      routingStrategy: "controller",
      executionMode: "hybrid",
      llamaSwap: {
        enabled: true,
        models: [
          {
            modelId: "lfm2.5-1.2b-instruct",
            path: "./models/lfm2.5-1.2b-instruct.gguf",
          },
        ],
        process: {
          command: null,
          args: [],
          env: {},
          cwd: null,
          startupTimeoutMs: null,
        },
      },
      liteLLM: {
        enabled: false,
        providers: [],
        process: {
          command: null,
          args: [],
          env: {},
          cwd: null,
          startupTimeoutMs: null,
        },
      },
    });

    expect(updated.config?.executionMode).toBe("hybrid");
    await expect(readFile(unifiedRuntimeConfigPath, "utf8")).resolves.toContain(
      "execution_mode: hybrid",
    );
    await expect(backend.readRouterSummary()).resolves.toEqual(
      expect.objectContaining({
        strategy: "controller",
        executionMode: "hybrid",
      }),
    );

    await backend.shutdown();
  });

  test("bootstraps the primary routing alias when routing posture is saved without preconfigured aliases", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-run50-routing-bootstrap-"));
    tempRoots.push(tempRoot);
    const runtimeStateRoot = path.join(tempRoot, "state");
    const unifiedRuntimeConfigPath = path.join(tempRoot, "runtime-config.yaml");

    await writeFile(
      unifiedRuntimeConfigPath,
      [
        'version: "1.0"',
        "llama_swap:",
        "  models:",
        "    lfm2.5-1.2b-instruct:",
        '      path: "./models/lfm2.5-1.2b-instruct.gguf"',
        "litellm_proxy:",
        '  command: "node"',
        "  args:",
        '    - "-e"',
        `    - 'const http=require("node:http");const port=Number(process.env.PORT);const server=http.createServer((req,res)=>{if(req.url==="/health/liveliness"){res.statusCode=200;res.end("ok");return;}res.statusCode=404;res.end("missing");});server.listen(port,"127.0.0.1");const shutdown=()=>server.close(()=>process.exit(0));process.on("SIGTERM",shutdown);process.on("SIGINT",shutdown);'`,
        "  providers:",
        "    moonshot:",
        '      api_key: "${MOONSHOT_API_KEY}"',
        "      model_list:",
        '        - model_name: "moonshot/kimi-k2.7-code"',
        "          litellm_params:",
        '            model: "moonshot/kimi-k2.7-code"',
        '            api_base: "https://api.moonshot.ai/v1"',
        "",
      ].join("\n"),
      "utf8",
    );

    const backend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: testFixtureRoot,
      runtimeStateRoot,
      scopeId: "runtime-host-routing-bootstrap",
      unifiedRuntimeConfigPath,
    });

    const updated = await backend.updateRuntimeConfig({
      routingStrategy: "controller",
      executionMode: "hybrid",
    });

    expect(updated.config?.modelAliases).toHaveLength(20);
    expect(updated.config?.modelAliases).toEqual(
      expect.arrayContaining([
        {
          aliasId: "controller.hybrid",
          mode: "intelligent",
          modelIds: ["lfm2.5-1.2b-instruct", "moonshot/kimi-k2.7-code"],
        },
      ]),
    );
    await expect(backend.readRouterSummary()).resolves.toEqual(
      expect.objectContaining({
        strategy: "controller",
        executionMode: "hybrid",
        aliasInventory: expect.arrayContaining([
          expect.objectContaining({
            aliasId: "controller.hybrid",
            mode: "intelligent",
            configuredHintModelIds: ["lfm2.5-1.2b-instruct", "moonshot/kimi-k2.7-code"],
            allowEndpointIds: expect.any(Array),
            resolvedModelIds: expect.arrayContaining([
              "lfm2.5-1.2b-instruct",
              "moonshot/kimi-k2.7-code",
            ]),
          }),
        ]),
      }),
    );
    await expect(readFile(unifiedRuntimeConfigPath, "utf8")).resolves.toContain(
      "controller.hybrid:",
    );

    await backend.shutdown();
  }, 60_000);

  test("bootstraps a settings-specific primary routing alias for remote-only posture without preconfigured aliases", async () => {
    const tempRoot = await mkdtemp(
      path.join(os.tmpdir(), "role-model-run50-routing-bootstrap-remote-only-"),
    );
    tempRoots.push(tempRoot);
    const runtimeStateRoot = path.join(tempRoot, "state");
    const unifiedRuntimeConfigPath = path.join(tempRoot, "runtime-config.yaml");

    await writeFile(
      unifiedRuntimeConfigPath,
      [
        'version: "1.0"',
        "llama_swap:",
        "  models:",
        "    lfm2.5-1.2b-instruct:",
        '      path: "./models/lfm2.5-1.2b-instruct.gguf"',
        "litellm_proxy:",
        '  command: "node"',
        "  args:",
        '    - "-e"',
        `    - 'const http=require("node:http");const port=Number(process.env.PORT);const server=http.createServer((req,res)=>{if(req.url==="/health/liveliness"){res.statusCode=200;res.end("ok");return;}res.statusCode=404;res.end("missing");});server.listen(port,"127.0.0.1");const shutdown=()=>server.close(()=>process.exit(0));process.on("SIGTERM",shutdown);process.on("SIGINT",shutdown);'`,
        "  providers:",
        "    moonshot:",
        '      api_key: "${MOONSHOT_API_KEY}"',
        "      model_list:",
        '        - model_name: "moonshot/kimi-k2.7-code"',
        "          litellm_params:",
        '            model: "moonshot/kimi-k2.7-code"',
        '            api_base: "https://api.moonshot.ai/v1"',
        "",
      ].join("\n"),
      "utf8",
    );

    const backend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: testFixtureRoot,
      runtimeStateRoot,
      scopeId: "runtime-host-routing-bootstrap-remote-only",
      unifiedRuntimeConfigPath,
    });

    const updated = await backend.updateRuntimeConfig({
      routingStrategy: "difficulty",
      executionMode: "remote_only",
    });

    expect(updated.config?.modelAliases).toHaveLength(20);
    expect(updated.config?.modelAliases).toEqual(
      expect.arrayContaining([
        {
          aliasId: "difficulty.remote-only",
          mode: "difficulty",
          modelIds: ["moonshot/kimi-k2.7-code"],
        },
      ]),
    );
    await expect(backend.readRouterSummary()).resolves.toEqual(
      expect.objectContaining({
        strategy: "difficulty",
        executionMode: "remote_only",
        aliasInventory: expect.arrayContaining([
          expect.objectContaining({
            aliasId: "difficulty.remote-only",
            configuredHintModelIds: ["moonshot/kimi-k2.7-code"],
            allowEndpointIds: expect.any(Array),
            resolvedModelIds: ["moonshot/kimi-k2.7-code"],
          }),
        ]),
      }),
    );
    await expect(readFile(unifiedRuntimeConfigPath, "utf8")).resolves.toContain(
      "difficulty.remote-only:",
    );

    await backend.shutdown();
  }, 60_000);

  test("maintains the routing alias matrix across strategy families and execution modes", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-run50-routing-matrix-"));
    tempRoots.push(tempRoot);
    const runtimeStateRoot = path.join(tempRoot, "state");
    const unifiedRuntimeConfigPath = path.join(tempRoot, "runtime-config.yaml");

    await writeFile(
      unifiedRuntimeConfigPath,
      [
        'version: "1.0"',
        "llama_swap:",
        "  models:",
        "    lfm2.5-1.2b-instruct:",
        '      path: "./models/lfm2.5-1.2b-instruct.gguf"',
        "litellm_proxy:",
        '  command: "node"',
        "  args:",
        '    - "-e"',
        `    - 'const http=require("node:http");const port=Number(process.env.PORT);const server=http.createServer((req,res)=>{if(req.url==="/health/liveliness"){res.statusCode=200;res.end("ok");return;}res.statusCode=404;res.end("missing");});server.listen(port,"127.0.0.1");const shutdown=()=>server.close(()=>process.exit(0));process.on("SIGTERM",shutdown);process.on("SIGINT",shutdown);'`,
        "  providers:",
        "    moonshot:",
        '      api_key: "${MOONSHOT_API_KEY}"',
        "      model_list:",
        '        - model_name: "moonshot/kimi-k2.7-code"',
        "          litellm_params:",
        '            model: "moonshot/kimi-k2.7-code"',
        '            api_base: "https://api.moonshot.ai/v1"',
        "",
      ].join("\n"),
      "utf8",
    );

    const backend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: testFixtureRoot,
      runtimeStateRoot,
      scopeId: "runtime-host-routing-matrix",
      unifiedRuntimeConfigPath,
    });

    const strategyCases = [
      { routingStrategy: null, aliasPrefix: "default", aliasMode: "basic" },
      { routingStrategy: "baseline", aliasPrefix: "baseline", aliasMode: "basic" },
      { routingStrategy: "latency-first", aliasPrefix: "baseline", aliasMode: "basic" },
      { routingStrategy: "controller", aliasPrefix: "controller", aliasMode: "intelligent" },
      { routingStrategy: "intelligent", aliasPrefix: "controller", aliasMode: "intelligent" },
      { routingStrategy: "difficulty", aliasPrefix: "difficulty", aliasMode: "difficulty" },
      { routingStrategy: "hybrid", aliasPrefix: "hybrid", aliasMode: "hybrid" },
    ] as const;
    const executionModeCases = [
      {
        executionMode: "decision_only" as const,
        modelIds: ["lfm2.5-1.2b-instruct", "moonshot/kimi-k2.7-code"],
      },
      {
        executionMode: "hybrid" as const,
        modelIds: ["lfm2.5-1.2b-instruct", "moonshot/kimi-k2.7-code"],
      },
      {
        executionMode: "local_only" as const,
        modelIds: ["lfm2.5-1.2b-instruct"],
      },
      {
        executionMode: "remote_only" as const,
        modelIds: ["moonshot/kimi-k2.7-code"],
      },
    ];

    for (const strategyCase of strategyCases) {
      for (const executionModeCase of executionModeCases) {
        const updated = await backend.updateRuntimeConfig({
          routingStrategy: strategyCase.routingStrategy,
          executionMode: executionModeCase.executionMode,
        });
        const expectedAliasId = `${strategyCase.aliasPrefix}.${executionModeCase.executionMode.replaceAll(
          "_",
          "-",
        )}`;

        expect(updated.config?.modelAliases).toHaveLength(20);
        expect(updated.config?.modelAliases).toEqual(
          expect.arrayContaining([
            {
              aliasId: expectedAliasId,
              mode: strategyCase.aliasMode,
              modelIds: executionModeCase.modelIds,
            },
          ]),
        );
        await expect(backend.readRouterSummary()).resolves.toEqual(
          expect.objectContaining({
            strategy: strategyCase.routingStrategy,
            executionMode: executionModeCase.executionMode,
            aliasInventory: expect.arrayContaining([
              expect.objectContaining({
                aliasId: expectedAliasId,
                mode: strategyCase.aliasMode,
                configuredHintModelIds: executionModeCase.modelIds,
                resolvedModelIds: executionModeCase.modelIds,
              }),
            ]),
          }),
        );
      }
    }

    await backend.shutdown();
  }, 60_000);

  test("persists the full canonical routing alias matrix instead of a single primary alias", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-run50-routing-matrix-"));
    tempRoots.push(tempRoot);
    const runtimeStateRoot = path.join(tempRoot, "state");
    const unifiedRuntimeConfigPath = path.join(tempRoot, "runtime-config.yaml");

    await writeFile(
      unifiedRuntimeConfigPath,
      [
        'version: "1.0"',
        "llama_swap:",
        "  models:",
        "    lfm2.5-1.2b-instruct:",
        '      path: "./models/lfm2.5-1.2b-instruct.gguf"',
        "litellm_proxy:",
        '  command: "node"',
        "  args:",
        '    - "-e"',
        `    - 'const http=require("node:http");const port=Number(process.env.PORT);const server=http.createServer((req,res)=>{if(req.url==="/health/liveliness"){res.statusCode=200;res.end("ok");return;}res.statusCode=404;res.end("missing");});server.listen(port,"127.0.0.1");const shutdown=()=>server.close(()=>process.exit(0));process.on("SIGTERM",shutdown);process.on("SIGINT",shutdown);'`,
        "  providers:",
        "    moonshot:",
        '      api_key: "${MOONSHOT_API_KEY}"',
        "      model_list:",
        '        - model_name: "moonshot/kimi-k2.7-code"',
        "          litellm_params:",
        '            model: "moonshot/kimi-k2.7-code"',
        '            api_base: "https://api.moonshot.ai/v1"',
        "",
      ].join("\n"),
      "utf8",
    );

    const backend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: testFixtureRoot,
      runtimeStateRoot,
      scopeId: "runtime-host-full-routing-matrix",
      unifiedRuntimeConfigPath,
    });

    const updated = await backend.updateRuntimeConfig({
      routingStrategy: "controller",
      executionMode: "hybrid",
    });

    const aliasInventory = updated.config?.modelAliases ?? [];
    const aliasIds = aliasInventory.map((alias) => alias.aliasId);
    expect(aliasIds).toHaveLength(20);
    expect(aliasIds).toEqual(
      expect.arrayContaining([
        "default.decision-only",
        "default.hybrid",
        "default.local-only",
        "default.remote-only",
        "baseline.decision-only",
        "baseline.hybrid",
        "baseline.local-only",
        "baseline.remote-only",
        "controller.decision-only",
        "controller.hybrid",
        "controller.local-only",
        "controller.remote-only",
        "difficulty.decision-only",
        "difficulty.hybrid",
        "difficulty.local-only",
        "difficulty.remote-only",
        "hybrid.decision-only",
        "hybrid.hybrid",
        "hybrid.local-only",
        "hybrid.remote-only",
      ]),
    );
    expect(aliasInventory).toEqual(
      expect.arrayContaining([
        {
          aliasId: "controller.remote-only",
          mode: "intelligent",
          modelIds: ["moonshot/kimi-k2.7-code"],
        },
        {
          aliasId: "difficulty.local-only",
          mode: "difficulty",
          modelIds: ["lfm2.5-1.2b-instruct"],
        },
        {
          aliasId: "default.decision-only",
          mode: "basic",
          modelIds: ["lfm2.5-1.2b-instruct", "moonshot/kimi-k2.7-code"],
        },
      ]),
    );

    const rendered = await readFile(unifiedRuntimeConfigPath, "utf8");
    expect(rendered).toContain("controller.remote-only:");
    expect(rendered).toContain("difficulty.local-only:");
    expect(rendered).toContain("default.decision-only:");

    await backend.shutdown();
  }, 60_000);

  test("normalizes legacy craft-ask routing strategy updates to the default alias family", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-run50-routing-legacy-"));
    tempRoots.push(tempRoot);
    const runtimeStateRoot = path.join(tempRoot, "state");
    const unifiedRuntimeConfigPath = path.join(tempRoot, "runtime-config.yaml");

    await writeFile(
      unifiedRuntimeConfigPath,
      [
        'version: "1.0"',
        "llama_swap:",
        "  models:",
        "    lfm2.5-1.2b-instruct:",
        '      path: "./models/lfm2.5-1.2b-instruct.gguf"',
        "",
      ].join("\n"),
      "utf8",
    );

    const backend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: testFixtureRoot,
      runtimeStateRoot,
      scopeId: "runtime-host-legacy-craft-ask",
      unifiedRuntimeConfigPath,
    });

    const updated = await backend.updateRuntimeConfig({
      routingStrategy: "craft-ask",
      executionMode: "local_only",
    });

    expect(updated.config?.routingStrategy).toBeNull();
    expect(updated.config?.modelAliases).toEqual(
      expect.arrayContaining([
        {
          aliasId: "default.local-only",
          mode: "basic",
          modelIds: ["lfm2.5-1.2b-instruct"],
        },
      ]),
    );
    expect(
      updated.config?.modelAliases?.some((alias) => alias.aliasId.startsWith("craft-ask.")),
    ).toBe(false);

    await backend.shutdown();
  }, 60_000);

  test("rewrites persisted craft-ask alias ids out of startup config materialization", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-run50-legacy-aliases-"));
    tempRoots.push(tempRoot);
    const runtimeStateRoot = path.join(tempRoot, "state");
    const unifiedRuntimeConfigPath = path.join(tempRoot, "runtime-config.yaml");

    await writeFile(
      unifiedRuntimeConfigPath,
      [
        'version: "1.0"',
        'execution_mode: "remote_only"',
        "model_aliases:",
        "  craft-ask.remote-only:",
        '    mode: "basic"',
        "    model_ids:",
        '      - "chatgpt/gpt-5.4"',
        "litellm_proxy:",
        '  command: "node"',
        "  args:",
        '    - "-e"',
        `    - 'const http=require("node:http");const port=Number(process.env.PORT);const server=http.createServer((req,res)=>{if(req.url==="/health/liveliness"){res.statusCode=200;res.end("ok");return;}res.statusCode=404;res.end("missing");});server.listen(port,"127.0.0.1");const shutdown=()=>server.close(()=>process.exit(0));process.on("SIGTERM",shutdown);process.on("SIGINT",shutdown);'`,
        "  providers:",
        "    openai:",
        '      api_key: "${OPENAI_API_KEY}"',
        "      model_list:",
        '        - model_name: "chatgpt/gpt-5.4"',
        "          litellm_params:",
        '            model: "openai/gpt-5.4"',
        "",
      ].join("\n"),
      "utf8",
    );

    const backend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: testFixtureRoot,
      runtimeStateRoot,
      scopeId: "runtime-host-legacy-craft-ask-aliases",
      unifiedRuntimeConfigPath,
    });

    await expect(backend.readRuntimeConfig()).resolves.toEqual(
      expect.objectContaining({
        config: expect.objectContaining({
          modelAliases: expect.arrayContaining([
            expect.objectContaining({
              aliasId: "default.remote-only",
              mode: "basic",
              modelIds: ["chatgpt/gpt-5.4"],
            }),
          ]),
        }),
      }),
    );
    await expect(backend.readRuntimeConfig()).resolves.toEqual(
      expect.objectContaining({
        config: expect.objectContaining({
          modelAliases: expect.not.arrayContaining([
            expect.objectContaining({
              aliasId: "craft-ask.remote-only",
            }),
          ]),
        }),
      }),
    );

    const rendered = await readFile(unifiedRuntimeConfigPath, "utf8");
    expect(rendered).toContain("default.remote-only:");
    expect(rendered).not.toContain("craft-ask.remote-only:");

    await backend.shutdown();
  }, 60_000);

  test("rewrites legacy craft-ask matrix rows from persisted config even when the canonical matrix already exists", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-run50-legacy-alias-matrix-"));
    tempRoots.push(tempRoot);
    const runtimeStateRoot = path.join(tempRoot, "state");
    const unifiedRuntimeConfigPath = path.join(tempRoot, "runtime-config.yaml");

    await writeFile(
      unifiedRuntimeConfigPath,
      [
        'version: "1.0"',
        'execution_mode: "remote_only"',
        "model_aliases:",
        "  default.decision-only:",
        '    mode: "basic"',
        "    model_ids:",
        '      - "chatgpt/gpt-5.4"',
        "  baseline.decision-only:",
        '    mode: "basic"',
        "    model_ids:",
        '      - "chatgpt/gpt-5.4"',
        "  controller.decision-only:",
        '    mode: "intelligent"',
        "    model_ids:",
        '      - "chatgpt/gpt-5.4"',
        "  difficulty.decision-only:",
        '    mode: "difficulty"',
        "    model_ids:",
        '      - "chatgpt/gpt-5.4"',
        "  hybrid.decision-only:",
        '    mode: "hybrid"',
        "    model_ids:",
        '      - "chatgpt/gpt-5.4"',
        "  craft-ask.decision-only:",
        '    mode: "basic"',
        "    model_ids:",
        '      - "chatgpt/gpt-5.4"',
        "  default.remote-only:",
        '    mode: "basic"',
        "    model_ids:",
        '      - "chatgpt/gpt-5.4"',
        "  default.hybrid:",
        '    mode: "basic"',
        "    model_ids:",
        '      - "chatgpt/gpt-5.4"',
        "  baseline.hybrid:",
        '    mode: "basic"',
        "    model_ids:",
        '      - "chatgpt/gpt-5.4"',
        "  controller.hybrid:",
        '    mode: "intelligent"',
        "    model_ids:",
        '      - "chatgpt/gpt-5.4"',
        "  difficulty.hybrid:",
        '    mode: "difficulty"',
        "    model_ids:",
        '      - "chatgpt/gpt-5.4"',
        "  hybrid.hybrid:",
        '    mode: "hybrid"',
        "    model_ids:",
        '      - "chatgpt/gpt-5.4"',
        "  craft-ask.hybrid:",
        '    mode: "basic"',
        "    model_ids:",
        '      - "chatgpt/gpt-5.4"',
        "  baseline.remote-only:",
        '    mode: "basic"',
        "    model_ids:",
        '      - "chatgpt/gpt-5.4"',
        "  controller.remote-only:",
        '    mode: "intelligent"',
        "    model_ids:",
        '      - "chatgpt/gpt-5.4"',
        "  difficulty.remote-only:",
        '    mode: "difficulty"',
        "    model_ids:",
        '      - "chatgpt/gpt-5.4"',
        "  hybrid.remote-only:",
        '    mode: "hybrid"',
        "    model_ids:",
        '      - "chatgpt/gpt-5.4"',
        "  craft-ask.remote-only:",
        '    mode: "basic"',
        "    model_ids:",
        '      - "chatgpt/gpt-5.4"',
        "litellm_proxy:",
        '  command: "node"',
        "  args:",
        '    - "-e"',
        `    - 'const http=require("node:http");const port=Number(process.env.PORT);const server=http.createServer((req,res)=>{if(req.url==="/health/liveliness"){res.statusCode=200;res.end("ok");return;}res.statusCode=404;res.end("missing");});server.listen(port,"127.0.0.1");const shutdown=()=>server.close(()=>process.exit(0));process.on("SIGTERM",shutdown);process.on("SIGINT",shutdown);'`,
        "  providers:",
        "    openai:",
        '      api_key: "${OPENAI_API_KEY}"',
        "      model_list:",
        '        - model_name: "chatgpt/gpt-5.4"',
        "          litellm_params:",
        '            model: "openai/gpt-5.4"',
        "",
      ].join("\n"),
      "utf8",
    );

    const backend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: testFixtureRoot,
      runtimeStateRoot,
      scopeId: "runtime-host-legacy-craft-ask-matrix",
      unifiedRuntimeConfigPath,
    });

    const rendered = await readFile(unifiedRuntimeConfigPath, "utf8");
    expect(rendered).toContain("default.remote-only:");
    expect(rendered).not.toContain("craft-ask.decision-only:");
    expect(rendered).not.toContain("craft-ask.remote-only:");

    await backend.shutdown();
  }, 60_000);

  test("rewrites legacy craft-ask matrix rows from persisted config even when startup does not need to re-materialize aliases", async () => {
    const tempRoot = await mkdtemp(
      path.join(os.tmpdir(), "role-model-run50-legacy-alias-no-remat-"),
    );
    tempRoots.push(tempRoot);
    const runtimeStateRoot = path.join(tempRoot, "state");
    const unifiedRuntimeConfigPath = path.join(tempRoot, "runtime-config.yaml");

    await writeFile(
      unifiedRuntimeConfigPath,
      [
        'version: "1.0"',
        'execution_mode: "remote_only"',
        "routing:",
        "  strategy: difficulty",
        "controller:",
        "  enabled: true",
        "  source_type: remote",
        '  model_id: "deepseek/deepseek-v4-flash"',
        "  timeout_ms: 20000",
        "model_aliases:",
        "  default.decision-only:",
        '    mode: "basic"',
        "    model_ids:",
        '      - "chatgpt/gpt-5.4"',
        '      - "deepseek/deepseek-v4-flash"',
        '      - "deepseek/deepseek-v4-pro"',
        '      - "moonshot/kimi-k2.7-code"',
        "  baseline.decision-only:",
        '    mode: "basic"',
        "    model_ids:",
        '      - "chatgpt/gpt-5.4"',
        '      - "deepseek/deepseek-v4-flash"',
        '      - "deepseek/deepseek-v4-pro"',
        '      - "moonshot/kimi-k2.7-code"',
        "  controller.decision-only:",
        '    mode: "intelligent"',
        "    model_ids:",
        '      - "chatgpt/gpt-5.4"',
        '      - "deepseek/deepseek-v4-flash"',
        '      - "deepseek/deepseek-v4-pro"',
        '      - "moonshot/kimi-k2.7-code"',
        "  difficulty.decision-only:",
        '    mode: "difficulty"',
        "    model_ids:",
        '      - "chatgpt/gpt-5.4"',
        '      - "deepseek/deepseek-v4-flash"',
        '      - "deepseek/deepseek-v4-pro"',
        '      - "moonshot/kimi-k2.7-code"',
        "  hybrid.decision-only:",
        '    mode: "hybrid"',
        "    model_ids:",
        '      - "chatgpt/gpt-5.4"',
        '      - "deepseek/deepseek-v4-flash"',
        '      - "deepseek/deepseek-v4-pro"',
        '      - "moonshot/kimi-k2.7-code"',
        "  craft-ask.decision-only:",
        '    mode: "basic"',
        "    model_ids:",
        '      - "chatgpt/gpt-5.4"',
        '      - "deepseek/deepseek-v4-flash"',
        '      - "deepseek/deepseek-v4-pro"',
        '      - "moonshot/kimi-k2.7-code"',
        "  default.hybrid:",
        '    mode: "basic"',
        "    model_ids:",
        '      - "chatgpt/gpt-5.4"',
        '      - "deepseek/deepseek-v4-flash"',
        '      - "deepseek/deepseek-v4-pro"',
        '      - "moonshot/kimi-k2.7-code"',
        "  baseline.hybrid:",
        '    mode: "basic"',
        "    model_ids:",
        '      - "chatgpt/gpt-5.4"',
        '      - "deepseek/deepseek-v4-flash"',
        '      - "deepseek/deepseek-v4-pro"',
        '      - "moonshot/kimi-k2.7-code"',
        "  controller.hybrid:",
        '    mode: "intelligent"',
        "    model_ids:",
        '      - "chatgpt/gpt-5.4"',
        '      - "deepseek/deepseek-v4-flash"',
        '      - "deepseek/deepseek-v4-pro"',
        '      - "moonshot/kimi-k2.7-code"',
        "  difficulty.hybrid:",
        '    mode: "difficulty"',
        "    model_ids:",
        '      - "chatgpt/gpt-5.4"',
        '      - "deepseek/deepseek-v4-flash"',
        '      - "deepseek/deepseek-v4-pro"',
        '      - "moonshot/kimi-k2.7-code"',
        "  hybrid.hybrid:",
        '    mode: "hybrid"',
        "    model_ids:",
        '      - "chatgpt/gpt-5.4"',
        '      - "deepseek/deepseek-v4-flash"',
        '      - "deepseek/deepseek-v4-pro"',
        '      - "moonshot/kimi-k2.7-code"',
        "  craft-ask.hybrid:",
        '    mode: "basic"',
        "    model_ids:",
        '      - "chatgpt/gpt-5.4"',
        '      - "deepseek/deepseek-v4-flash"',
        '      - "deepseek/deepseek-v4-pro"',
        '      - "moonshot/kimi-k2.7-code"',
        "  default.remote-only:",
        '    mode: "basic"',
        "    model_ids:",
        '      - "chatgpt/gpt-5.4"',
        '      - "deepseek/deepseek-v4-flash"',
        '      - "deepseek/deepseek-v4-pro"',
        '      - "moonshot/kimi-k2.7-code"',
        "  baseline.remote-only:",
        '    mode: "basic"',
        "    model_ids:",
        '      - "chatgpt/gpt-5.4"',
        '      - "deepseek/deepseek-v4-flash"',
        '      - "deepseek/deepseek-v4-pro"',
        '      - "moonshot/kimi-k2.7-code"',
        "  controller.remote-only:",
        '    mode: "intelligent"',
        "    model_ids:",
        '      - "chatgpt/gpt-5.4"',
        '      - "deepseek/deepseek-v4-flash"',
        '      - "deepseek/deepseek-v4-pro"',
        '      - "moonshot/kimi-k2.7-code"',
        "  difficulty.remote-only:",
        '    mode: "difficulty"',
        "    model_ids:",
        '      - "chatgpt/gpt-5.4"',
        '      - "deepseek/deepseek-v4-flash"',
        '      - "deepseek/deepseek-v4-pro"',
        '      - "moonshot/kimi-k2.7-code"',
        "  hybrid.remote-only:",
        '    mode: "hybrid"',
        "    model_ids:",
        '      - "chatgpt/gpt-5.4"',
        '      - "deepseek/deepseek-v4-flash"',
        '      - "deepseek/deepseek-v4-pro"',
        '      - "moonshot/kimi-k2.7-code"',
        "  craft-ask.remote-only:",
        '    mode: "basic"',
        "    model_ids:",
        '      - "chatgpt/gpt-5.4"',
        '      - "deepseek/deepseek-v4-flash"',
        '      - "deepseek/deepseek-v4-pro"',
        '      - "moonshot/kimi-k2.7-code"',
        "",
      ].join("\n"),
      "utf8",
    );

    const backend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: testFixtureRoot,
      runtimeStateRoot,
      scopeId: "runtime-host-legacy-craft-ask-no-remat",
      unifiedRuntimeConfigPath,
    });

    const rendered = await readFile(unifiedRuntimeConfigPath, "utf8");
    expect(rendered).not.toContain("craft-ask.decision-only:");
    expect(rendered).not.toContain("craft-ask.hybrid:");
    expect(rendered).not.toContain("craft-ask.remote-only:");

    await backend.shutdown();
  }, 60_000);

  test("renames the primary routing alias when routing strategy and execution mode change", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-run49-routing-alias-"));
    tempRoots.push(tempRoot);
    const runtimeStateRoot = path.join(tempRoot, "state");
    const unifiedRuntimeConfigPath = path.join(tempRoot, "runtime-config.yaml");

    await writeFile(
      unifiedRuntimeConfigPath,
      [
        'version: "1.0"',
        "routing:",
        "  strategy: difficulty",
        "execution_mode: hybrid",
        "model_aliases:",
        "  mixed.local-remote:",
        "    mode: difficulty",
        "    model_ids:",
        "      - lfm2.5-1.2b-instruct",
        "      - moonshot/kimi-k2.7-code",
        "",
      ].join("\n"),
      "utf8",
    );

    const backend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: testFixtureRoot,
      runtimeStateRoot,
      scopeId: "runtime-host-routing-alias-rename",
      unifiedRuntimeConfigPath,
    });

    const updated = await backend.updateRuntimeConfig({
      routingStrategy: "hybrid",
      executionMode: "remote_only",
    });

    expect(updated.config?.modelAliases).toEqual([
      expect.objectContaining({
        aliasId: "hybrid.remote-only",
        mode: "hybrid",
        modelIds: ["lfm2.5-1.2b-instruct", "moonshot/kimi-k2.7-code"],
      }),
    ]);
    await expect(backend.readRouterSummary()).resolves.toEqual(
      expect.objectContaining({
        strategy: "hybrid",
        executionMode: "remote_only",
        aliasInventory: expect.arrayContaining([
          expect.objectContaining({
            aliasId: "hybrid.remote-only",
            mode: "hybrid",
          }),
        ]),
      }),
    );
    const rendered = await readFile(unifiedRuntimeConfigPath, "utf8");
    expect(rendered).toContain("hybrid.remote-only:");
    expect(rendered).not.toContain("mixed.local-remote:");

    await backend.shutdown();
  });

  test("does not mark all candidates ignored when routing guidance has no preferred endpoints", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-run35-router-guidance-"));
    tempRoots.push(tempRoot);
    const runtimeStateRoot = path.join(tempRoot, "state");
    const fixtureRoot = path.join(tempRoot, "fixtures");

    await cp(testFixtureRoot, fixtureRoot, { recursive: true });
    await writeFile(
      path.join(fixtureRoot, "routing-model-guidance.json"),
      JSON.stringify(
        {
          endpointId: null,
          preferredEndpointIds: [],
        },
        null,
        2,
      ),
      "utf8",
    );

    const backend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot,
      runtimeStateRoot,
      scopeId: "runtime-host-router-guidance",
    });

    await expect(backend.readRouterSummary()).resolves.toEqual(
      expect.objectContaining({
        guidance: expect.objectContaining({
          preferredEndpointIds: [],
          ignoredEndpointIds: [],
        }),
      }),
    );

    await expect(backend.listRouterCandidates()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          endpointId: "test.capture.chat-v1",
          preferred: false,
          ignored: false,
        }),
      ]),
    );

    await backend.shutdown();
  });

  test("preserves synthesized activated endpoint models across runtime config updates", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-run35-synth-models-"));
    tempRoots.push(tempRoot);
    const runtimeStateRoot = path.join(tempRoot, "state");
    const unifiedRuntimeConfigPath = path.join(tempRoot, "runtime-config.yaml");

    await writeFile(
      unifiedRuntimeConfigPath,
      ['version: "1.0"', "routing:", "  strategy: difficulty", ""].join("\n"),
      "utf8",
    );

    const backend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: testFixtureRoot,
      runtimeStateRoot,
      scopeId: "runtime-host-synth-models",
      unifiedRuntimeConfigPath,
    });

    await backend.updatePeers([
      {
        id: "integration-test",
        url: "http://127.0.0.1:1234",
      },
    ]);

    await backend.activateEndpoint({
      providerAccountId: "local-openai-compatible.personal.integration-test",
      modelId: "lfm2.5-1.2b-instruct",
      region: "local",
      endpointKind: "local-openai-compatible",
      servingSource: "local-peer",
    });

    await expect(
      backend.updateRuntimeConfig({
        version: "1.0",
        routingStrategy: "difficulty",
        executionMode: "decision_only",
        llamaSwap: {
          enabled: false,
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
          enabled: false,
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
          routingStrategy: "difficulty",
          executionMode: "decision_only",
        }),
      }),
    );

    await expect(backend.listEndpoints()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          endpointId:
            "local-openai-compatible.personal.integration-test.local.lfm2.5-1.2b-instruct",
          modelId: "lfm2.5-1.2b-instruct",
        }),
      ]),
    );

    await expect(backend.listRouterCandidates()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          endpointId:
            "local-openai-compatible.personal.integration-test.local.lfm2.5-1.2b-instruct",
          modelId: "lfm2.5-1.2b-instruct",
          sourceType: "local",
        }),
      ]),
    );

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

  test("preserves manual account authority and provenance on exact runtime-config account-id collision", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-run47-account-collision-"));
    tempRoots.push(tempRoot);
    const runtimeStateRoot = path.join(tempRoot, "state");
    const unifiedRuntimeConfigPath = path.join(tempRoot, "runtime-config.yaml");
    const originalManualApiKey = process.env.MANUAL_MOONSHOT_API_KEY;
    const originalRuntimeConfigApiKey = process.env.RUNTIME_CONFIG_MOONSHOT_API_KEY;
    process.env.MANUAL_MOONSHOT_API_KEY = "manual-moonshot-key";
    process.env.RUNTIME_CONFIG_MOONSHOT_API_KEY = "runtime-config-moonshot-key";

    const manualBackend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: testFixtureRoot,
      runtimeStateRoot,
      scopeId: "runtime-host-account-collision",
    });

    try {
      await manualBackend.upsertProviderAccount({
        providerAccountId: "moonshot.litellm",
        providerId: "moonshot",
        providerKind: "provider-openai",
        orgScope: "personal",
        accountScope: "workspace-default",
        credentialRef: {
          backend: "env",
          ref: "MANUAL_MOONSHOT_API_KEY",
        },
        authMode: "api-key-static",
        regionPolicy: {
          mode: "prefer",
          regions: ["global"],
        },
        baseUrlOverride: "https://manual.moonshot.example/v1",
        allowedModels: ["moonshot/kimi-k2.6"],
        modelRoleBindings: [
          {
            modelId: "moonshot/kimi-k2.6",
            roleIds: ["writer"],
          },
        ],
        deniedModels: [],
        entitlementTags: ["chat"],
        budgetPolicyRef: "budget.default",
        quotaPolicyRef: "quota.default",
        status: "active",
        healthStatus: "healthy",
        rotationState: "stable",
      });
      await manualBackend.shutdown();

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
          '      api_key: "${RUNTIME_CONFIG_MOONSHOT_API_KEY}"',
          "      model_list:",
          '        - model_name: "moonshot/kimi-k2.5"',
          "          litellm_params:",
          '            model: "moonshot/kimi-k2.5"',
          '            api_base: "https://api.moonshot.ai/v1"',
          "",
        ].join("\n"),
        "utf8",
      );

      const mergedBackend = await createRuntimeBridgeBackend({
        repoRoot,
        fixtureRoot: testFixtureRoot,
        runtimeStateRoot,
        scopeId: "runtime-host-account-collision",
        unifiedRuntimeConfigPath,
      });

      try {
        const accounts = await mergedBackend.listAccounts();
        const mergedAccounts = accounts.filter(
          (account) => account.providerAccountId === "moonshot.litellm",
        );
        expect(mergedAccounts).toHaveLength(1);
        expect(mergedAccounts[0]).toEqual(
          expect.objectContaining({
            providerAccountId: "moonshot.litellm",
            orgScope: "personal",
            accountScope: "workspace-default",
            credentialRef: {
              backend: "env",
              ref: "MANUAL_MOONSHOT_API_KEY",
            },
            allowedModels: expect.arrayContaining(["moonshot/kimi-k2.5", "moonshot/kimi-k2.6"]),
            modelRoleBindings: expect.arrayContaining([
              expect.objectContaining({
                modelId: "moonshot/kimi-k2.6",
                roleIds: ["writer"],
              }),
            ]),
          }),
        );

        const summary = await mergedBackend.readRuntimeSummary();
        expect(summary.credentialLifecycle.accounts).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              logicalAccountId: "moonshot.litellm",
              providerAccountId: "moonshot.litellm",
              sourceProvenance: ["manual", "runtime-config"],
            }),
          ]),
        );
      } finally {
        await mergedBackend.shutdown();
      }
    } finally {
      if (originalManualApiKey === undefined) {
        delete process.env.MANUAL_MOONSHOT_API_KEY;
      } else {
        process.env.MANUAL_MOONSHOT_API_KEY = originalManualApiKey;
      }
      if (originalRuntimeConfigApiKey === undefined) {
        delete process.env.RUNTIME_CONFIG_MOONSHOT_API_KEY;
      } else {
        process.env.RUNTIME_CONFIG_MOONSHOT_API_KEY = originalRuntimeConfigApiKey;
      }
    }
  });

  test("migrates a legacy standalone runtime config into the canonical state path on startup", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-run72-standalone-config-"));
    tempRoots.push(tempRoot);
    const runtimeStateRoot = path.join(tempRoot, "standalone-runtime-root");
    const legacyRuntimeConfigPath = path.join(runtimeStateRoot, "runtime-config.yaml");
    const unifiedRuntimeConfigPath = path.join(runtimeStateRoot, "state", "runtime-config.yaml");

    await mkdir(runtimeStateRoot, { recursive: true });
    await writeFile(
      legacyRuntimeConfigPath,
      [
        'version: "1.0"',
        "execution_mode: remote_only",
        "routing:",
        "  strategy: difficulty",
        "model_aliases:",
        "  exact.remote-golden:",
        '    mode: "basic"',
        "    model_ids:",
        '      - "moonshot/kimi-k2.7-code"',
        "",
      ].join("\n"),
      "utf8",
    );

    const backend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: testFixtureRoot,
      runtimeStateRoot,
      scopeId: "standalone-runtime",
      unifiedRuntimeConfigPath,
      runtimeVendorStartup: "disabled",
    });

    await expect(backend.readRuntimeConfig()).resolves.toEqual(
      expect.objectContaining({
        applied: true,
        path: unifiedRuntimeConfigPath,
        config: expect.objectContaining({
          executionMode: "remote_only",
          routingStrategy: "difficulty",
          modelAliases: expect.arrayContaining([
            expect.objectContaining({
              aliasId: "exact.remote-golden",
              modelIds: ["moonshot/kimi-k2.7-code"],
            }),
          ]),
        }),
      }),
    );
    await expect(backend.readRuntimeSummary()).resolves.toEqual(
      expect.objectContaining({
        unifiedConfig: {
          enabled: true,
          path: unifiedRuntimeConfigPath,
        },
      }),
    );
    await expect(readFile(unifiedRuntimeConfigPath, "utf8")).resolves.toContain(
      "exact.remote-golden:",
    );

    await backend.shutdown();
  });

  test(
    "repairs stale standalone canonical remote aliases after restart bootstrap rehydrates env-backed persisted endpoints",
    async () => {
      const tempRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-run72-standalone-alias-"));
      tempRoots.push(tempRoot);
      const runtimeStateRoot = path.join(tempRoot, "standalone-runtime-root");
      const unifiedRuntimeConfigPath = path.join(runtimeStateRoot, "state", "runtime-config.yaml");
      const originalOpenAiApiKey = process.env.RUN72_OPENAI_API_KEY;
      const originalDeepseekApiKey = process.env.RUN72_DEEPSEEK_API_KEY;
      const originalMoonshotApiKey = process.env.RUN72_MOONSHOT_API_KEY;
      process.env.RUN72_OPENAI_API_KEY = "run72-openai-seed";
      process.env.RUN72_DEEPSEEK_API_KEY = "run72-deepseek-seed";
      process.env.RUN72_MOONSHOT_API_KEY = "run72-moonshot-seed";

      const healthServer = createServer((request, response) => {
        if (request.url === "/v1/models") {
          response.writeHead(200, { "content-type": "application/json" });
          response.end(
            JSON.stringify({
              data: [
                { id: "chatgpt/gpt-5.4" },
                { id: "deepseek/deepseek-v4-flash" },
                { id: "moonshot/kimi-k2.7-code" },
              ],
            }),
          );
          return;
        }

        response.writeHead(200, { "content-type": "application/json" });
        response.end("{}");
      });
      await new Promise<void>((resolve) => healthServer.listen(0, "127.0.0.1", () => resolve()));
      const healthServerAddress = healthServer.address();
      if (
        healthServerAddress === null ||
        typeof healthServerAddress !== "object" ||
        typeof healthServerAddress.port !== "number"
      ) {
        throw new Error("health server failed to bind");
      }
      const healthServerBaseUrl = `http://127.0.0.1:${healthServerAddress.port}/v1`;

      try {
        const seedBackend = await createRuntimeBridgeBackend({
          repoRoot,
          fixtureRoot: testFixtureRoot,
          runtimeStateRoot,
          scopeId: "standalone-runtime",
          runtimeVendorStartup: "disabled",
        });
        await seedBackend.upsertProviderAccount({
          providerAccountId: "openai.personal.run72-openai",
          providerId: "openai",
          providerKind: "provider-openai",
          orgScope: "personal",
          accountScope: "workspace-default",
          credentialRef: {
            backend: "env",
            ref: "RUN72_OPENAI_API_KEY",
          },
          authMode: "api-key-static",
          regionPolicy: {
            mode: "prefer",
            regions: ["global"],
          },
          baseUrlOverride: healthServerBaseUrl,
          allowedModels: ["chatgpt/gpt-5.4"],
          modelRoleBindings: [
            {
              modelId: "chatgpt/gpt-5.4",
              roleIds: ["writer"],
            },
          ],
          deniedModels: [],
          entitlementTags: ["chat"],
          budgetPolicyRef: "budget.default",
          quotaPolicyRef: "quota.default",
          status: "active",
          healthStatus: "healthy",
          rotationState: "stable",
        });
        await seedBackend.upsertProviderAccount({
          providerAccountId: "deepseek.personal.run72-deepseek",
          providerId: "deepseek",
          providerKind: "provider-openai",
          orgScope: "personal",
          accountScope: "workspace-default",
          credentialRef: {
            backend: "env",
            ref: "RUN72_DEEPSEEK_API_KEY",
          },
          authMode: "api-key-static",
          regionPolicy: {
            mode: "prefer",
            regions: ["global"],
          },
          baseUrlOverride: healthServerBaseUrl,
          allowedModels: ["deepseek/deepseek-v4-flash"],
          modelRoleBindings: [
            {
              modelId: "deepseek/deepseek-v4-flash",
              roleIds: ["writer"],
            },
          ],
          deniedModels: [],
          entitlementTags: ["chat"],
          budgetPolicyRef: "budget.default",
          quotaPolicyRef: "quota.default",
          status: "active",
          healthStatus: "healthy",
          rotationState: "stable",
        });
        await seedBackend.upsertProviderAccount({
          providerAccountId: "moonshot.personal.run72-moonshot",
          providerId: "moonshot",
          providerKind: "provider-openai",
          orgScope: "personal",
          accountScope: "workspace-default",
          credentialRef: {
            backend: "env",
            ref: "RUN72_MOONSHOT_API_KEY",
          },
          authMode: "api-key-static",
          regionPolicy: {
            mode: "prefer",
            regions: ["global"],
          },
          baseUrlOverride: healthServerBaseUrl,
          allowedModels: ["moonshot/kimi-k2.7-code"],
          modelRoleBindings: [
            {
              modelId: "moonshot/kimi-k2.7-code",
              roleIds: ["writer"],
            },
          ],
          deniedModels: [],
          entitlementTags: ["chat"],
          budgetPolicyRef: "budget.default",
          quotaPolicyRef: "quota.default",
          status: "active",
          healthStatus: "healthy",
          rotationState: "stable",
        });
        await seedBackend.activateEndpoint({
          providerAccountId: "openai.personal.run72-openai",
          modelId: "chatgpt/gpt-5.4",
          region: "global",
        });
        await seedBackend.activateEndpoint({
          providerAccountId: "deepseek.personal.run72-deepseek",
          modelId: "deepseek/deepseek-v4-flash",
          region: "global",
        });
        await seedBackend.activateEndpoint({
          providerAccountId: "moonshot.personal.run72-moonshot",
          modelId: "moonshot/kimi-k2.7-code",
          region: "global",
        });
        delete process.env.RUN72_OPENAI_API_KEY;
        delete process.env.RUN72_DEEPSEEK_API_KEY;
        delete process.env.RUN72_MOONSHOT_API_KEY;
        await seedBackend.upsertProviderAccount({
          providerAccountId: "openai.personal.run72-openai",
          providerId: "openai",
          providerKind: "provider-openai",
          orgScope: "personal",
          accountScope: "workspace-default",
          credentialRef: {
            backend: "env",
            ref: "RUN72_OPENAI_API_KEY",
          },
          authMode: "api-key-static",
          regionPolicy: {
            mode: "prefer",
            regions: ["global"],
          },
          baseUrlOverride: healthServerBaseUrl,
          allowedModels: ["chatgpt/gpt-5.4"],
          modelRoleBindings: [
            {
              modelId: "chatgpt/gpt-5.4",
              roleIds: ["writer"],
            },
          ],
          deniedModels: [],
          entitlementTags: ["chat"],
          budgetPolicyRef: "budget.default",
          quotaPolicyRef: "quota.default",
          status: "disabled",
          healthStatus: "credentials-missing",
          rotationState: "not-required",
        });
        await seedBackend.upsertProviderAccount({
          providerAccountId: "deepseek.personal.run72-deepseek",
          providerId: "deepseek",
          providerKind: "provider-openai",
          orgScope: "personal",
          accountScope: "workspace-default",
          credentialRef: {
            backend: "env",
            ref: "RUN72_DEEPSEEK_API_KEY",
          },
          authMode: "api-key-static",
          regionPolicy: {
            mode: "prefer",
            regions: ["global"],
          },
          baseUrlOverride: healthServerBaseUrl,
          allowedModels: ["deepseek/deepseek-v4-flash"],
          modelRoleBindings: [
            {
              modelId: "deepseek/deepseek-v4-flash",
              roleIds: ["writer"],
            },
          ],
          deniedModels: [],
          entitlementTags: ["chat"],
          budgetPolicyRef: "budget.default",
          quotaPolicyRef: "quota.default",
          status: "disabled",
          healthStatus: "credentials-missing",
          rotationState: "not-required",
        });
        await seedBackend.upsertProviderAccount({
          providerAccountId: "moonshot.personal.run72-moonshot",
          providerId: "moonshot",
          providerKind: "provider-openai",
          orgScope: "personal",
          accountScope: "workspace-default",
          credentialRef: {
            backend: "env",
            ref: "RUN72_MOONSHOT_API_KEY",
          },
          authMode: "api-key-static",
          regionPolicy: {
            mode: "prefer",
            regions: ["global"],
          },
          baseUrlOverride: healthServerBaseUrl,
          allowedModels: ["moonshot/kimi-k2.7-code"],
          modelRoleBindings: [
            {
              modelId: "moonshot/kimi-k2.7-code",
              roleIds: ["writer"],
            },
          ],
          deniedModels: [],
          entitlementTags: ["chat"],
          budgetPolicyRef: "budget.default",
          quotaPolicyRef: "quota.default",
          status: "disabled",
          healthStatus: "credentials-missing",
          rotationState: "not-required",
        });
        await seedBackend.shutdown();

        await mkdir(path.dirname(unifiedRuntimeConfigPath), { recursive: true });
        await writeFile(
          unifiedRuntimeConfigPath,
          [
            'version: "1.0"',
            "execution_mode: remote_only",
            "routing:",
            "  strategy: baseline",
            "model_aliases:",
            "  default.remote-only:",
            '    mode: "basic"',
            "    model_ids:",
            '      - "chatgpt/gpt-5.4"',
            "  baseline.remote-only:",
            '    mode: "basic"',
            "    model_ids:",
            '      - "chatgpt/gpt-5.4"',
            "  controller.remote-only:",
            '    mode: "intelligent"',
            "    model_ids:",
            '      - "chatgpt/gpt-5.4"',
            "  difficulty.remote-only:",
            '    mode: "difficulty"',
            "    model_ids:",
            '      - "chatgpt/gpt-5.4"',
            "  hybrid.remote-only:",
            '    mode: "hybrid"',
            "    model_ids:",
            '      - "chatgpt/gpt-5.4"',
            "",
          ].join("\n"),
          "utf8",
        );

        process.env.RUN72_OPENAI_API_KEY = "run72-openai-key";
        process.env.RUN72_DEEPSEEK_API_KEY = "run72-deepseek-key";
        process.env.RUN72_MOONSHOT_API_KEY = "run72-moonshot-key";

        const backend = await createRuntimeBridgeBackend({
          repoRoot,
          fixtureRoot: testFixtureRoot,
          runtimeStateRoot,
          scopeId: "standalone-runtime",
          unifiedRuntimeConfigPath,
          runtimeVendorStartup: "disabled",
        });

        try {
          let health = await backend.readHealthStatus();
          for (
            let attempt = 0;
            attempt < 20 && health.sessionBootstrap.status === "running";
            attempt += 1
          ) {
            await delay(50);
            health = await backend.readHealthStatus();
          }

          expect(health.sessionBootstrap.status).toBe("ready");

          const expectedModelIds = [
            "chatgpt/gpt-5.4",
            "deepseek/deepseek-v4-flash",
            "moonshot/kimi-k2.7-code",
          ];
          const endpoints = await backend.listEndpoints();
          const expectedEndpointIds = endpoints
            .filter((endpoint) => endpoint.sourceType === "remote")
            .map((endpoint) => endpoint.endpointId)
            .sort();
          const runtimeConfig = await backend.readRuntimeConfig();
          const baselineRemoteOnlyAlias = runtimeConfig.config?.modelAliases?.find(
            (alias) => alias.aliasId === "baseline.remote-only",
          );
          expect(baselineRemoteOnlyAlias?.modelIds.toSorted()).toEqual(expectedModelIds);

          const summary = await backend.readRuntimeSummary();
          expect(summary.aliasDrift).toEqual([]);
          expect(summary.unifiedConfig).toEqual({
            enabled: true,
            path: unifiedRuntimeConfigPath,
          });

          const routerSummary = await backend.readRouterSummary();
          const routerAlias = routerSummary.aliasInventory.find(
            (alias) => alias.aliasId === "baseline.remote-only",
          );
          expect(routerAlias?.resolvedModelIds.toSorted()).toEqual(expectedModelIds);
          expect(routerAlias?.allowEndpointIds.toSorted()).toEqual(expectedEndpointIds);

          const effectiveInventory = backend.getEffectiveRoutableInventory();
          expect(effectiveInventory?.endpointIds.toSorted()).toEqual(expectedEndpointIds);

          const mapping = (
            bridge as {
              mapChatCompletionsRequest: (
                registry: typeof backend.effectiveRegistry,
                body: Record<string, unknown>,
                requestId: string,
                modelAliases?: readonly {
                  aliasId: string;
                  mode?: "basic" | "difficulty" | "intelligent" | "hybrid" | null;
                  modelIds: readonly string[];
                }[],
                difficultyContext?: unknown,
                controllerContext?: unknown,
                requestOptions?: unknown,
                roleDefinitions?: unknown,
                defaultRoutingMode?: unknown,
                inventory?: ReturnType<typeof backend.getEffectiveRoutableInventory>,
              ) => {
                routingRequest: {
                  allowEndpoints: readonly string[];
                };
                routingDiagnostics?: {
                  aliasResolution?: {
                    requestedModel: string;
                    aliasId: string;
                    resolvedModelIds: readonly string[];
                    allowEndpoints: readonly string[];
                  };
                };
              };
            }
          ).mapChatCompletionsRequest(
            backend.effectiveRegistry,
            {
              model: "baseline.remote-only",
              messages: [{ role: "user", content: "Route this through the repaired alias pool." }],
            },
            "req-run72-repaired-baseline-remote-only",
            runtimeConfig.config?.modelAliases,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            effectiveInventory,
          );

          expect(mapping.routingRequest.allowEndpoints.toSorted()).toEqual(expectedEndpointIds);
          expect(mapping.routingDiagnostics?.aliasResolution).toEqual({
            requestedModel: "baseline.remote-only",
            aliasId: "baseline.remote-only",
            resolvedModelIds: expectedModelIds,
            allowEndpoints: expectedEndpointIds,
          });
        } finally {
          await backend.shutdown();
        }
      } finally {
        await new Promise<void>((resolve, reject) =>
          healthServer.close((error) => (error ? reject(error) : resolve())),
        );
        if (originalOpenAiApiKey === undefined) {
          delete process.env.RUN72_OPENAI_API_KEY;
        } else {
          process.env.RUN72_OPENAI_API_KEY = originalOpenAiApiKey;
        }
        if (originalDeepseekApiKey === undefined) {
          delete process.env.RUN72_DEEPSEEK_API_KEY;
        } else {
          process.env.RUN72_DEEPSEEK_API_KEY = originalDeepseekApiKey;
        }
        if (originalMoonshotApiKey === undefined) {
          delete process.env.RUN72_MOONSHOT_API_KEY;
        } else {
          process.env.RUN72_MOONSHOT_API_KEY = originalMoonshotApiKey;
        }
      }
    },
    60_000,
  );

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

    const providers = await backend.listProviders();
    const moonshot = providers.find((provider) => provider.providerId === "moonshot");
    expect(moonshot).toEqual(
      expect.objectContaining({
        providerId: "moonshot",
        modelIds: expect.arrayContaining(["moonshot/kimi-k2.5", "moonshot/kimi-k2.6"]),
        variants: expect.arrayContaining([
          expect.objectContaining({
            variantId: "moonshot-open-platform",
            modelIds: expect.arrayContaining(["moonshot/kimi-k2.5", "moonshot/kimi-k2.6"]),
          }),
          expect.objectContaining({
            variantId: "kimi-code",
            modelIds: expect.arrayContaining(["moonshot/kimi-k2.5", "moonshot/kimi-k2.6"]),
          }),
        ]),
      }),
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
