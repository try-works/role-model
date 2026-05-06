import { useEffect, useState } from "react";

import { EmptyState, ErrorState, LoadingState, PageHeader, SectionCard, StatusPill } from "../components/page-primitives";
import { mutedPanelClassName, primaryButtonClassName, raisedPanelClassName, secondaryButtonClassName } from "../lib/design-system";
import { fetchRuntimeSnapshot, type RuntimeSnapshot } from "../lib/runtime-api";
import { buildProviderCards } from "../lib/view-models";

export default function ProvidersRoute() {
  const [snapshot, setSnapshot] = useState<RuntimeSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchRuntimeSnapshot()
      .then(setSnapshot)
      .catch((value: unknown) => setError(value instanceof Error ? value.message : "Could not load providers."));
  }, []);

  if (error) {
    return <ErrorState label={error} />;
  }
  if (!snapshot) {
    return <LoadingState label="Loading provider catalog…" />;
  }

  const providerCards = buildProviderCards(snapshot.providers, snapshot.accounts);

  return (
    <div className="space-y-6">
        <PageHeader
          eyebrow="Providers"
          title="Provider onboarding"
          description="Catalog-backed provider surfaces now link directly into account setup, device OAuth, and endpoint activation instead of stopping at metadata."
        />

      {providerCards.length === 0 ? (
        <EmptyState label="No providers are currently available." />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {snapshot.providers.map((provider) => {
            const card = providerCards.find((entry) => entry.providerId === provider.providerId);
            return (
              <SectionCard
                key={provider.providerId}
                title={provider.displayName}
                description={`${provider.providerId} • ${provider.modelIds?.length ?? 0} model(s)`}
              >
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {(provider.supportedAuthModes ?? []).map((authMode) => (
                      <StatusPill key={authMode} tone="neutral">
                        {authMode}
                      </StatusPill>
                    ))}
                  </div>

                    <div className="space-y-3">
                      {(provider.variants ?? []).map((variant) => (
                      <div key={variant.variantId} className={`${mutedPanelClassName} p-4`}>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-medium text-[var(--rm-fg)]">{variant.label}</h3>
                          <StatusPill tone={variant.availability === "ready" ? "success" : "warning"}>
                            {variant.availability}
                          </StatusPill>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-[var(--rm-secondary)]">{variant.description}</p>
                        <div className="mt-3 grid gap-2 text-sm text-[var(--rm-secondary)]">
                          <p><span className="font-medium text-[var(--rm-fg)]">Auth mode:</span> {variant.authMode}</p>
                          <p><span className="font-medium text-[var(--rm-fg)]">Base URL:</span> {variant.baseUrl}</p>
                          {variant.oauth ? (
                            <div className={`${raisedPanelClassName} p-3`}>
                              <p className="font-medium text-[var(--rm-fg)]">Device OAuth metadata</p>
                              <p className="mt-2"><span className="font-medium text-[var(--rm-fg)]">OAuth host:</span> {variant.oauth.oauthHost}</p>
                              <p><span className="font-medium text-[var(--rm-fg)]">Client id:</span> {variant.oauth.clientId}</p>
                              <p><span className="font-medium text-[var(--rm-fg)]">Device endpoint:</span> {variant.oauth.deviceAuthorizationEndpoint}</p>
                            </div>
                          ) : null}
                        </div>
                        <div className="mt-4 flex flex-wrap gap-3">
                          <a
                            className={primaryButtonClassName}
                            href={`/app/accounts?providerId=${encodeURIComponent(provider.providerId)}&variantId=${encodeURIComponent(variant.variantId)}`}
                          >
                            {variant.authMode === "oauth2-device-code" ? "Connect provider" : "Configure account"}
                          </a>
                          <a
                            className={secondaryButtonClassName}
                            href="/app/endpoints"
                          >
                            Activate endpoint
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="text-sm text-[var(--rm-secondary)]">
                    Current accounts: <span className="font-medium text-[var(--rm-fg)]">{card?.accountCount ?? 0}</span>
                  </p>
                </div>
              </SectionCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
