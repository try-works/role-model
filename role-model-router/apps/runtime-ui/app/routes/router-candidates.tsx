import { useEffect, useState } from "react";

import {
  EmptyState,
  ErrorState,
  FactCard,
  LoadingState,
  PageHeader,
  SectionCard,
  StatusPill,
} from "../components/page-primitives";
import { listRowClassName } from "../lib/design-system";
import { type RouterCandidate, fetchRouterCandidates } from "../lib/runtime-api";

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function pickNumber(record: Record<string, unknown> | null, ...keys: string[]): number | null {
  for (const key of keys) {
    const value = record?.[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }
  return null;
}

export default function RouterCandidatesRoute() {
  const [candidates, setCandidates] = useState<readonly RouterCandidate[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchRouterCandidates()
      .then((value) => {
        setCandidates(value);
        setError(null);
      })
      .catch((value: unknown) =>
        setError(value instanceof Error ? value.message : "Could not load router candidates."),
      );
  }, []);

  const header = (
    <PageHeader
      eyebrow="Router"
      title="Candidate inventory"
      description="Compare local and remote routing candidates in one place, including controller posture, role coverage, and observed signals when available."
    />
  );

  if (error) {
    return (
      <div className="space-y-6">
        {header}
        <ErrorState label={error} />
      </div>
    );
  }
  if (!candidates) {
    return (
      <div className="space-y-6">
        {header}
        <LoadingState label="Loading routing candidates…" />
      </div>
    );
  }

  const localCount = candidates.filter((candidate) => candidate.sourceType === "local").length;
  const remoteCount = candidates.filter((candidate) => candidate.sourceType === "remote").length;

  return (
    <div className="space-y-6">
      {header}

      <div className="grid gap-4 md:grid-cols-3">
        <FactCard
          label="Candidates"
          value={candidates.length}
          detail={`${localCount} local / ${remoteCount} remote candidates currently visible.`}
          emphasis
        />
        <FactCard
          label="Preferred"
          value={candidates.filter((candidate) => candidate.preferred).length}
          detail="Candidates currently favored by routing-model guidance."
        />
        <FactCard
          label="Ignored"
          value={candidates.filter((candidate) => candidate.ignored).length}
          detail="Candidates currently excluded by guidance even though they exist in the registry."
        />
      </div>

      <SectionCard
        title="Comparable inventory"
        description="Keep candidate comparison unified so local and remote routing remain visible under one reading model."
      >
        {candidates.length === 0 ? (
          <EmptyState label="No routing candidates are available yet." />
        ) : (
          <div className="space-y-3">
            {candidates.map((candidate) => {
              const latestProfile = asRecord(candidate.latestProfile);
              const latencyMs = pickNumber(latestProfile, "latency_ms", "latencyMs");
              const throughput = pickNumber(latestProfile, "tokens_per_second", "tokensPerSecond");
              const failureRate = pickNumber(latestProfile, "failure_rate", "failureRate");

              return (
                <div key={candidate.endpointId} className={listRowClassName}>
                  <div className="space-y-2">
                    <p className="font-medium text-[var(--rm-fg)]">{candidate.endpointId}</p>
                    <p className="text-sm text-[var(--rm-secondary)]">{candidate.modelId}</p>
                    <p className="text-sm text-[var(--rm-secondary)]">
                      {candidate.sourceType} • {candidate.endpointKind ?? "unknown kind"} •{" "}
                      {candidate.servingSource ?? "unknown source"}
                    </p>
                    <p className="text-sm text-[var(--rm-secondary)]">
                      Roles: {candidate.roleBindings?.join(", ") || "none"} • Tools:{" "}
                      {candidate.toolCallingSupported ? "supported" : "not advertised"}
                    </p>
                    <p className="text-sm text-[var(--rm-secondary)]">
                      Latency {latencyMs ?? "n/a"} ms • Throughput {throughput ?? "n/a"} tps •
                      Failure rate {failureRate ?? "n/a"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-start justify-end gap-2">
                    <StatusPill tone={candidate.controllerEligible ? "accent" : "neutral"}>
                      {candidate.controllerEligible
                        ? "controller"
                        : (candidate.healthStatus ?? "unknown")}
                    </StatusPill>
                    {candidate.preferred ? <StatusPill tone="success">preferred</StatusPill> : null}
                    {candidate.ignored ? <StatusPill tone="warning">ignored</StatusPill> : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
