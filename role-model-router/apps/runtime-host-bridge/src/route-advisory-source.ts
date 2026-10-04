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

import { createHash } from "node:crypto";

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
  readonly roleId?: string | null;
  readonly taskTypeId?: string | null;
  readonly nowMs: number;
  readonly evidenceMaxAgeMs: number;
  /** `revalidationIntervalDays` from the operator policy, as milliseconds. */
  readonly revalidationIntervalMs?: number | null;
  /** Explicit effective learning policy; absence never implies 100% exposure. */
  readonly stage?: string;
  readonly policyCohortPercent?: number;
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
  if (process.env.ROLE_MODEL_ADVISORY_DIAG) console.error(`[advisory-diag] unavailable: ${reason}`);
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
  // Negative readbacks retain their key so publishers overwrite a fresh cache after rollback.
  const refuse = (reason: string): TrackBRouteAdvisorySourceResult => ({
    ...unavailable(reason),
    roleId,
    taskTypeId,
  });
  if (!scopeId) return refuse("scope id required");
  // Compatibility for pre-classification callers only (absent fields, NOT a null/partial pair).
  // Classified failures never enter the scope-only activation path.
  if (input.roleId === undefined && input.taskTypeId === undefined)
    return readLegacyScopeAdvisory(input);
  if (!roleId || !taskTypeId) return refuse("role and task scope required");
  if (!validPercent(input.policyCohortPercent) || !["S2", "S3", "S4"].includes(input.stage ?? ""))
    return refuse("effective advisory policy unavailable");
  if (
    !validTime(input.nowMs) ||
    !positiveFinite(input.evidenceMaxAgeMs) ||
    (input.revalidationIntervalMs != null && !positiveFinite(input.revalidationIntervalMs))
  )
    return refuse("evidence clock or window unavailable");
  // Keep the existing injected Promise capability boundary: a new Effect runtime would add
  // resource machinery to three bounded reads, not improve the host-owned resource lifetime.
  try {
    const payload = asRecord(
      await input.invoke("knowledge:read-route-ladder", { scopeId, roleId, taskTypeId }),
    );
    if (
      !payload ||
      isDegradationReceipt(payload) ||
      payload.schemaVersion !== "role-model.route-ladder-read.v1" ||
      payload.contract !== "RouteLadderPackV1" ||
      payload.roleId !== roleId ||
      payload.taskTypeId !== taskTypeId
    )
      return refuse("route ladder unavailable or scope mismatch");
    const ladder = asRecord(payload.ladder);
    if (!ladder) return refuse("no admitted rung");
    if (
      ladder.contract !== "RouteLadderPackV1" ||
      ladder.scopeId !== scopeId ||
      !Number.isSafeInteger(ladder.version) ||
      Number(ladder.version) < 1
    )
      return refuse("route ladder scope or version mismatch");
    const rollback = asRecord(ladder.rolledBack);
    if (!rollback || typeof rollback.on !== "boolean")
      return refuse("route ladder rollback unavailable");
    if (rollback.on) return refuse("rolled back");
    const rungs = parseRungs(ladder.rungs);
    if (!rungs) return refuse("route ladder rungs malformed");
    const advisoryLadder = rungs.filter((rung) => rung.status === "available");
    if (!advisoryLadder.length) return refuse("no admitted rung");
    const completeness = asRecord(ladder.completeness);
    if (
      !completeness ||
      !Number.isSafeInteger(completeness.admitted) ||
      !Number.isSafeInteger(completeness.configured) ||
      Number(completeness.configured) < 1 ||
      Number(completeness.configured) > 64 ||
      Number(completeness.admitted) !== advisoryLadder.length ||
      Number(completeness.admitted) > Number(completeness.configured)
    )
      return refuse("route ladder completeness malformed");
    const packId = boundedText(ladder.packId);
    const taxonomyVersion =
      ladder.taxonomyVersion == null ? null : boundedText(ladder.taxonomyVersion);
    if (!packId || (ladder.taxonomyVersion != null && !taxonomyVersion))
      return refuse("route ladder provenance unavailable");
    // packId is the real content-addressed knowledge DOCUMENT, not a learning-record id.
    const rawDocument = asRecord(await input.invoke("knowledge:read", { id: packId, scope: scopeId }));
    // The host envelope merges the transport fields (businessOutput, durableLocator, evidenceRef,
    // readCapability, workerPid) beside the document, so the content-addressed digest must be computed
    // over the INNER document the knowledge-store actually addressed, not the envelope.
    const document = asRecord(rawDocument?.businessOutput) ?? rawDocument;
    const metadata = asRecord(document?.provenance);
    if (process.env.ROLE_MODEL_ADVISORY_DIAG) {
      console.error(`[advisory-diag] doc keys=${Object.keys(document ?? {}).join(",")} type=${document?.type} ver=${document?.version} docScope=${document?.scope} scopeId=${scopeId} mScopeId=${metadata?.scopeId} mRole=${metadata?.roleId} roleId=${roleId} mTask=${metadata?.taskTypeId} taskId=${taskTypeId} mTax=${metadata?.taxonomyVersion} tax=${taxonomyVersion} digestMatch=${document ? documentDigest(document) === packId : false}`);
    }
    if (
      !document ||
      isDegradationReceipt(document) ||
      documentDigest(document) !== packId ||
      document.type !== "route_ladder_evidence" ||
      document.version !== 1 ||
      document.scope !== scopeId ||
      !metadata ||
      metadata.scopeId !== scopeId ||
      metadata.roleId !== roleId ||
      metadata.taskTypeId !== taskTypeId ||
      metadata.taxonomyVersion !== taxonomyVersion
    )
      return refuse("route ladder evidence scope or provenance mismatch");
    // Observed watermark and accepted ranking are different: a below-floor append must not
    // replace the last authoritative proof, and USER removal must not erase historical proof.
    const groupIds = parseUniqueIds(metadata.groupIds, 4096);
    const rankGroupIds = parseUniqueIds(metadata.rankEvidenceGroupIds, 4096);
    const effectiveIds = parseUniqueIds(metadata.effectiveAdmittedEndpointIds, 64);
    const endpointEvidence = asRecord(metadata.endpointEvidence);
    const admissionPolicy = asRecord(metadata.admissionPolicy);
    if (
      !groupIds ||
      !rankGroupIds ||
      rankGroupIds.some((id) => !groupIds.includes(id)) ||
      typeof metadata.rankEvidenceDigest !== "string" ||
      !/^[a-f0-9]{64}$/.test(metadata.rankEvidenceDigest)
    )
      return refuse("route ladder accepted ranking evidence unavailable");
    if (
      !effectiveIds ||
      !endpointEvidence ||
      effectiveIds.length !== rungs.length ||
      Object.keys(endpointEvidence).length !== effectiveIds.length ||
      rungs.some((rung) => !effectiveIds.includes(rung.endpointId)) ||
      effectiveIds.some((id) => !Object.hasOwn(endpointEvidence, id))
    )
      return refuse("route ladder effective endpoint evidence unavailable");
    if (
      !admissionPolicy ||
      !Number.isSafeInteger(admissionPolicy.minComparisons) ||
      Number(admissionPolicy.minComparisons) < 1 ||
      !validUnit(admissionPolicy.minConfidence)
    )
      return refuse("route ladder accepted admission policy unavailable");
    const means: number[] = [],
      times: number[] = [],
      versions: (string | null)[] = [];
    for (const rung of rungs) {
      const evidence = asRecord(endpointEvidence[rung.endpointId]);
      const ownGroups = parseUniqueIds(evidence?.groupIds, 4096);
      const ownVersion = evidence?.taxonomyVersion;
      if (
        !evidence ||
        !ownGroups ||
        !Number.isSafeInteger(evidence.comparisonCount) ||
        Number(evidence.comparisonCount) < Number(admissionPolicy.minComparisons) ||
        Number(evidence.comparisonCount) !== ownGroups.length ||
        ownGroups.some((id) => !groupIds.includes(id)) ||
        !validUnit(evidence.meanConfidence) ||
        evidence.meanConfidence < admissionPolicy.minConfidence ||
        (ownVersion !== null && !boundedText(ownVersion)) ||
        (evidence.evidenceAtMs !== null &&
          (!validTime(evidence.evidenceAtMs) || evidence.evidenceAtMs > input.nowMs))
      )
        return refuse("route ladder accepted endpoint proof malformed");
      versions.push(ownVersion as string | null);
      if (rung.status === "available") {
        if (!validTime(evidence.evidenceAtMs))
          return refuse("route ladder evidence time unavailable");
        means.push(evidence.meanConfidence);
        times.push(evidence.evidenceAtMs);
      }
    }
    // Taxonomy is solely measured provenance. Caller context cannot relabel old evidence.
    const uniqueVersions = [...new Set(versions)];
    const measuredVersion = uniqueVersions.length === 1 ? uniqueVersions[0] : null;
    if (taxonomyVersion !== measuredVersion)
      return refuse("route ladder evidence taxonomy mismatch");
    const confidence = Math.min(...means),
      evidenceAtMs = Math.min(...times);
    if (!validUnit(metadata.confidence) || Math.abs(metadata.confidence - confidence) > 1e-12)
      return refuse("route ladder confidence mismatch");
    if (!validTime(metadata.evidenceAtMs) || metadata.evidenceAtMs !== evidenceAtMs)
      return refuse("route ladder evidence time mismatch");
    // Derived activation never requires activePackageId/promotion, but scope-wide safety remains.
    const rollout = asRecord(await input.invoke("knowledge:rollout-state", { scopeId, limit: 1 }));
    if (
      !rollout ||
      isDegradationReceipt(rollout) ||
      rollout.schemaVersion !== "role-model.route-package-rollout-state.v1" ||
      rollout.scopeId !== scopeId ||
      !["disabled", "active", "rolled_back"].includes(String(rollout.state)) ||
      !validPercent(rollout.cohortPercent) ||
      (rollout.killSwitchAtMs !== null && !validTime(rollout.killSwitchAtMs)) ||
      !Array.isArray(rollout.breaches) ||
      rollout.breaches.length > 100
    )
      return refuse("route rollout safety unavailable");
    if (rollout.killSwitchAtMs !== null) return refuse("kill switch engaged");
    if (rollout.state === "rolled_back") return refuse("guardrail or scope rollback engaged");
    for (const entry of rollout.breaches) {
      const breach = asRecord(entry);
      if (
        !breach ||
        breach.schemaVersion !== "role-model.guardrail-breach.v1" ||
        breach.scopeId !== scopeId ||
        !validTime(breach.atMs) ||
        (breach.windowMs !== null && !positiveFinite(breach.windowMs))
      )
        return refuse("guardrail evidence malformed");
      // Legacy store auto-rollback requires an active pack pointer; derived ladders have none.
      // Honor the SAME sustained threshold, never interpret a pending transient as rollback.
      if (breach.windowMs === null) return refuse("guardrail rollback engaged");
      if (!validTime(breach.sustainedMs)) return refuse("guardrail duration unavailable");
      if (breach.sustainedMs >= breach.windowMs)
        return refuse("sustained guardrail rollback engaged");
    }
    const cohortPercent = resolveAdvisoryCohortPercent({
      stage: input.stage!,
      policyCohortPercent: input.policyCohortPercent,
      rolloutCohortPercent: rollout.cohortPercent,
    });
    const ageMs = input.nowMs - metadata.evidenceAtMs;
    const revalidationDue =
      input.revalidationIntervalMs != null && ageMs > input.revalidationIntervalMs;
    const stale = revalidationDue || ageMs > input.evidenceMaxAgeMs;
    return {
      preferredRoutePackage: advisoryLadder[0]?.endpointId ?? null,
      advisoryLadder,
      advisoryState: stale ? "stale" : "fresh",
      confidence,
      candidateId: packId,
      advisoryId: packId,
      cohortPercent,
      reason: revalidationDue
        ? "route ladder revalidation due"
        : stale
          ? "route ladder evidence beyond the evidence window"
          : null,
      roleId,
      taskTypeId,
      taxonomyVersion,
      revalidationDue,
    };
  } catch {
    return refuse("route ladder evidence or rollout unavailable");
  }
}

// Match KnowledgeStore.put/get: get returns raw JSON without an invented id wrapper.
const canonicalDocument = (value: unknown): string =>
  Array.isArray(value)
    ? "[" + value.map(canonicalDocument).join(",") + "]"
    : value && typeof value === "object"
      ? "{" +
        Object.keys(value)
          .sort()
          .map(
            (key) =>
              JSON.stringify(key) +
              ":" +
              canonicalDocument((value as Record<string, unknown>)[key]),
          )
          .join(",") +
        "}"
      : JSON.stringify(value);
const documentDigest = (value: Record<string, unknown>): string =>
  createHash("sha256").update(canonicalDocument(value)).digest("hex");

const validUnit = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
const validPercent = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;
const validTime = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;
const positiveFinite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;
function parseUniqueIds(value: unknown, limit: number): string[] | null {
  if (
    !Array.isArray(value) ||
    !value.length ||
    value.length > limit ||
    value.some(
      (id) =>
        typeof id !== "string" ||
        !id.trim() ||
        id.includes("\0") ||
        Buffer.byteLength(id, "utf8") > 256,
    ) ||
    new Set(value).size !== value.length
  )
    return null;
  return value as string[];
}
function parseRungs(value: unknown): TrackBRouteAdvisoryRung[] | null {
  if (!Array.isArray(value) || value.length > 64) return null;
  const ranks = new Set<number>(),
    endpoints = new Set<string>();
  const rungs: TrackBRouteAdvisoryRung[] = [];
  for (const entry of value) {
    const rung = asRecord(entry),
      endpointId = boundedText(rung?.endpointId),
      rank = finiteOrNull(rung?.rank);
    if (
      !rung ||
      !endpointId ||
      rank === null ||
      !Number.isSafeInteger(rank) ||
      rank < 1 ||
      ranks.has(rank) ||
      endpoints.has(endpointId) ||
      (rung.status !== "available" && rung.status !== "unavailable")
    )
      return null;
    ranks.add(rank);
    endpoints.add(endpointId);
    rungs.push({ endpointId, rank, status: rung.status });
  }
  rungs.sort((a, b) => a.rank - b.rank);
  return rungs.some((rung, i) => rung.rank !== i + 1) ? null : rungs;
}

async function readLegacyScopeAdvisory(
  input: TrackBRouteAdvisorySourceInput,
): Promise<TrackBRouteAdvisorySourceResult> {
  const scopeId = boundedText(input.scopeId);
  if (!scopeId) return unavailable("scope id required");

  let rolloutAnswer: unknown;
  try {
    // Run 99 R33 (S37 live finding): the advisory only needs the rollout row and the newest
    // activation receipt, but the store's default read returns up to 100 receipts. On the stage
    // root that response tripped the extension host's 16 KiB inline frame cap
    // ("frame exceeds inline limit"), which silently disabled every advisory. Bound the read to
    // the single receipt the advisory uses.
    rolloutAnswer = await input.invoke("knowledge:rollout-state", { scopeId, limit: 1 });
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
  const taskTypeId =
    boundedText(packScope?.taskTypeId) ??
    boundedText(asRecord(pack.routePackageAttribution)?.taskTypeId);
  const taxonomyVersion = boundedText(packScope?.taxonomyVersion);
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
  const revalidationIntervalMs =
    typeof input.revalidationIntervalMs === "number" &&
    Number.isFinite(input.revalidationIntervalMs) &&
    input.revalidationIntervalMs > 0
      ? input.revalidationIntervalMs
      : null;
  const revalidationDue =
    revalidationIntervalMs !== null &&
    createdAtMs !== null &&
    input.nowMs - createdAtMs > revalidationIntervalMs;
  const experienceIds = Array.isArray(pack.experienceIds) ? pack.experienceIds : [];
  const candidateId = boundedText(experienceIds[0]);

  return {
    preferredRoutePackage: routePackage,
    advisoryState: withinWindow && !revalidationDue ? "fresh" : "stale",
    confidence,
    candidateId,
    advisoryId: activePackageId,
    cohortPercent,
    reason: !withinWindow
      ? "validation evidence beyond the evidence window"
      : revalidationDue
        ? "validation evidence beyond the revalidation interval"
        : null,
    taskTypeId,
    taxonomyVersion,
    revalidationDue,
  } as TrackBRouteAdvisorySourceResult;
}
