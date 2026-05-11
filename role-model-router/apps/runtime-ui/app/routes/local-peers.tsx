import { useCallback, useEffect, useState } from "react";

import { PageHeader, SectionCard, EmptyState, LoadingState, ErrorState } from "../components/page-primitives";
import { fieldClassName, primaryButtonClassName, secondaryButtonClassName } from "../lib/design-system";
import { fetchPeers, updatePeers, checkPeerHealth } from "../lib/runtime-api";

interface PeerConfig {
  id: string;
  url: string;
  authToken?: string;
}

export default function LocalPeersRoute() {
  const [peers, setPeers] = useState<readonly PeerConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newToken, setNewToken] = useState("");
  const [healthStatus, setHealthStatus] = useState<Record<string, boolean | null>>({});
  const [checkingHealth, setCheckingHealth] = useState<Record<string, boolean>>({});

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPeers();
      setPeers([...data]);
      const status: Record<string, boolean | null> = {};
      for (const peer of data) {
        status[peer.id] = healthStatus[peer.id] ?? null;
      }
      setHealthStatus(status);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load peers");
    } finally {
      setLoading(false);
    }
  }, [healthStatus]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleAdd = async () => {
    if (!newUrl.trim()) return;
    setSaving(true);
    try {
      const next = [
        ...peers,
        {
          id: crypto.randomUUID(),
          url: newUrl.trim(),
          authToken: newToken.trim() || undefined,
        },
      ];
      const saved = await updatePeers(next);
      setPeers([...saved]);
      setNewUrl("");
      setNewToken("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add peer");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: string) => {
    setSaving(true);
    try {
      const next = peers.filter((p) => p.id !== id);
      const saved = await updatePeers(next);
      setPeers([...saved]);
      setHealthStatus((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove peer");
    } finally {
      setSaving(false);
    }
  };

  const handleCheckHealth = async (peer: PeerConfig) => {
    setCheckingHealth((prev) => ({ ...prev, [peer.id]: true }));
    try {
      const result = await checkPeerHealth(peer.url);
      setHealthStatus((prev) => ({ ...prev, [peer.id]: result.healthy }));
    } catch {
      setHealthStatus((prev) => ({ ...prev, [peer.id]: false }));
    } finally {
      setCheckingHealth((prev) => ({ ...prev, [peer.id]: false }));
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Local"
        title="Peer instances"
        description="Peer llama-swap instance inventory and management."
        actions={
          <button onClick={refresh} disabled={loading} className={secondaryButtonClassName}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        }
      />

      {error ? <ErrorState label={error} /> : null}

      <SectionCard title="Peer inventory" description="Configured peer llama-swap instances.">
        {loading && peers.length === 0 ? (
          <LoadingState label="Loading peers…" />
        ) : peers.length === 0 ? (
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
                  <div className="flex items-center gap-2 text-xs text-[var(--rm-muted)]">
                    <span>
                      Status:{" "}
                      {healthStatus[peer.id] === null || healthStatus[peer.id] === undefined
                        ? "unknown"
                        : healthStatus[peer.id]
                          ? "healthy"
                          : "unhealthy"}
                    </span>
                    {healthStatus[peer.id] === true && (
                      <span className="inline-block h-2 w-2 rounded-full bg-[var(--rm-success)]" />
                    )}
                    {healthStatus[peer.id] === false && (
                      <span className="inline-block h-2 w-2 rounded-full bg-[var(--rm-error)]" />
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCheckHealth(peer)}
                    disabled={checkingHealth[peer.id]}
                    className={secondaryButtonClassName}
                  >
                    {checkingHealth[peer.id] ? "Checking…" : "Check health"}
                  </button>
                  <button
                    onClick={() => handleRemove(peer.id)}
                    disabled={saving}
                    className={`${secondaryButtonClassName} text-[var(--rm-error)]`}
                  >
                    Remove
                  </button>
                </div>
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
          <button onClick={handleAdd} disabled={!newUrl.trim() || saving} className={primaryButtonClassName}>
            {saving ? "Saving…" : "Add peer"}
          </button>
        </div>
      </SectionCard>
    </div>
  );
}
