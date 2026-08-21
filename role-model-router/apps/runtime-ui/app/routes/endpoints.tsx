import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";

import {
  Badge,
  EmptyState,
  ErrorState,
  LoadingState,
  SectionCard,
} from "../components/page-primitives";
import {
  bodyStrongTextClassName,
  monoEyebrowClassName,
  secondaryButtonClassName,
  supportingTextClassName,
} from "../lib/design-system";
import { formatEndpointDisplayPath } from "../lib/effort-identity";
import {
  type RuntimeSnapshot,
  fetchRuntimeAccounts,
  fetchRuntimeDeviceAuthorizations,
  fetchRuntimeEndpoints,
  fetchRuntimeSummary,
} from "../lib/runtime-api";
import { buildConfiguredProviderRows, buildEndpointCatalogRows } from "../lib/view-models";

type ProviderRow = ReturnType<typeof buildConfiguredProviderRows>[number];
type EndpointRow = ReturnType<typeof buildEndpointCatalogRows>[number];

function formatProviderReadiness(provider: ProviderRow): string {
  return (
    [
      provider.pendingDeviceAuthorizationCount > 0
        ? `${provider.pendingDeviceAuthorizationCount} pending OAuth`
        : null,
      provider.envUnresolvedAccountCount > 0
        ? `${provider.envUnresolvedAccountCount} env unresolved`
        : null,
      provider.expiredAuthAccountCount > 0
        ? `${provider.expiredAuthAccountCount} reconnect required`
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

function formatServingSource(servingSource: string, fallback: string): string {
  switch (servingSource) {
    case "vendor-litellm":
      return "LiteLLM proxy";
    case "remote-service":
      return "Direct provider";
    case "vendor-llama-swap":
      return "llama-swap";
    case "local-peer":
      return "Local peer";
    default:
      return fallback;
  }
}

export function buildRuntimeConnectionRows(input: {
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
  // LiteLLM is a vendor/proxy capability, not a distinct user-configured
  // connection. Keeping its synthetic catalog rows here duplicates the same
  // provider model beside the actual account endpoint and misstates endpoint
  // ownership in the Registry UI.
  const endpointRows = input.endpointRows
    .filter((endpoint) => endpoint.servingSource !== "vendor-litellm")
    .map((endpoint) => {
    endpointProviderIds.add(endpoint.providerLabel);
    const routingIneligible = endpoint.routingEligible === false;
    return {
      key: `endpoint:${endpoint.endpointId}`,
      providerLabel: endpoint.providerLabel,
      connectionLabel: endpoint.providerAccountId ?? "—",
      modelLabel: endpoint.displayName ?? endpoint.modelId,
      endpointLabel: formatEndpointDisplayPath(endpoint),
      sourceLabel: `${formatServingSource(endpoint.servingSource, endpoint.sourceLabel)} / ${endpoint.endpointKind}`,
      healthLabel: endpoint.healthStatus,
      healthTone: healthTone(endpoint.healthStatus),
      readinessLabel: routingIneligible ? "routing ineligible" : endpoint.status,
      readinessTone: routingIneligible ? "warning" : statusTone(endpoint.status),
    };
    });

  const providerOnlyRows = input.providerRows
    .filter((provider) => !endpointProviderIds.has(provider.providerId))
    .map((provider) => {
      const blocking = [
        provider.pendingDeviceAuthorizationCount,
        provider.envUnresolvedAccountCount,
        provider.expiredAuthAccountCount,
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
  const [snapshot, setSnapshot] = useState<Pick<
    RuntimeSnapshot,
    "summary" | "accounts" | "deviceAuthorizations" | "endpoints"
  > | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([
      fetchRuntimeSummary(),
      fetchRuntimeAccounts(),
      fetchRuntimeDeviceAuthorizations(),
      fetchRuntimeEndpoints(),
    ])
      .then(([summary, accounts, deviceAuthorizations, endpoints]) => {
        setSnapshot({
          summary,
          accounts,
          deviceAuthorizations,
          endpoints,
        });
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
  const connectionRows = useMemo(
    () => buildRuntimeConnectionRows({ providerRows, endpointRows }),
    [providerRows, endpointRows],
  );
  const tableValueCellClassName = `py-3 ${supportingTextClassName}`;

  if (error) {
    return <ErrorState label={error} />;
  }
  if (!snapshot) {
    return <LoadingState label="Loading endpoint registry…" />;
  }

  return (
    <div className="space-y-6">
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
          description="Provider, model, and endpoint state merged into one registry view."
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr>
                  <th className={`pb-3 font-normal ${monoEyebrowClassName}`}>Provider</th>
                  <th className={`pb-3 font-normal ${monoEyebrowClassName}`}>Connection</th>
                  <th className={`pb-3 font-normal ${monoEyebrowClassName}`}>Model</th>
                  <th className={`pb-3 font-normal ${monoEyebrowClassName}`}>Endpoint</th>
                  <th className={`pb-3 font-normal ${monoEyebrowClassName}`}>Source</th>
                  <th className={`pb-3 font-normal ${monoEyebrowClassName}`}>Health</th>
                  <th className={`pb-3 font-normal ${monoEyebrowClassName}`}>Readiness</th>
                </tr>
              </thead>
              <tbody>
                {connectionRows.map((row) => (
                  <tr key={row.key} className="border-t border-[var(--rm-border)]">
                    <td className={`py-3 ${bodyStrongTextClassName}`}>{row.providerLabel}</td>
                    <td className={tableValueCellClassName}>{row.connectionLabel}</td>
                    <td className={tableValueCellClassName}>{row.modelLabel}</td>
                    <td className={tableValueCellClassName}>{row.endpointLabel}</td>
                    <td className={tableValueCellClassName}>{row.sourceLabel}</td>
                    <td className="py-3">
                      <Badge tone={row.healthTone}>{row.healthLabel}</Badge>
                    </td>
                    <td className="py-3">
                      <Badge tone={row.readinessTone}>{row.readinessLabel}</Badge>
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
