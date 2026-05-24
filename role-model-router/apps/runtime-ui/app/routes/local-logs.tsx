import { useCallback, useEffect, useMemo, useState } from "react";

import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  SectionCard,
  StatusPill,
} from "../components/page-primitives";
import { codeBlockClassName, secondaryButtonClassName } from "../lib/design-system";
import { fetchLocalLogs } from "../lib/runtime-api";
import { buildStructuredLogRows } from "../lib/view-models";

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
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!autoRefresh) {
      return;
    }
    const interval = window.setInterval(() => void refresh(), 3000);
    return () => window.clearInterval(interval);
  }, [autoRefresh, refresh]);

  const logRows = useMemo(() => buildStructuredLogRows(logs, "local"), [logs]);
  const proxyRows = useMemo(
    () => logRows.filter((row) => row.sourceClass === "proxy"),
    [logRows],
  );
  const llamaSwapRows = useMemo(
    () => logRows.filter((row) => row.sourceClass !== "proxy"),
    [logRows],
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Local"
        title="Log streaming"
        description="Structured local log history for the llama-swap runtime, with optional auto-refresh while you watch model swaps and request handling."
      />

      {error ? <ErrorState label={error} /> : null}

      <SectionCard
        title="Structured local log history"
        description="Rows are parsed into Timestamp, Source, Severity, Request, and message fields so local runtime behavior can be inspected without raw console noise."
      >
        <div className="mb-4 flex items-center gap-4">
          <button
            type="button"
            onClick={() => void refresh()}
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
              onChange={(event) => setAutoRefresh(event.target.checked)}
              className="h-4 w-4 rounded-none border-[var(--rm-border-strong)] accent-[var(--rm-accent)]"
            />
            <label htmlFor="autoRefresh" className="text-sm text-[var(--rm-fg)]">
              Auto-refresh (3s)
            </label>
          </div>
          <span className="ml-auto text-xs text-[var(--rm-muted)]">{logRows.length} rows</span>
        </div>

        {loading && logRows.length === 0 ? (
          <LoadingState label="Loading logs…" />
        ) : logRows.length === 0 ? (
          <EmptyState label="No logs available. The local runtime may not be running." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-[var(--rm-muted)]">
                <tr>
                  <th className="pb-3 font-medium">Timestamp</th>
                  <th className="pb-3 font-medium">Source</th>
                  <th className="pb-3 font-medium">Severity</th>
                  <th className="pb-3 font-medium">Request</th>
                  <th className="pb-3 font-medium">Entry</th>
                </tr>
              </thead>
              <tbody>
                {logRows.map((row) => (
                  <tr key={row.key} className="border-t border-[var(--rm-border)] align-top">
                    <td className="py-3 text-[var(--rm-secondary)]">{row.timestamp ?? "—"}</td>
                    <td className="py-3 text-[var(--rm-secondary)]">{row.sourceClass}</td>
                    <td className="py-3">
                      {row.severity ? (
                        <StatusPill
                          tone={
                            row.severity === "error"
                              ? "warning"
                              : row.severity === "warn"
                                ? "warning"
                                : row.severity === "info"
                                  ? "accent"
                                  : "neutral"
                          }
                        >
                          {row.severity}
                        </StatusPill>
                      ) : (
                        <span className="text-[var(--rm-muted)]">—</span>
                      )}
                    </td>
                    <td className="py-3 text-[var(--rm-secondary)]">{row.requestId ?? "—"}</td>
                    <td className="py-3 text-[var(--rm-secondary)]">{row.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Raw log streams"
        description="Keep proxy and llama-swap runtime output side by side so operators can compare the gateway-facing stream against the local engine stream."
      >
        <div className="grid gap-4 xl:grid-cols-2">
          <div>
            <p className="mb-2 font-medium text-[var(--rm-fg)]">Proxy log stream</p>
            {proxyRows.length === 0 ? (
              <EmptyState label="No proxy log lines are available yet." />
            ) : (
              <pre className={`max-h-80 overflow-auto whitespace-pre-wrap ${codeBlockClassName}`}>
                {proxyRows.map((row) => row.rawLine).join("\n")}
              </pre>
            )}
          </div>
          <div>
            <p className="mb-2 font-medium text-[var(--rm-fg)]">Llama-swap log stream</p>
            {llamaSwapRows.length === 0 ? (
              <EmptyState label="No llama-swap log lines are available yet." />
            ) : (
              <pre className={`max-h-80 overflow-auto whitespace-pre-wrap ${codeBlockClassName}`}>
                {llamaSwapRows.map((row) => row.rawLine).join("\n")}
              </pre>
            )}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
