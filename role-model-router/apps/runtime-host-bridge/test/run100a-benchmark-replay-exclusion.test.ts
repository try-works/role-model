import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { expect, test } from "vitest";

import { runAutoReplayTick } from "../src/track-b-auto-replay.js";
import { createReplayLedger } from "../src/track-b-replay-ledger.js";
import {
  buildReplayPolicySet,
  decideReplayAdmission,
  isBenchmarkReplaySourceRef,
} from "../src/track-b-replay-policy.js";
import { appendTrackBRouteAdvisoryObservation } from "../src/track-b-runtime.js";

/**
 * Run 100 addendum `00-requirements.benchmark-traffic-exclusion.addendum-01` (operator instruction
 * 2026-09-22: "benchmark traffic should never become considered for replay and evaluation, it must
 * always be excluded from replay and evals").
 *
 * Measured before the change: benchmark traffic produced no durable capture at all (0 of 5,524 replay
 * dispositions, 0 of 6,686 replay-ledger dispatches, 0 of 1,640 evaluation cases, 0 of 13,360 trace
 * roots), so the exclusion existed only by accident of the bench path. What it *did* do was enter the
 * learning evidence: 144 of the newest 500 advisory-observation rows were `decision-bench-*`, recorded
 * as `mode: active, origin: live`. This suite makes the exclusion explicit at both boundaries.
 */

const VALID_ADMISSION = {
  channelReplayEnabled: true,
  captureAvailable: true,
  scopeAuthorized: true,
  authorizationEpochValid: true,
  retentionReplayable: true,
  privacyReplayable: true,
  distinctCandidateCount: 3,
  budgetAvailable: true,
  alreadyProcessed: false,
  sourceIsReplayProduced: false,
  policyIdsResolvable: true,
  dependenciesAvailable: true,
} as const;

test("run100a benchmark request ids are recognised as benchmark sources", () => {
  for (const ref of [
    "bench-h01-implement-two-sum-deepseek-flash-max-turn1-abc",
    "bench-judge-abc",
    "bench-judge-compare-case-1-abc",
    "bench-run42-case-9-endpoint-a",
  ]) {
    expect(isBenchmarkReplaySourceRef(ref)).toBe(true);
  }
  for (const ref of ["req-3b117db8", "replay-req-0902929a", "replay-judge-010c5163", ""]) {
    expect(isBenchmarkReplaySourceRef(ref)).toBe(false);
  }
});

test("run100a admission refuses a benchmark capture by name and admits everything else", () => {
  const refused = decideReplayAdmission({ ...VALID_ADMISSION, sourceIsBenchmark: true });
  expect(refused.admitted).toBe(false);
  if (!refused.admitted) {
    expect(refused.code).toBe("benchmark_source_not_replayable");
    expect(refused.detail).toMatch(/benchmark/u);
  }
  // The rule is additive: the same input without the benchmark marker is admitted.
  expect(decideReplayAdmission({ ...VALID_ADMISSION, sourceIsBenchmark: false }).admitted).toBe(true);
});

function tempLedger() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "run100a-bench-"));
  return {
    ledger: createReplayLedger({
      filePath: path.join(dir, "ledger.json"),
      now: () => Date.parse("2026-09-22T08:00:00Z"),
    }),
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}

test("run100a the auto producer terminally refuses a benchmark capture and reserves no budget", async () => {
  const { ledger, cleanup } = tempLedger();
  try {
    let executed = 0;
    const result = await runAutoReplayTick({
      captures: [
        {
          captureRef: "bench-h01-implement-two-sum-deepseek-flash-max-turn1-abc",
          sourceEndpointId: "endpoint-a",
          hasRecordedToolResults: true,
        },
        { captureRef: "req-real-1", sourceEndpointId: "endpoint-b", hasRecordedToolResults: true },
      ],
      configuredEndpointIds: ["endpoint-a", "endpoint-b", "endpoint-c", "endpoint-d"],
      ledger,
      policySet: buildReplayPolicySet(),
      executor: async ({ candidates }) => {
        executed += 1;
        return {
          terminal: true,
          branches: candidates.map((endpointId) => ({ endpointId, outcome: "complete" as const })),
        };
      },
    });
    const bench = result.dispositions.find((row) => row.captureRef.startsWith("bench-"));
    expect(bench?.outcome).toBe("refused");
    expect(bench?.code).toBe("benchmark_source_not_replayable");
    // Terminal, not deferred: it must never be re-queued on a later tick.
    expect(result.deferred).toBe(0);
    expect(executed).toBe(1); // only the real capture dispatched
    expect(result.replayed).toBe(1);
  } finally {
    cleanup();
  }
});

test("run100a the advisory ledger does not record a benchmark decision", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "run100a-ledger-"));
  const filePath = path.join(dir, "advisory-observations.json");
  try {
    const skipped = await appendTrackBRouteAdvisoryObservation({
      filePath,
      observation: {
        schemaVersion: "role-model.route-advisory-observation.v1",
        decisionId: "decision-bench-h01-implement-two-sum-endpoint-a-turn1-abc",
        routePackage: "endpoint-a",
        advisoryState: "fresh",
      },
    });
    expect(skipped).toMatchObject({ appended: false, skipped: "benchmark_source" });
    expect(existsSync(filePath)).toBe(false);

    const appended = await appendTrackBRouteAdvisoryObservation({
      filePath,
      observation: {
        schemaVersion: "role-model.route-advisory-observation.v1",
        decisionId: "decision-req-3b117db8-2419-4894-9e3d-eae2bdbe5cb7",
        routePackage: "endpoint-a",
        advisoryState: "fresh",
      },
    });
    expect(appended).toMatchObject({ appended: true });
    const ledger = JSON.parse(readFileSync(filePath, "utf8")) as {
      totals: { observed: number };
      entries: readonly { decisionId?: string }[];
    };
    expect(ledger.totals.observed).toBe(1);
    expect(ledger.entries).toHaveLength(1);
    expect(ledger.entries[0]?.decisionId).toContain("req-3b117db8");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
