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
  utilityLabelClassName,
} from "../lib/design-system";
import {
  type PeerConfig,
  type RuntimeSnapshot,
  fetchPeers,
  fetchRuntimeModels,
} from "../lib/runtime-api";

export default function SystemPeersRoute() {
  const [snapshot, setSnapshot] = useState<Pick<RuntimeSnapshot, "models"> | null>(null);
  const [peers, setPeers] = useState<readonly PeerConfig[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([fetchRuntimeModels(), fetchPeers()])
      .then(([models, nextPeers]) => {
        setSnapshot({ models });
        setPeers(nextPeers);
      })
      .catch((value: unknown) =>
        setError(value instanceof Error ? value.message : "Could not load peer topology details."),
      );
  }, []);

  const peerGroups = useMemo(() => {
    const grouped = new Map<string, string[]>();
    for (const model of snapshot?.models ?? []) {
      if (!model.peerID) {
        continue;
      }
      const existing = grouped.get(model.peerID) ?? [];
      existing.push(model.id);
      grouped.set(model.peerID, existing);
    }
    return [...grouped.entries()].map(([peerId, modelIds]) => ({
      peerId,
      modelIds: modelIds.sort((left, right) => left.localeCompare(right, "en")),
    }));
  }, [snapshot?.models]);
  const peerConfigRows = useMemo(
    () =>
      (peers ?? []).map((peer) => ({
        id: peer.id,
        url: peer.url,
        authConfigured: Boolean(peer.authToken),
        modelIds: peerGroups.find((group) => group.peerId === peer.id)?.modelIds ?? [],
      })),
    [peerGroups, peers],
  );

  const peerModelCount = peerGroups.reduce((total, group) => total + group.modelIds.length, 0);
  const peerContractFields = [
    ["proxy", "Base URL to proxy peer requests through."],
    ["apiKey", "Optional peer-specific auth token passed to the remote target."],
    ["models", "The models served by that peer and exposed to the runtime."],
    ["filters", "Peer-local request filters or strip rules."],
    ["timeouts", "Proxy timeout settings applied to peer traffic."],
  ] as const;

  return (
    <div className="space-y-6">
      <MetricStrip
        aria-label="Peers summary"
        variant="panel"
        items={[
          { id: "peers", label: "Configured peers", value: String(peerGroups.length)},
          { id: "peer-models", label: "Peer models", value: String(peerModelCount)},
          {
            id: "runtime-models",
            label: "Runtime models",
            value: String(snapshot?.models.length ?? 0),
          },
        ]}
      />

      {error ? <ErrorState label={error} /> : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]">
        <SectionCard
          title="Peer inventory"
          description="Peer-backed model groups observed in the current runtime list."
        >
          {!snapshot || peers === null ? (
            <LoadingState label="Loading peer inventory…" />
          ) : peerGroups.length === 0 ? (
            <EmptyState label="No peers configured in the current host config." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-[var(--rm-muted)]">
                  <tr>
                    <th className="pb-3 font-semibold">Peer</th>
                    <th className="pb-3 font-semibold">Models</th>
                    <th className="pb-3 font-semibold">Count</th>
                    <th className="pb-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {peerGroups.map((group) => (
                    <tr key={group.peerId} className="border-t border-[var(--rm-border)]">
                      <td className={`py-3 ${compactTitleClassName}`}>{group.peerId}</td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-2">
                          {group.modelIds.map((modelId) => (
                            <StatusPill key={modelId} tone="neutral">
                              {modelId}
                            </StatusPill>
                          ))}
                        </div>
                      </td>
                      <td className={`py-3 ${supportingTextClassName}`}>{group.modelIds.length}</td>
                      <td className="py-3">
                        <StatusPill tone="accent">observed</StatusPill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        <div className="space-y-4">
          <SectionCard
            title="Peer config"
            description="Proxy targets, auth state, and live model match."
          >
            {!snapshot || peers === null ? (
              <LoadingState label="Loading peer config inventory…" />
            ) : peerConfigRows.length === 0 ? (
              <EmptyState label="No peer configs are stored in the current runtime." />
            ) : (
              <div className="space-y-3">
                {peerConfigRows.map((peer) => (
                  <div key={peer.id} className={`${mutedPanelClassName} p-4`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className={compactTitleClassName}>{peer.id}</p>
                      <StatusPill tone={peer.authConfigured ? "accent" : "neutral"}>
                        {peer.authConfigured ? "Auth configured" : "No auth token"}
                      </StatusPill>
                    </div>
                    <p className={`mt-3 break-all ${supportingTextClassName}`}>{peer.url}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <StatusPill tone="neutral">
                        {peer.modelIds.length} observed model{peer.modelIds.length === 1 ? "" : "s"}
                      </StatusPill>
                      {peer.modelIds.length === 0 ? (
                        <StatusPill tone="warning">Config saved, no live model match</StatusPill>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Contract fields"
            description="Host contract fields that wire a peer into the runtime boundary."
          >
            <div className="space-y-3">
              {peerContractFields.map(([label, description]) => (
                <div key={label} className={`${mutedPanelClassName} p-3`}>
                  <p className={utilityLabelClassName}>{label}</p>
                  <p className={`mt-2 ${supportingTextClassName}`}>{description}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
