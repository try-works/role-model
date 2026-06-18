import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";

import {
  EmptyState,
  ErrorState,
  LoadingState,
  SectionCard,
  StatusPill,
} from "../components/page-primitives";
import { mutedPanelClassName, secondaryButtonClassName } from "../lib/design-system";
import { type RuntimeSnapshot, fetchRuntimeConfig, fetchRuntimeSnapshot } from "../lib/runtime-api";
import {
  buildConfiguredProviderRows,
  buildCredentialReadinessRows,
  buildEndpointCatalogRows,
} from "../lib/view-models";

type ProviderRow = ReturnType<typeof buildConfiguredProviderRows>[number];
type EndpointRow = ReturnType<typeof buildEndpointCatalogRows>[number];

function formatProviderReadiness(provider: ProviderRow): string {
  return (
    [
      provider.pendingDeviceAuthorizationCount > 0
        ? `${provider.pendingDeviceAuthorizationCount} pending OAuth`
        : null,
      provider.credentialsMissingAccountCount > 0
        ? `${provider.credentialsMissingAccountCount} missing credentials`
        : null,
      provider.connectedWithoutEndpointCount > 0
        ? `${provider.connectedWithoutEndpointCount} connected, no endpoint`
        : null,
      provider.readyAccountCount > 0 ? `${provider.readyAccountCount} ready` : null,
    ]
      .filter((value): value is string => value !== null)
      .join(" • ") || "—"
  );
}

function statusTone(status: string): "success" | "warning" | "neutral" {
  return status === "active" || status === "ready" || status === "execution-ready"
    ? "success"
    : status === "degraded" || status === "unknown"
      ? "warning"
      : "neutral";
}

function healthTone(healthStatus: string): "success" | "warning" | "neutral" {
  return healthStatus === "healthy"
    ? "success"
    : healthStatus === "unknown"
      ? "neutral"
      : "warning";
}

function buildRuntimeConnectionRows(input: {
  providerRows: readonly ProviderRow[];
  endpointRows: readonly EndpointRow[];
}): Array<{
  key: string;
  providerLabel: string;
  connectionLabel: string;
  modelLabel: string;
  endpointLabel: string;
  sourceLabel: string;
  healthLabel: string;
  healthTone: "success" | "warning" | "neutral";
  readinessLabel: string;
  readinessTone: "success" | "warning" | "neutral";
}> {
  const providersById = new Map(
    input.providerRows.map((provider) => [provider.providerId, provider]),
  );
  const endpointProviderIds = new Set<string>();
  const endpointRows = input.endpointRows.map((endpoint) => {
    endpointProviderIds.add(endpoint.providerLabel);
    const provider = providersById.get(endpoint.providerLabel);
    return {
      key: `endpoint:${endpoint.endpointId}`,
      providerLabel: endpoint.providerLabel,
      connectionLabel: provider?.accountIds.join(", ") || "—",
      modelLabel: endpoint.modelId,
      endpointLabel: endpoint.endpointId,
      sourceLabel: `${endpoint.sourceLabel} / ${endpoint.endpointKind}`,
      healthLabel: endpoint.healthStatus,
      healthTone: healthTone(endpoint.healthStatus),
      readinessLabel: endpoint.status,
      readinessTone: statusTone(endpoint.status),
    };
  });

  const providerOnlyRows = input.providerRows
    .filter((provider) => !endpointProviderIds.has(provider.providerId))
    .map((provider) => {
      const blocking = [
        provider.pendingDeviceAuthorizationCount,
        provider.credentialsMissingAccountCount,
        provider.connectedWithoutEndpointCount,
      ].some((value) => value > 0);
      const healthLabel = provider.healthStatuses.join(", ") || "unknown";
      const readinessTone: "success" | "warning" | "neutral" =
        provider.readyAccountCount > 0 && !blocking ? "success" : "warning";
      return {
        key: `provider:${provider.providerId}`,
        providerLabel: provider.providerId,
        connectionLabel: provider.accountIds.join(", ") || "—",
        modelLabel:
          provider.configuredModels.length > 0 ? provider.configuredModels.join(", ") : "No model",
        endpointLabel: `${provider.activeEndpointCount}/${provider.endpointCount} active`,
        sourceLabel: provider.authModes.join(", ") || "provider account",
        healthLabel,
        healthTone: healthTone(healthLabel),
        readinessLabel: formatProviderReadiness(provider),
        readinessTone,
      };
    });

  return [...endpointRows, ...providerOnlyRows];
}

export default function EndpointsRoute() {
  const [snapshot, setSnapshot] = useState<RuntimeSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([fetchRuntimeSnapshot(), fetchRuntimeConfig()])
      .then(([nextSnapshot]) => {
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
            providerRollups: snapshot.summary.credentialLifecycle?.providerRollups,
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
  const connectionRows = useMemo(
    () => buildRuntimeConnectionRows({ providerRows, endpointRows }),
    [providerRows, endpointRows],
  );

  if (error) {
    return <ErrorState label={error} />;
  }
  if (!snapshot) {
    return <LoadingState label="Loading endpoint registry…" />;
  }

  return (
    <div className="space-y-6">
      {readinessRows.length > 0 ? (
        <div
          className={`${mutedPanelClassName} flex flex-wrap items-center gap-3 p-4 text-sm text-[var(--rm-secondary)]`}
        >
          <span className="font-semibold text-[var(--rm-fg)]">Provider onboarding pending:</span>
          {readinessRows.map((row) => (
            <StatusPill key={row.key} tone={row.tone}>
              {row.label} {row.value}
            </StatusPill>
          ))}
          <Link className="text-[var(--rm-accent)]" to="/app/remote/providers">
            Remote → Providers
          </Link>
          <Link className="text-[var(--rm-accent)]" to="/app/system/runtime">
            System → Runtime
          </Link>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Link className={secondaryButtonClassName} to="/app/router">
          View alias posture → Router
        </Link>
      </div>

      {connectionRows.length === 0 ? (
        <SectionCard title="No configured endpoints yet">
          <EmptyState label="No providers or endpoints are configured yet." />
          <div className="mt-4 flex flex-wrap gap-3">
            <Link className={secondaryButtonClassName} to="/app/remote/providers">
              Remote → Providers
            </Link>
            <Link className={secondaryButtonClassName} to="/app/local/endpoints">
              Local → Endpoints
            </Link>
            <Link className={secondaryButtonClassName} to="/app/connect/downstream">
              Connect → Downstream
            </Link>
          </div>
        </SectionCard>
      ) : (
        <SectionCard
          title="Runtime connections"
          description="Provider, model, and endpoint state are merged into one registry view so operators can see what is usable without comparing duplicate tables."
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-[var(--rm-muted)]">
                <tr>
                  <th className="pb-3 font-semibold">Provider</th>
                  <th className="pb-3 font-semibold">Connection</th>
                  <th className="pb-3 font-semibold">Model</th>
                  <th className="pb-3 font-semibold">Endpoint</th>
                  <th className="pb-3 font-semibold">Source</th>
                  <th className="pb-3 font-semibold">Health</th>
                  <th className="pb-3 font-semibold">Readiness</th>
                </tr>
              </thead>
              <tbody>
                {connectionRows.map((row) => (
                  <tr key={row.key} className="border-t border-[var(--rm-border)]">
                    <td className="py-3 font-semibold text-[var(--rm-fg)]">{row.providerLabel}</td>
                    <td className="py-3 text-[var(--rm-secondary)]">{row.connectionLabel}</td>
                    <td className="py-3 text-[var(--rm-secondary)]">{row.modelLabel}</td>
                    <td className="py-3 text-[var(--rm-secondary)]">{row.endpointLabel}</td>
                    <td className="py-3 text-[var(--rm-secondary)]">{row.sourceLabel}</td>
                    <td className="py-3">
                      <StatusPill tone={row.healthTone}>{row.healthLabel}</StatusPill>
                    </td>
                    <td className="py-3">
                      <StatusPill tone={row.readinessTone}>{row.readinessLabel}</StatusPill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
