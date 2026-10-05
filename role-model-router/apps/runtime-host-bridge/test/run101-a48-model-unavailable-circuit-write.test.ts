/**
 * Run 101 addendum 48 - why the `model_unavailable` cooldown is reported and then disappears.
 *
 * Measured live on `:3457` (`rc-93edc897`, 2026-09-29): four clean requests to
 * `openai.personal.openai-codex-subscription.global.gpt-5.4` answered
 * `400 {"type":"model_unavailable","fallbackEligible":true}` with telemetry `cooldown_decision: recorded`,
 * while the circuit key's `updated_at_ms` never moved and a `503` to the same endpoint under the same probe did
 * move it. Addendum 47 recorded that negative result with two candidate mechanisms.
 *
 * Addendum 48 names the mechanism: the record **is** written, and the next read erases it. `isFailureCategory`
 * in `execution-circuit-breaker.ts` is the runtime allow-list, and addendum 45 widened only the *type* - so
 * `parseRecord` drops a `model_unavailable` record, `readExecutionCircuitState` sees a parsed state that differs
 * from the stored one and writes the cleaned state back over it. The round-trip test below is that mechanism,
 * reduced to one function call; the end-to-end test is the live shape on the bridge's own dispatch path.
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";

import {
  readRuntimeMaintenancePolicy,
  resolveSqliteMemoryLocation,
} from "@role-model-router/sqlite-memory";

import {
  EXECUTION_CIRCUIT_BREAKER_MAINTENANCE_KEY,
  parseExecutionCircuitState,
  serializeExecutionCircuitState,
} from "../src/execution-circuit-breaker.js";
import { createRuntimeBridgeBackend } from "../src/index.js";

const repoRoot = path.resolve(import.meta.dirname, "..", "..", "..", "..");
const fixtureRoot = path.join(import.meta.dirname, "fixtures-restart-rehydration");

const providerAccountId = "moonshot.personal.addendum48";
const modelId = "moonshot/kimi-k2.5";
const credentialRef = "oauth/moonshot/moonshot.personal.addendum48";
const requestId = "req-addendum48-entitlement-001";

function isAdmissionReadinessProbe(init: RequestInit | undefined): boolean {
  if (typeof init?.body !== "string") return false;
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
      id: "chatcmpl-addendum48-admission",
      object: "chat.completion",
      choices: [
        { index: 0, message: { role: "assistant", content: "ready" }, finish_reason: "stop" },
      ],
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

/** The provider's verdict as it arrived live: a 400 whose `detail` names the model this account cannot serve. */
function entitlementRejectionResponse(): Response {
  return new Response(
    JSON.stringify({
      error: { message: "Provider request failed with HTTP 400.", type: "invalid_request" },
      detail: `The '${modelId}' model is not supported when using Codex with a ChatGPT account.`,
    }),
    { status: 400, headers: { "content-type": "application/json" } },
  );
}

async function createHarness(): Promise<{
  readonly backend: Awaited<ReturnType<typeof createRuntimeBridgeBackend>>;
  readonly endpointId: string;
  readonly databasePath: string;
  readonly dispose: () => Promise<void>;
}> {
  const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "run101-addendum48-"));
  const scopeId = "run101-addendum48-circuit-write";
  const credentialDir = path.join(runtimeStateRoot, scopeId, "credentials", "oauth", "moonshot");
  await mkdir(credentialDir, { recursive: true });
  await writeFile(
    path.join(credentialDir, "moonshot.personal.addendum48.json"),
    JSON.stringify({ access_token: "addendum48-token" }),
    "utf8",
  );

  const backend = await createRuntimeBridgeBackend({
    repoRoot,
    fixtureRoot,
    runtimeStateRoot,
    scopeId,
    networkFetcher: async (_input, init) =>
      isAdmissionReadinessProbe(init) ? admissionProbeResponse() : entitlementRejectionResponse(),
  });

  await backend.upsertProviderAccount({
    providerAccountId,
    providerId: "moonshot",
    providerKind: "provider-openai",
    orgScope: "personal",
    accountScope: "workspace-default",
    credentialRef: { backend: "local-file", ref: credentialRef },
    authMode: "api-key-static",
    regionPolicy: { mode: "prefer", regions: ["global"] },
    baseUrlOverride: "https://api.moonshot.ai/v1",
    allowedModels: [modelId],
    modelRoleBindings: [
      { modelId, roleAssignmentMode: "all", roleIds: [], enabledRoleIds: [], disabledRoleIds: [] },
    ],
    deniedModels: [],
    entitlementTags: ["chat"],
    budgetPolicyRef: "budget.default",
    quotaPolicyRef: "quota.default",
    status: "active",
    healthStatus: "healthy",
    rotationState: "stable",
  });
  const endpoint = await backend.activateEndpoint({ providerAccountId, modelId, region: "global" });

  return {
    backend,
    endpointId: String(endpoint.endpointId),
    databasePath: resolveSqliteMemoryLocation({ runtimeStateRoot, scopeId }),
    dispose: async () => {
      await backend.shutdown();
      await rm(runtimeStateRoot, { recursive: true, force: true });
    },
  };
}

describe("@recursive:101-effect-mq-queue-rebuild addendum48 model-unavailable circuit write", () => {
  test("the persisted state survives a parse/serialize round trip for a model_unavailable record", () => {
    const stored = JSON.stringify({
      schemaVersion: 2,
      endpoints: {
        "openai.personal.example.global.gpt-5.4": {
          endpointId: "openai.personal.example.global.gpt-5.4",
          circuitState: "open",
          failureCategory: "model_unavailable",
          failureCount: 1,
          sequenceStartedAtMs: 1_000,
          lastFailureAtMs: 1_000,
          lastErrorClass: "model_unavailable",
          nextProbeAtMs: 301_000,
        },
      },
    });

    const parsed = parseExecutionCircuitState(stored);

    /**
     * A dropped record makes this round trip unequal, and `readExecutionCircuitState` writes the parsed state
     * back whenever it differs from the stored one - which is how the record was erased after being recorded.
     */
    expect(Object.keys(parsed.endpoints)).toEqual(["openai.personal.example.global.gpt-5.4"]);
    expect(serializeExecutionCircuitState(parsed)).toBe(stored);
  });

  test("an entitlement rejection leaves an open model_unavailable circuit record", async () => {
    const harness = await createHarness();
    try {
      let failure: unknown = null;
      try {
        await harness.backend.executeChatCompletions(
          {
            model: modelId,
            messages: [{ role: "user", content: "A request this account cannot serve." }],
          },
          requestId,
        );
      } catch (error) {
        failure = error;
      }
      // The classification half is already delivered (addendum 45); this pins it so the assertion below is
      // about the durable record and not about a classifier that failed to fire.
      expect((failure as { errorClass?: string } | null)?.errorClass).toBe("model_unavailable");
      expect((failure as { fallbackEligible?: boolean } | null)?.fallbackEligible).toBe(true);

      const telemetry = await harness.backend.listTelemetryRequests();
      const row = telemetry.find((entry) => entry.requestId === requestId);
      expect((row as { cooldownDecision?: string } | undefined)?.cooldownDecision).toBe("recorded");

      const raw = readRuntimeMaintenancePolicy({ databasePath: harness.databasePath })[
        EXECUTION_CIRCUIT_BREAKER_MAINTENANCE_KEY
      ];
      const state = raw
        ? (JSON.parse(raw) as { endpoints: Record<string, Record<string, unknown>> })
        : null;
      const record = state?.endpoints?.[harness.endpointId];

      expect(record).toBeDefined();
      expect(record?.failureCategory).toBe("model_unavailable");
      expect(record?.circuitState).toBe("open");
    } finally {
      await harness.dispose();
    }
  });
});
