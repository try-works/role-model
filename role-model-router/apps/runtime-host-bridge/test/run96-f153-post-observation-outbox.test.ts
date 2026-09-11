import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { afterEach, expect, test } from "vitest";

import {
  type TrackBShadowPipelineRuntime,
  createRun96RoutingShadowScorer,
  createTrackBPostObservationOutbox,
  runTrackBPostObservationWithContribution,
} from "../src/track-b-runtime.js";

const testRoot = process.env.ROLE_MODEL_TEST_TEMP_ROOT ?? os.tmpdir();
const roots: string[] = [];
const routingShadowScorer = createRun96RoutingShadowScorer();

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

function digest(value: string): string {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

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
