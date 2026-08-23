import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { setTimeout as delay } from "node:timers/promises";
import { describe, expect, test } from "vitest";

import { resolveSqliteMemoryLocation } from "@role-model-router/sqlite-memory";

import * as bridge from "../src/index.js";

const repoRoot = path.resolve(import.meta.dirname, "..", "..", "..", "..");
const testFixtureRoot = path.join(import.meta.dirname, "fixtures");

describe("remote health bootstrap", () => {
  test("admits a callback-authenticated Codex Subscription endpoint without a Responses admission probe", async () => {
    const runtimeStateRoot = path.join(os.tmpdir(), `codex-admission-${Date.now()}`);
    const scopeId = "codex-admission-tests";
    const calls: string[] = [];
    const backend = await (
      bridge as {
        createRuntimeBridgeBackend: (options: {
          repoRoot: string;
          fixtureRoot: string;
          runtimeStateRoot: string;
          scopeId: string;
          networkFetcher: typeof fetch;
        }) => Promise<{
          upsertProviderAccount: (body: Record<string, unknown>) => Promise<unknown>;
          activateEndpoint: (body: Record<string, unknown>) => Promise<{ status: string }>;
          listEndpoints: () => Promise<
            readonly {
              endpointId: string;
              status: string;
              healthStatus: string;
              routingEligible: boolean;
            }[]
          >;
          updateBenchmarkPreferences: (body: Record<string, unknown>) => Promise<unknown>;
          shutdown?: () => Promise<void>;
        }>;
      }
    ).createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: testFixtureRoot,
      runtimeStateRoot,
      scopeId,
      networkFetcher: async (input) => {
        calls.push(String(input));
        throw new Error("Codex admission must not use an incompatible OpenAI-compatible probe.");
      },
    });
    try {
      await backend.upsertProviderAccount({
        providerAccountId: "openai.personal.codex-admission",
        providerId: "openai",
        providerKind: "provider-openai",
        orgScope: "personal",
        accountScope: "workspace-default",
        credentialRef: { backend: "local-file", ref: "codex-admission.json" },
        authMode: "oauth2-device-code",
        regionPolicy: { mode: "prefer", regions: ["global"] },
        allowedModels: ["chatgpt/gpt-5.4"],
        modelRoleBindings: [{ modelId: "chatgpt/gpt-5.4", roleIds: ["general.chat"] }],
        deniedModels: [],
        entitlementTags: ["chat"],
        budgetPolicyRef: "budget.default",
        quotaPolicyRef: "quota.default",
        status: "active",
        healthStatus: "healthy",
        rotationState: "stable",
      });
      const activation = await backend.activateEndpoint({
        providerAccountId: "openai.personal.codex-admission",
        modelId: "chatgpt/gpt-5.4",
        region: "global",
      });
      expect(activation.status).toBe("active");
      expect(calls).toEqual([]);
      const endpoints = await backend.listEndpoints();
      expect(endpoints).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            status: "active",
            healthStatus: "healthy",
            routingEligible: true,
          }),
        ]),
      );
      const endpointId = endpoints.find((endpoint) => endpoint.status === "active")?.endpointId;
      expect(endpointId).toEqual(expect.any(String));
      const receiptRoot = path.join(runtimeStateRoot, scopeId, "endpoint-admission");
      const receiptNames = await readdir(receiptRoot);
      const receiptText = await readFile(path.join(receiptRoot, receiptNames[0] ?? ""), "utf8");
      expect(JSON.parse(receiptText)).toEqual(
        expect.objectContaining({
          reasonCode: "oauth-auth-confirmed",
          healthEvidence: "oauth-auth-confirmed",
        }),
      );
      await expect(
        backend.updateBenchmarkPreferences({ judgeEndpointId: endpointId }),
      ).resolves.toEqual(expect.anything());
    } finally {
      await backend.shutdown?.();
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  });

  test("restores legacy not-yet-executed Codex endpoints as healthy from persisted OAuth proof without a probe", async () => {
    const runtimeStateRoot = path.join(os.tmpdir(), `codex-oauth-restore-${Date.now()}`);
    const scopeId = "codex-oauth-restore-tests";
    const restartFixtureRoot = path.join(import.meta.dirname, "fixtures-restart-rehydration");
    const providerAccountId = "openai.personal.codex-restore";
    const credentialRef = `oauth/openai/${providerAccountId}`;
    const calls: string[] = [];
    let firstBackend: Awaited<
      ReturnType<
        (typeof bridge & {
          createRuntimeBridgeBackend: typeof bridge.createRuntimeBridgeBackend;
        })["createRuntimeBridgeBackend"]
      >
    > | null = null;
    let restoredBackend: typeof firstBackend = null;

    try {
      firstBackend = await bridge.createRuntimeBridgeBackend({
        repoRoot,
        fixtureRoot: restartFixtureRoot,
        runtimeStateRoot,
        scopeId,
        networkFetcher: async (input) => {
          calls.push(String(input));
          throw new Error("Persisted OAuth restore must not execute a provider probe.");
        },
      });
      await firstBackend.upsertProviderAccount({
        providerAccountId,
        providerId: "openai",
        providerKind: "provider-openai",
        orgScope: "personal",
        accountScope: "workspace-default",
        credentialRef: { backend: "local-file", ref: credentialRef },
        authMode: "oauth2-device-code",
        regionPolicy: { mode: "prefer", regions: ["global"] },
        allowedModels: ["chatgpt/gpt-5.4"],
        modelRoleBindings: [{ modelId: "chatgpt/gpt-5.4", roleIds: ["general.chat"] }],
        deniedModels: [],
        entitlementTags: ["chat"],
        budgetPolicyRef: "budget.default",
        quotaPolicyRef: "quota.default",
        status: "active",
        healthStatus: "healthy",
        rotationState: "stable",
      });
      const activation = await firstBackend.activateEndpoint({
        providerAccountId,
        modelId: "chatgpt/gpt-5.4",
        region: "global",
      });
      await firstBackend.shutdown?.();
      firstBackend = null;

      const credentialPath = path.join(
        runtimeStateRoot,
        scopeId,
        "credentials",
        `${credentialRef}.json`,
      );
      await mkdir(path.dirname(credentialPath), { recursive: true });
      await writeFile(
        credentialPath,
        JSON.stringify({
          providerId: "openai",
          providerAccountId,
          saved_at_ms: Date.now(),
          codexAuth: {
            auth_mode: "chatgpt",
            OPENAI_API_KEY: null,
            last_refresh: new Date().toISOString(),
            tokens: {
              access_token: "persisted-codex-access",
              refresh_token: "persisted-codex-refresh",
              account_id: "persisted-codex-account",
            },
          },
        }),
        "utf8",
      );
      const database = new DatabaseSync(resolveSqliteMemoryLocation({ runtimeStateRoot, scopeId }));
      try {
        database
          .prepare("UPDATE runtime_endpoints SET health_status = ? WHERE endpoint_id = ?")
          .run("not-yet-executed", activation.endpointId);
      } finally {
        database.close();
      }

      restoredBackend = await bridge.createRuntimeBridgeBackend({
        repoRoot,
        fixtureRoot: restartFixtureRoot,
        runtimeStateRoot,
        scopeId,
        networkFetcher: async (input) => {
          calls.push(String(input));
          throw new Error("Persisted OAuth restore must not execute a provider probe.");
        },
      });
      let health = await restoredBackend.readHealthStatus();
      for (
        let attempt = 0;
        attempt < 100 && health.sessionBootstrap.status === "pending";
        attempt += 1
      ) {
        await delay(10);
        health = await restoredBackend.readHealthStatus();
      }

      expect(calls).toEqual([]);
      await expect(restoredBackend.listEndpoints()).resolves.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            endpointId: activation.endpointId,
            status: "active",
            healthStatus: "healthy",
            routingEligible: true,
          }),
        ]),
      );
    } finally {
      await firstBackend?.shutdown?.();
      await restoredBackend?.shutdown?.();
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  });

  test("admits a remote effort instance only after its exact readiness request succeeds", async () => {
    const runtimeStateRoot = path.join(os.tmpdir(), `remote-admission-${Date.now()}`);
    const scopeId = "remote-admission-tests";
    const originalApiKey = process.env.DEEPSEEK_API_KEY;
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    process.env.DEEPSEEK_API_KEY = "test-deepseek-key";

    try {
      const backend = await (
        bridge as {
          createRuntimeBridgeBackend: (options: {
            repoRoot: string;
            fixtureRoot: string;
            runtimeStateRoot: string;
            scopeId: string;
            networkFetcher: typeof fetch;
          }) => Promise<{
            upsertProviderAccount: (body: Record<string, unknown>) => Promise<unknown>;
            activateEndpoint: (body: Record<string, unknown>) => Promise<{
              endpointId: string;
              status: string;
            }>;
            listEndpoints: () => Promise<
              readonly { endpointId: string; lifecycleState: string; healthStatus: string }[]
            >;
            subscribeTelemetry: (listener: (event: unknown) => void) => () => void;
            shutdown?: () => Promise<void>;
          }>;
        }
      ).createRuntimeBridgeBackend({
        repoRoot,
        fixtureRoot: testFixtureRoot,
        runtimeStateRoot,
        scopeId,
        networkFetcher: async (input, init) => {
          calls.push({ url: String(input), init });
          if (String(input).endsWith("/chat/completions")) {
            return new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }), {
              status: 200,
              headers: { "content-type": "application/json" },
            });
          }
          if (String(input).endsWith("/models")) {
            return new Response(JSON.stringify({ data: [{ id: "deepseek/deepseek-v4-flash" }] }), {
              status: 200,
              headers: { "content-type": "application/json" },
            });
          }
          throw new Error(`Unexpected admission request ${String(input)}`);
        },
      });
      try {
        const revisionEvents: Record<string, unknown>[] = [];
        const unsubscribe = backend.subscribeTelemetry((event) => {
          if (
            typeof event === "object" &&
            event !== null &&
            (event as { eventName?: unknown }).eventName === "revision.update"
          ) {
            revisionEvents.push(event as Record<string, unknown>);
          }
        });
        await backend.upsertProviderAccount({
          providerAccountId: "deepseek.personal.admission",
          providerId: "deepseek",
          providerKind: "provider-openai",
          orgScope: "personal",
          accountScope: "workspace-default",
          credentialRef: { backend: "env", ref: "DEEPSEEK_API_KEY" },
          authMode: "api-key-static",
          regionPolicy: { mode: "prefer", regions: ["global"] },
          baseUrlOverride: "https://api.deepseek.example/v1",
          allowedModels: ["deepseek/deepseek-v4-flash"],
          modelRoleBindings: [{ modelId: "deepseek/deepseek-v4-flash", roleIds: ["general.chat"] }],
          deniedModels: [],
          entitlementTags: ["chat"],
          budgetPolicyRef: "budget.default",
          quotaPolicyRef: "quota.default",
          status: "active",
          healthStatus: "healthy",
          rotationState: "stable",
        });

        const activation = await backend.activateEndpoint({
          providerAccountId: "deepseek.personal.admission",
          modelId: "deepseek/deepseek-v4-flash",
          region: "global",
          reasoningEffort: "high",
        });
        expect(activation.status).toBe("active");
        expect(calls.some((call) => call.url.endsWith("/chat/completions"))).toBe(true);
        const admissionCall = calls.find((call) => call.url.endsWith("/chat/completions"));
        expect(JSON.parse(String(admissionCall?.init?.body))).toEqual(
          expect.objectContaining({
            model: "deepseek/deepseek-v4-flash",
            reasoning_effort: "high",
          }),
        );
        expect(await backend.listEndpoints()).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              endpointId: activation.endpointId,
              status: "active",
              healthStatus: "healthy",
            }),
          ]),
        );
        const receiptRoot = path.join(runtimeStateRoot, scopeId, "endpoint-admission");
        const receiptNames = await readdir(receiptRoot);
        expect(receiptNames).toHaveLength(1);
        const receiptText = await readFile(path.join(receiptRoot, receiptNames[0] ?? ""), "utf8");
        expect(JSON.parse(receiptText)).toEqual(
          expect.objectContaining({
            schemaVersion: "runtime-endpoint-admission.v2",
            endpointId: activation.endpointId,
            providerAccountId: "deepseek.personal.admission",
            modelId: "deepseek/deepseek-v4-flash",
            reasoningEffort: "high",
            adapterFamily: "openai-compatible-chat-completions",
            credentialBindingSha256: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
            lifecycleState: "active",
            reasonCode: "admission_succeeded",
            healthEvidence: "endpoint-executed",
            secretFree: true,
          }),
        );
        expect(receiptText).not.toContain("test-deepseek-key");
        expect(revisionEvents).toEqual([
          expect.objectContaining({
            eventName: "revision.update",
            revision: 1,
            membershipRevision: expect.any(String),
          }),
        ]);
        unsubscribe();
      } finally {
        await backend.shutdown?.();
      }
    } finally {
      if (originalApiKey === undefined) {
        delete process.env.DEEPSEEK_API_KEY;
      } else {
        process.env.DEEPSEEK_API_KEY = originalApiKey;
      }
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  });

  test("keeps a 503 effort instance degraded and ineligible at admission", async () => {
    const runtimeStateRoot = path.join(os.tmpdir(), `remote-admission-failure-${Date.now()}`);
    const scopeId = "remote-admission-failure-tests";
    const originalApiKey = process.env.DEEPSEEK_API_KEY;
    let admissionAttempts = 0;
    process.env.DEEPSEEK_API_KEY = "test-deepseek-key";
    try {
      const backend = await (
        bridge as {
          createRuntimeBridgeBackend: (options: {
            repoRoot: string;
            fixtureRoot: string;
            runtimeStateRoot: string;
            scopeId: string;
            networkFetcher: typeof fetch;
          }) => Promise<{
            upsertProviderAccount: (body: Record<string, unknown>) => Promise<unknown>;
            activateEndpoint: (body: Record<string, unknown>) => Promise<{
              endpointId: string;
              status: string;
            }>;
            listEndpoints: () => Promise<
              readonly {
                endpointId: string;
                status: string;
                healthStatus: string;
                routingEligible: boolean;
                benchmarkEligible: boolean;
              }[]
            >;
            shutdown?: () => Promise<void>;
          }>;
        }
      ).createRuntimeBridgeBackend({
        repoRoot,
        fixtureRoot: testFixtureRoot,
        runtimeStateRoot,
        scopeId,
        networkFetcher: async (input) => {
          if (String(input).endsWith("/chat/completions")) {
            admissionAttempts += 1;
            return new Response(
              JSON.stringify({
                ...(admissionAttempts === 1
                  ? { error: { message: "temporary upstream outage" } }
                  : { choices: [{ message: { content: "ok" } }] }),
              }),
              {
                status: admissionAttempts === 1 ? 503 : 200,
                headers: { "content-type": "application/json" },
              },
            );
          }
          if (String(input).endsWith("/models")) {
            return new Response(JSON.stringify({ data: [{ id: "deepseek/deepseek-v4-flash" }] }), {
              status: 200,
              headers: { "content-type": "application/json" },
            });
          }
          throw new Error(`Unexpected admission request ${String(input)}`);
        },
      });
      try {
        await backend.upsertProviderAccount({
          providerAccountId: "deepseek.personal.admission-failure",
          providerId: "deepseek",
          providerKind: "provider-openai",
          orgScope: "personal",
          accountScope: "workspace-default",
          credentialRef: { backend: "env", ref: "DEEPSEEK_API_KEY" },
          authMode: "api-key-static",
          regionPolicy: { mode: "prefer", regions: ["global"] },
          baseUrlOverride: "https://api.deepseek.example/v1",
          allowedModels: ["deepseek/deepseek-v4-flash"],
          modelRoleBindings: [{ modelId: "deepseek/deepseek-v4-flash", roleIds: ["general.chat"] }],
          deniedModels: [],
          entitlementTags: ["chat"],
          budgetPolicyRef: "budget.default",
          quotaPolicyRef: "quota.default",
          status: "active",
          healthStatus: "healthy",
          rotationState: "stable",
        });
        const activation = await backend.activateEndpoint({
          providerAccountId: "deepseek.personal.admission-failure",
          modelId: "deepseek/deepseek-v4-flash",
          region: "global",
          reasoningEffort: "high",
        });
        expect(activation.status).toBe("degraded");
        expect(await backend.listEndpoints()).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              endpointId: activation.endpointId,
              status: "degraded",
              healthStatus: "provider-unavailable",
              routingEligible: false,
              benchmarkEligible: false,
            }),
          ]),
        );
        const retry = await backend.activateEndpoint({
          providerAccountId: "deepseek.personal.admission-failure",
          modelId: "deepseek/deepseek-v4-flash",
          region: "global",
          reasoningEffort: "high",
        });
        expect(retry).toEqual(
          expect.objectContaining({ endpointId: activation.endpointId, status: "active" }),
        );
        expect(admissionAttempts).toBe(2);
        expect(await backend.listEndpoints()).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              endpointId: activation.endpointId,
              status: "active",
              healthStatus: "healthy",
              routingEligible: true,
              benchmarkEligible: true,
            }),
          ]),
        );
      } finally {
        await backend.shutdown?.();
      }
    } finally {
      if (originalApiKey === undefined) {
        delete process.env.DEEPSEEK_API_KEY;
      } else {
        process.env.DEEPSEEK_API_KEY = originalApiKey;
      }
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  });

  test("serializes concurrent add requests for one exact effort instance into one readiness probe", async () => {
    const runtimeStateRoot = path.join(os.tmpdir(), `remote-admission-lock-${Date.now()}`);
    const scopeId = "remote-admission-lock-tests";
    const originalApiKey = process.env.DEEPSEEK_API_KEY;
    let probeCalls = 0;
    let releaseProbe: (() => void) | undefined;
    const probeStarted = new Promise<void>((resolve) => {
      releaseProbe = resolve;
    });
    process.env.DEEPSEEK_API_KEY = "test-deepseek-key";

    try {
      const backend = await (
        bridge as {
          createRuntimeBridgeBackend: (options: {
            repoRoot: string;
            fixtureRoot: string;
            runtimeStateRoot: string;
            scopeId: string;
            networkFetcher: typeof fetch;
          }) => Promise<{
            upsertProviderAccount: (body: Record<string, unknown>) => Promise<unknown>;
            activateEndpoint: (body: Record<string, unknown>) => Promise<{
              endpointId: string;
              status: string;
            }>;
            shutdown?: () => Promise<void>;
          }>;
        }
      ).createRuntimeBridgeBackend({
        repoRoot,
        fixtureRoot: testFixtureRoot,
        runtimeStateRoot,
        scopeId,
        networkFetcher: async (input) => {
          if (String(input).endsWith("/chat/completions")) {
            probeCalls += 1;
            await probeStarted;
            return new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }), {
              status: 200,
              headers: { "content-type": "application/json" },
            });
          }
          if (String(input).endsWith("/models")) {
            return new Response(JSON.stringify({ data: [{ id: "deepseek/deepseek-v4-flash" }] }), {
              status: 200,
              headers: { "content-type": "application/json" },
            });
          }
          throw new Error(`Unexpected admission request ${String(input)}`);
        },
      });
      try {
        await backend.upsertProviderAccount({
          providerAccountId: "deepseek.personal.admission-lock",
          providerId: "deepseek",
          providerKind: "provider-openai",
          orgScope: "personal",
          accountScope: "workspace-default",
          credentialRef: { backend: "env", ref: "DEEPSEEK_API_KEY" },
          authMode: "api-key-static",
          regionPolicy: { mode: "prefer", regions: ["global"] },
          baseUrlOverride: "https://api.deepseek.example/v1",
          allowedModels: ["deepseek/deepseek-v4-flash"],
          modelRoleBindings: [{ modelId: "deepseek/deepseek-v4-flash", roleIds: ["general.chat"] }],
          deniedModels: [],
          entitlementTags: ["chat"],
          budgetPolicyRef: "budget.default",
          quotaPolicyRef: "quota.default",
          status: "active",
          healthStatus: "healthy",
          rotationState: "stable",
        });
        const activationBody = {
          providerAccountId: "deepseek.personal.admission-lock",
          modelId: "deepseek/deepseek-v4-flash",
          region: "global",
          reasoningEffort: "max",
        };
        const first = backend.activateEndpoint(activationBody);
        await delay(0);
        const duplicate = backend.activateEndpoint(activationBody);
        releaseProbe?.();

        await expect(first).resolves.toEqual(expect.objectContaining({ status: "active" }));
        await expect(duplicate).rejects.toThrow(/already active/);
        expect(probeCalls).toBe(1);
      } finally {
        await backend.shutdown?.();
      }
    } finally {
      if (originalApiKey === undefined) {
        delete process.env.DEEPSEEK_API_KEY;
      } else {
        process.env.DEEPSEEK_API_KEY = originalApiKey;
      }
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  });

  test("skips remote-health probes in decision_only mode", async () => {
    const runtimeStateRoot = path.join(os.tmpdir(), `remote-health-skip-${Date.now()}`);
    const scopeId = "remote-health-skip-tests";

    try {
      const backend = await (
        bridge as {
          createRuntimeBridgeBackend: (options: {
            repoRoot: string;
            fixtureRoot: string;
            runtimeStateRoot: string;
            scopeId: string;
          }) => Promise<{
            readHealthStatus: () => Promise<{
              sessionBootstrap: {
                status: string;
                stages: readonly { stageId: string; status: string; message?: string }[];
              };
            }>;
            shutdown?: () => Promise<void>;
          }>;
        }
      ).createRuntimeBridgeBackend({
        repoRoot,
        fixtureRoot: testFixtureRoot,
        runtimeStateRoot,
        scopeId,
      });

      let health = await backend.readHealthStatus();
      for (
        let attempt = 0;
        attempt < 20 && health.sessionBootstrap.status === "running";
        attempt += 1
      ) {
        await delay(50);
        health = await backend.readHealthStatus();
      }

      const remoteHealthStage = health.sessionBootstrap.stages.find(
        (stage) => stage.stageId === "remote-health",
      );
      expect(remoteHealthStage?.status).toBe("skipped");
      expect(remoteHealthStage?.message).toContain("decision_only");
      await backend.shutdown?.();
    } finally {
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  });
});
