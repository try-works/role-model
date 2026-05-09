import { useEffect, useMemo, useState } from "react";

import { EmptyState, ErrorState, FactCard, LoadingState, PageHeader, SectionCard, StatusPill } from "../components/page-primitives";
import { codeBlockClassName, mutedPanelClassName } from "../lib/design-system";
import { fetchRuntimeSnapshot, type RuntimeSnapshot } from "../lib/runtime-api";
import { buildProviderCards } from "../lib/view-models";

export default function IntegrationsUpstreamRoute() {
  const [snapshot, setSnapshot] = useState<RuntimeSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchRuntimeSnapshot()
      .then(setSnapshot)
      .catch((value: unknown) => setError(value instanceof Error ? value.message : "Could not load upstream integration details."));
  }, []);

  const providerCards = useMemo(
    () => (snapshot ? buildProviderCards(snapshot.providers, snapshot.accounts).filter((p) => p.accountCount > 0) : []),
    [snapshot],
  );

  const modelTargets =
    snapshot?.models.map((model) => ({
      modelId: model.id,
      owner: model.owned_by ?? "role-model",
      endpointCount: model.endpoint_ids?.length ?? 0,
      upstreamHref: `/upstream/${model.id}/`,
    })) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Integrations"
        title="Upstream providers"
        description="Keep upstream passthrough boundaries, provider/account posture, and model-specific raw doorways in one repo-owned integration surface."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <FactCard label="Providers" value={snapshot?.providers.length ?? 0} detail="Provider and account posture stays visible here without duplicating the editable Control pages." emphasis />
        <FactCard label="Accounts" value={snapshot?.accounts.length ?? 0} detail="Configured provider accounts that feed current upstream model access." />
        <FactCard label="Upstream targets" value={modelTargets.length} detail="Each target keeps a contextual `/upstream/<model>/` doorway instead of a global legacy-ui link." />
      </div>

      {error ? <ErrorState label={error} /> : null}

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard title="Provider accounts in scope" description="Read auth and provider posture here, then move to raw passthrough only when needed.">
          {!snapshot ? (
            <LoadingState label="Loading upstream provider posture…" />
          ) : providerCards.length === 0 ? (
            <EmptyState label="No configured provider accounts are available yet." />
          ) : (
            <div className="space-y-4">
              {providerCards.map((provider) => (
                <div key={provider.providerId} className={`${mutedPanelClassName} p-4`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-[var(--rm-fg)]">{provider.title}</p>
                    <StatusPill tone={provider.accountCount > 0 ? "accent" : "warning"}>{provider.accountCount} account{provider.accountCount === 1 ? "" : "s"}</StatusPill>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {provider.variants.length === 0 ? (
                      <StatusPill tone="warning">No variants</StatusPill>
                    ) : (
                      provider.variants.map((variant) => (
                        <StatusPill key={variant.variantId} tone="neutral">
                          {variant.label}
                        </StatusPill>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Upstream target inventory" description="Model-specific passthrough links remain contextual to the integration page instead of living in the global shell chrome.">
          {!snapshot ? (
            <LoadingState label="Loading upstream targets…" />
          ) : modelTargets.length === 0 ? (
            <EmptyState label="No upstream-capable models are currently exposed through the runtime model list." />
          ) : (
            <div className="space-y-3">
              {modelTargets.map((target) => (
                <a key={target.modelId} className={`${mutedPanelClassName} block p-4 text-sm text-[var(--rm-secondary)]`} href={target.upstreamHref} target="_blank">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="break-all font-medium text-[var(--rm-fg)]">{target.modelId}</p>
                    <StatusPill tone="accent">{target.endpointCount} endpoint{target.endpointCount === 1 ? "" : "s"}</StatusPill>
                  </div>
                  <p className="mt-2">Owner {target.owner}</p>
                  <p className="mt-2 break-all font-mono">{target.upstreamHref}</p>
                </a>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Boundary notes" description="This page documents when to use raw passthrough without duplicating the editable provider/account surfaces.">
        <div className="grid gap-4 md:grid-cols-3">
          <div className={`${mutedPanelClassName} p-4 text-sm text-[var(--rm-secondary)]`}>
            <p className="font-medium text-[var(--rm-fg)]">When to use `/upstream/`</p>
            <p className="mt-2">Use `/upstream/&lt;model&gt;/` when you need raw vendor behavior for a concrete model target and the repo-owned page intentionally stays reference-first.</p>
          </div>
          <div className={`${mutedPanelClassName} p-4 text-sm text-[var(--rm-secondary)]`}>
            <p className="font-medium text-[var(--rm-fg)]">What stays here</p>
            <p className="mt-2">Provider/account posture, passthrough expectations, and model-specific raw links stay together so the integration boundary remains clear.</p>
          </div>
          <pre className={`p-4 text-sm ${codeBlockClassName}`}>{`/upstream/<model>/\nopens the vendor passthrough for a single model target`}</pre>
        </div>
      </SectionCard>
    </div>
  );
}
