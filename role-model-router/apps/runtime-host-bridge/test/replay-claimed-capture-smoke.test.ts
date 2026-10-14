import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expect, test } from "vitest";
import { createReplayLedger } from "../src/track-b-replay-ledger.js";
import { buildReplayPolicySet } from "../src/track-b-replay-policy.js";
import { startAutoReplayLoop } from "../src/track-b-auto-replay-runtime.js";
import type { AutoReplayCapture } from "../src/track-b-auto-replay.js";

test("a claimed capture is replayed from its root metadata when the pending page omits it", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "claimed-capture-smoke-"));
  const calls: { captureRef: string; candidates: readonly string[] }[] = [];
  const metadataCapture: AutoReplayCapture = {
    captureRef: "claimed-capture",
    sourceEndpointId: "endpoint-b",
    hasRecordedToolResults: false,
    roleId: "scientist",
    taskTypeId: "scientist.data.interpret",
  };
  const loop = startAutoReplayLoop({
    operations: {
      async listPendingReplayCaptures() {
        return { pending: [] };
      },
      async recordReplayDisposition() {
        return { recorded: true };
      },
      async readLocalRouteCapture() {
        return metadataCapture;
      },
    },
    ledger: createReplayLedger({ filePath: directory + "/ledger.json", now: () => 1_000 }),
    policySet: buildReplayPolicySet(),
    configuredEndpointIds: () => ["endpoint-a", "endpoint-b", "endpoint-c"],
    routeFocusCandidates: () => [
      {
        roleId: "scientist",
        taskTypeId: "scientist.data.interpret",
        requestCount: 3,
        admitted: 0,
        configured: 3,
      },
    ],
    readRouteLadder: () => ({
      rungs: [
        { endpointId: "endpoint-a", rank: 1, status: "available" },
        { endpointId: "endpoint-b", rank: 2, status: "available" },
      ],
      completeness: { admitted: 0, configured: 3 },
      nextEligibleAtMs: 0,
    }),
    readRouteReplayableCaptures: async () => [metadataCapture],
    executor: async (request) => {
      calls.push({ captureRef: request.capture.captureRef, candidates: request.candidates });
      return {
        terminal: true,
        branches: [{ endpointId: "endpoint-a", outcome: "complete" as const }],
      };
    },
  });

  const result = await loop.tick({ onlyCaptureRefs: ["claimed-capture"] });
  expect(calls.map((call) => call.captureRef)).toEqual(["claimed-capture"]);
  expect(result.replayed).toBe(1);
  await rm(directory, { recursive: true, force: true });
});
