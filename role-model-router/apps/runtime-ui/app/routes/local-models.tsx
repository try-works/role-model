import { useEffect, useState } from "react";

import { PageHeader, SectionCard } from "../components/page-primitives";
import { mutedPanelClassName } from "../lib/design-system";

export default function LocalModelsRoute() {
  const [loadedModels, setLoadedModels] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch from /api/role-model/local/models
    setLoading(false);
  }, []);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Local"
        title="Loaded models"
        description="Currently loaded local inference models and manual load/unload controls."
      />

      <SectionCard title="Runtime state">
        {loading ? (
          <p className="text-sm text-[var(--rm-muted)]">Loading...</p>
        ) : loadedModels.length === 0 ? (
          <div className={mutedPanelClassName}>
            <p className="text-sm text-[var(--rm-muted)]">
              No models currently loaded. Send a request or load a model manually.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {loadedModels.map((model) => (
              <div key={String(model)} className={mutedPanelClassName}>
                <pre className="text-xs font-mono">{JSON.stringify(model, null, 2)}</pre>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
