import { useEffect, useMemo, useState } from "react";

import {
  EmptyState,
  ErrorState,
  FactCard,
  LoadingState,
  PageHeader,
  SectionCard,
  StatusPill,
} from "../components/page-primitives";
import { secondaryButtonClassName } from "../lib/design-system";
import { fetchTextLogs } from "../lib/runtime-api";
import { buildStructuredLogRows } from "../lib/view-models";

export default function ObserveLogsRoute() {
  const [combinedLogs, setCombinedLogs] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<string>("all");

  useEffect(() => {
    void fetchTextLogs("/logs")
      .then(setCombinedLogs)
      .catch((value: unknown) =>
        setError(value instanceof Error ? value.message : "Could not load preserved logs."),
      );
  }, []);

  const rows = useMemo(
    () => buildStructuredLogRows(combinedLogs ?? "", "combined"),
    [combinedLogs],
  );
  const sourceOptions = useMemo(
    () => ["all", ...new Set(rows.map((row) => row.sourceClass).filter(Boolean))],
    [rows],
  );
  const filteredRows = useMemo(
    () => (sourceFilter === "all" ? rows : rows.filter((row) => row.sourceClass === sourceFilter)),
    [rows, sourceFilter],
  );
  const correlatedCount = rows.filter((row) => row.requestId).length;
  const sourceCount = new Set(rows.map((row) => row.sourceClass)).size;

  if (error) {
    return <ErrorState label={error} />;
  }
  if (combinedLogs === null) {
    return <LoadingState label="Loading preserved logs…" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Observe"
        title="Logs"
        description="Structured log history keeps request correlation readable while raw stream endpoints remain available for tailing."
        actions={
          <>
            <a className={secondaryButtonClassName} href="/logs">
              Combined log
            </a>
            <a className={secondaryButtonClassName} href="/logs/stream/proxy">
              Proxy stream
            </a>
            <a className={secondaryButtonClassName} href="/logs/stream/upstream">
              Upstream stream
            </a>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <FactCard
          label="Structured log history"
          value={String(filteredRows.length)}
          detail={`Parsed rows currently visible from the combined host log${sourceFilter === "all" ? "." : ` for source ${sourceFilter}.`}`}
          emphasis
        />
        <FactCard
          label="Sources"
          value={String(sourceCount)}
          detail="Distinct source labels detected in the combined log."
        />
        <FactCard
          label="Correlated requests"
          value={String(correlatedCount)}
          detail="Rows that include a request identifier you can match to Observe receipts."
        />
      </div>

      <SectionCard
        title="Source filter"
        description="Filter preserved-host log lines by source class before drilling into raw lines or correlated request entries."
      >
        <div className="flex flex-wrap gap-3">
          {sourceOptions.map((option) => {
            const active = sourceFilter === option;
            return (
              <button
                key={option}
                type="button"
                className={secondaryButtonClassName}
                aria-pressed={active}
                onClick={() => setSourceFilter(option)}
              >
                {option === "all" ? "All sources" : option}
              </button>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard
        title="Structured log history"
        description="Rows are parsed into Timestamp, Source, Severity, Request, and message fields so they can be scanned without leaving the shell."
      >
        {filteredRows.length === 0 ? (
          <EmptyState label="No logs recorded yet." />
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
                {filteredRows.map((row) => (
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
        title="Raw lines"
        description="Preserved-host output stays visible as raw lines so operators can compare the filtered ledger against the original capture."
      >
        {filteredRows.length === 0 ? (
          <EmptyState label="No raw lines match the current source filter." />
        ) : (
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap border border-[var(--rm-border)] bg-[var(--rm-panel)] p-4 font-mono text-xs text-[var(--rm-secondary)]">
            {filteredRows.map((row) => row.rawLine).join("\n")}
          </pre>
        )}
      </SectionCard>

      <SectionCard
        title="Raw stream endpoints"
        description="Use the preserved raw stream endpoints when you need unparsed tail output for proxy or upstream processes."
      >
        <div className="flex flex-wrap gap-3">
          <a className={secondaryButtonClassName} href="/logs/stream/proxy">
            Open raw proxy stream
          </a>
          <a className={secondaryButtonClassName} href="/logs/stream/upstream">
            Open raw upstream stream
          </a>
        </div>
      </SectionCard>
    </div>
  );
}
