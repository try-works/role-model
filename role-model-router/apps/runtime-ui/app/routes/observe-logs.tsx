import { MetricStrip, SegmentedControl } from "@role-model/ui";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";

import {
  Badge,
  EmptyState,
  ErrorState,
  LoadingState,
  SectionCard,
} from "../components/page-primitives";
import {
  accentActionTextClassName,
  monoEyebrowClassName,
  supportingTextClassName,
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
            label: "Structured rows",
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

      <div className="flex flex-col gap-1.5">
        <p className="font-sans text-[13px] font-semibold leading-[18px] text-foreground">
          Source filter
        </p>
        <SegmentedControl
          aria-label="Log source filter"
          value={sourceFilter}
          onChange={setSourceFilter}
          size="md"
          options={sourceOptions.map((option) => ({
            value: option,
            label: option === "all" ? "All sources" : option,
          }))}
        />
      </div>

      <SectionCard
        title="Structured log rows"
        description="Rows are parsed into Time, Source, Level, Message, and Request fields so they can be scanned without leaving the shell."
      >
        {filteredRows.length === 0 ? (
          <EmptyState label="No logs recorded yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
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
                {filteredRows.map((row) => (
                  <tr key={row.key} className="border-t border-[var(--rm-border)] align-top">
                    <td
                      className={`py-3 font-mono text-[12px] tabular-nums ${supportingTextClassName}`}
                    >
                      {row.timestamp ?? "—"}
                    </td>
                    <td className="py-3 font-mono text-[12px] text-[var(--rm-fg)]">
                      {row.sourceClass}
                    </td>
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
                    <td className="py-3 text-[13px] text-[var(--rm-fg)]">{row.message}</td>
                    <td className={`py-3 font-mono text-[12px] ${supportingTextClassName}`}>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Raw lines">
        {filteredRows.length === 0 ? (
          <EmptyState label="No raw lines match the current source filter." />
        ) : (
          <pre className="max-h-[280px] overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-4 text-[var(--rm-fg)]">
            {filteredRows.map((row) => row.rawLine).join("\n")}
          </pre>
        )}
      </SectionCard>
    </div>
  );
}
