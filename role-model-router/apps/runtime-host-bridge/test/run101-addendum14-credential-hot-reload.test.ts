/**
 * Run 101 addendum 14 - a rotated local-file credential heals an auth-blocked endpoint.
 *
 * Operator report: "the oauth workflow fallback and credential hot reloading still needs work, it doesn't
 * by itself resolve and reflect successful oauth". Measured live: the browser login wrote a fresh credential
 * file, but the runtime kept presenting the token it had loaded at boot, so the account stayed auth-blocked
 * until a restart.
 *
 * This file proves the behaviour on the bridge's direct (router-owned credential) dispatch path end to end:
 * on a 401 from an endpoint whose credential is a local file the dispatch must (a) try the runtime's own
 * refresh, (b) else re-resolve the credential from the store, (c) retry once when that value differs from the
 * failed one, and (d) clear the endpoint's execution-circuit record when the retry succeeds.
 *
 * RED at the pre-repair revision (`4bf7a915`): that revision re-sent only what `refreshOauthAccessToken`
 * returned, so a credential file without a refresh token replaced the classified 401 with "does not contain a
 * refresh token", the hot-reloaded value on disk was never re-read, and a stale `blocked_auth` record
 * survived the request.
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";

import {
  readRuntimeMaintenancePolicy,
  resolveSqliteMemoryLocation,
  upsertRuntimeMaintenanceValue,
} from "@role-model-router/sqlite-memory";

import {
  EXECUTION_CIRCUIT_BREAKER_MAINTENANCE_KEY,
  createEmptyExecutionCircuitState,
  parseExecutionCircuitState,
  recordExecutionCircuitFailure,
  serializeExecutionCircuitState,
} from "../src/execution-circuit-breaker.js";
import { createRuntimeBridgeBackend } from "../src/index.js";

const repoRoot = path.resolve(import.meta.dirname, "..", "..", "..", "..");
const fixtureRoot = path.join(import.meta.dirname, "fixtures-restart-rehydration");

const providerAccountId = "moonshot.personal.addendum14";
const modelId = "moonshot/kimi-k2.5";
const credentialRef = "oauth/moonshot/moonshot.personal.addendum14";
const staleToken = "stale-addendum14-token";
const freshToken = "fresh-addendum14-token";

function isAdmissionReadinessProbe(init: RequestInit | undefined): boolean {
  if (typeof init?.body !== "string") {
    return false;
  }
  try {
    const body = JSON.parse(init.body) as {
      readonly messages?: readonly { readonly content?: unknown }[];
    };
    return body.messages?.[0]?.content === "role-model admission readiness probe";
  } catch {
    return false;
  }
}

function admissionProbeResponse(): Response {
  return new Response(
    JSON.stringify({
      id: "chatcmpl-addendum14-admission-probe",
      object: "chat.completion",
      choices: [
        { index: 0, message: { role: "assistant", content: "ready" }, finish_reason: "stop" },
      ],
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

function providerAuthFailureResponse(): Response {
  return new Response(
    JSON.stringify({
      error: { message: "invalid api key", type: "invalid_request_error" },
    }),
    { status: 401, headers: { "content-type": "application/json" } },
  );
}

function chatCompletionStreamResponse(text: string): Response {
  const encoder = new TextEncoder();
  const chunk = (delta: Record<string, unknown>, extra: Record<string, unknown> = {}) =>
    `data: ${JSON.stringify({
      id: "chatcmpl-addendum14",
      object: "chat.completion.chunk",
      created: 1,
      model: modelId,
      choices: [{ index: 0, delta, finish_reason: null }],
      ...extra,
    })}\n\n`;
  return new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(chunk({ role: "assistant", content: "" })));
        controller.enqueue(encoder.encode(chunk({ content: text })));
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              id: "chatcmpl-addendum14",
              object: "chat.completion.chunk",
              created: 1,
              model: modelId,
              choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
              usage: { prompt_tokens: 8, completion_tokens: 4 },
            })}\n\n`,
          ),
        );
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    }),
    { status: 200, headers: { "content-type": "text/event-stream; charset=utf-8" } },
  );
}

function readAuthorizationHeader(init: RequestInit | undefined): string {
  const headers = init?.headers as Record<string, string> | undefined;
  return typeof headers?.authorization === "string" ? headers.authorization : "";
}

function readCircuitRecords(databasePath: string) {
  return parseExecutionCircuitState(
    readRuntimeMaintenancePolicy({ databasePath })[EXECUTION_CIRCUIT_BREAKER_MAINTENANCE_KEY],
  ).endpoints;
}

interface CredentialHotReloadHarness {
  readonly backend: Awaited<ReturnType<typeof createRuntimeBridgeBackend>>;
  readonly endpointId: string;
  readonly credentialFile: string;
  readonly databasePath: string;
  readonly authorizationHeaders: string[];
  dispose(): Promise<void>;
}

/**
 * The harness mirrors the live local-file credential shape the operator uses: the account is a
 * `provider-openai` account with `authMode: api-key-static` whose credential is the API key stored as
 * `access_token` in `credentials/<ref>.json`. A missing refresh token and no `saved_at_ms`/`expires_in`
 * keeps `resolveCredentialValue` on the plain stored-token read, which is the value the addendum-14 retry
 * re-resolves after the provider rejects it.
 */
async function createHarness(
  respond: (context: {
    readonly attempt: number;
    readonly authorization: string;
    readonly credentialFile: string;
  }) => Response | Promise<Response>,
): Promise<CredentialHotReloadHarness> {
  const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "run101-addendum14-"));
  const scopeId = "run101-addendum14-credential-hot-reload";
  const credentialDir = path.join(runtimeStateRoot, scopeId, "credentials", "oauth", "moonshot");
  const credentialFile = path.join(credentialDir, "moonshot.personal.addendum14.json");
  await mkdir(credentialDir, { recursive: true });
  await writeFile(credentialFile, JSON.stringify({ access_token: staleToken }), "utf8");

  const authorizationHeaders: string[] = [];
  const backend = await createRuntimeBridgeBackend({
    repoRoot,
    fixtureRoot,
    runtimeStateRoot,
    scopeId,
    networkFetcher: async (requestInput, init) => {
      if (isAdmissionReadinessProbe(init)) {
        return admissionProbeResponse();
      }
      const authorization = readAuthorizationHeader(init);
      authorizationHeaders.push(authorization);
      void requestInput;
      return respond({
        attempt: authorizationHeaders.length,
        authorization,
        credentialFile,
      });
    },
  });

  await backend.upsertProviderAccount({
    providerAccountId,
    providerId: "moonshot",
    providerKind: "provider-openai",
    orgScope: "personal",
    accountScope: "workspace-default",
    credentialRef: {
      backend: "local-file",
      ref: credentialRef,
    },
    authMode: "api-key-static",
    regionPolicy: { mode: "prefer", regions: ["global"] },
    baseUrlOverride: "https://api.moonshot.ai/v1",
    allowedModels: [modelId],
    modelRoleBindings: [
      {
        modelId,
        roleAssignmentMode: "all",
        roleIds: [],
        enabledRoleIds: [],
        disabledRoleIds: [],
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
  const endpoint = await backend.activateEndpoint({
    providerAccountId,
    modelId,
    region: "global",
  });

  return {
    backend,
    endpointId: String(endpoint.endpointId),
    credentialFile,
    databasePath: resolveSqliteMemoryLocation({ runtimeStateRoot, scopeId }),
    authorizationHeaders,
    dispose: async () => {
      await backend.shutdown();
      await rm(runtimeStateRoot, { recursive: true, force: true });
    },
  };
}

describe("@recursive:101-effect-mq-queue-rebuild addendum14 credential hot reload", () => {
  test("retries a 401 with the credential that is on disk at retry time", async () => {
    const harness = await createHarness(async ({ attempt, credentialFile }) => {
      if (attempt === 1) {
        // The operator's browser login replaces the file while the first attempt is in flight.
        await writeFile(credentialFile, JSON.stringify({ access_token: freshToken }), "utf8");
        return providerAuthFailureResponse();
      }
      return chatCompletionStreamResponse("hot reload works");
    });

    try {
      const result = await harness.backend.executeChatCompletions(
        {
          model: modelId,
          stream: true,
          messages: [{ role: "user", content: "Use the credential that is on disk." }],
        },
        "req-addendum14-hot-reload-001",
      );

      expect(result.endpointId).toBe(harness.endpointId);
      expect(result.outputText).toBe("hot reload works");
      expect(harness.authorizationHeaders).toEqual([
        `Bearer ${staleToken}`,
        `Bearer ${freshToken}`,
      ]);
      expect(new Set(harness.authorizationHeaders).size).toBe(2);
    } finally {
      await harness.dispose();
    }
  });

  test("does not retry when the stored credential did not change and classifies the 401", async () => {
    const requestId = "req-addendum14-unchanged-credential-001";
    const harness = await createHarness(() => providerAuthFailureResponse());

    try {
      await expect(
        harness.backend.executeChatCompletions(
          {
            model: modelId,
            messages: [{ role: "user", content: "The stored credential is still the same." }],
          },
          requestId,
        ),
      ).rejects.toThrow(/invalid api key/i);

      expect(harness.authorizationHeaders).toEqual([`Bearer ${staleToken}`]);
      const telemetry = await harness.backend.listTelemetryRequests();
      expect(telemetry.find((row) => row.requestId === requestId)).toEqual(
        expect.objectContaining({
          endpointId: harness.endpointId,
          errorClass: "provider_auth_error",
          statusCode: 401,
        }),
      );
    } finally {
      await harness.dispose();
    }
  });

  test("clears the endpoint's blocked_auth circuit record when the retried attempt succeeds", async () => {
    const harness = await createHarness(async ({ attempt, credentialFile }) => {
      if (attempt === 1) {
        await writeFile(credentialFile, JSON.stringify({ access_token: freshToken }), "utf8");
        return providerAuthFailureResponse();
      }
      return chatCompletionStreamResponse("hot reload works");
    });

    try {
      const seededCircuit = recordExecutionCircuitFailure({
        state: createEmptyExecutionCircuitState(),
        endpointId: harness.endpointId,
        errorClass: "provider_auth_error",
        statusCode: 401,
        nowMs: Date.now() - 5_000,
        trafficClass: "live",
      }).state;
      expect(seededCircuit.endpoints[harness.endpointId]).toMatchObject({
        circuitState: "blocked_auth",
      });
      upsertRuntimeMaintenanceValue({
        databasePath: harness.databasePath,
        key: EXECUTION_CIRCUIT_BREAKER_MAINTENANCE_KEY,
        value: serializeExecutionCircuitState(seededCircuit),
      });
      expect(readCircuitRecords(harness.databasePath)[harness.endpointId]).toMatchObject({
        circuitState: "blocked_auth",
      });

      // An auth block keeps the endpoint out of the pool (that is the circuit's job), so the heal is driven
      // directly through the dispatch option the operator's benchmark/replay paths use.
      const result = await harness.backend.executeChatCompletions(
        {
          model: modelId,
          stream: true,
          messages: [{ role: "user", content: "Heal the auth block with the fresh credential." }],
        },
        "req-addendum14-circuit-clear-001",
        undefined,
        { endpointId: harness.endpointId, ignoreExecutionFailureCooldowns: true },
      );

      expect(result.endpointId).toBe(harness.endpointId);
      expect(result.outputText).toBe("hot reload works");
      expect(harness.authorizationHeaders).toEqual([
        `Bearer ${staleToken}`,
        `Bearer ${freshToken}`,
      ]);
      expect(readCircuitRecords(harness.databasePath)[harness.endpointId]).toBeUndefined();
    } finally {
      await harness.dispose();
    }
  });
});
