import { useCallback, useEffect, useState } from "react";

import { PageHeader, SectionCard, StatusPill, EmptyState, LoadingState, ErrorState } from "../components/page-primitives";
import { mutedPanelClassName, primaryButtonClassName, secondaryButtonClassName, fieldClassName } from "../lib/design-system";
import { fetchLocalModels, loadLocalModel, unloadLocalModel, fetchModelOverrides, updateModelOverrides, type ModelOverride } from "../lib/runtime-api";

interface LocalModel {
  modelId: string;
  loadedAt: string;
  engine: string;
}

export default function LocalModelsRoute() {
  const [models, setModels] = useState<LocalModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioning, setActioning] = useState<Record<string, boolean>>({});

  const [overrides, setOverrides] = useState<Record<string, ModelOverride>>({});
  const [overrideLoading, setOverrideLoading] = useState(true);
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [editingOverrides, setEditingOverrides] = useState<Record<string, ModelOverride>>({});
  const [savingOverrides, setSavingOverrides] = useState(false);
  const [newModelId, setNewModelId] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLocalModels();
      setModels([...data]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load local models");
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshOverrides = useCallback(async () => {
    setOverrideLoading(true);
    setOverrideError(null);
    try {
      const data = await fetchModelOverrides();
      setOverrides({ ...data });
      setEditingOverrides({ ...data });
    } catch (err) {
      setOverrideError(err instanceof Error ? err.message : "Failed to load model overrides");
    } finally {
      setOverrideLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    refreshOverrides();
  }, [refresh, refreshOverrides]);

  const handleLoad = async (modelId: string) => {
    setActioning((prev) => ({ ...prev, [modelId]: true }));
    try {
      await loadLocalModel(modelId);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to load ${modelId}`);
    } finally {
      setActioning((prev) => ({ ...prev, [modelId]: false }));
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
    <div className="space-y-8">
      <PageHeader
        eyebrow="Local"
        title="Loaded models"
        description="Currently loaded local inference models and manual load/unload controls."
        actions={
          <button
            onClick={refresh}
            disabled={loading}
            className={secondaryButtonClassName}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        }
      />

      {error ? <ErrorState label={error} /> : null}

      <SectionCard title="Runtime state" description="Models currently resident in local inference memory.">
        {loading && models.length === 0 ? (
          <LoadingState label="Loading local model state…" />
        ) : models.length === 0 ? (
          <EmptyState label="No models currently loaded. Send a request or load a model manually." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {models.map((model) => (
              <div key={model.modelId} className={`${mutedPanelClassName} p-5`}>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--rm-muted)]">
                      Model
                    </p>
                    <p className="mt-1 break-words font-mono text-sm font-medium text-[var(--rm-fg)]">
                      {model.modelId}
                    </p>
                  </div>
                  <StatusPill tone="success">Loaded</StatusPill>
                </div>

                <div className="mb-4 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--rm-muted)]">
                      Engine
                    </p>
                    <p className="mt-1 text-sm text-[var(--rm-secondary)]">{model.engine}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--rm-muted)]">
                      Loaded at
                    </p>
                    <p className="mt-1 text-sm text-[var(--rm-secondary)]">
                      {new Date(model.loadedAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleLoad(model.modelId)}
                    disabled={actioning[model.modelId]}
                    className={primaryButtonClassName}
                  >
                    {actioning[model.modelId] ? "Working…" : "Reload"}
                  </button>
                  <button
                    onClick={() => handleUnload(model.modelId)}
                    disabled={actioning[model.modelId]}
                    className={secondaryButtonClassName}
                  >
                    Unload
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Quick actions" description="Global model lifecycle controls.">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={async () => {
              setActioning((prev) => ({ ...prev, "__all__": true }));
              try {
                await unloadLocalModel();
                await refresh();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to unload all models");
              } finally {
                setActioning((prev) => ({ ...prev, "__all__": false }));
              }
            }}
            disabled={actioning["__all__"]}
            className={secondaryButtonClassName}
          >
            {actioning["__all__"] ? "Unloading…" : "Unload all models"}
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Model overrides" description="Per-model runtime parameter overrides (TTL, context window, concurrency).">
        {overrideError ? <ErrorState label={overrideError} /> : null}

        {overrideLoading && Object.keys(overrides).length === 0 ? (
          <LoadingState label="Loading model overrides…" />
        ) : Object.keys(overrides).length === 0 && Object.keys(editingOverrides).length === 0 ? (
          <EmptyState label="No model overrides configured. Add an override below." />
        ) : (
          <div className="space-y-3">
            {(Object.keys(editingOverrides).length > 0 ? Object.keys(editingOverrides) : Object.keys(overrides)).map((modelId) => (
              <div key={modelId} className={`${mutedPanelClassName} p-4`}>
                <div className="mb-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--rm-muted)]">
                    Model ID
                  </p>
                  <p className="mt-1 break-words font-mono text-sm font-medium text-[var(--rm-fg)]">
                    {modelId}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--rm-muted)]">
                      TTL (seconds)
                    </label>
                    <input
                      type="number"
                      value={editingOverrides[modelId]?.ttl ?? ""}
                      onChange={(e) =>
                        setEditingOverrides((prev) => ({
                          ...prev,
                          [modelId]: { ...prev[modelId], ttl: e.target.value ? Number(e.target.value) : undefined },
                        }))
                      }
                      placeholder="Default"
                      className={fieldClassName}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--rm-muted)]">
                      Context window
                    </label>
                    <input
                      type="number"
                      value={editingOverrides[modelId]?.contextWindow ?? ""}
                      onChange={(e) =>
                        setEditingOverrides((prev) => ({
                          ...prev,
                          [modelId]: { ...prev[modelId], contextWindow: e.target.value ? Number(e.target.value) : undefined },
                        }))
                      }
                      placeholder="Default"
                      className={fieldClassName}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--rm-muted)]">
                      Concurrency limit
                    </label>
                    <input
                      type="number"
                      value={editingOverrides[modelId]?.concurrencyLimit ?? ""}
                      onChange={(e) =>
                        setEditingOverrides((prev) => ({
                          ...prev,
                          [modelId]: { ...prev[modelId], concurrencyLimit: e.target.value ? Number(e.target.value) : undefined },
                        }))
                      }
                      placeholder="Default"
                      className={fieldClassName}
                    />
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={async () => {
                      setSavingOverrides(true);
                      try {
                        const next = { ...overrides };
                        if (editingOverrides[modelId]) {
                          next[modelId] = editingOverrides[modelId];
                        }
                        await updateModelOverrides(next);
                        setOverrides(next);
                        setEditingOverrides((prev) => {
                          const copy = { ...prev };
                          delete copy[modelId];
                          return copy;
                        });
                      } catch (err) {
                        setOverrideError(err instanceof Error ? err.message : "Failed to save override");
                      } finally {
                        setSavingOverrides(false);
                      }
                    }}
                    disabled={savingOverrides}
                    className={primaryButtonClassName}
                  >
                    Save
                  </button>
                  <button
                    onClick={() =>
                      setEditingOverrides((prev) => {
                        const copy = { ...prev };
                        delete copy[modelId];
                        return copy;
                      })
                    }
                    className={secondaryButtonClassName}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      setSavingOverrides(true);
                      try {
                        const next = { ...overrides };
                        delete next[modelId];
                        await updateModelOverrides(next);
                        setOverrides(next);
                      } catch (err) {
                        setOverrideError(err instanceof Error ? err.message : "Failed to delete override");
                      } finally {
                        setSavingOverrides(false);
                      }
                    }}
                    disabled={savingOverrides}
                    className={`${secondaryButtonClassName} ml-auto`}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <input
            type="text"
            value={newModelId}
            onChange={(e) => setNewModelId(e.target.value)}
            placeholder="Enter model ID to add override…"
            className={fieldClassName}
          />
          <button
            onClick={() => {
              if (!newModelId.trim()) return;
              setEditingOverrides((prev) => ({
                ...prev,
                [newModelId.trim()]: { ttl: undefined, contextWindow: undefined, concurrencyLimit: undefined },
              }));
              setNewModelId("");
            }}
            disabled={!newModelId.trim()}
            className={primaryButtonClassName}
          >
            Add override
          </button>
        </div>
      </SectionCard>
    </div>
  );
}
