import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, expect, test } from "vitest";

import { collectObservabilitySnapshot } from "../src/run108-observability.js";
import { type RouteLadderRow, startAutoReplayLoop } from "../src/track-b-auto-replay-runtime.js";
import type { AutoReplayCapture } from "../src/track-b-auto-replay.js";
import { createReplayLedger } from "../src/track-b-replay-ledger.js";
import { buildReplayPolicySet } from "../src/track-b-replay-policy.js";

/**
 * Run 108 - METRIC SEMANTICS. The phase-03.5 adversarial review (A of 2, the metric emit placements)
 * found three of the seven R7 metrics emitting a quantity other than the one they name:
 *
 *   1. MAJOR  role-model.replay.queue.awaiting_evaluation names JOBS but counted ARM ENTRIES. The
 *             pending-dispatch readback pushes one entry PER ARM of a durable replay job
 *             (route-challenge-evidence.ts:416-429, "for (const arm of job.candidatePackages)") and the
 *             tick counted entries, so ONE job carrying four arms published the gauge 4. Live on :3458
 *             the gauge read 4 while replay.arm_plan_arms showed min = max = 4 arms for each of its nine
 *             plans - one job x four arms, not four jobs.
 *   2. MAJOR  role-model.replay.queue.queued is a PAGE FILL, not a depth. The private producer answered
 *             pendingCount: pending.length AFTER .slice(0, limit)
 *             (runtime-operations-server.mjs:8396/8405) and the tick passes limit = maxCapturesPerTick *
 *             4 = 32, so the gauge SATURATES at 32 while its prose claims "captures still owed a replay".
 *   3. MINOR  role-model.replay.queue.stranded could publish a FABRICATED 0: cli.ts answered
 *             {scanned:0,completed:[],stranded:[],reclaimed:[]} when no extension runtime was bound, so
 *             the gauge was SET to 0 although nothing was reconciled - contradicting the emit's own
 *             comment ("a plane whose queue owns reconciliation publishes no observation instead of a
 *             fabricated zero").
 *
 * Each behavioral case drives the PRODUCTION seam the metric is emitted from - the tick that owns the
 * readback, not a helper reconstructed beside it (the F5 ladder_rungs lesson).
 */

const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

/** The gauge reading the operator surface publishes: the series value, or null when unobserved. */
const gaugeValue = (name: string): number | null => {
  const entry = (
    collectObservabilitySnapshot() as unknown as Record<
      string,
      { readonly series?: ReadonlyArray<{ readonly state?: Record<string, unknown> }> } | undefined
    >
  )[name];
  for (const series of entry?.series ?? []) {
    const value = series.state?.value;
    if (typeof value === "number") return value;
  }
  return null;
};

/** The paired private checkout that owns the only producer outside the public tree. */
const privateRoot = (() => {
  const configured = process.env.ROLE_MODEL_INTERNAL_WORKTREE;
  if (configured && configured.trim().length > 0) return configured.trim();
  const publicRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
  return path.resolve(
    publicRoot,
    "../../../role-model-internal/.worktrees",
    path.basename(publicRoot),
  );
})();

interface PendingDispatch {
  readonly sourceType: "replay" | "queue";
  readonly replayJobId: string | null;
  readonly queueJobId: string | null;
  readonly captureRef: string;
  readonly newEndpointId: string;
  readonly againstEndpointId: string;
  readonly createdAtMs: number;
  readonly state: string;
}

/** One arm of one durable replay job, at the tick's own pending-dispatch boundary. */
const arm = (jobId: string, endpointId: string): PendingDispatch => ({
  sourceType: "replay",
  replayJobId: jobId,
  queueJobId: null,
  captureRef: "idle-a",
  newEndpointId: endpointId,
  againstEndpointId: "a",
  createdAtMs: 950,
  state: "awaiting_evaluation",
});

const task = (taskTypeId: string, admitted: number, configured: number) => ({
  roleId: "role",
  taskTypeId,
  requestCount: 10,
  admitted,
  configured,
});

const ladder = (ids: string[], nextEligibleAtMs: number): RouteLadderRow => ({
  rungs: ids.map((endpointId, index) => ({ endpointId, rank: index + 1, status: "available" })),
  completeness: { admitted: ids.length, configured: ids.length },
  nextEligibleAtMs,
});

const captureRow = (): AutoReplayCapture => ({
  captureRef: "idle-a",
  sourceEndpointId: "a",
  roleId: "role",
  taskTypeId: "idle",
  hasRecordedToolResults: false,
});

function harness(options: {
  readonly configured?: readonly string[];
  readonly row?: RouteLadderRow;
  readonly pendingReadback?: () => unknown;
  readonly dispatches?: () => Promise<readonly PendingDispatch[] | null>;
  readonly reconcile?: () => Promise<unknown>;
}) {
  const dir = mkdtempSync(path.join(os.tmpdir(), "run108-metric-semantics-"));
  const configured = options.configured ?? ["a", "b", "c", "new"];
  const row = options.row ?? ladder(["a", "b", "c"], 900);
  const pending = [captureRow()];
  const loop = startAutoReplayLoop({
    operations: {
      async listPendingReplayCaptures() {
        if (options.pendingReadback) return options.pendingReadback();
        return { pending, pendingCount: pending.length };
      },
      async recordReplayDisposition() {
        return { recorded: true };
      },
      // The boundary the production CLI always exposes; a pass that answers null is the
      // no-extension-runtime seam this defect is about (cli.ts reconcileEvaluationJobs).
      reconcileEvaluationJobs: options.reconcile ?? (async () => null),
    },
    ledger: createReplayLedger({ filePath: path.join(dir, "ledger.json"), now: () => 1000 }),
    policySet: buildReplayPolicySet(),
    configuredEndpointIds: () => [...configured],
    routeFocusCandidates: () => [task("idle", 3, configured.length)],
    readRouteLadder: () => row,
    markRouteLadderEligible: () => undefined,
    readFinalizedRouteChallenge: async () => null,
    routeLearningDefaults: {
      minComparisons: 5,
      minConfidence: 0.7,
      stalenessWindowDays: 30,
      challengeBatchSize: 1,
    },
    ...(options.dispatches ? { readPendingRouteDispatches: options.dispatches } : {}),
    executor: async ({ candidates }) => ({
      terminal: true,
      branches: candidates.map((endpointId) => ({ endpointId, outcome: "complete" as const })),
    }),
    now: () => 1000,
  });
  cleanups.push(() => {
    loop.stop();
    rmSync(dir, { recursive: true, force: true });
  });
  return loop;
}

test("defect 1: the awaiting-evaluation gauge counts JOBS, so two arms of ONE job read 1", async () => {
  // Live shape: one durable replay job carrying four arms publishes FOUR readback entries.
  const loop = harness({ dispatches: async () => [arm("job-1", "new"), arm("job-1", "new")] });
  await loop.tick();
  expect(gaugeValue("role-model.replay.queue.awaiting_evaluation")).toBe(1);
});

test("defect 1: two DIFFERENT durable replay jobs are still TWO", async () => {
  const loop = harness({ dispatches: async () => [arm("job-1", "new"), arm("job-2", "new")] });
  await loop.tick();
  expect(gaugeValue("role-model.replay.queue.awaiting_evaluation")).toBe(2);
});

test("defect 1: a pre-replay queue job counts by its queue id too", async () => {
  const queueArm = (jobId: string): PendingDispatch => ({
    sourceType: "queue",
    replayJobId: null,
    queueJobId: jobId,
    captureRef: "idle-a",
    newEndpointId: "new",
    againstEndpointId: "a",
    createdAtMs: 950,
    state: "awaiting_evaluation",
  });
  const loop = harness({ dispatches: async () => [queueArm("q-1"), queueArm("q-1")] });
  await loop.tick();
  expect(gaugeValue("role-model.replay.queue.awaiting_evaluation")).toBe(1);
});

test("defect 2: a page-limited readback still reports the FULL depth, not the page", async () => {
  const page = [captureRow()];
  const loop = harness({
    // The producer's page is bounded by the tick's own limit (maxCapturesPerTick * 4 = 32); the depth
    // it still owes a replay is not.
    pendingReadback: () => ({ pending: page, pendingCount: page.length, pendingTotal: 40 }),
  });
  await loop.tick();
  expect(gaugeValue("role-model.replay.queue.queued")).toBe(40);
});

test("defect 2: a readback that predates the total still reports what it counts", async () => {
  const page = [captureRow()];
  const loop = harness({ pendingReadback: () => ({ pending: page, pendingCount: 3 }) });
  await loop.tick();
  expect(gaugeValue("role-model.replay.queue.queued")).toBe(3);
});

test("defect 3: a reconcile pass that answered NOTHING records nothing, never zero", async () => {
  // The tick's liveness sweep runs FIRST every tick, and the production boundary ALWAYS exposes
  // reconcileEvaluationJobs. A pass that answers null (the no-extension-runtime seam, cli.ts) must
  // leave the gauge unobserved rather than SET it to 0 - so nothing is recorded for it at all.
  const loop = harness({ reconcile: async () => null });
  await loop.tick();
  const entry = (collectObservabilitySnapshot() as unknown as Record<string, unknown>)[
    "role-model.replay.queue.stranded"
  ] as { readonly series?: ReadonlyArray<unknown> } | undefined;
  // A fabricated zero would appear here as one series with value 0 - the exact reading that cannot be
  // told apart from "nothing stranded".
  expect(entry?.series ?? []).toHaveLength(0);
  expect(gaugeValue("role-model.replay.queue.stranded")).toBeNull();
});

test("defect 3: the absent pass does not overwrite a genuine earlier observation", async () => {
  // A runtime that reconciles, then loses its extension runtime: the last REAL depth must survive
  // rather than being replaced by the fabricated empty sweep.
  let answer: unknown = { scanned: 1, completed: [], stranded: ["job-1"], reclaimed: [] };
  const loop = harness({ reconcile: async () => answer });
  await loop.tick();
  expect(gaugeValue("role-model.replay.queue.stranded")).toBe(1);
  answer = null;
  await loop.tick();
  expect(gaugeValue("role-model.replay.queue.stranded")).toBe(1);
});

test("defect 3: an answering reconcile pass still SETS the gauge", async () => {
  const loop = harness({
    reconcile: async () => ({
      scanned: 2,
      completed: [],
      stranded: ["job-1", "job-2"],
      reclaimed: [],
    }),
  });
  await loop.tick();
  expect(gaugeValue("role-model.replay.queue.stranded")).toBe(2);
});

test("defect 3: the CLI seam answers null when no extension runtime is bound", () => {
  // The behavioral half is above; this pins the PRODUCER whose fabricated empty sweep was the defect
  // (cli.ts reconcileEvaluationJobs). A runtime that is absent cannot honestly report "nothing
  // stranded", so it must not answer a sweep at all.
  const source = readFileSync(new URL("../src/cli.ts", import.meta.url), "utf8");
  const body = source.slice(source.indexOf("async reconcileEvaluationJobs() {"));
  const head = body.slice(0, body.indexOf("const record ="));
  expect(head).toContain("extensionRuntimeRef.current");
  expect(head).toContain("if (!runtime) return null;");
  expect(head).not.toContain("stranded: []");
});

test("defect 2: the private producer reports the PRE-SLICE depth", () => {
  // The census seam is the private bundle; this repository holds a paired private checkout when it is
  // present, so the case checks the producer's own arithmetic there and skips otherwise.
  const producerPath = path.join(privateRoot, "scripts/track-b/runtime-operations-server.mjs");
  if (!existsSync(producerPath)) return;
  const source = readFileSync(producerPath, "utf8");
  // the pre-slice total is taken BEFORE the page is bounded ...
  expect(source).toMatch(/const pendingTotal = pending\.length;/);
  // ... and the depth the caller reads is that total, never the page length
  expect(source).toContain("pendingCount: pendingTotal,");
  expect(source).not.toContain("pendingCount: pending.length,");
});

test("defect 1/2/3: the recorders are wired at the tick's own readbacks", () => {
  const source = readFileSync(
    new URL("../src/track-b-auto-replay-runtime.ts", import.meta.url),
    "utf8",
  );
  // defect 1: the awaiting-evaluation count de-duplicates by durable job id
  expect(source).toContain("job.replayJobId ?? job.queueJobId");
  // defect 2: the depth readback prefers the pre-slice total
  expect(source).toContain("pendingTotal");
  // defect 3: the reconcile outcome is skipped, not fabricated, when the pass is null - the record
  // sits INSIDE the guard on the pass having answered, so a null pass reaches no recorder at all
  expect(source).toMatch(/if \(sweep\) \{[\s\S]{0,900}recordQueueDepths\(\{ stranded \}\)/);
});
