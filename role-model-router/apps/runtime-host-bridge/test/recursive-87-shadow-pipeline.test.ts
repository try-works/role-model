import { createHash } from "node:crypto";
import { readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, expect, test } from "vitest";

import { createRuntimeBridgeBackend } from "../src/index.js";
import { applyKwPromptInjectToMessages } from "../src/kw-prompt-inject.js";
import { createTrackBOperations } from "../src/track-b-operations.js";
import * as trackBRuntime from "../src/track-b-runtime.js";

const repoRoot = path.resolve(import.meta.dirname, "..", "..", "..", "..");
const modulePath = path.join(import.meta.dirname, "fixtures", "recursive-87-shadow-extension.mjs");
const roots: string[] = [];
const runtimes: Array<{ close(): Promise<void> }> = [];

afterEach(async () => {
  await Promise.allSettled(runtimes.splice(0).map((runtime) => runtime.close()));
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

test("SP1 runs the useful routing-learning DAG through supervised shadow capabilities", async () => {
  expect(typeof trackBRuntime.runTrackBShadowPipeline).toBe("function");
  const artifactSha256 = createHash("sha256")
    .update(await readFile(modulePath))
    .digest("hex");
  const capabilities = new Map([
    ["replay-core", "replay:plan-graph"],
    ["evaluation-runner-local", "evaluation:run-local"],
    ["trajectory-signals", "signals:analyze"],
    ["profile-learner", "profile:estimate"],
    ["knowledge-worker", "knowledge:eval-consumer"],
  ]);
  const stateRoot = path.join(os.tmpdir(), `run87-shadow-${Date.now()}`);
  roots.push(stateRoot);
  const runtime = await trackBRuntime.createExtensionRuntime({
    stateRoot,
    authorizationEpoch: 87,
    repoRoot,
    extensions: [...capabilities].map(([id, capability]) => ({
      descriptor: { id, protocolVersion: "1.1.0", capabilities: ["health:probe", capability] },
      modulePath,
      artifactSha256,
    })),
  });
  runtimes.push(runtime);

  const productionState = Object.freeze({
    providerRequests: 4,
    promptDigest: "before",
    routeDecisionId: "route-87",
    weightsDigest: "weights-before",
    activeProfileId: "profile-before",
  });
  const result = await trackBRuntime.runTrackBShadowPipeline(runtime, {
    requestId: "run87-shadow",
    channel: "development",
    scope: "tenant:run87",
    authorizationEpoch: 87,
    productionState,
    routePackage: "candidate-local",
    sourceDecisionId: "route-87",
    sourceGraphRef: "sha256:graph-87",
    prefix: ["request", "eligible-endpoints"],
    counterfactuals: [{ id: "candidate-local", suffix: ["candidate-local"] }],
    evaluationCases: [{ expected: "candidate-local", actual: "candidate-local" }],
    trajectoryEvents: [],
  });

  expect(result.candidate).toMatchObject({
    state: "shadow",
    productionEffects: {
      providerCalls: 0,
      promptMutations: 0,
      routeMutations: 0,
      weightMutations: 0,
      activeProfileMutations: 0,
    },
  });
  expect(result.productionState).toEqual(productionState);
  expect(result.receipt).toMatchObject({
    mode: "shadow",
    providerCalls: 0,
    productionMutation: false,
  });
  expect(runtime.listExtensions().every((row) => row.lifecycle === "ready")).toBe(true);
});

test("SP1 fails closed before Knowledge Worker when holdout evaluation fails", async () => {
  const invoke = async (id: string) =>
    id === "evaluation-runner-local"
      ? { scores: [0], provenance: { evidenceRef: "sha256:failed" } }
      : {};
  await expect(
    trackBRuntime.runTrackBShadowPipeline(
      { invoke },
      {
        requestId: "run87-shadow-failed",
        channel: "development",
        scope: "tenant:run87",
        authorizationEpoch: 87,
        routePackage: "candidate-local",
        sourceDecisionId: "route-87",
        sourceGraphRef: "sha256:graph-87",
        prefix: [],
        counterfactuals: [],
        evaluationCases: [{ expected: 1, actual: 0 }],
        trajectoryEvents: [],
        productionState: {},
      },
    ),
  ).rejects.toThrow(/holdout/i);
});

test("SP1 operations API rejects production Knowledge Worker activation controls", async () => {
  const stateRoot = path.join(os.tmpdir(), `run87-shadow-ops-${Date.now()}`);
  roots.push(stateRoot);
  const operations = createTrackBOperations({
    statePath: path.join(stateRoot, "track-b-state.json"),
    catalog: [{ id: "knowledge-worker", packageClass: "canonical_extension" }],
  });
  await expect(
    operations.mutateExtension({
      id: "knowledge-worker",
      action: "activate_production",
      activationPolicyVersion: 1,
      operatorAttestation: "activate-production",
      receipt: { payload: {}, signature: "0".repeat(64) },
    }),
  ).rejects.toThrow(/shadow-only|prohibited by Direct Track B v1\.1/i);
});

test("SP1 operations API cannot label Knowledge Worker active or bounded", async () => {
  const stateRoot = path.join(os.tmpdir(), `run87-shadow-mode-${Date.now()}`);
  roots.push(stateRoot);
  const operations = createTrackBOperations({
    statePath: path.join(stateRoot, "track-b-state.json"),
    catalog: [{ id: "knowledge-worker", packageClass: "canonical_extension" }],
  });
  await expect(
    operations.mutateExtension({
      id: "knowledge-worker",
      action: "set_mode",
      mode: "active",
    }),
  ).rejects.toThrow(/shadow-only|prohibited by Direct Track B v1\.1/i);
});

test("SP1 prompt insertion stays prohibited even when a legacy runner offers content", async () => {
  const messages = [{ role: "user", content: "unchanged" }];
  const result = await applyKwPromptInjectToMessages({
    messages,
    hostProductionActivation: true,
    sessionId: "legacy-runner",
    run: async () => ({ injected: true, systemMessage: "legacy production mutation" }),
  });
  expect(result.messages).toEqual(messages);
  expect(result.receipt).toMatchObject({
    injected: false,
    code: "kw_prompt_inject_prohibited_shadow_only",
  });
});

test("Phase 3.5 normal request completion dispatches the persisted observation to Track B", async () => {
  const stateRoot = path.join(os.tmpdir(), `run87-normal-shadow-${Date.now()}`);
  roots.push(stateRoot);
  const observations: Array<Record<string, unknown>> = [];
  const backend = await createRuntimeBridgeBackend({
    repoRoot,
    fixtureRoot: path.join(import.meta.dirname, "fixtures"),
    runtimeStateRoot: stateRoot,
    scopeId: "run87-normal-shadow",
    trackBPostObservation: async (observation: Record<string, unknown>) => {
      observations.push(observation);
    },
  } as Parameters<typeof createRuntimeBridgeBackend>[0] & {
    trackBPostObservation(observation: Record<string, unknown>): Promise<void>;
  });
  runtimes.push({ close: () => backend.shutdown() });
  await backend.executeChatCompletions(
    {
      model: "deepseek/chat-capture-v1",
      messages: [{ role: "user", content: "Exercise the normal Track B completion path." }],
    },
    "run87-normal-shadow-request",
  );
  expect(observations).toHaveLength(1);
  expect(observations[0]).toMatchObject({ requestId: "run87-normal-shadow-request" });
});

test("Phase 3.5 post-observation work survives startup and processing failures", async () => {
  const stateRoot = path.join(os.tmpdir(), `run87-shadow-outbox-${Date.now()}`);
  roots.push(stateRoot);
  const filePath = path.join(stateRoot, "outbox.json");
  const first = trackBRuntime.createTrackBPostObservationOutbox({ filePath });
  await first.enqueue({
    requestId: "queued-run87",
    routingDecisionId: "route-run87",
    endpointId: "endpoint-run87",
  });
  await expect(
    first.drain(async () => {
      throw new Error("extension runtime starting");
    }),
  ).rejects.toThrow(/starting/);
  expect(await first.read()).toMatchObject({ pendingCount: 1 });

  const restarted = trackBRuntime.createTrackBPostObservationOutbox({ filePath });
  const processed: Array<Record<string, unknown>> = [];
  await restarted.drain(async (observation) => {
    processed.push(observation);
    return {
      pipeline: { mode: "shadow", productionMutation: false, candidateId: "candidate:run87" },
      projection: { id: "projection:run87", scope: "tenant:run87" },
      consumption: { consumerCount: 3, productionMutation: false },
    };
  });
  expect(processed).toEqual([
    {
      requestId: "queued-run87",
      routingDecisionId: "route-run87",
      endpointId: "endpoint-run87",
    },
  ]);
  expect(await restarted.read()).toMatchObject({
    pendingCount: 0,
    receiptCount: 1,
    receipts: [
      {
        requestId: "queued-run87",
        result: {
          pipeline: {
            mode: "shadow",
            productionMutation: false,
            candidateId: "candidate:run87",
          },
          projection: { id: "projection:run87", scope: "tenant:run87" },
          consumption: { consumerCount: 3, productionMutation: false },
        },
      },
    ],
  });
});

test("Phase 3.5 normal post-observation work executes every canonical business owner", async () => {
  const invoked: Array<{ id: string; envelope: Record<string, unknown> }> = [];
  const runtime = {
    async invoke(id: string, envelope: Record<string, unknown>) {
      invoked.push({ id, envelope });
      if (id === "artifact-store") return { id: "artifact:run87" };
      if (id === "knowledge-store" && envelope.capability === "knowledge:write") {
        return { id: "knowledge:run87" };
      }
      if (id === "evaluation-runner-local") {
        return { scores: [1], provenance: { evidenceRef: "artifact:run87" } };
      }
      if (id === "knowledge-worker") {
        return { id: "candidate:run87", state: "shadow", productionEffects: {} };
      }
      return {};
    },
  };
  await trackBRuntime.runTrackBPostObservation(
    runtime,
    {
      requestId: "all-owners-run87",
      routingDecisionId: "route-run87",
      endpointId: "endpoint-run87",
    },
    { scope: "tenant:run87", channel: "stage", authorizationEpoch: 87 },
  );
  expect(new Set(invoked.map((row) => row.id))).toEqual(
    new Set([
      "artifact-store",
      "event-log",
      "repository-context",
      "background-evidence-scheduler",
      "memory-store",
      "knowledge-store",
      "evaluation-core",
      "crowdsourced-learning",
      "replay-core",
      "evaluation-runner-local",
      "trajectory-signals",
      "profile-learner",
      "knowledge-worker",
    ]),
  );
  expect(invoked.every((row) => row.envelope.channel === "stage")).toBe(true);
  expect(
    invoked
      .filter((row) => ["event-log", "crowdsourced-learning"].includes(row.id))
      .every((row) => {
        const nested = (row.envelope.payload ?? row.envelope.input) as Record<string, unknown>;
        return nested.channel === "stage";
      }),
  ).toBe(true);
});
