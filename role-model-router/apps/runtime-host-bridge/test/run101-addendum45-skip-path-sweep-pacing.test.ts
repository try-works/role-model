/**
 * Run 101 addendum 45 - the skip path must PACE its liveness sweeps.
 *
 * MEASURED live on production `:3456` (2026-10-14, v0.0.18): while the `replay.dispatch` worker's
 * `dispatchCapture` tick was in flight, EVERY 30 s interval tick ran the whole sweep suite instead of
 * skipping. On that host one suite costs 15 s (`replay:expire-stale-jobs`) + 13 s (`replay:list-jobs`)
 * + evaluation reconciliation against a 60 s sidecar timeout - more than the interval itself - so the
 * sweeps ran back to back and saturated the private boundary the worker's walk needed. Every attempt
 * then exceeded its 600 s `attemptTimeoutMs` (`TimeoutError: Operation timed out after '10m'`, five
 * attempts per job) and `replay_dispositions` stayed empty for the lifetime of the host.
 *
 * L7's intent is preserved: an overdue job is still expired while a long work tick holds the slot.
 * `pause()` is the same skip branch the busy interval path takes, so it drives the branch under test
 * without needing a second tick to be in flight.
 */
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, test } from "vitest";

import { startAutoReplayLoop } from "../src/track-b-auto-replay-runtime.js";
import { createReplayLedger } from "../src/track-b-replay-ledger.js";
import { buildReplayPolicySet } from "../src/track-b-replay-policy.js";

const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

test("@recursive:101-effect-mq-queue-rebuild addendum45: skip-path sweeps are paced, not per-interval", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "run101-add45-sweep-"));
  let clock = 1_000;
  let sweeps = 0;
  const loop = startAutoReplayLoop({
    operations: {
      async expireStaleReplayJobs() {
        sweeps += 1;
        return { expiredCount: 0 };
      },
      async listPendingReplayCaptures() {
        return { pending: [] };
      },
      async recordReplayDisposition() {
        return { recorded: true };
      },
    },
    ledger: createReplayLedger({ filePath: path.join(dir, "ledger.json"), now: () => clock }),
    policySet: buildReplayPolicySet(),
    configuredEndpointIds: () => ["endpoint-a"],
    routeFocusCandidates: () => [],
    readRouteLadder: () => null,
    executor: async () => ({ terminal: true, branches: [] }),
    skipPathSweepIntervalMs: 60_000,
    now: () => clock,
  });
  cleanups.push(() => {
    loop.stop();
    rmSync(dir, { recursive: true, force: true });
  });

  // The loop is paused, which is the skip branch the busy interval path also takes.
  loop.pause();
  const first = await loop.tick();
  expect(first.skipped, "the paused loop takes the skip path").toBe(true);
  expect(sweeps, "the skip path sweeps when none has run yet").toBe(1);

  // An interval tick inside the cadence still skips and must NOT sweep.
  clock += 30_000;
  await loop.tick();
  expect(sweeps, "no sweep inside the pacing window").toBe(1);

  // Past the cadence L7 still holds: an overdue job is expired while the loop is held.
  clock += 30_000;
  await loop.tick();
  expect(sweeps, "the skip path still sweeps once the cadence elapsed").toBe(2);
});
