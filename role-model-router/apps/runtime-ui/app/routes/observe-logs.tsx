import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { MetricStrip, SegmentedControl } from "@role-model/ui";

import {
  EmptyState,
  ErrorState,
  LoadingState,
  SectionCard,
  StatusPill,
} from "../components/page-primitives";
import {
  accentActionTextClassName,
  metaTextClassName,
  supportingTextClassName,
  utilityLabelClassName,
} from "../lib/design-system";
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
      <MetricStrip
        variant="panel"
        items={[
          {
            id: "structured-log-history",
            label: "Structured log history",
            value: String(filteredRows.length),
          },
          {
            id: "sources",
            label: "Sources",
            value: String(sourceCount),
          },
          {
            id: "correlated-requests",
            label: "Correlated requests",
            value: String(correlatedCount),
          },
        ]}
      />

      <div className="space-y-2">
        <p className={utilityLabelClassName}>Source filter</p>
        <SegmentedControl
          aria-label="Log source filter"
          value={sourceFilter}
          onChange={setSourceFilter}
          options={sourceOptions.map((option) => ({
            value: option,
            label: option === "all" ? "All sources" : option,
          }))}
        />
      </div>

      <SectionCard
        title="Structured log history"
        description="Rows are parsed into Timestamp, Source, Severity, Request, and message fields so they can be scanned without leaving the shell."
      >
        {filteredRows.length === 0 ? (
          <EmptyState label="No logs recorded yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className={metaTextClassName}>
                <tr>
                  <th className="pb-3 font-normal">Timestamp</th>
                  <th className="pb-3 font-normal">Source</th>
                  <th className="pb-3 font-normal">Severity</th>
                  <th className="pb-3 font-normal">Request</th>
                  <th className="pb-3 font-normal">Entry</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.key} className="border-t border-[var(--rm-border)] align-top">
                    <td className={`py-3 ${supportingTextClassName}`}>{row.timestamp ?? "—"}</td>
                    <td className={`py-3 ${supportingTextClassName}`}>{row.sourceClass}</td>
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
                    <td className={`py-3 ${supportingTextClassName}`}>
                      {row.requestId ? (
                        <Link
                          className={accentActionTextClassName}
                          to={`/app/observe/requests/${row.requestId}`}
                        >
                          {row.requestId}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className={`py-3 ${supportingTextClassName}`}>{row.message}</td>
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
    </div>
  );
}
