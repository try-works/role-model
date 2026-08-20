import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, test } from "vitest";

import {
  initializeSqliteMemory,
  listRuntimeEndpoints,
  resolveSqliteMemoryLocation,
  upsertRuntimeEndpoint,
  upsertRuntimeEndpointsAtomically,
} from "../src/index.ts";

describe("sqlite effort instance persistence", () => {
  test("migrates a pre-Run-91 endpoint table without changing legacy endpoint identity", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "sqlite-effort-legacy-"));
    const scopeId = "run91-legacy-migration";
    const databasePath = resolveSqliteMemoryLocation({ runtimeStateRoot, scopeId });
    try {
      await mkdir(path.dirname(databasePath), { recursive: true });
      const database = new DatabaseSync(databasePath);
      database.exec(`
        CREATE TABLE runtime_endpoints (
          endpoint_id TEXT PRIMARY KEY,
          provider_account_id TEXT NOT NULL,
          model_id TEXT NOT NULL,
          region TEXT NOT NULL,
          endpoint_kind TEXT NOT NULL,
          serving_source TEXT NOT NULL,
          lifecycle_state TEXT NOT NULL,
          health_status TEXT NOT NULL,
          created_at_ms INTEGER NOT NULL,
          updated_at_ms INTEGER NOT NULL
        );
        INSERT INTO runtime_endpoints VALUES (
          'legacy.default.endpoint', 'legacy.account', 'legacy/model', 'global',
          'remote-openai-compatible', 'remote-service', 'active', 'healthy', 1, 1
        );
      `);
      database.close();

      initializeSqliteMemory({ runtimeStateRoot, scopeId, channel: "development" });
      expect(listRuntimeEndpoints({ databasePath })).toEqual([
        expect.objectContaining({
          endpointId: "legacy.default.endpoint",
          modelId: "legacy/model",
          reasoningEffort: null,
        }),
      ]);
      const reopened = new DatabaseSync(databasePath);
      expect(
        reopened.prepare("SELECT endpoint_id, reasoning_effort FROM runtime_endpoints").all(),
      ).toEqual([{ endpoint_id: "legacy.default.endpoint", reasoning_effort: null }]);
      reopened.close();
    } finally {
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  });

  test("rolls back the whole endpoint batch when any row cannot be persisted", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "sqlite-effort-batch-"));
    try {
      const { databasePath } = initializeSqliteMemory({
        runtimeStateRoot,
        scopeId: "run91-batch",
        channel: "development",
      });
      expect(typeof upsertRuntimeEndpointsAtomically).toBe("function");
      expect(() =>
        upsertRuntimeEndpointsAtomically({
          databasePath,
          endpoints: [
            {
              endpointId: "account.global.provider-model-medium",
              providerAccountId: "account",
              modelId: "provider/model",
              region: "global",
              endpointKind: "remote-openai-compatible",
              servingSource: "remote-service",
              lifecycleState: "active",
              healthStatus: "healthy",
              reasoningEffort: "medium",
            },
            {
              endpointId: "account.global.provider-model-high",
              providerAccountId: "account",
              modelId: "provider/model",
              region: "global",
              endpointKind: "remote-openai-compatible",
              servingSource: "remote-service",
              lifecycleState: "active",
              healthStatus: "healthy",
              reasoningEffort: { invalid: true },
            } as never,
          ],
        }),
      ).toThrow();
      expect(listRuntimeEndpoints({ databasePath })).toEqual([]);
    } finally {
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  });

  test("stores explicit null versus opaque effort without deriving it from endpoint ids", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "sqlite-effort-identity-"));
    try {
      const { databasePath } = initializeSqliteMemory({
        runtimeStateRoot,
        scopeId: "run91",
        channel: "development",
      });

      upsertRuntimeEndpoint({
        databasePath,
        endpoint: {
          endpointId: "account.global.provider-model",
          providerAccountId: "account",
          modelId: "provider/model",
          region: "global",
          endpointKind: "remote-openai-compatible",
          servingSource: "remote-service",
          lifecycleState: "active",
          healthStatus: "healthy",
          reasoningEffort: null,
        } as never,
      });
      upsertRuntimeEndpoint({
        databasePath,
        endpoint: {
          endpointId: "account.global.provider-model-medium",
          providerAccountId: "account",
          modelId: "provider/model",
          region: "global",
          endpointKind: "remote-openai-compatible",
          servingSource: "remote-service",
          lifecycleState: "active",
          healthStatus: "healthy",
          reasoningEffort: "medium",
        } as never,
      });

      expect(listRuntimeEndpoints({ databasePath })).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            endpointId: "account.global.provider-model",
            reasoningEffort: null,
          }),
          expect.objectContaining({
            endpointId: "account.global.provider-model-medium",
            reasoningEffort: "medium",
          }),
        ]),
      );

      const database = new DatabaseSync(databasePath);
      const columns = database.prepare("PRAGMA table_info(runtime_endpoints)").all() as Array<{
        name: string;
      }>;
      expect(columns.map((column) => column.name)).toContain("reasoning_effort");
      const stored = database
        .prepare("SELECT endpoint_id, reasoning_effort FROM runtime_endpoints ORDER BY endpoint_id")
        .all();
      database.close();
      expect(stored).toEqual([
        { endpoint_id: "account.global.provider-model", reasoning_effort: null },
        {
          endpoint_id: "account.global.provider-model-medium",
          reasoning_effort: "medium",
        },
      ]);
      expect(resolveSqliteMemoryLocation({ runtimeStateRoot, scopeId: "run91" })).toBe(
        databasePath,
      );
    } finally {
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  });
});
