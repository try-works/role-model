/**
 * Run 101 addendum 45 - the queue-driven replay projection must not walk the family corpus.
 *
 * MEASURED live on production `:3456` (2026-10-14, v0.0.18): every `replay.dispatch` attempt was
 * interrupted at the plane's 600 s `attemptTimeoutMs` with
 * `TimeoutError: Operation timed out after '10m'`, five attempts per job, and `replay_dispositions`
 * held zero rows for the lifetime of the host. The projection below enumerated the live telemetry
 * index (32 captures, 200 pending) and then performed one exact capsule read per request id through
 * the private boundary, once per candidate task; a single sidecar ladder census measured 3.5-73 s, so
 * no attempt ever reached `replay:plan-graph` and no durable replay job was ever created.
 *
 * A queue-driven tick names the capture it was claimed for, so its projection reads exactly that
 * capture. The gates and the fail-closed answers are unchanged.
 */
import os from "node:os";
import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  MAX_RESTRICTED_REPLAYABLE_CAPTURES,
  readRouteReplayableCaptures,
} from "../src/route-challenge-evidence.js";
import { resolveDurableReplayJobScope } from "../src/supervised-replay-handoff-recovery.js";

const scopeId = "standalone-runtime";
/** The projection compares against the DERIVED durable replay scope, not the raw scope id. */
const scopeFor = (runtimeStateRoot: string) =>
  resolveDurableReplayJobScope({ channel: "production", runtimeStateRoot, scopeId });

function capture(requestId: string, scope: string) {
  return {
    requestId,
    scope,
    roleId: "coder",
    taskTypeId: "coder.debug.root_cause",
    endpointId: "endpoint-a",
    rootArtifactId: "artifact-1",
    classification: { roleId: "coder", taskTypeId: "coder.debug.root_cause" },
    replaySource: {
      normalizedRequestRef: "normalized",
      sharedPrefixRef: "prefix",
      forkOccurrenceId: "fork",
      policySnapshotRef: "policy",
      capturePolicyRef: "capture-policy",
    },
    trace: {
      scopeId: scope,
      channel: "production",
      readiness: "ready",
      completeness: "complete",
      generation: 1,
      rootOccurrenceId: "root-occurrence",
      closedAt: "2026-10-13T00:00:00.000Z",
    },
    messages: [{ role: "user", content: "hello" }],
    replayEvidenceClass: { class: "live" },
  };
}

let stateRoot = "";
beforeEach(async () => {
  stateRoot = await mkdtemp(path.join(os.tmpdir(), "run101-add45-"));
});
afterEach(async () => {
  await rm(stateRoot, { recursive: true, force: true });
});

describe("@recursive:101-effect-mq-queue-rebuild addendum45 queue-driven corpus restriction", () => {
  it("projects only the claimed captures without consulting the telemetry index", async () => {
    const read: string[] = [];
    const result = await readRouteReplayableCaptures({
      runtimeStateRoot: stateRoot,
      scopeId,
      channel: "production",
      // No memory index exists under this state root, so the unrestricted projection answers null.
      request: {
        roleId: "coder",
        taskTypeId: "coder.debug.root_cause",
        onlyCaptureRefs: ["req-claimed-1"],
      },
      readCapture: async (requestId) => {
        read.push(requestId);
        return capture(requestId, scopeFor(stateRoot));
      },
    });

    expect(read).toEqual(["req-claimed-1"]);
    expect(result?.map((entry) => entry.captureRef)).toEqual(["req-claimed-1"]);
  });

  it("still refuses an unrestricted projection when the index is missing", async () => {
    const result = await readRouteReplayableCaptures({
      runtimeStateRoot: stateRoot,
      scopeId,
      channel: "production",
      request: { roleId: "coder", taskTypeId: "coder.debug.root_cause" },
      readCapture: async (requestId) => capture(requestId, scopeFor(stateRoot)),
    });
    expect(result).toBeNull();
  });

  it("keeps the named gates for a claimed capture", async () => {
    const result = await readRouteReplayableCaptures({
      runtimeStateRoot: stateRoot,
      scopeId,
      channel: "production",
      request: {
        roleId: "coder",
        taskTypeId: "coder.debug.root_cause",
        onlyCaptureRefs: ["req-claimed-2"],
      },
      readCapture: async (requestId) => ({
        ...capture(requestId, scopeFor(stateRoot)),
        // A capture whose own endpoint is absent fails the `endpoint` gate exactly as before.
        endpointId: null,
      }),
    });
    expect(result).toEqual([]);
  });

  it("fails closed on an over-budget restriction", async () => {
    const tooMany = Array.from(
      { length: MAX_RESTRICTED_REPLAYABLE_CAPTURES + 1 },
      (_, index) => `req-over-${index}`,
    );
    const result = await readRouteReplayableCaptures({
      runtimeStateRoot: stateRoot,
      scopeId,
      channel: "production",
      request: {
        roleId: "coder",
        taskTypeId: "coder.debug.root_cause",
        onlyCaptureRefs: tooMany,
      },
      readCapture: async (requestId) => capture(requestId, scopeFor(stateRoot)),
    });
    expect(result).toBeNull();
  });
});
