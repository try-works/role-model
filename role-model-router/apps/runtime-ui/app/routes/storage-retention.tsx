import { MetricStrip } from "@role-model/ui";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  EmptyState,
  ErrorState,
  LoadingState,
  SectionCard,
  StatusPill,
} from "../components/page-primitives";
import {
  compactTitleClassName,
  fieldClassName,
  mutedPanelClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
  supportingTextClassName,
  utilityLabelClassName,
} from "../lib/design-system";
import {
  type RuntimeStorageRetentionSummary,
  cancelRetentionJob,
  executeRetentionPlan,
  fetchStorageRetention,
  requestRetentionDryRun,
  rollbackRetentionReceipt,
  updateRetentionPolicy,
} from "../lib/runtime-api";

export function StorageRetentionRouteView() {
  const [summary, setSummary] = useState<RuntimeStorageRetentionSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [maxBytes, setMaxBytes] = useState("104857600");
  const [maxAgeDays, setMaxAgeDays] = useState("30");
  const load = useCallback(
    () =>
      fetchStorageRetention()
        .then(setSummary)
        .catch((value: unknown) => setError(message(value))),
    [],
  );
  useEffect(() => {
    void load();
  }, [load]);
  const conflictCount = useMemo(() => summary?.conflicts.length ?? 0, [summary]);
  const act = async (operation: () => Promise<RuntimeStorageRetentionSummary>) => {
    setBusy(true);
    setError(null);
    try {
      setSummary(await operation());
    } catch (value) {
      setError(message(value));
    } finally {
      setBusy(false);
    }
  };
  const plan = summary?.currentPlan;

  return (
    <div className="space-y-6">
      <MetricStrip
        aria-label="Storage retention summary"
        variant="panel"
        items={[
          {
            id: "usage",
            label: "Tracked",
            value: String(formatBytes(summary?.totalBytes ?? 0)),
          },
          {
            id: "classes",
            label: "Classes",
            value: String(summary?.categories.length ?? 0),
          },
          { id: "conflicts", label: "Conflicts", value: String(conflictCount) },
          {
            id: "maintenance",
            label: "Maintenance",
            value: String(summary?.activeJob?.status ?? "Idle"),
          },
        ]}
      />
      {error ? <ErrorState label={error} /> : null}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]">
        <SectionCard
          title="Usage by category"
          description="Category, tier, and scope stay independently visible. Policies downgrade capabilities before content becomes delete-eligible."
        >
          {summary === null ? (
            <LoadingState label="Loading storage inventory…" />
          ) : summary.categories.length === 0 ? (
            <EmptyState label="No managed storage is present." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-[var(--rm-muted)]">
                  <tr>
                    <th className="pb-3 font-semibold">Category</th>
                    <th className="pb-3 font-semibold">Scope</th>
                    <th className="pb-3 font-semibold">Tier</th>
                    <th className="pb-3 font-semibold">Records</th>
                    <th className="pb-3 font-semibold">Bytes</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.categories.map((row) => (
                    <tr key={`${row.id}:${row.scope}`} className="border-t border-[var(--rm-border)]">
                      <td className={`py-3 ${compactTitleClassName}`}>{row.id}</td>
                      <td className={`py-3 ${supportingTextClassName}`}>{row.scope}</td>
                      <td className="py-3">
                        <StatusPill tone="neutral">{row.tier}</StatusPill>
                      </td>
                      <td className={`py-3 ${supportingTextClassName}`}>{row.count}</td>
                      <td className={`py-3 ${supportingTextClassName}`}>{formatBytes(row.bytes)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
        <div className="space-y-4">
          <SectionCard
            title="Retention policy"
            description="Scoped byte and age budgets. Managed policy stays authoritative."
          >
            <div className="grid gap-3">
              <label className={utilityLabelClassName}>
                Maximum bytes
                <input
                  className={`${fieldClassName} mt-1`}
                  min="0"
                  onChange={(event) => setMaxBytes(event.target.value)}
                  type="number"
                  value={maxBytes}
                />
              </label>
              <label className={utilityLabelClassName}>
                Maximum age (days)
                <input
                  className={`${fieldClassName} mt-1`}
                  min="1"
                  onChange={(event) => setMaxAgeDays(event.target.value)}
                  type="number"
                  value={maxAgeDays}
                />
              </label>
              <button
                className={secondaryButtonClassName}
                disabled={busy || summary?.managedPolicy}
                onClick={() =>
                  void act(() =>
                    updateRetentionPolicy({
                      policyId: "runtime-custom",
                      scope: "global",
                      maxBytes: Number(maxBytes),
                      maxAgeDays: Number(maxAgeDays),
                    }),
                  )
                }
                type="button"
              >
                Save policy
              </button>
            </div>
          </SectionCard>
          <SectionCard
            title="Manual pruning"
            description="Dry-run first, then execute the exact hash-bound plan as a cancellable background job."
          >
            <div className="flex flex-wrap gap-2">
              <button
                className={primaryButtonClassName}
                disabled={busy || summary?.managedPolicy}
                onClick={() => void act(() => requestRetentionDryRun())}
                type="button"
              >
                {busy ? "Working…" : "Dry-run"}
              </button>
              <button
                className={secondaryButtonClassName}
                disabled={busy || !plan || Boolean(plan.blocks.length) || summary?.managedPolicy}
                onClick={() =>
                  plan && void act(() => executeRetentionPlan(plan.manifestHash, "global"))
                }
                type="button"
              >
                Execute plan
              </button>
              {summary?.activeJob?.status === "running" ? (
                <button
                  className={secondaryButtonClassName}
                  disabled={busy}
                  onClick={() => void act(() => cancelRetentionJob())}
                  type="button"
                >
                  Cancel job
                </button>
              ) : null}
            </div>
            <div className={`${mutedPanelClassName} mt-3 p-3`}>
              <p className={utilityLabelClassName}>Background progress</p>
              <p className={`mt-1 ${supportingTextClassName}`}>
                {summary?.activeJob
                  ? `${summary.activeJob.status} · ${summary.activeJob.progress}%`
                  : "Idle · no active retention job"}
              </p>
            </div>
            {plan ? (
              <p className={`mt-3 ${supportingTextClassName}`}>
                {plan.affectedCount} affected · {formatBytes(plan.estimatedBytes)} ·{" "}
                {plan.rollbackAvailable ? "Rollback-safe" : "Rollback unavailable"}
              </p>
            ) : null}
            {summary?.conflicts.length ? (
              <div className="mt-3 space-y-2">
                {summary.conflicts.map((row) => (
                  <div
                    className={`${mutedPanelClassName} p-3`}
                    key={`${row.serviceId ?? "global"}:${row.reason}`}
                  >
                    <StatusPill tone="warning">Conflict</StatusPill>
                    <p className={`mt-2 ${supportingTextClassName}`}>{row.reason}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className={`mt-3 ${supportingTextClassName}`}>
                No legal holds or Managed policy conflicts.
              </p>
            )}
            {summary?.receipts.length ? (
              <div className="mt-3 space-y-3">
                <p className={utilityLabelClassName}>Conflicts and receipts</p>
                {summary.receipts.map((receipt) => (
                  <div className={`${mutedPanelClassName} p-3`} key={receipt.id}>
                    <div className="flex items-center justify-between gap-3">
                      <p className={utilityLabelClassName}>{receipt.id}</p>
                      <StatusPill
                        tone={
                          receipt.status === "completed" || receipt.status === "rolled_back"
                            ? "success"
                            : "warning"
                        }
                      >
                        {receipt.status}
                      </StatusPill>
                    </div>
                    <p className={`mt-2 ${supportingTextClassName}`}>
                      {receipt.affectedCount} affected ·{" "}
                      {receipt.rollbackAvailable ? "Rollback-safe" : "Rollback unavailable"}
                    </p>
                    {receipt.rollbackAvailable ? (
                      <button
                        className={`${secondaryButtonClassName} mt-3`}
                        disabled={busy}
                        onClick={() => void act(() => rollbackRetentionReceipt(receipt.id))}
                        type="button"
                      >
                        Rollback
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
export default StorageRetentionRouteView;
const message = (value: unknown) =>
  value instanceof Error ? value.message : "Storage operation failed.";
function formatBytes(value: number): string {
  return value < 1024
    ? `${value} B`
    : value < 1024 * 1024
      ? `${(value / 1024).toFixed(1)} KiB`
      : `${(value / 1024 / 1024).toFixed(1)} MiB`;
}
