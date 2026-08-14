import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";

import {
  Badge,
  EmptyState,
  ErrorState,
  LoadingState,
  SectionCard,
} from "../components/page-primitives";
import {
  bodyStrongTextClassName,
  codeBlockClassName,
  compactTitleClassName,
  metaTextClassName,
  mutedPanelClassName,
  secondaryButtonClassName,
  supportingTextClassName,
} from "../lib/design-system";
import { fetchSwapHistory } from "../lib/runtime-api";

interface SwapEvent {
  timestamp: string;
  oldModel: string | null;
  newModel: string;
  reason: string;
}

export default function LocalSwapRoute() {
  const [events, setEvents] = useState<SwapEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSwapHistory();
      setEvents([...data]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load swap history");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="space-y-8">
      {error ? <ErrorState label={error} /> : null}

      <SectionCard title="Event ledger" description="Most recent swap events first.">
        {loading && events.length === 0 ? (
          <LoadingState label="Loading swap history…" />
        ) : events.length === 0 ? (
          <div className="space-y-3">
            <EmptyState label="No swap events recorded yet." />
            <div
              className={`${mutedPanelClassName} flex flex-wrap items-center justify-between gap-3 p-4`}
            >
              <p className={supportingTextClassName}>
                Events appear here when the managed host loads a first model, swaps to a new one, or
                records the operator-visible reason for a transition.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link className={secondaryButtonClassName} to="/app/local/llama-swap/models">
                  Open models
                </Link>
                <Link className={secondaryButtonClassName} to="/app/local/llama-swap/policy">
                  Open host policy
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event, index) => (
              <div
                key={`${event.timestamp}-${index}`}
                className={`${mutedPanelClassName} flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between`}
              >
                <div className="flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className={metaTextClassName}>
                      {new Date(event.timestamp).toLocaleString()}
                    </span>
                    <Badge tone="neutral">{event.reason}</Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    {event.oldModel ? (
                      <>
                        <span
                          className={`break-words ${codeBlockClassName} text-[var(--rm-muted)] line-through`}
                        >
                          {event.oldModel}
                        </span>
                        <span className={supportingTextClassName}>→</span>
                      </>
                    ) : (
                      <span className={supportingTextClassName}>Initial load →</span>
                    )}
                    <span
                      className={`break-words ${bodyStrongTextClassName} [font-family:var(--rm-font-mono)]`}
                    >
                      {event.newModel}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Ledger semantics"
        description="Swap history stays narrow on purpose so each row can explain what changed without duplicating the full model-management surface."
      >
        <div className="grid gap-3 xl:grid-cols-3">
          <div className={`${mutedPanelClassName} space-y-2 p-4`}>
            <p className={compactTitleClassName}>Initial load</p>
            <p className={supportingTextClassName}>
              Rows without an old model indicate the first model activation for the current managed
              host window.
            </p>
          </div>
          <div className={`${mutedPanelClassName} space-y-2 p-4`}>
            <p className={compactTitleClassName}>Swap reason</p>
            <p className={supportingTextClassName}>
              The reason badge records why a new model became active so policy and operator intent
              remain inspectable later.
            </p>
          </div>
          <div className={`${mutedPanelClassName} space-y-2 p-4`}>
            <p className={compactTitleClassName}>Timeline order</p>
            <p className={supportingTextClassName}>
              The newest host transition stays first so troubleshooting can start with the latest
              local-runtime state.
            </p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
