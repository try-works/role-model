/**
 * Run 99 R24 / addendum 06: the durable source of a live route advisory.
 *
 * Observed on the stage root before this module existed: the host only cached the advisory a
 * single replay pipeline run produced, and that advisory was frequently created from a refused
 * candidate (`candidateId: null`, `preferredRoutePackage: null`, `confidence: 0`) while the
 * Knowledge Store held validated packs with route-package attribution. The operator could open
 * `S2`/`S3`/`S4` and nothing could ever influence a decision, because the router's input was
 * empty. This module reads the durable rollout state and the activated pack, and derives the
 * advisory the router consumes, so activation actually reaches routing.
 *
 * Everything fails closed: any unreadable, missing, stale or non-validating input yields an
 * `unavailable`/`stale` advisory with a bounded reason instead of an influence-widening value.
 */

export const ROUTE_ADVISORY_SOURCE_SCHEMA = "role-model.route-advisory-source.v1";

export type TrackBRouteAdvisoryStateName = "fresh" | "stale" | "unavailable";

export interface TrackBRouteAdvisorySourceResult {
  /**
   * Run 105 R5: the rank-1 AVAILABLE rung of the (role, task) ladder. Retained for the existing
   * single-endpoint consumers; the ladder itself travels in `advisoryLadder`.
   */
  readonly preferredRoutePackage: string | null;
  /**
   * Run 105 R1/R5 (stage 3): the (role, task) ladder, rank-sorted, status-filtered ONLY (the
   * router applies per-request eligibility itself - R4 keeps the two filters separate).
   */
  readonly advisoryLadder: readonly TrackBRouteAdvisoryRung[];
  /** Run 105 R1: the role the ladder was learned for; the router matches (role, task) exact. */
  readonly roleId: string | null;
  readonly advisoryState: TrackBRouteAdvisoryStateName;
  readonly confidence: number;
  readonly candidateId: string | null;
  readonly advisoryId: string | null;
  readonly cohortPercent: number;
  readonly reason: string | null;
  /**
   * Run 99 R33 (addendum 19 S35 / addendum 20 D1-D3): the task family the activated pack was
   * validated for, plus the taxonomy identity behind that label. `null` means the pack declares
   * no family, which the router refuses (`advisory_task_unscoped`) once the request declares one.
   */
  readonly taskTypeId: string | null;
  readonly taxonomyVersion: string | null;
  /**
   * Run 99 R33 (addendum 21 D12): the activation has outlived the operator's revalidation
   * interval, so the advisory is reported stale until the scope is revalidated.
   */
  readonly revalidationDue: boolean;
}

/** Run 105 R4: one rung of the stored (role, task) ladder (status is the STORED user-removal flag). */
export interface TrackBRouteAdvisoryRung {
  readonly endpointId: string;
  readonly rank: number;
  readonly status: "available" | "unavailable";
}

export interface TrackBRouteAdvisorySourceInput {
  /** Invokes one `knowledge-store` capability and returns its business result. */
  readonly invoke: (
    capability: string,
    value: Readonly<Record<string, unknown>>,
  ) => Promise<unknown>;
  readonly scopeId: string;
  /**
   * Run 105 R1: the (role, task) key of the ladder to read. Both are required: a scope-wide pack
   * does not exist any more, so a request with no classification gets no advisory.
   */
  readonly roleId: string | null;
  readonly taskTypeId: string | null;
  readonly nowMs: number;
  readonly evidenceMaxAgeMs: number;
  /** `revalidationIntervalDays` from the operator policy, as milliseconds. */
  readonly revalidationIntervalMs?: number | null;
}

/**
 * Run 99 R24: the cohort a live decision may use.
 *
 * The canonical ladder makes cohorts an `S3`/`S4` mechanism ("S3 bounded cohorts"): `S2` is
 * "advisory-considered" for every eligible decision after hard filters, so it keeps the policy
 * value (100). `S3`/`S4` follow the receipted rollout step, falling back to the policy value when
 * no step is recorded. Clamping still applies, so a cached observation can never widen a step.
 */
export function resolveAdvisoryCohortPercent(input: {
  readonly stage: string;
  readonly policyCohortPercent: number;
  readonly rolloutCohortPercent: number | null;
}): number {
  const clamp = (value: number): number =>
    Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
  const policy = clamp(input.policyCohortPercent);
  const rollout = input.rolloutCohortPercent === null ? null : clamp(input.rolloutCohortPercent);
  const cohortBoundStage = input.stage === "S3" || input.stage === "S4";
  if (!cohortBoundStage) return policy;
  if (rollout === null || rollout <= 0) return policy;
  return rollout;
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const boundedText = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const finiteOrNull = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const clampUnit = (value: number): number => Math.min(1, Math.max(0, value));

function unavailable(reason: string, cohortPercent = 0): TrackBRouteAdvisorySourceResult {
  return {
    preferredRoutePackage: null,
    advisoryLadder: [],
    roleId: null,
    advisoryState: "unavailable",
    confidence: 0,
    candidateId: null,
    advisoryId: null,
    cohortPercent,
    reason,
    taskTypeId: null,
    taxonomyVersion: null,
    revalidationDue: false,
  };
}

function isDegradationReceipt(value: Record<string, unknown> | null): boolean {
  if (!value) return true;
  if (value.degraded === true) return true;
  const schemaVersion = boundedText(value.schemaVersion);
  return Boolean(schemaVersion?.includes("degradation"));
}

function findRecord(answer: unknown, recordId: string): Record<string, unknown> | null {
  const payload = asRecord(answer);
  if (!payload || isDegradationReceipt(payload)) return null;
  const records = Array.isArray(payload.records) ? payload.records : [];
  for (const entry of records) {
    const record = asRecord(entry);
    if (!record) continue;
    if (boundedText(record.recordId) === recordId) return record;
  }
  return null;
}

function parseTimestampMs(value: unknown): number | null {
  const text = boundedText(value);
  if (!text) return null;
  const parsed = Date.parse(text);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function readTrackBRouteAdvisoryFromRollout(
  input: TrackBRouteAdvisorySourceInput,
): Promise<TrackBRouteAdvisorySourceResult> {
  const scopeId = boundedText(input.scopeId);
  const roleId = boundedText(input.roleId);
  const taskTypeId = boundedText(input.taskTypeId);
  if (!scopeId) return unavailable("scope id required");
  if (!roleId || !taskTypeId) return unavailable("role and task scope required");

  let answer: unknown;
  try {
    // Run 105 R7: one indexed lookup keyed by (role_id, task_type_id). The source deliberately
    // does not read the old scope-wide rollout/pack records: D7 made derived ladder activation
    // the sole routing authority, and R1 removed scope-wide packs from the routing surface.
    answer = await input.invoke("knowledge:read-route-ladder", { roleId, taskTypeId });
  } catch (error) {
    return unavailable(
      "route ladder unavailable: " + String((error as { message?: unknown })?.message ?? error).slice(0, 120),
    );
  }
  const payload = asRecord(answer);
  if (!payload || isDegradationReceipt(payload)) return unavailable("route ladder unavailable");
  const ladder = asRecord(payload.ladder);
  if (!ladder) return unavailable("no admitted rung");
  const rolledBack = asRecord(ladder.rolledBack);
  if (rolledBack?.on === true) return unavailable("rolled back");

  // R4/R5: the SOURCE filters only the stored rung status; the router applies per-request
  // eligibility separately when it walks. Ranks are sorted ascending (rank 1 = best).
  const rawRungs = Array.isArray(ladder.rungs) ? ladder.rungs : [];
  const advisoryLadder = rawRungs
    .flatMap((entry): TrackBRouteAdvisoryRung[] => {
      const rung = asRecord(entry);
      if (!rung) return [];
      const endpointId = boundedText(rung.endpointId);
      const rank = finiteOrNull(rung.rank);
      const status =
        rung.status === "unavailable"
          ? ("unavailable" as const)
          : rung.status === "available"
            ? ("available" as const)
            : null;
      if (!endpointId || rank === null || status === null) return [];
      return [{ endpointId, rank, status }];
    })
    .sort((left, right) => left.rank - right.rank)
    .filter((rung) => rung.status === "available");
  if (advisoryLadder.length === 0) return unavailable("no admitted rung");

  const taxonomyVersion = boundedText(ladder.taxonomyVersion) ?? null;
  const packId = boundedText(ladder.packId);
  return {
    preferredRoutePackage: advisoryLadder[0]?.endpointId ?? null,
    advisoryLadder,
    advisoryState: "fresh",
    // Run 105 R9/D7: activation is DERIVED from the admitted rungs, so there is no validation
    // receipt to re-read; the ladder's existence under this key IS the admission. Confidence 1
    // keeps the router's existing confidence floor (0.7) pass for an admitted ladder.
    confidence: 1,
    candidateId: packId,
    advisoryId: packId,
    cohortPercent: 100,
    reason: null,
    roleId,
    taskTypeId,
    taxonomyVersion,
    revalidationDue: false,
  };
}
