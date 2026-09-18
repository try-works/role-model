import { spawn } from "node:child_process";
import { createHash, createPublicKey, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";

import type { NormalizedCatalog } from "@role-model-router/catalog";
import type { EndpointRegistryResult } from "@role-model-router/endpoint-registry";

import {
  type DevelopmentVerificationAuthorization,
  negotiateDevelopmentVerificationCapability,
  parseDevelopmentVerificationTrustMaterial,
} from "./development-verification.js";
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
  createSupervisedReplayEvaluationResumeStore,
  resolveSupervisedReplayEvaluationResumePath,
  resumePendingSupervisedReplayEvaluations,
} from "./supervised-replay-evaluation-resume.js";
import {
  buildAutoReplayIdempotencyKey,
  isReplayJobLeasedFailure,
  resolveAutoReplayDeadlineMaxMs,
  resolveAutoReplayDeadlineMs,
  resolveAutoReplayDeadlinePerCandidateMs,
  resolveAutoReplayTickBudgetMs,
  retryLeasedReplayDispatch,
} from "./track-b-auto-replay.js";
import {
  createRouterPairwiseJudge,
  resolveEvalJudgeEndpointId,
} from "./track-b-shadow-judge-dispatch.js";
import { isPairwiseJudgeMode, type TrackBPairwiseJudge } from "./track-b-shadow-judge.js";
import {
  autoReplayExecutionFromCommandReceipt,
  startAutoReplayLoop,
} from "./track-b-auto-replay-runtime.js";
import { createTrackBOperations } from "./track-b-operations.js";
import {
  deriveAutomaticReplayCriteria,
  extractSourceOutputText,
  extractTaskInstructionText,
} from "./track-b-replay-evaluation-criteria.js";
import { createReplayLedger, resolveReplayLedgerLimits } from "./track-b-replay-ledger.js";
import { createJudgeConsistencyLedger } from "./track-b-judge-consistency.js";
import {
  DEFAULT_POSITION_CONSISTENCY_FLOOR,
  evaluateJudgePositionConsistency,
} from "./track-b-judge-consistency.js";
import {
  buildReplayPolicySet,
  decideReplayAdmission,
  hasRecordedToolResults,
  hasToolCalls,
  resolveReplayPolicySet,
  resolveReplayToolPolicy,
  selectReplayCandidates,
} from "./track-b-replay-policy.js";
// Run 98 addendum 34 S1: coverage-driven pair planning for the comparison graph.
import {
  createPairCoverageLedger,
  pairKey,
  planPairComparisons,
} from "./track-b-pair-coverage.js";
import {
  readLearningPolicyFile,
  resolveLearningPolicyStateRoot,
} from "./learning-policy-file.js";
import {
  TRACK_B_CANONICAL_EXTENSION_IDS,
  type TrackBExtensionClosure,
  assertProductionExtensionRuntimeReady,
  createOwnedTrackBSidecarSpec,
  createPackagedProductionRuntime,
  createProductionExtensionRuntime,
  createReplayIntentScheduler,
  createReplaySourceAttestation,
  createReplayAuthorizationNonceStore,
  createRouterReplayAdapter,
  createRun88RuntimeCorrelation,
  createRuntimeRequestCorrelationId,
  classifyReplayTerminalizationFailure,
  createSingleFlightBackgroundDrain,
  createSupervisedReplayEvaluationRequestId,
  buildReplayDispatchMessages,
  createTrackBPostObservationOutbox,
  digestTrackBSemanticEvaluationCriteria,
  evaluateProductionExtensionRuntimeReadiness,
  normalizeTrackBSemanticEvaluationCriteria,
  readTrackBAdvisoryMeasurement,
  readTrackBRouteAdvisorySourceFromRuntime,
  rememberTrackBDurableRouteAdvisory,
  decodeExternalizedOperatorReadback,
requireReplayRouterDecisionId,
resolveManagedArtifactKeyFiles,
resolveMaxCounterfactualArms,
runSupervisedReplay,
  runTrackBPostObservation,
  runTrackBPostObservationWithContribution,
  runTrackBShadowPipeline,
  trackBDistributionRequiresSQLiteMaintenance,
  validateProductionExtensionSet,
  validateRecoveredReplayCapture,
  validateRun88ProviderResponseObservation,
  verifyTrackBExtensionClosureAfterRestart,
} from "./track-b-runtime.js";

const DURABLE_ARTIFACT_ID = /^[a-f0-9]{64}$/u;

/**
 * The automatic replay loop is created inside `main()` once the runtime backend
 * exists, but the bridge server options are built by a module-level factory. This
 * holder is the single shared reference for status and pause/resume control.
 */
let activeAutoReplayLoop: ReturnType<typeof startAutoReplayLoop> | null = null;
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
      const tool = tools[index] && typeof tools[index] === "object" && !Array.isArray(tools[index])
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
  return events
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
    .slice(0, 128);
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
  while (bounded.length > 0 && Buffer.byteLength(bounded, "utf8") > MAX_EVALUATION_CASE_SUBJECT_BYTES) {
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
  }>;
  readonly runPipeline?: typeof runTrackBShadowPipeline;
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
    const counterfactuals = await Promise.all(
      input.counterfactualPackages.map(async (candidate) => {
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
        const output =
          (typeof dispatchedExecution?.outputText === "string"
            ? dispatchedExecution.outputText
            : null) ??
          (typeof recoveredResponse?.content === "string" ? recoveredResponse.content : null) ??
          (typeof branchCapture.outputText === "string" ? branchCapture.outputText : null);
        if (!output) {
          throw new Error("durable replay evaluation is missing counterfactual output evidence");
        }
        return {
          candidate,
          replayRequestId,
          output,
          outputSha256: createHash("sha256").update(output, "utf8").digest("hex"),
          branchCapture,
        };
      }),
    );
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
          index === 0
            ? input.sourceOutput
            : evaluatedCounterfactuals[index - 1]?.output ?? "",
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
    const boundedMessageArtifactRefs = sourceMessageArtifactRefs.slice(
      0,
      MAX_REFERENCE_FACT_REFS,
    );
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
      counterfactualCaptures: evaluatedCounterfactuals.map(
        ({ branchCapture }) => branchCapture,
      ),
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
      // (`addendum 19 S33`), so it travels with the replay.
      ...(typeof input.sourceCapture.taskTypeId === "string" && input.sourceCapture.taskTypeId.trim()
        ? { taskTypeId: input.sourceCapture.taskTypeId.trim() }
        : {}),
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
    const comparison = evaluated.evaluation as Record<string, unknown>;
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
      throw new Error("durable replay evaluation did not finalize a valid comparison");
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
    return {
      evaluationJobId,
      comparisonGroupId,
      outcome,
      comparisonDigest: `sha256:${createHash("sha256").update(JSON.stringify(comparison)).digest("hex")}`,
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
  | "engageLearningKillSwitch"
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
    readLearningPolicy: (query: Readonly<Record<string, string>> = {}) =>
      operations.readLearningPolicy(query),
    setLearningPolicy: (body: Record<string, unknown>) => operations.setLearningPolicy(body),
    rollbackLearningPolicy: (body: Record<string, unknown>) =>
      operations.rollbackLearningPolicy(body),
    activateLearningPack: (body: Record<string, unknown>) =>
      operations.activateLearningPack(body),
    rollbackLearningPack: (body: Record<string, unknown>) =>
      operations.rollbackLearningPack(body),
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
  | "engageLearningKillSwitch"
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

export function resolveCliFixtureRoot(_repoRoot: string, fixtureRoot?: string): string | undefined {
  return fixtureRoot?.trim() || undefined;
}

function isCliBackendResolver(value: CliBackend | CliBackendResolver): value is CliBackendResolver {
  return typeof (value as CliBackendResolver).getBackend === "function";
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
    const evidenceMaxAgeMs =
      (snapshot?.effective.evidenceMaxAgeDays ?? 30) * 24 * 60 * 60 * 1_000;
    const advisory = await readTrackBRouteAdvisorySourceFromRuntime({
      runtime: runtime as unknown as Parameters<
        typeof readTrackBRouteAdvisorySourceFromRuntime
      >[0]["runtime"],
      channel: options.channel,
      scope: options.scopeId,
      stateRoot: options.runtimeStateRoot,
      nowMs,
      evidenceMaxAgeMs,
      // Run 99 R33 D12: the scheduled revalidation interval is enforced by the advisory source.
      revalidationIntervalMs:
        (snapshot?.effective.revalidationIntervalDays ?? 7) * 24 * 60 * 60 * 1_000,
      requestId: `route-advisory:${options.scopeId}:${nowMs}`,
    });
    rememberTrackBDurableRouteAdvisory({
      channel: options.channel,
      scope: options.scopeId,
      advisory,
      nowMs,
    });
    const published = `${advisory.advisoryState}\u0000${advisory.reason ?? ""}\u0000${advisory.preferredRoutePackage ?? ""}\u0000${advisory.confidence}\u0000${advisory.cohortPercent}`;
    if (published !== lastPublished) {
      lastPublished = published;
      console.error(
        `[run99] durable route advisory published: state=${advisory.advisoryState} reason=${advisory.reason ?? "none"} package=${advisory.preferredRoutePackage ?? "none"} confidence=${advisory.confidence} cohort=${advisory.cohortPercent} stage=${stage}`,
      );
    }
  };
  const report = (error: unknown): void => {
    console.error(
      `[run99] durable route advisory degraded: ${String(
        (error as { message?: unknown })?.message ?? error,
      ).slice(0, 200)}`,
    );
  };
  const timer = setInterval(() => {
    void refresh().catch(report);
  }, options.intervalMs ?? 15_000);
  // A background refresh must never hold the process open.
  (timer as { unref?: () => void }).unref?.();
  void refresh().catch(report);
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
    ...(options.anonymousLearningReads ? { anonymousLearningReads: options.anonymousLearningReads } : {}),
    readLearningActivity: bindBackendMethod(
      "readLearningActivity",
    ) as StartBridgeServerOptions["readLearningActivity"],
    readLearningHistory: bindBackendMethod(
      "readLearningHistory",
    ) as StartBridgeServerOptions["readLearningHistory"],
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

function createProductionReplayDispatchLedger(filePath: string) {
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
  const authorizationNonceStore = createReplayAuthorizationNonceStore(
    authorizationNonceStorePath,
  );
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
          mayReauthorize: (identity: string) => !dispatchLedger.hasCompleted(identity),
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
        | (() => Promise<{ resumed: number; completed: number; failed: number; remaining: number }>)
        | null;
    } = { current: null };
    const startHostAutoReplayLoop = (
      endpoints: () => readonly string[],
      healthyEndpoints: () => Promise<readonly string[] | null>,
    ): ReturnType<typeof startAutoReplayLoop> | null => {
      const operations = postObservationOperations;
      const channel = packagedProfile?.channel ?? "development";
      if (!operations || channel === "production") return null;
      const port = options.port;
      if (!Number.isInteger(port) || port <= 0) return null;
      const ledger = createReplayLedger({
        filePath: path.join(
          options.runtimeStateRoot,
          options.scopeId,
          "track-b-replay-ledger.json",
        ),
        limits: resolveReplayLedgerLimits(),
      });
      const policySet = buildReplayPolicySet();
      const intervalMs = Number(process.env.ROLE_MODEL_AUTO_REPLAY_INTERVAL_MS ?? 30_000);
      if (!Number.isSafeInteger(intervalMs) || intervalMs < 1_000) return null;
      // The scope of the durable captures (and therefore of the replay jobs they
      // produce). It is learned from the capture the executor reads each tick so the
      // expiration sweep targets the same authority the jobs were created under.
      let lastReplayCaptureScope: string | null = null;
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
            const result = await runtime.invoke("replay-core", {
              requestId: `replay-expire-stale:${Date.now()}`,
              sessionId: `replay-expire-stale:${options.scopeId}`,
              protocolVersion: "1.1.0",
              channel,
              // Durable replay jobs are scoped to the *capture* scope, which is not
              // necessarily the operator scope id (live: `runtime:<hash>`). Sweeping with
              // the operator scope matched nothing, so the sweep uses the scope of the
              // capture the producer most recently read.
              scope: lastReplayCaptureScope ?? options.scopeId,
              authorizationEpoch: 1,
              capability: "replay:expire-stale-jobs",
              value: { ...input, scope: lastReplayCaptureScope ?? options.scopeId, channel },
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
            return { resumed: 0, completed: 0, failed: 0, remaining: 0 };
          }
          return resumeEvaluationsRef.current();
        },
      };
      return startAutoReplayLoop({
        operations: sweepOperations,
        ledger,
        policySet,
        configuredEndpointIds: endpoints,
        healthyEndpointIds: healthyEndpoints,
        intervalMs,
        // Run 98 addendum 04 follow-on: bound one tick's wall clock so a tick made of several
        // minutes-long replays leaves the remaining captures for the next tick. Operators can tune it
        // with ROLE_MODEL_AUTO_REPLAY_TICK_BUDGET_MS; 0 disables the bound.
        ...(resolveAutoReplayTickBudgetMs(process.env) === null
          ? {}
          : { tickBudgetMs: resolveAutoReplayTickBudgetMs(process.env) as number }),
        executor: async ({ capture, candidates, reservationId }) => {
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
                candidateEndpointIds: candidates,
              }),
              candidateEndpointIds: candidates,
              evaluationCriteria: derivedCriteria.criteria,
              budget: {
                maxCandidates: candidates.length,
                maxProviderCalls: candidates.length,
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
              failure.status === 0 || isReplayJobLeasedFailure(failure.status, failure.body),
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
                    signal: AbortSignal.timeout(Math.min(replayDeadlineMs + 60_000, 1_800_000)),
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
          return autoReplayExecutionFromCommandReceipt(
            decodeExternalizedOperatorReadback({
              stateRoot: options.runtimeStateRoot,
              scopeId: options.scopeId,
              value: leasedDispatch.value,
            }),
          );
        },
      });
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
        // Run 98 addendum 34 S1: the arm bound is resolved *here*, in the process that reads the operator's
        // environment, and travels with the work item. The sidecar that consumes it is a child process with
        // its own environment, so a bound resolved only there ignored the override (measured on v216: three
        // arms with the bound set to four).
        configuredCandidateEndpointIds: configuredEndpointIdsRef.current.slice(
          0,
          resolveMaxCounterfactualArms(),
        ),
          // Run 98 R4: durable advisory observations (state distribution + influence rate).
          advisoryObservationLedgerPath: path.join(
            options.runtimeStateRoot,
            options.scopeId,
            "track-b",
            "advisory-observations.json",
          ),
          ...(packagedReleaseId
            ? {
                expectedReleaseId: resolvePostObservationReleaseId({
                  packagedReleaseId,
                  correlationReleaseId:
                    observation.run88Correlation &&
                    typeof observation.run88Correlation === "object"
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
          // Run 98 addendum 30 S1: resolve the designated judge once for this capture — policy first
          // (operator-editable), environment override second, and an unset value means no judge at
          // all rather than a candidate standing in for one.
          const evalJudgeEndpointId = resolveEvalJudgeEndpointId({
            policyValue: readLearningPolicyFile({
              repoRoot: options.repoRoot,
              stateRoot: resolveLearningPolicyStateRoot({
                runtimeStateRoot: options.runtimeStateRoot,
                scopeId: options.scopeId,
              }),
              channel: packagedProfile?.channel ?? "development",
              scopeId: options.scopeId,
            })?.effective.judgeEndpointId,
            envValue: process.env.ROLE_MODEL_EVAL_JUDGE_ENDPOINT,
          });
          const distinctReplayCandidates = selectReplayCandidates({
            configuredEndpointIds: candidateEndpointIds,
            sourceEndpointId: capturedSourceEndpointId,
            // Run 98 addendum 33 S3: rotate the counterfactual per request so the comparison graph gains
            // edges across captures rather than repeating one pair (the live store's 465-of-465 star).
            rotationKey: requestId,
            // Run 98 addendum 30 S1/S2 (`guidance/11` `judgePolicy.excludeFromLiveEvaluation`): the
            // judge is a designated client and is never offered as a scored candidate, so a battle
            // cannot contain the endpoint that judges it.
            ...(evalJudgeEndpointId ? { excludedEndpointIds: [evalJudgeEndpointId] } : {}),
          });
          const replayPolicySet = buildReplayPolicySet();
          const replayLedger = createReplayLedger({
            filePath: path.join(
              options.runtimeStateRoot,
              options.scopeId,
              "track-b-replay-ledger.json",
            ),
            limits: resolveReplayLedgerLimits(),
          });
          const replayLedgerStatus = replayLedger.status();
          const admission = decideReplayAdmission({
            channelReplayEnabled: true,
            captureAvailable: true,
            scopeAuthorized: true,
            authorizationEpochValid: true,
            retentionReplayable: true,
            privacyReplayable: true,
            distinctCandidateCount: distinctReplayCandidates.length,
            budgetAvailable:
              replayLedgerStatus.dispatches + replayLedgerStatus.reservedDispatches <
              replayLedgerStatus.dispatchLimit,
            alreadyProcessed: replayLedger.hasTerminalCounterfactual(
              requestId,
              replayPolicySet.policySetDigest,
            ),
            sourceIsReplayProduced:
              sourceReplay !== null && sourceReplay.parentTraceId !== undefined,
            policyIdsResolvable: resolveReplayPolicySet(replayPolicySet).ok,
            dependenciesAvailable: true,
          });
          if (!admission.admitted) {
            throw new Error(`${admission.code}: ${admission.detail}`);
          }
          const { toolPolicy: resolvedReplayToolPolicy, reason: replayToolPolicyReason } =
            resolveReplayToolPolicy({
              hasRecordedToolResults: hasRecordedToolResults(sourceCapture),
              hasToolCalls: hasToolCalls(sourceCapture),
            });
          const endpoints = created.effectiveRegistry.endpoints;
          const candidatePackages = candidateEndpointIds.map((endpointId) => {
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
          const counterfactualPackages = candidatePackages.filter(
            (candidate) =>
              candidate.endpointId !== sourceEndpointId &&
              // Run 98 addendum 30 S2: the designated judge is never a scored candidate, whatever
              // the dispatch list said.
              (!evalJudgeEndpointId || candidate.endpointId !== evalJudgeEndpointId),
          );
          if (counterfactualPackages.length === 0) {
            throw new Error(
              "supervised replay requires an eligible counterfactual distinct from the source endpoint",
            );
          }
          const channel = packagedProfile?.channel ?? "development";
          // Bind the replay source to the capture's own runtime scope: the durable
          // capture records the private runtime scope, which is not necessarily the
          // host's operator scope.
          const captureScope =
            typeof sourceCapture.scope === "string" && sourceCapture.scope.trim()
              ? sourceCapture.scope.trim()
              : options.scopeId;
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
                    ...candidateEndpointIds,
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
              // R13/R7: every capture this attempt writes must be attempt-scoped. The
              // durable replay job identity (not the per-tick idempotency key) makes a
              // retry inside one attempt idempotent while a later attempt of the same
              // source capture appends new bytes instead of colliding with the previous
              // attempt's immutable capture under the same request id.
              const replayJobId =
                typeof envelope.replayJobId === "string" ? envelope.replayJobId : "";
              const replayAttemptToken = createHash("sha256")
                .update(`${replayJobId}\u0000${candidateEndpointId}`)
                .digest("hex")
                .slice(0, 16);
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
              const branchRequestId = `replay-${requestId}-${createHash("sha256").update(candidateEndpointId).digest("hex").slice(0, 16)}-prepared-${replayAttemptToken}`;
              // A candidate without a reasoning effort is captured with `none`, not
              // `variant`: the durable capture contract couples a null effort to the
              // `none` source, and a mixed pair is rejected at the capture boundary.
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
              return { branchRootRef: branch.rootArtifactId };
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
                const failureRequestId = `replay-${requestId}-${createHash("sha256")
                  .update(candidateEndpointId)
                  .digest("hex")
                  .slice(0, 16)}-failure`;
                const failureEffort =
                  typeof candidate.reasoningEffort === "string" && candidate.reasoningEffort
                    ? { reasoningEffort: candidate.reasoningEffort, effortSource: "variant" as const }
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
                return { branchRootRef: failureBranch.rootArtifactId };
              }
              const dispatch = dispatched.get(candidateEndpointId);
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
                typeof resultCandidateReasoningEffort === "string" &&
                resultCandidateReasoningEffort
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
              return { branchRootRef: branch.rootArtifactId };
            },
            handoffEvaluation: async ({ replayJobId }) => {
              const evaluationJobId = `evaluation-replay-${createHash("sha256").update(String(replayJobId)).digest("hex").slice(0, 20)}`;
              return { evaluationJobId };
            },
            completeEvaluation: (() => {
              const evaluationCompleter = buildSupervisedReplayEvaluationCompleter({
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
                evaluationCriteria: evaluationCriteria as unknown as Readonly<Record<string, unknown>>,
                evaluationCriteriaDigest,
                learningPolicySnapshot,
                replayLedger,
                replayPolicySet,
                getDispatched: (endpointId: string) => {
                  const dispatch = dispatched.get(endpointId);
                  return dispatch
                    ? {
                        execution: dispatch.execution as unknown as Readonly<Record<string, unknown>>,
                        replayRequestId: dispatch.replayRequestId,
                      }
                    : undefined;
                },
                currentLedgerReservationId: () => ledgerReservationId,
              });
              // Run 99 R33: the handoff is recorded before the completion runs, so a restart in
              // between leaves a retryable resume entry for the sweep instead of a stranded job.
              return async (request: Readonly<Record<string, unknown>>) => {
                const replayJobId = String(request.replayJobId ?? "");
                const evaluationJobId = String(request.evaluationJobId ?? "");
                const sourceCaptureRequestId =
                  typeof sourceCapture.requestId === "string" ? sourceCapture.requestId : "";
                if (replayJobId && evaluationJobId && sourceCaptureRequestId) {
                  try {
                    evaluationResumeStore.record({
                      schemaVersion: "role-model.supervised-replay-evaluation-resume.v1",
                      replayJobId,
                      evaluationJobId,
                      requestId,
                      sourceCaptureRequestId,
                      sourceEndpointId,
                      sourceModelId,
                      counterfactualPackages: counterfactualPackages.map((candidate) => ({
                        endpointId: candidate.endpointId,
                        modelId: candidate.modelId,
                        reasoningEffort: candidate.reasoningEffort ?? null,
                      })),
                      evaluationCriteria: evaluationCriteria as unknown as Readonly<
                        Record<string, unknown>
                      >,
                      evaluationCriteriaDigest,
                      // Run 98 addendum 34 S5: the durable replay job is bound to this scope, so
                      // terminalizing it later needs the same value (see `onAbandoned`).
                      scope:
                        typeof request.scope === "string" && request.scope.trim()
                          ? request.scope.trim()
                          : null,
                      recordedAtMs: Date.now(),
                      attempts: 0,
                      resolvedAtMs: null,
                      outcome: null,
                      lastError: null,
                    });
                  } catch (error) {
                    console.error(
                      `[run99] evaluation resume entry declined:${requestId} ${String(
                        (error as { message?: unknown })?.message ?? error,
                      ).slice(0, 200)}`,
                    );
                  }
                }
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
            result.dispatches && typeof result.dispatches === "object" && !Array.isArray(result.dispatches)
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
              dispatch && typeof dispatch.result === "object" && dispatch.result && !Array.isArray(dispatch.result)
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
                dispatch.receipt && typeof dispatch.receipt === "object" && !Array.isArray(dispatch.receipt)
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
      });
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
        readonly replayLedger: ReturnType<typeof createReplayLedger>;
        readonly replayPolicySet: ReturnType<typeof buildReplayPolicySet>;
        readonly getDispatched: (endpointId: string) => unknown;
        readonly currentLedgerReservationId: () => string | null;
        /** Run 98 addendum 33 S2: the judge's measured position consistency, resolved by the caller. */
        readonly judgeConsistency?: Readonly<Record<string, unknown>> | null;
      }) => {
        // Run 98 addendum 33 S2: the judge's measured position consistency, straight from the durable
        // ledger, with the operator's floor applied. The completer passes it into the pipeline so the
        // promotion gate sees the measurement the ledger records.
        const judgeConsistency = (() => {
          const judgeEndpointId = resolveEvalJudgeEndpointId({
            policyValue: input.learningPolicySnapshot?.effective.judgeEndpointId,
            envValue: process.env.ROLE_MODEL_EVAL_JUDGE_ENDPOINT,
          });
          if (!judgeEndpointId) return null;
          const row = judgeConsistencyLedger.summary(judgeEndpointId)[0] ?? null;
          if (!row) return null;
          const floor =
            input.learningPolicySnapshot?.effective.judgePositionConsistencyFloor ??
            DEFAULT_POSITION_CONSISTENCY_FLOOR;
          return { ...row, ...evaluateJudgePositionConsistency({ row, floor }) };
        })();
        return createSupervisedReplayEvaluationCompleter({
          ...(judgeConsistency ? { judgeConsistency } : {}),
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
            // Run 98 addendum 30 S1: the judge is the designated client. When the designation is
            // unset there is no judge, and when it names an endpoint that is not dispatchable — or
            // that is part of this pair — the factory returns undefined and the comparison records
            // judge missingness instead of scoring a candidate with itself.
            judgeEndpointId: resolveEvalJudgeEndpointId({
              policyValue: input.learningPolicySnapshot?.effective.judgeEndpointId,
              envValue: process.env.ROLE_MODEL_EVAL_JUDGE_ENDPOINT,
            }),
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
              if (envValue === "balanced" || envValue === "strict_consistency" || envValue === "fails_closed") {
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
                  judgeEndpointId:
                    resolveEvalJudgeEndpointId({
                      policyValue: input.learningPolicySnapshot?.effective.judgeEndpointId,
                      envValue: process.env.ROLE_MODEL_EVAL_JUDGE_ENDPOINT,
                    }) ?? "",
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
                    input.learningPolicySnapshot.effective.evidenceMaxAgeDays * 24 * 60 * 60 * 1_000,
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
      const resumePendingEvaluations = async () => {
        const runtime = extensionRuntimeRef.current;
        const operations = currentPostObservationOperations();
        if (!runtime || !operations) {
          return { resumed: 0, completed: 0, failed: 0, remaining: 0 };
        }
        const channel = packagedProfile?.channel ?? "development";
        return resumePendingSupervisedReplayEvaluations({
          store: evaluationResumeStore,
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
            if (!storedJobId) {
              // Nothing durable to finalize: the evaluation job never reached its create step, so the
              // sweep reports it instead of manufacturing a comparison from thin air.
              throw new Error(
                `durable evaluation job ${entry.evaluationJobId} is unavailable for resume`,
              );
            }
            const sourceCapture = (await operations.readLocalRouteCapture({
              requestId: entry.sourceCaptureRequestId,
            })) as Record<string, unknown> | null;
            if (!sourceCapture || typeof sourceCapture !== "object") {
              throw new Error(
                `durable replay evaluation is missing its source capture ${entry.sourceCaptureRequestId}`,
              );
            }
            const sourceOutput = extractSourceOutputText(sourceCapture);
            if (!sourceOutput) {
              throw new Error("durable replay evaluation is missing its source output evidence");
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
            for (const candidate of entry.counterfactualPackages) {
              const replayRequestId = `replay-${entry.requestId}-${createHash("sha256")
                .update(`${entry.replayJobId}\u0000${candidate.endpointId}`)
                .digest("hex")
                .slice(0, 16)}`;
              const branchCapture = (await operations.readLocalRouteCapture({
                requestId: `${replayRequestId}-branch`,
              })) as Record<string, unknown> | null;
              if (!branchCapture || typeof branchCapture !== "object") continue;
              const response =
                branchCapture.response && typeof branchCapture.response === "object"
                  ? (branchCapture.response as Record<string, unknown>)
                  : null;
              const outputText =
                (typeof response?.content === "string" ? response.content : null) ??
                (typeof branchCapture.outputText === "string" ? branchCapture.outputText : null);
              if (!outputText) continue;
              counterfactualPackages.push({
                endpointId: candidate.endpointId,
                modelId:
                  typeof branchCapture.modelId === "string" && branchCapture.modelId.trim()
                    ? branchCapture.modelId.trim()
                    : candidate.modelId,
                reasoningEffort:
                  typeof branchCapture.reasoningEffort === "string"
                    ? branchCapture.reasoningEffort
                    : candidate.reasoningEffort,
              });
              dispatched.set(candidate.endpointId, {
                replayRequestId,
                execution: {
                  routingDecisionId: String(branchCapture.routingDecisionId ?? ""),
                  outputText,
                },
              });
            }
            if (dispatched.size === 0) {
              throw new Error(
                "durable replay evaluation has no recorded counterfactual branch to evaluate",
              );
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
              evaluationCriteria:
                effectiveCriteria as unknown as Readonly<Record<string, unknown>>,
              evaluationCriteriaDigest:
                digestTrackBSemanticEvaluationCriteria(effectiveCriteria),
              learningPolicySnapshot: readEvaluationLearningPolicySnapshot(),
              // A resumed completion performs no candidate dispatch, so its judge has no live
              // reservation to charge.
              replayLedger: createReplayLedger({
                filePath: path.join(
                  options.runtimeStateRoot,
                  options.scopeId,
                  "track-b-replay-ledger.json",
                ),
                limits: resolveReplayLedgerLimits(),
              }),
              replayPolicySet: buildReplayPolicySet(),
              getDispatched: (endpointId: string) => dispatched.get(endpointId),
              currentLedgerReservationId: () => null,
            });
            const completedEntry = (await completer({
              replayJobId: entry.replayJobId,
              evaluationJobId: entry.evaluationJobId,
              replayJob: null,
              resultBranches: [],
            })) as Readonly<Record<string, unknown>>;
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
            const reason = String((error as { message?: unknown })?.message ?? error ?? "unknown").slice(0, 360);
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
                  if (!/scope binding mismatch/u.test(String((scopeError as { message?: unknown })?.message ?? scopeError))) {
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
          },
        });
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
            if (byPriorVersion && typeof byPriorVersion === "object" && !Array.isArray(byPriorVersion)) {
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
                meanBefore:
                  bucket.beforeCount > 0 ? bucket.beforeSum / bucket.beforeCount : null,
                meanAfter: bucket.afterCount > 0 ? bucket.afterSum / bucket.afterCount : null,
              },
            ]),
          ),
          ...((() => {
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
          })()),
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
      );
      configuredEndpointIdsRef.current = created.effectiveRegistry.endpoints.map(
        (endpoint) => endpoint.identity.endpoint_id,
      );
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
