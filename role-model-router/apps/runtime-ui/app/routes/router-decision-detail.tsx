import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";

import {
  Badge,
  CodeBlock,
  EmptyState,
  ErrorState,
  LoadingState,
  SectionCard,
} from "../components/page-primitives";
import { projectBenchmarkDecisionView } from "../lib/benchmark-decision-evidence";
import {
  readAliasPostureReceipt,
  readLatencyReceipt,
  readStrategyReceipt,
} from "../lib/decision-receipt";
import {
  bodyStrongTextClassName,
  cardClassName,
  fieldLabelClassName,
  foregroundEmphasisClassName,
  mutedPanelClassName,
  secondaryButtonClassName,
  supportingTextClassName,
} from "../lib/design-system";
import { formatEndpointDisplayPath, formatModelIdentity } from "../lib/effort-identity";
import {
  classifyEffortEvidence,
  formatEffectiveEffortDisclosure,
  formatEffortEvidenceLabel,
  formatEffortResolutionLabel,
  isProminentEffortResolution,
  readEffortResolutionKind,
} from "../lib/effort-truth";
import { type RouterDecisionDetail, fetchRouterDecisionDetail } from "../lib/runtime-api";

export default function RouterDecisionDetailRoute() {
  const { requestId = "" } = useParams();
  const [detail, setDetail] = useState<RouterDecisionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!requestId) {
      return;
    }

    let cancelled = false;
    setDetail(null);
    setError(null);

    void fetchRouterDecisionDetail(requestId)
      .then((value) => {
        if (cancelled) {
          return;
        }
        setDetail(value);
        setError(null);
      })
      .catch((value: unknown) => {
        if (cancelled) {
          return;
        }
        setError(value instanceof Error ? value.message : "Could not load router decision detail.");
      });

    return () => {
      cancelled = true;
    };
  }, [requestId]);

  if (error) {
    return <ErrorState label={error} />;
  }
  if (!detail) {
    return <LoadingState label="Loading routing decision detail…" />;
  }

  const benchmarkDecision = projectBenchmarkDecisionView(detail);
  const telemetryEvidence = detail.telemetryEvidence ?? null;
  const observePath = detail?.observeRequestPath ?? `/app/observe/requests/${requestId}`;
  // Run 103 R3/R7: the effective strategy, who chose it, and the latency-override outcome.
  const strategyReceipt = readStrategyReceipt(detail.routingDiagnostics);
  const latencyReceipt = readLatencyReceipt(detail.routingDiagnostics);
  const aliasPostureReceipt = readAliasPostureReceipt(detail.routingDiagnostics);
  const effortResolutionKind = readEffortResolutionKind(detail.routingDiagnostics);

  return (
    <div className="space-y-6">
      <SectionCard
        title="Routing decision detail"
        description="Keep the chosen endpoint, strategy, fallback order, and linked request context in one compact decision-inspector surface."
      >
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,372px)]">
          <div className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-2">
              <div className={`${mutedPanelClassName} space-y-2 p-4`}>
                <p className={fieldLabelClassName}>Request</p>
                <p className={`${bodyStrongTextClassName} break-all text-[var(--rm-fg)]`}>
                  {detail.requestId}
                </p>
                <p className={supportingTextClassName}>
                  Request id that anchors the Router decision record.
                </p>
              </div>
              <div className={`${mutedPanelClassName} space-y-2 p-4`}>
                <p className={fieldLabelClassName}>Decision</p>
                <p className={`${bodyStrongTextClassName} break-all text-[var(--rm-fg)]`}>
                  {detail.routingDecisionId ?? "n/a"}
                </p>
                <p className={supportingTextClassName}>
                  Persisted routing decision id when the runtime stored one.
                </p>
              </div>
            </div>

            <div className={`${mutedPanelClassName} p-4`}>
              <p className={foregroundEmphasisClassName}>Chosen endpoint</p>
              <p className={`mt-4 break-all ${bodyStrongTextClassName} text-[var(--rm-fg)]`}>
                {formatEndpointDisplayPath({
                  endpointId: detail.selectedEndpointId,
                  reasoningEffort: detail.reasoningEffort,
                })}
              </p>
              <p className={`mt-2 ${supportingTextClassName}`}>
                {formatModelIdentity({
                  id: detail.selectedModelId ?? "unknown model",
                  displayName: detail.displayName,
                  upstreamModelId: detail.upstreamModelId,
                  reasoningEffort: detail.reasoningEffort,
                })}
              </p>
              <p className={`mt-3 ${supportingTextClassName}`}>
                {formatEffectiveEffortDisclosure({
                  reasoningEffort: detail.reasoningEffort,
                  effortSource: detail.effortSource,
                })}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge tone="accent">
                  {strategyReceipt ? strategyReceipt.strategyLabel : "no strategy receipt"}
                </Badge>
                <Badge
                  tone={
                    effortResolutionKind && isProminentEffortResolution(effortResolutionKind)
                      ? "warning"
                      : "neutral"
                  }
                >
                  {effortResolutionKind
                    ? formatEffortResolutionLabel(effortResolutionKind)
                    : "no effort resolution recorded"}
                </Badge>
                <Badge tone="neutral">
                  {detail.fallbackEndpointIds.length} fallback
                  {detail.fallbackEndpointIds.length === 1 ? "" : "s"}
                </Badge>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className={`${mutedPanelClassName} p-4 text-[var(--rm-secondary)]`}>
              <p className={foregroundEmphasisClassName}>Linked request</p>
              <p className={`mt-3 ${supportingTextClassName}`}>
                Router promotes the linked request here, while Observe still owns the deeper trace
                workflow.
              </p>
              <div className="mt-4">
                <Link className={secondaryButtonClassName} to={observePath}>
                  Observe request detail
                </Link>
              </div>
            </div>

            <div className={`${mutedPanelClassName} p-4 text-[var(--rm-secondary)]`}>
              <p className={foregroundEmphasisClassName}>Benchmark provenance</p>
              {benchmarkDecision ? (
                <>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className={fieldLabelClassName}>Decision quality</p>
                      <p className={`mt-2 ${bodyStrongTextClassName} text-[var(--rm-fg)]`}>
                        {benchmarkDecision.scorePercent}%
                      </p>
                    </div>
                    <div>
                      <p className={fieldLabelClassName}>Benchmark overall</p>
                      <p className={`mt-2 ${bodyStrongTextClassName} text-[var(--rm-fg)]`}>
                        {benchmarkDecision.overallPercent}%
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 border-t border-[var(--rm-border)] pt-4">
                    <p className={fieldLabelClassName}>Decision-time run</p>
                    <p className={`mt-2 ${supportingTextClassName}`}>
                      {benchmarkDecision.runId ?? "profile-derived evidence"}
                      {benchmarkDecision.runMode ? ` · ${benchmarkDecision.runMode}` : ""}
                      {` · ${formatEffortEvidenceLabel(
                        classifyEffortEvidence({
                          evidenceSource: benchmarkDecision.evidenceSource,
                        }),
                      )}`}
                      {benchmarkDecision.reason ? ` · ${benchmarkDecision.reason}` : ""}
                    </p>
                    <p className={`mt-2 ${supportingTextClassName}`}>
                      {benchmarkDecision.measuredAtMs !== null
                        ? new Date(benchmarkDecision.measuredAtMs).toLocaleString()
                        : "No run timestamp recorded"}
                    </p>
                  </div>
                  <div className="mt-4">
                    <Link className={secondaryButtonClassName} to="/app/models/benchmark">
                      Models → Benchmark
                    </Link>
                  </div>
                </>
              ) : (
                <p className={`mt-3 ${supportingTextClassName}`}>
                  No benchmark evidence was recorded in this routing decision.
                </p>
              )}
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Strategy receipt"
        description="Run 103 R3: which scoring strategy ranked this decision, who chose it, and which weights the scorer used."
      >
        <div className="grid gap-4 xl:grid-cols-3">
          <div className={`${mutedPanelClassName} space-y-3 p-4`}>
            <p className={foregroundEmphasisClassName}>Effective strategy</p>
            {strategyReceipt ? (
              <dl className="grid gap-3">
                <div>
                  <dt className={fieldLabelClassName}>Strategy</dt>
                  <dd className={`mt-1 ${bodyStrongTextClassName}`}>
                    {strategyReceipt.strategyLabel}
                  </dd>
                </div>
                <div>
                  <dt className={fieldLabelClassName}>Source</dt>
                  <dd className={`mt-1 ${bodyStrongTextClassName}`}>
                    {strategyReceipt.sourceLabel}
                  </dd>
                </div>
                <div>
                  <dt className={fieldLabelClassName}>Weights digest</dt>
                  <dd className={`mt-1 break-all ${bodyStrongTextClassName}`}>
                    {strategyReceipt.weightsDigest ?? "preset weights (no digest)"}
                  </dd>
                </div>
                {strategyReceipt.discardedLabel ? (
                  <div>
                    <dt className={fieldLabelClassName}>Discarded directive</dt>
                    <dd className={`mt-1 ${supportingTextClassName}`}>
                      {strategyReceipt.discardedLabel}
                    </dd>
                  </div>
                ) : null}
                {strategyReceipt.weightsLabel ? (
                  <div>
                    <dt className={fieldLabelClassName}>Effective weights</dt>
                    <dd className={`mt-1 ${supportingTextClassName}`}>
                      {strategyReceipt.weightsLabel}
                    </dd>
                  </div>
                ) : null}
              </dl>
            ) : (
              <p className={`mt-2 ${supportingTextClassName}`}>
                This decision predates the run-103 strategy receipt, so the applied strategy was not
                recorded.
              </p>
            )}
          </div>

          <div className={`${mutedPanelClassName} space-y-3 p-4`}>
            <p className={foregroundEmphasisClassName}>Latency-override receipt</p>
            {latencyReceipt ? (
              <dl className="grid gap-3">
                <div>
                  <dt className={fieldLabelClassName}>Outcome</dt>
                  <dd className={`mt-1 ${bodyStrongTextClassName}`}>
                    {latencyReceipt.outcomeLabel}
                  </dd>
                </div>
                <div>
                  <dt className={fieldLabelClassName}>Chosen endpoint</dt>
                  <dd className={`mt-1 break-all ${bodyStrongTextClassName}`}>
                    {latencyReceipt.chosenEndpointId ?? "n/a"}
                  </dd>
                </div>
                <div>
                  <dt className={fieldLabelClassName}>Prompt-size bucket</dt>
                  <dd className={`mt-1 ${bodyStrongTextClassName}`}>
                    {latencyReceipt.bucketLabel}
                  </dd>
                </div>
                <div>
                  <dt className={fieldLabelClassName}>Candidates compared</dt>
                  <dd className={`mt-1 ${bodyStrongTextClassName}`}>
                    {String(latencyReceipt.candidateCount)}
                  </dd>
                </div>
                <div>
                  <dt className={fieldLabelClassName}>Reason</dt>
                  <dd className={`mt-1 ${supportingTextClassName}`}>
                    {latencyReceipt.reason ?? "no reason recorded"}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className={`mt-2 ${supportingTextClassName}`}>
                No measured-latency outcome was recorded for this decision.
              </p>
            )}
          </div>

          <div className={`${mutedPanelClassName} space-y-3 p-4`}>
            <p className={foregroundEmphasisClassName}>Alias posture binding</p>
            {aliasPostureReceipt ? (
              <dl className="grid gap-3">
                <div>
                  <dt className={fieldLabelClassName}>Alias</dt>
                  <dd className={`mt-1 break-all ${bodyStrongTextClassName}`}>
                    {aliasPostureReceipt.aliasId}
                  </dd>
                </div>
                <div>
                  <dt className={fieldLabelClassName}>Role</dt>
                  <dd className={`mt-1 ${bodyStrongTextClassName}`}>
                    {aliasPostureReceipt.roleLabel}
                  </dd>
                </div>
                <div>
                  <dt className={fieldLabelClassName}>Capabilities</dt>
                  <dd className={`mt-1 ${supportingTextClassName}`}>
                    {aliasPostureReceipt.capabilityLabel}
                  </dd>
                </div>
                <div>
                  <dt className={fieldLabelClassName}>Posture carried by the alias</dt>
                  <dd className={`mt-1 ${bodyStrongTextClassName}`}>
                    {`${aliasPostureReceipt.scoringStrategyLabel}${aliasPostureReceipt.preferLocal ? " · prefers local" : ""}`}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className={`mt-2 ${supportingTextClassName}`}>
                This decision did not inherit an agent-strategy or workload alias binding.
              </p>
            )}
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Live telemetry evidence at decision"
        description="This immutable decision-time projection is separate from benchmark evidence and from the endpoint's current operational profile."
      >
        {telemetryEvidence ? (
          <div className="grid gap-4 xl:grid-cols-2">
            <div className={`${mutedPanelClassName} p-4`}>
              <p className={foregroundEmphasisClassName}>Operational profile snapshot</p>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  ["Samples", telemetryEvidence.operationalProfile?.sampleCount],
                  ["Live p50", telemetryEvidence.operationalProfile?.latencyP50Ms],
                  ["Live p95", telemetryEvidence.operationalProfile?.latencyP95Ms],
                  ["Failure rate", telemetryEvidence.operationalProfile?.failureRate],
                ].map(([label, value]) => (
                  <div key={label as string}>
                    <dt className={fieldLabelClassName}>{label}</dt>
                    <dd className={`mt-1 ${bodyStrongTextClassName}`}>
                      {value === null || value === undefined ? "Not available" : String(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className={`${mutedPanelClassName} p-4`}>
              <p className={foregroundEmphasisClassName}>Task telemetry advisory</p>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  ["Available", telemetryEvidence.taskTelemetry.available],
                  ["Eligible", telemetryEvidence.taskTelemetry.eligible],
                  ["Applied", telemetryEvidence.taskTelemetry.applied],
                  ["Samples", telemetryEvidence.taskTelemetry.sampleCount],
                  ["Success rate", telemetryEvidence.taskTelemetry.successRate],
                  ["Withheld reason", telemetryEvidence.taskTelemetry.withheldReason],
                ].map(([label, value]) => (
                  <div key={label as string}>
                    <dt className={fieldLabelClassName}>{label}</dt>
                    <dd className={`mt-1 ${bodyStrongTextClassName}`}>
                      {value === null || value === undefined ? "Not available" : String(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        ) : (
          <EmptyState label="No live telemetry evidence was persisted for this decision." />
        )}
      </SectionCard>

      <SectionCard
        title="Fallback endpoints"
        description="Fallback order remains visible here so Router can explain the chosen endpoint in context."
      >
        {detail.fallbackEndpointIds.length === 0 ? (
          <EmptyState label="No fallback endpoints were recorded for this decision." />
        ) : (
          <div className="space-y-2">
            {detail.fallbackEndpointIds.map((endpointId, index) => (
              <div
                key={endpointId}
                className={`${cardClassName} flex items-center justify-between gap-3 px-4 py-3`}
              >
                <p className={bodyStrongTextClassName}>{endpointId}</p>
                <p className={supportingTextClassName}>
                  {`fallback ${String(index + 1).padStart(2, "0")}`}
                </p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard
          title="Decision bundle"
          description="Expose the raw persisted decision so scored candidates, exclusions, and tie-breaks remain auditable."
        >
          <CodeBlock>{JSON.stringify(detail.decision ?? {}, null, 2)}</CodeBlock>
        </SectionCard>
        <SectionCard
          title="Routing diagnostics"
          description="Keep the routing diagnostics adjacent to the decision so routing-mode, rewrite, difficulty, and controller details stay together."
        >
          <CodeBlock>{JSON.stringify(detail.routingDiagnostics ?? {}, null, 2)}</CodeBlock>
        </SectionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard
          title="Linked request"
          description="Router promotes the request detail payload here, but Observe still owns the deeper trace workflow."
        >
          <div className="mb-4">
            <Link className={secondaryButtonClassName} to={observePath}>
              Observe request detail
            </Link>
          </div>
          <CodeBlock>{JSON.stringify(detail.request, null, 2)}</CodeBlock>
        </SectionCard>
        <SectionCard
          title="Current operational profile"
          description="Current live-request posture is shown separately and may have changed since the immutable decision-time evidence above."
        >
          <CodeBlock>{JSON.stringify(detail.endpointProfile ?? {}, null, 2)}</CodeBlock>
        </SectionCard>
      </div>
    </div>
  );
}
