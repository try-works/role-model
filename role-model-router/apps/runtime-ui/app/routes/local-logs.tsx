import { useCallback, useEffect, useMemo, useState } from "react";

import { CheckboxControl } from "../components/checkbox-control";
import {
  Badge,
  EmptyState,
  ErrorState,
  LoadingState,
  SectionCard,
} from "../components/page-primitives";
import {
  bodyTextClassName,
  codeBlockClassName,
  compactTitleClassName,
  monoEyebrowClassName,
  mutedPanelClassName,
  secondaryButtonClassName,
  supportingTextClassName,
} from "../lib/design-system";
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
  const proxyRows = useMemo(() => logRows.filter((row) => row.sourceClass === "proxy"), [logRows]);
  const llamaSwapRows = useMemo(
    () => logRows.filter((row) => row.sourceClass !== "proxy"),
    [logRows],
  );

  return (
    <div className="space-y-8">
      {error ? <ErrorState label={error} /> : null}

      <SectionCard
        title="Structured local log history"
        description="Rows are parsed into Timestamp, Source, Severity, Request, and message fields so local runtime behavior can be inspected without raw console noise."
      >
        <div className={`${mutedPanelClassName} mb-4 flex flex-wrap items-center gap-4 p-4`}>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            className={secondaryButtonClassName}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <label htmlFor="autoRefresh" className={`flex items-center gap-2 ${bodyTextClassName}`}>
            <CheckboxControl
              id="autoRefresh"
              checked={autoRefresh}
              aria-label="Auto-refresh logs every 3 seconds"
              onChange={() => setAutoRefresh((current) => !current)}
            />
            <span>Auto-refresh (3s)</span>
          </label>
          <span className={`ml-auto ${supportingTextClassName}`}>{logRows.length} rows</span>
        </div>

        {loading && logRows.length === 0 ? (
          <LoadingState label="Loading logs…" />
        ) : logRows.length === 0 ? (
          <div className="space-y-3">
            <EmptyState label="No logs available. The local runtime may not be running." />
            <div className={`${mutedPanelClassName} p-4`}>
              <p className={supportingTextClassName}>
                Refresh retains the structured parser so rows appear here as soon as proxy or
                llama-swap output is available again.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className={`min-w-full text-left ${bodyTextClassName}`}>
              <thead>
                <tr>
                  <th className={`pb-3 font-normal ${monoEyebrowClassName}`}>Time</th>
                  <th className={`pb-3 font-normal ${monoEyebrowClassName}`}>Source</th>
                  <th className={`pb-3 font-normal ${monoEyebrowClassName}`}>Level</th>
                  <th className={`pb-3 font-normal ${monoEyebrowClassName}`}>Message</th>
                  <th className={`pb-3 font-normal ${monoEyebrowClassName}`}>Request</th>
                </tr>
              </thead>
              <tbody>
                {logRows.map((row) => (
                  <tr key={row.key} className="border-t border-[var(--rm-border)] align-top">
                    <td className={`py-3 ${supportingTextClassName}`}>{row.timestamp ?? "—"}</td>
                    <td className={`py-3 ${supportingTextClassName}`}>{row.sourceClass}</td>
                    <td className="py-3">
                      {row.severity ? (
                        <Badge
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
                        </Badge>
                      ) : (
                        <span className="text-[var(--rm-muted)]">—</span>
                      )}
                    </td>
                    <td className={`py-3 ${supportingTextClassName}`}>{row.message}</td>
                    <td className={`py-3 ${supportingTextClassName}`}>{row.requestId ?? "—"}</td>
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
            <p className={`mb-2 ${compactTitleClassName}`}>Proxy log stream</p>
            {proxyRows.length === 0 ? (
              <EmptyState label="No proxy log lines are available yet." />
            ) : (
              <pre className={`max-h-80 overflow-auto whitespace-pre-wrap ${codeBlockClassName}`}>
                {proxyRows.map((row) => row.rawLine).join("\n")}
              </pre>
            )}
          </div>
          <div>
            <p className={`mb-2 ${compactTitleClassName}`}>Llama-swap log stream</p>
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
