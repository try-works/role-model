import { useCallback, useEffect, useState } from "react";

import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  SectionCard,
} from "../components/page-primitives";
import { mutedPanelClassName, secondaryButtonClassName } from "../lib/design-system";
import { fetchLocalLogs } from "../lib/runtime-api";

export default function LocalLogsRoute() {
  const [logs, setLogs] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLocalLogs();
      setLogs(data.logs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load logs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(refresh, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh, refresh]);

  const logLines = logs.split("\n").filter((line) => line.trim().length > 0);
  const seenLogLines = new Map<string, number>();
  const logRows = logLines.map((line) => {
    const occurrence = (seenLogLines.get(line) ?? 0) + 1;
    seenLogLines.set(line, occurrence);
    return { key: `${line}-${occurrence}`, line };
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Local"
        title="Log streaming"
        description="Real-time log stream from the local llama-swap runtime."
      />

      {error ? <ErrorState label={error} /> : null}

      <SectionCard
        title="Live logs"
        description="Buffered log output from the local inference runtime."
      >
        <div className="mb-4 flex items-center gap-4">
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className={secondaryButtonClassName}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="autoRefresh"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="h-4 w-4 rounded-none border-[var(--rm-border-strong)] accent-[var(--rm-accent)]"
            />
            <label htmlFor="autoRefresh" className="text-sm text-[var(--rm-fg)]">
              Auto-refresh (3s)
            </label>
          </div>
          <span className="ml-auto text-xs text-[var(--rm-muted)]">{logLines.length} lines</span>
        </div>

        {loading && logLines.length === 0 ? (
          <LoadingState label="Loading logs…" />
        ) : logLines.length === 0 ? (
          <EmptyState label="No logs available. The local runtime may not be running." />
        ) : (
          <pre
            className={`${mutedPanelClassName} h-96 overflow-auto p-4 text-xs leading-5 font-mono text-[var(--rm-secondary)]`}
          >
            {logRows.map((line) => (
              <div key={line.key} className="whitespace-pre-wrap break-all">
                {line.line}
              </div>
            ))}
          </pre>
        )}
      </SectionCard>
    </div>
  );
}
