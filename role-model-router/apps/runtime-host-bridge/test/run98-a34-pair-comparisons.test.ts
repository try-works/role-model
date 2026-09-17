import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import { createSupervisedReplayEvaluationCompleter } from "../src/cli.js";
import {
  type TrackBShadowPipelineInput,
  type TrackBShadowPipelineRuntime,
  createRun96RoutingShadowScorer,
  runTrackBShadowPipeline,
} from "../src/track-b-runtime.js";

/**
 * Run 98 addendum 34 S1 — coverage-driven multi-arm comparisons.
 *
 * Live stage (2026-09-17): 503 comparison groups, **every one of them two members**, `deepseek-flash-high`
 * an arm in 497, and 11 of 21 candidate pairs with no direct comparison at all. The cause is in the
 * supervised-replay evaluation completer: it evaluates `counterfactuals.slice(0, 1)` - the primary
 * counterfactual only - so the arms the capture already paid for are recorded as replay branches and
 * never compared. The pair matrix, not the capture, is the unit: one comparison per planned pair, with
 * the pairs the graph is missing chosen first, bounded per capture.
 */

const routingShadowScorer = createRun96RoutingShadowScorer();
const artifactId = (pattern: string): string =>
  pattern.repeat(Math.ceil(64 / pattern.length)).slice(0, 64);
const hash = (value: string): string => createHash("sha256").update(value).digest("hex");

const tempRoots: string[] = [];
afterEach(() => {
  for (const root of tempRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

/** A durable route-capture read shaped like the live one, with ids derived from the mark. */
function capture(mark: string, overrides: Record<string, unknown> = {}) {
  const slots = ["1", "2", "3", "4", "5", "6", "7"].map((slot) => artifactId(`${mark}${slot}`));
  const [
    rootArtifactId,
    routeDecisionArtifactId,
    responseArtifactId,
    providerArtifactId,
    messageArtifactId,
    sharedPrefixRef,
    policySnapshotRef,
  ] = slots;
  return {
    schemaVersion: "role-model.route-capture-read.v2",
    scope: "tenant:run98",
    rootArtifactId,
    routingDecisionId: `decision:${mark}`,
    endpointId: `endpoint:${mark}`,
    modelId: `model:${mark}`,
    taskTypeId: "coder.review",
    responseArtifactId,
    routeDecisionArtifactId,
    providerArtifactIds: [providerArtifactId],
    messageArtifactIds: [messageArtifactId],
    response: { content: `output:${mark}` },
    outputText: `output:${mark}`,
    replaySource: {
      schemaVersion: "role-model.route-capture-replay-source.v1",
      normalizedRequestRef: sharedPrefixRef,
      sharedPrefixRef,
      policySnapshotRef,
      capturePolicyRef: policySnapshotRef,
    },
    ...overrides,
  };
}

function createFakeRuntime(store: Map<string, string>) {
  let writeIndex = 0;
  let trialIndex = 0;
  const runtime: TrackBShadowPipelineRuntime = {
    async invoke(id, envelope) {
      const capability = String(envelope.capability ?? "");
      if (id === "artifact-store" && capability === "graph:write") {
        const payload = envelope.payload as Record<string, unknown>;
        const record = payload.record as Record<string, unknown>;
        // A unique content address per write: the comparison's reference tuple must stay distinct, so
        // a cycling fixture would refuse the second pair instead of measuring it.
        const artifact = artifactId(hash(`write:${writeIndex++}`).slice(0, 16));
        store.set(artifact, String(record.content));
        return { id: artifact };
      }
      if (id === "artifact-store" && capability === "artifact:read") {
        const payload = envelope.payload as Record<string, unknown>;
        return (store.get(String(payload.id)) ?? null) as unknown as Record<string, unknown>;
      }
      if (id === "replay-core" && capability === "replay:plan-graph") {
        const value = envelope.value as Record<string, unknown>;
        const counterfactuals = Array.isArray(value.counterfactuals)
          ? (value.counterfactuals as Record<string, unknown>[])
          : [];
        return {
          sourceDecisionId: String(value.sourceDecisionId ?? ""),
          sourceGraphRef: String(value.sourceGraphRef ?? ""),
          sharedPrefixRef: String(value.sourcePrefixRef ?? ""),
          branches: counterfactuals.map((entry) => ({ id: String(entry.id ?? "") })),
          digest: `sha256:${hash(`plan:${String(envelope.requestId)}`)}`,
        };
      }
      if (id === "evaluation-core" && capability === "evaluation:attest-references") {
        const value = envelope.value as Record<string, unknown>;
        const context = value.context as Record<string, unknown>;
        const references = value.references as Record<string, string>;
        const issuedAtMs = Date.now() - 1;
        const expiresAtMs = issuedAtMs + 60_000;
        const authority = "evaluation-reference-store";
        return {
          schemaVersion: "role-model.evaluation-reference-attestation.v1",
          authority,
          purpose: "evaluation",
          channel: context.channel,
          scope: context.scope,
          authorizationEpoch: context.authorizationEpoch,
          issuedAtMs,
          expiresAtMs,
          references: Object.fromEntries(
            Object.entries(references).map(([field, reference]) => [
              field,
              {
                reference,
                resolved: true,
                referenceDigest: `sha256:${hash(reference)}`,
                purpose: "evaluation",
                authority,
                channel: context.channel,
                scope: context.scope,
                authorizationEpoch: context.authorizationEpoch,
                issuedAtMs,
                expiresAtMs,
              },
            ]),
          ),
        };
      }
      if (id === "evaluation-core" && capability === "evaluation:list-trials") {
        return { value: [{ trialId: `trial:run98:a34:${trialIndex++}` }] };
      }
      if (id === "evaluation-core" && capability === "evaluation:claim-trial") {
        const value = envelope.value as Record<string, unknown>;
        return { trialId: value.trialId, leaseId: "lease:run98:a34" };
      }
      if (id === "evaluation-core" && capability === "evaluation:list-trial-scores") {
        return { value: [] };
      }
      if (id === "evaluation-core" && capability === "evaluation:finalize-comparison-group") {
        const value = envelope.value as Record<string, unknown>;
        return { groupId: value.groupId, status: "finalized", outcome: "candidate" };
      }
      if (id === "evaluation-core" && capability === "evaluation:read-comparison-group") {
        const value = envelope.value as Record<string, unknown>;
        return { groupId: value.groupId, status: "finalized", outcome: "candidate" };
      }
      if (id === "evaluation-core" && capability === "evaluation:register-scorer") return {};
      if (id === "evaluation-core" && capability === "evaluation:create-job") return {};
      if (id === "evaluation-core" && capability === "evaluation:submit-trial-result") {
        return { accepted: true };
      }
      if (id === "evaluation-core" && capability === "evaluation:record-trial-score-batch") {
        return { accepted: true };
      }
      if (id === "evaluation-runner-local" && capability === "evaluation:execute-trial") {
        const value = envelope.value as Record<string, unknown>;
        const trialId = String(value.trialId);
        return {
          outputRef: `artifact:${artifactId(hash(`out:${trialId}`).slice(0, 16))}`,
          outputDigest: `sha256:${hash(`output:${trialId}`)}`,
          stdoutRef: `artifact:${artifactId(hash(`std:${trialId}`).slice(0, 16))}`,
          stderrRef: `artifact:${artifactId(hash(`err:${trialId}`).slice(0, 16))}`,
          exitCode: 0,
          measurements: { elapsedMs: 1, outputBytes: 1 },
          scores: [
            {
              scorerId: routingShadowScorer.id,
              scorerVersion: routingShadowScorer.version,
              scorerDigest: routingShadowScorer.digest,
              dimension: "correctness",
              score: 1,
              confidence: 1,
              scoreId: `score:${trialId}`,
            },
          ],
        };
      }
      if (id === "trajectory-signals" && capability === "signals:analyze-finalized-evaluation") {
        return {
          schemaVersion: "role-model.degradation-receipt.v1",
          degraded: true,
          capability,
          mode: "omit_signals",
        };
      }
      throw new Error(`unexpected pipeline invocation ${id}:${capability}`);
    },
  };
  return runtime;
}

interface Arm {
  readonly endpointId: string;
  readonly modelId: string;
  readonly reasoningEffort: string;
  readonly capture: ReturnType<typeof capture>;
  readonly replayRequestId: string;
}

function buildScenario(armMarks: readonly string[], ledgerPath?: string) {
  const sourceCapture = capture("1");
  const arms: Arm[] = armMarks.map((mark) => ({
    endpointId: `endpoint:${mark}`,
    modelId: `model:${mark}`,
    reasoningEffort: "high",
    capture: capture(mark),
    replayRequestId: `replay:run98:${mark}`,
  }));
  const byReplayRequestId = new Map(arms.map((arm) => [`${arm.replayRequestId}-branch`, arm]));
  const store = new Map<string, string>();
  const pipelineInputs: TrackBShadowPipelineInput[] = [];
  const pipelineCalls: string[] = [];
  const completer = createSupervisedReplayEvaluationCompleter({
    runtime: createFakeRuntime(store),
    operations: {
      async readLocalRouteCapture(input) {
        const requestId = String(input?.requestId ?? "");
        const arm = byReplayRequestId.get(requestId);
        if (!arm) return null;
        return arm.capture as unknown as Record<string, unknown>;
      },
    },
    requestId: "request:run98:a34",
    channel: "development",
    scope: "tenant:run98",
    sourceCapture: sourceCapture as unknown as Record<string, unknown>,
    sourceOutput: "output:1",
    sourceEndpointId: sourceCapture.endpointId,
    sourceModelId: sourceCapture.modelId,
    counterfactualPackages: arms.map((arm) => ({
      endpointId: arm.endpointId,
      modelId: arm.modelId,
      reasoningEffort: arm.reasoningEffort,
    })),
    getDispatched: (endpointId) => {
      const arm = arms.find((candidate) => candidate.endpointId === endpointId);
      if (!arm) return undefined;
      return {
        replayRequestId: arm.replayRequestId,
        execution: {
          routingDecisionId: arm.capture.routingDecisionId,
          outputText: arm.capture.outputText,
        },
      };
    },
    evaluationCriteria: {
      schemaVersion: "role-model.semantic-criteria.v1",
      requiredTerms: ["output"],
    },
    evaluationCriteriaDigest: `sha256:${hash("criteria")}`,
    ...(ledgerPath ? { pairCoverageLedgerPath: ledgerPath } : {}),
    runPipeline: async (pipelineRuntime, pipelineInput) => {
      pipelineInputs.push(pipelineInput);
      pipelineCalls.push(String(pipelineInput.requestId));
      return runTrackBShadowPipeline(pipelineRuntime, pipelineInput);
    },
  });
  const invoke = () =>
    completer({
      evaluationJobId: "evaluation:run98:a34",
      replayJobId: "replay:run98:job",
      resultBranches: arms.map((arm) => ({
        candidateEndpointId: arm.endpointId,
        branchRootRef: arm.capture.rootArtifactId,
      })),
    });
  return { sourceCapture, arms, pipelineInputs, pipelineCalls, invoke };
}

/** The unordered candidate pairs a pipeline call actually compared. */
function comparedPairs(inputs: readonly TrackBShadowPipelineInput[]): string[] {
  return inputs.map((input) => {
    const evidence = input.comparableEvidence as Record<string, unknown> | undefined;
    const source = evidence?.source as Record<string, unknown> | undefined;
    const counterfactuals = Array.isArray(evidence?.counterfactuals)
      ? (evidence?.counterfactuals as Record<string, unknown>[])
      : [];
    return [String(source?.endpointId ?? ""), ...counterfactuals.map((entry) => String(entry.endpointId ?? ""))]
      .sort()
      .join("|");
  });
}

describe("run 98 addendum 34 S1 pair comparisons", () => {
  test("three replay arms produce one comparison per planned pair, not one per capture", async () => {
    const scenario = buildScenario(["a", "b", "c"]);
    const result = await scenario.invoke();

    // The primary comparison is unchanged and still reported to the caller.
    expect(result).toMatchObject({
      evaluationJobId: "evaluation:run98:a34",
      outcome: "candidate",
    });
    expect(String(scenario.pipelineInputs[0]?.requestId)).toMatch(
      /^supervised-replay:[a-f0-9]{64}$/,
    );
    expect(comparedPairs(scenario.pipelineInputs)[0]).toBe("endpoint:1|endpoint:a");

    // One call per comparison: the primary pair plus the pairs the graph is missing.
    expect(scenario.pipelineInputs.length).toBeGreaterThan(1);
    const pairs = comparedPairs(scenario.pipelineInputs);
    expect(new Set(pairs).size).toBe(pairs.length);
    for (const pair of pairs) {
      expect(pair.split("|")).toHaveLength(2);
    }
    // Every extra call is scoped so its durable job and group identity cannot collide with the primary.
    expect(new Set(scenario.pipelineCalls).size).toBe(scenario.pipelineCalls.length);
  });

  test("the extra comparisons are bounded per capture and disabled by the operator bound", async () => {
    const previous = process.env.ROLE_MODEL_MAX_EXTRA_PAIR_COMPARISONS;
    try {
      process.env.ROLE_MODEL_MAX_EXTRA_PAIR_COMPARISONS = "0";
      const disabled = buildScenario(["a", "b", "c"]);
      await disabled.invoke();
      expect(disabled.pipelineInputs).toHaveLength(1);

      process.env.ROLE_MODEL_MAX_EXTRA_PAIR_COMPARISONS = "1";
      const bounded = buildScenario(["a", "b", "c"]);
      await bounded.invoke();
      expect(bounded.pipelineInputs).toHaveLength(2);
    } finally {
      if (previous === undefined) delete process.env.ROLE_MODEL_MAX_EXTRA_PAIR_COMPARISONS;
      else process.env.ROLE_MODEL_MAX_EXTRA_PAIR_COMPARISONS = previous;
    }
  });

  test("successive captures close the missing pairs instead of re-comparing a covered pair", async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "run98-a34-pairs-"));
    tempRoots.push(root);
    const ledgerPath = path.join(root, "pair-coverage-ledger.json");

    const first = buildScenario(["a", "b", "c"], ledgerPath);
    await first.invoke();
    const firstPairs = comparedPairs(first.pipelineInputs);
    // The uncovered arm-vs-arm pairs are the graph's gaps, so they are planned before a second source pair.
    expect(firstPairs).toContain("endpoint:a|endpoint:b");

    const ledger = JSON.parse(readFileSync(ledgerPath, "utf8")) as {
      pairCounts?: Record<string, number>;
    };
    expect(Object.keys(ledger.pairCounts ?? {}).length).toBeGreaterThan(0);

    const second = buildScenario(["a", "b", "c"], ledgerPath);
    await second.invoke();
    const secondExtras = comparedPairs(second.pipelineInputs).slice(1);
    // A pair that already carries evidence is never selected while an uncovered pair is still
    // available: the two source pairs the first capture could not afford come first, and the
    // already-covered arm pairs can only fill what remains of the bounded budget.
    const uncovered = ["endpoint:1|endpoint:b", "endpoint:1|endpoint:c"];
    expect(uncovered).toContain(secondExtras[0]);
    expect(
      secondExtras
        .slice(0, uncovered.length)
        .every((pair) => uncovered.includes(pair)),
    ).toBe(true);
    for (const coveredPair of ["endpoint:a|endpoint:b", "endpoint:a|endpoint:c"]) {
      const index = secondExtras.indexOf(coveredPair);
      if (index >= 0) expect(index).toBeGreaterThanOrEqual(uncovered.length);
    }
  });
});
