import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { expect, test } from "vitest";

import {
  autoReplayExecutionFromCommandReceipt,
  startAutoReplayLoop,
} from "../src/track-b-auto-replay-runtime.js";
import { createReplayLedger } from "../src/track-b-replay-ledger.js";
import { buildReplayPolicySet } from "../src/track-b-replay-policy.js";
import {
  createReplaySourceAttestation,
  createRouterReplayAdapter,
  runSupervisedReplay,
} from "../src/track-b-runtime.js";

/**
 * Run 98 R2 (live stall): replay windows are bounded on purpose — Run96 RC16 requires a
 * persisted replay deadline to keep blocking a stale provider dispatch. What was missing is
 * the other half: a capture whose durable replay job is already terminal (`timed_out`,
 * `expired`, `failed`, `cancelled`) can never be dispatched again, so it must be *retired*
 * with a terminal refusal instead of being re-deferred every tick.
 *
 * Live stage evidence before the fix: 96 `replay_failed` deferrals with the newest rows
 * stuck on `durable replay state is deferred`, 69 `timed_out` replay jobs, and no completed
 * evaluation for six hours because the pending queue never drained.
 */

test("run98 R2 a terminal durable replay job is reported as terminal", () => {
  for (const state of ["timed_out", "expired", "failed", "cancelled"]) {
    const execution = autoReplayExecutionFromCommandReceipt({ jobId: "job-1", state });
    expect(execution.terminal, `${state} must be terminal`).toBe(true);
    expect(execution.failureDetail).toBe(`durable replay job ${state}`);
  }
  for (const state of ["queued", "deferred", "awaiting_evaluation"]) {
    expect(autoReplayExecutionFromCommandReceipt({ jobId: "job-1", state }).terminal).toBe(false);
  }
});

test("run98 R2 an undispatchable replay window is retired instead of re-deferred", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "run98-replay-window-"));
  try {
    const ledger = createReplayLedger({
      filePath: path.join(dir, "ledger.json"),
      now: () => Date.parse("2026-09-14T08:00:00Z"),
    });
    const recorded: Array<Record<string, unknown>> = [];
    const loop = startAutoReplayLoop({
      operations: {
        async listPendingReplayCaptures() {
          return {
            pending: [
              {
                captureRef: "req-stale",
                sourceEndpointId: "endpoint-a",
                hasRecordedToolResults: true,
              },
            ],
            pendingCount: 1,
          };
        },
        async recordReplayDisposition(input: Record<string, unknown>) {
          recorded.push(input);
          return { recorded: true };
        },
      },
      ledger,
      policySet: buildReplayPolicySet(),
      configuredEndpointIds: ["endpoint-a", "endpoint-b"],
      executor: async () => ({
        terminal: true,
        branches: [],
        dispatches: [],
        failureDetail: "durable replay job timed_out",
      }),
      intervalMs: 60_000,
      now: () => Date.parse("2026-09-14T08:00:00Z"),
    });
    const result = await loop.tick();
    loop.stop();
    expect(result.refused).toBe(1);
    expect(result.deferred).toBe(0);
    expect(recorded[0]).toMatchObject({
      captureRef: "req-stale",
      outcome: "refused",
      refusalCode: "replay_window_elapsed",
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("run98 R2 a supervised replay never claims or dispatches a terminal durable job", async () => {
  const invocations: string[] = [];
  const sourceAttestation = createReplaySourceAttestation({
    channel: "development",
    scope: "tenant:retirement",
    authorizationEpoch: 98,
    capture: {
      schemaVersion: "role-model.route-capture-read.v2",
      scope: "tenant:retirement",
      rootArtifactId: "artifact:source-retirement",
      routingDecisionId: "decision:source-retirement",
      endpointId: "endpoint:observed-source",
      trace: {
        generation: 1,
        readiness: "ready",
        rootOccurrenceId: "occurrence:source-retirement",
        headOccurrenceId: "occurrence:source-retirement",
        leafOccurrenceIds: ["occurrence:source-retirement"],
        lastSequence: 0,
        traversalDigest: `sha256:${"0".repeat(64)}`,
      },
      replaySource: {
        schemaVersion: "role-model.route-capture-replay-source.v1",
        normalizedRequestRef: "artifact:request-retirement",
        sharedPrefixRef: "artifact:prefix-retirement",
        forkOccurrenceId: "occurrence:source-retirement",
        policySnapshotRef: "artifact:policy-retirement",
        capturePolicyRef: "artifact:capture-policy-retirement",
      },
    },
    eligibleEndpointIds: ["endpoint:observed-source", "endpoint:counterfactual"],
  });
  const result = await runSupervisedReplay({
    runtime: {
      async invoke(_id, envelope: Record<string, unknown>) {
        invocations.push(String(envelope.capability));
        return {
          schemaVersion: "role-model.replay-job.v1",
          jobId: "job-terminal",
          state: "timed_out",
          scope: "tenant:retirement",
          candidateEndpointIds: ["endpoint:counterfactual"],
          budget: { deadlineMs: 10_000 },
          branches: [],
          dispatches: {},
        };
      },
    },
    adapter: createRouterReplayAdapter({
      channel: "development",
      scope: "tenant:retirement",
      authorizationEpoch: 98,
      dispatch: async () => {
        throw new Error("a terminal replay window must never dispatch");
      },
    }),
    requestId: "request:retirement",
    channel: "development",
    scope: "tenant:retirement",
    authorizationEpoch: 98,
    sourceAttestation,
    idempotencyKey: "replay:retirement",
    intent: "counterfactual_route",
    evaluationCriteriaDigest:
      "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
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
    leaseOwner: "scheduler:retirement",
    leaseMs: 10_000,
    prepareBranch: async () => ({ branchRootRef: "artifact:prepared-retirement" }),
    appendBranch: async () => ({ branchRootRef: "artifact:branch-retirement" }),
    handoffEvaluation: async () => ({ evaluationJobId: "evaluation:retirement" }),
  });
  expect(result).toMatchObject({ jobId: "job-terminal", state: "timed_out" });
  expect(invocations).toEqual(["replay:create-job"]);
});

function terminalJobWithEvaluation() {
  return {
    schemaVersion: "role-model.replay-job.v1",
    jobId: "job-recoverable",
    state: "timed_out",
    scope: "tenant:retirement",
    candidateEndpointIds: ["endpoint:counterfactual"],
    budget: { deadlineMs: 10_000 },
    branches: [
      { candidateEndpointId: "endpoint:counterfactual", branchRootRef: "artifact:branch:recovery" },
    ],
    dispatches: {
      "endpoint:counterfactual": {
        status: "complete",
        result: { providerResultRef: "route-capture:replay-request:recovery" },
      },
    },
    evaluationJobId: "evaluation:recovery",
    resultTraceIds: ["artifact:branch:recovery"],
  };
}

function replaySourceAttestation() {
  return createReplaySourceAttestation({
    channel: "development",
    scope: "tenant:retirement",
    authorizationEpoch: 98,
    capture: {
      schemaVersion: "role-model.route-capture-read.v2",
      scope: "tenant:retirement",
      rootArtifactId: "artifact:source-recovery",
      routingDecisionId: "decision:source-recovery",
      endpointId: "endpoint:observed-source",
      trace: {
        generation: 1,
        readiness: "ready",
        rootOccurrenceId: "occurrence:source-recovery",
        headOccurrenceId: "occurrence:source-recovery",
        leafOccurrenceIds: ["occurrence:source-recovery"],
        lastSequence: 0,
        traversalDigest: `sha256:${"0".repeat(64)}`,
      },
      replaySource: {
        schemaVersion: "role-model.route-capture-replay-source.v1",
        normalizedRequestRef: "artifact:request-recovery",
        sharedPrefixRef: "artifact:prefix-recovery",
        forkOccurrenceId: "occurrence:source-recovery",
        policySnapshotRef: "artifact:policy-recovery",
        capturePolicyRef: "artifact:capture-policy-recovery",
      },
    },
    eligibleEndpointIds: ["endpoint:observed-source", "endpoint:counterfactual"],
  });
}

function supervisedReplayInput(
  runtime: { invoke: (id: string, envelope: never) => Promise<unknown> },
  overrides: Record<string, unknown> = {},
) {
  return {
    runtime,
    adapter: createRouterReplayAdapter({
      channel: "development",
      scope: "tenant:retirement",
      authorizationEpoch: 98,
      dispatch: async () => {
        throw new Error("a terminal replay window must never dispatch");
      },
    }),
    requestId: "request:recovery",
    channel: "development",
    scope: "tenant:retirement",
    authorizationEpoch: 98,
    sourceAttestation: replaySourceAttestation(),
    idempotencyKey: "replay:recovery",
    intent: "counterfactual_route",
    evaluationCriteriaDigest:
      "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
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
    leaseOwner: "scheduler:recovery",
    leaseMs: 10_000,
    prepareBranch: async () => ({ branchRootRef: "artifact:prepared-recovery" }),
    appendBranch: async () => ({ branchRootRef: "artifact:branch:recovery" }),
    handoffEvaluation: async () => ({ evaluationJobId: "evaluation:recovery" }),
    ...overrides,
  } as Parameters<typeof runSupervisedReplay>[0];
}

test("run98 R2 a timed-out replay whose evaluation is already scored is finalized before retirement", async () => {
  const invocations: string[] = [];
  const result = await runSupervisedReplay(
    supervisedReplayInput(
      {
        async invoke(_id: string, envelope: Record<string, unknown>) {
          const capability = String(envelope.capability);
          invocations.push(capability);
          if (capability === "replay:create-job") return terminalJobWithEvaluation();
          if (capability === "replay:claim-job") {
            return {
              jobId: "job-recoverable",
              leaseOwner: "scheduler:recovery",
              attempt: 2,
              fenceToken: 7,
            };
          }
          if (capability === "replay:record-evaluation-result") {
            return {
              ...terminalJobWithEvaluation(),
              state: "complete",
              evaluationResult: {
                evaluationJobId: "evaluation:recovery",
                comparisonGroupId: "comparison:recovery",
                outcome: "candidate",
              },
            };
          }
          throw new Error(`unexpected capability ${capability}`);
        },
      } as never,
      {
        completeEvaluation: async () => ({
          evaluationJobId: "evaluation:recovery",
          comparisonGroupId: "comparison:recovery",
          comparisonDigest: `sha256:${"c".repeat(64)}`,
          outcome: "candidate",
        }),
      },
    ),
  );
  expect(result).toMatchObject({ jobId: "job-recoverable", state: "complete" });
  expect(invocations).toEqual([
    "replay:create-job",
    "replay:claim-job",
    "replay:record-evaluation-result",
  ]);
});

test("run98 R2 an unrecoverable terminal replay still retires", async () => {
  const invocations: string[] = [];
  const result = await runSupervisedReplay(
    supervisedReplayInput(
      {
        async invoke(_id: string, envelope: Record<string, unknown>) {
          const capability = String(envelope.capability);
          invocations.push(capability);
          if (capability === "replay:create-job") return terminalJobWithEvaluation();
          if (capability === "replay:claim-job") {
            return {
              jobId: "job-recoverable",
              leaseOwner: "scheduler:recovery",
              attempt: 2,
              fenceToken: 7,
            };
          }
          throw new Error(`unexpected capability ${capability}`);
        },
      } as never,
      {
        completeEvaluation: async () => {
          throw new Error("evaluation evidence cannot be recovered");
        },
      },
    ),
  );
  expect(result).toMatchObject({ jobId: "job-recoverable", state: "timed_out" });
  expect(invocations).toEqual(["replay:create-job", "replay:claim-job"]);
});

function loopHarness(executor: () => Promise<unknown>) {
  const dir = mkdtempSync(path.join(os.tmpdir(), "run98-replay-accounting-"));
  const recorded: Array<Record<string, unknown>> = [];
  const ledger = createReplayLedger({
    filePath: path.join(dir, "ledger.json"),
    now: () => Date.parse("2026-09-14T09:00:00Z"),
  });
  return {
    recorded,
    ledger,
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
    loop: startAutoReplayLoop({
      operations: {
        async listPendingReplayCaptures() {
          return {
            pending: [
              {
                captureRef: "req-evaluating",
                sourceEndpointId: "endpoint-a",
                hasRecordedToolResults: true,
              },
            ],
            pendingCount: 1,
          };
        },
        async recordReplayDisposition(input: Record<string, unknown>) {
          recorded.push(input);
          return { recorded: true };
        },
      },
      ledger,
      policySet: buildReplayPolicySet(),
      configuredEndpointIds: ["endpoint-a", "endpoint-b"],
      executor,
      intervalMs: 60_000,
      now: () => Date.parse("2026-09-14T09:00:00Z"),
    }),
  };
}

const completedBranch = {
  kind: "candidate" as const,
  endpointId: "endpoint-b",
  attempt: 1,
  costMicros: 512,
  bytes: 2_048,
  outcome: "complete" as const,
};

test("run98 R2 a dispatched branch is not a completed counterfactual until evaluation finalizes", async () => {
  const harness = loopHarness(async () => ({
    terminal: false,
    branches: [{ endpointId: "endpoint-b", outcome: "complete" as const }],
    dispatches: [completedBranch],
    failureDetail: "durable replay state is awaiting_evaluation",
  }));
  try {
    const result = await harness.loop.tick();
    harness.loop.stop();
    expect(result.replayed).toBe(0);
    expect(result.deferred).toBe(1);
    expect(harness.recorded[0]).toMatchObject({
      captureRef: "req-evaluating",
      outcome: "deferred",
      refusalCode: "replay_failed",
    });
  } finally {
    harness.cleanup();
  }
});

test("run98 R2 a durably evaluated replay is the only terminal counterfactual", async () => {
  const harness = loopHarness(async () => ({
    terminal: true,
    branches: [{ endpointId: "endpoint-b", outcome: "complete" as const }],
    dispatches: [completedBranch],
  }));
  try {
    const result = await harness.loop.tick();
    harness.loop.stop();
    expect(result.replayed).toBe(1);
    expect(result.deferred).toBe(0);
    expect(harness.recorded[0]).toMatchObject({
      captureRef: "req-evaluating",
      outcome: "replayed",
    });
  } finally {
    harness.cleanup();
  }
});
