import os from "node:os";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import type { NormalizedCatalog } from "@role-model-router/catalog";
import {
  deriveLiteLLMProviders,
  loadLiteLLMModelPrices,
} from "@role-model-router/catalog";
import { assembleContextEnvelope } from "@role-model-router/context-envelope";
import { buildEndpointRegistry, type RegistrySources } from "@role-model-router/endpoint-registry";
import { validateProviderAccounts } from "@role-model-router/provider-account";
import { createRetrievalReceipt } from "@role-model-router/retrieval-receipt";
import {
  initializeSqliteMemory,
  persistContinuitySnapshot,
  persistProviderAccounts,
  persistRetrievalReceipt,
  readConversationContinuity,
} from "@role-model-router/sqlite-memory";

import {
  routeRuntimeRequest,
  type RoutingModelSelection,
} from "./index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface RuntimeRoutingValidationOptions {
  readonly repoRoot: string;
  readonly runtimeStateRoot: string;
  readonly scopeId: string;
  readonly fixtureRoot?: string;
}

export interface RuntimeRoutingValidationResult {
  readonly databasePath: string;
  readonly registrySize: number;
  readonly decision: ReturnType<typeof routeRuntimeRequest>["decision"];
  readonly routingDiagnostics: ReturnType<typeof routeRuntimeRequest>["routingDiagnostics"];
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
  readonly contextEnvelope: {
    readonly conversationId: string;
    readonly latestHandoffId: string | null;
    readonly estimatedTokenCount: number;
  };
}

async function readJson<TValue>(filePath: string): Promise<TValue> {
  return JSON.parse(await readFile(filePath, "utf8")) as TValue;
}

export async function runRuntimeRoutingValidation(
  options: RuntimeRoutingValidationOptions,
): Promise<RuntimeRoutingValidationResult> {
  const fixtureRoot = options.fixtureRoot ?? path.join(options.repoRoot, "testdata", "router-runtime");
  const normalizedCatalog = await readJson<NormalizedCatalog>(
    path.join(options.repoRoot, "role-model-router", "packages", "catalog", "data", "normalized-catalog.json"),
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
  const routingRequest = await readJson<Parameters<typeof routeRuntimeRequest>[0]["request"]>(
    path.join(fixtureRoot, "routing-request.json"),
  );
  const observedProfilesByEndpointId = await readJson<
    Parameters<typeof routeRuntimeRequest>[0]["observedProfilesByEndpointId"]
  >(path.join(fixtureRoot, "routing-observed-profiles.json"));
  const roleTaskFixture = await readJson<{
    roleDefinitions: Parameters<typeof routeRuntimeRequest>[0]["roleDefinitions"];
    taskDefinitions: Parameters<typeof routeRuntimeRequest>[0]["taskDefinitions"];
    roleBindings: Parameters<typeof routeRuntimeRequest>[0]["roleBindings"];
  }>(path.join(fixtureRoot, "routing-role-task.json"));
  const routingModel = await readJson<RoutingModelSelection>(
    path.join(fixtureRoot, "routing-model-guidance.json"),
  );

  const liteLLMModelPrices = await loadLiteLLMModelPrices(options.repoRoot);
  const liteLLMProviders = liteLLMModelPrices ? deriveLiteLLMProviders(liteLLMModelPrices) : [];

  const fixtureModelIds = new Set<string>();
  for (const source of registrySources.cloud) {
    fixtureModelIds.add(source.modelId);
  }
  for (const source of registrySources.local) {
    fixtureModelIds.add(source.modelId);
  }
  for (const account of providerAccountsFixture.accounts as { allowedModels?: string[]; deniedModels?: string[] }[]) {
    for (const modelId of account.allowedModels ?? []) {
      fixtureModelIds.add(modelId);
    }
    for (const modelId of account.deniedModels ?? []) {
      fixtureModelIds.add(modelId);
    }
  }
  const mutableModels = [...normalizedCatalog.models];
  const existingModelIds = new Set(mutableModels.map((model) => model.modelId));
  for (const modelId of fixtureModelIds) {
    if (existingModelIds.has(modelId)) {
      continue;
    }
    const providerId = modelId.includes("/") ? modelId.split("/")[0] : "unknown";
    mutableModels.push({
      modelId,
      providerId,
      providerKind: "provider-openai",
      authFamily: "api-key",
      displayName: modelId.split("/").pop() ?? modelId,
      version: "unversioned",
      capabilities: ["text.chat", "tools.function_calling"],
      modalities: ["text"],
      contextWindow: 32768,
      maxOutputTokens: 4096,
      pricing: null,
      requestShapeHints: null,
      experimentalModes: [],
      extendsProvenance: { baseModelId: null, chain: [] },
      localOverrideApplied: true,
      localNotes: ["Synthesized from fixture-referenced model ID."],
      upstreamProvenance: normalizedCatalog.source,
    });
  }
  const normalizedCatalogWithModels = { ...normalizedCatalog, models: mutableModels };

  const validation = validateProviderAccounts({
    catalog: normalizedCatalogWithModels,
    additionalProviders: liteLLMProviders,
    accounts: providerAccountsFixture.accounts,
  });
  if (validation.diagnostics.length > 0) {
    throw new Error("Provider-account validation failed for runtime routing validation.");
  }

  const initialization = initializeSqliteMemory({
    runtimeStateRoot: options.runtimeStateRoot,
    scopeId: options.scopeId,
  });

  persistProviderAccounts({
    databasePath: initialization.databasePath,
    accounts: validation.accounts,
  });
  persistContinuitySnapshot({
    databasePath: initialization.databasePath,
    session: continuityFixture.session,
    conversation: continuityFixture.conversation,
    turns: continuityFixture.turns,
    artifacts: continuityFixture.artifacts,
    artifactLinks: continuityFixture.artifactLinks,
    handoffs: continuityFixture.handoffs,
  });

  const registry = buildEndpointRegistry({
    catalog: normalizedCatalogWithModels,
    accounts: validation.accounts,
    sources: registrySources,
  });
  if (registry.diagnostics.length > 0) {
    throw new Error("Endpoint-registry validation failed for runtime routing validation.");
  }

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

  const routed = routeRuntimeRequest({
    request: routingRequest,
    registry,
    observedProfilesByEndpointId,
    envelope,
    retrievalReceipt,
    roleDefinitions: roleTaskFixture.roleDefinitions,
    taskDefinitions: roleTaskFixture.taskDefinitions,
    roleBindings: roleTaskFixture.roleBindings,
    routingModel,
  });

  return {
    databasePath: initialization.databasePath,
    registrySize: registry.endpoints.length,
    decision: routed.decision,
    routingDiagnostics: routed.routingDiagnostics,
    retrievalReceipt: {
      receiptId: retrievalReceipt.receiptId,
      summary: retrievalReceipt.summary,
    },
    contextEnvelope: {
      conversationId: envelope.conversationId,
      latestHandoffId: envelope.latestHandoff?.handoffId ?? null,
      estimatedTokenCount: envelope.estimatedTokenCount,
    },
  };
}

if (process.argv[1] === __filename) {
  const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");
  const runtimeStateRoot = path.join(os.tmpdir(), "role-model-runtime-routing");

  console.log(
    JSON.stringify(
      await runRuntimeRoutingValidation({
        repoRoot,
        runtimeStateRoot,
        scopeId: "local-validation",
      }),
      null,
      2,
    ),
  );
}
