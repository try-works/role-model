import type {
  FinalizedRouteChallenge, RouteChallengeReadRequest,
  RouteDispatchEvidence, RouteDispatchEvidenceReadRequest, PendingRouteDispatch, PendingRouteDispatchReadRequest,
} from "./track-b-auto-replay-runtime.js";
import { captureRefFromReplayJob, resolveDurableReplayJobScope } from "./supervised-replay-handoff-recovery.js";
import { existsSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { resolveSqliteMemoryLocation } from "@role-model-router/sqlite-memory";
import type { AutoReplayCapture } from "./track-b-auto-replay.js";
import { hasRecordedToolResults, readReplayRequestRequirements, isBenchmarkReplaySourceRef, isSyntheticProbeSourceClass } from "./track-b-replay-policy.js";

/** Transport must bind authenticated runtime envelopes, correct worker state root, and decode transfers. */
export type RouteChallengeEvidenceInvoke = (
  extensionId: string, capability: string, value: Record<string, unknown>,
) => Promise<unknown>;
type Row = Record<string, unknown>;
const row = (v: unknown): Row | null => v !== null && typeof v === "object" && !Array.isArray(v) ? v as Row : null;
const text = (v: unknown): string | null => typeof v === "string" && v.length > 0 && v === v.trim() ? v : null;
const confidence = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1;
const time = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v > 0;
function canonical(v: unknown): string {
  if (Array.isArray(v)) return "[" + v.map(canonical).join(",") + "]";
  const object = row(v);
  return object ? "{" + Object.keys(object).sort().map(key => JSON.stringify(key) + ":" + canonical(object[key])).join(",") + "}" : JSON.stringify(v) ?? "null";
}

/** A complete keyset walk, not a capped legacy array mistaken for a complete census. */
async function groups(invoke: RouteChallengeEvidenceInvoke, limit: number): Promise<Row[]> {
  const records: Row[] = [], cursors = new Set<string>();
  let cursor: string | undefined;
  for (let page = 0; page < 128; page++) {
    const value = row(await invoke("evaluation-core", "evaluation:list-groups", { page: true, limit, ...(cursor ? { cursor } : {}) }));
    if (!value || !Array.isArray(value.groups) || typeof value.hasMore !== "boolean") throw new Error("comparison page unavailable");
    for (const entry of value.groups) {
      const record = row(entry);
      if (!record) throw new Error("malformed comparison page");
      records.push(record);
    }
    if (value.hasMore === false) {
      if (value.nextCursor != null) throw new Error("inconsistent comparison cursor");
      return records;
    }
    const next = text(value.nextCursor);
    if (!next || cursors.has(next)) throw new Error("comparison cursor unavailable");
    cursors.add(next); cursor = next;
  }
  throw new Error("comparison page budget exhausted");
}

/** Known producer derivation only: holdout replay:<jobId>:<case> -> replay:job -> decision-<captureRef>. */
function replayIdForGroup(group: Row): string | null {
  const ids = row(group.holdout)?.caseIds;
  if (!Array.isArray(ids) || ids.length < 2) return null;
  const replayIds = ids.map(id => typeof id === "string" ? /^replay:([^:]+):[^:]+$/.exec(id)?.[1] ?? null : null);
  return replayIds.every(id => id !== null && id === replayIds[0]) ? replayIds[0] : null;
}

async function project(listed: Row, request: RouteDispatchEvidenceReadRequest, invoke: RouteChallengeEvidenceInvoke): Promise<RouteDispatchEvidence | null> {
  const groupId = text(listed.groupId), result = row(listed.result), proof = row(listed.comparability);
  // Time belongs to the authenticated LIST sibling. Never infer it from result_json, group id, or clock.
  if (!groupId || listed.status !== "finalized" || !time(listed.createdAtMs) || !result || !proof ||
      proof.roleId !== request.roleId || proof.taskTypeId !== request.taskTypeId ||
      (request.sinceMs !== undefined && listed.createdAtMs < request.sinceMs)) return null;
  const source = text(proof.sourceCandidateRef), candidate = text(proof.counterfactualCandidateRef);
  if (!source || !candidate || source === candidate || ![source, candidate].includes(request.endpointId)) return null;
  const actual = row(await invoke("evaluation-core", "evaluation:read-comparison-group", { groupId }));
  if (!actual || actual.groupId !== groupId || actual.status !== "finalized" || canonical(actual) !== canonical(result) || canonical(actual.comparability) !== canonical(proof)) return null;
  if (actual.outcome !== "source" && actual.outcome !== "candidate" && actual.outcome !== "tie") return null;
  if (actual.validityIssues !== undefined && (!Array.isArray(actual.validityIssues) || actual.validityIssues.length > 0)) return null;
  const effort = proof.effortComparability;
  if (!Array.isArray(effort) || effort.length !== 1) return null;
  const arm = row(effort[0]);
  if (!arm || arm.endpointId !== candidate || arm.comparability !== "matched" ||
      !text(arm.modelId) || !text(arm.sourceModelId) || !text(arm.reasoningEffort) ||
      arm.reasoningEffort !== arm.sourceReasoningEffort) return null;
  if (!Array.isArray(actual.members) || actual.members.length !== 2 || !Array.isArray(actual.trialIds) || actual.trialIds.length !== 2) return null;
  const members = actual.members.map(row);
  if (members.some(member => !member || !text(member.trialId) || member.status !== "scored" || !confidence(member.confidence))) return null;
  const sourceMember = members.find(member => member?.candidateRef === source && member.role === "source");
  const candidateMember = members.find(member => member?.candidateRef === candidate && member.role === "counterfactual");
  if (!sourceMember || !candidateMember || sourceMember.trialId === candidateMember.trialId ||
      !actual.trialIds.includes(sourceMember.trialId) || !actual.trialIds.includes(candidateMember.trialId)) return null;
  let winnerEndpointId: string | null = null, judgeConfidence: number;
  if (actual.outcome === "tie") {
    if (actual.winnerTrialId != null || sourceMember.disposition !== "tie" || candidateMember.disposition !== "tie") return null;
    judgeConfidence = ((sourceMember.confidence as number) + (candidateMember.confidence as number)) / 2;
  } else {
    const winner = actual.outcome === "source" ? sourceMember : candidateMember;
    const loser = actual.outcome === "source" ? candidateMember : sourceMember;
    if (actual.winnerTrialId !== winner.trialId || actual.winnerRole !== winner.role || winner.disposition !== "positive" || loser.disposition !== "negative") return null;
    winnerEndpointId = winner.candidateRef as string;
    judgeConfidence = winner.confidence as number;
  }
  const replayId = replayIdForGroup(actual);
  if (!replayId) return null;
  const job = row(await invoke("replay-core", "replay:job", { jobId: replayId }));
  if (!job || job.jobId !== replayId || job.baselineEndpointId !== source || !Array.isArray(job.candidatePackages) ||
      !job.candidatePackages.some(item => row(item)?.endpointId === candidate)) return null;
  const captureRef = captureRefFromReplayJob(job);
  if (!captureRef) return null;
  return { comparisonGroupId: groupId, finalizedAtMs: listed.createdAtMs, effortComparable: true, winnerEndpointId,
    captureRef, newEndpointId: request.endpointId, againstEndpointId: request.endpointId === source ? candidate : source, judgeConfidence,
    endpointConfidence: (request.endpointId === source ? sourceMember : candidateMember).confidence as number };
}

/** Null means unavailable/incomplete read; [] means the authenticated complete walk contained no usable evidence. */
export async function readRouteDispatchEvidence(input: {
  readonly request: RouteDispatchEvidenceReadRequest;
  readonly invoke: RouteChallengeEvidenceInvoke;
  readonly pageLimit?: number;
}): Promise<readonly RouteDispatchEvidence[] | null> {
  const request = input.request;
  if (![request.roleId, request.taskTypeId, request.endpointId].every(text) ||
      (request.sinceMs !== undefined && (!Number.isSafeInteger(request.sinceMs) || request.sinceMs < 0))) return null;
  try {
    const records = await groups(input.invoke, input.pageLimit ?? 24);
    const answers = new Map<string, RouteDispatchEvidence>();
    for (const record of records) {
      const projected = await project(record, request, input.invoke);
      if (projected) {
        const prior = answers.get(projected.comparisonGroupId);
        if (prior && canonical(prior) !== canonical(projected)) return null;
        answers.set(projected.comparisonGroupId, projected);
      }
    }
    return [...answers.values()].sort((a, b) => a.finalizedAtMs - b.finalizedAtMs || a.comparisonGroupId.localeCompare(b.comparisonGroupId));
  } catch { return null; }
}

export async function readFinalizedRouteChallengeEvidence(input: {
  readonly request: RouteChallengeReadRequest;
  readonly invoke: RouteChallengeEvidenceInvoke;
  readonly pageLimit?: number;
}): Promise<FinalizedRouteChallenge | null> {
  const { request } = input;
  if (!text(request.captureRef) || !text(request.againstEndpointId) || request.newEndpointId === request.againstEndpointId) return null;
  const excluded = request.excludedComparisonGroupIds ?? [];
  if (!Array.isArray(excluded) || excluded.length > 10000 || excluded.some(id => !text(id) || id.length > 256) || new Set(excluded).size !== excluded.length) return null;
  const records = await readRouteDispatchEvidence({ ...input, request: { roleId: request.roleId, taskTypeId: request.taskTypeId, endpointId: request.newEndpointId, sinceMs: request.sinceMs } });
  const matching = records?.filter(record => record.captureRef === request.captureRef && record.againstEndpointId === request.againstEndpointId && !excluded.includes(record.comparisonGroupId));
  // More than one group for a capture/pair is ambiguous without an exact evaluation id.
  if (!matching || matching.length !== 1) return null;
  const { comparisonGroupId, finalizedAtMs, effortComparable, winnerEndpointId } = matching[0]!;
  return { comparisonGroupId, finalizedAtMs, effortComparable, winnerEndpointId };
}

/** Authenticated ReplayCore and queue operator projections; never manufacture a replay id for a pre-replay queue row. */
export async function readPendingRouteDispatches(input: {
  readonly request: PendingRouteDispatchReadRequest;
  readonly invoke: RouteChallengeEvidenceInvoke;
  readonly readCapture: (requestId: string) => Promise<unknown>;
  readonly readQueueJobs: () => Promise<unknown>;
  readonly readQueueJob: (jobId: string) => Promise<unknown>;
}): Promise<readonly PendingRouteDispatch[] | null> {
  if (!text(input.request.roleId) || !text(input.request.taskTypeId)) return null;
  const answers: PendingRouteDispatch[] = [];
  const captures = new Map<string, Row | null>();
  const scopeCapture = async (id: string): Promise<Row | null> => {
    if (captures.has(id)) return captures.get(id)!;
    const capture = row(await input.readCapture(id)), classification = row(capture?.classification);
    if (!capture || capture.requestId !== id ||
        (text(capture.roleId) ?? text(classification?.roleId)) !== input.request.roleId ||
        (text(capture.taskTypeId) ?? text(classification?.taskTypeId)) !== input.request.taskTypeId ||
        !text(capture.endpointId) || !text(capture.scope) ||
        capture.branchKind != null || capture.branchPhase != null || /^replay-/.test(id) || isBenchmarkReplaySourceRef(id)) {
      captures.set(id, null); return null;
    }
    captures.set(id, capture); return capture;
  };
  try {
    let afterJobId: string | undefined, complete = false;
    const seen = new Set<string>();
    for (let page = 0; page < 128; page++) {
      const value = await input.invoke("replay-core", "replay:list-jobs", { summary: true, limit: 24, ...(afterJobId ? { afterJobId } : {}) });
      const entries = Array.isArray(value) ? value : row(value)?.value;
      if (!Array.isArray(entries) || entries.length > 24) return null;
      for (const entry of entries) {
        const summary = row(entry), jobId = text(summary?.jobId);
        if (!summary || !jobId || seen.has(jobId) || (afterJobId && jobId <= afterJobId)) return null;
        seen.add(jobId); afterJobId = jobId;
        const job = row(await input.invoke("replay-core", "replay:job", { jobId }));
        if (!job || job.jobId !== jobId || !time(job.createdAtMs)) return null;
        if (job.state === "complete") continue;
        // Actual producer vocabulary: leased is executing; evaluating has already handed off.
        const states: Record<string, PendingRouteDispatch["state"]> = {
          queued: "queued", leased: "running", running: "running", awaiting_evaluation: "awaiting_evaluation", evaluating: "awaiting_evaluation",
          failed: "failed", cancelled: "cancelled", timed_out: "timed_out",
        };
        const state = typeof job.state === "string" ? states[job.state] : undefined;
        if (!state) return null;
        const captureRef = captureRefFromReplayJob(job);
        if (!captureRef) return null;
        const capture = await scopeCapture(captureRef);
        if (!capture) continue;
        if (job.scope !== capture.scope || job.baselineEndpointId !== capture.endpointId || !Array.isArray(job.candidatePackages)) return null;
        for (const arm of job.candidatePackages) {
          const endpointId = text(row(arm)?.endpointId);
          if (!endpointId || endpointId === job.baselineEndpointId) return null;
          answers.push({ sourceType: "replay", replayJobId: jobId, queueJobId: null, captureRef,
            newEndpointId: endpointId, againstEndpointId: job.baselineEndpointId as string, createdAtMs: job.createdAtMs, state });
        }
      }
      if (entries.length < 24) { complete = true; break; }
    }
    if (!complete) return null;
    const page = row(await input.readQueueJobs());
    // The operator queue projection intentionally reports an uncreated fresh store as
    // `available:false` with an empty list. That is a complete empty queue, not an authority
    // failure; treating it as unavailable prevents the very first classified capture from ever
    // being dispatched. Every other unavailable/malformed shape remains fail-closed.
    const freshEmptyQueue =
      page?.schemaVersion === "role-model.operator-queue-jobs.v1" &&
      page.queue === "replay.dispatch" &&
      page.available === false &&
      Array.isArray(page.jobs) &&
      page.jobs.length === 0;
    // Existing queue API is capped, not paginated. A saturated 500 is explicitly incomplete.
    if (!page || (!freshEmptyQueue && page.available !== true) || !Array.isArray(page.jobs) || page.jobs.length >= 500) return null;
    const queueIds = new Set<string>();
    for (const entry of page.jobs) {
      const summary = row(entry), queueJobId = text(summary?.id);
      if (!summary || !queueJobId || queueIds.has(queueJobId)) return null;
      queueIds.add(queueJobId);
      const read = row(await input.readQueueJob(queueJobId)), job = row(read?.job);
      if (!read || read.available !== true || !job || job.id !== queueJobId || job.queue !== "replay.dispatch") return null;
      if (job.state === "completed") continue;
      // PersistedQueue owns these names, not ReplayCore. No cancelled/time-out inference from error text.
      const states: Record<string, PendingRouteDispatch["state"]> = { pending: "queued", processing: "running", failed: "failed" };
      const state = typeof job.state === "string" ? states[job.state] : undefined;
      const payload = row(job.payload), captureRef = text(payload?.captureRef);
      if (!state || !captureRef || !Array.isArray(payload?.endpointIds) || !text(payload.policySetDigest)) return null;
      if (payload.dispatchRoundId !== undefined && (!text(payload.dispatchRoundId) || String(payload.dispatchRoundId).length > 256)) return null;
      const capture = await scopeCapture(captureRef);
      if (!capture) continue;
      const date = typeof job.createdAt === "string" && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(job.createdAt)
        ? Date.parse(job.createdAt.replace(" ", "T") + "Z") : NaN;
      if (!time(date)) return null;
      for (const id of payload.endpointIds) {
        const endpointId = text(id);
        if (!endpointId || endpointId === capture.endpointId) return null;
        // A live queue row may already have produced a replay. That durable replay record is the stronger state.
        if (answers.some(answer => answer.captureRef === captureRef && answer.newEndpointId === endpointId)) continue;
        answers.push({ sourceType: "queue", replayJobId: null, queueJobId, captureRef,
          ...(payload.dispatchRoundId !== undefined ? { dispatchRoundId: payload.dispatchRoundId as string } : {}),
          newEndpointId: endpointId, againstEndpointId: capture.endpointId as string, createdAtMs: date, state });
      }
    }
    return answers;
  } catch { return null; }
}

/** Read-only live classification index -> authenticated exact capsule read. No disposition resets, capture mutations, or synthetic source ids. */
export async function readRouteReplayableCaptures(input: {
  readonly runtimeStateRoot: string;
  readonly scopeId: string;
  readonly channel: string;
  readonly request: { readonly roleId: string; readonly taskTypeId: string };
  readonly readCapture: (requestId: string) => Promise<unknown>;
}): Promise<readonly AutoReplayCapture[] | null> {
  if (!text(input.request.roleId) || !text(input.request.taskTypeId) || !text(input.scopeId)) return null;
  let database: DatabaseSync | undefined;
  let ids: string[];
  try {
    const databasePath = resolveSqliteMemoryLocation(input);
    if (!existsSync(databasePath)) return null;
    database = new DatabaseSync(databasePath, { readOnly: true });
    database.exec("PRAGMA query_only=ON; PRAGMA busy_timeout=1000;");
    const entries = database.prepare(
      "SELECT DISTINCT request_id FROM runtime_telemetry_records WHERE taxonomy_role_id=? AND taxonomy_task_type=? AND request_class IN ('live','live_request') ORDER BY request_id LIMIT 501",
    ).all(input.request.roleId, input.request.taskTypeId);
    if (entries.length > 500 || entries.some(entry => !text(entry.request_id))) return null;
    ids = entries.map(entry => entry.request_id as string);
  } catch { return null; } finally { database?.close(); }
  const scope = resolveDurableReplayJobScope(input);
  // Run 105 verification: exclude captures whose replay disposition is terminal (replayed/refused), matching
  // listPendingReplayCaptures' pending() filter, so the dispatcher does not re-pick an already-replayed capture
  // (which the tick then refuses as duplicate_already_processed) and instead advances to fresh captures.
  const terminalRefs = (() => {
    const dispositionPath = `${input.runtimeStateRoot}/${input.scopeId}/track-b/replay-disposition.sqlite`;
    if (!existsSync(dispositionPath)) return new Set<string>();
    let disposition: DatabaseSync | undefined;
    try {
      disposition = new DatabaseSync(dispositionPath, { readOnly: true });
      const rows = disposition.prepare("SELECT capture_ref FROM replay_dispositions WHERE outcome IN ('replayed','refused')").all() as { capture_ref?: unknown }[];
      return new Set(rows.map((r) => (typeof r.capture_ref === "string" ? r.capture_ref : "")).filter(Boolean));
    } catch { return new Set<string>(); } finally { disposition?.close(); }
  })();
  const captures: AutoReplayCapture[] = [];
  try {
    for (const requestId of ids) {
      const capture = row(await input.readCapture(requestId));
      if (!capture) continue; // Exact read knows eviction/absence; telemetry alone is not a capsule.
      if (terminalRefs.has(requestId)) continue;
      const classification = row(capture.classification), trace = row(capture.trace), source = row(capture.replaySource);
      const roleId = text(capture.roleId) ?? text(classification?.roleId);
      const taskTypeId = text(capture.taskTypeId) ?? text(classification?.taskTypeId);
      const sourceClass = text(row(capture.replayEvidenceClass)?.class);
      if (capture.requestId !== requestId || capture.scope !== scope ||
          roleId !== input.request.roleId || taskTypeId !== input.request.taskTypeId ||
          (classification?.roleId != null && classification.roleId !== roleId) ||
          (classification?.taskTypeId != null && classification.taskTypeId !== taskTypeId) ||
          !text(capture.endpointId) || !text(capture.rootArtifactId) || !source ||
          !trace || trace.scopeId !== scope || trace.channel !== input.channel ||
          trace.readiness !== "ready" || trace.completeness !== "complete" ||
          !Number.isSafeInteger(trace.generation) || Number(trace.generation) < 0 ||
          !text(trace.rootOccurrenceId) || !text(trace.closedAt) ||
          !["normalizedRequestRef", "sharedPrefixRef", "forkOccurrenceId", "policySnapshotRef", "capturePolicyRef"].every(key => text(source[key])) ||
          !Array.isArray(capture.messages) || capture.messages.length === 0 ||
          capture.branchKind != null || capture.branchPhase != null || capture.replayProduced === true ||
          /^replay-/.test(requestId) || isBenchmarkReplaySourceRef(requestId) || isSyntheticProbeSourceClass(sourceClass)) continue;
      captures.push({ captureRef: requestId, sourceEndpointId: capture.endpointId as string,
        roleId, taskTypeId, hasRecordedToolResults: hasRecordedToolResults(capture),
        replayProduced: false, sourceClass, messages: capture.messages,
        requirements: readReplayRequestRequirements(capture) });
    }
    return captures;
  } catch { return null; }
}
