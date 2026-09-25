import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { expect, test } from "vitest";

import { startAutoReplayLoop } from "../src/track-b-auto-replay-runtime.js";
import { runAutoReplayTick } from "../src/track-b-auto-replay.js";
import { createReplayLedger } from "../src/track-b-replay-ledger.js";
import {
  buildReplayPolicySet,
  decideReplayAdmission,
  isSyntheticProbeSourceClass,
} from "../src/track-b-replay-policy.js";

/**
 * Run 100 addendum 16 item 3 / 8a: a capture whose recorded reply is the marker its own instruction
 * demanded is not comparative evidence. Measured live on `:3457`: 31 of the newest 60 admissions (52%)
 * were that class and 11 of the newest 16 finalized comparisons were the `single_outcome` ties they
 * must produce. The capture write now classifies it (`replayEvidenceClass`, private `127e5859`) and the
 * pending projection excludes it, so the host's side of the rule is the admission refusal: terminal,
 * named, and before any capacity is reserved.
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
  sourceIsBenchmark: false,
  sourceIsReplayProduced: false,
  policyIdsResolvable: true,
  dependenciesAvailable: true,
} as const;

test("run150 item 3 the marker-echo probe class is recognised by name", () => {
  expect(isSyntheticProbeSourceClass("marker_echo_probe")).toBe(true);
  for (const value of [null, undefined, "", "marker_echo_probe ", "probe", "benchmark"]) {
    expect(isSyntheticProbeSourceClass(value)).toBe(false);
  }
});

test("run150 item 3 admission refuses a probe capture by name and admits everything else", () => {
  const refused = decideReplayAdmission({ ...VALID_ADMISSION, sourceIsSyntheticProbe: true });
  expect(refused.admitted).toBe(false);
  if (!refused.admitted) {
    expect(refused.code).toBe("synthetic_probe_not_replayable");
    expect(refused.detail).toMatch(/discriminate|marker/u);
  }
  // Additive: the same input without the class is admitted, and omitting the field entirely is not a
  // refusal either - older callers keep their behaviour.
  expect(
    decideReplayAdmission({ ...VALID_ADMISSION, sourceIsSyntheticProbe: false }).admitted,
  ).toBe(true);
  expect(decideReplayAdmission({ ...VALID_ADMISSION }).admitted).toBe(true);
});

test("run150 item 3 the auto producer terminally refuses a probe capture and reserves no budget", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "run150-item3-probe-producer-"));
  try {
    const ledger = createReplayLedger({
      filePath: path.join(dir, "ledger.json"),
      now: () => Date.parse("2026-09-25T06:00:00Z"),
    });
    let executed = 0;
    const result = await runAutoReplayTick({
      captures: [
        {
          captureRef: "req-probe-cf805851",
          sourceEndpointId: "endpoint-a",
          hasRecordedToolResults: true,
          sourceClass: "marker_echo_probe",
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
    const probe = result.dispositions.find((row) => row.captureRef === "req-probe-cf805851");
    expect(probe?.outcome).toBe("refused");
    expect(probe?.code).toBe("synthetic_probe_not_replayable");
    // Terminal, not deferred: it must never be re-queued on a later tick.
    expect(result.deferred).toBe(0);
    expect(executed).toBe(1); // only the real capture dispatched
    expect(result.replayed).toBe(1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("run150 item 3 the loop carries the projected class from the listing to the decision", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "run150-item3-probe-loop-"));
  try {
    const ledger = createReplayLedger({
      filePath: path.join(dir, "ledger.json"),
      now: () => Date.parse("2026-09-25T06:00:00Z"),
    });
    const dispositions: Array<Record<string, unknown>> = [];
    let executed = 0;
    const loop = startAutoReplayLoop({
      operations: {
        async listPendingReplayCaptures() {
          return {
            pending: [
              {
                captureRef: "req-probe-3b117db8",
                sourceEndpointId: "endpoint-a",
                hasRecordedToolResults: true,
                sourceClass: "marker_echo_probe",
              },
              {
                captureRef: "req-real-2",
                sourceEndpointId: "endpoint-b",
                hasRecordedToolResults: true,
              },
            ],
            pendingCount: 2,
          };
        },
        async recordReplayDisposition(input: Record<string, unknown>) {
          dispositions.push(input);
          return { recorded: true };
        },
      },
      ledger,
      policySet: buildReplayPolicySet(),
      configuredEndpointIds: ["endpoint-a", "endpoint-b", "endpoint-c"],
      executor: async ({ candidates }) => {
        executed += 1;
        return {
          terminal: true,
          branches: candidates.map((endpointId) => ({ endpointId, outcome: "complete" as const })),
        };
      },
      intervalMs: 60_000,
      now: () => Date.parse("2026-09-25T06:00:00Z"),
    });
    const result = await loop.tick();
    loop.stop();

    expect(result.replayed).toBe(1);
    expect(executed).toBe(1);
    const probe = dispositions.find((row) => row.captureRef === "req-probe-3b117db8");
    expect(probe?.refusalCode).toBe("synthetic_probe_not_replayable");
    expect(probe?.outcome).toBe("refused");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
