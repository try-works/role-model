import { useCallback, useEffect, useMemo, useState } from "react";

import { EmptyState, ErrorState, FactCard, LoadingState, SectionCard, StatusPill } from "../components/page-primitives";
import { compactTitleClassName, mutedPanelClassName, primaryButtonClassName, supportingTextClassName, utilityLabelClassName } from "../lib/design-system";
import { fetchStorageRetention, requestRetentionDryRun, type RuntimeStorageRetentionSummary } from "../lib/runtime-api";

export function StorageRetentionRouteView() {
  const [summary, setSummary] = useState<RuntimeStorageRetentionSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => fetchStorageRetention().then(setSummary).catch((value: unknown) => setError(value instanceof Error ? value.message : "Could not load storage controls.")), []);
  useEffect(() => { void load(); }, [load]);
  const conflictCount = useMemo(() => summary?.conflicts.reduce((total, row) => total + row.count, 0) ?? 0, [summary]);

  const dryRun = async () => {
    setBusy(true); setError(null);
    try { setSummary(await requestRetentionDryRun()); } catch (value) { setError(value instanceof Error ? value.message : "Dry-run failed."); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <FactCard label="Tracked usage" value={formatBytes(summary?.totalBytes ?? 0)} detail="Graph content, compact ledgers, derived views, and archives." emphasis />
        <FactCard label="Data classes" value={summary?.categories.length ?? 0} detail="Category, tier, and scope remain independently visible." />
        <FactCard label="Conflicts" value={conflictCount} detail="Legal holds, leases, and Managed policy blocks." />
        <FactCard label="Maintenance" value={summary?.activeJob?.status ?? "Idle"} detail="Background-only compaction; routing is never interrupted." />
      </div>
      {error ? <ErrorState label={error} /> : null}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.7fr)]">
        <SectionCard title="Usage by category, tier, and scope" description="Policies downgrade capabilities explicitly before content becomes delete-eligible.">
          {summary === null ? <LoadingState label="Loading storage inventory…" /> : summary.categories.length === 0 ? <EmptyState label="No managed storage is present." /> : (
            <div className="space-y-3">{summary.categories.map((row) => <div className={`${mutedPanelClassName} flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between`} key={`${row.id}:${row.scope}`}><div><p className={compactTitleClassName}>{row.id}</p><p className={`mt-1 ${supportingTextClassName}`}>{row.scope} · {row.count} records</p></div><div className="flex flex-wrap gap-2"><StatusPill tone="neutral">{row.tier}</StatusPill><StatusPill tone="info">{formatBytes(row.bytes)}</StatusPill></div></div>)}</div>
          )}
        </SectionCard>
        <div className="space-y-4">
          <SectionCard title="Dry-run pruning" description="Preview estimated bytes, capability loss, archive/restore requirements, and conflicts before any deletion.">
            <button className={primaryButtonClassName} disabled={busy || summary?.managedPolicy === true} onClick={() => void dryRun()} type="button">{busy ? "Calculating…" : "Dry-run"}</button>
            <p className={`mt-3 ${supportingTextClassName}`}>{summary?.managedPolicy ? "Managed policy controls this action." : "Rollback-safe execution remains a separate confirmed step."}</p>
          </SectionCard>
          <SectionCard title="Receipts" description="Hash-bound manifests preserve deletion and privacy provenance without inline ID lists.">
            {summary?.receipts.length ? <div className="space-y-3">{summary.receipts.map((receipt) => <div className={`${mutedPanelClassName} p-3`} key={receipt.id}><div className="flex items-center justify-between gap-3"><p className={utilityLabelClassName}>{receipt.id}</p><StatusPill tone={receipt.status === "completed" ? "success" : "warning"}>{receipt.status}</StatusPill></div><p className={`mt-2 ${supportingTextClassName}`}>{receipt.affectedCount} affected · {receipt.rollbackAvailable ? "Rollback-safe" : "Rollback unavailable"}</p></div>)}</div> : <EmptyState label="No pruning receipts yet." />}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
export default StorageRetentionRouteView;

function formatBytes(value: number): string { return value < 1024 ? `${value} B` : value < 1024 * 1024 ? `${(value / 1024).toFixed(1)} KiB` : `${(value / 1024 / 1024).toFixed(1)} MiB`; }
