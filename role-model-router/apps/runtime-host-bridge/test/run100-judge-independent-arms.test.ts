import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, test } from "vitest";

import { createSupervisedReplayEvaluationCompleter } from "../src/cli.js";
import {
  type TrackBShadowPipelineInput,
  type TrackBShadowPipelineRuntime,
  createRun96RoutingShadowScorer,
  runTrackBShadowPipeline,
} from "../src/track-b-runtime.js";

/**
 * Run 100 R1 / RC-3 — the endpoint that judges a comparison is never one of its arms.
 *
 * Live stage (`:3457`, released candidate `d19dcff3`): the learner's newest receipts exclude
 * `incomparable:judge_self_evaluation` 152-154 times - the largest bucket, ahead of
 * `non_decisive_outcome` (32) and `package_not_involved` (62) - and it is not shrinking. Evaluation
 * Core derives the issue from the comparison's *scored trial set* (`index.mjs` ~3250-3361), so a judge
 * that is also a configured candidate poisons the capture's evidence even though the finalized pair
 * itself never contains the judge (measured: 0 of 171 judge-carrying groups names the judge among its
 * two compared candidates).
 *
 * These tests pin the requirement: with a judge that is one of the configured candidates, the job's
 * arms exclude it and the comparison is judged by it; when the judge is the only candidate left, the
 * capture refuses once with a named bounded reason instead of producing unusable evidence.
 */

const routingShadowScorer = createRun96RoutingShadowScorer();
const artifactId = (pattern: string): string =>
  pattern.repeat(Math.ceil(64 / pattern.length)).slice(0, 64);
const hash = (value: string): string => createHash("sha256").update(value).digest("hex");

const tempRoots: string[] = [];
/** Run 98 addendum 56 §6.2: the durable payload the fake host answers an externalized attestation from. */
const externalizedOutputs = new Map<
  string,
  { readonly resultHash: string; readonly payload: string }
>();
const ATTESTATION_OUTPUT_KEY = "attestation:run98:a34:externalized";
afterEach(() => {
  externalizedOutputs.clear();
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

function createFakeRuntime(
  store: Map<string, string>,
  capturedJobs: Record<string, unknown>[] = [],
  capturedFinalizers: Record<string, unknown>[] = [],
  /** Run 98 addendum 34 S5 residual: some hosts answer the readback wrapped (`{value}`). */
  wrapReadback = false,
  /**
   * Run 98 addendum 51 (live v293): the packaged host answers every business invoke inside its own
   * transport envelope — `{transferState, resultHash, byteLength, businessOutput, durableLocator,
   * evidenceRef, readCapability, workerPid}` — so the bridge has to unwrap that shape as well.
   */
  transportEnvelope = false,
  /**
   * Run 98 addendum 56 §6.2: the packaged host may store a large business answer in its durable output store and
   * answer with the transfer marker (`businessOutput.transferState === "externalized"` plus a `durableLocator`),
   * which is the second shape the live `attestation schema is invalid` class can come from.
   */
  externalizedAttestation = false,
  externalizedStateRoot: string | null = null,
  externalizedScopeId = "tenant:run98",
  /**
   * Run 100 R3: the durable job the host re-reads before finalising. A resume sees the job the first
   * attempt created, whose declared source/counterfactual pair is the comparison contract.
   */
  storedJob: Record<string, unknown> | null = null,
) {
  let writeIndex = 0;
  let trialIndex = 0;
  const trialsSeen: Record<string, unknown>[] = [];
  const inTransportEnvelope = (payload: Record<string, unknown>): Record<string, unknown> => ({
    transferState: "inline",
    resultHash: `sha256:${hash(JSON.stringify(payload))}`,
    byteLength: JSON.stringify(payload).length,
    businessOutput: payload,
    durableLocator: { kind: "inline" },
    evidenceRef: "evidence:run98:transport-envelope",
    readCapability: "evaluation:read-comparison-group",
    workerPid: 4321,
  });
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
        const attestation = {
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
        if (externalizedAttestation) {
          const payload = JSON.stringify(attestation);
          const resultHash = `sha256:${hash(payload)}`;
          externalizedOutputs.set(ATTESTATION_OUTPUT_KEY, { resultHash, payload });
          if (externalizedStateRoot) {
            // The host stores the payload and answers the marker; the fixture writes the store it will be read
            // from, exactly as the packaged host's durable output store does.
            const directory = path.join(
              externalizedStateRoot,
              externalizedScopeId,
              "track-b",
              "extensions",
              "workers",
              "evaluation-core",
            );
            mkdirSync(directory, { recursive: true });
            const database = new DatabaseSync(path.join(directory, "durable-output.sqlite"));
            try {
              database.exec(
                "CREATE TABLE IF NOT EXISTS durable_extension_outputs (output_key TEXT PRIMARY KEY, result_json TEXT, result_hash TEXT, byte_length INTEGER)",
              );
              database
                .prepare("INSERT OR REPLACE INTO durable_extension_outputs VALUES (?,?,?,?)")
                .run(ATTESTATION_OUTPUT_KEY, payload, resultHash, payload.length);
            } finally {
              database.close();
            }
          }
          return {
            businessOutput: {
              transferState: "externalized",
              resultHash,
              byteLength: payload.length,
            },
            durableLocator: { outputKey: ATTESTATION_OUTPUT_KEY, resultHash },
            workerPid: 4321,
          };
        }
        return transportEnvelope ? inTransportEnvelope(attestation) : attestation;
      }
      if (id === "evaluation-core" && capability === "evaluation:list-trials") {
        // One durable trial per candidate arm, addressed by the candidate the pipeline matches on.
        const value = envelope.value as Record<string, unknown>;
        const jobId = String(value?.jobId ?? "");
        const candidates = Array.isArray(storedJob?.trials)
          ? (storedJob.trials as Record<string, unknown>[])
          : null;
        if (candidates && candidates.length > 0) {
          if (trialsSeen.length === 0) trialsSeen.push(...candidates);
          return { value: candidates };
        }
        const trial = { jobId, trialId: `trial:run100:${String(trialIndex++)}` };
        if (trialsSeen.length === 0) trialsSeen.push(trial);
        return { value: [trial] };
      }
      if (id === "evaluation-core" && capability === "evaluation:get-job") {
        return storedJob ?? null;
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
        capturedFinalizers.push(structuredClone(value));
        const finalized = { groupId: value.groupId, status: "finalized", outcome: "candidate" };
        return transportEnvelope ? inTransportEnvelope(finalized) : finalized;
      }
      if (id === "evaluation-core" && capability === "evaluation:read-comparison-group") {
        const value = envelope.value as Record<string, unknown>;
        const readback = { groupId: value.groupId, status: "finalized", outcome: "candidate" };
        if (transportEnvelope) return inTransportEnvelope(readback);
        return wrapReadback ? { value: readback } : readback;
      }
      if (id === "evaluation-core" && capability === "evaluation:register-scorer") return {};
      if (id === "evaluation-core" && capability === "evaluation:create-job") {
        capturedJobs.push(structuredClone(envelope.value as Record<string, unknown>));
        return {};
      }
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

function buildScenario(
  armMarks: readonly string[],
  ledgerPath?: string,
  options: {
    readonly judgeEndpointId?: string;
    readonly wrapReadback?: boolean;
    readonly transportEnvelope?: boolean;
    readonly externalizedAttestation?: boolean;
    readonly contractStateRoot?: string;
    /** Windows cannot hold a `:` in a directory name, so a fixture that externalizes uses a plain scope id. */
    readonly scope?: string;
    /**
     * Run 100 R3: the durable job the pipeline re-reads before it finalises. A resumed completion sees
     * the job the first attempt created, and that job's declared pair is the comparison contract.
     */
    readonly storedJob?: Record<string, unknown> | null;
    /**
     * Run 100 R2: the shape each arm's durable branch capture has. `missing` is the arm whose capture
     * was skipped (the live 512 KiB deferred-capture budget), `tool_calls` is a tool-call-only answer
     * (empty assistant text, tool calls present).
     */
    readonly armOutput?: Readonly<Record<string, "text" | "tool_calls" | "missing">>;
  } = {},
) {
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
  const capturedJobs: Record<string, unknown>[] = [];
  const capturedFinalizers: Record<string, unknown>[] = [];
  const pipelineInputs: TrackBShadowPipelineInput[] = [];
  const pipelineCalls: string[] = [];
  const completer = createSupervisedReplayEvaluationCompleter({
    runtime: createFakeRuntime(
      store,
      capturedJobs,
      capturedFinalizers,
      options.wrapReadback === true,
      options.transportEnvelope === true,
      options.externalizedAttestation === true,
      options.contractStateRoot ?? null,
      options.scope ?? "tenant:run98",
      options.storedJob ?? null,
    ),
    operations: {
      async readLocalRouteCapture(input) {
        const requestId = String(input?.requestId ?? "");
        const arm = byReplayRequestId.get(requestId);
        if (!arm) return null;
        const mode = options.armOutput?.[arm.endpointId.replace("endpoint:", "")] ?? "text";
        if (mode === "missing") return null;
        if (mode === "tool_calls") {
          return {
            ...arm.capture,
            response: { content: "" },
            outputText: "",
            responseText: "",
            tools: [
              {
                toolCallId: `call:${arm.endpointId}`,
                toolName: "bash",
                arguments: { command: "ls -la" },
                result: { stdout: "total 0" },
              },
            ],
          } as unknown as Record<string, unknown>;
        }
        return arm.capture as unknown as Record<string, unknown>;
      },
    },
    requestId: "request:run98:a34",
    channel: "development",
    scope: options.scope ?? "tenant:run98",
    ...(options.contractStateRoot ? { contractStateRoot: options.contractStateRoot } : {}),
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
      const mode = options.armOutput?.[arm.endpointId.replace("endpoint:", "")] ?? "text";
      return {
        replayRequestId: arm.replayRequestId,
        execution: {
          routingDecisionId: arm.capture.routingDecisionId,
          // A resumed completion has no in-process buffer for the arm: the durable capture is the only
          // evidence left, which is exactly the live shape for a tool-call-only answer.
          outputText: mode === "tool_calls" ? "" : arm.capture.outputText,
        },
      };
    },
    evaluationCriteria: {
      schemaVersion: "role-model.semantic-criteria.v1",
      requiredTerms: ["output"],
    },
    evaluationCriteriaDigest: `sha256:${hash("criteria")}`,
    ...(options.judgeEndpointId
      ? {
          judge: {
            endpointId: options.judgeEndpointId,
            mode: "identity_blind" as const,
            orderPolicy: "dual_order" as const,
            async dispatch(request) {
              return {
                winner: "source" as const,
                confidence: 1,
                dispatchReceiptId: `judge-dispatch:${request.evaluationJobId}`,
                routerDecisionId: `judge-decision:${request.evaluationJobId}`,
                judgeResultRef: `artifact:${artifactId(hash(request.evaluationJobId).slice(0, 16))}`,
                judgeEndpointId: options.judgeEndpointId as string,
                judgeMode: "identity_blind" as const,
                presentation: { first: "source" as const, second: "counterfactual" as const },
              };
            },
          },
        }
      : {}),
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
  return {
    sourceCapture,
    arms,
    pipelineCalls,
    capturedJobs,
    capturedFinalizers,
    invoke,
    /** Run 98 addendum 56 §6.2: the inputs the pipeline actually ran with (their scope locates the store). */
    pipelineInputs,
  };
}

const trialIdFor = (candidate: string): string => `trial:run100:${hash(candidate).slice(0, 20)}`;

/**
 * The durable job the live store holds for a fresh multi-arm capture: one case and one trial per
 * candidate arm, with the comparability declaring exactly the two sides the comparison decides
 * between (source + first arm) plus the judge. The extra arm's trial is durable evidence the
 * comparison does not decide between.
 */
function durableMultiArmJob({
  declaredCounterfactual,
  allCandidates,
}: {
  readonly declaredCounterfactual: string;
  readonly allCandidates: readonly string[];
}): Record<string, unknown> {
  return {
    jobId: "evaluation:run100:resumed",
    status: "scored",
    comparability: {
      taskRef: "task:run100",
      inputRef: `artifact:${artifactId(hash("input:run100").slice(0, 16))}`,
      forkRef: `artifact:${artifactId(hash("fork:run100").slice(0, 16))}`,
      policyId: "run96-routing-shadow",
      scorerSetVersion: routingShadowScorer.scorerSetVersion,
      toolPolicyDigest: `artifact:${artifactId(hash("tools:run100").slice(0, 16))}`,
      environmentDigest: `artifact:${artifactId(hash("environment:run100").slice(0, 16))}`,
      sourceEvidenceRef: `artifact:${artifactId(hash("source:run100").slice(0, 16))}`,
      counterfactualEvidenceRef: `artifact:${artifactId(hash(`cf:${declaredCounterfactual}`).slice(0, 16))}`,
      sourceOutcomeRef: `artifact:${artifactId(hash("source-outcome:run100").slice(0, 16))}`,
      counterfactualOutcomeRef: `artifact:${artifactId(hash(`cf-outcome:${declaredCounterfactual}`).slice(0, 16))}`,
      sourceCandidateRef: "endpoint:1",
      counterfactualCandidateRef: declaredCounterfactual,
      judgeOrderPolicy: "dual_order",
      judgeEndpointId: "endpoint:judge",
    },
    holdout: {
      holdoutId: "holdout:run100",
      membershipDigest: `sha256:${hash("holdout:run100")}`,
      partition: "holdout",
    },
    trials: allCandidates.map((candidate) => ({
      trialId: trialIdFor(candidate),
      jobId: "evaluation:run100:resumed",
      caseId: `case:run100:${candidate}`,
      candidateRef: candidate,
      status: "queued",
      inputRef: `artifact:${artifactId(hash(`case:${candidate}`).slice(0, 16))}`,
      sourceGeneration: 0,
    })),
  };
}

describe("run 100 R1 judge-independent arms", () => {
  test("a judge that is a configured candidate is excluded from the comparison's arms", async () => {
    const scenario = buildScenario(["b", "c"], undefined, {
      judgeEndpointId: "endpoint:b",
    });

    const result = (await scenario.invoke()) as Record<string, unknown>;
    expect(result).toMatchObject({ outcome: "candidate" });

    // The durable job the pipeline created may not carry the judge as an arm.
    const job = scenario.capturedJobs[0] as
      | { cases?: Array<Record<string, unknown>> }
      | undefined;
    const caseCandidates = (job?.cases ?? []).map((entry) => String(entry.candidateRef ?? ""));
    expect(caseCandidates).not.toContain("endpoint:b");
    expect(caseCandidates).toContain("endpoint:c");

    // The comparison the capture decided between names the surviving arm, and the judge is recorded.
    const evidence = scenario.pipelineInputs[0]?.comparableEvidence as
      | Record<string, unknown>
      | undefined;
    const counterfactuals = Array.isArray(evidence?.counterfactuals)
      ? (evidence?.counterfactuals as Record<string, unknown>[])
      : [];
    expect(counterfactuals.map((entry) => entry.endpointId)).toEqual(["endpoint:c"]);
    const primaryFinalizer = scenario.capturedFinalizers[0];
    expect(
      (primaryFinalizer?.comparability as Record<string, unknown> | undefined)?.judgeEndpointId,
    ).toBe("endpoint:b");
  });

  test("a pool whose only candidate is the judge refuses once with a named bounded reason", async () => {
    const scenario = buildScenario(["b"], undefined, {
      judgeEndpointId: "endpoint:b",
    });

    await expect(scenario.invoke()).rejects.toThrow(
      /R14_ALL_CANDIDATES_ARE_JUDGE.*endpoint:b/u,
    );
  });
});

