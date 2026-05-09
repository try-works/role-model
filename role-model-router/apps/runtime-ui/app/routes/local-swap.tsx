import { useEffect, useState } from "react";

import { PageHeader, SectionCard } from "../components/page-primitives";
import { mutedPanelClassName } from "../lib/design-system";

export default function LocalSwapRoute() {
  const [events, setEvents] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch from /api/role-model/local/swap
    setLoading(false);
  }, []);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Local"
        title="Swap history"
        description="Chronological log of model swap events."
      />

      <SectionCard title="Events">
        {loading ? (
          <p className="text-sm text-[var(--rm-muted)]">Loading...</p>
        ) : events.length === 0 ? (
          <div className={mutedPanelClassName}>
            <p className="text-sm text-[var(--rm-muted)]">
              No swap events recorded yet.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((event) => (
              <div key={String(event)} className={mutedPanelClassName}>
                <pre className="text-xs font-mono">{JSON.stringify(event, null, 2)}</pre>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
