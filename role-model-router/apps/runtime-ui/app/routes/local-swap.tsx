import { useCallback, useEffect, useState } from "react";

import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  SectionCard,
} from "../components/page-primitives";
import { mutedPanelClassName } from "../lib/design-system";
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
      <PageHeader
        eyebrow="Local"
        title="Swap history"
        description="Chronological log of model swap events."
      />

      {error ? <ErrorState label={error} /> : null}

      <SectionCard title="Event ledger" description="Most recent swap events first.">
        {loading && events.length === 0 ? (
          <LoadingState label="Loading swap history…" />
        ) : events.length === 0 ? (
          <EmptyState label="No swap events recorded yet." />
        ) : (
          <div className="space-y-3">
            {events.map((event, index) => (
              <div
                key={`${event.timestamp}-${index}`}
                className={`${mutedPanelClassName} flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between`}
              >
                <div className="flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--rm-muted)]">
                      {new Date(event.timestamp).toLocaleString()}
                    </span>
                    <span className="rounded-none border border-[var(--rm-border)] bg-[var(--rm-bg)] px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--rm-secondary)]">
                      {event.reason}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {event.oldModel ? (
                      <>
                        <span className="break-words font-mono text-sm text-[var(--rm-muted)] line-through">
                          {event.oldModel}
                        </span>
                        <span className="text-sm text-[var(--rm-muted)]">→</span>
                      </>
                    ) : (
                      <span className="text-sm text-[var(--rm-muted)]">Initial load →</span>
                    )}
                    <span className="break-words font-mono text-sm font-medium text-[var(--rm-fg)]">
                      {event.newModel}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
