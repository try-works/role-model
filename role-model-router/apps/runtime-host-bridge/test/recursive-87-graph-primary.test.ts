import { createHash } from "node:crypto";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { expect, test } from "vitest";

import {
  LegacySqliteMigration,
  initializeSqliteMemory,
  readLegacyMigrationJournal,
} from "@role-model-router/sqlite-memory";
import * as trackBRuntime from "../src/track-b-runtime.js";

test("SP2 host observation persistence delegates rich bytes to graph storage after cutover", async () => {
  expect(typeof trackBRuntime.createTrackBGraphObservationPersistence).toBe("function");
  const root = await mkdtemp(path.join(os.tmpdir(), "run87-graph-primary-"));
  const initialized = initializeSqliteMemory({
    runtimeStateRoot: root,
    scopeId: "run87",
    channel: "development",
  });
  const artifacts = new Map<string, string>();
  const graphStore = {
    scopeId: "workspace-run87",
    write: ({
      sourceId,
      content,
      contentHash,
    }: {
      sourceId: string;
      content: string;
      contentHash: string;
    }) => {
      const artifactId = `artifact-${sourceId}`;
      artifacts.set(artifactId, content);
      return { artifactId, artifactPath: `artifact://${artifactId}`, contentHash };
    },
    read: ({ artifactId }: { artifactId: string }) => {
      const content = artifacts.get(artifactId);
      if (!content) throw new Error(`missing artifact ${artifactId}`);
      return content;
    },
    remove: ({ artifactId }: { artifactId: string }) => {
      artifacts.delete(artifactId);
    },
  };
  let now = Date.now();
  const migration = new LegacySqliteMigration({
    databasePath: initialized.databasePath,
    backupPath: path.join(root, "legacy.sqlite"),
    artifactWriter: graphStore.write,
    now: () => now,
  });
  const observation = {
    requestId: "request-87",
    routingDecisionId: "route-87",
    endpointId: "endpoint-87",
    conversationId: "conversation-87",
    usageEvent: { timestamp_ms: 87 },
    observedPerformance: {
      sample: {
        endpoint_id: "endpoint-87",
        source_type: "live_request",
        timestamp_ms: 87,
        latency_ms: 1,
        success: true,
      },
      profile: { measured_at_ms: 87 },
    },
    inspection: { providerBody: "private-rich-body" },
  };
  const content = JSON.stringify(observation);
  graphStore.write({
    scopeId: graphStore.scopeId,
    sourceId: observation.requestId,
    content,
    contentHash: createHash("sha256").update(content).digest("hex"),
  });

  expect(typeof trackBRuntime.createTrackBGraphMigrationOperator).toBe("function");
  const createOperator = (runner: LegacySqliteMigration) =>
    trackBRuntime.createTrackBGraphMigrationOperator({
      databasePath: initialized.databasePath,
      migration: runner,
      scopeId: graphStore.scopeId,
      batchSize: 1,
      shadowWindowMs: 1_000,
      readHoldMs: 1_000,
      now: () => now,
    });
  let operator = createOperator(migration);
  expect(operator.advance()).toMatchObject({ action: "backfill", state: "shadow_mirror" });

  // Reconstruct both runner and operator to prove the durable journal, not memory, owns progress.
  operator = createOperator(
    new LegacySqliteMigration({
      databasePath: initialized.databasePath,
      backupPath: path.join(root, "legacy.sqlite"),
      artifactWriter: graphStore.write,
      now: () => now,
    }),
  );
  expect(
    operator.advance({
      backupVerified: true,
      restoreVerified: true,
      consumersVerified: true,
    }),
  ).toMatchObject({ action: "verify_first_parity", state: "parity_verified" });
  expect(operator.advance()).toMatchObject({ action: "cutover", state: "graph_primary" });
  expect(readLegacyMigrationJournal(initialized.databasePath).state).toBe("graph_primary");

  const persistence = trackBRuntime.createTrackBGraphObservationPersistence({
    databasePath: initialized.databasePath,
    channel: "development",
    graphStore,
  });
  persistence.persist(observation);
  expect(persistence.read(observation.requestId)).toEqual(observation);

  expect(operator.advance()).toMatchObject({ action: "enter_legacy_read_hold" });
  expect(operator.advance({ consumersVerified: true })).toMatchObject({
    action: "verify_second_parity",
    state: "legacy_read_hold",
  });
  now += 1_001;
  expect(operator.advance()).toMatchObject({ action: "retire", state: "legacy_retired" });
});
