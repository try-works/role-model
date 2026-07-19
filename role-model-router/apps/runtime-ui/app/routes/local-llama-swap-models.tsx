import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";

import { LlamaSwapSetupHint, useLlamaSwapConfigStatus } from "../components/llama-swap-setup-hint";
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

export default function LocalLlamaSwapModelsRoute() {
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
    declaredModelIds.length > 0 ? declaredModelIds.join(", ") : "lfm2.5-8b-a1b";
  const loadRoleSummary = loadRoleIds.length > 0 ? loadRoleIds.join(", ") : "all roles";

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

  const handleLoadDraftModel = async () => {
    const modelId = loadModelId.trim();
    if (!modelId) return;
    setActioning((prev) => ({ ...prev, __load__: true }));
    try {
      await loadLlamaSwapModel(modelId, loadRoleIds);
      setLoadModelId("");
      setLoadRoleIds([]);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to load ${modelId}`);
    } finally {
      setActioning((prev) => ({ ...prev, __load__: false }));
    }
  };

  const handleUnload = async (modelId: string) => {
    setActioning((prev) => ({ ...prev, [modelId]: true }));
    try {
      await unloadLocalModel(modelId);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to unload ${modelId}`);
    } finally {
      setActioning((prev) => ({ ...prev, [modelId]: false }));
    }
  };

  return (
    <div className="space-y-5">
      {error ? <ErrorState label={error} /> : null}
      {!llamaSwapStatusLoading && llamaSwapStatus && !llamaSwapStatus.operational ? (
        <LlamaSwapSetupHint variant="prominent" status={llamaSwapStatus} />
      ) : null}

      <section className={`${mutedPanelClassName} space-y-2 p-5`}>
        <h2 className={inlineTitleClassName}>Llama-swap models</h2>
        <p className={supportingTextClassName}>
          Load a runtime-config-declared model, assign route roles, and manage the in-memory
          llama-swap inventory from this page.
        </p>
      </section>

      <SectionCard
        title="Load model"
        description="Model must already be declared in runtime config. Loading triggers llama-swap to start or swap to this model instead of inventing a separate registration flow."
      >
        <div className="space-y-3">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_220px_auto]">
            <div className="space-y-2">
              <label htmlFor="llama-swap-model-id" className={utilityLabelClassName}>
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
            </div>
            <div className="space-y-2">
              <p className={utilityLabelClassName}>Role summary</p>
              <div className={`${mutedPanelClassName} flex min-h-[44px] items-center px-4 py-3`}>
                <p className="break-words font-mono text-[13px] leading-[18px] text-[var(--rm-fg)]">
                  {`roles: ${loadRoleSummary}`}
                </p>
              </div>
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleLoadDraftModel}
                disabled={!loadModelId.trim() || actioning.__load__ || !llamaSwapOperational}
                className={primaryButtonClassName}
              >
                {actioning.__load__ ? "Loading…" : "Load model"}
              </button>
            </div>
          </div>

          {declaredModelIds.length > 0 ? (
            <p className={supportingTextClassName}>
              Declared in config: {declaredModelIds.join(", ")}
            </p>
          ) : null}

          <LocalModelRolePicker
            rolePolicy={rolePolicy}
            selectedRoleIds={loadRoleIds}
            onChange={setLoadRoleIds}
            disabled={actioning.__load__ || !llamaSwapOperational}
          />

          <p className={supportingTextClassName}>
            Assign roles before loading so routing can prefer this endpoint for matching tasks.
          </p>

          {!llamaSwapOperational ? (
            <p className={supportingTextClassName}>
              Load model stays disabled until runtime config declares a llama-swap model with a
              valid GGUF path. Open the setup guide above to copy the required scaffold.
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Link className={secondaryButtonClassName} to="/app/system/runtime-config">
              Open runtime config
            </Link>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Loaded models"
        description="Models currently resident in memory via llama-swap."
      >
        {loading && models.length === 0 ? (
          <LoadingState label="Loading llama-swap models…" />
        ) : models.length === 0 ? (
          <div className={`${mutedPanelClassName} p-4`}>
            <p className={inlineTitleClassName}>No llama-swap models loaded yet.</p>
            <p className={`${supportingTextClassName} mt-1`}>
              Load a configured model above to start or swap the in-memory runtime inventory.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {models.map((model) => {
              const roleIds = draftRolesByModelId[model.modelId] ?? [];
              const overrideDraft = editingOverrides[model.modelId];

              return (
                <section key={model.modelId} className={`${mutedPanelClassName} space-y-4 p-4`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className={utilityLabelClassName}>Llama-swap</p>
                      <p className="break-words font-mono text-[13px] leading-[18px] text-[var(--rm-fg)]">
                        {model.modelId}
                      </p>
                      <p className={supportingTextClassName}>
                        loaded • active in memory • role assignments ready
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap justify-end gap-2">
                      <StatusPill tone="accent">Loaded</StatusPill>
                      <StatusPill tone="neutral">
                        {roleIds.length === 0 ? "No roles" : `${roleIds.length} roles`}
                      </StatusPill>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {roleIds.length === 0 ? (
                      <StatusPill tone="neutral">No roles</StatusPill>
                    ) : (
                      roleIds.map((roleId) => (
                        <StatusPill key={roleId} tone="neutral">
                          {roleId}
                        </StatusPill>
                      ))
                    )}
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
                        disabled={actioning[`roles:${model.modelId}`]}
                      />
                    </div>

                    <div className="flex flex-wrap gap-2 xl:justify-end">
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
                        onClick={() => handleUnload(model.modelId)}
                        disabled={actioning[model.modelId]}
                        className={secondaryButtonClassName}
                      >
                        Unload
                      </button>
                    </div>
                  </div>

                  {overrideDraft ? (
                    <div
                      className={`${mutedPanelClassName} space-y-3 border border-[var(--rm-border)] p-4`}
                    >
                      <p className={utilityLabelClassName}>Overrides</p>
                      <div className="grid gap-2 sm:grid-cols-3">
                        <input
                          type="number"
                          placeholder="TTL"
                          value={overrideDraft.ttl ?? ""}
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
                          value={overrideDraft.contextWindow ?? ""}
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
                          value={overrideDraft.concurrencyLimit ?? ""}
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
                            [model.modelId]: overrideDraft ?? {},
                          };
                          await updateModelOverrides(next);
                          setOverrides(next);
                        }}
                      >
                        Save overrides
                      </button>
                    </div>
                  ) : null}
                </section>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
