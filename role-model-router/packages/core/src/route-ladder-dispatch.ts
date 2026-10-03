
/**
 * Run 105 package D (R8 dispatch, R9 derived activation, R10 per-task rollback, R11 defaults).
 *
 * The pure Effect program the runtime's replay tick and its liveness sweeps consume. It holds the
 * focus task (depth-first), derives activation from the admission floor, plans the top-down
 * challenge and lands the per-task rollback flag. Nothing here performs I/O: the store, the clock
 * and the replay executor stay in the host bridge, so every rule below is unit-testable.
 *
 * D9: the endpoint ladder is named RUINGS_NAME / routeLadder; the word "ladder" alone stays
 * reserved for the COHORT exposure ladder.
 *
 * D7: activation is DERIVED (admitted > 0 AND not rolled back) - there is no mutable active-pack
 * pointer, and this module never calls knowledge:activate-pack.
 *
 * D8: landRollbackToggle writes ONLY the ladder flag ({on, reason, atMs}); it never names a pack,
 * a validation receipt, or the legacy receipt-bound rollback path.
 *
 * D6/C4: the admission floor is a NEW quantity. minConfidence here is the mean judge confidence
 * over an endpoint's OWN finalized comparisons, NOT the gate inside
 * extensions/evaluation-core/learning-integrity.mjs (which is untouched).
 */
import { Data, Effect, Schema } from "effect";

/* ------------------------------- contracts (R7/R13) ------------------------------- */

const NUL = String.fromCharCode(0);

/**
 * D9/R1: the ladder scope key is the composite roleId<NUL>taskTypeId. Exactly one NUL, both halves
 * non-empty - a key that cannot be split unambiguously is refused rather than guessed.
 */
export const RouteScopeKey = Schema.String.pipe(
  Schema.check(
    Schema.makeFilter(
      (value: string) => {
        const first = value.indexOf(NUL);
        if (first <= 0) return false;
        if (value.indexOf(NUL, first + 1) !== -1) return false;
        return first < value.length - 1;
      },
      { expected: "exactly one NUL separator with both halves non-empty" },
    ),
  ),
);

export type RouteScopeKey = typeof RouteScopeKey.Type;

export const RouteLadderRung = Schema.Struct({
  endpointId: Schema.String.pipe(Schema.check(Schema.isMinLength(1))),
  rank: Schema.Int.pipe(Schema.check(Schema.isGreaterThanOrEqualTo(1))),
  /** R4: stored status is the USER's removal only; router eligibility is applied separately. */
  status: Schema.Literals(["available", "unavailable"]),
});

export type RouteLadderRung = typeof RouteLadderRung.Type;

export const RouteLadderCompleteness = Schema.Struct({
  admitted: Schema.Int.pipe(Schema.check(Schema.isGreaterThanOrEqualTo(0))),
  configured: Schema.Int.pipe(Schema.check(Schema.isGreaterThanOrEqualTo(0))),
});

export const RouteLadderRolledBack = Schema.Struct({
  on: Schema.Boolean,
  reason: Schema.NullOr(Schema.String),
  atMs: Schema.NullOr(Schema.Int),
});

export type RouteLadderRolledBack = typeof RouteLadderRolledBack.Type;

export const RouteLadder = Schema.Struct({
  contract: Schema.Literal("RouteLadderPackV1"),
  packId: Schema.String,
  scopeId: Schema.String,
  roleId: Schema.String,
  taskTypeId: Schema.String,
  rungs: Schema.Array(RouteLadderRung),
  completeness: RouteLadderCompleteness,
  version: Schema.Int.pipe(Schema.check(Schema.isGreaterThanOrEqualTo(1))),
  nextEligibleAtMs: Schema.NullOr(Schema.Int),
  taxonomyVersion: Schema.optional(Schema.String),
  rolledBack: RouteLadderRolledBack,
});

export type RouteLadder = typeof RouteLadder.Type;

/**
 * R11: the SINGLE source of the four ladder constants. stalenessWindowDays is ONE constant used for
 * both the request-count window and the idle (plan drift check #7).
 */
export const RouteLearningDefaults = Schema.Struct({
  minComparisons: Schema.Int.pipe(Schema.check(Schema.isGreaterThanOrEqualTo(1))),
  minConfidence: Schema.Finite.pipe(Schema.check(Schema.isBetween({ minimum: 0, maximum: 1 }))),
  stalenessWindowDays: Schema.Int.pipe(Schema.check(Schema.isGreaterThanOrEqualTo(1))),
  challengeBatchSize: Schema.Int.pipe(Schema.check(Schema.isGreaterThanOrEqualTo(0))),
});

export type RouteLearningDefaults = typeof RouteLearningDefaults.Type;

/** The documented shipped constants, mirrored from guidance/product-defaults.json. */
export const ROUTE_LEARNING_DOCUMENTED_DEFAULTS: RouteLearningDefaults = Object.freeze({
  minComparisons: 5,
  minConfidence: 0.7,
  stalenessWindowDays: 30,
  challengeBatchSize: 1,
});

/* ---------------------------------- tagged errors ---------------------------------- */

/**
 * R13: the four scoped tagged errors with their FIXED behaviours.
 *  - InsufficientEvidence: no admitted endpoint -> no advisory, baseline routing.
 *  - NoReplayableRequest: no replayable capture -> the dispatcher skips the task.
 *  - EndpointUnavailable: skip the rung and continue the walk.
 *  - ScopeMismatch: refuse the advisory as advisory_task_mismatch, baseline routing.
 */
export class InsufficientEvidence extends Data.TaggedError("InsufficientEvidence")<{
  readonly detail: string;
}> {}

export class NoReplayableRequest extends Data.TaggedError("NoReplayableRequest")<{
  readonly detail: string;
  readonly roleId?: string;
  readonly taskTypeId?: string;
}> {}

export class EndpointUnavailable extends Data.TaggedError("EndpointUnavailable")<{
  readonly detail: string;
  readonly endpointId: string;
}> {}

export class ScopeMismatch extends Data.TaggedError("ScopeMismatch")<{
  readonly detail: string;
}> {}

/* --------------------------- derived lifecycle state (R14/R9) --------------------------- */

/**
 * R14: the observable ladder states. RouteLadderState is DERIVED, never stored - "active" is a
 * computed flag on the derived state, not a column.
 */
export type RouteLadderState = Data.TaggedEnum<{
  // biome-ignore lint/complexity/noBannedTypes: Effect's Data.TaggedEnum variant payload is an empty object
  NoLadder: {};
  Partial: { readonly admitted: number; readonly configured: number };
  // biome-ignore lint/complexity/noBannedTypes: Effect's Data.TaggedEnum variant payload is an empty object
  Complete: {};
  RolledBack: { readonly reason: string | null };
}>;

export const RouteLadderState = Data.taggedEnum<RouteLadderState>();

/**
 * R13/R14: the variant constructors, exported by name so a caller (and the tests) can build a
 * derived state without reaching through the taggedEnum record.
 */
export const NoLadder = RouteLadderState.NoLadder;
export const Partial = RouteLadderState.Partial;
export const Complete = RouteLadderState.Complete;
export const RolledBack = RouteLadderState.RolledBack;

export interface DerivedRouteLadderState {
  readonly _tag: RouteLadderState["_tag"];
  /** R9: active = at least one admitted endpoint AND not rolled back. Derived, never stored. */
  readonly active: boolean;
  readonly admitted: number;
  readonly configured: number;
  readonly reason: string | null;
}

interface LadderLike {
  readonly completeness?: { readonly admitted?: number; readonly configured?: number } | null;
  readonly rolledBack?: { readonly on?: boolean; readonly reason?: string | null } | null;
}

/** R14: no_ladder | partial | complete | rolled_back, from the ladder row alone. */
export function deriveRouteLadderState(ladder: LadderLike | null | undefined): DerivedRouteLadderState {
  const admitted = Number.isFinite(ladder?.completeness?.admitted)
    ? Number(ladder?.completeness?.admitted)
    : 0;
  const configured = Number.isFinite(ladder?.completeness?.configured)
    ? Number(ladder?.completeness?.configured)
    : 0;
  const reason = ladder?.rolledBack?.reason ?? null;
  if (Boolean(ladder?.rolledBack?.on)) {
    return { _tag: "RolledBack", active: false, admitted, configured, reason };
  }
  if (admitted <= 0) return { _tag: "NoLadder", active: false, admitted, configured, reason };
  if (configured > 0 && admitted >= configured) {
    return { _tag: "Complete", active: true, admitted, configured, reason };
  }
  return { _tag: "Partial", active: true, admitted, configured, reason };
}

/** D9: compose the composite ladder scope key; both halves must be non-empty and NUL-free. */
export function encodeRouteScopeKey(input: {
  readonly roleId: string;
  readonly taskTypeId: string;
}): RouteScopeKey {
  const roleId = typeof input?.roleId === "string" ? input.roleId : "";
  const taskTypeId = typeof input?.taskTypeId === "string" ? input.taskTypeId : "";
  if (!roleId || !taskTypeId || roleId.includes(NUL) || taskTypeId.includes(NUL)) {
    throw new ScopeMismatch({
      detail: "a route scope key needs a non-empty NUL-free roleId and taskTypeId",
    });
  }
  return roleId + NUL + taskTypeId;
}

/** D9/R13: split the composite key; a malformed key is a ScopeMismatch, never a guess. */
export function decodeRouteScopeKey(scopeKey: unknown): {
  readonly roleId: string;
  readonly taskTypeId: string;
} {
  if (typeof scopeKey !== "string") {
    throw new ScopeMismatch({ detail: "a route scope key must be a string" });
  }
  const first = scopeKey.indexOf(NUL);
  const second = first === -1 ? -1 : scopeKey.indexOf(NUL, first + 1);
  if (first <= 0 || second !== -1 || first === scopeKey.length - 1) {
    throw new ScopeMismatch({
      detail: "a route scope key needs exactly one NUL with both halves non-empty",
    });
  }
  return { roleId: scopeKey.slice(0, first), taskTypeId: scopeKey.slice(first + 1) };
}

export function scopeKeyFor(roleId: string, taskTypeId: string): RouteScopeKey {
  return encodeRouteScopeKey({ roleId, taskTypeId });
}

/* ------------------------------ focus task selection (R8) ------------------------------ */

/** One candidate (role, task) family, as the request census reports it. */
export interface RouteFocusCandidate {
  readonly roleId: string;
  readonly taskTypeId: string;
  /** Requests recorded inside the staleness window; 0 means "never requested". */
  readonly requestCount: number;
  readonly admitted: number;
  readonly configured: number;
  /** R10: a rolled-back task is paused - it is not dispatched while the flag is ON. */
  readonly rolledBack?: boolean;
}

export interface RouteFocusTask {
  readonly roleId: string;
  readonly taskTypeId: string;
  readonly scopeKey: RouteScopeKey;
  readonly requestCount: number;
  readonly admitted: number;
  readonly configured: number;
  /** R8: configured - admitted, so the tick can size the remaining fill. */
  readonly remaining: number;
}

/**
 * R8: the dispatcher holds ONE focus task. A (role, task) with no recorded request never enters the
 * work queue; among the rest, most-requested (over the staleness window) wins, then most-unfilled.
 * The comparator is total and deterministic, so input order never changes the choice - the same
 * guarantee R2 makes for the ladder itself.
 */
export function selectFocusTask(
  candidates: readonly RouteFocusCandidate[] | null | undefined,
): RouteFocusTask | null {
  const eligible = (Array.isArray(candidates) ? candidates : []).filter(
    (candidate) =>
      Boolean(candidate) &&
      candidate.rolledBack !== true &&
      typeof candidate.roleId === "string" &&
      candidate.roleId.length > 0 &&
      typeof candidate.taskTypeId === "string" &&
      candidate.taskTypeId.length > 0 &&
      Number.isFinite(candidate.requestCount) &&
      Number(candidate.requestCount) > 0,
  );
  if (eligible.length === 0) return null;
  const sorted = [...eligible].sort((left, right) => {
    // Most-requested first.
    if (right.requestCount !== left.requestCount) return right.requestCount - left.requestCount;
    // Then most-unfilled (largest gap between configured and admitted).
    const leftGap = Math.max(0, (left.configured ?? 0) - (left.admitted ?? 0));
    const rightGap = Math.max(0, (right.configured ?? 0) - (right.admitted ?? 0));
    if (rightGap !== leftGap) return rightGap - leftGap;
    // Then a stable, content-derived tie-break so the choice is input-order independent.
    const leftKey = left.roleId + NUL + left.taskTypeId;
    const rightKey = right.roleId + NUL + right.taskTypeId;
    return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
  });
  const chosen = sorted[0] as RouteFocusCandidate;
  const admitted = Number.isFinite(chosen.admitted) ? Number(chosen.admitted) : 0;
  const configured = Number.isFinite(chosen.configured) ? Number(chosen.configured) : 0;
  return {
    roleId: chosen.roleId,
    taskTypeId: chosen.taskTypeId,
    scopeKey: scopeKeyFor(chosen.roleId, chosen.taskTypeId),
    requestCount: Number(chosen.requestCount),
    admitted,
    configured,
    remaining: Math.max(0, configured - admitted),
  };
}

/* ------------------------------- dispatch planning (R8) ------------------------------- */

export interface RouteFocusDispatchInput {
  readonly focus: { readonly roleId: string; readonly taskTypeId: string } | null | undefined;
  /** The task's source request, replayed against an as-yet-unranked configured endpoint. */
  readonly replayableCapture: { readonly captureRef: string } | null | undefined;
  readonly configuredEndpointIds: readonly string[];
  readonly admittedEndpointIds: readonly string[];
  readonly rungs?: readonly RouteLadderRung[] | null;
}

export interface PlannedFocusDispatch {
  readonly roleId: string;
  readonly taskTypeId: string;
  readonly scopeKey: RouteScopeKey;
  readonly captureRef: string;
  /** R8: the counterfactual arm - an as-yet-unranked CONFIGURED endpoint. */
  readonly endpointId: string;
}

/**
 * R8: each counterfactual is the task's source request replayed against an as-yet-unranked
 * configured endpoint. Returns NoReplayableRequest when the task has no replayable capture (the
 * dispatcher then skips the task) and null when there is nothing left to fill.
 *
 * Only NON-ROUTABLE rungs are skipped here (status: unavailable, R4); per-request eligibility is
 * the router's own filter and never narrows the CONFIGURED set this walk fills.
 */
export function planFocusDispatch(
  input: RouteFocusDispatchInput,
): PlannedFocusDispatch | NoReplayableRequest | null {
  const focus = input?.focus;
  if (!focus || !focus.roleId || !focus.taskTypeId) return null;
  if (!input.replayableCapture || !input.replayableCapture.captureRef) {
    return new NoReplayableRequest({
      detail: "the focus task has no replayable capture, so the dispatcher skips it",
      roleId: focus.roleId,
      taskTypeId: focus.taskTypeId,
    });
  }
  const admitted = new Set(
    (input.admittedEndpointIds ?? []).filter(
      (value) => typeof value === "string" && value.length > 0,
    ),
  );
  const unavailable = new Set(
    (input.rungs ?? [])
      .filter((rung) => rung?.status === "unavailable")
      .map((rung) => rung.endpointId)
      .filter((value): value is string => typeof value === "string" && value.length > 0),
  );
  /**
   * R8: the counterfactual is an AS-YET-UNRANKED endpoint. A rung that already carries a rank is
   * ranked (whether or not it passed the floor), so it is not the gap this fill targets.
   */
  const ranked = new Set(
    (input.rungs ?? [])
      .map((rung) => rung.endpointId)
      .filter((value): value is string => typeof value === "string" && value.length > 0),
  );
  for (const endpointId of input.configuredEndpointIds ?? []) {
    if (typeof endpointId !== "string" || endpointId.length === 0) continue;
    if (admitted.has(endpointId)) continue;
    if (unavailable.has(endpointId)) continue;
    if (ranked.has(endpointId)) continue;
    return {
      roleId: focus.roleId,
      taskTypeId: focus.taskTypeId,
      scopeKey: scopeKeyFor(focus.roleId, focus.taskTypeId),
      captureRef: input.replayableCapture.captureRef,
      endpointId,
    };
  }
  return null;
}

/* --------------------------- derived activation (R9/D7) --------------------------- */

/** A finalized, effort-comparable comparison of one endpoint, as A's floor consumes it. */
export interface RouteLadderComparisonRecord {
  readonly endpointId: string;
  readonly confidence: number;
  readonly effortComparable?: boolean;
}

/** A's admission-floor answer (admissionFloor(records, {minComparisons, minConfidence})). */
export interface AdmissionFloorAnswer {
  readonly admitted: readonly string[];
  readonly admittedStats?: Readonly<
    Record<string, { readonly comparisonCount: number; readonly meanConfidence: number }>
  >;
  readonly belowFloorStats?: Readonly<
    Record<string, { readonly comparisonCount: number; readonly meanConfidence: number }>
  >;
}

export type AdmissionFloorPredicate = (input: {
  readonly records: readonly RouteLadderComparisonRecord[];
  readonly minComparisons: number;
  readonly minConfidence: number;
}) => AdmissionFloorAnswer;

export interface RouteLadderActivationInput {
  readonly records: readonly RouteLadderComparisonRecord[];
  readonly configuredEndpointIds: readonly string[];
  readonly defaults: RouteLearningDefaults;
  /** A's predicate, consumed with the SAME defaults (the A -> D cross-package interface). */
  readonly admissionFloor: AdmissionFloorPredicate;
  readonly rolledBack?: RouteLadderRolledBack | null;
  readonly roleId?: string;
  readonly taskTypeId?: string;
}

export interface RouteLadderActivationResult {
  readonly scopeKey: RouteScopeKey | null;
  /** D7: derived. True iff an endpoint passed the floor AND the task is not rolled back. */
  readonly active: boolean;
  readonly state: DerivedRouteLadderState;
  readonly admittedEndpointIds: readonly string[];
  /** R9: an endpoint below the floor is a shadow candidate - the previous ladder stays authoritative. */
  readonly shadowEndpointIds: readonly string[];
  readonly configuredEndpointIds: readonly string[];
  readonly completeness: { readonly admitted: number; readonly configured: number };
  readonly defaults: RouteLearningDefaults;
  readonly evidence: InsufficientEvidence | null;
  /** R13: Option - the admitted rungs are absent when there is no ladder. */
  readonly rungs: readonly RouteLadderRung[] | null;
}

/** R13: the record list the floor predicate reads; a non-effort-comparable arm is excluded (R3). */
const effortComparableRecords = (
  records: readonly RouteLadderComparisonRecord[] | null | undefined,
): readonly RouteLadderComparisonRecord[] =>
  (Array.isArray(records) ? records : []).filter(
    (record) =>
      Boolean(record) &&
      typeof record.endpointId === "string" &&
      record.endpointId.length > 0 &&
      Number.isFinite(record.confidence) &&
      record.effortComparable !== false,
  );

/**
 * R9/D7: derive activation from the admission floor. There is NO promote-then-activate step and no
 * mutable active-pack pointer: an endpoint at or above K finalized effort-comparable comparisons
 * with mean confidence >= minConfidence makes the ladder active by construction.
 *
 * InsufficientEvidence -> no ladder, no advisory, baseline routing.
 * A rolled-back task -> no advisory even when its floor is met (R10).
 */
export const evaluateRouteLadderActivation = (
  input: RouteLadderActivationInput,
): Effect.Effect<RouteLadderActivationResult, never> =>
  Effect.sync(() => {
    const defaults = input.defaults;
    const scopeKey =
      typeof input.roleId === "string" &&
      input.roleId.length > 0 &&
      typeof input.taskTypeId === "string" &&
      input.taskTypeId.length > 0
        ? scopeKeyFor(input.roleId, input.taskTypeId)
        : null;
    const configuredEndpointIds = (input.configuredEndpointIds ?? []).filter(
      (value) => typeof value === "string" && value.length > 0,
    );
    const records = effortComparableRecords(input.records);
    const answer = input.admissionFloor({
      records,
      minComparisons: defaults.minComparisons,
      minConfidence: defaults.minConfidence,
    });
    /** The admitted set is intersected with the CONFIGURED set: configured is the denominator (R4). */
    const admittedEndpointIds = (answer.admitted ?? []).filter(
      (value): value is string =>
        typeof value === "string" && value.length > 0 && configuredEndpointIds.includes(value),
    );
    const shadowEndpointIds = Object.keys(answer.belowFloorStats ?? {}).filter((value) =>
      configuredEndpointIds.includes(value),
    );
    const completeness = {
      admitted: admittedEndpointIds.length,
      configured: configuredEndpointIds.length,
    };
    const rolledBack = input.rolledBack ?? { on: false, reason: null, atMs: null };
    const state = deriveRouteLadderState({ completeness, rolledBack });
    const rungs: readonly RouteLadderRung[] | null =
      admittedEndpointIds.length > 0
        ? admittedEndpointIds.map((endpointId, index) => ({
            endpointId,
            rank: index + 1,
            status: "available" as const,
          }))
        : null;
    return {
      scopeKey,
      active: state.active,
      state,
      admittedEndpointIds,
      shadowEndpointIds,
      configuredEndpointIds,
      completeness,
      defaults,
      evidence:
        admittedEndpointIds.length === 0
          ? new InsufficientEvidence({
              detail: "no endpoint passed the admission floor, so there is no ladder and no advisory",
            })
          : null,
      rungs,
    };
  });

/* --------------------------- challenge planning (R8) --------------------------- */

export interface PlannedChallengeComparison {
  readonly newEndpointId: string;
  readonly againstEndpointId: string;
  readonly rank: number;
}

export interface PlanChallengeInput {
  readonly newEndpointId: string;
  readonly rungs: readonly RouteLadderRung[] | null | undefined;
  /** R11: how many sequential top-down comparisons one dispatch may run. */
  readonly challengeBatchSize: number;
}

/**
 * R8: a new configured endpoint breaks the idle immediately and starts a TOP-DOWN challenge - the
 * leader first, then the next rung - one pairwise comparison per challenged rung, bounded by
 * challengeBatchSize. Only the rank order decides: a rung is skipped when it is not routable
 * (status unavailable, R4) or when it IS the new endpoint (a comparison needs two distinct arms).
 */
export function planChallenge(input: PlanChallengeInput): readonly PlannedChallengeComparison[] {
  const batchSize = Number.isSafeInteger(input?.challengeBatchSize)
    ? Number(input.challengeBatchSize)
    : 0;
  if (batchSize < 1) return [];
  const newEndpointId = typeof input?.newEndpointId === "string" ? input.newEndpointId : "";
  if (!newEndpointId) return [];
  const ordered = [...(input.rungs ?? [])]
    .filter((rung) => rung && typeof rung.endpointId === "string" && rung.endpointId.length > 0)
    .sort((left, right) => left.rank - right.rank);
  const planned: PlannedChallengeComparison[] = [];
  for (const rung of ordered) {
    if (planned.length >= batchSize) break;
    if (rung.status !== "available") continue;
    if (rung.endpointId === newEndpointId) continue;
    planned.push({ newEndpointId, againstEndpointId: rung.endpointId, rank: rung.rank });
  }
  return planned;
}

/* --------------------------- per-task rollback (R10/D8) --------------------------- */

export interface LandRollbackToggleInput {
  readonly rolledBack: RouteLadderRolledBack | null | undefined;
  readonly rolledBackOn: boolean;
  readonly reason?: string | null;
  readonly atMs?: number | null;
}

/**
 * R10/D8: land the per-(role, task) rollback flag. ON records the operator reason and the time; OFF
 * is reversible and KEEPS the reason for the audit trail. The returned shape is exactly
 * {on, reason, atMs} - it never names a pack, a validation receipt, or the legacy receipt-bound
 * rollbackPack path, and the toggle is idempotent for an unchanged flag.
 */
export function landRollbackToggle(input: LandRollbackToggleInput): RouteLadderRolledBack {
  const current: RouteLadderRolledBack = {
    on: Boolean(input?.rolledBack?.on),
    reason: input?.rolledBack?.reason ?? null,
    atMs: Number.isFinite(input?.rolledBack?.atMs) ? Number(input?.rolledBack?.atMs) : null,
  };
  const requested = Boolean(input?.rolledBackOn);
  if (current.on === requested) return current;
  if (requested) {
    const requestedReason =
      typeof input.reason === "string" && input.reason.length > 0 ? input.reason : null;
    return {
      on: true,
      reason: requestedReason ?? current.reason ?? "operator_rollback",
      atMs: Number.isFinite(input.atMs) ? Number(input.atMs) : Date.now(),
    };
  }
  // Roll-forward keeps the reason (the audit trail) and clears the activation marker.
  return { on: false, reason: current.reason, atMs: null };
}

/* ------------------------------ idle / refresh (R8/R11) ------------------------------ */

/** R8: how long a complete task idles before a refresh replay (the ONE 30-day constant, R11). */
export function stalenessWindowMs(defaults: RouteLearningDefaults): number {
  return Math.max(0, Math.trunc(defaults.stalenessWindowDays)) * 24 * 60 * 60 * 1000;
}

/** R8: a complete task is idle until nextEligibleAtMs passes; a new endpoint sets it to now. */
export function isRefreshEligible(input: {
  readonly completeness: { readonly admitted: number; readonly configured: number };
  readonly nextEligibleAtMs: number | null | undefined;
  readonly nowMs: number;
}): boolean {
  const complete =
    input.completeness.configured > 0 && input.completeness.admitted >= input.completeness.configured;
  if (!complete) return true;
  if (!Number.isFinite(input.nextEligibleAtMs)) return true;
  return Number(input.nextEligibleAtMs) <= input.nowMs;
}

/* --------------------------- classification gate (R1/R8) --------------------------- */

/**
 * R1/R8: queue admission requires a (role, task) classification. A capture without BOTH ids is
 * never admitted to the replay/eval queue and never gets an advisory; the tick reports it once as
 * no_route_classification instead of guessing a scope from the request.
 */
export function classifyRouteLadderServingState(input: {
  readonly roleId?: string | null;
  readonly taskTypeId?: string | null;
}): { readonly classified: boolean; readonly code: "no_route_classification" | null } {
  const roleId = typeof input?.roleId === "string" ? input.roleId.trim() : "";
  const taskTypeId = typeof input?.taskTypeId === "string" ? input.taskTypeId.trim() : "";
  if (roleId && taskTypeId) return { classified: true, code: null };
  return { classified: false, code: "no_route_classification" };
}
