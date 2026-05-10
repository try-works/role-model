import { useState } from "react";

import { PageHeader, SectionCard, EmptyState } from "../components/page-primitives";
import { fieldClassName, primaryButtonClassName } from "../lib/design-system";

interface PeerConfig {
  id: string;
  url: string;
  authToken: string;
  health: "healthy" | "unhealthy" | "unknown";
}

export default function LocalPeersRoute() {
  const [peers] = useState<readonly PeerConfig[]>([]);
  const [newUrl, setNewUrl] = useState("");
  const [newToken, setNewToken] = useState("");

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Local"
        title="Peer instances"
        description="Peer llama-swap instance inventory and management."
      />

      <SectionCard title="Peer inventory" description="Configured peer llama-swap instances.">
        {peers.length === 0 ? (
          <EmptyState label="No peers configured. Add a peer instance below." />
        ) : (
          <div className="space-y-3">
            {peers.map((peer) => (
              <div
                key={peer.id}
                className="flex items-center justify-between border border-[var(--rm-border)] bg-[var(--rm-surface)] p-4"
              >
                <div className="space-y-1">
                  <div className="font-mono text-sm text-[var(--rm-fg)]">{peer.url}</div>
                  <div className="text-xs text-[var(--rm-muted)]">Status: {peer.health}</div>
                </div>
                <button className="text-xs uppercase tracking-wider text-[var(--rm-accent)] hover:underline">
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Add peer" description="Register a new peer llama-swap instance.">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--rm-muted)]">
              Peer URL
            </label>
            <input
              type="url"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="http://192.168.1.100:8080"
              className={fieldClassName}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--rm-muted)]">
              Auth token (optional)
            </label>
            <input
              type="password"
              value={newToken}
              onChange={(e) => setNewToken(e.target.value)}
              placeholder="Bearer token"
              className={fieldClassName}
            />
          </div>
          <button className={primaryButtonClassName}>Add peer</button>
        </div>
      </SectionCard>
    </div>
  );
}
