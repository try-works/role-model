import { useEffect, useMemo, useState } from "react";

import {
  EmptyState,
  ErrorState,
  FactCard,
  LoadingState,
  SectionCard,
  StatusPill,
} from "../components/page-primitives";
import {
  compactTitleClassName,
  mutedPanelClassName,
  supportingTextClassName,
} from "../lib/design-system";
import {
  type RuntimeSnapshot,
  fetchRuntimeAccounts,
  fetchRuntimeModels,
  fetchRuntimeProviders,
} from "../lib/runtime-api";
import { buildProviderCards } from "../lib/view-models";

export default function IntegrationsUpstreamRoute() {
  const [snapshot, setSnapshot] = useState<Pick<
    RuntimeSnapshot,
    "providers" | "accounts" | "models"
  > | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([fetchRuntimeProviders(), fetchRuntimeAccounts(), fetchRuntimeModels()])
      .then(([providers, accounts, models]) =>
        setSnapshot({
          providers,
          accounts,
          models,
        }),
      )
      .catch((value: unknown) =>
        setError(
          value instanceof Error ? value.message : "Could not load upstream integration details.",
        ),
      );
  }, []);

  const providerCards = useMemo(
    () =>
      snapshot
        ? buildProviderCards(snapshot.providers, snapshot.accounts).filter(
            (p) => p.accountCount > 0,
          )
        : [],
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
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <FactCard
          label="Providers"
          value={providerCards.length}
          detail="Provider and account posture stays visible here without duplicating the editable Control pages."
          emphasis
        />
        <FactCard
          label="Accounts"
          value={snapshot?.accounts.length ?? 0}
          detail="Configured provider accounts that feed current upstream model access."
        />
        <FactCard
          label="Upstream targets"
          value={modelTargets.length}
          detail="Each target keeps a contextual `/upstream/<model>/` doorway instead of a global legacy-ui link."
        />
      </div>

      {error ? <ErrorState label={error} /> : null}

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard title="Provider accounts in scope">
          {!snapshot ? (
            <LoadingState label="Loading upstream provider posture…" />
          ) : providerCards.length === 0 ? (
            <EmptyState label="No configured provider accounts are available yet." />
          ) : (
            <div className="space-y-4">
              {providerCards.map((provider) => (
                <div key={provider.providerId} className={`${mutedPanelClassName} p-4`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className={compactTitleClassName}>{provider.title}</p>
                    <StatusPill tone={provider.accountCount > 0 ? "accent" : "warning"}>
                      {provider.accountCount} account{provider.accountCount === 1 ? "" : "s"}
                    </StatusPill>
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

        <div className="space-y-4">
          <SectionCard title="Boundary guidance">
            <div className="space-y-3">
              <div className={`${mutedPanelClassName} p-4`}>
                <p className={compactTitleClassName}>Raw passthrough only</p>
                <p className={`mt-2 ${supportingTextClassName}`}>
                  Use the contextual `/upstream/&lt;model&gt;/` doorway when you need direct
                  provider-native behavior for a runtime-visible model instead of routed alias
                  execution.
                </p>
              </div>
              <div className={`${mutedPanelClassName} p-4`}>
                <p className={compactTitleClassName}>Live inventory</p>
                <p className={supportingTextClassName}>
                  {modelTargets.length} upstream target{modelTargets.length === 1 ? "" : "s"} are
                  currently exposed from {providerCards.length} configured provider
                  {providerCards.length === 1 ? "" : "s"}.
                </p>
              </div>
              <div className={`${mutedPanelClassName} p-4`}>
                <p className={compactTitleClassName}>Runtime boundary</p>
                <p className={supportingTextClassName}>
                  Alias routing and telemetry stay on the runtime shell; this page preserves the raw
                  escape hatch without replacing Router or Observe ownership.
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Upstream target inventory">
            {!snapshot ? (
              <LoadingState label="Loading upstream targets…" />
            ) : modelTargets.length === 0 ? (
              <EmptyState label="No upstream-capable models are currently exposed through the runtime model list." />
            ) : (
              <div className="space-y-3">
                {modelTargets.map((target) => (
                  <a
                    key={target.modelId}
                    className={`${mutedPanelClassName} block p-4`}
                    href={target.upstreamHref}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className={`break-all ${compactTitleClassName}`}>{target.modelId}</p>
                      <StatusPill tone="accent">
                        {target.endpointCount} endpoint{target.endpointCount === 1 ? "" : "s"}
                      </StatusPill>
                    </div>
                    <p className={`mt-2 ${supportingTextClassName}`}>Owner {target.owner}</p>
                    <p className={`mt-2 break-all ${supportingTextClassName} font-mono`}>
                      {target.upstreamHref}
                    </p>
                  </a>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
