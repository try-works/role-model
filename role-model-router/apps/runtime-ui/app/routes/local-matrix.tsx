import { useCallback, useEffect, useState } from "react";

import { PageHeader, SectionCard, EmptyState, LoadingState, ErrorState } from "../components/page-primitives";
import { fetchLocalModels } from "../lib/runtime-api";

interface LocalModel {
  modelId: string;
  loadedAt: string;
  engine: string;
}

export default function LocalMatrixRoute() {
  const [models, setModels] = useState<readonly LocalModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLocalModels();
      setModels(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load model matrix");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Local"
        title="Model matrix"
        description="Concurrent model grid showing loaded state, engine, and resource usage."
      />

      {error ? <ErrorState label={error} /> : null}

      <SectionCard title="Loaded model matrix" description="Currently loaded local inference models.">
        {loading ? (
          <LoadingState label="Loading matrix…" />
        ) : models.length === 0 ? (
          <EmptyState label="No models loaded. Load a model from the Models page." />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {models.map((model) => (
              <div
                key={model.modelId}
                className="border border-[var(--rm-border)] bg-[var(--rm-surface)] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-wider text-[var(--rm-accent)]">
                    {model.engine}
                  </span>
                  <span className="bg-[var(--rm-accent)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white">
                    Active
                  </span>
                </div>
                <div className="mb-2 font-mono text-sm text-[var(--rm-fg)]">{model.modelId}</div>
                <div className="text-xs text-[var(--rm-muted)]">
                  Loaded: {new Date(model.loadedAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
