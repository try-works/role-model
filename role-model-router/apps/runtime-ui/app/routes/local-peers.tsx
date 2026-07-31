import { useCallback, useEffect, useState } from "react";

import {
  EmptyState,
  ErrorState,
  LoadingState,
  SectionCard,
  StatusPill,
} from "../components/page-primitives";
import {
  fieldClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
  supportingTextClassName,
  utilityLabelClassName,
} from "../lib/design-system";
import { checkPeerHealth, fetchPeers, updatePeers } from "../lib/runtime-api";

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
      setHealthStatus((previousStatus) => {
        const status: Record<string, boolean | null> = {};
        for (const peer of data) {
          status[peer.id] = previousStatus[peer.id] ?? null;
        }
        return status;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load peers");
    } finally {
      setLoading(false);
    }
  }, []);

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
      {error ? <ErrorState label={error} /> : null}

      <SectionCard
        title="Endpoint inventory"
        description="role-model probes each server at /v1/models before peer models can be registered."
      >
        {loading && peers.length === 0 ? (
          <LoadingState label="Loading local endpoints…" />
        ) : peers.length === 0 ? (
          <EmptyState label="No peer endpoints configured. Add a server URL below to use peer-backed local models." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--rm-border)]">
                  <th className={`${utilityLabelClassName} px-3 py-2.5 font-medium`}>Endpoint</th>
                  <th className={`${utilityLabelClassName} px-3 py-2.5 font-medium`}>Status</th>
                  <th className={`${utilityLabelClassName} px-3 py-2.5 font-medium`}>Type</th>
                  <th className={`${utilityLabelClassName} px-3 py-2.5 font-medium`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {peers.map((peer) => {
                  const status =
                    healthStatus[peer.id] === null || healthStatus[peer.id] === undefined
                      ? "unknown"
                      : healthStatus[peer.id]
                        ? "healthy"
                        : "unhealthy";
                  return (
                    <tr key={peer.id} className="border-b border-[var(--rm-border)] last:border-b-0">
                      <td className="px-3 py-3 font-mono text-[13px] text-[var(--rm-fg)]">
                        {peer.url}
                      </td>
                      <td className="px-3 py-3">
                        <StatusPill
                          tone={
                            status === "healthy"
                              ? "success"
                              : status === "unknown"
                                ? "neutral"
                                : "warning"
                          }
                        >
                          {status}
                        </StatusPill>
                      </td>
                      <td className={`px-3 py-3 ${supportingTextClassName}`}>
                        OpenAI-compatible peer
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleCheckHealth(peer)}
                            disabled={checkingHealth[peer.id]}
                            className={secondaryButtonClassName}
                          >
                            {checkingHealth[peer.id] ? "Checking…" : "Check health"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemove(peer.id)}
                            disabled={saving}
                            className={`${secondaryButtonClassName} text-[var(--rm-error)]`}
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Add peer endpoint">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-2">
              <label htmlFor="peer-url" className={utilityLabelClassName}>
                Endpoint URL
              </label>
              <input
                id="peer-url"
                type="url"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="http://127.0.0.1:1234"
                className={fieldClassName}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="peer-auth-token" className={utilityLabelClassName}>
                Auth token (optional)
              </label>
              <input
                id="peer-auth-token"
                type="password"
                value={newToken}
                onChange={(e) => setNewToken(e.target.value)}
                placeholder="Bearer token (optional)"
                className={fieldClassName}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!newUrl.trim() || saving}
            className={primaryButtonClassName}
          >
            {saving ? "Saving…" : "Add endpoint"}
          </button>
        </div>
      </SectionCard>
    </div>
  );
}
