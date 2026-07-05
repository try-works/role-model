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
  utilityLabelClassName,
} from "../lib/design-system";
import {
  type PeerConfig,
  type RuntimeSnapshot,
  fetchPeers,
  fetchRuntimeSnapshot,
} from "../lib/runtime-api";

export default function SystemPeersRoute() {
  const [snapshot, setSnapshot] = useState<RuntimeSnapshot | null>(null);
  const [peers, setPeers] = useState<readonly PeerConfig[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([fetchRuntimeSnapshot(), fetchPeers()])
      .then(([nextSnapshot, nextPeers]) => {
        setSnapshot(nextSnapshot);
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
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <FactCard
          label="Configured peers"
          value={peerGroups.length}
          detail="Peer groups observed in the current runtime model list."
          emphasis
        />
        <FactCard
          label="Peer models"
          value={peerModelCount}
          detail="Models currently attributed to a peer source in the runtime listing."
        />
        <FactCard
          label="Runtime models"
          value={snapshot?.models.length ?? 0}
          detail="Total runtime-visible model count used as context for peer posture."
        />
      </div>

      {error ? <ErrorState label={error} /> : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.68fr)]">
        <SectionCard
          title="Peer inventory"
          description="Inventory first: show explicit peer-backed model groups when they exist, otherwise keep the empty state explicit."
        >
          {!snapshot || peers === null ? (
            <LoadingState label="Loading peer inventory…" />
          ) : peerGroups.length === 0 ? (
            <EmptyState label="No peers configured in the current host config." />
          ) : (
            <div className="space-y-4">
              {peerGroups.map((group) => (
                <div key={group.peerId} className={`${mutedPanelClassName} p-4`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className={compactTitleClassName}>{group.peerId}</p>
                    <StatusPill tone="accent">
                      {group.modelIds.length} model{group.modelIds.length === 1 ? "" : "s"}
                    </StatusPill>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {group.modelIds.map((modelId) => (
                      <StatusPill key={modelId} tone="neutral">
                        {modelId}
                      </StatusPill>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <div className="space-y-4">
          <SectionCard
            title="Peer config inventory"
            description="System owns peer source posture: configured proxy targets, auth state, and whether each peer currently contributes runtime-visible models."
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
            title="Peer contract fields"
            description="These fields come from the vendored host contract and define how a peer is wired into the runtime boundary."
          >
            <div className="space-y-3">
              {peerContractFields.map(([label, description]) => (
                <div key={label} className={`${mutedPanelClassName} p-3`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill tone="neutral">{label}</StatusPill>
                    <p className={utilityLabelClassName}>Peer contract field</p>
                  </div>
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
