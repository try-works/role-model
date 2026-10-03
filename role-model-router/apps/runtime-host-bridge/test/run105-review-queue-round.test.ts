import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, expect, test } from "vitest";
import { startReplayQueueRuntime, type ReplayQueueRuntime } from "../src/queue-runtime/index.js";
import { resolveQueueStorePath } from "../src/queue-runtime/store.js";
import { startAutoReplayLoop } from "../src/track-b-auto-replay-runtime.js";
import { createReplayLedger } from "../src/track-b-replay-ledger.js";
import { buildReplayPolicySet } from "../src/track-b-replay-policy.js";

let stateRoot = "";
let dueAtMs = 0;
const runtimes: ReplayQueueRuntime[] = [];
const loops: ReturnType<typeof startAutoReplayLoop>[] = [];
beforeEach(async () => {
  dueAtMs = Date.now() - 5000;
  stateRoot = await mkdtemp(path.join(os.tmpdir(), "run105-queue-round-"));
  await mkdir(path.join(stateRoot, "queues"), { recursive: true });
  await writeFile(path.join(stateRoot, "queues", "queue-policy.json"), JSON.stringify({
    schemaVersion: "role-model.queue-policy.v1", policyVersion: 1,
    global: { killSwitch: false }, queues: { "replay.dispatch": {
      mode: "queue", concurrency: 1, attempts: 3, backoffBaseMs: 100,
      backoffCapMs: 1000, lockRefreshMs: 1000, lockExpirationMs: 5000, retentionDays: 30,
    } }, updatedAt: null, receipts: [],
  }));
});
afterEach(async () => {
  for (const runtime of runtimes.splice(0)) await runtime.stop();
  for (const loop of loops.splice(0)) loop.stop();
  // Only this test's independently allocated temporary root is removed.
  await rm(stateRoot, { recursive: true, force: true });
});
const capsule = { captureRef: "immutable-capsule", endpointIds: ["b"], policySetDigest: "policy" };
function start(handler?: Parameters<typeof startReplayQueueRuntime>[0]["handler"]) {
  const runtime = startReplayQueueRuntime({ stateRoot, ...(handler ? { handler } : {}) });
  runtimes.push(runtime);
  expect(runtime.mode).toBe("queue");
  return runtime;
}
function rows(): { id: string; element: string; state: string; attempts: number; created_at: string }[] {
  const db = new DatabaseSync(resolveQueueStorePath({ stateRoot }));
  try { return db.prepare("SELECT id, element, state, attempts, created_at FROM effect_queue WHERE queue_name = 'replay.dispatch' ORDER BY rowid").all() as ReturnType<typeof rows>; }
  finally { db.close(); }
}
function loopFor(contextShiftMs: number, execute: (round: string | undefined) => boolean) {
  const now = () => Date.now() + contextShiftMs;
  const loop = startAutoReplayLoop({
    operations: {
      async listPendingReplayCaptures() { return { pending: [{ captureRef: capsule.captureRef,
        sourceEndpointId: "a", roleId: "role", taskTypeId: "task", hasRecordedToolResults: false }] }; },
      async recordReplayDisposition() { return { recorded: true }; },
    },
    ledger: createReplayLedger({ filePath: path.join(stateRoot, "ledger.json"), now }),
    policySet: buildReplayPolicySet(), configuredEndpointIds: ["a", "b"],
    routeFocusCandidates: () => [{ roleId: "role", taskTypeId: "task", requestCount: contextShiftMs + 10,
      admitted: 1, configured: 2 }],
    readRouteLadder: () => ({ rungs: [{ endpointId: "a", rank: 1, status: "available" }],
      completeness: { admitted: 1, configured: 2 }, nextEligibleAtMs: dueAtMs }),
    // Recover the actual claimed queue payload, its persisted id and SQL timestamp.
    // The capsule classification/source comes from the same immutable test corpus
    // returned above, never from a round recomputed in the fixture.
    readPendingRouteDispatches: async () => rows()
      .filter(row => row.state === "pending" || row.state === "processing")
      .map(row => {
        const payload = JSON.parse(row.element);
        return { sourceType: "queue" as const, replayJobId: null, queueJobId: row.id,
          captureRef: payload.captureRef, newEndpointId: payload.endpointIds[0], againstEndpointId: "a",
          createdAtMs: Date.parse(row.created_at.replace(" ", "T") + "Z"),
          state: row.state === "processing" ? "running" as const : "queued" as const,
          ...(payload.dispatchRoundId !== undefined ? { dispatchRoundId: payload.dispatchRoundId } : {}),
        };
      }),
    readFinalizedRouteChallenge: async () => null,
    routeLearningDefaults: { minComparisons: 1, minConfidence: 0.7, stalenessWindowDays: 30, challengeBatchSize: 1 },
    executor: async ({ dispatchRoundId, candidates }) => {
      const terminal = execute(dispatchRoundId);
      return { terminal, branches: terminal ? candidates.map(endpointId => ({ endpointId, outcome: "complete" as const })) : [] };
    },
    now,
  });
  loops.push(loop);
  return loop;
}

test("real SQLite offer preserves explicit round A and duplicate admission creates one row", async () => {
  const runtime = start();
  await runtime.dispatchQueue!.offer({ ...capsule, dispatchRoundId: "round-A" });
  await runtime.dispatchQueue!.offer({ ...capsule, dispatchRoundId: "round-A" });
  const stored = rows();
  expect(stored).toHaveLength(1);
  expect(JSON.parse(stored[0]!.element)).toEqual({ ...capsule, dispatchRoundId: "round-A" });
});

test("claimed round A survives a real worker retry and restart before any new round is offered", async () => {
  const seen: (string | undefined)[] = [];
  const firstLoop = loopFor(0, round => { seen.push(round); return false; });
  const first = start(async job => {
    await firstLoop.dispatchCapture(job.captureRef, job.dispatchRoundId);
    throw new Error("retry after dispatch: simulated durable handoff interruption");
  });
  await first.dispatchQueue!.offer({ ...capsule, dispatchRoundId: "round-A" });
  await expect.poll(() => seen.length, { timeout: 5000 }).toBeGreaterThan(0);
  await expect.poll(() => rows()[0]?.state, { timeout: 5000 }).toBe("pending");
  await first.stop(); firstLoop.stop();
  // The restarted focus context has a different timestamp/request count/window;
  // it must not replace the persisted claimed round with its newly derived one.
  const restartedLoop = loopFor(1000, round => { seen.push(round); return true; });
  const restarted = start(async job => { await restartedLoop.dispatchCapture(job.captureRef, job.dispatchRoundId); });
  await expect.poll(() => rows()[0]?.state, { timeout: 5000 }).toBe("completed");
  await restarted.stop();
  expect(seen.length).toBeGreaterThanOrEqual(2);
  expect(seen.every(round => round === "round-A")).toBe(true);
  expect(rows()).toHaveLength(1);
  expect(JSON.parse(rows()[0]!.element).dispatchRoundId).toBe("round-A");
});

test("after round A finalizes, round B for the same immutable capsule and pair is a distinct claimed SQLite job", async () => {
  const seen: (string | undefined)[] = [];
  const runtime = start(async job => { seen.push(job.dispatchRoundId); });
  await runtime.dispatchQueue!.offer({ ...capsule, dispatchRoundId: "round-A" });
  await expect.poll(() => rows()[0]?.state, { timeout: 5000 }).toBe("completed");
  await runtime.dispatchQueue!.offer({ ...capsule, dispatchRoundId: "round-A" });
  await runtime.dispatchQueue!.offer({ ...capsule, dispatchRoundId: "round-B" });
  await expect.poll(() => seen.length, { timeout: 5000 }).toBe(2);
  await expect.poll(() => rows().every(row => row.state === "completed"), { timeout: 5000 }).toBe(true);
  expect(seen).toEqual(["round-A", "round-B"]);
  const stored = rows();
  expect(stored).toHaveLength(2);
  expect(stored[0]!.id).not.toBe(stored[1]!.id);
  expect(stored.map(row => JSON.parse(row.element).captureRef)).toEqual([capsule.captureRef, capsule.captureRef]);
});

test("absent-round legacy offers retain the exact capture id and serialized payload bytes", async () => {
  const runtime = start();
  await runtime.dispatchQueue!.offer(capsule);
  await runtime.dispatchQueue!.offer(capsule);
  expect(rows()).toMatchObject([{ id: capsule.captureRef, element: JSON.stringify(capsule), state: "pending" }]);
  expect(rows()).toHaveLength(1);
});

test("actual CLI replay worker forwards the claimed payload round to dispatchCapture", async () => {
  const source = readFileSync(new URL("../src/cli.ts", import.meta.url), "utf8");
  const start = source.indexOf("queueRuntime = startReplayQueueRuntime({");
  const handlerStart = source.indexOf("handler: async (job) => {", start);
  const handlerEnd = source.indexOf("\n        },", handlerStart);
  expect(start).toBeGreaterThan(0); expect(handlerEnd).toBeGreaterThan(handlerStart);
  const body = source.slice(handlerStart + "handler: async (job) => {".length, handlerEnd);
  const calls: unknown[][] = [];
  const dispatch = new Function("loop", "job", "return (async () => {" + body + "})();");
  await dispatch({ dispatchCapture: async (...args: unknown[]) => { calls.push(args); } },
    { ...capsule, dispatchRoundId: "round-A" });
  expect(calls).toEqual([[capsule.captureRef, "round-A"]]);
});
