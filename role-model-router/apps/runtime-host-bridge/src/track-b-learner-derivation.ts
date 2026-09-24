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

export interface LearnerDerivationInput {
  readonly invoke: (
    extensionId: string,
    capability: string,
    value: Record<string, unknown>,
    query?: Record<string, unknown>,
  ) => Promise<unknown>;
  /** Finalized comparison readbacks (`evaluation:list-groups`, already paged by the sweep). */
  readonly groups: readonly Record<string, unknown>[];
  /** Groups this process already presented, so one tick cannot re-attempt the same group. */
  readonly attemptedGroupIds: Set<string>;
  readonly limit: number;
  readonly channel: string;
  readonly scope: string;
  readonly evaluationAuthoritySecret: string;
  readonly log?: (message: string) => void;
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
    if (record.value !== undefined && (record.capability !== undefined || record.extensionId !== undefined)) {
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
export function learnableComparisonMembers(
  group: Readonly<Record<string, unknown>>,
): { readonly positive: readonly Record<string, unknown>[]; readonly negative: readonly Record<string, unknown>[] } | null {
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

export async function deriveLearnerCandidatesFromDurableEvidence(
  input: LearnerDerivationInput,
): Promise<LearnerDerivationSummary> {
  let examined = 0;
  let attempted = 0;
  let derived = 0;
  let skipped = 0;
  let refused = 0;
  for (const group of input.groups) {
    if (attempted >= input.limit) break;
    const groupId = text(group.groupId) ?? text(group.comparisonId);
    if (!groupId || input.attemptedGroupIds.has(groupId)) continue;
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
      | { readonly kind: "evidence"; readonly job: Record<string, unknown>; readonly report: Record<string, unknown>; readonly profile: unknown }
      | { readonly kind: "unavailable"; readonly reason: string }
      | { readonly kind: "refused"; readonly reason: string }
    > => {
      let job: Record<string, unknown> | null = null;
      let report: Record<string, unknown> | null = null;
      try {
        job = asRecord(unwrap(await input.invoke("replay-core", "replay:job", { jobId: replayId })));
        const sourceDecisionId = text(job?.sourceDecisionId);
        if (!job || !sourceDecisionId) {
          return { kind: "unavailable", reason: `replay ${replayId.slice(0, 12)} carries no provenance yet` };
        }
        /**
         * `signals:read` is query-shaped (`extensions/trajectory-signals`: `envelope.query` is required and the read
         * answers the newest reports for a decision as an array). Measured live: passing the decision inside `value`
         * made every readback look absent.
         */
        const reports = unwrap(
          await input.invoke("trajectory-signals", "signals:read", {}, { routeDecisionId: sourceDecisionId }),
        );
        report = asRecord(Array.isArray(reports) ? reports[0] : reports);
        if (!report) {
          return { kind: "unavailable", reason: `no persisted signal report for ${sourceDecisionId}` };
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
    try {
      const durable = await readDurableEvidence();
      if (durable.kind !== "evidence") {
        skipped += 1;
        input.attemptedGroupIds.add(groupId);
        input.log?.(`learner derivation skipped ${groupId}: ${durable.reason}`);
        continue;
      }
      const { job, report } = durable;
      const sourceDecisionId = text(job?.sourceDecisionId);
      const sharedPrefixRef = text(job?.sharedPrefixRef) ?? text(job?.normalizedRequestRef);
      // Measured live on `run122-985cd234`: the job's `traceRootId` is the raw trace id while the signal report (and
      // the pipeline) name the graph as an artifact reference, so taking the graph ref from the job refused every
      // report with "requires the persisted signal report for this capture". The report is the durable authority for
      // that decision's graph reference; the comparison group is what decides whether the report belongs to *this*
      // comparison.
      const sourceGraphRef = text(report?.graphRef);
      const reportGroupId = text(asRecord(report?.evaluationProvenance)?.groupId);
      const reportLearningGroupId = text(asRecord(report?.learningEvidence)?.groupId);
      if (!sourceDecisionId || !sharedPrefixRef) {
        skipped += 1;
        input.attemptedGroupIds.add(groupId);
        input.log?.(`learner derivation skipped ${groupId}: replay ${replayId.slice(0, 12)} has no graph provenance`);
        continue;
      }
      if (
        !sourceGraphRef ||
        reportGroupId !== groupId ||
        reportLearningGroupId !== groupId
      ) {
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
      ): { readonly propensity: number; readonly model: string | null; readonly effort: string | null } | null => {
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
        ).slice(0, 200)}`,
      );
    }
  }
  return { examined, attempted, derived, skipped, refused };
}
