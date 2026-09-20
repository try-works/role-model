import { expect, test } from "vitest";

import {
  createReplaySourceAttestation,
  createRouterReplayAdapter,
  runSupervisedReplay,
} from "../src/track-b-runtime.js";

/**
 * Run 98 addendum 48 (live v281/v282; reported by the operator's runtime events):
 * `replay endpoint HTTP 409: {"error":"Replay Core did not prepare a bounded router dispatch"}` followed by
 * `durable replay state is deferred (deferral budget exhausted after 4 attempts)`.
 *
 * Replay Core answers `replay:prepare-dispatch` with status `append_recovery` when a previous attempt already
 * persisted the provider receipt but not the branch append (exactly what a runtime restart mid-replay leaves
 * behind). The host handled `append_recovery` on the *receipt* leg but not on the *prepare* leg, so every retry
 * threw the failure above and the capture was eventually refused — no branch, no evaluation, no comparison.
 *
 * Acceptance: with a prepared job in `append_recovery`, the host appends the branch, records it and continues
 * to the evaluation handoff instead of failing the replay.
 */
test("run98 a48 a replay stranded in append_recovery is driven to completion", async () => {
  const invocations: string[] = [];
  let appendedBranch: Record<string, unknown> | null = null;
  let handoffCalled = false;
  let handoffRequest: Readonly<Record<string, unknown>> | null = null;

  const sourceAttestation = createReplaySourceAttestation({
    channel: "stage",
    scope: "tenant:append-recovery",
    authorizationEpoch: 1,
    capture: {
      schemaVersion: "role-model.route-capture-read.v2",
      scope: "tenant:append-recovery",
      rootArtifactId: "artifact:source",
      routingDecisionId: "decision:source",
      endpointId: "endpoint:source",
      trace: {
        generation: 1,
        readiness: "ready",
        rootOccurrenceId: "occurrence:source",
        headOccurrenceId: "occurrence:source",
        leafOccurrenceIds: ["occurrence:source"],
        lastSequence: 0,
        traversalDigest: `sha256:${"1".repeat(64)}`,
      },
      replaySource: {
        schemaVersion: "role-model.route-capture-replay-source.v1",
        normalizedRequestRef: "artifact:request",
        sharedPrefixRef: "artifact:prefix",
        forkOccurrenceId: "occurrence:source",
        policySnapshotRef: "artifact:policy",
        capturePolicyRef: "artifact:capture-policy",
      },
    },
    eligibleEndpointIds: ["endpoint:source", "endpoint:counterfactual"],
  });

  const result = await runSupervisedReplay({
    runtime: {
      async invoke(_id: string, envelope: Record<string, unknown>) {
        const capability = String(envelope.capability);
        invocations.push(capability);
        if (capability === "replay:create-job") {
          return {
            schemaVersion: "role-model.replay-job.v1",
            jobId: "job-append-recovery",
            state: "running",
            scope: "tenant:append-recovery",
            candidateEndpointIds: ["endpoint:counterfactual"],
            budget: { deadlineMs: 10_000 },
            branches: [],
            dispatches: {},
          };
        }
        if (capability === "replay:claim-job") {
          return { fenceToken: 7, leaseOwner: "scheduler:append-recovery" };
        }
        if (capability === "replay:prepare-dispatch") {
          // The stranded state: the receipt is durable, the branch append is not.
          return {
            status: "append_recovery",
            receipt: { providerResultRef: "route-capture:replay-request:recovery" },
            branchRequest: { requestId: "replay-request:recovery" },
          };
        }
        if (capability === "replay:record-branch-append") {
          return { status: "complete" };
        }
        if (capability === "replay:record-evaluation-receipt") {
          return { status: "complete", state: "awaiting_evaluation" };
        }
        return { status: "complete" };
      },
    },
    adapter: createRouterReplayAdapter({
      channel: "stage",
      scope: "tenant:append-recovery",
      authorizationEpoch: 1,
      dispatch: async () => {
        throw new Error("a recovery must never re-dispatch the provider");
      },
    }),
    requestId: "request:append-recovery",
    channel: "stage",
    scope: "tenant:append-recovery",
    authorizationEpoch: 1,
    sourceAttestation,
    idempotencyKey: "replay:append-recovery",
    intent: "counterfactual_route",
    evaluationCriteriaDigest: `sha256:${"a".repeat(64)}`,
    candidatePackages: [
      {
        endpointId: "endpoint:counterfactual",
        modelId: "model:counterfactual",
        reasoningEffort: null,
        promptAdapterId: "prompt:stable-v1",
        toolPolicy: "deny",
        experiencePackId: "experience:none",
        samplingProfileId: "deterministic-v1",
      },
    ],
    budget: {
      maxCandidates: 1,
      maxProviderCalls: 1,
      maxCostMicros: 5_000,
      maxBytes: 16_384,
      deadlineMs: 10_000,
    },
    leaseOwner: "scheduler:append-recovery",
    leaseMs: 10_000,
    prepareBranch: async () => ({ branchRootRef: "artifact:prepared" }),
    appendBranch: async (request: Readonly<Record<string, unknown>>) => {
      appendedBranch = { ...request };
      return { branchRootRef: "artifact:branch:recovered" };
    },
    handoffEvaluation: async (request: Readonly<Record<string, unknown>>) => {
      handoffCalled = true;
      handoffRequest = request;
      return { evaluationJobId: "evaluation:append-recovery" };
    },
  });

  expect(appendedBranch).not.toBeNull();
  expect(invocations).toContain("replay:record-branch-append");
  expect(handoffCalled).toBe(true);
  // The recovered branch is what the evaluation handoff receives, so the comparison can be built from it.
  expect(
    (handoffRequest as unknown as { resultBranches?: readonly unknown[] } | null)?.resultBranches,
  ).toContainEqual({
    candidateEndpointId: "endpoint:counterfactual",
    branchRootRef: "artifact:branch:recovered",
  });
  // The recovered replay reaches the evaluation handoff rather than failing the dispatch.
  expect(result).toMatchObject({ state: "awaiting_evaluation" });
});
