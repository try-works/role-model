import { useCallback, useEffect, useState } from "react";

import { PageHeader, SectionCard, StatusPill, EmptyState, LoadingState, ErrorState } from "../components/page-primitives";
import { mutedPanelClassName, primaryButtonClassName, secondaryButtonClassName } from "../lib/design-system";
import { fetchLocalModels, loadLocalModel, unloadLocalModel } from "../lib/runtime-api";

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

  useEffect(() => {
    refresh();
  }, [refresh]);

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
    </div>
  );
}
