import { expect, test } from "vitest";

import {
  RUN100_SWEEP_RETRIEVAL_LIMIT,
  RUN100_SWEEP_RETRIEVAL_QUERY,
  serveLearnerSweepRetrieval,
} from "../src/track-b-learning-pass.js";

/**
 * Run 100 addendum 15 / item 7 (S19): the retrieval plane's served half.
 *
 * Measured live on `run138-cdaeaf3f` (and again on `run144-092d5a26`): the knowledge worker's index is built
 * and current (`knowledge_worker_candidates` 291 -> 435, `knowledge_worker_fts` equal to it, 25 -> 31
 * `knowledge_worker_index_state` generations) while `knowledge_retrieval_receipts` reads **0** in the durable
 * Knowledge Store. The index has a driver (one `knowledge:rebuild-index` per learner sweep, run105), but
 * nothing ever *serves* a retrieval: `knowledge:retrieve` has no caller in the packaged runtime, so the
 * ranking path, its bounded receipt and the operator readback the Learning surface would render can never
 * be observed. A retrieval that never runs is indistinguishable from one that is broken.
 *
 * This suite pins the sweep's served retrieval: one bounded shadow query per sweep, its receipt recorded
 * durably by the Knowledge Store, a bounded summary for the sweep log, and the two degradation rules the
 * sidecar composition already documents - a store refusal degrades the answer (the retrieval was still
 * served) and a worker refusal is reported, never thrown into the sweep.
 */

const SCOPE = "standalone-runtime-stage";

interface Invocation {
  readonly extensionId: string;
  readonly capability: string;
  readonly value: Record<string, unknown>;
}

function retrievalReceipt(overrides: Record<string, unknown> = {}) {
  return {
    queryHash: "d3b25fb22074173e5f9248f0efa420c59590440d59793f892947b80d1d9551b4",
    scopeId: SCOPE,
    filters: { activeOnly: true, sensitivityMax: "private" },
    hits: [{ id: "shadow-0300d84ca102c", artifactRef: "artifact:1", rank: 1.5 }],
    resultCount: 1,
    matchCount: 206,
    plane: "shadow",
    productionActivation: false,
    privacyProfile: "local_only",
    repositoryFallbackLevel: "scope",
    ...overrides,
  };
}

test("run145 the sweep serves one bounded shadow retrieval and the store keeps its receipt", async () => {
  const calls: Invocation[] = [];
  const receipt = retrievalReceipt();
  const served = await serveLearnerSweepRetrieval({
    scopeId: SCOPE,
    invoke: async (extensionId, capability, value) => {
      calls.push({ extensionId, capability, value });
      if (capability === "knowledge:retrieve") return receipt;
      if (capability === "knowledge:record-retrieval") {
        return { scopeId: SCOPE, receiptId: "receipt:run145:1", resultCount: 1, hits: 1 };
      }
      throw new Error(`unexpected capability ${capability}`);
    },
  });

  expect(calls.map((call) => `${call.extensionId}:${call.capability}`)).toEqual([
    "knowledge-worker:knowledge:retrieve",
    "knowledge-store:knowledge:record-retrieval",
  ]);
  const retrieval = calls[0]?.value ?? {};
  expect(retrieval).toMatchObject({
    plane: "shadow",
    scopeId: SCOPE,
    query: RUN100_SWEEP_RETRIEVAL_QUERY,
    filters: { activeOnly: true },
    limit: RUN100_SWEEP_RETRIEVAL_LIMIT,
  });
  // The query the live corpus answers: every derived experience text in this scope contains these tokens.
  expect(String(retrieval.query).length).toBeLessThanOrEqual(128);
  expect(Number(retrieval.limit)).toBeGreaterThanOrEqual(1);
  expect(Number(retrieval.limit)).toBeLessThanOrEqual(64);
  expect(calls[1]?.value).toMatchObject({ receipt });
  expect(served).toMatchObject({
    served: true,
    resultCount: 1,
    matchCount: 206,
    queryHash: receipt.queryHash,
    receiptId: "receipt:run145:1",
    durableReceipt: { recorded: true },
  });
});

test("run145 a store refusal degrades the answer: the retrieval was still served", async () => {
  const served = await serveLearnerSweepRetrieval({
    scopeId: SCOPE,
    invoke: async (_extensionId, capability) => {
      if (capability === "knowledge:retrieve")
        return retrievalReceipt({ hits: [], resultCount: 0, matchCount: 0 });
      throw new Error("knowledge store is unavailable");
    },
  });

  expect(served).toMatchObject({
    served: true,
    resultCount: 0,
    matchCount: 0,
    receiptId: null,
    durableReceipt: { recorded: false },
  });
  expect(String(served.durableReceipt.reason)).toContain("knowledge store is unavailable");
});

test("run145 a refused retrieval is reported with its reason and never thrown into the sweep", async () => {
  let storeCalls = 0;
  const served = await serveLearnerSweepRetrieval({
    scopeId: SCOPE,
    invoke: async (_extensionId, capability) => {
      if (capability === "knowledge:retrieve") {
        throw new Error("bounded active knowledge query required");
      }
      storeCalls += 1;
      return {};
    },
  });

  expect(served).toMatchObject({
    served: false,
    receiptId: null,
    durableReceipt: { recorded: false },
  });
  expect(String(served.reason)).toContain("bounded active knowledge query required");
  expect(storeCalls).toBe(0);
});

test("run145 the served retrieval stays inside the worker's own bounds", async () => {
  const calls: Invocation[] = [];
  await serveLearnerSweepRetrieval({
    scopeId: SCOPE,
    query: "outperformed holdout",
    limit: 10_000,
    invoke: async (extensionId, capability, value) => {
      calls.push({ extensionId, capability, value });
      if (capability === "knowledge:retrieve") return retrievalReceipt();
      return { receiptId: "receipt:run145:2" };
    },
  });

  const retrieval = calls[0]?.value ?? {};
  expect(retrieval.query).toBe("outperformed holdout");
  expect(Number(retrieval.limit)).toBeLessThanOrEqual(64);
  expect(retrieval.plane).toBe("shadow");
});
