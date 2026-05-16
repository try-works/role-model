import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";

import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  SectionCard,
  StatusPill,
} from "../components/page-primitives";
import { secondaryButtonClassName } from "../lib/design-system";
import { type RuntimeSnapshot, fetchRuntimeSnapshot } from "../lib/runtime-api";
import {
  buildConfiguredProviderRows,
  buildCredentialReadinessRows,
  buildEndpointCatalogRows,
} from "../lib/view-models";

export default function EndpointsRoute() {
  const [snapshot, setSnapshot] = useState<RuntimeSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchRuntimeSnapshot()
      .then((nextSnapshot) => {
        setSnapshot(nextSnapshot);
        setError(null);
      })
      .catch((value: unknown) =>
        setError(value instanceof Error ? value.message : "Could not load endpoints."),
      );
  }, []);

  const providerRows = useMemo(
    () =>
      snapshot
        ? buildConfiguredProviderRows({
            accounts: snapshot.accounts,
            deviceAuthorizations: snapshot.deviceAuthorizations,
            endpoints: snapshot.endpoints,
          })
        : [],
    [snapshot],
  );
  const endpointRows = useMemo(
    () => (snapshot ? buildEndpointCatalogRows(snapshot.endpoints) : []),
    [snapshot],
  );
  const readinessRows = useMemo(
    () =>
      snapshot ? buildCredentialReadinessRows(snapshot.summary).filter((row) => row.value > 0) : [],
    [snapshot],
  );

  if (error) {
    return <ErrorState label={error} />;
  }
  if (!snapshot) {
    return <LoadingState label="Loading endpoint registry…" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Endpoints"
        title="Endpoint registry"
        description="Configured providers, configured models, and the live runtime endpoint registry appear together here after provider onboarding."
      />

      {readinessRows.length > 0 ? (
        <SectionCard
          title="Provider onboarding readiness"
          description="Saved provider accounts can still be pending OAuth, missing credentials, or connected without an activated endpoint."
        >
          <div className="flex flex-wrap gap-3">
            {readinessRows.map((row) => (
              <StatusPill key={row.key} tone={row.tone}>
                {row.label} {row.value}
              </StatusPill>
            ))}
          </div>
        </SectionCard>
      ) : null}

      {providerRows.length === 0 && endpointRows.length === 0 ? (
        <SectionCard
          title="No configured endpoints yet"
          description="Remote providers are configured on the Providers page. Local llama-swap endpoints are added from Local > Endpoints."
        >
          <EmptyState label="No providers or endpoints are configured yet." />
          <div className="mt-4 flex flex-wrap gap-3">
            <Link className={secondaryButtonClassName} to="/app/control/providers">
              Open Providers
            </Link>
            <Link className={secondaryButtonClassName} to="/app/local/peers">
              Open Local Endpoints
            </Link>
            <Link className={secondaryButtonClassName} to="/app/local/models">
              Open Local Models
            </Link>
          </div>
        </SectionCard>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
          <SectionCard
            title="Configured providers"
            description="Saved runtime provider connections and the model inventory each one currently contributes to the registry."
          >
            {providerRows.length === 0 ? (
              <EmptyState label="No providers are configured yet." />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-[var(--rm-muted)]">
                    <tr>
                      <th className="pb-3 font-medium">Provider</th>
                      <th className="pb-3 font-medium">Connections</th>
                      <th className="pb-3 font-medium">Auth</th>
                      <th className="pb-3 font-medium">Models</th>
                      <th className="pb-3 font-medium">Health</th>
                      <th className="pb-3 font-medium">Readiness</th>
                      <th className="pb-3 font-medium">Endpoints</th>
                    </tr>
                  </thead>
                  <tbody>
                    {providerRows.map((provider) => (
                      <tr key={provider.providerId} className="border-t border-[var(--rm-border)]">
                        <td className="py-3 font-medium text-[var(--rm-fg)]">
                          {provider.providerId}
                        </td>
                        <td className="py-3 text-[var(--rm-secondary)]">
                          {provider.accountIds.join(", ") || "—"}
                        </td>
                        <td className="py-3 text-[var(--rm-secondary)]">
                          {provider.authModes.join(", ") || "—"}
                        </td>
                        <td className="py-3 text-[var(--rm-secondary)]">
                          {provider.configuredModels.length > 0
                            ? provider.configuredModels.join(", ")
                            : "—"}
                        </td>
                        <td className="py-3 text-[var(--rm-secondary)]">
                          {provider.healthStatuses.join(", ") || "unknown"}
                        </td>
                        <td className="py-3 text-[var(--rm-secondary)]">
                          {[
                            provider.pendingDeviceAuthorizationCount > 0
                              ? `${provider.pendingDeviceAuthorizationCount} pending OAuth`
                              : null,
                            provider.credentialsMissingAccountCount > 0
                              ? `${provider.credentialsMissingAccountCount} missing credentials`
                              : null,
                            provider.connectedWithoutEndpointCount > 0
                              ? `${provider.connectedWithoutEndpointCount} connected, no endpoint`
                              : null,
                            provider.readyAccountCount > 0
                              ? `${provider.readyAccountCount} ready`
                              : null,
                          ]
                            .filter((value): value is string => value !== null)
                            .join(" • ") || "—"}
                        </td>
                        <td className="py-3 text-[var(--rm-secondary)]">
                          {provider.activeEndpointCount}/{provider.endpointCount} active
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Runtime endpoint rows"
            description="Concrete endpoint rows by endpoint id, model, provider, serving source, and live runtime health."
          >
            {endpointRows.length === 0 ? (
              <EmptyState
                label={
                  readinessRows.length > 0
                    ? "No runtime endpoint rows are active yet. Saved providers still need OAuth completion, credentials, or endpoint activation."
                    : "No runtime endpoint rows are active yet. Configure a provider from Providers to populate this registry."
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-[var(--rm-muted)]">
                    <tr>
                      <th className="pb-3 font-medium">Endpoint</th>
                      <th className="pb-3 font-medium">Model</th>
                      <th className="pb-3 font-medium">Provider</th>
                      <th className="pb-3 font-medium">Source</th>
                      <th className="pb-3 font-medium">Serving source</th>
                      <th className="pb-3 font-medium">Health</th>
                      <th className="pb-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {endpointRows.map((endpoint) => (
                      <tr key={endpoint.endpointId} className="border-t border-[var(--rm-border)]">
                        <td className="py-3 font-medium text-[var(--rm-fg)]">
                          {endpoint.endpointId}
                        </td>
                        <td className="py-3 text-[var(--rm-secondary)]">{endpoint.modelId}</td>
                        <td className="py-3 text-[var(--rm-secondary)]">
                          {endpoint.providerLabel}
                        </td>
                        <td className="py-3 text-[var(--rm-secondary)]">
                          {endpoint.sourceLabel} / {endpoint.endpointKind}
                        </td>
                        <td className="py-3 text-[var(--rm-secondary)]">
                          {endpoint.servingSource}
                        </td>
                        <td className="py-3">
                          <StatusPill
                            tone={endpoint.healthStatus === "healthy" ? "success" : "warning"}
                          >
                            {endpoint.healthStatus}
                          </StatusPill>
                        </td>
                        <td className="py-3">
                          <StatusPill
                            tone={
                              endpoint.status === "active"
                                ? "success"
                                : endpoint.status === "degraded"
                                  ? "warning"
                                  : "neutral"
                            }
                          >
                            {endpoint.status}
                          </StatusPill>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </div>
      )}
    </div>
  );
}
