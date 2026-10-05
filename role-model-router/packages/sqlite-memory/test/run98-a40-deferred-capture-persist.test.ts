import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { expect, test } from "vitest";

import {
  initializeSqliteMemory,
  persistRuntimeObservationBundle,
  readRuntimeObservationStorageRecord,
  readRuntimeTelemetryRecord,
} from "../src/index.ts";
import { LegacySqliteMigration } from "../src/legacy-migration.js";

// Run 98 addendum 40 (L2): once the route capture is deferred, the observation has no graph artifact
// reference. That request must still persist a bounded observation row and its telemetry — today the
// graph-migration guard refuses an artifact-free observation and the request degrades.
async function cutOverToGraphPrimary(databasePath: string, root: string, scopeId: string) {
  const migration = new LegacySqliteMigration({
    databasePath,
    backupPath: path.join(root, "legacy-backup.sqlite"),
    artifactWriter: ({ contentHash }) => ({
      artifactId: contentHash,
      artifactPath: `artifact://${contentHash}`,
      contentHash,
    }),
  });
  migration.backfill({ scopeId: `tenant:${scopeId}`, batchSize: 10 });
  migration.enterShadowMirror({ deadlineMs: Date.now() + 10_000 });
  migration.verifyParity({
    backupVerified: true,
    restoreVerified: true,
    consumersVerified: true,
  });
  migration.cutover();
}

function deferredCaptureStub(input: { readonly requestId: string }) {
  const nowMs = Date.now();
  return {
    requestId: input.requestId,
    routingDecisionId: `decision-${input.requestId}`,
    endpointId: "deepseek.personal.deepseek-api-key.global.deepseek-flash-high",
    conversationId: "conversation-main",
    statusFamily: "degraded-capture",
    captureDegradation: { reason: "track-b-capture-deferred" },
    usageEvent: {
      timestamp_ms: nowMs,
      request_id: input.requestId,
      latency_ms: 2_592,
      tokens_in: 10,
      tokens_out: 2,
    },
    observedPerformance: {
      sample: {
        endpoint_id: "deepseek.personal.deepseek-api-key.global.deepseek-flash-high",
        model_id: "deepseek/deepseek-flash",
        source_type: "live_request",
        timestamp_ms: nowMs,
        latency_ms: 2_592,
        success: true,
      },
      profile: { measured_at_ms: nowMs },
    },
  } as never;
}

test("a40 L2: an observation whose capture was deferred persists without a graph artifact", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "run98-a40-deferred-persist-"));
  const scopeId = "run98-a40-deferred";
  const initialized = initializeSqliteMemory({
    runtimeStateRoot: root,
    scopeId,
    channel: "development",
  });
  await cutOverToGraphPrimary(initialized.databasePath, root, scopeId);

  const requestId = "req-a40-deferred-capture";
  expect(() =>
    persistRuntimeObservationBundle({
      databasePath: initialized.databasePath,
      channel: "development",
      observation: deferredCaptureStub({ requestId }),
    }),
  ).not.toThrow();

  // The row exists as a bounded degraded stub, not as a graph-backed observation: it carries no
  // artifact reference and records why the evidence is missing.
  const stored = readRuntimeObservationStorageRecord({
    databasePath: initialized.databasePath,
    requestId,
  });
  expect(stored).not.toBeNull();
  expect(stored?.artifactRef).toBeUndefined();
  expect(JSON.stringify(stored)).toContain("track-b-capture-deferred");
  // And its telemetry is written, so the request is still counted and measurable.
  expect(
    readRuntimeTelemetryRecord({ databasePath: initialized.databasePath, requestId })?.latencyMs,
  ).toBe(2_592);
});

test("a40 L2: a graph-state store still refuses an artifact-free observation that claims full capture", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "run98-a40-artifact-required-"));
  const scopeId = "run98-a40-artifact-required";
  const initialized = initializeSqliteMemory({
    runtimeStateRoot: root,
    scopeId,
    channel: "development",
  });
  await cutOverToGraphPrimary(initialized.databasePath, root, scopeId);

  const observation = deferredCaptureStub({ requestId: "req-a40-full-capture" }) as Record<
    string,
    unknown
  >;
  delete observation.captureDegradation;
  delete observation.statusFamily;

  expect(() =>
    persistRuntimeObservationBundle({
      databasePath: initialized.databasePath,
      channel: "development",
      observation: observation as never,
    }),
  ).toThrow(/graph artifact writer required/i);
});
