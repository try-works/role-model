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
  const record = asRecord(value);
  if (!record) return value;
  if (record.payload !== undefined && record.capability !== undefined) return record.payload;
  return record;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

/** A group is learnable only when it carries at least one positive and one negative member (the consumer's own rule). */
export function learnableComparisonMembers(
  group: Readonly<Record<string, unknown>>,
): { readonly positive: readonly Record<string, unknown>[]; readonly negative: readonly Record<string, unknown>[] } | null {
  const members = Array.isArray(group.members)
    ? (group.members as unknown[]).map(asRecord).filter((member): member is Record<string, unknown> => member !== null)
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
  const holdout = asRecord(group.holdout);
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
    if (text(group.status) !== "finalized" || !learnableComparisonMembers(group)) {
      skipped += 1;
      input.attemptedGroupIds.add(groupId);
      continue;
    }
    const replayId = durableReplayIdForComparison(group);
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
        report = asRecord(
          unwrap(await input.invoke("trajectory-signals", "signals:read", { routeDecisionId: sourceDecisionId })),
        );
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
      const sourceGraphRef = text(job?.traceRootId) ?? text(job?.sourceTraceId);
      const sharedPrefixRef = text(job?.sharedPrefixRef) ?? text(job?.normalizedRequestRef);
      if (!sourceDecisionId || !sourceGraphRef || !sharedPrefixRef) {
        skipped += 1;
        input.attemptedGroupIds.add(groupId);
        input.log?.(`learner derivation skipped ${groupId}: replay ${replayId.slice(0, 12)} has no graph provenance`);
        continue;
      }
      const members = learnableComparisonMembers(group);
      const rows = members
        ? [...members.positive, ...members.negative].map((member) => ({
            endpoint: text(member.candidateRef),
            routePackage: text(member.candidateRef),
            outcome: Number(member.score),
            trialId: text(member.trialId),
            scoreId: text(member.scoreId),
            evidenceRef: text(member.candidateRef) === text(asRecord(group.comparability)?.counterfactualCandidateRef)
              ? text(asRecord(group.comparability)?.counterfactualEvidenceRef)
              : text(asRecord(group.comparability)?.sourceEvidenceRef),
          }))
        : [];
      const profile = unwrap(
        await input.invoke("profile-learner", "profile:estimate-finalized-evaluation", {
          finalizedEvaluation: group,
          signals: report,
          rows,
        }),
      );
      const value = assembleDurableLearnerDerivationValue({
        channel: input.channel,
        scope: input.scope,
        evaluationAuthoritySecret: input.evaluationAuthoritySecret,
        finalizedComparison: group,
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
