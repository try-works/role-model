import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";

import { LlamaSwapSetupHint, useLlamaSwapConfigStatus } from "../components/llama-swap-setup-hint";
import { LocalModelRolePicker } from "../components/local-model-role-picker";
import {
  EmptyState,
  ErrorState,
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
import { usePageActions } from "../lib/shell-header-context";
import {
  type ModelOverride,
  type RuntimeLocalModel,
  type RuntimeRolePolicy,
  fetchLlamaSwapLocalModels,
  fetchModelOverrides,
  fetchRolePolicy,
  loadLlamaSwapModel,
  setLlamaSwapModelRoles,
  unloadLocalModel,
  updateModelOverrides,
} from "../lib/runtime-api";

type ModelViewMode = "list" | "grid";

export default function LocalLlamaSwapModelsRoute() {
  const [searchParams, setSearchParams] = useSearchParams();
  const viewMode: ModelViewMode = searchParams.get("view") === "grid" ? "grid" : "list";
  const [models, setModels] = useState<RuntimeLocalModel[]>([]);
  const [rolePolicy, setRolePolicy] = useState<RuntimeRolePolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioning, setActioning] = useState<Record<string, boolean>>({});
  const [loadModelId, setLoadModelId] = useState("");
  const [loadRoleIds, setLoadRoleIds] = useState<readonly string[]>([]);
  const [draftRolesByModelId, setDraftRolesByModelId] = useState<Record<string, string[]>>({});
  const [overrides, setOverrides] = useState<Record<string, ModelOverride>>({});
  const [editingOverrides, setEditingOverrides] = useState<Record<string, ModelOverride>>({});
  const { status: llamaSwapStatus, loading: llamaSwapStatusLoading } = useLlamaSwapConfigStatus();
  const llamaSwapOperational = llamaSwapStatus?.operational ?? false;
  const declaredModelIds = llamaSwapStatus?.declaredModelIds ?? [];
  const loadPlaceholder =
    declaredModelIds.length > 0
      ? declaredModelIds.join(", ")
      : "lfm2.5-8b-a1b";

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [modelData, policy, overrideData] = await Promise.all([
        fetchLlamaSwapLocalModels(),
        fetchRolePolicy(),
        fetchModelOverrides(),
      ]);
      setModels([...modelData]);
      setRolePolicy(policy);
      setOverrides({ ...overrideData });
      setEditingOverrides({ ...overrideData });
      setDraftRolesByModelId(
        Object.fromEntries(modelData.map((model) => [model.modelId, [...(model.roleIds ?? [])]])),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load llama-swap models");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  usePageActions(
    <button
      type="button"
      onClick={refresh}
      disabled={loading}
      className={secondaryButtonClassName}
    >
      {loading ? "Refreshing…" : "Refresh"}
    </button>,
    [loading, refresh],
  );

  const handleLoad = async (modelId: string, roleIds?: readonly string[]) => {
    setActioning((prev) => ({ ...prev, [modelId]: true }));
    try {
      await loadLlamaSwapModel(modelId, roleIds);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to load ${modelId}`);
    } finally {
      setActioning((prev) => ({ ...prev, [modelId]: false }));
    }
  };

  const handleSaveRoles = async (modelId: string) => {
    setActioning((prev) => ({ ...prev, [`roles:${modelId}`]: true }));
    try {
      await setLlamaSwapModelRoles(modelId, draftRolesByModelId[modelId] ?? []);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to save roles for ${modelId}`);
    } finally {
      setActioning((prev) => ({ ...prev, [`roles:${modelId}`]: false }));
    }
  };

  return (
    <div className="space-y-8">
      {error ? <ErrorState label={error} /> : null}
      {!llamaSwapStatusLoading && llamaSwapStatus && !llamaSwapStatus.operational ? (
        <LlamaSwapSetupHint variant="prominent" status={llamaSwapStatus} />
      ) : null}

      <SectionCard
        title="Load model"
        description="Model must be declared in runtime config. Loading triggers llama-swap to start or swap to this model."
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="llama-swap-model-id"
              className="block text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--rm-muted)]"
            >
              Model ID
            </label>
            <input
              id="llama-swap-model-id"
              type="text"
              value={loadModelId}
              onChange={(event) => setLoadModelId(event.target.value)}
              placeholder={loadPlaceholder}
              className={fieldClassName}
            />
            {declaredModelIds.length > 0 ? (
              <p className="text-sm text-[var(--rm-secondary)]">
                Declared in config: {declaredModelIds.join(", ")}
              </p>
            ) : null}
          </div>
          <LocalModelRolePicker
            rolePolicy={rolePolicy}
            selectedRoleIds={loadRoleIds}
            onChange={setLoadRoleIds}
            disabled={actioning.__load__ || !llamaSwapOperational}
          />
          <p className="text-sm text-[var(--rm-secondary)]">
            Assign roles before loading so routing can prefer this endpoint for matching tasks.
          </p>
          {!llamaSwapOperational ? (
            <p className="text-sm text-[var(--rm-secondary)]">
              Load model stays disabled until runtime config declares a llama-swap model with a valid
              GGUF path. Open Setup guide above to copy the scaffold.
            </p>
          ) : null}
          <button
            type="button"
            onClick={async () => {
              const modelId = loadModelId.trim();
              if (!modelId) return;
              setActioning((prev) => ({ ...prev, __load__: true }));
              try {
                await loadLlamaSwapModel(modelId, loadRoleIds);
                setLoadModelId("");
                setLoadRoleIds([]);
                await refresh();
              } finally {
                setActioning((prev) => ({ ...prev, __load__: false }));
              }
            }}
            disabled={!loadModelId.trim() || actioning.__load__ || !llamaSwapOperational}
            className={primaryButtonClassName}
          >
            {actioning.__load__ ? "Loading…" : "Load model"}
          </button>
          <Link className={secondaryButtonClassName} to="/app/system/runtime-config">
            Open runtime config
          </Link>
        </div>
      </SectionCard>

      <SectionCard title="Loaded models" description="Models currently in memory via llama-swap.">
        <div className="mb-4 flex gap-2">
          <button
            type="button"
            className={viewMode === "list" ? primaryButtonClassName : secondaryButtonClassName}
            onClick={() => setSearchParams({})}
          >
            List
          </button>
          <button
            type="button"
            className={viewMode === "grid" ? primaryButtonClassName : secondaryButtonClassName}
            onClick={() => setSearchParams({ view: "grid" })}
          >
            Grid
          </button>
          <Link className={secondaryButtonClassName} to="/app/local/llama-swap/matrix">
            Open matrix
          </Link>
        </div>
        {loading && models.length === 0 ? (
          <LoadingState label="Loading llama-swap models…" />
        ) : models.length === 0 ? (
          <EmptyState label="No llama-swap models loaded. Load a configured model above." />
        ) : (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
                : "grid gap-4 md:grid-cols-2 xl:grid-cols-3"
            }
          >
            {models.map((model) => (
              <div key={model.modelId} className={`${mutedPanelClassName} p-5`}>
                <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                  <p className="break-words font-mono text-sm font-medium text-[var(--rm-fg)]">
                    {model.modelId}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <StatusPill tone="neutral">Llama-swap</StatusPill>
                    <StatusPill tone="success">Loaded</StatusPill>
                  </div>
                </div>
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
                  disabled={actioning[`roles:${model.modelId}`]}
                />
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleSaveRoles(model.modelId)}
                    disabled={actioning[`roles:${model.modelId}`]}
                    className={primaryButtonClassName}
                  >
                    Save roles
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoad(model.modelId)}
                    disabled={actioning[model.modelId]}
                    className={secondaryButtonClassName}
                  >
                    Reload
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setActioning((prev) => ({ ...prev, [model.modelId]: true }));
                      try {
                        await unloadLocalModel(model.modelId);
                        await refresh();
                      } finally {
                        setActioning((prev) => ({ ...prev, [model.modelId]: false }));
                      }
                    }}
                    disabled={actioning[model.modelId]}
                    className={secondaryButtonClassName}
                  >
                    Unload
                  </button>
                </div>
                {editingOverrides[model.modelId] ? (
                  <div className="mt-4 space-y-2 border border-[var(--rm-border)] p-3">
                    <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--rm-muted)]">
                      Overrides
                    </p>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <input
                        type="number"
                        placeholder="TTL"
                        value={editingOverrides[model.modelId]?.ttl ?? ""}
                        onChange={(event) =>
                          setEditingOverrides((current) => ({
                            ...current,
                            [model.modelId]: {
                              ...current[model.modelId],
                              ttl: event.target.value ? Number(event.target.value) : undefined,
                            },
                          }))
                        }
                        className={fieldClassName}
                      />
                      <input
                        type="number"
                        placeholder="Context window"
                        value={editingOverrides[model.modelId]?.contextWindow ?? ""}
                        onChange={(event) =>
                          setEditingOverrides((current) => ({
                            ...current,
                            [model.modelId]: {
                              ...current[model.modelId],
                              contextWindow: event.target.value
                                ? Number(event.target.value)
                                : undefined,
                            },
                          }))
                        }
                        className={fieldClassName}
                      />
                      <input
                        type="number"
                        placeholder="Concurrency"
                        value={editingOverrides[model.modelId]?.concurrencyLimit ?? ""}
                        onChange={(event) =>
                          setEditingOverrides((current) => ({
                            ...current,
                            [model.modelId]: {
                              ...current[model.modelId],
                              concurrencyLimit: event.target.value
                                ? Number(event.target.value)
                                : undefined,
                            },
                          }))
                        }
                        className={fieldClassName}
                      />
                    </div>
                    <button
                      type="button"
                      className={secondaryButtonClassName}
                      onClick={async () => {
                        const next = {
                          ...overrides,
                          [model.modelId]: editingOverrides[model.modelId] ?? {},
                        };
                        await updateModelOverrides(next);
                        setOverrides(next);
                      }}
                    >
                      Save overrides
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
