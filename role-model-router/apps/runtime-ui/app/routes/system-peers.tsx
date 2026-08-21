import { MetricStrip } from "@role-model/ui";
import { useEffect, useMemo, useState } from "react";

import {
  Badge,
  EmptyState,
  ErrorState,
  LoadingState,
  SectionCard,
} from "../components/page-primitives";
import {
  monoEyebrowClassName,
  mutedPanelClassName,
  supportingTextClassName,
} from "../lib/design-system";
import { formatModelIdentity } from "../lib/effort-identity";
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
  const authReadyCount = peerConfigRows.filter((peer) => peer.authConfigured).length;
  const peerContractFields = [
    ["proxy", "Base URL to proxy peer requests through."],
    ["apiKey", "Optional peer-specific auth token passed to the remote target."],
    ["models", "The models served by that peer and exposed to the runtime."],
    ["filters · timeouts", "Peer-local request filters/strip rules and proxy timeouts."],
  ] as const;

  return (
    <div className="space-y-6">
      <MetricStrip
        aria-label="Peers summary"
        variant="panel"
        items={[
          { id: "peers", label: "Peers", value: String(peers?.length ?? peerGroups.length) },
          { id: "peer-models", label: "Peer models", value: String(peerModelCount) },
          {
            id: "runtime-models",
            label: "Runtime models",
            value: String(snapshot?.models.length ?? 0),
          },
          { id: "auth-ready", label: "Auth ready", value: String(authReadyCount) },
        ]}
      />

      {error ? <ErrorState label={error} /> : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]">
        <SectionCard
          title="Peer inventory"
          description="Peer-backed model groups observed in the current runtime listing."
        >
          {!snapshot || peers === null ? (
            <LoadingState label="Loading peer inventory…" />
          ) : peerGroups.length === 0 ? (
            <EmptyState label="No peers configured in the current host config." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr>
                    <th className={`pb-3 font-normal ${monoEyebrowClassName}`}>Peer</th>
                    <th className={`pb-3 font-normal ${monoEyebrowClassName}`}>Models</th>
                    <th className={`pb-3 font-normal ${monoEyebrowClassName}`}>Count</th>
                    <th className={`pb-3 font-normal ${monoEyebrowClassName}`}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {peerGroups.map((group) => (
                    <tr key={group.peerId} className="border-t border-[var(--rm-border)]">
                      <td className="py-3 font-mono text-[13px] font-semibold text-[var(--rm-fg)]">
                        {group.peerId}
                      </td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-2">
                          {group.modelIds.map((modelId) => {
                            const model = snapshot.models.find((entry) => entry.id === modelId);
                            return (
                              <span
                                key={modelId}
                                className="rounded-md border border-[var(--rm-border)] px-2 py-1 text-xs text-[var(--rm-fg)]"
                              >
                                {formatModelIdentity(model ?? { id: modelId }, modelId)}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-3 font-mono text-[12px] tabular-nums text-[var(--rm-muted)]">
                        {group.modelIds.length}
                      </td>
                      <td className="py-3">
                        <Badge tone="success">live</Badge>
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
                      <p className="font-mono text-[13px] font-semibold text-[var(--rm-fg)]">
                        {peer.id}
                      </p>
                      <Badge tone={peer.authConfigured ? "success" : "neutral"}>
                        {peer.authConfigured ? "auth configured" : "No auth token"}
                      </Badge>
                    </div>
                    <p
                      className={`mt-3 break-all font-mono text-[12px] ${supportingTextClassName}`}
                    >
                      {peer.url}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge tone="neutral">
                        {peer.modelIds.length} observed model{peer.modelIds.length === 1 ? "" : "s"}
                      </Badge>
                      {peer.modelIds.length === 0 ? (
                        <Badge tone="warning">Config saved, no live model match</Badge>
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
                  <p className={monoEyebrowClassName}>{label}</p>
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
