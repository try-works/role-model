import { readFileSync } from "node:fs";

import { expect, test } from "vitest";

import { createSupervisedReplayEvaluationCompleter } from "../src/cli.js";

/**
 * Run 101 addendum 46 - the derivation is offered by whoever finalized the comparison.
 *
 * Measured live on `:3457` (2026-09-28, capture `req-1e9d20ff…`): one capture's evaluation was driven **twice,
 * concurrently, in the same host process** - inline in `/api/role-model/track-b/replay` right after the handoff
 * offered the `evaluation.score` row, and by that plane's worker through the scoped resume. The two drivers read
 * different `actual` strings for the same arm (the inline path prefers the live dispatch text, the resume path
 * the capture's bounded `responseText` excerpt), so `json_parses` flipped 1<->0 on the identical identity
 * `(trial, run96-semantic-criteria, 3+f0f873dd66c6, correctness)` and Evaluation Core refused the second batch
 * as `evaluation trial score batch conflict` - addendum 42's repair makes the second writer *reuse* the durable
 * row, and this addendum removes the second writer when the plane is authoritative.
 *
 * The learner's input is the finalized comparison, and until now that offer lived only in the inline wrapper.
 * Moving it into the shared completer is what keeps the pipeline alive when the inline path defers, so the
 * assertion is that whichever driver completes a comparison offers exactly that comparison's group.
 */

const artifactId = (pattern: string): string =>
  pattern.repeat(Math.ceil(64 / pattern.length)).slice(0, 64);

const durableCapture = (seed: string) => {
  // Distinct per capture: the builder refuses a capture whose evidence, response and provider references
  // collapse onto one artifact, which is the rule the live store enforces too.
  const ids =
    seed === "1"
      ? ["a1", "a2", "a3", "a4", "a5", "a6", "a7"]
      : ["b1", "b2", "b3", "b4", "b5", "b6", "b7"];
  const [
    rootArtifactId,
    routeDecisionArtifactId,
    responseArtifactId,
    providerArtifactId,
    messageArtifactId,
    sharedPrefixRef,
    policySnapshotRef,
  ] = ids.map(artifactId);
  return {
    schemaVersion: "role-model.route-capture-read.v2",
    scope: "tenant:a46",
    rootArtifactId,
    routingDecisionId: `decision:${seed}`,
    endpointId: `endpoint:${seed}`,
    modelId: `model:${seed}`,
    taskTypeId: "coder.review",
    classification: {
      taskTypeId: "coder.review",
      roleId: "coder",
      taxonomyVersion: "1.0.0-alpha.1",
    },
    responseArtifactId,
    routeDecisionArtifactId,
    providerArtifactIds: [providerArtifactId],
    messageArtifactIds: [messageArtifactId],
    replaySource: {
      schemaVersion: "role-model.route-capture-replay-source.v1",
      normalizedRequestRef: sharedPrefixRef,
      sharedPrefixRef,
      policySnapshotRef,
      capturePolicyRef: policySnapshotRef,
    },
    trace: {
      generation: 1,
      readiness: "ready",
      traceId: `trace:${seed}`,
      rootOccurrenceId: `trace:${seed}:root`,
      headOccurrenceId: `trace:${seed}:response`,
      leafOccurrenceIds: [`trace:${seed}:response`],
      lastSequence: 4,
    },
  };
};

/**
 * Builds the shared completer with a stub pipeline that answers whatever the caller hands it, so the assertion
 * is about the *wiring* rather than about a real comparison.
 */
function makeCompleter(options: {
  readonly offered: string[];
  readonly pipelineResult: Record<string, unknown>;
}) {
  const sourceCapture = { ...durableCapture("1"), response: { content: "source output" } };
  const counterfactualCapture = {
    ...durableCapture("8"),
    routingDecisionId: "decision:counterfactual-a46",
    endpointId: "endpoint:counterfactual-a46",
    modelId: "model:counterfactual-a46",
    outputText: "counterfactual output",
  };
  const candidate = {
    endpointId: "endpoint:counterfactual-a46",
    modelId: "model:counterfactual-a46",
    reasoningEffort: "max",
  } as const;
  /**
   * The completer writes each evaluation reference fact and reads it back to prove the durable round trip, so
   * the stub has to be a real (if trivial) artifact store: content in, the same content out.
   */
  const makeRuntime = () => {
    const stored = new Map<string, string>();
    let next = 0;
    const ids = ["ab", "cd", "ef", "f0", "0f", "a0", "b0", "c0", "d0", "e0"];
    return {
      async invoke(id: string, envelope: Record<string, unknown>) {
        expect(id).toBe("artifact-store");
        const capability = envelope.capability;
        const payload = envelope.payload as Record<string, unknown>;
        if (capability === "graph:write") {
          const record = payload.record as Record<string, unknown>;
          const artifact = artifactId(ids[next++] ?? "e0");
          stored.set(artifact, String(record.content));
          return { id: artifact };
        }
        if (capability === "artifact:read") {
          return stored.get(String(payload.id)) ?? null;
        }
        throw new Error(`unexpected artifact-store capability ${String(capability)}`);
      },
    };
  };
  const runtime = makeRuntime();
  const completer = createSupervisedReplayEvaluationCompleter({
    runtime: runtime as never,
    operations: {
      async readLocalRouteCapture() {
        return counterfactualCapture;
      },
    } as never,
    requestId: "request:a46-source",
    channel: "stage",
    scope: "tenant:a46",
    sourceCapture: sourceCapture as never,
    sourceOutput: "source output",
    sourceEndpointId: "endpoint:source-a46",
    sourceModelId: "model:source-a46",
    counterfactualPackages: [candidate],
    getDispatched: () => ({
      replayRequestId: "replay:a46:candidate",
      execution: {
        routingDecisionId: "decision:counterfactual-a46",
        outputText: "counterfactual output",
      },
    }),
    evaluationCriteria: {
      schemaVersion: "role-model.semantic-criteria.v1",
      requiredTerms: ["output"],
    },
    evaluationCriteriaDigest: `sha256:${artifactId("99")}`,
    runPipeline: async () => options.pipelineResult as never,
    offerLearnerDerivation: async (groupId: string) => {
      options.offered.push(groupId);
    },
  });
  return completer({
    evaluationJobId: "evaluation-replay-a46",
    replayJobId: "replay:a46",
    resultBranches: [
      {
        candidateEndpointId: candidate.endpointId,
        branchRootRef: counterfactualCapture.rootArtifactId,
      },
    ],
  });
}

test("run101-a46 the shared completer offers the derivation for the comparison it finalized", async () => {
  const offered: string[] = [];
  await makeCompleter({
    offered,
    pipelineResult: {
      evaluation: { groupId: "comparison:a46", outcome: "candidate" },
      // The stub capture carries a single-occurrence trace, so the completer requires the pipeline to have
      // declined learning for the insufficient trajectory evidence it measured.
      candidate: { state: "insufficient_trajectory_evidence" },
    },
  });

  expect(offered).toEqual(["comparison:a46"]);
});

test("run101-a46 the offer follows the finalized group, not a winning candidate", async () => {
  const offered: string[] = [];
  await makeCompleter({
    offered,
    pipelineResult: {
      // A rejected comparison is still a finalized group the learner must see: the derivation decides what to
      // do with it, the completer's job is only to offer it. (The completer refuses a comparison with no group
      // at all, so that is not a reachable shape to pin.)
      evaluation: { groupId: "comparison:a46-rejected", outcome: "rejected" },
      candidate: { state: "insufficient_trajectory_evidence" },
    },
  });

  expect(offered).toEqual(["comparison:a46-rejected"]);
});

/**
 * The wiring this addendum changes is a closure inside `runStandaloneRuntime`, so the guard is a source
 * assertion - the same shape addendum 04 used for the claim loop. It pins the two properties that make the
 * race impossible: the inline completion defers when the plane is authoritative, and the derivation is offered
 * from exactly one place.
 */
test("run101-a46 the inline completion defers to the queue plane, and the offer has one home", () => {
  const source = readFileSync(new URL("../src/cli.ts", import.meta.url), "utf8");
  const completionStart = source.indexOf("completeEvaluation: (() => {");
  const completionEnd = source.indexOf(
    "createSupervisedReplayEvaluationCompleter({",
    completionStart,
  );
  expect(completionStart).toBeGreaterThan(0);
  expect(completionEnd).toBeGreaterThan(completionStart);
  const inlineCompletion = source.slice(completionStart, completionEnd);

  // The deferral, and the two things the worker still needs from this path.
  expect(inlineCompletion).toContain('lateBoundEvaluationQueue.mode === "queue"');
  expect(inlineCompletion).toMatch(/return null;/);
  expect(inlineCompletion).toContain("recordEvaluationResumeEntry({");
  expect(inlineCompletion).toContain("await holdHandoffEvidence(");
  // The evidence pin and the resume entry must precede the deferral, or a deferred handoff is unpinnable.
  expect(inlineCompletion.indexOf("await holdHandoffEvidence(")).toBeLessThan(
    inlineCompletion.indexOf('lateBoundEvaluationQueue.mode === "queue"'),
  );

  // One offer site, in the shared completer's wiring, for both drivers.
  expect(source.split('reason: "comparison-finalized"').length - 1).toBe(1);
  expect(source).toContain("offerLearnerDerivation,");
});
