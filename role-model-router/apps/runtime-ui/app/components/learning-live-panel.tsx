import { Activity, Gauge } from "lucide-react";
import type { ReactElement } from "react";

import {
  type LearningActivityView,
  formatCompact,
  formatRelativeAge,
} from "../lib/learning-visuals";
// Run 98 addendum 24: replay dispositions now carry a vocabulary the operator had no copy for
// (`replay_handoff_evaluation_pending`). This maps a disposition into operator copy and keeps the
// raw vocabulary available, so a handed-off capture never reads as a failed replay.
import { describeReplayDisposition } from "../lib/replay-disposition-copy";
import { EmptyState, ErrorState, LoadingState, StatusPill } from "./page-primitives";

/**
 * Run 99 - the Learning live panel, modelled on the reference "Context window" gauge plus the
 * "Alert rules"/"Tool call graph" row vocabulary: one accent, monospace numerals, a status pill
 * per row, and every number read from durable state (never fabricated).
 */

const OUTCOME_TONE: Record<string, "success" | "warning" | "error" | "neutral"> = {
  replayed: "success",
  completed: "success",
  validate: "success",
  validated: "success",
  active: "success",
  refused: "error",
  failed: "error",
  reject: "error",
  rolled_back: "error",
  breach: "error",
  deferred: "warning",
  scoring: "warning",
  insufficient_evidence: "warning",
};

const KIND_LABEL: Record<string, string> = {
  replay: "replay",
  evaluation: "eval",
  learner: "learner",
};

function toneFor(outcome: string): "success" | "warning" | "error" | "neutral" {
  return OUTCOME_TONE[outcome.toLowerCase()] ?? "neutral";
}

/**
 * Segmented radial gauge: 44 ticks across a 200 degree arc, filled to `percent`.
 */
function BudgetArc({
  percent,
  used,
  limit,
}: { readonly percent: number; readonly used: number; readonly limit: number }): ReactElement {
  const ticks = 44;
  const startAngle = 160;
  const sweep = 220;
  const filled = Math.round((Math.min(100, Math.max(0, percent)) / 100) * ticks);
  return (
    /**
     * Operator-reported alignment defect (2026-09-23): this block is the first child of the right-hand
     * column, and its content was anchored to the bottom of a 168px box - the arc's viewBox carried 22
     * units of empty space above the apex and the readout sat at `bottom-[18px]`. Measured live, the
     * column's first row started at y=520 while the gauge's visible content began at y=618, so the
     * right-hand column read as vertically centred against the table on the left.
     *
     * The ticks run from 160 deg to 380 deg around (cx 110, cy 118) at a 96-unit radius, which is a
     * bowl: its two tips are the highest points (y = 118 - 96*sin(20 deg) = 85.2) and its dip is the
     * lowest (y = 214). The viewBox therefore crops to x 14-206, y 85-214, so the tips sit on the
     * block's top edge and the readout is the bowl's centre label rather than a bottom-anchored
     * caption. (Measured live on the packaged runtime after this crop: the topmost tick lands on the
     * block's top edge, level with the pipeline table's first row.)
     */
    <div className="relative flex h-[150px] items-start justify-center">
      <svg
        viewBox="14 85 192 129"
        className="h-full w-full"
        role="img"
        aria-label={`${used} of ${limit} dispatches used`}
      >
        {Array.from({ length: ticks }, (_, index) => {
          const angle = ((startAngle + (sweep / (ticks - 1)) * index) * Math.PI) / 180;
          const outer = 96;
          const inner = index < filled ? 78 : 84;
          const cx = 110;
          const cy = 118;
          const x1 = cx + Math.cos(angle) * inner;
          const y1 = cy - Math.sin(angle) * inner;
          const x2 = cx + Math.cos(angle) * outer;
          const y2 = cy - Math.sin(angle) * outer;
          return (
            <line
              key={index}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={index < filled ? "var(--rm-success)" : "var(--rm-border-strong)"}
              strokeWidth={index < filled ? 3 : 2}
              strokeLinecap="round"
            />
          );
        })}
      </svg>
      <div className="pointer-events-none absolute inset-x-0 top-[46px] text-center">
        <div className="font-mono text-3xl font-semibold text-[var(--rm-fg)]">
          {formatCompact(used)}
        </div>
        <div className="text-xs text-[var(--rm-fg-muted)]">
          of {formatCompact(limit)} dispatches · {Math.round(percent)}% used
        </div>
      </div>
    </div>
  );
}

export function LearningLivePanelView({
  view,
  loading,
  error,
  nowMs,
  scopeLabel,
}: {
  readonly view: LearningActivityView;
  readonly loading: boolean;
  readonly error: string | null;
  readonly nowMs: number;
  readonly scopeLabel?: string | null;
}): ReactElement {
  const anyActive = view.pipeline.some((stage) => stage.active);
  const observed = formatRelativeAge(view.observedAtMs, nowMs);
  const unauthorized = Boolean(
    error && /401|operator_authentication_required|unauthorized/i.test(error),
  );
  // An unreadable state is never "idle": say what is actually true.
  const status: {
    readonly tone: "success" | "neutral" | "error" | "warning";
    readonly label: string;
  } = loading
    ? { tone: "neutral", label: "loading" }
    : error
      ? {
          tone: unauthorized ? "warning" : "error",
          label: unauthorized ? "token required" : "unavailable",
        }
      : view.available
        ? { tone: anyActive ? "success" : "neutral", label: anyActive ? "running" : "idle" }
        : { tone: "neutral", label: "no readback" };
  const metadata = [
    scopeLabel && scopeLabel !== "—" ? scopeLabel : "scope not set",
    `last ${view.windowMinutes}m`,
    loading
      ? "reading"
      : error
        ? unauthorized
          ? "awaiting operator token"
          : "not read"
        : view.available
          ? `updated ${observed}`
          : "not read",
  ].join(" · ");

  return (
    <section
      aria-label="Live replay and evaluation"
      className="rounded-lg border border-[var(--rm-border-strong)] bg-[var(--rm-surface)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--rm-border)] p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-md border border-dashed border-[var(--rm-border-strong)] text-[var(--rm-fg-muted)]">
            <Activity size={16} aria-hidden />
          </span>
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-[var(--rm-fg)]">
              Live replay &amp; evaluation
            </h2>
            <p className="font-mono text-xs text-[var(--rm-fg-muted)]">{metadata}</p>
          </div>
        </div>
        <StatusPill tone={status.tone}>{status.label}</StatusPill>
      </div>

      {loading ? (
        <div className="p-4">
          <LoadingState label="Reading live replay and evaluation state" />
        </div>
      ) : error ? (
        <div className="p-4">
          <ErrorState label={`Live state unavailable: ${error}. No value is fabricated.`} />
        </div>
      ) : !view.available ? (
        <div className="p-4">
          <EmptyState label="No live activity readback has been recorded for this scope yet." />
        </div>
      ) : (
        <div className="space-y-4 p-4">
          <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
            <div className="space-y-1">
              {view.pipeline.map((stage) => (
                <div
                  key={stage.stage}
                  className="flex items-center justify-between gap-3 border-b border-[var(--rm-border)] py-2 last:border-b-0"
                >
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="h-2 w-2 rounded-full"
                      style={{
                        background: stage.active ? "var(--rm-success)" : "var(--rm-border-strong)",
                      }}
                    />
                    <span className="font-mono text-xs text-[var(--rm-fg)]">{stage.label}</span>
                  </div>
                  <span className="font-mono text-xs text-[var(--rm-fg-muted)]">
                    {stage.pending > 0 ? `${stage.pending} in flight · ` : ""}
                    {stage.recent} in window
                  </span>
                  <span className="font-mono text-xs text-[var(--rm-fg-muted)]">
                    {formatRelativeAge(stage.lastEventAtMs, nowMs)}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <BudgetArc
                percent={view.budget.dispatches.percent}
                used={view.budget.dispatches.used}
                limit={view.budget.dispatches.limit}
              />
              <dl className="space-y-1">
                <div className="flex items-center justify-between">
                  <dt className="flex items-center gap-2 text-xs text-[var(--rm-fg-muted)]">
                    <Gauge size={12} aria-hidden />
                    counterfactuals
                  </dt>
                  <dd className="font-mono text-xs text-[var(--rm-fg)]">
                    {formatCompact(view.budget.counterfactuals.used)} /{" "}
                    {formatCompact(view.budget.counterfactuals.limit)}
                  </dd>
                </div>
                {view.budget.byKind.map((kind) => (
                  <div key={kind.kind} className="flex items-center justify-between">
                    <dt className="text-xs text-[var(--rm-fg-muted)]">{kind.kind} dispatches</dt>
                    <dd className="font-mono text-xs text-[var(--rm-fg)]">
                      {formatCompact(kind.count)} · {Math.round(kind.share * 100)}%
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--rm-fg-muted)]">
              Recent events
            </h3>
            {view.recent.length === 0 ? (
              <EmptyState label="No replay, evaluation or learning event in the window." />
            ) : (
              <ul className="space-y-1">
                {view.recent.map((event) => {
                  const disposition = describeReplayDisposition({
                    outcome: event.outcome,
                    detail: event.detail,
                  });
                  return (
                    <li
                      key={`${event.kind}:${event.id}:${event.atMs}`}
                      className="flex items-center gap-3 border-b border-[var(--rm-border)] py-1.5 last:border-b-0"
                      title={disposition.explanation}
                      // Run 98 addendum 24: the raw disposition vocabulary stays in the DOM (and the
                      // detail line below keeps it visible) while the pill renders operator copy.
                      data-outcome={event.outcome}
                    >
                      <span className="w-16 shrink-0 font-mono text-xs text-[var(--rm-fg-muted)]">
                        {new Date(event.atMs).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>
                      <span className="w-16 shrink-0 font-mono text-xs text-[var(--rm-fg-muted)]">
                        {KIND_LABEL[event.kind] ?? event.kind}
                      </span>
                      <span
                        className="min-w-0 flex-1 truncate font-mono text-xs text-[var(--rm-fg)]"
                        title={event.id}
                      >
                        {event.id}
                      </span>
                      {event.detail ? (
                        <span className="hidden shrink-0 font-mono text-xs text-[var(--rm-fg-muted)] sm:block">
                          {event.detail}
                        </span>
                      ) : null}
                      <StatusPill tone={disposition.tone}>{disposition.label}</StatusPill>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
