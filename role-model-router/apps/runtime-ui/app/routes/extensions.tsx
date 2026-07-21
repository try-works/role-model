import { useEffect, useMemo, useState } from "react";

import { EmptyState, ErrorState, FactCard, LoadingState, SectionCard, StatusPill } from "../components/page-primitives";
import { compactTitleClassName, mutedPanelClassName, supportingTextClassName, utilityLabelClassName } from "../lib/design-system";
import { fetchExtensions, type RuntimeExtensionStatus } from "../lib/runtime-api";

export function ExtensionsRouteView() {
  const [extensions, setExtensions] = useState<readonly RuntimeExtensionStatus[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchExtensions().then(setExtensions).catch((value: unknown) => setError(value instanceof Error ? value.message : "Could not load the extension boundary."));
  }, []);

  const facts = useMemo(() => {
    const rows = extensions ?? [];
    return {
      installed: rows.filter((row) => row.installed).length,
      ready: rows.filter((row) => row.lifecycle === "ready").length,
      degraded: rows.filter((row) => row.lifecycle === "degraded").length,
    };
  }, [extensions]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <FactCard label="Installed extensions" value={facts.installed} detail="Canonical packages present in this release pair." emphasis />
        <FactCard label="Ready workers" value={facts.ready} detail="Workers that passed lifecycle and health gates." />
        <FactCard label="Degraded" value={facts.degraded} detail="Bounded failures that do not interrupt routing." />
        <FactCard label="Router posture" value="Available" detail="Routing remains available when every extension is disabled or degraded." />
      </div>

      {error ? <ErrorState label={error} /> : null}
      <SectionCard title="Extension boundary" description="Lifecycle state is separate from installation, permissions, contribution tier, upload authorization, training, and export policy.">
        {extensions === null ? <LoadingState label="Loading extension lifecycle…" /> : extensions.length === 0 ? <EmptyState label="No extension packages are installed." /> : (
          <div className="grid gap-4 lg:grid-cols-2">
            {extensions.map((extension) => (
              <article className={`${mutedPanelClassName} min-w-0 p-4 md:p-5`} key={extension.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className={compactTitleClassName}>{extension.id}</p>
                    <p className={`mt-1 ${utilityLabelClassName} text-[var(--rm-muted)]`}>{extension.packageClass.replaceAll("_", " ")}</p>
                  </div>
                  <StatusPill tone={extension.lifecycle === "ready" ? "success" : extension.lifecycle === "degraded" ? "warning" : "neutral"}>{extension.lifecycle.replaceAll("_", " ")}</StatusPill>
                </div>
                <dl className="mt-5 grid gap-x-4 gap-y-3 sm:grid-cols-2">
                  <Detail label="Channel / scope" value={`${extension.channel} · ${extension.scope}`} />
                  <Detail label="Authorization epoch" value={String(extension.authorizationEpoch)} />
                  <Detail label="Retention" value={extension.retention} />
                  <Detail label="Degradation" value={extension.degradation} />
                  <Detail label="Permissions" value={extension.permissions.join(", ") || "none"} />
                  <Detail label="Compatibility" value={extension.compatibility.join(", ")} />
                </dl>
              </article>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
export default ExtensionsRouteView;

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><dt className={`${utilityLabelClassName} text-[var(--rm-muted)]`}>{label}</dt><dd className={`mt-1 break-words ${supportingTextClassName}`}>{value}</dd></div>;
}
