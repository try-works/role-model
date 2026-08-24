import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

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

const comparableEvidence = () => ({
  source: {
    rolloutId: "rollout-source-87",
    routePackage: "candidate-local",
    endpointId: "endpoint-local",
    modelId: "model-local",
    policyId: "routing-policy-a",
    reasoningEffort: "medium",
    effortSource: "variant",
    evidenceRef: "evidence:source-87",
    artifactRef: "artifact:source-87",
    propensity: 0.6,
    outcome: {
      outcomeId: "outcome-source-87",
      outcomeRef: "outcome:source-87",
      outcomeDigest: "digest:source-87",
      source: "observed",
      status: "success",
    },
  },
  counterfactuals: [
    {
      rolloutId: "rollout-counterfactual-87",
      routePackage: "candidate-remote",
      endpointId: "endpoint-remote",
      modelId: "model-remote",
      policyId: "routing-policy-b",
      reasoningEffort: "high",
      effortSource: "variant",
      evidenceRef: "evidence:counterfactual-87",
      artifactRef: "artifact:counterfactual-87",
      propensity: 0.4,
      outcome: {
        outcomeId: "outcome-counterfactual-87",
        outcomeRef: "outcome:counterfactual-87",
        outcomeDigest: "digest:counterfactual-87",
        source: "replay",
        status: "failure",
      },
    },
  ],
  candidateSet: [
    { routePackage: "candidate-local", endpointId: "endpoint-local", propensity: 0.6 },
    { routePackage: "candidate-remote", endpointId: "endpoint-remote", propensity: 0.4 },
  ],
});

const comparableCases = () => [
  {
    id: "case-87",
    expected: "expected-route",
    actual: "expected-route",
    expectedRolloutId: "rollout-source-87",
    actualRolloutId: "rollout-counterfactual-87",
    expectedOutcomeRef: "outcome:source-87",
    actualOutcomeRef: "outcome:counterfactual-87",
    expectedEvidenceRef: "evidence:source-87",
    actualEvidenceRef: "evidence:counterfactual-87",
  },
];

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
    counterfactuals: [{ id: "candidate-remote", suffix: ["candidate-remote"] }],
    comparableEvidence: comparableEvidence(),
    evaluationCases: comparableCases(),
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

test("Run 94 R14 refuses self-comparison before creating a learned-experience candidate", async () => {
  const invoked: string[] = [];
  await expect(
    trackBRuntime.runTrackBShadowPipeline(
      {
        invoke: async (id) => {
          invoked.push(id);
          return {};
        },
      },
      {
        requestId: "run94-self-comparison",
        channel: "development",
        scope: "tenant:run94",
        authorizationEpoch: 94,
        productionState: {},
        routePackage: "route-package-a",
        sourceDecisionId: "decision-run94-a",
        sourceGraphRef: "sha256:graph-run94-a",
        prefix: [{ routePackage: "route-package-a" }],
        counterfactuals: [{ id: "route-package-a", suffix: [{ routePackage: "route-package-a" }] }],
        evaluationCases: [{ expected: "route-package-a", actual: "route-package-a" }],
        trajectoryEvents: [],
      },
    ),
  ).rejects.toThrow(/R14_NO_DISTINCT_COUNTERFACTUAL|distinct counterfactual|self-comparison/i);
  expect(invoked).toEqual([]);
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
        counterfactuals: [{ id: "candidate-remote", suffix: [] }],
        comparableEvidence: comparableEvidence(),
        evaluationCases: comparableCases(),
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
    modelId: "provider/model-run87",
    reasoningEffort: "future-tier-17",
    effortSource: "variant",
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
      modelId: "provider/model-run87",
      reasoningEffort: "future-tier-17",
      effortSource: "variant",
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

test("Run 91 quarantines legacy queued work that cannot prove variant identity", async () => {
  const stateRoot = path.join(os.tmpdir(), `run91-legacy-shadow-outbox-${Date.now()}`);
  roots.push(stateRoot);
  const filePath = path.join(stateRoot, "outbox.json");
  await mkdir(stateRoot, { recursive: true });
  await writeFile(
    filePath,
    `${JSON.stringify({
      schemaVersion: "role-model.track-b-post-observation-outbox.v2",
      pending: [
        {
          requestId: "legacy-run91",
          routingDecisionId: "decision-legacy-run91",
          endpointId: "provider.account.global.model-high",
        },
      ],
      receipts: [],
    })}\n`,
  );
  const outbox = trackBRuntime.createTrackBPostObservationOutbox({ filePath });
  const replayed: string[] = [];
  await outbox.drain(async (observation) => {
    replayed.push(observation.requestId);
    return {};
  });
  expect(replayed).toEqual([]);
  expect(await outbox.read()).toMatchObject({ pendingCount: 0, receiptCount: 0, receipts: [] });
  const database = new DatabaseSync(filePath);
  expect(
    database
      .prepare(
        "SELECT classification, reason FROM track_b_post_observation_legacy_rows WHERE source_id=?",
      )
      .get("legacy-run91"),
  ).toMatchObject({ classification: "quarantined" });
  database.close();
});

test("Phase 3.5 normal post-observation work executes every canonical business owner", async () => {
  const invoked: Array<{ id: string; envelope: Record<string, unknown> }> = [];
  const runtime = {
    async invoke(id: string, envelope: Record<string, unknown>) {
      invoked.push({ id, envelope });
      const base = {
        workerPid: 1000 + invoked.length,
        durableLocator: {
          extensionId: id,
          requestId: envelope.requestId,
          invocation: invoked.length,
        },
        evidenceRef: `evidence:${id}:${String(envelope.requestId)}`,
        businessOutput: {
          extensionId: id,
          capability: envelope.capability,
          invocation: invoked.length,
        },
        readCapability: "artifact:read",
      };
      if (id === "artifact-store") return { ...base, id: "artifact:run87" };
      if (id === "repository-context") {
        return {
          ...base,
          available: true,
          context: {
            scopeId: "tenant:run87",
            repoFingerprint: "a".repeat(64),
            packageId: null,
            fallbackLevel: "repo_task",
            branchCompatibility: "unknown",
            fingerprintEpoch: 1,
          },
          diagnostics: [
            {
              code: "REPOSITORY_CONTEXT_AVAILABLE",
              message: "privacy-safe repository context available",
              severity: "info",
            },
          ],
        };
      }
      if (id === "knowledge-store" && envelope.capability === "knowledge:write") {
        return { ...base, id: "knowledge:run87" };
      }
      if (id === "evaluation-runner-local") {
        return { ...base, scores: [1], provenance: { evidenceRef: "artifact:run87" } };
      }
      if (id === "knowledge-worker") {
        return { ...base, id: "candidate:run87", state: "shadow", productionEffects: {} };
      }
      return base;
    },
  };
  const identity = {
    endpointId: "endpoint-run87-high",
    modelId: "provider/model-run87",
    reasoningEffort: "future-tier-17",
    effortSource: "variant" as const,
  };
  const result = await trackBRuntime.runTrackBPostObservation(
    runtime,
    {
      requestId: "all-owners-run87",
      routingDecisionId: "route-run87",
      ...identity,
      usageEvent: {
        endpoint_id: identity.endpointId,
        model_id: identity.modelId,
        reasoning_effort: identity.reasoningEffort,
        effort_source: identity.effortSource,
      },
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
  expect(invoked.every((row) => row.envelope.identity !== undefined)).toBe(true);
  expect(invoked.map((row) => row.envelope.identity)).toEqual(invoked.map(() => identity));
  const artifactInvocation = invoked.find((row) => row.id === "artifact-store");
  const artifactPayload = artifactInvocation?.envelope.payload as Record<string, unknown>;
  const artifactRecord = artifactPayload.record as Record<string, unknown>;
  expect(JSON.parse(String(artifactRecord.content))).toMatchObject({ identity });
  const eventPayload = invoked.find((row) => row.id === "event-log")?.envelope.payload;
  expect(eventPayload).toMatchObject({ identity });
  const memoryPayload = invoked.find((row) => row.id === "memory-store")?.envelope
    .payload as Record<string, unknown>;
  expect(memoryPayload.row).toMatchObject({ identity });
  const knowledgeWrite = invoked.find(
    (row) => row.id === "knowledge-store" && row.envelope.capability === "knowledge:write",
  );
  expect((knowledgeWrite?.envelope.payload as Record<string, unknown>).value).toMatchObject({
    identity,
  });
  expect(result.projection.payload).toMatchObject({ identity });
  expect(result.repositoryContext).toEqual({
    available: true,
    scopeId: "tenant:run87",
    repoFingerprint: "a".repeat(64),
    packageId: null,
    fallbackLevel: "repo_task",
    branchCompatibility: "unknown",
    fingerprintEpoch: 1,
    diagnostics: [
      {
        code: "REPOSITORY_CONTEXT_AVAILABLE",
        message: "privacy-safe repository context available",
        severity: "info",
      },
    ],
  });
  expect(
    invoked
      .filter((row) => ["event-log", "crowdsourced-learning"].includes(row.id))
      .every((row) => {
        const nested = (row.envelope.payload ?? row.envelope.input) as Record<string, unknown>;
        return nested.channel === "stage";
      }),
  ).toBe(true);
});

test("Run 91 final audit rejects incomplete effort identity before Track B extension fan-out", async () => {
  const invoked: string[] = [];
  const runtime = {
    async invoke(id: string) {
      invoked.push(id);
      return {};
    },
  };

  await expect(
    trackBRuntime.runTrackBPostObservation(
      runtime,
      {
        requestId: "missing-effort-run91",
        routingDecisionId: "decision-missing-effort-run91",
        endpointId: "endpoint-missing-effort-run91",
        modelId: "provider/model-run91",
        reasoningEffort: "high",
      },
      { scope: "tenant:run91", channel: "stage", authorizationEpoch: 91 },
    ),
  ).rejects.toThrow(/effort identity/i);
  expect(invoked).toEqual([]);
});
