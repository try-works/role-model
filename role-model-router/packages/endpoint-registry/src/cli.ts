import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { NormalizedCatalog } from "@role-model-router/catalog";
import { assembleContextEnvelope } from "@role-model-router/context-envelope";
import { validateProviderAccounts } from "@role-model-router/provider-account";
import { createRetrievalReceipt } from "@role-model-router/retrieval-receipt";
import {
  initializeSqliteMemory,
  persistContinuitySnapshot,
  persistProviderAccounts,
  persistRetrievalReceipt,
  readConversationContinuity,
} from "@role-model-router/sqlite-memory";

import { type RegistrySources, buildEndpointRegistry } from "./index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface RuntimeRegistryValidationOptions {
  readonly repoRoot: string;
  readonly runtimeStateRoot: string;
  readonly scopeId: string;
  readonly fixtureRoot?: string;
}

export interface RuntimeRegistryValidationResult {
  readonly databasePath: string;
  readonly accountsValidated: number;
  readonly registrySize: number;
  readonly lifecycleSummary: {
    readonly active: number;
    readonly degraded: number;
    readonly offline: number;
  };
  readonly contextEnvelope: {
    readonly conversationId: string;
    readonly selectedTurnIds: readonly string[];
    readonly selectedArtifactIds: readonly string[];
    readonly latestHandoffId: string | null;
    readonly estimatedTokenCount: number;
    readonly diagnostics: readonly {
      readonly code: string;
      readonly message: string;
    }[];
  };
  readonly retrievalReceipt: {
    readonly receiptId: string;
    readonly summary: {
      readonly selectedTurns: number;
      readonly selectedArtifacts: number;
      readonly omittedTurns: number;
      readonly omittedArtifacts: number;
      readonly estimatedTokens: number;
    };
  };
}

async function readJson<TValue>(filePath: string): Promise<TValue> {
  return JSON.parse(await readFile(filePath, "utf8")) as TValue;
}

function formatDiagnostics(
  diagnostics: readonly { readonly code: string; readonly endpointId: string }[],
): string {
  return diagnostics.map((diagnostic) => `${diagnostic.endpointId}:${diagnostic.code}`).join(", ");
}

export async function runRuntimeRegistryValidation(
  options: RuntimeRegistryValidationOptions,
): Promise<RuntimeRegistryValidationResult> {
  const fixtureRoot =
    options.fixtureRoot ?? path.join(options.repoRoot, "testdata", "router-runtime");
  const normalizedCatalog = await readJson<NormalizedCatalog>(
    path.join(
      options.repoRoot,
      "role-model-router",
      "packages",
      "catalog",
      "data",
      "normalized-catalog.json",
    ),
  );
  const providerAccountsFixture = await readJson<{ accounts: unknown[] }>(
    path.join(fixtureRoot, "provider-accounts.json"),
  );
  const registrySources = await readJson<RegistrySources>(
    path.join(fixtureRoot, "registry-sources.json"),
  );
  const continuityFixture = await readJson<{
    session: Parameters<typeof persistContinuitySnapshot>[0]["session"];
    conversation: Parameters<typeof persistContinuitySnapshot>[0]["conversation"];
    turns: Parameters<typeof persistContinuitySnapshot>[0]["turns"];
    artifacts: Parameters<typeof persistContinuitySnapshot>[0]["artifacts"];
    artifactLinks: Parameters<typeof persistContinuitySnapshot>[0]["artifactLinks"];
    handoffs: Parameters<typeof persistContinuitySnapshot>[0]["handoffs"];
    selection: {
      maxTurns: number;
      maxArtifacts: number;
      tokenBudget: number;
    };
  }>(path.join(fixtureRoot, "context-envelope.json"));

  const validation = validateProviderAccounts({
    catalog: normalizedCatalog,
    accounts: providerAccountsFixture.accounts,
  });
  if (validation.diagnostics.length > 0) {
    throw new Error("Provider-account validation failed for runtime registry validation");
  }

  const initialization = initializeSqliteMemory({
    runtimeStateRoot: options.runtimeStateRoot,
    scopeId: options.scopeId,
  });
  persistProviderAccounts({
    databasePath: initialization.databasePath,
    accounts: validation.accounts,
  });

  const registry = buildEndpointRegistry({
    catalog: normalizedCatalog,
    accounts: validation.accounts,
    sources: registrySources,
  });
  if (registry.diagnostics.length > 0) {
    throw new Error(
      `Endpoint-registry validation failed: ${formatDiagnostics(registry.diagnostics)}`,
    );
  }

  persistContinuitySnapshot({
    databasePath: initialization.databasePath,
    session: continuityFixture.session,
    conversation: continuityFixture.conversation,
    turns: continuityFixture.turns,
    artifacts: continuityFixture.artifacts,
    artifactLinks: continuityFixture.artifactLinks,
    handoffs: continuityFixture.handoffs,
  });

  const continuity = readConversationContinuity({
    databasePath: initialization.databasePath,
    conversationId: continuityFixture.conversation.conversationId,
  });
  const envelope = assembleContextEnvelope({
    continuity,
    maxTurns: continuityFixture.selection.maxTurns,
    maxArtifacts: continuityFixture.selection.maxArtifacts,
    tokenBudget: continuityFixture.selection.tokenBudget,
  });
  const retrievalReceipt = createRetrievalReceipt({
    envelope,
    totalTurns: continuity.turns.length,
    totalArtifacts: continuity.artifacts.length,
  });
  persistRetrievalReceipt({
    databasePath: initialization.databasePath,
    retrievalReceiptId: retrievalReceipt.receiptId,
    conversationId: retrievalReceipt.conversationId,
    receiptSummary: JSON.stringify(retrievalReceipt.summary),
  });

  return {
    databasePath: initialization.databasePath,
    accountsValidated: validation.accounts.length,
    registrySize: registry.endpoints.length,
    lifecycleSummary: registry.lifecycleSummary,
    contextEnvelope: {
      conversationId: envelope.conversationId,
      selectedTurnIds: envelope.selectedTurns.map((turn) => turn.turnId),
      selectedArtifactIds: envelope.selectedArtifacts.map((artifact) => artifact.artifactId),
      latestHandoffId: envelope.latestHandoff?.handoffId ?? null,
      estimatedTokenCount: envelope.estimatedTokenCount,
      diagnostics: envelope.diagnostics,
    },
    retrievalReceipt: {
      receiptId: retrievalReceipt.receiptId,
      summary: retrievalReceipt.summary,
    },
  };
}

if (process.argv[1] === __filename) {
  const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");
  const runtimeStateRoot = path.join(os.tmpdir(), "role-model-runtime-state");

  console.log(
    JSON.stringify(
      await runRuntimeRegistryValidation({
        repoRoot,
        runtimeStateRoot,
        scopeId: "local-validation",
      }),
      null,
      2,
    ),
  );
}
