import { useEffect, useMemo, useState } from "react";

import {
  Badge,
  EmptyState,
  ErrorState,
  LoadingState,
  SectionCard,
} from "../components/page-primitives";
import { mutedPanelClassName, supportingTextClassName } from "../lib/design-system";
import { formatModelIdentity } from "../lib/effort-identity";
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
      displayName: formatModelIdentity(model, model.id),
      owner: model.owned_by ?? "role-model",
      endpointCount: model.endpoint_ids?.length ?? 0,
      upstreamHref: `/upstream/${model.id}/`,
    })) ?? [];

  return (
    <div className="space-y-6">
      {error ? <ErrorState label={error} /> : null}

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard
          title="Provider accounts in scope"
          description="Configured providers with at least one account feeding upstream access."
        >
          {!snapshot ? (
            <LoadingState label="Loading upstream provider posture…" />
          ) : providerCards.length === 0 ? (
            <EmptyState label="No configured provider accounts are available yet." />
          ) : (
            <div className="space-y-3">
              {providerCards.map((provider) => (
                <div key={provider.providerId} className={`${mutedPanelClassName} p-4`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[13px] font-semibold leading-[18px] text-[var(--rm-fg)]">
                      {provider.title}
                    </p>
                    <Badge tone={provider.accountCount > 0 ? "accent" : "warning"}>
                      {provider.accountCount} account{provider.accountCount === 1 ? "" : "s"}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {provider.variants.length === 0 ? (
                      <Badge tone="warning">No variants</Badge>
                    ) : (
                      provider.variants.map((variant) => (
                        <Badge key={variant.variantId} tone="neutral">
                          {variant.label}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <div className="space-y-4">
          <SectionCard
            title="Boundary guidance"
            description="Raw escape hatch for provider-native behavior — not routed alias execution."
          >
            <div className="space-y-3">
              <div className={`${mutedPanelClassName} space-y-2 p-4`}>
                <p className="text-[13px] font-semibold leading-[18px] text-[var(--rm-fg)]">
                  Raw passthrough only
                </p>
                <p className={supportingTextClassName}>
                  {
                    "Use the contextual /upstream/<model>/ doorway when you need direct provider-native behavior for a runtime-visible model instead of routed alias execution."
                  }
                </p>
              </div>
              <div className={`${mutedPanelClassName} space-y-2 p-4`}>
                <p className="text-[13px] font-semibold leading-[18px] text-[var(--rm-fg)]">
                  Live inventory
                </p>
                <p className={supportingTextClassName}>
                  {modelTargets.length} upstream target{modelTargets.length === 1 ? "" : "s"}{" "}
                  {modelTargets.length === 1 ? "is" : "are"} currently exposed from{" "}
                  {providerCards.length} configured provider
                  {providerCards.length === 1 ? "" : "s"}.
                </p>
              </div>
              <div className={`${mutedPanelClassName} space-y-2 p-4`}>
                <p className="text-[13px] font-semibold leading-[18px] text-[var(--rm-fg)]">
                  Runtime boundary
                </p>
                <p className={supportingTextClassName}>
                  Alias routing and telemetry stay on the runtime shell; this page preserves the raw
                  escape hatch without replacing Router or Observe ownership.
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Upstream target inventory"
            description="Contextual /upstream/<model>/ doorways for provider-native access."
          >
            {!snapshot ? (
              <LoadingState label="Loading upstream targets…" />
            ) : modelTargets.length === 0 ? (
              <EmptyState label="No upstream-capable models are currently exposed through the runtime model list." />
            ) : (
              <div className="-mx-5 -mb-5 divide-y divide-[var(--rm-border)]">
                {modelTargets.map((target) => (
                  <a
                    key={target.modelId}
                    className="block px-5 py-4 transition-colors hover:bg-[var(--rm-surface-strong)]"
                    href={target.upstreamHref}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="break-all font-mono text-[13px] font-semibold text-[var(--rm-fg)]">
                        {target.displayName}
                      </p>
                      <Badge tone="accent">
                        {target.endpointCount} endpoint{target.endpointCount === 1 ? "" : "s"}
                      </Badge>
                    </div>
                    <p className={`mt-2 ${supportingTextClassName}`}>Owner {target.owner}</p>
                    <p
                      className={`mt-1 break-all font-mono text-[12px] ${supportingTextClassName}`}
                    >
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
