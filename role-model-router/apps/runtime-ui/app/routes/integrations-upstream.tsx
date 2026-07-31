import { MetricStrip } from "@role-model/ui";
import { useEffect, useMemo, useState } from "react";

import {
  EmptyState,
  ErrorState,
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
      <MetricStrip
        aria-label="Upstream summary"
        variant="panel"
        items={[
          { id: "providers", label: "Providers", value: String(providerCards.length)},
          {
            id: "accounts",
            label: "Accounts",
            value: String(snapshot?.accounts.length ?? 0),
          },
          { id: "targets", label: "Upstream targets", value: String(modelTargets.length)},
        ]}
      />

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

        <SectionCard title="Upstream model targets">
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
  );
}
