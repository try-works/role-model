import { useCallback, useEffect, useState } from "react";

import {
  Badge,
  EmptyState,
  ErrorState,
  LoadingState,
  SectionCard,
} from "../components/page-primitives";
import {
  compactTitleClassName,
  fieldLabelClassName,
  monoEyebrowClassName,
  mutedPanelClassName,
  secondaryButtonClassName,
  supportingTextClassName,
} from "../lib/design-system";
import { useOperatorToken } from "../lib/learning-api";
import {
  type StoreDegradationReceiptReadbackState,
  type StoreDegradationReceiptSource,
  fetchStoreDegradationReceipts,
} from "../lib/runtime-api";

/**
 * Run 108 addendum-01 A2 (R3 acceptance + R6b): the store-level materialization
 * degradation receipts surface in the operator UI. The host readback flattens
 * both receipt tables - knowledge_store_degradation_receipts and the R6b twin
 * knowledge_worker_degradation_receipts - into one payload; this view renders
 * both sources plus the honest unavailable states (a 503
 * operator_capability_unavailable is shown as such, never fabricated rows).
 */
export interface StoreDegradationReceiptViewModel {
  readonly id: string;
  readonly source: "knowledge-store" | "knowledge-worker";
  readonly atMs: number;
  readonly capability: string;
  readonly reason: string;
}

export const STORE_DEGRADATION_SOURCE_LABELS = {
  "knowledge-store": "Knowledge store",
  "knowledge-worker": "Knowledge worker",
} as const;

const collectSource = (
  source: "knowledge-store" | "knowledge-worker",
  value: StoreDegradationReceiptSource,
  rows: StoreDegradationReceiptViewModel[],
  unavailableSources: string[],
): void => {
  if (!value.available) {
    unavailableSources.push(
      `${STORE_DEGRADATION_SOURCE_LABELS[source]}: ${value.reason ?? "readback unavailable"}`,
    );
    return;
  }
  for (const receipt of value.receipts) {
    rows.push({
      id: `${source}:${receipt.receiptId}`,
      source,
      atMs: receipt.atMs,
      capability: receipt.capability,
      reason: receipt.reason,
    });
  }
};

export function buildStoreDegradationReceiptViewModels(
  state: StoreDegradationReceiptReadbackState,
): {
  readonly rows: readonly StoreDegradationReceiptViewModel[];
  readonly unavailableSources: readonly string[];
} {
  if (!state.available) {
    return { rows: [], unavailableSources: [] };
  }
  const rows: StoreDegradationReceiptViewModel[] = [];
  const unavailableSources: string[] = [];
  collectSource("knowledge-store", state.store, rows, unavailableSources);
  collectSource("knowledge-worker", state.worker, rows, unavailableSources);
  // Newest first, matching the bounded newest-first contract of both tables.
  rows.sort((left, right) => right.atMs - left.atMs);
  return { rows, unavailableSources };
}

export function StoreDegradationReceiptsRouteView() {
  // 03.5 review MN-3: this readback rides the operator auth gate, so it must carry the operator
  // credential. useOperatorToken is the house convention the Learning and Control pages use; with
  // no token configured the request is the anonymous loopback shape, unchanged.
  const { token } = useOperatorToken();
  const [state, setState] = useState<StoreDegradationReceiptReadbackState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(() => {
    setError(null);
    return fetchStoreDegradationReceipts(fetch, token || undefined)
      .then(setState)
      .catch((value: unknown) => setError(value instanceof Error ? value.message : String(value)));
  }, [token]);
  useEffect(() => {
    void load();
  }, [load]);
  const refresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };
  const models =
    state === null
      ? { rows: [], unavailableSources: [] }
      : buildStoreDegradationReceiptViewModels(state);
  return (
    <div className="space-y-4">
      <SectionCard
        title="Store degradation receipts"
        description="Materialization failures (R3 ladder writes, R6b development floors) are never silent: every failed write lands a durable, operator-visible receipt in the knowledge store and the knowledge worker store."
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <p className={supportingTextClassName}>
            {state === null
              ? "Reading receipts..."
              : state.available
                ? `${models.rows.length} receipt row(s) across both stores`
                : "Readback unavailable"}
          </p>
          <button
            type="button"
            className={secondaryButtonClassName}
            onClick={() => void refresh()}
            disabled={refreshing}
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
        {error ? <ErrorState label={error} /> : null}
        {state === null && !error ? <LoadingState label="Loading degradation receipts" /> : null}
        {state !== null && !state.available ? (
          <div className={`${mutedPanelClassName} p-4`}>
            <p className={compactTitleClassName}>Readback unavailable</p>
            <p className={supportingTextClassName}>{state.reason}</p>
            <p className={supportingTextClassName}>
              The host has no degradation receipt readback bound; the receipts remain durable in
              both stores.
            </p>
          </div>
        ) : null}
        {state?.available ? (
          <div className="space-y-4">
            {models.unavailableSources.length > 0 ? (
              <div className={`${mutedPanelClassName} p-4`}>
                <p className={fieldLabelClassName}>Unavailable sources</p>
                <ul className="list-inside list-disc">
                  {models.unavailableSources.map((reason) => (
                    <li key={reason} className={supportingTextClassName}>
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {models.rows.length === 0 && models.unavailableSources.length === 0 ? (
              <EmptyState label="No degradation receipts recorded" />
            ) : null}
            {models.rows.map((row) => (
              <div key={row.id} className={`${mutedPanelClassName} p-4`}>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="warning">{STORE_DEGRADATION_SOURCE_LABELS[row.source]}</Badge>
                  <p className={monoEyebrowClassName}>{row.capability}</p>
                </div>
                <p className={`${compactTitleClassName} mt-2`}>{row.reason}</p>
                <p className={supportingTextClassName}>
                  {new Date(row.atMs).toISOString()} · {row.id}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </SectionCard>
    </div>
  );
}

export default StoreDegradationReceiptsRouteView;
