/**
 * Run 98 R3: the learning pass.
 *
 * The capture → replay → evaluation → signals chain produces a finalized comparison and (when
 * the trajectory carries recognized behavioural evidence) a shadow candidate. Nothing in the
 * runtime ever turned that candidate into learning: `knowledge:validate-candidate` and
 * `knowledge:promote-candidate` existed as capabilities with no caller, so no validation
 * receipt, no experience pack and no promotable advisory could ever exist and P98-02/P98-06
 * could not pass on a live stage root.
 *
 * This module runs the pass the canonical pipeline describes (`docs/route-learning/
 * shadow-to-active.md`, steps 6-7): aggregate the durable decisive/holdout evidence for the
 * candidate's route package, validate the candidate against its finalized holdout comparison
 * with the policy's floors and guardrails, promote it only when the receipt says `validate`,
 * and record both receipts in the Knowledge Store with their scoring identity.
 *
 * The pass never dispatches a provider call, never mutates a route and never injects a prompt:
 * it only turns already-paid, already-durable evidence into the contract records the rollout
 * policy consumes.
 */

// Run 99 R33 D10: the canonical code for a judge that disagreed with itself under swapped
// presentation order. Imported from the dispatcher so the exclusion counter and the judge share
// one vocabulary.
import { createHash, createHmac } from "node:crypto";

import { POSITION_ORDER_DISAGREEMENT } from "./track-b-shadow-judge-dispatch.js";
import {
  buildExperiencePackCandidate,
  buildRoutePackageAttribution,
  buildRoutePackageActivationReceipt,
  buildRouteLearningValidationReceipt,
  emitTrackBContract,
} from "./track-b-contract-emission.js";

/**
 * Run 100 addendum `replay-evaluation-learner-spine-completion.addendum-07` P6: the durable learner
 * sweep's evidence assembler.
 *
 * Measured live 2026-09-24: 162 knowledge-worker candidates exist, 148 carry a validation receipt, and
 * the only writer of those receipts was the inline learner step inside `runTrackBShadowPipeline`. A
 * candidate whose pipeline run was interrupted after deriving it - or whose comparison was finalized
 * later by the extension's retro-finalize sweep - left a candidate nothing would ever validate, so
 * `knowledge_learning_records` froze at 2026-09-21T22:56:38Z while completion receipts accrued to 549.
 *
 * A later liveness sweep must present the same value the pipeline presents, and the Knowledge Worker
 * verifies two of its fields with the evidence authority (`#assertValidationEvaluation` in
 * `extensions/knowledge-worker/index.mjs`): the finalized-comparison readback receipt and the knowledge
 * safety receipt. Both are HMACs over payloads derived entirely from durable facts - the comparison body,
 * the channel, the route package and the holdout identity - so now that the authority itself is derived
 * from the runtime's managed key (`resolveDurableEvaluationAuthority`) a sweep can mint exactly what the
 * pipeline minted. This function is the single assembler for that value; the sweep, and any future
 * caller, must use it rather than hand-writing the shape (property C4: one contract, many writers).
 */
export const RUN104_LEARNER_SWEEP_PROVENANCE = Object.freeze({
  /** The pipeline's declared provenance for a shadow-pipeline comparison (`track-b-runtime.ts`). */
  policy: "run96-routing-shadow",
  task: "route-selection",
  split: "holdout",
  /** The pipeline's declared seed; kept identical so a sweep-minted receipt matches a pipeline one. */
  seed: 87,
});

/**
 * The Knowledge Worker's canonical form (`canonical` in `extensions/knowledge-worker/index.mjs`): sorted
 * keys, no whitespace. The pipeline signed with `JSON.stringify(canonicalizeRun88Proof(payload))`, which
 * produces the same string for JSON-safe payloads; using the worker's own recipe here makes the equality
 * a property of this module rather than of two hand-kept functions.
 */
function canonicalLearningEvidence(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalLearningEvidence).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonicalLearningEvidence(
            (value as Record<string, unknown>)[key],
          )}`,
      )
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

/** The digest the worker compares a receipt's `comparisonDigest` against (`groupDigest`). */
export function durableComparisonDigest(value: unknown): string {
  return createHash("sha256").update(canonicalLearningEvidence(value)).digest("hex");
}

function signedEvidenceReceipt(
  evaluationAuthoritySecret: string,
  payload: Record<string, unknown>,
): { readonly payload: Record<string, unknown>; readonly signature: string } {
  return {
    payload,
    signature: createHmac("sha256", evaluationAuthoritySecret)
      .update(canonicalLearningEvidence(payload))
      .digest("hex"),
  };
}

export interface DurableLearnerValidationInput {
  readonly candidateId: string;
  readonly routePackage: string;
  readonly channel: string;
  readonly scope: string;
  readonly scorerSetVersion: string;
  readonly judgeEndpointId?: string | null;
  readonly evaluationAuthoritySecret: string;
  readonly finalizedComparison: Readonly<Record<string, unknown>>;
  readonly evidenceSummary: Readonly<Record<string, unknown>>;
  /** The durable capture reference the comparison was produced from (`comparability.sourceEvidenceRef`). */
  readonly sourceEvidenceRef?: string | null;
  readonly counterfactualEvidenceRef?: string | null;
  readonly taskTypeId?: string | null;
  readonly taxonomyVersion?: string | null;
  readonly holdoutCaseIds?: readonly string[];
}

/**
 * Picks the identity a durable caller must read the comparison back with.
 *
 * Measured live 2026-09-24 (`stage-run105`, first learner-sweep ticks): every pending candidate carries
 * three group-shaped ids - `evidence.sourceGroupIds[0]` and `applicability.groupId` are the
 * **comparability key** (`group:<hash>`), and only `validationOutcome.evaluationId` /
 * `evidence.evaluationResultIds[0]` is the **durable comparison group** (`comparison:supervised-replay:<hash>`)
 * that `evaluation:read-comparison-group` can resolve. The sweep read the first id, so every candidate was
 * refused with "durable evaluation comparison group not found" while the group it needed was present and
 * finalized. Two identities for one thing is property C4, one hop over; this function is the single place
 * that decides which id is the durable one, so no caller has to guess an ordering again.
 */
export function selectDurableComparisonGroupId(
  candidate: Readonly<Record<string, unknown>>,
): string | null {
  const ids: string[] = [];
  const push = (value: unknown): void => {
    if (typeof value === "string" && value.length > 0 && !ids.includes(value)) ids.push(value);
  };
  push(candidate.comparisonId);
  const listed = Array.isArray(candidate.groupIds) ? candidate.groupIds : [];
  for (const value of listed) push(value);
  // The durable comparison group is the one Evaluation Core names with its own prefix; the comparability
  // key is a hash of the comparison's inputs and was never a durable row.
  return ids.find((id) => id.startsWith("comparison:")) ?? ids[0] ?? null;
}

/**
 * Assembles the `knowledge:validate-candidate` value a durable caller presents, minting both signed
 * receipts with the runtime's own (durable) evidence authority. The worker hydrates the candidate record
 * itself, so the caller supplies only what the candidate cannot carry: the scoring identity, the
 * comparison readback and the aggregate evidence summary.
 */
/**
 * Run 100 addendum 10, S13: the two receipts the Knowledge Worker verifies with the evidence authority. Measured
 * 2026-09-25: the consumer also requires `safeForPrompt` to be a **boolean** on the safety receipt
 * (`extensions/knowledge-worker/index.mjs`), a field the validation mint never carried - so a derivation that reused
 * the validation receipts would have been refused at the safety guard. One minter, both callers.
 */
export function mintDurableComparisonReceipts(input: {
  readonly evaluationAuthoritySecret: string;
  readonly channel: string;
  readonly routePackage: string;
  readonly comparisonId: string;
  readonly finalizedComparison: Readonly<Record<string, unknown>>;
  readonly evidenceRef: string;
  readonly safeForPrompt: boolean;
}): {
  readonly comparisonDigest: string;
  readonly finalizedComparisonReceipt: { readonly payload: Record<string, unknown>; readonly signature: string };
  readonly safetyReceipt: { readonly payload: Record<string, unknown>; readonly signature: string };
} {
  const comparisonDigest = durableComparisonDigest(input.finalizedComparison);
  const finalizedComparisonReceipt = signedEvidenceReceipt(input.evaluationAuthoritySecret, {
    schemaVersion: "role-model.evaluation-comparison-readback-receipt.v1",
    kind: "evaluation_core_comparison_readback",
    channel: input.channel,
    routePackage: input.routePackage,
    comparisonDigest,
  });
  const safetyReceipt = signedEvidenceReceipt(input.evaluationAuthoritySecret, {
    schemaVersion: "role-model.knowledge-safety-receipt.v1",
    kind: "knowledge_safety",
    comparisonId: input.comparisonId,
    comparisonDigest,
    channel: input.channel,
    routePackage: input.routePackage,
    packageIdentity: input.routePackage,
    redactionEvidenceRef: input.evidenceRef,
    safetyReviewEvidenceRef: input.evidenceRef,
    redacted: true,
    safetyReviewed: true,
    safeForPrompt: input.safeForPrompt,
    holdoutPassed: true,
  });
  return { comparisonDigest, finalizedComparisonReceipt, safetyReceipt };
}

export function assembleDurableLearnerValidationValue(
  input: DurableLearnerValidationInput,
): Record<string, unknown> {
  const comparisonDigest = durableComparisonDigest(input.finalizedComparison);
  const comparison = input.finalizedComparison as {
    readonly comparisonId?: unknown;
    readonly holdout?: { readonly holdoutId?: unknown; readonly caseIds?: unknown };
  };
  const comparisonId =
    typeof comparison.comparisonId === "string" && comparison.comparisonId
      ? comparison.comparisonId
      : null;
  if (!comparisonId) {
    throw new Error("durable learner validation requires a finalized comparison identity");
  }
  const holdoutId =
    typeof comparison.holdout?.holdoutId === "string" ? comparison.holdout.holdoutId : null;
  const holdoutCaseIds = Array.isArray(input.holdoutCaseIds)
    ? [...input.holdoutCaseIds]
    : Array.isArray(comparison.holdout?.caseIds)
      ? comparison.holdout.caseIds.filter(
          (caseId): caseId is string => typeof caseId === "string" && caseId.length > 0,
        )
      : [];
  const evidenceRef =
    boundedText(input.sourceEvidenceRef) ??
    boundedText(input.counterfactualEvidenceRef) ??
    boundedText(holdoutId);
  if (!evidenceRef) {
    throw new Error("durable learner validation requires a durable evidence reference");
  }
  const finalizedComparisonReceipt = signedEvidenceReceipt(input.evaluationAuthoritySecret, {
    schemaVersion: "role-model.evaluation-comparison-readback-receipt.v1",
    kind: "evaluation_core_comparison_readback",
    channel: input.channel,
    routePackage: input.routePackage,
    comparisonDigest,
  });
  const safetyReceipt = signedEvidenceReceipt(input.evaluationAuthoritySecret, {
    schemaVersion: "role-model.knowledge-safety-receipt.v1",
    kind: "knowledge_safety",
    comparisonId,
    comparisonDigest,
    channel: input.channel,
    routePackage: input.routePackage,
    packageIdentity: input.routePackage,
    redactionEvidenceRef: evidenceRef,
    safetyReviewEvidenceRef: boundedText(input.counterfactualEvidenceRef) ?? evidenceRef,
    redacted: true,
    safetyReviewed: true,
    holdoutPassed: true,
  });
  const guardrails = { ...DEFAULT_LEARNING_GUARDRAILS };
  return {
    candidateId: input.candidateId,
    scope: {
      routePackage: input.routePackage,
      channel: input.channel,
      scopeId: input.scope,
      ...(boundedText(input.taskTypeId) ? { taskTypeId: boundedText(input.taskTypeId) } : {}),
      ...(boundedText(input.taxonomyVersion)
        ? { taxonomyVersion: boundedText(input.taxonomyVersion) }
        : {}),
    },
    identity: {
      scorerSetVersion: input.scorerSetVersion,
      judgeEndpointId: input.judgeEndpointId ?? null,
    },
    evaluation: {
      environment: "local-routing-evaluation",
      provenance: {
        policy: RUN104_LEARNER_SWEEP_PROVENANCE.policy,
        task: RUN104_LEARNER_SWEEP_PROVENANCE.task,
        scorer: input.scorerSetVersion,
        split: RUN104_LEARNER_SWEEP_PROVENANCE.split,
        seed: RUN104_LEARNER_SWEEP_PROVENANCE.seed,
        evidenceRef,
      },
      finalizedComparison: structuredClone(input.finalizedComparison),
      finalizedComparisonReceipt,
      safetyReceipt,
    },
    ...(holdoutCaseIds.length ? { holdoutCaseIds } : {}),
    evidenceSummary: structuredClone(input.evidenceSummary),
    evidenceFloor: { ...DEFAULT_LEARNING_EVIDENCE_FLOOR },
    guardrails,
    // Run 98 R19: the protocol is declared before the holdout decision and the non-inferiority margin is
    // the quality guardrail bound the operator already configures.
    promotionProtocol: {
      ...DEFAULT_PROMOTION_PROTOCOL,
      nonInferiorityMargin: guardrails.qualityMinDelta,
    },
    estimator: {
      estimatorVersion: RUN98_LEARNING_ESTIMATOR_VERSION,
      bootstrapSeed: 0,
      resamples: RUN98_LEARNING_DEFAULT_BOOTSTRAP_RESAMPLES,
    },
  };
}

/**
 * Run 100 addendum 15 / item 7 (S19): the retrieval plane's *served* half.
 *
 * Measured live (`run138-cdaeaf3f`, `run144-092d5a26`): the knowledge worker's index is built and current
 * (`knowledge_worker_candidates` 291 -> 435, FTS rows equal to it, 25 -> 31 index generations) while
 * `knowledge_retrieval_receipts` reads 0 in the durable Knowledge Store. The index has a driver (one
 * `knowledge:rebuild-index` per learner sweep) but nothing ever *serves* a retrieval, so the ranking path, its
 * bounded receipt and the readback the Learning surface would render can never be observed - a retrieval that never
 * runs is indistinguishable from one that is broken.
 *
 * The sweep therefore serves exactly one bounded shadow query per tick and records its receipt durably. Two rules
 * travel with it, matching the sidecar composition: a store refusal degrades the *receipt* (the retrieval was still
 * served) and a worker refusal is reported, never thrown into the sweep.
 */
/**
 * Measured against the live FTS index (435 documents): `outperformed` and `holdout` appear in every derived
 * experience text, while `routing` appears only in the 229 capture-scope texts - so a three-token AND query returns
 * nothing for the operator scope the sweep asks about. Two tokens match the whole corpus and still exercise ranking.
 */
export const RUN100_SWEEP_RETRIEVAL_QUERY = "outperformed holdout";
/** The worker's own bound is 64; the sweep asks for a page, not the whole corpus. */
export const RUN100_SWEEP_RETRIEVAL_LIMIT = 8;

export interface ServeLearnerSweepRetrievalInput {
  readonly scopeId: string;
  readonly query?: string;
  readonly limit?: number;
  readonly invoke: (
    extensionId: string,
    capability: string,
    value: Record<string, unknown>,
  ) => Promise<unknown>;
}

export interface ServedLearnerSweepRetrieval {
  readonly served: boolean;
  readonly resultCount: number;
  readonly matchCount: number;
  readonly queryHash: string | null;
  readonly receiptId: string | null;
  readonly durableReceipt: { readonly recorded: boolean; readonly reason?: string };
  readonly reason?: string;
}

function asBoundedRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export async function serveLearnerSweepRetrieval(
  input: ServeLearnerSweepRetrievalInput,
): Promise<ServedLearnerSweepRetrieval> {
  const query =
    typeof input.query === "string" && input.query.trim().length > 0
      ? input.query.trim().slice(0, 128)
      : RUN100_SWEEP_RETRIEVAL_QUERY;
  const requestedLimit = Number.isSafeInteger(input.limit) ? Number(input.limit) : RUN100_SWEEP_RETRIEVAL_LIMIT;
  const limit = Math.min(Math.max(requestedLimit, 1), 64);
  let receipt: Record<string, unknown>;
  try {
    receipt = asBoundedRecord(
      await input.invoke("knowledge-worker", "knowledge:retrieve", {
        plane: "shadow",
        scopeId: input.scopeId,
        query,
        filters: { activeOnly: true },
        limit,
      }),
    );
  } catch (error) {
    return {
      served: false,
      resultCount: 0,
      matchCount: 0,
      queryHash: null,
      receiptId: null,
      durableReceipt: { recorded: false },
      reason: String((error as { message?: unknown })?.message ?? error).slice(0, 200),
    };
  }
  const resultCount = Number.isFinite(Number(receipt.resultCount)) ? Number(receipt.resultCount) : 0;
  const matchCount = Number.isFinite(Number(receipt.matchCount)) ? Number(receipt.matchCount) : 0;
  const queryHash = typeof receipt.queryHash === "string" && receipt.queryHash ? receipt.queryHash : null;
  try {
    const recorded = asBoundedRecord(
      await input.invoke("knowledge-store", "knowledge:record-retrieval", { receipt }),
    );
    const receiptId = typeof recorded.receiptId === "string" && recorded.receiptId ? recorded.receiptId : null;
    return {
      served: true,
      resultCount,
      matchCount,
      queryHash,
      receiptId,
      durableReceipt: receiptId
        ? { recorded: true }
        : { recorded: false, reason: "the store answered no receipt id" },
    };
  } catch (error) {
    return {
      served: true,
      resultCount,
      matchCount,
      queryHash,
      receiptId: null,
      durableReceipt: {
        recorded: false,
        reason: String((error as { message?: unknown })?.message ?? error).slice(0, 200),
      },
    };
  }
}

export interface DurableLearnerDerivationInput {
  readonly channel: string;
  readonly scope: string;
  readonly evaluationAuthoritySecret: string;
  /** The `evaluation:read-comparison-group` readback, plus the `referenceProofs` the group carries. */
  readonly finalizedComparison: Readonly<Record<string, unknown>>;
  /** The durable replay job the group's `holdout.caseIds` names. */
  readonly replayProvenance: {
    readonly sourceDecisionId?: unknown;
    readonly sourceGraphRef?: unknown;
    readonly sharedPrefixRef?: unknown;
    readonly digest?: unknown;
    readonly branches?: unknown;
  };
  /** The persisted `trajectory_signal_reports` row for the capture's live route decision. */
  readonly signalsReport: Readonly<Record<string, unknown>>;
  readonly profileEstimate: Readonly<Record<string, unknown>> | null;
  readonly taskTypeId?: string | null;
  readonly taxonomyVersion?: string | null;
  readonly roleId?: string | null;
  readonly safeForPrompt?: boolean;
}

/**
 * Run 100 addendum 10, S13: the durable derivation half of the learner.
 *
 * Measured 2026-09-25: 483 finalized comparisons are learnable, 202 have a candidate and **281 have none**, while
 * `knowledge:eval-consumer` has no caller outside `runTrackBShadowPipeline` - so a comparison the pipeline never
 * carried (or whose run stopped after the replay) is durable evidence no learner can reach.
 *
 * This assembler turns durable evidence only into the value that consumer accepts: the finalized comparison
 * readback, its own `referenceProofs`, the replay job the group names, the persisted signal report for the capture's
 * live decision, the profile learner's estimate, and two receipts minted with the runtime's evidence authority. It
 * never invents a trajectory, never dispatches a provider call and refuses anything the consumer would refuse - a
 * group that is not learnable, a signal report for another decision, a profile that does not attribute the winning
 * package - so a refusal is a bounded non-learning outcome rather than a partial write.
 */
export function assembleDurableLearnerDerivationValue(
  input: DurableLearnerDerivationInput,
): Record<string, unknown> {
  const comparison = input.finalizedComparison as Record<string, unknown>;
  const members = Array.isArray(comparison.members)
    ? (comparison.members as Record<string, unknown>[]).filter(
        (member): member is Record<string, unknown> => Boolean(member) && typeof member === "object",
      )
    : [];
  const comparisonId = boundedText(comparison.comparisonId) ?? boundedText(comparison.groupId);
  if (!comparisonId) {
    throw new Error("durable learner derivation requires a finalized comparison identity");
  }
  if (boundedText(comparison.status) !== "finalized") {
    throw new Error("durable learner derivation requires a finalized comparison");
  }
  const winner = members.find((member) => member.disposition === "positive");
  const loser = members.find((member) => member.disposition === "negative");
  if (!winner || !loser) {
    throw new Error(
      "durable learner derivation requires a learnable comparison with at least one positive and one negative member",
    );
  }
  const routePackage = boundedText(winner.candidateRef);
  if (!routePackage) {
    throw new Error("durable learner derivation requires the winning member's route package");
  }
  const comparability =
    comparison.comparability && typeof comparison.comparability === "object"
      ? (comparison.comparability as Record<string, unknown>)
      : {};
  const proofs =
    comparison.referenceProofs && typeof comparison.referenceProofs === "object"
      ? (comparison.referenceProofs as Record<string, unknown>)
      : {};
  const proofForReference = (reference: string): Record<string, unknown> => {
    const proof = Object.values(proofs).find(
      (candidate) =>
        candidate &&
        typeof candidate === "object" &&
        !Array.isArray(candidate) &&
        (candidate as Record<string, unknown>).reference === reference,
    );
    if (!proof || typeof proof !== "object" || Array.isArray(proof)) {
      throw new Error(`durable learner derivation is missing a reference proof for ${reference}`);
    }
    return proof as Record<string, unknown>;
  };
  const sourceEvidenceRef = boundedText(comparability.sourceEvidenceRef);
  const counterfactualEvidenceRef = boundedText(comparability.counterfactualEvidenceRef);
  const sourceCandidateRef = boundedText(comparability.sourceCandidateRef);
  const evidenceRefForMember = (member: Record<string, unknown>): string => {
    const role = boundedText(member.role);
    const isSource =
      role === "source" ||
      (role !== "counterfactual" &&
        sourceCandidateRef !== null &&
        boundedText(member.candidateRef) === sourceCandidateRef);
    const reference = isSource ? sourceEvidenceRef : counterfactualEvidenceRef;
    if (!reference) {
      throw new Error("durable learner derivation requires both per-branch evidence references");
    }
    return reference;
  };
  const evidenceRow = (
    member: Record<string, unknown>,
    disposition: "positive" | "negative",
  ): Record<string, unknown> => {
    const trialId = boundedText(member.trialId);
    const scoreId = boundedText(member.scoreId);
    const score = Number(member.score);
    if (!trialId || !scoreId || !Number.isFinite(score)) {
      throw new Error("durable learner derivation requires the finalized member lineage");
    }
    const evidenceRef = evidenceRefForMember(member);
    /**
     * The worker requires explicit graph/evaluation/trial/score lineage on grouped holdout learning (`grouped
     * holdout learning explicit graph/evaluation/trial/score lineage required`, measured live on
     * `run130-fca037e1`). A winning row's own branch artifact *is* the graph for its trial - the pipeline files the
     * winner as `evidenceKind: "graph"` with `graphRef`/`rolloutRef` - so the derived row carries the same lineage
     * instead of presenting the winner as an evaluation-only row.
     */
    const graphLineage =
      disposition === "positive"
        ? { evidenceKind: "graph", graphRef: evidenceRef, rolloutRef: evidenceRef }
        : { evidenceKind: "evaluation" };
    return {
      evidenceRef,
      score,
      ...graphLineage,
      learningCapable: true,
      evaluationRef: comparisonId,
      trialId,
      scoreId,
      sourceGroupId: comparisonId,
      referenceProof: proofForReference(evidenceRef),
    };
  };
  const positive = members
    .filter((member) => member.disposition === "positive")
    .map((member) => evidenceRow(member, "positive"));
  const negative = members
    .filter((member) => member.disposition === "negative")
    .map((member) => evidenceRow(member, "negative"));

  const sourceDecisionId = boundedText(input.replayProvenance.sourceDecisionId);
  const sourceGraphRef = boundedText(input.replayProvenance.sourceGraphRef);
  const sharedPrefixRef = boundedText(input.replayProvenance.sharedPrefixRef);
  const replayBranches = Array.isArray(input.replayProvenance.branches)
    ? input.replayProvenance.branches
    : null;
  if (!sourceDecisionId || !sourceGraphRef || !sharedPrefixRef || !replayBranches) {
    throw new Error("durable learner derivation requires the durable replay provenance");
  }

  const report = input.signalsReport as Record<string, unknown>;
  const reportDecisionId = boundedText(report.routeDecisionId);
  const reportGraphRef = boundedText(report.graphRef);
  const reportSignals = Array.isArray(report.signals) ? report.signals : null;
  const evaluationProvenance =
    report.evaluationProvenance && typeof report.evaluationProvenance === "object"
      ? (report.evaluationProvenance as Record<string, unknown>)
      : null;
  const learningEvidence =
    report.learningEvidence && typeof report.learningEvidence === "object"
      ? (report.learningEvidence as Record<string, unknown>)
      : null;
  if (
    reportDecisionId !== sourceDecisionId ||
    reportGraphRef !== sourceGraphRef ||
    !reportSignals ||
    !evaluationProvenance ||
    !learningEvidence ||
    boundedText(evaluationProvenance.groupId) !== comparisonId ||
    boundedText(learningEvidence.groupId) !== comparisonId
  ) {
    throw new Error(
      "durable learner derivation requires the persisted signal report for this capture's live decision",
    );
  }

  const profile = input.profileEstimate;
  const profileDigest = profile ? boundedText((profile as Record<string, unknown>).digest) : null;
  const profileEffects =
    profile && (profile as Record<string, unknown>).effects && typeof (profile as Record<string, unknown>).effects === "object"
      ? ((profile as Record<string, unknown>).effects as Record<string, unknown>)
      : null;
  const routePackageEffects =
    profileEffects && profileEffects.routePackage && typeof profileEffects.routePackage === "object"
      ? (profileEffects.routePackage as Record<string, unknown>)
      : null;
  const attributedPackages = Array.isArray(routePackageEffects?.values)
    ? routePackageEffects.values.filter((value): value is string => typeof value === "string")
    : [];
  const attributionEvidenceRefs = Array.isArray(routePackageEffects?.evidenceRefs)
    ? routePackageEffects.evidenceRefs.filter((value): value is string => typeof value === "string" && value.length > 0)
    : [];
  if (!profileDigest || !attributedPackages.includes(routePackage) || attributionEvidenceRefs.length === 0) {
    throw new Error("durable learner derivation requires a profile estimate that attributes the winning route package");
  }

  const evidenceRef = counterfactualEvidenceRef ?? sourceEvidenceRef;
  if (!evidenceRef) {
    throw new Error("durable learner derivation requires a durable holdout evidence reference");
  }
  const policyId = boundedText(comparability.policyId) ?? RUN104_LEARNER_SWEEP_PROVENANCE.policy;
  const scorerSetVersion =
    boundedText(comparability.scorerSetVersion) ?? `${policyId}-v1`;
  /**
   * The consumer reads `finalizedComparison.comparisonId` (`extensions/knowledge-worker`: "finalized durable
   * comparison evidence required"), and the evaluator's own page entry names the same row only as `groupId`. Measured
   * live on `run128-c73a2131`: every derivation that reached the worker was refused for the missing identity. The
   * projection is therefore stated once, before the receipts are minted - the consumer recomputes the comparison
   * digest from the object it receives, so the receipts have to be signed over exactly that object.
   */
  const finalizedComparisonForConsumer = {
    ...structuredClone(comparison),
    groupId: boundedText(comparison.groupId) ?? comparisonId,
    comparisonId,
    status: "finalized",
  };
  const receipts = mintDurableComparisonReceipts({
    evaluationAuthoritySecret: input.evaluationAuthoritySecret,
    channel: input.channel,
    routePackage,
    comparisonId,
    finalizedComparison: finalizedComparisonForConsumer,
    evidenceRef,
    safeForPrompt: input.safeForPrompt ?? true,
  });
  const holdout =
    comparison.holdout && typeof comparison.holdout === "object"
      ? { ...(comparison.holdout as Record<string, unknown>) }
      : {};
  const outcome = comparison.outcome ?? evaluationProvenance.outcome;
  return {
    replay: {
      sourceDecisionId,
      sourceGraphRef,
      sharedPrefixRef,
      branches: replayBranches,
      ...(boundedText(input.replayProvenance.digest)
        ? { digest: boundedText(input.replayProvenance.digest) }
        : {}),
    },
    evaluation: {
      environment: "local-routing-evaluation",
      scores: members.map((member) => Number(member.score)),
      provenance: {
        policy: policyId,
        task: RUN104_LEARNER_SWEEP_PROVENANCE.task,
        scorer: scorerSetVersion,
        split: RUN104_LEARNER_SWEEP_PROVENANCE.split,
        seed: RUN104_LEARNER_SWEEP_PROVENANCE.seed,
        evidenceRef: boundedText(comparability.forkRef) ?? comparisonId,
      },
      finalizedComparison: finalizedComparisonForConsumer,
      finalizedComparisonReceipt: receipts.finalizedComparisonReceipt,
      safetyReceipt: receipts.safetyReceipt,
    },
    signals: {
      routeDecisionId: reportDecisionId,
      graphRef: reportGraphRef,
      signals: reportSignals,
      evaluationProvenance,
      learningEvidence,
    },
    profile: { digest: profileDigest, effects: profileEffects },
    comparableGroup: {
      groupId: comparisonId,
      policy: policyId,
      task: RUN104_LEARNER_SWEEP_PROVENANCE.task,
      scorer: scorerSetVersion,
      scorerSetVersion,
      split: "holdout",
      seed: RUN104_LEARNER_SWEEP_PROVENANCE.seed,
      comparabilityKey: `${sourceDecisionId}:holdout`,
      positive,
      negative,
      learningCapable: true,
    },
    holdout: { ...holdout, evidenceRef, passed: true },
    scope: {
      routePackage,
      channel: input.channel,
      scopeId: input.scope,
      ...(boundedText(input.taskTypeId) ? { taskTypeId: boundedText(input.taskTypeId) } : {}),
      ...(boundedText(input.taxonomyVersion) ? { taxonomyVersion: boundedText(input.taxonomyVersion) } : {}),
      ...(boundedText(input.roleId) ? { roleId: boundedText(input.roleId) } : {}),
    },
    learningCapable: true,
    learningEvidence,
    finalizedEvaluation: {
      groupId: comparisonId,
      status: "finalized",
      ...(outcome !== undefined ? { outcome } : {}),
    },
    comparisonDigest: receipts.comparisonDigest,
  };
}

export const RUN98_LEARNING_PASS_SCHEMA = "role-model.route-learning-pass.v1";
export const RUN98_LEARNING_PASS_DEGRADATION_SCHEMA =
  "role-model.route-learning-pass-degradation.v1";
export const RUN98_LEARNING_ESTIMATOR_VERSION = "paired-cluster-bootstrap@1";
export const RUN98_LEARNING_DEFAULT_BOOTSTRAP_RESAMPLES = 2_000;

/**
 * Policy defaults when the runtime composes the pass without a versioned policy snapshot.
 * Every one of these values is operator-configurable in `shared/route-learning-activation-policy.json`
 * and exposed through the Learning UI.
 */
export const DEFAULT_LEARNING_EVIDENCE_FLOOR = Object.freeze({
  minDecisiveComparisons: 3,
  minHoldoutComparisons: 1,
  /** Run 98 addendum 32 S1: development-partition evidence the promotion gate fits against. */
  minDevelopmentComparisons: 1,
  minDistinctCaptures: 3,
});

/**
 * Run 99 R33 D12: the shipped default of `evidenceHalfLifeDays`. The pass takes the operator's
 * value when the caller supplies it; otherwise the policy default applies, so the decay is never
 * silently absent.
 */
export const DEFAULT_EVIDENCE_HALF_LIFE_DAYS = 14;

/**
 * Run 99 R33 (addendum 20 D5, `guidance/13` §Evidence-source weighting): how much each evidence
 * class counts toward the learner's floor. Zero means the class is not semantic-quality evidence
 * at all, so the comparison is excluded rather than down-weighted.
 */
export const EVIDENCE_CLASS_WEIGHTS: Readonly<Record<string, number>> = Object.freeze({
  natural_deterministic_outcome: 1,
  manual_replay: 1,
  counterfactual_replay: 0.9,
  background_local_eval: 0.8,
  benchmark: 0.75,
  passive_outcome_proxy: 0.1,
  route_replay: 0,
  passive_observability: 0,
});
const DEFAULT_EVIDENCE_CLASS = "counterfactual_replay";

/**
 * Run 99 R33 (addendum 20 D4): the strength of the parent (route-package) prior when a family's own
 * evidence is thin. `guidance/13` shrinks the most specific level toward its parent; a family below
 * this many effective comparisons leans on the package level, and the fallback level is disclosed.
 */
export const FAMILY_PRIOR_STRENGTH = 5;

export const DEFAULT_LEARNING_GUARDRAILS = Object.freeze({ qualityMinDelta: -0.02 });

/**
 * Run 98 R19 / addendum 02: the predeclared statistical promotion protocol of `guidance/07`.
 * The pass always declares one; the worker fails closed (`promotion_protocol_required`) when a
 * validation arrives without it, so a pack can never be promoted on a point estimate.
 */
export const DEFAULT_PROMOTION_PROTOCOL = Object.freeze({
  protocolId: "promotion:paired-cluster-bootstrap",
  primaryMetricId: "role_model_pairwise_judge.battle",
  direction: "higher_is_better" as const,
  minimumPracticalDelta: 0.05,
  intervalLevel: 0.95,
  resamples: 10_000,
  bootstrapSeed: 0,
  analysisMethod: "paired_cluster_bootstrap" as const,
  selectionFamilySize: 1,
  multiplicityAdjustment: "holm_bonferroni" as const,
});

const DECISIVE_OUTCOMES = new Set(["candidate", "source"]);

/**
 * Run 107 P1: how much of the durable comparison-group set a learner asks for at a time.
 *
 * `evaluation:list-groups` used to answer a fixed 256-row page (ignoring its request value), so the
 * learner counted an arbitrary window of the evidence: on 2026-09-24 the live root held 699
 * finalized groups and 443 of them could never be counted, which left every promotion short of its
 * floor. The reader now walks cursors, and the page size stays bounded by the caller and the
 * capability (`LIST_GROUPS_MAX_LIMIT` in the extension).
 */
export const LEARNING_GROUP_PAGE_LIMIT = 256;
/**
 * The bound on one evidence read: 64 pages of 256 groups is 16 384 comparisons, an order of
 * magnitude past the live set. A store larger than this is a capacity question, not a page walk, and
 * the caller should see a bounded answer rather than an unbounded loop.
 */
export const LEARNING_GROUP_MAX_PAGES = 64;

/**
 * Run 107 P6: when a validated pack may be put into the rollout.
 *
 * The learner writes a pack; the router only ever reads the pack the *rollout* names
 * (`route-advisory-source.ts`: "no active pack" when `rollout.activePackageId` is unset). Nothing on
 * the sweep path used to write it, so a validated pack could not influence a route. Activation is a
 * policy decision, so the sweep asks the operator's stage rather than assuming:
 *
 *  - `S0`/`S1` observe only - a pack is recorded and left alone;
 *  - `S2`, `S3`, `S4` already apply learned evidence to routing (S2 is the documented
 *    "advisory considered" stage), so a validated pack may be activated;
 *  - an unreadable or damaged policy degrades to a null stage, which is *not* an activation.
 */
export function activationStageAllowsPackActivation(stage: unknown): boolean {
  return stage === "S2" || stage === "S3" || stage === "S4";
}

/**
 * Run 107 P11: did the store actually activate the pack?
 *
 * Measured live on `run107e-94cdd4f6`: the sweep logged `activated 2 pack(s)` on every tick while
 * `knowledge_route_rollouts[standalone-runtime-stage]` stayed at its 01:38:36Z value and no new activation
 * receipt appeared. Replaying the same invoke against a copy of the live store shows why - the store answers a
 * **bounded degradation receipt** (`{"degraded":true,"capability":"knowledge:activate-pack","reason":
 * "activation requires a recorded pack"}`) instead of throwing, and the sweep counted any non-throwing answer
 * as an activation. A hop that reports success without reading its own answer is exactly the class this run
 * keeps finding, so the answer is now classified: only a receipt that names the pack and reports `active`
 * counts, and anything else is reported with the store's own reason.
 */
export function classifyPackActivationAnswer(
  answer: unknown,
  packId: string,
): { readonly activated: boolean; readonly reason: string | null } {
  const record = asRecord(answer);
  if (!record) return { activated: false, reason: "activation answer was not a record" };
  const receipt = asRecord(record.receipt) ?? record;
  const receiptPackId = boundedText(receipt.packageId);
  if (record.degraded === true || receipt.state === undefined) {
    return {
      activated: false,
      reason: boundedText(record.reason) ?? boundedText(receipt.reason) ?? "activation degraded",
    };
  }
  if (receipt.state !== "active") {
    return { activated: false, reason: `activation state is ${String(receipt.state)}` };
  }
  if (receiptPackId !== packId) {
    return {
      activated: false,
      reason: `activation receipt names ${receiptPackId ?? "no pack"}`,
    };
  }
  return { activated: true, reason: null };
}

export interface TrackBLearningPassRuntime {
  invoke(extensionId: string, envelope: Record<string, unknown>): Promise<unknown>;
}

export interface TrackBLearningEvidenceGroup {
  readonly groupId?: unknown;
  readonly status?: unknown;
  readonly comparability?: unknown;
  readonly holdout?: unknown;
  readonly result?: unknown;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function boundedText(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

/**
 * Run 100 addendum 15 item 6: the attribution carries the numbers the promotion gate decided on, so a
 * value that is not a finite number is absent rather than zero - a fabricated `0` would read as "this
 * package measured no improvement", which is a claim the receipt never made.
 */
function boundedNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Run 107 P1: read the whole comparison-group set through the capability's keyset cursor.
 *
 * The shape accepted from a page is deliberately generous, because three callers decode the same
 * capability through three different transports (the host bridge decodes business results, the
 * operator sidecar externalizes large frames, and an older runtime answers the legacy plain array).
 * A plain array means "one legacy page, nothing follows" - that is what the pre-107 runtime returns,
 * so a caller pointed at an older build degrades to the old behaviour instead of looping.
 */
export async function collectPagedComparisonGroups(input: {
  readonly readPage: (cursor: string | null) => Promise<unknown>;
  readonly maxPages?: number;
}): Promise<Record<string, unknown>[]> {
  const collected: Record<string, unknown>[] = [];
  const maxPages = input.maxPages ?? LEARNING_GROUP_MAX_PAGES;
  let cursor: string | null = null;
  for (let page = 0; page < maxPages; page += 1) {
    const decoded = await input.readPage(cursor);
    const record = asRecord(decoded);
    const rows = Array.isArray(decoded)
      ? decoded
      : Array.isArray(record?.groups)
        ? (record.groups as unknown[])
        : Array.isArray(record?.value)
          ? (record.value as unknown[])
          : [];
    for (const row of rows) {
      if (row && typeof row === "object" && !Array.isArray(row)) {
        collected.push(row as Record<string, unknown>);
      }
    }
    // A legacy array carries no cursor, so the walk ends after one page exactly as it did before.
    const nextCursor = Array.isArray(decoded) ? null : boundedText(record?.nextCursor);
    if (!nextCursor || nextCursor === cursor) break;
    cursor = nextCursor;
  }
  return collected;
}

export function buildTrackBLearningEvidenceSummary(input: {
  readonly groups: readonly TrackBLearningEvidenceGroup[];
  readonly routePackage: string;
  readonly evidenceMaxAgeMs: number;
  readonly nowMs: number;
  /**
   * Run 99 R33 (addendum 21 D12): the estimator decay half-life from the operator policy. Each
   * comparison contributes `0.5 ** (ageDays / halfLifeDays)` to the effective count, so old
   * evidence cannot outweigh fresh evidence of the same nominal count.
   */
  readonly evidenceHalfLifeDays?: number | null;
}): {
  readonly decisiveComparisons: number;
  readonly holdoutComparisons: number;
  /** Run 98 addendum 32 S1: comparisons carrying the family's development partition. */
  readonly developmentComparisons: number;
  readonly distinctCaptures: number;
  readonly caseManifestRef: string;
  readonly effectiveDecisiveComparisons: number;
  readonly effectiveHoldoutComparisons: number;
  readonly effectiveDevelopmentComparisons: number;
  /**
   * Run 98 addendum 33 S4: the comparable set behind every number above — the distinct evaluated cases
   * and the candidates they were evaluated for. An aggregate that does not declare this set cannot be
   * read as a comparison.
   */
  readonly comparable: {
    readonly cases: number;
    readonly candidates: readonly string[];
    readonly caseIds: readonly string[];
    /** Run 98 addendum 33 S3: the comparison graph's edges and their counts. */
    readonly pairs: readonly {
      readonly sourceCandidateRef: string;
      readonly counterfactualCandidateRef: string;
      readonly comparisons: number;
    }[];
    /**
     * Run 98 addendum 33 S3 (the research §3: "three of six candidate pairs have never been directly
     * compared"): the candidate pairs the counted evidence never covered, so a reader can see the graph is
     * incomplete instead of inferring a ranking through a hub.
     */
    readonly missingPairs: readonly (readonly [string, string])[];
  };
  /**
   * Run 99 R33 (addendum 19 S34, addendum 20 D2/D4, addendum 21 D11): the same counts keyed by
   * the task family the comparison was produced for. The learner's floor is per
   * (route package x task family), so another family's evidence can never clear this one's.
   */
  readonly byFamily: Record<
    string,
    {
      decisiveComparisons: number;
      holdoutComparisons: number;
      developmentComparisons: number;
      distinctCaptures: number;
      effectiveDecisiveComparisons: number;
      effectiveHoldoutComparisons: number;
      effectiveDevelopmentComparisons: number;
      effectiveSampleSize: number;
      maxCaptureShare: number | null;
      drift: number | null;
      evidenceClasses: Record<string, number>;
      hierarchy: {
        level: "task_family";
        fallbackLevel: "route_package" | null;
        effectiveN: number;
        priorMean: number | null;
        priorStrength: number;
        shrunkValue: number;
        confidence: number;
      };
      propensityCoverage: number;
      causalClaim: "observational" | "randomized";
    }
  >;
  /** Run 99 R33 / addendum 21 D10: why the other finalized groups were not counted. */
  readonly excludedByReason: Record<string, number>;
} {
  const decisiveGroupIds: string[] = [];
  const captures = new Set<string>();
  /**
   * Run 98 addendum 33 S4 (the research §3: "candidate means are computed over different task
   * populations ... report only on the common rubric set, and state the comparable n alongside every
   * number"): the counted evidence declares which cases and candidates it actually covers, so an
   * aggregate can name its own comparable set instead of silently averaging different populations.
   */
  const comparableCases = new Set<string>();
  const comparableCandidates = new Set<string>();
  /** Run 98 addendum 33 S3: how many counted comparisons each candidate pair actually has. */
  const comparablePairs = new Map<string, number>();
  const familyCaptures = new Map<string, Set<string>>();
  const familyDecisive = new Map<string, string[]>();
  const familyHoldout = new Map<string, number>();
  /** Run 98 addendum 32 S1: development-partition comparisons per family. */
  const familyDevelopment = new Map<string, number>();
  const familyEffectiveDecisive = new Map<string, number>();
  const familyEffectiveHoldout = new Map<string, number>();
  const familyEffectiveDevelopment = new Map<string, number>();
  // Run 99 R33 D11: per-family source concentration and temporal drift dimensions.
  const familyCaptureCounts = new Map<string, Map<string, number>>();
  const familyObservations = new Map<string, { atMs: number; delta: number }[]>();
  // Run 99 R33 D5: how many comparisons of each evidence class back each family.
  const familyEvidenceClasses = new Map<string, Record<string, number>>();
  // Run 99 R33 D6: how much of each family's evidence carries a valid selection probability.
  const familyCounted = new Map<string, number>();
  const familyWithPropensity = new Map<string, number>();
  const excludedByReason: Record<string, number> = {};
  const exclude = (reason: string): void => {
    excludedByReason[reason] = (excludedByReason[reason] ?? 0) + 1;
  };
  let holdoutComparisons = 0;
  /**
   * Run 98 addendum 32 S1 (`guidance/07`: fit on development evidence, decide on the holdout): the
   * family's development partition, as recorded on the finalized comparison. With 474 holdout-only jobs
   * on the live store this count is the field that makes the missing split visible to the gate.
   */
  let developmentComparisons = 0;
  let effectiveDecisiveComparisons = 0;
  let effectiveHoldoutComparisons = 0;
  let effectiveDevelopmentComparisons = 0;
  const halfLifeDays =
    typeof input.evidenceHalfLifeDays === "number" &&
    Number.isFinite(input.evidenceHalfLifeDays) &&
    input.evidenceHalfLifeDays > 0
      ? input.evidenceHalfLifeDays
      : DEFAULT_EVIDENCE_HALF_LIFE_DAYS;
  const roundWeight = (value: number) => Math.round(value * 10_000) / 10_000;
  for (const group of input.groups) {
    const result = asRecord(group.result);
    const comparability = asRecord(group.comparability ?? result?.comparability);
    const holdout = asRecord(group.holdout ?? result?.holdout);
    const groupId = boundedText(group.groupId ?? result?.groupId);
    if (!result || !comparability || !groupId) {
      exclude("missing_comparability");
      continue;
    }
    if (result.status !== "finalized") {
      exclude("not_finalized");
      continue;
    }
    // Run 99 R33 (addendum 21 D10, `guidance/11` "incomparable ... groups are ineligible for
    // promotion evidence"): a comparison that reports validity issues — including the judge's
    // own position-order disagreement — is excluded and counted by code, never averaged in.
    const validityIssues = Array.isArray(result.validityIssues)
      ? result.validityIssues
          .map((issue) => boundedText(issue))
          .filter((issue): issue is string => issue !== null)
      : [];
    if (
      result.orderDisagreement === true ||
      String(result.outcome ?? "")
        .trim()
        .toLowerCase() === "order_disagreement"
    ) {
      validityIssues.push(POSITION_ORDER_DISAGREEMENT);
    }
    if (validityIssues.length > 0) {
      for (const issue of new Set(validityIssues)) {
        exclude(`incomparable:${issue.slice(0, 48)}`);
      }
      continue;
    }
    // Run 99 R33 D5: the evidence class decides how much the comparison is worth. A class with
    // weight 0 (route-only replay, passive observability) is not quality evidence and is excluded.
    const evidenceClass =
      boundedText(comparability.evidenceStrength) ??
      boundedText(result.evidenceStrength) ??
      DEFAULT_EVIDENCE_CLASS;
    const classWeight =
      EVIDENCE_CLASS_WEIGHTS[evidenceClass] ?? EVIDENCE_CLASS_WEIGHTS[DEFAULT_EVIDENCE_CLASS];
    if (!(classWeight > 0)) {
      exclude(`non_semantic_evidence:${evidenceClass.slice(0, 48)}`);
      continue;
    }
    // Run 99 R33 D6: a comparison is randomized evidence only when it declares a valid selection
    // probability for a randomized mode; everything else counts as observational.
    const selectionMode =
      boundedText(comparability.selectionMode) ?? boundedText(result.selectionMode) ?? null;
    const selectionProbabilityRaw =
      comparability.selectionProbability ?? result.selectionProbability;
    const selectionProbability = Number(selectionProbabilityRaw);
    const hasPropensity =
      (selectionMode === "controlled_exploration" || selectionMode === "policy_randomized") &&
      Number.isFinite(selectionProbability) &&
      selectionProbability > 0 &&
      selectionProbability <= 1;
    if (!DECISIVE_OUTCOMES.has(String(result.outcome ?? ""))) {
      exclude("non_decisive_outcome");
      continue;
    }
    // The candidate's route package must be the counterfactual or the source of the
    // comparison: evidence about a different package can never validate this candidate.
    const involved =
      String(comparability.counterfactualCandidateRef ?? "") === input.routePackage ||
      String(comparability.sourceCandidateRef ?? "") === input.routePackage;
    if (!involved) {
      exclude("package_not_involved");
      continue;
    }
    const ageMs = evidenceAgeMs(comparability, input.nowMs);
    if (ageMs !== null && ageMs > input.evidenceMaxAgeMs) {
      exclude("evidence_expired");
      continue;
    }
    decisiveGroupIds.push(groupId);
    const captureRef =
      boundedText(comparability.inputRef) ??
      boundedText(comparability.forkRef) ??
      boundedText(comparability.sourceEvidenceRef) ??
      groupId;
    captures.add(captureRef);
    const caseIds = Array.isArray(holdout?.caseIds) ? holdout.caseIds : [];
    if (caseIds.length > 0) holdoutComparisons += 1;
    // The comparable set: the cases the counted comparison actually evaluated (the holdout membership)
    // and the two candidates it compared.
    for (const caseId of caseIds) {
      if (typeof caseId === "string" && caseId.length > 0) comparableCases.add(caseId);
    }
    for (const field of ["sourceCandidateRef", "counterfactualCandidateRef"] as const) {
      const candidateRef = boundedText(comparability[field]);
      if (candidateRef) comparableCandidates.add(candidateRef);
    }
    const sourceCandidate = boundedText(comparability.sourceCandidateRef);
    const counterfactualCandidate = boundedText(comparability.counterfactualCandidateRef);
    if (sourceCandidate && counterfactualCandidate) {
      const pairKey = `${sourceCandidate}\u0000${counterfactualCandidate}`;
      comparablePairs.set(pairKey, (comparablePairs.get(pairKey) ?? 0) + 1);
    }
    // The development partition travels on the comparison result (addendum 32 S1).
    const developmentPartition = asRecord(result.developmentPartition);
    const developmentCaseIds = Array.isArray(developmentPartition?.caseIds)
      ? developmentPartition.caseIds.filter(
          (caseId): caseId is string => typeof caseId === "string" && caseId.length > 0,
        )
      : [];
    if (developmentCaseIds.length > 0) developmentComparisons += 1;
    // Run 99 R33 D12: the decay weight uses the same age the freshness window used.
    const decay = ageMs === null ? 1 : 0.5 ** (ageMs / 86_400_000 / halfLifeDays);
    const weight = decay * classWeight;
    effectiveDecisiveComparisons += weight;
    if (caseIds.length > 0) effectiveHoldoutComparisons += weight;
    if (developmentCaseIds.length > 0) effectiveDevelopmentComparisons += weight;
    const family = boundedText(comparability.taskTypeId);
    if (family) {
      const bucket = familyDecisive.get(family) ?? [];
      bucket.push(groupId);
      familyDecisive.set(family, bucket);
      const familyCaptureSet = familyCaptures.get(family) ?? new Set<string>();
      familyCaptureSet.add(captureRef);
      familyCaptures.set(family, familyCaptureSet);
      if (caseIds.length > 0) familyHoldout.set(family, (familyHoldout.get(family) ?? 0) + 1);
      if (developmentCaseIds.length > 0) {
        familyDevelopment.set(family, (familyDevelopment.get(family) ?? 0) + 1);
      }
      familyEffectiveDecisive.set(family, (familyEffectiveDecisive.get(family) ?? 0) + weight);
      if (caseIds.length > 0) {
        familyEffectiveHoldout.set(family, (familyEffectiveHoldout.get(family) ?? 0) + weight);
      }
      if (developmentCaseIds.length > 0) {
        familyEffectiveDevelopment.set(
          family,
          (familyEffectiveDevelopment.get(family) ?? 0) + weight,
        );
      }
      const classCounts = familyEvidenceClasses.get(family) ?? {};
      classCounts[evidenceClass] = (classCounts[evidenceClass] ?? 0) + 1;
      familyEvidenceClasses.set(family, classCounts);
      familyCounted.set(family, (familyCounted.get(family) ?? 0) + 1);
      if (hasPropensity) {
        familyWithPropensity.set(family, (familyWithPropensity.get(family) ?? 0) + 1);
      }
      const captureCounts = familyCaptureCounts.get(family) ?? new Map<string, number>();
      captureCounts.set(captureRef, (captureCounts.get(captureRef) ?? 0) + 1);
      familyCaptureCounts.set(family, captureCounts);
      const delta = comparisonDelta(result);
      const observedAtMs = comparisonObservedAtMs(comparability, input.nowMs, ageMs);
      if (delta !== null && observedAtMs !== null) {
        const rows = familyObservations.get(family) ?? [];
        rows.push({ atMs: observedAtMs, delta });
        familyObservations.set(family, rows);
      }
    }
  }
  const byFamily: Record<
    string,
    {
      decisiveComparisons: number;
      holdoutComparisons: number;
      developmentComparisons: number;
      distinctCaptures: number;
      effectiveDecisiveComparisons: number;
      effectiveHoldoutComparisons: number;
      effectiveDevelopmentComparisons: number;
      effectiveSampleSize: number;
      maxCaptureShare: number | null;
      drift: number | null;
      evidenceClasses: Record<string, number>;
      hierarchy: {
        level: "task_family";
        fallbackLevel: "route_package" | null;
        effectiveN: number;
        priorMean: number | null;
        priorStrength: number;
        shrunkValue: number;
        confidence: number;
      };
      propensityCoverage: number;
      causalClaim: "observational" | "randomized";
    }
  > = {};
  for (const [family, groupIds] of familyDecisive) {
    const captureCounts = familyCaptureCounts.get(family) ?? new Map<string, number>();
    const captureTotal = [...captureCounts.values()].reduce((sum, count) => sum + count, 0);
    const maxCaptureShare =
      captureTotal > 0 ? roundWeight(Math.max(...captureCounts.values()) / captureTotal) : null;
    const observations = [...(familyObservations.get(family) ?? [])].sort(
      (left, right) => left.atMs - right.atMs,
    );
    const drift = (() => {
      if (observations.length < 4) return null;
      const half = Math.floor(observations.length / 2);
      const mean = (rows: { delta: number }[]) =>
        rows.reduce((sum, row) => sum + row.delta, 0) / rows.length;
      return roundWeight(
        Math.abs(mean(observations.slice(0, half)) - mean(observations.slice(half))),
      );
    })();
    // Run 99 R33 D4: shrink the family estimate toward the route-package prior, calibrated from the
    // *other* families only (a disjoint set), and record which level the estimate actually leans on.
    const ownObservations = familyObservations.get(family) ?? [];
    const mean = (rows: { delta: number }[]) =>
      rows.length ? rows.reduce((sum, row) => sum + row.delta, 0) / rows.length : 0;
    const ownMean = mean(ownObservations);
    const packagePrior = [...familyObservations.entries()]
      .filter(([otherFamily]) => otherFamily !== family)
      .flatMap(([, rows]) => rows);
    const priorMean = packagePrior.length > 0 ? mean(packagePrior) : null;
    const familyEffectiveN = familyEffectiveDecisive.get(family) ?? 0;
    const hierarchy = {
      level: "task_family" as const,
      fallbackLevel:
        priorMean !== null && familyEffectiveN < FAMILY_PRIOR_STRENGTH
          ? ("route_package" as const)
          : null,
      effectiveN: roundWeight(familyEffectiveN),
      priorMean: priorMean === null ? null : roundWeight(priorMean),
      priorStrength: FAMILY_PRIOR_STRENGTH,
      shrunkValue: roundWeight(
        priorMean === null
          ? ownMean
          : (ownMean * familyEffectiveN + priorMean * FAMILY_PRIOR_STRENGTH) /
              (familyEffectiveN + FAMILY_PRIOR_STRENGTH),
      ),
      confidence: roundWeight(
        Math.min(1, familyEffectiveN / (familyEffectiveN + FAMILY_PRIOR_STRENGTH)),
      ),
    };
    byFamily[family] = {
      decisiveComparisons: groupIds.length,
      holdoutComparisons: familyHoldout.get(family) ?? 0,
      developmentComparisons: familyDevelopment.get(family) ?? 0,
      distinctCaptures: familyCaptures.get(family)?.size ?? 0,
      effectiveDecisiveComparisons: roundWeight(familyEffectiveDecisive.get(family) ?? 0),
      effectiveHoldoutComparisons: roundWeight(familyEffectiveHoldout.get(family) ?? 0),
      effectiveDevelopmentComparisons: roundWeight(familyEffectiveDevelopment.get(family) ?? 0),
      effectiveSampleSize: roundWeight(familyEffectiveDecisive.get(family) ?? 0),
      maxCaptureShare,
      drift,
      evidenceClasses: { ...(familyEvidenceClasses.get(family) ?? {}) },
      hierarchy,
      // Run 99 R33 D6: observational unless every counted comparison carries a valid propensity.
      propensityCoverage: (() => {
        const counted = familyCounted.get(family) ?? 0;
        return counted > 0 ? roundWeight((familyWithPropensity.get(family) ?? 0) / counted) : 0;
      })(),
      causalClaim:
        (familyCounted.get(family) ?? 0) > 0 &&
        (familyWithPropensity.get(family) ?? 0) === (familyCounted.get(family) ?? 0)
          ? ("randomized" as const)
          : ("observational" as const),
    };
  }
  return {
    decisiveComparisons: decisiveGroupIds.length,
    holdoutComparisons,
    developmentComparisons,
    distinctCaptures: captures.size,
    caseManifestRef: `manifest:learning-pass:${decisiveGroupIds.length}:${
      [...captures].sort().join(",").length
    }`,
    byFamily,
    excludedByReason,
    effectiveDecisiveComparisons: roundWeight(effectiveDecisiveComparisons),
    effectiveHoldoutComparisons: roundWeight(effectiveHoldoutComparisons),
    effectiveDevelopmentComparisons: roundWeight(effectiveDevelopmentComparisons),
    comparable: {
      cases: comparableCases.size,
      candidates: [...comparableCandidates].sort().slice(0, 32),
      caseIds: [...comparableCases].sort().slice(0, 256),
      pairs: [...comparablePairs.entries()]
        .map(([key, comparisons]) => {
          const [sourceCandidateRef, counterfactualCandidateRef] = key.split("\u0000");
          return { sourceCandidateRef, counterfactualCandidateRef, comparisons };
        })
        .sort((left, right) => right.comparisons - left.comparisons)
        .slice(0, 32),
      missingPairs: (() => {
        const candidates = [...comparableCandidates].sort();
        const covered = new Set(
          [...comparablePairs.keys()].map((key) => key.split("\u0000").sort().join("\u0000")),
        );
        const missing: [string, string][] = [];
        for (let index = 0; index < candidates.length; index += 1) {
          for (let other = index + 1; other < candidates.length; other += 1) {
            const key = [candidates[index], candidates[other]].sort().join("\u0000");
            if (!covered.has(key)) missing.push([candidates[index], candidates[other]]);
          }
        }
        return missing.slice(0, 32);
      })(),
    },
  };
}

function evidenceAgeMs(comparability: Record<string, unknown>, nowMs: number): number | null {
  const observedAt = boundedText(comparability.observedAt) ?? boundedText(comparability.recordedAt);
  if (observedAt) {
    const parsed = Date.parse(observedAt);
    return Number.isFinite(parsed) ? Math.max(0, nowMs - parsed) : null;
  }
  const observedAtMs = comparability.observedAtMs;
  return Number.isSafeInteger(observedAtMs) && Number(observedAtMs) > 0
    ? Math.max(0, nowMs - Number(observedAtMs))
    : null;
}

/**
 * Run 99 R33 (addendum 21 D11): the per-family gate dimensions. `delta` is the observed
 * positive-minus-negative member score of one comparison, and the observation time is what the
 * temporal drift split needs.
 */
function comparisonDelta(result: Record<string, unknown>): number | null {
  const members = Array.isArray(result.members) ? result.members : [];
  const scored = members
    .map((member) => ({
      score: Number((member as Record<string, unknown>)?.score),
      disposition: String((member as Record<string, unknown>)?.disposition ?? ""),
    }))
    .filter((row) => Number.isFinite(row.score));
  const positives = scored.filter((row) => row.disposition === "positive").map((row) => row.score);
  const negatives = scored.filter((row) => row.disposition === "negative").map((row) => row.score);
  if (positives.length === 0 || negatives.length === 0) return null;
  const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
  return mean(positives) - mean(negatives);
}

function comparisonObservedAtMs(
  comparability: Record<string, unknown>,
  nowMs: number,
  ageMs: number | null,
): number | null {
  if (ageMs !== null) return Math.max(0, nowMs - ageMs);
  const observedAtMs = comparability.observedAtMs;
  return Number.isSafeInteger(observedAtMs) && Number(observedAtMs) > 0
    ? Number(observedAtMs)
    : null;
}

export interface TrackBLearningPassInput {
  readonly requestId: string;
  readonly channel: string;
  readonly scope: string;
  readonly authorizationEpoch: number;
  /** Run 99 R33: the task family of the capture this candidate was derived from. */
  readonly taskTypeId?: string | null;
  readonly taxonomyVersion?: string | null;
  /**
   * Run 98 addendum 58 §38: the taxonomy role the capture was classified under, so the receipt, the pack and
   * the attribution all carry the same scope dimensions the consumer resolved.
   */
  readonly roleId?: string | null;
  readonly candidateId: string;
  readonly routePackage: string;
  /**
   * Run 100 addendum 15 item 6, second half. Measured live on :3457 (2026-09-25): the scope's
   * `track-b\contracts\` directory held 2271 artifacts - 72 `RouteLearningValidationReceiptV1` and 23
   * `ExperiencePackCandidateV1` among them - and **zero** `RoutePackageAttributionV1`. The builder was
   * unit-tested with no caller on the path that promotes packs on real traffic, so the documented
   * attribution of a promoted package to the evidence behind it did not exist as an artifact.
   *
   * The descriptor is the caller's own rollout identity for the package the evidence is about (the
   * compared arm's endpoint and model). The pass never invents an endpoint or a model: a caller that
   * cannot name them gets no artifact and a bounded refusal line instead.
   */
  readonly routePackageDescriptor?: Readonly<{
    readonly endpointId: string;
    readonly modelId: string;
    readonly modelRevision?: string | null;
    readonly samplingProfileId?: string | null;
    readonly promptAdapterId?: string | null;
    readonly toolPolicyId?: string | null;
    readonly experiencePackId?: string | null;
  }> | null;
  /** The finalized comparison the candidate was derived from, as Evaluation Core returned it. */
  readonly finalizedComparison: Readonly<Record<string, unknown>>;
  readonly finalizedComparisonReceipt: Readonly<Record<string, unknown>>;
  readonly safetyReceipt: Readonly<Record<string, unknown>>;
  readonly provenance: Readonly<Record<string, unknown>>;
  readonly identity: Readonly<{ scorerSetVersion: string; judgeEndpointId: string | null }>;
  /**
   * Run 98 addendum 33 S2 (the research's Shi et al.: "a judge whose consistency is near chance should be
   * excluded from promotion evidence entirely"): the measured position consistency of the judge behind this
   * candidate's evidence, as the durable ledger reports it. The gate refuses the evidence when the judge is
   * measured below the configured floor and has enough order checks for that measurement to mean anything.
   */
  readonly judgeConsistency?: Readonly<{
    judgeEndpointId: string;
    orderChecks: number;
    orderDisagreements: number;
    consistency: number | null;
    sufficientSample: boolean;
    belowFloor: boolean;
  }> | null;
  readonly evidenceFloor?: Readonly<{
    minDecisiveComparisons: number;
    minHoldoutComparisons: number;
    minDistinctCaptures: number;
  }>;
  readonly guardrails?: Readonly<{ qualityMinDelta: number }>;
  readonly estimator?: Readonly<{ bootstrapSeed?: number; resamples?: number }>;
  /**
   * Run 98 R19: the predeclared promotion protocol the validation decides under. Callers pass the
   * effective policy; when omitted the pass declares `DEFAULT_PROMOTION_PROTOCOL` so a validation
   * is never taken without one.
   */
  readonly promotionProtocol?: Readonly<{
    protocolId: string;
    primaryMetricId: string;
    direction: "higher_is_better";
    minimumPracticalDelta: number;
    intervalLevel: number;
    resamples: number;
    bootstrapSeed: number;
    analysisMethod: "paired_cluster_bootstrap";
    selectionFamilySize: number;
    multiplicityAdjustment: "none" | "holm_bonferroni";
  }>;
  readonly evidenceMaxAgeMs?: number;
  /** Run 99 R33 D12: `evidenceHalfLifeDays` from the operator policy. */
  readonly evidenceHalfLifeDays?: number | null;
  readonly nowMs?: number;
  /** Promotion stays opt-in so a caller can record validation evidence without a pack. */
  readonly allowPromotion?: boolean;
  /** Compose the envelope the sidecar host expects (`{value, filePath, ...}`). */
  readonly envelope?: (
    capability: string,
    value: Record<string, unknown>,
  ) => Record<string, unknown>;
  /**
   * Run 98 R3: the packaged extension host externalizes a business result that exceeds the
   * inline cap (`evaluation:list-groups` on a live stage root answers with a durable-output
   * envelope). The caller supplies the host's own decoder so the pass reads the same list the
   * pipeline does; without it the pass silently counted zero decisive comparisons and refused
   * every candidate with `insufficient_evidence` (observed live on stage v86).
   */
  readonly decodeResult?: (extensionId: string, capability: string, raw: unknown) => unknown;
  /**
   * Run 113: where the documented contract artifacts for this learner's output belong.
   *
   * The emission used to live in the liveness sweep, but the pipeline (which runs on every supervised replay)
   * is the writer that actually produces receipts and packs on a live runtime - measured: three new receipts and
   * a new pack appeared at 07:55Z from the pipeline while `contracts\` still held zero
   * `ExperiencePackCandidateV1` / `RouteLearningValidationReceiptV1` files. Emitting here covers both callers
   * with one implementation. Omitted means "this caller does not persist contracts" (a unit test, a fixture).
   */
  readonly contractStateRoot?: string;
  /**
   * Run 98 R3: the same evidence-authority secret the derive call used. Without it the worker has
   * no authority to verify the durable comparison readback and safety receipts, and validation
   * fails closed with `verified durable comparison readback receipt required for validation`
   * (observed live on stage v83).
   */
  readonly evaluationAuthoritySecret?: string;
}

function defaultEnvelope(
  input: TrackBLearningPassInput,
  capability: string,
  value: Record<string, unknown>,
): Record<string, unknown> {
  return {
    requestId: `${input.requestId}:${capability}`,
    sessionId: input.requestId,
    protocolVersion: "1.1.0",
    channel: input.channel,
    scope: input.scope,
    authorizationEpoch: input.authorizationEpoch,
    capability,
    value,
  };
}

function decodeBusinessResult(
  result: unknown,
  extensionId: string,
  scopeId: string,
): Record<string, unknown> {
  const record = asRecord(result);
  if (!record) return {};
  const inner = asRecord(record.businessOutput);
  if (inner && record.durableLocator !== undefined) {
    const nested = asRecord((inner as Record<string, unknown>).value);
    return nested ?? inner;
  }
  const nested = asRecord(record.value);
  if (!("jobId" in record) && !("receipt" in record) && nested && extensionId && scopeId) {
    return nested;
  }
  return record;
}

/**
 * Runs one learning pass for one derived candidate. Throws for a programming error (missing
 * identity or evidence); the caller records a bounded degradation receipt in that case.
 */
export async function runTrackBLearningPass(
  runtime: TrackBLearningPassRuntime,
  input: TrackBLearningPassInput,
): Promise<Record<string, unknown>> {
  const candidateId = boundedText(input.candidateId);
  if (!candidateId) throw new Error("learning pass requires a derived candidate identity");
  const routePackage = boundedText(input.routePackage);
  if (!routePackage) throw new Error("learning pass requires the candidate route package");
  const scorerSetVersion = boundedText(input.identity?.scorerSetVersion);
  if (!scorerSetVersion) throw new Error("learning pass requires the scoring identity");
  const evaluationAuthoritySecret = boundedText(input.evaluationAuthoritySecret);
  if (!evaluationAuthoritySecret) {
    throw new Error("learning pass requires the evidence authority secret");
  }
  const envelope =
    input.envelope ?? ((capability, value) => defaultEnvelope(input, capability, value));
  const workerEnvelope = (capability: string, value: Record<string, unknown>) => ({
    ...envelope(capability, value),
    evaluationAuthoritySecret,
  });
  /**
   * Run 98 R3: the Knowledge Store reads `envelope.payload` (the worker reads
   * `envelope.value`), and it answers a bounded degradation receipt instead of throwing, so the
   * pass must both use the right field and verify the answer.
   */
  const storeEnvelope = (capability: string, payload: Record<string, unknown>) => ({
    ...envelope(capability, payload),
    payload,
  });
  const nowMs = input.nowMs ?? Date.now();
  const evidenceFloor = input.evidenceFloor ?? DEFAULT_LEARNING_EVIDENCE_FLOOR;
  const guardrails = input.guardrails ?? DEFAULT_LEARNING_GUARDRAILS;
  const promotionProtocol = { ...DEFAULT_PROMOTION_PROTOCOL, ...(input.promotionProtocol ?? {}) };

  /**
   * Run 107 P1: the evidence this gate counts is the whole durable comparison-group set, not the
   * first page of it. Reading one page silently truncated 443 of the 699 live groups, so a pack
   * could never reach `minDecisiveComparisons`; the reader now walks the capability's cursor.
   */
  const groups = (await collectPagedComparisonGroups({
    readPage: async cursor => {
      const rawGroups = await runtime.invoke(
        "evaluation-core",
        envelope("evaluation:list-groups", {
          page: true,
          limit: LEARNING_GROUP_PAGE_LIMIT,
          ...(cursor ? { cursor } : {}),
        }),
      );
      return input.decodeResult
        ? input.decodeResult("evaluation-core", "evaluation:list-groups", rawGroups)
        : Array.isArray(rawGroups)
          ? rawGroups
          : decodeBusinessResult(rawGroups, "evaluation-core", input.scope);
    },
  })) as TrackBLearningEvidenceGroup[];
  const evidenceSummary = buildTrackBLearningEvidenceSummary({
    groups,
    routePackage,
    nowMs,
    evidenceMaxAgeMs: input.evidenceMaxAgeMs ?? 30 * 24 * 60 * 60 * 1_000,
    // Run 99 R33 D12: `evidenceHalfLifeDays` from the operator policy decays the effective counts.
    evidenceHalfLifeDays: input.evidenceHalfLifeDays ?? DEFAULT_EVIDENCE_HALF_LIFE_DAYS,
  });
  const holdout = asRecord(input.finalizedComparison.holdout);
  const holdoutCaseIds = Array.isArray(holdout?.caseIds)
    ? holdout.caseIds.filter(
        (caseId): caseId is string => typeof caseId === "string" && caseId.length > 0,
      )
    : [];

  const validation = decodeBusinessResult(
    await runtime.invoke(
      "knowledge-worker",
      workerEnvelope("knowledge:validate-candidate", {
        candidateId,
        scope: {
          routePackage,
          channel: input.channel,
          scopeId: input.scope,
          ...(boundedText(input.taskTypeId) ? { taskTypeId: boundedText(input.taskTypeId) } : {}),
          ...(boundedText(input.taxonomyVersion)
            ? { taxonomyVersion: boundedText(input.taxonomyVersion) }
            : {}),
        },
        identity: {
          scorerSetVersion,
          judgeEndpointId: input.identity.judgeEndpointId ?? null,
        },
        evaluation: {
          environment: "local-routing-evaluation",
          provenance: { ...input.provenance },
          finalizedComparison: { ...input.finalizedComparison },
          finalizedComparisonReceipt: { ...input.finalizedComparisonReceipt },
          safetyReceipt: { ...input.safetyReceipt },
        },
        holdoutCaseIds,
        evidenceSummary,
        // Run 98 addendum 33 S2: the judge's measured position consistency travels with the evidence it
        // produced, so the gate can refuse a below-floor judge instead of promoting its preference.
        ...(input.judgeConsistency ? { judgeConsistency: { ...input.judgeConsistency } } : {}),
        evidenceFloor: { ...evidenceFloor },
        guardrails: { ...guardrails },
        // Run 98 R19: the protocol is declared before the holdout decision and the non-inferiority
        // margin is the quality guardrail bound the operator already configures.
        promotionProtocol: {
          ...promotionProtocol,
          nonInferiorityMargin: guardrails.qualityMinDelta,
        },
        estimator: {
          estimatorVersion: RUN98_LEARNING_ESTIMATOR_VERSION,
          bootstrapSeed: input.estimator?.bootstrapSeed ?? 0,
          resamples: input.estimator?.resamples ?? RUN98_LEARNING_DEFAULT_BOOTSTRAP_RESAMPLES,
        },
      }),
    ),
    "knowledge-worker",
    input.scope,
  );
  const receipt = asRecord(validation.receipt);
  const receiptId = boundedText(receipt?.receiptId);
  if (!receiptId || !receipt) {
    throw new Error("learning pass validation did not return a durable receipt");
  }
  const decision = boundedText(receipt.decision) ?? "insufficient_evidence";
  // Run 99 R33 S34 live finding (stage v137): the worker answers a family-scoped validation with
  // `familyEvidence` *beside* the receipt. Recording only the receipt left the durable learning
  // record family-free, so the operator readback could not attribute a validation to the family the
  // whole chain had just propagated (addendum 21 D11: the per-family receipt carries the canonical
  // gate dimensions). The evidence travels with the recorded receipt.
  const recordedFamilyEvidence = asRecord((validation as Record<string, unknown>).familyEvidence);

  // The validation receipt is durable learning evidence even when the decision is
  // `insufficient_evidence` or `reject`; recording it is how the operator sees why learning
  // did not promote instead of seeing silence.
  const recordValidationReceipt = async (): Promise<Record<string, unknown>> => {
    const answer = await runtime.invoke(
      "knowledge-store",
      storeEnvelope("knowledge:record-learning", {
        record: {
          recordId: receiptId,
          kind: "validation_receipt",
          state: decision,
          scopeId: input.scope,
          identity: {
            scorerSetVersion,
            judgeEndpointId: input.identity.judgeEndpointId ?? null,
          },
          record: {
            ...receipt,
            ...(recordedFamilyEvidence ? { familyEvidence: { ...recordedFamilyEvidence } } : {}),
          },
        },
      }),
    );
    const decoded = decodeBusinessResult(answer, "knowledge-store", input.scope);
    if (decoded.schemaVersion === "role-model.degradation-receipt.v1") {
      /**
       * Run 100 R4 idempotency (live finding, clean verification window 2026-09-22): the supervised
       * replay retried a request, the learner produced a validation receipt with the same durable
       * record id and richer evidence, and the store's immutability guard refused the write -
       * `learning pass declined:… knowledge store refused the validation receipt: immutable learning
       * record conflict: the record id already exists with different content`. The durable record is
       * the authority for that attempt, so the pass reads it back and continues instead of declining;
       * a store refusal for any other reason still fails the pass.
       */
      const refusalReason = String(decoded.reason ?? decoded.code ?? "unknown");
      if (/immutable learning record conflict/u.test(refusalReason)) {
        /**
         * The store refuses this write precisely because a durable record already exists for this id,
         * so the attempt *is* recorded - the pass continues with that durable record as the authority.
         * The readback below is diagnostic only: it is recorded when it succeeds and is never required,
         * because a store that answers `immutable learning record conflict` has already proven the
         * record exists (the clean-window re-run showed the readback can come back empty even then, and
         * that was turning a benign retry into a declined pass).
         */
        const durableRecordId = await runtime
          .invoke(
            "knowledge-store",
            storeEnvelope("knowledge:list-learning", {
              payload: { scopeId: input.scope, kind: "validation_receipt", limit: 200 },
            }),
          )
          .then((listed) => decodeBusinessResult(listed, "knowledge-store", input.scope))
          .then((listed) => {
            const rows = Array.isArray((listed as Record<string, unknown> | null)?.records)
              ? ((listed as Record<string, unknown>).records as Record<string, unknown>[])
              : Array.isArray(listed)
                ? (listed as unknown as Record<string, unknown>[])
                : [];
            return rows.some((row) => String(row?.recordId ?? row?.id ?? "") === receiptId);
          })
          .catch(() => false);
        return {
          recorded: true,
          idempotent: true,
          recordId: receiptId,
          state: decision,
          readbackConfirmed: durableRecordId,
        };
      }
      throw new Error(
        `knowledge store refused the validation receipt: ${refusalReason}`,
      );
    }
    return decoded;
  };
  const validationRecord = await recordValidationReceipt();
  /**
   * Run 113: the durable record is the runtime's own shape; the *contract* artifact is the documented
   * vocabulary, and this pass is the writer that actually produces receipts on a live runtime (the liveness
   * sweep only consumes what nobody else consumed). Emitting here is what makes the acceptance item "a
   * validationReceipt that passes its validator, with the artifact present" true on real traffic.
   */
  if (input.contractStateRoot) {
    try {
      emitTrackBContract({
        stateRoot: input.contractStateRoot,
        scopeId: input.scope,
        contract: buildRouteLearningValidationReceipt({
          receipt,
          channel: input.channel,
          scopeId: input.scope,
        }),
      });
    } catch (error) {
      console.error(
        `[run113] learning pass: validation receipt ${receiptId.slice(0, 24)} was not emitted as a contract: ${String(
          (error as { message?: unknown })?.message ?? error,
        ).slice(0, 200)}`,
      );
    }
  }

  let packId: string | null = null;
  let promoted = false;
  if (
    validation.promotionEligible === true &&
    decision === "validate" &&
    input.allowPromotion !== false
  ) {
    const promotion = decodeBusinessResult(
      await runtime.invoke(
        "knowledge-worker",
        workerEnvelope("knowledge:promote-candidate", {
          candidateId,
          validationReceiptId: receiptId,
          baselinePackId: boundedText(receipt.baselineId) ?? undefined,
        }),
      ),
      "knowledge-worker",
      input.scope,
    );
    const packCandidate = asRecord(promotion.packCandidate);
    packId = boundedText(packCandidate?.packId);
    if (!packId || !packCandidate) {
      throw new Error("learning pass promotion did not return a pack candidate");
    }
    promoted = true;
    const packAnswer = await runtime.invoke(
      "knowledge-store",
      storeEnvelope("knowledge:record-learning", {
        record: {
          recordId: packId,
          kind: "pack",
          state: boundedText(packCandidate.status) ?? "validated",
          scopeId: input.scope,
          identity: {
            scorerSetVersion,
            judgeEndpointId: input.identity.judgeEndpointId ?? null,
          },
          record: { ...packCandidate },
        },
      }),
    );
    const decodedPack = decodeBusinessResult(packAnswer, "knowledge-store", input.scope);
    if (decodedPack.schemaVersion === "role-model.degradation-receipt.v1") {
      throw new Error(
        `knowledge store refused the pack record: ${String(decodedPack.reason ?? decodedPack.code ?? "unknown")}`,
      );
    }
    /**
     * Run 113: the pack's durable record is the runtime's own shape (`scope.taxonomyVersion`, `familyEvidence`
     * and friends), and the documented `ExperiencePackCandidateV1` is closed - measured live, 24 of 98 pack
     * records failed their own validator on `/scope must NOT have additional properties`. The builder projects
     * the record onto the contract's members; the richer record stays in the store. Emitting here, on the pass
     * that actually promotes packs on live traffic, is what makes the artifact exist for real work rather
     * than only for the sweep that consumes a leftover backlog.
     */
    if (input.contractStateRoot) {
      try {
        emitTrackBContract({
          stateRoot: input.contractStateRoot,
          scopeId: input.scope,
          contract: buildExperiencePackCandidate({
            pack: packCandidate,
            channel: input.channel,
            scopeId: input.scope,
          }),
        });
      } catch (error) {
        console.error(
          `[run113] learning pass: pack ${packId.slice(0, 24)} was not emitted as a contract: ${String(
            (error as { message?: unknown })?.message ?? error,
          ).slice(0, 200)}`,
        );
      }
      /**
       * Run 100 addendum 16: the activation receipt belongs to the transition, and this is where the transition
       * happens - the pack was just promoted from its validation baseline. Measured 2026-09-25: the only activation
       * artifacts on disk were 658 synthetic `disabled` non-events emitted by the pipeline on every run
       * (`packageId === priorPackageId`), while the knowledge store held the real 18 active / 24 rolled-back
       * transitions. A receipt is emitted here only when the promotion actually moved the package: `state: "active"`,
       * the promoted pack as `packageId`, and the validation receipt's baseline as `priorPackageId`.
       */
      const priorPackageId = boundedText(receipt.baselineId) ?? "";
      if (priorPackageId && priorPackageId !== packId) {
        try {
          emitTrackBContract({
            stateRoot: input.contractStateRoot,
            scopeId: input.scope,
            contract: buildRoutePackageActivationReceipt({
              receiptId: `activation:${packId}`,
              packageId: packId,
              /**
               * Measured while landing this (addendum 16): the closed contract's union validator accepts an
               * activation receipt only when the scope carries at least one member *and* a `validationReceiptId` is
               * present - the TypeScript interface marks both optional, so the schema is the stricter authority. An
               * empty scope is what the synthetic pipeline receipts would have produced; the fallback keeps the
               * artifact in the vocabulary the contract defines.
               */
              scope: {
                taskTypeId: boundedText(input.taskTypeId) ?? "task:route-selection",
                ...(boundedText(input.taxonomyVersion)
                  ? { taxonomyVersion: boundedText(input.taxonomyVersion) }
                  : {}),
              },
              policyGateId: "gate:route-package-activation",
              priorPackageId,
              state: "active",
              validationReceiptId: receiptId,
              channel: input.channel,
              scopeId: input.scope,
              activatedAtMs: Date.now(),
            }),
          });
        } catch (error) {
          console.error(
            `[run139] learning pass: activation receipt for ${packId.slice(0, 24)} was not emitted as a contract: ${String(
              (error as { message?: unknown })?.message ?? error,
            ).slice(0, 600)}`,
          );
        }
      }
      /**
       * Run 100 addendum 15 item 6, second half: the attribution is the artifact that binds a promoted
       * package to the route package the evidence was gathered for and to the numbers the gate decided on.
       * Every member is durable evidence - the validation receipt the promotion consumed (`caseManifestRef`,
       * `qualityDelta`, `confidenceLower`, `holdoutSampleCount`, `baselineId`) plus the caller's own rollout
       * identity - and a missing member refuses the artifact by name instead of publishing a claim nobody
       * can check. The refusal is logged, never thrown: a contract write must not fail a promotion.
       */
      const attributionDescriptor = input.routePackageDescriptor ?? null;
      const attributionEndpointId = boundedText(attributionDescriptor?.endpointId);
      const attributionModelId = boundedText(attributionDescriptor?.modelId);
      const attributionBaselineId = boundedText(receipt.baselineId);
      const attributionManifestRef = boundedText(receipt.caseManifestRef);
      const attributionQualityDelta = boundedNumber(receipt.qualityDelta);
      const attributionConfidence = boundedNumber(receipt.confidenceLower);
      const attributionSampleCount = boundedNumber(receipt.holdoutSampleCount);
      const attributionRefusal =
        !attributionEndpointId || !attributionModelId
          ? "the caller did not resolve the promoted package's endpoint and model"
          : !attributionManifestRef
            ? "the validation receipt carries no case manifest reference"
            : !attributionBaselineId
              ? "the validation receipt carries no baseline package"
              : attributionQualityDelta === null
                ? "the validation receipt carries no measured quality delta"
                : attributionConfidence === null
                  ? "the validation receipt carries no confidence lower bound"
                  : attributionSampleCount === null
                    ? "the validation receipt carries no holdout sample count"
                    : null;
      if (attributionRefusal) {
        console.error(
          `[run150] learning pass: attribution for ${packId.slice(0, 24)} was not emitted: ${attributionRefusal}`,
        );
      } else if (
        attributionEndpointId &&
        attributionModelId &&
        attributionBaselineId &&
        attributionManifestRef &&
        attributionQualityDelta !== null &&
        attributionConfidence !== null &&
        attributionSampleCount !== null
      ) {
        try {
          const promptAdapterId = boundedText(attributionDescriptor?.promptAdapterId);
          const toolPolicyId = boundedText(attributionDescriptor?.toolPolicyId);
          const experiencePackId = boundedText(attributionDescriptor?.experiencePackId);
          const roleId = boundedText(input.roleId);
          emitTrackBContract({
            stateRoot: input.contractStateRoot,
            scopeId: input.scope,
            contract: buildRoutePackageAttribution({
              attributionId: `attribution:${packId}`,
              routePackage: {
                packageId: packId,
                endpointId: attributionEndpointId,
                modelId: attributionModelId,
                /**
                 * The runtime's endpoints and catalog entries declare no model revision, so the honest
                 * value is the one the closed contract's required member can carry: "unversioned" says the
                 * arm's identity is its endpoint and model, not a model snapshot the runtime cannot attest.
                 * A caller that knows a revision passes it through unchanged.
                 */
                modelRevision: boundedText(attributionDescriptor?.modelRevision) ?? "unversioned",
                samplingProfileId:
                  boundedText(attributionDescriptor?.samplingProfileId) ?? "unversioned",
                ...(promptAdapterId ? { promptAdapterId } : {}),
                ...(toolPolicyId ? { toolPolicyId } : {}),
                ...(experiencePackId ? { experiencePackId } : {}),
              },
              /**
               * The closed `$defs.scope` accepts taxonomy/route identity members only - measured live while
               * landing the pack emission, a record carrying `taxonomyVersion` in its scope failed
               * `/scope must NOT have additional properties`. The attribution therefore carries the family,
               * the endpoint and the role the evidence belongs to, and nothing the scope cannot hold.
               */
              scope: {
                taskTypeId: boundedText(input.taskTypeId) ?? "task:route-selection",
                endpointId: attributionEndpointId,
                ...(roleId ? { roleId } : {}),
                ...(promptAdapterId ? { promptAdapterId } : {}),
              },
              baselinePackageId: attributionBaselineId,
              qualityDelta: attributionQualityDelta,
              /**
               * The receipt records a quality comparison only. This path measures no per-comparison cost or
               * latency delta, so both stay at the contract's zero rather than at a number nobody measured.
               */
              costDelta: 0,
              latencyDelta: 0,
              sampleCount: Math.max(0, Math.trunc(attributionSampleCount)),
              /**
               * The gate's own floor is `confidenceLower`, so that is the confidence the artifact reports:
               * a reader can reproduce the promotion decision from the artifact and the receipt.
               */
              confidence: attributionConfidence,
              evidenceManifestRef: attributionManifestRef,
              channel: input.channel,
              scopeId: input.scope,
              createdAtMs: Date.now(),
            }),
          });
        } catch (error) {
          console.error(
            `[run150] learning pass: attribution for ${packId.slice(0, 24)} was not emitted as a contract: ${String(
              (error as { message?: unknown })?.message ?? error,
            ).slice(0, 600)}`,
          );
        }
      }
    }
  }

  return {
    schemaVersion: RUN98_LEARNING_PASS_SCHEMA,
    candidateId,
    routePackage,
    decision,
    validationReceiptId: receiptId,
    evidenceSummary,
    evidenceFloor: { ...evidenceFloor },
    guardrails: { ...guardrails },
    identity: {
      scorerSetVersion,
      judgeEndpointId: input.identity.judgeEndpointId ?? null,
    },
    packId,
    promoted,
    validationRecord: asRecord(validationRecord) ?? null,
    productionEffects: {
      providerCalls: 0,
      promptMutations: 0,
      routeMutations: 0,
      weightMutations: 0,
      activeProfileMutations: 0,
    },
  };
}
