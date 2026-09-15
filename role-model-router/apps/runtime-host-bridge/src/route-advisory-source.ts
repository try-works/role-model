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
  readonly preferredRoutePackage: string | null;
  readonly advisoryState: TrackBRouteAdvisoryStateName;
  readonly confidence: number;
  readonly candidateId: string | null;
  readonly advisoryId: string | null;
  readonly cohortPercent: number;
  readonly reason: string | null;
}

export interface TrackBRouteAdvisorySourceInput {
  /** Invokes one `knowledge-store` capability and returns its business result. */
  readonly invoke: (
    capability: string,
    value: Readonly<Record<string, unknown>>,
  ) => Promise<unknown>;
  readonly scopeId: string;
  readonly nowMs: number;
  readonly evidenceMaxAgeMs: number;
}

/**
 * Run 99 R24: the cohort a live decision may use.
 *
 * `AC-R05-04` makes the operator activation the authorization, and the activation receipt
 * carries the ladder step. At `S2` the policy considers every eligible decision, so the
 * receipted step is the narrower bound; at `S3`/`S4` the durable ladder step is the rollout
 * state itself and therefore governs. With no active pack the policy value stands.
 */
export function resolveAdvisoryCohortPercent(input: {
  readonly stage: string;
  readonly policyCohortPercent: number;
  readonly rolloutCohortPercent: number | null;
}): number {
  const clamp = (value: number): number =>
    Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
  const policy = clamp(input.policyCohortPercent);
  const rollout =
    input.rolloutCohortPercent === null ? null : clamp(input.rolloutCohortPercent);
  if (rollout === null || rollout <= 0) return policy;
  if (input.stage === "S3" || input.stage === "S4") return rollout;
  return Math.min(policy, rollout);
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
    advisoryState: "unavailable",
    confidence: 0,
    candidateId: null,
    advisoryId: null,
    cohortPercent,
    reason,
  };
}

function isDegradationReceipt(value: Record<string, unknown> | null): boolean {
  if (!value) return true;
  if (value.degraded === true) return true;
  const schemaVersion = boundedText(value.schemaVersion);
  return Boolean(schemaVersion?.includes("degradation"));
}

function findRecord(
  answer: unknown,
  recordId: string,
): Record<string, unknown> | null {
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
  if (!scopeId) return unavailable("scope id required");

  let rolloutAnswer: unknown;
  try {
    rolloutAnswer = await input.invoke("knowledge:rollout-state", { scopeId });
  } catch (error) {
    return unavailable(
      `rollout state unavailable: ${String(
        (error as { message?: unknown })?.message ?? error,
      ).slice(0, 120)}`,
    );
  }
  const rollout = asRecord(rolloutAnswer);
  if (!rollout || isDegradationReceipt(rollout)) {
    return unavailable("rollout state unavailable");
  }
  const cohortPercentRaw = finiteOrNull(rollout.cohortPercent) ?? 0;
  const cohortPercent = Math.min(100, Math.max(0, cohortPercentRaw));
  const killSwitchAtMs = finiteOrNull(rollout.killSwitchAtMs);
  if (killSwitchAtMs !== null) return unavailable("kill switch engaged", cohortPercent);
  const activePackageId = boundedText(rollout.activePackageId);
  if (!activePackageId) return unavailable("no active pack", cohortPercent);

  let packAnswer: unknown;
  let validationAnswer: unknown;
  try {
    packAnswer = await input.invoke("knowledge:list-learning", {
      scopeId,
      kind: "pack",
      limit: 200,
    });
    validationAnswer = await input.invoke("knowledge:list-learning", {
      scopeId,
      kind: "validation_receipt",
      limit: 200,
    });
  } catch (error) {
    return unavailable(
      `learning records unavailable: ${String(
        (error as { message?: unknown })?.message ?? error,
      ).slice(0, 120)}`,
      cohortPercent,
    );
  }

  const packEntry = findRecord(packAnswer, activePackageId);
  const pack = asRecord(packEntry?.record);
  if (!pack) return unavailable("active pack record unavailable", cohortPercent);
  // The Knowledge Store persists the pack scope as an endpoint id (observed live on
  // pack-4f96d9b1…), while an older or auxiliary shape may carry route-package attribution.
  const packScope = asRecord(pack.scope);
  const routePackage =
    boundedText(packScope?.endpointId) ??
    boundedText(packScope?.routePackage) ??
    boundedText(asRecord(pack.routePackageAttribution)?.routePackage);
  if (!routePackage) return unavailable("active pack carries no route package", cohortPercent);
  const validationReceiptId = boundedText(pack.validationReceiptId);
  if (!validationReceiptId) {
    return unavailable("active pack has no validation receipt", cohortPercent);
  }

  const validationEntry = findRecord(validationAnswer, validationReceiptId);
  const validation = asRecord(validationEntry?.record);
  if (!validation) return unavailable("validation receipt unavailable", cohortPercent);
  if (boundedText(validation.decision) !== "validate") {
    return unavailable("validation receipt does not validate", cohortPercent);
  }
  const confidenceLower = finiteOrNull(validation.confidenceLower);
  if (confidenceLower === null) {
    return unavailable("validation receipt carries no confidence", cohortPercent);
  }
  const confidence = clampUnit(confidenceLower);
  const createdAtMs = parseTimestampMs(validation.createdAt);
  const withinWindow =
    createdAtMs === null
      ? true
      : !Number.isFinite(input.evidenceMaxAgeMs) ||
        input.evidenceMaxAgeMs <= 0 ||
        input.nowMs - createdAtMs <= input.evidenceMaxAgeMs;
  const experienceIds = Array.isArray(pack.experienceIds) ? pack.experienceIds : [];
  const candidateId = boundedText(experienceIds[0]);

  return {
    preferredRoutePackage: routePackage,
    advisoryState: withinWindow ? "fresh" : "stale",
    confidence,
    candidateId,
    advisoryId: activePackageId,
    cohortPercent,
    reason: withinWindow ? null : "validation evidence beyond the evidence window",
  };
}
