import { AlertTriangle, CheckCircle2, GitBranch, Sparkles } from "lucide-react";
import type { ReactElement } from "react";

import { EmptyState, StatusPill } from "./page-primitives";
import {
  type LearningComparisonDelta,
  type LearningGuardrailRow,
  type LearningHistoryView,
  type LearningTimelineEntry,
  formatBucketLabel,
  formatCompact,
  formatRelativeAge,
  historyHeatmap,
} from "../lib/learning-visuals";

/**
 * Run 99 - the Learning history panels, modelled on three reference cards:
 * "Latency by hour" (activity heat grid), "Head-to-head" (comparison mix + per-case deltas)
 * and "Deployments" (activation timeline with annotation callouts).
 */

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function PanelShell({
  title,
  subtitle,
  icon,
  children,
  actions,
}: {
  readonly title: string;
  readonly subtitle: string;
  readonly icon: ReactElement;
  readonly children: ReactElement | ReactElement[];
  readonly actions?: ReactElement | null;
}): ReactElement {
  return (
    <section
      aria-label={title}
      className="rounded-lg border border-[var(--rm-border-strong)] bg-[var(--rm-surface)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--rm-border)] p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-md border border-dashed border-[var(--rm-border-strong)] text-[var(--rm-fg-muted)]">
            {icon}
          </span>
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-[var(--rm-fg)]">{title}</h2>
            <p className="font-mono text-xs text-[var(--rm-fg-muted)]">{subtitle}</p>
          </div>
        </div>
        {actions}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function LearningActivityHeatmapView({
  history,
  nowMs,
}: {
  readonly history: LearningHistoryView;
  readonly nowMs: number;
}): ReactElement {
  const heatmap = historyHeatmap(history.buckets);
  const subtitle = `${history.windowHours}h · ${history.bucketHours}h buckets · ${formatCompact(
    history.totals.replays + history.totals.evaluations + history.totals.validations,
  )} events`;
  return (
    <PanelShell
      title="Activity by bucket"
      subtitle={subtitle}
      icon={<ActivityIcon />}
      actions={
        heatmap.max > 0 ? (
          <StatusPill tone="neutral">peak {formatCompact(heatmap.max)}</StatusPill>
        ) : null
      }
    >
      {heatmap.columns === 0 ? (
        <EmptyState label="No durable replay or evaluation activity in the window." />
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-[36px_1fr] gap-x-2 gap-y-1">
            <span />
            <div className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${heatmap.columns}, minmax(0, 1fr))` }}>
              {heatmap.cells.map((cell) => (
                <span
                  key={`head-${cell.startMs}`}
                  className="text-center font-mono text-[9px] text-[var(--rm-fg-muted)]"
                >
                  {cell.column === 0 || cell.column === heatmap.columns - 1 || cell.column % 6 === 0
                    ? formatBucketLabel(cell.startMs, history.bucketHours)
                    : ""}
                </span>
              ))}
            </div>
            {WEEKDAYS.map((label, weekday) => (
              <div key={label} className="contents">
                <span className="font-mono text-[10px] leading-4 text-[var(--rm-fg-muted)]">{label}</span>
                <div className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${heatmap.columns}, minmax(0, 1fr))` }}>
                  {Array.from({ length: heatmap.columns }, (_, column) => {
                    const cell = heatmap.cells.find((entry) => entry.weekday === weekday && entry.column === column);
                    const value = cell?.value ?? 0;
                    const intensity = cell?.intensity ?? 0;
                    const isWorst = cell ? heatmap.worstStartMs === cell.startMs && value > 0 : false;
                    return (
                      <span
                        key={`${weekday}-${column}`}
                        title={cell ? `${formatBucketLabel(cell.startMs, history.bucketHours)} · ${value} events` : "no bucket"}
                        className="h-3 rounded-[3px]"
                        style={{
                          background:
                            value === 0
                              ? "var(--rm-border)"
                              : `color-mix(in srgb, var(--rm-success) ${Math.max(18, Math.round(intensity * 100))}%, transparent)`,
                          outline: isWorst ? "1px solid var(--rm-fg)" : "none",
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-mono text-[10px] text-[var(--rm-fg-muted)]">
              <span>0</span>
              <span className="flex gap-[3px]">
                {[18, 40, 62, 84, 100].map((step) => (
                  <span
                    key={step}
                    className="h-2.5 w-4 rounded-[2px]"
                    style={{ background: `color-mix(in srgb, var(--rm-success) ${step}%, transparent)` }}
                  />
                ))}
              </span>
              <span>{formatCompact(heatmap.max)}</span>
              {heatmap.worstStartMs ? <span>· peak {formatBucketLabel(heatmap.worstStartMs, history.bucketHours)}</span> : null}
            </div>
            <dl className="flex flex-wrap gap-x-4 gap-y-1">
              <div className="flex items-baseline gap-2">
                <dt className="text-xs text-[var(--rm-fg-muted)]">replayed</dt>
                <dd className="font-mono text-xs text-[var(--rm-fg)]">{formatCompact(history.totals.replays)}</dd>
              </div>
              <div className="flex items-baseline gap-2">
                <dt className="text-xs text-[var(--rm-fg-muted)]">refused</dt>
                <dd className="font-mono text-xs text-[var(--rm-fg)]">{formatCompact(history.totals.refusals)}</dd>
              </div>
              <div className="flex items-baseline gap-2">
                <dt className="text-xs text-[var(--rm-fg-muted)]">deferred</dt>
                <dd className="font-mono text-xs text-[var(--rm-fg)]">{formatCompact(history.totals.deferred)}</dd>
              </div>
              <div className="flex items-baseline gap-2">
                <dt className="text-xs text-[var(--rm-fg-muted)]">evaluations</dt>
                <dd className="font-mono text-xs text-[var(--rm-fg)]">{formatCompact(history.totals.evaluations)}</dd>
              </div>
            </dl>
          </div>
        </div>
      )}
    </PanelShell>
  );
}

function ActivityIcon(): ReactElement {
  return <Sparkles size={16} aria-hidden />;
}

/** Dot strip: every comparison delta as a dot, zero line, worst-case callout. */
function DeltaStrip({
  deltas,
  worst,
}: {
  readonly deltas: readonly LearningComparisonDelta[];
  readonly worst: LearningComparisonDelta | null;
}): ReactElement {
  if (deltas.length === 0) return <EmptyState label="No validation deltas recorded in the window." />;
  const bound = Math.max(0.1, ...deltas.map((entry) => Math.abs(entry.delta)));
  const scale = (value: number) => 50 + (value / bound) * 46;
  return (
    <div className="space-y-2">
      <div className="relative h-16">
        <span
          aria-hidden
          className="absolute inset-y-0 border-l border-dashed border-[var(--rm-border-strong)]"
          style={{ left: `${scale(0)}%` }}
        />
        {deltas.map((entry, index) => {
          const positive = entry.delta >= 0;
          return (
            <span
              key={`${entry.comparisonId}-${index}`}
              title={`${entry.comparisonId} · ${entry.delta >= 0 ? "+" : ""}${entry.delta.toFixed(3)}`}
              className="absolute h-1.5 w-1.5 rounded-full"
              style={{
                left: `calc(${scale(entry.delta)}% - 3px)`,
                bottom: `${8 + (index % 9) * 5}px`,
                background: entry.decisive ? "var(--rm-success)" : "var(--rm-border-strong)",
                opacity: entry.decisive ? 1 : 0.9,
                outline: positive ? "none" : "1px solid var(--rm-danger)",
              }}
            />
          );
        })}
      </div>
      <div className="flex items-center justify-between font-mono text-[10px] text-[var(--rm-fg-muted)]">
        <span>-{bound.toFixed(2)}</span>
        <span>0</span>
        <span>+{bound.toFixed(2)}</span>
      </div>
      {worst ? (
        <div className="flex items-center gap-2">
          <StatusPill tone="error">worst {worst.delta >= 0 ? "+" : ""}{worst.delta.toFixed(3)}</StatusPill>
          <span className="truncate font-mono text-xs text-[var(--rm-fg-muted)]">{worst.comparisonId}</span>
        </div>
      ) : null}
    </div>
  );
}

export function LearningComparisonMixView({
  history,
}: {
  readonly history: LearningHistoryView;
}): ReactElement {
  const { mix, totals } = history;
  const mixTotal = mix.candidate + mix.source + mix.tie + mix.insufficient;
  const segments = [
    { key: "candidate", label: "candidate", count: mix.candidate, color: "var(--rm-success)" },
    { key: "source", label: "source", count: mix.source, color: "color-mix(in srgb, var(--rm-success) 60%, var(--rm-border-strong))" },
    { key: "tie", label: "tie", count: mix.tie, color: "var(--rm-border-strong)" },
    { key: "insufficient", label: "insufficient", count: mix.insufficient, color: "color-mix(in srgb, var(--rm-danger) 45%, var(--rm-border-strong))" },
  ];
  return (
    <PanelShell
      title="Decisive comparison mix"
      subtitle={`${formatCompact(totals.comparisons)} comparisons · ${formatCompact(totals.decisive)} decisive · ${formatCompact(totals.validations)} validations`}
      icon={<GitBranch size={16} aria-hidden />}
      actions={<StatusPill tone={mix.decisiveShare >= 0.5 ? "success" : "neutral"}>{Math.round(mix.decisiveShare * 100)}% decisive</StatusPill>}
    >
      {mixTotal === 0 ? (
        <EmptyState label="No finalized comparison groups recorded for this scope yet." />
      ) : (
        <div className="space-y-3">
          <div className="flex h-3 w-full overflow-hidden rounded-full border border-[var(--rm-border)]">
            {segments.map((segment) =>
              segment.count > 0 ? (
                <span
                  key={segment.key}
                  className="h-full"
                  style={{ width: `${(segment.count / mixTotal) * 100}%`, background: segment.color }}
                  title={`${segment.label} ${segment.count}`}
                />
              ) : null,
            )}
          </div>
          <dl className="flex flex-wrap gap-x-5 gap-y-1">
            {segments.map((segment) => (
              <div key={segment.key} className="flex items-baseline gap-2">
                <dt className="flex items-center gap-2 text-xs text-[var(--rm-fg-muted)]">
                  <span aria-hidden className="h-2 w-2 rounded-sm" style={{ background: segment.color }} />
                  {segment.label}
                </dt>
                <dd className="font-mono text-xs text-[var(--rm-fg)]">{formatCompact(segment.count)}</dd>
              </div>
            ))}
          </dl>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--rm-fg-muted)]">Per-comparison delta</h3>
              <span className="font-mono text-xs text-[var(--rm-fg-muted)]">
                worst {mix.worst ? `${mix.worst.delta >= 0 ? "+" : ""}${mix.worst.delta.toFixed(3)}` : "—"}
              </span>
            </div>
            <DeltaStrip deltas={mix.deltas} worst={mix.worst} />
          </div>
        </div>
      )}
    </PanelShell>
  );
}

const TIMELINE_TONE: Record<LearningTimelineEntry["kind"], "success" | "error" | "warning"> = {
  activate: "success",
  rollback: "error",
  breach: "warning",
};

export function LearningActivationTimelineView({
  history,
  nowMs,
}: {
  readonly history: LearningHistoryView;
  readonly nowMs: number;
}): ReactElement {
  const { timeline, totals } = history;
  const annotation = timeline.find((entry) => entry.kind === "rollback" || entry.kind === "breach") ?? null;
  return (
    <PanelShell
      title="Activation timeline"
      subtitle={`${formatCompact(totals.activations)} activation(s) · ${formatCompact(totals.rollbacks)} rollback(s) · ${formatCompact(totals.guardrailBreaches)} breach(es)`}
      icon={<CheckCircle2 size={16} aria-hidden />}
      actions={
        totals.rollbacks > 0 ? <StatusPill tone="error">rolled back</StatusPill> : <StatusPill tone="success">stable</StatusPill>
      }
    >
      {timeline.length === 0 ? (
        <EmptyState label="No activation, rollback or guardrail event in the window." />
      ) : (
        <div className="space-y-4">
          <div className="relative h-10">
            <span aria-hidden className="absolute inset-x-0 top-5 border-t border-[var(--rm-border-strong)]" />
            {timeline.map((entry) => {
              const oldest = timeline[timeline.length - 1].atMs;
              const span = Math.max(1, nowMs - oldest);
              const left = Math.min(97, Math.max(1, ((entry.atMs - oldest) / span) * 96));
              const isDiamond = entry.kind === "activate";
              return (
                <span
                  key={`${entry.kind}-${entry.atMs}-${entry.packageId}`}
                  title={`${entry.kind} · ${entry.packageId || "—"} · ${formatRelativeAge(entry.atMs, nowMs)}${entry.cohortPercent !== null ? ` · ${entry.cohortPercent}%` : ""}`}
                  className={isDiamond ? "absolute top-3 h-4 w-4 rotate-45 rounded-[3px]" : "absolute top-4 h-3 w-3 rounded-full"}
                  style={{
                    left: `${left}%`,
                    background: entry.kind === "activate" ? "var(--rm-success)" : "var(--rm-warning)",
                    outline: entry.kind === "breach" ? "1px solid var(--rm-danger)" : "none",
                  }}
                />
              );
            })}
          </div>
          {annotation ? (
            <div className="rounded-md border border-[var(--rm-border-strong)] bg-[var(--rm-surface-strong)] px-3 py-2">
              <span className="font-mono text-xs text-[var(--rm-fg)]">
                {annotation.kind === "breach" ? "guardrail breach" : "rolled back"}
                {annotation.detail ? ` · ${annotation.detail}` : ""} · {formatRelativeAge(annotation.atMs, nowMs)}
              </span>
            </div>
          ) : null}
          <ul className="space-y-1">
            {timeline.slice(0, 6).map((entry) => (
              <li
                key={`row-${entry.kind}-${entry.atMs}-${entry.packageId}`}
                className="flex items-center gap-3 border-b border-[var(--rm-border)] py-1.5 last:border-b-0"
              >
                <span className="w-20 shrink-0 font-mono text-xs text-[var(--rm-fg-muted)]">
                  {new Date(entry.atMs).toLocaleDateString([], { month: "2-digit", day: "2-digit" })}
                </span>
                <StatusPill tone={TIMELINE_TONE[entry.kind]}>{entry.kind}</StatusPill>
                <span className="min-w-0 flex-1 truncate font-mono text-xs text-[var(--rm-fg)]" title={entry.packageId}>
                  {entry.packageId || "—"}
                </span>
                <span className="shrink-0 font-mono text-xs text-[var(--rm-fg-muted)]">
                  {entry.cohortPercent !== null ? `${entry.cohortPercent}% cohort` : entry.state}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </PanelShell>
  );
}

export function LearningGuardrailListView({
  history,
}: {
  readonly history: LearningHistoryView;
}): ReactElement {
  return (
    <PanelShell
      title="Guardrails"
      subtitle={`policy v${history.policyVersion ?? "—"} · ${history.guardrailsFiring} firing`}
      icon={<AlertTriangle size={16} aria-hidden />}
      actions={
        history.guardrailsFiring > 0 ? (
          <StatusPill tone="error">{history.guardrailsFiring} firing</StatusPill>
        ) : (
          <StatusPill tone="success">all clear</StatusPill>
        )
      }
    >
      {history.guardrails.length === 0 ? (
        <EmptyState label="No guardrail configuration is readable for this scope." />
      ) : (
        <ul className="space-y-1">
          {history.guardrails.map((row) => (
            <GuardrailRow key={row.metric} row={row} />
          ))}
        </ul>
      )}
    </PanelShell>
  );
}

function GuardrailRow({ row }: { readonly row: LearningGuardrailRow }): ReactElement {
  const tone = row.status === "firing" ? "error" : row.status === "ok" ? "success" : "neutral";
  return (
    <li className="flex items-center gap-3 border-b border-[var(--rm-border)] py-2 last:border-b-0">
      <span className="min-w-0 flex-1 truncate font-mono text-xs text-[var(--rm-fg)]" title={row.metric}>
        {row.label}
      </span>
      <span className="shrink-0 font-mono text-xs text-[var(--rm-fg-muted)]">
        limit {row.limit}
        {row.unit ? ` ${row.unit}` : ""}
      </span>
      <span className="shrink-0 font-mono text-xs text-[var(--rm-fg)]">
        {row.observed === null ? "no data" : `${row.observed}`}
      </span>
      <StatusPill tone={tone}>{row.status}</StatusPill>
    </li>
  );
}
