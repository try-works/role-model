import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:http";
import os from "node:os";
import path from "node:path";

import { expect, test } from "vitest";

import {
  HANDOFF_EVIDENCE_HOLD_TTL_MS,
  type SupervisedReplayEvaluationResumeEntry,
  createSupervisedReplayEvaluationResumeStore,
  handoffEvidenceHoldRequestIds,
} from "../src/supervised-replay-evaluation-resume.js";
import { createTrackBOperations } from "../src/track-b-operations.js";

const token = "run101-s22-operations-token-0123456789";

const resumeEntry = (replayJobId: string): SupervisedReplayEvaluationResumeEntry => ({
  schemaVersion: "role-model.supervised-replay-evaluation-resume.v1",
  replayJobId,
  evaluationJobId: `evaluation-${replayJobId}`,
  requestId: `req-${replayJobId}`,
  sourceCaptureRequestId: `req-${replayJobId}`,
  sourceEndpointId: "provider.endpoint.flash-high",
  sourceModelId: "provider/flash",
  counterfactualPackages: [
    {
      endpointId: "provider.endpoint.flash-max",
      modelId: "provider/flash",
      reasoningEffort: "max",
    },
  ],
  evaluationCriteria: {},
  evaluationCriteriaDigest: `sha256:${"0".repeat(64)}`,
  scope: "runtime:sha256-s22",
  recordedAtMs: 1_790_000_000_000,
  attempts: 0,
  resolvedAtMs: null,
  outcome: null,
  lastError: null,
});

/**
 * Run 100 addendum `handoff-evidence-durability.addendum-06` S22 (RC-6).
 *
 * The slice has three observable halves, and this test pins all three: the *pin set* a handoff names (the
 * source capture plus the arm captures the durable job records), the *boundary calls* that create and
 * release the pin, and the *moment* the pin is released - the store's terminal transition, not a caller's
 * memory of it.
 */
test("run101 S22: the pin names the source capture and every arm capture, once each", () => {
  expect(
    handoffEvidenceHoldRequestIds({
      requestId: "req-run101-s22",
      sourceCaptureRequestId: "req-run101-s22",
      branchCaptureRequestIds: [
        "replay-req-run101-s22-arm-a",
        " replay-req-run101-s22-arm-b ",
        "replay-req-run101-s22-arm-a",
        "",
      ],
    }),
  ).toEqual(["req-run101-s22", "replay-req-run101-s22-arm-a", "replay-req-run101-s22-arm-b"]);
  expect(handoffEvidenceHoldRequestIds({ branchCaptureRequestIds: ["", "   "] })).toEqual([]);
  expect(
    handoffEvidenceHoldRequestIds({ requestId: null, sourceCaptureRequestId: undefined }),
  ).toEqual([]);
  // The pin's lifetime is the renewal window, so a live handoff keeps its evidence pinned for at least a
  // day while the ring keeps only the newest pointers.
  expect(HANDOFF_EVIDENCE_HOLD_TTL_MS).toBe(24 * 60 * 60 * 1_000);
});

test("run101 S22: the operations client holds and releases through the private boundary", async () => {
  const seen: { method: string | undefined; url: string | undefined; body: unknown }[] = [];
  const server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      seen.push({
        method: request.method,
        url: request.url,
        body: chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : null,
      });
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ released: true, heldCaptureCount: 2 }));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("stub server did not bind");
  try {
    const operations = createTrackBOperations({
      statePath: path.join(os.tmpdir(), "run101-s22-operations-state.json"),
      catalog: [],
      operationsEndpoint: `http://127.0.0.1:${address.port}`,
      operationsToken: token,
    });
    await operations.holdLocalRouteCaptures({
      holderId: "replay-job-run101-s22",
      requestIds: ["req-run101-s22", "replay-req-run101-s22-arm-a"],
      ttlMs: HANDOFF_EVIDENCE_HOLD_TTL_MS,
    });
    await operations.releaseLocalRouteCaptures({ holderId: "replay-job-run101-s22" });
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
  expect(seen).toEqual([
    {
      method: "POST",
      url: "/capture/hold",
      body: {
        holderId: "replay-job-run101-s22",
        requestIds: ["req-run101-s22", "replay-req-run101-s22-arm-a"],
        ttlMs: HANDOFF_EVIDENCE_HOLD_TTL_MS,
      },
    },
    { method: "POST", url: "/capture/release", body: { holderId: "replay-job-run101-s22" } },
  ]);
});

test("run101 S22: a terminal resolution releases the pin, a renewal does not", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "run101-s22-host-"));
  const released: string[] = [];
  try {
    const store = createSupervisedReplayEvaluationResumeStore({
      filePath: path.join(root, "supervised-replay-evaluations.json"),
      onReleased: (entry) => {
        released.push(`${entry.replayJobId}:${entry.outcome}`);
      },
    });
    store.record(resumeEntry("replay-job-a"));
    // A live handoff is not a resolution: recording and renewing must not release anything.
    expect(released).toEqual([]);
    store.resolve("replay-job-a", {
      outcome: "completed",
      comparisonGroupId: "comparison:retro:a",
    });
    expect(released).toEqual(["replay-job-a:completed"]);

    // The attempt cap is the other terminal transition, and it is reached through `recordFailure`.
    store.record(resumeEntry("replay-job-b"));
    for (let attempt = 0; attempt < 7; attempt += 1) {
      store.recordFailure("replay-job-b", new Error(`attempt ${attempt}`));
    }
    expect(released).toEqual(["replay-job-a:completed"]);
    store.recordFailure("replay-job-b", new Error("attempt 8"));
    expect(released).toEqual(["replay-job-a:completed", "replay-job-b:abandoned"]);

    // The named disposition (S23) is terminal too, and it releases through the same hook.
    store.record(resumeEntry("replay-job-c"));
    store.resolve("replay-job-c", {
      outcome: "evidence_outside_retention_window",
      reason: "branch captures are outside the retention ring",
    });
    expect(released).toEqual([
      "replay-job-a:completed",
      "replay-job-b:abandoned",
      "replay-job-c:evidence_outside_retention_window",
    ]);
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 3 }).catch(() => {});
  }
});
