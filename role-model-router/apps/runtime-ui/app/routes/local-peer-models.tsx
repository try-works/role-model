import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";

import { LocalModelRolePicker } from "../components/local-model-role-picker";
import { ErrorState, LoadingState, SectionCard, StatusPill } from "../components/page-primitives";
import {
  fieldClassName,
  inlineTitleClassName,
  mutedPanelClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
  supportingTextClassName,
  utilityLabelClassName,
} from "../lib/design-system";
import {
  type RuntimeLocalModel,
  type RuntimeRolePolicy,
  fetchPeerLocalModels,
  fetchPeers,
  fetchRolePolicy,
  loadPeerModel,
  setPeerModelRoles,
  unloadPeerModel,
} from "../lib/runtime-api";

export default function LocalPeerModelsRoute() {
  const [models, setModels] = useState<RuntimeLocalModel[]>([]);
  const [peers, setPeers] = useState<readonly { id: string; url: string }[]>([]);
  const [rolePolicy, setRolePolicy] = useState<RuntimeRolePolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actioning, setActioning] = useState<Record<string, boolean>>({});
  const [loadModelId, setLoadModelId] = useState("");
  const [loadRoleIds, setLoadRoleIds] = useState<readonly string[]>([]);
  const [draftRolesByModelId, setDraftRolesByModelId] = useState<Record<string, string[]>>({});

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [modelData, peerData, policy] = await Promise.all([
        fetchPeerLocalModels(),
        fetchPeers(),
        fetchRolePolicy(),
      ]);
      setModels([...modelData]);
      setPeers(peerData);
      setRolePolicy(policy);
      setDraftRolesByModelId(
        Object.fromEntries(modelData.map((model) => [model.modelId, [...(model.roleIds ?? [])]])),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load peer models");
    } finally {
      setHasLoadedOnce(true);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleRegister = async () => {
    const modelId = loadModelId.trim();
    if (!modelId) return;
    setActioning((prev) => ({ ...prev, __register__: true }));
    try {
      await loadPeerModel(modelId, loadRoleIds);
      setLoadModelId("");
      setLoadRoleIds([]);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to register ${modelId}`);
    } finally {
      setActioning((prev) => ({ ...prev, __register__: false }));
    }
  };

  const handleSaveRoles = async (modelId: string) => {
    setActioning((prev) => ({ ...prev, [modelId]: true }));
    try {
      await setPeerModelRoles(modelId, draftRolesByModelId[modelId] ?? []);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to save roles for ${modelId}`);
    } finally {
      setActioning((prev) => ({ ...prev, [modelId]: false }));
    }
  };

  const handleRemove = async (modelId: string) => {
    setActioning((prev) => ({ ...prev, [modelId]: true }));
    try {
      await unloadPeerModel(modelId);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to remove ${modelId}`);
    } finally {
      setActioning((prev) => ({ ...prev, [modelId]: false }));
    }
  };

  if (!hasLoadedOnce && loading) {
    return <LoadingState label="Loading peer models…" />;
  }

  const peersReady = peers.length > 0;
  const registerDisabled = !peersReady || !loadModelId.trim() || actioning.__register__;

  return (
    <div className="space-y-5">
      {error ? <ErrorState label={error} /> : null}

      <SectionCard
        title="Register model"
        description="Model ID must appear in the peer server catalog. Registration creates a router-visible endpoint without pretending the runtime owns the model process itself."
      >
        {peersReady ? (
          <div className="space-y-3">
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_auto]">
              <div className="space-y-2">
                <label htmlFor="peer-model-id" className={utilityLabelClassName}>
                  Model ID
                </label>
                <input
                  id="peer-model-id"
                  type="text"
                  value={loadModelId}
                  onChange={(event) => setLoadModelId(event.target.value)}
                  placeholder="openai/gpt-4.1"
                  className={fieldClassName}
                />
              </div>
              <div className="space-y-2">
                <p className={utilityLabelClassName}>Roles</p>
                <LocalModelRolePicker
                  rolePolicy={rolePolicy}
                  selectedRoleIds={loadRoleIds}
                  onChange={setLoadRoleIds}
                  disabled={actioning.__register__}
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleRegister}
                  disabled={registerDisabled}
                  className={primaryButtonClassName}
                >
                  {actioning.__register__ ? "Registering…" : "Register model"}
                </button>
              </div>
            </div>
            <p className={supportingTextClassName}>
              Roles determine which tasks and aliases may prefer this endpoint. Leave the role list
              empty to register the model without role coverage.
            </p>
          </div>
        ) : (
          <div
            className={`${mutedPanelClassName} flex flex-wrap items-center justify-between gap-4 p-4`}
          >
            <div className="space-y-1">
              <p className={inlineTitleClassName}>
                Open endpoints to start registering peer-backed models.
              </p>
              <p className={supportingTextClassName}>
                Configure at least one peer endpoint first, then register a model id from that peer
                catalog.
              </p>
            </div>
            <Link to="/app/local/endpoints" className={primaryButtonClassName}>
              Open endpoints
            </Link>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Registered models"
        description="Models currently registered with the router from peer endpoints."
      >
        {loading && models.length === 0 ? (
          <LoadingState label="Refreshing peer models…" />
        ) : !peersReady ? (
          <div className={`${mutedPanelClassName} p-4`}>
            <p className={inlineTitleClassName}>No peer models registered yet.</p>
            <p className={`${supportingTextClassName} mt-1`}>
              Add an endpoint above first, then register a model id from that peer catalog.
            </p>
          </div>
        ) : models.length === 0 ? (
          <div className={`${mutedPanelClassName} p-4`}>
            <p className={inlineTitleClassName}>No peer models registered yet.</p>
            <p className={`${supportingTextClassName} mt-1`}>
              Register a model id above to create a router-visible peer-backed endpoint.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {models.map((model) => {
              const roleIds = draftRolesByModelId[model.modelId] ?? [];
              const summaryParts = [model.proxyBaseUrl ?? model.checkEndpoint, model.engine].filter(
                Boolean,
              );

              return (
                <section key={model.modelId} className={`${mutedPanelClassName} space-y-4 p-4`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className={utilityLabelClassName}>
                        {model.localModelSource === "peer-backed" ? "Peer-backed" : "Registered"}
                      </p>
                      <p className="break-words font-mono text-[13px] leading-[18px] text-[var(--rm-fg)]">
                        {model.modelId}
                      </p>
                      <p className={supportingTextClassName}>
                        {`${summaryParts.length > 0 ? summaryParts.join(" • ") : "Peer endpoint"} • registered ${new Date(model.loadedAt).toLocaleString()}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap justify-end gap-2">
                      <StatusPill tone="accent">Registered</StatusPill>
                      {roleIds.length > 0 ? (
                        <StatusPill tone="neutral">{roleIds[0]}</StatusPill>
                      ) : (
                        <StatusPill tone="warning">No roles</StatusPill>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <StatusPill tone="neutral">{model.engine}</StatusPill>
                    {roleIds.length > 1 ? (
                      <StatusPill tone="neutral">{`${roleIds.length - 1} more roles`}</StatusPill>
                    ) : null}
                  </div>

                  <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
                    <div className="space-y-2">
                      <p className={utilityLabelClassName}>Assigned roles</p>
                      <LocalModelRolePicker
                        rolePolicy={rolePolicy}
                        selectedRoleIds={roleIds}
                        onChange={(nextRoleIds) =>
                          setDraftRolesByModelId((current) => ({
                            ...current,
                            [model.modelId]: [...nextRoleIds],
                          }))
                        }
                        disabled={actioning[model.modelId]}
                      />
                    </div>

                    <div className="flex flex-wrap gap-2 xl:justify-end">
                      <button
                        type="button"
                        onClick={() => handleSaveRoles(model.modelId)}
                        disabled={actioning[model.modelId]}
                        className={primaryButtonClassName}
                      >
                        Save roles
                      </button>
                      <button
                        type="button"
                        onClick={() => loadPeerModel(model.modelId).then(refresh)}
                        disabled={actioning[model.modelId]}
                        className={secondaryButtonClassName}
                      >
                        Re-register
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemove(model.modelId)}
                        disabled={actioning[model.modelId]}
                        className={secondaryButtonClassName}
                      >
                        Remove from router
                      </button>
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
