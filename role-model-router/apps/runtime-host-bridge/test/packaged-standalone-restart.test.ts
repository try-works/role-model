import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, expect, test } from "vitest";

import { createRuntimeBridgeBackend } from "../src/index.js";
import { packageSeaRuntime } from "../src/package-sea.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");
const tempRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempRoots.splice(0).map(async (tempRoot) => {
      await rm(tempRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }),
  );
});

async function allocatePort(): Promise<number> {
  return await new Promise<number>((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address === null || typeof address === "string") {
        reject(new Error("failed to allocate local port"));
        return;
      }
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(address.port);
      });
    });
  });
}

async function waitForJson<T>(
  url: string,
  predicate: (value: T) => boolean,
  timeoutMs = 30_000,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown = null;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        const payload = (await response.json()) as T;
        if (predicate(payload)) {
          return payload;
        }
      }
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(
    `Timed out waiting for ${url}${lastError instanceof Error ? `: ${lastError.message}` : ""}`,
  );
}

async function stopProcessTree(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null) {
    return;
  }

  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
  } else {
    child.kill("SIGTERM");
  }

  await new Promise<void>((resolve) => {
    child.once("exit", () => resolve());
    setTimeout(resolve, 10_000);
  });
}

async function seedStandaloneRestartRuntimeState(
  runtimeStateRoot: string,
  mockBaseUrl: string,
): Promise<void> {
  const originalOpenAiApiKey = process.env.RUN72_OPENAI_API_KEY;
  const originalDeepseekApiKey = process.env.RUN72_DEEPSEEK_API_KEY;
  const originalMoonshotApiKey = process.env.RUN72_MOONSHOT_API_KEY;
  process.env.RUN72_OPENAI_API_KEY = "seed-openai";
  process.env.RUN72_DEEPSEEK_API_KEY = "seed-deepseek";
  process.env.RUN72_MOONSHOT_API_KEY = "seed-moonshot";

  const backend = await createRuntimeBridgeBackend({
    repoRoot,
    runtimeStateRoot,
    scopeId: "standalone-runtime",
    runtimeVendorStartup: "disabled",
  });

  const upsertAccount = async (
    providerAccountId: string,
    providerId: string,
    credentialRef: string,
    modelId: string,
    status: "active" | "disabled",
    healthStatus: "healthy" | "credentials-missing",
    rotationState: "stable" | "not-required",
  ): Promise<void> => {
    await backend.upsertProviderAccount({
      providerAccountId,
      providerId,
      providerKind: "provider-openai",
      orgScope: "personal",
      accountScope: "workspace-default",
      credentialRef: {
        backend: "env",
        ref: credentialRef,
      },
      authMode: "api-key-static",
      regionPolicy: {
        mode: "prefer",
        regions: ["global"],
      },
      baseUrlOverride: mockBaseUrl,
      allowedModels: [modelId],
      modelRoleBindings: [
        {
          modelId,
          roleIds: ["writer"],
        },
      ],
      deniedModels: [],
      entitlementTags: ["chat"],
      budgetPolicyRef: "budget.default",
      quotaPolicyRef: "quota.default",
      status,
      healthStatus,
      rotationState,
    });
  };

  try {
    await upsertAccount(
      "openai.personal.run72-openai",
      "openai",
      "RUN72_OPENAI_API_KEY",
      "chatgpt/gpt-5.4",
      "active",
      "healthy",
      "stable",
    );
    await upsertAccount(
      "deepseek.personal.run72-deepseek",
      "deepseek",
      "RUN72_DEEPSEEK_API_KEY",
      "deepseek/deepseek-v4-flash",
      "active",
      "healthy",
      "stable",
    );
    await upsertAccount(
      "moonshot.personal.run72-moonshot",
      "moonshot",
      "RUN72_MOONSHOT_API_KEY",
      "moonshot/kimi-k2.7-code",
      "active",
      "healthy",
      "stable",
    );

    await backend.activateEndpoint({
      providerAccountId: "openai.personal.run72-openai",
      modelId: "chatgpt/gpt-5.4",
      region: "global",
    });
    await backend.activateEndpoint({
      providerAccountId: "deepseek.personal.run72-deepseek",
      modelId: "deepseek/deepseek-v4-flash",
      region: "global",
    });
    await backend.activateEndpoint({
      providerAccountId: "moonshot.personal.run72-moonshot",
      modelId: "moonshot/kimi-k2.7-code",
      region: "global",
    });

    delete process.env.RUN72_OPENAI_API_KEY;
    delete process.env.RUN72_DEEPSEEK_API_KEY;
    delete process.env.RUN72_MOONSHOT_API_KEY;

    await upsertAccount(
      "openai.personal.run72-openai",
      "openai",
      "RUN72_OPENAI_API_KEY",
      "chatgpt/gpt-5.4",
      "disabled",
      "credentials-missing",
      "not-required",
    );
    await upsertAccount(
      "deepseek.personal.run72-deepseek",
      "deepseek",
      "RUN72_DEEPSEEK_API_KEY",
      "deepseek/deepseek-v4-flash",
      "disabled",
      "credentials-missing",
      "not-required",
    );
    await upsertAccount(
      "moonshot.personal.run72-moonshot",
      "moonshot",
      "RUN72_MOONSHOT_API_KEY",
      "moonshot/kimi-k2.7-code",
      "disabled",
      "credentials-missing",
      "not-required",
    );
  } finally {
    await backend.shutdown();
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

  await writeFile(
    path.join(runtimeStateRoot, "runtime-config.yaml"),
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
}

async function launchPackagedRuntime(options: {
  executablePath: string;
  runtimeStateRoot: string;
  port: number;
  env: Record<string, string>;
  expectedBootstrapStatus: "ready" | "degraded";
}): Promise<{
  readonly child: ChildProcess;
  readonly stdout: string[];
  readonly stderr: string[];
}> {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const child = spawn(
    options.executablePath,
    [
      "--repo-root",
      repoRoot,
      "--runtime-state-root",
      options.runtimeStateRoot,
      "--scope-id",
      "standalone-runtime",
      "--unified-runtime-config",
      path.join(options.runtimeStateRoot, "state", "runtime-config.yaml"),
      "--host",
      "127.0.0.1",
      "--port",
      String(options.port),
      "--static-root",
      path.join(repoRoot, "role-model-router", "apps", "runtime-ui", "build", "client"),
    ],
    {
      cwd: path.dirname(options.executablePath),
      env: {
        ...process.env,
        ...options.env,
      },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    },
  );
  child.stdout?.setEncoding("utf8");
  child.stderr?.setEncoding("utf8");
  child.stdout?.on("data", (chunk) => {
    stdout.push(chunk);
  });
  child.stderr?.on("data", (chunk) => {
    stderr.push(chunk);
  });

  try {
    await waitForJson<{ sessionBootstrap: { status: string } }>(
      `http://127.0.0.1:${options.port}/api/role-model/runtime/summary`,
      (summary) => summary.sessionBootstrap.status === options.expectedBootstrapStatus,
      60_000,
    );
  } catch (error) {
    await stopProcessTree(child);
    throw new Error(
      [
        error instanceof Error ? error.message : "runtime failed to start",
        stdout.join("").trim(),
        stderr.join("").trim(),
      ]
        .filter((line) => line.length > 0)
        .join("\n"),
    );
  }

  return { child, stdout, stderr };
}

test.runIf(process.platform === "win32")(
  "packaged runtime repairs stale standalone aliases after env-backed restart bootstrap",
  async () => {
    const packaged = await packageSeaRuntime();
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-run72-packaged-restart-"));
    tempRoots.push(tempRoot);
    const runtimeStateRoot = path.join(tempRoot, "Role Model Runtime");
    const expectedModelIds = [
      "chatgpt/gpt-5.4",
      "deepseek/deepseek-v4-flash",
      "moonshot/kimi-k2.7-code",
    ];
    const expectedEndpointIds = [
      "deepseek.personal.run72-deepseek.global.deepseek-v4-flash",
      "moonshot.personal.run72-moonshot.global.kimi-k2.7-code",
      "openai.personal.run72-openai.global.gpt-5.4",
    ];

    const mockProvider = createServer((request, response) => {
      if (request.url === "/v1/models") {
        response.writeHead(200, { "content-type": "application/json" });
        response.end(
          JSON.stringify({
            data: expectedModelIds.map((id) => ({ id })),
          }),
        );
        return;
      }

      response.writeHead(200, { "content-type": "application/json" });
      response.end("{}");
    });
    await new Promise<void>((resolve) => mockProvider.listen(0, "127.0.0.1", () => resolve()));
    const mockAddress = mockProvider.address();
    if (mockAddress === null || typeof mockAddress === "string") {
      throw new Error("mock provider failed to bind");
    }

    try {
      await seedStandaloneRestartRuntimeState(
        runtimeStateRoot,
        `http://127.0.0.1:${mockAddress.port}/v1`,
      );

      const firstPort = await allocatePort();
      const firstLaunch = await launchPackagedRuntime({
        executablePath: packaged.outputPath,
        runtimeStateRoot,
        port: firstPort,
        env: {},
        expectedBootstrapStatus: "degraded",
      });

      try {
        const firstConfig = await waitForJson<{
          path: string;
          config: { modelAliases?: Array<{ aliasId: string; modelIds: string[] }> };
        }>(`http://127.0.0.1:${firstPort}/api/role-model/runtime/config`, () => true);
        const baselineAlias = firstConfig.config.modelAliases?.find(
          (alias) => alias.aliasId === "baseline.remote-only",
        );
        expect(firstConfig.path).toBe(path.join(runtimeStateRoot, "state", "runtime-config.yaml"));
        expect(baselineAlias?.modelIds).toEqual(["chatgpt/gpt-5.4"]);
      } finally {
        await stopProcessTree(firstLaunch.child);
      }

      const secondPort = await allocatePort();
      const secondLaunch = await launchPackagedRuntime({
        executablePath: packaged.outputPath,
        runtimeStateRoot,
        port: secondPort,
        env: {
          RUN72_OPENAI_API_KEY: "run72-openai",
          RUN72_DEEPSEEK_API_KEY: "run72-deepseek",
          RUN72_MOONSHOT_API_KEY: "run72-moonshot",
        },
        expectedBootstrapStatus: "ready",
      });

      try {
        const runtimeConfig = await waitForJson<{
          config: { modelAliases?: Array<{ aliasId: string; modelIds: string[] }> };
        }>(`http://127.0.0.1:${secondPort}/api/role-model/runtime/config`, () => true);
        const baselineAlias = runtimeConfig.config.modelAliases?.find(
          (alias) => alias.aliasId === "baseline.remote-only",
        );
        expect(baselineAlias?.modelIds.toSorted()).toEqual(expectedModelIds);

        const routerSummary = await waitForJson<{
          aliasInventory: Array<{
            aliasId: string;
            resolvedModelIds: string[];
            allowEndpointIds: string[];
          }>;
        }>(`http://127.0.0.1:${secondPort}/api/role-model/router/summary`, () => true);
        const routerAlias = routerSummary.aliasInventory.find(
          (alias) => alias.aliasId === "baseline.remote-only",
        );
        expect(routerAlias?.resolvedModelIds.toSorted()).toEqual(expectedModelIds);
        expect(routerAlias?.allowEndpointIds.toSorted()).toEqual(expectedEndpointIds);

        const renderedConfig = await readFile(
          path.join(runtimeStateRoot, "state", "runtime-config.yaml"),
          "utf8",
        );
        expect(renderedConfig).toContain("deepseek/deepseek-v4-flash");
        expect(renderedConfig).toContain("moonshot/kimi-k2.7-code");
      } finally {
        await stopProcessTree(secondLaunch.child);
      }
    } finally {
      await new Promise<void>((resolve, reject) =>
        mockProvider.close((error) => (error ? reject(error) : resolve())),
      );
    }
  },
  180_000,
);
