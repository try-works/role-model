import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";

import {
  EmptyState,
  ErrorState,
  LoadingState,
  SectionCard,
  StatusPill,
} from "../components/page-primitives";
import {
  bodyStrongTextClassName,
  cardClassName,
  foregroundEmphasisClassName,
  mutedPanelClassName,
  secondaryButtonClassName,
  supportingTextClassName,
  utilityLabelClassName,
} from "../lib/design-system";
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

function summarizeRoleCoverage(roleIds: readonly string[] | undefined): {
  readonly countLabel: string;
  readonly preview: string;
} {
  if (!roleIds || roleIds.length === 0) {
    return {
      countLabel: "No roles",
      preview: "No runtime role bindings are currently advertised for this candidate.",
    };
  }
  const visibleRoles = roleIds.slice(0, 4);
  const remainingCount = Math.max(roleIds.length - visibleRoles.length, 0);
  return {
    countLabel: `${roleIds.length} role${roleIds.length === 1 ? "" : "s"}`,
    preview:
      remainingCount > 0
        ? `${visibleRoles.join(", ")}, +${remainingCount} more`
        : visibleRoles.join(", "),
  };
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

  const availableCandidates = candidates ?? [];
  const candidatePosture = useMemo(() => {
    return availableCandidates.reduce(
      (summary, candidate) => {
        summary.localCount += candidate.sourceType === "local" ? 1 : 0;
        summary.remoteCount += candidate.sourceType === "remote" ? 1 : 0;
        summary.benchmarkedCount += candidate.benchmarkCapability ? 1 : 0;
        summary.ignoredCount += candidate.ignored ? 1 : 0;
        return summary;
      },
      {
        benchmarkedCount: 0,
        ignoredCount: 0,
        localCount: 0,
        remoteCount: 0,
      },
    );
  }, [availableCandidates]);

  if (error) {
    return <ErrorState label={error} />;
  }
  if (!candidates) {
    return <LoadingState label="Loading routing candidates…" />;
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title="Candidate inventory"
        description="Capability scores come from Models → Benchmark observed profiles. Latency, throughput, and failure rate remain live routing signals."
      >
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,372px)]">
          <div className="space-y-3">
            {availableCandidates.length === 0 ? (
              <EmptyState label="No routing candidates are available yet." />
            ) : (
              availableCandidates.map((candidate) => {
                const latestProfile = asRecord(candidate.latestProfile);
                const throughput = pickNumber(
                  latestProfile,
                  "tokens_per_second",
                  "tokensPerSecond",
                );
                const failureRate = pickNumber(latestProfile, "failure_rate", "failureRate");
                const capability = candidate.benchmarkCapability;
                const roleCoverage = summarizeRoleCoverage(candidate.roleBindings);

                return (
                  <div key={candidate.endpointId} className={`${cardClassName} p-4`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className={utilityLabelClassName}>{candidate.sourceType ?? "unknown"}</p>
                        <p className={`mt-2 break-all ${foregroundEmphasisClassName}`}>
                          {candidate.endpointId}
                        </p>
                        <p className={`mt-2 ${supportingTextClassName}`}>
                          {candidate.modelId}
                        </p>
                        <p className={`mt-2 ${supportingTextClassName}`}>
                          {candidate.endpointKind ?? "unknown kind"} •{" "}
                          {candidate.servingSource ?? "unknown source"}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-start justify-end gap-2">
                        <StatusPill tone={candidate.controllerEligible ? "accent" : "neutral"}>
                          {candidate.controllerEligible
                            ? "controller"
                            : (candidate.healthStatus ?? "unknown")}
                        </StatusPill>
                        {capability ? (
                          <StatusPill tone="success">
                            {formatScore(capability.overallScore)}
                          </StatusPill>
                        ) : null}
                        {candidate.preferred ? (
                          <StatusPill tone="success">preferred</StatusPill>
                        ) : null}
                        {candidate.ignored ? <StatusPill tone="warning">ignored</StatusPill> : null}
                        <StatusPill tone="neutral">{roleCoverage.countLabel}</StatusPill>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className={utilityLabelClassName}>Role coverage</p>
                        <p className={`mt-2 ${supportingTextClassName}`}>
                          {roleCoverage.preview}
                        </p>
                      </div>
                      <div>
                        <p className={utilityLabelClassName}>Tooling posture</p>
                        <p className={`mt-2 ${supportingTextClassName}`}>
                          {candidate.toolCallingSupported
                            ? `supported${candidate.toolCallingStyle ? ` • ${candidate.toolCallingStyle}` : ""}`
                            : "not advertised"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className={utilityLabelClassName}>Observed routing signals</p>
                        <p className={`mt-2 ${supportingTextClassName}`}>
                          {formatCandidateLatencyLine(latestProfile)} • Throughput{" "}
                          {throughput ?? "n/a"} tps
                        </p>
                        <p className={`mt-1 ${supportingTextClassName}`}>
                          Failure rate {failureRate ?? "n/a"}
                        </p>
                      </div>
                      <div>
                        <p className={utilityLabelClassName}>Benchmark posture</p>
                        {capability ? (
                          <>
                            <p className={`mt-2 ${supportingTextClassName}`}>
                              Capability {formatScore(capability.overallScore)}
                              {capability.scoresByBucket?.medium
                                ? ` • medium ${formatScore(capability.scoresByBucket.medium.score)}`
                                : ""}
                              {capability.scoresByBucket?.hard
                                ? ` • hard ${formatScore(capability.scoresByBucket.hard.score)}`
                                : ""}
                            </p>
                            <p className={`mt-1 ${supportingTextClassName}`}>
                              {capability.benchmarkSamples} benchmark sample
                              {capability.benchmarkSamples === 1 ? "" : "s"} •{" "}
                              {formatStaleness(
                                capability.measuredAtMs,
                                capability.freshnessScore,
                              )}
                            </p>
                          </>
                        ) : (
                          <p className={`mt-2 ${supportingTextClassName}`}>
                            Capability n/a — no benchmark observations yet.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-5">
                      <Link to="/app/models/benchmark" className={secondaryButtonClassName}>
                        View in Models → Benchmark
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="space-y-3">
            <div className={`${mutedPanelClassName} p-4 text-[var(--rm-secondary)]`}>
              <p className={foregroundEmphasisClassName}>Candidate posture</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className={utilityLabelClassName}>Available</p>
                  <p className={`mt-2 ${bodyStrongTextClassName} text-[var(--rm-fg)]`}>
                    {availableCandidates.length}
                  </p>
                </div>
                <div>
                  <p className={utilityLabelClassName}>Benchmarked</p>
                  <p className={`mt-2 ${bodyStrongTextClassName} text-[var(--rm-fg)]`}>
                    {candidatePosture.benchmarkedCount}
                  </p>
                </div>
                <div>
                  <p className={utilityLabelClassName}>Local / Remote</p>
                  <p className={`mt-2 ${bodyStrongTextClassName} text-[var(--rm-fg)]`}>
                    {candidatePosture.localCount} / {candidatePosture.remoteCount}
                  </p>
                </div>
                <div>
                  <p className={utilityLabelClassName}>Ignored</p>
                  <p className={`mt-2 ${bodyStrongTextClassName} text-[var(--rm-fg)]`}>
                    {candidatePosture.ignoredCount}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
