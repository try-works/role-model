import { useEffect, useMemo, useState } from "react";

import { EmptyState, ErrorState, FactCard, LoadingState, PageHeader, SectionCard, StatusPill } from "../components/page-primitives";
import { fieldClassName, mutedPanelClassName, primaryButtonClassName } from "../lib/design-system";
import { activateRuntimeEndpoint, fetchRuntimeSnapshot, type RuntimeSnapshot } from "../lib/runtime-api";

const inputClass = fieldClassName;
const buttonClass = primaryButtonClassName;

export default function EndpointsRoute() {
  const [snapshot, setSnapshot] = useState<RuntimeSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [providerAccountId, setProviderAccountId] = useState("");
  const [modelId, setModelId] = useState("");
  const [region, setRegion] = useState("global");
  const [submitting, setSubmitting] = useState(false);

  const load = () =>
    fetchRuntimeSnapshot()
      .then((nextSnapshot) => {
        setSnapshot(nextSnapshot);
        setError(null);
      })
      .catch((value: unknown) => setError(value instanceof Error ? value.message : "Could not load endpoints."));

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!snapshot || snapshot.accounts.length === 0) {
      return;
    }
    setProviderAccountId((current) => current || snapshot.accounts[0].providerAccountId);
  }, [snapshot]);

  const selectedAccount = useMemo(
    () => snapshot?.accounts.find((account) => account.providerAccountId === providerAccountId) ?? snapshot?.accounts[0],
    [providerAccountId, snapshot],
  );
  const availableModels = selectedAccount?.allowedModels ?? [];
  const selectedRoleIds =
    selectedAccount?.modelRoleBindings?.find((binding) => binding.modelId === modelId)?.roleIds ?? [];

  useEffect(() => {
    if (availableModels.length === 0) {
      setModelId("");
      return;
    }
    setModelId((current) => (current && availableModels.includes(current) ? current : availableModels[0]));
  }, [availableModels]);

  if (error) {
    return <ErrorState label={error} />;
  }
  if (!snapshot) {
    return <LoadingState label="Loading endpoint registry…" />;
  }

  const activeEndpointCount = snapshot.endpoints.filter((endpoint) => endpoint.status === "active").length;
  const healthyAccountCount = snapshot.accounts.filter(
    (account) => account.status === "active" && account.healthStatus === "healthy",
  ).length;

  const onActivate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedAccount || !modelId) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await activateRuntimeEndpoint({
        providerAccountId: selectedAccount.providerAccountId,
        modelId,
        region,
      });
      await load();
    } catch (value) {
      setError(value instanceof Error ? value.message : "Could not activate endpoint.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Endpoints"
        title="Endpoint registry"
        description="Activate runtime-managed cloud endpoints from the accounts you configure, then verify they appear in the live registry immediately."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <FactCard label="Accounts ready" value={healthyAccountCount} detail="Accounts that are active and healthy enough to activate endpoints now." emphasis />
        <FactCard label="Registry entries" value={snapshot.endpoints.length} detail="Current endpoint rows in the runtime-visible registry." />
        <FactCard label="Active endpoints" value={activeEndpointCount} detail="Endpoints currently marked active in the control-plane summary." />
        <FactCard label="Selected roles" value={selectedRoleIds.length} detail="Roles that will follow the current model choice into activation." />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <SectionCard
          title="Activate endpoint"
          description="Dynamic endpoint activations are persisted into runtime state and merged into the live registry without editing repo fixtures."
        >
          {snapshot.accounts.length === 0 ? (
            <EmptyState label="Create a provider account first, then return here to activate an endpoint." />
          ) : (
            <form className="space-y-4" onSubmit={onActivate}>
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-[var(--rm-fg)]">Provider account</span>
                <select
                  className={inputClass}
                  value={selectedAccount?.providerAccountId ?? ""}
                  onChange={(event) => setProviderAccountId(event.target.value)}
                >
                  {snapshot.accounts.map((account) => (
                    <option key={account.providerAccountId} value={account.providerAccountId}>
                      {account.providerAccountId}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm">
                <span className="font-medium text-[var(--rm-fg)]">Model</span>
                <select className={inputClass} value={modelId} onChange={(event) => setModelId(event.target.value)}>
                  {availableModels.map((entry) => (
                    <option key={entry} value={entry}>
                      {entry}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm">
                <span className="font-medium text-[var(--rm-fg)]">Region</span>
                <input className={inputClass} value={region} onChange={(event) => setRegion(event.target.value)} />
              </label>

              <div className={`${mutedPanelClassName} p-4 text-sm text-[var(--rm-secondary)]`}>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-[var(--rm-fg)]">{selectedAccount?.providerAccountId}</p>
                  {selectedAccount?.healthStatus ? (
                    <StatusPill tone={selectedAccount.healthStatus === "healthy" ? "success" : "warning"}>
                      {selectedAccount.healthStatus}
                    </StatusPill>
                  ) : null}
                </div>
                <p className="mt-2">
                  Endpoint activation is only enabled for runtime accounts whose credentials are already active and healthy.
                </p>
                <p className="mt-2">
                  <span className="font-medium text-[var(--rm-fg)]">Assigned roles:</span>{" "}
                  {selectedRoleIds.length > 0 ? selectedRoleIds.join(", ") : "None"}
                </p>
              </div>

              <button
                className={buttonClass}
                disabled={
                  submitting ||
                  !selectedAccount ||
                  !modelId ||
                  selectedAccount.status !== "active" ||
                  selectedAccount.healthStatus !== "healthy"
                }
                type="submit"
              >
                {submitting ? "Activating…" : "Activate endpoint"}
              </button>
            </form>
          )}
        </SectionCard>

        <SectionCard title="Registry entries" description="These rows combine the baseline fixture registry with runtime-managed endpoint activations.">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-[var(--rm-muted)]">
                <tr>
                  <th className="pb-3 font-medium">Endpoint</th>
                  <th className="pb-3 font-medium">Model</th>
                  <th className="pb-3 font-medium">Roles</th>
                  <th className="pb-3 font-medium">Provider</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.endpoints.map((endpoint) => (
                  <tr key={endpoint.endpointId} className="border-t border-[var(--rm-border)]">
                    <td className="py-3 font-medium text-[var(--rm-fg)]">{endpoint.endpointId}</td>
                    <td className="py-3 text-[var(--rm-secondary)]">{endpoint.modelId}</td>
                    <td className="py-3 text-[var(--rm-secondary)]">
                      {endpoint.roleIds?.length ? endpoint.roleIds.join(", ") : "—"}
                    </td>
                    <td className="py-3 text-[var(--rm-secondary)]">{endpoint.providerId ?? "local/runtime"}</td>
                    <td className="py-3">
                      <StatusPill tone={endpoint.status === "active" ? "success" : endpoint.status === "degraded" ? "warning" : "neutral"}>
                        {endpoint.status ?? "unknown"}
                      </StatusPill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
