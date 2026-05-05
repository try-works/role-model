import os from "node:os";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import type { NormalizedCatalog } from "@role-model-router/catalog";
import { validateProviderAccounts, type ProviderAccountDiagnostic } from "@role-model-router/provider-account";

import { initializeSqliteMemory, persistProviderAccounts } from "./index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface RuntimeStateValidationOptions {
  readonly repoRoot: string;
  readonly runtimeStateRoot: string;
  readonly scopeId: string;
}

export interface RuntimeStateValidationResult {
  readonly databasePath: string;
  readonly schemaVersion: number;
  readonly appliedMigrations: readonly string[];
  readonly accountsValidated: number;
  readonly diagnostics: readonly ProviderAccountDiagnostic[];
}

async function readJson<TValue>(filePath: string): Promise<TValue> {
  return JSON.parse(await readFile(filePath, "utf8")) as TValue;
}

function formatDiagnostics(diagnostics: readonly ProviderAccountDiagnostic[]): string {
  return diagnostics.map((diagnostic) => `${diagnostic.providerAccountId}:${diagnostic.code}`).join(", ");
}

export async function runRuntimeStateValidation(
  options: RuntimeStateValidationOptions,
): Promise<RuntimeStateValidationResult> {
  const normalizedCatalog = await readJson<NormalizedCatalog>(
    path.join(options.repoRoot, "role-model-router", "packages", "catalog", "data", "normalized-catalog.json"),
  );
  const providerAccountsFixture = await readJson<{ accounts: unknown[] }>(
    path.join(options.repoRoot, "testdata", "router-runtime", "provider-accounts.json"),
  );

  const validation = validateProviderAccounts({
    catalog: normalizedCatalog,
    accounts: providerAccountsFixture.accounts,
  });

  if (validation.diagnostics.length > 0) {
    throw new Error(`Provider-account validation failed: ${formatDiagnostics(validation.diagnostics)}`);
  }

  const initialization = initializeSqliteMemory({
    runtimeStateRoot: options.runtimeStateRoot,
    scopeId: options.scopeId,
  });

  persistProviderAccounts({
    databasePath: initialization.databasePath,
    accounts: validation.accounts,
  });

  return {
    databasePath: initialization.databasePath,
    schemaVersion: initialization.schemaVersion,
    appliedMigrations: initialization.appliedMigrations,
    accountsValidated: validation.accounts.length,
    diagnostics: validation.diagnostics,
  };
}

if (process.argv[1] === __filename) {
  const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");
  const runtimeStateRoot = path.join(os.tmpdir(), "role-model-runtime-state");

  console.log(
    JSON.stringify(
      await runRuntimeStateValidation({
        repoRoot,
        runtimeStateRoot,
        scopeId: "local-validation",
      }),
      null,
      2,
    ),
  );
}
