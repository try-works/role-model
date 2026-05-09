import { useEffect, useState } from "react";

import { PageHeader, SectionCard } from "../components/page-primitives";
import { mutedPanelClassName } from "../lib/design-system";

export default function LocalPolicyRoute() {
  const [policy, setPolicy] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch from /api/role-model/local/policy
    setLoading(false);
  }, []);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Local"
        title="Host policy"
        description="Local inference runtime policy: TTL, auto-unload, and resource limits."
      />

      <SectionCard title="Policy">
        {loading ? (
          <p className="text-sm text-[var(--rm-muted)]">Loading...</p>
        ) : !policy ? (
          <div className={mutedPanelClassName}>
            <p className="text-sm text-[var(--rm-muted)]">
              No local policy configured.
            </p>
          </div>
        ) : (
          <div className={mutedPanelClassName}>
            <pre className="text-xs font-mono">{JSON.stringify(policy, null, 2)}</pre>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
