import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { expect, test, vi } from "vitest";

import {
  resolveAutoReplayDeadlineMs,
  resolveAutoReplayExecutorTimeoutMs,
  runAutoReplayTick,
} from "../src/track-b-auto-replay.js";
import { createReplayLedger } from "../src/track-b-replay-ledger.js";
import { buildReplayPolicySet } from "../src/track-b-replay-policy.js";

/**
 * Run 100 addendum `replay-dispatch-envelope-repair.addendum-03` S1 (operator report 2026-09-23:
 * "replays are stuck and not reaching eval or learner stage").
 *
 * `DEFAULT_EXECUTOR_TIMEOUT_MS` (12 min) was documented as "deliberately larger than a replay job's own
 * deadline plus finalization grace (6 min + 5 min)". Addendum 01 raised the per-candidate bound to 600 s,
 * so a three-candidate job's deadline became 30 min: the executor abandoned the capture at 12 minutes while
 * its durable job was still valid, the next tick re-claimed and restarted it, and the job only ended when
 * its own deadline expired — measured live as 27 frozen jobs on `:3457` and one clean-window job that was
 * attempted four times in 30 minutes and ended `timed_out` with the provider work already paid for.
 */

function ledgerIn(dir: string) {
  return createReplayLedger({ filePath: path.join(dir, "ledger.json") });
}

test("run100i the executor bound covers the durable job's own deadline", () => {
  const jobDeadlineMs = resolveAutoReplayDeadlineMs(3, {
    perCandidateMs: 600_000,
    maxMs: 3_600_000,
  });
  expect(jobDeadlineMs).toBe(1_800_000);

  const bound = resolveAutoReplayExecutorTimeoutMs({ candidateCount: 3 });
  expect(bound).toBeGreaterThanOrEqual(jobDeadlineMs + 5 * 60_000);

  // A small capture keeps the documented floor, and an explicit operator bound still wins.
  expect(resolveAutoReplayExecutorTimeoutMs({ candidateCount: 1 })).toBeGreaterThanOrEqual(
    12 * 60_000,
  );
  expect(resolveAutoReplayExecutorTimeoutMs({ candidateCount: 3, explicitMs: 60_000 })).toBe(
    60_000,
  );
});

test("run100i a capture is not abandoned before its durable job can finish", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "run100i-executor-bound-"));
  vi.useFakeTimers();
  try {
    const ledger = ledgerIn(dir);
    const startedAtMs = Date.parse("2026-09-23T23:00:00Z");
    const dispositions: string[] = [];
    const tick = runAutoReplayTick({
      captures: [
        { captureRef: "req-1", sourceEndpointId: "endpoint-a", hasRecordedToolResults: false },
      ],
      configuredEndpointIds: ["endpoint-a", "endpoint-b", "endpoint-c", "endpoint-d"],
      ledger,
      policySet: buildReplayPolicySet(),
      executor: async () => {
        // A capture whose replay takes longer than the old 12-minute bound but less than its own
        // 30-minute three-candidate deadline: it must be allowed to finish.
        await new Promise((resolve) => setTimeout(resolve, 20 * 60_000));
        return {
          terminal: true,
          branches: [
            { endpointId: "endpoint-b", outcome: "complete" as const },
            { endpointId: "endpoint-c", outcome: "complete" as const },
            { endpointId: "endpoint-d", outcome: "complete" as const },
          ],
        };
      },
      now: () => startedAtMs,
      dispositionSink: (row) => dispositions.push(`${row.outcome}:${row.detail ?? ""}`),
    });

    await vi.advanceTimersByTimeAsync(30 * 60_000);
    const result = await tick;

    expect(result.replayed).toBe(1);
    expect(dispositions).toHaveLength(1);
    expect(dispositions[0].startsWith("replayed:")).toBe(true);
  } finally {
    vi.useRealTimers();
    rmSync(dir, { recursive: true, force: true });
  }
});
