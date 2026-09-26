import { assembleDurableLearnerDerivationValue } from "./track-b-learning-pass.js";

/**
 * Run 100 addendum 10, S13: the learner's durable derivation pass.
 *
 * The sweep already consumes candidates; nothing in the runtime creates one outside `runTrackBShadowPipeline`, so a
 * finalized comparison the pipeline never carried is durable evidence no learner can reach. Measured 2026-09-25:
 * 483 learnable finalized comparisons, 202 candidates, 281 learnable groups with no candidate - all 281 name a
 * replay job through `holdout.caseIds`, and 136 of those already carry a persisted `trajectory_signal_reports` row for
 * the capture's live decision.
 *
 * This pass walks a bounded page of finalized groups, keeps the learnable ones, resolves their replay job and the
 * persisted signal report, asks the profile learner for the estimate over the comparison's own rows, assembles the
 * consumer value and presents it. Every step is a durable readback; nothing is synthesized, and a group whose
 * evidence is incomplete is skipped and counted rather than partially written.
 */

export interface LearnerDerivationSummary {
  readonly examined: number;
  readonly attempted: number;
  readonly derived: number;
  readonly skipped: number;
  readonly refused: number;
}

/**
 * The durable evidence a computed report needs beyond the comparison itself: the events the analyzer consumes, the
 * graph reference the capture proves, and the replay reference the job was planned under.
 */
export interface LearnerDerivationTrajectoryEvidence {
  readonly events: readonly Record<string, unknown>[];
  readonly graphRef: string;
  readonly replayRef: string;
}

/** The capability caller both the derivation pass and the post-finalization sweep bind their envelopes to. */
export type LearnerDerivationInvoke = (
  extensionId: string,
  capability: string,
  value: Record<string, unknown>,
  query?: Record<string, unknown>,
) => Promise<unknown>;

/**
 * Reads the durable capture evidence a computed report needs (the source capture the replay job names, plus its
 * counterfactual branch captures). Absent ⇒ a caller only consumes persisted reports, exactly as before.
 *
 * Measured live on `run174-fe49bac7` (`E:\tmp\audit3\gap_quantify.md`): 145 of 500 learnable finalized groups have
 * no persisted report at all - their live pipeline never ran - so a consume-only sweep burns the backlog without
 * yielding a candidate. The extension that writes the report already exists (`signals:analyze-finalized-evaluation`
 * persists), it simply has no caller outside the live request's shadow pipeline.
 */
export type LearnerDerivationEvidenceRead = (input: {
  readonly job: Record<string, unknown>;
  readonly sourceDecisionId: string;
  readonly replayId: string;
}) => Promise<
  | ({ readonly kind: "evidence" } & LearnerDerivationTrajectoryEvidence)
  | { readonly kind: "unavailable"; readonly reason: string }
  | { readonly kind: "refused"; readonly reason: string }
>;

export interface LearnerDerivationInput {
  readonly invoke: LearnerDerivationInvoke;
  /** Finalized comparison readbacks (`evaluation:list-groups`, already paged by the sweep). */
  readonly groups: readonly Record<string, unknown>[];
  /** Groups this process already presented, so one tick cannot re-attempt the same group. */
  readonly attemptedGroupIds: Set<string>;
  readonly limit: number;
  readonly channel: string;
  readonly scope: string;
  readonly evaluationAuthoritySecret: string;
  readonly log?: (message: string) => void;
  /**
   * Reports this pass may compute per tick. Defaults to `limit`, so the compute step can never outrun the
   * presentation bound. A group the bound defers is *not* marked attempted: the next tick reaches it again.
   */
  readonly derivedReportLimit?: number;
  /**
   * Run 101 R6: derive for exactly these groups. The learner queue claims one
   * job per finalized comparison, so its handler must be able to name the group
   * it is working on rather than walking the sweep's page and hoping.
   */
  readonly onlyGroupIds?: readonly string[];
  /**
   * Run 101 R6: called for each candidate this pass persisted. The summary's
   * five fields are a pinned contract (three suites assert them with `toEqual`),
   * so the learner queue chains its `learner.promote` job through this callback
   * rather than through a sixth field.
   */
  readonly onDerivedCandidate?: (candidateId: string, groupId: string) => void;
  readonly readDurableTrajectoryEvidence?: LearnerDerivationEvidenceRead;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function unwrap(value: unknown): unknown {
  /**
   * A capability answer travels inside zero or more envelopes (`{value}`, `{payload}`, `{businessOutput:{value}}`).
   * Measured live on `run123-f3651b11`: the pass read the envelope as if it were the report, so every report looked
   * like it "covers no comparison". Descend until the payload is not a wrapper, bounded so a cyclic answer cannot
   * spin.
   */
  let current = value;
  for (let depth = 0; depth < 4; depth += 1) {
    const record = asRecord(current);
    if (!record) return current;
    const businessOutput = asRecord(record.businessOutput);
    if (businessOutput && businessOutput.value !== undefined) {
      current = businessOutput.value;
      continue;
    }
    if (
      record.value !== undefined &&
      (record.capability !== undefined || record.extensionId !== undefined)
    ) {
      current = record.value;
      continue;
    }
    if (record.payload !== undefined && record.capability !== undefined) {
      current = record.payload;
      continue;
    }
    return current;
  }
  return current;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

/**
 * `evaluation:list-groups` answers `{...group_json, status, result: {...result_json}}`, so the members, the outcome
 * and the judge provenance live under `result`. Measured live on `run120-d4b95514`: the first derivation tick
 * examined all 812 groups, read `members` from the top level, found none and derived nothing. Everything downstream
 * (learnability, the replay id, the assembled finalized comparison) reads this normalized view.
 */
export function normalizedComparisonGroup(
  group: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  const result = asRecord(group.result);
  return result ? { ...group, ...result } : { ...group };
}

/** A group is learnable only when it carries at least one positive and one negative member (the consumer's own rule). */
export function learnableComparisonMembers(group: Readonly<Record<string, unknown>>): {
  readonly positive: readonly Record<string, unknown>[];
  readonly negative: readonly Record<string, unknown>[];
} | null {
  const normalized = normalizedComparisonGroup(group);
  const members = Array.isArray(normalized.members)
    ? (normalized.members as unknown[])
        .map(asRecord)
        .filter((member): member is Record<string, unknown> => member !== null)
    : [];
  if (members.length === 0) return null;
  const positive = members.filter((member) => member.disposition === "positive");
  const negative = members.filter((member) => member.disposition === "negative");
  if (positive.length === 0 || negative.length === 0) return null;
  return { positive, negative };
}

/** The replay the comparison was produced from: `holdout.caseIds[0]` is `replay:<replayId>:<pair>`. */
export function durableReplayIdForComparison(
  group: Readonly<Record<string, unknown>>,
): string | null {
  const holdout = asRecord(normalizedComparisonGroup(group).holdout);
  const caseIds = Array.isArray(holdout?.caseIds) ? holdout?.caseIds : [];
  for (const caseId of caseIds) {
    const value = text(caseId);
    if (!value || !value.startsWith("replay:")) continue;
    const replayId = value.slice("replay:".length).split(":")[0];
    if (replayId) return replayId;
  }
  return null;
}

/**
 * `signals:read` answers the newest reports for one decision, and a decision can legitimately carry reports for
 * several comparisons (sibling arms, a re-analyzed capture). Measured live on `run174-fe49bac7`: 13 of the 105
 * logged skips read `the persisted report covers <other group>` because the pass took the newest row positionally
 * while the report for *its* group was a later row. Match on the group the report declares instead.
 */
function reportCoversGroup(report: Readonly<Record<string, unknown>>, groupId: string): boolean {
  return (
    text(asRecord(report.evaluationProvenance)?.groupId) === groupId &&
    text(asRecord(report.learningEvidence)?.groupId) === groupId
  );
}

/** A group's own finalization time, when the readback carries one. */
function comparisonGroupFinalizationKey(group: Readonly<Record<string, unknown>>): number | null {
  const normalized = normalizedComparisonGroup(group);
  for (const field of [
    "finalizedAtMs",
    "finalizedAt",
    "completedAtMs",
    "completedAt",
    "createdAtMs",
    "createdAt",
    "updatedAtMs",
    "updatedAt",
  ]) {
    const value = normalized[field];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = Date.parse(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

/**
 * Run 100 addendum 39 §4: the order both producers walk a comparison listing in - newest-first.
 *
 * `evaluation:list-groups` answers `group_id ASC`, and a comparison group carries no timestamp (measured against the
 * live `evaluation-core` store: `group_json`/`result_json` hold `groupId`, `trialIds`, `comparability`, `holdout`,
 * `referenceProofs`, `members`, `outcome`, … and `evaluation_comparison_groups` has no time column), so the listing's
 * own order is all the readback offers: newest-first means consuming it from its last element. A record that ever
 * carries a finalization timestamp is ordered by it instead - a durable timestamp beats a convention.
 *
 * Measured live on run175c/`b7f04039`: walking the listing front-first spent the tick's compute bound on an aged
 * prefix - 79 `capture … is outside the retention window` skips against 9 computed reports.
 */
export function orderComparisonGroupsNewestFirst(
  groups: readonly Record<string, unknown>[],
): readonly Record<string, unknown>[] {
  return groups
    .map((group, position) => ({
      group,
      position,
      recency: comparisonGroupFinalizationKey(group),
    }))
    .sort((left, right) => {
      if (left.recency !== right.recency) {
        if (left.recency === null) return 1;
        if (right.recency === null) return -1;
        return right.recency - left.recency;
      }
      return right.position - left.position;
    })
    .map((entry) => entry.group);
}

/**
 * `signals:analyze-finalized-evaluation` both persists the report and answers a bounded degradation receipt instead
 * of throwing, so every caller has to classify the answer rather than assume a report. Shared by the learner's
 * derivation pass (the fallback producer, addendum 37/38) and the post-finalization sweep (addendum 39), so the two
 * producers cannot drift in the envelope they build or the receipt they recognize.
 *
 * Measured live on `run174-fe49bac7`: a receipt read as a report is how a group looks analyzed while nothing was
 * written, so the non-report classes are named rather than coerced.
 */
export type FinalizedEvaluationSignalAnalysis =
  | { readonly kind: "report"; readonly report: Record<string, unknown> }
  | { readonly kind: "degraded"; readonly reason: string };

export async function analyzeFinalizedEvaluationSignal(input: {
  readonly invoke: LearnerDerivationInvoke;
  readonly groupId: string;
  readonly sourceDecisionId: string;
  /** The decoded comparison record - the extension refuses the raw transfer marker. */
  readonly finalizedEvaluation: Readonly<Record<string, unknown>>;
  readonly evidence: LearnerDerivationTrajectoryEvidence;
  /** The winning member's candidate reference, when the comparison carries one. */
  readonly routePackage?: string | null;
}): Promise<FinalizedEvaluationSignalAnalysis> {
  const answer = asRecord(
    unwrap(
      await input.invoke("trajectory-signals", "signals:analyze-finalized-evaluation", {
        routeDecisionId: input.sourceDecisionId,
        graphRef: input.evidence.graphRef,
        replayRef: input.evidence.replayRef,
        ...(input.routePackage ? { routePackage: input.routePackage } : {}),
        events: input.evidence.events,
        finalizedEvaluation: input.finalizedEvaluation,
        // A resolver function cannot cross the extension IPC boundary, so resolution is stated as data.
        resolvedReferences: {
          graph: [input.evidence.graphRef],
          replay: [input.evidence.replayRef],
          evaluation: [input.groupId],
        },
      }),
    ),
  );
  if (
    !answer ||
    answer.degraded === true ||
    text(answer.schemaVersion) === "role-model.degradation-receipt.v1"
  ) {
    return {
      kind: "degraded",
      reason: `the signals analyzer degraded for ${input.groupId}: ${String(
        text(answer?.reasonCode) ?? text(answer?.reason) ?? "no report returned",
      ).slice(0, 160)}`,
    };
  }
  return { kind: "report", report: answer };
}

/**
 * Reads the persisted reports of one decision and selects the one that covers *this* comparison, bounded because the
 * answer travels inline: the live host embeds it twice and refuses any frame over 16 KiB, and the guard measures the
 * pre-frame size (+57 B), so a large answer dies in the dead band (measured: 12 learner-derivation skips on
 * `run174-fe49bac7`, each of them with the group's row already in the store). `limit` is honoured by the reader and a
 * refusal is retried once at the smallest bound.
 *
 * A transport failure is not evidence that the report does not exist: it is reported as transient so the caller can
 * leave the group reachable instead of burning it for the rest of the process.
 */
export type PersistedSignalReportRead =
  | { readonly kind: "report"; readonly report: Record<string, unknown> }
  | { readonly kind: "absent" }
  | { readonly kind: "unavailable"; readonly reason: string; readonly transient: boolean };

export async function readPersistedSignalReportForGroup(input: {
  readonly invoke: LearnerDerivationInvoke;
  readonly sourceDecisionId: string;
  readonly groupId: string;
}): Promise<PersistedSignalReportRead> {
  /**
   * `signals:read` is query-shaped (`extensions/trajectory-signals`: `envelope.query` is required and the read
   * answers the newest reports for a decision as an array). Measured live: passing the decision inside `value` made
   * every readback look absent.
   */
  const readReports = async (limit: number): Promise<readonly Record<string, unknown>[]> => {
    const answer = unwrap(
      await input.invoke(
        "trajectory-signals",
        "signals:read",
        {},
        { routeDecisionId: input.sourceDecisionId, limit },
      ),
    );
    const rows = Array.isArray(answer) ? answer : [answer];
    return rows.map(asRecord).filter((entry): entry is Record<string, unknown> => entry !== null);
  };
  let reports: readonly Record<string, unknown>[] = [];
  try {
    reports = await readReports(2);
  } catch (error) {
    const message = String((error as { message?: unknown })?.message ?? error);
    if (/frame exceeds inline limit/u.test(message)) {
      try {
        reports = await readReports(1);
      } catch {
        return {
          kind: "unavailable",
          reason: `signals:read is unavailable for ${input.sourceDecisionId}: ${message.slice(0, 120)}`,
          transient: true,
        };
      }
    } else {
      return {
        kind: "unavailable",
        reason: `signals:read is unavailable for ${input.sourceDecisionId}: ${message.slice(0, 120)}`,
        transient: true,
      };
    }
  }
  const report = reports.find((entry) => reportCoversGroup(entry, input.groupId)) ?? null;
  return report ? { kind: "report", report } : { kind: "absent" };
}

export async function deriveLearnerCandidatesFromDurableEvidence(
  input: LearnerDerivationInput,
): Promise<LearnerDerivationSummary> {
  let examined = 0;
  let attempted = 0;
  let derived = 0;
  let skipped = 0;
  let refused = 0;
  let computedReports = 0;
  /**
   * Addendum 39 §4: the page arrives `group_id ASC`, and the aged prefix is exactly what this pass has to stop
   * spending its compute bound on while the fresh comparisons behind it age out.
   */
  for (const group of orderComparisonGroupsNewestFirst(input.groups)) {
    if (attempted >= input.limit) break;
    const groupId = text(group.groupId) ?? text(group.comparisonId);
    if (!groupId || input.attemptedGroupIds.has(groupId)) continue;
    if (input.onlyGroupIds && !input.onlyGroupIds.includes(groupId)) continue;
    examined += 1;
    const normalized = normalizedComparisonGroup(group);
    if (text(normalized.status) !== "finalized" || !learnableComparisonMembers(normalized)) {
      skipped += 1;
      input.attemptedGroupIds.add(groupId);
      continue;
    }
    const replayId = durableReplayIdForComparison(normalized);
    if (!replayId) {
      skipped += 1;
      input.attemptedGroupIds.add(groupId);
      input.log?.(`learner derivation skipped ${groupId}: the comparison names no durable replay`);
      continue;
    }
    const readDurableEvidence = async (): Promise<
      | {
          readonly kind: "evidence";
          readonly job: Record<string, unknown>;
          readonly report: Record<string, unknown>;
          readonly profile: unknown;
        }
      | { readonly kind: "unavailable"; readonly reason: string; readonly transient?: boolean }
      | { readonly kind: "refused"; readonly reason: string }
    > => {
      let job: Record<string, unknown> | null = null;
      let report: Record<string, unknown> | null = null;
      try {
        job = asRecord(
          unwrap(await input.invoke("replay-core", "replay:job", { jobId: replayId })),
        );
        const sourceDecisionId = text(job?.sourceDecisionId);
        if (!job || !sourceDecisionId) {
          return {
            kind: "unavailable",
            reason: `replay ${replayId.slice(0, 12)} carries no provenance yet`,
          };
        }
        const persisted = await readPersistedSignalReportForGroup({
          invoke: input.invoke,
          sourceDecisionId,
          groupId,
        });
        if (persisted.kind === "unavailable") {
          return { kind: "unavailable", reason: persisted.reason, transient: persisted.transient };
        }
        report = persisted.kind === "report" ? persisted.report : null;
        if (!report && typeof input.readDurableTrajectoryEvidence === "function") {
          /**
           * The report this comparison needs was never written (its live pipeline never ran), so the pass computes it
           * through the capability that persists reports - bounded per tick, and only from durable capture evidence.
           * Nothing is synthesized: a capture that is gone is a named skip, not an invented trajectory.
           */
          const bound = input.derivedReportLimit ?? input.limit;
          if (computedReports >= bound) {
            return {
              kind: "unavailable",
              reason: `the per-tick derived-report bound (${bound}) deferred ${groupId}`,
              transient: true,
            };
          }
          const evidence = await input.readDurableTrajectoryEvidence({
            job,
            sourceDecisionId,
            replayId,
          });
          if (evidence.kind !== "evidence") {
            return { kind: "unavailable", reason: evidence.reason.slice(0, 200) };
          }
          const winnerRef =
            text(asRecord(normalized.comparability)?.counterfactualCandidateRef) ??
            text(learnableComparisonMembers(normalized)?.positive[0]?.candidateRef);
          computedReports += 1;
          /**
           * A refused analysis is a bounded degradation receipt rather than a throw (the extension converts every
           * failure that way), so it has to be classified, not assumed to be a report.
           */
          const analysis = await analyzeFinalizedEvaluationSignal({
            invoke: input.invoke,
            groupId,
            sourceDecisionId,
            // The extension refuses the raw transfer marker ("finalized evaluation provenance required for
            // route-learning signals"), so the decoded comparison record travels - the same shape the pipeline passes.
            finalizedEvaluation: normalized,
            evidence,
            routePackage: winnerRef,
          });
          if (analysis.kind === "degraded") {
            return { kind: "unavailable", reason: analysis.reason };
          }
          report = analysis.report;
        }
        if (!report) {
          return {
            kind: "unavailable",
            reason: `no persisted signal report for ${sourceDecisionId}`,
          };
        }
      } catch (error) {
        // A replay job or signal report that is not there yet is missing evidence, not a refusal: the group stays in
        // the backlog and the next tick can reach it once its replay has been dispatched and analysed.
        return {
          kind: "unavailable",
          reason: String((error as { message?: unknown })?.message ?? error).slice(0, 160),
        };
      }
      return { kind: "evidence", job, report, profile: null };
    };
    let profileDiagnostic = "profile keys=- digest=no";
    try {
      const durable = await readDurableEvidence();
      if (durable.kind !== "evidence") {
        skipped += 1;
        /**
         * A transient failure (extension down, an inline frame refusal, the per-tick compute bound) leaves the group
         * reachable: marking it attempted would burn it for the rest of the process, which is how the live backlog
         * fell from 496 to 216 while `derived` stayed pinned at 2 per tick.
         */
        const transient = durable.kind === "unavailable" && durable.transient === true;
        if (!transient) input.attemptedGroupIds.add(groupId);
        input.log?.(`learner derivation skipped ${groupId}: ${durable.reason}`);
        continue;
      }
      const { job, report } = durable;
      const sourceDecisionId = text(job?.sourceDecisionId);
      const jobSharedPrefixRef = text(job?.sharedPrefixRef) ?? text(job?.normalizedRequestRef);
      // Measured live on `run122-985cd234`: the job's `traceRootId` is the raw trace id while the signal report (and
      // the pipeline) name the graph as an artifact reference, so taking the graph ref from the job refused every
      // report with "requires the persisted signal report for this capture". The report is the durable authority for
      // that decision's graph reference; the comparison group is what decides whether the report belongs to *this*
      // comparison.
      const sourceGraphRef = text(report?.graphRef);
      const reportGroupId = text(asRecord(report?.evaluationProvenance)?.groupId);
      const reportLearningGroupId = text(asRecord(report?.learningEvidence)?.groupId);
      /**
       * The consumer's own consistency check is
       * `learningEvidence.traceRef === replay.sourceGraphRef && (learningEvidence.replayRef === replay.sourceGraphRef
       * || learningEvidence.replayRef === replay.sharedPrefixRef)`. Measured live on `run129-6513e676`: the durable
       * job's `sharedPrefixRef` is the normalized-request reference while the signal plane's `replayRef` is the replay
       * it resolved, so presenting the job's ref had every derivation refused with "finalized trajectory signal
       * references must match replay provenance". The persisted report is the durable authority for the references it
       * was computed against, so both travel from it; the job's own normalized-request reference stays on `digest`.
       */
      const sharedPrefixRef =
        text(asRecord(report?.learningEvidence)?.replayRef) ?? jobSharedPrefixRef;
      const reportTraceRef = text(asRecord(report?.learningEvidence)?.traceRef);
      if (
        !sourceDecisionId ||
        !sharedPrefixRef ||
        (reportTraceRef !== undefined && reportTraceRef !== sourceGraphRef)
      ) {
        skipped += 1;
        input.attemptedGroupIds.add(groupId);
        input.log?.(
          `learner derivation skipped ${groupId}: replay ${replayId.slice(0, 12)} has no graph provenance`,
        );
        continue;
      }
      if (!sourceGraphRef || reportGroupId !== groupId || reportLearningGroupId !== groupId) {
        skipped += 1;
        input.attemptedGroupIds.add(groupId);
        input.log?.(
          `learner derivation skipped ${groupId}: the persisted report covers ${
            reportGroupId ?? "no comparison"
          }`,
        );
        continue;
      }
      const members = learnableComparisonMembers(normalized);
      /**
       * Measured 2026-09-25 against the real learner (`extensions/profile-learner`: `estimate` requires a finite
       * propensity per row): the profile step refused all 132 otherwise-complete derivations with
       * "evidence and valid propensity required", because the durable replay job records no per-branch propensity.
       * What it does record is the branch's sampling profile: under `deterministic-v1` the replay dispatches exactly
       * one counterfactual per candidate, so the arm's inclusion probability is 1. Any other profile without a
       * recorded propensity is not derivable and the group is skipped rather than given an invented weight.
       */
      const candidatePackages = Array.isArray(job?.candidatePackages)
        ? (job?.candidatePackages as unknown[])
            .map(asRecord)
            .filter((entry): entry is Record<string, unknown> => entry !== null)
        : [];
      const propensityFor = (
        endpointId: string | null,
      ): {
        readonly propensity: number;
        readonly model: string | null;
        readonly effort: string | null;
      } | null => {
        /**
         * The incumbent arm is the job's baseline and is never part of `candidatePackages` (measured: exactly one of
         * each group's two members is absent, and it is the source). It is not sampled - the replay dispatches it once
         * as the comparison's baseline - so its inclusion probability is 1 for the same reason a deterministic
         * candidate's is.
         */
        if (endpointId !== null && text(job?.baselineEndpointId) === endpointId) {
          return { propensity: 1, model: null, effort: null };
        }
        const entry =
          endpointId === null
            ? undefined
            : candidatePackages.find((candidate) => text(candidate.endpointId) === endpointId);
        const recorded = Number(entry?.propensity);
        const model = text(entry?.modelId);
        const effort = text(entry?.reasoningEffort);
        if (Number.isFinite(recorded) && recorded > 0 && recorded <= 1) {
          return { propensity: recorded, model, effort };
        }
        return text(entry?.samplingProfileId) === "deterministic-v1"
          ? { propensity: 1, model, effort }
          : null;
      };
      const rows = members
        ? [...members.positive, ...members.negative].map((member) => {
            const endpointId = text(member.candidateRef);
            const propensity = propensityFor(endpointId);
            return {
              endpoint: endpointId,
              routePackage: endpointId,
              outcome: Number(member.score),
              ...(propensity
                ? {
                    propensity: propensity.propensity,
                    ...(propensity.model ? { model: propensity.model } : {}),
                    ...(propensity.effort ? { effort: propensity.effort } : {}),
                  }
                : {}),
              trialId: text(member.trialId),
              scoreId: text(member.scoreId),
              evidenceRef:
                endpointId === text(asRecord(normalized.comparability)?.counterfactualCandidateRef)
                  ? text(asRecord(normalized.comparability)?.counterfactualEvidenceRef)
                  : text(asRecord(normalized.comparability)?.sourceEvidenceRef),
            };
          })
        : [];
      if (rows.some((row) => !Number.isFinite(row.propensity))) {
        skipped += 1;
        input.attemptedGroupIds.add(groupId);
        input.log?.(
          `learner derivation skipped ${groupId}: the replay records no propensity and its sampling profile is not deterministic`,
        );
        continue;
      }
      const profile = unwrap(
        await input.invoke("profile-learner", "profile:estimate-finalized-evaluation", {
          finalizedEvaluation: normalized,
          signals: report,
          rows,
        }),
      );
      // A refusal has to name what the step actually answered: the attribution guard can only say that the estimate
      // did not attribute the package, and the difference between "degraded receipt", "wrapped envelope" and "no
      // estimate at all" is exactly what the next reader needs.
      const profileRecord = asRecord(profile);
      profileDiagnostic = `profile keys=${Object.keys(profileRecord ?? {})
        .slice(0, 10)
        .join("|")} digest=${typeof profileRecord?.digest === "string" ? "yes" : "no"}`;
      const value = assembleDurableLearnerDerivationValue({
        channel: input.channel,
        scope: input.scope,
        evaluationAuthoritySecret: input.evaluationAuthoritySecret,
        finalizedComparison: normalized,
        replayProvenance: {
          sourceDecisionId,
          sourceGraphRef,
          sharedPrefixRef,
          digest: replayId,
          branches: Array.isArray(job.branches) ? job.branches : [],
        },
        signalsReport: report,
        profileEstimate: asRecord(profile),
        taskTypeId: text(job.taskTypeId),
        taxonomyVersion: text(job.taxonomyVersion),
        roleId: text(job.roleId),
      });
      attempted += 1;
      input.attemptedGroupIds.add(groupId);
      const consumed = asRecord(
        unwrap(await input.invoke("knowledge-worker", "knowledge:eval-consumer", value)),
      );
      if (consumed) {
        derived += 1;
        const candidateId = text(consumed.id);
        if (candidateId) input.onDerivedCandidate?.(candidateId, groupId);
        input.log?.(
          `learner derivation consumed ${groupId} (${members?.positive.length ?? 0}+/${
            members?.negative.length ?? 0
          }-) candidate=${text(consumed.id) ?? "-"}`,
        );
      } else {
        refused += 1;
      }
    } catch (error) {
      refused += 1;
      input.attemptedGroupIds.add(groupId);
      input.log?.(
        `learner derivation refused ${groupId}: ${String(
          (error as { message?: unknown })?.message ?? error,
        ).slice(0, 320)} [${profileDiagnostic}]`,
      );
    }
  }
  return { examined, attempted, derived, skipped, refused };
}
