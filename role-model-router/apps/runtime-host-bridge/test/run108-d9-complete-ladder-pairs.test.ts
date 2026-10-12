import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { expect, test } from "vitest";

import { startAutoReplayLoop } from "../src/track-b-auto-replay-runtime.js";
import { createReplayLedger } from "../src/track-b-replay-ledger.js";
import { buildReplayPolicySet } from "../src/track-b-replay-policy.js";

test("run108 D9 the auto loop passes complete ladder pairs into the pending replay projection", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "run108-d9-host-complete-pairs-"));
  try {
    const pendingInputs: Array<Record<string, unknown>> = [];
    let censusReads = 0;
    const loop = startAutoReplayLoop({
      operations: {
        async listPendingReplayCaptures(input) {
          pendingInputs.push(input as Record<string, unknown>);
          return { pending: [], pendingCount: 0, pendingTotal: 0 };
        },
        async recordReplayDisposition() {
          return { recorded: true };
        },
      },
      ledger: createReplayLedger({ filePath: path.join(dir, "ledger.json"), now: () => 1000 }),
      policySet: buildReplayPolicySet(),
      configuredEndpointIds: ["endpoint-a", "endpoint-b"],
      routeFocusCandidates: () => {
        censusReads += 1;
        return [
          {
            roleId: "writer",
            taskTypeId: "summarize",
            requestCount: 9,
            admitted: 2,
            configured: 2,
            rolledBack: false,
          },
          {
            roleId: "educator",
            taskTypeId: "feedback",
            requestCount: 4,
            admitted: 1,
            configured: 2,
            rolledBack: false,
          },
          {
            roleId: "operator",
            taskTypeId: "config",
            requestCount: 1,
            admitted: 0,
            configured: 0,
            rolledBack: false,
          },
        ];
      },
      readRouteLadder: () => null,
      routeLearningDefaults: {
        minComparisons: 5,
        minConfidence: 0.7,
        stalenessWindowDays: 30,
        challengeBatchSize: 1,
      },
      executor: async () => ({ terminal: true, branches: [] }),
      intervalMs: 60_000,
      now: () => 1000,
    });
    await loop.tick();
    loop.stop();

    expect(censusReads).toBeGreaterThan(0);
    expect(pendingInputs).toHaveLength(1);
    expect(pendingInputs[0]?.completeLadderPairs).toEqual([
      { roleId: "writer", taskTypeId: "summarize" },
    ]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
