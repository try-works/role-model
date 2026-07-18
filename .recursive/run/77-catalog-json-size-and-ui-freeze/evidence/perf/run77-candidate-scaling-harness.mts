import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";

import { createRuntimeBridgeBackend } from "../../../../../role-model-router/apps/runtime-host-bridge/src/index.ts";

const warmupCount = 5;
const sampleCount = 30;
const tiers = [4, 16, 64] as const;

function percentile(values: readonly number[], fraction: number): number {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.ceil(sorted.length * fraction) - 1] ?? 0;
}

function summary(values: readonly number[]) {
  return {
    samplesMs: values.map((value) => Number(value.toFixed(3))),
    p50Ms: Number(percentile(values, 0.5).toFixed(3)),
    p95Ms: Number(percentile(values, 0.95).toFixed(3)),
    maxMs: Number(Math.max(...values).toFixed(3)),
  };
}

async function measure(operation: () => Promise<unknown>): Promise<number> {
  const startedAt = performance.now();
  await operation();
  return performance.now() - startedAt;
}

const repoRoot = path.resolve(import.meta.dirname, "..", "..", "..", "..", "..");
const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-run77-candidates-"));
const scopeId = "run77-candidate-scaling";
const configPath = path.join(runtimeStateRoot, "runtime-config.yaml");
process.env.MOONSHOT_API_KEY ??= "role-model-run77-placeholder";

try {
  await mkdir(runtimeStateRoot, { recursive: true });
  await writeFile(
    configPath,
    'version: "1.1"\nrouting:\n  strategy: baseline\nmodel_aliases: {}\nllama_swap:\n  models: {}\nlitellm_proxy:\n  providers: {}\n',
    "utf8",
  );
  const backend = await createRuntimeBridgeBackend({
    repoRoot,
    fixtureRoot: path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
    runtimeStateRoot,
    scopeId,
    unifiedRuntimeConfigPath: configPath,
    runtimeVendorStartup: "disabled",
  });

  try {
    const results = [];
    let configured = 0;
    for (const tier of tiers) {
      while (configured < tier) {
        const providerAccountId = `moonshot.run77.${configured.toString().padStart(3, "0")}`;
        await backend.upsertProviderAccount({
          providerAccountId,
          providerId: "moonshot",
          providerKind: "provider-openai",
          orgScope: "personal",
          accountScope: "workspace-default",
          credentialRef: { backend: "env", ref: "MOONSHOT_API_KEY" },
          authMode: "api-key-static",
          regionPolicy: { mode: "prefer", regions: ["global"] },
          baseUrlOverride: "https://api.moonshot.ai/v1",
          allowedModels: ["moonshot/kimi-k2.5"],
          modelRoleBindings: [{ modelId: "moonshot/kimi-k2.5", roleIds: ["general.chat"] }],
          deniedModels: [],
          entitlementTags: ["chat"],
          budgetPolicyRef: "budget.default",
          quotaPolicyRef: "quota.default",
          status: "active",
          healthStatus: "healthy",
          rotationState: "stable",
        });
        await backend.activateEndpoint({
          providerAccountId,
          modelId: "moonshot/kimi-k2.5",
          region: "global",
        });
        configured += 1;
      }

      for (let index = 0; index < warmupCount; index += 1) await backend.listRouterCandidates();
      let latestCandidates: readonly unknown[] = [];
      const samples = [];
      for (let index = 0; index < sampleCount; index += 1) {
        samples.push(
          await measure(async () => {
            latestCandidates = await backend.listRouterCandidates();
          }),
        );
      }
      results.push({
        configuredEndpoints: tier,
        returnedCandidates: latestCandidates.length,
        payloadBytes: Buffer.byteLength(JSON.stringify(latestCandidates)),
        timing: summary(samples),
      });
    }

    console.log(
      JSON.stringify(
        {
          platform: `${os.platform()} ${os.release()} ${os.arch()}`,
          node: process.version,
          method: "5 warmups plus 30 sequential listRouterCandidates samples per cumulative endpoint tier",
          tiers: results,
          p95BudgetMs: 500,
          budgetPassed: results.every((result) => result.timing.p95Ms <= 500),
        },
        null,
        2,
      ),
    );
  } finally {
    await backend.shutdown();
  }
} finally {
  await rm(runtimeStateRoot, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
}
