import os from "node:os";
import path from "node:path";
import { mkdtemp, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

import { validateProviderAccounts } from "@role-model-router/provider-account";

import { runRuntimeRegistryValidation } from "../src/cli.ts";
import { buildEndpointRegistry } from "../src/index.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");

async function readJson<T>(relativePath: string): Promise<T> {
  const filePath = path.join(repoRoot, relativePath);
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

describe("buildEndpointRegistry", () => {
  test("builds a runtime registry from catalog, provider-account, and pinned discovery inputs", async () => {
    const catalog = await readJson("role-model-router/packages/catalog/data/normalized-catalog.json");
    const accountFixture = await readJson<{ accounts: unknown[] }>("testdata/router-runtime/provider-accounts.json");
    const registryFixture = await readJson("testdata/router-runtime/registry-sources.json");
    const validated = validateProviderAccounts({
      catalog,
      accounts: accountFixture.accounts,
    });

    const result = buildEndpointRegistry({
      catalog,
      accounts: validated.accounts,
      sources: registryFixture,
    });

    expect(validated.diagnostics).toEqual([]);
    expect(result.diagnostics).toEqual([]);
    expect(result.endpoints).toHaveLength(3);
    expect(result.lifecycleSummary).toEqual({
      active: 2,
      degraded: 1,
      offline: 0,
    });
    expect(result.endpoints).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          status: "active",
          identity: expect.objectContaining({
            endpoint_id: "openai.personal.primary.us-east-1.fast",
            provider_kind: "remote_openai_compat",
            model_id: "openai/gpt-4.1-mini-fast",
            region: "us-east-1",
            org_scope: "personal",
          }),
        }),
        expect.objectContaining({
          status: "degraded",
          identity: expect.objectContaining({
            endpoint_id: "anthropic.team.shared.us-east-1.default",
            provider_kind: "remote_openai_compat",
            model_id: "claude-3.7-sonnet",
            region: "us-east-1",
            org_scope: "team",
          }),
        }),
        expect.objectContaining({
          status: "active",
          identity: expect.objectContaining({
            endpoint_id: "cli.local.coder",
            provider_kind: "cli",
            model_id: "gpt-5.4",
            region: "local",
          }),
        }),
      ]),
    );
  });

  test("reports registry diagnostics for missing accounts and denied regions", async () => {
    const catalog = await readJson("role-model-router/packages/catalog/data/normalized-catalog.json");
    const accountFixture = await readJson<{ accounts: unknown[] }>("testdata/router-runtime/provider-accounts.json");
    const validated = validateProviderAccounts({
      catalog,
      accounts: accountFixture.accounts,
    });

    const result = buildEndpointRegistry({
      catalog,
      accounts: validated.accounts,
      sources: {
        cloud: [
          {
            endpointId: "missing.account.endpoint",
            providerAccountId: "missing.account",
            modelId: "openai/gpt-4.1-mini-fast",
            region: "us-east-1",
            endpointKind: "remote-openai-compatible",
            servingSource: "remote-service",
            lifecycleState: "active",
            healthStatus: "healthy",
          },
          {
            endpointId: "anthropic.team.shared.eu-west-1",
            providerAccountId: "anthropic.team.shared",
            modelId: "claude-3.7-sonnet",
            region: "eu-west-1",
            endpointKind: "remote-anthropic",
            servingSource: "remote-service",
            lifecycleState: "active",
            healthStatus: "healthy",
          },
        ],
        local: [],
      },
    });

    expect(result.endpoints).toHaveLength(0);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "PROVIDER_ACCOUNT_NOT_FOUND",
          endpointId: "missing.account.endpoint",
        }),
        expect.objectContaining({
          code: "REGION_NOT_ALLOWED",
          endpointId: "anthropic.team.shared.eu-west-1",
        }),
      ]),
    );
  });

  test("validates registry construction, context assembly, and receipt generation through the local CLI path", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-registry-"));

    const result = await runRuntimeRegistryValidation({
      repoRoot,
      runtimeStateRoot,
      scopeId: "workspace-dev",
    });

    expect(result.accountsValidated).toBe(2);
    expect(result.registrySize).toBe(3);
    expect(result.lifecycleSummary).toEqual({
      active: 2,
      degraded: 1,
      offline: 0,
    });
    expect(result.contextEnvelope).toEqual({
      conversationId: "conversation-main",
      selectedTurnIds: ["turn-003", "turn-004"],
      selectedArtifactIds: ["artifact-summary"],
      latestHandoffId: "handoff-1",
      estimatedTokenCount: 240,
      diagnostics: [
        {
          code: "TURN_LIMIT_REACHED",
          message: "Context envelope kept the 2 most recent turns and omitted 2 older turns.",
        },
        {
          code: "TOKEN_BUDGET_REACHED",
          message: "Context envelope omitted 2 artifacts because the token budget was exhausted.",
        },
      ],
    });
    expect(result.retrievalReceipt).toEqual({
      receiptId: "conversation-main-retrieval-receipt",
      summary: {
        selectedTurns: 2,
        selectedArtifacts: 1,
        omittedTurns: 2,
        omittedArtifacts: 2,
        estimatedTokens: 240,
      },
    });
  });
});
