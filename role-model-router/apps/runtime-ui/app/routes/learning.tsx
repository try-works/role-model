import { type ReactElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router";

import {
  LearningActivationTimelineView,
  LearningActivityHeatmapView,
  LearningComparisonMixView,
  LearningGuardrailListView,
} from "../components/learning-history-panels";
import { LearningLivePanelView } from "../components/learning-live-panel";
import {
  Badge,
  type BadgeTone,
  EmptyState,
  ErrorState,
  LoadingState,
  SectionCard,
  SelectField,
} from "../components/page-primitives";
// Run 101 R10: the queue planes' bounded parameters render beside the learning policy.
import { QueuesConfigurationCard } from "../components/queues-configuration-card";
import {
  compactTitleClassName,
  fieldClassName,
  fieldLabelClassName,
  monoEyebrowClassName,
  mutedPanelClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
  supportingTextClassName,
} from "../lib/design-system";
import {
  type LearningPolicyField,
  type LearningPolicyView,
  activateLearningPack,
  engageLearningKillSwitch,
  fetchLearningDecisions,
  fetchLearningMeasurement,
  fetchLearningPolicy,
  fetchLearningRecords,
  fetchLearningRollout,
  rollbackLearningPack,
  rollbackLearningPolicy,
  saveLearningPolicy,
  useOperatorToken,
  validatePolicyDraft,
} from "../lib/learning-api";
import { fetchLearningActivity, fetchLearningHistory } from "../lib/learning-api";
import { summarizePolicyResolution } from "../lib/learning-policy-resolution";
import {
  appliedShareOf,
  fallbackReasonRows,
  formatPercentShare,
  normalizeLearningActivity,
  normalizeLearningHistory,
  profileInspectionView,
} from "../lib/learning-visuals";
import { describeOperatorWriteError } from "../lib/operator-write-error";
import { fetchLearningProfileState, fetchLearningSummary } from "../lib/runtime-api";

/**
 * Run 98 R17: the Learning route.
 *
 * Five pages read the operator surface (policy store, rollout state, learning records,
 * advisory decisions, cohort measurement) and edit the activation policy inside the
 * schema's bounds. Every page renders an explicit unavailable/degraded state instead of a
 * fabricated value (`AC-R17-09`), and every mutation requires confirmation (`AC-R17-03`).
 */

const message = (value: unknown) =>
  value instanceof Error ? value.message : "The learning surface could not be loaded.";

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const show = (value: unknown, fallback = "—"): string => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : value.toFixed(4);
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (Array.isArray(value)) return value.length ? value.join(", ") : fallback;
  if (typeof value === "object") return JSON.stringify(value);
  const text = String(value);
  return text.length ? text : fallback;
};

/**
 * Run 98 addendum 47 (found while verifying the S4 default): the runtime sends `min`/`max` as null for enum
 * fields, so the old `=== undefined` test sent every enum to the numeric branch and the Range column read
 * "— – —" instead of the allowed values — the stage row's range was unreadable precisely where the operator
 * needed to see the ladder.
 */
export function formatPolicyRange(field: LearningPolicyField): string {
  if (field.min == null && field.max == null) {
    return field.values && field.values.length > 0 ? field.values.join(" | ") : "—";
  }
  return `${show(field.min)} – ${show(field.max)}`;
}

function useOperatorSurface<TValue>(loader: () => Promise<TValue>, deps: readonly unknown[]) {
  const [value, setValue] = useState<TValue | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  /**
   * The loader is read through a ref so the callback's dependency list stays the caller's (`deps`) without
   * hiding a dependency from the hook rules: the ref always points at the loader of the latest render.
   */
  const loaderRef = useRef(loader);
  useEffect(() => {
    loaderRef.current = loader;
  }, [loader]);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setValue(await loaderRef.current());
      setError(null);
    } catch (loadError) {
      setError(message(loadError));
      setValue(null);
    } finally {
      setLoading(false);
    }
  }, deps);
  useEffect(() => {
    void load();
  }, [load]);
  return { value, error, loading, reload: load };
}

export function OperatorTokenField({
  token,
  onToken,
}: {
  token: string;
  onToken: (value: string) => void;
}) {
  return (
    <label className={fieldLabelClassName}>
      Operator token
      <input
        className={`${fieldClassName} mt-1 font-mono`}
        onChange={(event) => onToken(event.target.value)}
        placeholder="Not needed on this machine — only for other clients"
        type="password"
        value={token}
      />
      <span className="mt-1 block text-xs text-[var(--rm-fg-muted)]">
        This machine&apos;s owner is trusted: readbacks, policy changes, pack activation/rollback
        and the kill switch all work here without a token. Set one only for clients that are not the
        device owner — the value is the runtime&apos;s{" "}
        <span className="font-mono">--operator-auth-token</span>, and a runtime exposed beyond
        loopback still requires it.
      </span>
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className={`${mutedPanelClassName} p-3`}>
      <p className={monoEyebrowClassName}>{label}</p>
      <p className={`mt-1 break-words ${compactTitleClassName}`}>{value}</p>
    </div>
  );
}

function degraded(loading: boolean, error: string | null): ReactElement | null {
  if (loading) return <LoadingState label="Loading learning state…" />;
  if (error)
    return <ErrorState label={`Learning surface unavailable: ${error}. No value is fabricated.`} />;
  return null;
}

/**
 * Run 101 addendum 48: the three Learning surfaces the operator approved as column tables
 * (`Learning · Overview` recent decisions, `Learning · Decisions`, `Learning · Packs`).
 *
 * Every cell is read from the operator readback - the `evidence` object the run adds to `/learning/records`
 * and `/learning/decisions` rows, plus the fields those rows already carry. A field the readback does not carry
 * renders this surface's bounded `not reported` text (`A48-R7`): the tables never substitute a plausible value
 * for a missing one, the verdict words are the four the runtime actually emits, and a candidate that was never
 * scored is labelled `excluded` rather than given a score.
 */

/** Bounded absence text, the convention the Learning surfaces already use for an unreported field. */
const NOT_REPORTED = "not reported";

const tableClassName = "w-full table-fixed border-collapse text-left";
const tableHeaderClassName = `border-b border-[var(--rm-border)] pb-3 pr-3 text-left align-bottom font-normal ${monoEyebrowClassName}`;
const tableRowClassName = "border-b border-[var(--rm-border)] align-top";
const tableCellValueClassName = "font-mono text-[12px] leading-[18px] text-[var(--rm-fg)]";
const tableCellStrongClassName =
  "font-mono text-[13px] font-medium leading-[18px] text-[var(--rm-fg)]";
const tableCellMetaClassName = "font-mono text-[11px] leading-4 text-[var(--rm-muted)]";
const tableCellNoteClassName = "font-sans text-[11px] leading-4 text-[var(--rm-secondary)]";
/** The design system's green ink, used for the one winning candidate a pack carries. */
const tableCellWinnerClassName =
  "font-mono text-[12px] leading-[18px] text-[var(--rm-success)]";
const tableCellWinnerMetaClassName = "font-mono text-[11px] leading-4 text-[var(--rm-success)]";
/** Fixed lanes (`flexShrink: 0`) so every candidate line's score lands in the same column, row to row. */
const tableScoreLaneClassName = "w-[74px] shrink-0 text-right font-mono tabular-nums";
const tableWinnerLaneClassName = "w-[26px] shrink-0 font-mono";

const textOrNull = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  const text = typeof value === "string" ? value.trim() : String(value);
  return text.length > 0 ? text : null;
};

/** Filter choices are the values the readback actually returned - never a catalog the UI keeps of its own. */
const distinctOptions = (values: readonly (string | null)[]): string[] =>
  [...new Set(values.filter((value): value is string => Boolean(value)))].sort((left, right) =>
    left.localeCompare(right, "en"),
  );

/**
 * The recorded verdict vocabulary, mapped to the four operator words the approved artboards use. A word the
 * runtime does not emit maps to nothing, so an unknown value reads as bounded absence instead of a verdict.
 */
const VERDICT_WORDS: Readonly<Record<string, string>> = {
  validate: "promoted",
  reject: "rejected",
  insufficient_evidence: "insufficient",
  insufficient: "insufficient",
  refused: "refused",
};

export function learningVerdictWord(recorded: string | null | undefined): string | null {
  const word = textOrNull(recorded);
  return word ? (VERDICT_WORDS[word] ?? null) : null;
}

/** A judge score exactly as the readback records it; a candidate the readback did not score stays unscored. */
export function formatLearningScore(value: unknown): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value.toFixed(2);
}

/** `0.06` -> `+0.06`, `-0.04` -> `-0.04`; a delta the readback does not carry stays absent. */
export function formatLearningDelta(value: unknown): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return `${value >= 0 ? "+" : "-"}${Math.abs(value).toFixed(2)}`;
}

/**
 * Long durable refs are shown abbreviated the way the artboards do (`validation-2403`, `comparison c0eb7e1b`),
 * with the full value kept in the cell's `title` so nothing is lost - only shortened for the column.
 */
export function shortLearningRef(value: unknown): string | null {
  const text = textOrNull(value);
  if (!text) return null;
  const tail = text.includes(":") ? (text.split(":").pop() ?? text) : text;
  return tail.length > 18 ? `${tail.slice(0, 14)}…${tail.slice(-4)}` : tail;
}

export interface LearningCandidateScoreView {
  readonly candidateRef: string;
  readonly score: string | null;
  readonly won: boolean;
}

export interface LearningEvidenceView {
  readonly members: readonly LearningCandidateScoreView[];
  readonly winnerRef: string | null;
  readonly judgeSource: string | null;
  readonly judgeEndpointId: string | null;
  readonly outcome: string | null;
  readonly verdict: string | null;
  readonly comparisonRef: string | null;
  readonly validationRef: string | null;
  readonly replayRef: string | null;
  readonly captureRef: string | null;
  readonly decisive: string | null;
  readonly holdout: string | null;
  readonly qualityDelta: string | null;
}

/**
 * One reader for the frozen addendum-48 readback: the `evidence` object (`comparisonId`, `judgeEndpointId`,
 * `judgeSource`, `outcome`, `members[]`, `winnerCandidateRef`, `replayRef`, `captureRef`) plus the fields the
 * rows already publish (`familyEvidence`, `qualityDelta`, `validationReceiptId`, the pack's own `record`).
 */
export function learningEvidence(row: Record<string, unknown>): LearningEvidenceView {
  const evidence = asRecord(row.evidence);
  const record = asRecord(row.record);
  const family = { ...asRecord(record.familyEvidence), ...asRecord(row.familyEvidence) };
  const judgeConsistency = asRecord(family.judgeConsistency);
  const winnerRef = textOrNull(evidence.winnerCandidateRef);
  const members = (Array.isArray(evidence.members) ? evidence.members : []).map(
    (member): LearningCandidateScoreView => {
      const entry = asRecord(member);
      const candidateRef = textOrNull(entry.candidateRef) ?? NOT_REPORTED;
      return {
        candidateRef,
        score: formatLearningScore(entry.score),
        won: winnerRef !== null && candidateRef === winnerRef,
      };
    },
  );
  const recordedVerdict =
    textOrNull(row.verdict) ?? textOrNull(record.decision) ?? textOrNull(row.decision);
  const outcome = textOrNull(evidence.outcome);
  return {
    members,
    winnerRef,
    judgeSource: textOrNull(evidence.judgeSource),
    judgeEndpointId:
      textOrNull(evidence.judgeEndpointId) ?? textOrNull(judgeConsistency.judgeEndpointId),
    outcome,
    verdict: learningVerdictWord(recordedVerdict) ?? learningVerdictWord(outcome),
    comparisonRef: textOrNull(evidence.comparisonId) ?? textOrNull(row.comparisonId),
    validationRef: textOrNull(row.validationReceiptId) ?? textOrNull(record.validationReceiptId),
    replayRef: textOrNull(evidence.replayRef),
    captureRef: textOrNull(evidence.captureRef),
    decisive: textOrNull(family.decisiveComparisons),
    holdout: textOrNull(family.holdoutComparisons),
    qualityDelta: formatLearningDelta(row.qualityDelta ?? record.qualityDelta),
  };
}

export interface LearningTaskCellView {
  readonly task: string | null;
  readonly scope: string | null;
  readonly toolClasses: string | null;
  readonly requestFamily: string | null;
}

/** `Role · task`: the classified task, the role and taxonomy it was classified against, and the request family. */
export function learningTaskCell(row: Record<string, unknown>): LearningTaskCellView {
  const classification = asRecord(row.classification);
  const task =
    textOrNull(classification.taskTypeId) ??
    textOrNull(row.requestTaskTypeId) ??
    textOrNull(row.taskTypeId);
  const roleId = textOrNull(classification.roleId) ?? textOrNull(row.roleId);
  const taxonomy = textOrNull(classification.taxonomyVersion) ?? textOrNull(row.taxonomyVersion);
  const toolClasses =
    Array.isArray(row.toolClassIds) && row.toolClassIds.length > 0
      ? row.toolClassIds.map((entry) => textOrNull(entry) ?? NOT_REPORTED).join(", ")
      : null;
  const requestFamily = textOrNull(row.requestTaskTypeId);
  return {
    task,
    scope:
      roleId || taxonomy ? `${roleId ?? NOT_REPORTED} · taxonomy ${taxonomy ?? NOT_REPORTED}` : null,
    toolClasses,
    requestFamily: requestFamily && requestFamily !== task ? requestFamily : null,
  };
}

function verdictTone(verdict: string): BadgeTone {
  if (verdict === "promoted") return "success";
  if (verdict === "rejected") return "error";
  if (verdict === "insufficient") return "warning";
  return "neutral";
}

/**
 * The models column: one line per evaluated candidate with the score right-aligned in its own fixed lane. A
 * candidate the readback did not score is muted and labelled `excluded`, and only a pack's winner is marked.
 */
function CandidateScoreLanes({
  members,
  markWinner = false,
}: {
  readonly members: readonly LearningCandidateScoreView[];
  readonly markWinner?: boolean;
}) {
  if (members.length === 0) {
    return <p className={tableCellMetaClassName}>{NOT_REPORTED}</p>;
  }
  return (
    <div className="flex flex-col gap-0.5">
      {members.map((member, index) => {
        const ink = member.won
          ? tableCellWinnerClassName
          : member.score
            ? tableCellValueClassName
            : tableCellMetaClassName;
        return (
          <div className="flex items-baseline gap-2" key={`${member.candidateRef}-${index}`}>
            <span className={`min-w-0 flex-1 truncate ${ink}`} title={member.candidateRef}>
              {member.candidateRef}
            </span>
            <span className={`${tableScoreLaneClassName} ${ink}`}>
              {member.score ?? "excluded"}
            </span>
            {markWinner ? (
              <span
                className={`${tableWinnerLaneClassName} ${member.won ? tableCellWinnerMetaClassName : tableCellMetaClassName}`}
              >
                {member.won ? "won" : ""}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Run 98 addendum 25 §2: a collapsed row states how many observations it stands for, so a table cannot read as
 * duplicated rows.
 */
function ObservationCountMarker({ row }: { readonly row: Record<string, unknown> }) {
  if (!(Number(row.observationCount) > 1)) return null;
  return (
    <span className="ml-2 text-xs text-[var(--rm-fg-muted)]">×{show(row.observationCount)}</span>
  );
}

/** One decision row of the `Recent decisions` (five columns) and `Decision receipts` (plus `Receipt`) tables. */
export function LearningDecisionRow({
  row,
  receipt = false,
}: {
  readonly row: Record<string, unknown>;
  readonly receipt?: boolean;
}) {
  const evidence = learningEvidence(row);
  const task = learningTaskCell(row);
  return (
    <tr className={tableRowClassName}>
      <td className="py-3 pr-3">
        <p className={`${tableCellStrongClassName} flex items-baseline gap-2`}>
          {/* A fixed lane truncates rather than overflows: the full task id stays in the cell's title. */}
          <span className="min-w-0 truncate" title={task.task ?? undefined}>
            {task.task ?? NOT_REPORTED}
          </span>
          <ObservationCountMarker row={row} />
        </p>
        <p className={`mt-0.5 ${tableCellNoteClassName}`}>{task.scope ?? NOT_REPORTED}</p>
        {task.toolClasses ? (
          <p
            className={`mt-0.5 truncate ${tableCellMetaClassName}`}
            title={`tool classes ${task.toolClasses}`}
          >
            tool classes {task.toolClasses}
          </p>
        ) : null}
        {task.requestFamily ? (
          <p
            className={`mt-0.5 truncate ${tableCellMetaClassName}`}
            title={`request ${task.requestFamily}`}
          >
            request {task.requestFamily}
          </p>
        ) : null}
      </td>
      <td className="py-3 pr-3">
        <CandidateScoreLanes members={evidence.members} />
      </td>
      <td className="py-3 pr-3">
        <p
          className={`${tableCellValueClassName} truncate`}
          title={evidence.judgeSource ?? undefined}
        >
          {evidence.judgeSource ?? NOT_REPORTED}
        </p>
        <p
          className={`mt-0.5 truncate ${tableCellMetaClassName}`}
          title={evidence.judgeEndpointId ?? undefined}
        >
          {evidence.judgeEndpointId ?? NOT_REPORTED}
        </p>
      </td>
      <td className="py-3 pr-3">
        {evidence.decisive === null &&
        evidence.holdout === null &&
        evidence.qualityDelta === null ? (
          <p className={tableCellMetaClassName}>{NOT_REPORTED}</p>
        ) : (
          <>
            <p className={tableCellValueClassName}>
              {`${evidence.decisive ?? NOT_REPORTED} dec · ${evidence.holdout ?? NOT_REPORTED} holdout`}
            </p>
            {evidence.qualityDelta ? (
              <p className={`mt-0.5 ${tableCellMetaClassName}`}>{`Δ ${evidence.qualityDelta}`}</p>
            ) : null}
          </>
        )}
      </td>
      <td className="py-3 pr-3">
        {evidence.verdict ? (
          <Badge tone={verdictTone(evidence.verdict)}>{evidence.verdict}</Badge>
        ) : (
          <p className={tableCellMetaClassName}>no verdict recorded</p>
        )}
        <p className={`mt-0.5 ${tableCellMetaClassName}`}>
          {`outcome ${evidence.outcome ?? NOT_REPORTED}`}
        </p>
      </td>
      {receipt ? (
        <td className="py-3 pr-3">
          <p className={tableCellMetaClassName} title={evidence.validationRef ?? undefined}>
            {`validation ${shortLearningRef(evidence.validationRef) ?? NOT_REPORTED}`}
          </p>
          <p className={`mt-0.5 ${tableCellMetaClassName}`} title={evidence.comparisonRef ?? undefined}>
            {`comparison ${shortLearningRef(evidence.comparisonRef) ?? NOT_REPORTED}`}
          </p>
          <p className={`mt-0.5 ${tableCellMetaClassName}`}>
            {`replay ${shortLearningRef(evidence.replayRef) ?? NOT_REPORTED} · capture ${shortLearningRef(evidence.captureRef) ?? NOT_REPORTED}`}
          </p>
        </td>
      ) : null}
    </tr>
  );
}

/** One pack row: scope, the replayed models with their scores, the pack's model, evidence, state and action. */
export function LearningPackRow({
  row,
  activePackageId,
  busy = false,
  onActivate,
}: {
  readonly row: Record<string, unknown>;
  readonly activePackageId: string | null;
  readonly busy?: boolean;
  readonly onActivate: (packId: string) => void;
}) {
  const record = asRecord(row.record);
  const scope = asRecord(record.scope);
  const evidence = learningEvidence(row);
  const packId = show(row.recordId);
  const active = Boolean(activePackageId) && activePackageId === row.recordId;
  const roleId = textOrNull(scope.roleId);
  const taxonomy = textOrNull(scope.taxonomyVersion);
  /**
   * Run 101 addendum 48 follow-up (the `Pack model` correction): the pack model is the pack's own routing target
   * (`record.scope.endpointId`), which the readback carries independently of the comparison evidence - gating this
   * cell on a winner made a value the readback already carries read as absent. The winner itself stays a
   * replay-readback mark in the models column, and a readback that disagrees with the pack's own target is shown
   * as it states it rather than reconciled here (`A48-R3`).
   */
  const packModel = textOrNull(scope.endpointId);
  const scopeLine =
    roleId || taxonomy
      ? `routing target for ${roleId ?? NOT_REPORTED} · taxonomy ${taxonomy ?? NOT_REPORTED}`
      : "routing target of this pack";
  const recordedWinner = evidence.winnerRef;
  const winnerDisagrees =
    packModel !== null && recordedWinner !== null && recordedWinner !== packModel;
  return (
    <tr className={tableRowClassName}>
      <td className="py-3 pr-3">
        {/* Long durable ids are abbreviated the way the artboards show them; the full value stays in `title`. */}
        <p className={tableCellValueClassName} title={packId}>
          {shortLearningRef(packId) ?? packId}
        </p>
        <p className={`mt-0.5 ${tableCellMetaClassName}`}>
          {`${roleId ?? NOT_REPORTED} · taxonomy ${taxonomy ?? NOT_REPORTED}`}
        </p>
        <p className={`mt-0.5 ${tableCellNoteClassName}`}>
          {`scope ${textOrNull(row.scopeId) ?? NOT_REPORTED}`}
        </p>
      </td>
      <td className="py-3 pr-3">
        <CandidateScoreLanes markWinner members={evidence.members} />
        {evidence.decisive !== null || evidence.holdout !== null ? (
          <p className={`mt-1 ${tableCellMetaClassName}`}>
            {`${evidence.decisive ?? NOT_REPORTED} decisive · holdout ${evidence.holdout ?? NOT_REPORTED}`}
          </p>
        ) : null}
      </td>
      <td className="py-3 pr-3">
        {packModel ? (
          <>
            {/* A routing target is a full endpoint id, so this lane wraps it rather than hiding the model name. */}
            <p className={`${tableCellStrongClassName} break-all`} title={packModel}>
              {packModel}
            </p>
            <p className={`mt-0.5 ${tableCellNoteClassName}`}>{scopeLine}</p>
            {winnerDisagrees ? (
              <p
                className={`mt-0.5 truncate ${tableCellMetaClassName}`}
                title={recordedWinner ?? undefined}
              >
                {`readback winner ${recordedWinner}`}
              </p>
            ) : null}
          </>
        ) : (
          <>
            <p className={tableCellMetaClassName}>no model recorded</p>
            <p className={`mt-0.5 ${tableCellNoteClassName}`}>
              the readback carries no routing target for this pack
            </p>
          </>
        )}
      </td>
      <td className="py-3 pr-3">
        {/* The pack's claim prose is recorded nowhere the readback can read, so the cell says so and renders the
            evidence that *is* recorded rather than a plausible sentence (`A48-R7`). */}
        <p className={tableCellMetaClassName}>claim not recorded</p>
        {evidence.qualityDelta ? (
          <p className={`mt-0.5 ${tableCellValueClassName}`}>
            {`Δ ${evidence.qualityDelta} over baseline`}
          </p>
        ) : (
          <p className={`mt-0.5 ${tableCellMetaClassName}`}>{NOT_REPORTED}</p>
        )}
        <p
          className={`mt-0.5 truncate ${tableCellMetaClassName}`}
          title={`judge ${evidence.judgeSource ?? NOT_REPORTED} · ${evidence.judgeEndpointId ?? NOT_REPORTED}`}
        >
          {`judge ${evidence.judgeSource ?? NOT_REPORTED} · ${evidence.judgeEndpointId ?? NOT_REPORTED}`}
        </p>
        <p className={`mt-0.5 ${tableCellMetaClassName}`} title={evidence.validationRef ?? undefined}>
          {`receipt ${shortLearningRef(evidence.validationRef) ?? NOT_REPORTED}`}
        </p>
      </td>
      <td className="py-3 pr-3">
        <Badge tone={active ? "success" : "neutral"}>{active ? "active" : show(row.state)}</Badge>
      </td>
      <td className="py-3 pr-3">
        <button
          className={secondaryButtonClassName}
          disabled={busy || active || row.state !== "validated"}
          onClick={() => onActivate(packId)}
          type="button"
        >
          Activate
        </button>
      </td>
    </tr>
  );
}

/** The column header row shared by the three tables (real `th` cells, so the columns are associated). */
function LearningTableHead({ columns }: { readonly columns: readonly string[] }) {
  return (
    <thead>
      <tr>
        {columns.map((column) => (
          <th className={tableHeaderClassName} key={column} scope="col">
            {column}
          </th>
        ))}
      </tr>
    </thead>
  );
}

/**
 * Run 98 addendum 25 §1 (operator-reported): the Recent decisions panel asserted a hardcoded
 * "the selection always remains the baseline in stage S1" while the scope was running S2, which
 * contradicted the STAGE metric in the same page's header. That sentence is a claim about
 * safety-relevant behaviour, so it is derived from the live stage readback instead: only S1 keeps
 * the baseline guarantee, every other reported stage states the eligible-set bound for that stage,
 * and an unreported stage asserts no stage at all rather than defaulting to S1 copy.
 */
export function selectionNoteForStage(effectiveStage: string): string {
  if (effectiveStage === "S1") return "the selection always remains the baseline in stage S1";
  if (effectiveStage) {
    return `the advisory may only act inside the eligible set (stage ${effectiveStage})`;
  }
  return "the selection follows the configured activation stage";
}

/** Overview: stage, policy identity, cohort, advisory counts, guardrails, last rollback. */
export function LearningOverviewPage() {
  const { token, setToken } = useOperatorToken();
  const policy = useOperatorSurface<LearningPolicyView>(
    () => fetchLearningPolicy(fetch, token || undefined),
    [token],
  );
  const rollout = useOperatorSurface<Record<string, unknown>>(
    () => fetchLearningRollout(fetch, token || undefined),
    [token],
  );
  const summary = useOperatorSurface<Record<string, unknown>>(
    () => fetchLearningSummary(fetch, token || undefined),
    [token],
  );
  const decisions = useOperatorSurface<Record<string, unknown>>(
    () => fetchLearningDecisions(fetch, token || undefined, { limit: 10 }),
    [token],
  );
  const activity = useOperatorSurface<Record<string, unknown>>(
    () => fetchLearningActivity(fetch, token || undefined, { windowMinutes: 60, limit: 24 }),
    [token],
  );
  /**
   * Run 98 addendum 44 `A44-S3` (`AC-R12-01`): the guardrail status and rollback count live in the history
   * readback, and the profile-inspection capability is reported as a bounded state rather than an error.
   */
  const history = useOperatorSurface<Record<string, unknown>>(
    () => fetchLearningHistory(fetch, token || undefined, { hours: 24 }),
    [token],
  );
  const profile = useOperatorSurface<Awaited<ReturnType<typeof fetchLearningProfileState>>>(
    () => fetchLearningProfileState(fetch, token || undefined),
    [token],
  );
  const activityView = normalizeLearningActivity(activity.value);
  const historyView = normalizeLearningHistory(history.value);
  const profileView = profile.value ?? profileInspectionView(null);
  const advisory = asRecord(asRecord(summary.value).advisory);
  const fallbackReasons = fallbackReasonRows(advisory, 3);
  // Run 98 addendum 31 S5: how much of the scored evidence is actually checkable.
  const auditability = asRecord(asRecord(summary.value).auditability);
  const rolloutValue = asRecord(rollout.value);
  const receipts = Array.isArray(rolloutValue.receipts) ? rolloutValue.receipts : [];
  const lastRollback = receipts.find((row) => asRecord(row).state === "rolled_back");
  const decisionsValue = asRecord(decisions.value);
  const decisionRows = Array.isArray(decisionsValue.decisions)
    ? (decisionsValue.decisions as readonly Record<string, unknown>[])
    : [];
  // Run 98 addendum 25 §1 (operator-reported): this panel used to assert a hardcoded "stage S1" while
  // the scope ran S2, contradicting the STAGE metric in its own header. The note now follows the live
  // stage readback, and the panel says what a row is: one decision with its observation count (§2).
  const effectiveStage = String(asRecord(asRecord(policy.value).effective).stage ?? "");
  const selectionNote = selectionNoteForStage(effectiveStage);
  const fallback =
    degraded(policy.loading, policy.error) ?? degraded(rollout.loading, rollout.error);
  return (
    <div className="grid gap-4">
      <SectionCard
        title="Learning overview"
        description="What the learning loop is doing right now, read from durable state."
      >
        <OperatorTokenField onToken={setToken} token={token} />
        {fallback ?? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric
              label="Stage"
              value={show(
                asRecord(asRecord(policy.value).effective).stage ??
                  policy.value?.fields?.find((f) => f.name === "stage")?.value,
              )}
            />
            <Metric label="Policy version" value={show(asRecord(policy.value).policyVersion)} />
            <Metric label="Policy digest" value={show(asRecord(policy.value).digest)} />
            <Metric
              label="Cohort"
              value={`step ${show(rolloutValue.cohortStep)} · ${show(rolloutValue.cohortPercent)}%`}
            />
            <Metric label="Activation state" value={show(rolloutValue.state)} />
            <Metric label="Active pack" value={show(rolloutValue.activePackageId)} />
            <Metric
              label="Advisory observed"
              value={`${show(advisory.observed)} · fresh ${show(advisory.fresh)} · stale ${show(advisory.stale)} · unavailable ${show(advisory.unavailable)}`}
            />
            <Metric label="Influence rate" value={show(advisory.influenceRate)} />
            {/* Run 98 addendum 44 A44-S3: the R12 numbers the Overview was missing. */}
            <Metric label="Applied share" value={formatPercentShare(appliedShareOf(advisory))} />
            <Metric
              label="Fallback reasons"
              value={
                fallbackReasons.length > 0
                  ? fallbackReasons.map((row) => `${row.reason} ×${row.count}`).join(" · ")
                  : "none recorded"
              }
            />
            <Metric label="Would have changed" value={show(advisory.wouldHaveChanged)} />
            <Metric
              label="Guardrails"
              value={`${show(historyView.guardrailsFiring)} firing · window ${show(asRecord(history.value).guardrailWindowMinutes)} min`}
            />
            <Metric
              label="Rollbacks"
              value={`${show(historyView.totals.rollbacks)} · ${show(historyView.totals.guardrailBreaches)} breaches`}
            />
            <Metric
              label="Profile inspection"
              value={
                profileView.state === "available"
                  ? "available"
                  : `unavailable${profileView.reason ? ` · ${profileView.reason}` : ""}`
              }
            />
            <Metric
              label="Input auditability"
              value={`${show(auditability.resolvedInputs)} resolved · ${show(auditability.unresolvedInputs)} unresolved · ${show(auditability.missingInputProof)} no proof`}
            />
            <Metric
              label="Last rollback"
              value={
                lastRollback
                  ? `${show(asRecord(lastRollback).receiptId)} · ${show(asRecord(lastRollback).rolledBackAt)}`
                  : "none"
              }
            />
          </div>
        )}
      </SectionCard>
      <LearningLivePanelView
        view={activityView}
        loading={activity.loading}
        error={activity.error}
        nowMs={Date.now()}
        scopeLabel={show(rolloutValue.scopeId ?? rolloutValue.scope)}
      />
      <SectionCard
        title="Recent decisions"
        description={`Advisory observations recorded per decision; ${selectionNote}. Each row is one decision with its observation count.`}
      >
        {degraded(decisions.loading, decisions.error) ??
          (decisionRows.length === 0 ? (
            <EmptyState label="No decisions have been observed for this scope yet." />
          ) : (
            <div className="overflow-x-auto">
              <table className={`${tableClassName} min-w-[880px]`}>
                <colgroup>
                  <col style={{ width: "210px" }} />
                  <col style={{ width: "280px" }} />
                  <col style={{ width: "124px" }} />
                  <col style={{ width: "112px" }} />
                  <col />
                </colgroup>
                <LearningTableHead
                  columns={["Role · task", "Models · judge score", "Judge", "Evidence", "Decision"]}
                />
                <tbody>
                  {decisionRows.map((row, index) => (
                    <LearningDecisionRow
                      key={`${show(row.decisionId)}-${index}`}
                      row={row}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ))}
      </SectionCard>
    </div>
  );
}

/** Configuration: schema-driven, bounded editing of every published policy field. */
export function LearningConfigurationPage() {
  const { token, setToken } = useOperatorToken();
  const policy = useOperatorSurface<LearningPolicyView>(
    () => fetchLearningPolicy(fetch, token || undefined),
    [token],
  );
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [operator, setOperator] = useState("operator:ui");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const view = policy.value;
  // Run 98 addendum 44 `A44-S4`: the page renders the stored document *and* the router's own resolution, so a
  // damaged policy source reads as a degraded state instead of a policy the router is not using.
  const resolution = summarizePolicyResolution(view);
  const routerReported = Boolean(view?.routerResolution);
  const storedDegraded = Boolean(view?.degraded);
  const validation = useMemo(
    () => validatePolicyDraft(view?.fields ?? [], draft),
    [view?.fields, draft],
  );
  const update = (field: LearningPolicyField, raw: string) => {
    const value = field.type === "integer" || field.type === "number" ? Number(raw) : raw;
    setDraft((current) => ({ ...current, [field.name]: value }));
  };
  const save = async () => {
    if (!view) return;
    if (Object.keys(validation.errors).length) {
      setError(`Fix the highlighted fields first: ${Object.values(validation.errors).join("; ")}`);
      return;
    }
    if (Object.keys(validation.changes).length === 0) {
      setNotice("No changes to save.");
      return;
    }
    const confirmRequired = [
      "stage",
      "cohortLadder",
      "minDecisionsPerStep",
      "minHoursPerStep",
    ].some((name) => name in validation.changes);
    if (
      confirmRequired &&
      typeof window !== "undefined" &&
      !window.confirm(
        "Apply this learning policy change? Stage and cohort changes affect live routing.",
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const applied = await saveLearningPolicy(
        {
          changes: validation.changes,
          expectedPolicyVersion: view.policyVersion,
          operator: operator || "operator:ui",
        },
        fetch,
        token || undefined,
      );
      setNotice(
        `Policy version ${applied.policyVersion} written (${(applied.receipt?.changedFields ?? Object.keys(validation.changes)).join(", ")}). Every later decision receipt cites it.`,
      );
      setDraft({});
      await policy.reload();
    } catch (saveError) {
      setError(describeOperatorWriteError(saveError));
    } finally {
      setBusy(false);
    }
  };
  const rollback = async () => {
    if (!view) return;
    if (
      typeof window !== "undefined" &&
      !window.confirm("Roll the learning policy back to the previous version?")
    ) {
      return;
    }
    setBusy(true);
    try {
      const applied = await rollbackLearningPolicy(
        {
          toPolicyVersion: Math.max(1, view.policyVersion - 1),
          expectedPolicyVersion: view.policyVersion,
          operator: operator || "operator:ui",
          reason: "operator_ui_rollback",
        },
        fetch,
        token || undefined,
      );
      setNotice(`Policy rolled back to version ${applied.policyVersion}.`);
      await policy.reload();
    } catch (rollbackError) {
      setError(describeOperatorWriteError(rollbackError));
    } finally {
      setBusy(false);
    }
  };
  return (
    <SectionCard
      title="Learning configuration"
      description="Every activation parameter with its current value, unit, default and allowed range. Bounds are enforced here and again on the server."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <OperatorTokenField onToken={setToken} token={token} />
        <label className={fieldLabelClassName}>
          Operator identity
          <input
            className={`${fieldClassName} mt-1`}
            onChange={(event) => setOperator(event.target.value)}
            value={operator}
          />
        </label>
      </div>
      {notice ? <p className={`mt-3 ${supportingTextClassName}`}>{notice}</p> : null}
      {error ? (
        <div className="mt-3">
          <ErrorState label={error} />
        </div>
      ) : null}
      {degraded(policy.loading, policy.error) ??
        (view ? (
          <>
            <div className="mt-4 rounded border border-[var(--rm-border)] p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className={monoEyebrowClassName}>Router resolution</span>
                <Badge tone={resolution.authoritative ? "neutral" : "warning"}>
                  {resolution.authoritative
                    ? "policy authoritative"
                    : routerReported
                      ? "router degraded"
                      : "readback degraded"}
                </Badge>
              </div>
              <div className="mt-2 grid gap-3 sm:grid-cols-3">
                <Metric label="Router stage" value={resolution.routerStage ?? "not reported"} />
                <Metric
                  label="Router policy source"
                  value={resolution.routerSource ?? "not reported"}
                />
                <Metric
                  label="Router policy digest"
                  value={resolution.routerDigest ?? "not reported"}
                />
                <Metric
                  label="Stored policy version"
                  value={
                    resolution.storedPolicyVersion === null
                      ? "not reported"
                      : String(resolution.storedPolicyVersion)
                  }
                />
                <Metric
                  label="Stored policy digest"
                  value={resolution.storedDigest ?? "not reported"}
                />
              </div>
              {resolution.warning ? (
                <div className="mt-2">
                  <ErrorState label={resolution.warning} />
                </div>
              ) : null}
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr>
                    {["Field", "Value", "Unit", "Default", "Range", "Notes"].map((header) => (
                      <th className={`pb-3 pr-3 font-normal ${monoEyebrowClassName}`} key={header}>
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {view.fields.map((field) => (
                    <tr className="border-t border-[var(--rm-border)] align-top" key={field.name}>
                      <td className="py-2 pr-3">
                        <p className={compactTitleClassName}>{field.name}</p>
                        <p className={`mt-1 ${supportingTextClassName}`}>{field.description}</p>
                      </td>
                      <td className="py-2 pr-3">
                        {field.uiEditable ? (
                          <input
                            aria-label={field.name}
                            className={fieldClassName}
                            onChange={(event) => update(field, event.target.value)}
                            value={
                              field.name in draft
                                ? String(draft[field.name])
                                : Array.isArray(field.value)
                                  ? field.value.join(",")
                                  : String(field.value ?? "")
                            }
                          />
                        ) : (
                          <span className="font-mono">{show(field.value)}</span>
                        )}
                        {validation.errors[field.name] ? (
                          <p className={`mt-1 ${supportingTextClassName}`}>
                            {validation.errors[field.name]}
                          </p>
                        ) : null}
                      </td>
                      <td className="py-2 pr-3">{field.unit}</td>
                      <td className="py-2 pr-3 font-mono">{show(field.default)}</td>
                      <td className="py-2 pr-3 font-mono">{formatPolicyRange(field)}</td>
                      <td className="py-2 pr-3">
                        <Badge tone={field.uiEditable ? "neutral" : "warning"}>
                          {field.uiEditable ? "editable" : "read-only"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                className={primaryButtonClassName}
                disabled={busy || storedDegraded || Object.keys(validation.changes).length === 0}
                onClick={() => void save()}
                type="button"
              >
                Save policy change
              </button>
              <button
                className={secondaryButtonClassName}
                disabled={busy || view.policyVersion <= 1}
                onClick={() => void rollback()}
                type="button"
              >
                Roll back policy
              </button>
            </div>
            {/* Run 101 R10: the queue planes' own bounded parameters live beside
                the learning policy, because both are operator-owned policy. */}
            <QueuesConfigurationCard />
            <p className={`mt-2 ${supportingTextClassName}`}>
              Saving writes a new policy version with a receipt (previous/new digest, operator,
              effective time) and is rejected if another client changed the policy first
              {storedDegraded
                ? "; it is refused while the stored policy state is degraded, so a damaged file is repaired rather than overwritten."
                : "."}
            </p>
          </>
        ) : null)}
    </SectionCard>
  );
}

/** Packs: candidate/pack records, activation state and rollback actions. */
export function LearningPacksPage() {
  const { token, setToken } = useOperatorToken();
  const records = useOperatorSurface<Record<string, unknown>>(
    () => fetchLearningRecords(fetch, token || undefined, { kind: "pack" }),
    [token],
  );
  const rollout = useOperatorSurface<Record<string, unknown>>(
    () => fetchLearningRollout(fetch, token || undefined),
    [token],
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rows = Array.isArray(asRecord(records.value).records)
    ? (asRecord(records.value).records as readonly Record<string, unknown>[])
    : [];
  const rolloutValue = asRecord(rollout.value);
  const act = async (packId: string) => {
    if (
      typeof window !== "undefined" &&
      !window.confirm(`Activate ${packId}? Cohort rollout starts at the first ladder step.`)
    )
      return;
    try {
      await activateLearningPack(
        {
          scopeId: asRecord(records.value).scopeId ?? "standalone-runtime-stage",
          packId,
          policyGateId: "operator:ui",
          validationReceiptId: String(
            asRecord(asRecord(rows.find((row) => row.recordId === packId)).record)
              .validationReceiptId ?? "",
          ),
        },
        fetch,
        token || undefined,
      );
      setNotice(`Activation receipt written for ${packId}.`);
      await rollout.reload();
    } catch (activationError) {
      setError(describeOperatorWriteError(activationError));
    }
  };
  const rollback = async () => {
    if (
      typeof window !== "undefined" &&
      !window.confirm("Roll the active pack back to the prior package?")
    )
      return;
    try {
      await rollbackLearningPack(
        {
          scopeId: rolloutValue.scopeId ?? "standalone-runtime-stage",
          reason: "operator_ui_rollback",
        },
        fetch,
        token || undefined,
      );
      setNotice("Rollback receipt written; the prior package is restored.");
      await rollout.reload();
    } catch (rollbackError) {
      setError(describeOperatorWriteError(rollbackError));
    }
  };
  const killSwitch = async () => {
    if (
      typeof window !== "undefined" &&
      !window.confirm("Engage the kill switch? Every activation returns to the base route.")
    )
      return;
    try {
      await engageLearningKillSwitch(
        { scopeId: rolloutValue.scopeId ?? "standalone-runtime-stage" },
        fetch,
        token || undefined,
      );
      setNotice("Kill switch engaged; the scope is back on the base route.");
      await rollout.reload();
    } catch (killError) {
      setError(describeOperatorWriteError(killError));
    }
  };
  // Run 99 R28: the switch is reversible; releasing clears the flag (receipted) and leaves the
  // scope on the base route until a pack is activated again.
  const releaseKillSwitch = async () => {
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        "Release the kill switch? The scope stays on the base route until a pack is activated.",
      )
    )
      return;
    try {
      await engageLearningKillSwitch(
        { scopeId: rolloutValue.scopeId ?? "standalone-runtime-stage", engaged: false },
        fetch,
        token || undefined,
      );
      setNotice("Kill switch released; activation is allowed again.");
      await rollout.reload();
    } catch (releaseError) {
      setError(describeOperatorWriteError(releaseError));
    }
  };
  return (
    <SectionCard
      title="Learned packs"
      description="Candidate and pack records with their validation receipts, holdout evidence and activation state."
    >
      <OperatorTokenField onToken={setToken} token={token} />
      {notice ? <p className={`mt-3 ${supportingTextClassName}`}>{notice}</p> : null}
      {error ? (
        <div className="mt-3">
          <ErrorState label={error} />
        </div>
      ) : null}
      {degraded(records.loading, records.error) ??
        (rows.length === 0 ? (
          <EmptyState label="No pack records have been derived for this scope yet." />
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className={`${tableClassName} min-w-[1060px]`}>
              <colgroup>
                <col style={{ width: "150px" }} />
                <col style={{ width: "210px" }} />
                <col style={{ width: "280px" }} />
                <col style={{ width: "220px" }} />
                <col style={{ width: "72px" }} />
                <col />
              </colgroup>
              <LearningTableHead
                columns={[
                  "Pack · scope",
                  "Replay models · score",
                  "Pack model",
                  "Claim · evidence",
                  "State",
                  "Action",
                ]}
              />
              <tbody>
                {rows.map((row) => (
                  <LearningPackRow
                    activePackageId={
                      textOrNull(rolloutValue.activePackageId) ?? null
                    }
                    key={String(row.recordId)}
                    onActivate={(packId) => void act(packId)}
                    row={row}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ))}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className={secondaryButtonClassName}
          disabled={rolloutValue.state !== "active"}
          onClick={() => void rollback()}
          type="button"
        >
          Roll back active pack
        </button>
        <button
          className={secondaryButtonClassName}
          disabled={rolloutValue.state === "disabled"}
          onClick={() => void killSwitch()}
          type="button"
        >
          Engage kill switch
        </button>
        <button
          className={secondaryButtonClassName}
          disabled={!rolloutValue.killSwitchAtMs}
          onClick={() => void releaseKillSwitch()}
          type="button"
        >
          Release kill switch
        </button>
      </div>
    </SectionCard>
  );
}

/** Decisions: the approved six-column table - the five Overview columns plus the receipt chain. */
export function LearningDecisionsPage() {
  const { token, setToken } = useOperatorToken();
  const [stateFilter, setStateFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [taskFilter, setTaskFilter] = useState("all");
  const [outcomeFilter, setOutcomeFilter] = useState("all");
  /**
   * Run 113 (addendum 09 R11/S18): the ledger holds live routing decisions and shadow judge/replay calls. The
   * shadow rows carry no taxonomy and are `unavailable` by construction, and because they are the most recent
   * they dominated the default view - the operator saw "everything is task mismatch or not eligible". The page
   * now asks the readback for live routing decisions by default, with the shadow ledger one selection away.
   */
  const [originFilter, setOriginFilter] = useState("live");
  const decisions = useOperatorSurface<Record<string, unknown>>(
    () => fetchLearningDecisions(fetch, token || undefined, { limit: 100, origin: originFilter }),
    [token, originFilter],
  );
  const rows = Array.isArray(asRecord(decisions.value).decisions)
    ? (asRecord(decisions.value).decisions as readonly Record<string, unknown>[])
    : [];
  const roleOf = (row: Record<string, unknown>): string | null =>
    textOrNull(asRecord(row.classification).roleId) ?? textOrNull(row.roleId);
  const taskOf = (row: Record<string, unknown>): string | null => learningTaskCell(row).task;
  const filtered = rows.filter(
    (row) =>
      (stateFilter === "all" || row.advisoryState === stateFilter) &&
      (roleFilter === "all" || roleOf(row) === roleFilter) &&
      (taskFilter === "all" || taskOf(row) === taskFilter) &&
      (outcomeFilter === "all" || learningEvidence(row).verdict === outcomeFilter),
  );
  /**
   * The readback hands the page a bounded window; the table shows it in pages rather than in one wall of rows.
   * Nothing is fetched that was not already read, and the note below says how much of the window is shown.
   */
  const [visibleCount, setVisibleCount] = useState(50);
  useEffect(() => {
    setVisibleCount(50);
  }, [stateFilter, roleFilter, taskFilter, outcomeFilter, originFilter]);
  const visible = filtered.slice(0, visibleCount);
  const roleOptions = distinctOptions(rows.map(roleOf));
  const taskOptions = distinctOptions(rows.map(taskOf));
  const outcomeOptions = distinctOptions(rows.map((row) => learningEvidence(row).verdict));
  const truncated = asRecord(decisions.value).truncated === true;
  return (
    <SectionCard
      title="Decision receipts"
      description="Every adjudicated decision with its evidence in columns, and the receipt chain each one produced."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <OperatorTokenField onToken={setToken} token={token} />
        <SelectField label="Role" onChange={setRoleFilter} value={roleFilter}>
          <option value="all">all roles</option>
          {roleOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </SelectField>
        <SelectField label="Task" onChange={setTaskFilter} value={taskFilter}>
          <option value="all">all tasks</option>
          {taskOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </SelectField>
        <SelectField label="Outcome" onChange={setOutcomeFilter} value={outcomeFilter}>
          <option value="all">all outcomes</option>
          {outcomeOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </SelectField>
        <label className={fieldLabelClassName}>
          Advisory state
          <select
            className={`${fieldClassName} mt-1`}
            onChange={(event) => setStateFilter(event.target.value)}
            value={stateFilter}
          >
            {["all", "fresh", "stale", "unavailable"].map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className={fieldLabelClassName}>
          Observation origin
          <select
            className={`${fieldClassName} mt-1`}
            onChange={(event) => setOriginFilter(event.target.value)}
            value={originFilter}
          >
            {["live", "shadow", "all"].map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>
      {degraded(decisions.loading, decisions.error) ??
        (filtered.length === 0 ? (
          <EmptyState label="No decisions match this filter yet." />
        ) : (
          <div className="mt-4">
            <div className="overflow-x-auto">
              <table className={`${tableClassName} min-w-[900px]`}>
                <colgroup>
                  <col style={{ width: "164px" }} />
                  <col style={{ width: "244px" }} />
                  <col style={{ width: "112px" }} />
                  <col style={{ width: "112px" }} />
                  <col style={{ width: "144px" }} />
                  <col />
                </colgroup>
                <LearningTableHead
                  columns={[
                    "Role · task",
                    "Models · judge score",
                    "Judge",
                    "Evidence",
                    "Decision",
                    "Receipt",
                  ]}
                />
                <tbody>
                  {visible.map((row, index) => (
                    <LearningDecisionRow
                      key={`${show(row.decisionId)}-${index}`}
                      receipt
                      row={row}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              {filtered.length > visibleCount ? (
                <button
                  className={secondaryButtonClassName}
                  onClick={() => setVisibleCount((current) => current + 50)}
                  type="button"
                >
                  Show more decisions
                </button>
              ) : null}
              <p className={supportingTextClassName}>
                {`Showing ${visible.length} of ${filtered.length} matching decisions`}
                {truncated ? "; the readback is truncated." : "."}
              </p>
            </div>
          </div>
        ))}
    </SectionCard>
  );
}

/** Evidence: the baseline-vs-advisory comparison behind the guardrails. */
export function LearningEvidencePage() {
  const { token, setToken } = useOperatorToken();
  const measurement = useOperatorSurface<Record<string, unknown>>(
    () => fetchLearningMeasurement(fetch, token || undefined),
    [token],
  );
  /**
   * Run 100 R6.1: the learner's own evidence - per family, against the floor, and the exclusions by
   * reason - comes from the learning summary, so this page can answer "why is evidence missing?"
   * without the operator opening a store.
   */
  const learnerSummary = useOperatorSurface<Record<string, unknown>>(
    () => fetchLearningSummary(fetch, token || undefined),
    [token],
  );
  const learnerEvidence = asRecord(asRecord(learnerSummary.value).learnerEvidence);
  const exclusionReasons = Object.entries(asRecord(learnerEvidence.excludedByReason))
    .map(([reason, count]) => ({ reason, count: Number(count) }))
    .filter((entry) => Number.isFinite(entry.count) && entry.count > 0)
    .sort((left, right) => right.count - left.count);
  const evidenceFamilies = Object.entries(asRecord(learnerEvidence.byFamily)).map(
    ([family, counts]) => ({ family, counts: asRecord(counts) }),
  );
  const evidenceFloor = asRecord(learnerEvidence.floor);
  const newestReceipt = asRecord(learnerEvidence.newest);
  const newestEvidence = asRecord(newestReceipt.familyEvidence);
  const report = Array.isArray(asRecord(measurement.value).report)
    ? (asRecord(measurement.value).report as readonly Record<string, unknown>[])[0]
    : undefined;
  const raw = asRecord(measurement.value);
  // Run 99: three honest shapes - a measurement report, an explicit "nothing recorded yet" answer,
  // and a bounded degradation receipt. Only the first may render the cohort grid.
  const noMeasurement = raw.status === "no-measurement";
  const degradedReceipt = raw.degraded === true;
  const value = noMeasurement || degradedReceipt ? {} : asRecord(report ?? measurement.value);
  const cohorts = asRecord(value.cohorts);
  const deltas = asRecord(value.deltas);
  const confidence = asRecord(value.confidence);
  const guardrails = Array.isArray(value.guardrails)
    ? (value.guardrails as readonly Record<string, unknown>[])
    : [];
  // Run 99: cost and latency are inputs this composition does not measure per arm, so the page says
  // so rather than presenting the placeholder inputs as measured zeros.
  const costLatencyMeasured = asRecord(raw.measurementInputs).costLatencyAvailable !== false;
  return (
    <div className="grid gap-4">
      <SectionCard
        title="Evidence"
        description="Baseline-versus-advisory comparison on the paired holdout distribution with the guardrail verdicts."
      >
        <OperatorTokenField onToken={setToken} token={token} />
        {degraded(measurement.loading, measurement.error) ??
          (degradedReceipt ? (
            <ErrorState
              label={`Cohort measurement unavailable: ${show(raw.reason)}. No value is fabricated.`}
            />
          ) : noMeasurement ||
            (value.schemaVersion === undefined && Object.keys(value).length === 0) ? (
            <EmptyState label="No cohort measurement has been recorded yet." />
          ) : (
            <>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Badge
                  tone={
                    value.verdict === "pass"
                      ? "success"
                      : value.verdict === "fail"
                        ? "error"
                        : "warning"
                  }
                >
                  {show(value.verdict)}
                </Badge>
                <p className={supportingTextClassName}>{show(value.statement)}</p>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Metric label="Paired holdout tasks" value={show(value.pairedHoldoutTasks)} />
                <Metric label="Baseline samples" value={show(asRecord(cohorts.baseline).samples)} />
                <Metric label="Advisory samples" value={show(asRecord(cohorts.advisory).samples)} />
                <Metric
                  label="Applied share"
                  value={show(asRecord(cohorts.advisory).appliedShare)}
                />
                <Metric label="Quality delta" value={show(deltas.quality)} />
                <Metric
                  label="Cost multiplier"
                  value={costLatencyMeasured ? show(deltas.costMultiplier) : "not measured here"}
                />
                <Metric
                  label="Latency p95 delta (ms)"
                  value={costLatencyMeasured ? show(deltas.latencyP95DeltaMs) : "not measured here"}
                />
                <Metric label="Error-rate delta (pp)" value={show(deltas.errorRateDeltaPp)} />
                <Metric
                  label="Quality CI"
                  value={`${show(confidence.lower)} – ${show(confidence.upper)}`}
                />
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr>
                      {["Guardrail", "Bound", "Observed", "Verdict"].map((header) => (
                        <th
                          className={`pb-3 pr-3 font-normal ${monoEyebrowClassName}`}
                          key={header}
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {guardrails.map((guardrail) => (
                      <tr
                        className="border-t border-[var(--rm-border)]"
                        key={String(guardrail.metric)}
                      >
                        <td className="py-2 pr-3">{show(guardrail.metric)}</td>
                        <td className="py-2 pr-3 font-mono">{show(guardrail.bound)}</td>
                        <td className="py-2 pr-3 font-mono">{show(guardrail.observed)}</td>
                        <td className="py-2 pr-3">
                          <Badge tone={guardrail.passed ? "success" : "error"}>
                            {guardrail.passed ? "passed" : "breached"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ))}
      </SectionCard>
      <SectionCard
        title="Evidence loss by reason"
        description="Per-family evidence against the operator's floor and the learner's exclusions, read from the validation receipts the runtime recorded."
      >
        <OperatorTokenField onToken={setToken} token={token} />
        {degraded(learnerSummary.loading, learnerSummary.error) ??
          (Number(learnerEvidence.receipts ?? 0) === 0 ? (
            <EmptyState label="No learner validation receipt has been recorded yet." />
          ) : (
            <>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Metric label="Receipts read" value={show(learnerEvidence.receipts)} />
                <Metric label="Newest decision" value={show(newestReceipt.decision)} />
                <Metric
                  label="Newest decisive comparisons"
                  value={show(newestEvidence.decisiveComparisons)}
                />
                <Metric
                  label="Floor met"
                  value={
                    newestEvidence.floorMet === true
                      ? "yes"
                      : newestEvidence.floorMet === false
                        ? "no"
                        : show(newestEvidence.floorMet)
                  }
                />
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr>
                      {["Exclusion reason", "Count"].map((header) => (
                        <th
                          className={`pb-3 pr-3 font-normal ${monoEyebrowClassName}`}
                          key={header}
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {exclusionReasons.map((entry) => (
                      <tr className="border-t border-[var(--rm-border)]" key={entry.reason}>
                        <td className="py-2 pr-3 font-mono">{entry.reason}</td>
                        <td className="py-2 pr-3 font-mono">{show(entry.count)}</td>
                      </tr>
                    ))}
                    {exclusionReasons.length === 0 ? (
                      <tr className="border-t border-[var(--rm-border)]">
                        <td className={`py-2 pr-3 ${supportingTextClassName}`} colSpan={2}>
                          No exclusion was recorded in the receipts read.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
              {evidenceFamilies.length > 0 ? (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr>
                        {[
                          "Family",
                          "Decisive",
                          "Holdout",
                          "Development",
                          "Distinct captures",
                          "Floor",
                        ].map((header) => (
                          <th
                            className={`pb-3 pr-3 font-normal ${monoEyebrowClassName}`}
                            key={header}
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {evidenceFamilies.map((entry) => {
                        const floorMet =
                          Number(evidenceFloor.minDecisiveComparisons ?? 0) > 0 &&
                          Number(entry.counts.decisiveComparisons ?? 0) >=
                            Number(evidenceFloor.minDecisiveComparisons ?? 0) &&
                          Number(entry.counts.distinctCaptures ?? 0) >=
                            Number(evidenceFloor.minDistinctCaptures ?? 0);
                        return (
                          <tr className="border-t border-[var(--rm-border)]" key={entry.family}>
                            <td className="py-2 pr-3 font-mono">{entry.family}</td>
                            <td className="py-2 pr-3 font-mono">
                              {show(entry.counts.decisiveComparisons)}
                            </td>
                            <td className="py-2 pr-3 font-mono">
                              {show(entry.counts.holdoutComparisons)}
                            </td>
                            <td className="py-2 pr-3 font-mono">
                              {show(entry.counts.developmentComparisons)}
                            </td>
                            <td className="py-2 pr-3 font-mono">
                              {show(entry.counts.distinctCaptures)}
                            </td>
                            <td className="py-2 pr-3">
                              <Badge tone={floorMet ? "success" : "warning"}>
                                {floorMet ? "met" : "below"}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </>
          ))}
      </SectionCard>
    </div>
  );
}

/**
 * Run 99 history page: a windowed summary of the live loop - activity heat grid, the decisive
 * comparison mix with per-comparison deltas, the activation/rollback timeline and the guardrail
 * verdicts. Every panel reads the durable projection; nothing is derived in the browser.
 */
export function LearningHistoryPage() {
  const { token, setToken } = useOperatorToken();
  const history = useOperatorSurface<Record<string, unknown>>(
    () => fetchLearningHistory(fetch, token || undefined, { hours: 168, bucketHours: 6 }),
    [token],
  );
  const view = normalizeLearningHistory(history.value);
  const nowMs = Date.now();
  return (
    <div className="grid gap-4">
      <SectionCard
        title="Learning history"
        description="What the replay, evaluation and learning loop did over the window, read from durable state."
      >
        <OperatorTokenField onToken={setToken} token={token} />
        {view.available ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Window" value={`${view.windowHours}h · ${view.bucketHours}h buckets`} />
            <Metric label="Replayed" value={show(view.totals.replays)} />
            <Metric label="Refused" value={show(view.totals.refusals)} />
            <Metric label="Deferred" value={show(view.totals.deferred)} />
            <Metric label="Evaluations" value={show(view.totals.evaluations)} />
            <Metric label="Comparisons" value={show(view.totals.comparisons)} />
            <Metric label="Decisive" value={show(view.totals.decisive)} />
            <Metric label="Validations" value={show(view.totals.validations)} />
            <Metric label="Activations" value={show(view.totals.activations)} />
            <Metric label="Rollbacks" value={show(view.totals.rollbacks)} />
            <Metric label="Advisory observed" value={show(view.totals.advisoryObserved)} />
            <Metric label="Would have changed" value={show(view.totals.advisoryWouldHaveChanged)} />
          </div>
        ) : null}
      </SectionCard>
      {degraded(history.loading, history.error) ?? (
        <>
          <LearningActivityHeatmapView history={view} nowMs={nowMs} />
          <LearningComparisonMixView history={view} />
          <LearningActivationTimelineView history={view} nowMs={nowMs} />
          <LearningGuardrailListView history={view} />
        </>
      )}
    </div>
  );
}

const PAGE_FOR_PATH: Readonly<Record<string, () => ReactElement>> = {
  "/app/learning": LearningOverviewPage,
  "/app/learning/configuration": LearningConfigurationPage,
  "/app/learning/packs": LearningPacksPage,
  "/app/learning/decisions": LearningDecisionsPage,
  "/app/learning/evidence": LearningEvidencePage,
  "/app/learning/history": LearningHistoryPage,
};

export function LearningRouteView() {
  const location = useLocation();
  const Page = PAGE_FOR_PATH[location.pathname] ?? LearningOverviewPage;
  return <Page />;
}

export default LearningRouteView;
