import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, test } from "vitest";
import { type RouteLadderRow, startAutoReplayLoop } from "../src/track-b-auto-replay-runtime.js";
import {
  type AutoReplayCapture,
  buildAutoReplayIdempotencyKey,
} from "../src/track-b-auto-replay.js";
import { createReplayLedger } from "../src/track-b-replay-ledger.js";
import { buildReplayPolicySet } from "../src/track-b-replay-policy.js";
const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});
const task = (taskTypeId: string, requestCount = 10, admitted = 3, configured = 3) => ({
  roleId: "role",
  taskTypeId,
  requestCount,
  admitted,
  configured,
});
const capture = (taskTypeId: string, sourceEndpointId: string, suffix = ""): AutoReplayCapture => ({
  captureRef: `${taskTypeId}-${sourceEndpointId}${suffix}`,
  sourceEndpointId,
  roleId: "role",
  taskTypeId,
  hasRecordedToolResults: false,
});
const ladder = (ids = ["a", "b", "c"], nextEligibleAtMs = 999_999): RouteLadderRow => ({
  rungs: ids.map((endpointId, index) => ({ endpointId, rank: index + 1, status: "available" })),
  completeness: { admitted: ids.length, configured: ids.length },
  nextEligibleAtMs,
});
function harness(batch = 1) {
  const dir = mkdtempSync(path.join(os.tmpdir(), "run105-dispatch-"));
  let configured = ["a", "b", "c"];
  let census = [task("idle")];
  let pending: AutoReplayCapture[] = [
    capture("idle", "a"),
    capture("idle", "b"),
    capture("idle", "c"),
  ];
  const rows = new Map<string, RouteLadderRow>([["idle", ladder()]]);
  const marked: unknown[] = [];
  const calls: { captureRef: string; source: string | null; candidates: readonly string[] }[] = [];
  const finalized = new Map<
    string,
    {
      comparisonGroupId: string;
      finalizedAtMs: number;
      effortComparable: boolean;
      winnerEndpointId: string | null;
    }
  >();
  let settle: ((ref: string) => void) | undefined;
  const input = {
    operations: {
      async listPendingReplayCaptures() {
        return { pending };
      },
      async recordReplayDisposition() {
        return { recorded: true };
      },
    },
    ledger: createReplayLedger({ filePath: path.join(dir, "ledger.json"), now: () => 1000 }),
    policySet: buildReplayPolicySet(),
    configuredEndpointIds: () => configured,
    routeFocusCandidates: () => census,
    readRouteLadder: ({ taskTypeId }: { taskTypeId: string }) => rows.get(taskTypeId) ?? null,
    markRouteLadderEligible: (value: {
      roleId: string;
      taskTypeId: string;
      nextEligibleAtMs: number;
    }) => {
      marked.push(value);
      const row = rows.get(value.taskTypeId);
      if (row) rows.set(value.taskTypeId, { ...row, nextEligibleAtMs: value.nextEligibleAtMs });
    },
    readFinalizedRouteChallenge: async ({ captureRef }: { captureRef: string }) =>
      finalized.get(captureRef) ?? null,
    routeLearningDefaults: {
      minComparisons: 5,
      minConfidence: 0.7,
      stalenessWindowDays: 30,
      challengeBatchSize: batch,
    },
    executor: async ({
      capture: item,
      candidates,
    }: { capture: AutoReplayCapture; candidates: readonly string[] }) => {
      calls.push({ captureRef: item.captureRef, source: item.sourceEndpointId, candidates });
      settle?.(item.captureRef);
      return {
        terminal: true,
        branches: candidates.map((endpointId) => ({ endpointId, outcome: "complete" as const })),
      };
    },
    now: () => 1000,
  };
  const loop = startAutoReplayLoop(input);
  cleanups.push(() => {
    loop.stop();
    rmSync(dir, { recursive: true, force: true });
  });
  return {
    loop,
    input,
    calls,
    marked,
    rows,
    finalized,
    configure: (ids: string[]) => {
      configured = ids;
    },
    census: (value: typeof census) => {
      census = value;
    },
    pending: (value: AutoReplayCapture[]) => {
      pending = value;
    },
    settle: (value: typeof settle) => {
      settle = value;
    },
    final: (ref: string, winnerEndpointId: string | null = "a") =>
      finalized.set(ref, {
        comparisonGroupId: `group-${ref}`,
        finalizedAtMs: 1000,
        effortComparable: true,
        winnerEndpointId,
      }),
  };
}
/**
 * Run 108 addendum-02 (I2, the promotion floor) changed the shape of a FOCUS-NARROWED dispatch, and the
 * expectations in this file were written against the shape it replaced.
 *
 * Before: the narrowing COLLAPSED the candidate pool to the single focus endpoint
 * (`configuredEndpointIds: [focusNarrowingEndpointId]`), so every narrowed dispatch planned exactly one
 * arm. After: the pool is [the focus arm, ...the remaining configured endpoints], and
 * `selectReplayCandidates` decides the rest - it keeps that order (there is no rotationKey on a focus
 * plan), drops the capture's own source, the effective judge, unhealthy endpoints and eligibility
 * rejections, and bounds the plan at the arm bound (`maxCounterfactualArms`, default 3). The focus arm is
 * therefore still FIRST and still decides; the arms after it are the non-deciding cases the declared
 * `holdout`/`train` split needs (without them both cases were forced to `holdout`, the shadow pipeline's
 * train-case rescue never fired, `developmentComparisons` read 0 in every receipt and `floorMet` was
 * unreachable - the defect this run exists to close).
 *
 * The assertions below therefore name the NEW exact calls. They are not relaxed: each one still pins the
 * full array, in order, so a dropped, reordered or extra arm fails.
 */
test("new endpoint records now and challenges future-idle ladder using the real rung source", async () => {
  const h = harness();
  await h.loop.tick();
  expect(h.calls).toEqual([]);
  h.configure(["a", "b", "c", "new"]);
  h.census([task("idle", 10, 3, 4)]);
  await h.loop.tick();
  expect(h.marked).toContainEqual({ roleId: "role", taskTypeId: "idle", nextEligibleAtMs: 1000 });
  // run108 addendum-02 (I2): focus arm FIRST and deciding, then the policy-bounded pool (file note above).
  expect(h.calls).toEqual([{ captureRef: "idle-a", source: "a", candidates: ["new", "b", "c"] }]);
});
test("focus fill stays depth-first when another task becomes busier and gains a new endpoint", async () => {
  const h = harness();
  h.rows.set("fill", { ...ladder(["a"], 0), completeness: { admitted: 1, configured: 3 } });
  h.census([task("fill", 20, 1, 3), task("idle", 10)]);
  h.pending([capture("fill", "a"), capture("idle", "a")]);
  await h.loop.tick();
  h.configure(["a", "b", "c", "new"]);
  h.census([task("idle", 200, 3, 4), task("fill", 20, 1, 4)]);
  h.pending([capture("fill", "a", "-next"), capture("idle", "a")]);
  await h.loop.tick();
  expect(h.loop.health().focusTaskKey).toBe("role\u0000fill");
  expect(h.calls.map((x) => x.captureRef)).toEqual(["fill-a", "fill-a-next"]);
  expect(h.marked).toContainEqual({ roleId: "role", taskTypeId: "idle", nextEligibleAtMs: 1000 });
});
test("terminal provider branches do not advance; finalized loss advances on next tick", async () => {
  const h = harness();
  h.configure(["a", "b", "c", "new"]);
  h.census([task("idle", 10, 3, 4)]);
  await h.loop.tick();
  await h.loop.tick();
  expect(h.calls.map((x) => x.source)).toEqual(["a"]);
  h.final("idle-a", "a");
  await h.loop.tick();
  expect(h.calls.map((x) => x.source)).toEqual(["a", "b"]);
  // run108 addendum-02 (I2): the focus arm stays first and decides; the appended policy-bounded arms follow
  // it. Asserted as the exact per-call arrays rather than by length, so a dropped or reordered arm fails.
  expect(h.calls.map((x) => x.candidates)).toEqual([
    ["new", "b", "c"],
    ["new", "a", "c"],
  ]);
});
test("challengeBatchSize runs sequential finalized comparisons and bounds one dispatch", async () => {
  const h = harness(2);
  h.configure(["a", "b", "c", "new"]);
  h.census([task("idle", 10, 3, 4)]);
  h.settle((ref) => h.final(ref, ref.endsWith("a") ? "a" : ref.endsWith("b") ? "b" : "c"));
  await h.loop.tick();
  expect(h.calls.map((x) => x.source)).toEqual(["a", "b"]);
  await h.loop.tick();
  expect(h.calls.map((x) => x.source)).toEqual(["a", "b", "c"]);
});
test("finalized challenger win stops descent before ladder publication catches up", async () => {
  const h = harness(3);
  h.configure(["a", "b", "c", "new"]);
  h.census([task("idle", 10, 3, 4)]);
  h.settle((ref) => h.final(ref, "new"));
  await h.loop.tick();
  await h.loop.tick();
  expect(h.calls.map((x) => x.source)).toEqual(["a"]);
  expect(h.loop.health().challengeInFlight).toBe(false);
});
test("rollback pauses and roll forward resumes the pending challenge", async () => {
  const h = harness();
  h.configure(["a", "b", "c", "new"]);
  h.census([task("idle", 10, 3, 4)]);
  await h.loop.tick();
  h.final("idle-a", "a");
  h.rows.set("idle", { ...ladder(), rolledBack: { on: true, reason: "operator", atMs: 1000 } });
  await h.loop.tick();
  expect(h.calls.map((x) => x.source)).toEqual(["a"]);
  h.rows.set("idle", ladder());
  await h.loop.tick();
  expect(h.calls.map((x) => x.source)).toEqual(["a", "b"]);
});
test("stage census failure fails closed rather than replaying scope-wide", async () => {
  const h = harness();
  h.input.routeFocusCandidates = () => {
    throw new Error("census offline");
  };
  await h.loop.tick();
  expect(h.calls).toEqual([]);
  expect(h.loop.health()).toMatchObject({ lastOutcome: "degraded" });
  expect(h.loop.health().lastError).toContain("route focus census unavailable");
});
test("absent finalized callback fails closed and reports required binding", async () => {
  const h = harness();
  h.configure(["a", "b", "c", "new"]);
  h.census([task("idle", 10, 3, 4)]);
  h.input.readFinalizedRouteChallenge = undefined as never;
  await h.loop.tick();
  expect(h.calls).toEqual([]);
  expect(h.loop.health().lastError).toContain("route challenge finalization unavailable");
});
test("request-volume ties use most-unfilled and never dispatch other task captures", async () => {
  const h = harness();
  h.rows.set("few", { ...ladder(["a", "b"], 0), completeness: { admitted: 2, configured: 3 } });
  h.rows.set("more", { ...ladder(["a"], 0), completeness: { admitted: 1, configured: 3 } });
  h.census([task("few", 30, 2, 3), task("more", 30, 1, 3), task("never", 0, 0, 3)]);
  h.pending([capture("few", "a"), capture("more", "a"), capture("never", "a")]);
  await h.loop.tick();
  expect(h.calls.map((x) => x.captureRef)).toEqual(["more-a"]);
});
test("endpoint arrival marks partial tasks eligible without preempting an in-flight focus fill", async () => {
  const h = harness();
  h.rows.set("fill", { ...ladder(["a"], 0), completeness: { admitted: 1, configured: 3 } });
  h.census([task("fill", 20, 1, 3), task("idle", 10)]);
  h.pending([capture("fill", "a"), capture("idle", "a")]);
  let entered!: () => void;
  const started = new Promise<void>((resolve) => {
    entered = resolve;
  });
  let release!: () => void;
  const barrier = new Promise<void>((resolve) => {
    release = resolve;
  });
  const executor = h.input.executor;
  h.input.executor = async (request) => {
    entered();
    await barrier;
    return executor(request);
  };
  const first = h.loop.tick();
  await started;
  h.configure(["a", "b", "c", "new"]);
  h.census([task("fill", 20, 1, 4), task("idle", 200, 3, 4)]);
  expect((await h.loop.tick()).skipped).toBe(true);
  expect(h.loop.health().focusTaskKey).toBe("role\u0000fill");
  release();
  await first;
  h.pending([capture("fill", "a", "-next"), capture("idle", "a")]);
  await h.loop.tick();
  expect(h.calls.map((x) => x.captureRef)).toEqual(["fill-a", "fill-a-next"]);
  expect(h.marked).toContainEqual({ roleId: "role", taskTypeId: "fill", nextEligibleAtMs: 1000 });
});
test("concurrent queue claims never execute same task arms concurrently", async () => {
  const h = harness();
  h.configure(["a", "b", "c", "new"]);
  h.census([task("idle", 10, 3, 4)]);
  let entered!: () => void;
  const started = new Promise<void>((resolve) => {
    entered = resolve;
  });
  let release!: () => void;
  const barrier = new Promise<void>((resolve) => {
    release = resolve;
  });
  const executor = h.input.executor;
  h.input.executor = async (request) => {
    entered();
    await barrier;
    return executor(request);
  };
  const first = h.loop.dispatchCapture("idle-a");
  await started;
  const second = h.loop.dispatchCapture("idle-a");
  release();
  const [, secondResult] = await Promise.all([first, second]);
  expect(h.calls).toHaveLength(1);
  expect(secondResult.skipped).toBe(true);
});
test("queue offer holds one rung and claimed worker executes the same narrowed pair", async () => {
  const h = harness();
  h.configure(["a", "b", "c", "new"]);
  h.census([task("idle", 10, 3, 4)]);
  const offered: unknown[] = [];
  const queueLoop = startAutoReplayLoop({
    ...h.input,
    dispatchQueue: {
      mode: "queue",
      offer: async (request) => {
        offered.push(request);
        return { enqueued: true };
      },
    },
  });
  cleanups.push(() => queueLoop.stop());
  await queueLoop.tick();
  await queueLoop.tick();
  expect(offered).toHaveLength(1);
  expect(h.calls).toEqual([]);
  await queueLoop.dispatchCapture("idle-a");
  // run108 addendum-02 (I2): focus arm FIRST and deciding, then the policy-bounded pool (file note above).
  expect(h.calls).toEqual([{ captureRef: "idle-a", source: "a", candidates: ["new", "b", "c"] }]);
});
test("finalization failure still settles the actual disposition write before tick returns", async () => {
  const h = harness();
  h.configure(["a", "b", "c", "new"]);
  h.census([task("idle", 10, 3, 4)]);
  let release!: () => void;
  const barrier = new Promise<void>((resolve) => {
    release = resolve;
  });
  let entered!: () => void;
  const started = new Promise<void>((resolve) => {
    entered = resolve;
  });
  h.input.operations.recordReplayDisposition = async () => {
    entered();
    await barrier;
    return { recorded: true };
  };
  h.input.readFinalizedRouteChallenge = async () => {
    throw new Error("evaluation offline");
  };
  let returned = false;
  const work = h.loop.tick().then((value) => {
    returned = true;
    return value;
  });
  await started;
  await new Promise<void>((resolve) => setImmediate(resolve));
  const premature = returned;
  release();
  await work;
  expect(premature).toBe(false);
  expect(h.loop.health().lastError).toContain("evaluation offline");
});
test("expired complete ladder refreshes one pair and records a new window only after finalized comparison", async () => {
  const h = harness(3);
  h.rows.set("idle", ladder(["a", "b", "c"], 999));
  await h.loop.tick();
  // run108 addendum-02 (I2): focus arm FIRST and deciding, then the policy-bounded pool (file note above).
  expect(h.calls).toEqual([{ captureRef: "idle-a", source: "a", candidates: ["b", "c"] }]);
  expect(h.marked).toEqual([]); // Terminal provider branches are not finalized evaluation.
  await h.loop.tick();
  expect(h.calls).toHaveLength(1);
  expect(h.marked).toEqual([]);
  h.final("idle-a", "b");
  await h.loop.tick();
  expect(h.marked).toEqual([
    { roleId: "role", taskTypeId: "idle", nextEligibleAtMs: 1000 + 30 * 24 * 60 * 60 * 1000 },
  ]);
  await h.loop.tick();
  expect(h.calls).toHaveLength(1);
});
test("removed endpoint stale completeness never fabricates an endpoint arrival challenge", async () => {
  const h = harness();
  h.configure(["a", "b", "c"]);
  h.rows.set("idle", {
    ...ladder(["a", "b", "c", "removed"]),
    completeness: { admitted: 3, configured: 3 },
    rungs: [
      { endpointId: "a", rank: 1, status: "available" },
      { endpointId: "b", rank: 2, status: "available" },
      { endpointId: "removed", rank: 3, status: "unavailable" },
    ],
  });
  h.census([task("idle", 10, 3, 3)]);
  await h.loop.tick();
  expect(h.loop.health().challengeInFlight).toBe(false);
  expect(h.marked).toEqual([]);
  // run108 addendum-02 (I2): focus arm FIRST and deciding, then the policy-bounded pool (file note above).
  expect(h.calls).toEqual([{ captureRef: "idle-a", source: "a", candidates: ["c", "b"] }]);
});
test("multiple and later endpoint arrivals each start at the top after prior admission readback", async () => {
  const h = harness();
  h.configure(["a", "b", "c", "new", "later"]);
  h.census([task("idle", 10, 3, 5)]);
  h.settle((ref) => h.final(ref, "new"));
  await h.loop.tick();
  h.rows.set("idle", {
    ...ladder(["new", "a", "b", "c"], 1000),
    completeness: { admitted: 4, configured: 5 },
  });
  h.pending([capture("idle", "new", "-later")]);
  h.settle((ref) => h.final(ref, "later"));
  await h.loop.tick();
  // run108 addendum-02 (I2): each arrival still STARTS AT THE TOP - candidates[0] is the focus arm this
  // test is named for - and the appended pool follows it. The second plan is the cap binding: the pool
  // after the source filter is ["later", "a", "b", "c"], and maxCounterfactualArms (3) keeps three.
  expect(h.calls.map((x) => x.candidates)).toEqual([
    ["new", "b", "c"],
    ["later", "a", "b"],
  ]);
});
test("queue refusal clears pending rung for a genuine next-cycle offer retry", async () => {
  const h = harness();
  h.configure(["a", "b", "c", "new"]);
  h.census([task("idle", 10, 3, 4)]);
  let offers = 0;
  const queued = startAutoReplayLoop({
    ...h.input,
    dispatchQueue: {
      mode: "queue",
      offer: async () => ({ enqueued: ++offers > 1, reason: "busy" }),
    },
  });
  cleanups.push(() => queued.stop());
  await queued.tick();
  await queued.tick();
  expect(offers).toBe(2);
});
test("unavailable challenged rung is skipped without waiting for its absent finalized verdict", async () => {
  const h = harness();
  h.configure(["a", "b", "c", "new"]);
  h.census([task("idle", 10, 3, 4)]);
  await h.loop.tick();
  h.configure(["b", "c", "new"]);
  h.rows.set("idle", {
    ...ladder(),
    rungs: [
      { endpointId: "a", rank: 1, status: "unavailable" },
      { endpointId: "b", rank: 2, status: "available" },
      { endpointId: "c", rank: 3, status: "available" },
    ],
  });
  await h.loop.tick();
  expect(h.calls.map((x) => x.source)).toEqual(["a", "b"]);
});
test("restart rebuilds top-down cursor from distinct durable finalized groups even when old capture is absent", async () => {
  const h = harness();
  h.configure(["a", "b", "c", "new"]);
  h.census([task("idle", 10, 3, 4)]);
  h.rows.set("idle", ladder(["a", "b", "c"], 900));
  h.pending([capture("idle", "b", "-fresh")]);
  const evidence = {
    captureRef: "old-source-a",
    newEndpointId: "new",
    againstEndpointId: "a",
    comparisonGroupId: "real-group-a",
    finalizedAtMs: 950,
    effortComparable: true,
    winnerEndpointId: "a",
    judgeConfidence: 0.8,
    endpointConfidence: 0.8,
  };
  const restored = startAutoReplayLoop({
    ...h.input,
    readRouteDispatchEvidence: async () => [evidence, evidence],
  });
  cleanups.push(() => restored.stop());
  await restored.tick();
  // run108 addendum-02 (I2): focus arm FIRST and deciding, then the policy-bounded pool (file note above).
  expect(h.calls).toEqual([
    { captureRef: "idle-b-fresh", source: "b", candidates: ["new", "a", "c"] },
  ]);
});
test("placed below-floor challenger replenishes distinct captures until K groups then waits genuine publication", async () => {
  const h = harness();
  h.configure(["a", "b", "c", "new"]);
  h.census([task("idle", 10, 3, 4)]);
  h.rows.set("idle", ladder(["a", "b", "c"], 900));
  h.pending([capture("idle", "a", "-second"), capture("idle", "a", "-third")]);
  const evidence = [
    {
      captureRef: "old-source",
      newEndpointId: "new",
      againstEndpointId: "a",
      comparisonGroupId: "real-first",
      finalizedAtMs: 950,
      effortComparable: true,
      winnerEndpointId: "new",
      judgeConfidence: 0.8,
      endpointConfidence: 0.8,
    },
  ];
  const loop = startAutoReplayLoop({
    ...h.input,
    routeLearningDefaults: { ...h.input.routeLearningDefaults, minComparisons: 3 },
    readRouteDispatchEvidence: async () => evidence,
  });
  cleanups.push(() => loop.stop());
  h.settle((ref) => {
    h.final(ref, "new");
    evidence.push({
      ...(evidence[0] as (typeof evidence)[number]),
      captureRef: ref,
      comparisonGroupId: `real-${ref}`,
      finalizedAtMs: 1000,
    });
  });
  await loop.tick();
  await loop.tick();
  await loop.tick();
  expect(h.calls.map((x) => x.captureRef)).toEqual(["idle-a-second", "idle-a-third"]);
  expect(h.rows.get("idle")?.rungs?.map((x) => x.endpointId)).not.toContain("new");
});
test("unavailable durable enumeration fails closed and never treats null as empty evidence", async () => {
  const h = harness();
  h.configure(["a", "b", "c", "new"]);
  h.census([task("idle", 10, 3, 4)]);
  const loop = startAutoReplayLoop({ ...h.input, readRouteDispatchEvidence: async () => null });
  cleanups.push(() => loop.stop());
  await loop.tick();
  expect(h.calls).toEqual([]);
  expect(loop.health().lastError).toContain("route dispatch evidence unavailable");
});
test("run106 the liveness sweep still runs when the evidence read is unavailable", async () => {
  const h = harness();
  h.configure(["a", "b", "c", "new"]);
  h.census([task("idle", 10, 3, 4)]);
  const sweeps: Record<string, unknown>[] = [];
  const loop = startAutoReplayLoop({
    ...h.input,
    operations: {
      ...h.input.operations,
      async expireStaleReplayJobs(sweepInput: Record<string, unknown>) {
        sweeps.push(sweepInput);
        return { expiredCount: 1, expired: [{ jobId: "job-1" }] };
      },
    },
    readRouteDispatchEvidence: async () => null,
  });
  cleanups.push(() => loop.stop());
  await loop.tick();
  /**
   * BEHAVIOURAL, not a source assertion - deliberately, because a source assertion could not have caught the
   * defect this pins. The bounded liveness sweep used to run at the END of the tick, after the challenge loop,
   * so the fail-closed throw on an unavailable evidence read aborted the tick before reaching it. Measured live
   * on build 0.0.14-771-g09173f51 - with the scope fix already in place AND the computed scope verified to match
   * the persisted jobs - zero jobs were expired and no expirationReceipt was ever issued, because the sweep was
   * never called. Two independent causes; fixing only the scope left the sweep uncalled.
   */
  expect(sweeps.length, "the sweep must run BEFORE the evidence phase that throws").toBe(1);
  // ...and fail-closed is untouched: an unavailable enumeration still dispatches nothing.
  expect(h.calls).toEqual([]);
  expect(loop.health().lastError).toContain("route dispatch evidence unavailable");
});
test("run105 a tick that fails on every attempt reports itself in the log, not only in health state", async () => {
  const h = harness();
  h.configure(["a", "b", "c", "new"]);
  h.census([task("idle", 10, 3, 4)]);
  const loop = startAutoReplayLoop({ ...h.input, readRouteDispatchEvidence: async () => null });
  cleanups.push(() => loop.stop());
  const logged: string[] = [];
  const original = console.error;
  console.error = ((...args: unknown[]) => {
    logged.push(args.map((value) => String(value)).join(" "));
  }) as typeof console.error;
  try {
    await loop.tick();
  } finally {
    console.error = original;
  }
  expect(loop.health().lastError).toContain("route dispatch evidence unavailable");
  /**
   * Measured live before this: the loop failed on EVERY tick and the err log held 52 repetitions of the
   * dispatcher's own "[route-evidence-binding] failed: ..." warning with no line recording the consequence,
   * because the throw reached only health().lastError. The operator-facing surface reported
   * "replay":{"state":"ready"} throughout, so a completely stalled loop looked healthy from every angle. A
   * failure that runs every tick has to be legible in the logs.
   */
  expect(
    logged.join("\n"),
    "the tick failure must reach the log, not only the in-memory health state",
  ).toContain("route dispatch evidence unavailable");
});
test("historical replayable source seam retains exact task classification and actual source receipt", async () => {
  const h = harness();
  h.configure(["a", "b", "c", "new"]);
  h.census([task("idle", 10, 3, 4)]);
  h.pending([]);
  const loop = startAutoReplayLoop({
    ...h.input,
    readRouteReplayableCaptures: async () => [
      capture("other", "a"),
      capture("idle", "a", "-history"),
    ],
  });
  cleanups.push(() => loop.stop());
  await loop.tick();
  // run108 addendum-02 (I2): focus arm FIRST and deciding, then the policy-bounded pool (file note above).
  expect(h.calls).toEqual([
    { captureRef: "idle-a-history", source: "a", candidates: ["new", "b", "c"] },
  ]);
});
/**
 * Run 106 cold-start regression: the cheap pending view and the rich corpus read are two projections of
 * the SAME captures, and only the corpus read carries the route classification. Deduping by capture ref
 * alone discarded the classified row and kept the unclassified one, so a task whose captures all fit in
 * the pending scan window - a task that has just started being routed, or any small state root - threw
 * NoReplayableRequest on every tick for ever. The pending fixture below is the sidecar's real shape: the
 * same capture ref, without identity.
 */
test("cold-start task owns an unclassified pending row once the corpus read proves its classification", async () => {
  const h = harness();
  h.configure(["a", "b", "c", "new"]);
  h.census([task("idle", 10, 3, 4)]);
  h.pending([
    {
      captureRef: "idle-a",
      sourceEndpointId: "a",
      hasRecordedToolResults: false,
      roleId: null,
      taskTypeId: null,
    },
  ]);
  const loop = startAutoReplayLoop({
    ...h.input,
    readRouteReplayableCaptures: async () => [capture("idle", "a")],
  });
  cleanups.push(() => loop.stop());
  await loop.tick();
  // run108 addendum-02 (I2): focus arm FIRST and deciding, then the policy-bounded pool (file note above).
  expect(h.calls).toEqual([{ captureRef: "idle-a", source: "a", candidates: ["new", "b", "c"] }]);
});
test("restart preserves recorded challenge cutoff rather than rewriting now and hiding durable groups", async () => {
  const h = harness();
  h.configure(["a", "b", "c", "new"]);
  h.census([task("idle", 10, 3, 4)]);
  h.rows.set("idle", ladder(["a", "b", "c"], 900));
  let requestedSince: number | undefined;
  const loop = startAutoReplayLoop({
    ...h.input,
    readRouteDispatchEvidence: async (request) => {
      requestedSince = request.sinceMs;
      return [];
    },
  });
  cleanups.push(() => loop.stop());
  await loop.tick();
  expect(requestedSince).toBe(900);
  expect(h.marked).toEqual([]);
});
test("stale exact-pair finalized signal never advances a newly started challenge", async () => {
  const h = harness();
  h.configure(["a", "b", "c", "new"]);
  h.census([task("idle", 10, 3, 4)]);
  h.finalized.set("idle-a", {
    comparisonGroupId: "old",
    finalizedAtMs: 800,
    effortComparable: true,
    winnerEndpointId: "a",
  });
  await h.loop.tick();
  await h.loop.tick();
  expect(h.calls.map((x) => x.source)).toEqual(["a"]);
  expect(h.loop.health().lastError).toContain("finalization unavailable");
});
test("executor failure before any branches resets pending for a genuine bounded retry", async () => {
  const h = harness();
  h.configure(["a", "b", "c", "new"]);
  h.census([task("idle", 10, 3, 4)]);
  let attempts = 0;
  const executor = h.input.executor;
  h.input.executor = async (request) => {
    if (++attempts === 1) throw new Error("provider unavailable");
    return executor(request);
  };
  await h.loop.tick();
  await h.loop.tick();
  expect(attempts).toBe(2);
  expect(h.calls).toHaveLength(1);
});
test("losing challenger's low own confidence cannot borrow high winning judge confidence for K floor", async () => {
  const h = harness();
  h.configure(["a", "b", "c", "new"]);
  h.census([task("idle", 10, 3, 4)]);
  h.rows.set("idle", ladder(["a", "b", "c"], 900));
  h.pending([capture("idle", "c", "-replenish")]);
  const evidence = ["a", "b", "c"].map((againstEndpointId, index) => ({
    captureRef: `old-${againstEndpointId}`,
    newEndpointId: "new",
    againstEndpointId,
    comparisonGroupId: `actual-loss-${index}`,
    finalizedAtMs: 950 + index,
    effortComparable: true,
    winnerEndpointId: againstEndpointId,
    judgeConfidence: 0.99,
    endpointConfidence: 0.2,
  }));
  const loop = startAutoReplayLoop({
    ...h.input,
    routeLearningDefaults: { ...h.input.routeLearningDefaults, minComparisons: 3 },
    readRouteDispatchEvidence: async () => evidence,
  });
  cleanups.push(() => loop.stop());
  await loop.tick();
  // run108 addendum-02 (I2): focus arm FIRST and deciding, then the policy-bounded pool (file note above).
  expect(h.calls).toEqual([
    { captureRef: "idle-c-replenish", source: "c", candidates: ["new", "a", "b"] },
  ]);
  expect(h.rows.get("idle")?.rungs?.map((rung) => rung.endpointId)).not.toContain("new");
});
test("restart recovers finalized complete refresh from durable group without redispatching absent old source", async () => {
  const h = harness();
  h.rows.set("idle", ladder(["a", "b", "c"], 900));
  h.pending([]);
  const refreshed = startAutoReplayLoop({
    ...h.input,
    readRouteDispatchEvidence: async (request) =>
      request.endpointId === "b"
        ? [
            {
              captureRef: "old-refresh-a",
              newEndpointId: "b",
              againstEndpointId: "a",
              comparisonGroupId: "real-refresh",
              finalizedAtMs: 950,
              effortComparable: true,
              winnerEndpointId: "b",
              judgeConfidence: 0.9,
              endpointConfidence: 0.9,
            },
          ]
        : [],
  });
  cleanups.push(() => refreshed.stop());
  await refreshed.tick();
  expect(h.calls).toEqual([]);
  expect(h.marked).toEqual([
    { roleId: "role", taskTypeId: "idle", nextEligibleAtMs: 1000 + 30 * 24 * 60 * 60 * 1000 },
  ]);
  expect(refreshed.health().lastOutcome).toBe("ok");
});
test("restart queued durable pair is not offered again and claimed worker resumes exact source pair", async () => {
  const h = harness();
  h.configure(["a", "b", "c", "new"]);
  h.census([task("idle", 10, 3, 4)]);
  h.rows.set("idle", ladder(["a", "b", "c"], 900));
  let offers = 0;
  const loop = startAutoReplayLoop({
    ...h.input,
    dispatchQueue: {
      mode: "queue",
      offer: async () => {
        offers++;
        return { enqueued: true };
      },
    },
    readPendingRouteDispatches: async () => [
      {
        sourceType: "replay" as const,
        queueJobId: null,
        replayJobId: "real-queued",
        captureRef: "idle-a",
        newEndpointId: "new",
        againstEndpointId: "a",
        createdAtMs: 950,
        state: "queued",
      },
    ],
  });
  cleanups.push(() => loop.stop());
  await loop.tick();
  expect(offers).toBe(0);
  expect(h.calls).toEqual([]);
  await loop.dispatchCapture("idle-a");
  // run108 addendum-02 (I2): focus arm FIRST and deciding, then the policy-bounded pool (file note above).
  expect(h.calls).toEqual([{ captureRef: "idle-a", source: "a", candidates: ["new", "b", "c"] }]);
});
test("restart running or awaiting-evaluation durable pair never starts duplicate provider work", async () => {
  for (const state of ["running", "awaiting_evaluation"] as const) {
    const h = harness();
    h.configure(["a", "b", "c", "new"]);
    h.census([task("idle", 10, 3, 4)]);
    h.rows.set("idle", ladder(["a", "b", "c"], 900));
    const loop = startAutoReplayLoop({
      ...h.input,
      readPendingRouteDispatches: async () => [
        {
          sourceType: "replay" as const,
          queueJobId: null,
          replayJobId: `real-${state}`,
          captureRef: "idle-a",
          newEndpointId: "new",
          againstEndpointId: "a",
          createdAtMs: 950,
          state,
        },
      ],
    });
    cleanups.push(() => loop.stop());
    await loop.tick();
    await loop.dispatchCapture("idle-a");
    expect(h.calls).toEqual([]);
  }
});
test("restart awaiting-evaluation complete refresh waits real finalization then resets window", async () => {
  const h = harness();
  h.rows.set("idle", ladder(["a", "b", "c"], 900));
  h.pending([]);
  const loop = startAutoReplayLoop({
    ...h.input,
    readPendingRouteDispatches: async () => [
      {
        sourceType: "replay" as const,
        queueJobId: null,
        replayJobId: "real-refresh-job",
        captureRef: "missing-old-a",
        newEndpointId: "b",
        againstEndpointId: "a",
        createdAtMs: 950,
        state: "awaiting_evaluation",
      },
    ],
  });
  cleanups.push(() => loop.stop());
  await loop.tick();
  expect(h.calls).toEqual([]);
  expect(h.marked).toEqual([]);
  h.final("missing-old-a", "b");
  await loop.tick();
  expect(h.marked).toEqual([
    { roleId: "role", taskTypeId: "idle", nextEligibleAtMs: 1000 + 30 * 24 * 60 * 60 * 1000 },
  ]);
});
test("real pre-replay queue identity recovers without inventing a replay job id", async () => {
  const h = harness();
  h.configure(["a", "b", "c", "new"]);
  h.census([task("idle", 10, 3, 4)]);
  h.rows.set("idle", ladder(["a", "b", "c"], 900));
  let offers = 0;
  const loop = startAutoReplayLoop({
    ...h.input,
    dispatchQueue: {
      mode: "queue",
      offer: async () => {
        offers++;
        return { enqueued: true };
      },
    },
    readPendingRouteDispatches: async () => [
      {
        sourceType: "queue",
        replayJobId: null,
        queueJobId: "actual-queue-id",
        captureRef: "idle-a",
        newEndpointId: "new",
        againstEndpointId: "a",
        createdAtMs: 950,
        state: "queued",
      },
    ],
  });
  cleanups.push(() => loop.stop());
  await loop.tick();
  expect(offers).toBe(0);
  expect(h.calls).toEqual([]);
  await loop.dispatchCapture("idle-a");
  expect(h.calls).toHaveLength(1);
});
test("same immutable historical capsule and pair create fresh bounded replay jobs for distinct finalized rounds", async () => {
  const h = harness();
  h.configure(["a", "b", "c", "new"]);
  h.census([task("idle", 10, 3, 4)]);
  h.rows.set("idle", ladder(["a", "b", "c"], 900));
  h.pending([capture("idle", "a")]);
  const evidence = [
    {
      captureRef: "older",
      newEndpointId: "new",
      againstEndpointId: "a",
      comparisonGroupId: "first",
      finalizedAtMs: 950,
      effortComparable: true,
      winnerEndpointId: "new",
      judgeConfidence: 0.9,
      endpointConfidence: 0.9,
    },
  ];
  const keys = new Set<string>();
  const rounds: (string | undefined)[] = [];
  const loop = startAutoReplayLoop({
    ...h.input,
    routeLearningDefaults: { ...h.input.routeLearningDefaults, minComparisons: 3 },
    readRouteDispatchEvidence: async () => evidence,
    executor: async (request) => {
      rounds.push(request.dispatchRoundId);
      const key = buildAutoReplayIdempotencyKey({
        captureRef: request.capture.captureRef,
        candidateEndpointIds: request.candidates,
        policySetDigest: request.policySet.policySetDigest,
        dispatchRoundId: request.dispatchRoundId,
      });
      if (!keys.has(key)) {
        keys.add(key);
        h.final(request.capture.captureRef, "new");
        evidence.push({
          ...(evidence[0] as (typeof evidence)[number]),
          captureRef: request.capture.captureRef,
          comparisonGroupId: `group-${key}`,
          finalizedAtMs: 1000,
        });
      }
      return { terminal: true, branches: [{ endpointId: "new", outcome: "complete" }] };
    },
  });
  cleanups.push(() => loop.stop());
  await loop.tick();
  await loop.tick();
  await loop.tick();
  expect(keys.size).toBe(2);
  expect(rounds.every(Boolean)).toBe(true);
  expect(h.input.ledger.status().dispatches).toBe(2);
  expect(evidence.map((row) => row.captureRef)).toEqual(["older", "idle-a", "idle-a"]);
});
test("explicit dispatch round id is stable on retries and changes only a completed round context", () => {
  const request = {
    captureRef: "actual-capsule",
    candidateEndpointIds: ["b"],
    policySetDigest: "policy",
  };
  const first = buildAutoReplayIdempotencyKey({ ...request, dispatchRoundId: "round-1" });
  expect(buildAutoReplayIdempotencyKey({ ...request, dispatchRoundId: "round-1" })).toBe(first);
  expect(buildAutoReplayIdempotencyKey({ ...request, dispatchRoundId: "round-2" })).not.toBe(first);
});
test("repeat round cannot consume same old group again while new evaluation remains pending", async () => {
  const h = harness();
  h.configure(["a", "b", "c", "new"]);
  h.census([task("idle", 10, 3, 4)]);
  h.rows.set("idle", ladder(["a", "b", "c"], 900));
  h.pending([capture("idle", "a")]);
  const evidence = [
    {
      captureRef: "older",
      newEndpointId: "new",
      againstEndpointId: "a",
      comparisonGroupId: "first",
      finalizedAtMs: 950,
      effortComparable: true,
      winnerEndpointId: "new",
      judgeConfidence: 0.9,
      endpointConfidence: 0.9,
    },
  ];
  let executions = 0;
  const loop = startAutoReplayLoop({
    ...h.input,
    routeLearningDefaults: { ...h.input.routeLearningDefaults, minComparisons: 4 },
    readRouteDispatchEvidence: async () => evidence,
    executor: async (request) => {
      if (++executions === 1) {
        h.final(request.capture.captureRef, "new");
        evidence.push({
          ...(evidence[0] as (typeof evidence)[number]),
          captureRef: request.capture.captureRef,
          comparisonGroupId: "group-idle-a",
          finalizedAtMs: 1000,
        });
      }
      return { terminal: true, branches: [{ endpointId: "new", outcome: "complete" }] };
    },
  });
  cleanups.push(() => loop.stop());
  await loop.tick();
  await loop.tick();
  await loop.tick();
  await loop.tick();
  expect(executions).toBe(2); // Second round awaits a NEW finalized group, not the old callback receipt.
  expect(loop.health().challengeInFlight).toBe(true);
});
test("repeated capsule exact-finalization lookup excludes stable distinct previously consumed group ids", async () => {
  const h = harness();
  h.configure(["a", "b", "c", "new"]);
  h.census([task("idle", 10, 3, 4)]);
  h.rows.set("idle", ladder(["a", "b", "c"], 900));
  h.pending([capture("idle", "a")]);
  const evidence = [
    {
      captureRef: "idle-a",
      newEndpointId: "new",
      againstEndpointId: "a",
      comparisonGroupId: "real-consumed",
      finalizedAtMs: 950,
      effortComparable: true,
      winnerEndpointId: "new",
      judgeConfidence: 0.9,
      endpointConfidence: 0.9,
    },
  ];
  const requested: unknown[] = [];
  const loop = startAutoReplayLoop({
    ...h.input,
    readRouteDispatchEvidence: async () => evidence,
    readFinalizedRouteChallenge: async (request) => {
      requested.push(request);
      return null;
    },
  });
  cleanups.push(() => loop.stop());
  await loop.tick();
  expect(requested).toContainEqual(
    expect.objectContaining({ excludedComparisonGroupIds: ["real-consumed"] }),
  );
});
test("claimed queue round resumes only its matching actual durable pair round", async () => {
  const h = harness();
  h.configure(["a", "b", "c", "new"]);
  h.census([task("idle", 10, 3, 4)]);
  h.rows.set("idle", ladder(["a", "b", "c"], 900));
  const observed: (string | undefined)[] = [];
  const executor = h.input.executor;
  const loop = startAutoReplayLoop({
    ...h.input,
    readPendingRouteDispatches: async () => [
      {
        sourceType: "queue" as const,
        replayJobId: null,
        queueJobId: "queue-real",
        captureRef: "idle-a",
        newEndpointId: "new",
        againstEndpointId: "a",
        createdAtMs: 950,
        state: "queued" as const,
        dispatchRoundId: "actual-persisted-round",
      },
    ],
    executor: async (request) => {
      observed.push(request.dispatchRoundId);
      return executor(request);
    },
  });
  cleanups.push(() => loop.stop());
  await loop.dispatchCapture("idle-a", "actual-persisted-round");
  expect(observed).toEqual(["actual-persisted-round"]);
});
test("foreign claimed round cannot relabel matching capsule or task to new provider work", async () => {
  const h = harness();
  h.configure(["a", "b", "c", "new"]);
  h.census([task("idle", 10, 3, 4)]);
  h.rows.set("idle", ladder(["a", "b", "c"], 900));
  const loop = startAutoReplayLoop({
    ...h.input,
    readPendingRouteDispatches: async () => [
      {
        sourceType: "queue" as const,
        replayJobId: null,
        queueJobId: "queue-real",
        captureRef: "idle-a",
        newEndpointId: "new",
        againstEndpointId: "a",
        createdAtMs: 950,
        state: "queued" as const,
        dispatchRoundId: "actual-persisted-round",
      },
    ],
  });
  cleanups.push(() => loop.stop());
  await loop.dispatchCapture("idle-a", "foreign-round");
  expect(h.calls).toEqual([]);
  expect(loop.health().lastError).toContain("claimed route dispatch round mismatch");
});
test("actual queue processing claim executes own persisted round while real replay running remains blocked", async () => {
  const h = harness();
  h.configure(["a", "b", "c", "new"]);
  h.census([task("idle", 10, 3, 4)]);
  h.rows.set("idle", ladder(["a", "b", "c"], 900));
  const loop = startAutoReplayLoop({
    ...h.input,
    readPendingRouteDispatches: async () => [
      {
        sourceType: "queue" as const,
        replayJobId: null,
        queueJobId: "claimed-processing-queue",
        captureRef: "idle-a",
        newEndpointId: "new",
        againstEndpointId: "a",
        createdAtMs: 950,
        state: "running" as const,
        dispatchRoundId: "own-processing-round",
      },
    ],
  });
  cleanups.push(() => loop.stop());
  await loop.dispatchCapture("idle-a", "own-processing-round");
  expect(h.calls).toHaveLength(1);
});
test("high-demand task with no replayable request is skipped so lower-demand task fills in same tick", async () => {
  const h = harness();
  h.rows.set("busy", { ...ladder(["a"], 0), completeness: { admitted: 1, configured: 3 } });
  h.rows.set("quiet", { ...ladder(["a"], 0), completeness: { admitted: 1, configured: 3 } });
  h.census([task("busy", 100, 1, 3), task("quiet", 5, 1, 3)]);
  h.pending([capture("quiet", "a")]);
  await h.loop.tick();
  expect(h.calls.map((item) => item.captureRef)).toEqual(["quiet-a"]);
  expect(h.loop.health().focusTaskKey).toBe("role\u0000quiet");
  h.pending([capture("quiet", "a", "-next")]);
  await h.loop.tick();
  expect(h.calls.map((item) => item.captureRef)).toEqual(["quiet-a", "quiet-a-next"]);
});
test("missing high-demand challenged-rung source skips task rather than starving lower eligible task", async () => {
  const h = harness();
  h.configure(["a", "b", "c", "new"]);
  h.rows.set("busy", ladder());
  h.rows.set("quiet", { ...ladder(["a"], 0), completeness: { admitted: 1, configured: 4 } });
  h.census([task("busy", 100, 3, 4), task("quiet", 5, 1, 4)]);
  h.pending([capture("busy", "b"), capture("quiet", "a")]);
  await h.loop.tick();
  // run108 addendum-02 (I2): focus arm FIRST and deciding, then the policy-bounded pool (file note above).
  expect(h.calls).toEqual([{ captureRef: "quiet-a", source: "a", candidates: ["b", "c", "new"] }]);
  expect(h.loop.health().focusTaskKey).toBe("role\u0000quiet");
});
test("unknown historical corpus availability fails closed and is not treated as a skippable empty task", async () => {
  const h = harness();
  h.rows.set("busy", { ...ladder(["a"], 0), completeness: { admitted: 1, configured: 3 } });
  h.rows.set("quiet", { ...ladder(["a"], 0), completeness: { admitted: 1, configured: 3 } });
  h.census([task("busy", 100, 1, 3), task("quiet", 5, 1, 3)]);
  h.pending([capture("quiet", "a")]);
  const loop = startAutoReplayLoop({ ...h.input, readRouteReplayableCaptures: async () => null });
  cleanups.push(() => loop.stop());
  await loop.tick();
  expect(h.calls).toEqual([]);
  expect(loop.health().lastError).toContain("route replayable corpus unavailable");
});
test("missing challenged-rung capture never substitutes a different source pair", async () => {
  const h = harness();
  h.configure(["a", "b", "c", "new"]);
  h.census([task("idle", 10, 3, 4)]);
  h.pending([capture("idle", "b")]);
  await h.loop.tick();
  expect(h.calls).toEqual([]);
  expect(h.loop.health().lastError).toContain("NoReplayableRequest");
});
