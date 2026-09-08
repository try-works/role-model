import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";

import {
  initializeSqliteMemory,
  listRuntimeEndpoints,
  resolveSqliteMemoryLocation,
  upsertProviderAccount,
  upsertRuntimeEndpoint,
  upsertRuntimeMaintenanceValue,
} from "@role-model-router/sqlite-memory";

import {
  EXECUTION_CIRCUIT_BREAKER_MAINTENANCE_KEY,
  EXECUTION_HALF_OPEN_LEASE_MS,
  type ExecutionCircuitState,
  claimExecutionCircuitProbe,
  clearExecutionCircuitEndpoint,
  createEmptyExecutionCircuitState,
  evaluateExecutionCircuitEligibility,
  migrateLegacyExecutionCooldownState,
  normalizeExecutionCircuitStateForRestart,
  parseExecutionCircuitState,
  parseRetryAfterMs,
  recordExecutionCircuitFailure,
  releaseExecutionCircuitProbe,
  resolveExecutionCircuitRefusal,
  serializeExecutionCircuitState,
  settleExecutionCircuitProbe,
  toExecutionCircuitReceipt,
} from "../src/execution-circuit-breaker.js";
import {
  createRuntimeBridgeBackend,
  mapChatCompletionsRequest,
  startBridgeServer,
} from "../src/index.js";

const ENDPOINT_ID = "deepseek.personal.deepseek-api-key.global.deepseek-v4-pro";
const START_MS = Date.parse("2026-08-14T08:00:00.000Z");

function admittedAliasEndpoint(
  endpointId: string,
  modelId: string,
  reasoningEffort?: string,
  capabilities: readonly string[] = ["text.chat", "tools.function_calling"],
): Record<string, unknown> {
  return {
    identity: {
      endpoint_id: endpointId,
      endpoint_kind: "remote_api",
      provider_kind: "remote_openai_compat",
      serving_source: "remote-service",
      model_id: modelId,
      runtime_version: "run96-r33-source",
      region: "global",
      ...(reasoningEffort === undefined ? {} : { reasoning_effort: reasoningEffort }),
    },
    declared: {
      endpoint_id: endpointId,
      capabilities,
      modalities: ["text"],
      max_context_tokens: 8_192,
      tool_calling: {
        supported: capabilities.includes("tools.function_calling"),
        style: capabilities.includes("tools.function_calling") ? "openai" : "none",
      },
      supports_embeddings: false,
      platform_constraints: [],
    },
    status: "active",
  };
}

function fail(
  state: ExecutionCircuitState,
  input: {
    errorClass: string;
    nowMs: number;
    statusCode?: number;
    retryAfterMs?: number;
    trafficClass?: "live" | "benchmark" | "health" | "synthetic";
  },
): ExecutionCircuitState {
  return recordExecutionCircuitFailure({
    state,
    endpointId: ENDPOINT_ID,
    errorClass: input.errorClass,
    nowMs: input.nowMs,
    trafficClass: input.trafficClass ?? "live",
    ...(input.statusCode === undefined ? {} : { statusCode: input.statusCode }),
    ...(input.retryAfterMs === undefined ? {} : { retryAfterMs: input.retryAfterMs }),
    source: {
      providerId: "deepseek",
      providerFamily: "deepseek",
      executionFamily: "remote-service",
      adapterFamily: "ai-sdk-openai-compatible",
    },
  }).state;
}

function requiredRecord(state: ExecutionCircuitState, endpointId = ENDPOINT_ID) {
  const record = state.endpoints[endpointId];
  if (!record) {
    throw new Error(`missing execution circuit record for ${endpointId}`);
  }
  return record;
}

describe("execution circuit breaker policy", () => {
  test("[AC-R33-01] two transient live failures preserve the durable endpoint admission and health row", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "run96-r33-ac01-"));
    const endpoint = {
      endpointId: ENDPOINT_ID,
      providerAccountId: "deepseek.personal.account",
      modelId: "deepseek/deepseek-v4-pro",
      region: "global",
      endpointKind: "remote_api",
      servingSource: "remote-service",
      lifecycleState: "active",
      healthStatus: "healthy",
      reasoningEffort: null,
    } as const;
    try {
      const databasePath = initializeSqliteMemory({
        runtimeStateRoot,
        scopeId: "run96-r33-ac01",
        channel: "development",
      }).databasePath;
      upsertRuntimeEndpoint({ databasePath, endpoint });
      const admittedBefore = listRuntimeEndpoints({ databasePath });
      let state = createEmptyExecutionCircuitState();
      for (const nowMs of [START_MS, START_MS + 1_000]) {
        state = recordExecutionCircuitFailure({
          state,
          endpointId: ENDPOINT_ID,
          errorClass: "upstream_connection_error",
          nowMs,
          trafficClass: "live",
          source: {
            providerId: "deepseek",
            providerFamily: "deepseek",
            sourceAttemptId: `ac01-attempt-${nowMs}`,
            sourceRequestId: `ac01-request-${nowMs}`,
            sourceRoutingDecisionId: `ac01-decision-${nowMs}`,
          },
        }).state;
      }

      expect(state.endpoints[ENDPOINT_ID]).toMatchObject({
        circuitState: "open",
        failureCategory: "connection",
        failureCount: 2,
      });
      expect(listRuntimeEndpoints({ databasePath })).toEqual(admittedBefore);
      expect(listRuntimeEndpoints({ databasePath })[0]).toMatchObject({
        endpointId: ENDPOINT_ID,
        lifecycleState: "active",
        healthStatus: "healthy",
      });
    } finally {
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  });

  test("[AC-R33-02] route refusal exposes requested model, denied endpoints, cooldowns, next probe, and retry-after metadata", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "run96-r33-ac02-"));
    const scopeId = "run96-r33-ac02";
    const endpointId = "test.capture.chat-v1";
    const requestedModel = "deepseek/chat-capture-v1";
    const repoRoot = path.resolve(import.meta.dirname, "..", "..", "..", "..");
    const fixtureRoot = path.join(import.meta.dirname, "fixtures");
    let server: Awaited<ReturnType<typeof startBridgeServer>> | undefined;
    const backend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot,
      runtimeStateRoot,
      scopeId,
      networkFetcher: async () => {
        throw new Error("provider execution must not occur while the endpoint is cooling down");
      },
    });

    try {
      const databasePath = resolveSqliteMemoryLocation({ runtimeStateRoot, scopeId });
      const circuit = recordExecutionCircuitFailure({
        state: createEmptyExecutionCircuitState(),
        endpointId,
        errorClass: "rate_limited",
        statusCode: 429,
        retryAfterMs: 60_000,
        nowMs: Date.now(),
        trafficClass: "live",
        source: {
          providerId: "deepseek",
          providerFamily: "deepseek",
          sourceAttemptId: "ac02-attempt",
          sourceRequestId: "ac02-request",
          sourceRoutingDecisionId: "ac02-decision",
        },
      }).state;
      upsertRuntimeMaintenanceValue({
        databasePath,
        key: EXECUTION_CIRCUIT_BREAKER_MAINTENANCE_KEY,
        value: serializeExecutionCircuitState(circuit),
      });

      server = await startBridgeServer({
        host: "127.0.0.1",
        port: 0,
        registry: backend.registry,
        executeChatCompletions: backend.executeChatCompletions,
        executeResponses: backend.executeResponses,
      });

      const response = await fetch(`http://127.0.0.1:${server.port}/v1/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-request-id": "ac02-http-request" },
        body: JSON.stringify({
          model: requestedModel,
          messages: [{ role: "user", content: "surface cooldown refusal metadata" }],
        }),
      });
      expect(response.status).toBe(503);
      const payload = (await response.json()) as {
        readonly error?: Record<string, unknown>;
      };
      expect(payload.error).toEqual(
        expect.objectContaining({
          requestedModel,
          deniedEndpointIds: [endpointId],
          nextProbeAtMs: expect.any(Number),
          retryAfterMs: expect.any(Number),
          executionCooldowns: [
            expect.objectContaining({
              endpointId,
              circuitState: "open",
              nextProbeAtMs: expect.any(Number),
              retryAfterMs: expect.any(Number),
            }),
          ],
        }),
      );
    } finally {
      await server?.close();
      await backend.shutdown();
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  });

  test("[R25/R33] operator candidates preserve auth, quota, and transient circuit reasons", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "run96-r33-candidates-"));
    const scopeId = "run96-r33-candidates";
    const endpointId = "test.capture.chat-v1";
    const repoRoot = path.resolve(import.meta.dirname, "..", "..", "..", "..");
    const fixtureRoot = path.join(import.meta.dirname, "fixtures");
    const backend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot,
      runtimeStateRoot,
      scopeId,
      runtimeVendorStartup: "disabled",
      networkFetcher: async () => {
        throw new Error("candidate projection must not execute a provider request");
      },
    });

    try {
      const databasePath = resolveSqliteMemoryLocation({ runtimeStateRoot, scopeId });
      const cases = [
        { errorClass: "provider_auth_error", statusCode: 401, circuitState: "blocked_auth" },
        { errorClass: "quota_exhausted", statusCode: 402, circuitState: "blocked_quota" },
        { errorClass: "upstream_error", statusCode: 503, circuitState: "open" },
      ] as const;

      for (const [index, input] of cases.entries()) {
        const circuit = recordExecutionCircuitFailure({
          state: createEmptyExecutionCircuitState(),
          endpointId,
          errorClass: input.errorClass,
          statusCode: input.statusCode,
          nowMs: Date.now() + index,
          trafficClass: "live",
          source: {
            providerId: "deepseek",
            providerFamily: "deepseek",
            sourceAttemptId: `r33-candidate-attempt-${index}`,
          },
        }).state;
        upsertRuntimeMaintenanceValue({
          databasePath,
          key: EXECUTION_CIRCUIT_BREAKER_MAINTENANCE_KEY,
          value: serializeExecutionCircuitState(circuit),
        });

        const candidates = await backend.listRouterCandidates();
        const candidate = candidates.find(
          (entry) =>
            typeof entry === "object" &&
            entry !== null &&
            (entry as { endpointId?: unknown }).endpointId === endpointId,
        ) as
          | {
              readonly circuitState?: string;
              readonly executionCooldown?: { readonly circuitState?: string };
              readonly healthStatus?: string;
            }
          | undefined;
        expect(candidate).toMatchObject({
          healthStatus: "degraded",
          circuitState: input.circuitState,
          executionCooldown: { circuitState: input.circuitState },
        });
      }
    } finally {
      await backend.shutdown();
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  });

  test("[R33] production alias requests do not execute a duplicate same-owner half-open probe", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "run96-r33-concurrency-"));
    const scopeId = "run96-r33-concurrency";
    const modelId = "deepseek/deepseek-v4-pro";
    const accountId = "deepseek.personal.r33-concurrency";
    const endpointId = `${accountId}.global.deepseek-v4-pro`;
    const aliasId = "run96.r33-concurrency";
    const repoRoot = path.resolve(import.meta.dirname, "..", "..", "..", "..");
    const fixtureRoot = path.join(import.meta.dirname, "fixtures");
    const unifiedRuntimeConfigPath = path.join(runtimeStateRoot, "unified-runtime.yaml");
    const databasePath = initializeSqliteMemory({
      runtimeStateRoot,
      scopeId,
      channel: "development",
    }).databasePath;
    upsertProviderAccount({
      databasePath,
      account: {
        providerAccountId: accountId,
        providerId: "deepseek",
        providerKind: "provider-openai",
        orgScope: "personal",
        accountScope: "workspace-default",
        credentialRef: { backend: "env", ref: "RUN96_R33_CONCURRENCY_KEY" },
        authMode: "api-key-static",
        regionPolicy: { mode: "prefer", regions: ["global"] },
        baseUrlOverride: "http://127.0.0.1:3471/v1",
        allowedModels: [modelId],
        modelRoleBindings: [],
        deniedModels: [],
        entitlementTags: ["chat"],
        budgetPolicyRef: "budget.test",
        quotaPolicyRef: "quota.test",
        status: "active",
        healthStatus: "healthy",
        rotationState: "stable",
      },
    });
    const providerCredentialEnvironment = {
      RUN96_R33_CONCURRENCY_KEY: "run96-r33-test-key",
    };
    const seedBackend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot,
      runtimeStateRoot,
      scopeId,
      runtimeVendorStartup: "disabled",
      providerCredentialEnvironment,
      networkFetcher: async () =>
        new Response(JSON.stringify({ data: [{ id: modelId }] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    });
    await seedBackend.activateEndpoint({
      providerAccountId: accountId,
      modelId,
      region: "global",
    });
    await seedBackend.shutdown();
    await writeFile(
      unifiedRuntimeConfigPath,
      [
        'version: "1.0"',
        "execution_mode: remote_only",
        "model_aliases:",
        `  ${aliasId}:`,
        '    mode: "basic"',
        "    model_ids:",
        `      - "${modelId}"`,
        "    endpoint_ids:",
        `      - "${endpointId}"`,
        "",
      ].join("\n"),
      "utf8",
    );

    let providerCalls = 0;
    let releaseProvider: () => void = () => undefined;
    const providerGate = new Promise<void>((resolve) => {
      releaseProvider = resolve;
    });
    const backend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot,
      runtimeStateRoot,
      scopeId,
      unifiedRuntimeConfigPath,
      runtimeVendorStartup: "disabled",
      providerCredentialEnvironment,
      networkFetcher: async (_input, init) => {
        const body = typeof init?.body === "string" ? init.body : "";
        if (body.length === 0) {
          return new Response(JSON.stringify({ data: [{ id: modelId }] }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
        if (body.includes("role-model admission readiness probe")) {
          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
        providerCalls += 1;
        await providerGate;
        return new Response(
          JSON.stringify({
            id: "run96-r33-concurrency-response",
            object: "chat.completion",
            created: 1,
            model: modelId,
            choices: [
              {
                index: 0,
                message: { role: "assistant", content: "ok" },
                finish_reason: "stop",
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      },
    });

    try {
      const circuit = recordExecutionCircuitFailure({
        state: createEmptyExecutionCircuitState(),
        endpointId,
        errorClass: "upstream_error",
        statusCode: 503,
        nowMs: Date.now() - 10_000,
        trafficClass: "live",
      }).state;
      upsertRuntimeMaintenanceValue({
        databasePath,
        key: EXECUTION_CIRCUIT_BREAKER_MAINTENANCE_KEY,
        value: serializeExecutionCircuitState(circuit),
      });

      const request = {
        model: aliasId,
        messages: [{ role: "user", content: "exercise the real half-open route" }],
      } as const;
      const firstPromise = backend.executeChatCompletions(request, "r33-same-owner");
      for (let attempt = 0; attempt < 100 && providerCalls === 0; attempt += 1) {
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }
      expect(providerCalls).toBe(1);

      const secondPromise = backend.executeChatCompletions(request, "r33-same-owner");
      const second = await secondPromise.then(
        () => ({ ok: true as const }),
        (error: unknown) => ({ ok: false as const, error }),
      );
      expect(second.ok).toBe(false);
      expect(second.error).toMatchObject({ statusCode: 503 });

      releaseProvider();
      await expect(firstPromise).resolves.toMatchObject({ endpointId });
      expect(providerCalls).toBe(1);
    } finally {
      releaseProvider();
      await backend.shutdown();
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  });

  test("[R33] production aliases fall back and expose the primary cooldown to operators", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "run96-r33-fallback-"));
    const scopeId = "run96-r33-fallback";
    const repoRoot = path.resolve(import.meta.dirname, "..", "..", "..", "..");
    const fixtureRoot = path.join(import.meta.dirname, "fixtures");
    const modelId = "moonshot/kimi-k2.5";
    const aliasId = "run96.r33-fallback";
    const primaryAccountId = "moonshot.personal.a-primary";
    const backupAccountId = "moonshot.personal.z-backup";
    const primaryEndpointId = `${primaryAccountId}.global.kimi-k2.5`;
    const backupEndpointId = `${backupAccountId}.global.kimi-k2.5`;
    const unifiedRuntimeConfigPath = path.join(runtimeStateRoot, "unified-runtime.yaml");
    const providerCredentialEnvironment = {
      RUN96_R33_PRIMARY_KEY: "run96-r33-primary-key",
      RUN96_R33_BACKUP_KEY: "run96-r33-backup-key",
    };
    const databasePath = initializeSqliteMemory({
      runtimeStateRoot,
      scopeId,
      channel: "development",
    }).databasePath;
    const account = (providerAccountId: string, credentialRef: string) => ({
      providerAccountId,
      providerId: "moonshot",
      providerKind: "provider-openai",
      orgScope: "personal",
      accountScope: "workspace-default",
      credentialRef: { backend: "env" as const, ref: credentialRef },
      authMode: "api-key-static",
      regionPolicy: { mode: "prefer" as const, regions: ["global"] },
      baseUrlOverride: "https://api.moonshot.ai/v1",
      allowedModels: [modelId],
      modelRoleBindings: [],
      deniedModels: [],
      entitlementTags: ["chat"],
      budgetPolicyRef: "budget.default",
      quotaPolicyRef: "quota.default",
      status: "active" as const,
      healthStatus: "healthy" as const,
      rotationState: "stable" as const,
    });
    upsertProviderAccount({
      databasePath,
      account: account(primaryAccountId, "RUN96_R33_PRIMARY_KEY"),
    });
    upsertProviderAccount({
      databasePath,
      account: account(backupAccountId, "RUN96_R33_BACKUP_KEY"),
    });

    let seedBackend: Awaited<ReturnType<typeof createRuntimeBridgeBackend>> | undefined;
    let backend: Awaited<ReturnType<typeof createRuntimeBridgeBackend>> | undefined;
    try {
      seedBackend = await createRuntimeBridgeBackend({
        repoRoot,
        fixtureRoot,
        runtimeStateRoot,
        scopeId,
        runtimeVendorStartup: "disabled",
        providerCredentialEnvironment,
        networkFetcher: async () =>
          new Response(JSON.stringify({ data: [{ id: modelId }] }), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
      });
      await seedBackend.activateEndpoint({
        providerAccountId: primaryAccountId,
        modelId,
        region: "global",
      });
      await seedBackend.activateEndpoint({
        providerAccountId: backupAccountId,
        modelId,
        region: "global",
      });
      await seedBackend.shutdown();
      seedBackend = undefined;

      await writeFile(
        unifiedRuntimeConfigPath,
        [
          'version: "1.0"',
          "execution_mode: remote_only",
          "model_aliases:",
          `  ${aliasId}:`,
          '    mode: "basic"',
          "    model_ids:",
          `      - "${modelId}"`,
          "    endpoint_ids:",
          `      - "${primaryEndpointId}"`,
          `      - "${backupEndpointId}"`,
          "",
        ].join("\n"),
        "utf8",
      );

      const seenAuthorizations: string[] = [];
      let primaryAttempts = 0;
      backend = await createRuntimeBridgeBackend({
        repoRoot,
        fixtureRoot,
        runtimeStateRoot,
        scopeId,
        unifiedRuntimeConfigPath,
        runtimeVendorStartup: "disabled",
        providerCredentialEnvironment,
        networkFetcher: async (input, init) => {
          const url =
            typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
          const body = typeof init?.body === "string" ? init.body : "";
          if (body.length === 0) {
            return new Response(JSON.stringify({ data: [{ id: modelId }] }), {
              status: 200,
              headers: { "content-type": "application/json" },
            });
          }
          let parsedBody: { readonly messages?: readonly { readonly content?: unknown }[] } = {};
          try {
            parsedBody = JSON.parse(body) as typeof parsedBody;
          } catch {
            // The provider path below will report malformed requests normally.
          }
          if (parsedBody.messages?.[0]?.content === "role-model admission readiness probe") {
            return new Response(JSON.stringify({ ok: true }), {
              status: 200,
              headers: { "content-type": "application/json" },
            });
          }
          if (url !== "https://api.moonshot.ai/v1/chat/completions") {
            throw new Error(`Unexpected network request: ${url}`);
          }
          const headers = (init?.headers ?? {}) as Record<string, string>;
          const authorization = headers.authorization ?? headers.Authorization ?? "";
          seenAuthorizations.push(authorization);
          if (authorization === "Bearer run96-r33-primary-key") {
            primaryAttempts += 1;
            return new Response(
              JSON.stringify({ error: { message: "temporary provider outage" } }),
              { status: 503, headers: { "content-type": "application/json" } },
            );
          }
          if (authorization === "Bearer run96-r33-backup-key") {
            return new Response(
              JSON.stringify({
                id: "run96-r33-backup-response",
                object: "chat.completion",
                created: 1,
                model: modelId,
                choices: [
                  {
                    index: 0,
                    message: { role: "assistant", content: "backup handled alias request" },
                    finish_reason: "stop",
                  },
                ],
                usage: { prompt_tokens: 10, completion_tokens: 4, total_tokens: 14 },
              }),
              { status: 200, headers: { "content-type": "application/json" } },
            );
          }
          throw new Error(`Unexpected authorization header: ${authorization}`);
        },
      });

      const request = {
        model: aliasId,
        messages: [{ role: "user", content: "exercise alias fallback" }],
      } as const;
      const result = await backend.executeChatCompletions(request, "r33-alias-fallback-1");
      expect(result.endpointId).toBe(backupEndpointId);
      expect(result.outputText).toBe("backup handled alias request");
      expect(primaryAttempts).toBe(1);
      expect(seenAuthorizations).toEqual([
        "Bearer run96-r33-primary-key",
        "Bearer run96-r33-backup-key",
      ]);

      const candidates = await backend.listRouterCandidates();
      const primaryCandidate = candidates.find(
        (entry) =>
          typeof entry === "object" &&
          entry !== null &&
          (entry as { endpointId?: unknown }).endpointId === primaryEndpointId,
      );
      expect(primaryCandidate).toMatchObject({
        circuitState: "open",
        executionCooldown: { circuitState: "open", failureCount: 1 },
      });

      const followUp = await backend.executeChatCompletions(
        { ...request, messages: [{ role: "user", content: "exercise alias cooldown" }] },
        "r33-alias-fallback-2",
      );
      expect(followUp.endpointId).toBe(backupEndpointId);
      expect(seenAuthorizations).toEqual([
        "Bearer run96-r33-primary-key",
        "Bearer run96-r33-backup-key",
        "Bearer run96-r33-backup-key",
      ]);
    } finally {
      await backend?.shutdown();
      await seedBackend?.shutdown();
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  });

  test("[AC-R33-04] a successful half-open alias request clears only the execution circuit and keeps admission routable", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "run96-r33-ac04-"));
    const modelId = "deepseek/deepseek-v4-pro";
    const aliasRegistry = {
      endpoints: [admittedAliasEndpoint(ENDPOINT_ID, modelId)],
      diagnostics: [],
      lifecycleSummary: { active: 1, degraded: 0, offline: 0 },
    };
    const aliases = [{ aliasId: "deepseek.remote-only", mode: "basic", modelIds: [modelId] }];
    const endpoint = {
      endpointId: ENDPOINT_ID,
      providerAccountId: "deepseek.personal.account",
      modelId,
      region: "global",
      endpointKind: "remote_api",
      servingSource: "remote-service",
      lifecycleState: "active",
      healthStatus: "healthy",
      reasoningEffort: null,
    } as const;
    try {
      const databasePath = initializeSqliteMemory({
        runtimeStateRoot,
        scopeId: "run96-r33-ac04",
        channel: "development",
      }).databasePath;
      upsertRuntimeEndpoint({ databasePath, endpoint });
      const admittedBefore = listRuntimeEndpoints({ databasePath });
      const initialAliasPlan = mapChatCompletionsRequest(
        aliasRegistry as never,
        {
          model: "deepseek.remote-only",
          messages: [{ role: "user", content: "Use the admitted alias." }],
        } as never,
        "ac04-alias-before",
        aliases,
      );
      expect(initialAliasPlan.routingRequest.allowEndpoints).toEqual([ENDPOINT_ID]);

      let state = recordExecutionCircuitFailure({
        state: createEmptyExecutionCircuitState(),
        endpointId: ENDPOINT_ID,
        errorClass: "upstream_error",
        statusCode: 503,
        nowMs: START_MS,
        trafficClass: "live",
      }).state;
      const probe = claimExecutionCircuitProbe({
        state,
        endpointId: ENDPOINT_ID,
        nowMs: START_MS + 2_000,
        probeOwnerId: "ac04-half-open-owner",
      });
      expect(probe.claimed).toBe(true);
      const settled = settleExecutionCircuitProbe({
        state: probe.state,
        endpointId: ENDPOINT_ID,
        probeOwnerId: "ac04-half-open-owner",
        nowMs: START_MS + 2_001,
        result: { outcome: "success" },
      });
      expect(settled.settled).toBe(true);
      state = settled.state;
      expect(state.endpoints[ENDPOINT_ID]).toBeUndefined();

      const recoveredAliasPlan = mapChatCompletionsRequest(
        aliasRegistry as never,
        {
          model: "deepseek.remote-only",
          messages: [{ role: "user", content: "Use the alias after recovery." }],
        } as never,
        "ac04-alias-after",
        aliases,
      );
      expect(recoveredAliasPlan.routingRequest.allowEndpoints).toEqual([ENDPOINT_ID]);
      expect(listRuntimeEndpoints({ databasePath })).toEqual(admittedBefore);
      expect(listRuntimeEndpoints({ databasePath })[0]).toMatchObject({
        endpointId: ENDPOINT_ID,
        lifecycleState: "active",
        healthStatus: "healthy",
      });
    } finally {
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  });

  test("keeps the first connection failure in probation then uses 5s, 15s, 60s, and 5m opens", () => {
    let state = fail(createEmptyExecutionCircuitState(), {
      errorClass: "upstream_connection_error",
      nowMs: START_MS,
    });
    expect(state.endpoints[ENDPOINT_ID]).toMatchObject({
      circuitState: "probation",
      failureCategory: "connection",
      failureCount: 1,
    });
    expect(evaluateExecutionCircuitEligibility(state, ENDPOINT_ID, START_MS)).toMatchObject({
      eligible: true,
      probeRequired: false,
    });

    state = fail(state, { errorClass: "upstream_connection_error", nowMs: START_MS + 1_000 });
    expect(state.endpoints[ENDPOINT_ID]).toMatchObject({
      circuitState: "open",
      failureCount: 2,
      nextProbeAtMs: START_MS + 6_000,
    });

    state = fail(state, { errorClass: "upstream_connection_error", nowMs: START_MS + 2_000 });
    expect(state.endpoints[ENDPOINT_ID]?.nextProbeAtMs).toBe(START_MS + 17_000);
    state = fail(state, { errorClass: "upstream_connection_error", nowMs: START_MS + 3_000 });
    expect(state.endpoints[ENDPOINT_ID]?.nextProbeAtMs).toBe(START_MS + 63_000);
    state = fail(state, { errorClass: "upstream_connection_error", nowMs: START_MS + 4_000 });
    expect(state.endpoints[ENDPOINT_ID]?.nextProbeAtMs).toBe(START_MS + 304_000);
    state = fail(state, { errorClass: "upstream_connection_error", nowMs: START_MS + 5_000 });
    expect(state.endpoints[ENDPOINT_ID]?.nextProbeAtMs).toBe(START_MS + 305_000);
  });

  test("resets a connection sequence outside 60 seconds and every sequence after five quiet minutes", () => {
    let state = fail(createEmptyExecutionCircuitState(), {
      errorClass: "upstream_connection_error",
      nowMs: START_MS,
    });
    state = fail(state, {
      errorClass: "upstream_connection_error",
      nowMs: START_MS + 60_001,
    });
    expect(state.endpoints[ENDPOINT_ID]).toMatchObject({
      circuitState: "probation",
      failureCount: 1,
    });

    state = fail(state, {
      errorClass: "upstream_error",
      statusCode: 503,
      nowMs: START_MS + 61_000,
    });
    expect(state.endpoints[ENDPOINT_ID]).toMatchObject({
      failureCategory: "provider_5xx",
      failureCount: 1,
      nextProbeAtMs: START_MS + 63_000,
    });
    state = fail(state, {
      errorClass: "upstream_error",
      statusCode: 503,
      nowMs: START_MS + 363_001,
    });
    expect(state.endpoints[ENDPOINT_ID]).toMatchObject({
      failureCount: 1,
      nextProbeAtMs: START_MS + 365_001,
    });
  });

  test("uses the provider 5xx 2s, 10s, 30s, and 2m capped ladder", () => {
    let state = createEmptyExecutionCircuitState();
    const expectedDurations = [2_000, 10_000, 30_000, 120_000, 120_000];
    let nowMs = START_MS;
    for (const durationMs of expectedDurations) {
      state = fail(state, { errorClass: "upstream_error", statusCode: 503, nowMs });
      expect(state.endpoints[ENDPOINT_ID]?.nextProbeAtMs).toBe(nowMs + durationMs);
      nowMs += durationMs;
    }
  });

  test("honors bounded Retry-After and otherwise uses a 30 second rate-limit open", () => {
    let state = fail(createEmptyExecutionCircuitState(), {
      errorClass: "rate_limited",
      statusCode: 429,
      nowMs: START_MS,
      retryAfterMs: 90_000,
    });
    expect(state.endpoints[ENDPOINT_ID]).toMatchObject({
      failureCategory: "rate_limit",
      nextProbeAtMs: START_MS + 90_000,
    });
    state = fail(state, {
      errorClass: "rate_limited",
      statusCode: 429,
      nowMs: START_MS + 90_000,
      retryAfterMs: 900_000,
    });
    expect(state.endpoints[ENDPOINT_ID]?.nextProbeAtMs).toBe(START_MS + 390_000);
    state = fail(createEmptyExecutionCircuitState(), {
      errorClass: "rate_limited",
      statusCode: 429,
      nowMs: START_MS,
    });
    expect(state.endpoints[ENDPOINT_ID]?.nextProbeAtMs).toBe(START_MS + 30_000);
  });

  test("blocks auth and quota explicitly but ignores invalid and non-live failures", () => {
    const auth = fail(createEmptyExecutionCircuitState(), {
      errorClass: "provider_auth_error",
      statusCode: 401,
      nowMs: START_MS,
    });
    expect(auth.endpoints[ENDPOINT_ID]).toMatchObject({ circuitState: "blocked_auth" });
    const quota = fail(createEmptyExecutionCircuitState(), {
      errorClass: "quota_exhausted",
      statusCode: 402,
      nowMs: START_MS,
    });
    expect(quota.endpoints[ENDPOINT_ID]).toMatchObject({ circuitState: "blocked_quota" });
    const invalid = fail(createEmptyExecutionCircuitState(), {
      errorClass: "invalid_request",
      statusCode: 400,
      nowMs: START_MS,
    });
    expect(invalid.endpoints[ENDPOINT_ID]).toBeUndefined();
    const benchmark = fail(createEmptyExecutionCircuitState(), {
      errorClass: "upstream_error",
      statusCode: 503,
      nowMs: START_MS,
      trafficClass: "benchmark",
    });
    expect(benchmark.endpoints[ENDPOINT_ID]).toBeUndefined();
  });

  test("admits exactly one half-open probe while concurrent callers cannot duplicate it", () => {
    let state = fail(createEmptyExecutionCircuitState(), {
      errorClass: "upstream_error",
      statusCode: 503,
      nowMs: START_MS,
    });
    expect(evaluateExecutionCircuitEligibility(state, ENDPOINT_ID, START_MS + 2_000)).toEqual({
      eligible: true,
      probeRequired: true,
    });
    const firstClaim = claimExecutionCircuitProbe({
      state,
      endpointId: ENDPOINT_ID,
      nowMs: START_MS + 2_000,
      probeOwnerId: "req-one",
    });
    expect(firstClaim.claimed).toBe(true);
    state = firstClaim.state;
    expect(state.endpoints[ENDPOINT_ID]).toMatchObject({
      circuitState: "half_open",
      probeOwnerId: "req-one",
    });
    expect(
      claimExecutionCircuitProbe({
        state,
        endpointId: ENDPOINT_ID,
        nowMs: START_MS + 2_001,
        probeOwnerId: "req-two",
      }).claimed,
    ).toBe(false);
    expect(
      releaseExecutionCircuitProbe({
        state,
        endpointId: ENDPOINT_ID,
        probeOwnerId: "req-two",
        nowMs: START_MS + 2_002,
      }).state,
    ).toEqual(state);
    expect(
      clearExecutionCircuitEndpoint(state, ENDPOINT_ID).endpoints[ENDPOINT_ID],
    ).toBeUndefined();
  });

  test("reopens a failed half-open provider attempt with bounded provenance without mutating admission", () => {
    const durableAdmission = {
      lifecycle: "active",
      health: "healthy",
      endpointId: ENDPOINT_ID,
    };
    const durableAdmissionBefore = structuredClone(durableAdmission);
    let state = fail(createEmptyExecutionCircuitState(), {
      errorClass: "upstream_error",
      statusCode: 503,
      nowMs: START_MS,
    });
    const claim = claimExecutionCircuitProbe({
      state,
      endpointId: ENDPOINT_ID,
      nowMs: START_MS + 2_000,
      probeOwnerId: "probe-one",
    });
    expect(claim.claimed).toBe(true);
    state = claim.state;

    const staleOwner = settleExecutionCircuitProbe({
      state,
      endpointId: ENDPOINT_ID,
      probeOwnerId: "probe-two",
      nowMs: START_MS + 2_001,
      result: {
        outcome: "failure",
        errorClass: "upstream_error",
        statusCode: 503,
        source: {
          providerId: "deepseek",
          providerFamily: "deepseek",
          sourceAttemptId: "attempt-stale",
          sourceRequestId: "request-stale",
          sourceRoutingDecisionId: "decision-stale",
        },
      },
    });
    expect(staleOwner).toMatchObject({ settled: false, state });

    const settled = settleExecutionCircuitProbe({
      state,
      endpointId: ENDPOINT_ID,
      probeOwnerId: "probe-one",
      nowMs: START_MS + 2_001,
      result: {
        outcome: "failure",
        errorClass: "upstream_error",
        statusCode: 503,
        source: {
          providerId: "deepseek",
          providerFamily: "deepseek",
          executionFamily: "remote-service",
          adapterFamily: "ai-sdk-openai-compatible",
          sourceAttemptId: "attempt-half-open",
          sourceRequestId: "request-half-open",
          sourceRoutingDecisionId: "decision-half-open",
        },
      },
    });
    expect(settled.settled).toBe(true);
    expect(settled.state.endpoints[ENDPOINT_ID]).toMatchObject({
      circuitState: "open",
      failureCategory: "provider_5xx",
      failureCount: 2,
      nextProbeAtMs: START_MS + 12_001,
      sourceAttemptId: "attempt-half-open",
      sourceRequestId: "request-half-open",
      sourceRoutingDecisionId: "decision-half-open",
    });
    expect(settled.state.endpoints[ENDPOINT_ID]?.nextProbeAtMs).toBeGreaterThan(START_MS + 2_001);
    expect(durableAdmission).toEqual(durableAdmissionBefore);
  });

  test("[AC-R33-08] covers default and fixed-effort siblings across text.chat/tools.function_calling auth, quota, transient, cooldown, expiry, repeated failure, success, and concurrent probes", () => {
    const endpoints = {
      defaultText: "deepseek.default.text-chat",
      fixedHighText: "deepseek.fixed-high.text-chat",
      fixedHighTools: "deepseek.fixed-high.tools.function_calling",
      fixedMax: "deepseek.fixed-max.tools.function_calling",
    } as const;
    const matrixModelId = "deepseek/deepseek-v4-pro";
    const matrixRegistry = {
      endpoints: [
        admittedAliasEndpoint(endpoints.defaultText, matrixModelId, undefined, ["text.chat"]),
        admittedAliasEndpoint(endpoints.fixedHighText, matrixModelId, "high", [
          "text.chat",
          "reasoning",
        ]),
        admittedAliasEndpoint(endpoints.fixedHighTools, matrixModelId, "high", [
          "text.chat",
          "tools.function_calling",
          "reasoning",
        ]),
        admittedAliasEndpoint(endpoints.fixedMax, matrixModelId, "max", [
          "text.chat",
          "tools.function_calling",
          "reasoning",
        ]),
      ],
      diagnostics: [],
      lifecycleSummary: { active: 4, degraded: 0, offline: 0 },
    };
    const matrixAliases = [
      { aliasId: "deepseek.r33-matrix", mode: "basic", modelIds: [matrixModelId] },
    ];
    const defaultPlan = mapChatCompletionsRequest(
      matrixRegistry as never,
      {
        model: "deepseek.r33-matrix",
        messages: [{ role: "user", content: "Use the default text path." }],
      } as never,
      "ac08-default-text",
      matrixAliases,
    );
    expect(defaultPlan.routingRequest.requiredCapabilities).toEqual(["text.chat"]);
    expect(defaultPlan.routingRequest.allowEndpoints).toEqual([
      endpoints.defaultText,
      endpoints.fixedHighText,
      endpoints.fixedHighTools,
      endpoints.fixedMax,
    ]);
    const fixedToolsPlan = mapChatCompletionsRequest(
      matrixRegistry as never,
      {
        model: "deepseek.r33-matrix",
        reasoning_effort: "high",
        messages: [{ role: "user", content: "Use the fixed tool-capable path." }],
        tools: [
          {
            type: "function",
            function: { name: "lookup", parameters: { type: "object", properties: {} } },
          },
        ],
      } as never,
      "ac08-fixed-tools",
      matrixAliases,
    );
    expect(fixedToolsPlan.routingRequest.requiredCapabilities).toEqual(
      expect.arrayContaining(["text.chat", "tools.function_calling"]),
    );
    expect(fixedToolsPlan.routingRequest.allowEndpoints).toEqual([endpoints.fixedHighTools]);
    const durableAdmission = Object.fromEntries(
      Object.values(endpoints).map((endpointId) => [
        endpointId,
        { lifecycle: "active", health: "healthy" },
      ]),
    );
    const durableAdmissionBefore = structuredClone(durableAdmission);

    let state = createEmptyExecutionCircuitState();
    const matrix = [
      {
        endpointId: endpoints.defaultText,
        errorClass: "provider_auth_error",
        statusCode: 401,
        circuitState: "blocked_auth",
        failureCategory: "auth",
      },
      {
        endpointId: endpoints.fixedHighText,
        errorClass: "quota_exhausted",
        statusCode: 402,
        circuitState: "blocked_quota",
        failureCategory: "quota",
      },
      {
        endpointId: endpoints.fixedHighTools,
        errorClass: "upstream_connection_error",
        circuitState: "probation",
        failureCategory: "connection",
      },
      {
        endpointId: endpoints.fixedMax,
        errorClass: "upstream_error",
        statusCode: 503,
        circuitState: "open",
        failureCategory: "provider_5xx",
      },
    ] as const;
    for (const entry of matrix) {
      const result = recordExecutionCircuitFailure({
        state,
        endpointId: entry.endpointId,
        errorClass: entry.errorClass,
        nowMs: START_MS,
        trafficClass: "live",
        ...(entry.statusCode === undefined ? {} : { statusCode: entry.statusCode }),
        source: {
          providerId: "deepseek",
          providerFamily: "deepseek",
          sourceAttemptId: `${entry.endpointId}-attempt`,
          sourceRequestId: `${entry.endpointId}-request`,
          sourceRoutingDecisionId: `${entry.endpointId}-decision`,
        },
      });
      expect(result.changed).toBe(true);
      state = result.state;
      expect(state.endpoints[entry.endpointId]).toMatchObject({
        circuitState: entry.circuitState,
        failureCategory: entry.failureCategory,
      });
    }

    expect(evaluateExecutionCircuitEligibility(state, endpoints.defaultText, START_MS)).toEqual({
      eligible: false,
      probeRequired: false,
    });
    expect(evaluateExecutionCircuitEligibility(state, endpoints.fixedHighText, START_MS)).toEqual({
      eligible: false,
      probeRequired: false,
    });
    expect(evaluateExecutionCircuitEligibility(state, endpoints.fixedHighTools, START_MS)).toEqual({
      eligible: true,
      probeRequired: false,
    });
    expect(
      evaluateExecutionCircuitEligibility(state, endpoints.fixedMax, START_MS + 1_999),
    ).toEqual({
      eligible: false,
      probeRequired: false,
    });
    expect(
      evaluateExecutionCircuitEligibility(state, endpoints.fixedMax, START_MS + 2_000),
    ).toEqual({
      eligible: true,
      probeRequired: true,
    });

    const claim = claimExecutionCircuitProbe({
      state,
      endpointId: endpoints.fixedMax,
      nowMs: START_MS + 2_000,
      probeOwnerId: "fixed-max-probe",
    });
    expect(claim.claimed).toBe(true);
    state = claim.state;
    expect(
      claimExecutionCircuitProbe({
        state,
        endpointId: endpoints.fixedMax,
        nowMs: START_MS + 2_001,
        probeOwnerId: "concurrent-fixed-max-probe",
      }).claimed,
    ).toBe(false);

    const repeatedFailure = settleExecutionCircuitProbe({
      state,
      endpointId: endpoints.fixedMax,
      probeOwnerId: "fixed-max-probe",
      nowMs: START_MS + 2_001,
      result: {
        outcome: "failure",
        errorClass: "upstream_error",
        statusCode: 503,
        source: {
          providerId: "deepseek",
          providerFamily: "deepseek",
          sourceAttemptId: "fixed-max-attempt-2",
          sourceRequestId: "fixed-max-request-2",
          sourceRoutingDecisionId: "fixed-max-decision-2",
        },
      },
    });
    expect(repeatedFailure).toMatchObject({ settled: true });
    expect(repeatedFailure.state.endpoints[endpoints.fixedMax]).toMatchObject({
      circuitState: "open",
      failureCount: 2,
      failureCategory: "provider_5xx",
      nextProbeAtMs: START_MS + 12_001,
      sourceAttemptId: "fixed-max-attempt-2",
    });
    state = repeatedFailure.state;
    expect(
      evaluateExecutionCircuitEligibility(state, endpoints.fixedMax, START_MS + 12_000),
    ).toEqual({ eligible: false, probeRequired: false });
    const secondClaim = claimExecutionCircuitProbe({
      state,
      endpointId: endpoints.fixedMax,
      nowMs: START_MS + 12_001,
      probeOwnerId: "fixed-max-probe-2",
    });
    expect(secondClaim.claimed).toBe(true);
    const recovered = settleExecutionCircuitProbe({
      state: secondClaim.state,
      endpointId: endpoints.fixedMax,
      probeOwnerId: "fixed-max-probe-2",
      nowMs: START_MS + 12_002,
      result: { outcome: "success" },
    });
    expect(recovered).toMatchObject({ settled: true });
    state = recovered.state;
    expect(state.endpoints[endpoints.fixedMax]).toBeUndefined();
    expect(state.endpoints[endpoints.defaultText]?.circuitState).toBe("blocked_auth");
    expect(state.endpoints[endpoints.fixedHighText]?.circuitState).toBe("blocked_quota");
    expect(state.endpoints[endpoints.fixedHighTools]?.circuitState).toBe("probation");

    expect(
      resolveExecutionCircuitRefusal(
        [
          toExecutionCircuitReceipt(requiredRecord(state, endpoints.defaultText), START_MS),
          toExecutionCircuitReceipt(requiredRecord(state, endpoints.fixedHighText), START_MS),
        ],
        START_MS,
      ),
    ).toMatchObject({ statusCode: 400, code: "endpoint_configuration_blocked" });
    expect(durableAdmission).toEqual(durableAdmissionBefore);
  });

  test("recovers an abandoned half-open claim as an immediately probeable open circuit", () => {
    let state = fail(createEmptyExecutionCircuitState(), {
      errorClass: "upstream_error",
      statusCode: 503,
      nowMs: START_MS,
    });
    state = claimExecutionCircuitProbe({
      state,
      endpointId: ENDPOINT_ID,
      nowMs: START_MS + 2_000,
      probeOwnerId: "crashed-request",
    }).state;
    const recovered = normalizeExecutionCircuitStateForRestart(state, START_MS + 3_000);
    expect(recovered.endpoints[ENDPOINT_ID]).toMatchObject({
      circuitState: "open",
      nextProbeAtMs: START_MS + 3_000,
    });
    expect(recovered.endpoints[ENDPOINT_ID]?.probeOwnerId).toBeUndefined();
  });

  test("bounds abandoned half-open claims in process and rejects same-owner duplicates", () => {
    const opened = fail(createEmptyExecutionCircuitState(), {
      errorClass: "upstream_error",
      statusCode: 503,
      nowMs: START_MS,
    });
    const firstClaimAt = START_MS + 2_000;
    const firstClaim = claimExecutionCircuitProbe({
      state: opened,
      endpointId: ENDPOINT_ID,
      nowMs: firstClaimAt,
      probeOwnerId: "same-owner",
    });
    expect(firstClaim.claimed).toBe(true);

    expect(
      claimExecutionCircuitProbe({
        state: firstClaim.state,
        endpointId: ENDPOINT_ID,
        nowMs: firstClaimAt + 1,
        probeOwnerId: "same-owner",
      }).claimed,
    ).toBe(false);
    expect(
      evaluateExecutionCircuitEligibility(
        firstClaim.state,
        ENDPOINT_ID,
        firstClaimAt + EXECUTION_HALF_OPEN_LEASE_MS - 1,
      ),
    ).toEqual({ eligible: false, probeRequired: false });
    expect(
      evaluateExecutionCircuitEligibility(
        firstClaim.state,
        ENDPOINT_ID,
        firstClaimAt + EXECUTION_HALF_OPEN_LEASE_MS,
      ),
    ).toEqual({ eligible: true, probeRequired: true });

    const replacementClaim = claimExecutionCircuitProbe({
      state: firstClaim.state,
      endpointId: ENDPOINT_ID,
      nowMs: firstClaimAt + EXECUTION_HALF_OPEN_LEASE_MS,
      probeOwnerId: "new-owner",
    });
    expect(replacementClaim).toMatchObject({ claimed: true, required: true });
    expect(replacementClaim.state.endpoints[ENDPOINT_ID]).toMatchObject({
      circuitState: "half_open",
      probeOwnerId: "new-owner",
      probeStartedAtMs: firstClaimAt + EXECUTION_HALF_OPEN_LEASE_MS,
    });
  });

  test("retires legacy v1 cooldowns without carrying their long bans into v2", () => {
    const legacy = JSON.stringify({
      [ENDPOINT_ID]: {
        endpointId: ENDPOINT_ID,
        failureCount: 6,
        cooldownUntilMs: START_MS + 20 * 60 * 60 * 1_000,
        lastFailureAtMs: START_MS,
        lastErrorClass: "upstream_connection_error",
      },
    });
    const migrated = migrateLegacyExecutionCooldownState(undefined, legacy, START_MS + 1);
    expect(migrated).toMatchObject({
      schemaVersion: 2,
      endpoints: {},
      migratedFromV1AtMs: START_MS + 1,
      retiredLegacyEndpointCount: 1,
    });
  });

  test("bounds persisted input and emits safe receipts with retry metadata", () => {
    const endpoints = Object.fromEntries(
      Array.from({ length: 600 }, (_, index) => [
        `endpoint-${String(index).padStart(3, "0")}`,
        {
          endpointId: `endpoint-${String(index).padStart(3, "0")}`,
          circuitState: "open",
          failureCategory: "provider_5xx",
          failureCount: 1,
          sequenceStartedAtMs: START_MS,
          lastFailureAtMs: START_MS,
          nextProbeAtMs: START_MS + 2_000,
          lastErrorClass: "upstream_error",
        },
      ]),
    );
    const parsed = parseExecutionCircuitState(JSON.stringify({ schemaVersion: 2, endpoints }));
    expect(Object.keys(parsed.endpoints)).toHaveLength(512);
    const roundTrip = parseExecutionCircuitState(serializeExecutionCircuitState(parsed));
    const receipt = toExecutionCircuitReceipt(
      requiredRecord(roundTrip, "endpoint-000"),
      START_MS + 500,
    );
    expect(receipt).toMatchObject({
      schemaVersion: 2,
      endpointId: "endpoint-000",
      circuitState: "open",
      failureCategory: "provider_5xx",
      active: true,
      retryAfterMs: 1_500,
      nextProbeAtMs: START_MS + 2_000,
      cooldownUntilMs: START_MS + 2_000,
    });
    expect(parseExecutionCircuitState("{broken")).toEqual(createEmptyExecutionCircuitState());
  });

  test("parses Retry-After seconds and HTTP dates with a five-minute cap", () => {
    expect(parseRetryAfterMs("2.5", START_MS)).toBe(2_500);
    expect(parseRetryAfterMs(new Date(START_MS + 60_000).toUTCString(), START_MS)).toBe(60_000);
    expect(parseRetryAfterMs("900", START_MS)).toBe(300_000);
    expect(parseRetryAfterMs("invalid", START_MS)).toBeUndefined();
  });

  test("resets failure sequences exactly at the quiet-window boundaries", () => {
    const probation = fail(createEmptyExecutionCircuitState(), {
      errorClass: "upstream_connection_error",
      nowMs: START_MS,
    });
    expect(
      fail(probation, {
        errorClass: "upstream_connection_error",
        nowMs: START_MS + 60_000,
      }).endpoints[ENDPOINT_ID],
    ).toMatchObject({ circuitState: "probation", failureCount: 1 });

    const open = fail(createEmptyExecutionCircuitState(), {
      errorClass: "upstream_error",
      statusCode: 503,
      nowMs: START_MS,
    });
    expect(
      fail(open, {
        errorClass: "upstream_error",
        statusCode: 503,
        nowMs: START_MS + 300_000,
      }).endpoints[ENDPOINT_ID],
    ).toMatchObject({ circuitState: "open", failureCount: 1 });
  });

  test("uses 503 only for timed cooldowns and reports configuration blocks separately", () => {
    expect(resolveExecutionCircuitRefusal([], START_MS)).toBeUndefined();
    const timedReceipt = toExecutionCircuitReceipt(
      requiredRecord(
        fail(createEmptyExecutionCircuitState(), {
          errorClass: "upstream_error",
          statusCode: 503,
          nowMs: START_MS,
        }),
      ),
      START_MS,
    );
    expect(resolveExecutionCircuitRefusal([timedReceipt], START_MS)).toEqual({
      statusCode: 503,
      code: "endpoint_temporarily_unavailable",
      nextProbeAtMs: START_MS + 2_000,
      retryAfterMs: 2_000,
    });

    const authReceipt = toExecutionCircuitReceipt(
      requiredRecord(
        fail(createEmptyExecutionCircuitState(), {
          errorClass: "provider_auth_error",
          statusCode: 401,
          nowMs: START_MS,
        }),
      ),
      START_MS,
    );
    expect(resolveExecutionCircuitRefusal([authReceipt], START_MS)).toEqual({
      statusCode: 400,
      code: "endpoint_configuration_blocked",
    });
  });
});
