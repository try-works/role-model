import { createHash } from "node:crypto";
import { expect, test } from "vitest";

import {
  type TrackBRouteAdvisoryClaims,
  createTrackBRouteAdvisoryAuthorization,
  digestTrackBSemanticEvaluationCriteria,
  resolveTrackBRouteAdvisory,
  runTrackBShadowPipeline,
  verifyTrackBRouteAdvisoryAuthorization,
} from "../src/track-b-runtime.js";

test("Run96 Addendum 17: semantic criteria have one order-independent durable digest", () => {
  const first = digestTrackBSemanticEvaluationCriteria({
    schemaVersion: "role-model.semantic-criteria.v1",
    requiredTerms: ["durable"],
    minOutputChars: 12,
  });
  const reordered = digestTrackBSemanticEvaluationCriteria({
    minOutputChars: 12,
    requiredTerms: ["durable"],
    schemaVersion: "role-model.semantic-criteria.v1",
  });
  expect(first).toBe(reordered);
});

const comparableEvidence = {
  source: {
    rolloutId: "rollout:source-96",
    routePackage: "candidate:source-96",
    endpointId: "endpoint:source-96",
    modelId: "model:source-96",
    policyId: "routing-shadow",
    reasoningEffort: "high",
    effortSource: "variant",
    evidenceRef: "artifact:source-96",
    artifactRef: "artifact:source-output-96",
    evaluationActual: "success",
    propensity: 0.6,
    outcome: {
      outcomeId: "outcome:source-96",
      outcomeRef: "artifact:outcome-source-96",
      outcomeDigest: "sha256:source-outcome-96",
      source: "observed",
      status: "success",
    },
  },
  counterfactuals: [
    {
      rolloutId: "rollout:counterfactual-96",
      routePackage: "candidate:counterfactual-96",
      endpointId: "endpoint:counterfactual-96",
      modelId: "model:counterfactual-96",
      policyId: "routing-shadow",
      reasoningEffort: "max",
      effortSource: "variant",
      evidenceRef: "artifact:counterfactual-96",
      artifactRef: "artifact:counterfactual-output-96",
      evaluationActual: "failure",
      propensity: 0.4,
      outcome: {
        outcomeId: "outcome:counterfactual-96",
        outcomeRef: "artifact:outcome-counterfactual-96",
        outcomeDigest: "sha256:counterfactual-outcome-96",
        source: "replay",
        // A successful provider transport is not positive learning evidence.  The
        // independently observed semantic criterion below deliberately fails.
        status: "success",
      },
    },
  ],
  candidateSet: [
    { routePackage: "candidate:source-96", endpointId: "endpoint:source-96", propensity: 0.6 },
    {
      routePackage: "candidate:counterfactual-96",
      endpointId: "endpoint:counterfactual-96",
      propensity: 0.4,
    },
  ],
};

const referenceDigest = (reference: string): string =>
  `sha256:${createHash("sha256").update(reference).digest("hex")}`;

const attestReferences = (envelope: Record<string, unknown>): Record<string, unknown> => {
  const value = envelope.value as Record<string, unknown>;
  const references = value.references as Record<string, string>;
  const authority = "sidecar:run96-durable-reference-store";
  const now = Date.now();
  return {
    schemaVersion: "role-model.evaluation-reference-attestation.v1",
    authority,
    purpose: "evaluation",
    channel: envelope.channel,
    scope: envelope.scope,
    authorizationEpoch: envelope.authorizationEpoch,
    issuedAtMs: now - 1,
    expiresAtMs: now + 60_000,
    references: Object.fromEntries(
      Object.entries(references).map(([field, reference]) => [
        field,
        {
          schemaVersion: "role-model.evaluation-reference-attestation.v1",
          reference,
          referenceDigest: referenceDigest(reference),
          authority,
          purpose: "evaluation",
          channel: envelope.channel,
          scope: envelope.scope,
          authorizationEpoch: envelope.authorizationEpoch,
          issuedAtMs: now - 1,
          expiresAtMs: now + 60_000,
          resolved: true,
        },
      ]),
    ),
  };
};

const durableEvaluationReferences = () => ({
  taskRef: "task:run96-durable-shadow",
  inputRef: "input:run96-durable-shadow",
  forkRef: "artifact:source-graph-96#prefix",
  toolPolicyDigest: "sha256:run96-durable-tool-policy",
  environmentDigest: "sha256:run96-durable-environment",
  sourceEvidenceRef: "artifact:source-96",
  counterfactualEvidenceRef: "artifact:counterfactual-96",
  sourceOutcomeRef: "artifact:outcome-source-96",
  counterfactualOutcomeRef: "artifact:outcome-counterfactual-96",
  perCase: [
    { caseId: "case:request:shadow-96:0", evidenceRef: "evidence:run96-durable-source" },
    {
      caseId: "case:request:shadow-96:1",
      evidenceRef: "evidence:run96-durable-counterfactual",
    },
  ],
});

const digestEvaluationReferences = () => ({
  taskRef: "task:run96-digest-shadow",
  inputRef: "input:run96-digest-shadow",
  forkRef: "artifact:source-digest#prefix",
  toolPolicyDigest: "sha256:run96-digest-tool-policy",
  environmentDigest: "sha256:run96-digest-environment",
  sourceEvidenceRef: "artifact:source-digest",
  counterfactualEvidenceRef: "artifact:counterfactual-digest",
  sourceOutcomeRef: "artifact:source-outcome-digest",
  counterfactualOutcomeRef: "artifact:counterfactual-outcome-digest",
  perCase: [
    { caseId: "case:request-digest:0", evidenceRef: "evidence:run96-digest-source" },
    {
      caseId: "case:request-digest:1",
      evidenceRef: "evidence:run96-digest-counterfactual",
    },
  ],
});

const advisoryAuthoritySecret = "run96-advisory-authority-secret-0123456789";
function signedAdvisoryAuthorization(
  input: Omit<TrackBRouteAdvisoryClaims, "advisoryState" | "confidence"> &
    Partial<Pick<TrackBRouteAdvisoryClaims, "advisoryState" | "confidence">>,
  nowMs = 96_000,
) {
  const authorization = createTrackBRouteAdvisoryAuthorization({
    authoritySecret: advisoryAuthoritySecret,
    keyId: "runtime:run96",
    issuedAtMs: nowMs,
    expiresAtMs: nowMs + 60_000,
    claims: {
      ...input,
      advisoryState: input.advisoryState ?? "fresh",
      confidence: input.confidence ?? 0,
    },
  });
  return {
    authorization,
    authorizationValidator: (
      receipt: typeof authorization,
      expected: TrackBRouteAdvisoryClaims,
      timestamp: number,
    ) =>
      verifyTrackBRouteAdvisoryAuthorization(receipt, advisoryAuthoritySecret, {
        expected,
        nowMs: timestamp,
      }),
  };
}

test("Run96 R19 RED: route advisories require a scope-bound signed authorization receipt", () => {
  const authoritySecret = advisoryAuthoritySecret;
  const authorization = createTrackBRouteAdvisoryAuthorization({
    authoritySecret,
    keyId: "runtime:run96",
    issuedAtMs: 96_000,
    expiresAtMs: 156_000,
    claims: {
      baselineDecisionId: "decision:auth-96",
      channel: "development",
      scope: "tenant:run96",
      authorizationEpoch: 96,
      routePackage: "candidate:auth-96",
      profileSnapshotIds: ["profile:auth-96"],
      candidateId: "knowledge:auth-96",
      advisoryState: "fresh",
      confidence: 0.8,
    },
  });

  const disposition = resolveTrackBRouteAdvisory({
    baselineDecisionId: "decision:auth-96",
    channel: "development",
    scope: "tenant:run96",
    authorizationEpoch: 96,
    routePackage: "candidate:auth-96",
    profileSnapshotIds: ["profile:auth-96"],
    candidateId: "knowledge:auth-96",
    confidence: 0.8,
    nowMs: 96_000,
    authorization,
    authorizationValidator: (receipt, expected, nowMs) =>
      verifyTrackBRouteAdvisoryAuthorization(receipt, authoritySecret, { expected, nowMs }),
  });

  expect(disposition).toMatchObject({
    confidence: 0.8,
    authorization: {
      schemaVersion: "role-model.route-advisory-authorization.v1",
      keyId: "runtime:run96",
      receiptId: expect.stringMatching(/^authorization:[a-f0-9]{64}$/),
    },
  });
  expect(disposition.authorization.receiptId).toBe(authorization.receiptId);
  expect(Object.isFrozen(disposition.authorization.claims.profileSnapshotIds)).toBe(true);

  const tamperedAuthorization = {
    ...authorization,
    signature: "0".repeat(64),
  };
  expect(
    verifyTrackBRouteAdvisoryAuthorization(tamperedAuthorization, authoritySecret, {
      expected: authorization.claims,
      nowMs: 96_000,
    }),
  ).toBe(false);
  expect(
    verifyTrackBRouteAdvisoryAuthorization(authorization, authoritySecret, {
      expected: authorization.claims,
      nowMs: 156_000,
    }),
  ).toBe(false);
  expect(() =>
    resolveTrackBRouteAdvisory({
      baselineDecisionId: "decision:auth-96",
      channel: "development",
      scope: "tenant:run96",
      authorizationEpoch: 96,
      routePackage: "candidate:auth-96",
      profileSnapshotIds: ["profile:auth-96"],
      candidateId: "knowledge:auth-96",
      confidence: 0.8,
      nowMs: 156_000,
      authorization,
      // Even a trusted callback cannot make an expired receipt current.
      authorizationValidator: () => true,
    }),
  ).toThrow(/authorization/i);

  expect(() =>
    resolveTrackBRouteAdvisory({
      baselineDecisionId: "decision:auth-96",
      channel: "development",
      scope: "tenant:other",
      authorizationEpoch: 96,
      routePackage: "candidate:auth-96",
      profileSnapshotIds: ["profile:auth-96"],
      candidateId: "knowledge:auth-96",
      confidence: 0.8,
      nowMs: 96_000,
      authorization,
      authorizationValidator: (receipt, expected, nowMs) =>
        verifyTrackBRouteAdvisoryAuthorization(receipt, authoritySecret, { expected, nowMs }),
    }),
  ).toThrow(/authorization/i);

  const paddedProductionAuthorization = signedAdvisoryAuthorization({
    baselineDecisionId: "decision:auth-production-96",
    channel: "production",
    scope: "tenant:run96",
    authorizationEpoch: 96,
    routePackage: "candidate:auth-production-96",
    profileSnapshotIds: [],
    candidateId: null,
  });
  expect(() =>
    resolveTrackBRouteAdvisory({
      baselineDecisionId: "decision:auth-production-96",
      channel: " production ",
      scope: "tenant:run96",
      authorizationEpoch: 96,
      routePackage: "candidate:auth-production-96",
      profileSnapshotIds: [],
      candidateId: null,
      nowMs: 96_000,
      ...paddedProductionAuthorization,
    }),
  ).toThrow("route-learning advisories are shadow-only");
});

test("Run96 S5 RED: route-learning advisories are scope-bound shadow receipts with expiry and rollback", () => {
  const disposition = resolveTrackBRouteAdvisory({
    baselineDecisionId: "decision:96",
    channel: "development",
    scope: "tenant:run96",
    authorizationEpoch: 96,
    routePackage: "candidate:96",
    profileSnapshotIds: ["profile:96"],
    candidateId: "knowledge:96",
    nowMs: 96_000,
    ...signedAdvisoryAuthorization({
      baselineDecisionId: "decision:96",
      channel: "development",
      scope: "tenant:run96",
      authorizationEpoch: 96,
      routePackage: "candidate:96",
      profileSnapshotIds: ["profile:96"],
      candidateId: "knowledge:96",
    }),
  });

  expect(disposition).toMatchObject({
    schemaVersion: "role-model.route-advisory-disposition.v1",
    mode: "shadow",
    disposition: "not_applied_shadow",
    baselineDecisionId: "decision:96",
    scope: "tenant:run96",
    authorizationEpoch: 96,
    routePackage: "candidate:96",
    profileSnapshotIds: ["profile:96"],
    candidateId: "knowledge:96",
    confidence: 0,
    expiresAtMs: 156_000,
    rollbackDisposition: "baseline_retained",
    productionMutation: false,
  });
  expect(disposition.advisoryId).toMatch(/^advisory:[a-f0-9]{64}$/);
  expect(disposition.decisionAdvice).toEqual({
    consideredAdviceIds: [disposition.advisoryId],
    acceptedAdviceIds: [],
    rejectedAdviceIds: [disposition.advisoryId],
    staleAdviceIds: [],
    unavailableAdviceIds: [],
    deterministicFallback: "baseline_retained",
  });

  expect(() =>
    resolveTrackBRouteAdvisory({
      baselineDecisionId: "decision:96",
      channel: "production",
      scope: "tenant:run96",
      authorizationEpoch: 96,
      routePackage: "candidate:96",
      profileSnapshotIds: [],
      candidateId: null,
      nowMs: 96_000,
      ...signedAdvisoryAuthorization({
        baselineDecisionId: "decision:96",
        channel: "production",
        scope: "tenant:run96",
        authorizationEpoch: 96,
        routePackage: "candidate:96",
        profileSnapshotIds: [],
        candidateId: null,
      }),
    }),
  ).toThrow("route-learning advisories are shadow-only");
});

test("Run96 S5 RED: stale and unavailable advisory evidence remains visible while baseline routing wins", () => {
  for (const advisoryState of ["stale", "unavailable"] as const) {
    const disposition = resolveTrackBRouteAdvisory({
      baselineDecisionId: "decision:96-fallback",
      channel: "development",
      scope: "tenant:run96",
      authorizationEpoch: 96,
      routePackage: "candidate:96-fallback",
      profileSnapshotIds: ["profile:96-fallback"],
      candidateId: "knowledge:96-fallback",
      advisoryState,
      nowMs: 96_000,
      ...signedAdvisoryAuthorization({
        baselineDecisionId: "decision:96-fallback",
        channel: "development",
        scope: "tenant:run96",
        authorizationEpoch: 96,
        routePackage: "candidate:96-fallback",
        profileSnapshotIds: ["profile:96-fallback"],
        candidateId: "knowledge:96-fallback",
        advisoryState,
      }),
    });

    expect(disposition.decisionAdvice).toMatchObject({
      consideredAdviceIds: [disposition.advisoryId],
      acceptedAdviceIds: [],
      rejectedAdviceIds: [disposition.advisoryId],
      deterministicFallback: "baseline_retained",
      ...(advisoryState === "stale"
        ? { staleAdviceIds: [disposition.advisoryId], unavailableAdviceIds: [] }
        : { staleAdviceIds: [], unavailableAdviceIds: [disposition.advisoryId] }),
    });
  }
});

test("Run96 S4 RED: shadow learning uses durable Evaluation Core trials rather than the legacy aggregate evaluator", async () => {
  const calls: Array<{ id: string; capability: unknown }> = [];
  let scorerRegistration: unknown;
  let semanticScoreSubmission: Record<string, unknown> | undefined;
  let signalInput: Record<string, unknown> | undefined;
  let profileInput: Record<string, unknown> | undefined;
  let knowledgeInput: Record<string, unknown> | undefined;
  let planGraphInput: Record<string, unknown> | undefined;
  const durableJobs: Record<string, unknown>[] = [];
  const trialIds = ["trial:source-96", "trial:counterfactual-96"];
  const claimedTrialIds = ["trial:source-96", "trial:counterfactual-96"];
  let createCount = 0;
  const pipeline = await runTrackBShadowPipeline(
    {
      async invoke(id, envelope) {
        calls.push({ id, capability: envelope.capability });
        if (id === "evaluation-core" && envelope.capability === "evaluation:register-scorer") {
          scorerRegistration = envelope.value;
        }
        if (id === "evaluation-runner-local" && envelope.capability === "evaluation:run-local") {
          throw new Error("legacy aggregate evaluation is prohibited");
        }
        if (id === "replay-core") {
          planGraphInput = envelope.value as Record<string, unknown>;
          return {
            sourceDecisionId: "decision:source-96",
            sourceGraphRef: "artifact:source-graph-96",
            sharedPrefixRef: "artifact:source-graph-96#prefix",
            branches: [],
            digest: "sha256:replay-plan-96",
            businessOutput: { richPromptContent: "must-not-cross-the-knowledge-ipc-boundary" },
          };
        }
        if (id === "evaluation-core" && envelope.capability === "evaluation:register-scorer") {
          return { key: "run96-exact@1" };
        }
        if (id === "evaluation-core" && envelope.capability === "evaluation:attest-references") {
          return attestReferences(envelope as Record<string, unknown>);
        }
        if (id === "evaluation-core" && envelope.capability === "evaluation:create-job") {
          durableJobs.push(envelope.value as Record<string, unknown>);
          return { jobId: `evaluation:job-${createCount++}` };
        }
        if (id === "evaluation-core" && envelope.capability === "evaluation:list-trials") {
          const trialId = trialIds.shift();
          return trialId ? [{ trialId }] : [];
        }
        if (
          id === "evaluation-runner-local" &&
          envelope.capability === "evaluation:execute-trial"
        ) {
          const actual = (envelope.value as Record<string, unknown>).actual;
          return {
            outputRef: "artifact:evaluated-output-96",
            outputDigest: "sha256:evaluated-output-96",
            stdoutRef: "artifact:evaluated-stdout-96",
            stderrRef: "artifact:evaluated-stderr-96",
            exitCode: 0,
            measurements: { elapsedMs: 1, outputBytes: 1 },
            scores: [
              {
                scorerId: "run96-semantic-criteria",
                scorerVersion: "1",
                scorerDigest: "sha256:semantic-criteria",
                scorerDefinition: {
                  manifestVersion: 2,
                  id: "run96-semantic-criteria",
                  version: "1",
                  digest: "sha256:semantic-criteria",
                  scorerSetVersion: "run96-routing-shadow-v2",
                  algorithm: "required_terms",
                  dimensions: ["correctness"],
                  range: { min: 0, max: 1 },
                  direction: "higher_is_better",
                  requiredInputs: ["outputRef", "evaluationCriteria"],
                },
                dimension: "correctness",
                score: actual === "success" ? 1 : 0,
                confidence: 1,
                source: "deterministic_semantic_criteria",
              },
            ],
          };
        }
        if (id === "evaluation-core" && envelope.capability === "evaluation:claim-trial") {
          return { trialId: claimedTrialIds.shift(), leaseId: "lease:96" };
        }
        if (
          id === "evaluation-core" &&
          ["evaluation:submit-trial-result", "evaluation:record-trial-score-batch"].includes(
            String(envelope.capability),
          )
        ) {
          if (envelope.capability === "evaluation:record-trial-score-batch")
            semanticScoreSubmission = envelope.value as Record<string, unknown>;
          return { accepted: true };
        }
        if (
          id === "evaluation-core" &&
          envelope.capability === "evaluation:finalize-comparison-group"
        ) {
          return { groupId: "comparison:96", status: "finalized", outcome: "candidate" };
        }
        if (
          id === "evaluation-core" &&
          envelope.capability === "evaluation:read-comparison-group"
        ) {
          return { groupId: "comparison:96", status: "finalized", outcome: "candidate" };
        }
        if (id === "trajectory-signals") {
          signalInput = envelope.value as Record<string, unknown>;
          return {
            routeDecisionId: "decision:source-96",
            graphRef: "artifact:source-graph-96",
            signals: [
              {
                signalInstanceId: "comparison:96:evaluation_outcome",
                signalType: "evaluation_outcome",
                dimension: "quality",
                unit: "normalized_score",
                direction: "higher_is_better",
                value: 1,
                confidence: 1,
                weight: 1,
                missingness: "complete",
                evidenceRef: "comparison:96",
                routePackage: "candidate:source-96",
                businessOutput: { richPayload: "must-remain-in-the-trajectory-store" },
              },
            ],
          };
        }
        if (id === "profile-learner") {
          profileInput = envelope.value as Record<string, unknown>;
          return {
            profileId: "profile:96",
            digest: "sha256:profile-96",
            effects: {
              routePackage: {
                values: ["candidate:source-96"],
                evidenceRefs: ["artifact:source-96"],
                sampleCount: 2,
                confidence: 1,
                bias: "none",
              },
            },
          };
        }
        if (id === "knowledge-worker") {
          knowledgeInput = envelope.value as Record<string, unknown>;
          return { id: "candidate:96", state: "shadow", productionEffects: {} };
        }
        throw new Error(`unexpected invocation ${id}:${String(envelope.capability)}`);
      },
    },
    {
      requestId: "request:shadow-96",
      channel: "development",
      scope: "tenant:run96",
      authorizationEpoch: 96,
      productionState: {},
      routePackage: "candidate:source-96",
      sourceDecisionId: "decision:source-96",
      sourceGraphRef: "artifact:source-graph-96",
      prefix: [],
      sourcePrefixRef: "artifact:source-graph-96#prefix",
      counterfactuals: [{ id: "candidate:counterfactual-96", suffix: [] }],
      comparableEvidence,
      evaluationCases: [
        {
          id: "case:shadow-96",
          evaluationCriteria: {
            schemaVersion: "role-model.semantic-criteria.v1",
            requiredTerms: ["success"],
          },
        },
      ],
      evaluationReferences: durableEvaluationReferences(),
      trajectoryEvents: [],
    },
  );
  expect(pipeline).toMatchObject({
    evaluation: { groupId: "comparison:96", outcome: "candidate" },
    advisory: {
      mode: "shadow",
      disposition: "not_applied_shadow",
      baselineDecisionId: "decision:source-96",
    },
  });
  expect(pipeline.receipt).toMatchObject({
    schemaVersion: "role-model.track-b-shadow-pipeline-receipt.v1",
    advisoryId: pipeline.advisory.advisoryId,
    decisionAdvice: pipeline.advisory.decisionAdvice,
  });
  // The replay plan must bind the authoritative source prefix reference, not a
  // locally derived look-alike, or comparability can never bind the replay.
  expect(planGraphInput).toMatchObject({
    sourceGraphRef: "artifact:source-graph-96",
    sourcePrefixRef: "artifact:source-graph-96#prefix",
  });

  expect(calls).toEqual(
    expect.arrayContaining([
      { id: "evaluation-core", capability: "evaluation:register-scorer" },
      { id: "evaluation-core", capability: "evaluation:create-job" },
      { id: "evaluation-core", capability: "evaluation:list-trials" },
      { id: "evaluation-runner-local", capability: "evaluation:execute-trial" },
      { id: "evaluation-core", capability: "evaluation:finalize-comparison-group" },
      { id: "evaluation-core", capability: "evaluation:read-comparison-group" },
    ]),
  );
  expect(scorerRegistration).toBeDefined();
  expect(durableJobs).toHaveLength(1);
  expect(durableJobs[0]).toMatchObject({
    evaluationSchemaVersion: 3,
    comparability: {
      taskRef: "task:run96-durable-shadow",
      inputRef: "input:run96-durable-shadow",
      forkRef: "artifact:source-graph-96#prefix",
      policyId: "run96-routing-shadow",
      scorerSetVersion: "run96-routing-shadow-v2",
      toolPolicyDigest: "sha256:run96-durable-tool-policy",
      environmentDigest: "sha256:run96-durable-environment",
      sourceEvidenceRef: "artifact:source-96",
      counterfactualEvidenceRef: "artifact:counterfactual-96",
      sourceOutcomeRef: "artifact:outcome-source-96",
      counterfactualOutcomeRef: "artifact:outcome-counterfactual-96",
    },
    holdout: {
      holdoutId: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
      membershipDigest: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
      partition: "holdout",
      caseIds: ["case:request:shadow-96:0", "case:request:shadow-96:1"],
    },
    referenceAttestation: {
      schemaVersion: "role-model.evaluation-reference-attestation.v1",
      authority: "sidecar:run96-durable-reference-store",
      references: {
        sourceEvidenceRef: { reference: "artifact:source-96", resolved: true },
        counterfactualEvidenceRef: { reference: "artifact:counterfactual-96", resolved: true },
        sourceOutcomeRef: { reference: "artifact:outcome-source-96", resolved: true },
        counterfactualOutcomeRef: {
          reference: "artifact:outcome-counterfactual-96",
          resolved: true,
        },
      },
    },
  });
  // R14: a source/candidate output hash comparison is useful integrity evidence,
  // but cannot be the evaluation gate by itself.  The supervised pipeline must
  // register a bounded semantic criterion scorer instead of exact_match.
  expect(scorerRegistration).toMatchObject({
    id: "run96-semantic-criteria",
    algorithm: "required_terms",
    requiredInputs: ["outputRef", "evaluationCriteria"],
  });
  expect(semanticScoreSubmission).toMatchObject({
    scores: [
      expect.objectContaining({
        scorerDigest: "sha256:semantic-criteria",
        scorerDefinition: expect.objectContaining({ algorithm: "required_terms" }),
      }),
    ],
  });
  expect(calls).not.toContainEqual({
    id: "evaluation-runner-local",
    capability: "evaluation:run-local",
  });
  expect(calls).toContainEqual({
    id: "trajectory-signals",
    capability: "signals:analyze-finalized-evaluation",
  });
  expect(calls).toContainEqual({
    id: "profile-learner",
    capability: "profile:estimate-finalized-evaluation",
  });
  // The second rollout has a successful transport status but fails the required
  // semantic criterion.  Learning must receive the evaluator's 0, not a
  // transport-derived positive label.
  expect(profileInput?.rows).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ endpoint: "endpoint:source-96", outcome: 1 }),
      expect.objectContaining({ endpoint: "endpoint:counterfactual-96", outcome: 0 }),
    ]),
  );
  expect(signalInput).toMatchObject({
    finalizedEvaluation: { groupId: "comparison:96", status: "finalized", outcome: "candidate" },
    routeDecisionId: "decision:source-96",
    graphRef: "artifact:source-graph-96",
    replayRef: "sha256:replay-plan-96",
  });
  expect(knowledgeInput?.replay).toEqual({
    sourceDecisionId: "decision:source-96",
    sourceGraphRef: "artifact:source-graph-96",
    sharedPrefixRef: "artifact:source-graph-96#prefix",
    branches: [],
    digest: "sha256:replay-plan-96",
  });
  expect(knowledgeInput?.signals).toMatchObject({
    routeDecisionId: "decision:source-96",
    graphRef: "artifact:source-graph-96",
    signals: [
      {
        signalInstanceId: "comparison:96:evaluation_outcome",
        signalType: "evaluation_outcome",
        dimension: "quality",
        unit: "normalized_score",
        direction: "higher_is_better",
        value: 1,
        confidence: 1,
        weight: 1,
        missingness: "complete",
        evidenceRef: "comparison:96",
        routePackage: "candidate:source-96",
      },
    ],
  });
});

test("Run96 S4 RED: durable replay evaluation sends the same bounded semantic criteria to source and counterfactual trials", async () => {
  const executionInputs: Record<string, unknown>[] = [];
  const durableCases: Record<string, unknown>[] = [];
  const trialIds = ["trial:source-digest", "trial:counterfactual-digest"];
  await runTrackBShadowPipeline(
    {
      async invoke(id, envelope) {
        if (id === "replay-core") {
          return {
            sourceDecisionId: "decision:source-digest",
            sourceGraphRef: "artifact:source-digest",
            sharedPrefixRef: "artifact:source-digest#prefix",
            branches: [],
            digest: "sha256:replay-digest",
          };
        }
        if (id === "evaluation-core" && envelope.capability === "evaluation:register-scorer")
          return { key: "digest@1" };
        if (id === "evaluation-core" && envelope.capability === "evaluation:attest-references")
          return attestReferences(envelope as Record<string, unknown>);
        if (id === "evaluation-core" && envelope.capability === "evaluation:create-job") {
          durableCases.push(envelope.value as Record<string, unknown>);
          return { jobId: "job:digest" };
        }
        if (id === "evaluation-core" && envelope.capability === "evaluation:list-trials")
          return [{ trialId: trialIds.shift() }];
        if (id === "evaluation-core" && envelope.capability === "evaluation:claim-trial")
          return {
            trialId: (envelope.value as Record<string, unknown>).trialId,
            leaseId: "lease:digest",
          };
        if (
          id === "evaluation-runner-local" &&
          envelope.capability === "evaluation:execute-trial"
        ) {
          executionInputs.push(envelope.value as Record<string, unknown>);
          return {
            outputRef: "artifact:output-digest",
            outputDigest: "sha256:output-digest",
            stdoutRef: "artifact:stdout-digest",
            stderrRef: "artifact:stderr-digest",
            exitCode: 0,
            measurements: { elapsedMs: 1, outputBytes: 1 },
            scores: [
              {
                scorerId: "run96-semantic-criteria",
                scorerVersion: "1",
                scorerDigest: "sha256:scorer",
                dimension: "correctness",
                score: 0,
                confidence: 1,
                source: "deterministic_semantic_criteria",
              },
            ],
          };
        }
        if (
          id === "evaluation-core" &&
          ["evaluation:submit-trial-result", "evaluation:record-trial-score-batch"].includes(
            String(envelope.capability),
          )
        )
          return { accepted: true };
        if (
          id === "evaluation-core" &&
          envelope.capability === "evaluation:finalize-comparison-group"
        )
          return { groupId: "comparison:request-digest", status: "finalized", outcome: "tie" };
        if (id === "evaluation-core" && envelope.capability === "evaluation:read-comparison-group")
          return { groupId: "comparison:request-digest", status: "finalized", outcome: "tie" };
        if (id === "trajectory-signals")
          return {
            routeDecisionId: "decision:source-digest",
            graphRef: "artifact:source-digest",
            signals: [],
          };
        if (id === "profile-learner")
          return { profileId: "profile:digest", digest: "sha256:profile-digest", effects: {} };
        if (id === "knowledge-worker") return { id: "candidate:digest", state: "shadow" };
        throw new Error(`unexpected invocation ${id}:${String(envelope.capability)}`);
      },
    },
    {
      requestId: "request:digest",
      channel: "development",
      scope: "tenant:run96",
      authorizationEpoch: 96,
      productionState: {},
      routePackage: "candidate:source-digest",
      sourceDecisionId: "decision:source-digest",
      sourceGraphRef: "artifact:source-digest",
      prefix: [],
      counterfactuals: [{ id: "candidate:counterfactual-digest", suffix: [] }],
      comparableEvidence: {
        source: {
          rolloutId: "rollout:source-digest",
          routePackage: "candidate:source-digest",
          endpointId: "endpoint:source-digest",
          modelId: "model:source-digest",
          policyId: "routing-shadow",
          reasoningEffort: "high",
          evidenceRef: "artifact:source-digest",
          artifactRef: "artifact:source-output-digest",
          evaluationActual: "The source output satisfies the required semantic criterion.",
          outcome: {
            status: "success",
            outcomeRef: "artifact:source-outcome-digest",
            outcomeDigest: "sha256:source-outcome-digest",
          },
        },
        counterfactuals: [
          {
            rolloutId: "rollout:counterfactual-digest",
            routePackage: "candidate:counterfactual-digest",
            endpointId: "endpoint:counterfactual-digest",
            modelId: "model:counterfactual-digest",
            policyId: "routing-shadow",
            reasoningEffort: "max",
            evidenceRef: "artifact:counterfactual-digest",
            artifactRef: "artifact:counterfactual-output-digest",
            evaluationActual: "The counterfactual output is independently observed.",
            outcome: {
              status: "success",
              outcomeRef: "artifact:counterfactual-outcome-digest",
              outcomeDigest: "sha256:counterfactual-outcome-digest",
            },
          },
        ],
        candidateSet: [
          { routePackage: "candidate:source-digest", endpointId: "endpoint:source-digest" },
          {
            routePackage: "candidate:counterfactual-digest",
            endpointId: "endpoint:counterfactual-digest",
          },
        ],
      },
      evaluationCases: [
        {
          evaluationCriteria: {
            schemaVersion: "role-model.semantic-criteria.v1",
            requiredTerms: ["output"],
            forbiddenTerms: ["credential"],
            minOutputChars: 12,
          },
        },
      ],
      evaluationReferences: digestEvaluationReferences(),
      trajectoryEvents: [],
    },
  );

  expect(executionInputs).toHaveLength(2);
  expect(durableCases).toHaveLength(1);
  expect(durableCases[0].cases).toEqual([
    expect.objectContaining({
      evaluationCriteria: {
        schemaVersion: "role-model.semantic-criteria.v1",
        requiredTerms: ["output"],
        forbiddenTerms: ["credential"],
        minOutputChars: 12,
      },
      evaluationCriteriaDigest: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
    }),
    expect.objectContaining({
      evaluationCriteria: {
        schemaVersion: "role-model.semantic-criteria.v1",
        requiredTerms: ["output"],
        forbiddenTerms: ["credential"],
        minOutputChars: 12,
      },
      evaluationCriteriaDigest: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
    }),
  ]);
  expect(executionInputs).toEqual([
    expect.objectContaining({
      actual: "The source output satisfies the required semantic criterion.",
      evaluationCriteria: {
        schemaVersion: "role-model.semantic-criteria.v1",
        requiredTerms: ["output"],
        forbiddenTerms: ["credential"],
        minOutputChars: 12,
      },
    }),
    expect.objectContaining({
      actual: "The counterfactual output is independently observed.",
      evaluationCriteria: {
        schemaVersion: "role-model.semantic-criteria.v1",
        requiredTerms: ["output"],
        forbiddenTerms: ["credential"],
        minOutputChars: 12,
      },
    }),
  ]);
});
