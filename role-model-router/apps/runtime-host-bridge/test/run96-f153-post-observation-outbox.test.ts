import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { afterEach, expect, test } from "vitest";

import {
  type TrackBShadowPipelineRuntime,
  classifyReplayTerminalizationFailure,
  createSingleFlightBackgroundDrain,
  createRun96RoutingShadowScorer,
  createTrackBPostObservationOutbox,
  runTrackBPostObservationWithContribution,
} from "../src/track-b-runtime.js";

test("addendum 39 S5: a legacy scope failure is classified separately from a decline", () => {
  expect(
    classifyReplayTerminalizationFailure(
      "extension replay-core failed: replay persisted job scope binding mismatch",
    ),
  ).toBe("legacy_scope_unresolved");
  expect(
    classifyReplayTerminalizationFailure("extension replay-core failed: replay job is already terminal"),
  ).toBe("declined");
});

const testRoot = process.env.ROLE_MODEL_TEST_TEMP_ROOT ?? os.tmpdir();
const roots: string[] = [];
const routingShadowScorer = createRun96RoutingShadowScorer();

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

function digest(value: string): string {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

test("addendum 39 S1: a live request only schedules the background drain", async () => {
  let releaseDrain: (() => void) | null = null;
  const drained: string[] = [];
  const errors: unknown[] = [];
  const scheduler = createSingleFlightBackgroundDrain<string>({
    drain: async (runtime) => {
      drained.push(runtime);
      await new Promise<void>((resolve) => {
        releaseDrain = resolve;
      });
    },
    onError: (error) => errors.push(error),
  });

  // Scheduling must return immediately even though the drain never settles, and a
  // second request must not start a concurrent drain.
  expect(scheduler.schedule("runtime-a")).toBe(true);
  expect(scheduler.isInFlight()).toBe(true);
  expect(scheduler.schedule("runtime-b")).toBe(false);
  expect(scheduler.schedule(null)).toBe(false);
  expect(drained).toEqual(["runtime-a"]);

  releaseDrain?.();
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(scheduler.isInFlight()).toBe(false);

  // A failed drain is reported out-of-band and does not wedge the scheduler.
  const failing = createSingleFlightBackgroundDrain<string>({
    drain: async () => {
      throw new Error("extension runtime unavailable");
    },
    onError: (error) => errors.push(error),
  });
  expect(failing.schedule("runtime-c")).toBe(true);
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(failing.isInFlight()).toBe(false);
  expect(String(errors.at(-1))).toBe("Error: extension runtime unavailable");
});

test("addendum 39 S1: enqueue does not wait behind an in-flight drain", async () => {
  const root = await mkdtemp(path.join(testRoot, "a39-outbox-lock-"));
  roots.push(root);
  const outbox = createTrackBPostObservationOutbox({
    filePath: path.join(root, "outbox.sqlite"),
    maxItems: 8,
  });
  await outbox.enqueue(observation([]));

  let releaseHandler: (() => void) | null = null;
  let handlerStarted = false;
  let handlerCalls = 0;
  const drainPromise = outbox.drain(async () => {
    handlerCalls += 1;
    if (handlerCalls === 1) {
      handlerStarted = true;
      await new Promise<void>((resolve) => {
        releaseHandler = resolve;
      });
    }
    return { status: "processed" };
  });
  while (!handlerStarted) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }

  // The live path must be able to record a new observation while the extension
  // runtime is still working on an earlier one.
  const enqueueStartedAtMs = Date.now();
  await outbox.enqueue({
    ...observation([]),
    requestId: "request:a39-lock-second",
    routingDecisionId: "decision:a39-lock-second",
  });
  expect(Date.now() - enqueueStartedAtMs).toBeLessThan(1_000);

  releaseHandler?.();
  await drainPromise;
});

function comparableEvidence() {
  return {
    source: {
      rolloutId: "rollout:source-f153",
      routePackage: "endpoint:source-f153",
      endpointId: "endpoint:source-f153",
      modelId: "model:source-f153",
      policyId: "routing-shadow",
      reasoningEffort: "high",
      effortSource: "variant",
      evidenceRef: "artifact:source-evidence-f153",
      artifactRef: "artifact:source-output-f153",
      evaluationActual: "source result",
      propensity: 0.6,
      outcome: {
        outcomeRef: "artifact:source-outcome-f153",
        outcomeDigest: digest("source-outcome-f153"),
        status: "success",
      },
    },
    counterfactuals: [
      {
        rolloutId: "rollout:counterfactual-f153",
        routePackage: "endpoint:counterfactual-f153",
        endpointId: "endpoint:counterfactual-f153",
        modelId: "model:counterfactual-f153",
        policyId: "routing-shadow",
        reasoningEffort: "max",
        effortSource: "variant",
        evidenceRef: "artifact:counterfactual-evidence-f153",
        artifactRef: "artifact:counterfactual-output-f153",
        evaluationActual: "counterfactual result",
        propensity: 0.4,
        outcome: {
          outcomeRef: "artifact:counterfactual-outcome-f153",
          outcomeDigest: digest("counterfactual-outcome-f153"),
          status: "success",
        },
      },
    ],
    candidateSet: [
      { routePackage: "endpoint:source-f153", endpointId: "endpoint:source-f153", propensity: 0.6 },
      {
        routePackage: "endpoint:counterfactual-f153",
        endpointId: "endpoint:counterfactual-f153",
        propensity: 0.4,
      },
    ],
    evaluationReferences: {
      taskRef: "artifact:task-f153",
      inputRef: "artifact:input-f153",
      forkRef: "artifact:fork-f153",
      toolPolicyDigest: digest("tool-policy-f153"),
      environmentDigest: digest("environment-f153"),
      sourceEvidenceRef: "artifact:source-evidence-f153",
      counterfactualEvidenceRef: "artifact:counterfactual-evidence-f153",
      sourceOutcomeRef: "artifact:source-outcome-f153",
      counterfactualOutcomeRef: "artifact:counterfactual-outcome-f153",
      perCase: [
        { caseId: "case:f153:source", evidenceRef: "artifact:case-source-f153" },
        { caseId: "case:f153:counterfactual", evidenceRef: "artifact:case-counterfactual-f153" },
      ],
    },
  };
}

function observation(trajectoryEvents: readonly Record<string, unknown>[]) {
  return {
    requestId: "request:f153-outbox",
    routingDecisionId: "decision:f153-outbox",
    endpointId: "endpoint:source-f153",
    modelId: "model:source-f153",
    reasoningEffort: "high",
    effortSource: "variant" as const,
    occurrenceId: "occurrence:f153-outbox",
    contentId: "content:f153-outbox",
    routingShadowEvidence: comparableEvidence(),
    routingShadowCases: [
      {
        id: "case:f153:source",
        evaluationCriteria: {
          schemaVersion: "role-model.semantic-criteria.v1",
          requiredTerms: ["result"],
        },
      },
      {
        id: "case:f153:counterfactual",
        evaluationCriteria: {
          schemaVersion: "role-model.semantic-criteria.v1",
          requiredTerms: ["result"],
        },
      },
    ],
    trajectoryEvents,
    usageEvent: { tokens_in: 4, tokens_out: 8 },
    responseStatusCode: 200,
  } as const;
}

function createGenericRuntime(
  calls: Array<{ id: string; capability: string; envelope: Record<string, unknown> }>,
): TrackBShadowPipelineRuntime {
  let trialIndex = 0;
  return {
    async invoke(id, envelope) {
      const capability = String(envelope.capability ?? "");
      calls.push({ id, capability, envelope });
      const base = {
        workerPid: 1000 + calls.length,
        durableLocator: { extensionId: id, requestId: envelope.requestId },
        evidenceRef: `artifact:${id}:${calls.length}`,
        readCapability: "artifact:read",
        businessOutput: { extensionId: id, capability },
      };
      if (id === "artifact-store") {
        return { ...base, id: `artifact:${envelope.requestId}` };
      }
      if (id === "repository-context") {
        return {
          ...base,
          available: true,
          context: {
            scopeId: envelope.scope,
            repoFingerprint: "a".repeat(64),
            packageId: null,
            fallbackLevel: "repo_task",
            branchCompatibility: "unknown",
            fingerprintEpoch: 1,
          },
          diagnostics: [],
        };
      }
      if (id === "knowledge-store" && capability === "knowledge:write") {
        return { ...base, id: `knowledge:${envelope.requestId}` };
      }
      if (id === "knowledge-store" && capability === "knowledge:read") {
        return { ...base, id: `knowledge:${envelope.requestId}` };
      }
      if (id === "replay-core") {
        return {
          ...base,
          sourceDecisionId: "decision:f153-outbox",
          sourceGraphRef: "artifact:graph:f153",
          sharedPrefixRef: "artifact:fork-f153",
          branches: [{ id: "branch:f153" }],
          digest: digest("replay-f153"),
        };
      }
      if (id === "evaluation-core" && capability === "evaluation:attest-references") {
        const value = envelope.value as Record<string, unknown>;
        const references =
          value.references &&
          typeof value.references === "object" &&
          !Array.isArray(value.references)
            ? (value.references as Record<string, string>)
            : {};
        const issuedAtMs = Date.now();
        return {
          schemaVersion: "role-model.evaluation-reference-attestation.v1",
          authority: "sidecar:f153-test",
          purpose: "evaluation",
          channel: envelope.channel,
          scope: envelope.scope,
          authorizationEpoch: envelope.authorizationEpoch,
          issuedAtMs,
          expiresAtMs: issuedAtMs + 60_000,
          references: Object.fromEntries(
            Object.entries(references).map(([field, reference]) => [
              field,
              {
                reference,
                resolved: true,
                referenceDigest: digest(reference),
                purpose: "evaluation",
                authority: "sidecar:f153-test",
                channel: envelope.channel,
                scope: envelope.scope,
                authorizationEpoch: envelope.authorizationEpoch,
                issuedAtMs,
                expiresAtMs: issuedAtMs + 60_000,
              },
            ]),
          ),
        };
      }
      if (id === "evaluation-core" && capability === "evaluation:list-trials") {
        trialIndex += 1;
        return [
          {
            trialId: `trial:f153:${trialIndex}`,
            candidateRef:
              trialIndex === 1 ? "endpoint:source-f153" : "endpoint:counterfactual-f153",
            caseId: trialIndex === 1 ? "case:f153:source" : "case:f153:counterfactual",
          },
        ];
      }
      if (id === "evaluation-core" && capability === "evaluation:claim-trial") {
        const value = envelope.value as Record<string, unknown>;
        return { trialId: value.trialId, leaseId: "lease:f153" };
      }
      if (id === "evaluation-runner-local" && capability === "evaluation:execute-trial") {
        const index = calls.filter(
          (call) => call.id === "evaluation-runner-local" && call.capability === capability,
        ).length;
        return {
          ...base,
          outputRef: `artifact:trial-output-f153-${index}`,
          outputDigest: digest(`trial-output-f153-${index}`),
          stdoutRef: `artifact:trial-stdout-f153-${index}`,
          stderrRef: `artifact:trial-stderr-f153-${index}`,
          exitCode: 0,
          measurements: { elapsedMs: 1, outputBytes: 10 },
          scores: [
            {
              // Derive the emitted identity from the definition-bound factory so
              // the durable correctness lookup matches the registered generation.
              scorerId: routingShadowScorer.id,
              scorerVersion: routingShadowScorer.version,
              scorerDigest: routingShadowScorer.digest,
              dimension: "correctness",
              score: index === 1 ? 1 : 0,
              confidence: 1,
              source: "deterministic_semantic_criteria",
            },
          ],
        };
      }
      if (
        id === "evaluation-core" &&
        ["evaluation:submit-trial-result", "evaluation:record-trial-score-batch"].includes(
          capability,
        )
      ) {
        return { ...base, accepted: true };
      }
      if (id === "evaluation-core" && capability === "evaluation:finalize-comparison-group") {
        return {
          ...base,
          groupId: "comparison:request:f153-outbox",
          status: "finalized",
          outcome: "candidate",
        };
      }
      if (id === "evaluation-core" && capability === "evaluation:read-comparison-group") {
        return {
          ...base,
          groupId: "comparison:request:f153-outbox",
          status: "finalized",
          outcome: "candidate",
          holdout: { partition: "holdout" },
          members: [
            { trialId: "trial:f153:1", score: 1 },
            { trialId: "trial:f153:2", score: 0 },
          ],
        };
      }
      if (id === "trajectory-signals") {
        return {
          ...base,
          routeDecisionId: "decision:f153-outbox",
          graphRef: "artifact:graph:f153",
          signals: [
            {
              signalInstanceId: "signal:f153:quality",
              signalType: "evaluation_outcome",
              dimension: "quality",
              unit: "normalized_score",
              direction: "higher_is_better",
              value: 1,
              confidence: 1,
              weight: 1,
              missingness: "complete",
              evidenceRef: "artifact:signal:f153",
              routePackage: "endpoint:source-f153",
            },
          ],
        };
      }
      if (id === "profile-learner") {
        return { ...base, digest: digest("profile:f153"), effects: { quality: { confidence: 1 } } };
      }
      if (id === "knowledge-worker") {
        return { ...base, id: "candidate:f153", state: "shadow", productionEffects: {} };
      }
      return base;
    },
  };
}

test("F153 RED: a one-event comparable observation cannot finalize learning but still aggregates an independent outcome", async () => {
  const root = await mkdtemp(path.join(testRoot, "run96-f153-outbox-"));
  roots.push(root);
  const filePath = path.join(root, "post-observation.sqlite");
  const outbox = createTrackBPostObservationOutbox({ filePath, maxItems: 4 });
  const oneEvent = [
    {
      id: "trajectory:f153:one",
      type: "synthetic",
      timestampMs: 96_000,
      requestId: "request:f153-outbox",
    },
  ];
  const queued = observation(oneEvent);

  await outbox.enqueue(queued);
  const database = new DatabaseSync(filePath);
  let pending: { observation_json: string };
  try {
    pending = database
      .prepare("SELECT observation_json FROM track_b_post_observation_pending WHERE request_id=?")
      .get(queued.requestId) as { observation_json: string };
  } finally {
    database.close();
  }
  const persisted = JSON.parse(pending.observation_json) as Record<string, unknown>;
  expect(persisted.trajectoryEvents).toEqual(oneEvent);
  expect(persisted.routingShadowEvidence).toEqual(queued.routingShadowEvidence);
  expect(persisted.routingShadowCases).toEqual(queued.routingShadowCases);
  expect(persisted).not.toHaveProperty("prompt");
  expect(persisted).not.toHaveProperty("response");

  const calls: Array<{ id: string; capability: string; envelope: Record<string, unknown> }> = [];
  let contributionCalls = 0;
  let contributionInput: Record<string, unknown> | null = null;
  await outbox.drain(async (item) =>
    runTrackBPostObservationWithContribution(
      createGenericRuntime(calls),
      item,
      { scope: "tenant:f153", channel: "development", authorizationEpoch: 96 },
      async (input) => {
        contributionCalls += 1;
        contributionInput = input;
        return { status: "uploaded" };
      },
    ),
  );
  const receipt = await outbox.readReceipt(queued.requestId);
  const result = (receipt?.result ?? {}) as Record<string, unknown>;
  expect(result.pipeline).toMatchObject({
    refusalCode: "R16_TRAJECTORY_EVIDENCE_UNAVAILABLE",
    learningDisposition: "insufficient_trajectory_evidence",
    productionMutation: false,
  });
  expect(contributionCalls).toBe(1);
  expect(contributionInput).toMatchObject({
    requestId: queued.requestId,
    endpointId: queued.endpointId,
    modelId: queued.modelId,
    success: true,
  });
  expect(
    calls.some(({ id, capability }) =>
      [
        "evaluation:create-job",
        "evaluation:finalize-comparison-group",
        "profile:consume-projection",
        "knowledge:consume-projection",
      ].includes(capability),
    ),
  ).toBe(false);
  expect(new Set(calls.map(({ id }) => id))).toEqual(
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
});

test("F153 GREEN: a truthful ordered two-event trajectory reaches the real shadow drain path", async () => {
  const root = await mkdtemp(path.join(testRoot, "run96-f153-valid-drain-"));
  roots.push(root);
  const filePath = path.join(root, "post-observation.sqlite");
  const outbox = createTrackBPostObservationOutbox({ filePath, maxItems: 4 });
  const events = [
    {
      id: "trajectory:f153:start",
      type: "provider_error",
      timestampMs: 96_000,
      requestId: "request:f153-outbox",
    },
    {
      id: "trajectory:f153:correction",
      type: "user_correction",
      timestampMs: 96_100,
      requestId: "request:f153-outbox",
    },
  ];
  const queued = observation(events);
  await outbox.enqueue(queued);
  const calls: Array<{ id: string; capability: string; envelope: Record<string, unknown> }> = [];
  let contributionCalls = 0;
  await outbox.drain(async (item) =>
    runTrackBPostObservationWithContribution(
      createGenericRuntime(calls),
      item,
      { scope: "tenant:f153", channel: "development", authorizationEpoch: 96 },
      async () => {
        contributionCalls += 1;
        return { status: "uploaded" };
      },
    ),
  );
  const receipt = await outbox.readReceipt(queued.requestId);
  const result = (receipt?.result ?? {}) as Record<string, unknown>;
  expect(result.pipeline).toMatchObject({
    requestId: queued.requestId,
    candidateId: "candidate:f153",
    productionMutation: false,
  });
  expect(result.pipeline).not.toHaveProperty("refusalCode");
  expect(result.projection).toMatchObject({
    policy: {
      permittedUse: false,
      trainingAllowed: false,
      authorizationState: "unknown",
    },
  });
  expect(result.consumption).toBeNull();
  expect(calls.some(({ capability }) => capability.endsWith("consume-projection"))).toBe(false);
  expect(
    calls.some(
      ({ id, capability }) => id === "evaluation-core" && capability === "evaluation:create-job",
    ),
  ).toBe(true);
  expect(
    calls.find(
      ({ id, capability }) =>
        id === "trajectory-signals" && capability === "signals:analyze-finalized-evaluation",
    )?.envelope.value,
  ).toMatchObject({ events });
  expect(contributionCalls).toBe(1);
});

/**
 * Run 99 R33 S34 live finding (stage v136): the host rebuilt `finalizedComparison` as
 * `{groupId, comparisonId, status, outcome, holdout, members}`, dropping the durable comparison's
 * `primaryMetric`. The learner therefore could not tell which dimension decided the comparison, fell
 * back to the cross-dimension mean (which ties at 0.5/0.5 on live traffic) and degraded every
 * `knowledge:eval-consumer` call with "group-relative semantic advantage could not be derived".
 *
 * The deciding metadata has to travel with the comparison: the declared primary metric, every
 * scorer's verdict, and the per-dimension member scores.
 */
test("run99 R33 the learner receives the primary metric and the per-dimension scores", async () => {
  const root = await mkdtemp(path.join(testRoot, "run99-r33-primary-metric-"));
  roots.push(root);
  const filePath = path.join(root, "post-observation.sqlite");
  const outbox = createTrackBPostObservationOutbox({ filePath, maxItems: 4 });
  const queued = observation([
    {
      id: "trajectory:r33:start",
      type: "provider_error",
      timestampMs: 96_000,
      requestId: "request:f153-outbox",
    },
    {
      id: "trajectory:r33:correction",
      type: "user_correction",
      timestampMs: 96_100,
      requestId: "request:f153-outbox",
    },
  ]);
  await outbox.enqueue(queued);
  const calls: Array<{ id: string; capability: string; envelope: Record<string, unknown> }> = [];
  const scripted = createGenericRuntime(calls);
  const primaryMetricKey =
    "role_model_pairwise_judge.battle@2+eb5b78055424:sha256:judge:task_specific_quality";
  const semanticMetricKey = "run96-semantic-criteria@2:sha256:semantic:correctness";
  const runtime: TrackBShadowPipelineRuntime = {
    async invoke(id, envelope) {
      const result = await scripted.invoke(id, envelope);
      const capability = String(envelope.capability ?? "");
      if (id === "evaluation-core" && capability === "evaluation:read-comparison-group") {
        // The live shape: the primary metric decided, the scorers disagree, and both members mean
        // out to exactly 0.5.
        return {
          ...(result as Record<string, unknown>),
          primaryMetric: { id: "role_model_pairwise_judge.battle", applied: true },
          scorerOutcomes: [
            {
              scorerKey: primaryMetricKey,
              outcome: "candidate",
              winnerTrialId: "trial:f153:2",
              winnerRole: "counterfactual",
            },
            {
              scorerKey: semanticMetricKey,
              outcome: "source",
              winnerTrialId: "trial:f153:1",
              winnerRole: "source",
            },
          ],
          members: [
            {
              trialId: "trial:f153:1",
              score: 0.5,
              confidence: 1,
              disposition: "negative",
              scoreId: "score:f153:1",
              dimensionScores: [
                { scorerKey: primaryMetricKey, score: 0 },
                { scorerKey: semanticMetricKey, score: 1 },
              ],
            },
            {
              trialId: "trial:f153:2",
              score: 0.5,
              confidence: 1,
              disposition: "positive",
              scoreId: "score:f153:2",
              dimensionScores: [
                { scorerKey: primaryMetricKey, score: 1 },
                { scorerKey: semanticMetricKey, score: 0 },
              ],
            },
          ],
        };
      }
      return result;
    },
  } as TrackBShadowPipelineRuntime;
  await outbox.drain(async (item) =>
    runTrackBPostObservationWithContribution(
      runtime,
      item,
      { scope: "tenant:f153", channel: "development", authorizationEpoch: 96 },
      async () => ({ status: "uploaded" }),
    ),
  );

  const knowledgeCall = calls.find(
    ({ id, capability }) => id === "knowledge-worker" && capability === "knowledge:eval-consumer",
  );
  expect(knowledgeCall).toBeDefined();
  const value = (knowledgeCall?.envelope.value ?? {}) as Record<string, unknown>;
  const evaluation = (value.evaluation ?? {}) as Record<string, unknown>;
  const comparison = (evaluation.finalizedComparison ?? {}) as Record<string, unknown>;
  expect(comparison.primaryMetric).toEqual({
    id: "role_model_pairwise_judge.battle",
    applied: true,
  });
  expect(Array.isArray(comparison.scorerOutcomes)).toBe(true);
  const members = (comparison.members ?? []) as Array<Record<string, unknown>>;
  expect(members).toHaveLength(2);
  for (const member of members) {
    expect(Array.isArray(member.dimensionScores)).toBe(true);
  }
});

test("Run 96 F174: a live-shaped observation keeps its authoritative response status through the durable outbox", async () => {
  const root = await mkdtemp(path.join(testRoot, "run96-f174-outbox-status-"));
  roots.push(root);
  const filePath = path.join(root, "post-observation.sqlite");
  const outbox = createTrackBPostObservationOutbox({ filePath, maxItems: 4 });
  const queued = observation([
    {
      id: "trajectory:f174",
      type: "captured",
      timestampMs: 96_000,
      requestId: "request:f153-outbox",
    },
  ]);
  // The packaged runtime observation carries the authoritative provider status
  // inside the execution/response capture rather than as a top-level scalar.
  const { responseStatusCode: _topLevel, ...withoutTopLevelStatus } = queued;
  const liveShaped = {
    ...withoutTopLevelStatus,
    execution: {
      responseCapture: { statusCode: 200, body: { id: "completion:f174" } },
    },
    inspection: {
      request: {
        responseCapture: { statusCode: 200, body: { id: "completion:f174" } },
      },
    },
  };

  await outbox.enqueue(liveShaped);
  const database = new DatabaseSync(filePath);
  let pending: { observation_json: string };
  try {
    pending = database
      .prepare("SELECT observation_json FROM track_b_post_observation_pending WHERE request_id=?")
      .get(liveShaped.requestId) as { observation_json: string };
  } finally {
    database.close();
  }
  const persisted = JSON.parse(pending.observation_json) as Record<string, unknown>;
  expect(persisted.responseStatusCode).toBe(200);

  const calls: Array<{ id: string; capability: string; envelope: Record<string, unknown> }> = [];
  let contributionInput: Record<string, unknown> | null = null;
  await outbox.drain(async (item) =>
    runTrackBPostObservationWithContribution(
      createGenericRuntime(calls),
      item,
      { scope: "tenant:f153", channel: "development", authorizationEpoch: 96 },
      async (input) => {
        contributionInput = input;
        return { status: "uploaded", id: "aggregate:f174" };
      },
    ),
  );
  const receipt = await outbox.readReceipt(liveShaped.requestId);
  const result = (receipt?.result ?? {}) as Record<string, unknown>;
  expect(result.contribution).toMatchObject({ status: "uploaded", id: "aggregate:f174" });
  expect(result.contributionCorrelationId).toMatch(/^corr-[a-f0-9]{24}$/);
  expect(contributionInput).toMatchObject({ success: true });
});
