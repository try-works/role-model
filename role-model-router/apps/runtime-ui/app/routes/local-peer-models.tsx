import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";

import { LocalModelRolePicker } from "../components/local-model-role-picker";
import {
  EmptyState,
  ErrorState,
  FactCard,
  LoadingState,
  SectionCard,
  StatusPill,
} from "../components/page-primitives";
import {
  fieldClassName,
  mutedPanelClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
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

  return (
    <div className="space-y-8">
      {error ? <ErrorState label={error} /> : null}

      {!peersReady ? (
        <>
          <FactCard
            label="Prerequisites"
            value="Configure peer endpoints first"
            detail="Configure at least one peer endpoint before registering models."
          />
          <Link to="/app/local/endpoints" className={primaryButtonClassName}>
            Open endpoints
          </Link>
        </>
      ) : null}

      {peersReady ? (
        <SectionCard
          title="Register model"
          description="Model ID must appear in GET /v1/models on a configured endpoint. Registration adds a router endpoint; it does not download weights."
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="peer-model-id"
                className="block text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--rm-muted)]"
              >
                Model ID
              </label>
              <input
                id="peer-model-id"
                type="text"
                value={loadModelId}
                onChange={(event) => setLoadModelId(event.target.value)}
                placeholder="lfm2.5-8b-a1b"
                className={fieldClassName}
              />
            </div>
            <LocalModelRolePicker
              rolePolicy={rolePolicy}
              selectedRoleIds={loadRoleIds}
              onChange={setLoadRoleIds}
              disabled={actioning.__register__}
            />
            <p className="text-sm text-[var(--rm-secondary)]">
              Roles determine which tasks and aliases may prefer this endpoint. Leave empty to
              register without role coverage.
            </p>
            <button
              type="button"
              onClick={handleRegister}
              disabled={!loadModelId.trim() || actioning.__register__}
              className={primaryButtonClassName}
            >
              {actioning.__register__ ? "Registering…" : "Register model"}
            </button>
          </div>
        </SectionCard>
      ) : null}

      <SectionCard
        title="Registered models"
        description="Models currently registered with the router from peer endpoints."
      >
        {loading && models.length === 0 ? (
          <LoadingState label="Refreshing peer models…" />
        ) : !peersReady ? (
          <EmptyState label="Configure peer endpoints before registering models." />
        ) : models.length === 0 ? (
          <EmptyState label="No peer models registered. Add a model ID above after configuring endpoints." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {models.map((model) => (
              <div key={model.modelId} className={`${mutedPanelClassName} p-5`}>
                <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                  <p className="break-words font-mono text-sm font-semibold text-[var(--rm-fg)]">
                    {model.modelId}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <StatusPill tone="neutral">Peer-backed</StatusPill>
                    <StatusPill tone="success">Registered</StatusPill>
                  </div>
                </div>
                <p className="mb-3 text-xs text-[var(--rm-muted)]">
                  Registered: {new Date(model.loadedAt).toLocaleString()}
                </p>
                <div className="mb-4 flex flex-wrap gap-2">
                  {(model.roleIds ?? []).length === 0 ? (
                    <StatusPill tone="warning">No roles</StatusPill>
                  ) : (
                    (model.roleIds ?? []).map((roleId) => (
                      <StatusPill key={roleId} tone="neutral">
                        {roleId}
                      </StatusPill>
                    ))
                  )}
                </div>
                <LocalModelRolePicker
                  rolePolicy={rolePolicy}
                  selectedRoleIds={draftRolesByModelId[model.modelId] ?? []}
                  onChange={(roleIds) =>
                    setDraftRolesByModelId((current) => ({
                      ...current,
                      [model.modelId]: [...roleIds],
                    }))
                  }
                  disabled={actioning[model.modelId]}
                />
                <div className="mt-4 flex flex-wrap gap-2">
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
                <p className="mt-4 text-xs text-[var(--rm-muted)]">
                  Loading and VRAM are controlled by your peer server. This page registers which
                  models the router may use.
                </p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
