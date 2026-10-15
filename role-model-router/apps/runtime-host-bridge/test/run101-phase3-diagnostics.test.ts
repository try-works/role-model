import { describe, expect, it } from "vitest";

import { readPendingRouteDispatches } from "../src/route-challenge-evidence.js";

/**
 * Plan phase 3 (FIX DIAGNOSTICS, 2026-10-15): the pending-dispatch reader collapsed every refusal
 * into a silent null, so the replay walk reported "route pending dispatches unavailable" with no
 * way to tell which gate refused. The fix names each refusal through an optional diagnostic
 * callback the host wires to its log AND to the observability metric registry (so the Observe ->
 * Observability page shows the reason), while the return contract stays exactly as before (null for
 * fail-closed, answers otherwise).
 */
const capture = {
  requestId: "req-diag-1",
  roleId: "coder",
  taskTypeId: "coder.debug.root_cause",
  endpointId: "baseline.endpoint",
  scope: "standalone-runtime",
  rootArtifactId: "artifact-1",
  replaySource: { kind: "live" },
  trace: { scopeId: "standalone-runtime", channel: "production", readiness: "ready", completeness: "complete" },
};

describe("phase-3 diagnostics: pending-dispatch refusals are named", () => {
  it("names list-jobs malformed before returning null", async () => {
    const diagnostics: string[] = [];
    const result = await readPendingRouteDispatches({
      request: { roleId: "coder", taskTypeId: "coder.debug.root_cause" },
      readCapture: async () => capture,
      invoke: async (_e, capability) => {
        if (capability === "replay:list-jobs") return { value: "not-an-array" };
        throw new Error("unexpected invoke " + capability);
      },
      readQueueJobs: async () => null,
      readQueueJob: async () => null,
      onDiagnostic: (reason) => diagnostics.push(reason),
    });
    expect(result).toBeNull();
    expect(diagnostics).toEqual(["list_jobs_malformed"]);
  });

  it("names the pagination/budget failure", async () => {
    const diagnostics: string[] = [];
    // Terminal rows skip hydration entirely, so the walk pages forever and exhausts the budget.
    // Ids must be strictly increasing (the reader's own cursor gate) - use a monotonic counter.
    let counter = 0;
    const result = await readPendingRouteDispatches({
      request: { roleId: "coder", taskTypeId: "coder.debug.root_cause" },
      readCapture: async () => capture,
      invoke: async (_e, capability) => {
        if (capability === "replay:list-jobs") {
          return Array.from({ length: 24 }, () => ({
            jobId: "job-" + String((counter += 1)).padStart(10, "0"),
            state: "complete",
          }));
        }
        throw new Error("unexpected invoke " + capability);
      },
      readQueueJobs: async () => null,
      readQueueJob: async () => null,
      onDiagnostic: (reason) => diagnostics.push(reason),
    });
    expect(result).toBeNull();
    expect(diagnostics).toEqual(["list_jobs_page_budget_exhausted"]);
  });

  it("names active-job shape refusals", async () => {
    const diagnostics: string[] = [];
    const result = await readPendingRouteDispatches({
      request: { roleId: "coder", taskTypeId: "coder.debug.root_cause" },
      readCapture: async () => capture,
      invoke: async (_e, capability, value) => {
        if (capability === "replay:list-jobs") {
          // Ids must be strictly increasing (reader cursor gate): terminal sorts before active.
          return [
            { jobId: "job-0001-terminal", state: "failed" },
            { jobId: "job-0002-active", state: "queued" },
          ];
        }
        if (capability === "replay:job") {
          const jobId = (value as { jobId?: string }).jobId;
          if (jobId === "job-0001-terminal") throw new Error("terminal jobs must not be hydrated");
          return { jobId: "job-0002-active", state: "queued", createdAtMs: 1000 };
        }
        throw new Error("unexpected invoke " + capability);
      },
      readQueueJobs: async () => ({
        schemaVersion: "role-model.operator-queue-jobs.v1",
        queue: "replay.dispatch",
        available: true,
        jobs: [],
      }),
      readQueueJob: async () => null,
      onDiagnostic: (reason) => diagnostics.push(reason),
    });
    // job-active has no sourceDecisionId -> capture-ref refusal (named, fail-closed).
    expect(result).toBeNull();
    expect(diagnostics).toContain("active_replay_job_missing_capture");
  });

  it("names queue-payload refusals", async () => {
    const diagnostics: string[] = [];
    const result = await readPendingRouteDispatches({
      request: { roleId: "coder", taskTypeId: "coder.debug.root_cause" },
      readCapture: async () => capture,
      invoke: async (_e, capability) => {
        if (capability === "replay:list-jobs") return [];
        throw new Error("unexpected invoke " + capability);
      },
      readQueueJobs: async () => ({
        schemaVersion: "role-model.operator-queue-jobs.v1",
        queue: "replay.dispatch",
        available: true,
        jobs: [{ id: "q1", queue: "replay.dispatch", state: "pending", payload: { captureRef: "req-diag-1" } }],
      }),
      readQueueJob: async () => null,
      onDiagnostic: (reason) => diagnostics.push(reason),
    });
    expect(result).toBeNull();
    expect(diagnostics).toEqual(["queue_job_payload_malformed"]);
  });
});