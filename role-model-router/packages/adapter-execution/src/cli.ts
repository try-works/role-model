import os from "node:os";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import type { NormalizedCatalog } from "@role-model-router/catalog";
import { assembleContextEnvelope } from "@role-model-router/context-envelope";
import { buildEndpointRegistry, type RegistrySources } from "@role-model-router/endpoint-registry";
import { createAnthropicProviderAdapter } from "@role-model-router/provider-anthropic";
import { validateProviderAccounts } from "@role-model-router/provider-account";
import { createOpenAIProviderAdapter } from "@role-model-router/provider-openai";
import {
  createRetrievalReceipt,
} from "@role-model-router/retrieval-receipt";
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
} from "@role-model-router/protocol-routing";

import {
  executeRoutedRequest,
  type RuntimeExecutionRequest,
  type RoutedExecutionResult,
} from "./index.js";
import {
  deriveLiteLLMProviders,
  loadLiteLLMModelPrices,
} from "@role-model-router/catalog";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface RuntimeAdapterValidationOptions {
  readonly repoRoot: string;
  readonly runtimeStateRoot: string;
  readonly scopeId: string;
}

export interface RuntimeAdapterValidationResult {
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
  readonly captureFixture: string;
  readonly execution: RoutedExecutionResult;
}

interface CaptureFixtureMap {
  readonly byEndpointId: Readonly<Record<string, { readonly responseFixture: string }>>;
}

async function readJson<TValue>(filePath: string): Promise<TValue> {
  return JSON.parse(await readFile(filePath, "utf8")) as TValue;
}

async function loadResponseCaptures(
  repoRoot: string,
  fixtureMap: CaptureFixtureMap,
): Promise<{
  byEndpointId: Record<string, { body: unknown }>;
}> {
  const byEndpointId: Record<string, { body: unknown }> = {};
  for (const [endpointId, fixture] of Object.entries(fixtureMap.byEndpointId)) {
    byEndpointId[endpointId] = {
      body: await readJson<unknown>(
        path.join(repoRoot, "testdata", "router-runtime", fixture.responseFixture),
      ),
    };
  }
  return { byEndpointId };
}

export async function runRuntimeAdapterValidation(
  options: RuntimeAdapterValidationOptions,
): Promise<RuntimeAdapterValidationResult> {
  const normalizedCatalog = await readJson<NormalizedCatalog>(
    path.join(options.repoRoot, "role-model-router", "packages", "catalog", "data", "normalized-catalog.json"),
  );
  const providerAccountsFixture = await readJson<{ accounts: unknown[] }>(
    path.join(options.repoRoot, "testdata", "router-runtime", "provider-accounts.json"),
  );
  const registrySources = await readJson<RegistrySources>(
    path.join(options.repoRoot, "testdata", "router-runtime", "registry-sources.json"),
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
  }>(path.join(options.repoRoot, "testdata", "router-runtime", "context-envelope.json"));
  const routingRequest = await readJson<Parameters<typeof routeRuntimeRequest>[0]["request"]>(
    path.join(options.repoRoot, "testdata", "router-runtime", "adapter-routing-request.json"),
  );
  const observedProfilesByEndpointId = await readJson<
    Parameters<typeof routeRuntimeRequest>[0]["observedProfilesByEndpointId"]
  >(path.join(options.repoRoot, "testdata", "router-runtime", "routing-observed-profiles.json"));
  const roleTaskFixture = await readJson<{
    roleDefinitions: Parameters<typeof routeRuntimeRequest>[0]["roleDefinitions"];
    taskDefinitions: Parameters<typeof routeRuntimeRequest>[0]["taskDefinitions"];
    roleBindings: Parameters<typeof routeRuntimeRequest>[0]["roleBindings"];
  }>(path.join(options.repoRoot, "testdata", "router-runtime", "adapter-role-task.json"));
  const routingModel = await readJson<RoutingModelSelection>(
    path.join(options.repoRoot, "testdata", "router-runtime", "routing-model-guidance.json"),
  );
  const executionRequest = await readJson<RuntimeExecutionRequest>(
    path.join(options.repoRoot, "testdata", "router-runtime", "adapter-request.json"),
  );
  const captureFixtureMap = await readJson<CaptureFixtureMap>(
    path.join(options.repoRoot, "testdata", "router-runtime", "adapter-captures.json"),
  );

  const liteLLMModelPrices = await loadLiteLLMModelPrices(options.repoRoot);
  const liteLLMProviders = liteLLMModelPrices ? deriveLiteLLMProviders(liteLLMModelPrices) : [];

  const validation = validateProviderAccounts({
    catalog: normalizedCatalog,
    additionalProviders: liteLLMProviders,
    accounts: providerAccountsFixture.accounts,
  });
  if (validation.diagnostics.length > 0) {
    throw new Error("Provider-account validation failed for runtime adapter validation.");
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
    catalog: normalizedCatalog,
    accounts: validation.accounts,
    sources: registrySources,
  });
  if (registry.diagnostics.length > 0) {
    throw new Error("Endpoint-registry validation failed for runtime adapter validation.");
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

  const responseCaptures = await loadResponseCaptures(options.repoRoot, captureFixtureMap);
  const execution = executeRoutedRequest({
    routeResult: routed,
    catalog: normalizedCatalog,
    additionalProviders: liteLLMProviders,
    accounts: validation.accounts,
    registry,
    registrySources,
    executionRequest,
    adapters: [
      createOpenAIProviderAdapter(),
      createOpenAIProviderAdapter("ai-sdk-openai-compatible"),
      createAnthropicProviderAdapter(),
    ],
    captures: responseCaptures,
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
    captureFixture:
      captureFixtureMap.byEndpointId[routed.decision.chosen_endpoint_id]?.responseFixture ??
      "unknown",
    execution,
  };
}

if (process.argv[1] === __filename) {
  const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");
  const runtimeStateRoot = path.join(os.tmpdir(), "role-model-runtime-adapter");

  console.log(
    JSON.stringify(
      await runRuntimeAdapterValidation({
        repoRoot,
        runtimeStateRoot,
        scopeId: "local-validation",
      }),
      null,
      2,
    ),
  );
}
