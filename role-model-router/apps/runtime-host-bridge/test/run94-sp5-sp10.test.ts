import { createHash } from "node:crypto";
import { readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { afterEach, expect, test } from "vitest";

import { createRuntimeBridgeBackend, startBridgeServer } from "../src/index.js";
import {
  createProductionExtensionRuntime,
  createTrackBPostObservationOutbox,
  runTrackBPostObservation,
  verifyTrackBExtensionClosureAfterRestart,
} from "../src/track-b-runtime.js";

const repoRoot = path.resolve(import.meta.dirname, "..", "..", "..", "..");
const roots: string[] = [];
const runtimes: Array<{ close(): Promise<void> }> = [];

afterEach(async () => {
  await Promise.allSettled(runtimes.splice(0).map((runtime) => runtime.close()));
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

function identity(requestId = "run94-outbox") {
  return {
    requestId,
    routingDecisionId: `decision:${requestId}`,
    endpointId: "endpoint:run94",
    modelId: "model:run94",
    reasoningEffort: null,
    effortSource: "none" as const,
  };
}

test("GREEN: post-observation outbox is a normalized SQLite authority with bounded receipts and restart recovery", async () => {
  const root = await import("node:fs/promises").then(({ mkdtemp }) =>
    mkdtemp(path.join(os.tmpdir(), "run94-sp5-outbox-")),
  );
  roots.push(root);
  const filePath = path.join(root, "post-observation-outbox.sqlite");
  const outbox = createTrackBPostObservationOutbox({ filePath, maxItems: 8 });
  await outbox.enqueue(identity("queued-1"));
  await outbox.enqueue(identity("queued-2"));

  expect((await readFile(filePath)).subarray(0, 15).toString("utf8")).toBe("SQLite format 3");
  const database = new DatabaseSync(filePath);
  expect(
    database
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('track_b_post_observation_pending','track_b_post_observation_receipts') ORDER BY name",
      )
      .all(),
  ).toHaveLength(2);
  database.close();

  const restarted = createTrackBPostObservationOutbox({ filePath, maxItems: 8 });
  await restarted.drain(async () => ({
    status: "processed",
    extensionClosure: { result: "x".repeat(100_000) },
  }));
  const receipt = await restarted.read();
  expect(receipt).toMatchObject({ pendingCount: 0, receiptCount: 2 });
  const afterDrain = new DatabaseSync(filePath);
  const row = afterDrain
    .prepare("SELECT length(result_json) AS bytes FROM track_b_post_observation_receipts")
    .get() as { bytes: number };
  expect(row.bytes).toBeLessThanOrEqual(16 * 1024);
  afterDrain.close();
});

test("GREEN: imports N-1 JSON once, classifies every legacy row, and quarantines malformed rows", async () => {
  const root = await import("node:fs/promises").then(({ mkdtemp }) =>
    mkdtemp(path.join(os.tmpdir(), "run94-sp5-legacy-")),
  );
  roots.push(root);
  const filePath = path.join(root, "post-observation-outbox.json");
  await writeFile(
    filePath,
    JSON.stringify({
      schemaVersion: "role-model.track-b-post-observation-outbox.v2",
      pending: [identity("legacy-valid"), { requestId: "legacy-malformed" }],
      receipts: [
        { requestId: "legacy-receipt", completedAt: new Date().toISOString(), result: {} },
      ],
    }),
    "utf8",
  );

  const outbox = createTrackBPostObservationOutbox({ filePath, maxItems: 8 });
  expect(await outbox.read()).toMatchObject({ pendingCount: 1, receiptCount: 1 });
  expect((await readFile(filePath)).subarray(0, 15).toString("utf8")).toBe("SQLite format 3");
  const database = new DatabaseSync(filePath);
  expect(
    database
      .prepare(
        "SELECT source_id, classification FROM track_b_post_observation_legacy_rows ORDER BY source_kind, source_index",
      )
      .all(),
  ).toEqual([
    { source_id: "legacy-valid", classification: "imported" },
    { source_id: "legacy-malformed", classification: "quarantined" },
    { source_id: "legacy-receipt", classification: "imported" },
  ]);
  database.close();
  expect(await readFile(`${filePath}.n-1.json`, "utf8")).toContain("legacy-malformed");
});

test("GREEN: malformed legacy JSON fails closed without replacing the source authority", async () => {
  const root = await import("node:fs/promises").then(({ mkdtemp }) =>
    mkdtemp(path.join(os.tmpdir(), "run94-sp5-malformed-")),
  );
  roots.push(root);
  const filePath = path.join(root, "post-observation-outbox.json");
  await writeFile(filePath, "{not-json", "utf8");
  const outbox = createTrackBPostObservationOutbox({ filePath });
  await expect(outbox.read()).rejects.toThrow(/malformed|JSON|legacy/i);
  expect(await readFile(filePath, "utf8")).toBe("{not-json");
});

test("GREEN: legacy import cannot bypass pending or receipt bounds", async () => {
  const root = await import("node:fs/promises").then(({ mkdtemp }) =>
    mkdtemp(path.join(os.tmpdir(), "run94-sp5-legacy-bound-")),
  );
  roots.push(root);
  const filePath = path.join(root, "post-observation-outbox.json");
  await writeFile(
    filePath,
    JSON.stringify({
      schemaVersion: "role-model.track-b-post-observation-outbox.v2",
      pending: [identity("legacy-pending-1"), identity("legacy-pending-2")],
      receipts: [
        { requestId: "legacy-receipt-1", completedAt: new Date().toISOString(), result: {} },
        { requestId: "legacy-receipt-2", completedAt: new Date().toISOString(), result: {} },
      ],
    }),
    "utf8",
  );
  const outbox = createTrackBPostObservationOutbox({ filePath, maxItems: 1 });
  expect(await outbox.read()).toMatchObject({ pendingCount: 1, receiptCount: 1 });
  const database = new DatabaseSync(filePath);
  expect(
    database
      .prepare(
        "SELECT source_kind, source_id, classification FROM track_b_post_observation_legacy_rows ORDER BY source_kind, source_index",
      )
      .all(),
  ).toEqual([
    { source_kind: "pending", source_id: "legacy-pending-1", classification: "imported" },
    { source_kind: "pending", source_id: "legacy-pending-2", classification: "quarantined" },
    { source_kind: "receipt", source_id: "legacy-receipt-1", classification: "imported" },
    { source_kind: "receipt", source_id: "legacy-receipt-2", classification: "quarantined" },
  ]);
  database.close();
});

const canonicalExtensions = [
  ["artifact-store", ["graph:write", "artifact:read"]],
  ["event-log", ["event:append", "event:read"]],
  ["repository-context", ["repository:read", "artifact:read"]],
  ["background-evidence-scheduler", ["scheduler:schedule-and-run", "artifact:read"]],
  ["memory-store", ["memory:write", "memory:read", "artifact:read"]],
  ["knowledge-store", ["knowledge:write", "knowledge:read", "artifact:read"]],
  ["evaluation-core", ["evaluation:consume-projection", "artifact:read"]],
  ["crowdsourced-learning", ["aggregate:preview", "artifact:read"]],
  ["replay-core", ["replay:plan-graph", "artifact:read"]],
  ["evaluation-runner-local", ["evaluation:run-local", "artifact:read"]],
  ["trajectory-signals", ["signals:analyze", "artifact:read"]],
  ["profile-learner", ["profile:estimate", "profile:consume-projection", "artifact:read"]],
  [
    "knowledge-worker",
    ["knowledge:eval-consumer", "knowledge:consume-projection", "artifact:read"],
  ],
] as const;

const extensionModule = `
export async function run(envelope = {}) {
  const id = process.env.ROLE_MODEL_EXTENSION_ID;
  const capability = envelope.capability;
  if (["artifact:read", "event:read", "memory:read", "knowledge:read"].includes(capability) && envelope.payload?.durableOutputId) {
    return { readbackOutputId: envelope.payload?.durableOutputId, durableLocator: envelope.payload?.durableLocator };
  }
  const base = {
    extensionId: id,
    capability,
    requestId: envelope.requestId,
    durableLocator: { extensionId: id, requestId: envelope.requestId, capability },
    evidenceRef: "evidence:" + id + ":" + envelope.requestId,
    readCapability: id === "knowledge-worker" ? undefined : id === "event-log" ? "event:read" : id === "memory-store" ? "memory:read" : id === "knowledge-store" ? "knowledge:read" : "artifact:read",
    businessOutput: { extensionId: id, capability, value: "business-result" }
  };
  if (id === "artifact-store") return { ...base, id: "artifact:" + envelope.requestId };
  if (id === "repository-context") return { ...base, available: true, context: { scopeId: envelope.scope, repoFingerprint: "a".repeat(64), packageId: null, fallbackLevel: "repo_task", branchCompatibility: "unknown", fingerprintEpoch: 1 }, diagnostics: [] };
  if (capability === "evaluation:run-local") return { ...base, count: 1, scores: [1], environment: "local", provenance: { evidenceRef: base.evidenceRef } };
  if (capability === "knowledge:write") return { ...base, id: "knowledge:" + envelope.requestId };
  if (capability === "knowledge:eval-consumer") return { ...base, state: "shadow", productionEffects: {} };
  return base;
}
`;

async function createRealCanonicalRuntime(root: string) {
  const modulePath = path.join(root, "canonical-extension.mjs");
  await writeFile(modulePath, extensionModule, "utf8");
  const artifactSha256 = createHash("sha256").update(extensionModule).digest("hex");
  const runtime = await createProductionExtensionRuntime({
    stateRoot: path.join(root, "extension-runtime"),
    authorizationEpoch: 94,
    repoRoot,
    extensions: canonicalExtensions.map(([id, capabilities]) => ({
      descriptor: { id, protocolVersion: "1.1.0", capabilities },
      modulePath,
      artifactSha256,
    })),
  });
  runtimes.push(runtime);
  return runtime;
}

function observation() {
  return {
    requestId: "run94-extension-closure",
    routingDecisionId: "decision:run94-extension-closure",
    endpointId: "endpoint:run94",
    modelId: "model:run94",
    reasoningEffort: null,
    effortSource: "none" as const,
    usageEvent: { endpoint_id: "endpoint:run94", model_id: "model:run94" },
  };
}

test("GREEN: real process output closure covers every canonical registry key and readback survives restart", async () => {
  const root = await import("node:fs/promises").then(({ mkdtemp }) =>
    mkdtemp(path.join(os.tmpdir(), "run94-sp10-real-workers-")),
  );
  roots.push(root);
  const runtime = await createRealCanonicalRuntime(root);
  const result = await runTrackBPostObservation(runtime, observation(), {
    scope: "tenant:run94",
    channel: "development",
    authorizationEpoch: 94,
  });
  const closure = (result as Record<string, unknown>).extensionClosure as Record<string, unknown>;
  expect(Object.keys(closure.registry ?? {})).toEqual(canonicalExtensions.map(([id]) => id).sort());
  const outputs = Object.values(closure.registry as Record<string, { outputs: unknown[] }>).flatMap(
    (entry) => entry.outputs,
  );
  expect(outputs).toHaveLength(15);
  expect((result as Record<string, unknown>).pipeline).toMatchObject({
    status: "insufficient_comparable_evidence",
    refusalCode: "R14_NO_DISTINCT_COUNTERFACTUAL",
    candidateId: null,
    providerCalls: 0,
    productionMutation: false,
  });
  expect(JSON.stringify(result)).not.toContain("baseline-control");
  expect(
    new Set(outputs.map((output) => (output as Record<string, unknown>).durableOutputId)).size,
  ).toBe(outputs.length);
  expect(
    outputs.every((output) => Number.isInteger((output as Record<string, unknown>).workerPid)),
  ).toBe(true);
  const readback = await verifyTrackBExtensionClosureAfterRestart(runtime, closure as never, {
    channel: "development",
    scope: "tenant:run94",
    authorizationEpoch: 94,
    readDurableEvidence: async ({ durableLocator, durableOutputId }) =>
      runtime.invoke("artifact-store", {
        requestId: `run94-readback-evidence:${durableOutputId}`,
        protocolVersion: "1.1.0",
        channel: "development",
        scope: "tenant:run94",
        authorizationEpoch: 94,
        capability: "artifact:read",
        payload: { durableLocator, durableOutputId },
      }),
  });
  expect(readback.outputs.every((row) => row.readbackOutputId === row.durableOutputId)).toBe(true);
  expect(readback.outputs.every((row) => row.preRestartPid !== row.postRestartPid)).toBe(true);
  expect(
    readback.outputs.every(
      (row) =>
        typeof row.capability === "string" &&
        row.capability.length > 0 &&
        row.durableLocator !== null &&
        row.resultDigest === row.durableOutputId,
    ),
  ).toBe(true);
});

test("GREEN: rejects missing, health-only, and duplicate durable extension outputs", async () => {
  const base = async (id: string, envelope: Record<string, unknown>) => ({
    id: id === "artifact-store" ? "artifact:duplicate" : undefined,
    durableLocator: { id: "same" },
    evidenceRef: "evidence:same",
    businessOutput: { value: "same" },
    available: true,
    workerPid: 1,
    ...(id === "repository-context"
      ? {
          context: {
            scopeId: "tenant:run94",
            repoFingerprint: "a".repeat(64),
            packageId: null,
            fallbackLevel: "repo_task",
            branchCompatibility: "unknown",
            fingerprintEpoch: 1,
          },
          diagnostics: [],
        }
      : {}),
    ...(envelope.capability === "evaluation:run-local"
      ? { scores: [1], provenance: { evidenceRef: "evidence:same" } }
      : {}),
    ...(envelope.capability === "knowledge:write" ? { id: "knowledge:duplicate" } : {}),
  });
  await expect(
    runTrackBPostObservation(
      { invoke: async () => ({ health: { available: true }, workerPid: 1 }) },
      observation(),
      { scope: "tenant:run94", channel: "development", authorizationEpoch: 94 },
    ),
  ).rejects.toThrow(/business output|durable/i);
  await expect(
    runTrackBPostObservation(
      {
        invoke: async () => ({
          id: "health-marker",
          durableLocator: "health-marker",
          workerPid: 1,
          available: true,
          health: { status: "ready" },
        }),
      },
      observation(),
      { scope: "tenant:run94", channel: "development", authorizationEpoch: 94 },
    ),
  ).rejects.toThrow(/business output|durable/i);
  await expect(
    runTrackBPostObservation({ invoke: base }, observation(), {
      scope: "tenant:run94",
      channel: "development",
      authorizationEpoch: 94,
    }),
  ).rejects.toThrow(/duplicate/i);
});

test("GREEN: exposes extension readback through the Track B HTTP surface", async () => {
  const runtimeStateRoot = await import("node:fs/promises").then(({ mkdtemp }) =>
    mkdtemp(path.join(os.tmpdir(), "run94-sp10-api-")),
  );
  roots.push(runtimeStateRoot);
  const backend = await createRuntimeBridgeBackend({
    repoRoot,
    fixtureRoot: path.join(
      repoRoot,
      "role-model-router",
      "apps",
      "runtime-host-bridge",
      "test",
      "fixtures",
    ),
    runtimeStateRoot,
    scopeId: "run94-api",
    readTrackBExtensionReadback: async (body) => ({
      requestId: body.requestId,
      schemaVersion: "role-model.track-b-extension-readback.v1",
    }),
  });
  const server = await startBridgeServer({
    host: "127.0.0.1",
    port: 0,
    registry: backend.registry,
    getRegistry: () => backend.registry,
    executeChatCompletions: backend.executeChatCompletions,
    executeResponses: backend.executeResponses,
    readTrackBExtensionReadback: backend.readTrackBExtensionReadback,
  });
  try {
    const response = await fetch(
      `http://127.0.0.1:${server.port}/api/role-model/track-b/extension-readback`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ requestId: "run94-extension-closure" }),
      },
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      requestId: "run94-extension-closure",
      schemaVersion: "role-model.track-b-extension-readback.v1",
    });
  } finally {
    await server.close();
    await backend.shutdown();
  }
});
