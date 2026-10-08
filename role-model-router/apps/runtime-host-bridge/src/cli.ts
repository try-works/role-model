import { spawn } from "node:child_process";
import { createHash, createPublicKey, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { parseArgs } from "node:util";

import type { NormalizedCatalog } from "@role-model-router/catalog";
import type { EndpointRegistryResult } from "@role-model-router/endpoint-registry";

import {
  type DevelopmentVerificationAuthorization,
  negotiateDevelopmentVerificationCapability,
  parseDevelopmentVerificationTrustMaterial,
} from "./development-verification.js";
// Run 100 addendum `evaluation-lease-wedge-repair.addendum-02` S3: a give-up must terminalize the
// evaluation half of the handoff too, or the row stays "in flight" with no lease forever.
import { terminalizeAbandonedEvaluation } from "./evaluation-orphan-terminalization.js";
import {
  type CreateRuntimeBridgeBackendOptions,
  type RuntimeBridgeBackend,
  type RuntimeOperatorContext,
  type StartBridgeServerOptions,
  createRuntimeBridgeBackend,
  resolveBridgeServerOptions,
  startBridgeServer,
} from "./index.js";
import { validateRun88PrivateDistributionIdentity } from "./kw-private-loader.js";
import {
  describeRouterPolicyResolution,
  readLearningPolicyFile,
  resolveLearningPolicyStateRoot,
} from "./learning-policy-file.js";
import { readRouteLearningDefaults } from "./product-defaults-file.js";
import { readRouteLadderCensus } from "./route-ladder-census.js";
import {
  CURRENT_RUNTIME_CHANNEL_VERSION,
  PREVIOUS_RUNTIME_CHANNEL_VERSION,
  type RuntimeChannel,
  type RuntimeChannelContext,
  type RuntimeChannelProfile,
  negotiateRuntimeChannelStartup,
  readPackagedRuntimeProfile,
} from "./runtime-channel.js";
import { migrateLegacyProductionState } from "./runtime-state-migration.js";
import { resolveRun88StageRuntimeIdentity } from "./runtime-version.js";
import {
  HANDOFF_EVIDENCE_HOLD_TTL_MS,
  HANDOFF_EVIDENCE_OUTSIDE_RETENTION_WINDOW,
  HandoffEvidenceUnavailableError,
  createSupervisedReplayEvaluationResumeStore,
  handoffEvidenceHoldRequestIds,
  resolveSupervisedReplayEvaluationResumePath,
  resumePendingSupervisedReplayEvaluations,
  // Run 101 R5: scope the resume pass to the single handoff an evaluation job names.
  scopeResumeStoreToReplayJob,
} from "./supervised-replay-evaluation-resume.js";
// Run 100 addendum `replay-dispatch-lifecycle.addendum-04` S7: a replay that handed its branches off and was
// interrupted before its evaluation job existed is recovered from the durable job itself.
import {
  type DurableReplayJobSummary,
  MAX_HANDOFF_RECOVERY_CHECKS_PER_SWEEP,
  MAX_HANDOFF_RECOVERY_LIST_PAGE,
  type RecoveryPageCursor,
  branchCaptureRequestIdCandidatesFromJob,
  branchCaptureRequestIdsFromJob,
  captureRefFromReplayJob,
  carriedEvaluationJobId,
  coerceDurableReplayJobRecord,
  describeUnresolvedArms,
  nextHandoffRecoveryCursor,
  recoveredHandoffEntry,
  resolveDurableReplayJobScope,
  resolveResumedArmEvidence,
  selectRecoverableHandoffs,
  selectUnevaluatedHandoffs,
  terminalRecoveryListingValue,
  unresolvedArmsArePermanent,
  unwrapCapabilityPayload,
} from "./supervised-replay-handoff-recovery.js";
/**
 * How many handed-off replays one liveness sweep may recover. Each recovery is one extension listing plus a
 * durable store write, and the completion they feed is the expensive part, so the pass stays bounded like the
 * abandoned-entry drain (addendum 04 S5).
 */
const MAX_HANDOFF_RECOVERIES_PER_SWEEP = 3;
/** How often the handed-off-replay recovery pass may list the durable jobs (measured on the live root). */
const HANDOFF_RECOVERY_INTERVAL_MS = 120_000;
import { evaluationAttemptOutcome } from "./queue-runtime/evaluation.js";
// Run 101 R4: the replay plane's queue runtime (policy-driven mode, offer and
// worker). Imported here so the auto-replay loop's composition can start it.
import {
  startEvaluationQueueRuntime,
  startLearnerQueueRuntime,
  startReplayQueueRuntime,
} from "./queue-runtime/index.js";
import {
  autoReplayExecutionFromCommandReceipt,
  decodeRouteLadderRow,
  evaluationHandoffRequestFromCommandReceipt,
  offerEvaluationHandoff,
  offerRecordedEvaluationHandoff,
  startAutoReplayLoop,
} from "./track-b-auto-replay-runtime.js";
import {
  buildAutoReplayIdempotencyKey,
  dedupeJudgeAgainstPair,
  isReplayInFlightFailure,
  isReplayJobLeasedFailure,
  replayDispatchCaptureToken,
  resolveAutoReplayDeadlineMaxMs,
  resolveAutoReplayDeadlineMs,
  resolveAutoReplayDeadlinePerCandidateMs,
  resolveAutoReplayReservationTtlMs,
  resolveAutoReplayTickBudgetMs,
  resolveReplayJudgeFallbackEndpointIds,
  resolveReplayProviderCallBudget,
  retryLeasedReplayDispatch,
} from "./track-b-auto-replay.js";
import { createJudgeConsistencyLedger } from "./track-b-judge-consistency.js";
import {
  DEFAULT_POSITION_CONSISTENCY_FLOOR,
  evaluateJudgePositionConsistency,
} from "./track-b-judge-consistency.js";
import { createTrackBOperations } from "./track-b-operations.js";
// Run 98 addendum 34 S1: coverage-driven pair planning for the comparison graph.
import { createPairCoverageLedger, pairKey, planPairComparisons } from "./track-b-pair-coverage.js";
import {
  deriveAutomaticReplayCriteria,
  extractSourceOutputText,
  extractTaskInstructionText,
} from "./track-b-replay-evaluation-criteria.js";
import {
  type ReplayLedgerLimits,
  createReplayLedger,
  replayBudgetAvailable,
  resolveReplayLedgerLimits,
} from "./track-b-replay-ledger.js";
import {
  type ReplayCandidateRejection,
  buildReplayPolicySet,
  classifyReplayArmEffort,
  decideReplayAdmission,
  hasRecordedToolResults,
  hasToolCalls,
  isBenchmarkReplaySourceRef,
  isSyntheticProbeSourceClass,
  planReplayDispatchArms,
  preferEffortMatchedReplayArms,
  readReplayRequestRequirements,
  replayBudgetEnforcedForChannel,
  resolveReplayPolicySet,
  resolveReplayToolPolicy,
  selectReplayCandidates,
} from "./track-b-replay-policy.js";

/**
 * Run 100 phase-5 repair (operator instruction 2026-09-21: "the daily dispatch ceiling is only for the
 * production release, not for dev or stage, disregard it").
 *
 * Live stage evidence 2026-09-22T06:26Z: the verification window reached `dispatches 296 /
 * dispatchLimit 300` and deferred eight captures as `budget_exhausted`, so the learning loop starved
 * itself on a delivery guard. The ledger keeps its accounting on every channel; only the refusal is
 * scoped, by the versioned `replayBudgetEnforcement` policy (`production_only` by default).
 *
 * Precedence: an explicit `ROLE_MODEL_REPLAY_BUDGET_ENFORCEMENT` env value is an operator act at the
 * process boundary and wins; otherwise the versioned policy plus the runtime channel decides. A policy
 * source that cannot be read resolves through `readLearningPolicyFile` to the base route, whose
 * `production_only` default keeps production guarded.
 */
/**
 * Run 100 addendum 15 item 6: the learner sweep promotes packs for candidates whose comparison was
 * finalized by the extension's own sweeps, and it holds the route package (an endpoint id) but not the
 * model behind it. The endpoint registry is the durable authority for that mapping - `<stateRoot>/<scopeId>/
 * memory/memory.sqlite`, the same location the public runtime adapter is configured with - so the lookup
 * reads it and answers `null` when the endpoint is unknown (the emitter then refuses the artifact by name
 * rather than attributing the evidence to a model nobody recorded).
 */
function readEndpointModelIdForRoutePackage(input: {
  readonly runtimeStateRoot: string;
  readonly scopeId: string;
  readonly routePackage: string;
}): string | null {
  const routePackage = input.routePackage.trim();
  if (!routePackage) return null;
  const databasePath = path.join(input.runtimeStateRoot, input.scopeId, "memory", "memory.sqlite");
  if (!existsSync(databasePath)) return null;
  let database: DatabaseSync | null = null;
  try {
    database = new DatabaseSync(databasePath, { readOnly: true });
    const row = database
      .prepare("SELECT model_id FROM runtime_endpoints WHERE endpoint_id = ?")
      .get(routePackage) as { model_id?: unknown } | undefined;
    return typeof row?.model_id === "string" && row.model_id.trim() ? row.model_id.trim() : null;
  } catch {
    return null;
  } finally {
    database?.close();
  }
}

/**
 * Run 100 addendum 19 (item 8c, measured live 2026-09-25). The auto-replay tick's judge goes through the
 * in-process `readControllerAssignment` binding, and the narrow options object the loop is started with
 * does not always carry that binding - so the tick's judge resolved to nothing while the durable row was
 * present and correct. The measured cost: 30 of the 64 replay jobs created in 24 h were planned with
 * `deepseek…flash-high` (the configured controller, therefore the judge) as their **source** arm, and the
 * tick's named deferral for exactly that shape, `judge_candidate_overlap`, has never appeared in 5804
 * dispositions. Those comparisons are the ones Evaluation Core later excludes as `judge_self_evaluation`.
 *
 * The durable assignment is the fallback the run's addendum names ("last known assignment rather than a
 * per-tick read"): a scope-specific row wins over the global one, and an absent database, table or row
 * answers null so the tick behaves exactly as before.
 */
/**
 * Run 100 addendum 16 item 8d (delegated census, 2026-09-25): a supervised-replay branch capture id must be
 * unique per attempt, because the capture boundary keys idempotency on the capture request id and refuses the
 * same key carrying different bytes. Measured live on `req-f8020a96…`: the *prepared* branch id carries the
 * attempt token and was re-presented idempotently (8 572 ms), while the **failure** branch id — the only
 * sibling without a token — was refused 6 ms later with "route capture idempotency key was reused with
 * different immutable bytes". All five live hits that day were `-failure` ids while no two jobs shared a key
 * (1860 jobs, 0 duplicates), so the conflict was re-attempt bytes under a stable id.
 */
export function supervisedReplayBranchCaptureRequestId(input: {
  readonly requestId: string;
  readonly candidateEndpointId: string;
  readonly phase: "prepared" | "failure";
  readonly attemptToken: string;
  /**
   * Run 100 addendum 24 §1 residual (measured 08:58:17Z on run159): a per-attempt id was not enough —
   * `req-0071aa21…` presented `…-failure-26a1d43a7a29` twice with different bytes during one attempt (the
   * job sits in `failure_append_pending`, so a recovery re-append changed the payload). The tag recognises
   * the payload, so identical retries stay idempotent under one key and changed bytes get their own.
   */
  readonly contentTag?: string | null;
}): string {
  const candidateHash = createHash("sha256")
    .update(input.candidateEndpointId)
    .digest("hex")
    .slice(0, 16);
  const contentTag =
    typeof input.contentTag === "string" && input.contentTag.trim().length > 0
      ? `-${input.contentTag.trim().slice(0, 16)}`
      : "";
  return `replay-${input.requestId}-${candidateHash}-${input.phase}-${input.attemptToken}${contentTag}`;
}

/**
 * Run 100 addendum 28 §2 follow-up (measured on run162): the existence pre-check must accept only an answer
 * that *proves* the row is there. The host answers a failed or degraded read with a degradation receipt, and
 * reading any object as "exists" made the pass cancel rows the same store then reported missing — the
 * `invoke-failed … evaluation job not found` stream continued. A real job answer carries a job identity, and a
 * large-but-present job arrives behind the extension's externalization marker; anything else is *unknown*
 * (`null`), which keeps the previous behaviour instead of skipping a row that may exist.
 */
/**
 * Run 100 addendum 31 — item 8's `capture_missing` class, measured on the live store 2026-09-25.
 *
 * The handoff-recovery pass reads each arm's branch capture through the operations boundary and reports
 * `capture_missing(<requestId>)` when that read answers nothing (1-2 lines per build window, e.g.
 * `[run101] resumed handoff … could not read 3 arm(s): …=capture_missing(replay-req-0673e0e4-…)`). Measured
 * against the same request id, the capture queue's own durable receipt store holds **three** receipts with
 * `status: "captured"` and a ~6 KB record naming the arm's endpoint, model, effort and classification.
 *
 * The evidence is therefore not gone; the boundary read cannot see it. This reader returns the capture the
 * queue already wrote, so an arm whose capture is durably recorded is no longer reported missing — and it
 * answers `null` (never throws) for an unknown id, a malformed receipt or an absent store, so a caller can use
 * it as a fallback without changing the previous behaviour.
 */
export function readRouteCaptureFromQueueReceipt(input: {
  readonly runtimeStateRoot: string;
  readonly scopeId: string;
  readonly requestId: string;
}): Record<string, unknown> | null {
  const requestId = typeof input.requestId === "string" ? input.requestId.trim() : "";
  if (!requestId) return null;
  const databasePath = path.join(
    input.runtimeStateRoot,
    input.scopeId,
    "track-b",
    "deferred-route-captures.sqlite",
  );
  if (!existsSync(databasePath)) return null;
  let database: DatabaseSync | null = null;
  try {
    database = new DatabaseSync(databasePath, { readOnly: true });
    const row = database
      .prepare("SELECT result_json FROM track_b_route_capture_receipts WHERE request_id = ?")
      .get(requestId) as { result_json?: unknown } | undefined;
    const text = typeof row?.result_json === "string" ? row.result_json : "";
    if (!text) return null;
    const parsed = JSON.parse(text) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const record = parsed as Record<string, unknown>;
    /**
     * Two shapes live in that column: the queue's own `{status: "delivered", result: {…}}` envelope, and a
     * bare capture record written by an older producer. Both are accepted; anything without a request id is
     * not a capture and answers null.
     */
    const inner =
      record.result && typeof record.result === "object" && !Array.isArray(record.result)
        ? (record.result as Record<string, unknown>)
        : record;
    return typeof inner.requestId === "string" && inner.requestId.trim().length > 0 ? inner : null;
  } catch {
    return null;
  } finally {
    database?.close();
  }
}

/**
 * Run 101 addendum 35 - the durable job record inside whatever envelope the `replay:job` capability answered
 * with, or `null` when the answer holds no job.
 *
 * Measured live on the packaged stage RC (private `cd81be60`) on `:3457`, 2026-09-28: replay job
 * `09879d72…` appended both branches (`status: "complete"`, 2 provider calls, 218 micros) and then failed 77 s
 * after it was created with
 *
 *   evaluation_unavailable: handoff evidence is outside the capture retention window:
 *     …gpt-5.6-luna=capture_missing(replay-req-830b5d12-…-0b80e687b109b193-branch),
 *     …gpt-5.6-sol-medium=capture_missing(replay-req-830b5d12-…-c32d4671cc928618-branch)
 *
 * Both ids are the *pre-S9* derivation, which no producer writes. The job itself names the captures the arms
 * wrote (`result.branchRequestId` / `result.providerResultRef` on each dispatch), and both of those captures
 * were present in the store and accepted by `readRouteCaptureFromQueueReceipt`'s shape check.
 *
 * The completion read `answer.dispatches` directly, and the packaged extension host answers inside a
 * durable-output envelope (`{value, businessOutput:{value}, durableLocator}`), so `dispatches` was `undefined`,
 * the candidate list collapsed to the single legacy name, and an arm whose evidence was present was disposed as
 * evicted. The recovery sweep already decodes this envelope (`decodeExternalizedOperatorReadback` ->
 * `coerceDurableReplayJobRecord`); this is the same decode, for the completion.
 */
export function resolveResumedHandoffJobRecord(input: {
  readonly answer: unknown;
  readonly stateRoot: string;
  readonly scopeId?: string | null;
}): Record<string, unknown> | null {
  return coerceDurableReplayJobRecord(
    decodeExternalizedOperatorReadback({
      stateRoot: input.stateRoot,
      scopeId: input.scopeId ?? null,
      value: input.answer,
    }),
  );
}

export function evaluationJobExistsFromGetJobAnswer(answer: unknown): boolean | null {
  if (answer === null || answer === undefined) return false;
  /**
   * A serialized job record (the host's business-output shape for this capability) proves the row is there just
   * as an object one does.
   */
  if (typeof answer === "string") {
    const text = answer.trim();
    if (!text.startsWith("{")) return null;
    try {
      const parsed = JSON.parse(text) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
      const record = parsed as Record<string, unknown>;
      return typeof record.status === "string" && record.status.trim() ? true : null;
    } catch {
      return null;
    }
  }
  if (typeof answer !== "object" || Array.isArray(answer)) return null;
  const record = answer as Record<string, unknown>;
  const schemaVersion = typeof record.schemaVersion === "string" ? record.schemaVersion : "";
  if (schemaVersion.startsWith("role-model.degradation-receipt")) return null;
  /**
   * A *record* proves the row exists: it carries an identity **and** a status. Measured on run163, a bare
   * `jobId` is not proof — a failure or degradation envelope can echo the requested id back with no row behind
   * it, which is exactly how the pass came to cancel rows the store then reported missing.
   */
  if (
    typeof record.jobId === "string" &&
    record.jobId.trim().length > 0 &&
    typeof record.status === "string" &&
    record.status.trim().length > 0
  ) {
    return true;
  }
  if (
    typeof record.outputKey === "string" ||
    typeof record.resultHash === "string" ||
    typeof record.durableLocator === "object"
  ) {
    return true;
  }
  return null;
}

/**
 * Run 100 (evaluation audit): the same `evaluation:get-job` answer also carries the durable status, which is what
 * lets the give-up path recognise a row the store already reports terminal instead of paying for a cancel the
 * extension must refuse (156 per start, 312 log lines, measured). A large-but-present job comes back behind the
 * extension's externalization marker, so the status is read from the record, from its `businessOutput`, or from
 * `businessOutput.value` — and an answer that carries no status at all is *unknown* (`undefined`), which keeps
 * the previous behaviour rather than suppressing a cancel that may be needed.
 */
export function evaluationJobStatusFromGetJobAnswer(answer: unknown): string | null | undefined {
  /**
   * Run 170 follow-up (measured: the short-circuit did not suppress the stream): a business result crossing the
   * packaged extension host arrives as `businessOutput`, and for this capability that is a **JSON string** — the
   * same shape `decodeExtensionTextOutput` documents. Look through the serialization before reading fields.
   */
  const parseSerialized = (value: unknown): Record<string, unknown> | undefined => {
    if (typeof value !== "string") return undefined;
    const text = value.trim();
    if (!text.startsWith("{")) return undefined;
    try {
      const parsed = JSON.parse(text) as unknown;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : undefined;
    } catch {
      return undefined;
    }
  };
  const resolveRecord = (value: unknown): Record<string, unknown> | undefined => {
    const serialized = parseSerialized(value);
    if (serialized) return serialized;
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : undefined;
  };
  if (answer === null || answer === undefined) return null;
  const record = resolveRecord(answer);
  if (!record) return undefined;
  const schemaVersion = typeof record.schemaVersion === "string" ? record.schemaVersion : "";
  if (schemaVersion.startsWith("role-model.degradation-receipt")) return undefined;
  const statusOf = (value: unknown): string | undefined => {
    const candidate = resolveRecord(value);
    if (!candidate) return undefined;
    const status = candidate.status;
    return typeof status === "string" && status.trim() ? status.trim() : undefined;
  };
  /**
   * Measured on run172: the live answer is a **pair of nested externalization markers** — the outer record's
   * `businessOutput` is itself a marker — so the status sits one or more envelope layers down. Walk
   * `businessOutput`/`value` up to a bounded depth and read the status at any layer; a locator that never
   * reaches a record stays unknown rather than guessed.
   */
  const MAX_ENVELOPE_DEPTH = 6;
  let current: Record<string, unknown> | undefined = record;
  for (let depth = 0; depth < MAX_ENVELOPE_DEPTH && current; depth += 1) {
    const status = statusOf(current);
    if (status) return status;
    const next: Record<string, unknown> | undefined =
      resolveRecord(current.businessOutput) ??
      resolveRecord((current.businessOutput as Record<string, unknown> | undefined)?.value) ??
      resolveRecord(current.value);
    current = next && next !== current ? next : undefined;
  }
  return undefined;
}

export function readPersistedControllerEndpointId(input: {
  readonly runtimeStateRoot: string;
  readonly scopeId: string;
}): string | null {
  const databasePath = path.join(input.runtimeStateRoot, input.scopeId, "memory", "memory.sqlite");
  if (!existsSync(databasePath)) return null;
  let database: DatabaseSync | null = null;
  try {
    database = new DatabaseSync(databasePath, { readOnly: true });
    const row = database
      .prepare(
        "SELECT endpoint_id FROM runtime_controller_assignments WHERE scope = ? OR scope = 'global' ORDER BY CASE WHEN scope = ? THEN 0 ELSE 1 END, updated_at_ms DESC LIMIT 1",
      )
      .get(input.scopeId, input.scopeId) as { endpoint_id?: unknown } | undefined;
    return typeof row?.endpoint_id === "string" && row.endpoint_id.trim()
      ? row.endpoint_id.trim()
      : null;
  } catch {
    return null;
  } finally {
    database?.close();
  }
}

function resolveChannelScopedReplayLedgerLimits(input: {
  readonly repoRoot: string;
  readonly runtimeStateRoot: string;
  readonly scopeId: string;
  readonly channel: string;
}): Partial<ReplayLedgerLimits> {
  const resolved = resolveReplayLedgerLimits();
  if (resolved.enforced !== undefined) return resolved;
  const snapshot = readLearningPolicyFile({
    repoRoot: input.repoRoot,
    stateRoot: resolveLearningPolicyStateRoot({
      runtimeStateRoot: input.runtimeStateRoot,
      scopeId: input.scopeId,
    }),
    channel: input.channel,
    scopeId: input.scopeId,
  });
  return {
    ...resolved,
    enforced: replayBudgetEnforcedForChannel(
      // A missing policy source falls through to the documented default scoping (production only).
      snapshot?.effective.replayBudgetEnforcement,
      input.channel,
    ),
  };
}
import { createFinalizedGroupListingCache } from "./finalized-group-listing-cache.js";
import {
  buildExperiencePackCandidate,
  buildRouteLearningValidationReceipt,
  emitRoutePackageAttributionForPromotion,
  emitTrackBContract,
} from "./track-b-contract-emission.js";
import {
  type LearnerDerivationEvidenceRead,
  type LearnerDerivationInvoke,
  analyzeFinalizedEvaluationSignal,
  deriveLearnerCandidatesFromDurableEvidence,
  durableReplayIdForComparison,
  learnableComparisonMembers,
  normalizedComparisonGroup,
  orderComparisonGroupsNewestFirst,
  readPersistedSignalReportForGroup,
} from "./track-b-learner-derivation.js";
import {
  DEFAULT_EVIDENCE_HALF_LIFE_DAYS,
  LEARNING_GROUP_PAGE_LIMIT,
  activationStageAllowsPackActivation,
  assembleDurableLearnerValidationValue,
  buildTrackBLearningEvidenceSummary,
  classifyPackActivationAnswer,
  collectPagedComparisonGroups,
  selectDurableComparisonGroupId,
  serveLearnerSweepRetrieval,
} from "./track-b-learning-pass.js";
import {
  TRACK_B_CANONICAL_EXTENSION_IDS,
  type TrackBExtensionClosure,
  assertProductionExtensionRuntimeReady,
  buildReplayDispatchMessages,
  classifyReplayTerminalizationFailure,
  createOwnedTrackBSidecarSpec,
  createPackagedProductionRuntime,
  createProductionExtensionRuntime,
  createReplayAuthorizationNonceStore,
  createReplayIntentScheduler,
  createReplaySourceAttestation,
  createRouterReplayAdapter,
  createRun88RuntimeCorrelation,
  createRuntimeRequestCorrelationId,
  createSingleFlightBackgroundDrain,
  createSupervisedReplayEvaluationRequestId,
  createTrackBPostObservationOutbox,
  decodeExternalizedOperatorReadback,
  digestTrackBSemanticEvaluationCriteria,
  evaluateProductionExtensionRuntimeReadiness,
  normalizeTrackBSemanticEvaluationCriteria,
  readTrackBAdvisoryMeasurement,
  readTrackBRouteAdvisorySourceFromRuntime,
  rememberTrackBDurableRouteAdvisory,
  requireReplayRouterDecisionId,
  resolveDurableEvaluationAuthority,
  resolveManagedArtifactKeyFiles,
  runSupervisedReplay,
  runTrackBPostObservation,
  runTrackBPostObservationWithContribution,
  runTrackBShadowPipeline,
  trackBDistributionRequiresSQLiteMaintenance,
  validateProductionExtensionSet,
  validateRecoveredReplayCapture,
  validateRun88ProviderResponseObservation,
  verifyTrackBExtensionClosureAfterRestart,
  assessSmallPoolJudgePlacement,
  resolveReplayCandidatePool,
} from "./track-b-runtime.js";
import {
  recordFinaliseRefusal,
  recordReplayAdmission,
  withStageSpan,
} from "./run108-observability.js";
import {
  createRouterPairwiseJudge,
  resolveJudgeEndpointFromController,
} from "./track-b-shadow-judge-dispatch.js";
import { type TrackBPairwiseJudge, isPairwiseJudgeMode } from "./track-b-shadow-judge.js";

const DURABLE_ARTIFACT_ID = /^[a-f0-9]{64}$/u;

/**
 * The automatic replay loop is created inside `main()` once the runtime backend
 * exists, but the bridge server options are built by a module-level factory. This
 * holder is the single shared reference for status and pause/resume control.
 */
let activeAutoReplayLoop: ReturnType<typeof startAutoReplayLoop> | null = null;
/** Run 100 addendum 19: the durable controller fallback is reported once, not on every tick. */
let persistedControllerFallbackLogged = false;
/** Run 100 addendum 16 item 8d: benign terminalization no-ops are named once, then counted. */
let terminalizationBenignCount = 0;
/** Run 100 addendum 28 §2: the first few existence-check answers are named, so their shape is measurable. */
let evaluationJobExistsAnswerLogged = 0;
/**
 * Run 100 addendum 29 follow-up: the answer the tick receives carries a `durableLocator`, so a *repeated*
 * request id can be served the externalized answer of an earlier call. The pass revisits the same resume
 * entries every cycle, so its existence check must ask a fresh question each time — otherwise a job that has
 * since aged out is still reported present, and the cancel that follows is correctly refused as not found.
 */
let evaluationJobExistsProbeCounter = 0;
/** Run 100: the status probe's answer shape is named a few times, then counted. */
let evaluationJobStatusShapeLogged = 0;
const TERMINAL_STATUS_HINT: ReadonlySet<string> = new Set(["cancelled", "completed", "failed"]);
let activeLearningSummaryReader: (() => Promise<unknown>) | null = null;

type DurableReplayCapture = Readonly<Record<string, unknown>>;

export interface SupervisedReplayRolloutReferences {
  readonly evidenceRef: string;
  readonly artifactRef: string;
  readonly outcomeRef: string;
}

export interface SupervisedReplayEvaluationReferences {
  readonly taskRef: string;
  readonly inputRef: string;
  readonly forkRef: string;
  readonly toolPolicyDigest: string;
  readonly environmentDigest: string;
  readonly sourceEvidenceRef: string;
  readonly counterfactualEvidenceRef: string;
  readonly sourceOutcomeRef: string;
  readonly counterfactualOutcomeRef: string;
  readonly perCase: readonly { readonly caseId: string; readonly evidenceRef: string }[];
}

export interface SupervisedReplayEvaluationReferenceBuild {
  readonly evaluationReferences: SupervisedReplayEvaluationReferences;
  readonly rolloutReferences: readonly SupervisedReplayRolloutReferences[];
  /**
   * Run 98 addendum 34 S5: true when the compared arms resolved to the same content-addressed
   * response artifact — two answers that are byte-identical. `guidance/11` line 117 makes such a
   * group "single-outcome": recorded, and ineligible for promotion evidence. It is never a reason to
   * refuse the capture (live stage v199 refused real traffic here until this was fixed).
   */
  readonly singleOutcome: boolean;
}

export interface SupervisedReplayEvaluationReferenceFacts {
  readonly taskRef: string;
  readonly inputRef: string;
  readonly toolPolicyDigest: string;
  readonly environmentDigest: string;
}

type SupervisedReplayEvaluationReferenceFactValues = Readonly<{
  readonly task: Readonly<Record<string, unknown>>;
  readonly input: Readonly<Record<string, unknown>>;
  readonly toolPolicy: Readonly<Record<string, unknown>>;
  readonly environment: Readonly<Record<string, unknown>>;
}>;

function durableCaptureArtifactReference(
  capture: DurableReplayCapture,
  field: string,
  label: string,
): string {
  const value = capture[field];
  if (typeof value !== "string" || !DURABLE_ARTIFACT_ID.test(value)) {
    throw new Error(`${label} must name a persisted artifact-store artifact`);
  }
  return `artifact:${value}`;
}

/**
 * Business results cross the packaged extension host inside a durable-output
 * envelope, so a string result arrives as `businessOutput` rather than as a
 * bare value.  Callers must decode that envelope instead of assuming the raw
 * extension return type survives the process boundary.
 */
function decodeExtensionBusinessOutput(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const record = value as Record<string, unknown>;
  if (!("businessOutput" in record) || record.durableLocator === undefined) return value;
  return record.businessOutput;
}

function decodeExtensionTextOutput(value: unknown): string | null {
  const decoded = decodeExtensionBusinessOutput(value);
  if (typeof decoded === "string") return decoded;
  if (decoded && typeof decoded === "object" && !Array.isArray(decoded)) {
    const inner = (decoded as Record<string, unknown>).value;
    if (typeof inner === "string") return inner;
  }
  return null;
}

function durableCaptureArrayArtifactReference(
  capture: DurableReplayCapture,
  field: string,
  index: number,
  label: string,
): string {
  const values = capture[field];
  if (
    !Array.isArray(values) ||
    typeof values[index] !== "string" ||
    !DURABLE_ARTIFACT_ID.test(values[index])
  ) {
    throw new Error(`${label} must name a persisted artifact-store artifact`);
  }
  return `artifact:${values[index]}`;
}

function durableReplaySource(capture: DurableReplayCapture, label: string): DurableReplayCapture {
  const replaySource = capture.replaySource;
  if (!replaySource || typeof replaySource !== "object" || Array.isArray(replaySource)) {
    throw new Error(`${label} is missing its durable replay source`);
  }
  return replaySource as DurableReplayCapture;
}

/**
 * Run 98 addendum 58 §22.2.3 (live v314 finding): the capture records the classification the request
 * was routed under — taxonomy revision included — but no host call site handed the revision to the
 * shadow pipeline, so the comparison's comparability key and the derived pack scope were version-less.
 * The advisory's taxonomy gate fails closed on a version mismatch, so a version-less pack can never be
 * applied. This reads the recorded revision back without inventing one.
 */
export function readCaptureTaxonomyVersion(capture: DurableReplayCapture): string | undefined {
  const direct = capture.taxonomyVersion;
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  const classification = capture.classification;
  if (!classification || typeof classification !== "object" || Array.isArray(classification)) {
    return undefined;
  }
  const version = (classification as Readonly<Record<string, unknown>>).taxonomyVersion;
  return typeof version === "string" && version.trim() ? version.trim() : undefined;
}

/**
 * Run 98 addendum 58 §38: the taxonomy role the capture was classified under, read from the same two places as
 * the revision (the record's own field, then its classification). `roleId` is a scope dimension in the
 * route-learning contract, so the learner's pack can only name its role if the pipeline is told it.
 */
export function readCaptureRoleId(capture: DurableReplayCapture): string | undefined {
  const direct = capture.roleId;
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  const classification = capture.classification;
  if (!classification || typeof classification !== "object" || Array.isArray(classification)) {
    return undefined;
  }
  const roleId = (classification as Readonly<Record<string, unknown>>).roleId;
  return typeof roleId === "string" && roleId.trim() ? roleId.trim() : undefined;
}

/**
 * Run 106 (live finding on the dev replay queue, 2026-10-07): the task family the capture was classified
 * under, read from the same two places as the role and the revision. The learner's floor and its pack
 * scope are keyed by (roleId, taskTypeId) and a comparison whose comparability block names only the role
 * is excluded fail-closed as `incomplete_scope` - the comparison group is finalized, the floor never
 * counts it, and no pack can ever be written for the task.
 *
 * `roleId` and `taxonomyVersion` have always been read through a classification fallback. `taskTypeId`
 * was read straight off the capture record, so it worked only while the capture writer also stamped the
 * redundant top-level copy; a capture that records the family ONLY where the contract puts it - the
 * classification - produced an unscoped comparison. Read it exactly like its two siblings.
 */
export function readCaptureTaskTypeId(capture: DurableReplayCapture): string | undefined {
  const direct = capture.taskTypeId;
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  const classification = capture.classification;
  if (!classification || typeof classification !== "object" || Array.isArray(classification)) {
    return undefined;
  }
  const taskTypeId = (classification as Readonly<Record<string, unknown>>).taskTypeId;
  return typeof taskTypeId === "string" && taskTypeId.trim() ? taskTypeId.trim() : undefined;
}

/**
 * Run 98 addendum 58 §23 (live v316, 08:33Z): Replay Core re-presents an `append_recovery` request when a
 * previous attempt already burned the nonce and persisted the provider receipt but never appended the
 * branch. The receipt's `providerResultRef` names the replay's own route capture, which is the durable
 * evidence of the provider execution — the append recovers from it instead of demanding an in-process
 * dispatch that the resumed attempt can never have.
 */
export function replayRequestIdFromProviderResultRef(
  providerResultRef: unknown,
): string | undefined {
  if (typeof providerResultRef !== "string") return undefined;
  const prefix = "route-capture:";
  if (!providerResultRef.startsWith(prefix)) return undefined;
  const requestId = providerResultRef.slice(prefix.length).trim();
  return requestId ? requestId : undefined;
}

/**
 * Rebuild the execution identity a branch append needs from the durable replay capture: the routing
 * decision the provider answered under, the model that produced it, and the bounded output text the
 * capture records. A capture without recorded provider output is not a recovery source.
 *
 * Run 104 Phase 3 (R8): the capture this reads is the one the private boundary *publishes*
 * (`POST /capture/read` → `readRouteCapture`), and that projection names the bounded assistant text
 * `responseText` — never `outputText`, which is the write-side field this branch records. Reading
 * only the write-side name made every recovered execution `undefined`, so the append refused
 * `durable replay branch append has no host dispatch receipt` for captures that were present and
 * readable (live `req-a29409df…`, frozen stage disposition ledger, 2026-10-01 07:16:55Z). Both names
 * are accepted: the projection's `responseText` and the in-process `outputText`.
 *
 * `replayRequestId`, when given, pins the durable identity: the capture must be the one the dispatch
 * receipt named, so a degraded or mismatched readback can never attach a branch to another capture's
 * evidence.
 *
 * Run 104 phase-3.5 F1: the boundary also *bounds* the text it projects ("Only the first 2 KiB of
 * assistant text is returned", `runtime-operations-server.mjs`), and the projection reports no flag when
 * it saturates that cap. A saturated projection is an excerpt, not the provider's output, so the
 * recovered execution carries `outputTruncated` and the caller refuses instead of writing a truncated
 * artifact to the durable branch under `statusCode: 200`.
 */
const CAPTURE_PROJECTION_OUTPUT_CAP = 2_048;

export function buildReplayAppendExecution(input: {
  readonly capture: unknown;
  readonly routerDecisionId?: unknown;
  readonly replayRequestId?: unknown;
}):
  | {
      readonly routingDecisionId: string;
      readonly model: string;
      readonly outputText: string;
      /** Where the recovered text came from: the boundary projection or this process's own write path. */
      readonly outputSource: "capture_projection" | "in_process";
      /** True when the source bounded the text, i.e. the value is an excerpt rather than the whole reply. */
      readonly outputTruncated: boolean;
      readonly vendorId?: string;
      readonly adapterFamily?: string;
    }
  | undefined {
  const capture =
    input.capture && typeof input.capture === "object" && !Array.isArray(input.capture)
      ? (input.capture as Record<string, unknown>)
      : null;
  if (!capture) return undefined;
  const expectedRequestId =
    typeof input.replayRequestId === "string" ? input.replayRequestId.trim() : "";
  if (
    expectedRequestId &&
    !(typeof capture.requestId === "string" && capture.requestId.trim() === expectedRequestId)
  ) {
    return undefined;
  }
  const writeSideOutput = typeof capture.outputText === "string" ? capture.outputText : null;
  const projectedOutput = typeof capture.responseText === "string" ? capture.responseText : null;
  const outputText = writeSideOutput ?? projectedOutput ?? "";
  const outputSource: "capture_projection" | "in_process" =
    writeSideOutput !== null ? "in_process" : "capture_projection";
  const outputTruncated =
    outputSource === "capture_projection" && outputText.length >= CAPTURE_PROJECTION_OUTPUT_CAP;
  if (!outputText.trim()) return undefined;
  const routingDecisionId =
    typeof input.routerDecisionId === "string" && input.routerDecisionId.trim()
      ? input.routerDecisionId.trim()
      : typeof capture.routingDecisionId === "string"
        ? capture.routingDecisionId.trim()
        : "";
  const model = typeof capture.modelId === "string" ? capture.modelId.trim() : "";
  if (!routingDecisionId || !model) return undefined;
  const providers = Array.isArray(capture.providers) ? capture.providers : [];
  const firstProvider =
    providers.length > 0 && providers[0] && typeof providers[0] === "object"
      ? (providers[0] as Record<string, unknown>)
      : null;
  const vendorId =
    firstProvider && typeof firstProvider.providerId === "string"
      ? firstProvider.providerId
      : undefined;
  const adapterFamily =
    firstProvider && typeof firstProvider.adapterFamily === "string"
      ? firstProvider.adapterFamily
      : undefined;
  return {
    routingDecisionId,
    model,
    outputText,
    outputSource,
    outputTruncated,
    ...(vendorId ? { vendorId } : {}),
    ...(adapterFamily ? { adapterFamily } : {}),
  };
}

/**
 * Run 104 Phase 3 (R8): the append-recovery leg's whole decision, in one place, so the shape the
 * boundary really answers can be exercised without standing up the packaged launcher.
 *
 * Replay Core re-presents an `append_recovery` request carrying the durable receipt of a provider
 * dispatch that already ran; the resumed process holds no in-process dispatch for it. The receipt's
 * `providerResultRef` names the replay's own route capture, and that capture is the durable record of
 * the provider execution, so the branch is re-attached from it. When the request names no capture, or
 * the capture the boundary answers for is missing, unreadable or not the one the receipt named, the
 * append still refuses with the text `track-b-auto-replay.ts` classifies on
 * (`replay_branch_append_unavailable`) — an append with no durable branch must never succeed.
 */
export function resolveResumedReplayAppendDispatch(input: {
  readonly branchRequest: unknown;
  readonly capture: unknown;
}): {
  readonly execution: NonNullable<ReturnType<typeof buildReplayAppendExecution>>;
  readonly replayRequestId: string;
} {
  const branchRequest =
    input.branchRequest &&
    typeof input.branchRequest === "object" &&
    !Array.isArray(input.branchRequest)
      ? (input.branchRequest as Record<string, unknown>)
      : {};
  const replayRequestId = replayRequestIdFromProviderResultRef(branchRequest.providerResultRef);
  const execution = replayRequestId
    ? buildReplayAppendExecution({
        capture: input.capture,
        routerDecisionId: branchRequest.routerDecisionId,
        replayRequestId,
      })
    : undefined;
  /**
   * Run 104 phase-3.5 F1: a saturated projection is an excerpt. Attaching it would write a truncated
   * artifact to the durable branch and record the provider execution as a completed 200, so the recovery
   * refuses instead — the same deferrable refusal that already covers a missing capture. An excerpt may
   * recover on a later attempt once the boundary's input is smaller.
   */
  if (!execution || !replayRequestId || execution.outputTruncated) {
    throw new Error("durable replay branch append has no host dispatch receipt");
  }
  return { execution, replayRequestId };
}

function assertDistinctDurableReferences(references: readonly string[], label: string): void {
  if (new Set(references).size !== references.length) {
    throw new Error(`${label} must contain distinct persisted artifact references`);
  }
}

/**
 * Preserve only trajectory events that were actually captured with a durable
 * evidence locator. The replay callback must not synthesize a user action or
 * provider signal simply to make the learning path appear complete.
 */
/**
 * Guidance 12 interaction markers. They are deliberately lexical and bounded: a user
 * turn that follows an answer and contains one of these phrases is a recorded
 * satisfaction or correction event, never a semantic-quality judgement.
 */
const TRACK_B_SATISFACTION_MARKERS = Object.freeze([
  "thanks",
  "thank you",
  "perfect",
  "looks good",
  "that works",
  "works great",
]);
const TRACK_B_CORRECTION_MARKERS = Object.freeze([
  "no,",
  "that's wrong",
  "that is wrong",
  "incorrect",
  "not what i",
  "i said",
  "revert",
]);

export function deriveSupervisedReplayTrajectoryEvents(input: {
  readonly sourceCapture: DurableReplayCapture;
  readonly counterfactualCaptures: readonly DurableReplayCapture[];
}): readonly Record<string, unknown>[] {
  const captures = [input.sourceCapture, ...input.counterfactualCaptures];
  // A capture records its trajectory as durable artifact identities (route decision,
  // tool executions, response), not as a ready-made event list. Deriving events from
  // those identities keeps every event evidence-backed: each one names the artifact
  // that proves it, carries the capture's recorded time, and is typed by what the
  // artifact actually says (a recorded tool failure is a `tool_failure`, a successful
  // call is a plain `tool_call`). A capture without a recorded time contributes no
  // events at all rather than a fabricated timeline, which is what lets R16 degrade
  // honestly for captures that carry no real behavioral evidence.
  const DURABLE_ID = /^[a-f0-9]{64}$/u;
  // A capture that already records its own validated trajectory events keeps them
  // verbatim; derivation only fills captures that record none.
  const recorded = captures.flatMap((capture, captureIndex) => {
    const rawEvents = capture.trajectoryEvents;
    if (rawEvents === undefined) return [];
    if (!Array.isArray(rawEvents)) {
      throw new Error(`replay capture ${captureIndex} trajectory events are invalid`);
    }
    return rawEvents.map((event, eventIndex) => {
      if (!event || typeof event !== "object" || Array.isArray(event)) {
        throw new Error(`replay capture ${captureIndex} trajectory event ${eventIndex} is invalid`);
      }
      const record = event as Record<string, unknown>;
      if (typeof record.type !== "string" || !record.type.trim()) {
        throw new Error(`replay capture ${captureIndex} trajectory event type is required`);
      }
      if (
        typeof record.evidenceRef !== "string" ||
        !/^artifact:[a-f0-9]{64}$/u.test(record.evidenceRef)
      ) {
        throw new Error(
          `replay capture ${captureIndex} trajectory event must name a durable evidence artifact`,
        );
      }
      const sequence = Number.isSafeInteger(record.sequence)
        ? Number(record.sequence)
        : Number.MAX_SAFE_INTEGER;
      const occurredAt = typeof record.occurredAt === "string" ? record.occurredAt : "";
      return { record, captureIndex, eventIndex, sequence, occurredAt };
    });
  });
  if (recorded.length > 0) {
    return recorded
      .sort(
        (left, right) =>
          left.sequence - right.sequence ||
          left.occurredAt.localeCompare(right.occurredAt) ||
          left.captureIndex - right.captureIndex ||
          left.eventIndex - right.eventIndex,
      )
      .map(({ record }) => record);
  }
  const events: Record<string, unknown>[] = [];
  captures.forEach((capture, captureIndex) => {
    const capturedAtMs =
      typeof capture.capturedAt === "string" ? Date.parse(capture.capturedAt) : Number.NaN;
    if (!Number.isSafeInteger(capturedAtMs) || capturedAtMs <= 0) return;
    const requestId = String(capture.requestId ?? `capture:${captureIndex}`);
    const pushEvent = (
      suffix: string,
      type: string,
      artifactId: unknown,
      sequence: number,
    ): void => {
      if (typeof artifactId !== "string" || !DURABLE_ID.test(artifactId)) return;
      events.push({
        id: `${requestId}:${suffix}`,
        type,
        timestampMs: capturedAtMs,
        evidenceRef: `artifact:${artifactId}`,
        sequence,
        requestId,
      });
    };
    pushEvent(
      "route",
      "route_selected",
      typeof capture.routeDecisionArtifactId === "string"
        ? capture.routeDecisionArtifactId
        : capture.rootArtifactId,
      0,
    );
    // The operations readback exposes recorded tools as `tools`, each carrying its own
    // artifact identity (`artifactId`/`nodeId`) and the parsed tool content. It does not
    // expose a parallel `toolArtifactIds` array, so iterating that (absent) field meant no
    // tool event was ever derived - which is why every replay degraded with "recognized
    // semantic or behavioral trajectory evidence is required" despite recorded tool use.
    const tools = Array.isArray(capture.tools) ? capture.tools : [];
    const recordedToolArtifactIds = Array.isArray(capture.toolArtifactIds)
      ? capture.toolArtifactIds
      : [];
    const toolArtifactIds =
      recordedToolArtifactIds.length > 0
        ? recordedToolArtifactIds
        : tools.map((tool) =>
            tool && typeof tool === "object" && !Array.isArray(tool)
              ? ((tool as Record<string, unknown>).artifactId ??
                (tool as Record<string, unknown>).nodeId)
              : null,
          );
    const seenToolNames = new Set<string>();
    toolArtifactIds.forEach((artifactId, index) => {
      const tool =
        tools[index] && typeof tools[index] === "object" && !Array.isArray(tools[index])
          ? (tools[index] as Record<string, unknown>)
          : {};
      const failure = tool.failure && typeof tool.failure === "object";
      const status = typeof tool.status === "string" ? tool.status.toLowerCase() : "";
      // A recorded tool failure can arrive three ways: a runtime execution status, a
      // structured failure, or the provider transcript's own error marker on the tool
      // result. All three are recorded facts, never inferred from output text.
      const failed =
        failure ||
        tool.isError === true ||
        tool.error === true ||
        status === "failed" ||
        status === "error" ||
        status === "failure";
      // A capture that recorded the same tool more than once is repeated tool use: the
      // repetition itself is a recorded fact (the taxonomy's `tool_loop`), which is
      // exactly the behavioral evidence a learner may consume without interpreting tool
      // output text.
      const toolName = String(tool.toolName ?? tool.toolId ?? "");
      const repeated = toolName.length > 0 && seenToolNames.has(toolName);
      if (toolName) seenToolNames.add(toolName);
      pushEvent(
        `tool:${index}`,
        failed ? "tool_failure" : repeated ? "tool_loop" : "tool_call",
        artifactId,
        index + 1,
      );
    });
    const response = capture.response;
    const responseFailure =
      response && typeof response === "object" && !Array.isArray(response)
        ? (response as Record<string, unknown>).failure
        : null;
    // A capture whose provider dispatch failed records that failure on the capture
    // itself (`failure` plus a `provider_error` terminal state). That is a recorded
    // provider error, which is the recognized behavioral evidence the learner needs.
    const captureFailure =
      capture.failure && typeof capture.failure === "object"
        ? capture.failure
        : capture.terminalState === "provider_error"
          ? { errorClass: "provider_error" }
          : null;
    pushEvent(
      "response",
      responseFailure || captureFailure ? "provider_error" : "model_response",
      capture.responseArtifactId,
      toolArtifactIds.length + 1,
    );
    // Guidance 12 defines the interaction half of the signal taxonomy; the recorded
    // transcript proves those events without interpreting model quality. A repeated
    // user request is a recorded rephrase, two assistant turns with no user turn
    // between them are a recorded regeneration, and a bounded marker on the user turn
    // that follows an answer records satisfaction or a correction. Each event names
    // the message artifact that carries it.
    const messages = Array.isArray(capture.messages) ? capture.messages : [];
    const banner = (value: unknown): string =>
      typeof value === "string"
        ? value.trim().toLocaleLowerCase("en-US").replace(/\s+/gu, " ").slice(0, 512)
        : "";
    const seenUserText = new Set<string>();
    let previousRole = "";
    messages.forEach((rawMessage, messageIndex) => {
      if (!rawMessage || typeof rawMessage !== "object" || Array.isArray(rawMessage)) return;
      const message = rawMessage as Record<string, unknown>;
      const role = typeof message.role === "string" ? message.role : "";
      const messageArtifactId = message.nodeId ?? message.artifactId;
      const content = banner(message.content);
      const sequence = toolArtifactIds.length + 2 + messageIndex;
      if (role === "user" && content) {
        const repeatedUserText = content.length >= 8 && seenUserText.has(content);
        if (content.length >= 8) seenUserText.add(content);
        if (repeatedUserText) {
          pushEvent(`rephrase:${messageIndex}`, "user_rephrase", messageArtifactId, sequence);
        }
        if (previousRole === "assistant") {
          if (TRACK_B_SATISFACTION_MARKERS.some((marker) => content.includes(marker))) {
            pushEvent(`satisfaction:${messageIndex}`, "satisfaction", messageArtifactId, sequence);
          } else if (TRACK_B_CORRECTION_MARKERS.some((marker) => content.includes(marker))) {
            pushEvent(`correction:${messageIndex}`, "user_correction", messageArtifactId, sequence);
          }
        }
      }
      if (role === "assistant" && previousRole === "assistant") {
        pushEvent(`regeneration:${messageIndex}`, "regeneration", messageArtifactId, sequence);
      }
      previousRole = role;
    });
  });
  const seen = new Set<string>();
  return (
    events
      .filter((event) => {
        const id = String(event.id);
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      // Order by recorded time: the analyzer requires non-decreasing timestamps, and a
      // counterfactual capture is written after its source, so ordering purely by
      // per-capture sequence numbers would interleave the two timelines.
      .sort(
        (left, right) =>
          Number(left.timestampMs) - Number(right.timestampMs) ||
          Number(left.sequence) - Number(right.sequence),
      )
      .slice(0, 128)
  );
}

/**
 * Run 100 item S13 follow-up (2026-09-25): the derivation sweep's capture wiring, kept as a pure function so the
 * call site is testable without standing up the sweep.
 *
 * The replay job names its source capture through the durable locator the host stamped on the decision
 * (`decision-<captureRef>`), and each counterfactual arm through its dispatch's `providerResultRef`
 * (`route-capture:<replayRequestId>`, whose branch capture is written as `<replayRequestId>-branch`). Both are
 * durable facts, so the events are derived from recorded captures - never invented. A capture the retention ring no
 * longer serves is a named unavailability.
 */
export async function deriveLearnerTrajectoryEvidenceForReplay(input: {
  readonly job: Readonly<Record<string, unknown>>;
  readonly readCapture: (requestId: string) => Promise<Record<string, unknown> | null>;
  readonly deriveEvents?: (input: {
    readonly sourceCapture: DurableReplayCapture;
    readonly counterfactualCaptures: readonly DurableReplayCapture[];
  }) => readonly Record<string, unknown>[];
}): Promise<
  | {
      readonly kind: "evidence";
      readonly events: readonly Record<string, unknown>[];
      readonly graphRef: string;
      readonly replayRef: string;
    }
  | { readonly kind: "unavailable"; readonly reason: string }
  | { readonly kind: "refused"; readonly reason: string }
> {
  const recordOf = (value: unknown): Record<string, unknown> | null =>
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  try {
    const captureRef = captureRefFromReplayJob(input.job as unknown as DurableReplayJobSummary);
    if (!captureRef) {
      return {
        kind: "unavailable",
        reason: `the replay job names no source capture (${
          typeof input.job.sourceDecisionId === "string"
            ? input.job.sourceDecisionId
            : "no decision"
        })`,
      };
    }
    const sourceCapture = await input.readCapture(captureRef);
    if (!sourceCapture) {
      return {
        kind: "unavailable",
        reason: `capture ${captureRef} is outside the retention window`,
      };
    }
    const counterfactualCaptures: Record<string, unknown>[] = [];
    const dispatches = recordOf(input.job.dispatches);
    /**
     * The run's own derivation of each arm's branch-capture request id (attempt-scoped appends first, then the
     * `providerResultRef` naming, then the legacy token), so the sweep asks for exactly the captures the executor
     * wrote rather than re-deriving a name of its own.
     */
    const branchRequestIds = branchCaptureRequestIdsFromJob({
      replayJobId: typeof input.job.jobId === "string" ? input.job.jobId : captureRef,
      requestId: captureRef,
      dispatches: input.job.dispatches,
      candidateEndpointIds: dispatches ? Object.keys(dispatches) : [],
    });
    for (const branchRequestId of branchRequestIds.values()) {
      const branchCapture = await input.readCapture(branchRequestId);
      if (!branchCapture) {
        return {
          kind: "unavailable",
          reason: `branch capture ${branchRequestId} is outside the retention window`,
        };
      }
      counterfactualCaptures.push(branchCapture);
    }
    const replayRef =
      typeof input.job.sharedPrefixRef === "string" && input.job.sharedPrefixRef.trim().length > 0
        ? input.job.sharedPrefixRef.trim()
        : null;
    if (!replayRef) {
      return {
        kind: "unavailable",
        reason: `replay ${captureRef} records no shared prefix reference`,
      };
    }
    const deriveEvents = input.deriveEvents ?? deriveSupervisedReplayTrajectoryEvents;
    const events = deriveEvents({
      sourceCapture: sourceCapture as DurableReplayCapture,
      counterfactualCaptures: counterfactualCaptures as readonly DurableReplayCapture[],
    });
    if (events.length === 0) {
      return {
        kind: "unavailable",
        reason: `capture ${captureRef} records no derivable trajectory events`,
      };
    }
    return {
      kind: "evidence",
      events,
      graphRef: durableCaptureArtifactReference(
        sourceCapture as DurableReplayCapture,
        "rootArtifactId",
        `capture ${captureRef} root`,
      ),
      replayRef,
    };
  } catch (error) {
    return {
      kind: "refused",
      reason: String((error as { message?: unknown })?.message ?? error).slice(0, 200),
    };
  }
}

/**
 * Run 100 addendum 39 (2026-09-26): the post-finalization signals sweep.
 *
 * Measured live on run175c/`b7f04039` (`:3457`, 00:15-01:05): the learner's derivation pass computes the report it
 * is missing, but it walks the `evaluation:list-groups` page (`group_id ASC`) oldest-first and meets an aged
 * prefix - 9 `signals:analyze-finalized-evaluation` invocations against 79 `capture … is outside the retention
 * window` skips. The proposal's chain (`normal usage episode -> trajectory-signals computes model-free signal
 * report -> …`) puts the model-free report *before* replay/evaluation, and the retention ladder keeps raw captures
 * for hours, not weeks - so the producer has to run while the evidence is still durable, not when the learner
 * finally reaches the comparison.
 *
 * This sweep is that producer: each tick it walks a bounded page of finalized, learnable comparison groups
 * newest-first, skips the ones whose own report already exists, resolves the durable capture evidence exactly as
 * the derivation pass does (`deriveLearnerTrajectoryEvidenceForReplay`: operations-boundary capture readback) and
 * invokes the analyze capability through the *same* helper, so the envelope it builds and the degradation receipt
 * it classifies cannot drift from the fallback producer.
 */
export interface FinalizationSignalsSweepSummary {
  /** Candidate groups the walk inspected this tick. */
  readonly examined: number;
  /** Reports produced through `signals:analyze-finalized-evaluation`. */
  readonly analyzed: number;
  /** Named skips: an already-persisted report, missing evidence, a degraded analysis, no durable replay. */
  readonly skipped: number;
  /** Candidates whose resolution threw. The group stays for the next tick. */
  readonly refused: number;
  /** Candidates the per-tick compute bound or the wall-clock budget left for the next tick. */
  readonly deferred: number;
}

/** How many candidates one tick may inspect. Evidence resolution costs one capture readback per candidate. */
export const FINALIZATION_SIGNALS_EXAMINED_LIMIT = 64;

/**
 * How many reports the post-finalization sweep may compute per tick. Measured live: one tick lands every ~1.8
 * minutes, `signals:analyze-finalized-evaluation` is model-free and persists its answer, and the derivation pass
 * proves 24 computes per tick are affordable - the sweep stays deliberately below that so the tick's replay work is
 * never displaced by its own producer.
 */
export const FINALIZATION_SIGNALS_COMPUTE_LIMIT = 16;

/** How long one tick's post-finalization walk may spend before it leaves the rest for the next tick. */
export const FINALIZATION_SIGNALS_BUDGET_MS = 30_000;

/** A capability answer the sweep's caller has already decoded; anything else is not a record. */
function finalizationSignalRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function finalizationSignalText(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export async function sweepFinalizationSignalsForGroups(input: {
  readonly invoke: LearnerDerivationInvoke;
  /** The `evaluation:list-groups` page, in the extension's own order (`group_id ASC`). */
  readonly groups: readonly Record<string, unknown>[];
  readonly readDurableTrajectoryEvidence: LearnerDerivationEvidenceRead;
  /**
   * Groups this process has already settled: a report is persisted for them, their evidence has aged out of the
   * retention ring, or the analyzer returned a degradation receipt. Settlement is monotonic (a pruned capture never
   * comes back), so the walk does not re-read them on every tick - without it the newest end of the store would
   * starve the candidates behind it.
   */
  readonly settledGroupIds?: Set<string>;
  /** Bounded computes per tick: the report-writing invocations this sweep may start. */
  readonly computeLimit: number;
  readonly examinedLimit?: number;
  readonly wallClockBudgetMs: number;
  readonly now?: () => number;
  readonly log?: (message: string) => void;
}): Promise<FinalizationSignalsSweepSummary> {
  const now = input.now ?? Date.now;
  const examinedLimit = input.examinedLimit ?? FINALIZATION_SIGNALS_EXAMINED_LIMIT;
  const startedAtMs = now();
  /**
   * The walk order is the shared newest-first order (`orderComparisonGroupsNewestFirst`): the page arrives
   * `group_id ASC`, so its newest end is consumed first, and the filtered-out groups below keep that order.
   */
  const candidates = orderComparisonGroupsNewestFirst(input.groups)
    .map((group) => {
      const normalized = normalizedComparisonGroup(group);
      const groupId =
        typeof normalized.groupId === "string" && normalized.groupId.trim()
          ? normalized.groupId.trim()
          : typeof normalized.comparisonId === "string" && normalized.comparisonId.trim()
            ? normalized.comparisonId.trim()
            : null;
      return { group, normalized, groupId };
    })
    .filter(
      (candidate) =>
        candidate.groupId !== null &&
        input.settledGroupIds?.has(candidate.groupId) !== true &&
        candidate.normalized.status === "finalized" &&
        learnableComparisonMembers(candidate.normalized) !== null,
    );
  const ordered = candidates;
  let examined = 0;
  let analyzed = 0;
  let skipped = 0;
  let refused = 0;
  let deferred = 0;
  /** Analyze invocations started: a degradation receipt consumed a compute even though it wrote nothing. */
  let computed = 0;
  for (let index = 0; index < ordered.length; index += 1) {
    const candidate = ordered[index];
    const groupId = candidate.groupId as string;
    if (examined >= examinedLimit) {
      deferred += ordered.length - index;
      break;
    }
    if (now() - startedAtMs > input.wallClockBudgetMs) {
      deferred += ordered.length - index;
      input.log?.(
        `finalization signals deferred ${ordered.length - index} group(s): the tick's wall-clock budget (${input.wallClockBudgetMs}ms) is spent`,
      );
      break;
    }
    if (computed >= input.computeLimit) {
      // Newest-first: the remaining candidates are older than the ones already analyzed, so the bound defers them
      // as a class instead of spending one evidence readback per candidate to count them.
      deferred += ordered.length - index;
      break;
    }
    examined += 1;
    const replayId = durableReplayIdForComparison(candidate.normalized);
    if (!replayId) {
      skipped += 1;
      input.settledGroupIds?.add(groupId);
      input.log?.(
        `finalization signals skipped ${groupId}: the comparison names no durable replay`,
      );
      continue;
    }
    try {
      const job = finalizationSignalRecord(
        await input.invoke("replay-core", "replay:job", { jobId: replayId }),
      );
      const sourceDecisionId = finalizationSignalText(job?.sourceDecisionId);
      if (!job || !sourceDecisionId) {
        skipped += 1;
        input.log?.(
          `finalization signals skipped ${groupId}: replay ${replayId.slice(0, 12)} carries no provenance yet`,
        );
        continue;
      }
      const persisted = await readPersistedSignalReportForGroup({
        invoke: input.invoke,
        sourceDecisionId,
        groupId,
      });
      if (persisted.kind === "unavailable") {
        // A transport failure is not evidence that the report is missing; the group stays reachable next tick.
        skipped += 1;
        input.log?.(`finalization signals skipped ${groupId}: ${persisted.reason}`);
        continue;
      }
      if (persisted.kind === "report") {
        skipped += 1;
        input.settledGroupIds?.add(groupId);
        input.log?.(`finalization signals skipped ${groupId}: its report is already persisted`);
        continue;
      }
      const evidence = await input.readDurableTrajectoryEvidence({
        job,
        sourceDecisionId,
        replayId,
      });
      if (evidence.kind !== "evidence") {
        /**
         * Missing or pruned evidence stays unknown: the group is a named skip and the compute bound is untouched,
         * because nothing was computed (guidance/12: "Unknown or pruned source spans must be reported rather than
         * reconstructed from signal snippets").
         */
        skipped += 1;
        input.settledGroupIds?.add(groupId);
        input.log?.(`finalization signals skipped ${groupId}: ${evidence.reason.slice(0, 200)}`);
        continue;
      }
      const winnerRef =
        finalizationSignalText(
          finalizationSignalRecord(candidate.normalized.comparability)?.counterfactualCandidateRef,
        ) ??
        finalizationSignalText(
          learnableComparisonMembers(candidate.normalized)?.positive[0]?.candidateRef,
        );
      computed += 1;
      const analysis = await analyzeFinalizedEvaluationSignal({
        invoke: input.invoke,
        groupId,
        sourceDecisionId,
        finalizedEvaluation: candidate.normalized,
        evidence,
        routePackage: winnerRef,
      });
      if (analysis.kind === "degraded") {
        skipped += 1;
        input.settledGroupIds?.add(groupId);
        input.log?.(`finalization signals skipped ${groupId}: ${analysis.reason}`);
        continue;
      }
      analyzed += 1;
      input.settledGroupIds?.add(groupId);
      input.log?.(
        `finalization signals analyzed ${groupId} (decision ${sourceDecisionId.slice(0, 12)}, ${
          evidence.events.length
        } event(s))`,
      );
    } catch (error) {
      refused += 1;
      input.log?.(
        `finalization signals refused ${groupId}: ${String(
          (error as { message?: unknown })?.message ?? error,
        ).slice(0, 200)}`,
      );
    }
  }
  return { examined, analyzed, skipped, refused, deferred };
}

/**
 * Build the Evaluation Core join entirely from Replay/retention artifacts.
 * This deliberately accepts artifact IDs returned by the operations boundary;
 * it never derives a reference from a request ID, output hash, or display
 * string.  The CLI uses this builder for both the initial and recovery paths.
 */
export function buildSupervisedReplayEvaluationReferences(input: {
  readonly sourceCapture: DurableReplayCapture;
  readonly counterfactualCaptures: readonly DurableReplayCapture[];
  readonly caseIds: readonly string[];
  readonly perCaseEvidenceRefs?: readonly string[];
  readonly referenceFacts: SupervisedReplayEvaluationReferenceFacts;
}): SupervisedReplayEvaluationReferenceBuild {
  if (!input.sourceCapture || input.counterfactualCaptures.length === 0) {
    throw new Error("supervised replay evaluation requires source and counterfactual captures");
  }
  const captures = [input.sourceCapture, ...input.counterfactualCaptures];
  if (
    input.caseIds.length !== captures.length ||
    input.caseIds.some((id) => typeof id !== "string" || !id.trim())
  ) {
    throw new Error("supervised replay evaluation case identity must bind every durable capture");
  }
  assertDistinctDurableReferences(
    captures.map((capture, index) =>
      durableCaptureArtifactReference(capture, "rootArtifactId", `capture ${index} root`),
    ),
    "replay capture roots",
  );

  const sourceCapture = input.sourceCapture;
  const sourceReplaySource = durableReplaySource(sourceCapture, "source replay capture");
  const firstCounterfactualCapture = input.counterfactualCaptures[0];

  const sourceRootRef = durableCaptureArtifactReference(
    sourceCapture,
    "rootArtifactId",
    "source root",
  );
  const sourceSharedPrefixRef = durableCaptureArtifactReference(
    sourceReplaySource,
    "sharedPrefixRef",
    "source shared prefix",
  );
  const firstCounterfactualRootRef = durableCaptureArtifactReference(
    firstCounterfactualCapture,
    "rootArtifactId",
    "counterfactual root",
  );
  const referenceFacts = input.referenceFacts;
  const factReferences = [
    referenceFacts.taskRef,
    referenceFacts.inputRef,
    referenceFacts.toolPolicyDigest,
    referenceFacts.environmentDigest,
  ];
  if (factReferences.some((reference) => !/^artifact:[a-f0-9]{64}$/u.test(reference))) {
    throw new Error("evaluation reference facts must name persisted artifact-store artifacts");
  }

  // The semantic facts are separate artifact-store records. Capture roots and
  // route decisions remain the independently persisted evidence and outcome
  // anchors for the observed source and counterfactual branches.
  const rolloutReferences = captures.map((capture, index) => ({
    evidenceRef: durableCaptureArtifactReference(
      capture,
      "rootArtifactId",
      `capture ${index} evidence`,
    ),
    // Run 98 addendum 31 S4: the trial's output reference must be the artifact that holds the answer
    // text the runner scores. It used to be the capture's *route decision* artifact, so a score's
    // output reference did not contain its output. The route decision stays reachable through the
    // evidence root; the response artifact is what "output" means.
    artifactRef: durableCaptureArtifactReference(
      capture,
      "responseArtifactId",
      `capture ${index} response`,
    ),
    outcomeRef: durableCaptureArrayArtifactReference(
      capture,
      "providerArtifactIds",
      0,
      `capture ${index} provider result`,
    ),
  }));
  // Run 98 addendum 34 S5 (live stage v199): the artifact store addresses content, so two arms that
  // produce byte-identical answers resolve to the *same* response artifact. The previous blanket
  // requirement of distinct evidence/artifact/outcome references across every arm refused that
  // capture with a 409, which deferred and then refused real traffic without ever evaluating it.
  // `guidance/11` line 117 states the correct handling: a single-outcome group is recorded and
  // ineligible for promotion evidence. What must stay distinct is each arm's *own* three references
  // (a rollout whose response is its provider execution is not a comparison) and the cross-arm
  // identity references (each arm's capture root and provider execution are per-arm facts).
  rolloutReferences.forEach((references, index) => {
    assertDistinctDurableReferences(
      [references.evidenceRef, references.artifactRef, references.outcomeRef],
      `capture ${index} evidence, response, and provider references`,
    );
  });
  assertDistinctDurableReferences(
    rolloutReferences.map((references) => references.evidenceRef),
    "replay capture roots",
  );
  assertDistinctDurableReferences(
    rolloutReferences.map((references) => references.outcomeRef),
    "replay provider outcomes",
  );
  const singleOutcome =
    new Set(rolloutReferences.map((references) => references.artifactRef)).size <
    rolloutReferences.length;

  const comparisonReferences = [
    ...factReferences,
    sourceSharedPrefixRef,
    sourceRootRef,
    firstCounterfactualRootRef,
    rolloutReferences[0]?.outcomeRef,
    rolloutReferences[1]?.outcomeRef,
  ];
  if (comparisonReferences.some((reference) => typeof reference !== "string")) {
    throw new Error("evaluation comparability outcome references are missing");
  }
  assertDistinctDurableReferences(comparisonReferences, "evaluation comparability references");

  const perCaseEvidenceRefs = input.perCaseEvidenceRefs
    ? [...input.perCaseEvidenceRefs]
    : captures.map((capture, index) =>
        durableCaptureArtifactReference(capture, "responseArtifactId", `capture ${index} response`),
      );
  if (
    perCaseEvidenceRefs.length !== captures.length ||
    perCaseEvidenceRefs.some((reference) => !/^artifact:[a-f0-9]{64}$/u.test(reference))
  ) {
    throw new Error("per-case evaluation evidence must name persisted artifact-store artifacts");
  }
  // Two arms with identical answers share one response artifact; the case identity (not the content
  // address) is what keeps them apart, so the distinctness rule applies only when the outcomes differ.
  if (!singleOutcome) {
    assertDistinctDurableReferences(perCaseEvidenceRefs, "per-case evaluation evidence");
  }
  assertDistinctDurableReferences(input.caseIds, "evaluation case IDs");

  const evaluationReferences: SupervisedReplayEvaluationReferences = {
    taskRef: referenceFacts.taskRef,
    inputRef: referenceFacts.inputRef,
    forkRef: sourceSharedPrefixRef,
    toolPolicyDigest: referenceFacts.toolPolicyDigest,
    environmentDigest: referenceFacts.environmentDigest,
    sourceEvidenceRef: sourceRootRef,
    counterfactualEvidenceRef: firstCounterfactualRootRef,
    sourceOutcomeRef: rolloutReferences[0].outcomeRef,
    counterfactualOutcomeRef: rolloutReferences[1].outcomeRef,
    perCase: input.caseIds.map((caseId, index) => ({
      caseId,
      evidenceRef: perCaseEvidenceRefs[index],
    })),
  };
  return { evaluationReferences, rolloutReferences, singleOutcome };
}

/**
 * Persist one small, reference-only artifact per evaluation case.  The
 * artifact-store extension is the authority that allocates the IDs; the CLI
 * only supplies links to already durable replay artifacts and never signs or
 * invents an evaluation proof.
 */
const MAX_EVALUATION_CASE_SUBJECT_BYTES = 8 * 1024;

/**
 * Run 98 addendum 31 S2: bound the evaluation subject that travels with a case reference. The point
 * is that the score's input survives; it must not turn a reference artifact into a transcript copy,
 * so an oversized subject is truncated with an explicit marker.
 */
function boundCaseSubjectText(value: unknown): string {
  const text = typeof value === "string" ? value : "";
  if (Buffer.byteLength(text, "utf8") <= MAX_EVALUATION_CASE_SUBJECT_BYTES) return text;
  let bounded = text;
  while (
    bounded.length > 0 &&
    Buffer.byteLength(bounded, "utf8") > MAX_EVALUATION_CASE_SUBJECT_BYTES
  ) {
    bounded = bounded.slice(0, Math.floor(bounded.length * 0.9));
  }
  return `${bounded}\n[truncated ${text.length - bounded.length} chars]`;
}

export async function persistSupervisedReplayEvaluationCaseReferences(input: {
  readonly runtime: {
    readonly invoke: (
      id: string,
      envelope: Record<string, unknown>,
    ) => Promise<Record<string, unknown>>;
  };
  readonly requestId: string;
  readonly channel: string;
  readonly scope: string;
  readonly authorizationEpoch: number;
  readonly caseIds: readonly string[];
  readonly captures: readonly DurableReplayCapture[];
  /**
   * Run 98 addendum 31 S2 (`guidance/11`: a score binds its *input projection*): the evaluation
   * subject travels with the case reference, so a score is checkable without following the capture
   * store. Bounded and truncated with an explicit marker.
   */
  readonly subjects?: readonly {
    readonly taskText: string;
    readonly criteria: unknown;
    readonly outputText: string;
  }[];
}): Promise<readonly string[]> {
  if (
    !input.requestId ||
    !input.channel ||
    !input.scope ||
    !Number.isSafeInteger(input.authorizationEpoch) ||
    input.caseIds.length !== input.captures.length ||
    input.caseIds.length === 0
  ) {
    throw new Error("supervised replay case-reference artifact identity is required");
  }
  assertDistinctDurableReferences(input.caseIds, "evaluation case IDs");
  return Promise.all(
    input.captures.map(async (capture, index) => {
      const caseId = input.caseIds[index];
      const subject = input.subjects?.[index];
      const rootRef = durableCaptureArtifactReference(
        capture,
        "rootArtifactId",
        `case ${index} root`,
      );
      const responseRef = durableCaptureArtifactReference(
        capture,
        "responseArtifactId",
        `case ${index} response`,
      );
      const routeDecisionRef = durableCaptureArtifactReference(
        capture,
        "routeDecisionArtifactId",
        `case ${index} route decision`,
      );
      const providerRef = durableCaptureArrayArtifactReference(
        capture,
        "providerArtifactIds",
        0,
        `case ${index} provider result`,
      );
      const result = await input.runtime.invoke("artifact-store", {
        requestId: `${input.requestId}:evaluation-reference:${index}`,
        sessionId: input.requestId,
        protocolVersion: "1.1.0",
        channel: input.channel,
        scope: input.scope,
        authorizationEpoch: input.authorizationEpoch,
        capability: "graph:write",
        payload: {
          scope: input.scope,
          record: {
            content: JSON.stringify({
              schemaVersion: "role-model.evaluation-case-reference.v1",
              caseId,
              replayRootRef: rootRef,
              responseArtifactRef: responseRef,
              routeDecisionArtifactRef: routeDecisionRef,
              providerArtifactRef: providerRef,
              ...(subject
                ? {
                    subject: {
                      taskText: boundCaseSubjectText(subject.taskText),
                      criteria: subject.criteria ?? null,
                      outputText: boundCaseSubjectText(subject.outputText),
                    },
                  }
                : {}),
            }),
            mediaType: "application/json",
            schema: "role-model.evaluation-case-reference.v1",
          },
        },
      });
      const artifactId = result?.id;
      if (typeof artifactId !== "string" || !DURABLE_ARTIFACT_ID.test(artifactId)) {
        throw new Error(
          `artifact-store did not return a durable case-reference artifact for ${caseId}`,
        );
      }
      return `artifact:${artifactId}`;
    }),
  );
}

/**
 * Materialize the semantic facts used by Evaluation Core through the actual
 * artifact-store authority. Every write is read back by ID so a restart-safe
 * locator, rather than a request ID or local signature, enters the join.
 */
export async function persistSupervisedReplayEvaluationReferenceFacts(input: {
  readonly runtime: {
    readonly invoke: (
      id: string,
      envelope: Record<string, unknown>,
    ) => Promise<Record<string, unknown> | string | null>;
  };
  readonly requestId: string;
  readonly channel: string;
  readonly scope: string;
  readonly authorizationEpoch: number;
  readonly facts: SupervisedReplayEvaluationReferenceFactValues;
}): Promise<SupervisedReplayEvaluationReferenceFacts> {
  if (
    !input.requestId ||
    !input.channel ||
    !input.scope ||
    !Number.isSafeInteger(input.authorizationEpoch)
  ) {
    throw new Error("supervised replay reference-fact artifact identity is required");
  }
  const entries = [
    ["taskRef", "task", input.facts.task],
    ["inputRef", "input", input.facts.input],
    ["toolPolicyDigest", "tool_policy", input.facts.toolPolicy],
    ["environmentDigest", "environment", input.facts.environment],
  ] as const;
  const refs = await Promise.all(
    entries.map(async ([field, factType, fact]) => {
      if (!fact || typeof fact !== "object" || Array.isArray(fact)) {
        throw new Error(`supervised replay ${factType} fact is invalid`);
      }
      const content = JSON.stringify({
        schemaVersion: "role-model.evaluation-reference-fact.v1",
        factType,
        fact,
      });
      const factDigest = createHash("sha256").update(content).digest("hex").slice(0, 16);
      const result = await input.runtime.invoke("artifact-store", {
        // The write request id carries the fact digest: a retry that recomputes the
        // fact with different bytes (for example after a recovered attempt appends a
        // different branch root) must persist its own artifact instead of receiving a
        // cached result for an earlier attempt's bytes, which then fails the durable
        // readback comparison.
        requestId: `${input.requestId}:reference-fact:${factType}:${factDigest}`,
        sessionId: input.requestId,
        protocolVersion: "1.1.0",
        channel: input.channel,
        scope: input.scope,
        authorizationEpoch: input.authorizationEpoch,
        capability: "graph:write",
        payload: {
          scope: input.scope,
          record: {
            content,
            mediaType: "application/json",
            schema: "role-model.evaluation-reference-fact.v1",
          },
        },
      });
      const artifactId =
        result && typeof result === "object" && typeof result.id === "string" ? result.id : null;
      if (!artifactId || !DURABLE_ARTIFACT_ID.test(artifactId)) {
        throw new Error(`artifact-store did not return a durable ${factType} reference fact`);
      }
      const readback = await input.runtime.invoke("artifact-store", {
        // The readback id carries the same digest: the extension host caches durable
        // outputs by request id, so a retry that recomputed the fact must not read the
        // earlier attempt's cached bytes (which failed the durable comparison).
        requestId: `${input.requestId}:reference-fact-readback:${factType}:${factDigest}`,
        sessionId: input.requestId,
        protocolVersion: "1.1.0",
        channel: input.channel,
        scope: input.scope,
        authorizationEpoch: input.authorizationEpoch,
        capability: "artifact:read",
        payload: { scope: input.scope, id: artifactId },
      });
      const readbackText = decodeExtensionTextOutput(readback);
      if (readbackText === null || readbackText !== content) {
        throw new Error(`artifact-store reference fact ${factType} failed durable readback`);
      }
      const parsed = JSON.parse(readbackText) as Record<string, unknown>;
      if (
        parsed.schemaVersion !== "role-model.evaluation-reference-fact.v1" ||
        parsed.factType !== factType
      ) {
        throw new Error(`artifact-store reference fact ${factType} readback schema is invalid`);
      }
      return [field, `artifact:${artifactId}`] as const;
    }),
  );
  const result = Object.fromEntries(refs) as unknown as SupervisedReplayEvaluationReferenceFacts;
  assertDistinctDurableReferences(Object.values(result), "evaluation reference facts");
  return result;
}

type SupervisedReplayCompletionDispatch = Readonly<{
  readonly execution: Readonly<Record<string, unknown>>;
  readonly replayRequestId: string;
}>;

type SupervisedReplayCompletionOperations = Readonly<{
  readonly readLocalRouteCapture: (input: Record<string, unknown>) => Promise<unknown>;
}>;

/**
 * Run 99 R33 live finding (stage release swap): a durable post-observation backlog legitimately
 * carries the release identity that produced it, and validating every stored correlation against the
 * currently packaged release blocked the whole backend at startup after a release swap —
 *
 *   `runtime backend initialization failed Error: Run 88 correlation release identity mismatch`
 *
 * — which forced a rollback to the previous release to keep serving traffic. A backlog row is now
 * validated against its own recorded release identity (never rewritten: the receipt keeps naming the
 * release that served the request), while a live observation still validates against the packaged
 * release, and a malformed recorded identity falls back to it so the strict comparison still refuses.
 */
export function resolvePostObservationReleaseId(input: {
  readonly packagedReleaseId: string | undefined;
  readonly correlationReleaseId: unknown;
}): string | undefined {
  const recorded = input.correlationReleaseId;
  if (typeof recorded === "string" && /^sha256:[0-9a-f]{64}$/u.test(recorded)) return recorded;
  return input.packagedReleaseId;
}

/**
 * Run 101 addendum 44 - what a promotion job learned from its consume sweep.
 *
 * Measured live on `:3457` (RC `5bbc968a`): `learner.promote` held one terminal failure for
 * `shadow-70e04977e77f5ecbca32e6cae98afdf4d5…`, exhausted after three attempts with
 * `Error: no candidate was validated for shadow-70e04977…`. Two things were wrong with that:
 *
 * - the handler called the sweep with **no candidate filter** (`{ limit: 1 }`, which the sweep ignores -
 *   it walks its own cursor page and processes `pending.slice(0, 2)`), so a per-candidate job could
 *   consume another candidate's work or report failure for a candidate the sweep never looked at;
 * - the phrase "no candidate was validated" claims a validation verdict the sweep never reached. What
 *   actually happened is that no finalized comparison was available to validate - a *not-yet* condition
 *   that this run has had to name repeatedly so it can be counted.
 *
 * The observable class is deliberately unchanged: a job that cannot validate stays claimable and retries,
 * which R6 asks for ("named skips remain claimable"). Acknowledging it instead would be worse than the
 * bug - the job id is the candidate id and a completed job is never re-enqueued, so an early ack would
 * drop the candidate permanently.
 */
export type LearnerPromotionOutcome =
  | { readonly kind: "promoted" }
  | { readonly kind: "not_validatable"; readonly reason: string };

export function classifyLearnerPromotionResult(input: {
  readonly candidateId: string;
  readonly result: { readonly consumed?: number } | null | undefined;
}): LearnerPromotionOutcome {
  if (input.result && (input.result.consumed ?? 0) > 0) return { kind: "promoted" };
  return {
    kind: "not_validatable",
    reason: `candidate_not_validatable:${input.candidateId}: no finalized comparison was available to validate`,
  };
}

/**
 * Run 108 addendum-01 A5.3: the finalise guard's own refusal reason must reach the disposition the
 * operator surface reads (the replay disposition ledger). The guard throws
 * `durable replay evaluation did not finalize a valid comparison: <detail>` (the RC-1 observability
 * gap); this bounds exactly that class so the resume completion can write a named terminal
 * disposition row while every other failure class keeps its existing handling.
 */
export function finaliseRefusalDispositionDetail(error: unknown): string | null {
  const message = String((error as { message?: unknown })?.message ?? error ?? "");
  if (!message.startsWith("durable replay evaluation did not finalize a valid comparison:")) {
    return null;
  }
  return message.slice(0, 360);
}

/**
 * Production completion callback shared by the fresh and awaiting-evaluation
 * paths. Keeping the callback as a factory makes the durable join directly
 * testable without bypassing the CLI's actual completion registration.
 */
export function createSupervisedReplayEvaluationCompleter(input: {
  readonly runtime: Parameters<typeof runTrackBShadowPipeline>[0];
  readonly operations: SupervisedReplayCompletionOperations;
  readonly requestId: string;
  readonly channel: string;
  readonly scope: string;
  /**
   * R10/R11: the durable capture carries the private runtime scope, which is not
   * necessarily the host operator scope. Recovered branch validation must compare
   * against the capture's own scope, or a valid replay is rejected as "does not
   * match its fenced replay receipt".
   */
  readonly captureScope?: string;
  readonly sourceCapture: Readonly<Record<string, unknown>>;
  readonly sourceOutput: string;
  readonly sourceEndpointId: string;
  readonly sourceModelId: string;
  readonly counterfactualPackages: readonly {
    readonly endpointId: string;
    readonly modelId: string;
    readonly reasoningEffort: string | null;
  }[];
  readonly getDispatched: (endpointId: string) => SupervisedReplayCompletionDispatch | undefined;
  readonly evaluationCriteria: Readonly<Record<string, unknown>>;
  readonly evaluationCriteriaDigest: string;
  /** Host runtime state root; the completer persists the v1.1 route-learning contracts there. */
  readonly contractStateRoot?: string;
  /**
   * RC04 (L4): optional router-backed pairwise judge. When present, the automatic
   * comparison records a real preference dimension (with judge provenance) instead of
   * relying on a deterministic term that neither branch satisfies.
   */
  readonly judge?: TrackBPairwiseJudge;
  /**
   * Run 98 R3/R15: effective activation-policy floors for the learning pass, resolved from
   * the versioned policy config for this channel and scope.
   */
  readonly learningPolicy?: Readonly<{
    evidenceFloor: Readonly<{
      minDecisiveComparisons: number;
      minHoldoutComparisons: number;
      /** Run 98 addendum 32 S1: development-partition floor for the promotion gate. */
      minDevelopmentComparisons: number;
      minDistinctCaptures: number;
    }>;
    guardrails: Readonly<{ qualityMinDelta: number }>;
    /** Run 98 R19: the predeclared promotion protocol the validation decides under. */
    promotionProtocol?: Readonly<{
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
    evidenceMaxAgeMs?: number;
    /**
     * Run 100 R1/R7: the operator policy behind judge-independent arms. `exclude` (default) drops the
     * comparison's judge from its arms, `warn` does the same and records the exclusion, `off` leaves the
     * arm set as configured.
     */
    judgeArmExclusion?: "exclude" | "warn" | "off";
    /** Run 100 R7: the policy arm bound (falls back to the resolved environment value when absent). */
    maxCounterfactualArms?: number;
  }>;
  readonly runPipeline?: typeof runTrackBShadowPipeline;
  /**
   * Run 101 addendum 46 (measured live on `:3457`, 2026-09-28): the compare-to-derive hand-off belongs to
   * whoever finalized the comparison, not to one driver.
   *
   * The learner's input is the *finalized comparison* (`R6`), and until this addendum the offer lived only in
   * the inline `completeEvaluation` wrapper — so when the `evaluation.score` plane became authoritative the
   * derivation would have stopped being offered by the path that actually finished the work. `learner.derive`'s
   * `jobIdRule` is `groupId`, so the queue dedupes a second offer for the same group; offering from the shared
   * completer is therefore idempotent as well as correct.
   */
  readonly offerLearnerDerivation?: (comparisonGroupId: string) => Promise<void>;
  /**
   * Run 98 addendum 33 S2: the judge's measured position consistency for the endpoint that will judge this
   * comparison, resolved by the caller (it owns the ledger and the policy snapshot). It travels into the
   * pipeline so the promotion gate sees the same measurement the ledger records.
   */
  readonly judgeConsistency?: {
    readonly judgeEndpointId: string;
    readonly orderChecks: number;
    readonly orderDisagreements: number;
    readonly consistency: number | null;
    readonly sufficientSample: boolean;
    readonly belowFloor: boolean;
  } | null;
  /**
   * Run 98 addendum 34 S1: the durable coverage ledger that orders the extra pairs a capture adds.
   * The caller owns the state root, so it resolves the path; when it is absent the completer still
   * plans the pairs deterministically from an empty snapshot and records nothing.
   */
  readonly pairCoverageLedgerPath?: string;
}) {
  const runPipeline = input.runPipeline ?? runTrackBShadowPipeline;
  return async (request: Readonly<Record<string, unknown>>) => {
    const evaluationJobId =
      typeof request.evaluationJobId === "string" ? request.evaluationJobId : "";
    const replayJobId = typeof request.replayJobId === "string" ? request.replayJobId : "";
    const replayJob =
      request.replayJob &&
      typeof request.replayJob === "object" &&
      !Array.isArray(request.replayJob)
        ? (request.replayJob as Record<string, unknown>)
        : null;
    const callbackBranches = Array.isArray(request.resultBranches) ? request.resultBranches : [];
    const replayDispatches =
      replayJob?.dispatches &&
      typeof replayJob.dispatches === "object" &&
      !Array.isArray(replayJob.dispatches)
        ? (replayJob.dispatches as Record<string, unknown>)
        : {};
    const persistedBranches = Array.isArray(replayJob?.branches) ? replayJob.branches : [];
    const branchRootByCandidate = new Map<string, string>();
    for (const branch of [...persistedBranches, ...callbackBranches]) {
      if (!branch || typeof branch !== "object" || Array.isArray(branch)) continue;
      const record = branch as Record<string, unknown>;
      const candidateEndpointId =
        typeof record.candidateEndpointId === "string"
          ? record.candidateEndpointId
          : typeof record.endpointId === "string"
            ? record.endpointId
            : "";
      const branchRootRef = typeof record.branchRootRef === "string" ? record.branchRootRef : "";
      if (candidateEndpointId && branchRootRef) {
        branchRootByCandidate.set(candidateEndpointId, branchRootRef);
      }
    }
    if (!evaluationJobId || !replayJobId) {
      throw new Error("durable replay evaluation is missing its evaluation job identity");
    }
    /**
     * Run 100 R2 (live stage, released candidate `d19dcff3`): an arm's comparable output comes from its
     * durable branch capture. Two live classes discarded the whole capture instead:
     *
     *  - `durable replay evaluation is missing counterfactual output evidence` (23:04:00Z) - the arm's
     *    durable answer was tool-call shaped (no assistant text), so the text-only projection found
     *    nothing even though the capture carried the calls.
     *  - `durable replay evaluation is missing branch capture for <endpoint>` (HTTP 409, 23:09:55Z and
     *    23:30:33Z) - the arm's capture was skipped by the deferred-capture budget (the same window logs
     *    `route capture skipped: 4000446 bytes exceeds the 524288-byte deferred capture budget`).
     *
     * The requirement is explicit: a tool-call-shaped answer is comparable evidence, and an arm whose
     * capture genuinely cannot be produced is a **named per-arm exclusion** that must not cost the other
     * arms' evidence. Only those two availability classes are excludable; provenance failures still fail
     * the capture.
     */
    const counterfactualExclusions: Array<{ endpointId: string; reason: string }> = [];
    const excludableArmReason =
      /missing branch capture for |missing counterfactual output evidence/u;
    const projectArmOutput = (
      capture: Record<string, unknown>,
      dispatched: string | null,
      recovered: Record<string, unknown> | null,
    ): string | null => {
      const text =
        dispatched ??
        (typeof capture.responseText === "string" && capture.responseText.trim()
          ? capture.responseText
          : null) ??
        (typeof recovered?.content === "string" && recovered.content.trim()
          ? recovered.content
          : null) ??
        (typeof capture.outputText === "string" && capture.outputText.trim()
          ? capture.outputText
          : null);
      if (text) return text;
      // A tool-call-shaped answer is the arm's answer: serialise the captured calls, bounded.
      const tools = Array.isArray(capture.tools) ? (capture.tools as unknown[]) : [];
      if (tools.length === 0) return null;
      return `tool-calls:${JSON.stringify(tools.slice(0, 16)).slice(0, 4_096)}`;
    };
    const resolvedCounterfactuals: Array<{
      candidate: (typeof input.counterfactualPackages)[number];
      replayRequestId: string;
      output: string;
      outputSha256: string;
      branchCapture: Record<string, unknown>;
    }> = [];
    for (const candidate of input.counterfactualPackages) {
      try {
        const dispatchedCandidate = input.getDispatched(candidate.endpointId);
        const durableDispatch = replayDispatches[candidate.endpointId] as
          | Record<string, unknown>
          | undefined;
        const durableResult =
          durableDispatch?.result && typeof durableDispatch.result === "object"
            ? (durableDispatch.result as Record<string, unknown>)
            : null;
        const providerResultRef =
          typeof durableResult?.providerResultRef === "string"
            ? durableResult.providerResultRef
            : null;
        const recoveredRequestId = providerResultRef?.startsWith("route-capture:")
          ? providerResultRef.slice("route-capture:".length)
          : null;
        const replayRequestId = dispatchedCandidate?.replayRequestId ?? recoveredRequestId;
        const branchRequestId = replayRequestId ? `${replayRequestId}-branch` : null;
        const branchCapture = branchRequestId
          ? ((await input.operations.readLocalRouteCapture({
              requestId: branchRequestId,
            })) as Record<string, unknown> | null)
          : null;
        const branchRootRef = branchRootByCandidate.get(candidate.endpointId) ?? null;
        if (!branchCapture) {
          throw new Error(
            `durable replay evaluation is missing branch capture for ${candidate.endpointId}`,
          );
        }
        const dispatchedExecution = dispatchedCandidate?.execution;
        const routerDecisionId =
          durableResult?.routerDecisionId ?? dispatchedExecution?.routingDecisionId;
        if (branchRootRef && branchCapture.rootArtifactId !== branchRootRef) {
          throw new Error(`durable replay branch root drifted for ${candidate.endpointId}`);
        }
        if (typeof routerDecisionId !== "string" || !routerDecisionId) {
          throw new Error(
            `durable replay evaluation is missing router decision provenance for ${candidate.endpointId}`,
          );
        }
        validateRecoveredReplayCapture({
          scope: input.captureScope ?? input.scope,
          candidate,
          dispatchReceipt: {
            routerDecisionId,
            branchRootRef: branchRootRef ?? branchCapture.rootArtifactId,
          },
          capture: branchCapture,
        });
        const recoveredResponse =
          branchCapture.response && typeof branchCapture.response === "object"
            ? (branchCapture.response as Record<string, unknown>)
            : null;
        const output = projectArmOutput(
          branchCapture,
          typeof dispatchedExecution?.outputText === "string" && dispatchedExecution.outputText
            ? dispatchedExecution.outputText
            : null,
          recoveredResponse,
        );
        if (!output) {
          throw new Error("durable replay evaluation is missing counterfactual output evidence");
        }
        resolvedCounterfactuals.push({
          candidate,
          // The later provenance gate refuses an empty id; the array's type is the non-null shape.
          replayRequestId: replayRequestId ?? "",
          output,
          outputSha256: createHash("sha256").update(output, "utf8").digest("hex"),
          branchCapture,
        });
      } catch (armError) {
        const reason = String(
          (armError as { message?: unknown })?.message ?? armError ?? "unknown",
        ).slice(0, 200);
        if (!excludableArmReason.test(reason)) throw armError;
        counterfactualExclusions.push({ endpointId: candidate.endpointId, reason });
      }
    }
    if (resolvedCounterfactuals.length === 0) {
      throw new Error(
        `durable replay evaluation has no comparable counterfactual arm: excluded ${counterfactualExclusions
          .map((entry) => `${entry.endpointId} (${entry.reason})`)
          .join("; ")}`.slice(0, 512),
      );
    }
    /**
     * Run 100 R1 (live stage, released candidate `d19dcff3`): the comparison's judge must not be one of
     * its arms. Evaluation Core derives `judge_self_evaluation` from the comparison's scored trial set,
     * and the learner then discards the comparison - the largest exclusion bucket in the newest
     * receipts (`incomparable:judge_self_evaluation` 152-154). The exclusion happens *here*, where the
     * arms, their per-case reference proofs and the comparison are built together, so every downstream
     * artefact (cases, references, comparability, the finalize pair) describes the same arm set.
     */
    const judgeEndpointId =
      typeof input.judge?.endpointId === "string" ? input.judge.endpointId.trim() : "";
    /**
     * Run 100 R7: whether the judge is excluded from the arm set is operator policy
     * (`judgeArmExclusion`, default `exclude`). `off` keeps the arm set as configured and leaves the
     * resulting self-judged evidence to the learner's exclusion, which is the pre-run-100 behaviour.
     */
    const judgeArmExclusion = input.learningPolicy?.judgeArmExclusion ?? "exclude";
    const counterfactuals =
      judgeEndpointId && judgeArmExclusion !== "off"
        ? resolvedCounterfactuals.filter((entry) => {
            if (entry.candidate.endpointId !== judgeEndpointId) return true;
            counterfactualExclusions.push({
              endpointId: entry.candidate.endpointId,
              reason: `judge_arm_excluded: the comparison's judge cannot be one of its arms (policy ${judgeArmExclusion})`,
            });
            return false;
          })
        : resolvedCounterfactuals;
    if (judgeEndpointId && judgeArmExclusion !== "off" && counterfactuals.length === 0) {
      throw new Error(
        `R14_ALL_CANDIDATES_ARE_JUDGE: the configured counterfactual pool only contains the comparison's judge ${judgeEndpointId}`.slice(
          0,
          320,
        ),
      );
    }
    if (counterfactuals.some(({ replayRequestId }) => !replayRequestId)) {
      throw new Error("durable replay evaluation cannot recover counterfactual request provenance");
    }
    const sourceRootArtifactId =
      typeof input.sourceCapture.rootArtifactId === "string"
        ? input.sourceCapture.rootArtifactId
        : "";
    const sourceDecisionId =
      typeof input.sourceCapture.routingDecisionId === "string"
        ? input.sourceCapture.routingDecisionId
        : "";
    if (!sourceRootArtifactId || !sourceDecisionId) {
      throw new Error("durable replay evaluation is missing source provenance");
    }
    /**
     * R5: the released comparability tuple names exactly one source and one counterfactual candidate
     * (Evaluation Core refuses a *finalized comparison* whose trials name anyone else), so the durable
     * comparison still decides between the source and the **first** arm - that is the primary pair and it
     * is unchanged.
     *
     * Run 98 addendum 34 S3 (live v223 finding): truncating *here* threw the other arms away before the
     * pipeline ever saw them, and with them the family's development partition. Measured live: every
     * durable case in the store carried `partition: holdout` — 516 comparison groups and not one
     * development case — because a candidate that contributes a single case was forced into the holdout,
     * and a job that only ever carries the two compared cases has nothing else to partition. The family
     * split always moves at least one case of a multi-case family into the train partition, so the
     * promotion gate's `minDevelopmentComparisons` floor could only ever answer
     * `development_partition_missing`.
     *
     * Every arm the capture already paid for now travels as a durable case. The comparison still decides
     * between the primary pair (its holdout cases are exactly those two), and the arms the comparison does
     * not decide between carry the partition the split declared — the development evidence the protocol
     * fits on.
     */
    const evaluatedCounterfactuals = counterfactuals;
    const caseIds = Array.from(
      { length: 1 + evaluatedCounterfactuals.length },
      (_, index) => `replay:${replayJobId}:${index}`,
    );
    const captures = [
      input.sourceCapture,
      ...evaluatedCounterfactuals.map(({ branchCapture }) => branchCapture),
    ];
    const perCaseEvidenceRefs = await persistSupervisedReplayEvaluationCaseReferences({
      runtime: input.runtime,
      requestId: createSupervisedReplayEvaluationRequestId(input.requestId, replayJobId),
      channel: input.channel,
      scope: input.scope,
      authorizationEpoch: 1,
      caseIds,
      captures,
      // Run 98 addendum 31 S2: the case reference carries the bounded evaluation subject, so the
      // score's input is readable from the evaluation store instead of only through the capture.
      subjects: captures.map((_capture, index) => ({
        taskText: extractTaskInstructionText(input.sourceCapture) ?? "",
        criteria: input.evaluationCriteria,
        outputText:
          index === 0 ? input.sourceOutput : (evaluatedCounterfactuals[index - 1]?.output ?? ""),
      })),
    });
    const sourceReplaySource = durableReplaySource(input.sourceCapture, "source replay capture");
    const sourceSharedPrefixRef = durableCaptureArtifactReference(
      sourceReplaySource,
      "sharedPrefixRef",
      "source shared prefix",
    );
    const sourceNormalizedRequestRef = durableCaptureArtifactReference(
      sourceReplaySource,
      "normalizedRequestRef",
      "source normalized request",
    );
    const sourcePolicySnapshotRef = durableCaptureArtifactReference(
      sourceReplaySource,
      "policySnapshotRef",
      "source policy snapshot",
    );
    const sourceCapturePolicyRef = durableCaptureArtifactReference(
      sourceReplaySource,
      "capturePolicyRef",
      "source capture policy",
    );
    const sourceMessageArtifactRefs = Array.isArray(input.sourceCapture.messageArtifactIds)
      ? input.sourceCapture.messageArtifactIds.map((value, index) =>
          durableCaptureArtifactReference(
            { artifactId: value },
            "artifactId",
            `source message ${index}`,
          ),
        )
      : [];
    if (sourceMessageArtifactRefs.length === 0) {
      throw new Error("durable replay evaluation source input artifacts are missing");
    }
    // The input fact is read back byte-for-byte to prove durability, and the extension
    // host returns very large results as a transfer artifact instead of inline bytes.
    // A long tool-bearing transcript produced an 8 KB fact that could not be decoded,
    // so the fact now binds the exact reference set by digest and carries a bounded
    // prefix of the refs; the digest is what the attestation depends on.
    const MAX_REFERENCE_FACT_REFS = 64;
    const boundedMessageArtifactRefs = sourceMessageArtifactRefs.slice(0, MAX_REFERENCE_FACT_REFS);
    const messageArtifactRefsDigest = createHash("sha256")
      .update(JSON.stringify(sourceMessageArtifactRefs))
      .digest("hex");
    const replayReferenceFacts = await persistSupervisedReplayEvaluationReferenceFacts({
      runtime: input.runtime,
      requestId: createSupervisedReplayEvaluationRequestId(input.requestId, replayJobId),
      channel: input.channel,
      scope: input.scope,
      authorizationEpoch: 1,
      facts: {
        task: {
          schemaVersion: "role-model.evaluation-task-fact.v1",
          kind: "routing_shadow_replay",
          sourceDecisionId,
          sourceRootArtifactRef: `artifact:${sourceRootArtifactId}`,
          routePackage: input.sourceEndpointId,
          candidateEndpointIds: counterfactuals.map(({ candidate }) => candidate.endpointId),
          evaluationCriteriaDigest: input.evaluationCriteriaDigest,
        },
        input: {
          schemaVersion: "role-model.evaluation-input-fact.v1",
          normalizedRequestRef: sourceNormalizedRequestRef,
          messageArtifactRefs: boundedMessageArtifactRefs,
          messageArtifactCount: sourceMessageArtifactRefs.length,
          messageArtifactRefsDigest,
        },
        toolPolicy: {
          schemaVersion: "role-model.evaluation-tool-policy-fact.v1",
          mode: "deny",
          policySnapshotRef: sourcePolicySnapshotRef,
          capturePolicyRef: sourceCapturePolicyRef,
        },
        environment: {
          schemaVersion: "role-model.evaluation-environment-fact.v1",
          channel: input.channel,
          scope: input.scope,
          authorizationEpoch: 1,
          replaySourceSchemaVersion: sourceReplaySource.schemaVersion,
          sourceGeneration:
            input.sourceCapture.trace &&
            typeof input.sourceCapture.trace === "object" &&
            typeof (input.sourceCapture.trace as Record<string, unknown>).generation === "number"
              ? (input.sourceCapture.trace as Record<string, unknown>).generation
              : null,
        },
      },
    });
    const replayReferenceBuild = buildSupervisedReplayEvaluationReferences({
      sourceCapture: input.sourceCapture,
      counterfactualCaptures: evaluatedCounterfactuals.map(({ branchCapture }) => branchCapture),
      caseIds,
      perCaseEvidenceRefs,
      referenceFacts: replayReferenceFacts,
    });
    const trajectoryEvents = deriveSupervisedReplayTrajectoryEvents({
      sourceCapture: input.sourceCapture,
      counterfactualCaptures: evaluatedCounterfactuals.map(({ branchCapture }) => branchCapture),
    });
    const sourceRolloutReferences = replayReferenceBuild.rolloutReferences[0];
    if (!sourceRolloutReferences) {
      throw new Error("durable replay evaluation is missing source rollout references");
    }
    const evaluated = await runPipeline(input.runtime, {
      requestId: createSupervisedReplayEvaluationRequestId(input.requestId, replayJobId),
      channel: input.channel,
      scope: input.scope,
      authorizationEpoch: 1,
      // Run 99 R33 (S34 live finding): every comparison in the live store carried no task family
      // because this supervised-replay path never passed the capture's family, so the learner's
      // family-scoped floor could never be met from real traffic. The capture records the family
      // (`addendum 19 S33`), so it travels with the replay - read through the same classification
      // fallback the role and the revision already use (Run 106), because a capture that records the
      // family only on its classification produced a comparison the floor excludes as incomplete_scope.
      ...(() => {
        const taskTypeId = readCaptureTaskTypeId(input.sourceCapture);
        return taskTypeId ? { taskTypeId } : {};
      })(),
      // Run 98 addendum 58 §22.2.3: the revision the capture was classified under travels with the
      // family, so the comparability key — and the pack scope the learner derives from it — is
      // version-stamped and the advisory's version gate can match it instead of failing closed.
      ...(() => {
        const taxonomyVersion = readCaptureTaxonomyVersion(input.sourceCapture);
        return taxonomyVersion ? { taxonomyVersion } : {};
      })(),
      // Run 98 addendum 58 §38: the role travels with the family and the revision, so the learner's candidate
      // (and the pack it promotes) carries a role scope the advisory gate can match.
      ...(() => {
        const roleId = readCaptureRoleId(input.sourceCapture);
        return roleId ? { roleId } : {};
      })(),
      // Run 98 addendum 30 S4 (live finding, stage v190): the pipeline has recorded the judge
      // presentation-order policy in the comparability key since run 99 close-out, but this
      // supervised-replay path never passed it — so `0 of 473` durable evaluation jobs (and the
      // comparison groups built from them) carried the order their judge actually ran under. The
      // judge already resolved the policy (env override, then the versioned operator policy, then
      // source-first), so the comparison records exactly what that judge applied.
      ...(input.judge?.orderPolicy ? { judgeOrderPolicy: input.judge.orderPolicy } : {}),
      // Run 98 addendum 34 S9 (live v210, real dsh traffic): the job records *which* endpoint judges it.
      // Without this the write-time independence guard fell back to scanning every registered judge
      // manifest that shares the scorer-set version — including a historical one that designated
      // `deepseek-flash-max` — and refused candidates that are not today's judge at all, so real
      // captures deferred to refusal (`judge_candidate_overlap`).
      ...(input.judge?.endpointId ? { judgeEndpointId: input.judge.endpointId } : {}),
      /**
       * S44 (measured live: a recovered handoff with resolvable evidence was refused with
       * `judge_candidate_overlap … is the judge declared by scorer set run96-routing-shadow-v3`): the judge's
       * source has to be declared, because Evaluation Core only skips the historical-manifest scan when the
       * job says where its judge comes from. The rule is the operator's: the judge is the controller.
       */
      judgeSource:
        (input.judge as { judgeSource?: "controller" | "disabled" } | undefined)?.judgeSource ??
        "controller",
      // Run 98 addendum 45 J2: the comparison also records where that judge came from (the controller
      // assignment, and when that assignment last changed), so a controller switch is visible on the job.
      /**
       * Run 100 addendum `handoff-evidence-durability.addendum-06` S44 (measured live: a recovered handoff
       * that had finally resolved its evidence was refused with `judge_candidate_overlap: candidate
       * deepseek…flash-high is the judge declared by scorer set run96-routing-shadow-v3`).
       *
       * The operator's judge rule is "the judge is the configured controller, resolved at judge time" - no
       * endpoint or model id is pinned - but this comparability only carried `judgeSource` when a judge object
       * happened to be resolved, so a job created without one fell through to Evaluation Core's legacy scan of
       * *historical* manifests sharing the scorer-set version and refused a candidate that is not today's
       * judge at all. The repair belongs here: the comparability must declare the source even when no judge
       * object was resolved (`judgeSource: "controller"`), because that is the rule the harness applies.
       */
      ...(input.judge?.judgeSource ? { judgeSource: input.judge.judgeSource } : {}),
      ...(input.judge?.judgeAssignmentUpdatedAtMs === undefined ||
      input.judge?.judgeAssignmentUpdatedAtMs === null
        ? {}
        : { judgeAssignmentUpdatedAtMs: input.judge.judgeAssignmentUpdatedAtMs }),
      // Run 98 addendum 33 S2: the judge's measured position consistency for the endpoint that judges this
      // comparison (resolved by the caller), so a below-floor judge cannot promote what it graded.
      ...(input.judgeConsistency ? { judgeConsistency: input.judgeConsistency } : {}),
      productionState: {},
      routePackage: input.sourceEndpointId,
      sourceDecisionId,
      sourceGraphRef: `artifact:${sourceRootArtifactId}`,
      prefix: [],
      sourcePrefixRef: sourceSharedPrefixRef,
      counterfactuals: evaluatedCounterfactuals.map(({ candidate }) => ({
        id: candidate.endpointId,
        suffix: [],
      })),
      comparableEvidence: {
        source: {
          rolloutId: `source:${input.requestId}`,
          routePackage: input.sourceEndpointId,
          endpointId: input.sourceEndpointId,
          modelId: input.sourceModelId,
          policyId: "run96-supervised-replay",
          reasoningEffort:
            typeof input.sourceCapture.reasoningEffort === "string"
              ? input.sourceCapture.reasoningEffort
              : null,
          effortSource:
            typeof input.sourceCapture.effortSource === "string"
              ? input.sourceCapture.effortSource
              : "none",
          evidenceRef: sourceRolloutReferences.evidenceRef,
          artifactRef: sourceRolloutReferences.artifactRef,
          evaluationActual: input.sourceOutput,
          propensity: 1,
          outcome: {
            outcomeId: `outcome:source:${input.requestId}`,
            outcomeRef: sourceRolloutReferences.outcomeRef,
            outcomeDigest: `sha256:${createHash("sha256").update(input.sourceOutput, "utf8").digest("hex")}`,
            source: "observed",
            status: "success",
          },
        },
        counterfactuals: evaluatedCounterfactuals.map(
          ({ candidate, replayRequestId, output, outputSha256 }, index) => {
            const rolloutReferences = replayReferenceBuild.rolloutReferences[index + 1];
            if (!rolloutReferences) {
              throw new Error(
                `durable replay evaluation is missing rollout references for ${candidate.endpointId}`,
              );
            }
            return {
              rolloutId: `counterfactual:${replayRequestId}`,
              routePackage: candidate.endpointId,
              endpointId: candidate.endpointId,
              modelId: candidate.modelId,
              policyId: "run96-supervised-replay",
              reasoningEffort: candidate.reasoningEffort,
              effortSource: "variant",
              evidenceRef: rolloutReferences.evidenceRef,
              artifactRef: rolloutReferences.artifactRef,
              evaluationActual: output,
              propensity: 1,
              outcome: {
                outcomeId: `outcome:${replayRequestId}`,
                outcomeRef: rolloutReferences.outcomeRef,
                outcomeDigest: `sha256:${outputSha256}`,
                source: "replay",
                status: "success",
              },
            };
          },
        ),
        candidateSet: [
          {
            routePackage: input.sourceEndpointId,
            endpointId: input.sourceEndpointId,
            propensity: 1,
          },
          ...counterfactuals.map(({ candidate }) => ({
            routePackage: candidate.endpointId,
            endpointId: candidate.endpointId,
            propensity: 1,
          })),
        ],
      },
      evaluationCases: caseIds.map((id) => ({ id, evaluationCriteria: input.evaluationCriteria })),
      trajectoryEvents,
      evaluationReferences: replayReferenceBuild.evaluationReferences,
      evaluationJobIds: [
        evaluationJobId,
        ...counterfactuals.map(
          ({ candidate }) =>
            `${evaluationJobId}:${createHash("sha256").update(candidate.endpointId).digest("hex").slice(0, 12)}`,
        ),
      ],
      ...(input.judge ? { judge: input.judge } : {}),
      ...(input.contractStateRoot ? { contractStateRoot: input.contractStateRoot } : {}),
      identity: {
        endpointId: input.sourceEndpointId,
        modelId: input.sourceModelId,
        reasoningEffort:
          typeof input.sourceCapture.reasoningEffort === "string"
            ? input.sourceCapture.reasoningEffort
            : null,
        effortSource:
          typeof input.sourceCapture.effortSource === "string"
            ? (input.sourceCapture.effortSource as
                | "none"
                | "client"
                | "variant"
                | "variant_coerced")
            : "none",
      },
      // Run 98 R3/R15: the learning pass validates against the effective, versioned
      // activation-policy floors for this scope rather than a hardcoded threshold.
      ...(input.learningPolicy ? { learningPolicy: input.learningPolicy } : {}),
    });
    if (trajectoryEvents.length < 2) {
      const evaluatedCandidate =
        evaluated.candidate &&
        typeof evaluated.candidate === "object" &&
        !Array.isArray(evaluated.candidate)
          ? (evaluated.candidate as Record<string, unknown>)
          : null;
      if (evaluatedCandidate?.state !== "insufficient_trajectory_evidence") {
        throw new Error(
          "durable replay evaluation must decline learning when captured trajectory evidence is insufficient",
        );
      }
    }
    /**
     * Run 100 R3 (live finding, clean verification window 2026-09-22): the pipeline's normal return
     * carries the observation's own `evaluation` beside the comparison it validated, so the completion
     * path reads the comparison from its own key when it is present and keeps the previous field as the
     * fallback for every other producer of this record.
     */
    const evaluatedRecordForComparison =
      evaluated && typeof evaluated === "object" && !Array.isArray(evaluated)
        ? (evaluated as Record<string, unknown>)
        : {};
    const comparison = (evaluatedRecordForComparison.comparison ??
      evaluatedRecordForComparison.evaluation ??
      {}) as Record<string, unknown>;
    const outcome = comparison.outcome;
    const comparisonGroupId = comparison.groupId;
    if (
      typeof comparisonGroupId !== "string" ||
      !comparisonGroupId ||
      ![
        "candidate",
        "source",
        "tie",
        "rejected",
        "incomplete",
        "insufficient",
        "disagreement",
      ].includes(String(outcome))
    ) {
      /**
       * Run 100 R3 legibility (live finding, clean verification window 2026-09-22): three captures
       * carried only this sentence, while the pipeline had returned a *decline record* whose own reason
       * was bounded and available (`state`, `reason`, `refusal.code`, the comparison's `outcome`). The
       * refusal now names what arrived, so the disposition says which branch declined instead of
       * collapsing every shape into one sentence.
       */
      const evaluatedRecord =
        evaluated && typeof evaluated === "object" && !Array.isArray(evaluated)
          ? (evaluated as Record<string, unknown>)
          : {};
      const refusal =
        evaluatedRecord.refusal && typeof evaluatedRecord.refusal === "object"
          ? (evaluatedRecord.refusal as Record<string, unknown>)
          : {};
      const detail = [
        typeof evaluatedRecord.state === "string" ? `state=${evaluatedRecord.state}` : "",
        typeof evaluatedRecord.reason === "string" ? `reason=${evaluatedRecord.reason}` : "",
        typeof refusal.code === "string" ? `refusal=${refusal.code}` : "",
        outcome === undefined || outcome === null ? "outcome=absent" : `outcome=${String(outcome)}`,
        comparisonGroupId ? `group=${String(comparisonGroupId).slice(0, 48)}` : "group=absent",
        // Run 100 R3 (second live read): with none of the fields above present, the record itself is the
        // only remaining evidence - its own keys name the shape the pipeline returned (a wrapper, a
        // transport envelope, or a record with the comparison nested elsewhere).
        `keys=${Object.keys(evaluatedRecord).slice(0, 12).join(",") || "none"}`,
      ]
        .filter(Boolean)
        .join(" ");
      // Run 108 R7: the finalise-refusal span + metric - the RC-1 observability gap (which guard
      // refused never reached the disposition). Tagged by the bounded detail so each refusal counts once.
      withStageSpan("eval.finalise_refusal", { guard: "finalise" }, () => {
        recordFinaliseRefusal("finalise", detail.slice(0, 80));
      });
      throw new Error(
        `durable replay evaluation did not finalize a valid comparison: ${detail}`.slice(0, 512),
      );
    }
    /**
     * Run 98 addendum 34 S1 (live stage v211-v218: 503 groups, every one of them two members,
     * `deepseek-flash-high` an arm in 497, 11 of 21 candidate pairs with no direct comparison at all).
     *
     * The primary comparison above covers (served source, first arm): `evaluatedCounterfactuals` is one
     * arm by construction, because Evaluation Core refuses a trial whose candidate is not one of the two
     * the comparability tuple names. The other arms the capture already paid for therefore stayed
     * recorded replay branches with no comparison, which is why rotating the counterfactual could never
     * close a pair that excludes the served model.
     *
     * The pair matrix is the unit, so every planned pair is completed by the same factory that produced
     * this comparison - once per pair, with its own evaluation job, group identity and durable
     * references, ordered least-covered-first by the coverage ledger and bounded per capture. Both sides
     * are already-durable captures, so an extra pair costs scoring and judging, never another model
     * dispatch. A pair that cannot be completed (a side whose provenance is not a usable source) is
     * declined with a bounded reason: extra evidence may never fail the capture's decisive comparison.
     */
    const extraComparisons: Array<Record<string, unknown>> = [];
    const maxExtraPairs = resolveMaxExtraPairComparisons(process.env);
    if (maxExtraPairs > 0 && counterfactuals.length > 1) {
      const ledger = input.pairCoverageLedgerPath
        ? createPairCoverageLedger({ filePath: input.pairCoverageLedgerPath })
        : null;
      const primaryArm = counterfactuals[0];
      const primaryArmId = primaryArm?.candidate.endpointId ?? "";
      // The primary comparison is evidence even though it never passed through the planner.
      if (ledger && primaryArmId) ledger.record(input.sourceEndpointId, primaryArmId);
      const planned = planPairComparisons({
        source: {
          endpointId: input.sourceEndpointId,
          modelId: input.sourceModelId,
          capture: input.sourceCapture as Readonly<Record<string, unknown>>,
          output: input.sourceOutput,
        },
        arms: counterfactuals.map((entry) => ({
          endpointId: entry.candidate.endpointId,
          modelId: entry.candidate.modelId,
          capture: entry.branchCapture,
          output: entry.output,
        })),
        endpointIdOf: (entry) => entry.endpointId,
        coverage: ledger?.snapshot() ?? { pairCounts: {} },
        maxPairs: maxExtraPairs,
        ...(primaryArmId ? { excludePairs: [pairKey(input.sourceEndpointId, primaryArmId)] } : {}),
      });
      for (const [index, pair] of planned.entries()) {
        const suffix = `:pair${index + 1}`;
        try {
          const pairCompleter = createSupervisedReplayEvaluationCompleter({
            ...input,
            requestId: `${input.requestId}${suffix}`,
            sourceCapture: pair.left.capture as Readonly<Record<string, unknown>>,
            sourceOutput: pair.left.output,
            sourceEndpointId: pair.left.endpointId,
            sourceModelId: pair.left.modelId,
            counterfactualPackages: [
              {
                endpointId: pair.right.endpointId,
                modelId: pair.right.modelId,
                reasoningEffort:
                  counterfactuals.find(
                    (entry) => entry.candidate.endpointId === pair.right.endpointId,
                  )?.candidate.reasoningEffort ?? null,
              },
            ],
            // One level only: an extra comparison never plans further pairs.
            pairCoverageLedgerPath: undefined,
          });
          const completed = (await pairCompleter({
            replayJobId: `${replayJobId}${suffix}`,
            evaluationJobId: `${evaluationJobId}${suffix}`,
            ...(replayJob ? { replayJob } : {}),
            resultBranches: callbackBranches,
          })) as Record<string, unknown>;
          ledger?.record(pair.left.endpointId, pair.right.endpointId);
          extraComparisons.push({
            pair: [pair.left.endpointId, pair.right.endpointId],
            comparisonGroupId:
              typeof completed.comparisonGroupId === "string" ? completed.comparisonGroupId : null,
            outcome: typeof completed.outcome === "string" ? completed.outcome : null,
          });
        } catch (error) {
          console.error(
            `[run98] extra pair comparison declined:${input.requestId} ${pair.left.endpointId}<->${pair.right.endpointId} ${String(
              (error as { message?: unknown })?.message ?? error,
            ).slice(0, 200)}`,
          );
        }
      }
    }
    /**
     * Run 101 addendum 46: the comparison is final, so the derivation is offered here - by whichever driver
     * completed it. A refused offer is logged rather than thrown: the comparison is already durable, which is
     * the same rule the inline wrapper applied before this addendum.
     */
    if (comparisonGroupId && input.offerLearnerDerivation) {
      try {
        await input.offerLearnerDerivation(comparisonGroupId);
      } catch (error) {
        console.error(
          `[run101] learner derive offer declined:${comparisonGroupId} ${String(
            (error as { message?: unknown })?.message ?? error,
          ).slice(0, 160)}`,
        );
      }
    }
    return {
      evaluationJobId,
      comparisonGroupId,
      outcome,
      comparisonDigest: `sha256:${createHash("sha256").update(JSON.stringify(comparison)).digest("hex")}`,
      /**
       * Run 100 R2: the arms this capture could not compare travel with the result so the disposition
       * and the Learning evidence view can show *why* evidence was lost instead of a generic deferral.
       */
      counterfactualExclusions,
      ...(extraComparisons.length > 0 ? { extraComparisons } : {}),
    };
  };
}

type RuntimeOperatorCallbacks = Pick<
  CreateRuntimeBridgeBackendOptions,
  | "readOperatorStatus"
  | "listOperatorTraceRoots"
  | "readOperatorTraceRoot"
  | "listReplayJobs"
  | "createReplayJob"
  | "cancelReplayJob"
  | "readReplayJob"
  | "readReplayResults"
  | "listEvaluationJobs"
  | "readEvaluationJob"
  | "listEvaluationTrials"
  | "listEvaluationScorers"
  | "listEvaluationComparisons"
  | "listEvaluationGroups"
  | "cancelEvaluationJob"
  | "retryEvaluationJob"
  | "readLearningState"
  | "readLearningProfile"
  | "readLearningAdvisory"
  | "updateLearningMode"
  | "rollbackLearning"
  | "readLearningRollout"
  | "readLearningRecords"
  | "readLearningDecisions"
  | "readLearningMeasurement"
  | "readLearningActivity"
  | "readLearningHistory"
  | "readLearningPolicy"
  | "setLearningPolicy"
  | "rollbackLearningPolicy"
  | "activateLearningPack"
  | "rollbackLearningPack"
  | "recordLearningGuardrailBreach"
  | "restoreLearningScenarioActivation"
  | "engageLearningKillSwitch"
  | "readQueues"
  | "readQueueJobs"
  | "readQueueJob"
  | "readQueueReceipts"
  | "readQueueConfig"
  | "setQueueConfig"
  | "retryQueueJob"
  | "cancelQueueJob"
  | "setQueueDrain"
>;

/**
 * Run 99 (option 2): parse `--anonymous-learning-reads on|off` (or the environment equivalent).
 * Undefined keeps the bind-host default; anything else is rejected so a typo cannot silently
 * widen or narrow the read posture.
 */
export function parseAnonymousLearningReadsFlag(
  value: string | undefined,
): "on" | "off" | undefined {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (normalized === "") return undefined;
  if (["on", "true", "1", "yes"].includes(normalized)) return "on";
  if (["off", "false", "0", "no"].includes(normalized)) return "off";
  throw new Error(
    `--anonymous-learning-reads must be on or off (received ${JSON.stringify(value)})`,
  );
}

/**
 * Run 98 addendum 34 S1: how many *extra* comparisons one capture may add beside its primary pair.
 * Default 3 covers a three-arm capture (two extra source pairs plus the arm-vs-arm pair) and stays
 * bounded when the operator configures more arms. `0` disables extra pairs.
 */
export function resolveMaxExtraPairComparisons(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): number {
  const raw = environment.ROLE_MODEL_MAX_EXTRA_PAIR_COMPARISONS?.trim();
  if (!raw) return 3;
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > 12) return 3;
  return parsed;
}

export function createRuntimeOperatorCallbacks(
  operations: ReturnType<typeof createTrackBOperations>,
): RuntimeOperatorCallbacks {
  return {
    readOperatorStatus: () => operations.readOperatorStatus(),
    listOperatorTraceRoots: (query: Readonly<Record<string, string>> = {}) =>
      operations.listOperatorTraceRoots(query),
    readOperatorTraceRoot: (traceRootId: string) => operations.readOperatorTraceRoot(traceRootId),
    listReplayJobs: (query: Readonly<Record<string, string>> = {}) =>
      operations.listReplayJobs(query),
    createReplayJob: (body: Record<string, unknown>) => operations.createReplayJob(body),
    cancelReplayJob: (jobId: string, body: Record<string, unknown>) =>
      operations.cancelReplayJob(jobId, body),
    readReplayJob: (jobId: string) => operations.readReplayJob(jobId),
    readReplayResults: (jobId: string) => operations.readReplayResults(jobId),
    listEvaluationJobs: (query: Readonly<Record<string, string>> = {}) =>
      operations.listEvaluationJobs(query),
    readEvaluationJob: (jobId: string) => operations.readEvaluationJob(jobId),
    listEvaluationTrials: (jobId: string) => operations.listEvaluationTrials(jobId),
    listEvaluationScorers: (jobId: string) => operations.listEvaluationScorers(jobId),
    listEvaluationComparisons: (jobId: string) => operations.listEvaluationComparisons(jobId),
    listEvaluationGroups: (jobId: string) => operations.listEvaluationGroups(jobId),
    cancelEvaluationJob: (jobId: string, body: Record<string, unknown>) =>
      operations.cancelEvaluationJob(jobId, body),
    retryEvaluationJob: (jobId: string, body: Record<string, unknown>) =>
      operations.retryEvaluationJob(jobId, body),
    readLearningState: () => operations.readLearningState(),
    readLearningProfile: () => operations.readLearningProfile(),
    readLearningAdvisory: () => operations.readLearningAdvisory(),
    updateLearningMode: (body: Record<string, unknown>) => operations.updateLearningMode(body),
    rollbackLearning: (body: Record<string, unknown>) => operations.rollbackLearning(body),
    readLearningRollout: (query: Readonly<Record<string, string>> = {}) =>
      operations.readLearningRollout(query),
    readLearningRecords: (query: Readonly<Record<string, string>> = {}) =>
      operations.readLearningRecords(query),
    readLearningDecisions: (query: Readonly<Record<string, string>> = {}) =>
      operations.readLearningDecisions(query),
    readLearningMeasurement: (query: Readonly<Record<string, string>> = {}) =>
      operations.readLearningMeasurement(query),
    // Run 99: the Learning UI live activity and history projections.
    readLearningActivity: (query: Readonly<Record<string, string>> = {}) =>
      operations.readLearningActivity(query),
    readLearningHistory: (query: Readonly<Record<string, string>> = {}) =>
      operations.readLearningHistory(query),
    // Run 101 R9 (Phase 5 repair): the queue read model, its configuration and the admin actions.
    readQueues: (query: Readonly<Record<string, string>> = {}) => operations.readQueues(query),
    readQueueJobs: (queueName: string, query: Readonly<Record<string, string>> = {}) =>
      operations.readQueueJobs(queueName, query),
    readQueueJob: (queueName: string, jobId: string) => operations.readQueueJob(queueName, jobId),
    readQueueReceipts: (query: Readonly<Record<string, string>> = {}) =>
      operations.readQueueReceipts(query),
    readQueueConfig: () => operations.readQueueConfig(),
    setQueueConfig: (body: Record<string, unknown>) => operations.setQueueConfig(body),
    retryQueueJob: (queueName: string, jobId: string) => operations.retryQueueJob(queueName, jobId),
    cancelQueueJob: (queueName: string, jobId: string) =>
      operations.cancelQueueJob(queueName, jobId),
    setQueueDrain: (queueName: string, body: Record<string, unknown>) =>
      operations.setQueueDrain(queueName, body),
    readLearningPolicy: (query: Readonly<Record<string, string>> = {}) =>
      operations.readLearningPolicy(query),
    setLearningPolicy: (body: Record<string, unknown>) => operations.setLearningPolicy(body),
    rollbackLearningPolicy: (body: Record<string, unknown>) =>
      operations.rollbackLearningPolicy(body),
    activateLearningPack: (body: Record<string, unknown>) => operations.activateLearningPack(body),
    rollbackLearningPack: (body: Record<string, unknown>) => operations.rollbackLearningPack(body),
    recordLearningGuardrailBreach: (body: Record<string, unknown>) =>
      operations.recordLearningGuardrailBreach(body),
    restoreLearningScenarioActivation: (body: Record<string, unknown>) =>
      operations.restoreLearningScenarioActivation(body),
    engageLearningKillSwitch: (body: Record<string, unknown>) =>
      operations.engageLearningKillSwitch(body),
  };
}

type CliBackend = Pick<
  RuntimeBridgeBackend,
  | "operatorAuthToken"
  | "registry"
  | "executeChatCompletions"
  | "executeResponses"
  | "readVersionInfo"
  | "listActivityMetrics"
  | "listActivityMetricsPage"
  | "readActivityCapture"
  | "recordClientLatency"
  | "readRuntimeSummary"
  | "readRuntimeConfig"
  | "updateRuntimeConfig"
  | "readHealthStatus"
  | "readTelemetrySummary"
  | "listTelemetryComparisonRows"
  | "listTelemetryRequests"
  | "listTelemetryRequestPage"
  | "queryTelemetryAnalytics"
  | "subscribeTelemetry"
  | "listProviders"
  | "listModels"
  | "listExtensions"
  | "mutateExtension"
  | "readTrackBQaExtensions"
  | "readTrackBShadowReceipts"
  | "readTrackBPostObservationReceipt"
  | "recordTrackBContributionAggregate"
  | "retryTrackBContributionAggregates"
  | "readTrackBExtensionReadback"
  | "runTrackBSupervisedReplay"
  | "readOperatorStatus"
  | "listOperatorTraceRoots"
  | "readOperatorTraceRoot"
  | "listReplayJobs"
  | "createReplayJob"
  | "cancelReplayJob"
  | "readReplayJob"
  | "readReplayResults"
  | "listEvaluationJobs"
  | "readEvaluationJob"
  | "listEvaluationTrials"
  | "listEvaluationScorers"
  | "listEvaluationComparisons"
  | "listEvaluationGroups"
  | "cancelEvaluationJob"
  | "retryEvaluationJob"
  | "readLearningState"
  | "readLearningProfile"
  | "readLearningAdvisory"
  | "updateLearningMode"
  | "rollbackLearning"
  | "readLearningRollout"
  | "readLearningRecords"
  | "readLearningDecisions"
  | "readLearningMeasurement"
  | "readLearningActivity"
  | "readLearningHistory"
  | "readLearningPolicy"
  | "setLearningPolicy"
  | "rollbackLearningPolicy"
  | "activateLearningPack"
  | "rollbackLearningPack"
  | "recordLearningGuardrailBreach"
  | "restoreLearningScenarioActivation"
  | "engageLearningKillSwitch"
  | "readQueues"
  | "readQueueJobs"
  | "readQueueJob"
  | "readQueueReceipts"
  | "readQueueConfig"
  | "setQueueConfig"
  | "retryQueueJob"
  | "cancelQueueJob"
  | "setQueueDrain"
  | "measureNoRichCaptureBaseline"
  | "readDevelopmentVerificationStatus"
  | "readGraphMigration"
  | "advanceGraphMigration"
  | "rollbackGraphMigration"
  | "readStorageRetention"
  | "dryRunStorageRetention"
  | "updateStorageRetentionPolicy"
  | "executeStorageRetention"
  | "cancelStorageRetentionJob"
  | "rollbackStorageRetention"
  | "readContributionState"
  | "updateContributionState"
  | "listRecommendations"
  | "downloadRecommendations"
  | "applyRecommendation"
  | "dismissRecommendation"
  | "readActivePack"
  | "listRoles"
  | "listAccounts"
  | "listProviderDeviceAuthorizations"
  | "upsertProviderAccount"
  | "startProviderDeviceAuthorization"
  | "pollProviderDeviceAuthorization"
  | "removeProviderAccountModel"
  | "reconnectProviderAccount"
  | "updateProviderApiKey"
  | "openExternalUrl"
  | "activateEndpoint"
  | "activateEndpointBatch"
  | "removeEndpoint"
  | "readControllerAssignment"
  | "updateControllerAssignment"
  | "readRouterSummary"
  | "readRouterConfig"
  | "listRouterCandidates"
  | "listRouterDecisions"
  | "listRouterDecisionPage"
  | "readRouterDecision"
  | "listEndpoints"
  | "listRecentRequestIds"
  | "listRecentRequestObservations"
  | "readRequestObservation"
  | "exportVerifiersTrace"
  | "recoverLegacyTerminalFailure"
  | "readEndpointProfile"
  | "readBenchmarkSuite"
  | "runBenchmark"
  | "readBenchmarkRun"
  | "readActiveBenchmarkRun"
  | "clearBenchmarkEndpointData"
  | "clearBenchmarkData"
  | "readBenchmarkSummary"
  | "readBenchmarkPortfolio"
  | "listBenchmarkRuns"
  | "readBenchmarkSampleRunStates"
  | "readBenchmarkSummariesByMode"
  | "readBenchmarkPreferences"
  | "updateBenchmarkPreferences"
  | "listLocalModels"
  | "listPeerLocalModels"
  | "listLlamaSwapLocalModels"
  | "loadLocalModel"
  | "loadPeerModel"
  | "loadLlamaSwapModel"
  | "setPeerModelRoles"
  | "setLlamaSwapModelRoles"
  | "unloadPeerModel"
  | "unloadLocalModel"
  | "readLocalPolicy"
  | "updateLocalPolicy"
  | "readRolePolicy"
  | "createRolePolicyRole"
  | "updateRolePolicyRole"
  | "listTaskDefinitions"
  | "updateTaskDefinitions"
  | "listSwapHistory"
  | "getLocalLogs"
  | "proxyVendorLogStream"
  | "readModelOverrides"
  | "updateModelOverrides"
  | "readPeers"
  | "updatePeers"
  | "checkPeerHealth"
  | "getRoutableInventory"
  | "effectiveRegistry"
  | "getExecutionCatalog"
  | "getEffectiveRoutableInventory"
  | "shutdown"
>;

export function requirePackagedTrackBManifest(
  packagedProfile: RuntimeChannelProfile | null,
  trackBManifestText: string | null,
): void {
  if (packagedProfile && !trackBManifestText) {
    throw new Error(
      `packaged ${packagedProfile.channel} runtime is missing its Track B distribution`,
    );
  }
}

type Run88PiInvocationProvenance = Readonly<{
  source: "routed-execution-callback";
  piInvocationProof: Readonly<Record<string, unknown>>;
  trustedAuthorityPublicKey: string;
  expectedReleaseId: string;
}>;

function readRun88PiInvocationProvenance(
  env: NodeJS.ProcessEnv,
  expectedReleaseId: string | undefined,
): Run88PiInvocationProvenance | null {
  const proofPath = env.RUN88_PI_INVOCATION_PROOF_PATH;
  const authorityPath = env.RUN88_PI_PROOF_AUTHORITY_PUBLIC_KEY_PATH;
  if (!proofPath && !authorityPath) return null;
  if (
    !proofPath ||
    !authorityPath ||
    !path.isAbsolute(proofPath) ||
    !path.isAbsolute(authorityPath)
  )
    throw new Error("Run 88 Pi proof and authority paths must both be absolute");
  if (!/^sha256:[0-9a-f]{64}$/.test(expectedReleaseId ?? ""))
    throw new Error("Run 88 Pi proof requires the packaged release identity");
  let piInvocationProof: Readonly<Record<string, unknown>>;
  try {
    piInvocationProof = JSON.parse(readFileSync(proofPath, "utf8")) as Readonly<
      Record<string, unknown>
    >;
  } catch {
    throw new Error("Run 88 Pi invocation proof file is unreadable or malformed");
  }
  const trustedAuthorityPublicKey = readFileSync(authorityPath, "utf8").trim();
  if (!trustedAuthorityPublicKey) throw new Error("Run 88 Pi proof authority public key is empty");
  return Object.freeze({
    source: "routed-execution-callback",
    piInvocationProof,
    trustedAuthorityPublicKey,
    expectedReleaseId: expectedReleaseId as string,
  });
}

export function createRun88StagePostObservation(input: {
  readonly observation: Readonly<Record<string, unknown>>;
  readonly piInvocationProvenance: Run88PiInvocationProvenance | null;
  readonly proofRequired: boolean;
  readonly releaseId: string;
  readonly sourceId: string;
  readonly executableSha256: string;
  readonly scope: string;
}): Readonly<Record<string, unknown>> {
  if (input.proofRequired && !input.piInvocationProvenance)
    throw new Error("Run 88 Phase 5 provider observation requires signed Pi CLI provenance");
  return Object.freeze({
    ...input.observation,
    ...(input.piInvocationProvenance
      ? {
          run88ProviderResponse: validateRun88ProviderResponseObservation(
            input.observation,
            input.piInvocationProvenance,
          ),
        }
      : {}),
    run88Correlation: createRun88RuntimeCorrelation({
      requestId: String(input.observation.requestId ?? ""),
      routingDecisionId: String(input.observation.routingDecisionId ?? ""),
      endpointId: String(input.observation.endpointId ?? ""),
      releaseId: input.releaseId,
      sourceId: input.sourceId,
      deploymentId: `local-stage:${input.executableSha256}`,
      scope: input.scope,
      correlationId: createRuntimeRequestCorrelationId({
        scope: input.scope,
        requestId: String(input.observation.requestId ?? ""),
        routingDecisionId: String(input.observation.routingDecisionId ?? ""),
      }),
    }),
  });
}

export interface CliBootstrapState {
  status: "pending" | "ready" | "degraded" | "failed";
  message?: string;
}

/**
 * R8/R24/R30: the HTTP boundary only blocks when routing itself is unavailable.
 * A degraded extension runtime (a routing-nondependent worker in a terminal
 * lifecycle) still serves ordinary `/api` and `/v1` routing traffic, while the
 * degradation is reported honestly through `/healthz` and operator surfaces.
 */
export function projectCliStartupReadiness(state: CliBootstrapState): {
  readonly ready: boolean;
  readonly status: CliBootstrapState["status"];
  readonly message?: string;
} {
  return {
    ready: state.status === "ready" || state.status === "degraded",
    status: state.status,
    ...(state.message ? { message: state.message } : {}),
  };
}

export async function awaitCliExtensionRuntime<
  Runtime extends {
    readonly health: () => Record<string, unknown>;
    readonly close?: () => Promise<void>;
  },
>(
  extensionRuntimePromise: Promise<Runtime>,
  bootstrapState: CliBootstrapState,
  options: {
    readonly expectedExtensionIds?: readonly string[];
    readonly beforeReady?: (runtime: Runtime) => Promise<void>;
    readonly closeRuntime?: () => Promise<void>;
  } = {},
): Promise<Runtime> {
  let runtime: Runtime | null = null;
  try {
    runtime = await extensionRuntimePromise;
    assertProductionExtensionRuntimeReady(
      runtime,
      options.expectedExtensionIds ?? TRACK_B_CANONICAL_EXTENSION_IDS,
    );
    if (options.beforeReady) await options.beforeReady(runtime);
    bootstrapState.status = "ready";
    delete bootstrapState.message;
    return runtime;
  } catch (error) {
    if (options.closeRuntime) await options.closeRuntime().catch(() => undefined);
    else if (runtime?.close) await runtime.close().catch(() => undefined);
    bootstrapState.status = "failed";
    bootstrapState.message =
      error instanceof Error ? error.message : "extension runtime startup failed";
    throw error;
  }
}

export function createCliExtensionRuntimeOwner<
  Runtime extends {
    readonly health: () => Record<string, unknown>;
    readonly close?: () => Promise<void>;
  },
>(
  extensionRuntimePromise: Promise<Runtime>,
): {
  readonly promise: Promise<Runtime>;
  close(): Promise<void>;
} {
  let resolvedRuntime: Runtime | null = null;
  let closePromise: Promise<void> | null = null;
  const observedPromise = extensionRuntimePromise.then(
    (runtime) => {
      resolvedRuntime = runtime;
      return runtime;
    },
    (error: unknown) => {
      throw error;
    },
  );

  // Keep the rejection handled even when packaged sidecar/backend startup fails
  // before the caller reaches its awaited startup boundary.
  void observedPromise.catch(() => undefined);

  return {
    promise: observedPromise,
    close: () => {
      if (closePromise) return closePromise;
      closePromise = (async () => {
        const runtime = resolvedRuntime ?? (await observedPromise.catch(() => null));
        if (runtime?.close) await runtime.close().catch(() => undefined);
      })();
      return closePromise;
    },
  };
}

interface PackagedTrackBContractRegistryBinding {
  readonly schemaVersion?: string;
  readonly currentVersion?: string;
  readonly minimumReaderVersion?: string;
  readonly unknownFuture?: string;
  readonly registryPath?: string;
  readonly schemaPath?: string;
  readonly adapterPath?: string;
  readonly registrySha256?: string;
  readonly schemaSha256?: string;
  readonly adapterSha256?: string;
}

interface PackagedTrackBStartupManifest {
  readonly schemaVersion: string;
  readonly registryBindings?: {
    readonly runtimeChannel?: {
      readonly schema?: string;
      readonly currentVersion?: string;
      readonly minimumReaderVersion?: string;
    };
    readonly contractRegistry?: PackagedTrackBContractRegistryBinding;
  };
  readonly runtimeChannelContext?: Partial<RuntimeChannelContext>;
  readonly extensions: readonly {
    readonly descriptor: {
      readonly id: string;
      readonly protocolVersion: string;
      readonly capabilities: readonly string[];
      readonly channelContractVersion?: string;
    };
  }[];
}

interface PackagedTrackBContractRegistry {
  readonly schemaVersion: string;
  readonly contractVersion: string;
  readonly contractRegistry?: {
    readonly schemaVersion?: string;
    readonly currentVersion?: string;
    readonly minimumReaderVersion?: string;
    readonly unknownFuture?: string;
  };
  readonly packages: readonly {
    readonly id: string;
    readonly class?: string;
    readonly runtime?: {
      readonly protocolVersion?: string;
      readonly capabilities?: readonly string[];
    };
  }[];
}

type CliExtensionRuntime = {
  readonly health: () => Record<string, unknown>;
  readonly close?: () => Promise<void>;
  /** Present on a fully composed extension runtime; absent while the host is degraded. */
  readonly invoke?: (
    id: string,
    envelope: Record<string, unknown>,
  ) => Promise<Record<string, unknown>>;
};

function sameRuntimeChannelContext(
  left: RuntimeChannelContext,
  right: RuntimeChannelContext,
): boolean {
  return (
    left.channel === right.channel &&
    left.scopeId === right.scopeId &&
    left.authorizationEpoch === right.authorizationEpoch
  );
}

function flattenCapabilities(
  descriptors: readonly { readonly capabilities: readonly string[] }[],
): readonly string[] {
  return [...new Set(descriptors.flatMap((descriptor) => descriptor.capabilities))];
}

function readPackagedContractRegistry(input: {
  readonly manifest: PackagedTrackBStartupManifest;
  readonly contractRegistryText?: string;
}): PackagedTrackBContractRegistry | null {
  const binding = input.manifest.registryBindings?.contractRegistry;
  if (!binding) return null;
  if (
    !binding.schemaVersion ||
    !binding.currentVersion ||
    !binding.minimumReaderVersion ||
    binding.unknownFuture !== "fail_closed" ||
    !binding.registryPath ||
    !binding.schemaPath ||
    !binding.adapterPath ||
    !binding.registrySha256 ||
    !binding.schemaSha256 ||
    !binding.adapterSha256
  ) {
    throw new Error("Track B packaged contract registry binding is incomplete");
  }
  if (
    path.isAbsolute(binding.registryPath) ||
    binding.registryPath.split(/[\\/]/u).some((segment) => segment === "..")
  ) {
    throw new Error("Track B packaged contract registry path is invalid");
  }
  for (const [value, field] of [
    [binding.schemaPath, "schema path"],
    [binding.adapterPath, "adapter path"],
  ] as const) {
    if (
      !value ||
      path.isAbsolute(value) ||
      value.split(/[\\/]/u).some((segment) => segment === "..")
    ) {
      throw new Error(`Track B packaged contract registry ${field} is invalid`);
    }
  }
  if (typeof input.contractRegistryText !== "string") {
    throw new Error("Track B packaged contract registry authority is missing");
  }
  if (binding.schemaVersion !== "role-model.contract-registry.v1") {
    throw new Error("Track B packaged contract registry binding schema is invalid");
  }
  if (
    ![binding.registrySha256, binding.schemaSha256, binding.adapterSha256].every((value) =>
      /^[a-f0-9]{64}$/u.test(value),
    )
  ) {
    throw new Error("Track B packaged contract registry binding digests are invalid");
  }
  const digest = createHash("sha256").update(input.contractRegistryText).digest("hex");
  if (digest !== binding.registrySha256) {
    throw new Error("Track B packaged contract registry integrity check failed");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(input.contractRegistryText);
  } catch (error) {
    throw new Error("Track B packaged contract registry is invalid JSON", { cause: error });
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Track B packaged contract registry is not an object");
  }
  const registry = parsed as PackagedTrackBContractRegistry;
  if (
    registry.schemaVersion !== "role-model.extension-package-registry.v2" ||
    registry.contractVersion !== binding.currentVersion ||
    !Array.isArray(registry.packages) ||
    registry.contractRegistry?.schemaVersion !== binding.schemaVersion ||
    registry.contractRegistry?.currentVersion !== binding.currentVersion ||
    registry.contractRegistry?.minimumReaderVersion !== binding.minimumReaderVersion ||
    registry.contractRegistry?.unknownFuture !== binding.unknownFuture
  ) {
    throw new Error("Track B packaged contract registry metadata mismatch");
  }
  return registry;
}

export function negotiatePackagedTrackBStartup(input: {
  readonly channel: RuntimeChannel;
  readonly scopeId: string;
  readonly authorizationEpoch: number;
  readonly manifest: PackagedTrackBStartupManifest;
  readonly writerContext?: RuntimeChannelContext;
  readonly readerContext?: RuntimeChannelContext;
  readonly contractRegistryText?: string;
}) {
  const isCurrent = input.manifest.schemaVersion === "role-model.track-b-runtime-distribution.v2";
  const isPrevious = input.manifest.schemaVersion === "role-model.track-b-runtime-distribution.v1";
  if (!isCurrent && !isPrevious) throw new Error("unsupported packaged Track B distribution");

  const binding = input.manifest.registryBindings?.runtimeChannel;
  if (isCurrent) {
    if (!binding) throw new Error("v2 Track B distribution runtime channel binding is missing");
    if (binding.schema !== "role-model.runtime-channel-contracts.v1") {
      throw new Error("Track B runtime channel binding schema is invalid");
    }
    if (binding.minimumReaderVersion !== PREVIOUS_RUNTIME_CHANNEL_VERSION) {
      throw new Error("Track B runtime channel binding minimum reader version is invalid");
    }
    if (!binding.currentVersion) {
      throw new Error("Track B runtime channel binding current version is missing");
    }
    if (
      binding.currentVersion !== CURRENT_RUNTIME_CHANNEL_VERSION &&
      binding.currentVersion !== PREVIOUS_RUNTIME_CHANNEL_VERSION
    ) {
      throw new Error(
        `Track B runtime channel binding current version is unsupported: ${binding.currentVersion}`,
      );
    }
  }

  const expectedChannelContractVersion =
    binding?.currentVersion ?? PREVIOUS_RUNTIME_CHANNEL_VERSION;
  validateProductionExtensionSet(input.manifest.extensions);
  const expectedReaderContext: RuntimeChannelContext = {
    channel: input.channel,
    scopeId: input.scopeId,
    authorizationEpoch: input.authorizationEpoch,
  };
  const writerContext =
    input.writerContext ??
    (!isCurrent && input.manifest.runtimeChannelContext
      ? (input.manifest.runtimeChannelContext as RuntimeChannelContext)
      : !isCurrent
        ? expectedReaderContext
        : undefined);
  const readerContext = input.readerContext ?? (!isCurrent ? expectedReaderContext : undefined);
  if (!writerContext || !readerContext) {
    throw new Error("Track B packaged startup runtime channel contexts are required");
  }
  if (isCurrent && !input.manifest.runtimeChannelContext) {
    throw new Error("Track B packaged startup runtime channel context is missing");
  }
  if (
    isCurrent &&
    !sameRuntimeChannelContext(
      writerContext,
      input.manifest.runtimeChannelContext as RuntimeChannelContext,
    )
  ) {
    throw new Error("Track B packaged startup writer context does not match manifest context");
  }
  if (!sameRuntimeChannelContext(readerContext, expectedReaderContext)) {
    throw new Error(
      "Track B packaged startup reader context does not match resolved runtime context",
    );
  }

  const registry = readPackagedContractRegistry(input);
  const canonicalPackages = registry
    ? registry.packages.filter((entry) => entry.class === "canonical_extension")
    : [];
  if (isCurrent) {
    if (!registry || canonicalPackages.length !== TRACK_B_CANONICAL_EXTENSION_IDS.length) {
      throw new Error("Track B packaged contract registry has an incomplete canonical set");
    }
    const registryIds = canonicalPackages.map((entry) => entry.id);
    if (registryIds.some((id, index) => id !== TRACK_B_CANONICAL_EXTENSION_IDS[index])) {
      throw new Error("Track B packaged contract registry canonical order mismatch");
    }
  }
  const negotiatedDescriptors = input.manifest.extensions.map((extension, index) => {
    const descriptor = extension.descriptor;
    const authority = canonicalPackages[index]?.runtime;
    const authorityId = canonicalPackages[index]?.id;
    if (isCurrent && (!authority || authorityId !== descriptor.id)) {
      throw new Error(`Track B extension ${descriptor.id} has no matching registry authority`);
    }
    if (
      isCurrent &&
      authority?.protocolVersion &&
      descriptor.protocolVersion !== authority.protocolVersion
    ) {
      throw new Error(
        `Track B extension ${descriptor.id} protocol version mismatch: expected ${authority.protocolVersion}, received ${descriptor.protocolVersion}`,
      );
    }
    if (
      isCurrent &&
      (!descriptor.channelContractVersion ||
        descriptor.channelContractVersion !== expectedChannelContractVersion)
    ) {
      throw new Error(
        `Track B extension ${descriptor.id} channel contract version mismatch: expected ${expectedChannelContractVersion}, received ${descriptor.channelContractVersion ?? "missing"}`,
      );
    }
    if (isCurrent && authority?.capabilities) {
      const expectedCapabilities = [...authority.capabilities];
      if (
        descriptor.capabilities.length !== expectedCapabilities.length ||
        descriptor.capabilities.some(
          (capability, capabilityIndex) => capability !== expectedCapabilities[capabilityIndex],
        )
      ) {
        throw new Error(
          `Track B extension ${descriptor.id} capabilities do not match registry authority`,
        );
      }
    }
    return descriptor;
  });
  const negotiatedCapabilities = registry
    ? flattenCapabilities(
        canonicalPackages.map((entry) => ({ capabilities: entry.runtime?.capabilities ?? [] })),
      )
    : flattenCapabilities(negotiatedDescriptors);
  return negotiateRuntimeChannelStartup({
    channel: input.channel,
    writerVersion: binding?.currentVersion ?? PREVIOUS_RUNTIME_CHANNEL_VERSION,
    readerVersion: CURRENT_RUNTIME_CHANNEL_VERSION,
    offeredCapabilities: negotiatedCapabilities,
    requiredCapabilities: negotiatedCapabilities,
    writerContext,
    readerContext,
  });
}

interface CliBackendResolver {
  getBackend: () => CliBackend | null;
  readBootstrapState?: () => CliBootstrapState;
  readExtensionRuntime?: () => CliExtensionRuntime | null;
  onExtensionRuntimeFailure?: (error: unknown) => Promise<void> | void;
}

const EMPTY_REGISTRY: EndpointRegistryResult = {
  endpoints: [],
  diagnostics: [],
  lifecycleSummary: {
    active: 0,
    degraded: 0,
    offline: 0,
  },
};

const EMPTY_CATALOG: NormalizedCatalog = {
  catalogVersion: "1",
  source: {
    vendor: "runtime-bootstrap",
    commit: "pending",
    capturedAt: "1970-01-01T00:00:00.000Z",
    schemaVersion: "runtime-bootstrap.v1",
  },
  providers: [],
  models: [],
};

/**
 * Run 98 addendum 45 J2: the judge the runtime will use for the next comparison.
 *
 * The policy selector decides between `controller` and `disabled`; the endpoint itself comes from the
 * controller assignment, read at judge time, so a controller change takes effect on the next judged
 * comparison without a policy write. A missing or unreadable assignment is "no judge", never a candidate.
 */
async function resolveControllerJudge(
  backend: { readonly readControllerAssignment?: () => Promise<unknown> },
  snapshot: ReturnType<typeof readLearningPolicyFile>,
): Promise<{
  readonly endpointId: string;
  readonly source: "controller" | "disabled";
  readonly assignmentUpdatedAtMs: number | null;
}> {
  const source = snapshot?.effective.judgeSource === "disabled" ? "disabled" : "controller";
  if (source === "disabled") return { endpointId: "", source, assignmentUpdatedAtMs: null };
  try {
    const assignment = await backend.readControllerAssignment?.();
    const record =
      assignment && typeof assignment === "object" && !Array.isArray(assignment)
        ? (assignment as Record<string, unknown>)
        : {};
    return {
      endpointId: resolveJudgeEndpointFromController({
        judgeSource: source,
        controllerEndpointId: record.endpointId,
      }),
      source,
      assignmentUpdatedAtMs:
        typeof record.updatedAtMs === "number" && Number.isFinite(record.updatedAtMs)
          ? record.updatedAtMs
          : null,
    };
  } catch {
    return { endpointId: "", source, assignmentUpdatedAtMs: null };
  }
}

export function resolveCliFixtureRoot(_repoRoot: string, fixtureRoot?: string): string | undefined {
  return fixtureRoot?.trim() || undefined;
}

function isCliBackendResolver(value: CliBackend | CliBackendResolver): value is CliBackendResolver {
  return typeof (value as CliBackendResolver).getBackend === "function";
}

/**
 * Run 108 addendum-01 A2 (R3 acceptance + R6b) - the readback contract the host route
 * `GET /api/role-model/operator/store-degradation-receipts` publishes (index.ts, a3fe207a).
 * Pinned with the private capability in
 * `.recursive/run/108-remaining-dev-runtime-defects-closeout/evidence/a2-contract-pinned.md`.
 */
export interface StoreDegradationReceiptRow {
  readonly receiptId: string;
  readonly atMs: number;
  readonly capability: string;
  readonly reason: string;
}

export interface StoreDegradationReceiptSource {
  readonly available: boolean;
  readonly reason?: string;
  readonly receipts: readonly StoreDegradationReceiptRow[];
}

export interface StoreDegradationReceiptReadback {
  readonly schemaVersion: "role-model.store-degradation-receipts.v1";
  readonly store: StoreDegradationReceiptSource;
  readonly worker: StoreDegradationReceiptSource;
}

/** The schemaVersion both private extensions answer with (02315a6a, store and worker). */
const STORE_DEGRADATION_RECEIPTS_SCHEMA = "role-model.store-degradation-receipts.v1";

/**
 * The operator surface's message cap. The reader's own console reason is bounded to 160 chars
 * (`ladder materialization` catch block); a readback source that throws for the same reason must
 * not publish more than the surface that is read beside it.
 */
function boundedReadbackReason(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : String((error as { message?: unknown } | null)?.message ?? error ?? "unknown error");
  return message.slice(0, 160);
}

/**
 * One `knowledge:list-degradations` answer -> one source of the pinned readback. An answer that is
 * not this contract (wrong schemaVersion, no receipts array, a payload that never arrived) is
 * UNAVAILABLE, never "no receipts": an empty source and an unreadable source read identically on
 * the operator surface otherwise, and the whole point of this page is that a failure is not silent.
 * Rows outside the four pinned fields are dropped rather than projected.
 */
export function flattenStoreDegradationReadback(input: {
  readonly extensionId: "knowledge-store" | "knowledge-worker";
  readonly answer: unknown;
}): StoreDegradationReceiptSource {
  const label = input.extensionId === "knowledge-store" ? "knowledge store" : "knowledge worker";
  if (input.answer === null || input.answer === undefined) {
    return { available: false, reason: `${label} returned no degradations answer`, receipts: [] };
  }
  if (typeof input.answer !== "object" || Array.isArray(input.answer)) {
    return { available: false, reason: `${label} returned no degradations answer`, receipts: [] };
  }
  const record = input.answer as Record<string, unknown>;
  if (record.schemaVersion !== STORE_DEGRADATION_RECEIPTS_SCHEMA) {
    return {
      available: false,
      reason: `${label} answered an unknown degradations schema`,
      receipts: [],
    };
  }
  if (!Array.isArray(record.receipts)) {
    return { available: false, reason: `${label} answered no receipts array`, receipts: [] };
  }
  const receipts: StoreDegradationReceiptRow[] = [];
  for (const row of record.receipts) {
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    const candidate = row as Record<string, unknown>;
    if (
      typeof candidate.receiptId !== "string" ||
      !Number.isSafeInteger(candidate.atMs) ||
      typeof candidate.capability !== "string" ||
      typeof candidate.reason !== "string"
    )
      continue;
    receipts.push({
      receiptId: candidate.receiptId,
      atMs: candidate.atMs as number,
      capability: candidate.capability,
      reason: candidate.reason,
    });
  }
  // Newest first: both tables answer ordered, but the host owns the order it publishes.
  receipts.sort((left, right) => right.atMs - left.atMs);
  return { available: true, receipts };
}

/**
 * Run 108 addendum-01 A2: the live binding for the operator route above. It invokes
 * `knowledge:list-degradations` on BOTH private extensions - the store owns
 * `knowledge_store_degradation_receipts` (R3 ladder materialization) and the worker owns the R6b
 * twin `knowledge_worker_degradation_receipts` (development floors) - through the same envelope and
 * payload-unwrap helpers every other operator readback uses, and flattens the two answers into the
 * pinned contract.
 *
 * The binding NEVER throws: a source that fails is published as `available: false` with its bounded
 * reason, because the receipts themselves stay durable in both stores and the surface's job is to
 * say which store went quiet. The invoke and envelope builder are injected so the flattening is
 * unit-testable without a live extension host.
 */
export async function readStoreDegradationReceiptsFromRuntime(input: {
  readonly invoke: (
    extensionId: string,
    envelope: Record<string, unknown>,
  ) => Promise<Record<string, unknown>>;
  readonly envelopeFor: (
    extensionId: string,
    capability: string,
    value: Record<string, unknown>,
  ) => Record<string, unknown>;
  readonly stateRoot: string;
  readonly scopeId: string;
}): Promise<StoreDegradationReceiptReadback> {
  const readSource = async (
    extensionId: "knowledge-store" | "knowledge-worker",
  ): Promise<StoreDegradationReceiptSource> => {
    try {
      const capability = "knowledge:list-degradations";
      const value: Record<string, unknown> = {};
      const answer = await input.invoke(
        extensionId,
        input.envelopeFor(extensionId, capability, value),
      );
      return flattenStoreDegradationReadback({
        extensionId,
        answer: decodeExternalizedOperatorReadback({
          stateRoot: input.stateRoot,
          scopeId: input.scopeId,
          value: unwrapCapabilityPayload(answer),
        }),
      });
    } catch (error) {
      return { available: false, reason: boundedReadbackReason(error), receipts: [] };
    }
  };
  return {
    schemaVersion: STORE_DEGRADATION_RECEIPTS_SCHEMA,
    store: await readSource("knowledge-store"),
    worker: await readSource("knowledge-worker"),
  };
}

function createPendingHealthStatus(state: CliBootstrapState): unknown {
  const bootstrapStatus = state.status === "failed" ? "blocked" : state.status;
  return {
    status: "degraded",
    executionMode: "decision_only",
    vendors: {},
    inactiveVendors: [],
    credentialLifecycleAuthority: {
      state: "provisional",
      bootstrapStatus,
    },
    sessionBootstrap: {
      status: bootstrapStatus,
      startedAt: null,
      finishedAt: null,
      stages: state.message
        ? [
            {
              stageId: "backend",
              status: state.status === "failed" ? "failed" : "pending",
              message: state.message,
            },
          ]
        : [],
    },
  };
}

/**
 * Run 99 R24 / addendum 06: keep the live routing advisory tied to the durable rollout state.
 *
 * The router only applies an advisory when the operator has activated a validated pack
 * (`AC-R05-04`), and the per-replay pipeline advisory is frequently empty because a single
 * replay's learning pass can degrade. This refresh reads the scope's rollout state and pack
 * through the extension host and publishes the durable advisory the router prefers, so an
 * activation actually reaches routing. Refresh failures and `unavailable` answers are recorded,
 * never treated as influence.
 */
export function startDurableRouteAdvisoryRefresh(options: {
  readonly getRuntime: () => CliExtensionRuntime | null;
  readonly repoRoot: string;
  /** Track B state root: where the durable activation policy lives. */
  readonly stateRoot: string;
  /**
   * Base runtime state root: `decodeExtensionBusinessResult` composes
   * `<base>/<scope>/track-b/extensions/workers/<extension>/durable-output.sqlite`, so handing it
   * the Track B root resolves a path that does not exist and every externalized answer (the
   * validation receipts, observed live) looks unavailable.
   */
  readonly runtimeStateRoot: string;
  readonly channel: string;
  readonly scopeId: string;
  readonly intervalMs?: number;
}): () => void {
  let stopped = false;
  // Bounded diagnostic: log only when the published advisory changes, so the stage log shows
  // whether an activation reached routing without spamming one line per refresh.
  let lastPublished = "";
  const refresh = async (): Promise<void> => {
    if (stopped) return;
    const runtime = options.getRuntime();
    // A degraded host exposes no extension invoke; there is no advisory to publish then.
    if (!runtime || typeof runtime.invoke !== "function") return;
    const snapshot = readLearningPolicyFile({
      repoRoot: options.repoRoot,
      stateRoot: options.stateRoot,
      channel: options.channel,
      scopeId: options.scopeId,
    });
    const stage = snapshot?.effective.stage ?? "S1";
    // S0/S1 never consult an advisory, so there is nothing to publish.
    if (stage !== "S2" && stage !== "S3" && stage !== "S4") return;
    const nowMs = Date.now();
    const evidenceMaxAgeMs = (snapshot?.effective.evidenceMaxAgeDays ?? 30) * 86400000;
    const rows: unknown[] = [];
    let cursor: { afterRoleId: string; afterTaskTypeId: string } | null = null;
    const visited = new Set<string>();
    let complete = false;
    for (let page = 0; page < 10 && !stopped; page++) {
      const value = { scopeId: options.scopeId, limit: 200, ...(cursor ?? {}) };
      const listing = decodeExternalizedOperatorReadback({
        stateRoot: options.runtimeStateRoot,
        scopeId: options.scopeId,
        value: unwrapCapabilityPayload(
          await runtime.invoke("knowledge-store", {
            requestId: `route-advisory-index:${options.scopeId}:${nowMs}:${page}`,
            sessionId: `route-advisory:${options.scopeId}`,
            protocolVersion: "1.1.0",
            channel: options.channel,
            scope: options.scopeId,
            authorizationEpoch: 1,
            capability: "knowledge:list-route-ladders",
            value,
            payload: value,
          }),
        ),
      });
      if (
        !listing ||
        typeof listing !== "object" ||
        !Array.isArray((listing as { ladders?: unknown }).ladders)
      )
        throw new Error("route ladder index unavailable");
      const index = listing as { ladders: unknown[]; truncated?: boolean; nextCursor?: unknown };
      rows.push(...index.ladders);
      if (index.nextCursor == null) {
        if (
          index.truncated === true ||
          (index.truncated === undefined && index.ladders.length >= 200)
        )
          throw new Error("route ladder index incomplete");
        complete = true;
        break;
      }
      const next = index.nextCursor as { afterRoleId?: unknown; afterTaskTypeId?: unknown };
      if (typeof next.afterRoleId !== "string" || typeof next.afterTaskTypeId !== "string")
        throw new Error("route ladder index cursor invalid");
      cursor = { afterRoleId: next.afterRoleId, afterTaskTypeId: next.afterTaskTypeId };
      const key = JSON.stringify(cursor);
      if (visited.has(key)) throw new Error("route ladder index cursor repeated");
      visited.add(key);
    }
    if (!complete || rows.length > 2000)
      throw new Error("route ladder index exceeds refresh budget");
    for (const row of rows) {
      if (stopped || !row || typeof row !== "object") continue;
      const pair = row as { roleId?: unknown; taskTypeId?: unknown };
      if (
        typeof pair.roleId !== "string" ||
        !pair.roleId.trim() ||
        typeof pair.taskTypeId !== "string" ||
        !pair.taskTypeId.trim()
      )
        continue;
      const roleId = pair.roleId.trim();
      const taskTypeId = pair.taskTypeId.trim();
      const advisory = await readTrackBRouteAdvisorySourceFromRuntime({
        runtime: runtime as unknown as Parameters<
          typeof readTrackBRouteAdvisorySourceFromRuntime
        >[0]["runtime"],
        channel: options.channel,
        scope: options.scopeId,
        roleId,
        taskTypeId,
        stage,
        policyCohortPercent: snapshot?.effective.cohortPercent ?? 0,
        stateRoot: options.runtimeStateRoot,
        nowMs,
        evidenceMaxAgeMs,
        revalidationIntervalMs: (snapshot?.effective.revalidationIntervalDays ?? 7) * 86400000,
        requestId: `route-advisory:${options.scopeId}:${roleId}:${taskTypeId}:${nowMs}`,
      });
      rememberTrackBDurableRouteAdvisory({
        channel: options.channel,
        scope: options.scopeId,
        roleId,
        advisory,
        nowMs,
      });
    }
    const published = `scope=${options.scopeId} pairs=${rows.length} stage=${stage}`;
    if (published !== lastPublished) {
      lastPublished = published;
      console.error(`[run105] durable task advisory refresh: ${published}`);
    }
  };
  const report = (error: unknown): void => {
    console.error(
      `[run99] durable route advisory degraded: ${String(
        (error as { message?: unknown })?.message ?? error,
      ).slice(0, 200)}`,
    );
  };
  let refreshing = false;
  const scheduleRefresh = async (): Promise<void> => {
    if (stopped || refreshing) return;
    refreshing = true;
    try {
      await refresh();
    } catch (error) {
      report(error);
    } finally {
      refreshing = false;
    }
  };
  const timer = setInterval(() => {
    void scheduleRefresh();
  }, options.intervalMs ?? 15_000);
  // A background refresh must never hold the process open.
  (timer as { unref?: () => void }).unref?.();
  void scheduleRefresh();
  return () => {
    stopped = true;
    clearInterval(timer);
  };
}

/**
 * Keep a published CLI runtime tied to the live Track B worker set. A worker
 * can fail after the initial startup negotiation, so readiness must be
 * retracted and the owning process must clean up instead of serving a stale
 * healthy backend.
 */
export function startCliExtensionRuntimeWatchdog(options: {
  readonly getRuntime: () => CliExtensionRuntime | null;
  readonly bootstrapState: CliBootstrapState;
  readonly expectedExtensionIds?: readonly string[];
  readonly onFailure: (error: unknown) => Promise<void> | void;
  readonly intervalMs?: number;
}): () => void {
  let stopped = false;
  let failureReported = false;
  const check = (): void => {
    if (
      stopped ||
      failureReported ||
      (options.bootstrapState.status !== "ready" && options.bootstrapState.status !== "degraded")
    ) {
      return;
    }
    const runtime = options.getRuntime();
    if (!runtime) return;
    // A bounded supervised restart temporarily retracts readiness without
    // failing the runtime; only a terminal worker lifecycle tears it down.
    const readiness = evaluateProductionExtensionRuntimeReadiness(
      runtime,
      options.expectedExtensionIds ?? TRACK_B_CANONICAL_EXTENSION_IDS,
    );
    if (readiness.state === "degraded") {
      // R8/R24/R30: a routing-nondependent extension may stay terminally
      // degraded while ordinary routing keeps serving. Report it honestly
      // instead of tearing down the backend that routing depends on.
      options.bootstrapState.status = "degraded";
      options.bootstrapState.message = readiness.message;
      return;
    }
    if (readiness.state === "ready") {
      if (options.bootstrapState.status === "degraded") {
        options.bootstrapState.status = "ready";
        delete options.bootstrapState.message;
      }
      return;
    }
    if (readiness.state !== "failed") return;
    failureReported = true;
    options.bootstrapState.status = "failed";
    options.bootstrapState.message = readiness.message;
    void Promise.resolve(options.onFailure(new Error(readiness.message))).catch(
      (cleanupError: unknown) => {
        console.error("extension runtime failure cleanup failed", cleanupError);
      },
    );
  };
  const timer = setInterval(check, Math.max(1, options.intervalMs ?? 1000));
  timer.unref?.();
  check();
  return () => {
    stopped = true;
    clearInterval(timer);
  };
}

export function createCliServerOptions(
  options: {
    host: string;
    port: number;
    staticRoot?: string;
    runtimeStateRoot?: string;
    runtimeChannel?: "development" | "stage" | "production";
    operatorAuthToken?: string;
    operatorContext?: RuntimeOperatorContext;
    /** Run 99 (option 2): anonymous loopback Learning readbacks. */
    anonymousLearningReads?: "on" | "off";
    /** Run 98 addendum 34 S7: the operator re-score action. */
    rescoreLearningScores?: StartBridgeServerOptions["rescoreLearningScores"];
    /** Run 98 addendum 44 `A44-S4`: the router's own policy resolution for the readback. */
    resolveLearningPolicySource?: StartBridgeServerOptions["resolveLearningPolicySource"];
  },
  backendOrResolver: CliBackend | CliBackendResolver,
  shutdown?: () => Promise<void>,
): StartBridgeServerOptions {
  const resolveBackend = () =>
    isCliBackendResolver(backendOrResolver) ? backendOrResolver.getBackend() : backendOrResolver;
  const readBootstrapState = () =>
    isCliBackendResolver(backendOrResolver) && backendOrResolver.readBootstrapState
      ? backendOrResolver.readBootstrapState()
      : ({ status: "ready" } as CliBootstrapState);
  const requireBackend = (): CliBackend => {
    const backend = resolveBackend();
    if (!backend) {
      throw new Error("runtime backend is not ready");
    }
    return backend;
  };
  const bindBackendMethod = (key: keyof CliBackend) =>
    ((...args: readonly unknown[]) => {
      const backend = requireBackend() as unknown as Record<
        string,
        (...methodArgs: readonly unknown[]) => unknown
      >;
      const method = backend[key as string];
      return method(...args);
    }) as unknown;

  return {
    host: options.host,
    port: options.port,
    staticRoot: options.staticRoot,
    runtimeStateRoot: options.runtimeStateRoot,
    runtimeChannel: options.runtimeChannel,
    operatorAuthToken: options.operatorAuthToken ?? resolveBackend()?.operatorAuthToken,
    operatorContext: options.operatorContext,
    ...(options.rescoreLearningScores
      ? { rescoreLearningScores: options.rescoreLearningScores }
      : {}),
    ...(options.resolveLearningPolicySource
      ? { resolveLearningPolicySource: options.resolveLearningPolicySource }
      : {}),
    shutdown,
    registry: resolveBackend()?.effectiveRegistry ?? EMPTY_REGISTRY,
    getRegistry: () => resolveBackend()?.effectiveRegistry ?? EMPTY_REGISTRY,
    getExecutionCatalog: () => resolveBackend()?.getExecutionCatalog() ?? EMPTY_CATALOG,
    readStartupReadiness: () => {
      return projectCliStartupReadiness(readBootstrapState());
    },
    executeChatCompletions: bindBackendMethod(
      "executeChatCompletions",
    ) as StartBridgeServerOptions["executeChatCompletions"],
    executeResponses: bindBackendMethod(
      "executeResponses",
    ) as StartBridgeServerOptions["executeResponses"],
    readVersionInfo: bindBackendMethod(
      "readVersionInfo",
    ) as StartBridgeServerOptions["readVersionInfo"],
    listActivityMetrics: bindBackendMethod(
      "listActivityMetrics",
    ) as StartBridgeServerOptions["listActivityMetrics"],
    listActivityMetricsPage: bindBackendMethod(
      "listActivityMetricsPage",
    ) as StartBridgeServerOptions["listActivityMetricsPage"],
    /** S42: the operator readback for whether the boundary can return a capture's evidence, and why not. */
    readCaptureEvidence: (bindBackendMethod as unknown as (method: string) => unknown)(
      "readCaptureEvidence",
    ) as StartBridgeServerOptions["readCaptureEvidence"],
    readActivityCapture: bindBackendMethod(
      "readActivityCapture",
    ) as StartBridgeServerOptions["readActivityCapture"],
    recordClientLatency: bindBackendMethod(
      "recordClientLatency",
    ) as StartBridgeServerOptions["recordClientLatency"],
    readLogs: async () =>
      (
        (await (bindBackendMethod("getLocalLogs") as CliBackend["getLocalLogs"])()) as {
          logs: string;
        }
      ).logs,
    proxyVendorLogStream: bindBackendMethod(
      "proxyVendorLogStream",
    ) as StartBridgeServerOptions["proxyVendorLogStream"],
    readRuntimeSummary: bindBackendMethod(
      "readRuntimeSummary",
    ) as StartBridgeServerOptions["readRuntimeSummary"],
    readRuntimeConfig: bindBackendMethod(
      "readRuntimeConfig",
    ) as StartBridgeServerOptions["readRuntimeConfig"],
    updateRuntimeConfig: bindBackendMethod(
      "updateRuntimeConfig",
    ) as StartBridgeServerOptions["updateRuntimeConfig"],
    readHealthStatus: async () => {
      const bootstrapState = readBootstrapState();
      if (bootstrapState.status !== "ready") {
        return createPendingHealthStatus(bootstrapState);
      }
      const resolver = isCliBackendResolver(backendOrResolver) ? backendOrResolver : null;
      const extensionRuntime = resolver?.readExtensionRuntime
        ? resolver.readExtensionRuntime()
        : null;
      if (extensionRuntime) {
        const readiness = evaluateProductionExtensionRuntimeReadiness(extensionRuntime);
        if (readiness.state === "degraded") {
          // Routing stays available; the probe reports the degradation without
          // invoking the fatal extension-runtime teardown.
          return createPendingHealthStatus({
            status: "degraded",
            message: readiness.message,
          });
        }
        if (readiness.state === "failed") {
          if (resolver?.onExtensionRuntimeFailure) {
            await resolver.onExtensionRuntimeFailure(new Error(readiness.message));
          }
          return createPendingHealthStatus(readBootstrapState());
        }
        if (readiness.state === "pending") {
          // Keep the probe honest while a supervised transition is in flight
          // without permanently failing an otherwise healthy runtime.
          return createPendingHealthStatus({ status: "pending", message: readiness.message });
        }
      }
      const backend = resolveBackend();
      return backend ? backend.readHealthStatus() : createPendingHealthStatus(readBootstrapState());
    },
    readTelemetrySummary: bindBackendMethod(
      "readTelemetrySummary",
    ) as StartBridgeServerOptions["readTelemetrySummary"],
    listTelemetryComparisonRows: bindBackendMethod(
      "listTelemetryComparisonRows",
    ) as StartBridgeServerOptions["listTelemetryComparisonRows"],
    listTelemetryRequests: bindBackendMethod(
      "listTelemetryRequests",
    ) as StartBridgeServerOptions["listTelemetryRequests"],
    listTelemetryRequestPage: bindBackendMethod(
      "listTelemetryRequestPage",
    ) as StartBridgeServerOptions["listTelemetryRequestPage"],
    queryTelemetryAnalytics: bindBackendMethod(
      "queryTelemetryAnalytics",
    ) as StartBridgeServerOptions["queryTelemetryAnalytics"],
    subscribeTelemetry: bindBackendMethod(
      "subscribeTelemetry",
    ) as StartBridgeServerOptions["subscribeTelemetry"],
    listProviders: bindBackendMethod("listProviders") as StartBridgeServerOptions["listProviders"],
    listModels: bindBackendMethod("listModels") as StartBridgeServerOptions["listModels"],
    listExtensions: bindBackendMethod(
      "listExtensions",
    ) as StartBridgeServerOptions["listExtensions"],
    mutateExtension: bindBackendMethod(
      "mutateExtension",
    ) as StartBridgeServerOptions["mutateExtension"],
    readTrackBQaExtensions: bindBackendMethod(
      "readTrackBQaExtensions",
    ) as StartBridgeServerOptions["readTrackBQaExtensions"],
    readTrackBShadowReceipts: bindBackendMethod(
      "readTrackBShadowReceipts",
    ) as StartBridgeServerOptions["readTrackBShadowReceipts"],
    readTrackBPostObservationReceipt: bindBackendMethod(
      "readTrackBPostObservationReceipt",
    ) as StartBridgeServerOptions["readTrackBPostObservationReceipt"],
    recordTrackBContributionAggregate: bindBackendMethod(
      "recordTrackBContributionAggregate",
    ) as StartBridgeServerOptions["recordTrackBContributionAggregate"],
    retryTrackBContributionAggregates: bindBackendMethod(
      "retryTrackBContributionAggregates",
    ) as StartBridgeServerOptions["retryTrackBContributionAggregates"],
    readTrackBExtensionReadback: bindBackendMethod(
      "readTrackBExtensionReadback",
    ) as StartBridgeServerOptions["readTrackBExtensionReadback"],
    runTrackBSupervisedReplay: bindBackendMethod(
      "runTrackBSupervisedReplay",
    ) as StartBridgeServerOptions["runTrackBSupervisedReplay"],
    readTrackBReplayStatus: () => activeAutoReplayLoop?.status() ?? null,
    controlTrackBReplay: async (body: Record<string, unknown>) => {
      const action = typeof body?.action === "string" ? body.action : "";
      if (action === "pause") activeAutoReplayLoop?.pause();
      else if (action === "resume") activeAutoReplayLoop?.resume();
      else throw new Error("replay control action must be pause or resume");
      return { action, status: activeAutoReplayLoop?.status() ?? null };
    },
    readTrackBLearningSummary: async () => {
      return activeLearningSummaryReader ? activeLearningSummaryReader() : null;
    },
    readOperatorStatus: bindBackendMethod(
      "readOperatorStatus",
    ) as StartBridgeServerOptions["readOperatorStatus"],
    listOperatorTraceRoots: bindBackendMethod(
      "listOperatorTraceRoots",
    ) as StartBridgeServerOptions["listOperatorTraceRoots"],
    readOperatorTraceRoot: bindBackendMethod(
      "readOperatorTraceRoot",
    ) as StartBridgeServerOptions["readOperatorTraceRoot"],
    listReplayJobs: bindBackendMethod(
      "listReplayJobs",
    ) as StartBridgeServerOptions["listReplayJobs"],
    createReplayJob: bindBackendMethod(
      "createReplayJob",
    ) as StartBridgeServerOptions["createReplayJob"],
    cancelReplayJob: bindBackendMethod(
      "cancelReplayJob",
    ) as StartBridgeServerOptions["cancelReplayJob"],
    readReplayJob: bindBackendMethod("readReplayJob") as StartBridgeServerOptions["readReplayJob"],
    readReplayResults: bindBackendMethod(
      "readReplayResults",
    ) as StartBridgeServerOptions["readReplayResults"],
    listEvaluationJobs: bindBackendMethod(
      "listEvaluationJobs",
    ) as StartBridgeServerOptions["listEvaluationJobs"],
    readEvaluationJob: bindBackendMethod(
      "readEvaluationJob",
    ) as StartBridgeServerOptions["readEvaluationJob"],
    listEvaluationTrials: bindBackendMethod(
      "listEvaluationTrials",
    ) as StartBridgeServerOptions["listEvaluationTrials"],
    listEvaluationScorers: bindBackendMethod(
      "listEvaluationScorers",
    ) as StartBridgeServerOptions["listEvaluationScorers"],
    listEvaluationComparisons: bindBackendMethod(
      "listEvaluationComparisons",
    ) as StartBridgeServerOptions["listEvaluationComparisons"],
    listEvaluationGroups: bindBackendMethod(
      "listEvaluationGroups",
    ) as StartBridgeServerOptions["listEvaluationGroups"],
    cancelEvaluationJob: bindBackendMethod(
      "cancelEvaluationJob",
    ) as StartBridgeServerOptions["cancelEvaluationJob"],
    retryEvaluationJob: bindBackendMethod(
      "retryEvaluationJob",
    ) as StartBridgeServerOptions["retryEvaluationJob"],
    readLearningState: bindBackendMethod(
      "readLearningState",
    ) as StartBridgeServerOptions["readLearningState"],
    readLearningProfile: bindBackendMethod(
      "readLearningProfile",
    ) as StartBridgeServerOptions["readLearningProfile"],
    readLearningAdvisory: bindBackendMethod(
      "readLearningAdvisory",
    ) as StartBridgeServerOptions["readLearningAdvisory"],
    updateLearningMode: bindBackendMethod(
      "updateLearningMode",
    ) as StartBridgeServerOptions["updateLearningMode"],
    rollbackLearning: bindBackendMethod(
      "rollbackLearning",
    ) as StartBridgeServerOptions["rollbackLearning"],
    // Run 98 R17: the CLI's server options enumerate every operator callback explicitly, so
    // the Learning UI readback and rollout actions must be bound here or they answer
    // "unavailable" behind the packaged executable.
    readLearningRollout: bindBackendMethod(
      "readLearningRollout",
    ) as StartBridgeServerOptions["readLearningRollout"],
    readLearningRecords: bindBackendMethod(
      "readLearningRecords",
    ) as StartBridgeServerOptions["readLearningRecords"],
    readLearningDecisions: bindBackendMethod(
      "readLearningDecisions",
    ) as StartBridgeServerOptions["readLearningDecisions"],
    readLearningMeasurement: bindBackendMethod(
      "readLearningMeasurement",
    ) as StartBridgeServerOptions["readLearningMeasurement"],
    ...(options.anonymousLearningReads
      ? { anonymousLearningReads: options.anonymousLearningReads }
      : {}),
    readLearningActivity: bindBackendMethod(
      "readLearningActivity",
    ) as StartBridgeServerOptions["readLearningActivity"],
    readLearningHistory: bindBackendMethod(
      "readLearningHistory",
    ) as StartBridgeServerOptions["readLearningHistory"],
    // Run 101 R9 (Phase 5 repair): the queue surface the UI calls, forwarded to the sidecar that
    // owns the queue store.
    /**
     * Run 108 addendum-01 A2 (R3 acceptance + R6b): the LIVE binding behind the operator UI's store
     * degradation receipts page. No backend capability answers this - the two receipt tables live in
     * the private extensions, so the host reads them through the extension runtime (the same
     * `readExtensionRuntime` resolver accessor `readHealthStatus` above uses) with the same envelope
     * shape and payload unwrap as every other operator readback, and flattens both sources into the
     * pinned contract. `readStoreDegradationReceiptsFromRuntime` never throws; a source that fails
     * is published as unavailable WITH its reason, and a host with no extension runtime at all says
     * exactly that instead of inventing an empty page.
     */
    readStoreDegradationReceipts: (() => {
      const read = async (
        query: Readonly<Record<string, string>> = {},
      ): Promise<StoreDegradationReceiptReadback> => {
        void query;
        const resolver = isCliBackendResolver(backendOrResolver) ? backendOrResolver : null;
        const runtime = resolver?.readExtensionRuntime ? resolver.readExtensionRuntime() : null;
        // The readback is served by the operator host, so the envelope carries the operator
        // context's scope - the same binding every other operator readback uses (the extensions
        // enforce channel/scope/epoch from the envelope itself). The fallback keeps a host whose
        // options were built without an explicit context from sending an EMPTY scope, which the
        // capability boundary would refuse as an unbound request.
        const scope = options.operatorContext?.scope ?? "operator";
        const envelopeFor = (
          extensionId: string,
          capability: string,
          value: Record<string, unknown>,
        ) => ({
          requestId: `operator-store-degradation-receipts:${capability}:${Date.now()}`,
          sessionId: `operator-store-degradation-receipts:${scope}`,
          protocolVersion: "1.1.0",
          channel: options.runtimeChannel ?? options.operatorContext?.channel ?? "development",
          scope,
          authorizationEpoch: 1,
          capability,
          value,
          ...(extensionId === "knowledge-store" ? { payload: value } : {}),
        });
        const unavailable = (reason: string): StoreDegradationReceiptSource => ({
          available: false,
          reason,
          receipts: [],
        });
        if (runtime === null || typeof runtime.invoke !== "function") {
          return {
            schemaVersion: "role-model.store-degradation-receipts.v1",
            store: unavailable("extension runtime is not available"),
            worker: unavailable("extension runtime is not available"),
          };
        }
        return readStoreDegradationReceiptsFromRuntime({
          invoke: (extensionId, envelope) =>
            runtime.invoke!(extensionId, envelope) as Promise<Record<string, unknown>>,
          envelopeFor,
          stateRoot: options.runtimeStateRoot ?? "",
          scopeId: scope,
        });
      };
      return read as StartBridgeServerOptions["readStoreDegradationReceipts"];
    })(),
    readQueues: bindBackendMethod("readQueues") as StartBridgeServerOptions["readQueues"],
    readQueueJobs: bindBackendMethod("readQueueJobs") as StartBridgeServerOptions["readQueueJobs"],
    readQueueJob: bindBackendMethod("readQueueJob") as StartBridgeServerOptions["readQueueJob"],
    readQueueReceipts: bindBackendMethod(
      "readQueueReceipts",
    ) as StartBridgeServerOptions["readQueueReceipts"],
    readQueueConfig: bindBackendMethod(
      "readQueueConfig",
    ) as StartBridgeServerOptions["readQueueConfig"],
    setQueueConfig: bindBackendMethod(
      "setQueueConfig",
    ) as StartBridgeServerOptions["setQueueConfig"],
    retryQueueJob: bindBackendMethod("retryQueueJob") as StartBridgeServerOptions["retryQueueJob"],
    cancelQueueJob: bindBackendMethod(
      "cancelQueueJob",
    ) as StartBridgeServerOptions["cancelQueueJob"],
    setQueueDrain: bindBackendMethod("setQueueDrain") as StartBridgeServerOptions["setQueueDrain"],
    readLearningPolicy: bindBackendMethod(
      "readLearningPolicy",
    ) as StartBridgeServerOptions["readLearningPolicy"],
    setLearningPolicy: bindBackendMethod(
      "setLearningPolicy",
    ) as StartBridgeServerOptions["setLearningPolicy"],
    rollbackLearningPolicy: bindBackendMethod(
      "rollbackLearningPolicy",
    ) as StartBridgeServerOptions["rollbackLearningPolicy"],
    activateLearningPack: bindBackendMethod(
      "activateLearningPack",
    ) as StartBridgeServerOptions["activateLearningPack"],
    rollbackLearningPack: bindBackendMethod(
      "rollbackLearningPack",
    ) as StartBridgeServerOptions["rollbackLearningPack"],
    recordLearningGuardrailBreach: bindBackendMethod(
      "recordLearningGuardrailBreach",
    ) as StartBridgeServerOptions["recordLearningGuardrailBreach"],
    restoreLearningScenarioActivation: bindBackendMethod(
      "restoreLearningScenarioActivation",
    ) as StartBridgeServerOptions["restoreLearningScenarioActivation"],
    engageLearningKillSwitch: bindBackendMethod(
      "engageLearningKillSwitch",
    ) as StartBridgeServerOptions["engageLearningKillSwitch"],
    measureNoRichCaptureBaseline: bindBackendMethod(
      "measureNoRichCaptureBaseline",
    ) as StartBridgeServerOptions["measureNoRichCaptureBaseline"],
    readDevelopmentVerificationStatus: bindBackendMethod(
      "readDevelopmentVerificationStatus",
    ) as StartBridgeServerOptions["readDevelopmentVerificationStatus"],
    readGraphMigration: bindBackendMethod(
      "readGraphMigration",
    ) as StartBridgeServerOptions["readGraphMigration"],
    advanceGraphMigration: bindBackendMethod(
      "advanceGraphMigration",
    ) as StartBridgeServerOptions["advanceGraphMigration"],
    rollbackGraphMigration: bindBackendMethod(
      "rollbackGraphMigration",
    ) as StartBridgeServerOptions["rollbackGraphMigration"],
    readStorageRetention: bindBackendMethod(
      "readStorageRetention",
    ) as StartBridgeServerOptions["readStorageRetention"],
    dryRunStorageRetention: bindBackendMethod(
      "dryRunStorageRetention",
    ) as StartBridgeServerOptions["dryRunStorageRetention"],
    updateStorageRetentionPolicy: bindBackendMethod(
      "updateStorageRetentionPolicy",
    ) as StartBridgeServerOptions["updateStorageRetentionPolicy"],
    executeStorageRetention: bindBackendMethod(
      "executeStorageRetention",
    ) as StartBridgeServerOptions["executeStorageRetention"],
    cancelStorageRetentionJob: bindBackendMethod(
      "cancelStorageRetentionJob",
    ) as StartBridgeServerOptions["cancelStorageRetentionJob"],
    rollbackStorageRetention: bindBackendMethod(
      "rollbackStorageRetention",
    ) as StartBridgeServerOptions["rollbackStorageRetention"],
    readContributionState: bindBackendMethod(
      "readContributionState",
    ) as StartBridgeServerOptions["readContributionState"],
    updateContributionState: bindBackendMethod(
      "updateContributionState",
    ) as StartBridgeServerOptions["updateContributionState"],
    listRecommendations: bindBackendMethod(
      "listRecommendations",
    ) as StartBridgeServerOptions["listRecommendations"],
    downloadRecommendations: bindBackendMethod(
      "downloadRecommendations",
    ) as StartBridgeServerOptions["downloadRecommendations"],
    applyRecommendation: bindBackendMethod(
      "applyRecommendation",
    ) as StartBridgeServerOptions["applyRecommendation"],
    dismissRecommendation: bindBackendMethod(
      "dismissRecommendation",
    ) as StartBridgeServerOptions["dismissRecommendation"],
    readActivePack: bindBackendMethod(
      "readActivePack",
    ) as StartBridgeServerOptions["readActivePack"],
    listRoles: bindBackendMethod("listRoles") as StartBridgeServerOptions["listRoles"],
    listAccounts: bindBackendMethod("listAccounts") as StartBridgeServerOptions["listAccounts"],
    listProviderDeviceAuthorizations: bindBackendMethod(
      "listProviderDeviceAuthorizations",
    ) as StartBridgeServerOptions["listProviderDeviceAuthorizations"],
    upsertProviderAccount: bindBackendMethod(
      "upsertProviderAccount",
    ) as StartBridgeServerOptions["upsertProviderAccount"],
    startProviderDeviceAuthorization: bindBackendMethod(
      "startProviderDeviceAuthorization",
    ) as StartBridgeServerOptions["startProviderDeviceAuthorization"],
    pollProviderDeviceAuthorization: bindBackendMethod(
      "pollProviderDeviceAuthorization",
    ) as StartBridgeServerOptions["pollProviderDeviceAuthorization"],
    reconnectProviderAccount: bindBackendMethod(
      "reconnectProviderAccount",
    ) as StartBridgeServerOptions["reconnectProviderAccount"],
    updateProviderApiKey: bindBackendMethod(
      "updateProviderApiKey",
    ) as StartBridgeServerOptions["updateProviderApiKey"],
    openExternalUrl: bindBackendMethod(
      "openExternalUrl",
    ) as StartBridgeServerOptions["openExternalUrl"],
    removeProviderAccountModel: bindBackendMethod(
      "removeProviderAccountModel",
    ) as StartBridgeServerOptions["removeProviderAccountModel"],
    activateEndpoint: bindBackendMethod(
      "activateEndpoint",
    ) as StartBridgeServerOptions["activateEndpoint"],
    activateEndpointBatch: bindBackendMethod(
      "activateEndpointBatch",
    ) as StartBridgeServerOptions["activateEndpointBatch"],
    removeEndpoint: bindBackendMethod(
      "removeEndpoint",
    ) as StartBridgeServerOptions["removeEndpoint"],
    readControllerAssignment: bindBackendMethod(
      "readControllerAssignment",
    ) as StartBridgeServerOptions["readControllerAssignment"],
    updateControllerAssignment: bindBackendMethod(
      "updateControllerAssignment",
    ) as StartBridgeServerOptions["updateControllerAssignment"],
    readRouterSummary: bindBackendMethod(
      "readRouterSummary",
    ) as StartBridgeServerOptions["readRouterSummary"],
    readRouterConfig: bindBackendMethod(
      "readRouterConfig",
    ) as StartBridgeServerOptions["readRouterConfig"],
    listRouterCandidates: bindBackendMethod(
      "listRouterCandidates",
    ) as StartBridgeServerOptions["listRouterCandidates"],
    listRouterDecisions: bindBackendMethod(
      "listRouterDecisions",
    ) as StartBridgeServerOptions["listRouterDecisions"],
    listRouterDecisionPage: bindBackendMethod(
      "listRouterDecisionPage",
    ) as StartBridgeServerOptions["listRouterDecisionPage"],
    readRouterDecision: bindBackendMethod(
      "readRouterDecision",
    ) as StartBridgeServerOptions["readRouterDecision"],
    listEndpoints: bindBackendMethod("listEndpoints") as StartBridgeServerOptions["listEndpoints"],
    listRecentRequestIds: bindBackendMethod(
      "listRecentRequestIds",
    ) as StartBridgeServerOptions["listRecentRequestIds"],
    listRecentRequestObservations: bindBackendMethod(
      "listRecentRequestObservations",
    ) as StartBridgeServerOptions["listRecentRequestObservations"],
    readRequestObservation: bindBackendMethod(
      "readRequestObservation",
    ) as StartBridgeServerOptions["readRequestObservation"],
    exportVerifiersTrace: bindBackendMethod(
      "exportVerifiersTrace",
    ) as StartBridgeServerOptions["exportVerifiersTrace"],
    recoverLegacyTerminalFailure: bindBackendMethod(
      "recoverLegacyTerminalFailure",
    ) as StartBridgeServerOptions["recoverLegacyTerminalFailure"],
    readEndpointProfile: bindBackendMethod(
      "readEndpointProfile",
    ) as StartBridgeServerOptions["readEndpointProfile"],
    readBenchmarkSuite: bindBackendMethod(
      "readBenchmarkSuite",
    ) as StartBridgeServerOptions["readBenchmarkSuite"],
    runBenchmark: bindBackendMethod("runBenchmark") as StartBridgeServerOptions["runBenchmark"],
    readBenchmarkRun: bindBackendMethod(
      "readBenchmarkRun",
    ) as StartBridgeServerOptions["readBenchmarkRun"],
    readActiveBenchmarkRun: bindBackendMethod(
      "readActiveBenchmarkRun",
    ) as StartBridgeServerOptions["readActiveBenchmarkRun"],
    clearBenchmarkEndpointData: bindBackendMethod(
      "clearBenchmarkEndpointData",
    ) as StartBridgeServerOptions["clearBenchmarkEndpointData"],
    clearBenchmarkData: bindBackendMethod(
      "clearBenchmarkData",
    ) as StartBridgeServerOptions["clearBenchmarkData"],
    readBenchmarkSummary: bindBackendMethod(
      "readBenchmarkSummary",
    ) as StartBridgeServerOptions["readBenchmarkSummary"],
    readBenchmarkPortfolio: bindBackendMethod(
      "readBenchmarkPortfolio",
    ) as StartBridgeServerOptions["readBenchmarkPortfolio"],
    listBenchmarkRuns: bindBackendMethod(
      "listBenchmarkRuns",
    ) as StartBridgeServerOptions["listBenchmarkRuns"],
    // Run 98 addendum 43 S4: the packaged runtime builds its options from this table, so a route wired only
    // into the backend reads as 404 on the live runtime (which is how the first v270 swap failed).
    readBenchmarkSampleRunStates: bindBackendMethod(
      "readBenchmarkSampleRunStates",
    ) as StartBridgeServerOptions["readBenchmarkSampleRunStates"],
    readBenchmarkSummariesByMode: bindBackendMethod(
      "readBenchmarkSummariesByMode",
    ) as StartBridgeServerOptions["readBenchmarkSummariesByMode"],
    readBenchmarkPreferences: bindBackendMethod(
      "readBenchmarkPreferences",
    ) as StartBridgeServerOptions["readBenchmarkPreferences"],
    updateBenchmarkPreferences: bindBackendMethod(
      "updateBenchmarkPreferences",
    ) as StartBridgeServerOptions["updateBenchmarkPreferences"],
    listLocalModels: bindBackendMethod(
      "listLocalModels",
    ) as StartBridgeServerOptions["listLocalModels"],
    listPeerLocalModels: bindBackendMethod(
      "listPeerLocalModels",
    ) as StartBridgeServerOptions["listPeerLocalModels"],
    listLlamaSwapLocalModels: bindBackendMethod(
      "listLlamaSwapLocalModels",
    ) as StartBridgeServerOptions["listLlamaSwapLocalModels"],
    loadLocalModel: bindBackendMethod(
      "loadLocalModel",
    ) as StartBridgeServerOptions["loadLocalModel"],
    loadPeerModel: bindBackendMethod("loadPeerModel") as StartBridgeServerOptions["loadPeerModel"],
    loadLlamaSwapModel: bindBackendMethod(
      "loadLlamaSwapModel",
    ) as StartBridgeServerOptions["loadLlamaSwapModel"],
    setPeerModelRoles: bindBackendMethod(
      "setPeerModelRoles",
    ) as StartBridgeServerOptions["setPeerModelRoles"],
    setLlamaSwapModelRoles: bindBackendMethod(
      "setLlamaSwapModelRoles",
    ) as StartBridgeServerOptions["setLlamaSwapModelRoles"],
    unloadPeerModel: bindBackendMethod(
      "unloadPeerModel",
    ) as StartBridgeServerOptions["unloadPeerModel"],
    unloadLocalModel: bindBackendMethod(
      "unloadLocalModel",
    ) as StartBridgeServerOptions["unloadLocalModel"],
    readLocalPolicy: bindBackendMethod(
      "readLocalPolicy",
    ) as StartBridgeServerOptions["readLocalPolicy"],
    updateLocalPolicy: bindBackendMethod(
      "updateLocalPolicy",
    ) as StartBridgeServerOptions["updateLocalPolicy"],
    readRolePolicy: bindBackendMethod(
      "readRolePolicy",
    ) as StartBridgeServerOptions["readRolePolicy"],
    createRolePolicyRole: bindBackendMethod(
      "createRolePolicyRole",
    ) as StartBridgeServerOptions["createRolePolicyRole"],
    updateRolePolicyRole: bindBackendMethod(
      "updateRolePolicyRole",
    ) as StartBridgeServerOptions["updateRolePolicyRole"],
    listTaskDefinitions: bindBackendMethod(
      "listTaskDefinitions",
    ) as StartBridgeServerOptions["listTaskDefinitions"],
    updateTaskDefinitions: bindBackendMethod(
      "updateTaskDefinitions",
    ) as StartBridgeServerOptions["updateTaskDefinitions"],
    listSwapHistory: bindBackendMethod(
      "listSwapHistory",
    ) as StartBridgeServerOptions["listSwapHistory"],
    getLocalLogs: bindBackendMethod("getLocalLogs") as StartBridgeServerOptions["getLocalLogs"],
    readModelOverrides: bindBackendMethod(
      "readModelOverrides",
    ) as StartBridgeServerOptions["readModelOverrides"],
    updateModelOverrides: bindBackendMethod(
      "updateModelOverrides",
    ) as StartBridgeServerOptions["updateModelOverrides"],
    readPeers: bindBackendMethod("readPeers") as StartBridgeServerOptions["readPeers"],
    updatePeers: bindBackendMethod("updatePeers") as StartBridgeServerOptions["updatePeers"],
    checkPeerHealth: bindBackendMethod(
      "checkPeerHealth",
    ) as StartBridgeServerOptions["checkPeerHealth"],
    getRoutableInventory: () => resolveBackend()?.getEffectiveRoutableInventory() ?? null,
  };
}

function openBrowser(url: string): void {
  let executable: string;
  let args: string[];
  if (process.platform === "win32") {
    executable = "cmd";
    args = ["/c", "start", "", url];
  } else if (process.platform === "darwin") {
    executable = "open";
    args = [url];
  } else {
    executable = "xdg-open";
    args = [url];
  }
  const child = spawn(executable, args, {
    detached: true,
    stdio: "ignore",
    shell: false,
  });
  child.unref();
}

type LauncherConfigValues = Record<string, string | boolean | undefined>;

function readLauncherString(values: LauncherConfigValues, key: string): string | undefined {
  const value = values[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function applyRecommendationServiceLauncherConfig(values: LauncherConfigValues): void {
  const channel = readLauncherString(values, "recommendation-channel");
  const serviceUrl =
    readLauncherString(values, "recommendation-service-url") ??
    (channel === "stage" ? "https://recommendations-stage.role-model.dev" : undefined);
  const verificationKey = readLauncherString(values, "recommendation-verification-key");
  const serviceToken = readLauncherString(values, "recommendation-service-token");
  const materialFile = readLauncherString(values, "recommendation-material-file");
  const aggregateScope = readLauncherString(values, "aggregate-scope");
  const recommendationScope = readLauncherString(values, "recommendation-scope");

  if (serviceUrl) {
    process.env.ROLE_MODEL_RECOMMENDATION_SERVICE_URL = serviceUrl;
  }
  if (channel) {
    process.env.ROLE_MODEL_RECOMMENDATION_CHANNEL = channel;
  }
  if (verificationKey) {
    process.env.ROLE_MODEL_RECOMMENDATION_VERIFICATION_KEY = verificationKey;
  }
  if (serviceToken) {
    process.env.ROLE_MODEL_RECOMMENDATION_SERVICE_TOKEN = serviceToken;
  }
  if (aggregateScope) {
    if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,511}$/.test(aggregateScope)) {
      throw new Error("aggregate scope is invalid");
    }
    process.env.ROLE_MODEL_AGGREGATE_SCOPE = aggregateScope;
  }
  if (recommendationScope) {
    if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,511}$/.test(recommendationScope)) {
      throw new Error("recommendation scope is invalid");
    }
    process.env.ROLE_MODEL_RECOMMENDATION_SCOPE = recommendationScope;
  }
  if (!materialFile) {
    return;
  }

  const material = JSON.parse(readFileSync(materialFile, "utf8")) as {
    readonly recommendationPublicSpkiBase64?: unknown;
    readonly internalServiceToken?: unknown;
  };
  if (
    typeof material.recommendationPublicSpkiBase64 !== "string" ||
    !material.recommendationPublicSpkiBase64.trim()
  ) {
    throw new Error("recommendation material file is missing recommendationPublicSpkiBase64");
  }
  if (typeof material.internalServiceToken !== "string" || !material.internalServiceToken.trim()) {
    throw new Error("recommendation material file is missing internalServiceToken");
  }
  process.env.ROLE_MODEL_RECOMMENDATION_VERIFICATION_KEY =
    material.recommendationPublicSpkiBase64.trim();
  process.env.ROLE_MODEL_RECOMMENDATION_SERVICE_TOKEN = material.internalServiceToken.trim();
}

type ProductionReplayAdapterOptions = Omit<
  Parameters<typeof createRouterReplayAdapter>[0],
  "authorizationNonceStore" | "authorizationNonceStorePath"
> & {
  readonly runtimeStateRoot: string;
  readonly scopeId: string;
};

const PRODUCTION_REPLAY_DISPATCH_LEDGER_SCHEMA =
  "role-model.replay-dispatch-idempotency-ledger.v1" as const;

/**
 * Run 108: how long an `in_flight` dispatch owned by another instance is still treated as possibly running.
 * Past it the attempt is abandoned and its arm may be re-driven (see `begin`); within it the guard still
 * refuses, so a live dispatch can never be doubled. The window is deliberately generous - being slow to
 * re-drive costs one capture, doubling a provider call costs money and evidence integrity.
 */
const PRODUCTION_REPLAY_DISPATCH_STALE_MS = 30 * 60 * 1_000;

type ProductionReplayDispatchLedgerRecord = {
  readonly requestDigest: string;
  readonly ownerInstanceId: string;
  readonly state: "in_flight" | "complete" | "failed";
  readonly receipt?: Record<string, unknown>;
  readonly failure?: string;
  readonly updatedAtMs: number;
};

type ProductionReplayDispatchLedgerDocument = {
  readonly schemaVersion: typeof PRODUCTION_REPLAY_DISPATCH_LEDGER_SCHEMA;
  readonly records: Record<string, ProductionReplayDispatchLedgerRecord>;
};

/**
 * R11-01: each candidate declares the share of the job budget it reserves
 * before its provider call is placed. Floor division keeps the sum of every
 * candidate reservation inside the single job budget, so a multi-candidate
 * replay cannot reserve the whole budget once per candidate and then refuse
 * every candidate after the first.
 */
export function resolveReplayCandidateBudgetReservation(input: {
  readonly budget: Record<string, unknown>;
  readonly candidateCount: number;
}): { readonly reservedCostMicros: number; readonly reservedBytes: number } {
  const candidateCount = input.candidateCount;
  if (!Number.isSafeInteger(candidateCount) || candidateCount < 1) {
    throw new Error("replay candidate count is required for its budget reservation");
  }
  const maxCostMicros = Number(input.budget?.maxCostMicros);
  const maxBytes = Number(input.budget?.maxBytes);
  if (
    !Number.isSafeInteger(maxCostMicros) ||
    maxCostMicros < 0 ||
    !Number.isSafeInteger(maxBytes) ||
    maxBytes < 1
  ) {
    throw new Error("bounded replay budget is required for its candidate reservations");
  }
  return {
    reservedCostMicros: Math.floor(maxCostMicros / candidateCount),
    reservedBytes: Math.floor(maxBytes / candidateCount),
  };
}

export function resolveProductionReplayAuthorizationNonceStorePath(input: {
  readonly runtimeStateRoot: string;
  readonly scopeId: string;
}): string {
  const runtimeStateRoot = input.runtimeStateRoot.trim();
  const scopeId = input.scopeId.trim();
  if (!runtimeStateRoot || !scopeId) {
    throw new Error("production replay adapter runtime state scope is required");
  }
  const scopeSegment = `sha256-${createHash("sha256").update(scopeId, "utf8").digest("hex")}`;
  return path.join(
    runtimeStateRoot,
    "scopes",
    scopeSegment,
    "track-b",
    "replay-authorization-nonces.json",
  );
}

export function resolveProductionReplayDispatchLedgerPath(input: {
  readonly runtimeStateRoot: string;
  readonly scopeId: string;
}): string {
  const runtimeStateRoot = input.runtimeStateRoot.trim();
  const scopeId = input.scopeId.trim();
  if (!runtimeStateRoot || !scopeId) {
    throw new Error("production replay dispatch ledger runtime state scope is required");
  }
  const scopeSegment = `sha256-${createHash("sha256").update(scopeId, "utf8").digest("hex")}`;
  return path.join(
    runtimeStateRoot,
    "scopes",
    scopeSegment,
    "track-b",
    "replay-dispatch-idempotency.json",
  );
}

export function createProductionReplayDispatchLedger(filePath: string) {
  if (typeof filePath !== "string" || !filePath.trim()) {
    throw new Error("production replay dispatch ledger path is required");
  }
  mkdirSync(path.dirname(filePath), { recursive: true });
  let records: Record<string, ProductionReplayDispatchLedgerRecord> = {};
  if (existsSync(filePath)) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(filePath, "utf8"));
    } catch {
      throw new Error("production replay dispatch ledger is invalid");
    }
    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed) ||
      (parsed as Record<string, unknown>).schemaVersion !==
        PRODUCTION_REPLAY_DISPATCH_LEDGER_SCHEMA ||
      !(parsed as Record<string, unknown>).records ||
      typeof (parsed as Record<string, unknown>).records !== "object" ||
      Array.isArray((parsed as Record<string, unknown>).records)
    ) {
      throw new Error("production replay dispatch ledger is invalid");
    }
    records = (parsed as ProductionReplayDispatchLedgerDocument).records as Record<
      string,
      ProductionReplayDispatchLedgerRecord
    >;
    const entries = Object.entries(records);
    if (entries.length > 8192) {
      throw new Error("production replay dispatch ledger exceeds its bounded cap");
    }
    for (const [key, record] of entries) {
      if (
        !/^[a-f0-9]{64}$/u.test(key) ||
        !record ||
        typeof record !== "object" ||
        typeof record.requestDigest !== "string" ||
        !/^[a-f0-9]{64}$/u.test(record.requestDigest) ||
        typeof record.ownerInstanceId !== "string" ||
        !record.ownerInstanceId ||
        !new Set(["in_flight", "complete", "failed"]).has(record.state) ||
        !Number.isSafeInteger(record.updatedAtMs) ||
        record.updatedAtMs < 0 ||
        (record.state === "complete" &&
          (!record.receipt ||
            typeof record.receipt !== "object" ||
            Array.isArray(record.receipt))) ||
        (record.state === "failed" &&
          (typeof record.failure !== "string" || record.failure.length > 512))
      ) {
        throw new Error("production replay dispatch ledger is invalid");
      }
    }
  }
  const persist = (): void => {
    const document: ProductionReplayDispatchLedgerDocument = {
      schemaVersion: PRODUCTION_REPLAY_DISPATCH_LEDGER_SCHEMA,
      records,
    };
    const temporaryPath = `${filePath}.${process.pid}.tmp`;
    writeFileSync(temporaryPath, `${JSON.stringify(document)}\n`, { encoding: "utf8" });
    renameSync(temporaryPath, filePath);
  };
  return Object.freeze({
    begin(
      dispatchIdempotencyKey: string,
      requestDigest: string,
      ownerInstanceId: string,
    ):
      | { state: "new" | "in_flight" | "failed" }
      | { state: "complete"; receipt: Record<string, unknown> } {
      const existing = records[dispatchIdempotencyKey];
      if (existing) {
        if (existing.requestDigest !== requestDigest) {
          throw new Error("replay dispatch idempotency key contract conflict");
        }
        if (existing.state === "complete") {
          return {
            state: "complete",
            receipt: structuredClone(existing.receipt as Record<string, unknown>),
          };
        }
        if (existing.ownerInstanceId !== ownerInstanceId) {
          /**
           * Run 108 note (measured on the live ledger: 3642 records - 3322 `complete`, 274 `failed`, 46
           * `in_flight`): this refusal is what stranded arms whose dispatching host went away, and the captured
           * consequence is `replay_failed` after the deferral budget. It was tempting to relax it - a `failed`
           * record looks terminal, and an `in_flight` record older than a bounded window cannot still be
           * running - and doing so broke two of this repo's own safety tests
           * (`run96 F190: an indeterminate restart cannot repeat a provider dispatch`,
           * `run99 R33: keeps the re-authorized dispatch idempotent across a host restart`). The guard is
           * therefore deliberately left fail-closed: a provider call that may already have been made is never
           * repeated under the same dispatch identity. Progress for such an arm has to come from a *new*
           * attempt identity, not from a weaker guard.
           */
          const error = new Error(
            "REPLAY_DISPATCH_INDETERMINATE: an earlier replay dispatch did not record completion; refusing to repeat it after restart",
          );
          (error as Error & { code?: string }).code = "REPLAY_DISPATCH_INDETERMINATE";
          throw error;
        }
        records = {
          ...records,
          [dispatchIdempotencyKey]: {
            requestDigest,
            ownerInstanceId,
            state: "in_flight",
            updatedAtMs: Date.now(),
          },
        };
        persist();
        return { state: existing.state };
      }
      if (Object.keys(records).length >= 8192) {
        throw new Error("production replay dispatch ledger exceeds its bounded cap");
      }
      records = {
        ...records,
        [dispatchIdempotencyKey]: {
          requestDigest,
          ownerInstanceId,
          state: "in_flight",
          updatedAtMs: Date.now(),
        },
      };
      persist();
      return { state: "new" };
    },
    complete(
      dispatchIdempotencyKey: string,
      ownerInstanceId: string,
      receipt: Record<string, unknown>,
    ): void {
      const existing = records[dispatchIdempotencyKey];
      if (!existing || existing.ownerInstanceId !== ownerInstanceId) {
        throw new Error("production replay dispatch ledger completion owner mismatch");
      }
      records = {
        ...records,
        [dispatchIdempotencyKey]: {
          requestDigest: existing.requestDigest,
          ownerInstanceId,
          state: "complete",
          receipt: structuredClone(receipt),
          updatedAtMs: Date.now(),
        },
      };
      persist();
    },
    fail(dispatchIdempotencyKey: string, ownerInstanceId: string, failure: unknown): void {
      const existing = records[dispatchIdempotencyKey];
      if (!existing || existing.ownerInstanceId !== ownerInstanceId) return;
      records = {
        ...records,
        [dispatchIdempotencyKey]: {
          requestDigest: existing.requestDigest,
          ownerInstanceId,
          state: "failed",
          failure: String(failure instanceof Error ? failure.message : failure).slice(0, 512),
          updatedAtMs: Date.now(),
        },
      };
      persist();
    },
    /**
     * Run 99 R33: a completed dispatch keeps its authorization single-use forever. Every other
     * state (never started, failed, or indeterminate) may re-present the *same* nonce for the
     * *same* dispatch identity, because the ledger — not the nonce — owns whether provider work
     * is repeated.
     */
    hasCompleted(dispatchIdempotencyKey: string): boolean {
      return records[dispatchIdempotencyKey]?.state === "complete";
    },
  });
}

/**
 * Compose the CLI's replay adapter with the scope-owned durable nonce ledger.
 * The path deliberately lives beneath the same runtime-state scope as the
 * Track B owner so a host restart cannot re-authorize a dispatched envelope.
 */
export function createProductionReplayAdapter(
  options: ProductionReplayAdapterOptions,
): ReturnType<typeof createRouterReplayAdapter> {
  const authorizationNonceStorePath = resolveProductionReplayAuthorizationNonceStorePath(options);
  const authorizationNonceStore = createReplayAuthorizationNonceStore(authorizationNonceStorePath);
  const dispatchLedger = createProductionReplayDispatchLedger(
    resolveProductionReplayDispatchLedgerPath(options),
  );
  const dispatchOwnerInstanceId = randomUUID();
  const activeDispatches = new Map<string, Promise<Record<string, unknown>>>();
  const dispatchWithIdempotency = (
    request: Record<string, unknown>,
  ): Promise<Record<string, unknown>> => {
    const dispatchIdempotencyKey = request.dispatchIdempotencyKey;
    if (
      typeof dispatchIdempotencyKey !== "string" ||
      !/^[a-f0-9]{64}$/u.test(dispatchIdempotencyKey)
    ) {
      throw new Error("replay dispatch idempotency key is required");
    }
    const {
      authorization: _authorization,
      nonce: _nonce,
      sandboxReceipt: _sandboxReceipt,
      ...stableRequest
    } = request;
    const requestDigest = createHash("sha256").update(JSON.stringify(stableRequest)).digest("hex");
    const existing = dispatchLedger.begin(
      dispatchIdempotencyKey,
      requestDigest,
      dispatchOwnerInstanceId,
    );
    if (existing.state === "complete") return Promise.resolve(existing.receipt);
    const active = activeDispatches.get(dispatchIdempotencyKey);
    if (active) return active;
    const pending = (async () => {
      try {
        const receipt = await options.dispatch(request);
        dispatchLedger.complete(dispatchIdempotencyKey, dispatchOwnerInstanceId, receipt);
        return receipt;
      } catch (error) {
        dispatchLedger.fail(dispatchIdempotencyKey, dispatchOwnerInstanceId, error);
        throw error;
      } finally {
        activeDispatches.delete(dispatchIdempotencyKey);
      }
    })();
    activeDispatches.set(dispatchIdempotencyKey, pending);
    return pending;
  };
  const { runtimeStateRoot: _runtimeStateRoot, scopeId: _scopeId, ...adapterOptions } = options;
  return createRouterReplayAdapter({
    ...adapterOptions,
    authorizationNonceStore: {
      has: (nonce: string) => authorizationNonceStore.has(nonce),
      consume: (nonce: string, dispatchIdentity?: string) =>
        authorizationNonceStore.consume(nonce, dispatchIdentity, {
          /**
           * Run 98 addendum 58 §21 (live stage 2026-09-21, replay-core job 220): the nonce store owns
           * the nonce→dispatch-identity binding — a re-presentation is only ever honored for the very
           * identity the nonce was burned for. The dispatch ledger owns *execution* identity, and it
           * answers a re-presentation without repeating provider work: a completed record returns its
           * stored receipt, a failed record owned by another instance is refused as indeterminate, and
           * a live hold is joined. Refusing here instead wedged every resume of a dispatch whose
           * provider response outlived the job deadline but whose branch append never recorded, so the
           * capture could not reach evaluation or the learner. Let the ledger decide.
           */
          mayReauthorize: (_identity: string) => true,
        }),
    },
    dispatch: dispatchWithIdempotency,
  });
}

export async function main(): Promise<void> {
  const args = parseArgs({
    options: {
      host: {
        type: "string",
      },
      port: {
        type: "string",
      },
      "repo-root": {
        type: "string",
      },
      "runtime-state-root": {
        type: "string",
      },
      "scope-id": {
        type: "string",
      },
      "unified-runtime-config": {
        type: "string",
      },
      "fixture-root": {
        type: "string",
      },
      "static-root": {
        type: "string",
      },
      "track-b-runtime-manifest": {
        type: "string",
      },
      "track-b-qa-extension-manifest": {
        type: "string",
      },
      "operator-auth-token": {
        type: "string",
      },
      "anonymous-learning-reads": {
        type: "string",
      },
      "artifact-digest-key-file": {
        type: "string",
      },
      "artifact-encryption-key-file": {
        type: "string",
      },
      "destination-trust-material-file": {
        type: "string",
      },
      "destination-material-file": {
        type: "string",
      },
      "aggregate-ingestion-url": {
        type: "string",
      },
      "aggregate-scope": {
        type: "string",
      },
      "development-verification-lease-file": {
        type: "string",
      },
      "development-verification-trust-key-file": {
        type: "string",
      },
      "development-verification-deployment-ids": {
        type: "string",
      },
      "development-verification-revocation-epoch": {
        type: "string",
      },
      "recommendation-scope": {
        type: "string",
      },
      "recommendation-service-url": {
        type: "string",
      },
      "recommendation-material-file": {
        type: "string",
      },
      "recommendation-verification-key": {
        type: "string",
      },
      "recommendation-service-token": {
        type: "string",
      },
      "recommendation-channel": {
        type: "string",
      },
    },
  });
  applyRecommendationServiceLauncherConfig(args.values);
  const operatorAuthToken =
    readLauncherString(args.values, "operator-auth-token") ??
    (process.env.ROLE_MODEL_OPERATOR_AUTH_TOKEN?.trim() || undefined);
  // Run 99 (option 2): anonymous loopback Learning readbacks are explicit policy. An explicit
  // value wins over the bind-host default; an unparseable value fails the launch instead of
  // silently falling back to the permissive default.
  const anonymousLearningReads = parseAnonymousLearningReadsFlag(
    readLauncherString(args.values, "anonymous-learning-reads") ??
      process.env.ROLE_MODEL_ANONYMOUS_LEARNING_READS,
  );

  const launchedWithoutRuntimeArgs =
    !args.values["repo-root"] && !args.values["runtime-state-root"];
  const options = resolveBridgeServerOptions({
    host: args.values.host,
    port: args.values.port,
    repoRoot: args.values["repo-root"],
    runtimeStateRoot: args.values["runtime-state-root"],
    scopeId: args.values["scope-id"],
    executablePath: process.execPath,
    localAppData: process.env.LOCALAPPDATA,
    unifiedRuntimeConfigPath: args.values["unified-runtime-config"],
  });
  const packagedProfile = readPackagedRuntimeProfile(process.execPath);
  const packagedManifestRecord = packagedProfile
    ? (JSON.parse(
        readFileSync(path.join(path.dirname(process.execPath), "manifest.json"), "utf8"),
      ) as Record<string, unknown>)
    : null;
  const run88StageIdentity = resolveRun88StageRuntimeIdentity(
    packagedProfile?.channel ?? "development",
    packagedManifestRecord,
  );
  const packagedReleaseId = run88StageIdentity?.releaseId;
  const packagedExecutableSha256 = String(packagedManifestRecord?.executable_sha256 ?? "");
  const aggregateCorrelationReleaseId =
    run88StageIdentity?.releaseId ??
    (/^[a-f0-9]{64}$/.test(packagedExecutableSha256)
      ? `sha256:${packagedExecutableSha256}`
      : undefined);
  const aggregateCorrelationCohortId = packagedProfile
    ? packagedProfile.channel === "stage"
      ? "stage-1pct"
      : packagedProfile.channel === "development"
        ? "development-default"
        : undefined
    : undefined;
  const loadRun88PiInvocationProvenance = run88StageIdentity
    ? () => readRun88PiInvocationProvenance(process.env, run88StageIdentity.releaseId)
    : null;
  if (packagedProfile?.channel === "production" && !args.values["runtime-state-root"]) {
    const migration = await migrateLegacyProductionState({
      legacyRoot: path.join(process.env.LOCALAPPDATA || os.tmpdir(), "Role Model Runtime"),
      destinationRoot: options.runtimeStateRoot,
    });
    if (migration.copied.length > 0 || migration.conflicts.length > 0) {
      console.log(
        JSON.stringify({
          status: "legacy-state-migration",
          copied: migration.copied.length,
          conflicts: migration.conflicts,
        }),
      );
    }
  }
  const staticRoot = args.values["static-root"]?.trim() || options.staticRoot;
  let server: Awaited<ReturnType<typeof startBridgeServer>> | null = null;
  let backend: RuntimeBridgeBackend | null = null;
  let packagedRuntime: Awaited<
    ReturnType<typeof createPackagedProductionRuntime<RuntimeBridgeBackend>>
  > | null = null;
  let extensionRuntime: Awaited<ReturnType<typeof createProductionExtensionRuntime>> | null = null;
  let extensionRuntimeOwner: {
    readonly promise: Promise<Awaited<ReturnType<typeof createProductionExtensionRuntime>>>;
    close(): Promise<void>;
  } | null = null;
  const extensionRuntimeRef: {
    current: Awaited<ReturnType<typeof createProductionExtensionRuntime>> | null;
  } = { current: null };
  // R3: the post-observation handler needs the running registry's configured
  // endpoints, but it is defined before the backend exists. The reference is filled
  // in once the runtime is created and read on every observation.
  const configuredEndpointIdsRef: { current: readonly string[] } = { current: [] };
  const bootstrapState: CliBootstrapState = { status: "pending" };
  let shutdownPromise: Promise<void> | null = null;
  let stopExtensionRuntimeWatchdog: (() => void) | null = null;
  let extensionRuntimeFailurePromise: Promise<void> | null = null;
  const failExtensionRuntime = (error: unknown): Promise<void> => {
    if (extensionRuntimeFailurePromise) return extensionRuntimeFailurePromise;
    bootstrapState.status = "failed";
    bootstrapState.message =
      error instanceof Error ? error.message : "extension runtime failed after startup";
    backend = null;
    extensionRuntimeRef.current = null;
    stopExtensionRuntimeWatchdog?.();
    stopExtensionRuntimeWatchdog = null;
    extensionRuntimeFailurePromise = (async () => {
      const activeExtensionRuntimeOwner = extensionRuntimeOwner;
      const activeExtensionRuntime = extensionRuntime;
      const activePackagedRuntime = packagedRuntime;
      extensionRuntimeOwner = null;
      extensionRuntime = null;
      packagedRuntime = null;
      if (activeExtensionRuntimeOwner) await activeExtensionRuntimeOwner.close();
      else if (activeExtensionRuntime?.close)
        await activeExtensionRuntime.close().catch(() => undefined);
      if (activePackagedRuntime) await activePackagedRuntime.close().catch(() => undefined);
    })();
    return extensionRuntimeFailurePromise;
  };
  const shutdown = async (): Promise<void> => {
    if (shutdownPromise) {
      return shutdownPromise;
    }

    shutdownPromise = (async () => {
      activeAutoReplayLoop?.stop();
      activeAutoReplayLoop = null;
      stopExtensionRuntimeWatchdog?.();
      stopExtensionRuntimeWatchdog = null;
      await server?.close();
      const activeExtensionRuntimeOwner = extensionRuntimeOwner;
      const activeExtensionRuntime = extensionRuntime;
      extensionRuntimeOwner = null;
      extensionRuntime = null;
      if (packagedRuntime) await packagedRuntime.close();
      else await backend?.shutdown();
      if (activeExtensionRuntimeOwner) await activeExtensionRuntimeOwner.close();
      else await activeExtensionRuntime?.close();
      process.exit(0);
    })();

    return shutdownPromise;
  };

  /**
   * Run 98 addendum 34 S7 (addendum 33 S6's missing caller): the re-score implementation needs the
   * extension runtime, the private operations boundary and the packaged profile, none of which exist
   * yet when the server options are built. The route therefore reads it through this holder, which the
   * runtime fills in once the supervised runtime is ready.
   */
  const rescoreLearningScoresRef: {
    current: ((body: Record<string, unknown>) => Promise<unknown>) | null;
  } = { current: null };

  server = await startBridgeServer(
    createCliServerOptions(
      {
        host: options.host,
        port: options.port,
        staticRoot,
        runtimeStateRoot: options.runtimeStateRoot,
        runtimeChannel: packagedProfile?.channel ?? "development",
        ...(anonymousLearningReads ? { anonymousLearningReads } : {}),
        // Run 98 addendum 44 `A44-S4`: the Configuration page shows what the router resolved, so a damaged
        // policy source reads as a degraded readback instead of a stored document that is not in effect.
        resolveLearningPolicySource: () =>
          describeRouterPolicyResolution(
            readLearningPolicyFile({
              repoRoot: options.repoRoot,
              stateRoot: resolveLearningPolicyStateRoot({
                runtimeStateRoot: options.runtimeStateRoot,
                scopeId: options.scopeId,
              }),
              channel: packagedProfile?.channel ?? "development",
              scopeId: options.scopeId,
            }),
          ),
        // Run 98 addendum 34 S7: the operator re-score route reads the handler through the holder above.
        rescoreLearningScores: async (body: Readonly<Record<string, unknown>> = {}) => {
          const handler = rescoreLearningScoresRef.current;
          if (!handler) throw new Error("evaluation re-score is not available yet");
          return handler({ ...body });
        },
        operatorContext: {
          channel: packagedProfile?.channel ?? "development",
          scope: options.scopeId,
          authorizationEpoch: 1,
        },
        ...(operatorAuthToken ? { operatorAuthToken } : {}),
        ...(run88StageIdentity ? { run88StageIdentity } : {}),
      },
      {
        getBackend: () => backend,
        readBootstrapState: () => bootstrapState,
        readExtensionRuntime: () => extensionRuntimeRef.current,
        onExtensionRuntimeFailure: failExtensionRuntime,
      },
      shutdown,
    ),
  );

  console.log(
    JSON.stringify(
      {
        status: "listening",
        host: options.host,
        port: server.port,
      },
      null,
      2,
    ),
  );

  if (launchedWithoutRuntimeArgs) {
    openBrowser(`http://${options.host}:${server.port}/`);
  }

  process.on("SIGINT", () => {
    void shutdown();
  });
  process.on("SIGTERM", () => {
    void shutdown();
  });

  try {
    const explicitManifest =
      args.values["track-b-runtime-manifest"]?.trim() ||
      process.env.ROLE_MODEL_TRACK_B_RUNTIME_MANIFEST?.trim();
    const packagedManifest = path.join(
      path.dirname(process.execPath),
      "track-b-runtime",
      "track-b-runtime-manifest.json",
    );
    const trackBManifestPath = explicitManifest || (packagedProfile ? packagedManifest : null);
    const trackBManifestText = trackBManifestPath
      ? await readFile(trackBManifestPath, "utf8").catch((error: unknown) => {
          if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
          throw error;
        })
      : null;
    const qaManifestPath =
      args.values["track-b-qa-extension-manifest"]?.trim() ||
      process.env.ROLE_MODEL_TRACK_B_QA_EXTENSION_MANIFEST?.trim() ||
      null;
    const qaManifest = qaManifestPath
      ? (JSON.parse(await readFile(qaManifestPath, "utf8")) as {
          readonly schemaVersion: string;
          readonly extensions?: readonly {
            readonly descriptor: {
              readonly id: string;
              readonly protocolVersion: string;
              readonly capabilities: readonly string[];
            };
            readonly modulePath: string;
            readonly artifactSha256: string;
          }[];
        })
      : null;
    if (
      qaManifest &&
      (qaManifest.schemaVersion !== "role-model.track-b-qa-extension-manifest.v1" ||
        !qaManifest.extensions?.length)
    ) {
      throw new Error("invalid explicit Track B QA extension manifest");
    }
    const qaExtensions = (qaManifest?.extensions ?? []).map((extension) => ({
      ...extension,
      modulePath: path.resolve(path.dirname(qaManifestPath as string), extension.modulePath),
    }));
    const qaStartupReceipts = new Map<string, Record<string, unknown>>();
    requirePackagedTrackBManifest(packagedProfile, trackBManifestText);
    const postObservationOutbox = createTrackBPostObservationOutbox({
      filePath: path.join(
        options.runtimeStateRoot,
        options.scopeId,
        "track-b",
        "post-observation-outbox.json",
      ),
    });
    let postObservationOperations: ReturnType<typeof createTrackBOperations> | null = null;
    // `createBackend` initializes this after the packaged runtime is selected.
    // Keep that initialization boundary opaque to TypeScript's local control-flow
    // analysis: the public-only build does not inline the private operations
    // adapter, but startup still needs to retry a durable outbox when it is
    // available at runtime.
    const currentPostObservationOperations = (): ReturnType<typeof createTrackBOperations> | null =>
      postObservationOperations;
    /**
     * Run 100 addendum `handoff-evidence-durability.addendum-06` S22 (RC-6).
     *
     * Measured on `:3457`: a handoff's intent is durable (the replay job, the dispatch receipt, the resume
     * entry) and its evidence is not - the route-capture ring keeps only the newest pointers, so a handoff
     * that outlives the ring takes the terminal disposition `evidence_outside_retention_window` (36 of them
     * and counting, 252 more already lost before the class was measured). The pin is addressed by the replay
     * job, so recording, renewing and re-reading a handoff all extend the *same* hold instead of racing to
     * create different ones.
     *
     * Both calls are best-effort and always logged: a runtime whose private boundary refuses the pin still
     * runs, but the operator sees that evidence is unprotected instead of assuming it is held.
     */
    const holdHandoffEvidence = async (
      replayJobId: string,
      input: Parameters<typeof handoffEvidenceHoldRequestIds>[0],
    ) => {
      const operations = currentPostObservationOperations();
      if (!operations) return;
      const requestIds = handoffEvidenceHoldRequestIds(input);
      if (requestIds.length === 0) return;
      try {
        await operations.holdLocalRouteCaptures({
          holderId: replayJobId,
          requestIds,
          ttlMs: HANDOFF_EVIDENCE_HOLD_TTL_MS,
        });
      } catch (error) {
        console.error(
          `[run101] handoff evidence hold declined:${replayJobId} ${String(
            (error as { message?: unknown })?.message ?? error,
          ).slice(0, 200)}`,
        );
      }
    };
    const releaseHandoffEvidence = async (replayJobId: string) => {
      const operations = currentPostObservationOperations();
      if (!operations) return;
      try {
        await operations.releaseLocalRouteCaptures({ holderId: replayJobId });
      } catch (error) {
        console.error(
          `[run101] handoff evidence release declined:${replayJobId} ${String(
            (error as { message?: unknown })?.message ?? error,
          ).slice(0, 200)}`,
        );
      }
    };
    // Automatic replay: read pending captures from the private boundary, replay them
    // through the public replay endpoint, and persist every disposition. Production
    // stays disabled; failures degrade the loop instead of affecting routing.
    /**
     * Run 99 R33 live finding (stage v158, `:3457`): the supervised-replay evaluation completer is the
     * only path that finalizes an automatic comparison and runs the learner. Four durable evaluation
     * jobs were stranded in `scoring` because a restart interrupted that completion between "scores
     * recorded" and "comparison group finalized", and nothing re-entered it — the producer only drives
     * replay jobs, and those were already terminal. Every handoff now records a bounded resume entry,
     * and the auto-replay tick re-runs the outstanding ones through this ref (the implementation lives
     * with the replay command handler inside createBackend).
     */
    const resumeEvaluationsRef: {
      current:
        | ((scope?: { readonly onlyReplayJobId?: string }) => Promise<{
            resumed: number;
            completed: number;
            failed: number;
            /** S23: handoffs terminated because their evidence is outside the capture retention window. */
            outsideRetentionWindow: number;
            /** S25: abandoned handoffs the drain renewed because their evidence may still exist. */
            renewedFromDrain: number;
            remaining: number;
          }>)
        | null;
    } = { current: null };
    /**
     * Run 101 R5: the evaluation plane's queue holder. It is declared at this
     * level because two sibling closures use it - the auto-replay starter
     * starts the runtime, and the replay handoff (which lives with the
     * post-observation handler) offers the job. Until the runtime is started it
     * reads `legacy`, so an unwired start is baseline behaviour.
     */
    let evaluationQueueRuntime: ReturnType<typeof startEvaluationQueueRuntime> | null = null;
    const lateBoundEvaluationQueue = {
      get mode() {
        return evaluationQueueRuntime?.dispatchQueue?.mode ?? "legacy";
      },
      offer: (job: {
        readonly origin: string;
        readonly groupId?: string | null;
        readonly replayJobId?: string | null;
      }) =>
        evaluationQueueRuntime?.dispatchQueue?.offer(job) ??
        Promise.resolve({ enqueued: false, reason: "evaluation_queue_not_started" }),
    };
    /**
     * Run 101 R6: the learner plane's queues, late-bound like the others. The
     * derivation worker needs the completion path (which offers the job) and the
     * runtime (which is started by the auto-replay starter) to exist first.
     */
    let learnerDeriveQueueRuntime: ReturnType<typeof startLearnerQueueRuntime> | null = null;
    let learnerPromoteQueueRuntime: ReturnType<typeof startLearnerQueueRuntime> | null = null;
    const lateBoundLearnerQueues = {
      derive: {
        get mode() {
          return learnerDeriveQueueRuntime?.dispatchQueue?.mode ?? "legacy";
        },
        offer: (job: { readonly groupId: string; readonly reason?: string | null }) =>
          learnerDeriveQueueRuntime?.dispatchQueue?.offer(job) ??
          Promise.resolve({ enqueued: false, reason: "learner_queue_not_started" }),
      },
      promote: {
        get mode() {
          return learnerPromoteQueueRuntime?.dispatchQueue?.mode ?? "legacy";
        },
        offer: (job: { readonly candidateId: string; readonly groupId?: string | null }) =>
          learnerPromoteQueueRuntime?.dispatchQueue?.offer({
            candidateId: job.candidateId,
            ...(job.groupId ? { groupId: job.groupId } : {}),
          }) ?? Promise.resolve({ enqueued: false, reason: "learner_queue_not_started" }),
      },
    };
    /**
     * Run 100 addendum `handoff-evidence-durability.addendum-06` S27: the durable replay jobs' scope is
     * resolved in the liveness-sweep scope (which sees the captures) and is needed by the resume sweep's
     * terminalization (which runs in the replay command handler's scope), so it travels through a ref the same
     * way the resume sweep does.
     */
    const replayJobScopeRef: { current: (() => Promise<string | null>) | null } = { current: null };
    /**
     * Run 100 addendum `replay-dispatch-lifecycle.addendum-04` S7: the handed-off-replay recovery pass in
     * the liveness sweep records the resume entries it discovers, and the store itself lives with the replay
     * command handler (created later), so it is reached through this ref the same way `resumeEvaluationsRef`
     * reaches the sweep.
     */
    const evaluationResumeStoreRef: {
      current: ReturnType<typeof createSupervisedReplayEvaluationResumeStore> | null;
    } = { current: null };
    const startHostAutoReplayLoop = (
      endpoints: () => readonly string[],
      healthyEndpoints: () => Promise<readonly string[] | null>,
      endpointDescriptors: () => readonly {
        endpointId: string;
        modelId: string;
        reasoningEffort: string | null;
      }[],
      judgeResolver?: () => Promise<string | null>,
    ): ReturnType<typeof startAutoReplayLoop> | null => {
      const operations = postObservationOperations;
      const channel = packagedProfile?.channel ?? "development";
      if (process.env.ROLE_MODEL_FOCUS_DIAG)
        console.error(
          `[replay-loop] start check: operations=${operations ? "wired" : "null"} channel=${channel} port=${options.port}`,
        );
      if (!operations || channel === "production") return null;
      const port = options.port;
      if (!Number.isInteger(port) || port <= 0) return null;
      const ledger = createReplayLedger({
        filePath: path.join(
          options.runtimeStateRoot,
          options.scopeId,
          "track-b-replay-ledger.json",
        ),
        limits: resolveChannelScopedReplayLedgerLimits({
          repoRoot: options.repoRoot,
          runtimeStateRoot: options.runtimeStateRoot,
          scopeId: options.scopeId,
          channel,
        }),
      });
      const policySet = buildReplayPolicySet();
      const intervalMs = Number(process.env.ROLE_MODEL_AUTO_REPLAY_INTERVAL_MS ?? 30_000);
      if (!Number.isSafeInteger(intervalMs) || intervalMs < 1_000) return null;
      // The scope of the durable captures (and therefore of the replay jobs they
      // produce). It is learned from the capture the executor reads each tick so the
      // expiration sweep targets the same authority the jobs were created under.
      let lastReplayCaptureScope: string | null = null;
      // Run 100 addendum 04 S7: when the handed-off-replay recovery pass last listed the durable jobs.
      let lastHandoffRecoveryAtMs = 0;
      /**
       * Run 100 addendum `handoff-evidence-durability.addendum-06` S24: where the terminal recovery page
       * resumes. Process-lifetime by design: the durable stores are the record of what still needs doing, and
       * a restart re-scans from the beginning, which is cheap now that the listing only projects summaries.
       */
      let handoffRecoveryCursor: RecoveryPageCursor | null = null;
      /** P6: where the learner sweep resumes in the candidate listing (creation-time order). */
      let learnerCandidateCursor: { createdAtMs: number; candidateId: string } | null = null;
      /**
       * S13: groups this process already presented to the consumer. A group whose evidence is not complete yet stays
       * in the durable backlog; the set only stops one process re-deriving the same group on every tick, and a
       * restart re-scans from the beginning (the worker dedupes a repeated presentation).
       */
      const learnerDerivationAttempts = new Set<string>();
      /**
       * Addendum 39: groups the post-finalization signals sweep has settled for this process - its report is
       * persisted, its captures have aged out of the retention ring, or the analyzer answered a degradation receipt.
       * Settlement is monotonic, so the sweep does not spend its bounded page re-reading the newest end of the store
       * on every tick; a restart re-scans from the newest end (the reads are idempotent).
       */
      const finalizationSignalsSettled = new Set<string>();
      /**
       * Run 104 R10: the sweep's `evaluation:list-groups` listing is its whole cost - 293,159 bytes per call,
       * 61 calls in 30 minutes while the operator readbacks hung. Reuse the listing across ticks inside a
       * bounded window; a group finalized inside the window is picked up by the next listing, and each
       * settled group's own report is idempotent.
       */
      const finalizedGroupListingCache =
        createFinalizedGroupListingCache<Record<string, unknown>>();
      const finalizedGroupListingKey = `${options.runtimeStateRoot}|${options.scopeId}`;
      /** S27 diagnostics: report the resolved job scope and an empty recovery page once per process. */
      let replayJobScopeReported = false;
      let emptyRecoveryPageReported = false;
      /** S29 diagnostics: report a page payload that is not the page itself, once per process. */
      let examinedShapeUnreported = true;
      /** S33 diagnostics: report the answer to a lookup of an evaluation that does not exist, once. */
      let existingLookupShapeReported = false;
      /** S36 diagnostics: report a job read that yields no record, once per process. */
      let jobReadShapeReported = false;
      /** S37 diagnostics: report a candidate that could not become a resume entry, once per process. */
      let entrySynthesisReported = false;
      /**
       * Run 100 addendum `handoff-evidence-durability.addendum-06` S27: the scope the durable replay jobs were
       * created under. The producer learns it from the captures it dispatches, and a runtime that has just
       * restarted has none - in that window its listings bound the operator scope, `assertJobSummaryBinding`
       * skipped every job, and the recovery page came back empty (measured live: the log filled with
       * `replay persisted job scope binding mismatch` while the terminal set stayed invisible). When the scope
       * is unknown it is discovered from the store itself, with a listing that does not bind the scope it is
       * trying to find.
       */
      const resolveReplayJobScope = async (): Promise<string | null> => {
        if (lastReplayCaptureScope) {
          if (!replayJobScopeReported) {
            replayJobScopeReported = true;
            console.error(`[run101] replay job scope: learned ${lastReplayCaptureScope}`);
          }
          return lastReplayCaptureScope;
        }
        /**
         * S28: the scope is *computable*, not discoverable. Measured live: a scope-less listing is refused by
         * the runtime host before the extension's binding check runs
         * (`envelope identity or capability is incomplete or incompatible`), so the pass bound the operator
         * scope and the page came back empty. The derivation below is the one the private boundary uses to
         * stamp the captures these jobs were built from.
         */
        const derived = resolveDurableReplayJobScope({
          channel,
          runtimeStateRoot: options.runtimeStateRoot,
          scopeId: options.scopeId,
        });
        if (!replayJobScopeReported) {
          replayJobScopeReported = true;
          console.error(`[run101] replay job scope: derived ${derived}`);
        }
        return derived;
      };
      replayJobScopeRef.current = resolveReplayJobScope;
      /**
       * Run 100 addendum 39: the learner-facing sweeps reach the extensions through the same envelope shape (protocol
       * version, channel, authorization epoch and the durable evaluation authority), so it is built once and only the
       * request prefix differs between the consume/derive sweeps and the post-finalization signals sweep.
       */
      const learnerSweepEnvelope = (input: {
        readonly requestPrefix: string;
        readonly extensionId: string;
        readonly capability: string;
        readonly value: Record<string, unknown>;
        readonly evaluationAuthoritySecret?: string;
        readonly scopeOverride?: string;
        readonly query?: Record<string, unknown>;
      }) => ({
        requestId: `${input.requestPrefix}:${input.capability}:${Date.now()}`,
        sessionId: `${input.requestPrefix}:${options.scopeId}`,
        protocolVersion: "1.1.0",
        channel,
        scope: input.scopeOverride ?? options.scopeId,
        authorizationEpoch: 1,
        capability: input.capability,
        value: input.value,
        ...(input.query ? { query: input.query } : {}),
        ...(input.extensionId === "knowledge-store" ? { payload: input.value } : {}),
        ...(input.evaluationAuthoritySecret
          ? { evaluationAuthoritySecret: input.evaluationAuthoritySecret }
          : {}),
      });
      // RC07 (L2): the bounded expiration sweep goes straight through the extension
      // host the producer already uses for replay-core, because the operator boundary's
      // replay domain does not expose the sweep in the packaged composition
      // (live: `operator_capability_unavailable`). Binding is still enforced by the
      // capability itself from the envelope's channel/scope/epoch.
      const sweepOperations = {
        ...operations,
        async expireStaleReplayJobs(input: Record<string, unknown>) {
          const runtime = extensionRuntimeRef.current;
          if (!runtime) return { expiredCount: 0, expired: [] };
          try {
            /**
             * The sweep must resolve the CAPTURE scope exactly the way every other replay read does. It
             * previously used the raw last-capture-scope fallback to the operator scope, and that fallback
             * is KNOWN to match nothing: a just-restarted runtime has read no capture, so the sweep ran against the
             * operator scope while every durable job lives under `runtime:<hash>`. The extension then
             * skipped every job on `job.scope !== scope`, returned `expiredCount: 0`, and so reported
             * success while doing nothing - no `expirationReceipt` was ever issued, and any job that became
             * expire-able in that window was stranded for ever behind the claim guard that requires that
             * receipt (measured live: three jobs overdue by ~3.5 hours past a 30-minute grace, with every
             * field eligible except their scope).
             *
             * Run 100 addendum `handoff-evidence-durability.addendum-06` S27/S28 already solved exactly
             * this for the listings by deriving the scope from the store itself when no capture has been
             * read; this call site simply never used that resolver. Reusing it means a runtime that has just
             * restarted sweeps the scope its jobs are actually in, instead of one that cannot match.
             */
            /**
             * The scope is COMPUTABLE, not discoverable, so it is derived directly here - the same
             * `resolveDurableReplayJobScope` call every other replay readback in this file uses. An earlier
             * version of this fix read the optional replay-job-scope ref and fell back to the operator scope
             * when that ref was unset, which meant the sweep stayed inert on exactly the just-restarted
             * runtime it was written for: the ref is assigned on one composition path only, so a launch that
             * does not take it sweeps the operator scope - the scope already known to match no jobs. Measured
             * live on build 0.0.14-770-gae1864fb: zero expirations and no scope log line at all, because the
             * resolver was never called.
             */
            const sweepScope = resolveDurableReplayJobScope({
              channel,
              runtimeStateRoot: options.runtimeStateRoot,
              scopeId: options.scopeId,
            });
            const result = await runtime.invoke("replay-core", {
              requestId: `replay-expire-stale:${Date.now()}`,
              sessionId: `replay-expire-stale:${options.scopeId}`,
              protocolVersion: "1.1.0",
              channel,
              scope: sweepScope,
              authorizationEpoch: 1,
              capability: "replay:expire-stale-jobs",
              value: { ...input, scope: sweepScope, channel },
            });
            const record =
              result && typeof result === "object" && !Array.isArray(result)
                ? (result as Record<string, unknown>)
                : {};
            return record;
          } catch (error) {
            throw error instanceof Error ? error : new Error("replay expiration sweep failed");
          }
        },
        /**
         * Run 99 R33: one bounded evaluation-resume sweep per auto-replay tick, delegated to the
         * implementation that lives with the replay command handler.
         */
        async resumePendingEvaluations() {
          if (!resumeEvaluationsRef.current) {
            return {
              resumed: 0,
              completed: 0,
              failed: 0,
              outsideRetentionWindow: 0,
              renewedFromDrain: 0,
              remaining: 0,
            };
          }
          const result = await resumeEvaluationsRef.current();
          /**
           * Run 100 addendum `handoff-evidence-durability.addendum-06` S23: this is the operator readback for
           * the named disposition. Measured on `:3457`: 252 of 265 lost handoffs cannot be completed by any
           * retry (their branch captures are outside the capture retention ring), and before this counter
           * they were indistinguishable from a defect - they simply appeared as `abandoned` after eight
           * attempts. The count is the signal; the disposition is on the entry and on the replay job.
           */
          if (result.outsideRetentionWindow > 0) {
            console.error(
              `[run101] ${result.outsideRetentionWindow} handoff(s) disposed as ${HANDOFF_EVIDENCE_OUTSIDE_RETENTION_WINDOW}`,
            );
          }
          if (result.renewedFromDrain > 0) {
            console.error(
              `[run101] ${result.renewedFromDrain} abandoned handoff(s) renewed while their evidence may still exist`,
            );
          }
          return result;
        },
        /**
         * Run 100 addendum `evaluation-lease-wedge-repair.addendum-02` S1: one bounded reconciliation of
         * *evaluation* jobs per auto-replay tick.
         *
         * `evaluation:reconcile-jobs` is the only pass that completes a job whose comparison group is
         * finalized, marks a job with no live lease and no non-terminal trial as stranded, and reclaims it
         * once the grace has elapsed. It shipped with unit coverage and **no production caller** (the same
         * shape as the run 98 addendum 34 rescue calls), so 18 rows stayed non-terminal on the live stage
         * store for two days while the operator surface reported them "in flight". Evaluation jobs live in
         * the operator scope's evaluation store - the resume sweep above reads them with the same scope.
         */
        /**
         * Run 100 addendum `replay-evaluation-learner-spine-completion.addendum-07` P6 - the learner's own
         * liveness.
         *
         * Measured live: 162 knowledge-worker candidates, only 148 with a `validation_receipt` in the knowledge
         * store, and the only thing that ever wrote one was the inline learner step inside
         * `runTrackBShadowPipeline`. A comparison finalized by the extension's sweep (or a pipeline run interrupted
         * after it derived its candidate) therefore left a candidate that no later process would ever validate -
         * `knowledge_learning_records` stopped at 2026-09-21T22:56:38Z while 549 completion receipts accrued.
         *
         * The sweep drives the worker's own steps with durable evidence only (exactly the records the pass writes,
         * in the same shapes and with the same identity), bounded to a couple of candidates per tick:
         *   `knowledge:list-candidates` -> candidates the store has no receipt for ->
         *   `knowledge:validate-candidate` -> `knowledge:record-learning` (validation_receipt) ->
         *   `knowledge:promote-candidate` when the receipt says `validate` -> `knowledge:record-learning` (pack).
         * It never dispatches a provider call and never mutates a route.
         */
        async learnFromUnconsumedCandidates(input: Record<string, unknown> = {}) {
          const runtime = extensionRuntimeRef.current;
          if (!runtime) return { scanned: 0, consumed: 0, remaining: 0 };
          const authority = await (async () => {
            try {
              return await resolveDurableEvaluationAuthority({
                channel,
                stateRoot: options.runtimeStateRoot,
                scopeId: options.scopeId,
              });
            } catch {
              return null;
            }
          })();
          if (!authority) return { scanned: 0, consumed: 0, remaining: 0 };
          const envelopeFor = (
            extensionId: string,
            capability: string,
            value: Record<string, unknown>,
          ) => ({
            requestId: `learner-sweep:${capability}:${Date.now()}`,
            sessionId: `learner-sweep:${options.scopeId}`,
            protocolVersion: "1.1.0",
            channel,
            scope: options.scopeId,
            authorizationEpoch: 1,
            capability,
            value,
            ...(extensionId === "knowledge-store" ? { payload: value } : {}),
            evaluationAuthoritySecret: authority.authoritySecret,
          });
          const listing = await runtime.invoke(
            "knowledge-worker",
            envelopeFor("knowledge-worker", "knowledge:list-candidates", {
              /**
               * P6: the sweep walks the candidate set with a cursor instead of re-reading its newest page (the
               * fixed-window class this run keeps meeting) - the consumed set lives in the knowledge store, so
               * only a page that advances can reach a candidate nothing ever validated.
               */
              limit: 32,
              ...(learnerCandidateCursor === null
                ? {}
                : {
                    afterCreatedAtMs: learnerCandidateCursor.createdAtMs,
                    afterCandidateId: learnerCandidateCursor.candidateId,
                  }),
            }),
          );
          const candidates = (() => {
            const decoded = decodeExternalizedOperatorReadback({
              stateRoot: options.runtimeStateRoot,
              scopeId: options.scopeId,
              value: unwrapCapabilityPayload(listing),
            });
            const rows = Array.isArray(decoded)
              ? decoded
              : Array.isArray((decoded as { candidates?: unknown[] })?.candidates)
                ? (decoded as { candidates: unknown[] }).candidates
                : [];
            return rows.filter(
              (row): row is Record<string, unknown> => Boolean(row) && typeof row === "object",
            );
          })();
          if (candidates.length === 0) return { scanned: 0, consumed: 0, remaining: 0 };
          const lastListed = candidates[candidates.length - 1];
          learnerCandidateCursor =
            candidates.length < 32 &&
            typeof lastListed?.candidateId === "string" &&
            Number.isSafeInteger(lastListed?.createdAtMs)
              ? null
              : typeof lastListed?.candidateId === "string" &&
                  Number.isSafeInteger(lastListed?.createdAtMs)
                ? {
                    createdAtMs: Number(lastListed.createdAtMs),
                    candidateId: lastListed.candidateId,
                  }
                : null;
          const records = await runtime.invoke(
            "knowledge-store",
            envelopeFor("knowledge-store", "knowledge:list-learning", {
              scopeId: options.scopeId,
              kind: "validation_receipt",
              limit: 512,
            }),
          );
          const recordedCandidateIds = new Set(
            (() => {
              /**
               * P6, third pass: the listing is read through the same externalization decoder as every other
               * operator readback. Without it a page whose records are externalized parses to markers, no
               * candidate id matches, and the sweep reports the whole page as "without a validation receipt"
               * (measured live on `stage-run105`: "32 candidate(s) without a validation receipt" while 149 of
               * the 164 candidates carried one). A readback that cannot be read is reported, never assumed.
               */
              const decoded = decodeExternalizedOperatorReadback({
                stateRoot: options.runtimeStateRoot,
                scopeId: options.scopeId,
                value: unwrapCapabilityPayload(records),
              });
              const rows = Array.isArray(decoded)
                ? decoded
                : Array.isArray((decoded as { records?: unknown[] })?.records)
                  ? (decoded as { records: unknown[] }).records
                  : [];
              return rows
                .map((row) => {
                  const record =
                    row && typeof row === "object" && !Array.isArray(row)
                      ? (row as Record<string, unknown>)
                      : {};
                  const parsed = (() => {
                    if (record.record && typeof record.record === "object") {
                      return record.record as Record<string, unknown>;
                    }
                    // The store answers parsed records; a page that has been through an inline frame may
                    // still carry the raw JSON, and a receipt that cannot be attributed is not a receipt.
                    if (typeof record.record_json === "string") {
                      try {
                        return JSON.parse(record.record_json) as Record<string, unknown>;
                      } catch {
                        return {};
                      }
                    }
                    return record;
                  })();
                  const candidateId = parsed.candidateId ?? record.candidateId;
                  return typeof candidateId === "string" ? candidateId : null;
                })
                .filter((value): value is string => value !== null);
            })(),
          );
          if (recordedCandidateIds.size === 0 && candidates.length > 0) {
            console.error(
              "[run101] learner sweep: the validation-receipt listing named no candidate - every candidate would look unvalidated",
            );
          }
          /**
           * P2/P6: the retrieval index has no driver of its own - the retrieval plane is wired (durable index +
           * durable receipts) but nothing calls `knowledge:rebuild-index`, so the live store reads 0 FTS rows,
           * no index-state row and 0 retrieval receipts. One call per sweep keeps it current: it is idempotent
           * and answers a readback (`rebuilt:false`) when the candidate backlog has not changed.
           */
          try {
            const rebuilt = unwrapCapabilityPayload(
              await runtime.invoke(
                "knowledge-worker",
                envelopeFor("knowledge-worker", "knowledge:rebuild-index", {}),
              ),
            );
            const record =
              rebuilt && typeof rebuilt === "object" && !Array.isArray(rebuilt)
                ? (rebuilt as Record<string, unknown>)
                : {};
            if (record.rebuilt === true) {
              console.error(
                `[run101] retrieval index rebuilt: ${String(record.indexedDocuments ?? "?")} document(s)`,
              );
            }
          } catch (error) {
            console.error(
              `[run101] retrieval index rebuild refused: ${String(
                (error as { message?: unknown })?.message ?? error,
              ).slice(0, 160)}`,
            );
          }
          /**
           * Run 100 addendum 15 / item 7: the index has a driver; the *retrieval* had none. One bounded shadow
           * query per tick, with its receipt recorded durably by the Knowledge Store, is what makes the ranking
           * path observable at all (`knowledge_retrieval_receipts` read 0 while the index was fully built).
           */
          try {
            const served = await serveLearnerSweepRetrieval({
              scopeId: options.scopeId,
              invoke: (extensionId, capability, value) =>
                runtime.invoke(extensionId, envelopeFor(extensionId, capability, value)),
            });
            if (served.served) {
              console.error(
                `[run146] learner sweep served retrieval results=${served.resultCount} matches=${served.matchCount} receipt=${
                  served.receiptId ?? "-"
                } recorded=${served.durableReceipt.recorded}`,
              );
            } else {
              console.error(
                `[run146] learner sweep retrieval not served: ${String(served.reason ?? "unknown").slice(0, 160)}`,
              );
            }
          } catch (error) {
            console.error(
              `[run146] learner sweep retrieval failed: ${String(
                (error as { message?: unknown })?.message ?? error,
              ).slice(0, 160)}`,
            );
          }
          /**
           * Run 101 addendum 44: a caller that owns one candidate can scope the sweep to it. The durable
           * `learner.promote` job is per candidate (`jobIdRule: candidateId`), so a job-scoped consume
           * must not be satisfied by - or blocked behind - another candidate's work.
           */
          const onlyCandidateId =
            typeof input.candidateId === "string" && input.candidateId.trim()
              ? input.candidateId.trim()
              : null;
          const pending = candidates.filter((candidate) => {
            const candidateId =
              typeof candidate.candidateId === "string" ? candidate.candidateId : null;
            if (candidateId === null || recordedCandidateIds.has(candidateId)) return false;
            return onlyCandidateId === null || candidateId === onlyCandidateId;
          });
          if (pending.length === 0)
            return { scanned: candidates.length, consumed: 0, remaining: 0 };
          /**
           * Run 100 addendum 07 P6, second pass: the first version of this sweep presented only
           * `{ candidateId }`, and `validateCandidate` refuses that with "scorer and judge identity
           * required for validation" - so the sweep could never consume anything. A durable caller has to
           * present the value the pipeline presents: the scoring identity and scope the worker re-checks
           * against the candidate record, the finalized comparison readback, and the two receipts the
           * worker verifies with the evidence authority. Both receipts are HMACs over durable facts and
           * the authority is now derived from the runtime's managed key, so `assembleDurableLearnerValidationValue`
           * mints exactly what a pipeline run mints (see its suite for the recipe).
           */
          const readComparisonGroups = async (): Promise<Record<string, unknown>[]> => {
            try {
              /**
               * Run 107 P1: the learner's evidence is the whole durable group set. A single
               * argument-less call answered one fixed 256-row page, so with 699 live groups the
               * summary could never see the 443 that sat outside the window and the promotion gate
               * had nothing to count. The readback now walks the capability's cursor.
               */
              return await collectPagedComparisonGroups({
                readPage: async (cursor) => {
                  const decoded = decodeExternalizedOperatorReadback({
                    stateRoot: options.runtimeStateRoot,
                    scopeId: options.scopeId,
                    value: unwrapCapabilityPayload(
                      await runtime.invoke(
                        "evaluation-core",
                        envelopeFor("evaluation-core", "evaluation:list-groups", {
                          page: true,
                          limit: LEARNING_GROUP_PAGE_LIMIT,
                          ...(cursor ? { cursor } : {}),
                        }),
                      ),
                    ),
                  });
                  return decoded;
                },
              });
            } catch {
              return [];
            }
          };
          const groups = await readComparisonGroups();
          let consumed = 0;
          /**
           * Run 105 R9/D7: derived activation has no per-sweep activation step, so the counter stays
           * at zero and is only kept because the sweep's answer shape (consumed/activated/remaining)
           * is part of the bounded operations contract the queue plane and the run-107 readbacks
           * assert. The legacy activate-pack MACHINERY remains untouched and reachable; only this
           * sweep's call was removed.
           */
          const activated = 0;
          for (const candidate of pending.slice(0, 2)) {
            const candidateId = String(candidate.candidateId);
            const scorerSetVersion =
              typeof candidate.scorerSetVersion === "string" ? candidate.scorerSetVersion : null;
            if (!scorerSetVersion) continue;
            try {
              const candidateScope =
                candidate.scope && typeof candidate.scope === "object"
                  ? (candidate.scope as Record<string, unknown>)
                  : {};
              const routePackage =
                typeof candidateScope.routePackage === "string" && candidateScope.routePackage
                  ? candidateScope.routePackage
                  : typeof candidate.routePackage === "string"
                    ? candidate.routePackage
                    : null;
              /**
               * P6, third pass (measured live on `stage-run105`): the candidate carries the comparability
               * key first and the durable comparison group second, so reading `groupIds[0]` refused every
               * candidate with "durable evaluation comparison group not found" while the group it needed
               * was finalized in the store. `selectDurableComparisonGroupId` picks the id Evaluation Core
               * can actually read back, and every candidate id is still tried in order as a fallback.
               */
              const comparisonIds = [
                selectDurableComparisonGroupId(candidate),
                ...(Array.isArray(candidate.groupIds) ? candidate.groupIds : []),
              ].filter(
                (value, index, all): value is string =>
                  typeof value === "string" && value.length > 0 && all.indexOf(value) === index,
              );
              if (!routePackage || comparisonIds.length === 0) {
                console.error(
                  `[run101] learner sweep: candidate ${candidateId.slice(0, 16)} carries no comparison group`,
                );
                continue;
              }
              let groupId = comparisonIds[0];
              let group: Record<string, unknown> = {};
              // A candidate may carry more than one group-shaped id (a comparability key and the durable
              // comparison group); read each in order and keep the one Evaluation Core resolves to a
              // finalized comparison, so a foreign hash cannot mask a group that is present.
              for (const candidateGroupId of comparisonIds.slice(0, 3)) {
                const readback = decodeExternalizedOperatorReadback({
                  stateRoot: options.runtimeStateRoot,
                  scopeId: options.scopeId,
                  value: unwrapCapabilityPayload(
                    await runtime
                      .invoke(
                        "evaluation-core",
                        envelopeFor("evaluation-core", "evaluation:read-comparison-group", {
                          groupId: candidateGroupId,
                        }),
                      )
                      .catch(() => null),
                  ),
                });
                const candidateGroup =
                  readback && typeof readback === "object" && !Array.isArray(readback)
                    ? (readback as Record<string, unknown>)
                    : {};
                if (
                  candidateGroup.status === "finalized" &&
                  Array.isArray(candidateGroup.members)
                ) {
                  group = candidateGroup;
                  groupId = candidateGroupId;
                  break;
                }
              }
              if (group.status !== "finalized" || !Array.isArray(group.members)) {
                console.error(
                  `[run101] learner sweep: candidate ${candidateId.slice(0, 16)} has no finalized comparison readback for ${comparisonIds
                    .slice(0, 3)
                    .map((value) => value.slice(0, 24))
                    .join(", ")}`,
                );
                continue;
              }
              const comparability =
                group.comparability && typeof group.comparability === "object"
                  ? (group.comparability as Record<string, unknown>)
                  : {};
              // The same projection the pipeline builds from the durable readback (`track-b-runtime.ts`),
              // so the worker's holdout/membership checks see the record it already accepted.
              const finalizedComparison = {
                groupId: typeof group.groupId === "string" ? group.groupId : groupId,
                comparisonId: typeof group.groupId === "string" ? group.groupId : groupId,
                status: group.status,
                outcome: group.outcome,
                holdout: group.holdout,
                ...(group.primaryMetric ? { primaryMetric: group.primaryMetric } : {}),
                ...(Array.isArray(group.scorerOutcomes)
                  ? { scorerOutcomes: group.scorerOutcomes }
                  : {}),
                members: group.members,
              };
              const evidenceSummary = buildTrackBLearningEvidenceSummary({
                groups,
                routePackage,
                nowMs: Date.now(),
                evidenceMaxAgeMs: 30 * 24 * 60 * 60 * 1_000,
                evidenceHalfLifeDays: DEFAULT_EVIDENCE_HALF_LIFE_DAYS,
              });
              const validationValue = assembleDurableLearnerValidationValue({
                candidateId,
                routePackage,
                channel,
                scope: options.scopeId,
                configuredEndpointCount: configuredEndpointIdsRef.current.length,
                scorerSetVersion,
                judgeEndpointId:
                  typeof candidate.judgeEndpointId === "string" ? candidate.judgeEndpointId : null,
                evaluationAuthoritySecret: authority.authoritySecret,
                finalizedComparison,
                evidenceSummary,
                sourceEvidenceRef:
                  typeof comparability.sourceEvidenceRef === "string"
                    ? comparability.sourceEvidenceRef
                    : null,
                counterfactualEvidenceRef:
                  typeof comparability.counterfactualEvidenceRef === "string"
                    ? comparability.counterfactualEvidenceRef
                    : null,
                taskTypeId:
                  typeof candidateScope.taskTypeId === "string"
                    ? candidateScope.taskTypeId
                    : typeof comparability.taskTypeId === "string"
                      ? comparability.taskTypeId
                      : null,
                taxonomyVersion:
                  typeof candidateScope.taxonomyVersion === "string"
                    ? candidateScope.taxonomyVersion
                    : typeof comparability.taxonomyVersion === "string"
                      ? comparability.taxonomyVersion
                      : null,
              });
              const validation = unwrapCapabilityPayload(
                await runtime.invoke(
                  "knowledge-worker",
                  envelopeFor("knowledge-worker", "knowledge:validate-candidate", validationValue),
                ),
              );
              const validationRecord =
                validation && typeof validation === "object" && !Array.isArray(validation)
                  ? (validation as Record<string, unknown>)
                  : {};
              const receipt =
                validationRecord.receipt && typeof validationRecord.receipt === "object"
                  ? (validationRecord.receipt as Record<string, unknown>)
                  : null;
              const receiptId = typeof receipt?.receiptId === "string" ? receipt.receiptId : null;
              if (!receipt || !receiptId) {
                console.error(
                  `[run101] learner sweep: candidate ${candidateId.slice(0, 16)} produced no validation receipt`,
                );
                continue;
              }
              await runtime.invoke(
                "knowledge-store",
                envelopeFor("knowledge-store", "knowledge:record-learning", {
                  record: {
                    recordId: receiptId,
                    kind: "validation_receipt",
                    state:
                      typeof receipt.decision === "string"
                        ? receipt.decision
                        : "insufficient_evidence",
                    scopeId: options.scopeId,
                    identity: { scorerSetVersion, judgeEndpointId: null },
                    record: {
                      ...receipt,
                      ...(validationRecord.familyEvidence &&
                      typeof validationRecord.familyEvidence === "object"
                        ? { familyEvidence: validationRecord.familyEvidence }
                        : {}),
                    },
                  },
                }),
              );
              consumed += 1;
              /**
               * Run 107 P13: the durable record is the runtime's own shape and keeps the family evidence; the
               * *contract* artifact is the documented vocabulary, and until this slice nothing emitted one -
               * `contracts\` held zero `RouteLearningValidationReceiptV1` files while 149 receipts accrued.
               * The projection is validated by `emitTrackBContract` before it writes, so a record that cannot
               * be expressed in the contract is a named degradation here instead of a silent absence.
               */
              try {
                emitTrackBContract({
                  stateRoot: options.runtimeStateRoot,
                  scopeId: options.scopeId,
                  contract: buildRouteLearningValidationReceipt({
                    receipt,
                    channel,
                    scopeId: options.scopeId,
                  }),
                });
              } catch (error) {
                console.error(
                  `[run107] learner sweep: validation receipt ${receiptId.slice(0, 24)} was not emitted as a contract: ${String(
                    (error as { message?: unknown })?.message ?? error,
                  ).slice(0, 200)}`,
                );
              }
              if (receipt.decision === "validate") {
                const promotion = unwrapCapabilityPayload(
                  await runtime.invoke(
                    "knowledge-worker",
                    envelopeFor("knowledge-worker", "knowledge:promote-candidate", {
                      candidateId,
                      validationReceiptId: receiptId,
                      ...(typeof receipt.baselineId === "string"
                        ? { baselinePackId: receipt.baselineId }
                        : {}),
                    }),
                  ),
                );
                const packCandidate =
                  promotion && typeof promotion === "object" && !Array.isArray(promotion)
                    ? ((promotion as Record<string, unknown>).packCandidate as
                        | Record<string, unknown>
                        | undefined)
                    : undefined;
                const packId =
                  typeof packCandidate?.packId === "string" ? packCandidate.packId : null;
                if (packCandidate && packId) {
                  await runtime.invoke(
                    "knowledge-store",
                    envelopeFor("knowledge-store", "knowledge:record-learning", {
                      record: {
                        recordId: packId,
                        kind: "pack",
                        state:
                          typeof packCandidate.status === "string"
                            ? packCandidate.status
                            : "validated",
                        scopeId: options.scopeId,
                        identity: { scorerSetVersion, judgeEndpointId: null },
                        record: { ...packCandidate },
                      },
                    }),
                  );
                  // Run 107 P13: the promoted pack is emitted in the documented vocabulary too, so the
                  // learner's output is readable as the contract the proposal names (and not only as the
                  // knowledge store's own record).
                  try {
                    emitTrackBContract({
                      stateRoot: options.runtimeStateRoot,
                      scopeId: options.scopeId,
                      contract: buildExperiencePackCandidate({
                        pack: packCandidate,
                        channel,
                        scopeId: options.scopeId,
                      }),
                    });
                  } catch (error) {
                    console.error(
                      `[run107] learner sweep: pack ${packId.slice(0, 24)} was not emitted as a contract: ${String(
                        (error as { message?: unknown })?.message ?? error,
                      ).slice(0, 200)}`,
                    );
                  }
                  /**
                   * Run 100 addendum 15 item 6, second half. Measured on the rebuilt stage runtime
                   * 2026-09-25: this sweep promoted `pack-89a530d7...` at 05:23:58Z and `contracts\` held
                   * zero `RoutePackageAttributionV1` beside it, because only the shadow pipeline's learning
                   * pass had the emitter. Both promoters now go through one emitter, so a promoted package
                   * always names the route package the evidence belongs to and the numbers the gate used.
                   * A member the sweep cannot resolve refuses the artifact by name (logged, never thrown):
                   * the promotion itself must not depend on the artifact.
                   */
                  try {
                    const packScope =
                      packCandidate.scope &&
                      typeof packCandidate.scope === "object" &&
                      !Array.isArray(packCandidate.scope)
                        ? (packCandidate.scope as Record<string, unknown>)
                        : {};
                    const attributionEndpointId =
                      typeof packScope.endpointId === "string" && packScope.endpointId.trim()
                        ? packScope.endpointId.trim()
                        : routePackage;
                    const taskTypeId =
                      typeof candidateScope.taskTypeId === "string" &&
                      candidateScope.taskTypeId.trim()
                        ? candidateScope.taskTypeId.trim()
                        : typeof comparability.taskTypeId === "string" &&
                            comparability.taskTypeId.trim()
                          ? comparability.taskTypeId.trim()
                          : "task:route-selection";
                    const roleId =
                      typeof candidateScope.roleId === "string" && candidateScope.roleId.trim()
                        ? candidateScope.roleId.trim()
                        : null;
                    const attribution = emitRoutePackageAttributionForPromotion({
                      stateRoot: options.runtimeStateRoot,
                      scopeId: options.scopeId,
                      channel,
                      packId,
                      receipt,
                      descriptor: {
                        endpointId: attributionEndpointId,
                        modelId:
                          readEndpointModelIdForRoutePackage({
                            runtimeStateRoot: options.runtimeStateRoot,
                            scopeId: options.scopeId,
                            routePackage: attributionEndpointId,
                          }) ?? "",
                      },
                      scope: {
                        taskTypeId,
                        endpointId: attributionEndpointId,
                        ...(roleId ? { roleId } : {}),
                      },
                    });
                    if (!attribution.emitted) {
                      console.error(
                        `[run150] learner sweep: attribution for ${packId.slice(0, 24)} was not emitted: ${attribution.reason}`,
                      );
                    }
                  } catch (error) {
                    console.error(
                      `[run150] learner sweep: attribution for ${packId.slice(0, 24)} was not emitted as a contract: ${String(
                        (error as { message?: unknown })?.message ?? error,
                      ).slice(0, 600)}`,
                    );
                  }
                  /**
                   * Run 107 P6: the promotion has a second half - the pack has to reach the *rollout*.
                   *
                   * Measured live before this slice: the learner could write a validated pack (it did, at
                   * 2026-09-24T01:03:56Z, the first since 2026-09-21) and the router never saw it, because
                   * `route-advisory-source.ts` reads `rollout.activePackageId` and no writer ever set it
                   * from this path - the newest activation receipt was 2026-09-22T07:40Z. A pack that
                   * nothing activates is a receipt, not a learned route.
                   *
                   * Activation is the operator's stage, not the sweep's opinion: the sweep activates only
                   * when the effective policy stage for this channel/scope is one that already applies
                   * learned evidence (S2 advisory-considered and above), and it names the stage in the
                   * policy gate id so the receipt says which setting allowed it. `knowledge:activate-pack`
                   * keeps the cohort ladder, refuses a re-activation of a rolled-back pack without a new
                   * validation receipt, and keys its receipt by the pack, scope, gate and receipt id, so a
                   * repeated sweep is idempotent rather than a second activation.
                   */
                  /**
                   * Run 105 R9 / D7: derived activation is the ONLY routing authority, so the sweep
                   * NO LONGER calls knowledge:activate-pack. An activation is now a property of the
                   * evidence - the (role, task) ladder goes active the moment its admission floor is
                   * met (K finalized effort-comparable comparisons at mean confidence >= the
                   * product-defaults minimum) - and there is no mutable active-pack pointer left for
                   * a sweep to write.
                   *
                   * Removing the CALL is not removing the MACHINERY: activatePack/rollbackPack, the
                   * cohort ladder, the validation-receipt guard and the kill switch are untouched and
                   * remain reachable for the legacy callers the run-98/run-107 suites assert.
                   * activationStageAllowsPackActivation stays exported for the same reason - it is
                   * asserted directly by run-107.
                   *
                   * Derived activation reads the ladder the worker already wrote, so this is a
                   * deletion of a write, not a replacement with a different write.
                   */
                }
              }
            } catch (error) {
              console.error(
                `[run101] learner sweep: candidate ${candidateId.slice(0, 16)} refused ${String(
                  (error as { message?: unknown })?.message ?? error,
                ).slice(0, 160)}`,
              );
            }
          }
          if (pending.length > 0 || consumed > 0) {
            console.error(
              `[run101] learner sweep: ${pending.length} candidate(s) without a validation receipt, consumed ${consumed}${
                activated > 0 ? `, activated ${activated} pack(s)` : ""
              }`,
            );
          }
          return {
            scanned: candidates.length,
            consumed,
            activated,
            remaining: Math.max(0, pending.length - consumed),
          };
        },
        /**
         * Run 100 addendum 10, S13: the learner's durable derivation half.
         *
         * Measured 2026-09-25 on the live root: 483 learnable finalized comparisons, 202 candidates and **281
         * learnable groups with no candidate**, because `knowledge:eval-consumer` has no caller outside
         * `runTrackBShadowPipeline` - a comparison the pipeline never carried is durable evidence no learner can
         * reach. All 281 resolve a replay job through `holdout.caseIds` and 136 already carry a persisted
         * `trajectory_signal_reports` row for the capture's live decision, so those can be derived from evidence that
         * already exists: replay provenance from `replay:job`, the signal report from `signals:read`, the profile
         * estimate over the comparison's own rows, and the two receipts minted with the durable authority. Bounded to
         * two groups per tick, idempotent, and it never dispatches a provider call or invents a trajectory.
         */
        async deriveLearnerCandidates(input: Record<string, unknown> = {}) {
          /**
           * Run 105 Phase 3.5 follow-up: the ladder materialization must NOT ride the legacy
           * consumer-secret derivation path - a runtime whose durable-evaluation authority secret
           * is missing would silently skip materialization even though the host's own authenticated
           * operator operation can serve it. Materialization therefore runs FIRST, through the
           * authenticated host op only (no runtime.invoke, no authority secret), so it proceeds even
           * when every legacy derivation precondition below fails.
           */
          const materializeDerivedLadders = async () => {
            try {
              const defaultsSnapshot = readRouteLearningDefaults({
                repoRoot: options.repoRoot,
                channel,
                stateRoot: resolveLearningPolicyStateRoot({
                  runtimeStateRoot: options.runtimeStateRoot,
                  scopeId: options.scopeId,
                }),
              }).routeLearning;
              const materialized = await operations.materializeRouteLadders({
                configuredEndpointIds: endpoints(),
                defaults: defaultsSnapshot,
              });
              if (
                materialized &&
                typeof materialized === "object" &&
                !Array.isArray(materialized)
              ) {
                const record = materialized as Record<string, unknown>;
                const ladders = Array.isArray(record.ladders) ? record.ladders : [];
                const written = ladders.filter((entry) => {
                  return (
                    Boolean(entry) &&
                    typeof entry === "object" &&
                    (entry as Record<string, unknown>).status === "written"
                  );
                }).length;
                if (written > 0)
                  console.error(`[run105] ladder materialization wrote ${written} ladder row(s)`);
              }
            } catch (materializationError) {
              /**
               * This is a TRANSIENT SKIP, not a lost row, and the message has to say so. The sweep runs
               * once per auto-replay tick and materialization is a pure function of durable evidence, so
               * the next tick recomputes and writes whatever this attempt missed. Measured live: the log
               * held "wrote 1 ladder row(s)" at lines 159 and 169 around a "degraded" at 162, i.e. the
               * very next tick recovered, and the first-time ladder for that family materialized v1 -> v4
               * across the same window.
               *
               * The bare "degraded: database is locked" invited the opposite reading - that a family
               * could reach its admission floor and silently get no row - and that misreading is how this
               * was originally recorded as data loss. Naming the cause and the retry costs nothing and
               * stops the next reader making the same mistake.
               */
              const cause = String(
                (materializationError as { message?: unknown })?.message ?? materializationError,
              ).slice(0, 160);
              console.error(
                `[run105] ladder materialization skipped this tick (retried next tick, no row is lost): ${cause}`,
              );
              // Run 108 R3: the failure is ALSO a durable, operator-visible receipt in the knowledge
              // store - best-effort so a busy store (the very failure being reported) cannot break the
              // tick. Content-keyed, so repeated identical failures keep one row. Materialization itself
              // runs before the runtime is fully up (host-op only, see above), so the receipt is
              // recorded only when the extension runtime is available. Review B1 (03.5): the local
              // `runtime`/`envelopeFor` are declared AFTER this function runs - read the ref and the
              // enclosing learnerSweepEnvelope directly, or the guard itself throws a TDZ ReferenceError
              // on the exact busy-store case this receipt exists for.
              const runtimeAtCatch = extensionRuntimeRef.current;
              if (runtimeAtCatch !== null) {
                try {
                  await runtimeAtCatch.invoke(
                    "knowledge-store",
                    learnerSweepEnvelope({
                      requestPrefix: "learner-derivation",
                      extensionId: "knowledge-store",
                      capability: "knowledge:record-degradation",
                      value: { capability: "ladder-materialization", reason: cause },
                    }),
                  );
                } catch {
                  // the console line above remains the fallback surface
                }
              }
            }
          };
          await materializeDerivedLadders();
          const runtime = extensionRuntimeRef.current;
          if (!runtime) return { examined: 0, derived: 0, pending: 0 };
          const authority = await (async () => {
            try {
              return await resolveDurableEvaluationAuthority({
                channel,
                stateRoot: options.runtimeStateRoot,
                scopeId: options.scopeId,
              });
            } catch {
              return null;
            }
          })();
          if (!authority) return { examined: 0, derived: 0, pending: 0 };
          /**
           * S13 follow-on (measured live on `run121-0bda121a`): every derivation tick was refused with `replay
           * persisted job scope binding mismatch`, because durable replay jobs carry the *capture* scope
           * (`runtime:<hash>`) and the operator scope the runtime is configured with is not it - the same binding
           * addendum 06 S27/S28 documented for the handoff recovery pass. The scope is computable, not discoverable,
           * so the replay readback is bound to it while the evaluator/worker reads stay on the operator scope.
           */
          const replayJobScope = resolveDurableReplayJobScope({
            channel,
            runtimeStateRoot: options.runtimeStateRoot,
            scopeId: options.scopeId,
          });
          /**
           * Addendum 11: the consumer's evidence references are resolved by the worker's *own* artifact-store
           * resolver, and that resolver queries `artifacts WHERE scope_id = <invocation scope>`. Every group's
           * evidence lives in the capture scope (`runtime:714f4a87...`; 38/38 pipeline-processed and 82/82 gap
           * groups, none in the operator store), so the consumer call is bound to that scope exactly like the replay
           * readback. A caller-supplied resolver function cannot help here: measured live on `run133-100474c9`, the
           * packaged runtime drops it and the refusal names the packaged resolver
           * (`resolver=evaluation-reference-store`) without ever invoking the function.
           */
          const captureScopeForEvidence = replayJobScope;
          const envelopeFor = (
            extensionId: string,
            capability: string,
            value: Record<string, unknown>,
            scopeOverride?: string,
            query?: Record<string, unknown>,
          ) =>
            learnerSweepEnvelope({
              requestPrefix: "learner-derivation",
              extensionId,
              capability,
              value,
              scopeOverride,
              query,
              evaluationAuthoritySecret: authority.authoritySecret,
            });
          const groups = (
            await collectPagedComparisonGroups({
              readPage: async (cursor) => {
                const decoded = decodeExternalizedOperatorReadback({
                  stateRoot: options.runtimeStateRoot,
                  scopeId: options.scopeId,
                  value: unwrapCapabilityPayload(
                    await runtime.invoke(
                      "evaluation-core",
                      envelopeFor("evaluation-core", "evaluation:list-groups", {
                        page: true,
                        limit: LEARNING_GROUP_PAGE_LIMIT,
                        ...(cursor ? { cursor } : {}),
                      }),
                    ),
                  ),
                });
                return decoded;
              },
            }).catch(() => [])
          ).filter((group): group is Record<string, unknown> => {
            return Boolean(group) && typeof group === "object" && !Array.isArray(group);
          });
          const summary = await deriveLearnerCandidatesFromDurableEvidence({
            invoke: async (extensionId, capability, value, query) => {
              const answer = await runtime.invoke(
                extensionId,
                envelopeFor(
                  extensionId,
                  capability,
                  value,
                  extensionId === "replay-core"
                    ? replayJobScope
                    : extensionId === "knowledge-worker" && capability === "knowledge:eval-consumer"
                      ? captureScopeForEvidence
                      : undefined,
                  query,
                ),
              );
              /**
               * A capability answer larger than the inline frame arrives as a transfer marker
               * (`transferState`/`resultHash`/`byteLength`) - measured live on `run127-f8f5b967`, where the profile
               * estimate came back that way and the derivation read the marker as the estimate, refusing all 24
               * reachable groups. Every operator readback in this sweep is decoded through the same helper.
               */
              return decodeExternalizedOperatorReadback({
                stateRoot: options.runtimeStateRoot,
                scopeId: options.scopeId,
                value: unwrapCapabilityPayload(answer),
              });
            },
            groups,
            attemptedGroupIds: learnerDerivationAttempts,
            /**
             * Measured live on `run175-a6d8612d` (2026-09-26 00:15-00:24): a tick lands every ~1.8 minutes and two
             * derivations per tick drain ~1.2 learnable groups/minute - ~6.7 h for the 485-group backlog. The bound is
             * therefore raised deliberately: with 24 per tick the same backlog drains in ~20 ticks (~36 min), while
             * the compute step stays bounded to durable evidence and a group whose capture has aged out skips cheaply.
             */
            limit:
              Array.isArray(input.onlyGroupIds) && input.onlyGroupIds.length > 0
                ? input.onlyGroupIds.length
                : 24,
            // Run 101 R6: a learner.derive job names its group, so the pass
            // works on that comparison instead of the sweep's page.
            ...(Array.isArray(input.onlyGroupIds) && input.onlyGroupIds.length > 0
              ? { onlyGroupIds: input.onlyGroupIds as string[] }
              : {}),
            // Run 101 R6: the learner queue chains `learner.promote` on the
            // candidates this pass persisted, through the callback the caller
            // supplies, so the pinned five-field summary stays intact.
            ...(typeof input.onDerivedCandidate === "function"
              ? {
                  onDerivedCandidate: input.onDerivedCandidate as (
                    candidateId: string,
                    groupId: string,
                  ) => void,
                }
              : {}),
            /**
             * S13 follow-up: the group's report may never have been written (its live pipeline never ran), so the
             * sweep computes it through the capability that persists reports - bounded per tick (see `limit`), from
             * durable capture evidence only, and never for a group whose report already exists.
             */
            derivedReportLimit: 24,
            readDurableTrajectoryEvidence: async ({ job: durableJob }) => {
              const operations = currentPostObservationOperations();
              if (!operations) {
                return { kind: "unavailable", reason: "the operations boundary is unavailable" };
              }
              return deriveLearnerTrajectoryEvidenceForReplay({
                job: durableJob,
                readCapture: async (requestId) =>
                  (await operations.readLocalRouteCapture({ requestId })) as Record<
                    string,
                    unknown
                  > | null,
              });
            },
            channel,
            /**
             * The consumer's value must declare the same scope as its envelope (the worker rejects a proof from
             * another context), and its evidence is only resolvable under the capture scope - so the derived
             * candidate carries that scope, while the sweep's own readbacks stay on the operator scope.
             */
            scope: captureScopeForEvidence,
            evaluationAuthoritySecret: authority.authoritySecret,
            log: (message) => console.error(`[run120] ${message}`),
          });
          const pending = groups.filter((group) => {
            const groupId = typeof group.groupId === "string" ? group.groupId : null;
            return (
              groupId !== null &&
              group.status === "finalized" &&
              learnableComparisonMembers(group) !== null &&
              !learnerDerivationAttempts.has(groupId)
            );
          }).length;
          if (summary.examined > 0) {
            console.error(
              `[run120] learner derivation: examined ${summary.examined}, derived ${summary.derived}, skipped ${summary.skipped}, refused ${summary.refused}, backlog ${pending}`,
            );
          }
          return { ...summary, pending };
        },
        /**
         * Run 100 addendum `handoff-evidence-durability.addendum-06` S46: the production caller for
         * `evaluation:retro-finalize-comparisons`.
         *
         * Measured live: the newest durable evaluation jobs hold 2-4 **scored** trials with their declared
         * source/counterfactual pair satisfied and **no** comparison group, and were released as
         * `evaluation_job_stranded_without_finalized_comparison` (148 failed / 19 cancelled, all after
         * 2026-09-21). The capability exists, the core method exists (`retroFinalizeComparisons`, bounded to
         * 32), and nothing called it - so paid-for, fully scored evidence never became a comparison and the
         * learner had nothing to consume. This sweep is bounded to a few groups per tick, exactly like the
         * other liveness sweeps.
         */
        async retroFinalizeEvaluations() {
          const runtime = extensionRuntimeRef.current;
          if (!runtime) return { finalized: 0 };
          const result = await runtime.invoke("evaluation-core", {
            requestId: `evaluation-retro-finalize:${Date.now()}`,
            sessionId: `evaluation-retro-finalize:${options.scopeId}`,
            protocolVersion: "1.1.0",
            channel,
            scope: options.scopeId,
            authorizationEpoch: 1,
            capability: "evaluation:retro-finalize-comparisons",
            value: { limit: 4 },
          });
          const record =
            result && typeof result === "object" && !Array.isArray(result)
              ? (result as Record<string, unknown>)
              : {};
          const finalized = Array.isArray(record.finalized) ? record.finalized.length : 0;
          if (finalized > 0) {
            console.error(`[run101] retro-finalized ${finalized} comparison group(s)`);
          }
          return record;
        },
        /**
         * Run 100 addendum 39 (2026-09-26): the production caller for the post-finalization signals sweep.
         *
         * Measured live on run175c/`b7f04039` (`:3457`, 00:15-01:05): the learner's derivation pass *can* compute the
         * missing report, but it walks oldest-first and met 79 `capture … is outside the retention window` skips for
         * 9 analyses - by the time it reached a comparison, the captures that report needed were gone. The proposal
         * chain puts the model-free signal report before replay/evaluation, so this sweep runs directly after
         * `retroFinalizeEvaluations` (which is what makes a comparison exist at all) and produces the report while
         * its captures are still in the retention ring. Bounded page, bounded computes, wall-clock budget, and
         * idempotent: a group whose own report already exists is settled and never re-analyzed.
         */
        async sweepFinalizationSignals() {
          const runtime = extensionRuntimeRef.current;
          if (!runtime) return { examined: 0, analyzed: 0, skipped: 0, refused: 0, deferred: 0 };
          const authority = await (async () => {
            try {
              return await resolveDurableEvaluationAuthority({
                channel,
                stateRoot: options.runtimeStateRoot,
                scopeId: options.scopeId,
              });
            } catch {
              return null;
            }
          })();
          if (!authority) return { examined: 0, analyzed: 0, skipped: 0, refused: 0, deferred: 0 };
          /**
           * The replay jobs (and the captures the evidence resolver reads back) live in the *capture* scope, exactly
           * as the derivation pass documents; the signals reads stay on the operator scope.
           */
          const replayJobScope = resolveDurableReplayJobScope({
            channel,
            runtimeStateRoot: options.runtimeStateRoot,
            scopeId: options.scopeId,
          });
          const envelopeFor = (
            extensionId: string,
            capability: string,
            value: Record<string, unknown>,
            scopeOverride?: string,
            query?: Record<string, unknown>,
          ) =>
            learnerSweepEnvelope({
              requestPrefix: "finalization-signals",
              extensionId,
              capability,
              value,
              scopeOverride,
              query,
              evaluationAuthoritySecret: authority.authoritySecret,
            });
          /**
           * One bounded listing of the *finalized* groups (the extension filters on `status` before its keyset cursor
           * advances, so the page carries comparisons that can actually have a report). The listing is the only
           * ordering the readback offers - a comparison group carries no timestamp - so the sweep consumes its
           * newest end first.
           */
          const groups = (
            await finalizedGroupListingCache
              .read(finalizedGroupListingKey, async () => {
                return collectPagedComparisonGroups({
                  readPage: async (cursor) => {
                    const decoded = decodeExternalizedOperatorReadback({
                      stateRoot: options.runtimeStateRoot,
                      scopeId: options.scopeId,
                      value: unwrapCapabilityPayload(
                        await runtime.invoke(
                          "evaluation-core",
                          envelopeFor("evaluation-core", "evaluation:list-groups", {
                            page: true,
                            status: "finalized",
                            limit: LEARNING_GROUP_PAGE_LIMIT,
                            ...(cursor ? { cursor } : {}),
                          }),
                        ),
                      ),
                    });
                    return decoded;
                  },
                }).catch(() => []);
              })
              .catch(() => [])
          ).filter((group): group is Record<string, unknown> => {
            return Boolean(group) && typeof group === "object" && !Array.isArray(group);
          });
          const summary = await sweepFinalizationSignalsForGroups({
            invoke: async (extensionId, capability, value, query) => {
              const answer = await runtime.invoke(
                extensionId,
                envelopeFor(
                  extensionId,
                  capability,
                  value,
                  extensionId === "replay-core" ? replayJobScope : undefined,
                  query,
                ),
              );
              return decodeExternalizedOperatorReadback({
                stateRoot: options.runtimeStateRoot,
                scopeId: options.scopeId,
                value: unwrapCapabilityPayload(answer),
              });
            },
            groups,
            settledGroupIds: finalizationSignalsSettled,
            computeLimit: FINALIZATION_SIGNALS_COMPUTE_LIMIT,
            examinedLimit: FINALIZATION_SIGNALS_EXAMINED_LIMIT,
            wallClockBudgetMs: FINALIZATION_SIGNALS_BUDGET_MS,
            readDurableTrajectoryEvidence: async ({ job: durableJob }) => {
              const operations = currentPostObservationOperations();
              if (!operations) {
                return { kind: "unavailable", reason: "the operations boundary is unavailable" };
              }
              return deriveLearnerTrajectoryEvidenceForReplay({
                job: durableJob,
                readCapture: async (requestId) =>
                  (await operations.readLocalRouteCapture({ requestId })) as Record<
                    string,
                    unknown
                  > | null,
              });
            },
            log: (message) => console.error(`[run176] ${message}`),
          });
          if (summary.examined > 0) {
            console.error(
              `[run176] finalization signals: examined ${summary.examined}, analyzed ${summary.analyzed}, skipped ${summary.skipped}, refused ${summary.refused}, deferred ${summary.deferred}`,
            );
          }
          return summary;
        },
        async reconcileEvaluationJobs() {
          const runtime = extensionRuntimeRef.current;
          if (!runtime) return { scanned: 0, completed: [], stranded: [], reclaimed: [] };
          const record = (await runtime.invoke("evaluation-core", {
            requestId: `evaluation-reconcile-jobs:${Date.now()}`,
            sessionId: `evaluation-reconcile-jobs:${options.scopeId}`,
            protocolVersion: "1.1.0",
            channel,
            scope: options.scopeId,
            authorizationEpoch: 1,
            capability: "evaluation:reconcile-jobs",
            value: { limit: 200 },
          })) as Record<string, unknown> | null;
          return record && typeof record === "object" && !Array.isArray(record)
            ? record
            : { scanned: 0, completed: [], stranded: [], reclaimed: [] };
        },
        /**
         * Run 100 addendum `replay-dispatch-lifecycle.addendum-04` S7 (live on `:3457`: 13 replay jobs
         * reached `awaiting_evaluation` with all their branches appended, and not one of them ever produced
         * an evaluation job, so the Evaluation stage stayed empty for eleven hours).
         *
         * `recordBranchAppend` moves the durable job to `evaluating`/`awaiting_evaluation` *before* the host
         * records its resume entry and runs the completer, and `claimJob` refuses a job in that state. An
         * attempt interrupted in that window therefore wedges the replay and its capture for good.
         *
         * This pass closes the window from the other side: it lists the durable jobs of the capture scope the
         * producer is working, and for every job that handed off without an evaluation job id it records the
         * resume entry the existing sweep already knows how to complete (the entry's criteria, capture and
         * branch captures are all re-derived from durable state by that completion).
         */
        async recoverHandedOffEvaluations() {
          const runtime = extensionRuntimeRef.current;
          if (!runtime) return { scanned: 0, recovered: 0, skipped: 0 };
          // Cadence guard (measured need): the listing used to clone every durable job of the scope on every
          // sweep, which starved the loop it was meant to unblock. The filtered listing below is cheap; the
          // guard keeps even that off the hot path when nothing can have changed.
          const nowMs = Date.now();
          if (nowMs - lastHandoffRecoveryAtMs < HANDOFF_RECOVERY_INTERVAL_MS) {
            return { scanned: 0, recovered: 0, skipped: 0 };
          }
          lastHandoffRecoveryAtMs = nowMs;
          const scope = (await resolveReplayJobScope()) ?? options.scopeId;
          const listing = (await runtime.invoke("replay-core", {
            requestId: `replay-list-jobs:${Date.now()}`,
            sessionId: `replay-list-jobs:${options.scopeId}`,
            protocolVersion: "1.1.0",
            channel,
            scope,
            authorizationEpoch: 1,
            capability: "replay:list-jobs",
            /**
             * Only the handoff states, and only a small page. Run 100 addendum 04 S10: the extension
             * protocol inlines an envelope of at most 16 KiB and refuses anything larger
             * (`frame exceeds inline limit; use a channel-local transfer artifact` - measured live when this
             * pass asked for 25 jobs, each carrying candidate packages, branch references, dispatch results
             * and per-endpoint metric maps). The caller's page size is what has to respect that bound; three
             * entries fit comfortably and match the per-sweep recovery bound below.
             */
            value: {
              state: ["awaiting_evaluation", "evaluating"],
              summary: true,
              limit: MAX_HANDOFF_RECOVERY_LIST_PAGE,
            },
          })) as { readonly jobs?: unknown } | readonly unknown[] | null;
          const jobs = Array.isArray(listing)
            ? listing
            : listing &&
                typeof listing === "object" &&
                Array.isArray((listing as { jobs?: unknown }).jobs)
              ? ((listing as { jobs?: readonly unknown[] }).jobs as readonly unknown[])
              : [];
          const recoverable = selectRecoverableHandoffs(
            jobs as readonly DurableReplayJobSummary[],
            MAX_HANDOFF_RECOVERIES_PER_SWEEP,
          );
          let recovered = 0;
          let skipped = 0;
          /**
           * Run 100 addendum `replay-dispatch-lifecycle.addendum-04` S14 (measured on the real-traffic root:
           * 254 replay jobs carried an evaluation job id that Evaluation Core has never seen). The S7 pass
           * above only looks at handoffs *without* an id, so these were invisible: the completing attempt was
           * interrupted after the handoff recorded the id but before the evaluation was created. The terminal
           * states are listed here (a small page, same inline-frame bound) and each candidate is checked
           * against Evaluation Core; only the ones whose evaluation is genuinely missing are recorded, so the
           * ordinary evaluation sweep creates them from the branches the capture already paid for.
           */
          const terminalListing = (await runtime.invoke("replay-core", {
            requestId: `replay-list-terminal-jobs:${Date.now()}`,
            sessionId: `replay-list-terminal-jobs:${options.scopeId}`,
            protocolVersion: "1.1.0",
            channel,
            scope,
            authorizationEpoch: 1,
            capability: "replay:list-jobs",
            /**
             * S24: the page carries the cursor (without it this was a fixed window - the same three jobs every
             * sweep, all already evaluated, for ever) and asks for the summary projection, because a page of
             * whole jobs overruns the extension protocol's 16 KiB inline frame at two entries. The full record
             * is read for the jobs this sweep actually recovers.
             */
            value: terminalRecoveryListingValue({ cursor: handoffRecoveryCursor }),
          })) as { readonly jobs?: unknown } | readonly unknown[] | null;
          /**
           * S29: a large capability answer crosses the boundary as an externalized transfer marker instead of
           * the payload itself (the same class that made the Learning packs page render empty in R28), and this
           * page parses `jobs` directly - so an externalized answer looked like an empty page and the recovery
           * pass silently did nothing. Decode it the way every other readback in this file does.
           */
          const terminalPayload = decodeExternalizedOperatorReadback({
            stateRoot: options.runtimeStateRoot,
            scopeId: options.scopeId,
            value: terminalListing,
          });
          if (examinedShapeUnreported && !Array.isArray(terminalPayload)) {
            examinedShapeUnreported = false;
            console.error(
              `[run101] recovery page payload shape: ${
                Object.keys((terminalPayload as Record<string, unknown>) ?? {}).join(",") ||
                typeof terminalPayload
              }`,
            );
          }
          const pageRows = (payload: unknown): readonly unknown[] => {
            if (Array.isArray(payload)) return payload;
            if (!payload || typeof payload !== "object") return [];
            const record = payload as { value?: unknown; jobs?: unknown };
            if (Array.isArray(record.value)) return record.value;
            if (Array.isArray(record.jobs)) return record.jobs;
            return [];
          };
          const terminalJobs = pageRows(terminalPayload) as readonly DurableReplayJobSummary[];
          const recoveredJobs: DurableReplayJobSummary[] = [];
          let examined = 0;
          let candidates = 0;
          /** S31 diagnostics: the first reason a candidate could not become a resume entry. */
          let firstSkipReason: string | null = null;
          /** S32 diagnostics: the first job whose evaluation is genuinely missing on this page. */
          let firstMissingEvaluation: string | null = null;
          for (const job of terminalJobs as readonly DurableReplayJobSummary[]) {
            /**
             * S24: each examination costs a cross-boundary `evaluation:get-job`, so the sweep pays for a
             * bounded number of them per tick; the cursor advances past exactly the jobs it examined, which
             * is what makes the pass converge instead of repeating its first page.
             */
            if (examined >= MAX_HANDOFF_RECOVERY_CHECKS_PER_SWEEP) break;
            if (recoveredJobs.length >= MAX_HANDOFF_RECOVERIES_PER_SWEEP) break;
            examined += 1;
            if (selectUnevaluatedHandoffs([job], 1).length === 0) continue;
            candidates += 1;
            const carriedId = carriedEvaluationJobId(job);
            if (!carriedId) continue;
            let fullJob: DurableReplayJobSummary | null = null;
            try {
              /**
               * S18c: the listing returns the summary projection (identity, state, binding, evaluation id,
               * branch count) while the resume entry needs the job's candidate packages. Only the jobs that
               * reach this point are read in full, so the cost is bounded by the per-sweep recovery bound and
               * the projection stays lean for every other caller.
               */
              /**
               * S40 (measured live on ade5b26f: `[run101] job read answer shape: null`): the full-record read
               * was wrapped in `.catch(() => null)`, so a *refused* read and an *absent* record looked
               * identical - and a candidate whose evaluation is missing, whose record the listing had just
               * returned, was dropped without a reason. The failure is now named.
               */
              let jobReadFailure: string | null = null;
              let rawFullJob: unknown = null;
              try {
                rawFullJob = await runtime.invoke("replay-core", {
                  requestId: `replay-job-read:${carriedId}`,
                  sessionId: `replay-job-read:${options.scopeId}`,
                  protocolVersion: "1.1.0",
                  channel,
                  scope,
                  authorizationEpoch: 1,
                  capability: "replay:job",
                  value: { jobId: job.jobId },
                });
              } catch (error) {
                jobReadFailure = String(
                  (error as { message?: unknown })?.message ?? error ?? "unknown",
                ).slice(0, 160);
              }
              fullJob = rawFullJob as DurableReplayJobSummary | null;
              /**
               * S31: the full record crosses the same boundary as every other readback, so it may arrive as an
               * externalized transfer marker (the class that made the Learning packs page render empty). The
               * pass decoded nothing here, and a marker silently became "no full job" - one of the two silent
               * paths that made a page of candidates produce zero recoveries.
               */
              /**
               * S36: the record sits inside one or more envelope layers, so it is coerced (bounded, until the
               * record itself appears) rather than trusted after a single unwrap; a read that still yields no
               * record reports its shape once.
               */
              const coercedJob = coerceDurableReplayJobRecord(
                decodeExternalizedOperatorReadback({
                  stateRoot: options.runtimeStateRoot,
                  scopeId: options.scopeId,
                  value: fullJob,
                }),
              );
              if (!coercedJob && !jobReadShapeReported) {
                jobReadShapeReported = true;
                console.error(
                  `[run101] job read answer shape: ${JSON.stringify(fullJob).slice(0, 220)}${
                    jobReadFailure === null ? "" : ` failed=${jobReadFailure}`
                  }`,
                );
              }
              fullJob = coercedJob as DurableReplayJobSummary | null;
              if (!fullJob) {
                skipped += 1;
                firstSkipReason ??= "job record unavailable";
                continue;
              }
              const existingEvaluation = await runtime.invoke("evaluation-core", {
                requestId: `evaluation-get-job:${carriedId}`,
                sessionId: `evaluation-get-job:${options.scopeId}`,
                protocolVersion: "1.1.0",
                channel,
                scope: options.scopeId,
                authorizationEpoch: 1,
                capability: "evaluation:get-job",
                value: { jobId: carriedId },
              });
              /**
               * S32 (measured live: a page of candidates produced zero recoveries with no named reason): the
               * existence check treated *any* answer as "the evaluation exists", so a job whose evaluation was
               * never created - answered with an error envelope the host turns into a value instead of a
               * throw - was counted `skipped` and the pass never recovered it. Existence is now read from the
               * record's identity, and a non-record answer is the missing case this pass exists for.
               */
              const decodedExisting = unwrapCapabilityPayload(
                decodeExternalizedOperatorReadback({
                  stateRoot: options.runtimeStateRoot,
                  scopeId: options.scopeId,
                  value: existingEvaluation,
                }),
              );
              const existingRecord =
                decodedExisting &&
                typeof decodedExisting === "object" &&
                !Array.isArray(decodedExisting)
                  ? (decodedExisting as Record<string, unknown>)
                  : null;
              /**
               * S33 (measured live: the sweep reported "every candidate already has its evaluation" while the
               * store says the third job in `jobId` order has none): an answer that names a job that does not
               * exist still carries an identity, so *existence* - not identity - is what has to be read. A
               * durable evaluation job is a record with a state-machine status; anything else is the missing
               * case this pass exists for.
               */
              const existingStatus =
                typeof existingRecord?.status === "string" ? existingRecord.status.trim() : "";
              const evaluationExists = [
                "queued",
                "leased",
                "scoring",
                "retry_wait",
                "completed",
                "failed",
                "cancelled",
              ].includes(existingStatus);
              if (!evaluationExists && !existingLookupShapeReported) {
                existingLookupShapeReported = true;
                console.error(
                  `[run101] evaluation lookup answer for a missing job: ${JSON.stringify(
                    decodedExisting ?? existingEvaluation,
                  ).slice(0, 220)}`,
                );
              }
              if (evaluationExists) {
                // The evaluation exists (terminal or not): nothing to recover for this job.
                skipped += 1;
              } else if (fullJob) {
                recoveredJobs.push(fullJob);
              } else {
                skipped += 1;
                firstSkipReason ??= `missing evaluation for ${carriedId} without a full job record`;
              }
            } catch {
              // The entry is synthesized from the full record (candidate packages), not the summary.
              if (fullJob) {
                recoveredJobs.push(fullJob);
                firstMissingEvaluation ??= carriedId;
              } else {
                skipped += 1;
                firstSkipReason ??= `evaluation lookup failed for ${carriedId}`;
              }
            }
          }
          /**
           * Run 100 addendum `handoff-evidence-durability.addendum-06` S26: a page the filter cannot read is a
           * silent no-op - measured live, the pass stopped producing anything at all when its listing became a
           * summary page and the projection no longer carried the field the filter reads. The pass now says so.
           */
          if (examined > 0 && candidates === 0) {
            console.error(
              `[run101] recovery page carried no entry the filter could read: ${examined} examined, 0 candidates`,
            );
          }
          if (examined > 0 && recoveredJobs.length === 0 && recovered === 0 && firstSkipReason) {
            console.error(
              `[run101] recovery sweep: examined=${examined} candidates=${candidates} recovered=0 firstSkip=${firstSkipReason.slice(0, 160)}`,
            );
          }
          if (
            examined > 0 &&
            recovered === 0 &&
            candidates > 0 &&
            firstMissingEvaluation === null
          ) {
            console.error(
              `[run101] recovery sweep: examined=${examined} candidates=${candidates} recovered=0 - every candidate already has its evaluation`,
            );
          }
          if (examined === 0 && !emptyRecoveryPageReported) {
            emptyRecoveryPageReported = true;
            console.error(
              `[run101] recovery page came back empty: scope=${scope} channel=${channel} cursor=${
                handoffRecoveryCursor === null
                  ? "start"
                  : `${handoffRecoveryCursor.jobId.slice(0, 8)}@${handoffRecoveryCursor.createdAtMs}`
              }`,
            );
          }
          handoffRecoveryCursor = nextHandoffRecoveryCursor({
            currentCursor: handoffRecoveryCursor,
            /**
             * S38: the cursor is a place in the recency order, so it carries the timestamp as well as the id -
             * a pass that walked the set in `jobId` order spent its time on old, unfixable work before reaching
             * the handoffs whose evidence is still retained.
             */
            pageEntries: (terminalJobs as readonly DurableReplayJobSummary[])
              .map((job) => ({
                jobId: typeof job.jobId === "string" ? job.jobId : "",
                createdAtMs: Number.isSafeInteger(job.createdAtMs) ? Number(job.createdAtMs) : 0,
              }))
              .filter((entry) => entry.jobId.length > 0),
            examinedCount: examined,
            pageSize: MAX_HANDOFF_RECOVERY_LIST_PAGE,
          });
          for (const job of [...recoverable, ...recoveredJobs]) {
            const entry = recoveredHandoffEntry(job, { scopeFallback: scope });
            if (!entry) {
              /**
               * S37 diagnostics: synthesis has four guards (a handoff state, the capture ref the source decision
               * names, and a non-empty candidate package list) and a failure only incremented `skipped`, so a
               * candidate with a genuinely missing evaluation could vanish here without a trace.
               */
              if (!entrySynthesisReported) {
                entrySynthesisReported = true;
                const record = job as unknown as Record<string, unknown>;
                console.error(
                  `[run101] handoff entry synthesis failed: state=${String(record.state)} sourceDecisionId=${String(record.sourceDecisionId)} packages=${
                    Array.isArray(record.candidatePackages)
                      ? record.candidatePackages.length
                      : "none"
                  } keys=${Object.keys(record).slice(0, 16).join(",")}`,
                );
              }
              skipped += 1;
              continue;
            }
            try {
              const resumeStore = evaluationResumeStoreRef.current;
              if (!resumeStore) {
                skipped += 1;
                continue;
              }
              const existingEntry = resumeStore.get(entry.replayJobId);
              if (existingEntry) {
                /**
                 * Run 100 addendum `replay-evaluation-spine-repair.addendum-05` S17: an entry that already
                 * gave up was abandoned while the completion could not create a missing evaluation - the
                 * capability this recovery pass exists to use. `record()` deliberately never resets attempts,
                 * so the renewal is explicit and bounded; past its bound the give-up stands.
                 */
                const renewed =
                  existingEntry.outcome === "abandoned"
                    ? resumeStore.renew(entry.replayJobId, {
                        reason: "recovery: the handoff can now be completed from durable evidence",
                      })
                    : null;
                if (renewed) {
                  recovered += 1;
                  // S22: a renewal is a *live* handoff again, so its evidence is pinned again (the pin is
                  // idempotent per holder, so a re-hold only extends the TTL).
                  await holdHandoffEvidence(entry.replayJobId, {
                    requestId: entry.requestId,
                    sourceCaptureRequestId: entry.sourceCaptureRequestId,
                  });
                } else skipped += 1;
                continue;
              }
              resumeStore.record({
                schemaVersion: "role-model.supervised-replay-evaluation-resume.v1",
                replayJobId: entry.replayJobId,
                evaluationJobId: entry.evaluationJobId,
                requestId: entry.requestId,
                sourceCaptureRequestId: entry.sourceCaptureRequestId,
                sourceEndpointId: entry.sourceEndpointId,
                sourceModelId: entry.sourceModelId,
                counterfactualPackages: entry.counterfactualPackages,
                evaluationCriteria: {},
                evaluationCriteriaDigest: "",
                scope: entry.scope,
                recordedAtMs: Date.now(),
                attempts: 0,
                resolvedAtMs: null,
                outcome: null,
                lastError: null,
              });
              // S22: the recovered handoff now owes the source capture it will read again; pin it before
              // anything else can evict it.
              await holdHandoffEvidence(entry.replayJobId, {
                requestId: entry.requestId,
                sourceCaptureRequestId: entry.sourceCaptureRequestId,
              });
              recovered += 1;
            } catch (error) {
              skipped += 1;
              console.error(
                `[run100l] handed-off replay recovery declined:${entry.replayJobId} ${String(
                  (error as { message?: unknown })?.message ?? error,
                ).slice(0, 160)}`,
              );
            }
          }
          return { scanned: jobs.length, recovered, skipped };
        },
      };
      /**
       * Run 101 R4: the replay queue is composed beside the loop and late-bound,
       * because each needs the other - the loop offers admitted captures while
       * the queue's worker drives its claims back through the loop's own
       * `dispatchCapture`. Until the runtime is started the plane reads
       * `legacy`, so an unwired or failed start is baseline behaviour rather
       * than a stalled queue.
       */
      /**
       * Run 101 addendum 01: the queue plane's state root. Measured live on
       * `stage-rc-165e143f8092`: this composition used to pass
       * `options.runtimeStateRoot` (the base root), so the policy lookup missed
       * the operator's document at `<base>/<scopeId>/track-b/queues/queue-policy.json`,
       * fell back to the shipped all-`legacy` document, and the plane silently
       * stayed baseline while the UI showed `mode: queue`. The same helper every
       * other per-scope artifact uses resolves the scope root the sidecar is
       * rooted at, so both hosts read one document and open one store.
       */
      const queueStateRoot = resolveLearningPolicyStateRoot({
        runtimeStateRoot: options.runtimeStateRoot,
        scopeId: options.scopeId,
      });
      let queueRuntime: ReturnType<typeof startReplayQueueRuntime> | null = null;
      const lateBoundDispatchQueue = {
        get mode() {
          return queueRuntime?.dispatchQueue?.mode ?? "legacy";
        },
        offer: (job: {
          readonly captureRef: string;
          readonly endpointIds: readonly string[];
          readonly policySetDigest: string;
          readonly dispatchRoundId?: string;
        }) =>
          queueRuntime?.dispatchQueue?.offer(job) ??
          Promise.resolve({ enqueued: false, reason: "queue_runtime_not_started" }),
      };
      /**
       * Run 101 R7: the loop asks each plane's mode per tick, so the sweeps a
       * queue has replaced retire as soon as that queue becomes authoritative -
       * and come back if the operator rolls the plane back to `legacy`.
       */
      const lateBoundPlaneModes = {
        get replay() {
          return queueRuntime?.dispatchQueue?.mode ?? "legacy";
        },
        get evaluation() {
          return evaluationQueueRuntime?.dispatchQueue?.mode ?? "legacy";
        },
        get learner() {
          return learnerDeriveQueueRuntime?.dispatchQueue?.mode ?? "legacy";
        },
      };
      /**
       * Run 105 Phase 3.5 CLI-compile repair: the D providers below invoke knowledge-store through
       * the extension runtime, and the learner sweep's own `envelopeFor` is NOT in scope here (it is
       * declared inside the sweep closure, indent 10; this block is indent 6). This is the local
       * envelope for the ladder reads, built to the same extension-envelope shape the runtime
       * expects - the sweep helper is left untouched for its own callers.
       */
      const routeLadderEnvelopeFor = (capability: string, value: Record<string, unknown>) => ({
        requestId: `route-ladder:${capability}:${Date.now()}`,
        sessionId: `route-ladder:${options.scopeId}`,
        protocolVersion: "1.1.0",
        channel,
        scope: options.scopeId,
        authorizationEpoch: 1,
        capability,
        value,
        payload: value,
      });
      const loop = startAutoReplayLoop({
        readPendingRouteDispatches: async (request) => {
          const runtime = extensionRuntimeRef.current;
          const operations = currentPostObservationOperations();
          if (!runtime || !operations) return null;
          try {
            // Pending replay/queue inspection is read-only and invokes Replay Core only. Requiring
            // the Evaluation Core authority here made a fresh runtime with no managed evaluation
            // key return `null` before either authoritative pending plane was read.
            const replayJobScope = resolveDurableReplayJobScope({
              channel,
              runtimeStateRoot: options.runtimeStateRoot,
              scopeId: options.scopeId,
            });
            const { readPendingRouteDispatches } = await import("./route-challenge-evidence.js");
            return await readPendingRouteDispatches({
              request,
              readCapture: async (requestId) => operations.readLocalRouteCapture({ requestId }),
              readQueueJobs: async () =>
                operations.readQueueJobs("replay.dispatch", { limit: "500" }),
              readQueueJob: async (jobId) => operations.readQueueJob("replay.dispatch", jobId),
              invoke: async (extensionId, capability, value) =>
                decodeExternalizedOperatorReadback({
                  stateRoot: options.runtimeStateRoot,
                  scopeId: options.scopeId,
                  value: unwrapCapabilityPayload(
                    await runtime.invoke(
                      extensionId,
                      learnerSweepEnvelope({
                        requestPrefix: "route-dispatch-pending",
                        extensionId,
                        capability,
                        value,
                        scopeOverride: replayJobScope,
                      }),
                    ),
                  ),
                }),
            });
          } catch {
            return null;
          }
        },
        readRouteReplayableCaptures: async (request) => {
          const operations = currentPostObservationOperations();
          if (!operations) return null;
          try {
            const { readRouteReplayableCaptures } = await import("./route-challenge-evidence.js");
            return await readRouteReplayableCaptures({
              runtimeStateRoot: options.runtimeStateRoot,
              scopeId: options.scopeId,
              channel,
              request,
              readCapture: async (requestId) => operations.readLocalRouteCapture({ requestId }),
            });
          } catch {
            return null;
          }
        },
        readFinalizedRouteChallenge: async (request) => {
          const runtime = extensionRuntimeRef.current;
          if (!runtime) return null;
          try {
            const authority = await resolveDurableEvaluationAuthority({
              channel,
              stateRoot: options.runtimeStateRoot,
              scopeId: options.scopeId,
            });
            const replayJobScope = resolveDurableReplayJobScope({
              channel,
              runtimeStateRoot: options.runtimeStateRoot,
              scopeId: options.scopeId,
            });
            const { readFinalizedRouteChallengeEvidence } = await import(
              "./route-challenge-evidence.js"
            );
            return await readFinalizedRouteChallengeEvidence({
              request,
              invoke: async (extensionId, capability, value) =>
                decodeExternalizedOperatorReadback({
                  stateRoot: options.runtimeStateRoot,
                  scopeId: options.scopeId,
                  value: unwrapCapabilityPayload(
                    await runtime.invoke(
                      extensionId,
                      learnerSweepEnvelope({
                        requestPrefix: "route-challenge-evidence",
                        extensionId,
                        capability,
                        value,
                        scopeOverride: extensionId === "replay-core" ? replayJobScope : undefined,
                        evaluationAuthoritySecret: authority.authoritySecret,
                      }),
                    ),
                  ),
                }),
            });
          } catch {
            return null;
          }
        },
        readRouteDispatchEvidence: async (request) => {
          const runtime = extensionRuntimeRef.current;
          if (!runtime) {
            console.error(
              `[route-evidence-binding] no runtime; request=${request?.roleId}/${request?.taskTypeId}/${request?.endpointId}`,
            );
            return null;
          }
          try {
            const authority = await resolveDurableEvaluationAuthority({
              channel,
              stateRoot: options.runtimeStateRoot,
              scopeId: options.scopeId,
            });
            const replayJobScope = resolveDurableReplayJobScope({
              channel,
              runtimeStateRoot: options.runtimeStateRoot,
              scopeId: options.scopeId,
            });
            const { readRouteDispatchEvidence } = await import("./route-challenge-evidence.js");
            return await readRouteDispatchEvidence({
              request,
              invoke: async (extensionId, capability, value) =>
                decodeExternalizedOperatorReadback({
                  stateRoot: options.runtimeStateRoot,
                  scopeId: options.scopeId,
                  value: unwrapCapabilityPayload(
                    await runtime.invoke(
                      extensionId,
                      learnerSweepEnvelope({
                        requestPrefix: "route-challenge-evidence",
                        extensionId,
                        capability,
                        value,
                        scopeOverride: extensionId === "replay-core" ? replayJobScope : undefined,
                        evaluationAuthoritySecret: authority.authoritySecret,
                      }),
                    ),
                  ),
                }),
            });
          } catch (cause) {
            console.error(
              `[route-evidence-binding] failed: ${cause instanceof Error ? cause.message : String(cause)}`,
            );
            return null;
          }
        },
        operations: sweepOperations,
        ledger,
        policySet,
        configuredEndpointIds: endpoints,
        /**
         * Run 106: the same descriptors the supervised-replay path already builds from the registry
         * (`configuredReplayArms`), handed to the loop so the focus-dispatch walk can prefer a
         * counterfactual arm that runs at the source capture's reasoning effort. Without it the arm is
         * effort-mismatched whenever the source's own model is the arm's model, the comparison is finalized
         * `arm_effort_mismatch`, and the admission floor discards it - a replay and a paid provider call
         * spent on evidence nothing can use.
         */
        configuredEndpointDescriptors: endpointDescriptors,
        healthyEndpointIds: healthyEndpoints,
        /**
         * Run 105 R8/R9/R11: the ladder providers the depth-first dispatcher consumes. Each is a
         * provider (not a snapshot) so an endpoint added - or a rollback flipped - while the runtime
         * is up takes effect on the next tick, exactly like configuredEndpointIds above.
         */
        routeLearningDefaults: (() => {
          try {
            return readRouteLearningDefaults({
              repoRoot: options.repoRoot,
              channel,
              stateRoot: resolveLearningPolicyStateRoot({
                runtimeStateRoot: options.runtimeStateRoot,
                scopeId: options.scopeId,
              }),
            }).routeLearning;
          } catch {
            return null;
          }
        })(),
        routeFocusCandidates: async () => {
          const runtime = extensionRuntimeRef.current;
          if (!runtime) return null;
          try {
            const rows: unknown[] = [];
            let cursor: string | undefined;
            const cursors = new Set<string>();
            for (let page = 0; page < 10; page++) {
              const index = unwrapCapabilityPayload(
                await runtime.invoke(
                  "knowledge-store",
                  routeLadderEnvelopeFor("knowledge:list-route-ladders", {
                    scopeId: options.scopeId,
                    limit: 200,
                    ...(cursor ? { cursor } : {}),
                  }),
                ),
              );
              if (!index || typeof index !== "object" || Array.isArray(index))
                throw new Error("ladder index unavailable");
              const record = index as Record<string, unknown>;
              if (!Array.isArray(record.ladders)) throw new Error("ladder index unavailable");
              rows.push(...record.ladders);
              const nextCursor = record.nextCursor;
              // Older knowledge-store lists have no continuation metadata. A full page
              // cannot prove absence of omitted rollback rows, so refuse that census.
              if (nextCursor == null) {
                if (record.ladders.length >= 200) throw new Error("ladder index bounded limit");
                break;
              }
              if (
                typeof nextCursor !== "string" ||
                !nextCursor ||
                cursors.has(nextCursor) ||
                page === 9
              )
                throw new Error("ladder index bounded limit");
              cursors.add(nextCursor);
              cursor = nextCursor;
            }
            const defaults = readRouteLearningDefaults({
              repoRoot: options.repoRoot,
              channel,
              stateRoot: resolveLearningPolicyStateRoot({
                runtimeStateRoot: options.runtimeStateRoot,
                scopeId: options.scopeId,
              }),
            }).routeLearning;
            const census = readRouteLadderCensus({
              runtimeStateRoot: options.runtimeStateRoot,
              scopeId: options.scopeId,
              nowMs: Date.now(),
              stalenessWindowDays: defaults.stalenessWindowDays,
              configuredEndpointIds: endpoints(),
              ladderRows: rows,
            });
            if (census.status === "degraded") {
              console.error(`[run105] route census degraded:${census.reason}`);
              return null;
            }
            return census.candidates;
          } catch {
            console.error("[run105] route census degraded:ladder_unavailable");
            return null;
          }
        },
        readRouteLadder: async ({ roleId, taskTypeId }) => {
          const runtime = extensionRuntimeRef.current;
          if (!runtime) return null;
          try {
            const read = unwrapCapabilityPayload(
              await runtime.invoke(
                "knowledge-store",
                routeLadderEnvelopeFor("knowledge:read-route-ladder", {
                  scopeId: options.scopeId,
                  roleId,
                  taskTypeId,
                }),
              ),
            );
            const ladder =
              read && typeof read === "object" && !Array.isArray(read)
                ? ((read as Record<string, unknown>).ladder ?? null)
                : null;
            return decodeRouteLadderRow(ladder);
          } catch {
            return null;
          }
        },
        markRouteLadderEligible: async ({ roleId, taskTypeId, nextEligibleAtMs }) => {
          const runtime = extensionRuntimeRef.current;
          if (!runtime) return { marked: false };
          try {
            return unwrapCapabilityPayload(
              await runtime.invoke(
                "knowledge-store",
                routeLadderEnvelopeFor("knowledge:mark-ladder-eligible", {
                  roleId,
                  taskTypeId,
                  nextEligibleAtMs,
                }),
              ),
            );
          } catch {
            return { marked: false };
          }
        },
        reportUnclassifiedCaptures: ({ count }) => {
          console.error(
            `[run105] ${count} capture(s) refused as no_route_classification: no (role, task) classification, so they never enter the replay/eval queue and get no advisory`,
          );
        },
        // Run 101 R4: the replay plane's queue, whose mode comes from the
        // operator's policy document rather than from this composition.
        dispatchQueue: lateBoundDispatchQueue,
        planeModes: lateBoundPlaneModes,
        intervalMs,
        // Run 98 addendum 04 follow-on: bound one tick's wall clock so a tick made of several
        // minutes-long replays leaves the remaining captures for the next tick. Operators can tune it
        // with ROLE_MODEL_AUTO_REPLAY_TICK_BUDGET_MS; 0 disables the bound.
        ...(resolveAutoReplayTickBudgetMs(process.env) === null
          ? {}
          : { tickBudgetMs: resolveAutoReplayTickBudgetMs(process.env) as number }),
        // Run 98 addendum 52 (addendum 48 §11.2): a reservation whose dispatch process is gone is released by
        // the next tick instead of being carried against the day's ceiling forever.
        ...(resolveAutoReplayReservationTtlMs(process.env) === null
          ? {}
          : { reservationTtlMs: resolveAutoReplayReservationTtlMs(process.env) as number }),
        // Run 98 addendum 56 §6: the configured controller is the judge (addendum 45), so it must never be
        // planned as a counterfactual arm; resolved per tick so a controller change takes effect immediately.
        resolveJudgeEndpointId: async () => {
          if (judgeResolver) {
            const wiredJudge = await judgeResolver().catch(() => null);
            if (wiredJudge && wiredJudge.length > 0) return wiredJudge;
          }
          // Run 105 bug 3: the auto-replay starter is handed the narrow bridge options type, while the object
          // it receives at runtime is the full server composition (which binds `readControllerAssignment`). Reading
          // it defensively keeps a runtime without the binding on the previous behaviour instead of failing. The
          // wired resolution is passed in explicitly (see the `judgeResolver` argument at the call site) because
          // that binding is not reachable from this scope.
          const readControllerAssignment = (
            options as { readControllerAssignment?: () => Promise<unknown> }
          ).readControllerAssignment;
          const assignment = await Promise.resolve(readControllerAssignment?.()).catch(() => null);
          const endpointId =
            assignment && typeof assignment === "object" && !Array.isArray(assignment)
              ? (assignment as Record<string, unknown>).endpointId
              : null;
          if (typeof endpointId === "string" && endpointId.length > 0) return endpointId;
          /**
           * Run 100 addendum 19 (item 8c): the in-process binding answered nothing, so fall back to the
           * durable assignment the operator configured. Logged once per process - the fallback is a
           * repaired dependency, and a silent one would hide the next regression in this wiring.
           */
          const persisted = readPersistedControllerEndpointId({
            runtimeStateRoot: options.runtimeStateRoot,
            scopeId: options.scopeId,
          });
          if (persisted) {
            if (!persistedControllerFallbackLogged) {
              persistedControllerFallbackLogged = true;
              console.error(
                `[run153] auto-replay judge resolved from the durable controller assignment:${persisted}`,
              );
            }
            return persisted;
          }
          return null;
        },
        executor: async ({ capture, candidates, reservationId, signal, dispatchRoundId }) => {
          const sourceCapture = (await operations.readLocalRouteCapture({
            requestId: capture.captureRef,
          })) as Record<string, unknown> | null;
          if (sourceCapture && typeof sourceCapture.scope === "string" && sourceCapture.scope) {
            lastReplayCaptureScope = sourceCapture.scope;
          }
          if (!sourceCapture || typeof sourceCapture !== "object") {
            return {
              terminal: false,
              branches: [],
              failureDetail: `durable capture ${capture.captureRef} is unavailable through the operations boundary`,
            };
          }
          const sourceOutput = extractSourceOutputText(sourceCapture);
          const taskText = extractTaskInstructionText(sourceCapture);
          // The replay endpoint requires semantic evaluation criteria and the
          // routing-shadow scorer scores required terms. The source trial is graded
          // on the recorded source output, so criteria must come from branch-shared
          // task evidence while it exists: deriving them from the graded output
          // would make the source satisfy its own criterion and no counterfactual
          // could ever win. Unusable evidence defers the capture with a receipt
          // instead of inventing a criterion.
          const derivedCriteria = deriveAutomaticReplayCriteria({ taskText, sourceOutput });
          if (!derivedCriteria) {
            const responseShape =
              sourceCapture.response && typeof sourceCapture.response === "object"
                ? Object.entries(sourceCapture.response as Record<string, unknown>)
                    .slice(0, 6)
                    .map(
                      ([key, value]) => `${key}:${Array.isArray(value) ? "array" : typeof value}`,
                    )
                    .join(",")
                : "none";
            return {
              terminal: false,
              branches: [],
              failureDetail: `recorded output of ${capture.captureRef} cannot support semantic evaluation criteria (response ${responseShape}, hasResponseText ${typeof sourceCapture.responseText === "string"})`,
            };
          }
          const replayDeadlineMs = resolveAutoReplayDeadlineMs(candidates.length, {
            captureBytes: Buffer.byteLength(JSON.stringify(sourceCapture)),
            // Run 98 addendum 34 S5 residual: the per-capture budget is execution policy, so the operator
            // sizes it for the traffic actually being served (the live failure was 720 s budgets against
            // 2-4 minute provider calls).
            perCandidateMs: resolveAutoReplayDeadlinePerCandidateMs(process.env),
            maxMs: resolveAutoReplayDeadlineMaxMs(process.env),
          });
          const replayRequestBody = JSON.stringify({
            requestId: capture.captureRef,
            // RC04 L3: retry identity is the capture plus the frozen policy and
            // candidate contract, never the per-attempt ledger reservation. A
            // reservation-scoped key created a new durable replay job (and a new
            // set of provider dispatches) on every retry while the previous job
            // was orphaned mid-dispatch.
            idempotencyKey: buildAutoReplayIdempotencyKey({
              captureRef: capture.captureRef,
              policySetDigest: policySet.policySetDigest,
              ...(dispatchRoundId ? { dispatchRoundId } : {}),
              candidateEndpointIds: candidates,
              // S12: the key covers the job contract its budget mints, so a contract revision cannot collide
              // with a job created under the previous one.
              providerCallBudget: resolveReplayProviderCallBudget(candidates.length),
            }),
            candidateEndpointIds: candidates,
            evaluationCriteria: derivedCriteria.criteria,
            budget: {
              maxCandidates: candidates.length,
              // Run 100 addendum `replay-dispatch-lifecycle.addendum-04` S11: one call per candidate left no
              // room for an interrupted arm to be re-driven, so a re-claimed job answered `replay provider
              // call budget is exhausted` and the capture was refused. The bounded allowance below covers one
              // retry per candidate and still fails closed on a job that keeps retrying.
              maxProviderCalls: resolveReplayProviderCallBudget(candidates.length),
              maxCostMicros: 1_000_000,
              maxBytes: 8_388_608,
              // RC16 (W3): the dispatches are serialized, so the deadline scales with
              // the candidate count instead of racing a flat two-minute clock.
              // Run 99 R33: multi-megabyte coding-agent prompts need a larger replay budget,
              // otherwise the durable job expires mid-dispatch (observed live: 74-164 s per
              // provider call for a 2.5 MiB prompt with a flat 120 s per-candidate deadline).
              deadlineMs: replayDeadlineMs,
            },
          });
          // Run 99 R33: a durable replay job that another dispatcher already holds is not a
          // failure — the 409 `replay job is already leased` means the very idempotency this loop
          // depends on is working. Wait the hold out inside the capture's own deadline and take the
          // terminal receipt instead of deferring (and eventually refusing) paid work.
          let lastReplayDispatchStatus: number | null = null;
          // Run 98 addendum 34 S5 residual: a thrown fetch is a transport failure, not a refusal. Its real
          // cause (undici wraps it) travels into the disposition, and the attempt is retryable inside the
          // capture's own deadline like a lease hold — the durable job is still there to be driven.
          let lastReplayDispatchDetail: string | null = null;
          const leasedDispatch = await retryLeasedReplayDispatch({
            deadlineAtMs: Date.now() + replayDeadlineMs,
            retryable: (failure) =>
              failure.status === 0 || isReplayInFlightFailure(failure.status, failure.body),
            dispatch: async () => {
              try {
                const attempt = await fetch(
                  `http://127.0.0.1:${port}/api/role-model/track-b/replay`,
                  {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: replayRequestBody,
                    /**
                     * Run 98 addendum 34 S5 residual (live 2026-09-18): the dispatch waits for the whole
                     * replay to finish, which for a multi-megabyte prompt costs 74-164 s per candidate, while
                     * undici's default headers timeout is 300 s. The live dispositions showed
                     * `replay endpoint HTTP 0: UND_ERR_HEADERS_TIMEOUT` — a legitimate long replay cut off by
                     * the client's own default, retried, and cut off again until the capture's deadline
                     * expired. The request's own deadline is the authority here, plus a bounded grace for the
                     * response to travel back.
                     */
                    signal: AbortSignal.any([
                      ...(signal ? [signal] : []),
                      AbortSignal.timeout(Math.min(replayDeadlineMs + 60_000, 1_800_000)),
                    ]),
                  },
                );
                if (attempt.ok) return { ok: true as const, value: await attempt.json() };
                const body = await attempt.text().catch(() => "");
                lastReplayDispatchStatus = attempt.status;
                lastReplayDispatchDetail = body.slice(0, 200);
                return { ok: false as const, status: attempt.status, body };
              } catch (error) {
                const cause = (error as { cause?: { code?: unknown; message?: unknown } })?.cause;
                const code =
                  typeof cause?.code === "string" && cause.code
                    ? cause.code
                    : typeof cause?.message === "string" && cause.message
                      ? cause.message.slice(0, 120)
                      : error instanceof Error
                        ? error.message
                        : "unknown transport failure";
                lastReplayDispatchStatus = 0;
                lastReplayDispatchDetail = String(code).slice(0, 200);
                return { ok: false as const, status: 0, body: lastReplayDispatchDetail };
              }
            },
          });
          if (!leasedDispatch.value) {
            return {
              terminal: false,
              branches: [],
              failureDetail: `replay endpoint HTTP ${lastReplayDispatchStatus ?? 409}: ${String(
                leasedDispatch.lastFailure ?? lastReplayDispatchDetail ?? "",
              ).slice(0, 200)}`,
            };
          }
          // The receipt is authoritative: a job that reached `awaiting_evaluation`
          // produced branches but no comparison, so it stays retryable and the ledger
          // never counts it as a replayed counterfactual.
          //
          // Run 99 R29: a large replay receipt crosses the operations boundary as an
          // externalized transfer marker; parsing the marker made `state` undefined and every
          // such capture was deferred as "durable replay state is unknown" (observed live as
          // recently as 06:26Z). Decode it from the worker durable-output store first.
          const decodedReplayReceipt = decodeExternalizedOperatorReadback({
            stateRoot: options.runtimeStateRoot,
            scopeId: options.scopeId,
            value: leasedDispatch.value,
          });
          /**
           * Run 101 addendum 26: an `awaiting_evaluation` receipt has produced its branches and now owes a
           * comparison, and the host owns the evaluation plane - so this is where the offer belongs. Measured live
           * (2026-09-28 ~06:0x): 134 replays completed and offered nothing, `evaluation.score` never moved and the
           * learner stayed parked, because the only offer site was the supervised-replay executor the queue worker
           * does not drive. A refused offer is logged, never thrown: the replay itself already succeeded.
           */
          const handoffRequest = evaluationHandoffRequestFromCommandReceipt(decodedReplayReceipt);
          /**
           * Run 101 addendum 29's diagnostic lived here: it named the decoded receipt state once per receipt, and
           * it was read on the rebuilt runtime (`[run101] replay receipt state=complete handoff=-`) before the
           * evaluation path was repaired by addenda 35, 36 and 37. The state is now carried by the planes that
           * consume it - `replay.disposition` for the outcome, the named unresolved-arm reasons for a handoff that
           * cannot read its evidence, and the evaluation queue for the offered job - so the bespoke line is
           * removed, exactly as the addendum's TODO required. The offer below is unchanged.
           */
          if (handoffRequest && lateBoundEvaluationQueue.mode !== "legacy") {
            // Run 104 R9 producer plumbing (addendum 16): record the resume entry (counterfactual packages +
            // per-arm effort comparability) before offering, like the supervised path — otherwise the evaluation
            // worker's resume is a silent no-op and the comparison never carries effortComparability.
            const evaluationJobId = `evaluation-replay-${createHash("sha256")
              .update(String(handoffRequest.replayJobId))
              .digest("hex")
              .slice(0, 20)}`;
            const arms = candidates.map((endpointId) => {
              const descriptor = endpointDescriptors().find((d) => d.endpointId === endpointId);
              return {
                endpointId,
                modelId: descriptor?.modelId ?? "",
                reasoningEffort: descriptor?.reasoningEffort ?? null,
              };
            });
            const replayArmEffortComparability = classifyReplayArmEffort({
              arms,
              sourceModelId: typeof sourceCapture.modelId === "string" ? sourceCapture.modelId : "",
              sourceReasoningEffort:
                typeof sourceCapture.reasoningEffort === "string"
                  ? sourceCapture.reasoningEffort
                  : null,
            });
            /** Run 101 addendum 27: the offer is an Effect program with a bounded retry (see the helper). */
            const offered = await offerRecordedEvaluationHandoff({
              replayJobId: String(handoffRequest.replayJobId),
              record: () => {
                const resumeStore = evaluationResumeStoreRef.current;
                if (!resumeStore) return;
                resumeStore.record({
                  schemaVersion: "role-model.supervised-replay-evaluation-resume.v1",
                  replayJobId: String(handoffRequest.replayJobId),
                  evaluationJobId,
                  requestId: capture.captureRef,
                  sourceCaptureRequestId:
                    typeof sourceCapture.requestId === "string"
                      ? sourceCapture.requestId
                      : capture.captureRef,
                  sourceEndpointId:
                    typeof sourceCapture.endpointId === "string"
                      ? sourceCapture.endpointId
                      : (capture.sourceEndpointId ?? ""),
                  sourceModelId:
                    typeof sourceCapture.modelId === "string" ? sourceCapture.modelId : "",
                  counterfactualPackages: arms.map((arm) => ({
                    endpointId: arm.endpointId,
                    modelId: arm.modelId,
                    reasoningEffort: arm.reasoningEffort,
                  })),
                  effortComparability: replayArmEffortComparability,
                  evaluationCriteria: derivedCriteria.criteria as unknown as Readonly<
                    Record<string, unknown>
                  >,
                  evaluationCriteriaDigest: createHash("sha256")
                    .update(JSON.stringify(derivedCriteria.criteria))
                    .digest("hex"),
                  scope: lastReplayCaptureScope,
                  recordedAtMs: Date.now(),
                  attempts: 0,
                  resolvedAtMs: null,
                  outcome: null,
                  lastError: null,
                });
              },
              offer: (request) => lateBoundEvaluationQueue.offer(request),
            });
            if (!offered.enqueued) {
              console.error(
                `[run101] evaluation queue offer declined:${handoffRequest.replayJobId} ${
                  offered.reason ?? "unknown"
                }`,
              );
            }
          }
          return autoReplayExecutionFromCommandReceipt(decodedReplayReceipt);
        },
      });
      queueRuntime = startReplayQueueRuntime({
        stateRoot: queueStateRoot,
        shippedRoot: options.repoRoot,
        handler: async (job) => {
          await loop.dispatchCapture(job.captureRef, job.dispatchRoundId);
        },
        onAttemptFailure: (error, job) => {
          console.error(
            `[run101] replay dispatch attempt failed:${job.captureRef} ${String(
              (error as { message?: unknown })?.message ?? error,
            ).slice(0, 200)}`,
          );
        },
      });
      if (queueRuntime.mode !== "legacy") {
        console.error(
          `[run101] replay queue plane:${queueRuntime.mode} queue:${queueRuntime.policy.queue} worker:${
            queueRuntime.worker ? "running" : "none"
          }`,
        );
      }
      /**
       * Run 101 R5: the evaluation worker runs beside the replay loop and drives
       * exactly the handoff its job names through the same resume implementation
       * the tick's sweep uses (`resumeEvaluationsRef`), which is what keeps
       * evidence writing in one place.
       */
      evaluationQueueRuntime = startEvaluationQueueRuntime({
        stateRoot: queueStateRoot,
        shippedRoot: options.repoRoot,
        handler: async (job) => {
          const resume = resumeEvaluationsRef.current;
          if (!resume) throw new Error("evaluation resume implementation is not available yet");
          const scope = job.replayJobId ? { onlyReplayJobId: job.replayJobId } : undefined;
          const result = await resume(scope);
          /**
           * Run 101 addendum 03: a scoped resume with nothing left in the store
           * (`remaining: 0`) is the handoff being already finalized - a terminal
           * no-op the worker acks. Only "nothing progressed and work remains" is a
           * retryable failure; the strict version marked an already-done handoff
           * failed after four attempts (measured live on `:3457`).
           */
          if (evaluationAttemptOutcome(result) === "retry") {
            throw new Error(
              `evaluation job ${job.groupId ?? job.replayJobId ?? "unknown"} made no progress`,
            );
          }
          /**
           * Run 101 addendum 36 (G1-b): a `no-op` is a *silent* success — the worker had nothing to resume, so
           * the row is recorded `completed` and the operator's readback counts it as evaluation throughput.
           * Measured live on `:3457` (2026-09-28): 16 of the 46 `evaluation.score` rows were exactly that, and
           * the plane's `completedRecent` could not be told apart from "comparisons were scored". The ack is now
           * named, so the two are distinguishable in the log without changing the plane's counters.
           */
          if (evaluationAttemptOutcome(result) === "no-op") {
            console.error(
              `[run101] evaluation job acked with nothing to resume:${job.groupId ?? job.replayJobId ?? "unknown"}`,
            );
          }
        },
        onAttemptFailure: (error, job) => {
          console.error(
            `[run101] evaluation attempt failed:${job.groupId ?? job.replayJobId ?? "unknown"} ${String(
              (error as { message?: unknown })?.message ?? error,
            ).slice(0, 200)}`,
          );
        },
      });
      if (evaluationQueueRuntime.mode !== "legacy") {
        console.error(
          `[run101] evaluation queue plane:${evaluationQueueRuntime.mode} worker:${
            evaluationQueueRuntime.worker ? "running" : "none"
          }`,
        );
      }
      /**
       * Run 101 R6: the learner plane's two workers run beside the replay loop.
       * Derivation is scoped to the job's group (so a job works on its own
       * comparison) and promotion consumes candidates the worker has not yet
       * validated, one at a time.
       */
      learnerDeriveQueueRuntime = startLearnerQueueRuntime({
        kind: "learner.derive",
        options: {
          stateRoot: queueStateRoot,
          shippedRoot: options.repoRoot,
          deriveHandler: async (job) => {
            const derive = sweepOperations.deriveLearnerCandidates;
            if (typeof derive !== "function") {
              throw new Error("learner derivation is not available");
            }
            const summary = (await derive({
              limit: 1,
              onlyGroupIds: [job.groupId],
              /**
               * Run 101 R6: the second hop. A derivation that persisted a
               * candidate is what feeds `learner.promote`, so the chain
               * continues here rather than waiting for the consume sweep to
               * notice. A refused offer is logged, not thrown - the candidate is
               * already durable.
               */
              onDerivedCandidate: (candidateId: string, groupId: string) => {
                if (lateBoundLearnerQueues.promote.mode === "legacy") return;
                void lateBoundLearnerQueues.promote
                  .offer({ candidateId, groupId })
                  .then((offered) => {
                    if (!offered.enqueued) {
                      console.error(
                        `[run101] learner promote offer declined:${candidateId} ${
                          offered.reason ?? "unknown"
                        }`,
                      );
                    }
                  })
                  .catch((error: unknown) => {
                    console.error(
                      `[run101] learner promote offer failed:${candidateId} ${String(
                        (error as { message?: unknown })?.message ?? error,
                      ).slice(0, 160)}`,
                    );
                  });
              },
            })) as { derived?: number; examined?: number; refused?: number };
            // No examination means the group is gone (or no longer learnable);
            // a named skip is a retry, not a silent success.
            if (!summary || (summary.examined ?? 0) === 0) {
              throw new Error(`no learnable comparison for ${job.groupId}`);
            }
          },
          onDeriveFailure: (error, job) => {
            console.error(
              `[run101] learner derive attempt failed:${job.groupId} ${String(
                (error as { message?: unknown })?.message ?? error,
              ).slice(0, 200)}`,
            );
          },
        },
      });
      learnerPromoteQueueRuntime = startLearnerQueueRuntime({
        kind: "learner.promote",
        options: {
          stateRoot: queueStateRoot,
          shippedRoot: options.repoRoot,
          promoteHandler: async (job) => {
            const consume = sweepOperations.learnFromUnconsumedCandidates;
            if (typeof consume !== "function") {
              throw new Error("learner promotion is not available");
            }
            /**
             * Run 101 addendum 44: scoped to this job's candidate - the sweep ignores `limit` and walks
             * its own page, so without `candidateId` a per-candidate job could consume another
             * candidate's work. The outcome is classified rather than thrown blindly, so the reason names
             * what is true ("no finalized comparison was available") instead of claiming a validation
             * verdict the sweep never reached.
             */
            const result = (await consume({
              limit: 1,
              candidateId: job.candidateId,
            })) as { consumed?: number } | null;
            const outcome = classifyLearnerPromotionResult({
              candidateId: job.candidateId,
              result,
            });
            if (outcome.kind === "not_validatable") throw new Error(outcome.reason);
          },
          onPromoteFailure: (error, job) => {
            console.error(
              `[run101] learner promote attempt failed:${job.candidateId} ${String(
                (error as { message?: unknown })?.message ?? error,
              ).slice(0, 200)}`,
            );
          },
        },
      });
      return loop;
    };
    const postObservationHandler =
      (runtime: Awaited<ReturnType<typeof createProductionExtensionRuntime>>) =>
      (observation: Parameters<typeof runTrackBPostObservation>[1]) => {
        const processingInput = {
          scope: options.scopeId,
          channel: packagedProfile?.channel ?? "development",
          authorizationEpoch: 1,
          // R3: counterfactual candidates come from the running registry, not from
          // the capture's frozen decision snapshot.
          // Run 108 R2: the pool is NOT sliced here. The arm bound applies inside
          // selectTrackBCounterfactualArms AFTER the served-route and judge exclusions; a pool-level slice
          // double-counts those exclusions and made 5 endpoints behave like 3 (measured live: every job
          // 1-arm / 2-case). The bound itself travels on the work item as maxCounterfactualArms below.
          configuredCandidateEndpointIds: resolveReplayCandidatePool(configuredEndpointIdsRef.current),
          // Run 98 R4: durable advisory observations (state distribution + influence rate).
          advisoryObservationLedgerPath: path.join(
            options.runtimeStateRoot,
            options.scopeId,
            "track-b",
            "advisory-observations.json",
          ),
          /**
           * Addendum 58 §18: the post-observation pipeline resolves externalized extension answers (the
           * comparison readback, the reference attestation) from the worker's durable-output store, and that
           * needs the state root the runtime was launched with.
           */
          contractStateRoot: options.runtimeStateRoot,
          ...(packagedReleaseId
            ? {
                expectedReleaseId: resolvePostObservationReleaseId({
                  packagedReleaseId,
                  correlationReleaseId:
                    observation.run88Correlation && typeof observation.run88Correlation === "object"
                      ? (observation.run88Correlation as Record<string, unknown>).releaseId
                      : undefined,
                }),
                run88Correlation: observation.run88Correlation as Record<string, unknown>,
              }
            : {}),
          // Run 99 close-out (addendum 21 §4 S33): the judge presentation order is part of the
          // comparability key, so the comparison records the policy it was produced under.
          judgeOrderPolicy:
            readLearningPolicyFile({
              repoRoot: options.repoRoot,
              stateRoot: resolveLearningPolicyStateRoot({
                runtimeStateRoot: options.runtimeStateRoot,
                scopeId: options.scopeId,
              }),
              channel: packagedProfile?.channel ?? "development",
              scopeId: options.scopeId,
            })?.effective.judgeOrderPolicy ?? null,
          // Run 108 R2: the counterfactual arm bound is a versioned-policy value (activation-policy
          // maxCounterfactualArms, 1..8); it travels on the work item so the sidecar consumer
          // (track-b-runtime.ts:11903-11908) uses the operator's bound instead of the environment default.
          maxCounterfactualArms:
            readLearningPolicyFile({
              repoRoot: options.repoRoot,
              stateRoot: resolveLearningPolicyStateRoot({
                runtimeStateRoot: options.runtimeStateRoot,
                scopeId: options.scopeId,
              }),
              channel: packagedProfile?.channel ?? "development",
              scopeId: options.scopeId,
            })?.effective.maxCounterfactualArms ?? null,
          /**
           * Run 100 R1 (live finding, clean verification window): the routing-shadow path planned its
           * arms without consulting the judge, so a capture whose configured candidates include the
           * controller endpoint created a durable job with the judge among its cases and
           * `evaluation-core` refused it (`judge_candidate_overlap`, capture `req-26a7d08a-034e-424a`,
           * no job row). The replay path already resolves the judge per tick for exactly this reason;
           * the post-observation path now resolves it per observation and excludes it from the arms.
           */
          resolveJudgeEndpointId: async () => {
            const readControllerAssignment = (
              options as { readControllerAssignment?: () => Promise<unknown> }
            ).readControllerAssignment;
            const assignment = await Promise.resolve(readControllerAssignment?.()).catch(
              () => null,
            );
            const endpointId =
              assignment && typeof assignment === "object" && !Array.isArray(assignment)
                ? (assignment as Record<string, unknown>).endpointId
                : null;
            if (typeof endpointId === "string" && endpointId.length > 0) return endpointId;
            /**
             * Run 100 addendum 19 (item 8c): the same durable fallback the auto-replay tick uses. A judge
             * that resolves to nothing here is the measured cause of the judge being planned as an arm and
             * of the tick's `judge_candidate_overlap` guard never firing.
             */
            return readPersistedControllerEndpointId({
              runtimeStateRoot: options.runtimeStateRoot,
              scopeId: options.scopeId,
            });
          },
        } as const;
        const operations = postObservationOperations;
        return operations
          ? runTrackBPostObservationWithContribution(
              runtime,
              observation,
              processingInput,
              (aggregate) => operations.recordContributionAggregate(aggregate),
            )
          : runTrackBPostObservation(runtime, observation, processingInput);
      };
    const drainPostObservationOutbox = async (
      runtime: Awaited<ReturnType<typeof createProductionExtensionRuntime>>,
    ) => postObservationOutbox.drain(postObservationHandler(runtime));

    // Run 98 addendum 39 S1: routing must not depend on replays. The durable outbox
    // owns delivery, so a live request only enqueues and asks for a drain. Awaiting
    // the drain inside the request made the client pay for the whole backlog and for
    // slow extension work (measured 75-100 s wall against a 2-3 s upstream call).
    // Delivery is single-flight and background; the periodic kick started with the
    // extension runtime drains a backlog even when no further request arrives.
    const postObservationDrain = createSingleFlightBackgroundDrain<
      Awaited<ReturnType<typeof createProductionExtensionRuntime>>
    >({
      drain: (runtime) => drainPostObservationOutbox(runtime),
      onError: (error) => {
        console.error("Track B post-observation drain failed", error);
      },
    });
    const schedulePostObservationDrain = (
      runtime: Awaited<ReturnType<typeof createProductionExtensionRuntime>> | null | undefined,
    ): void => {
      postObservationDrain.schedule(runtime);
    };
    const createBackend = async (
      trackBOperationsEndpoint?: string,
      trackBOperationsToken?: string,
      runStartupSQLiteMaintenance = true,
    ) => {
      postObservationOperations = trackBOperationsEndpoint
        ? createTrackBOperations({
            statePath: path.join(
              options.runtimeStateRoot,
              options.scopeId,
              "track-b-production-bridge.json",
            ),
            catalog: [],
            runtimeChannel: packagedProfile?.channel ?? "development",
            scope: options.scopeId,
            authorizationEpoch: 1,
            operationsEndpoint: trackBOperationsEndpoint,
            operationsToken: trackBOperationsToken,
            contractStateRoot: options.runtimeStateRoot,
          })
        : null;
      activeLearningSummaryReader = postObservationOperations
        ? (() => {
            const reader = postObservationOperations;
            return () => reader.readLearningSummary();
          })()
        : null;
      const operatorOperations = postObservationOperations;
      const created = await createRuntimeBridgeBackend({
        fixtureRoot: resolveCliFixtureRoot(options.repoRoot, args.values["fixture-root"]),
        repoRoot: options.repoRoot,
        runtimeStateRoot: options.runtimeStateRoot,
        scopeId: options.scopeId,
        runtimeChannel: packagedProfile?.channel ?? "development",
        ...(operatorAuthToken ? { operatorAuthToken } : {}),
        ...(run88StageIdentity ? { run88StageIdentity } : {}),
        unifiedRuntimeConfigPath: options.unifiedRuntimeConfigPath,
        ...(trackBOperationsEndpoint ? { trackBOperationsEndpoint } : {}),
        ...(trackBOperationsToken ? { trackBOperationsToken } : {}),
        trackBExtensionHealth: () => {
          const runtime = extensionRuntimeRef.current;
          if (!runtime) {
            return {
              host: { extensions: [] as const },
              supervisor: {},
            };
          }
          const health = runtime.health();
          return {
            host: health.host as { readonly extensions?: readonly string[] },
            supervisor: health.supervisor,
          };
        },
        trackBExtensionRuntime: () => extensionRuntimeRef.current,
        trackBQaExtensionCatalog: () =>
          qaExtensions.map((extension) => ({
            id: extension.descriptor.id,
            name: extension.descriptor.id,
            description: "Explicit test-only packaged-runtime extension.",
            routingDependency: false,
            testOnly: true,
            protocolVersion: extension.descriptor.protocolVersion,
            capabilities: extension.descriptor.capabilities,
            ...(qaStartupReceipts.has(extension.descriptor.id)
              ? { qaStartupReceipt: qaStartupReceipts.get(extension.descriptor.id) }
              : {}),
          })),
        trackBPostObservationReceipts: () => postObservationOutbox.read(),
        readTrackBPostObservationReceipt: (requestId) =>
          postObservationOutbox.readReceipt(requestId),
        readTrackBExtensionReadback: async (body) => {
          const requestId = String(body.requestId ?? "").trim();
          if (!requestId) throw new Error("Track B extension readback requestId is required");
          const runtime = extensionRuntimeRef.current;
          if (!runtime) throw new Error("Track B extension runtime is unavailable");
          const receipt = await postObservationOutbox.drainUntilReceipt(
            requestId,
            postObservationHandler(runtime),
          );
          if (!receipt) throw new Error(`Track B observation receipt not found: ${requestId}`);
          const result = receipt.result as Record<string, unknown>;
          const closure = result.extensionClosure as TrackBExtensionClosure | undefined;
          if (!closure)
            throw new Error(`Track B observation has no extension closure: ${requestId}`);
          return verifyTrackBExtensionClosureAfterRestart(runtime, closure, {
            channel: packagedProfile?.channel ?? "development",
            scope: options.scopeId,
            authorizationEpoch: 1,
            readDurableEvidence: async ({ durableLocator, durableOutputId }) =>
              runtime.invoke("artifact-store", {
                requestId: `${requestId}:readback:evidence:${durableOutputId}`,
                protocolVersion: "1.1.0",
                channel: packagedProfile?.channel ?? "development",
                scope: options.scopeId,
                authorizationEpoch: 1,
                capability: "artifact:read",
                payload: { durableLocator, durableOutputId },
              }),
          });
        },
        runTrackBSupervisedReplay: async (body) => {
          const requestId = typeof body.requestId === "string" ? body.requestId.trim() : "";
          const idempotencyKey =
            typeof body.idempotencyKey === "string" ? body.idempotencyKey.trim() : "";
          const candidateEndpointIds = Array.isArray(body.candidateEndpointIds)
            ? [
                ...new Set(
                  body.candidateEndpointIds.filter(
                    (value): value is string =>
                      typeof value === "string" && value.trim().length > 0,
                  ),
                ),
              ]
            : [];
          if (!requestId || !idempotencyKey || candidateEndpointIds.length === 0) {
            throw new Error(
              "supervised replay requires requestId, idempotencyKey, and candidateEndpointIds",
            );
          }
          if (candidateEndpointIds.length > 6) {
            throw new Error("supervised replay candidate count exceeds the host bound");
          }
          const budget = body.budget;
          if (
            !budget ||
            typeof budget !== "object" ||
            Array.isArray(budget) ||
            !["maxCandidates", "maxProviderCalls", "maxCostMicros", "maxBytes", "deadlineMs"].every(
              (key) =>
                Number.isSafeInteger((budget as Record<string, unknown>)[key]) &&
                Number((budget as Record<string, unknown>)[key]) > 0,
            )
          ) {
            throw new Error("supervised replay requires a complete positive integer budget");
          }
          if (
            Number((budget as Record<string, unknown>).maxCandidates) <
              candidateEndpointIds.length ||
            Number((budget as Record<string, unknown>).maxProviderCalls) <
              candidateEndpointIds.length
          ) {
            throw new Error("supervised replay budget cannot cover every requested candidate");
          }
          const replayBudget = budget as Record<string, unknown>;
          const replayBudgetReservation = resolveReplayCandidateBudgetReservation({
            budget: replayBudget,
            candidateCount: candidateEndpointIds.length,
          });
          const runtime = extensionRuntimeRef.current;
          const operations = currentPostObservationOperations();
          if (!runtime || !operations) throw new Error("supervised replay runtime is not ready");
          const capture = await operations.readLocalRouteCapture({ requestId });
          if (!capture || typeof capture !== "object" || Array.isArray(capture)) {
            throw new Error(`durable route capture is unavailable for replay request ${requestId}`);
          }
          const sourceCapture = capture as Record<string, unknown>;
          const sourceReplay =
            sourceCapture.replaySource &&
            typeof sourceCapture.replaySource === "object" &&
            !Array.isArray(sourceCapture.replaySource)
              ? (sourceCapture.replaySource as Record<string, unknown>)
              : null;
          const originallyEligibleEndpointIds =
            sourceReplay && Array.isArray(sourceReplay.eligibleEndpointIds)
              ? [
                  ...new Set(
                    sourceReplay.eligibleEndpointIds.filter(
                      (value): value is string =>
                        typeof value === "string" && value.trim().length > 0,
                    ),
                  ),
                ].sort()
              : [];
          const capturedSourceEndpointId =
            (sourceReplay && typeof sourceReplay.selectedEndpointId === "string"
              ? sourceReplay.selectedEndpointId
              : null) ??
            (sourceReplay && typeof sourceReplay.endpointId === "string"
              ? sourceReplay.endpointId
              : null);
          const sourceMessages = Array.isArray(sourceCapture.messages)
            ? sourceCapture.messages
            : [];
          // Run 98 addendum 45 J2: the judge is the configured controller, resolved here for this capture.
          // No policy write and no environment pin are involved, so a controller change is enough.
          const evalJudgeEndpointId = (
            await resolveControllerJudge(
              created,
              readLearningPolicyFile({
                repoRoot: options.repoRoot,
                stateRoot: resolveLearningPolicyStateRoot({
                  runtimeStateRoot: options.runtimeStateRoot,
                  scopeId: options.scopeId,
                }),
                channel: packagedProfile?.channel ?? "development",
                scopeId: options.scopeId,
              }),
            )
          ).endpointId;
          /**
           * Run 104 R1: the arm must be able to serve the capture's request, so the planner reads the
           * capture's own recorded decision (inferred and marked when the capture predates the field)
           * and the configured endpoints' declarations, and applies the router's own rule.
           */
          const replayRequestRequirements = readReplayRequestRequirements(sourceCapture);
          const replayEndpointProfiles = created.effectiveRegistry.endpoints.map((endpoint) => ({
            endpointId: endpoint.identity.endpoint_id,
            capabilities: endpoint.declared.capabilities,
            modalities: endpoint.declared.modalities,
          }));
          const replayCandidateRejections: ReplayCandidateRejection[] = [];
          const distinctReplayCandidates = selectReplayCandidates({
            configuredEndpointIds: candidateEndpointIds,
            sourceEndpointId: capturedSourceEndpointId,
            // Run 98 addendum 33 S3: rotate the counterfactual per request so the comparison graph gains
            // edges across captures rather than repeating one pair (the live store's 465-of-465 star).
            rotationKey: requestId,
            // Run 105 bug 3: the configured judge may also be a candidate endpoint, so it is NOT excluded
            // here. When a challenger equals the judge, the evaluation de-conflicts (dedupeJudgeAgainstPair
            // picks an alternative judge), so the controller endpoint can still be admitted as a challenger.
            requirements: replayRequestRequirements,
            endpointProfiles: replayEndpointProfiles,
            onRejected: (rejection) => replayCandidateRejections.push(rejection),
          });
          if (process.env.ROLE_MODEL_FOCUS_DIAG) {
            console.error(
              `[supervised-cand] source=${capturedSourceEndpointId ? capturedSourceEndpointId.split(".").pop() : null} judge=${evalJudgeEndpointId ? evalJudgeEndpointId.split(".").pop() : null} candidates=${candidateEndpointIds.map((c) => c.split(".").pop()).join(",")} reqMod=${JSON.stringify(replayRequestRequirements.requiredModalities)} reqCap=${JSON.stringify(replayRequestRequirements.requiredCapabilities)} profiles=${replayEndpointProfiles
                .map(
                  (p) =>
                    `${p.endpointId.split(".").pop()}:[${(p.modalities || []).join(",")}][${(p.capabilities || []).join(",")}]`,
                )
                .join(
                  "|",
                )} selected=${distinctReplayCandidates.map((c) => c.split(".").pop()).join(",")} rejected=${replayCandidateRejections
                .map((r) => `${r.endpointId.split(".").pop()}:${r.code}`)
                .join(",")}`,
            );
          }
          const replayPolicySet = buildReplayPolicySet();
          const replayLedger = createReplayLedger({
            filePath: path.join(
              options.runtimeStateRoot,
              options.scopeId,
              "track-b-replay-ledger.json",
            ),
            limits: resolveChannelScopedReplayLedgerLimits({
              repoRoot: options.repoRoot,
              runtimeStateRoot: options.runtimeStateRoot,
              scopeId: options.scopeId,
              channel: packagedProfile?.channel ?? "development",
            }),
          });
          const replayLedgerStatus = replayLedger.status();
          // Run 108 A5.1: the REPLAY chain's admission stage - the decision and its counter
          // run under one sync stage span (withStageSpan is sync-only).
          const admission = withStageSpan("replay.admission", { pass: "replay" }, () => {
            const decided = decideReplayAdmission({
              channelReplayEnabled: true,
              captureAvailable: true,
              scopeAuthorized: true,
              authorizationEpochValid: true,
              retentionReplayable: true,
              privacyReplayable: true,
              distinctCandidateCount: distinctReplayCandidates.length,
              /**
               * Run 100 addendum `00-requirements.benchmark-traffic-exclusion.addendum-01`: the on-demand
               * replay path refuses benchmark captures by name for the same reason the producer does.
               */
              sourceIsBenchmark: isBenchmarkReplaySourceRef(requestId),
              /**
               * Run 100 addendum 16 item 3 / 8a: the recovered capture carries the class its own durable
               * evidence proved, so the on-demand path refuses a marker-echo probe for the same reason the
               * automatic producer does rather than re-deriving it from the transcript.
               */
              sourceIsSyntheticProbe: isSyntheticProbeSourceClass(
                (sourceCapture.replayEvidenceClass as Record<string, unknown> | undefined)?.class,
              ),
              budgetAvailable: replayBudgetAvailable(replayLedgerStatus),
              alreadyProcessed: replayLedger.hasTerminalCounterfactual(
                requestId,
                replayPolicySet.policySetDigest,
              ),
              sourceIsReplayProduced:
                sourceReplay !== null && sourceReplay.parentTraceId !== undefined,
              policyIdsResolvable: resolveReplayPolicySet(replayPolicySet).ok,
              dependenciesAvailable: true,
              /**
               * Run 108: this caller is the one that plans arms, so it must say whether the judge it will exclude
               * is known. `evalJudgeEndpointId` is resolved for this capture above and is `""` when the
               * controller-assignment read fails; admitting the capture then plans arms that may contain the
               * judge, and the judge (resolved again at completion) then scores its own comparison.
               */
              judgeResolved: Boolean(evalJudgeEndpointId),
            });
            // Run 108 R7: the replay admission counter (module-scope metric, registry-scoped).
            recordReplayAdmission("replay", decided.admitted ? 1 : 0);
            return decided;
          });
          if (!admission.admitted) {
            /**
             * Run 104 R1: arms the router's rule rejected are named in the failure, so a planner that
             * ran out of candidates says which endpoints could not serve the request and why.
             */
            const rejectedDetail =
              replayCandidateRejections.length === 0
                ? ""
                : ` (rejected arms: ${replayCandidateRejections
                    .map((rejection) => `${rejection.endpointId} (${rejection.code})`)
                    .join(", ")})`;
            throw new Error(`${admission.code}: ${admission.detail}${rejectedDetail}`);
          }
          const { toolPolicy: resolvedReplayToolPolicy, reason: replayToolPolicyReason } =
            resolveReplayToolPolicy({
              hasRecordedToolResults: hasRecordedToolResults(sourceCapture),
              hasToolCalls: hasToolCalls(sourceCapture),
            });
          /**
           * Run 104 R1: the dispatch set is the requested arms minus the arms the router's own rule rejected,
           * re-checked at the dispatch boundary so a configuration change between planning and dispatch cannot
           * turn into a provider-bound 400. Rejections are recorded; the replay only fails when nothing
           * survives, instead of aborting whenever any requested arm is ineligible.
           */
          const replayDispatchPlan = planReplayDispatchArms({
            requestedEndpointIds: candidateEndpointIds,
            selectionRejections: replayCandidateRejections,
            requirements: replayRequestRequirements,
            endpointProfiles: replayEndpointProfiles,
          });
          if (replayDispatchPlan.plannedEndpointIds.length === 0) {
            throw new Error(
              `replay arm cannot serve the capture's request requirements: ${replayDispatchPlan.rejections
                .map((rejection) => `${rejection.endpointId} (${rejection.code})`)
                .join(", ")}`,
            );
          }
          const endpoints = created.effectiveRegistry.endpoints;
          /**
           * Run 104 R9: an arm whose own model is configured at the source capture's reasoning effort under a
           * different endpoint id is repointed to that variant, so the comparison does not confound capability
           * with effort. The repointed set is re-checked against the same eligibility rule before dispatch, and
           * the comparability of every surviving arm travels with the replay payload.
           */
          const configuredReplayArms = endpoints.map((endpoint) => ({
            endpointId: endpoint.identity.endpoint_id,
            modelId: endpoint.identity.model_id,
            reasoningEffort: endpoint.identity.reasoning_effort ?? null,
          }));
          const replaySourceModelId =
            typeof sourceCapture.modelId === "string" ? sourceCapture.modelId : "";
          const replaySourceReasoningEffort =
            typeof sourceCapture.reasoningEffort === "string"
              ? sourceCapture.reasoningEffort
              : null;
          const effortMatchedReplayArms = preferEffortMatchedReplayArms({
            arms: replayDispatchPlan.plannedEndpointIds.map(
              (endpointId) =>
                configuredReplayArms.find((item) => item.endpointId === endpointId) ?? {
                  endpointId,
                  modelId: "",
                  reasoningEffort: null,
                },
            ),
            configuredEndpoints: configuredReplayArms,
            sourceModelId: replaySourceModelId,
            sourceReasoningEffort: replaySourceReasoningEffort,
            sourceEndpointId:
              typeof sourceCapture.endpointId === "string" ? sourceCapture.endpointId : null,
          });
          const replayArmPlan = planReplayDispatchArms({
            requestedEndpointIds: effortMatchedReplayArms.map((arm) => arm.endpointId),
            selectionRejections: replayDispatchPlan.rejections,
            requirements: replayRequestRequirements,
            endpointProfiles: replayEndpointProfiles,
          });
          if (replayArmPlan.plannedEndpointIds.length === 0) {
            throw new Error(
              `replay arm cannot serve the capture's request requirements: ${replayArmPlan.rejections
                .map((rejection) => `${rejection.endpointId} (${rejection.code})`)
                .join(", ")}`,
            );
          }
          const candidatePackages = replayArmPlan.plannedEndpointIds.map((endpointId) => {
            const endpoint = endpoints.find((item) => item.identity.endpoint_id === endpointId);
            if (!endpoint)
              throw new Error(
                `supervised replay candidate is not a configured endpoint: ${endpointId}`,
              );
            return {
              endpointId,
              modelId: endpoint.identity.model_id,
              reasoningEffort: endpoint.identity.reasoning_effort ?? null,
              promptAdapterId: "router-host/default-v1",
              toolPolicy: resolvedReplayToolPolicy,
              toolPolicyReason: replayToolPolicyReason,
              toolPolicyDigest: replayPolicySet.tool.policyDigest,
              policySetDigest: replayPolicySet.policySetDigest,
              sourceEligibleEndpointIds: originallyEligibleEndpointIds,
              experiencePackId: "none",
              samplingProfileId: "deterministic-v1",
              ...replayBudgetReservation,
            };
          });
          const evaluationCriteria = normalizeTrackBSemanticEvaluationCriteria(
            body.evaluationCriteria,
          );
          const evaluationCriteriaDigest =
            digestTrackBSemanticEvaluationCriteria(evaluationCriteria);
          const sourceResponse =
            sourceCapture.response && typeof sourceCapture.response === "object"
              ? (sourceCapture.response as Record<string, unknown>)
              : null;
          // Observable output identity: prefer the recorded assistant text and fall
          // back to the bounded response excerpt or recorded request text when the
          // capture stored an empty assistant message. This text is the source
          // trial's independently observed result; the caller's evaluation criteria
          // come from branch-shared task evidence, never from this graded output.
          const sourceOutput = extractSourceOutputText(sourceCapture);
          const sourceEndpointId =
            typeof sourceCapture.endpointId === "string" ? sourceCapture.endpointId : "";
          const sourceModelId =
            typeof sourceCapture.modelId === "string" ? sourceCapture.modelId : "";
          if (!sourceOutput || !sourceEndpointId || !sourceModelId) {
            throw new Error(
              "supervised replay source capture lacks independently observable output identity",
            );
          }
          if (process.env.ROLE_MODEL_FOCUS_DIAG) {
            console.error(
              `[source-diag] requestId=${requestId.slice(0, 16)} endpointId=${sourceCapture.endpointId || null} sourceEndpointId=${sourceCapture.sourceEndpointId || null} capturedSource=${capturedSourceEndpointId || null} judge=${evalJudgeEndpointId || null} candidates=${candidatePackages.map((c) => c.endpointId.split(".").pop()).join(",")}`,
            );
          }
          // Run 105 bug 3: the configured judge may also be a candidate endpoint, so it is NOT excluded
          // here. Only the source is filtered; a challenger that equals the judge is de-conflicted at the
          // evaluation (dedupeJudgeAgainstPair picks an alternative judge).
          const counterfactualPackages = candidatePackages.filter(
            (candidate) => candidate.endpointId !== sourceEndpointId,
          );
          if (counterfactualPackages.length === 0) {
            throw new Error(
              "supervised replay requires an eligible counterfactual distinct from the source endpoint",
            );
          }
          /**
           * Run 104 R9: the comparability dimension the receipt has to be able to answer - was this comparison
           * effort-matched, or is capability confounded with a reasoning-effort variant?
           */
          const replayArmEffortComparability = classifyReplayArmEffort({
            arms: counterfactualPackages.map((candidate) => ({
              endpointId: candidate.endpointId,
              modelId: candidate.modelId,
              reasoningEffort: candidate.reasoningEffort ?? null,
            })),
            sourceModelId,
            sourceReasoningEffort: replaySourceReasoningEffort,
          });
          const channel = packagedProfile?.channel ?? "development";
          // Bind the replay source to the capture's own runtime scope: the durable
          // capture records the private runtime scope, which is not necessarily the
          // host's operator scope.
          const captureScope =
            typeof sourceCapture.scope === "string" && sourceCapture.scope.trim()
              ? sourceCapture.scope.trim()
              : options.scopeId;
          /**
           * Run 101 addendum 36 - the single writer for this handoff's resume entry.
           *
           * Recorded when the handoff is *offered* (`handoffEvaluation`) as well as when the completion starts
           * (`completeEvaluation`), so the window between the offer and the completion holds a resumable entry.
           * Measured live on `:3457` (2026-09-28): 19 of the 46 `evaluation.score` rows had no resume entry and
           * no Evaluation Core job, and 16 of those were recorded `completed` — the worker's `no-op`
           * classification acked them and the comparison the replay had already paid for never happened.
           * `record()` is idempotent (it returns the existing entry unchanged), so the second call is free and
           * can never overwrite a live entry.
           */
          const recordEvaluationResumeEntry = (input: {
            readonly replayJobId: string;
            readonly evaluationJobId: string;
            readonly requestId: string;
            readonly sourceCaptureRequestId: string;
            readonly scope: string | null;
          }): void => {
            if (!input.replayJobId || !input.evaluationJobId || !input.sourceCaptureRequestId)
              return;
            try {
              evaluationResumeStore.record({
                schemaVersion: "role-model.supervised-replay-evaluation-resume.v1",
                replayJobId: input.replayJobId,
                evaluationJobId: input.evaluationJobId,
                requestId: input.requestId,
                sourceCaptureRequestId: input.sourceCaptureRequestId,
                sourceEndpointId,
                sourceModelId,
                counterfactualPackages: counterfactualPackages.map((candidate) => ({
                  endpointId: candidate.endpointId,
                  modelId: candidate.modelId,
                  reasoningEffort: candidate.reasoningEffort ?? null,
                })),
                /**
                 * Run 104 R9: per-arm effort comparability against the source capture, so the validation
                 * receipt can record a confound instead of presenting it as a capability result.
                 */
                effortComparability: replayArmEffortComparability,
                evaluationCriteria: evaluationCriteria as unknown as Readonly<
                  Record<string, unknown>
                >,
                evaluationCriteriaDigest,
                // Run 98 addendum 34 S5: the durable replay job is bound to this scope, so
                // terminalizing it later needs the same value (see `onAbandoned`).
                scope: input.scope,
                recordedAtMs: Date.now(),
                attempts: 0,
                resolvedAtMs: null,
                outcome: null,
                lastError: null,
              });
            } catch (error) {
              console.error(
                `[run99] evaluation resume entry declined:${input.requestId} ${String(
                  (error as { message?: unknown })?.message ?? error,
                ).slice(0, 200)}`,
              );
            }
          };
          // R3: the frozen decision snapshot is provenance, not a filter. Captures
          // that do not record one (for example a channel that captured a single
          // eligible endpoint) still replay against the configured candidate set,
          // and the effective set is what the attestation binds.
          const effectiveEligibleEndpointIds =
            originallyEligibleEndpointIds.length > 0
              ? originallyEligibleEndpointIds
              : [
                  ...new Set([
                    ...(typeof sourceCapture.endpointId === "string" &&
                    sourceCapture.endpointId.trim()
                      ? [sourceCapture.endpointId.trim()]
                      : capturedSourceEndpointId
                        ? [capturedSourceEndpointId]
                        : []),
                    ...replayDispatchPlan.plannedEndpointIds,
                  ]),
                ].sort();
          const attestation = createReplaySourceAttestation({
            channel,
            scope: captureScope,
            authorizationEpoch: 1,
            capture: sourceCapture,
            eligibleEndpointIds: effectiveEligibleEndpointIds,
          });
          const dispatched = new Map<
            string,
            {
              readonly execution: Awaited<ReturnType<typeof created.executeChatCompletions>>;
              readonly replayRequestId: string;
            }
          >();
          const preparedBranches = new Map<
            string,
            { readonly branchRootRef: string; readonly branchRequestId: string }
          >();
          // R7/R11: the on-demand path consumes the same daily ledger as the
          // automatic producer, reserving on the first dispatch and recording every
          // candidate call so both paths share one accounting authority.
          let ledgerReservationId: string | null = null;
          // Each replay attempt gets its own prepared-branch identity: a retry inside
          // the same attempt stays idempotent, while a later attempt appends a new
          // branch instead of colliding with the previous attempt's immutable bytes.
          const replayAttemptToken = createHash("sha256")
            .update(`${requestId}:${idempotencyKey}`)
            .digest("hex")
            .slice(0, 12);
          const adapter = createProductionReplayAdapter({
            runtimeStateRoot: options.runtimeStateRoot,
            // The adapter, the attestation, and the replay job must all bind the same
            // scope: the durable capture's runtime scope.
            scopeId: captureScope,
            channel,
            scope: captureScope,
            authorizationEpoch: 1,
            dispatch: async (envelope) => {
              const candidateEndpointId = String(envelope.candidateEndpointId ?? "");
              const candidate = candidatePackages.find(
                (item) => item.endpointId === candidateEndpointId,
              );
              if (!candidate)
                throw new Error("replay dispatch candidate package is not host-authorized");
              // R13/R7: every capture this attempt writes must be attempt-scoped. Run 100 addendum
              // `replay-dispatch-lifecycle.addendum-04` S9: the identity is scoped by the dispatch envelope's
              // per-attempt nonce, not just by the job and candidate - a retry inside one attempt stays
              // idempotent, while a re-claimed job's fresh attempt (which replay-core mints a new nonce for)
              // writes new bytes under a new capture id instead of colliding with the previous attempt's
              // immutable capture (`route capture idempotency key was reused with different immutable bytes`,
              // measured live on `:3457`).
              const replayJobId =
                typeof envelope.replayJobId === "string" ? envelope.replayJobId : "";
              const replayAttemptToken = replayDispatchCaptureToken({
                replayJobId,
                candidateEndpointId,
                dispatchNonce:
                  typeof envelope.nonce === "string" && envelope.nonce ? envelope.nonce : null,
              });
              const replayRequestId = `replay-${requestId}-${replayAttemptToken}`;
              const execution = await created.executeChatCompletions(
                {
                  model: candidate.modelId,
                  // Tool linkage must survive the capture -> provider hop; recorded
                  // tool results stay reused (no tool re-execution).
                  messages: buildReplayDispatchMessages(sourceMessages) as never,
                  stream: false,
                },
                replayRequestId,
                undefined,
                { endpointId: candidateEndpointId, executionTrafficClass: "replay" },
              );
              dispatched.set(candidateEndpointId, { execution, replayRequestId });
              const observedCostUsd = execution.replayCost?.usd;
              if (
                typeof observedCostUsd !== "number" ||
                !Number.isFinite(observedCostUsd) ||
                observedCostUsd < 0
              ) {
                throw new Error("replay provider execution did not return a bounded cost receipt");
              }
              if (ledgerReservationId === null) {
                const reservation = replayLedger.reserve({
                  captureRef: requestId,
                  policySetDigest: replayPolicySet.policySetDigest,
                  candidateDispatches: counterfactualPackages.length,
                });
                if (!reservation.accepted) {
                  throw new Error(`${reservation.code}: ${reservation.detail}`);
                }
                ledgerReservationId = reservation.reservationId;
              }
              const observedResponseBytes = Buffer.byteLength(
                JSON.stringify({
                  outputText: execution.outputText,
                  contentText: execution.contentText,
                  reasoningText: execution.reasoningText,
                  toolCalls: execution.toolCalls ?? [],
                }),
                "utf8",
              );
              const recordedDispatch = replayLedger.record({
                reservationId: ledgerReservationId,
                captureRef: requestId,
                policySetDigest: replayPolicySet.policySetDigest,
                counterfactualRef: `cf:${requestId}`,
                dispatchKind: "candidate",
                candidateEndpointId,
                attempt: 1,
                costMicros: Math.ceil(observedCostUsd * 1_000_000),
                bytes: observedResponseBytes,
                outcome: "complete",
              });
              if (!recordedDispatch.accepted) {
                throw new Error(`${recordedDispatch.code}: ${recordedDispatch.detail}`);
              }
              return {
                dispatchReceiptId: `router-replay:${replayRequestId}`,
                routerDecisionId: requireReplayRouterDecisionId(execution.routingDecisionId),
                providerResultRef: `route-capture:${replayRequestId}`,
                observedCostMicros: Math.ceil(observedCostUsd * 1_000_000),
                observedResponseBytes,
              };
            },
          });
          // Run 98 R10/R15: the judge configuration and the learning-pass floors come from the
          // operator's versioned policy for this channel and scope; environment variables stay an
          // explicit local override.
          const learningPolicySnapshot = readLearningPolicyFile({
            repoRoot: options.repoRoot,
            // Run 99 R23: judge mode, promotion protocol and evidence floors come from the
            // durable operator policy state when it exists, so a UI change governs replays too.
            stateRoot: resolveLearningPolicyStateRoot({
              runtimeStateRoot: options.runtimeStateRoot,
              scopeId: options.scopeId,
            }),
            channel,
            scopeId: options.scopeId,
          });
          const result = await runSupervisedReplay({
            runtime,
            adapter,
            requestId,
            channel,
            scope: captureScope,
            authorizationEpoch: 1,
            sourceAttestation: attestation,
            idempotencyKey,
            intent: "counterfactual_route",
            evaluationCriteriaDigest,
            candidatePackages: counterfactualPackages,
            budget: structuredClone(budget) as Record<string, unknown>,
            leaseOwner: `runtime-host:${process.pid}`,
            // RC09: replay-core externalizes large job receipts; the host reads them
            // back from the worker's durable output store under the runtime scope.
            runtimeStateRoot: options.runtimeStateRoot,
            runtimeScopeId: options.scopeId,
            // R10: a tool-bearing replay can dispatch for far longer than 30 seconds
            // (a long transcript plus parallel tool calls), and a lease that expires
            // mid-dispatch makes the durable receipt look like it came from a stale
            // supervisor ("current replay job lease is required for dispatch"). Hold
            // the lease for the whole bounded replay deadline, capped at five minutes.
            leaseMs: Math.max(
              30_000,
              Math.min(Number((budget as Record<string, unknown>).deadlineMs), 300_000),
            ),
            scheduler: createReplayIntentScheduler({
              runtime,
              requestId,
              channel,
              scope: captureScope,
              authorizationEpoch: 1,
              ownerId: `runtime-host:${process.pid}`,
            }),
            prepareBranch: async (branchRequest) => {
              const candidateEndpointId = String(branchRequest.candidateEndpointId ?? "");
              const candidate = candidatePackages.find(
                (item) => item.endpointId === candidateEndpointId,
              );
              if (!candidate)
                throw new Error("replay branch preparation candidate is not host-authorized");
              const existing = preparedBranches.get(candidateEndpointId);
              if (existing) return { branchRootRef: existing.branchRootRef };
              const branchRequestId = supervisedReplayBranchCaptureRequestId({
                requestId,
                candidateEndpointId,
                phase: "prepared",
                attemptToken: replayAttemptToken,
              });
              // A candidate without a reasoning effort is captured with `none`, not `variant`:
              // the durable capture contract couples a null effort to the `none` source, and a
              // mixed pair is rejected at the capture boundary.
              const preparedEffort =
                typeof candidate.reasoningEffort === "string" && candidate.reasoningEffort
                  ? { reasoningEffort: candidate.reasoningEffort, effortSource: "variant" as const }
                  : { reasoningEffort: null, effortSource: "none" as const };
              const branch = (await operations.recordLocalRouteCapture({
                requestId: branchRequestId,
                routingDecisionId: String(branchRequest.sourceDecisionId),
                endpointId: candidateEndpointId,
                modelId: candidate.modelId,
                ...preparedEffort,
                messages: [],
                toolExecutions: [],
                branchKind: "replay",
                branchPhase: "prepared",
                branchOfRootArtifactId: sourceCapture.rootArtifactId,
              })) as Record<string, unknown>;
              if (typeof branch.rootArtifactId !== "string" || !branch.rootArtifactId) {
                throw new Error(
                  "operations boundary did not persist a prepared replay branch root",
                );
              }
              preparedBranches.set(candidateEndpointId, {
                branchRootRef: branch.rootArtifactId,
                branchRequestId,
              });
              return { branchRootRef: branch.rootArtifactId, branchRequestId };
            },
            appendBranch: async (branchRequest) => {
              const candidateEndpointId = String(branchRequest.candidateEndpointId ?? "");
              const failure =
                branchRequest.failure &&
                typeof branchRequest.failure === "object" &&
                !Array.isArray(branchRequest.failure)
                  ? (branchRequest.failure as Record<string, unknown>)
                  : null;
              if (failure) {
                // R10/AC-R10-05: a failed provider dispatch is durable graph
                // evidence before the replay transitions or hands off.
                const candidate = candidatePackages.find(
                  (item) => item.endpointId === candidateEndpointId,
                );
                if (!candidate)
                  throw new Error("replay failure branch candidate is not host-authorized");
                const preparedBranchRootRef = String(branchRequest.preparedBranchRootRef ?? "");
                if (!preparedBranchRootRef)
                  throw new Error(
                    "durable replay failure branch append requires its prepared branch root",
                  );
                /**
                 * Run 100 addendum 24 §1 residual: the failure bytes are not stable across a recovery
                 * re-append (the message can carry a fresh diagnostic), so the id also carries a digest of
                 * exactly the fields that go into the capture. Identical retries keep one key; changed bytes
                 * get their own instead of being refused as a reuse.
                 */
                const failureContentTag = createHash("sha256")
                  .update(
                    JSON.stringify({
                      errorClass: String(failure.code ?? "router_dispatch_error"),
                      message: String(failure.message ?? "replay provider dispatch failed").slice(
                        0,
                        512,
                      ),
                      preparedBranchRootRef,
                      endpointId: candidateEndpointId,
                      modelId: candidate.modelId ?? null,
                      reasoningEffort: candidate.reasoningEffort ?? null,
                    }),
                  )
                  .digest("hex")
                  .slice(0, 16);
                const failureRequestId = supervisedReplayBranchCaptureRequestId({
                  requestId,
                  candidateEndpointId,
                  phase: "failure",
                  attemptToken: replayAttemptToken,
                  contentTag: failureContentTag,
                });
                const failureEffort =
                  typeof candidate.reasoningEffort === "string" && candidate.reasoningEffort
                    ? {
                        reasoningEffort: candidate.reasoningEffort,
                        effortSource: "variant" as const,
                      }
                    : { reasoningEffort: null, effortSource: "none" as const };
                const failureBranch = (await operations.recordLocalRouteCapture({
                  requestId: failureRequestId,
                  routingDecisionId: String(branchRequest.sourceDecisionId),
                  endpointId: candidateEndpointId,
                  modelId: candidate.modelId,
                  ...failureEffort,
                  messages: [],
                  toolExecutions: [],
                  branchKind: "replay",
                  branchOfRootArtifactId: preparedBranchRootRef,
                  failure: {
                    errorClass: String(failure.code ?? "router_dispatch_error"),
                    statusCode: null,
                    message: String(failure.message ?? "replay provider dispatch failed"),
                  },
                })) as Record<string, unknown>;
                if (
                  typeof failureBranch.rootArtifactId !== "string" ||
                  !failureBranch.rootArtifactId
                ) {
                  throw new Error(
                    "operations boundary did not return a durable replay failure branch root",
                  );
                }
                return {
                  branchRootRef: failureBranch.rootArtifactId,
                  branchRequestId: failureRequestId,
                };
              }
              let dispatch = dispatched.get(candidateEndpointId);
              if (!dispatch) {
                /**
                 * Run 98 addendum 58 §23 (live v316, 08:33Z): a resumed attempt re-presents Replay Core's
                 * `append_recovery` request, whose carrier is the receipt of a provider dispatch that
                 * already ran — so this process holds no in-process dispatch for it and the append used to
                 * refuse (`durable replay branch append has no host dispatch receipt`), stranding the
                 * capture with the provider work already paid for. The recovery request names the dispatch
                 * receipt (`providerResultRef` = the replay's own route capture), and that capture is the
                 * durable record of the provider execution, so the branch is rebuilt from it.
                 *
                 * Run 104 Phase 3 (R8): the rebuild lives in `resolveResumedReplayAppendDispatch` so the
                 * projection the boundary really answers for can be tested directly. Reading only the
                 * write-side `outputText` (the projection publishes `responseText`) made the recovered
                 * execution `undefined` on every pass, so this leg refused captures that were present and
                 * readable and spent the capture's deferral budget instead of finishing paid work.
                 */
                const recoveredReplayRequestId = replayRequestIdFromProviderResultRef(
                  (branchRequest as Record<string, unknown>).providerResultRef,
                );
                const recoveredCapture = recoveredReplayRequestId
                  ? ((await operations.readLocalRouteCapture({
                      requestId: recoveredReplayRequestId,
                    })) as Record<string, unknown> | null)
                  : null;
                const recovered = resolveResumedReplayAppendDispatch({
                  branchRequest,
                  capture: recoveredCapture,
                });
                dispatch = {
                  execution: recovered.execution as unknown as Awaited<
                    ReturnType<typeof created.executeChatCompletions>
                  >,
                  replayRequestId: recovered.replayRequestId,
                };
                dispatched.set(candidateEndpointId, dispatch);
              }
              if (!dispatch)
                throw new Error("durable replay branch append has no host dispatch receipt");
              const preparedBranchRootRef = String(branchRequest.preparedBranchRootRef ?? "");
              if (!preparedBranchRootRef)
                throw new Error("durable replay result append requires its prepared branch root");
              const branchRequestId = `${dispatch.replayRequestId}-branch`;
              const resultCandidateReasoningEffort =
                candidatePackages.find((item) => item.endpointId === candidateEndpointId)
                  ?.reasoningEffort ?? null;
              const resultEffort =
                typeof resultCandidateReasoningEffort === "string" && resultCandidateReasoningEffort
                  ? {
                      reasoningEffort: resultCandidateReasoningEffort,
                      effortSource: "variant" as const,
                    }
                  : { reasoningEffort: null, effortSource: "none" as const };
              const branch = (await operations.recordLocalRouteCapture({
                requestId: branchRequestId,
                routingDecisionId: requireReplayRouterDecisionId(
                  dispatch.execution.routingDecisionId,
                ),
                endpointId: candidateEndpointId,
                modelId: dispatch.execution.model,
                ...resultEffort,
                // The private sidecar hydrates sourceCapture.rootArtifactId and
                // reuses its prefix occurrences. Sending the transcript here
                // would create a copied branch and violate replay isolation.
                messages: [],
                outputText: dispatch.execution.outputText,
                providerExecutions: [
                  {
                    attemptId: `replay:${dispatch.replayRequestId}`,
                    providerId: dispatch.execution.vendorId ?? "router-replay",
                    adapterFamily: dispatch.execution.adapterFamily,
                    statusCode: 200,
                  },
                ],
                toolExecutions: [],
                branchKind: "replay",
                branchOfRootArtifactId: preparedBranchRootRef,
              })) as Record<string, unknown>;
              if (typeof branch.rootArtifactId !== "string" || !branch.rootArtifactId) {
                throw new Error("operations boundary did not return a durable replay branch root");
              }
              return { branchRootRef: branch.rootArtifactId, branchRequestId };
            },
            handoffEvaluation: async ({ replayJobId }) => {
              const evaluationJobId = `evaluation-replay-${createHash("sha256").update(String(replayJobId)).digest("hex").slice(0, 20)}`;
              /**
               * Run 101 addendum 36 (measured live on `:3457`, 2026-09-28).
               *
               * The evaluation queue row was offered *here* while the resume entry was only written later, inside
               * `completeEvaluation`. An attempt interrupted in that window left a queue row whose scoped resume
               * store held nothing at all: the worker's `no-op` classification acks it, so the row is recorded
               * `completed` and the comparison the replay already paid for never happens. 19 of the 46 live
               * `evaluation.score` rows had no resume entry and no Evaluation Core job, and 16 of them were
               * recorded `completed` — i.e. silently dropped rather than failed.
               *
               * The entry is now recorded the moment the handoff is offered, so the window holds a resumable
               * entry instead of nothing. `record()` is idempotent (it returns the existing entry unchanged), so
               * the later `completeEvaluation` write is a no-op.
               */
              // Run 101 R5: the handoff is where the replay plane learns the
              // unit of evaluation work, so it is where the job is offered.
              // `legacy` keeps this a no-op, and a refused offer is logged
              // rather than thrown: the handoff itself already succeeded.
              if (lateBoundEvaluationQueue.mode !== "legacy") {
                /**
                 * Run 101 addendum 36: `offerRecordedEvaluationHandoff` writes the resume entry *before* offering
                 * the queue row (see the helper), so the window between the offer and the completion holds a
                 * resumable entry instead of nothing. The offer itself is still the addendum-27 Effect program.
                 */
                const offered = await offerRecordedEvaluationHandoff({
                  replayJobId: String(replayJobId),
                  record: () =>
                    recordEvaluationResumeEntry({
                      replayJobId: String(replayJobId),
                      evaluationJobId,
                      requestId,
                      sourceCaptureRequestId:
                        typeof sourceCapture.requestId === "string" ? sourceCapture.requestId : "",
                      scope: captureScope,
                    }),
                  offer: (request) => lateBoundEvaluationQueue.offer(request),
                });
                if (!offered.enqueued) {
                  console.error(
                    `[run101] evaluation queue offer declined:${replayJobId} ${offered.reason ?? "unknown"}`,
                  );
                }
              }
              return { evaluationJobId };
            },
            /**
             * Run 101 addendum 36: one writer for the resume entry, called both when the handoff is offered (so
             * the window between offer and completion is resumable) and when the completion starts (so entries
             * written before this repair are still recorded). `record()` is idempotent and keeps the first write,
             * so calling it twice costs nothing and cannot overwrite a live entry.
             */
            completeEvaluation: (() => {
              // Run 98 addendum 45 J2: the judge is resolved from the controller assignment when the
              // comparison is completed, so switching the controller changes the next comparison's judge
              // without a policy write and without a restart.
              return async (request: Readonly<Record<string, unknown>>) => {
                /**
                 * Run 101 addendum 46 (measured live on `:3457`, 2026-09-28T10:04:36Z): this function and the
                 * `evaluation.score` worker both drive the *same* comparison for the same replay job, with no
                 * serialization between them. The live evidence: one capture's evaluation was driven twice
                 * concurrently - inline in `/api/role-model/track-b/replay` right after the handoff offered the
                 * queue row, and by the worker's scoped resume - and the two read different `actual` strings for
                 * the same arm (inline prefers the live dispatch text, the resume path the capture's bounded
                 * `responseText` excerpt), so `json_parses` flipped 1<->0 on the identical identity
                 * `(trial, run96-semantic-criteria, 3+f0f873dd66c6, correctness)` and Evaluation Core refused the
                 * second batch as `evaluation trial score batch conflict`.
                 *
                 * When the plane is `queue` the worker owns the comparison, so this path records the resume entry
                 * and pins the evidence (both of which the worker needs, addenda 36 and S22) and then defers. A
                 * `legacy` or `shadow` plane keeps the inline completion, which is what those modes mean.
                 */
                const inlineReplayJobId = String(request.replayJobId ?? "");
                const inlineSourceCaptureRequestId =
                  typeof sourceCapture.requestId === "string" ? sourceCapture.requestId : "";
                recordEvaluationResumeEntry({
                  replayJobId: inlineReplayJobId,
                  evaluationJobId: String(request.evaluationJobId ?? ""),
                  requestId,
                  sourceCaptureRequestId: inlineSourceCaptureRequestId,
                  scope:
                    typeof request.scope === "string" && request.scope.trim()
                      ? request.scope.trim()
                      : captureScope,
                });
                // S22: the entry just recorded is a live handoff; pin the source capture it will read again.
                await holdHandoffEvidence(inlineReplayJobId, {
                  requestId,
                  sourceCaptureRequestId: inlineSourceCaptureRequestId,
                });
                if (lateBoundEvaluationQueue.mode === "queue") {
                  console.error(
                    `[run101] evaluation completion deferred to the queue plane:${inlineReplayJobId}`,
                  );
                  return null;
                }
                /**
                 * Run 100 addendum 22 follow-up (requirement 3): the comparison's judge has to be the endpoint that
                 * actually scores it. Resolved from the controller alone, this is the very endpoint the tick
                 * substituted away from when it was an arm of this pair - so the job's comparability, the registered
                 * manifest and the runner's judge receipt would all name a judge that scored nothing. De-conflict
                 * here with the same deterministic rule the tick uses, against the pair this completer is about to
                 * score; with no usable alternative the judge is left untouched and the evaluator's own factory
                 * records judge missingness exactly as before.
                 */
                const judge = dedupeJudgeAgainstPair(
                  await resolveControllerJudge(created, learningPolicySnapshot),
                  {
                    sourceEndpointId,
                    counterfactualEndpointIds: counterfactualPackages.map(
                      (candidate) => candidate.endpointId,
                    ),
                    fallbackEndpointIds: resolveReplayJudgeFallbackEndpointIds(process.env),
                    configuredEndpointIds: created.effectiveRegistry.endpoints.map(
                      (endpoint) => endpoint.identity.endpoint_id,
                    ),
                  },
                );
                const evaluationCompleter = buildSupervisedReplayEvaluationCompleter({
                  // Addendum 58 §19: the live completion resolves externalized answers under this root too.
                  contractStateRoot: options.runtimeStateRoot,
                  backend: created,
                  runtime,
                  operations,
                  requestId,
                  channel,
                  captureScope,
                  sourceCapture,
                  sourceOutput,
                  sourceEndpointId,
                  sourceModelId,
                  counterfactualPackages,
                  evaluationCriteria: evaluationCriteria as unknown as Readonly<
                    Record<string, unknown>
                  >,
                  evaluationCriteriaDigest,
                  learningPolicySnapshot,
                  judge,
                  replayLedger,
                  replayPolicySet,
                  getDispatched: (endpointId: string) => {
                    const dispatch = dispatched.get(endpointId);
                    return dispatch
                      ? {
                          execution: dispatch.execution as unknown as Readonly<
                            Record<string, unknown>
                          >,
                          replayRequestId: dispatch.replayRequestId,
                        }
                      : undefined;
                  },
                  currentLedgerReservationId: () => ledgerReservationId,
                });
                /**
                 * Run 99 R33 recorded the resume entry here, before the completion ran; addendum 46 moved that
                 * (and the S22 evidence pin) to the top of this function, ahead of the queue-mode deferral, so
                 * the worker always finds a resumable entry and a held capture whichever path runs.
                 */
                const replayJobId = inlineReplayJobId;
                const completed = await evaluationCompleter(request);
                try {
                  const record = completed as Record<string, unknown>;
                  evaluationResumeStore.resolve(replayJobId, {
                    outcome: typeof record?.outcome === "string" ? record.outcome : "resolved",
                    comparisonGroupId:
                      typeof record?.comparisonGroupId === "string"
                        ? record.comparisonGroupId
                        : null,
                  });
                } catch (error) {
                  console.error(
                    `[run99] evaluation resume resolution declined:${requestId} ${String(
                      (error as { message?: unknown })?.message ?? error,
                    ).slice(0, 200)}`,
                  );
                }
                /**
                 * Run 101 R6 offered the derivation from here, and addendum 46 moved that offer into the shared
                 * completer (`offerLearnerDerivation`) so it fires for whichever driver finalized the
                 * comparison - this inline path or the evaluation worker's scoped resume - instead of only for
                 * this one. `learner.derive`'s `groupId` job rule makes a repeat offer a no-op.
                 */
                // Run 98 addendum 34 S1: the extra pairs this capture adds are completed inside
                // `createSupervisedReplayEvaluationCompleter` itself, which is the one function every
                // completion path (this fresh path and the resume sweep) funnels through. The
                // caller-side copy that used to live here never ran in the packaged stage runtime —
                // three marker builds proved it — so exactly one implementation exists now.
                return completed;
              };
            })(),
          });
          // R5/R12: the receipt is the automatic producer's only view of the durable
          // replay outcome. It must therefore carry the terminal state, the durable
          // evaluation outcome, and the per-dispatch accounting; otherwise the
          // producer cannot distinguish "replayed" from "handed off", cannot
          // reconcile the daily ledger, and re-attempts a capture that already
          // produced branches.
          const durableDispatches =
            result.dispatches &&
            typeof result.dispatches === "object" &&
            !Array.isArray(result.dispatches)
              ? (result.dispatches as Record<string, Record<string, unknown>>)
              : {};
          const durableEvaluation =
            result.evaluationResult && typeof result.evaluationResult === "object"
              ? (result.evaluationResult as Record<string, unknown>)
              : null;
          const receiptBranches = (
            Array.isArray(result.branches) ? (result.branches as Record<string, unknown>[]) : []
          ).map((branch) => {
            const candidateEndpointId = String(branch.candidateEndpointId ?? "");
            const dispatch = durableDispatches[candidateEndpointId] ?? null;
            const dispatchResult =
              dispatch &&
              typeof dispatch.result === "object" &&
              dispatch.result &&
              !Array.isArray(dispatch.result)
                ? (dispatch.result as Record<string, unknown>)
                : null;
            return {
              candidateEndpointId,
              outcome: dispatch ? String(dispatch.status ?? "unknown") : "unknown",
              branchRootRef:
                typeof dispatchResult?.branchRootRef === "string"
                  ? dispatchResult.branchRootRef
                  : null,
            };
          });
          const receiptDispatches = Object.entries(durableDispatches).map(
            ([endpointId, dispatch]) => {
              const receipt =
                dispatch.receipt &&
                typeof dispatch.receipt === "object" &&
                !Array.isArray(dispatch.receipt)
                  ? (dispatch.receipt as Record<string, unknown>)
                  : null;
              return {
                kind: "candidate",
                endpointId,
                attempt: Number.isSafeInteger(dispatch.attempt) ? Number(dispatch.attempt) : 1,
                costMicros: Number.isSafeInteger(receipt?.observedCostMicros)
                  ? Number(receipt?.observedCostMicros)
                  : 0,
                bytes: Number.isSafeInteger(receipt?.observedResponseBytes)
                  ? Number(receipt?.observedResponseBytes)
                  : 0,
                outcome: String(dispatch.status ?? "unknown"),
              };
            },
          );
          return {
            schemaVersion: "role-model.supervised-replay-command-receipt.v1",
            requestId,
            replayJobId: result.jobId,
            state: result.state,
            evaluationJobId: result.evaluationJobId,
            evaluationOutcome:
              typeof durableEvaluation?.outcome === "string" ? durableEvaluation.outcome : null,
            comparisonGroupId:
              typeof durableEvaluation?.comparisonGroupId === "string"
                ? durableEvaluation.comparisonGroupId
                : null,
            branches: receiptBranches,
            dispatches: receiptDispatches,
          };
        },
        ...(operatorOperations ? createRuntimeOperatorCallbacks(operatorOperations) : {}),
        // Run 99: the Evidence page's cohort measurement is derived here, where the extension
        // runtime and the durable-output decoder live (the sidecar cannot reach either).
        readLearningMeasurement: async (query: Readonly<Record<string, string>> = {}) => {
          const channel = packagedProfile?.channel ?? "development";
          const scopeId = String(options.scopeId ?? query.scope ?? "");
          const snapshot = readLearningPolicyFile({
            repoRoot: options.repoRoot,
            // Run 99 R23: the Evidence page measures against the operator's live policy.
            stateRoot: resolveLearningPolicyStateRoot({
              runtimeStateRoot: options.runtimeStateRoot,
              scopeId,
            }),
            channel,
            scopeId,
          });
          const effective = snapshot?.effective;
          return readTrackBAdvisoryMeasurement({
            runtime: extensionRuntimeRef.current,
            channel,
            scopeId,
            authorizationEpoch: 1,
            ...(options.runtimeStateRoot ? { stateRoot: options.runtimeStateRoot } : {}),
            guardrailBounds: {
              qualityMinDelta: effective?.qualityMinDelta ?? -0.02,
              costMaxMultiplier: effective?.costMaxMultiplier ?? 1.5,
              latencyP95MaxDeltaMs: effective?.latencyP95MaxDeltaMs ?? 10_000,
              errorRateMaxDeltaPp: effective?.errorRateMaxDeltaPp ?? 2,
            },
          });
        },
        ...(trackBManifestText
          ? {
              trackBPostObservation: async (observation: Readonly<Record<string, unknown>>) => {
                const run88PiInvocationProvenance = loadRun88PiInvocationProvenance?.() ?? null;
                const correlatedObservation = run88StageIdentity
                  ? createRun88StagePostObservation({
                      observation,
                      piInvocationProvenance: run88PiInvocationProvenance,
                      proofRequired: Boolean(
                        process.env.RUN88_PI_INVOCATION_PROOF_PATH ||
                          process.env.RUN88_PI_PROOF_AUTHORITY_PUBLIC_KEY_PATH,
                      ),
                      releaseId: run88StageIdentity.releaseId,
                      sourceId: run88StageIdentity.sourceId,
                      executableSha256: run88StageIdentity.executableSha256,
                      scope: options.scopeId,
                    })
                  : observation;
                const enqueueStartedAtMs = Date.now();
                await postObservationOutbox.enqueue(correlatedObservation);
                if (process.env.ROLE_MODEL_PHASE_TIMING === "1") {
                  console.error(
                    `[run98] phase observation-enqueue ${Date.now() - enqueueStartedAtMs}ms`,
                  );
                }
                const runtime = extensionRuntimeRef.current;
                if (!runtime) return { status: "queued_for_extension_runtime" };
                schedulePostObservationDrain(runtime);
                return { status: "queued" };
              },
            }
          : {}),
      });
      // Run 99 R33 (addendum 22 §3.28): durable resume entries for supervised-replay evaluations.
      // A handoff is recorded before the completion runs and resolved when it lands, so a restart in
      // between leaves a bounded, retryable record instead of a job stranded in `scoring` forever.
      const evaluationResumeStore = createSupervisedReplayEvaluationResumeStore({
        filePath: resolveSupervisedReplayEvaluationResumePath({
          runtimeStateRoot: options.runtimeStateRoot,
          scopeId: options.scopeId,
        }),
        // S22: every terminal transition releases the evidence pin that entry created - completion, the
        // named disposition, or the attempt cap. The store owns that moment, so the release cannot be
        // forgotten by a caller that resolves an entry somewhere else.
        onReleased: (entry) => releaseHandoffEvidence(entry.replayJobId),
      });
      // Run 100 addendum `replay-dispatch-lifecycle.addendum-04` S7: the auto-replay liveness sweep records
      // the resume entries it recovers for handed-off replays through this ref.
      evaluationResumeStoreRef.current = evaluationResumeStore;
      /**
       * Run 98 addendum 33 S2: the durable per-judge position-consistency ledger. The pairwise dispatch
       * already measures a flip per pair (dual_order) and reports it through `recordJudgeObservation`;
       * this is where those observations become an aggregate a reader can act on.
       */
      const judgeConsistencyLedger = createJudgeConsistencyLedger({
        filePath: path.join(
          resolveLearningPolicyStateRoot({
            runtimeStateRoot: options.runtimeStateRoot,
            scopeId: options.scopeId,
          }),
          "judge-position-consistency.json",
        ),
      });
      const readEvaluationLearningPolicySnapshot = () =>
        readLearningPolicyFile({
          repoRoot: options.repoRoot,
          stateRoot: resolveLearningPolicyStateRoot({
            runtimeStateRoot: options.runtimeStateRoot,
            scopeId: options.scopeId,
          }),
          channel: packagedProfile?.channel ?? "development",
          scopeId: options.scopeId,
        });
      /**
       * The single construction of the supervised-replay evaluation completer. The live replay path
       * and the resume sweep differ only in where their dispatch/output evidence comes from, so both
       * go through here and produce identical comparisons and learner rows.
       */
      /**
       * Run 101 addendum 46: one place that offers the derivation for a finalized comparison, passed into the
       * shared completer so the driver that actually finished the work offers it. `legacy` keeps the offer a
       * no-op, exactly as the inline wrapper had it, and `learner.derive`'s `groupId` job rule dedupes a repeat.
       */
      const offerLearnerDerivation = async (comparisonGroupId: string): Promise<void> => {
        if (lateBoundLearnerQueues.derive.mode === "legacy") return;
        const offered = await lateBoundLearnerQueues.derive
          .offer({ groupId: comparisonGroupId, reason: "comparison-finalized" })
          .catch((error: unknown) => ({
            enqueued: false,
            reason: String((error as { message?: unknown })?.message ?? error).slice(0, 160),
          }));
        if (!offered.enqueued) {
          console.error(
            `[run101] learner derive offer declined:${comparisonGroupId} ${
              offered.reason ?? "unknown"
            }`,
          );
        }
      };
      const buildSupervisedReplayEvaluationCompleter = (input: {
        readonly backend: Awaited<ReturnType<typeof createRuntimeBridgeBackend>>;
        readonly runtime: NonNullable<typeof extensionRuntimeRef.current>;
        readonly operations: ReturnType<typeof createTrackBOperations>;
        readonly requestId: string;
        readonly channel: string;
        readonly captureScope: string;
        readonly sourceCapture: Readonly<Record<string, unknown>>;
        readonly sourceOutput: string;
        readonly sourceEndpointId: string;
        readonly sourceModelId: string;
        readonly counterfactualPackages: readonly {
          readonly endpointId: string;
          readonly modelId: string;
          readonly reasoningEffort: string | null;
        }[];
        readonly evaluationCriteria: Readonly<Record<string, unknown>>;
        readonly evaluationCriteriaDigest: string;
        readonly learningPolicySnapshot: ReturnType<typeof readLearningPolicyFile>;
        /**
         * Run 98 addendum 45 J2: the resolved judge for this comparison — the endpoint the operator has
         * configured as the controller, or empty when the selector is `disabled`/no controller is set.
         */
        readonly judge: {
          readonly endpointId: string;
          readonly source: "controller" | "disabled";
          readonly assignmentUpdatedAtMs: number | null;
        };
        readonly replayLedger: ReturnType<typeof createReplayLedger>;
        readonly replayPolicySet: ReturnType<typeof buildReplayPolicySet>;
        readonly getDispatched: (endpointId: string) => unknown;
        readonly currentLedgerReservationId: () => string | null;
        /** Run 98 addendum 33 S2: the judge's measured position consistency, resolved by the caller. */
        readonly judgeConsistency?: Readonly<Record<string, unknown>> | null;
        /**
         * Addendum 58 §19: the host runtime state root. The completer's pipeline resolves externalized
         * extension answers (the comparison readback and the reference attestation) from the worker's
         * durable-output store, which needs this root; without it a completed comparison came back as the
         * transfer marker and every resume reported `readback=transferState,resultHash,byteLength`.
         */
        readonly contractStateRoot?: string;
      }) => {
        // Run 98 addendum 33 S2: the judge's measured position consistency, straight from the durable
        // ledger, with the operator's floor applied. The completer passes it into the pipeline so the
        // promotion gate sees the measurement the ledger records.
        const judgeConsistency = (() => {
          const judgeEndpointId = input.judge.endpointId;
          if (!judgeEndpointId) return null;
          const row = judgeConsistencyLedger.summary(judgeEndpointId)[0] ?? null;
          if (!row) return null;
          const floor =
            input.learningPolicySnapshot?.effective.judgePositionConsistencyFloor ??
            DEFAULT_POSITION_CONSISTENCY_FLOOR;
          return { ...row, ...evaluateJudgePositionConsistency({ row, floor }) };
        })();
        return createSupervisedReplayEvaluationCompleter({
          offerLearnerDerivation,
          ...(judgeConsistency ? { judgeConsistency } : {}),
          ...(input.contractStateRoot ? { contractStateRoot: input.contractStateRoot } : {}),
          runtime: input.runtime,
          operations: input.operations,
          requestId: input.requestId,
          channel: input.channel,
          scope: options.scopeId,
          captureScope: input.captureScope,
          sourceCapture: input.sourceCapture as Record<string, unknown>,
          sourceOutput: input.sourceOutput,
          sourceEndpointId: input.sourceEndpointId,
          sourceModelId: input.sourceModelId,
          counterfactualPackages: input.counterfactualPackages,
          // RC04 (L4): the automatic comparison carries a router-backed pairwise judge so a real
          // counterfactual can be decisioned instead of tying on a deterministic term that neither
          // branch satisfies. The judge dispatch is ledgered as a derived dispatch inside the same
          // daily ceiling.
          judge: createRouterPairwiseJudge({
            executeChatCompletions: input.backend.executeChatCompletions.bind(input.backend),
            endpoints: input.backend.effectiveRegistry.endpoints.map((endpoint) => ({
              endpointId: endpoint.identity.endpoint_id,
              modelId: endpoint.identity.model_id,
            })),
            // Run 98 addendum 45 J2: the judge is the configured controller. When no controller is set —
            // or the selector is `disabled` — there is no judge, and when the resolved endpoint is not
            // dispatchable, or is part of this pair, the factory returns undefined and the comparison
            // records judge missingness instead of scoring a candidate with itself.
            judgeEndpointId: input.judge.endpointId,
            // Run 98 addendum 45 J2: the comparison records where the judge came from, so a controller
            // change is auditable from the manifest rather than inferred from a policy version.
            judgeSource: input.judge.source,
            judgeAssignmentUpdatedAtMs: input.judge.assignmentUpdatedAtMs,
            excludedEndpointIds: [
              input.sourceEndpointId,
              ...input.counterfactualPackages.map((candidate) => candidate.endpointId),
            ],
            taskText: extractTaskInstructionText(input.sourceCapture) ?? "",
            // Run 98 R10: the judge mode, presentation-order policy and agreement measurement resolve
            // from the versioned policy (env override first), failing closed to the previous
            // identified, source-first, no-probe behaviour.
            mode: isPairwiseJudgeMode(process.env.ROLE_MODEL_JUDGE_MODE?.trim())
              ? (process.env.ROLE_MODEL_JUDGE_MODE.trim() as "identified" | "identity_blind")
              : (input.learningPolicySnapshot?.effective.judgeMode ?? "identified"),
            orderPolicy:
              process.env.ROLE_MODEL_JUDGE_ORDER_POLICY?.trim() === "dual_order"
                ? "dual_order"
                : process.env.ROLE_MODEL_JUDGE_ORDER_POLICY?.trim() === "source_first"
                  ? "source_first"
                  : (input.learningPolicySnapshot?.effective.judgeOrderPolicy ?? "source_first"),
            // Run 98 addendum 33 S2: what a flipped pair means (env override → policy → balanced).
            orderAggregation: (() => {
              const envValue = process.env.ROLE_MODEL_JUDGE_ORDER_AGGREGATION?.trim();
              if (
                envValue === "balanced" ||
                envValue === "strict_consistency" ||
                envValue === "fails_closed"
              ) {
                return envValue;
              }
              return input.learningPolicySnapshot?.effective.judgeOrderAggregation ?? "balanced";
            })(),
            measureAgreement:
              process.env.ROLE_MODEL_JUDGE_MEASURE_AGREEMENT?.trim() === "true"
                ? true
                : process.env.ROLE_MODEL_JUDGE_MEASURE_AGREEMENT?.trim() === "false"
                  ? false
                  : (input.learningPolicySnapshot?.effective.judgeMeasureAgreement ?? false),
            // Run 98 addendum 33 S2: every dispatch that measured an order effect is recorded per judge, so
            // position consistency is an aggregate measurement rather than a per-pair footnote. The primary
            // completion counts the check; a disagreement counts the check and the flip it produced.
            recordJudgeObservation: (row) => {
              const outcome = String((row as { outcome?: unknown }).outcome ?? "");
              const presentation = (row as { presentation?: { first?: unknown } }).presentation;
              try {
                judgeConsistencyLedger.record({
                  judgeEndpointId: input.judge.endpointId,
                  judgeMode:
                    typeof (row as { judgeMode?: unknown }).judgeMode === "string"
                      ? String((row as { judgeMode: string }).judgeMode)
                      : null,
                  orderCheck: outcome === "order_disagreement" || presentation?.first === "source",
                  orderDisagreement: outcome === "order_disagreement",
                  modeCheck: typeof (row as { agreement?: unknown }).agreement === "boolean",
                  modeAgreement: (row as { agreement?: boolean }).agreement === true,
                });
              } catch {
                // Consistency accounting is best-effort telemetry: a full disk must not fail a battle.
              }
            },
            recordDerivedDispatch: (dispatch) => {
              try {
                // The supervised replay already reserved this counterfactual at its first candidate
                // dispatch, so the derived judge dispatch is recorded against the same reservation
                // (AC-R07-02: judge spend is visible in the same daily ceiling).
                const reservationId = input.currentLedgerReservationId();
                if (!reservationId) return;
                input.replayLedger.record({
                  reservationId,
                  captureRef: input.requestId,
                  policySetDigest: input.replayPolicySet.policySetDigest,
                  counterfactualRef: `cf:${input.requestId}`,
                  dispatchKind: "derived",
                  candidateEndpointId: dispatch.judgeEndpointId,
                  attempt: dispatch.attempt,
                  costMicros: dispatch.costMicros,
                  bytes: dispatch.bytes,
                  outcome: dispatch.outcome,
                });
              } catch {
                // Ledger accounting is best-effort here; the judge receipt remains durable on the
                // score row and the producer reconciles dispatches.
              }
            },
          }),
          getDispatched: input.getDispatched as never,
          evaluationCriteria: input.evaluationCriteria,
          evaluationCriteriaDigest: input.evaluationCriteriaDigest,
          contractStateRoot: options.runtimeStateRoot,
          // Run 98 addendum 34 S1: the coverage ledger lives beside the supervised-replay evaluation
          // resume store, which is the one durable location both completion paths already share. It
          // orders each capture's extra pairs least-covered-first so successive captures close the
          // graph's gaps instead of re-spending on pairs that already have evidence.
          pairCoverageLedgerPath: path.join(
            path.dirname(
              resolveSupervisedReplayEvaluationResumePath({
                runtimeStateRoot: options.runtimeStateRoot,
                scopeId: options.scopeId,
              }),
            ),
            "pair-coverage-ledger.json",
          ),
          // Run 98 R3/R15: the learning pass consumes the operator's versioned policy floors for this
          // channel and scope.
          ...(input.learningPolicySnapshot
            ? {
                learningPolicy: {
                  evidenceFloor: {
                    minDecisiveComparisons:
                      input.learningPolicySnapshot.effective.minDecisiveComparisons,
                    minHoldoutComparisons:
                      input.learningPolicySnapshot.effective.minHoldoutComparisons,
                    minDevelopmentComparisons:
                      input.learningPolicySnapshot.effective.minDevelopmentComparisons,
                    minDistinctCaptures: input.learningPolicySnapshot.effective.minDistinctCaptures,
                  },
                  guardrails: {
                    qualityMinDelta: input.learningPolicySnapshot.effective.qualityMinDelta,
                  },
                  // Run 98 R19: the promotion protocol is declared from the same versioned policy as
                  // the floors, so the validation gate is reproducible from config.
                  promotionProtocol: {
                    protocolId: `promotion:${input.learningPolicySnapshot.digest.slice(0, 16)}`,
                    primaryMetricId: "role_model_pairwise_judge.battle",
                    direction: "higher_is_better" as const,
                    minimumPracticalDelta:
                      input.learningPolicySnapshot.effective.minimumPracticalDelta,
                    intervalLevel: input.learningPolicySnapshot.effective.promotionIntervalLevel,
                    resamples: input.learningPolicySnapshot.effective.promotionResamples,
                    bootstrapSeed: input.learningPolicySnapshot.effective.promotionBootstrapSeed,
                    analysisMethod: input.learningPolicySnapshot.effective.promotionAnalysisMethod,
                    selectionFamilySize:
                      input.learningPolicySnapshot.effective.promotionSelectionFamilySize,
                    multiplicityAdjustment:
                      input.learningPolicySnapshot.effective.multiplicityAdjustment,
                  },
                  evidenceMaxAgeMs:
                    input.learningPolicySnapshot.effective.evidenceMaxAgeDays *
                    24 *
                    60 *
                    60 *
                    1_000,
                },
              }
            : {}),
        });
      };
      /**
       * Re-runs one interrupted supervised-replay evaluation. The branch captures are deterministic
       * (`replay-<requestId>-<hash(replayJobId, candidate)>-branch`), and the pipeline reuses the
       * already-scored durable trials, so this finalizes the existing comparison group and lets the
       * learner consume it instead of needing a fresh provider dispatch.
       */
      /**
       * Run 101 R5: `onlyReplayJobId` lets the evaluation queue drive exactly
       * the handoff its job names, through the same body the sweep uses, so the
       * comparison is finalized once and evidence writing stays in one place.
       * Without it the sweep behaves exactly as before.
       */
      const resumePendingEvaluations = async (scope?: { readonly onlyReplayJobId?: string }) => {
        const runtime = extensionRuntimeRef.current;
        const operations = currentPostObservationOperations();
        if (!runtime || !operations) {
          return {
            resumed: 0,
            completed: 0,
            failed: 0,
            outsideRetentionWindow: 0,
            renewedFromDrain: 0,
            reconciled: 0,
            remaining: 0,
          };
        }
        const channel = packagedProfile?.channel ?? "development";
        const sweepResult = await resumePendingSupervisedReplayEvaluations({
          store: scope?.onlyReplayJobId
            ? scopeResumeStoreToReplayJob(evaluationResumeStore, scope.onlyReplayJobId)
            : evaluationResumeStore,
          ...(scope?.onlyReplayJobId ? { limit: 1 } : {}),
          isEvaluationComplete: async (entry) => {
            try {
              const rawJob = await runtime.invoke("evaluation-core", {
                requestId: `evaluation-resume:${entry.replayJobId}`,
                sessionId: `evaluation-resume:${options.scopeId}`,
                protocolVersion: "1.1.0",
                channel,
                scope: options.scopeId,
                authorizationEpoch: 1,
                capability: "evaluation:get-job",
                value: { jobId: entry.evaluationJobId },
              });
              // A durable job readback can cross the extension boundary as an externalized transfer
              // marker (the same class that made the Learning packs page render empty in R28), so
              // decode it before reading the status.
              const job = decodeExternalizedOperatorReadback({
                stateRoot: options.runtimeStateRoot,
                scopeId: options.scopeId,
                value: rawJob,
              });
              const status =
                job && typeof job === "object" && !Array.isArray(job)
                  ? String((job as Record<string, unknown>).status ?? "")
                  : "";
              return status === "completed";
            } catch {
              return false;
            }
          },
          complete: async (entry) => {
            // The durable evaluation job carries the criteria the original attempt used, so a resumed
            // completion grades with the same rubric instead of inventing one.
            let storedCriteria: Readonly<Record<string, unknown>> | null = null;
            let storedJobId: string | null = null;
            try {
              const rawStoredJob = await runtime.invoke("evaluation-core", {
                requestId: `evaluation-resume-read:${entry.replayJobId}`,
                sessionId: `evaluation-resume:${options.scopeId}`,
                protocolVersion: "1.1.0",
                channel,
                scope: options.scopeId,
                authorizationEpoch: 1,
                capability: "evaluation:get-job",
                value: { jobId: entry.evaluationJobId },
              });
              const storedJob = decodeExternalizedOperatorReadback({
                stateRoot: options.runtimeStateRoot,
                scopeId: options.scopeId,
                value: rawStoredJob,
              });
              const record =
                storedJob && typeof storedJob === "object" && !Array.isArray(storedJob)
                  ? (storedJob as Record<string, unknown>)
                  : null;
              storedJobId =
                record && typeof record.id === "string"
                  ? record.id
                  : record && typeof record.jobId === "string"
                    ? record.jobId
                    : null;
              const cases = record && Array.isArray(record.cases) ? record.cases : [];
              const firstCase =
                cases[0] && typeof cases[0] === "object" && !Array.isArray(cases[0])
                  ? (cases[0] as Record<string, unknown>)
                  : null;
              const criteria = firstCase?.evaluationCriteria;
              storedCriteria =
                criteria && typeof criteria === "object" && !Array.isArray(criteria)
                  ? (criteria as Readonly<Record<string, unknown>>)
                  : null;
            } catch {
              storedCriteria = null;
            }
            /**
             * Run 100 addendum `replay-dispatch-lifecycle.addendum-04` S7: a replay that handed its branches
             * off and was interrupted *before* the evaluation job was created has no durable evaluation job
             * to read back - that is exactly the state the recovery pass discovers. The completion below
             * creates the job from the durable source capture and branch captures (idempotent by request id
             * and criteria digest), so a missing readback is no longer a dead end: the stored criteria, when
             * they exist, still win over the re-derived ones so an existing job's immutable bytes are
             * re-presented unchanged.
             */
            if (!storedJobId) {
              console.error(
                `[run100l] durable evaluation job ${entry.evaluationJobId} is absent; completion will create it from durable evidence`,
              );
            }
            const sourceCapture = (await operations.readLocalRouteCapture({
              requestId: entry.sourceCaptureRequestId,
            })) as Record<string, unknown> | null;
            if (!sourceCapture || typeof sourceCapture !== "object") {
              /**
               * S34 (measured live on f1db34b8: four renewed handoffs all reported
               * `durable replay evaluation is missing its source capture …` and spent attempts on it): a source
               * capture that is no longer in the store is the *same* permanent class as an arm capture that is
               * gone - the evidence is outside the retention window - so it takes the named disposition instead
               * of burning the attempt budget and ending as an unqualified `abandoned`.
               */
              throw new HandoffEvidenceUnavailableError(
                `source_capture_missing:${entry.sourceCaptureRequestId}`,
              );
            }
            const sourceOutput = extractSourceOutputText(sourceCapture);
            if (!sourceOutput) {
              throw new HandoffEvidenceUnavailableError(
                `source_output_unreadable:${entry.sourceCaptureRequestId}`,
              );
            }
            const captureScope =
              typeof sourceCapture.scope === "string" && sourceCapture.scope.trim()
                ? sourceCapture.scope.trim()
                : options.scopeId;
            const sourceEndpointId =
              typeof sourceCapture.endpointId === "string" && sourceCapture.endpointId.trim()
                ? sourceCapture.endpointId.trim()
                : entry.sourceEndpointId;
            const sourceModelId =
              typeof sourceCapture.modelId === "string" && sourceCapture.modelId.trim()
                ? sourceCapture.modelId.trim()
                : entry.sourceModelId;
            const dispatched = new Map<
              string,
              { readonly replayRequestId: string; readonly execution: Record<string, unknown> }
            >();
            const counterfactualPackages: {
              endpointId: string;
              modelId: string;
              reasoningEffort: string | null;
            }[] = [];
            /**
             * Run 100 addendum `replay-evaluation-spine-repair.addendum-05` S18 (live on `:3457`, immediately
             * after renewals started re-driving handoffs): the completion re-derived each arm's branch-capture
             * id, but the dispatch capture became attempt-scoped (addendum 04 S9), so the derived name no
             * longer existed and every renewed handoff failed with `durable replay evaluation has no recorded
             * counterfactual branch to evaluate`. The durable job names the capture each arm wrote, so the
             * completion reads that first and keeps the old derivation only as the legacy fallback.
             */
            /**
             * Run 100 addendum `handoff-evidence-durability.addendum-06` S21c (measured live): the durable job
             * read was swallowed (`.catch(() => null)`) and the completion then fell back to the pre-S9 branch
             * capture naming, which no longer exists. Every arm therefore resolved to nothing and the handoff
             * was disposed as if its evidence had been evicted - while the store held the pointers and the
             * artifacts. A failed read of the record that *names* the captures is not "no evidence": it is
             * "cannot tell", which is retryable and must say so.
             */
            let durableReplayJobAnswer: unknown = null;
            let jobReadFailure: string | null = null;
            try {
              durableReplayJobAnswer = await runtime.invoke("replay-core", {
                requestId: `replay-job-read:${entry.replayJobId}`,
                sessionId: `replay-job-read:${options.scopeId}`,
                protocolVersion: "1.1.0",
                channel,
                scope: captureScope,
                authorizationEpoch: 1,
                capability: "replay:job",
                value: { jobId: entry.replayJobId },
              });
            } catch (error) {
              jobReadFailure = String(
                (error as { message?: unknown })?.message ?? error ?? "unknown",
              ).slice(0, 200);
            }
            /**
             * Run 101 addendum 35 (measured live on the packaged stage RC, 2026-09-28): the answer crosses the
             * packaged extension host inside a durable-output envelope, so reading `answer.dispatches` yielded
             * its `dispatches` off the envelope. The candidate builder then had no recorded `branchRequestId`
             * and no `providerResultRef` to read, collapsed every arm onto the pre-S9 `…-<legacyHash>-branch`
             * name that no producer writes, and the handoff was terminalized as
             * `evidence_outside_retention_window` - while both arm captures sat in the store, readable. The
             * decode below is the one the recovery sweep already performs.
             */
            const durableReplayJob: Record<string, unknown> | null =
              jobReadFailure !== null
                ? null
                : resolveResumedHandoffJobRecord({
                    answer: durableReplayJobAnswer,
                    stateRoot: options.runtimeStateRoot,
                    scopeId: options.scopeId,
                  });
            if (jobReadFailure !== null || !durableReplayJob) {
              throw new Error(
                `resumed handoff job record is unreadable: ${
                  jobReadFailure ?? "the durable job returned no record"
                }`,
              );
            }
            /**
             * Run 100 item 8 (`capture_missing`): the audit measured that the derived `…-branch` name has no
             * producer while the arm's capture sits under the provider-result id, so the reader gets every id
             * the job can support, in order, instead of the single derived name.
             */
            const branchCaptureRequestIds = branchCaptureRequestIdCandidatesFromJob({
              replayJobId: entry.replayJobId,
              requestId: entry.requestId,
              dispatches: durableReplayJob?.dispatches,
              candidateEndpointIds: entry.counterfactualPackages.map(
                (candidate) => candidate.endpointId,
              ),
            });
            /**
             * S22: this is the one place the durable job names *every* capture the handoff owes - the source
             * it replays and the arms it compares - so the pin is extended here before any reader touches
             * them. A resumed handoff reads its arms minutes or hours after the record was written, which is
             * exactly the window in which the ring would have evicted them.
             */
            await holdHandoffEvidence(entry.replayJobId, {
              requestId: entry.requestId,
              sourceCaptureRequestId: entry.sourceCaptureRequestId,
              // Run 100 item 8: each arm now names ordered candidates, so the pin covers all of them.
              branchCaptureRequestIds: [...branchCaptureRequestIds.values()].flat(),
            });
            /**
             * Run 100 addendum `handoff-evidence-durability.addendum-06` S21/S23: the arm evidence resolves
             * through the same canonical reader the source half uses, and every arm it cannot resolve is
             * *named*. Measured on `:3457`: the inline reader here accepted only a string `response.content`
             * or a string `outputText`, so thirteen handoffs whose captures were present, named and readable
             * were refused as `durable replay evaluation has no recorded counterfactual branch to evaluate`
             * - a claim about durable state the stores disprove - and each burned eight attempts before an
             * unqualified `abandoned`. Silence was the defect; the reasons are now part of the record.
             */
            const armEvidence = await resolveResumedArmEvidence({
              counterfactualPackages: entry.counterfactualPackages,
              branchCaptureRequestIds,
              /**
               * Addendum 38: the decoded job's own dispatch record per arm. `terra` on replay `2f223824749c…`
               * was reported `capture_missing` while its dispatch said
               * `{status: "retryable_failure", reason: "terminated", disposition: "retryable"}` - the transport
               * failure wearing the name of an evicted pointer. Since `capture_missing` is permanent, a replay
               * whose every arm failed that way was terminalized as `evidence_outside_retention_window`.
               */
              dispatchOutcomesByEndpoint: (() => {
                const dispatches = durableReplayJob?.dispatches;
                return dispatches && typeof dispatches === "object" && !Array.isArray(dispatches)
                  ? (dispatches as Record<string, unknown>)
                  : {};
              })(),
              readCapture: async (requestId) => {
                const answer = (await operations.readLocalRouteCapture({ requestId })) as Record<
                  string,
                  unknown
                > | null;
                if (answer) return answer;
                /**
                 * Run 100 addendum 31: the boundary answered nothing for an arm whose capture the queue
                 * durably recorded (`status: "captured"`), which is the measured `capture_missing` class. Fall
                 * back to that receipt before reporting the evidence gone.
                 */
                return readRouteCaptureFromQueueReceipt({
                  runtimeStateRoot: options.runtimeStateRoot,
                  scopeId: options.scopeId,
                  requestId,
                });
              },
            });
            for (const arm of armEvidence.arms) {
              counterfactualPackages.push({
                endpointId: arm.endpointId,
                modelId: arm.modelId,
                reasoningEffort: arm.reasoningEffort,
              });
              dispatched.set(arm.endpointId, {
                replayRequestId: arm.replayRequestId,
                execution: {
                  routingDecisionId: arm.routingDecisionId,
                  outputText: arm.outputText,
                },
              });
            }
            if (armEvidence.unreadable.length > 0) {
              console.error(
                `[run101] resumed handoff ${entry.replayJobId} could not read ${armEvidence.unreadable.length} arm(s): ${describeUnresolvedArms(armEvidence.unreadable)}`,
              );
            }
            if (dispatched.size === 0) {
              const detail = describeUnresolvedArms(armEvidence.unreadable);
              /**
               * S21/S23: only evidence that is *gone* is a terminal disposition. A boundary that failed to
               * answer is an ordinary retryable failure - the attempt budget and the bounded renewal exist
               * for exactly that - and reporting it as a dead end would retire work that can still complete
               * (measured live: the first version collapsed both into `capture_missing`).
               */
              if (unresolvedArmsArePermanent(armEvidence.unreadable)) {
                throw new HandoffEvidenceUnavailableError(detail);
              }
              throw new Error(`resumed handoff evidence is unreadable: ${detail}`);
            }
            const evaluationCriteria = storedCriteria
              ? normalizeTrackBSemanticEvaluationCriteria(storedCriteria)
              : normalizeTrackBSemanticEvaluationCriteria(entry.evaluationCriteria);
            // Run 99 R33: the durable job is created with the criteria the executor derived from the
            // capture's own task evidence, and re-creating it with a different rubric is refused as an
            // idempotency conflict. Derive them the same way, so a resumed completion re-presents the
            // job's immutable bytes.
            const derivedCriteria = deriveAutomaticReplayCriteria({
              taskText: extractTaskInstructionText(sourceCapture),
              sourceOutput,
            });
            const effectiveCriteria = derivedCriteria
              ? normalizeTrackBSemanticEvaluationCriteria(derivedCriteria.criteria)
              : evaluationCriteria;
            const completer = buildSupervisedReplayEvaluationCompleter({
              // Addendum 58 §19: the resume sweep finalizes a comparison, so it needs the same durable-output
              // resolution the live completer does.
              contractStateRoot: options.runtimeStateRoot,
              backend: created,
              runtime,
              operations,
              requestId: entry.requestId,
              channel,
              captureScope,
              sourceCapture,
              sourceOutput,
              sourceEndpointId,
              sourceModelId,
              counterfactualPackages,
              evaluationCriteria: effectiveCriteria as unknown as Readonly<Record<string, unknown>>,
              evaluationCriteriaDigest: digestTrackBSemanticEvaluationCriteria(effectiveCriteria),
              learningPolicySnapshot: readEvaluationLearningPolicySnapshot(),
              /**
               * Run 98 addendum 45 J2: a resumed completion resolves the judge the same way a live one does.
               * Run 100 addendum 22 follow-up: and it de-conflicts it the same way too, against the pair this
               * resumed completion is about to score, so a capture the tick substituted a judge for is not
               * recorded as judged by an arm of its own comparison.
               */
              judge: dedupeJudgeAgainstPair(
                await resolveControllerJudge(created, readEvaluationLearningPolicySnapshot()),
                {
                  sourceEndpointId,
                  counterfactualEndpointIds: counterfactualPackages.map(
                    (candidate) => candidate.endpointId,
                  ),
                  fallbackEndpointIds: resolveReplayJudgeFallbackEndpointIds(process.env),
                  configuredEndpointIds: created.effectiveRegistry.endpoints.map(
                    (endpoint) => endpoint.identity.endpoint_id,
                  ),
                },
              ),
              // A resumed completion performs no candidate dispatch, so its judge has no live
              // reservation to charge.
              replayLedger: createReplayLedger({
                filePath: path.join(
                  options.runtimeStateRoot,
                  options.scopeId,
                  "track-b-replay-ledger.json",
                ),
                limits: resolveChannelScopedReplayLedgerLimits({
                  repoRoot: options.repoRoot,
                  runtimeStateRoot: options.runtimeStateRoot,
                  scopeId: options.scopeId,
                  channel,
                }),
              }),
              replayPolicySet: buildReplayPolicySet(),
              getDispatched: (endpointId: string) => dispatched.get(endpointId),
              currentLedgerReservationId: () => null,
            });
            /**
             * Run 108 addendum-01 A5.3: a forced finalise refusal must show ITS reason in the
             * disposition the operator surface reads (the replay disposition ledger). At baseline the
             * refusal detail reached only the metric tag (recordFinaliseRefusal) while the capture's
             * disposition row stayed "deferred" for ever. The bounded reason is written as a named
             * terminal disposition row, and the error is rethrown so the sweep's attempt accounting
             * and the abandoned-entry terminalization keep working exactly as before.
             */
            let completedEntry: Readonly<Record<string, unknown>>;
            try {
              completedEntry = (await completer({
                replayJobId: entry.replayJobId,
                evaluationJobId: entry.evaluationJobId,
                replayJob: null,
                resultBranches: [],
              })) as Readonly<Record<string, unknown>>;
            } catch (error) {
              const refusalDetail = finaliseRefusalDispositionDetail(error);
              if (refusalDetail !== null) {
                try {
                  await operations.recordReplayDisposition({
                    captureRef: entry.requestId,
                    policySetDigest: buildReplayPolicySet().policySetDigest,
                    outcome: "refused",
                    refusalCode: "evaluation_finalise_refused",
                    detail: refusalDetail,
                    branches: null,
                    window: createReplayLedger({
                      filePath: path.join(
                        options.runtimeStateRoot,
                        options.scopeId,
                        "track-b-replay-ledger.json",
                      ),
                      limits: resolveChannelScopedReplayLedgerLimits({
                        repoRoot: options.repoRoot,
                        runtimeStateRoot: options.runtimeStateRoot,
                        scopeId: options.scopeId,
                        channel,
                      }),
                    }).status().window,
                  });
                } catch (dispositionFailure) {
                  // Best-effort: the sweep below still records the attempt and, past the cap,
                  // terminalizes the replay job carrying the same reason.
                  console.error(
                    `[run108] finalise refusal disposition write degraded:${entry.requestId} ${String(
                      (dispositionFailure as { message?: unknown })?.message ?? dispositionFailure,
                    ).slice(0, 200)}`,
                  );
                }
              }
              throw error;
            }
            // Run 98 addendum 34 S1: this sweep is one of the two paths that finalize a comparison, so
            // it must not own its own copy of the extra-pair pass — the completer it just called does that
            // for every caller. The sweep-local copy that used to live here never ran (the coverage ledger
            // it would have written was absent for three builds), so it is deleted in the same change that
            // makes the completer the single implementation.
            return completedEntry;
          },
          /**
           * Run 98 addendum 34 S5 (live stage v200): when the sweep abandons an entry, the evaluation
           * is proven unavailable. The replay job behind it must stop being re-claimed — otherwise it
           * stays `awaiting_evaluation`, the scheduler 409s on every tick ("replay job is awaiting
           * evaluation and cannot be re-leased"), the capture defers without consuming its budget, and
           * nothing is ever evaluated or failed. Terminalizing it with the recorded reason turns that
           * silent infinite loop into an observable terminal refusal.
           */
          onAbandoned: async (entry, error) => {
            const activeRuntime = extensionRuntimeRef.current;
            if (!activeRuntime) return;
            const reason = String(
              (error as { message?: unknown })?.message ?? error ?? "unknown",
            ).slice(0, 360);
            // Durable replay jobs are scoped to the *capture's* scope, and `replay:fail-job` is bound to
            // the persisted job, so the scope has to come from the capture — the same authority the
            // completion path reads. Guessing the operator scope is refused with a binding mismatch.
            // Run 98 addendum 34 S5: durable replay jobs are bound to the scope they were created under,
            // so the terminalization needs *that* scope — the operator scope is refused with
            // `replay persisted job scope binding mismatch`. The entry records it from the handoff; the
            // capture and the operator scope are the fallbacks for entries written before the field.
            const candidateScopes: string[] = [];
            const pushScope = (value: unknown) => {
              const text = typeof value === "string" ? value.trim() : "";
              if (text && !candidateScopes.includes(text)) candidateScopes.push(text);
            };
            pushScope(entry.scope);
            try {
              const capture = (await currentPostObservationOperations()?.readLocalRouteCapture({
                requestId: entry.sourceCaptureRequestId,
              })) as Record<string, unknown> | null | undefined;
              pushScope(capture?.scope);
            } catch {
              // The capture may be gone (retention); the remaining candidates still apply.
            }
            // S27: the store knows the scope the job was created under even when the entry predates the field
            // and its capture is gone - which is exactly the `legacy_scope_unresolved` class in the live log.
            if (replayJobScopeRef.current) pushScope(await replayJobScopeRef.current());
            pushScope(options.scopeId);
            try {
              const invokeFailJob = async (invokeScope: string) =>
                activeRuntime.invoke("replay-core", {
                  requestId: `replay-fail-job:${entry.replayJobId}`,
                  sessionId: `replay-fail-job:${options.scopeId}`,
                  protocolVersion: "1.1.0",
                  channel,
                  scope: invokeScope,
                  authorizationEpoch: 1,
                  capability: "replay:fail-job",
                  value: {
                    jobId: entry.replayJobId,
                    reason: `evaluation_unavailable: ${reason}`,
                  },
                });
              let lastError: unknown = null;
              for (const candidateScope of candidateScopes) {
                try {
                  await invokeFailJob(candidateScope);
                  lastError = null;
                  break;
                } catch (scopeError) {
                  lastError = scopeError;
                  // Only a scope mismatch is worth retrying with the next candidate; anything else is a
                  // real failure (already terminal, unknown job) and is reported as-is.
                  if (
                    !/scope binding mismatch/u.test(
                      String((scopeError as { message?: unknown })?.message ?? scopeError),
                    )
                  ) {
                    break;
                  }
                }
              }
              if (lastError) throw lastError;
            } catch (failure) {
              const message = String((failure as { message?: unknown })?.message ?? failure);
              // Run 98 addendum 39 S5: a resume record written before the scope field existed
              // cannot resolve a scope from any candidate. Give it its own typed disposition
              // instead of the generic decline, so an operator can see the class and the effort
              // spent on it.
              if (classifyReplayTerminalizationFailure(message) === "legacy_scope_unresolved") {
                console.error(
                  `[run98] replay job terminalization deferred:legacy_scope_unresolved job=${entry.replayJobId} candidates=${candidateScopes.length} reason=${message.slice(0, 160)}`,
                );
              } else {
                console.error(
                  `[run98] replay job terminalization declined:${entry.replayJobId} ${message.slice(0, 200)}`,
                );
              }
            }
            /**
             * Run 100 addendum `evaluation-lease-wedge-repair.addendum-02` S3 (operator report
             * 2026-09-23: "18 evals have been stuck in flight for hours").
             *
             * `replay:fail-job` closes the replay half of the handoff. The *evaluation* job behind the
             * same handoff was left non-terminal with no lease at all: `evaluation:claim-job` accepts
             * only `queued` or an expired `leased` row, and a NULL expiry never satisfies it, so the row
             * could never be claimed again. The operator surface then reported it "in flight" for days.
             * The give-up therefore terminalizes both halves with the same recorded reason. This is
             * independent of the replay half: a refused or already-terminal replay job must not stop the
             * evaluation row from being closed.
             */
            try {
              const terminalization = await terminalizeAbandonedEvaluation({
                entry: {
                  replayJobId: entry.replayJobId,
                  evaluationJobId: entry.evaluationJobId,
                  scope: entry.scope,
                },
                channel,
                operatorScope: options.scopeId,
                reason,
                /**
                 * Run 100 addendum 28 §2: ask whether the row is in this scope before cancelling there.
                 * `evaluation:get-job` answers `null` for a missing id without throwing, so a stale id costs one
                 * cheap read instead of a failed cancel that the host bridge logs as `invoke-failed` (measured:
                 * ~11 lines/min for the 305-of-321 ids the census found absent).
                 */
                jobExists: async (invokeScope) => {
                  evaluationJobExistsProbeCounter += 1;
                  const answer = await activeRuntime.invoke("evaluation-core", {
                    /**
                     * A fresh request id per check: the answer is externalized behind a `durableLocator`, and a
                     * repeated id can be served an earlier call's answer, which would report a row that has
                     * since aged out as present.
                     */
                    requestId: `evaluation:get-job:${entry.evaluationJobId}:${evaluationJobExistsProbeCounter}`,
                    sessionId: `evaluation:get-job:${options.scopeId}`,
                    protocolVersion: "1.1.0",
                    channel,
                    scope: invokeScope,
                    authorizationEpoch: 1,
                    capability: "evaluation:get-job",
                    value: { jobId: entry.evaluationJobId },
                  });
                  /**
                   * Run 173 follow-up (run172's shape probe): the live answer is a chain of externalization
                   * markers whose innermost layer carries no payload — only a durable locator — so the record has
                   * to be read back through the documented decoder instead of unwrapped from the envelope.
                   */
                  const decoded = decodeExternalizedOperatorReadback({
                    stateRoot: options.runtimeStateRoot,
                    scopeId: options.scopeId,
                    value: unwrapCapabilityPayload(answer),
                  });
                  /**
                   * Only an answer that proves the row is there counts as existing: a job identity, or the
                   * externalization marker a large-but-present job is delivered behind. A degradation receipt
                   * (or any unexpected shape) is *unknown*, which keeps the previous behaviour rather than
                   * skipping a row that may exist.
                   */
                  const verdict = evaluationJobExistsFromGetJobAnswer(decoded);
                  if (verdict !== false && evaluationJobExistsAnswerLogged < 3) {
                    evaluationJobExistsAnswerLogged += 1;
                    const marker = (decoded ?? {}) as Record<string, unknown>;
                    const locator =
                      marker.durableLocator && typeof marker.durableLocator === "object"
                        ? (marker.durableLocator as Record<string, unknown>)
                        : null;
                    const business =
                      marker.businessOutput && typeof marker.businessOutput === "object"
                        ? (marker.businessOutput as Record<string, unknown>)
                        : null;
                    console.error(
                      `[run164] evaluation existence check id=${entry.evaluationJobId.slice(0, 24)} verdict=${String(
                        verdict,
                      )} locatorRequest=${String(locator?.requestId ?? "-").slice(-24)} businessStatus=${String(
                        business?.status ?? "-",
                      )}`,
                    );
                  }
                  return verdict;
                },
                /**
                 * Run 100 (evaluation audit): the same read answers the durable status, so a row the store
                 * already reports terminal is a benign no-op instead of a cancel that the extension refuses —
                 * measured as 156 such refusals and 312 log lines per process start.
                 */
                jobStatus: async (invokeScope) => {
                  evaluationJobExistsProbeCounter += 1;
                  const answer = await activeRuntime.invoke("evaluation-core", {
                    requestId: `evaluation:get-job:${entry.evaluationJobId}:${evaluationJobExistsProbeCounter}`,
                    sessionId: `evaluation:get-job:${options.scopeId}`,
                    protocolVersion: "1.1.0",
                    channel,
                    scope: invokeScope,
                    authorizationEpoch: 1,
                    capability: "evaluation:get-job",
                    value: { jobId: entry.evaluationJobId },
                  });
                  const decoded = decodeExternalizedOperatorReadback({
                    stateRoot: options.runtimeStateRoot,
                    scopeId: options.scopeId,
                    value: unwrapCapabilityPayload(answer),
                  });
                  const status = evaluationJobStatusFromGetJobAnswer(decoded);
                  /**
                   * Bounded diagnostic (three per process): three deployed attempts at this short-circuit did not
                   * suppress the stream, so the answer shape has to be named rather than inferred.
                   */
                  if (
                    (status === undefined ||
                      (typeof status === "string" && !TERMINAL_STATUS_HINT.has(status))) &&
                    evaluationJobStatusShapeLogged < 3
                  ) {
                    evaluationJobStatusShapeLogged += 1;
                    const record =
                      decoded && typeof decoded === "object" && !Array.isArray(decoded)
                        ? (decoded as Record<string, unknown>)
                        : null;
                    const business = record?.businessOutput;
                    console.error(
                      `[run171] evaluation status probe: typeof=${typeof decoded} decodedKeys=${Object.keys(
                        record ?? {},
                      )
                        .slice(0, 6)
                        .join(",")} businessType=${typeof business} businessKeys=${
                        business && typeof business === "object"
                          ? Object.keys(business as Record<string, unknown>)
                              .slice(0, 6)
                              .join(",")
                          : "-"
                      } status=${String(status)} head=${typeof decoded === "string" ? decoded.slice(0, 80) : "-"}`,
                    );
                  }
                  return status;
                },
                invoke: (capability, value, invokeScope) =>
                  activeRuntime.invoke("evaluation-core", {
                    requestId: `${capability}:${entry.evaluationJobId}`,
                    sessionId: `${capability}:${options.scopeId}`,
                    protocolVersion: "1.1.0",
                    channel,
                    scope: invokeScope,
                    authorizationEpoch: 1,
                    capability,
                    value,
                  }),
              });
              if (!terminalization.cancelled) {
                // A job that is already terminal is the expected second visit; anything else is worth a
                // line in the log rather than silence, because silence is what hid this defect.
                /**
                 * Run 100 addendum 16 item 8d: a job id that exists in none of the candidate scopes has nothing
                 * to terminalize — the delegated census measured 305 of 321 target ids absent from the live
                 * evaluation store, and reporting each one produced hundreds of self-defeating lines per window.
                 * The first occurrence per process is still named (so the class stays visible), the rest are
                 * counted, not printed.
                 */
                if (terminalization.benign === true) {
                  terminalizationBenignCount += 1;
                  if (terminalizationBenignCount === 1) {
                    console.error(
                      `[run100h] evaluation job terminalization no-op:${entry.evaluationJobId} the id exists in none of the candidate scopes (counted, not per-job)`,
                    );
                  }
                } else {
                  console.error(
                    `[run100h] evaluation job terminalization not applied:${entry.evaluationJobId} scope=${terminalization.scope ?? "unresolved"} ${String(terminalization.detail ?? "job is already terminal").slice(0, 160)}`,
                  );
                }
              }
            } catch (terminalizationError) {
              const message = String(
                (terminalizationError as { message?: unknown })?.message ?? terminalizationError,
              );
              console.error(
                `[run100h] evaluation job terminalization failed:${entry.evaluationJobId} ${message.slice(0, 200)}`,
              );
            }
          },
        });
        return sweepResult;
      };
      resumeEvaluationsRef.current = resumePendingEvaluations;
      /**
       * Run 98 addendum 34 S7 — the production caller addendum 33 S6 never had.
       *
       * `evaluation:rescore-trial-scores` recomputes a stored trial's deterministic score under a new
       * registered version and writes `evaluation_trial_score_revisions`. It shipped with unit coverage
       * and **zero callers**, so the table stayed empty and a corrected ruler could never correct
       * history. The host is the only layer that can read both the durable captures and Evaluation
       * Core, so the operator action lives here: it rebuilds each arm's scored text from its durable
       * capture (the source capture plus the deterministic
       * `replay-<requestId>-<hash(replayJobId,candidate)>-branch` captures) and re-scores the newest
       * completed supervised replays under one pinned version.
       */
      rescoreLearningScoresRef.current = async (body: Readonly<Record<string, unknown>> = {}) => {
        const runtime = extensionRuntimeRef.current;
        if (!runtime) throw new Error("evaluation runtime is unavailable for re-score");
        const channel = packagedProfile?.channel ?? "development";
        const decode = (value: unknown) =>
          decodeExternalizedOperatorReadback({
            stateRoot: options.runtimeStateRoot,
            scopeId: options.scopeId,
            value,
          });
        const invokeEvaluation = async (capability: string, value: unknown) =>
          decode(
            await runtime.invoke("evaluation-core", {
              requestId: `learning-rescore:${capability}:${Date.now()}`,
              sessionId: `learning-rescore:${options.scopeId}`,
              protocolVersion: "1.1.0",
              channel,
              scope: options.scopeId,
              authorizationEpoch: 1,
              capability,
              value,
            }),
          );
        /**
         * A supervised invoke answers with the extension's business output, which may arrive wrapped
         * (`{result}`, `{businessOutput}` or `{businessOutput:{result}}`) or, for a list capability, as
         * the list itself. Unwrap defensively instead of assuming one shape.
         */
        const unwrap = (value: unknown): unknown => {
          let current = value;
          for (let depth = 0; depth < 3; depth += 1) {
            const record =
              current && typeof current === "object" && !Array.isArray(current)
                ? (current as Record<string, unknown>)
                : null;
            if (!record) return current;
            if (Array.isArray(record.result)) return record.result;
            if (Array.isArray(record.businessOutput)) return record.businessOutput;
            // The supervised invoke answers `{value: ...}` on this boundary (measured on stage v205).
            if (Array.isArray(record.value)) return record.value;
            if (record.businessOutput && typeof record.businessOutput === "object") {
              current = record.businessOutput;
              continue;
            }
            if (record.result !== undefined) {
              current = record.result;
              continue;
            }
            if (record.value !== undefined && typeof record.value === "object") {
              current = record.value;
              continue;
            }
            return record;
          }
          return current;
        };
        const invokeList = async (capability: string, value: unknown) => {
          const unwrapped = unwrap(await invokeEvaluation(capability, value));
          return Array.isArray(unwrapped) ? (unwrapped as Array<Record<string, unknown>>) : [];
        };
        const text = (value: unknown) =>
          typeof value === "string" && value.trim() ? value.trim() : "";
        const scorerId = text(body.scorerId) || "run96-semantic-criteria";
        const dimension = text(body.dimension) || "correctness";
        // Run 98 addendum 34 S4: per-prior-version before/after counts, merged across the batches this
        // call re-scores, so the operator readback names the rulers the revisions superseded.
        const priorVersionBuckets: Record<
          string,
          {
            revisions: number;
            beforeSum: number;
            beforeCount: number;
            afterSum: number;
            afterCount: number;
          }
        > = {};
        const requestedLimit = Number(body.limit ?? 6);
        const limit = Number.isSafeInteger(requestedLimit)
          ? Math.min(Math.max(requestedLimit, 1), 12)
          : 6;
        /**
         * Run 98 addendum 34 S4: the requirement is to re-score the **historical mixed-version set**, not
         * only the newest captures — the newest entries are already pinned to the current ruler, while the
         * store still holds 991 trials whose newest base score came from the older version. A bounded
         * offset walks the historical window instead of making the operator re-score nothing.
         */
        const requestedOffset = Number(body.offset ?? 0);
        const offset = Number.isSafeInteger(requestedOffset)
          ? Math.min(Math.max(requestedOffset, 0), 4096)
          : 0;
        const rawDefinitions = await invokeEvaluation("evaluation:list-scorers", {});
        const definitions = await invokeList("evaluation:list-scorers", {});
        const versions = definitions
          .filter((definition) => definition?.id === scorerId)
          .map((definition) => text(definition.version))
          .filter(Boolean)
          .sort((left, right) => Number(left) - Number(right) || left.localeCompare(right));
        const scorerVersion = text(body.scorerVersion) || versions[versions.length - 1] || "";
        if (!scorerVersion) {
          // A shape regression here would otherwise show up as a silent empty result; name it.
          throw new Error(
            `no registered scorer version for ${scorerId} (definitions: ${JSON.stringify(
              rawDefinitions,
            ).slice(0, 200)})`,
          );
        }
        const resumeStore = createSupervisedReplayEvaluationResumeStore({
          filePath: resolveSupervisedReplayEvaluationResumePath({
            runtimeStateRoot: options.runtimeStateRoot,
            scopeId: options.scopeId,
          }),
        });
        const entries = resumeStore
          .list()
          .filter((entry) => typeof entry.outcome === "string" && entry.outcome !== "abandoned")
          .sort((left, right) => (right.resolvedAtMs ?? 0) - (left.resolvedAtMs ?? 0))
          .slice(offset, offset + limit);
        const entryOperations = currentPostObservationOperations();
        let groups = 0;
        const revisionIds: string[] = [];
        const skipped: string[] = [];
        for (const entry of entries) {
          try {
            const jobResult = unwrap(
              await invokeEvaluation("evaluation:get-job", { jobId: entry.evaluationJobId }),
            );
            const job =
              jobResult && typeof jobResult === "object" && !Array.isArray(jobResult)
                ? (jobResult as Record<string, unknown>)
                : null;
            if (!job || String(job.status ?? "") !== "completed") {
              skipped.push(`${entry.evaluationJobId}:not_completed`);
              continue;
            }
            const cases = Array.isArray(job.cases)
              ? (job.cases as Array<Record<string, unknown>>)
              : [];
            const evaluationCriteria = cases[0]?.evaluationCriteria;
            if (!evaluationCriteria || typeof evaluationCriteria !== "object") {
              skipped.push(`${entry.evaluationJobId}:no_criteria`);
              continue;
            }
            const trials = await invokeList("evaluation:list-trials", {
              jobId: entry.evaluationJobId,
            });
            const sourceCapture = (await entryOperations?.readLocalRouteCapture({
              requestId: entry.sourceCaptureRequestId,
            })) as Record<string, unknown> | null | undefined;
            const sourceText = sourceCapture ? extractSourceOutputText(sourceCapture) : null;
            const candidates: Array<{
              trialId: string;
              actual: string;
              evaluationCriteria: unknown;
            }> = [];
            for (const trial of trials) {
              const trialId = text(trial.trialId) || text(trial.id);
              const candidateRef = text(trial.candidateRef) || text(trial.candidate_ref);
              if (!trialId || !candidateRef) continue;
              let actual = candidateRef === entry.sourceEndpointId ? sourceText : null;
              if (!actual) {
                const token = createHash("sha256")
                  .update(`${entry.replayJobId}\u0000${candidateRef}`)
                  .digest("hex")
                  .slice(0, 16);
                const branchCapture = (await entryOperations?.readLocalRouteCapture({
                  requestId: `replay-${entry.requestId}-${token}-branch`,
                })) as Record<string, unknown> | null | undefined;
                actual = branchCapture ? extractSourceOutputText(branchCapture) : null;
              }
              if (!actual) continue;
              candidates.push({ trialId, actual, evaluationCriteria });
            }
            if (candidates.length === 0) {
              skipped.push(`${entry.evaluationJobId}:no_scored_text`);
              continue;
            }
            const rescoreResult = unwrap(
              await invokeEvaluation("evaluation:rescore-trial-scores", {
                groups: candidates.slice(0, 25),
                scorerId,
                scorerVersion,
                dimension,
              }),
            );
            const result =
              rescoreResult && typeof rescoreResult === "object" && !Array.isArray(rescoreResult)
                ? (rescoreResult as Record<string, unknown>)
                : null;
            const revisions = Array.isArray(result?.revisions)
              ? (result.revisions as Array<Record<string, unknown>>)
              : [];
            groups += candidates.length;
            for (const revision of revisions) {
              const revisionId = text(revision.scoreId) || text(revision.score_id);
              if (revisionId) revisionIds.push(revisionId);
            }
            /**
             * Run 98 addendum 34 S4: the operator readback carries the per-prior-version before/after
             * summary the extension now computes, and refuses an aggregate mean while the re-scored set
             * spans more than one ruler version — a mean across rulers is not a measurement.
             */
            const byPriorVersion = result?.byPriorVersion;
            if (
              byPriorVersion &&
              typeof byPriorVersion === "object" &&
              !Array.isArray(byPriorVersion)
            ) {
              for (const [key, bucket] of Object.entries(
                byPriorVersion as Record<string, Record<string, unknown>>,
              )) {
                const row = priorVersionBuckets[key] ?? {
                  revisions: 0,
                  beforeSum: 0,
                  beforeCount: 0,
                  afterSum: 0,
                  afterCount: 0,
                };
                const bucketRevisions = Number(bucket?.revisions ?? 0);
                row.revisions += Number.isSafeInteger(bucketRevisions) ? bucketRevisions : 0;
                if (Number.isFinite(bucket?.meanBefore) && bucketRevisions > 0) {
                  row.beforeSum += Number(bucket.meanBefore) * bucketRevisions;
                  row.beforeCount += bucketRevisions;
                }
                if (Number.isFinite(bucket?.meanAfter) && bucketRevisions > 0) {
                  row.afterSum += Number(bucket.meanAfter) * bucketRevisions;
                  row.afterCount += bucketRevisions;
                }
                priorVersionBuckets[key] = row;
              }
            }
          } catch (error) {
            skipped.push(
              `${entry.evaluationJobId}:${String(
                (error as { message?: unknown })?.message ?? error,
              ).slice(0, 90)}`,
            );
          }
        }
        return {
          scorerId,
          scorerVersion,
          dimension,
          window: { offset, limit },
          evaluatedEntries: entries.length,
          groups,
          revisions: revisionIds.length,
          revisionIds: revisionIds.slice(0, 10),
          // Run 98 addendum 34 S4: per prior ruler version, with before/after means, and a refused
          // aggregate while the re-scored set spans more than one version.
          byPriorVersion: Object.fromEntries(
            Object.entries(priorVersionBuckets).map(([key, bucket]) => [
              key,
              {
                revisions: bucket.revisions,
                meanBefore: bucket.beforeCount > 0 ? bucket.beforeSum / bucket.beforeCount : null,
                meanAfter: bucket.afterCount > 0 ? bucket.afterSum / bucket.afterCount : null,
              },
            ]),
          ),
          ...(() => {
            const versions = new Set(
              Object.keys(priorVersionBuckets).map((key) => key.slice(key.lastIndexOf("@") + 1)),
            );
            if (versions.size <= 1) return {};
            return {
              aggregateMean: null,
              refusal: "mixed_scorer_versions",
              refusalDetail:
                "a mean across rows produced by different ruler versions is not a measurement; re-score under one pinned version first",
            };
          })(),
          skipped,
        };
      };
      if (trackBOperationsEndpoint && trackBOperationsToken && runStartupSQLiteMaintenance) {
        const response = await fetch(`${trackBOperationsEndpoint}/sqlite-maintenance`, {
          method: "POST",
          headers: {
            authorization: `Bearer ${trackBOperationsToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            nowMs: Date.now(),
            maxDeleteRows: 256,
            idle: true,
            lockRisk: "low",
          }),
        });
        if (!response.ok) {
          throw new Error(`Track B startup SQLite maintenance failed with ${response.status}`);
        }
      }
      activeAutoReplayLoop = startHostAutoReplayLoop(
        () => created.effectiveRegistry.endpoints.map((endpoint) => endpoint.identity.endpoint_id),
        // R3/R7: the counterfactual candidate set is the runtime's *dispatchable*
        // configured set. A credential-less or degraded endpoint must never be chosen
        // as a counterfactual: its dispatch can only fail, which would leave the
        // capture without a comparison while still consuming the daily dispatch
        // ceiling. Health is re-read every tick because credentials can be repaired
        // or revoked while the runtime is up.
        async () => {
          try {
            const activeRuntime = packagedRuntime;
            if (!activeRuntime) return null;
            const rows = await activeRuntime.backend.listEndpoints();
            const healthy = rows
              .filter((row) => row.healthStatus === "healthy")
              .map((row) => row.endpointId);
            // An empty healthy set is a real observation (nothing can be dispatched),
            // so it is returned as-is rather than being confused with "no filter".
            return healthy;
          } catch {
            return null;
          }
        },
        /**
         * Run 106 (live finding on the dev replay queue, 2026-10-07): the descriptor read the model and the
         * effort off the endpoint's TOP LEVEL, where a registry endpoint candidate does not carry them - the
         * identity lives at `identity.model_id` and `identity.reasoning_effort` (see
         * `EndpointCandidate` in packages/endpoint-registry). Every descriptor therefore answered
         * `modelId: ""` and `reasoningEffort: null`, so the arm comparability the queue handoff records
         * was always `arm_effort_unspecified` and the focus-dispatch effort view was empty - which is
         * exactly why an effort-mismatched arm could be chosen and then voided downstream. Read the identity
         * fields, keeping the top-level shape as a fallback for an endpoint object that carries them.
         */
        () =>
          created.effectiveRegistry.endpoints.map((endpoint) => {
            const declared = endpoint as {
              readonly modelId?: unknown;
              readonly reasoningEffort?: unknown;
            };
            const modelId = endpoint.identity.model_id ?? declared.modelId;
            const reasoningEffort = endpoint.identity.reasoning_effort ?? declared.reasoningEffort;
            return {
              endpointId: endpoint.identity.endpoint_id,
              modelId: typeof modelId === "string" ? modelId : "",
              reasoningEffort:
                typeof reasoningEffort === "string" && reasoningEffort.trim()
                  ? reasoningEffort
                  : null,
            };
          }),
        // Run 105 bug 3: pass the wired judge resolution down so the dispatcher's focus planner excludes the
        // SAME controller judge the supervised replay endpoint will reject (deepseek-flash), instead of
        // returning null from the empty durable table and planning the judge as a counterfactual arm.
        async () => {
          try {
            const snapshot = readLearningPolicyFile({
              repoRoot: options.repoRoot,
              stateRoot: resolveLearningPolicyStateRoot({
                runtimeStateRoot: options.runtimeStateRoot,
                scopeId: options.scopeId,
              }),
              channel: packagedProfile?.channel ?? "development",
              scopeId: options.scopeId,
            });
            const judge = await resolveControllerJudge(created, snapshot);
            return judge.endpointId || null;
          } catch {
            return null;
          }
        },
      );
      configuredEndpointIdsRef.current = created.effectiveRegistry.endpoints.map(
        (endpoint) => endpoint.identity.endpoint_id,
      );
      // Run 108 R6: surface the small-pool judge misplacement ONCE at config time instead of per-tick
      // R14 refusals. The judge resolution is async and re-read per tick, so this fires at creation.
      void resolveControllerJudge(created, readLearningPolicyFile({
        repoRoot: options.repoRoot,
        stateRoot: resolveLearningPolicyStateRoot({
          runtimeStateRoot: options.runtimeStateRoot,
          scopeId: options.scopeId,
        }),
        channel: packagedProfile?.channel ?? "development",
        scopeId: options.scopeId,
      }))
        .then((judge) => {
          const signal = assessSmallPoolJudgePlacement({
            candidateEndpointIds: configuredEndpointIdsRef.current,
            judgeEndpointId: judge?.endpointId ?? null,
          });
          if (signal) {
            withStageSpan("config.judge_placement", { signal: signal.code }, () => {
              console.error(
                `[run108] config-time judge placement: ${signal.code}: ${signal.detail}`,
              );
            });
          }
        })
        .catch(() => {});
      return created;
    };
    if (trackBManifestText && trackBManifestPath) {
      const manifest = JSON.parse(trackBManifestText) as {
        readonly schemaVersion: string;
        readonly sidecar: { readonly modulePath: string; readonly artifactSha256: string };
        readonly registryBindings?: {
          readonly runtimeChannel?: {
            readonly schema?: string;
            readonly currentVersion?: string;
            readonly minimumReaderVersion?: string;
          };
          readonly contractRegistry?: PackagedTrackBContractRegistryBinding;
        };
        readonly runtimeChannelContext?: Partial<RuntimeChannelContext>;
        readonly publicRuntimeAdapter?: {
          readonly modulePath: string;
          readonly artifactSha256: string;
          readonly routerRoot: string;
        };
        readonly extensions: readonly {
          readonly descriptor: {
            readonly id: string;
            readonly protocolVersion: string;
            readonly capabilities: readonly string[];
            readonly channelContractVersion?: string;
          };
          readonly modulePath: string;
          readonly artifactSha256: string;
        }[];
      };
      if (
        manifest.schemaVersion !== "role-model.track-b-runtime-distribution.v1" &&
        manifest.schemaVersion !== "role-model.track-b-runtime-distribution.v2"
      ) {
        throw new Error("unsupported packaged Track B distribution");
      }
      if (
        manifest.schemaVersion === "role-model.track-b-runtime-distribution.v2" &&
        !manifest.publicRuntimeAdapter
      ) {
        throw new Error("v2 Track B distribution is missing its public runtime adapter");
      }
      const distributionRoot = path.dirname(trackBManifestPath);
      if (packagedReleaseId) {
        validateRun88PrivateDistributionIdentity(
          {
            generation:
              manifest.schemaVersion === "role-model.track-b-runtime-distribution.v2" ? "N" : "N-1",
            manifestSha256: createHash("sha256").update(trackBManifestText).digest("hex"),
            channel: packagedProfile?.channel ?? "development",
          },
          {
            channel: "stage",
            manifestSha256: String(packagedManifestRecord?.private_distribution_sha256 ?? ""),
            publicGeneration: "N",
          },
        );
      }
      // Run 99 R23: one definition of the Track B state root, shared with the policy resolver.
      const trackBStateRoot = resolveLearningPolicyStateRoot({
        runtimeStateRoot: options.runtimeStateRoot,
        scopeId: options.scopeId,
      });
      const runtimeChannel = packagedProfile?.channel ?? "development";
      const writerContext: RuntimeChannelContext = {
        channel: packagedProfile?.channel ?? runtimeChannel,
        scopeId: packagedProfile?.scope_id ?? options.scopeId,
        authorizationEpoch: 1,
      };
      const readerContext: RuntimeChannelContext = {
        channel: runtimeChannel,
        scopeId: options.scopeId,
        authorizationEpoch: 1,
      };
      const contractRegistryBinding = manifest.registryBindings?.contractRegistry;
      const contractRegistryText = contractRegistryBinding?.registryPath
        ? await readFile(
            (() => {
              const registryPath = contractRegistryBinding.registryPath;
              if (
                path.isAbsolute(registryPath) ||
                registryPath.split(/[\\/]/u).some((segment) => segment === "..")
              ) {
                throw new Error("Track B packaged contract registry path is invalid");
              }
              return path.resolve(path.dirname(trackBManifestPath), registryPath);
            })(),
            "utf8",
          )
        : undefined;
      negotiatePackagedTrackBStartup({
        channel: runtimeChannel,
        scopeId: options.scopeId,
        authorizationEpoch: 1,
        manifest,
        writerContext,
        readerContext,
        contractRegistryText,
      });
      const destinationTrustMaterialFile =
        args.values["destination-material-file"] ??
        args.values["destination-trust-material-file"] ??
        process.env.ROLE_MODEL_DESTINATION_AUTH_SECRET_FILE;
      const aggregateEndpoint =
        args.values["aggregate-ingestion-url"] ??
        process.env.ROLE_MODEL_AGGREGATE_INGESTION_URL ??
        (runtimeChannel === "stage" && destinationTrustMaterialFile
          ? "https://ingest-stage.role-model.dev/contribution/aggregate"
          : undefined);
      const aggregateScope =
        args.values["aggregate-scope"] ??
        process.env.ROLE_MODEL_AGGREGATE_SCOPE ??
        (runtimeChannel === "stage" && destinationTrustMaterialFile
          ? "standalone-runtime-stage"
          : undefined);
      const developmentVerificationLeaseFile =
        args.values["development-verification-lease-file"] ??
        process.env.ROLE_MODEL_DEVELOPMENT_VERIFICATION_LEASE_FILE;
      const developmentVerificationTrustKeyFile =
        args.values["development-verification-trust-key-file"] ??
        process.env.ROLE_MODEL_DEVELOPMENT_VERIFICATION_TRUST_KEY_FILE;
      const developmentVerificationDeploymentIds = (
        args.values["development-verification-deployment-ids"] ??
        process.env.ROLE_MODEL_DEVELOPMENT_VERIFICATION_DEPLOYMENT_IDS ??
        ""
      )
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      const developmentVerificationRevocationEpochRaw =
        args.values["development-verification-revocation-epoch"] ??
        process.env.ROLE_MODEL_DEVELOPMENT_VERIFICATION_REVOCATION_EPOCH;
      const developmentVerificationRevocationEpoch =
        developmentVerificationRevocationEpochRaw === undefined
          ? undefined
          : Number(developmentVerificationRevocationEpochRaw);
      const hasDevelopmentVerificationInput = Boolean(
        developmentVerificationLeaseFile ||
          developmentVerificationTrustKeyFile ||
          developmentVerificationDeploymentIds.length > 0 ||
          developmentVerificationRevocationEpochRaw !== undefined,
      );
      if (runtimeChannel !== "development" && hasDevelopmentVerificationInput) {
        throw new Error(
          "development verification capability is valid only for development runtimes",
        );
      }
      if (hasDevelopmentVerificationInput) {
        const requiredDevelopmentVerificationRevocationEpoch =
          developmentVerificationRevocationEpoch;
        if (
          typeof requiredDevelopmentVerificationRevocationEpoch !== "number" ||
          !Number.isSafeInteger(requiredDevelopmentVerificationRevocationEpoch) ||
          requiredDevelopmentVerificationRevocationEpoch < 0
        ) {
          throw new Error(
            "development verification upload requires a non-negative current revocation epoch",
          );
        }
        if (
          !developmentVerificationLeaseFile ||
          !developmentVerificationTrustKeyFile ||
          developmentVerificationDeploymentIds.length === 0 ||
          !aggregateEndpoint ||
          !aggregateScope
        ) {
          throw new Error(
            "development verification upload requires lease, trust key, deployment IDs, a non-negative current revocation epoch, aggregate endpoint, and aggregate scope",
          );
        }
        const authorization = JSON.parse(
          readFileSync(developmentVerificationLeaseFile, "utf8"),
        ) as DevelopmentVerificationAuthorization;
        const trustMaterial = parseDevelopmentVerificationTrustMaterial(
          readFileSync(developmentVerificationTrustKeyFile, "utf8"),
        );
        negotiateDevelopmentVerificationCapability({
          runtimeChannel,
          sourceScopeId: aggregateScope,
          authorization,
          trustedPublicKey: createPublicKey(trustMaterial.publicKey),
          expectedKeyId: trustMaterial.keyId,
          requiredRevocationEpoch: requiredDevelopmentVerificationRevocationEpoch,
          destinationDeploymentIds: developmentVerificationDeploymentIds,
        });
      }
      const artifactKeyFiles = await resolveManagedArtifactKeyFiles({
        channel: runtimeChannel,
        stateRoot: trackBStateRoot,
        artifactDigestKeyFile:
          args.values["artifact-digest-key-file"] ??
          process.env.ROLE_MODEL_ARTIFACT_DIGEST_KEY_FILE,
        artifactEncryptionKeyFile:
          args.values["artifact-encryption-key-file"] ??
          process.env.ROLE_MODEL_ARTIFACT_ENCRYPTION_KEY_FILE,
      });
      // Start extension-host registration in parallel with sidecar/backend bring-up, but
      // do not advertise readiness until every canonical worker and startup probe is healthy.
      extensionRuntimeOwner = createCliExtensionRuntimeOwner(
        createProductionExtensionRuntime({
          stateRoot: path.join(trackBStateRoot, "extensions"),
          authorizationEpoch: 1,
          repoRoot: options.repoRoot,
          channel: runtimeChannel,
          extensions: manifest.extensions.map((extension) => ({
            ...extension,
            modulePath: path.resolve(distributionRoot, extension.modulePath),
          })),
          qaExtensions,
        }),
      );
      packagedRuntime = await createPackagedProductionRuntime({
        stateRoot: trackBStateRoot,
        sidecar: createOwnedTrackBSidecarSpec({
          artifactPath: path.resolve(distributionRoot, manifest.sidecar.modulePath),
          artifactSha256: manifest.sidecar.artifactSha256,
          stateRoot: trackBStateRoot,
          channel: runtimeChannel,
          // Run 98 R17: the operator boundary must validate the same runtime scope
          // identity the host sends on operator requests.
          runtimeScope: options.scopeId,
          // Run 98 R7/R17: the sidecar composes its supervised evaluation and rollout
          // domains from the same staged manifest the host reads.
          ...(trackBManifestPath ? { manifestPath: trackBManifestPath } : {}),
          artifactDigestKeyFile: artifactKeyFiles.artifactDigestKeyFile,
          artifactEncryptionKeyFile: artifactKeyFiles.artifactEncryptionKeyFile,
          trustMaterialFile: destinationTrustMaterialFile,
          aggregateEndpoint,
          aggregateScope,
          developmentVerificationLeaseFile,
          developmentVerificationTrustKeyFile,
          developmentVerificationDeploymentIds,
          developmentVerificationRevocationEpoch,
          ...(aggregateCorrelationReleaseId && aggregateCorrelationCohortId
            ? {
                aggregateCorrelationReleaseId,
                aggregateCorrelationCohortId,
                aggregateCorrelationOperationId: "aggregate.upload",
              }
            : {}),
          ...(manifest.publicRuntimeAdapter
            ? {
                sqliteDatabasePath: path.join(
                  options.runtimeStateRoot,
                  options.scopeId,
                  "memory",
                  "memory.sqlite",
                ),
                publicRuntimeAdapterPath: path.resolve(
                  distributionRoot,
                  manifest.publicRuntimeAdapter.modulePath,
                ),
                publicRouterRoot: path.resolve(
                  distributionRoot,
                  manifest.publicRuntimeAdapter.routerRoot,
                ),
                migrationScope: options.scopeId,
              }
            : {}),
        }),
        createBackend: ({ trackBOperationsEndpoint, trackBOperationsToken }) =>
          createBackend(
            trackBOperationsEndpoint,
            trackBOperationsToken,
            trackBDistributionRequiresSQLiteMaintenance(manifest),
          ),
      });
      extensionRuntime = await awaitCliExtensionRuntime(
        extensionRuntimeOwner.promise,
        bootstrapState,
        {
          expectedExtensionIds: TRACK_B_CANONICAL_EXTENSION_IDS,
          closeRuntime: extensionRuntimeOwner.close,
          beforeReady: async (runtime) => {
            for (const extension of qaExtensions) {
              const capability = extension.descriptor.capabilities.find(
                (candidate) => candidate !== "health:probe",
              );
              if (!capability)
                throw new Error(
                  `QA extension has no business capability: ${extension.descriptor.id}`,
                );
              const requestId = `run87:packaged-qa:${extension.descriptor.id}`;
              const receipt = await runtime.invoke(extension.descriptor.id, {
                requestId,
                protocolVersion: extension.descriptor.protocolVersion,
                channel: packagedProfile?.channel ?? "development",
                scope: options.scopeId,
                authorizationEpoch: 1,
                capability,
                payload: { packagedQa: true },
              });
              qaStartupReceipts.set(extension.descriptor.id, { ...receipt, requestId });
            }
            await drainPostObservationOutbox(runtime);
            // A prior cloud outage must not require an unrelated new provider request
            // before its already-authorized, durable aggregate is retried.
            await currentPostObservationOperations()?.retryContributionAggregates();
            extensionRuntimeRef.current = runtime;
            const postObservationDrainInterval = setInterval(() => {
              schedulePostObservationDrain(extensionRuntimeRef.current);
            }, 5_000);
            postObservationDrainInterval.unref?.();
            // Run 99 R24 / addendum 06: publish the durable operator advisory so an activated
            // pack can influence routing instead of only the transient replay candidate.
            startDurableRouteAdvisoryRefresh({
              getRuntime: () => extensionRuntimeRef.current,
              repoRoot: options.repoRoot,
              stateRoot: trackBStateRoot,
              runtimeStateRoot: options.runtimeStateRoot,
              channel: runtimeChannel,
              scopeId: options.scopeId,
            });
          },
        },
      );
      backend = packagedRuntime.backend;
      stopExtensionRuntimeWatchdog = startCliExtensionRuntimeWatchdog({
        getRuntime: () => extensionRuntimeRef.current,
        bootstrapState,
        expectedExtensionIds: TRACK_B_CANONICAL_EXTENSION_IDS,
        onFailure: failExtensionRuntime,
      });
    } else {
      backend = await createBackend();
      bootstrapState.status = "ready";
      delete bootstrapState.message;
    }
  } catch (error) {
    await failExtensionRuntime(error);
    console.error("runtime backend initialization failed", error);
  }
}
