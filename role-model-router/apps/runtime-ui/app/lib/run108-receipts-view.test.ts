/**
 * Run 108 addendum-01 A2 (R3 acceptance + R6b): store degradation receipts must
 * surface in the operator UI. This suite pins the client + view mapping: the
 * runtime-api client reads the host's store-degradation-receipts readback, a
 * 503 operator_capability_unavailable maps to an honest unavailable state
 * (never a page error), and the view models merge both receipt tables
 * (knowledge_store_degradation_receipts + the R6b twin
 * knowledge_worker_degradation_receipts) newest first with source labels.
 */
import { describe, expect, test, vi } from "vitest";

import { buildStoreDegradationReceiptViewModels } from "../routes/store-degradation-receipts";
import {
  type StoreDegradationReceiptReadback,
  fetchStoreDegradationReceipts,
} from "./runtime-api";

const payload: StoreDegradationReceiptReadback = {
  schemaVersion: "role-model.store-degradation-receipts.v1",
  store: {
    available: true,
    receipts: [
      {
        receiptId: "store-receipt-1",
        atMs: 1_728_396_120_000,
        capability: "ladder-materialization",
        reason: "database is locked",
      },
    ],
  },
  worker: {
    available: true,
    receipts: [
      {
        receiptId: "worker-receipt-1",
        atMs: 1_728_396_130_000,
        capability: "knowledge:validate-candidate",
        reason: "development floor unsatisfiable at pool size 3 for coder.edit",
      },
    ],
  },
};

const jsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

describe("run108 receipts view (A2 client + view mapping)", () => {
  test("fetchStoreDegradationReceipts reads the store degradation receipts readback", async () => {
    const fetcher = vi.fn(
      async () => jsonResponse(200, payload) as unknown as Response,
    ) as unknown as typeof fetch;
    const state = await fetchStoreDegradationReceipts(fetcher);
    expect(fetcher).toHaveBeenCalledWith("/api/role-model/operator/store-degradation-receipts");
    expect(state).toEqual({ ...payload, available: true });
  });

  test("maps a 503 operator_capability_unavailable to an honest unavailable state", async () => {
    const fetcher = vi.fn(
      async () =>
        jsonResponse(503, {
          status: "unavailable",
          overall: "unavailable",
          ready: false,
          error: "operator_capability_unavailable",
          capability: "store degradation receipt readback",
          reason: "store degradation receipt readback operator control is unavailable.",
        }) as unknown as Response,
    ) as unknown as typeof fetch;
    const state = await fetchStoreDegradationReceipts(fetcher);
    expect(state).toEqual({
      available: false,
      reason: "store degradation receipt readback operator control is unavailable.",
    });
  });

  test("buildStoreDegradationReceiptViewModels merges both tables newest first with source labels", () => {
    const { rows, unavailableSources } = buildStoreDegradationReceiptViewModels({
      ...payload,
      available: true,
    });
    // The worker receipt is 10s newer than the store receipt, so it sorts first.
    expect(rows).toEqual([
      {
        id: "knowledge-worker:worker-receipt-1",
        source: "knowledge-worker",
        atMs: 1_728_396_130_000,
        capability: "knowledge:validate-candidate",
        reason: "development floor unsatisfiable at pool size 3 for coder.edit",
      },
      {
        id: "knowledge-store:store-receipt-1",
        source: "knowledge-store",
        atMs: 1_728_396_120_000,
        capability: "ladder-materialization",
        reason: "database is locked",
      },
    ]);
    expect(unavailableSources).toEqual([]);
  });

  test("reports unavailable receipt sources with their reasons", () => {
    const { rows, unavailableSources } = buildStoreDegradationReceiptViewModels({
      ...payload,
      available: true,
      store: { available: false, reason: "unsupported knowledge-store capability", receipts: [] },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].source).toBe("knowledge-worker");
    expect(unavailableSources).toEqual([
      "Knowledge store: unsupported knowledge-store capability",
    ]);
  });

  test("an unavailable surface yields no fabricated rows", () => {
    const { rows, unavailableSources } = buildStoreDegradationReceiptViewModels({
      available: false,
      reason: "store degradation receipt readback operator control is unavailable.",
    });
    expect(rows).toEqual([]);
    expect(unavailableSources).toEqual([]);
  });
});
