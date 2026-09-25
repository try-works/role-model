import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

/**
 * Run 99 R33 live finding (stage v158, `:3457`): the supervised-replay evaluation completer is not
 * resumable.
 *
 * Four durable evaluation jobs were stranded in `scoring` with every trial already scored and no
 * finalized comparison group — the completer had been interrupted between "scores recorded" and
 * "comparison group finalized" by the deployment restarts, and nothing re-enters it:
 * `EvaluationCore.reconcileTerminalJobs` completes a job only when a finalized comparison group
 * already covers its trials, and `evaluation:reconcile-jobs` has no production caller. Those
 * captures' comparisons never reached the learner.
 *
 * This module owns the bounded, durable record of "an evaluation handoff was started and this is
 * everything needed to re-run it" plus the sweep that re-runs the outstanding ones. Entries are
 * never silently dropped: after an attempt cap an entry is marked abandoned with its last error.
 */

const SCHEMA_VERSION = "role-model.supervised-replay-evaluation-resume.v1" as const;
const DEFAULT_MAX_ENTRIES = 512;
const MAX_ENTRIES_CEILING = 4096;
const MAX_RESUME_BATCH = 32;
/**
 * Run 100 addendum `replay-dispatch-lifecycle.addendum-04` S5: how many pre-repair abandoned entries one
 * liveness sweep may reconcile. Each costs two cross-boundary invocations, so the drain is bounded per tick
 * (the once-per-process cursor continues on the next sweep) instead of holding the first tick open.
 */
const MAX_ABANDONED_RECONCILIATIONS_PER_SWEEP = 25;
/**
 * Run 100 addendum `handoff-evidence-durability.addendum-06` S25: how long a handoff may have been abandoned
 * and still be worth one bounded retry.
 *
 * Measured on the real-traffic root: the capture ring keeps the last 1 000 pointers, which is ~36 h of traffic
 * at that root's rate, so a handoff recorded within the last day may still have its evidence while an older one
 * is certainly past it. The renewal is bounded by `MAX_RESUME_RENEWALS` and a handoff whose evidence turns out
 * to be gone now lands on its own named disposition instead of another unqualified give-up.
 */
const ABANDONED_RENEWAL_EVIDENCE_WINDOW_MS = 24 * 60 * 60 * 1_000;
/**
 * Run 100 addendum `handoff-evidence-durability.addendum-06` S22 (RC-6): how long one handoff pins the
 * captures it still owes. The pin's lifetime is the same evidence window the abandoned-renewal drain uses -
 * a hold that outlived the window a handoff can still be renewed in would protect evidence nothing can
 * consume - and every renewal or recovered completion extends it, so a live handoff never loses its pin.
 */
export const HANDOFF_EVIDENCE_HOLD_TTL_MS = ABANDONED_RENEWAL_EVIDENCE_WINDOW_MS;
const MAX_TEXT = 256;
const MAX_ERROR_TEXT = 512;

export const SUPERVISED_REPLAY_EVALUATION_MAX_ATTEMPTS = 8;
/**
 * Run 100 addendum 05 S17: how many times a given handoff may have its attempt budget renewed after a
 * give-up. The live root had 301 entries at the cap whose failure reason (`durable evaluation job … is
 * unavailable for resume`) is exactly what the recovery work now makes completable, so a renewal is the
 * right answer - but it must terminate: after this many renewals the give-up is final.
 */
export const MAX_RESUME_RENEWALS = 2;

/**
 * Run 100 addendum `handoff-evidence-durability.addendum-06` S23.
 *
 * Addendum 05 S17 made a give-up renewable, and its policy is explicit: completion is the default when the
 * evidence exists, and a give-up is reserved for *named* unrecoverable evidence. Nothing named that evidence.
 * Measured on `:3457`: 309 entries sit at the attempt cap as `abandoned`, and 252 of the 265 lost handoffs
 * cannot be completed by any retry because their branch captures are outside the capture retention ring (the
 * ring is the last 1 000 pointers, ~36 h of real traffic). Eight identical attempts were spent on each such
 * handoff before the unqualified give-up, and the operator could not tell that class apart from a defect.
 *
 * This is the name. A completion that resolves *no* arm evidence terminates the handoff under it, without
 * spending the attempt budget, and the caller terminalizes the replay job behind it with the same reason.
 */
export const HANDOFF_EVIDENCE_OUTSIDE_RETENTION_WINDOW =
  "evidence_outside_retention_window" as const;

export class HandoffEvidenceUnavailableError extends Error {
  readonly code = HANDOFF_EVIDENCE_OUTSIDE_RETENTION_WINDOW;
  /** The per-arm reasons, bounded and deterministic (`endpoint=reason, …`). */
  readonly detail: string;
  constructor(detail: string) {
    super(`handoff evidence is outside the capture retention window: ${detail}`);
    this.name = "HandoffEvidenceUnavailableError";
    this.detail = detail;
  }
}

export interface SupervisedReplayEvaluationCounterfactual {
  readonly endpointId: string;
  readonly modelId: string;
  readonly reasoningEffort: string | null;
}

export interface SupervisedReplayEvaluationResumeEntry {
  readonly schemaVersion: typeof SCHEMA_VERSION;
  readonly replayJobId: string;
  readonly evaluationJobId: string;
  /** The host replay command request id; it names the evaluation request and its evidence refs. */
  readonly requestId: string;
  /** The durable source capture the comparison is built from. */
  readonly sourceCaptureRequestId: string;
  readonly sourceEndpointId: string;
  readonly sourceModelId: string;
  readonly counterfactualPackages: readonly SupervisedReplayEvaluationCounterfactual[];
  readonly evaluationCriteria: Readonly<Record<string, unknown>>;
  readonly evaluationCriteriaDigest: string;
  /**
   * Run 98 addendum 34 S5: the scope the durable replay job was created under. Durable replay jobs are
   * bound to their own scope, so terminalizing one requires that exact value — the operator scope is
   * refused with `replay persisted job scope binding mismatch`. Older entries predate this field and
   * carry `null`.
   */
  readonly scope: string | null;
  readonly recordedAtMs: number;
  readonly attempts: number;
  readonly resolvedAtMs: number | null;
  readonly outcome: string | null;
  /**
   * Run 100 addendum `replay-evaluation-spine-repair.addendum-05` S17: how many times this handoff's attempt
   * budget has been renewed after a give-up. `record()` deliberately never resets an entry's attempts, so a
   * renewal has to be explicit and bounded; this is that bound.
   */
  readonly renewals?: number;
  readonly lastError: string | null;
  readonly comparisonGroupId?: string | null;
}

export interface SupervisedReplayEvaluationResumeStore {
  readonly filePath: string;
  record(entry: SupervisedReplayEvaluationResumeEntry): SupervisedReplayEvaluationResumeEntry;
  /**
   * Run 100 addendum `replay-evaluation-spine-repair.addendum-05` S17: give an abandoned handoff a fresh
   * attempt budget, bounded by `MAX_RESUME_RENEWALS`. Returns the renewed entry, or null when the entry does
   * not exist or its renewals are spent (in which case the give-up stands).
   */
  renew(
    replayJobId: string,
    options?: { readonly now?: number; readonly reason?: string | null },
  ): SupervisedReplayEvaluationResumeEntry | null;
  list(): readonly SupervisedReplayEvaluationResumeEntry[];
  get(replayJobId: string): SupervisedReplayEvaluationResumeEntry | null;
  resolve(
    replayJobId: string,
    resolution: {
      readonly outcome: string;
      readonly comparisonGroupId?: string | null;
      /**
       * Run 100 addendum `handoff-evidence-durability.addendum-06` S23: a terminal disposition records the
       * reason it was reached. `recordFailure` cannot be used for that - it spends the attempt budget, and a
       * disposition reached because the evidence is *gone* must not consume budget that a retryable failure
       * needs.
       */
      readonly reason?: string | null;
      readonly now?: number;
    },
  ): SupervisedReplayEvaluationResumeEntry | null;
  recordFailure(
    replayJobId: string,
    error: unknown,
    now?: number,
  ): SupervisedReplayEvaluationResumeEntry | null;
}

/**
 * Run 100 addendum `handoff-evidence-durability.addendum-06` S22 (RC-6): the captures one unresolved
 * handoff pins. The source capture is what the replay was replayed from; the branch captures are the arms
 * the comparison has to read. Both are named by the durable job, so the pin set is derivable at any point
 * in a handoff's life - when the recovery pass records it, when the drain renews it, and when the resumed
 * completion finally reads its arms - which is what makes the pin survive a restart instead of living in
 * one build's memory.
 */
export function handoffEvidenceHoldRequestIds(input: {
  readonly requestId?: string | null;
  readonly sourceCaptureRequestId?: string | null;
  readonly branchCaptureRequestIds?: readonly string[] | null;
}): readonly string[] {
  const held: string[] = [];
  const push = (value: unknown) => {
    if (typeof value !== "string") return;
    const trimmed = value.trim();
    if (!trimmed || trimmed.length > 512) return;
    if (!held.includes(trimmed)) held.push(trimmed);
  };
  push(input.requestId);
  push(input.sourceCaptureRequestId);
  for (const value of input.branchCaptureRequestIds ?? []) push(value);
  return held;
}

export function resolveSupervisedReplayEvaluationResumePath(input: {
  readonly runtimeStateRoot: string;
  readonly scopeId: string;
}): string {
  const runtimeStateRoot = String(input.runtimeStateRoot ?? "").trim();
  const scopeId = String(input.scopeId ?? "").trim();
  if (!runtimeStateRoot || !scopeId) {
    throw new Error("supervised replay evaluation resume path requires a state root and scope");
  }
  const scopeSegment = `sha256-${createHash("sha256").update(scopeId, "utf8").digest("hex")}`;
  return path.join(
    runtimeStateRoot,
    "scopes",
    scopeSegment,
    "track-b",
    "supervised-replay-evaluations.json",
  );
}

function boundedText(value: unknown, field: string): string {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.length > MAX_TEXT ||
    /[\r\n]/.test(value)
  ) {
    throw new Error(
      `supervised replay evaluation resume ${field} must be a bounded non-empty string`,
    );
  }
  return value.trim();
}

function boundedDigest(value: unknown, field: string): string {
  if (typeof value !== "string" || !/^sha256:[a-f0-9]{64}$/u.test(value)) {
    throw new Error(`supervised replay evaluation resume ${field} must be a sha256 digest`);
  }
  return value;
}

function boundedCriteria(value: unknown): Readonly<Record<string, unknown>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("supervised replay evaluation resume criteria must be an object");
  }
  if (Buffer.byteLength(JSON.stringify(value), "utf8") > 8_192) {
    throw new Error("supervised replay evaluation resume criteria exceed their bounded size");
  }
  return structuredClone(value) as Readonly<Record<string, unknown>>;
}

function boundedCounterfactuals(
  value: unknown,
): readonly SupervisedReplayEvaluationCounterfactual[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 8) {
    throw new Error(
      "supervised replay evaluation resume counterfactuals must be a bounded non-empty list",
    );
  }
  return value.map((candidate) => {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
      throw new Error("supervised replay evaluation resume counterfactual must be an object");
    }
    const record = candidate as Record<string, unknown>;
    const reasoningEffort = record.reasoningEffort;
    if (
      reasoningEffort !== null &&
      reasoningEffort !== undefined &&
      typeof reasoningEffort !== "string"
    ) {
      throw new Error(
        "supervised replay evaluation resume counterfactual effort must be a string or null",
      );
    }
    return {
      endpointId: boundedText(record.endpointId, "counterfactual endpoint"),
      modelId: boundedText(record.modelId, "counterfactual model"),
      reasoningEffort:
        typeof reasoningEffort === "string" && reasoningEffort.length > 0
          ? boundedText(reasoningEffort, "counterfactual effort")
          : null,
    };
  });
}

/**
 * Run 98 addendum 34 S5: entries whose replay job this process has already tried to terminalize, keyed
 * by store instance and resolution stamp, so an abandoned entry is reconciled once per runtime start.
 */
const reconciledAbandonedEntries = new WeakMap<object, Set<string>>();

function normalizeEntry(
  entry: SupervisedReplayEvaluationResumeEntry,
): SupervisedReplayEvaluationResumeEntry {
  if (!entry || typeof entry !== "object" || entry.schemaVersion !== SCHEMA_VERSION) {
    throw new Error("supervised replay evaluation resume entry schema is unsupported");
  }
  const attempts = entry.attempts;
  if (!Number.isSafeInteger(attempts) || attempts < 0 || attempts > 1_000) {
    throw new Error("supervised replay evaluation resume attempts must be a bounded integer");
  }
  const recordedAtMs = entry.recordedAtMs;
  if (!Number.isSafeInteger(recordedAtMs) || recordedAtMs < 0) {
    throw new Error("supervised replay evaluation resume recordedAtMs must be a safe integer");
  }
  const resolvedAtMs = entry.resolvedAtMs ?? null;
  if (resolvedAtMs !== null && (!Number.isSafeInteger(resolvedAtMs) || resolvedAtMs < 0)) {
    throw new Error(
      "supervised replay evaluation resume resolvedAtMs must be null or a safe integer",
    );
  }
  const outcome = entry.outcome ?? null;
  if (outcome !== null && (typeof outcome !== "string" || !outcome || outcome.length > MAX_TEXT)) {
    throw new Error("supervised replay evaluation resume outcome must be null or a bounded string");
  }
  const lastError = entry.lastError ?? null;
  if (lastError !== null && (typeof lastError !== "string" || lastError.length > MAX_ERROR_TEXT)) {
    throw new Error(
      "supervised replay evaluation resume lastError must be null or a bounded string",
    );
  }
  // Run 98 addendum 34 S5: older entries were written before the job's scope was recorded, so an
  // absent value normalises to null rather than failing the whole store.
  const scope =
    entry.scope === undefined || entry.scope === null || entry.scope === ""
      ? null
      : boundedText(entry.scope, "scope");
  return Object.freeze({
    schemaVersion: SCHEMA_VERSION,
    replayJobId: boundedText(entry.replayJobId, "replayJobId"),
    evaluationJobId: boundedText(entry.evaluationJobId, "evaluationJobId"),
    requestId: boundedText(entry.requestId, "requestId"),
    sourceCaptureRequestId: boundedText(entry.sourceCaptureRequestId, "sourceCaptureRequestId"),
    sourceEndpointId: boundedText(entry.sourceEndpointId, "sourceEndpointId"),
    sourceModelId: boundedText(entry.sourceModelId, "sourceModelId"),
    counterfactualPackages: boundedCounterfactuals(entry.counterfactualPackages),
    evaluationCriteria: boundedCriteria(entry.evaluationCriteria),
    evaluationCriteriaDigest: boundedDigest(
      entry.evaluationCriteriaDigest,
      "evaluationCriteriaDigest",
    ),
    scope,
    recordedAtMs,
    attempts,
    resolvedAtMs,
    outcome,
    lastError,
    ...(entry.renewals === undefined
      ? {}
      : {
          renewals:
            Number.isSafeInteger(entry.renewals) &&
            (entry.renewals as number) >= 0 &&
            (entry.renewals as number) <= MAX_RESUME_RENEWALS
              ? (entry.renewals as number)
              : 0,
        }),
    ...(entry.comparisonGroupId === undefined
      ? {}
      : {
          comparisonGroupId:
            entry.comparisonGroupId === null
              ? null
              : boundedText(entry.comparisonGroupId, "comparisonGroupId"),
        }),
  });
}

export function createSupervisedReplayEvaluationResumeStore(input: {
  readonly filePath: string;
  readonly maxEntries?: number;
  readonly clock?: () => number;
  /**
   * S22 (RC-6): called when an entry reaches a terminal outcome, so the evidence pin the handoff created is
   * released with the work it protected. The store's mutators are synchronous, so the hook is *notified*
   * rather than awaited - the release is idempotent and the hold's own TTL is the backstop when the private
   * boundary happens to be unreachable at that moment.
   */
  readonly onReleased?: (entry: SupervisedReplayEvaluationResumeEntry) => Promise<void> | void;
}): SupervisedReplayEvaluationResumeStore {
  const filePath = String(input.filePath ?? "").trim();
  if (!filePath) throw new Error("supervised replay evaluation resume store path is required");
  const requestedMax = input.maxEntries ?? DEFAULT_MAX_ENTRIES;
  if (
    !Number.isSafeInteger(requestedMax) ||
    requestedMax < 1 ||
    requestedMax > MAX_ENTRIES_CEILING
  ) {
    throw new Error("supervised replay evaluation resume store capacity must be bounded");
  }
  const maxEntries = requestedMax;
  const clock = input.clock ?? (() => Date.now());
  const notifyReleased = (entry: SupervisedReplayEvaluationResumeEntry) => {
    if (typeof input.onReleased !== "function") return;
    try {
      void Promise.resolve(input.onReleased(structuredClone(entry))).catch(() => {
        // The caller's hook logs its own failures; a rejected release must not fail the resolution that
        // already succeeded durably.
      });
    } catch {
      // Same contract as the asynchronous case: the entry is resolved, the pin expires by TTL.
    }
  };
  mkdirSync(path.dirname(filePath), { recursive: true });

  let entries: Record<string, SupervisedReplayEvaluationResumeEntry> = {};
  if (existsSync(filePath)) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(filePath, "utf8"));
    } catch {
      throw new Error("supervised replay evaluation resume store is invalid");
    }
    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed) ||
      (parsed as Record<string, unknown>).schemaVersion !== SCHEMA_VERSION ||
      typeof (parsed as Record<string, unknown>).entries !== "object" ||
      (parsed as Record<string, unknown>).entries === null ||
      Array.isArray((parsed as Record<string, unknown>).entries)
    ) {
      throw new Error("supervised replay evaluation resume store is invalid");
    }
    const persisted = (parsed as Record<string, unknown>).entries as Record<string, unknown>;
    if (Object.keys(persisted).length > MAX_ENTRIES_CEILING) {
      throw new Error("supervised replay evaluation resume store exceeds its bounded cap");
    }
    for (const value of Object.values(persisted)) {
      const normalized = normalizeEntry(value as SupervisedReplayEvaluationResumeEntry);
      entries[normalized.replayJobId] = normalized;
    }
  }

  const persist = (): void => {
    const ordered = Object.entries(entries).sort(([left], [right]) => left.localeCompare(right));
    const payload = `${JSON.stringify({ schemaVersion: SCHEMA_VERSION, entries: Object.fromEntries(ordered) })}\n`;
    const temporaryPath = `${filePath}.${process.pid}.tmp`;
    writeFileSync(temporaryPath, payload, { encoding: "utf8" });
    renameSync(temporaryPath, filePath);
  };

  const prune = (): void => {
    const keys = Object.keys(entries);
    if (keys.length <= maxEntries) return;
    const ordered = keys
      .map((key) => entries[key] as SupervisedReplayEvaluationResumeEntry)
      .sort((left, right) =>
        left.resolvedAtMs !== null || right.resolvedAtMs !== null
          ? Number(right.resolvedAtMs ?? Number.MAX_SAFE_INTEGER) -
            Number(left.resolvedAtMs ?? Number.MAX_SAFE_INTEGER)
          : right.recordedAtMs - left.recordedAtMs,
      );
    for (const entry of ordered.slice(maxEntries)) delete entries[entry.replayJobId];
  };

  const update = (
    replayJobId: string,
    patch: (
      current: SupervisedReplayEvaluationResumeEntry,
    ) => SupervisedReplayEvaluationResumeEntry,
  ): SupervisedReplayEvaluationResumeEntry | null => {
    const current = entries[replayJobId];
    if (!current) return null;
    const next = normalizeEntry(patch(current));
    entries = { ...entries, [next.replayJobId]: next };
    persist();
    return next;
  };

  return Object.freeze({
    filePath,
    record(entry: SupervisedReplayEvaluationResumeEntry): SupervisedReplayEvaluationResumeEntry {
      const normalized = normalizeEntry(entry);
      const existing = entries[normalized.replayJobId];
      // Re-recording the same handoff must never reset its attempts or its resolution: the sweep
      // chases the same durable evaluation job, not a new one.
      if (existing) return existing;
      entries = { ...entries, [normalized.replayJobId]: normalized };
      prune();
      persist();
      return entries[normalized.replayJobId] as SupervisedReplayEvaluationResumeEntry;
    },
    list(): readonly SupervisedReplayEvaluationResumeEntry[] {
      return Object.values(entries).map((entry) => structuredClone(entry));
    },
    get(replayJobId: string): SupervisedReplayEvaluationResumeEntry | null {
      const entry = entries[boundedText(replayJobId, "replayJobId")];
      return entry ? structuredClone(entry) : null;
    },
    resolve(
      replayJobId: string,
      resolution: {
        readonly outcome: string;
        readonly comparisonGroupId?: string | null;
        /** S23: the reason a terminal disposition was reached, recorded without spending the attempt budget. */
        readonly reason?: string | null;
        readonly now?: number;
      },
    ): SupervisedReplayEvaluationResumeEntry | null {
      const now = resolution.now ?? clock();
      if (!Number.isSafeInteger(now) || now < 0) {
        throw new Error("supervised replay evaluation resume clock must return a safe integer");
      }
      const outcome = boundedText(resolution.outcome, "outcome");
      const resolved = update(boundedText(replayJobId, "replayJobId"), (current) => ({
        ...current,
        resolvedAtMs: now,
        outcome,
        lastError:
          resolution.reason === undefined
            ? current.lastError
            : resolution.reason === null
              ? null
              : String(resolution.reason).slice(0, MAX_ERROR_TEXT),
        comparisonGroupId:
          resolution.comparisonGroupId === undefined
            ? (current.comparisonGroupId ?? null)
            : resolution.comparisonGroupId,
      }));
      if (resolved && resolved.resolvedAtMs !== null) notifyReleased(resolved);
      return resolved;
    },
    recordFailure(
      replayJobId: string,
      error: unknown,
      now = clock(),
    ): SupervisedReplayEvaluationResumeEntry | null {
      if (!Number.isSafeInteger(now) || now < 0) {
        throw new Error("supervised replay evaluation resume clock must return a safe integer");
      }
      const message = String(
        (error as { message?: unknown })?.message ?? error ?? "unknown resume failure",
      ).slice(0, MAX_ERROR_TEXT);
      const updated = update(boundedText(replayJobId, "replayJobId"), (current) => {
        const attempts = current.attempts + 1;
        return {
          ...current,
          attempts,
          lastError: message,
          ...(attempts >= SUPERVISED_REPLAY_EVALUATION_MAX_ATTEMPTS
            ? { resolvedAtMs: now, outcome: "abandoned" }
            : {}),
        };
      });
      if (updated && updated.outcome === "abandoned" && updated.resolvedAtMs !== null) {
        notifyReleased(updated);
      }
      return updated;
    },
    /**
     * Run 100 addendum `replay-evaluation-spine-repair.addendum-05` S17: the host's recovery pass renews a
     * handoff whose give-up reason no longer applies (its evaluation job is missing and the completion can
     * now create it). `record()` deliberately preserves attempts, so the renewal is explicit here and bounded
     * by `MAX_RESUME_RENEWALS`; past that the give-up stands and the entry is not selected again.
     */
    renew(
      replayJobId: string,
      options: { readonly now?: number; readonly reason?: string | null } = {},
    ): SupervisedReplayEvaluationResumeEntry | null {
      const now = options.now ?? clock();
      if (!Number.isSafeInteger(now) || now < 0) {
        throw new Error("supervised replay evaluation resume clock must return a safe integer");
      }
      const existing = entries[boundedText(replayJobId, "replayJobId")];
      if (!existing) return null;
      const renewals = Number.isSafeInteger(existing.renewals) ? Number(existing.renewals) : 0;
      if (renewals >= MAX_RESUME_RENEWALS) return null;
      const reason =
        typeof options.reason === "string" && options.reason
          ? options.reason.slice(0, MAX_ERROR_TEXT)
          : existing.lastError;
      return update(existing.replayJobId, (current) => ({
        ...current,
        attempts: 0,
        resolvedAtMs: null,
        outcome: null,
        lastError: reason,
        renewals: renewals + 1,
      }));
    },
  });
}

export function selectResumableSupervisedReplayEvaluations(input: {
  readonly entries: readonly SupervisedReplayEvaluationResumeEntry[];
  readonly limit?: number;
}): readonly SupervisedReplayEvaluationResumeEntry[] {
  const limit = input.limit ?? MAX_RESUME_BATCH;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_RESUME_BATCH) {
    throw new Error("supervised replay evaluation resume limit must be bounded");
  }
  return input.entries
    .filter(
      (entry) =>
        (entry.resolvedAtMs ?? null) === null &&
        entry.attempts < SUPERVISED_REPLAY_EVALUATION_MAX_ATTEMPTS,
    )
    .slice()
    .sort(
      (left, right) =>
        left.recordedAtMs - right.recordedAtMs || left.replayJobId.localeCompare(right.replayJobId),
    )
    .slice(0, limit);
}

export async function resumePendingSupervisedReplayEvaluations(input: {
  readonly store: SupervisedReplayEvaluationResumeStore;
  readonly isEvaluationComplete: (entry: SupervisedReplayEvaluationResumeEntry) => Promise<boolean>;
  readonly complete: (
    entry: SupervisedReplayEvaluationResumeEntry,
  ) => Promise<Readonly<Record<string, unknown>> | null | undefined>;
  /**
   * Run 98 addendum 34 S5 (live stage v200): called exactly once, when an entry crosses the attempt
   * cap and is recorded `abandoned`. The evaluation is then *proven* unavailable, and the caller must
   * terminalize the replay job behind it — otherwise the job stays `awaiting_evaluation`, so the
   * scheduler re-claims it on every tick (409 "awaiting evaluation and cannot be re-leased") and the
   * capture neither evaluates nor fails: three real captures cycled that way with no evaluation job
   * in Evaluation Core at all.
   */
  readonly onAbandoned?: (
    entry: SupervisedReplayEvaluationResumeEntry,
    error: unknown,
  ) => Promise<void> | void;
  readonly limit?: number;
  readonly now?: () => number;
}): Promise<{
  readonly resumed: number;
  readonly completed: number;
  readonly failed: number;
  /**
   * Run 100 addendum `handoff-evidence-durability.addendum-06` S23: handoffs that terminated because their
   * evidence is outside the capture retention window. They are counted separately from `failed` because they
   * are not a defect to retry - the operator readback reports them as a named backlog.
   */
  readonly outsideRetentionWindow: number;
  /**
   * Run 100 addendum `handoff-evidence-durability.addendum-06` S25: abandoned handoffs whose evidence may
   * still exist and that the drain renewed instead of terminalizing.
   */
  readonly renewedFromDrain: number;
  readonly reconciled: number;
  readonly remaining: number;
}> {
  const now = input.now ?? (() => Date.now());
  // Run 98 addendum 34 S5: an entry abandoned *before* this repair is no longer selected by the sweep,
  // so its replay job would stay `awaiting_evaluation` for ever and the capture would keep deferring on
  // the "cannot be re-leased" 409. Reconcile those once per process, keyed by the resolution stamp so a
  // resolved entry is never re-terminalized.
  let reconciled = 0;
  let renewedFromDrain = 0;
  const reconcileSeen = reconciledAbandonedEntries.get(input.store) ?? new Set<string>();
  reconciledAbandonedEntries.set(input.store, reconcileSeen);
  for (const entry of input.store.list()) {
    /**
     * Run 100 addendum `handoff-evidence-durability.addendum-06` S39: the named disposition is a claim about
     * evidence - and the first claims were made by builds whose boundary reads could not see a capture that was
     * present (a page read as empty, an answer read as an envelope, a scope bound to the wrong authority).
     * A recent claim is therefore re-verified once, with the same bounds every other renewal has: within the
     * evidence window, at most `MAX_RESUME_RENEWALS` times, and with no attempt budget spent on a dead end.
     * Evidence that really is gone re-disposes on the first sweep; evidence that is present completes.
     */
    const renewableOutcome =
      entry.outcome === "abandoned" || entry.outcome === HANDOFF_EVIDENCE_OUTSIDE_RETENTION_WINDOW;
    if (entry.resolvedAtMs === null || !renewableOutcome) continue;
    const key = `${entry.replayJobId}:${entry.resolvedAtMs}`;
    if (reconcileSeen.has(key)) continue;
    /**
     * Run 100 addendum `handoff-evidence-durability.addendum-06` S25: this drain is the only pass that walks
     * the abandoned handoffs themselves (315 of them on the live root) rather than scanning the job store for
     * them, so it is where a handoff whose evidence may still exist gets its one bounded retry. The renewal is
     * bounded by `MAX_RESUME_RENEWALS`; a handoff past its bound, or old enough that its capture is certainly
     * outside the retention ring, falls through to the terminalization below exactly as before.
     */
    const renewals = Number.isSafeInteger(entry.renewals) ? Number(entry.renewals) : 0;
    if (
      renewals < MAX_RESUME_RENEWALS &&
      entry.recordedAtMs >= now() - ABANDONED_RENEWAL_EVIDENCE_WINDOW_MS
    ) {
      const renewed = input.store.renew(entry.replayJobId, {
        now: now(),
        reason: "abandoned while its evidence may still exist: bounded retry",
      });
      if (renewed) {
        reconcileSeen.add(key);
        renewedFromDrain += 1;
        continue;
      }
    }
    if (typeof input.onAbandoned !== "function") continue;
    /**
     * Run 100 addendum `replay-dispatch-lifecycle.addendum-04` S5 (measured while verifying the backlog
     * repair): this pass is once per process but was unbounded, and each entry costs two cross-boundary
     * invocations (fail the replay job, terminalize its evaluation job). A mature stage root holds 478
     * abandoned entries, so the first auto-replay tick spent minutes here - `:3457` reported `ticks 0,
     * running true` for nine minutes with the operations-server child at ~77% of a core and no capture
     * replayed. It is a bounded background drain now: at most
     * `MAX_ABANDONED_RECONCILIATIONS_PER_SWEEP` entries per sweep, with `reconcileSeen` carrying the
     * cursor so the next tick continues exactly where this one stopped.
     */
    if (reconciled >= MAX_ABANDONED_RECONCILIATIONS_PER_SWEEP) break;
    reconcileSeen.add(key);
    try {
      await input.onAbandoned(entry, new Error(entry.lastError ?? "evaluation abandoned"));
      reconciled += 1;
    } catch {
      // The caller reports its own failure; the entry stays resolved either way.
    }
  }
  const selected = selectResumableSupervisedReplayEvaluations({
    entries: input.store.list(),
    ...(input.limit === undefined ? {} : { limit: input.limit }),
  });
  let completed = 0;
  let failed = 0;
  let outsideRetentionWindow = 0;
  for (const entry of selected) {
    try {
      if (await input.isEvaluationComplete(entry)) {
        input.store.resolve(entry.replayJobId, { outcome: "already_complete", now: now() });
        completed += 1;
        continue;
      }
      const result = await input.complete(entry);
      const outcome =
        result && typeof result.outcome === "string" && result.outcome.trim()
          ? result.outcome.trim()
          : "resolved";
      input.store.resolve(entry.replayJobId, {
        outcome,
        comparisonGroupId:
          result && typeof result.comparisonGroupId === "string" ? result.comparisonGroupId : null,
        now: now(),
      });
      completed += 1;
    } catch (error) {
      /**
       * Run 100 addendum `handoff-evidence-durability.addendum-06` S23: evidence that is *gone* is not a
       * retryable defect. The completion names that state (`HandoffEvidenceUnavailableError`, carrying the
       * per-arm reason), and the handoff terminates under that name: the attempt budget is not spent on a
       * dead end, and the operator sees the disposition instead of a wall of unqualified `abandoned`.
       * The replay job behind it is still terminalized, once, so the scheduler stops re-claiming it.
       */
      if (error instanceof HandoffEvidenceUnavailableError) {
        const resolved = input.store.resolve(entry.replayJobId, {
          outcome: HANDOFF_EVIDENCE_OUTSIDE_RETENTION_WINDOW,
          // The reason travels with the disposition; the attempt budget is deliberately untouched.
          reason: error.detail,
          now: now(),
        });
        outsideRetentionWindow += 1;
        if (resolved && typeof input.onAbandoned === "function") {
          reconcileSeen.add(`${resolved.replayJobId}:${resolved.resolvedAtMs}`);
          try {
            await input.onAbandoned(resolved, error);
          } catch {
            // Terminalizing is best-effort; the entry is already resolved under its own name.
          }
        }
        continue;
      }
      failed += 1;
      const updated = input.store.recordFailure(entry.replayJobId, error, now());
      // The entry has just been recorded `abandoned`: the evaluation is proven unavailable, so the
      // replay job behind it must stop being re-claimed. The caller terminalizes it (run 98 addendum 34
      // S5) so the scheduler records a terminal refusal carrying the real reason.
      if (updated?.outcome === "abandoned" && typeof input.onAbandoned === "function") {
        // Mark it reconciled here so the reconcile pass does not terminalize the same entry again on the
        // next sweep (the entry is `abandoned` from now on and the sweep will not select it).
        reconcileSeen.add(`${updated.replayJobId}:${updated.resolvedAtMs}`);
        try {
          await input.onAbandoned(updated, error);
        } catch {
          // Terminalizing is best-effort here: the entry is already resolved and the next sweep will
          // not retry it, so a failure is reported by the caller's own logging rather than thrown here.
        }
      }
    }
  }
  return {
    resumed: selected.length,
    completed,
    failed,
    outsideRetentionWindow,
    renewedFromDrain,
    reconciled,
    remaining: input.store.list().filter((entry) => (entry.resolvedAtMs ?? null) === null).length,
  };
}
