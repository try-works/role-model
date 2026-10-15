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

/**
 * Live finding (2026-10-15): the served model was replayed against itself because the arm rule read
 * only the source ENDPOINT id. The tick can only enforce the source-model exclusion if the source
 * model identity survives EVERY projection that carries a capture to it - the durable pending row and
 * the claimed-capture metadata fallback. A field dropped by either parser is a rule that never fires.
 */
test("the claimed capture fallback carries the source model identity to the planner", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "claimed-model-smoke-"));
  const calls: { captureRef: string; candidates: readonly string[] }[] = [];
  const loop = startAutoReplayLoop({
    operations: {
      async listPendingReplayCaptures() {
        return { pending: [] };
      },
      async recordReplayDisposition() {
        return { recorded: true };
      },
      async readLocalRouteCapture() {
        return {
          captureRef: "claimed-model-capture",
          endpointId: "endpoint-src-flash-high",
          modelId: "deepseek/deepseek-flash",
          reasoningEffort: "high",
          roleId: "scientist",
          taskTypeId: "scientist.data.interpret",
        };
      },
    },
    ledger: createReplayLedger({ filePath: directory + "/ledger.json", now: () => 1_000 }),
    policySet: buildReplayPolicySet(),
    configuredEndpointIds: () => [
      "endpoint-src-flash-high",
      "endpoint-alt-flash-high",
      "endpoint-pro-max",
    ],
    // Same model at the SAME effort behind another endpoint id: the self-replay that must be refused.
    configuredEndpointDescriptors: () => [
      {
        endpointId: "endpoint-src-flash-high",
        modelId: "deepseek/deepseek-flash",
        reasoningEffort: "high",
        capabilities: ["text.chat"],
        modalities: ["text"],
      },
      {
        endpointId: "endpoint-alt-flash-high",
        modelId: "deepseek/deepseek-flash",
        reasoningEffort: "high",
        capabilities: ["text.chat"],
        modalities: ["text"],
      },
      {
        endpointId: "endpoint-pro-max",
        modelId: "deepseek/deepseek-v4-pro",
        reasoningEffort: "max",
        capabilities: ["text.chat"],
        modalities: ["text"],
      },
    ],
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
        { endpointId: "endpoint-src-flash-high", rank: 1, status: "available" },
        { endpointId: "endpoint-alt-flash-high", rank: 2, status: "available" },
      ],
      completeness: { admitted: 0, configured: 3 },
      nextEligibleAtMs: 0,
    }),
    readRouteReplayableCaptures: async () => [],
    executor: async (request) => {
      calls.push({ captureRef: request.capture.captureRef, candidates: request.candidates });
      return {
        terminal: true,
        branches: request.candidates.map((endpointId) => ({
          endpointId,
          outcome: "complete" as const,
        })),
      };
    },
  });

  await loop.tick({ onlyCaptureRefs: ["claimed-model-capture"] });
  const dispatched = calls.flatMap((call) => call.candidates);
  expect(dispatched).toContain("endpoint-pro-max");
  expect(dispatched).not.toContain("endpoint-alt-flash-high");
  await rm(directory, { recursive: true, force: true });
});
