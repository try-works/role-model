import { useEffect, useState } from "react";

import { ErrorState, LoadingState, PageHeader, SectionCard, StatusPill } from "../components/page-primitives";
import { codeBlockClassName, mutedPanelClassName, secondaryButtonClassName } from "../lib/design-system";
import {
  fetchDownstreamOpenAIProviderConfig,
  fetchRuntimeSnapshot,
  type RuntimeDownstreamOpenAIProviderConfig,
  type RuntimeSnapshot,
} from "../lib/runtime-api";
import { buildDownstreamProviderGuide } from "../lib/view-models";

export default function RuntimeRoute() {
  const [snapshot, setSnapshot] = useState<RuntimeSnapshot | null>(null);
  const [downstreamProvider, setDownstreamProvider] = useState<RuntimeDownstreamOpenAIProviderConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([fetchRuntimeSnapshot(), fetchDownstreamOpenAIProviderConfig()])
      .then(([nextSnapshot, nextProvider]) => {
        setSnapshot(nextSnapshot);
        setDownstreamProvider(nextProvider);
      })
      .catch((value: unknown) => setError(value instanceof Error ? value.message : "Could not load runtime summary."));
  }, []);

  if (error) {
    return <ErrorState label={error} />;
  }
  if (!snapshot || !downstreamProvider) {
    return <LoadingState label="Loading runtime summary…" />;
  }

  const guide = buildDownstreamProviderGuide(downstreamProvider);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Runtime"
        title="Bridge and host summary"
        description="Runtime summary counts plus preserved host-owned diagnostics that still live outside the repo-owned shell."
        actions={
          <a className={secondaryButtonClassName} href="/api/role-model/downstream/openai">
            Downstream provider JSON
          </a>
        }
      />

      <SectionCard title="Lifecycle summary" description="Current endpoint lifecycle groups from the runtime control plane.">
        <div className="flex flex-wrap gap-3">
          <StatusPill tone="success">Active {snapshot.summary.lifecycleSummary?.active ?? 0}</StatusPill>
          <StatusPill tone="warning">Degraded {snapshot.summary.lifecycleSummary?.degraded ?? 0}</StatusPill>
          <StatusPill tone="neutral">Offline {snapshot.summary.lifecycleSummary?.offline ?? 0}</StatusPill>
        </div>
      </SectionCard>

      <SectionCard title="Preserved host surfaces" description="These stay operator-adjacent and are intentionally not hidden by the new app shell.">
        <div className="grid gap-3 md:grid-cols-2">
          <a className={`${mutedPanelClassName} p-4 text-sm text-[var(--rm-secondary)]`} href="/logs">
            <span className="block font-medium text-[var(--rm-fg)]">/logs</span>
            Raw host log output
          </a>
          <a className={`${mutedPanelClassName} p-4 text-sm text-[var(--rm-secondary)]`} href="/api/metrics">
            <span className="block font-medium text-[var(--rm-fg)]">/api/metrics</span>
            Vendor metrics and capture ids
          </a>
          <a className={`${mutedPanelClassName} p-4 text-sm text-[var(--rm-secondary)]`} href="/ui">
            <span className="block font-medium text-[var(--rm-fg)]">/ui</span>
            Preserved vendored llama-swap operator UI
          </a>
          <a className={`${mutedPanelClassName} p-4 text-sm text-[var(--rm-secondary)]`} href="/api/role-model/runtime/summary">
            <span className="block font-medium text-[var(--rm-fg)]">/api/role-model/runtime/summary</span>
            Repo-owned structured runtime summary JSON
          </a>
        </div>
      </SectionCard>

      <SectionCard
        title="Use Role Model as a provider"
        description="Downstream apps such as opencode can point at this runtime as an OpenAI-compatible provider using the contract published by the host bridge."
        >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {guide.connectionRows.map((row) => (
            <div key={row.label} className={`${mutedPanelClassName} p-4`}>
              <p className="text-xs font-normal uppercase tracking-[0.2em] text-[var(--rm-muted)]">{row.label}</p>
              <p className="mt-2 break-all font-mono text-sm text-[var(--rm-fg)]">{row.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <div className={`${mutedPanelClassName} p-4`}>
            <p className="font-medium text-[var(--rm-fg)]">Downstream setup</p>
            <ol className="mt-3 space-y-2 text-sm text-[var(--rm-secondary)]">
              {guide.opencodeSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <p className="mt-4 text-sm text-[var(--rm-secondary)]">{downstreamProvider.authentication.note}</p>
          </div>

          <div className="space-y-4">
            <div className={`${mutedPanelClassName} p-4`}>
              <p className="font-medium text-[var(--rm-fg)]">Available models</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {guide.availableModels.map((modelId) => (
                  <StatusPill key={modelId} tone={modelId === downstreamProvider.setup.recommendedModel ? "accent" : "neutral"}>
                    {modelId}
                  </StatusPill>
                ))}
              </div>
            </div>

            <div className={`${mutedPanelClassName} p-4`}>
              <p className="font-medium text-[var(--rm-fg)]">Example commands</p>
              <pre className={`mt-3 ${codeBlockClassName}`}>
                {guide.examples.modelsCurl}
              </pre>
              <pre className={`mt-3 ${codeBlockClassName}`}>
                {guide.examples.chatCurl}
              </pre>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
