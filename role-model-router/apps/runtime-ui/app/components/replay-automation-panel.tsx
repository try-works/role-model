import {
  type ReplayAutomationView,
  controlActionFor,
  formatReplayBudget,
} from "../lib/replay-status";

/**
 * Run 97 replay automation operator panel.
 *
 * Presentational only: the caller supplies the normalized status and the control
 * handler, so the panel renders identically in SSR tests and in the runtime UI.
 */
export function ReplayAutomationPanelView({
  view,
  onControl,
  busy,
  controlError,
}: {
  readonly view: ReplayAutomationView;
  readonly onControl: (action: "pause" | "resume") => void;
  readonly busy: boolean;
  readonly controlError?: string | null;
}) {
  const action = controlActionFor(view);
  return (
    <section
      aria-label="Replay automation"
      className="rounded-lg border border-[var(--rm-border-strong)] bg-[var(--rm-surface)] p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-[var(--rm-fg)]">Replay automation</h2>
          <p className="text-xs text-[var(--rm-fg-muted)]">
            {view.available
              ? `${view.ticks} ticks · ${view.paused ? "paused" : "running"} · last ${view.lastOutcome} · ${view.lastDispositions} disposition(s)`
              : "replay automation unavailable"}
          </p>
          <p className="text-xs text-[var(--rm-fg-muted)]">{formatReplayBudget(view)}</p>
          {view.lastError ? (
            <p className="text-xs text-[var(--rm-danger)]">{view.lastError}</p>
          ) : null}
          {controlError ? <p className="text-xs text-[var(--rm-danger)]">{controlError}</p> : null}
        </div>
        {action ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onControl(action)}
            className="rounded border border-[var(--rm-border-strong)] px-3 py-1 text-xs font-medium text-[var(--rm-fg)] disabled:opacity-50"
          >
            {action === "pause" ? "Pause" : "Resume"}
          </button>
        ) : null}
      </div>
    </section>
  );
}
