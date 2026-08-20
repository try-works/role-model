import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { describe, expect, test } from "vitest";

import {
  listRuntimeEndpoints,
  resolveSqliteMemoryLocation,
} from "@role-model-router/sqlite-memory";

import * as bridge from "../src/index.js";
import {
  persistOperatorIntent,
  readOperatorIntent,
  resolveOperatorIntentPath,
  upsertRemoteActivation,
} from "../src/operator-intent.js";

const repoRoot = path.resolve(import.meta.dirname, "..", "..", "..", "..");
const testFixtureRoot = path.join(import.meta.dirname, "fixtures");

describe("endpoint rehydration", () => {
  test(
    "commits a multi-effort activation as one durable batch and rehydrates every identity",
    { timeout: 20_000 },
    async () => {
      const runtimeStateRoot = path.join(os.tmpdir(), `runtime-host-batch-${Date.now()}`);
      const scopeId = "endpoint-batch-tests";
      const databasePath = resolveSqliteMemoryLocation({ runtimeStateRoot, scopeId });
      const originalDeepSeekApiKey = process.env.DEEPSEEK_API_KEY;
      process.env.DEEPSEEK_API_KEY = "deepseek-batch-key";
      const createBackend = async () =>
        (
          bridge as {
            createRuntimeBridgeBackend: (options: {
              repoRoot: string;
              fixtureRoot: string;
              runtimeStateRoot: string;
              scopeId: string;
            }) => Promise<{
              readonly effectiveRegistry: {
                readonly endpoints: readonly {
                  readonly identity: {
                    readonly endpoint_id: string;
                    readonly reasoning_effort?: string | null;
                  };
                }[];
              };
              upsertProviderAccount: (body: Record<string, unknown>) => Promise<unknown>;
              activateEndpointBatch: (body: Record<string, unknown>) => Promise<{
                activationBatchId: string;
                status: string;
                endpoints: readonly { endpointId: string }[];
              }>;
              activateEndpoint: (body: Record<string, unknown>) => Promise<{ endpointId: string }>;
              removeEndpoint: (
                endpointId: string,
              ) => Promise<{ status: string; endpointId: string }>;
              shutdown?: () => Promise<void>;
            }>;
          }
        ).createRuntimeBridgeBackend({
          repoRoot,
          fixtureRoot: testFixtureRoot,
          runtimeStateRoot,
          scopeId,
        });

      try {
        const backend = await createBackend();
        await backend.upsertProviderAccount({
          providerAccountId: "deepseek.personal.primary",
          providerId: "deepseek",
          providerKind: "provider-openai",
          orgScope: "personal",
          accountScope: "workspace-default",
          credentialRef: { backend: "env", ref: "DEEPSEEK_API_KEY" },
          authMode: "api-key-static",
          regionPolicy: { mode: "prefer", regions: ["global"] },
          baseUrlOverride: "https://api.deepseek.com/v1",
          allowedModels: ["deepseek/deepseek-v4-pro"],
          modelRoleBindings: [{ modelId: "deepseek/deepseek-v4-pro", roleIds: ["general.chat"] }],
          deniedModels: [],
          entitlementTags: ["chat"],
          budgetPolicyRef: "budget.default",
          quotaPolicyRef: "quota.default",
          status: "active",
          healthStatus: "healthy",
          rotationState: "stable",
        });
        const activation = {
          activationBatchId: "activation-batch-rehydration",
          activations: [
            {
              providerAccountId: "deepseek.personal.primary",
              modelId: "deepseek/deepseek-v4-pro",
              region: "global",
              reasoningEffort: "high",
            },
            {
              providerAccountId: "deepseek.personal.primary",
              modelId: "deepseek/deepseek-v4-pro",
              region: "global",
              reasoningEffort: "max",
            },
          ],
        };
        const [result, concurrentRetry] = await Promise.all([
          backend.activateEndpointBatch(activation),
          backend.activateEndpointBatch(activation),
        ]);
        expect(concurrentRetry).toEqual(result);
        expect(result).toEqual(
          expect.objectContaining({
            activationBatchId: "activation-batch-rehydration",
            status: "committed",
            endpoints: [
              expect.objectContaining({ endpointId: expect.any(String) }),
              expect.objectContaining({ endpointId: expect.any(String) }),
            ],
          }),
        );
        expect(new Set(result.endpoints.map((entry) => entry.endpointId)).size).toBe(2);
        await expect(
          backend.activateEndpointBatch({
            activationBatchId: "activation-batch-rehydration",
            activations: [
              {
                providerAccountId: "deepseek.personal.primary",
                modelId: "deepseek/deepseek-v4-pro",
                region: "global",
                reasoningEffort: "high",
              },
              {
                providerAccountId: "deepseek.personal.primary",
                modelId: "deepseek/deepseek-v4-pro",
                region: "global",
                reasoningEffort: "max",
              },
            ],
          }),
        ).resolves.toEqual(result);
        await expect(
          backend.activateEndpointBatch({
            activationBatchId: "activation-batch-rehydration",
            activations: [
              {
                providerAccountId: "deepseek.personal.primary",
                modelId: "deepseek/deepseek-v4-pro",
                region: "global",
                reasoningEffort: "max",
              },
            ],
          }),
        ).rejects.toThrow("different payload");
        expect(
          listRuntimeEndpoints({ databasePath }).map((entry) => entry.reasoningEffort),
        ).toEqual(["high", "max"]);
        await expect(
          backend.activateEndpoint({
            providerAccountId: "deepseek.personal.primary",
            modelId: "deepseek/deepseek-v4-pro",
            region: "global",
            reasoningEffort: "high",
          }),
        ).rejects.toThrow("is already active");
        const endpointToRemove = result.endpoints[0];
        expect(endpointToRemove).toBeDefined();
        if (!endpointToRemove) throw new Error("activation result omitted the first endpoint");
        await expect(backend.removeEndpoint(endpointToRemove.endpointId)).resolves.toEqual({
          endpointId: endpointToRemove.endpointId,
          status: "removed",
        });
        expect(
          listRuntimeEndpoints({ databasePath }).map((entry) => entry.reasoningEffort),
        ).toEqual(["max"]);
        await backend.shutdown?.();

        const restarted = await createBackend();
        expect(
          restarted.effectiveRegistry.endpoints
            .map((entry) => entry.identity.reasoning_effort)
            .filter(Boolean)
            .sort(),
        ).toEqual(["max"]);
        await restarted.shutdown?.();
      } finally {
        if (originalDeepSeekApiKey === undefined) process.env.DEEPSEEK_API_KEY = undefined;
        else process.env.DEEPSEEK_API_KEY = originalDeepSeekApiKey;
        await rm(runtimeStateRoot, { recursive: true, force: true });
      }
    },
  );

  test(
    "rehydrates explicit reasoning effort into the authoritative registry identity",
    { timeout: 20_000 },
    async () => {
      const runtimeStateRoot = path.join(
        os.tmpdir(),
        `runtime-host-effort-rehydration-${Date.now()}`,
      );
      const scopeId = "effort-rehydration-tests";
      const originalDeepSeekApiKey = process.env.DEEPSEEK_API_KEY;
      process.env.DEEPSEEK_API_KEY = "deepseek-effort-rehydration-key";

      const createBackend = async () =>
        (
          bridge as {
            createRuntimeBridgeBackend: (options: {
              repoRoot: string;
              fixtureRoot: string;
              runtimeStateRoot: string;
              scopeId: string;
            }) => Promise<{
              readonly effectiveRegistry: {
                readonly endpoints: readonly {
                  readonly identity: {
                    readonly endpoint_id: string;
                    readonly reasoning_effort?: string | null;
                  };
                }[];
              };
              upsertProviderAccount: (body: Record<string, unknown>) => Promise<unknown>;
              activateEndpoint: (body: Record<string, unknown>) => Promise<{ endpointId: string }>;
              shutdown?: () => Promise<void>;
            }>;
          }
        ).createRuntimeBridgeBackend({
          repoRoot,
          fixtureRoot: testFixtureRoot,
          runtimeStateRoot,
          scopeId,
        });

      try {
        const backend = await createBackend();
        await backend.upsertProviderAccount({
          providerAccountId: "deepseek.personal.primary",
          providerId: "deepseek",
          providerKind: "provider-openai",
          orgScope: "personal",
          accountScope: "workspace-default",
          credentialRef: { backend: "env", ref: "DEEPSEEK_API_KEY" },
          authMode: "api-key-static",
          regionPolicy: { mode: "prefer", regions: ["global"] },
          baseUrlOverride: "https://api.deepseek.com/v1",
          allowedModels: ["deepseek/deepseek-v4-pro"],
          modelRoleBindings: [{ modelId: "deepseek/deepseek-v4-pro", roleIds: ["general.chat"] }],
          deniedModels: [],
          entitlementTags: ["chat"],
          budgetPolicyRef: "budget.default",
          quotaPolicyRef: "quota.default",
          status: "active",
          healthStatus: "healthy",
          rotationState: "stable",
        });
        const activation = await backend.activateEndpoint({
          providerAccountId: "deepseek.personal.primary",
          modelId: "deepseek/deepseek-v4-pro",
          region: "global",
          reasoningEffort: "high",
        });
        await backend.shutdown?.();

        const restartedBackend = await createBackend();
        const rehydrated = restartedBackend.effectiveRegistry.endpoints.find(
          (entry) => entry.identity.endpoint_id === activation.endpointId,
        );
        expect(rehydrated?.identity.reasoning_effort).toBe("high");
        await restartedBackend.shutdown?.();
      } finally {
        if (originalDeepSeekApiKey === undefined) {
          process.env.DEEPSEEK_API_KEY = undefined;
        } else {
          process.env.DEEPSEEK_API_KEY = originalDeepSeekApiKey;
        }
        await rm(runtimeStateRoot, { recursive: true, force: true });
      }
    },
  );

  test(
    "rehydrates sqlite runtime endpoints across backend restart without re-activation",
    { timeout: 20_000 },
    async () => {
      const runtimeStateRoot = path.join(
        os.tmpdir(),
        `runtime-host-endpoint-rehydration-${Date.now()}`,
      );
      const scopeId = "endpoint-rehydration-tests";
      const databasePath = resolveSqliteMemoryLocation({ runtimeStateRoot, scopeId });
      const operatorIntentLocation = { runtimeStateRoot, scopeId };
      const originalMoonshotApiKey = process.env.MOONSHOT_API_KEY;
      process.env.MOONSHOT_API_KEY = "moonshot-rehydration-key";

      const createBackend = async () =>
        (
          bridge as {
            createRuntimeBridgeBackend: (options: {
              repoRoot: string;
              fixtureRoot: string;
              runtimeStateRoot: string;
              scopeId: string;
            }) => Promise<{
              upsertProviderAccount: (body: Record<string, unknown>) => Promise<unknown>;
              activateEndpoint: (body: Record<string, unknown>) => Promise<{ endpointId: string }>;
              shutdown?: () => Promise<void>;
            }>;
          }
        ).createRuntimeBridgeBackend({
          repoRoot,
          fixtureRoot: testFixtureRoot,
          runtimeStateRoot,
          scopeId,
        });

      try {
        const backend = await createBackend();
        await backend.upsertProviderAccount({
          providerAccountId: "moonshot.personal.primary",
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
          allowedModels: ["moonshot/kimi-k2.5"],
          modelRoleBindings: [
            {
              modelId: "moonshot/kimi-k2.5",
              roleIds: ["general.chat"],
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

        const activation = await backend.activateEndpoint({
          providerAccountId: "moonshot.personal.primary",
          modelId: "moonshot/kimi-k2.5",
          region: "global",
        });

        expect(
          listRuntimeEndpoints({ databasePath }).map((endpoint) => endpoint.endpointId),
        ).toContain(activation.endpointId);

        const manifest = readOperatorIntent(operatorIntentLocation);
        expect(manifest?.remoteActivations).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              endpointId: activation.endpointId,
              modelId: "moonshot/kimi-k2.5",
            }),
          ]),
        );
        expect(resolveOperatorIntentPath(operatorIntentLocation)).toBeTruthy();

        await backend.shutdown?.();

        const restartedBackend = await createBackend();
        const rehydratedEndpoints = listRuntimeEndpoints({ databasePath });
        expect(rehydratedEndpoints.map((endpoint) => endpoint.endpointId)).toContain(
          activation.endpointId,
        );
        await restartedBackend.shutdown?.();
      } finally {
        if (originalMoonshotApiKey === undefined) {
          process.env.MOONSHOT_API_KEY = undefined;
        } else {
          process.env.MOONSHOT_API_KEY = originalMoonshotApiKey;
        }
        await rm(runtimeStateRoot, { recursive: true, force: true });
      }
    },
  );

  test(
    "reconciles missing persisted remote activations even when sqlite already has endpoint rows",
    { timeout: 20_000 },
    async () => {
      const runtimeStateRoot = path.join(
        os.tmpdir(),
        `runtime-host-endpoint-reconcile-${Date.now()}`,
      );
      const scopeId = "endpoint-reconcile-tests";
      const databasePath = resolveSqliteMemoryLocation({ runtimeStateRoot, scopeId });
      const operatorIntentLocation = { runtimeStateRoot, scopeId };
      const originalMoonshotApiKey = process.env.MOONSHOT_API_KEY;
      process.env.MOONSHOT_API_KEY = "moonshot-reconcile-key";

      const networkFetcher: typeof fetch = async (input) => {
        const url =
          typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        if (url.endsWith("/models")) {
          return new Response(
            JSON.stringify({
              data: [{ id: "moonshot/kimi-k2.5" }, { id: "moonshot/kimi-k2.6" }],
            }),
            {
              status: 200,
              headers: { "content-type": "application/json" },
            },
          );
        }
        throw new Error(`Unexpected network request during endpoint reconciliation test: ${url}`);
      };

      const createBackend = async () =>
        (
          bridge as {
            createRuntimeBridgeBackend: (options: {
              repoRoot: string;
              fixtureRoot: string;
              runtimeStateRoot: string;
              scopeId: string;
              networkFetcher: typeof fetch;
            }) => Promise<{
              upsertProviderAccount: (body: Record<string, unknown>) => Promise<unknown>;
              activateEndpoint: (body: Record<string, unknown>) => Promise<{ endpointId: string }>;
              readHealthStatus?: () => Promise<{
                sessionBootstrap: { status: string };
              }>;
              shutdown?: () => Promise<void>;
            }>;
          }
        ).createRuntimeBridgeBackend({
          repoRoot,
          fixtureRoot: testFixtureRoot,
          runtimeStateRoot,
          scopeId,
          networkFetcher,
        });

      try {
        const backend = await createBackend();
        await backend.upsertProviderAccount({
          providerAccountId: "moonshot.personal.primary",
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
          allowedModels: ["moonshot/kimi-k2.5", "moonshot/kimi-k2.6"],
          modelRoleBindings: [
            {
              modelId: "moonshot/kimi-k2.5",
              roleIds: ["general.chat"],
            },
            {
              modelId: "moonshot/kimi-k2.6",
              roleIds: ["general.chat"],
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

        const activation = await backend.activateEndpoint({
          providerAccountId: "moonshot.personal.primary",
          modelId: "moonshot/kimi-k2.5",
          region: "global",
        });
        expect(
          listRuntimeEndpoints({ databasePath }).map((endpoint) => endpoint.endpointId),
        ).toEqual([activation.endpointId]);

        persistOperatorIntent(operatorIntentLocation, (intent) =>
          upsertRemoteActivation(intent, {
            providerAccountId: "moonshot.personal.primary",
            modelId: "moonshot/kimi-k2.6",
            region: "global",
            endpointId: "moonshot.personal.primary.global.kimi-k2.6",
          }),
        );

        await backend.shutdown?.();

        const restartedBackend = await createBackend();
        try {
          let health = await restartedBackend.readHealthStatus?.();
          for (
            let attempt = 0;
            attempt < 200 && health?.sessionBootstrap.status === "running";
            attempt += 1
          ) {
            await delay(50);
            health = await restartedBackend.readHealthStatus?.();
          }
          expect(health?.sessionBootstrap.status).not.toBe("running");

          expect(
            listRuntimeEndpoints({ databasePath })
              .map((endpoint) => endpoint.endpointId)
              .sort(),
          ).toEqual([activation.endpointId, "moonshot.personal.primary.global.kimi-k2.6"]);
        } finally {
          await restartedBackend.shutdown?.();
        }
      } finally {
        if (originalMoonshotApiKey === undefined) {
          process.env.MOONSHOT_API_KEY = undefined;
        } else {
          process.env.MOONSHOT_API_KEY = originalMoonshotApiKey;
        }
        await rm(runtimeStateRoot, { recursive: true, force: true });
      }
    },
  );

  test(
    "marks restarted remote endpoints offline and ineligible when startup probes time out",
    { timeout: 20_000 },
    async () => {
      const runtimeStateRoot = path.join(os.tmpdir(), `runtime-host-endpoint-health-${Date.now()}`);
      const scopeId = "endpoint-health-tests";
      const unifiedRuntimeConfigPath = path.join(runtimeStateRoot, "runtime-config.yaml");
      const originalMoonshotApiKey = process.env.MOONSHOT_API_KEY;
      process.env.MOONSHOT_API_KEY = "moonshot-health-key";

      const createBackend = async (networkFetcher: typeof fetch) =>
        (
          bridge as {
            createRuntimeBridgeBackend: (options: {
              repoRoot: string;
              fixtureRoot: string;
              runtimeStateRoot: string;
              scopeId: string;
              unifiedRuntimeConfigPath: string;
              networkFetcher: typeof fetch;
            }) => Promise<{
              upsertProviderAccount: (body: Record<string, unknown>) => Promise<unknown>;
              activateEndpoint: (body: Record<string, unknown>) => Promise<{ endpointId: string }>;
              listEndpoints: () => Promise<
                readonly {
                  endpointId: string;
                  healthStatus: string;
                  routingEligible: boolean;
                  benchmarkEligible: boolean;
                }[]
              >;
              listRouterCandidates: () => Promise<
                readonly {
                  endpointId: string;
                  healthStatus: string;
                  routingEligible: boolean;
                  benchmarkEligible: boolean;
                }[]
              >;
              readHealthStatus?: () => Promise<{
                sessionBootstrap: { status: string };
              }>;
              shutdown?: () => Promise<void>;
            }>;
          }
        ).createRuntimeBridgeBackend({
          repoRoot,
          fixtureRoot: testFixtureRoot,
          runtimeStateRoot,
          scopeId,
          unifiedRuntimeConfigPath,
          networkFetcher,
        });

      try {
        await mkdir(runtimeStateRoot, { recursive: true });
        await writeFile(
          unifiedRuntimeConfigPath,
          'version: "1.1"\nexecutionMode: hybrid\n',
          "utf8",
        );
        const backend = await createBackend(async (input) => {
          const url =
            typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
          if (url.endsWith("/models")) {
            return new Response(
              JSON.stringify({
                data: [{ id: "moonshot/kimi-k2.5" }],
              }),
              {
                status: 200,
                headers: { "content-type": "application/json" },
              },
            );
          }
          throw new Error(`Unexpected network request during endpoint setup test: ${url}`);
        });
        await backend.upsertProviderAccount({
          providerAccountId: "moonshot.personal.primary",
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
          allowedModels: ["moonshot/kimi-k2.5"],
          modelRoleBindings: [
            {
              modelId: "moonshot/kimi-k2.5",
              roleIds: ["general.chat"],
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
        const activation = await backend.activateEndpoint({
          providerAccountId: "moonshot.personal.primary",
          modelId: "moonshot/kimi-k2.5",
          region: "global",
        });
        await backend.shutdown?.();

        const restartedBackend = await createBackend(async (input) => {
          const url =
            typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
          if (url.endsWith("/models")) {
            await delay(1_250);
            throw new Error("timeout while probing remote endpoint");
          }
          throw new Error(`Unexpected network request during endpoint health test: ${url}`);
        });

        try {
          let health = await restartedBackend.readHealthStatus?.();
          for (
            let attempt = 0;
            attempt < 200 && health?.sessionBootstrap.status === "running";
            attempt += 1
          ) {
            await delay(50);
            health = await restartedBackend.readHealthStatus?.();
          }
          expect(health?.sessionBootstrap.status).not.toBe("running");

          await expect(restartedBackend.listEndpoints()).resolves.toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                endpointId: activation.endpointId,
                healthStatus: "offline",
                routingEligible: false,
                benchmarkEligible: false,
              }),
            ]),
          );
          await expect(restartedBackend.listRouterCandidates()).resolves.toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                endpointId: activation.endpointId,
                healthStatus: "offline",
                routingEligible: false,
                benchmarkEligible: false,
              }),
            ]),
          );
        } finally {
          await restartedBackend.shutdown?.();
        }
      } finally {
        if (originalMoonshotApiKey === undefined) {
          process.env.MOONSHOT_API_KEY = undefined;
        } else {
          process.env.MOONSHOT_API_KEY = originalMoonshotApiKey;
        }
        await rm(runtimeStateRoot, { recursive: true, force: true });
      }
    },
  );
});
