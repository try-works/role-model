/**
 * Run 108 addendum-01 A2 (live binding, host side).
 *
 * The host route GET /api/role-model/operator/store-degradation-receipts (index.ts,
 * a3fe207a) reads the backend option `readStoreDegradationReceipts`. Until this
 * change the cli.ts composition bound nothing to it, so a live host answered 503
 * operator_capability_unavailable for a capability that now exists on BOTH private
 * extensions (02315a6a: knowledge:list-degradations on knowledge-store and
 * knowledge-worker).
 *
 * These tests pin the flattening the binding performs - one `knowledge:list-degradations`
 * invoke per extension, flattened into the pinned contract
 * (evidence/a2-contract-pinned.md):
 *   { schemaVersion: "role-model.store-degradation-receipts.v1",
 *     store: { available, reason?, receipts: [...] },
 *     worker: { available, reason?, receipts: [...] } }
 * A source that throws or answers out of contract degrades to
 * `{ available: false, reason: <bounded message>, receipts: [] }` - the binding must
 * never throw, or the one failure the operator surface exists to explain takes the
 * whole readback down with it.
 */
import { readFileSync } from "node:fs";

import { describe, expect, test } from "vitest";

import {
  flattenStoreDegradationReadback,
  readStoreDegradationReceiptsFromRuntime,
} from "../src/cli.js";

const storeReceipt = {
  receiptId: "store-receipt-1",
  atMs: 1_728_396_120_000,
  capability: "ladder-materialization",
  reason: "database is locked",
};
const workerReceipt = {
  receiptId: "worker-receipt-1",
  atMs: 1_728_396_130_000,
  capability: "development-floor",
  reason: "development floor unsatisfiable at pool size 3 for coder.edit",
};

const capabilityAnswer = (receipts: readonly unknown[]) => ({
  schemaVersion: "role-model.store-degradation-receipts.v1",
  receipts,
});

const echoEnvelope = (extensionId: string, capability: string, value: Record<string, unknown>) => ({
  requestId: `test:${capability}`,
  channel: "development",
  scope: "run108:addendum01-a2",
  authorizationEpoch: 1,
  capability,
  value,
  ...(extensionId === "knowledge-store" ? { payload: value } : {}),
});

const reasonOf = (value: unknown): string =>
  typeof (value as { reason?: unknown })?.reason === "string"
    ? String((value as { reason: string }).reason)
    : "";

describe("run108 addendum-01 A2 store degradation receipt live binding", () => {
  test("invokes knowledge:list-degradations on both extensions and flattens to the pinned contract", async () => {
    const calls: Array<{ extensionId: string; capability: string }> = [];
    const readback = await readStoreDegradationReceiptsFromRuntime({
      invoke: async (extensionId, envelope) => {
        calls.push({ extensionId, capability: String(envelope.capability) });
        return extensionId === "knowledge-store"
          ? capabilityAnswer([storeReceipt])
          : capabilityAnswer([workerReceipt]);
      },
      envelopeFor: echoEnvelope,
      stateRoot: "C:/state",
      scopeId: "run108:addendum01-a2",
    });

    expect(calls).toEqual([
      { extensionId: "knowledge-store", capability: "knowledge:list-degradations" },
      { extensionId: "knowledge-worker", capability: "knowledge:list-degradations" },
    ]);
    expect(readback).toEqual({
      schemaVersion: "role-model.store-degradation-receipts.v1",
      store: { available: true, receipts: [storeReceipt] },
      worker: { available: true, receipts: [workerReceipt] },
    });
  });

  test("a throwing source degrades to available:false with a bounded reason and no rows", async () => {
    const readback = await readStoreDegradationReceiptsFromRuntime({
      invoke: async (extensionId) => {
        if (extensionId === "knowledge-worker") throw new Error("worker database is locked");
        return capabilityAnswer([storeReceipt]);
      },
      envelopeFor: echoEnvelope,
      stateRoot: "C:/state",
      scopeId: "run108:addendum01-a2",
    });

    expect(readback.store).toEqual({ available: true, receipts: [storeReceipt] });
    expect(readback.worker.available).toBe(false);
    expect(readback.worker.receipts).toEqual([]);
    expect(readback.worker.reason).toBe("worker database is locked");
  });

  test("a non-Error rejection is still reported as a bounded message, never thrown", async () => {
    const readback = await readStoreDegradationReceiptsFromRuntime({
      invoke: async () => {
        throw "knowledge store offline";
      },
      envelopeFor: echoEnvelope,
      stateRoot: "C:/state",
      scopeId: "run108:addendum01-a2",
    });

    expect(readback.worker.available).toBe(false);
    expect(readback.store.available).toBe(false);
    expect(reasonOf(readback.store)).toContain("knowledge store offline");
  });

  test("an out-of-contract answer is unavailable rather than silently empty", async () => {
    const readback = await readStoreDegradationReceiptsFromRuntime({
      invoke: async (extensionId) =>
        extensionId === "knowledge-store"
          ? capabilityAnswer([storeReceipt])
          : { schemaVersion: "role-model.store-degradation-receipts.v1" },
      envelopeFor: echoEnvelope,
      stateRoot: "C:/state",
      scopeId: "run108:addendum01-a2",
    });

    expect(readback.store.available).toBe(true);
    expect(readback.worker.available).toBe(false);
    expect(reasonOf(readback.worker)).toBeTruthy();
    expect(readback.worker.receipts).toEqual([]);
  });

  test("an answer with the wrong schemaVersion is refused", async () => {
    const readback = await readStoreDegradationReceiptsFromRuntime({
      invoke: async () => ({ schemaVersion: "role-model.other.v1", receipts: [storeReceipt] }),
      envelopeFor: echoEnvelope,
      stateRoot: "C:/state",
      scopeId: "run108:addendum01-a2",
    });

    expect(readback.store.available).toBe(false);
    expect(readback.worker.available).toBe(false);
  });

  test("rows are projected to the four pinned fields and unreadable rows are dropped", () => {
    const flattened = flattenStoreDegradationReadback({
      extensionId: "knowledge-store",
      answer: capabilityAnswer([
        {
          receiptId: "r1",
          atMs: 10,
          capability: "ladder-materialization",
          reason: "database is locked",
          secretExtra: "never surfaced",
        },
        { receiptId: "r2", atMs: "not-a-number", capability: "c", reason: "r" },
        "not-an-object",
      ]),
    });

    expect(flattened).toEqual({
      available: true,
      receipts: [
        {
          receiptId: "r1",
          atMs: 10,
          capability: "ladder-materialization",
          reason: "database is locked",
        },
      ],
    });
  });

  test("a bounded reason never exceeds the operator surface's message cap", async () => {
    const readback = await readStoreDegradationReceiptsFromRuntime({
      invoke: async () => {
        throw new Error("x".repeat(4096));
      },
      envelopeFor: echoEnvelope,
      stateRoot: "C:/state",
      scopeId: "run108:addendum01-a2",
    });

    expect(readback.store.available).toBe(false);
    expect(reasonOf(readback.store).length).toBeLessThanOrEqual(160);
  });

  test("the host composition binds the readback into the backend options", () => {
    // The cli.ts backend options object is internal to startRuntimeCliHost, so the binding is
    // pinned at the source: both extension names and the capability must appear at the call site.
    const source = readFileSync(new URL("../src/cli.ts", import.meta.url), "utf8");
    const bindingAt = source.indexOf("readStoreDegradationReceipts:");
    expect(bindingAt).toBeGreaterThan(0);
    const block = source.slice(bindingAt, bindingAt + 4_000);
    expect(block).toContain("readStoreDegradationReceiptsFromRuntime({");
    // The two extensions the readback serves are named at the envelope factory, which is what
    // decides the store's `payload` mirror and the operator-visible source each answer belongs to.
    expect(block).toContain('extensionId === "knowledge-store"');
    expect(source).toContain('const capability = "knowledge:list-degradations";');
  });
});
