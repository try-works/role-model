import { MetricStrip } from "@role-model/ui";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Badge,
  EmptyState,
  ErrorState,
  LoadingState,
  SectionCard,
} from "../components/page-primitives";
import {
  compactTitleClassName,
  fieldClassName,
  fieldLabelClassName,
  monoEyebrowClassName,
  mutedPanelClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
  supportingTextClassName,
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

/** 1 GB = 10⁹ bytes. UI edits GB; API still stores maxBytes. */
export const BYTES_PER_GB = 1_000_000_000;
export const DEFAULT_MAX_GB = "1";

export function bytesToGbInput(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return DEFAULT_MAX_GB;
  }
  const gb = bytes / BYTES_PER_GB;
  if (Number.isInteger(gb)) {
    return String(gb);
  }
  return String(Number(gb.toFixed(6)));
}

export function gbInputToBytes(value: string): number | null {
  const gb = Number(value);
  if (!Number.isFinite(gb) || gb < 0) {
    return null;
  }
  return Math.round(gb * BYTES_PER_GB);
}

export function StorageRetentionRouteView() {
  const [summary, setSummary] = useState<RuntimeStorageRetentionSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [maxGb, setMaxGb] = useState(DEFAULT_MAX_GB);
  const [maxAgeDays, setMaxAgeDays] = useState("30");
  const load = useCallback(
    () =>
      fetchStorageRetention()
        .then((next) => {
          setSummary(next);
          const policy = next.policies[0];
          if (policy) {
            setMaxGb(bytesToGbInput(policy.maxBytes));
            setMaxAgeDays(String(policy.maxAgeDays));
          }
        })
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
      const next = await operation();
      setSummary(next);
      const policy = next.policies[0];
      if (policy) {
        setMaxGb(bytesToGbInput(policy.maxBytes));
        setMaxAgeDays(String(policy.maxAgeDays));
      }
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
            label: "Physical stores",
            value: String(summary?.storageInventory?.entries.length ?? 0),
          },
          {
            id: "holds",
            label: "Legal holds",
            value: String(
              summary?.storageInventory?.entries.reduce((sum, row) => sum + row.heldItems, 0) ?? 0,
            ),
          },
          {
            id: "maintenance",
            label: "Maintenance",
            value: String(summary?.activeJob?.status ?? "Idle"),
          },
        ]}
      />
      {error ? <ErrorState label={error} /> : null}
      {summary?.storageInventory ? (
        <SectionCard
          title="Physical storage inventory"
          description="Registry ownership, health, physical size, legal holds, and current retention enforcement for every writable store."
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr>
                  {["Store", "Owner", "Health", "Physical bytes", "Legal holds", "Enforcement"].map(
                    (heading) => (
                      <th className={`pb-3 font-normal ${monoEyebrowClassName}`} key={heading}>
                        {heading}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {summary.storageInventory.entries.map((row) => (
                  <tr className="border-t border-[var(--rm-border)]" key={row.id}>
                    <td className={`py-3 ${compactTitleClassName}`}>{row.id}</td>
                    <td className={`py-3 ${supportingTextClassName}`}>{row.owner}</td>
                    <td className="py-3">
                      <Badge tone={row.health === "healthy" ? "success" : "warning"}>
                        {row.health}
                      </Badge>
                    </td>
                    <td className={`py-3 ${supportingTextClassName}`}>
                      {row.physicalBytes === null ? "Unavailable" : formatBytes(row.physicalBytes)}
                    </td>
                    <td className={`py-3 ${supportingTextClassName}`}>{row.heldItems}</td>
                    <td className={`py-3 ${supportingTextClassName}`}>{row.retentionState}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      ) : null}
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
                <thead>
                  <tr>
                    <th className={`pb-3 font-normal ${monoEyebrowClassName}`}>Category</th>
                    <th className={`pb-3 font-normal ${monoEyebrowClassName}`}>Scope</th>
                    <th className={`pb-3 font-normal ${monoEyebrowClassName}`}>Tier</th>
                    <th className={`pb-3 font-normal ${monoEyebrowClassName}`}>Records</th>
                    <th className={`pb-3 font-normal ${monoEyebrowClassName}`}>Bytes</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.categories.map((row) => (
                    <tr
                      key={`${row.id}:${row.scope}`}
                      className="border-t border-[var(--rm-border)]"
                    >
                      <td className={`py-3 ${compactTitleClassName}`}>{row.id}</td>
                      <td className={`py-3 ${supportingTextClassName}`}>{row.scope}</td>
                      <td className="py-3">
                        <Badge tone="neutral">{row.tier}</Badge>
                      </td>
                      <td className={`py-3 ${supportingTextClassName}`}>{row.count}</td>
                      <td className={`py-3 ${supportingTextClassName}`}>
                        {formatBytes(row.bytes)}
                      </td>
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
            description="Scoped size and age budgets. Managed policy stays authoritative."
          >
            <div className="grid gap-3">
              <label className={fieldLabelClassName}>
                Maximum size (GB)
                <input
                  className={`${fieldClassName} mt-1`}
                  inputMode="decimal"
                  min="0"
                  onChange={(event) => setMaxGb(event.target.value)}
                  step="any"
                  type="number"
                  value={maxGb}
                />
              </label>
              <label className={fieldLabelClassName}>
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
                onClick={() => {
                  const maxBytes = gbInputToBytes(maxGb);
                  if (maxBytes === null) {
                    setError("Maximum size must be a non-negative number of GB.");
                    return;
                  }
                  void act(() =>
                    updateRetentionPolicy({
                      policyId: "runtime-custom",
                      scope: "global",
                      maxBytes,
                      maxAgeDays: Number(maxAgeDays),
                    }),
                  );
                }}
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
              <p className={fieldLabelClassName}>Background progress</p>
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
                    <Badge tone="warning">Conflict</Badge>
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
                <p className={fieldLabelClassName}>Conflicts and receipts</p>
                {summary.receipts.map((receipt) => (
                  <div className={`${mutedPanelClassName} p-3`} key={receipt.id}>
                    <div className="flex items-center justify-between gap-3">
                      <p className={fieldLabelClassName}>{receipt.id}</p>
                      <Badge
                        tone={
                          receipt.status === "completed" || receipt.status === "rolled_back"
                            ? "success"
                            : "warning"
                        }
                      >
                        {receipt.status}
                      </Badge>
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
