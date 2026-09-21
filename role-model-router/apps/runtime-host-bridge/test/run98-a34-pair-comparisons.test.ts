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
) {
  let writeIndex = 0;
  let trialIndex = 0;
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
    ),
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

/**
 * The unordered pair a pipeline call actually **decides between**: the served source and the first
 * counterfactual, which is the comparison the pipeline judges and finalizes. A capture may now carry
 * further arms as development evidence (addendum 34 S3), so reading every counterfactual would overstate
 * what a single call compares.
 */
function decidedPairs(inputs: readonly TrackBShadowPipelineInput[]): string[] {
  return inputs.map((input) => {
    const evidence = input.comparableEvidence as Record<string, unknown> | undefined;
    const source = evidence?.source as Record<string, unknown> | undefined;
    const counterfactuals = Array.isArray(evidence?.counterfactuals)
      ? (evidence?.counterfactuals as Record<string, unknown>[])
      : [];
    return [String(source?.endpointId ?? ""), String(counterfactuals[0]?.endpointId ?? "")]
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
    expect(decidedPairs(scenario.pipelineInputs)[0]).toBe("endpoint:1|endpoint:a");

    // One call per comparison: the primary pair plus the pairs the graph is missing.
    expect(scenario.pipelineInputs.length).toBeGreaterThan(1);
    const pairs = decidedPairs(scenario.pipelineInputs);
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
    const firstPairs = decidedPairs(first.pipelineInputs);
    // The uncovered arm-vs-arm pairs are the graph's gaps, so they are planned before a second source pair.
    expect(firstPairs).toContain("endpoint:a|endpoint:b");

    const ledger = JSON.parse(readFileSync(ledgerPath, "utf8")) as {
      pairCounts?: Record<string, number>;
    };
    expect(Object.keys(ledger.pairCounts ?? {}).length).toBeGreaterThan(0);

    const second = buildScenario(["a", "b", "c"], ledgerPath);
    await second.invoke();
    const secondExtras = decidedPairs(second.pipelineInputs).slice(1);
    // A pair that already carries evidence is never selected while an uncovered pair is still
    // available: the two source pairs the first capture could not afford come first, and the
    // already-covered arm pairs can only fill what remains of the bounded budget.
    const uncovered = ["endpoint:1|endpoint:b", "endpoint:1|endpoint:c"];
    expect(uncovered).toContain(secondExtras[0]);
    expect(secondExtras.slice(0, uncovered.length).every((pair) => uncovered.includes(pair))).toBe(
      true,
    );
    for (const coveredPair of ["endpoint:a|endpoint:b", "endpoint:a|endpoint:c"]) {
      const index = secondExtras.indexOf(coveredPair);
      if (index >= 0) expect(index).toBeGreaterThanOrEqual(uncovered.length);
    }
  });

  /**
   * Run 98 addendum 34 S5 residual (live v219, real request `req-edc9ee3b`): the fresh replay deferred to
   * refusal with `judge_candidate_overlap` because the durable job's comparability carried **no**
   * `judgeEndpointId`, so Evaluation Core's write-time independence guard fell back to scanning every
   * registered judge manifest that shares the scorer-set version - including a historical one that
   * designated `deepseek-flash-max` - and refused a candidate that is not today's judge. The completer
   * has passed the designated judge into the pipeline since addendum 34 S9, but the pipeline never
   * declared or consumed the field: the spread in the call site hid it from TypeScript, so the value was
   * silently dropped and no live comparison could be created for such a capture.
   */
  test("the durable comparison records the endpoint that will judge it", async () => {
    const scenario = buildScenario(["a", "b"], undefined, {
      judgeEndpointId: "endpoint:judge-stub",
    });
    await scenario.invoke();

    expect(scenario.capturedJobs.length).toBeGreaterThan(0);
    for (const job of scenario.capturedJobs) {
      const comparability = job.comparability as Record<string, unknown> | undefined;
      expect(comparability?.judgeEndpointId).toBe("endpoint:judge-stub");
    }
  });

  /**
   * Run 98 addendum 34 S3 (`guidance/07`: fit on development evidence, decide on the holdout).
   *
   * Measured live before this: **every** durable case in the store carried `partition: holdout` — 516
   * comparison groups and not one development case — because the pipeline forced every candidate that
   * contributes a single case into the holdout. The family split always moves at least one case of a
   * multi-case family into the train partition, so that rule made the promotion gate's
   * `minDevelopmentComparisons` floor impossible to satisfy: the gate could only ever answer
   * `development_partition_missing`.
   *
   * The comparison still needs both of its own sides in the holdout. Everything the comparison does not
   * decide between — here the third arm of a three-arm capture — carries the partition the split declared,
   * so the family accrues the development evidence the protocol fits on.
   */
  test("a three-arm capture carries development evidence beside the compared holdout", async () => {
    const scenario = buildScenario(["a", "b", "c"], undefined, {
      judgeEndpointId: "endpoint:judge-stub",
    });
    await scenario.invoke();

    const job = scenario.capturedJobs[0];
    const cases = (job?.cases ?? []) as Array<{
      id: string;
      partition: string;
      candidateRef: string;
    }>;
    const partitions = cases.map((entry) => entry.partition);
    expect(partitions).toContain("holdout");
    expect(partitions).toContain("train");
    // The primary comparison keeps a holdout case for each of its own two sides, so its decision set is
    // unchanged; the extra arms are what carry the development partition.
    const holdoutCandidates = new Set(
      cases.filter((entry) => entry.partition === "holdout").map((entry) => entry.candidateRef),
    );
    expect(holdoutCandidates.size).toBeGreaterThanOrEqual(2);
    const primaryEvidence = scenario.pipelineInputs[0]?.comparableEvidence as
      | Record<string, unknown>
      | undefined;
    const primarySourceId = String(
      (primaryEvidence?.source as Record<string, unknown> | undefined)?.endpointId ?? "",
    );
    const primaryArmId = String(
      ((primaryEvidence?.counterfactuals as Record<string, unknown>[] | undefined) ?? [])[0]
        ?.endpointId ?? "",
    );
    expect(holdoutCandidates.has(primarySourceId)).toBe(true);
    expect(holdoutCandidates.has(primaryArmId)).toBe(true);
    const durableHoldout = job?.holdout as Record<string, unknown> | undefined;
    expect(
      (durableHoldout?.caseIds as readonly string[] | undefined)?.length,
    ).toBeGreaterThanOrEqual(2);
    // The development case is durable evidence on the same job, but it is not part of the decision:
    // the finalized comparison submits exactly the two holdout sides it judged.
    const finalizer = scenario.capturedFinalizers[0];
    expect((finalizer?.trialIds as readonly string[] | undefined)?.length).toBe(2);
  });

  /**
   * Run 98 addendum 34 S5 residual (live v228/v229: 16 dispositions in twelve hours deferred with
   * `durable routing-shadow comparison finalization failed` while every group in the store was finalized).
   *
   * The group exists and is valid; the *readback* shape is what fails the pipeline's check. Some hosts
   * answer the extension invoke wrapped (`{value: …}` / `{businessOutput: …}`) — the same boundary shape
   * that made addendum 34 S7 unwrap its own readbacks — and the pipeline validated the wrapper directly,
   * so `status` was undefined and a completed comparison was reported as a failure.
   */
  test("a wrapped comparison readback still counts as a finalized comparison", async () => {
    const scenario = buildScenario(["a", "b"], undefined, {
      judgeEndpointId: "endpoint:judge-stub",
      wrapReadback: true,
    });
    const result = await scenario.invoke();
    expect(result).toMatchObject({
      evaluationJobId: "evaluation:run98:a34",
      outcome: "candidate",
    });
    expect(String(result.comparisonGroupId)).toContain("comparison:");
  });

  /**
   * Run 98 addendum 51 (live v293): the operator's replay leg deferred with
   *
   *   replay endpoint HTTP 409: {"error":"durable routing-shadow comparison finalization failed:
   *   readback=transferState,resultHash,byteLength,businessOutput,durableLocator,evidenceRef,
   *   readCapability,workerPid"}
   *
   * and, on the same capture shape,
   *
   *   replay endpoint HTTP 409: {"error":"trusted evaluation reference attestation schema is invalid"}
   *
   * The packaged host answers both invokes inside its transport envelope, whose keys the bridge did not
   * recognise as transport fields — so every unwrap handed callers the envelope (`status` undefined, no
   * `schemaVersion`) instead of the business record, and a completed comparison plus a valid attestation
   * were both refused. The envelope must unwrap; the payload beneath it is authoritative.
   */
  test("a production transport envelope around the comparison readback still counts as finalized", async () => {
    const scenario = buildScenario(["a", "b"], undefined, {
      judgeEndpointId: "endpoint:judge-stub",
      transportEnvelope: true,
    });
    const result = await scenario.invoke();
    expect(result).toMatchObject({
      evaluationJobId: "evaluation:run98:a34",
      outcome: "candidate",
    });
    expect(String(result.comparisonGroupId)).toContain("comparison:");
  });

  test("an attestation answered inside the transport envelope is accepted", async () => {
    const scenario = buildScenario(["a", "b"], undefined, {
      judgeEndpointId: "endpoint:judge-stub",
      transportEnvelope: true,
    });
    await expect(scenario.invoke()).resolves.toBeTruthy();
  });

  /**
   * Run 98 addendum 56 §6.2 (the residual `attestation schema is invalid` class): the packaged host may store a
   * large business answer in its durable output store and answer with the transfer marker
   * (`businessOutput.transferState === "externalized"` plus a `durableLocator`). Unwrapping that answer yields the
   * marker, whose `schemaVersion` is absent — the same refusal the live ledger records. The attestation path must
   * resolve the externalized payload from the artifact store the way the comparison readback already does.
   */
  test("an externalized attestation is resolved from the durable output store before validation", async () => {
    const scenario = buildScenario(["a", "b"], undefined, {
      judgeEndpointId: "endpoint:judge-stub",
      externalizedAttestation: true,
    });
    // Without a resolvable durable output store the pipeline must still refuse — but the refusal now names the
    // shape it saw (keys, never values) instead of the opaque `schema is invalid` the ledger recorded three times.
    await expect(scenario.invoke()).rejects.toThrow(
      /attestation schema is invalid \(answer keys: transferState,resultHash,byteLength\)/,
    );
    expect(externalizedOutputs.has(ATTESTATION_OUTPUT_KEY)).toBe(true);
  });
});
