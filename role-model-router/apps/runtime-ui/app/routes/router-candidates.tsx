import { useEffect, useState } from "react";
import { Link } from "react-router";

import {
  EmptyState,
  ErrorState,
  FactCard,
  LoadingState,
  SectionCard,
  StatusPill,
} from "../components/page-primitives";
import { listRowClassName, secondaryButtonClassName } from "../lib/design-system";
import { formatCandidateLatencyLine } from "../lib/router-candidate-labels";
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

function formatScore(score: number | null | undefined): string {
  if (typeof score !== "number" || !Number.isFinite(score)) {
    return "n/a";
  }
  return `${Math.round(score * 100)}%`;
}

function formatStaleness(
  measuredAtMs: number | null | undefined,
  freshnessScore: number | null | undefined,
): string {
  if (typeof measuredAtMs !== "number") {
    return "staleness unknown";
  }
  const ageHours = Math.max(0, Math.round((Date.now() - measuredAtMs) / (60 * 60 * 1000)));
  const freshness =
    typeof freshnessScore === "number" ? `freshness ${Math.round(freshnessScore * 100)}%` : null;
  return freshness ? `${ageHours}h old • ${freshness}` : `${ageHours}h old`;
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

  if (error) {
    return <ErrorState label={error} />;
  }
  if (!candidates) {
    return <LoadingState label="Loading routing candidates…" />;
  }

  const localCount = candidates.filter((candidate) => candidate.sourceType === "local").length;
  const remoteCount = candidates.filter((candidate) => candidate.sourceType === "remote").length;
  const benchmarkedCount = candidates.filter((candidate) => candidate.benchmarkCapability).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <FactCard
          label="Candidates"
          value={candidates.length}
          detail={`${localCount} local / ${remoteCount} remote candidates currently visible.`}
          emphasis
        />
        <FactCard
          label="Benchmarked"
          value={benchmarkedCount}
          detail="Candidates with capability scores from Models → Benchmark."
        />
        <FactCard
          label="Ignored"
          value={candidates.filter((candidate) => candidate.ignored).length}
          detail="Candidates currently excluded by guidance even though they exist in the registry."
        />
      </div>

      <SectionCard
        title="Comparable inventory"
        description="Capability scores come from Models → Benchmark observed profiles. Latency, throughput, and failure rate remain live routing signals."
      >
        {candidates.length === 0 ? (
          <EmptyState label="No routing candidates are available yet." />
        ) : (
          <div className="space-y-3">
            {candidates.map((candidate) => {
              const latestProfile = asRecord(candidate.latestProfile);
              const throughput = pickNumber(latestProfile, "tokens_per_second", "tokensPerSecond");
              const failureRate = pickNumber(latestProfile, "failure_rate", "failureRate");
              const capability = candidate.benchmarkCapability;

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
                      {formatCandidateLatencyLine(latestProfile)} • Throughput {throughput ?? "n/a"}{" "}
                      tps • Failure rate {failureRate ?? "n/a"}
                    </p>
                    {capability ? (
                      <p className="text-sm text-[var(--rm-secondary)]">
                        Capability {formatScore(capability.overallScore)}
                        {capability.scoresByBucket?.medium
                          ? ` • medium ${formatScore(capability.scoresByBucket.medium.score)}`
                          : ""}
                        {capability.scoresByBucket?.hard
                          ? ` • hard ${formatScore(capability.scoresByBucket.hard.score)}`
                          : ""}
                        {" • "}
                        {capability.benchmarkSamples} benchmark sample
                        {capability.benchmarkSamples === 1 ? "" : "s"}
                        {" • "}
                        {formatStaleness(capability.measuredAtMs, capability.freshnessScore)}
                      </p>
                    ) : (
                      <p className="text-sm text-[var(--rm-secondary)]">
                        Capability n/a — no benchmark observations yet.
                      </p>
                    )}
                    <Link to="/app/models/benchmark" className={secondaryButtonClassName}>
                      View in Models → Benchmark
                    </Link>
                  </div>
                  <div className="flex flex-wrap items-start justify-end gap-2">
                    <StatusPill tone={candidate.controllerEligible ? "accent" : "neutral"}>
                      {candidate.controllerEligible
                        ? "controller"
                        : (candidate.healthStatus ?? "unknown")}
                    </StatusPill>
                    {capability ? (
                      <StatusPill tone="success">{formatScore(capability.overallScore)}</StatusPill>
                    ) : null}
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
