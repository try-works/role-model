import { useEffect, useMemo, useState } from "react";

import {
  EmptyState,
  ErrorState,
  FactCard,
  LoadingState,
  PageHeader,
  SectionCard,
  StatusPill,
} from "../components/page-primitives";
import { mutedPanelClassName, secondaryButtonClassName } from "../lib/design-system";
import { type RuntimeSnapshot, fetchRuntimeSnapshot } from "../lib/runtime-api";

export default function SystemPeersRoute() {
  const [snapshot, setSnapshot] = useState<RuntimeSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchRuntimeSnapshot()
      .then(setSnapshot)
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

  const peerModelCount = peerGroups.reduce((total, group) => total + group.modelIds.length, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="System"
        title="Peers"
        description="Keep peer-backed topology explicit: inventory first, then the peer contract fields and runtime policy notes that govern remote model sources."
        actions={
          <a className={secondaryButtonClassName} href="/api/role-model/runtime/summary">
            Runtime summary
          </a>
        }
      />

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

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <SectionCard
          title="Peer inventory"
          description="Inventory first: show explicit peer-backed model groups when they exist, otherwise keep the empty state explicit."
        >
          {!snapshot ? (
            <LoadingState label="Loading peer inventory…" />
          ) : peerGroups.length === 0 ? (
            <EmptyState label="No peers configured in the current host config." />
          ) : (
            <div className="space-y-4">
              {peerGroups.map((group) => (
                <div key={group.peerId} className={`${mutedPanelClassName} p-4`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-[var(--rm-fg)]">{group.peerId}</p>
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

        <SectionCard
          title="Peer contract fields"
          description="These fields come from the vendored host contract and define how a peer is wired into the runtime boundary."
        >
          <div className="grid gap-3 md:grid-cols-2">
            {[
              ["proxy", "Base URL to proxy peer requests through."],
              ["apiKey", "Optional peer-specific auth token passed to the remote target."],
              ["models", "The models served by that peer and exposed to the runtime."],
              ["filters", "Peer-local request filters or strip rules."],
              ["timeouts", "Proxy timeout settings applied to peer traffic."],
            ].map(([label, detail]) => (
              <div
                key={label}
                className={`${mutedPanelClassName} p-4 text-sm text-[var(--rm-secondary)]`}
              >
                <p className="font-medium text-[var(--rm-fg)]">{label}</p>
                <p className="mt-2">{detail}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Runtime policy boundary"
        description="Peer topology should stay explicit without duplicating the broader runtime health surface."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className={`${mutedPanelClassName} p-4 text-sm text-[var(--rm-secondary)]`}>
            <p className="font-medium text-[var(--rm-fg)]">Groups and matrix</p>
            <p className="mt-2">
              Peer posture belongs beside group and matrix policy notes so operators can reason
              about eviction, exclusivity, and remote sourcing together.
            </p>
          </div>
          <div className={`${mutedPanelClassName} p-4 text-sm text-[var(--rm-secondary)]`}>
            <p className="font-medium text-[var(--rm-fg)]">Empty-state rule</p>
            <p className="mt-2">
              When the host has no peers configured, the page still stays live by showing the
              explicit empty inventory plus the supported peer contract fields.
            </p>
          </div>
          <div className={`${mutedPanelClassName} p-4 text-sm text-[var(--rm-secondary)]`}>
            <p className="font-medium text-[var(--rm-fg)]">Raw diagnostics</p>
            <p className="mt-2">
              Route-local diagnostics belong on Runtime and Observe; this page stays focused on
              topology and contract posture.
            </p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
