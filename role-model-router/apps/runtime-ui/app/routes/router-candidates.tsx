import { MetricStrip } from "@role-model/ui";
import { useEffect, useState } from "react";

import {
  Badge,
  EmptyState,
  ErrorState,
  LoadingState,
  SectionCard,
} from "../components/page-primitives";
import { bodyStrongTextClassName, cardClassName } from "../lib/design-system";
import { formatEndpointDisplayPath, formatModelIdentity } from "../lib/effort-identity";
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

function formatLatencyP50(profile: Record<string, unknown> | null | undefined): string {
  const latencyP50 = pickNumber(asRecord(profile), "latency_ms_p50", "latencyMsP50");
  return latencyP50 === null ? "n/a" : `${Math.round(latencyP50)}ms`;
}

function formatFailureRate(profile: Record<string, unknown> | null | undefined): string {
  const failureRate = pickNumber(asRecord(profile), "failure_rate", "failureRate");
  return failureRate === null ? "n/a" : String(failureRate);
}

function summarizeRoleCoverage(roleIds: readonly string[] | undefined): string {
  if (!roleIds || roleIds.length === 0) {
    return "—";
  }
  const visibleRoles = roleIds.slice(0, 4);
  const remainingCount = Math.max(roleIds.length - visibleRoles.length, 0);
  return remainingCount > 0
    ? `${visibleRoles.join(", ")}, +${remainingCount} more`
    : visibleRoles.join(", ");
}

function candidateStatusLabel(candidate: RouterCandidate): string {
  if (candidate.controllerEligible) {
    return "controller";
  }
  if (candidate.ignored) {
    return "ignored";
  }
  if (candidate.preferred) {
    return "preferred";
  }
  return candidate.healthStatus ?? "unknown";
}

function candidateStatusTone(
  candidate: RouterCandidate,
): "accent" | "success" | "warning" | "neutral" {
  if (candidate.controllerEligible) {
    return "accent";
  }
  if (candidate.ignored) {
    return "warning";
  }
  if (candidate.healthStatus === "healthy") {
    return "success";
  }
  return "neutral";
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

  return (
    <div className="space-y-6">
      <SectionCard
        title="Candidate inventory"
        description="Capability scores come from Models → Benchmark. Latency, throughput, and failure rate remain live routing signals."
      >
        {candidates.length === 0 ? (
          <EmptyState label="No routing candidates are available yet." />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {candidates.map((candidate) => {
              const capability = candidate.benchmarkCapability;
              const sourceLabel = [
                candidate.sourceType ?? "unknown",
                candidate.servingSource ?? candidate.endpointKind ?? null,
              ]
                .filter(Boolean)
                .join(" · ");

              return (
                <div key={candidate.endpointId} className={`${cardClassName} space-y-4 p-4`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div
                      className={`min-w-0 ${
                        candidate.controllerEligible
                          ? "border-l-2 border-[var(--rm-accent)] pl-3"
                          : "border-l-2 border-transparent pl-3"
                      }`}
                    >
                      <p className={bodyStrongTextClassName}>{formatModelIdentity(candidate)}</p>
                    </div>
                    <Badge tone={candidateStatusTone(candidate)}>
                      {candidateStatusLabel(candidate)}
                    </Badge>
                  </div>

                  <MetricStrip
                    aria-label={`${formatModelIdentity(candidate)} routing candidate`}
                    variant="inventory"
                    className="max-w-none"
                    items={[
                      {
                        id: "endpoint",
                        label: "Endpoint",
                        value: formatEndpointDisplayPath(candidate),
                      },
                      { id: "source", label: "Source", value: sourceLabel },
                      {
                        id: "cap",
                        label: "Cap",
                        value: formatScore(capability?.overallScore),
                      },
                      {
                        id: "p50",
                        label: "p50",
                        value: formatLatencyP50(candidate.latestProfile),
                      },
                      {
                        id: "fail",
                        label: "Fail",
                        value: formatFailureRate(candidate.latestProfile),
                      },
                      {
                        id: "roles",
                        label: "Roles",
                        value: summarizeRoleCoverage(candidate.roleBindings),
                      },
                      {
                        id: "tooling",
                        label: "Tooling",
                        value: candidate.toolCallingSupported
                          ? (candidate.toolCallingStyle ?? "tools")
                          : "none",
                      },
                    ]}
                  />
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
