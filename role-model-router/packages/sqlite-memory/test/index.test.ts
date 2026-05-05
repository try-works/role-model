import os from "node:os";
import path from "node:path";
import { mkdtemp, readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

import { validateProviderAccounts } from "@role-model-router/provider-account";

import { runRuntimeStateValidation } from "../src/cli.ts";
import { initializeSqliteMemory, persistProviderAccounts, resolveSqliteMemoryLocation } from "../src/index.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");

async function readJson<T>(relativePath: string): Promise<T> {
  const filePath = path.join(repoRoot, relativePath);
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

describe("initializeSqliteMemory", () => {
  test("creates the planned schema, WAL mode, and initial migration receipt under the runtime state root", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-state-"));

    const result = initializeSqliteMemory({
      runtimeStateRoot,
      scopeId: "workspace-dev",
    });

    expect(resolveSqliteMemoryLocation({ runtimeStateRoot, scopeId: "workspace-dev" })).toBe(result.databasePath);
    expect(result.databasePath).toContain(path.join("workspace-dev", "memory", "memory.sqlite"));
    expect(result.appliedMigrations).toEqual(["run06-v1-initial-schema"]);

    const database = new DatabaseSync(result.databasePath);
    const tables = database
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all() as Array<{ name: string }>;
    const tableNames = tables.map((row) => row.name);
    const journalMode = database.prepare("PRAGMA journal_mode").get() as { journal_mode: string };
    const migrations = database
      .prepare("SELECT migration_id FROM migration_receipts ORDER BY migration_id")
      .all() as Array<{ migration_id: string }>;

    expect(tableNames).toEqual(
      expect.arrayContaining([
        "artifact_links",
        "context_artifacts",
        "conversation_turns",
        "conversations",
        "memory_maintenance",
        "migration_receipts",
        "provider_account_diagnostics",
        "provider_accounts",
        "retrieval_receipts",
        "routing_handoffs",
        "schema_version",
        "sessions",
      ]),
    );
    expect(journalMode.journal_mode.toLowerCase()).toBe("wal");
    expect(migrations).toEqual([{ migration_id: "run06-v1-initial-schema" }]);
  });

  test("persists validated provider accounts by credential reference without storing raw secrets", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-state-"));
    const catalog = await readJson("role-model-router/packages/catalog/data/normalized-catalog.json");
    const fixture = await readJson<{ accounts: unknown[] }>("testdata/router-runtime/provider-accounts.json");
    const validated = validateProviderAccounts({
      catalog,
      accounts: fixture.accounts,
    });

    expect(validated.diagnostics).toEqual([]);

    const result = initializeSqliteMemory({
      runtimeStateRoot,
      scopeId: "workspace-dev",
    });

    persistProviderAccounts({
      databasePath: result.databasePath,
      accounts: validated.accounts,
    });

    const database = new DatabaseSync(result.databasePath);
    const rows = database
      .prepare(
        "SELECT provider_account_id, provider_kind, auth_mode, credential_backend, credential_ref FROM provider_accounts ORDER BY provider_account_id",
      )
      .all() as Array<{
      provider_account_id: string;
      provider_kind: string;
      auth_mode: string;
      credential_backend: string;
      credential_ref: string;
    }>;
    const columns = database.prepare("PRAGMA table_info(provider_accounts)").all() as Array<{ name: string }>;

    expect(rows).toEqual([
      {
        provider_account_id: "anthropic.team.shared",
        provider_kind: "provider-anthropic",
        auth_mode: "api-key-rotating-ref",
        credential_backend: "local-keychain",
        credential_ref: "anthropic/team/shared",
      },
      {
        provider_account_id: "openai.personal.primary",
        provider_kind: "provider-openai",
        auth_mode: "api-key-static",
        credential_backend: "env",
        credential_ref: "OPENAI_API_KEY",
      },
    ]);
    expect(columns.some((column) => column.name === "secret_value")).toBe(false);
  });

  test("records explicit maintenance defaults and idempotent migration behavior", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-state-"));

    const first = initializeSqliteMemory({
      runtimeStateRoot,
      scopeId: "workspace-dev",
    });
    const second = initializeSqliteMemory({
      runtimeStateRoot,
      scopeId: "workspace-dev",
    });

    const database = new DatabaseSync(first.databasePath);
    const maintenanceRows = database
      .prepare("SELECT maintenance_key, maintenance_value FROM memory_maintenance ORDER BY maintenance_key")
      .all() as Array<{
      maintenance_key: string;
      maintenance_value: string;
    }>;

    expect(first.appliedMigrations).toEqual(["run06-v1-initial-schema"]);
    expect(second.appliedMigrations).toEqual([]);
    expect(maintenanceRows).toEqual(
      expect.arrayContaining([
        { maintenance_key: "backup.policy", maintenance_value: "wal-copy-on-demand" },
        { maintenance_key: "deletion.policy", maintenance_value: "explicit-export-delete" },
        { maintenance_key: "redaction.level", maintenance_value: "strict" },
        { maintenance_key: "retention.class", maintenance_value: "standard" },
      ]),
    );
  });
});

describe("runRuntimeStateValidation", () => {
  test("validates provider accounts and initializes SQLite through the local validation path", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-state-"));

    const result = await runRuntimeStateValidation({
      repoRoot,
      runtimeStateRoot,
      scopeId: "workspace-dev",
    });

    expect(result.accountsValidated).toBe(2);
    expect(result.schemaVersion).toBe(1);
    expect(result.appliedMigrations).toEqual(["run06-v1-initial-schema"]);
    expect(result.databasePath).toContain(path.join("workspace-dev", "memory", "memory.sqlite"));
    expect(result.diagnostics).toEqual([]);
  });
});
