/**
 * Run 101 addendum 46 - the queue-mode producer must not walk the whole focus-family corpus.
 *
 * MEASURED live on production :3456 (2026-10-16, v0.0.19): the interval tick held focus on
 * coder.debug.root_cause (398 live captures) and its readRouteReplayableCaptures projection
 * performed one exact capsule read per request id through the private boundary (10-50 s each),
 * so the walk never finished inside the 600 s stale-tick deadline and NO replay.dispatch row
 * was ever offered. The queue workers are parallel; the producer feed is the serial bottleneck.
 *
 * In queue mode the interval tick only ever dispatches captures that are ALREADY on the bounded
 * pending page, so the focus corpus read must be restricted to exactly that page (the same
 * onlyCaptureRefs restriction addendum 45 gives the worker). A focus family with nothing on the
 * pending page is skipped as NoReplayableRequest - never projected as the whole historical corpus.
 */
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { expect, test } from "vitest";

import { startAutoReplayLoop } from "../src/track-b-auto-replay-runtime.js";
import { createReplayLedger } from "../src/track-b-replay-ledger.js";
import { buildReplayPolicySet } from "../src/track-b-replay-policy.js";

const focusTask = () => ({
  roleId: "coder",
  taskTypeId: "coder.debug.root_cause",
  scopeKey: "coder\u0000coder.debug.root_cause",
  requestCount: 398,
  admitted: 0,
  configured: 3,
  remaining: 3,
});

function harness() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "run101-add46-"));
  return {
    ledger: createReplayLedger({
      filePath: path.join(dir, "ledger.json"),
      now: () => Date.parse("2026-10-16T06:00:00Z"),
    }),
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}

function startLoop(options: {
  readonly pending: Array<Record<string, unknown>>;
  readonly corpusRequests: Array<{
    roleId?: string;
    taskTypeId?: string;
    onlyCaptureRefs?: readonly string[];
  }>;
  readonly offers: Array<Record<string, unknown>>;
}) {
  const recorded: Array<Record<string, unknown>> = [];
  const loop = startAutoReplayLoop({
    operations: {
      async listPendingReplayCaptures() {
        return { pending: options.pending, pendingCount: options.pending.length };
      },
      async recordReplayDisposition(input: Record<string, unknown>) {
        recorded.push(input);
        return { recorded: true };
      },
    },
    ledger: optionsLedger(),
    policySet: buildReplayPolicySet(),
    configuredEndpointIds: () => ["endpoint-a", "endpoint-b", "endpoint-c"],
    routeFocusCandidates: () => [focusTask()],
    readRouteLadder: () => ({
      roleId: "coder",
      taskTypeId: "coder.debug.root_cause",
      rungs: [],
      nextEligibleAtMs: 0,
    }),
    markRouteLadderEligible: async () => ({ marked: true }),
    readFinalizedRouteChallenge: async () => null,
    readRouteReplayableCaptures: async (request: {
      roleId?: string;
      taskTypeId?: string;
      onlyCaptureRefs?: readonly string[];
    }) => {
      options.corpusRequests.push({
        roleId: request.roleId,
        taskTypeId: request.taskTypeId,
        onlyCaptureRefs: request.onlyCaptureRefs,
      });
      return [];
    },
    readRouteDispatchEvidence: async () => [],
    routeLearningDefaults: {
      minComparisons: 5,
      minConfidence: 0.7,
      stalenessWindowDays: 30,
      challengeBatchSize: 1,
    },
    executor: async () => ({ terminal: true, branches: [] }),
    dispatchQueue: {
      mode: "queue",
      offer: async (job: Record<string, unknown>) => {
        options.offers.push(job);
        return { enqueued: true, jobId: job.captureRef };
      },
    },
    planeModes: { replay: "queue", evaluation: "legacy", learner: "legacy" },
    staleTickDeadlineMs: 600_000,
    now: () => Date.parse("2026-10-16T06:00:00Z"),
  });
  return { loop, recorded };
}

function optionsLedger() {
  return currentLedger;
}
let currentLedger: ReturnType<typeof createReplayLedger>;

test("addendum46: the queue-mode interval tick restricts the focus corpus read to the pending page", async () => {
  const h = harness();
  currentLedger = h.ledger;
  try {
    const pending = [
      {
        captureRef: "req-page-1",
        roleId: "coder",
        taskTypeId: "coder.debug.root_cause",
        sourceEndpointId: "endpoint-a",
        sourceModelId: "model-a",
        sourceClass: "live",
        hasRecordedToolResults: false,
      },
    ];
    const corpusRequests: Array<{
      roleId?: string;
      taskTypeId?: string;
      onlyCaptureRefs?: readonly string[];
    }> = [];
    const offers: Array<Record<string, unknown>> = [];
    const { loop } = startLoop({ pending, corpusRequests, offers });
    await loop.tick();
    loop.stop();
    expect(corpusRequests.length).toBeGreaterThan(0);
    for (const request of corpusRequests) {
      expect(request.onlyCaptureRefs).toEqual(["req-page-1"]);
    }
  } finally {
    h.cleanup();
  }
});

test("addendum46: a focus family with nothing on the pending page is skipped, not projected wholesale", async () => {
  const h = harness();
  currentLedger = h.ledger;
  try {
    // A pending page that only holds OTHER families: the focus family must not trigger an unrestricted read.
    const pending = [
      {
        captureRef: "req-other",
        roleId: "writer",
        taskTypeId: "writer.summarize",
        sourceEndpointId: "endpoint-b",
        sourceModelId: "model-b",
        sourceClass: "live",
        hasRecordedToolResults: false,
      },
    ];
    const corpusRequests: Array<{
      roleId?: string;
      taskTypeId?: string;
      onlyCaptureRefs?: readonly string[];
    }> = [];
    const offers: Array<Record<string, unknown>> = [];
    const { loop } = startLoop({ pending, corpusRequests, offers });
    await loop.tick().catch(() => undefined);
    loop.stop();
    // The wholesale family projection must never be invoked for a focus family the pending page does not hold.
    expect(corpusRequests).toHaveLength(0);
  } finally {
    h.cleanup();
  }
});
