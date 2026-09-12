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
  autoReplayExecutionFromCommandReceipt,
  startAutoReplayLoop,
} from "./track-b-auto-replay-runtime.js";
import { createTrackBOperations } from "./track-b-operations.js";
import {
  deriveAutomaticReplayCriteria,
  extractSourceOutputText,
  extractTaskInstructionText,
} from "./track-b-replay-evaluation-criteria.js";
import { createReplayLedger } from "./track-b-replay-ledger.js";
import {
  buildReplayPolicySet,
  decideReplayAdmission,
  hasRecordedToolResults,
  hasToolCalls,
  resolveReplayPolicySet,
  resolveReplayToolPolicy,
  selectReplayCandidates,
} from "./track-b-replay-policy.js";
import {
  TRACK_B_CANONICAL_EXTENSION_IDS,
  type TrackBExtensionClosure,
  assertProductionExtensionRuntimeReady,
  createOwnedTrackBSidecarSpec,
  createPackagedProductionRuntime,
  createProductionExtensionRuntime,
  createReplayIntentScheduler,
  createReplaySourceAttestation,
  createRouterReplayAdapter,
  createRun88RuntimeCorrelation,
  createRuntimeRequestCorrelationId,
  createSupervisedReplayEvaluationRequestId,
  buildReplayDispatchMessages,
  createTrackBPostObservationOutbox,
  digestTrackBSemanticEvaluationCriteria,
  evaluateProductionExtensionRuntimeReadiness,
  normalizeTrackBSemanticEvaluationCriteria,
  requireReplayRouterDecisionId,
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
    artifactRef: durableCaptureArtifactReference(
      capture,
      "routeDecisionArtifactId",
      `capture ${index} route decision`,
    ),
    outcomeRef: durableCaptureArrayArtifactReference(
      capture,
      "providerArtifactIds",
      0,
      `capture ${index} provider result`,
    ),
  }));
  assertDistinctDurableReferences(
    rolloutReferences.flatMap((references) => [
      references.evidenceRef,
      references.artifactRef,
      references.outcomeRef,
    ]),
    "rollout evidence, artifact, and outcome references",
  );

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
  assertDistinctDurableReferences(perCaseEvidenceRefs, "per-case evaluation evidence");
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
  return { evaluationReferences, rolloutReferences };
}

/**
 * Persist one small, reference-only artifact per evaluation case.  The
 * artifact-store extension is the authority that allocates the IDs; the CLI
 * only supplies links to already durable replay artifacts and never signs or
 * invents an evaluation proof.
 */
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
  readonly runPipeline?: typeof runTrackBShadowPipeline;
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
    // R5: the released comparability tuple names exactly one source and one
    // counterfactual candidate (Evaluation Core refuses a trial whose candidate is
    // not one of those two). The durable comparison therefore evaluates the primary
    // counterfactual; the remaining candidates stay recorded replay branches with
    // their own provenance instead of being forced into a tuple they do not fit.
    const evaluatedCounterfactuals = counterfactuals.slice(0, 1);
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
    return {
      evaluationJobId,
      comparisonGroupId,
      outcome,
      comparisonDigest: `sha256:${createHash("sha256").update(JSON.stringify(comparison)).digest("hex")}`,
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
>;

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
    authorizationNonceStorePath,
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

  server = await startBridgeServer(
    createCliServerOptions(
      {
        host: options.host,
        port: options.port,
        staticRoot,
        runtimeStateRoot: options.runtimeStateRoot,
        runtimeChannel: packagedProfile?.channel ?? "development",
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
      });
      const policySet = buildReplayPolicySet();
      const intervalMs = Number(process.env.ROLE_MODEL_AUTO_REPLAY_INTERVAL_MS ?? 30_000);
      if (!Number.isSafeInteger(intervalMs) || intervalMs < 1_000) return null;
      return startAutoReplayLoop({
        operations,
        ledger,
        policySet,
        configuredEndpointIds: endpoints,
        healthyEndpointIds: healthyEndpoints,
        intervalMs,
        executor: async ({ capture, candidates, reservationId }) => {
          const sourceCapture = (await operations.readLocalRouteCapture({
            requestId: capture.captureRef,
          })) as Record<string, unknown> | null;
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
          const response = await fetch(`http://127.0.0.1:${port}/api/role-model/track-b/replay`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              requestId: capture.captureRef,
              idempotencyKey: `auto:${capture.captureRef}:${reservationId}`,
              candidateEndpointIds: candidates,
              evaluationCriteria: derivedCriteria.criteria,
              budget: {
                maxCandidates: candidates.length,
                maxProviderCalls: candidates.length,
                maxCostMicros: 1_000_000,
                maxBytes: 8_388_608,
                deadlineMs: 120_000,
              },
            }),
          });
          if (!response.ok) {
            const failureText = await response.text().catch(() => "");
            return {
              terminal: false,
              branches: [],
              failureDetail: `replay endpoint HTTP ${response.status}: ${failureText.slice(0, 200)}`,
            };
          }
          // The receipt is authoritative: a job that reached `awaiting_evaluation`
          // produced branches but no comparison, so it stays retryable and the ledger
          // never counts it as a replayed counterfactual.
          return autoReplayExecutionFromCommandReceipt(await response.json());
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
          configuredCandidateEndpointIds: configuredEndpointIdsRef.current,
          ...(packagedReleaseId
            ? {
                expectedReleaseId: packagedReleaseId,
                run88Correlation: observation.run88Correlation as Record<string, unknown>,
              }
            : {}),
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
          const distinctReplayCandidates = selectReplayCandidates({
            configuredEndpointIds: candidateEndpointIds,
            sourceEndpointId: capturedSourceEndpointId,
          });
          const replayPolicySet = buildReplayPolicySet();
          const replayLedger = createReplayLedger({
            filePath: path.join(
              options.runtimeStateRoot,
              options.scopeId,
              "track-b-replay-ledger.json",
            ),
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
            (candidate) => candidate.endpointId !== sourceEndpointId,
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
            completeEvaluation: createSupervisedReplayEvaluationCompleter({
              runtime,
              operations,
              requestId,
              channel,
              scope: options.scopeId,
              captureScope,
              sourceCapture,
              sourceOutput,
              sourceEndpointId,
              sourceModelId,
              counterfactualPackages,
              getDispatched: (endpointId) => {
                const dispatch = dispatched.get(endpointId);
                return dispatch
                  ? {
                      execution: dispatch.execution as unknown as Readonly<Record<string, unknown>>,
                      replayRequestId: dispatch.replayRequestId,
                    }
                  : undefined;
              },
              evaluationCriteria: evaluationCriteria as unknown as Readonly<
                Record<string, unknown>
              >,
              evaluationCriteriaDigest,
            }),
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
                await postObservationOutbox.enqueue(correlatedObservation);
                const runtime = extensionRuntimeRef.current;
                if (!runtime) return { status: "queued_for_extension_runtime" };
                await drainPostObservationOutbox(runtime);
                return { status: "processed" };
              },
            }
          : {}),
      });
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
      const trackBStateRoot = path.join(options.runtimeStateRoot, options.scopeId, "track-b");
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
