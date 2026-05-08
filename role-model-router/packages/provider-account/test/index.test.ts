import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

import { SUPPORTED_AUTH_MODES, validateProviderAccounts } from "../src/index.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");

async function readJson<T>(relativePath: string): Promise<T> {
  const filePath = path.join(repoRoot, relativePath);
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

const ADDITIONAL_PROVIDERS = [
  {
    providerId: "openai",
    displayName: "OpenAI",
    providerKind: "provider-openai",
    authFamily: "api-key",
    adapterFamily: "ai-sdk-openai",
    apiBase: "https://api.openai.com/v1",
    envVars: ["OPENAI_API_KEY"],
    supportedAuthModes: [],
    controlPlaneRequirements: ["organization.optional"],
    localOverrideApplied: true,
    upstreamProvenance: {
      vendor: "models.dev",
      commit: "8f3c2d1",
      capturedAt: "2026-05-04T12:00:00Z",
      schemaVersion: "models.dev.v1",
    },
  },
  {
    providerId: "anthropic",
    displayName: "Anthropic",
    providerKind: "provider-anthropic",
    authFamily: "api-key",
    adapterFamily: "ai-sdk-anthropic",
    apiBase: "https://api.anthropic.com/v1",
    envVars: ["ANTHROPIC_API_KEY"],
    supportedAuthModes: [],
    controlPlaneRequirements: ["workspace.required"],
    localOverrideApplied: true,
    upstreamProvenance: {
      vendor: "models.dev",
      commit: "8f3c2d1",
      capturedAt: "2026-05-04T12:00:00Z",
      schemaVersion: "models.dev.v1",
    },
  },
] as const;

describe("SUPPORTED_AUTH_MODES", () => {
  test("covers the roadmap-required auth modes explicitly", () => {
    expect(SUPPORTED_AUTH_MODES).toEqual([
      "api-key-static",
      "api-key-rotating-ref",
      "oauth2-client-credentials",
      "oauth2-device-code",
      "oauth2-user-grant",
      "azure-entra-client-credentials",
      "google-service-account",
      "google-workload-identity",
      "aws-sigv4",
      "brokered-session-exchange",
    ]);
  });
});

describe("validateProviderAccounts", () => {
  test("validates provider-account fixtures against catalog provider metadata without exposing raw secrets", async () => {
    const catalog = await readJson("role-model-router/packages/catalog/data/normalized-catalog.json");
    const fixture = await readJson<{ accounts: unknown[] }>("testdata/router-runtime/provider-accounts.json");

    const result = validateProviderAccounts({
      catalog,
      additionalProviders: ADDITIONAL_PROVIDERS,
      accounts: fixture.accounts,
    });

    expect(result.accounts).toHaveLength(2);
    expect(result.diagnostics).toEqual([]);
    expect(result.accounts[0]).toMatchObject({
      providerAccountId: "openai.personal.primary",
      providerId: "openai",
      providerKind: "provider-openai",
      authMode: "api-key-static",
      credentialRef: {
        backend: "env",
        ref: "OPENAI_API_KEY",
      },
    });
    expect(result.accounts[1]).toMatchObject({
      providerAccountId: "anthropic.team.shared",
      providerId: "anthropic",
      providerKind: "provider-anthropic",
      authMode: "api-key-rotating-ref",
      rotationState: "due",
    });
    expect(result.accounts[0]).not.toHaveProperty("secret");
    expect(result.accounts[1]).not.toHaveProperty("secret");
  });

  test("reports incompatible auth modes for api-key-only catalog providers", async () => {
    const catalog = await readJson("role-model-router/packages/catalog/data/normalized-catalog.json");

    const result = validateProviderAccounts({
      catalog,
      additionalProviders: ADDITIONAL_PROVIDERS,
      accounts: [
        {
          providerAccountId: "openai.bad.oauth",
          providerId: "openai",
          providerKind: "provider-openai",
          orgScope: "personal",
          accountScope: "workspace-default",
          credentialRef: {
            backend: "cloud-secret",
            ref: "openai/oauth/client-secret",
          },
          authMode: "oauth2-client-credentials",
          regionPolicy: {
            mode: "prefer",
            regions: ["us-east-1"],
          },
          allowedModels: ["openai/gpt-4.1-mini-fast"],
          deniedModels: [],
          entitlementTags: [],
          budgetPolicyRef: "budget.default",
          quotaPolicyRef: "quota.default",
          status: "active",
          healthStatus: "healthy",
          rotationState: "stable",
        },
      ],
    });

    expect(result.accounts).toHaveLength(0);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        providerAccountId: "openai.bad.oauth",
        severity: "error",
        code: "AUTH_MODE_INCOMPATIBLE",
      }),
    );
  });

  test("accepts kimi device oauth when the provider explicitly supports it", () => {
    const result = validateProviderAccounts({
      catalog: {
        catalogVersion: "1",
        source: {
          vendor: "models.dev",
          commit: "moonshot-run14",
          capturedAt: "2026-05-05T00:00:00Z",
          schemaVersion: "models.dev.v1",
        },
        providers: [
          {
            providerId: "moonshotai",
            displayName: "Moonshot AI",
            providerKind: "provider-openai",
            authFamily: "api-key",
            adapterFamily: "ai-sdk-openai-compatible",
            apiBase: "https://api.moonshot.ai/v1",
            envVars: ["MOONSHOT_API_KEY"],
            controlPlaneRequirements: ["kimi-code.oauth.device"],
            localOverrideApplied: true,
            upstreamProvenance: {
              vendor: "models.dev",
              commit: "moonshot-run14",
              capturedAt: "2026-05-05T00:00:00Z",
              schemaVersion: "models.dev.v1",
            },
            supportedAuthModes: ["api-key-static", "oauth2-device-code"],
          },
        ],
        models: [],
      } as Parameters<typeof validateProviderAccounts>[0]["catalog"],
      accounts: [
        {
          providerAccountId: "moonshot.personal.kimi-code",
          providerId: "moonshotai",
          providerKind: "provider-openai",
          orgScope: "personal",
          accountScope: "workspace-default",
          credentialRef: {
            backend: "local-encrypted-file",
            ref: "oauth/kimi-code",
          },
          authMode: "oauth2-device-code",
          regionPolicy: {
            mode: "prefer",
            regions: ["global"],
          },
          baseUrlOverride: "https://api.kimi.com/coding/v1",
          allowedModels: ["moonshotai/kimi-k2.5"],
          deniedModels: [],
          entitlementTags: ["chat", "search"],
          budgetPolicyRef: "budget.default",
          quotaPolicyRef: "quota.default",
          status: "disabled",
          healthStatus: "credentials-missing",
          rotationState: "not-required",
        },
      ],
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.accounts).toHaveLength(1);
    expect(result.accounts[0]).toMatchObject({
      providerAccountId: "moonshot.personal.kimi-code",
      providerId: "moonshotai",
      authMode: "oauth2-device-code",
      baseUrlOverride: "https://api.kimi.com/coding/v1",
    });
  });

  test("accepts model role assignments for allowed models and known runtime roles", () => {
    const result = validateProviderAccounts({
      catalog: {
        catalogVersion: "1",
        source: {
          vendor: "models.dev",
          commit: "moonshot-run14",
          capturedAt: "2026-05-05T00:00:00Z",
          schemaVersion: "models.dev.v1",
        },
        providers: [
          {
            providerId: "moonshotai",
            displayName: "Moonshot AI",
            providerKind: "provider-openai",
            authFamily: "api-key",
            adapterFamily: "ai-sdk-openai-compatible",
            apiBase: "https://api.moonshot.ai/v1",
            envVars: ["MOONSHOT_API_KEY"],
            controlPlaneRequirements: ["kimi-code.oauth.device"],
            localOverrideApplied: true,
            upstreamProvenance: {
              vendor: "models.dev",
              commit: "moonshot-run14",
              capturedAt: "2026-05-05T00:00:00Z",
              schemaVersion: "models.dev.v1",
            },
            supportedAuthModes: ["api-key-static", "oauth2-device-code"],
          },
        ],
        models: [],
      } as Parameters<typeof validateProviderAccounts>[0]["catalog"],
      allowedRoleIds: ["general.chat", "coder.patch"],
      accounts: [
        {
          providerAccountId: "moonshot.personal.primary",
          providerId: "moonshotai",
          providerKind: "provider-openai",
          orgScope: "personal",
          accountScope: "workspace-default",
          credentialRef: {
            backend: "env",
            ref: "MOONSHOT_API_KEY",
          },
          authMode: "api-key-static",
          regionPolicy: {
            mode: "prefer",
            regions: ["global"],
          },
          baseUrlOverride: "https://api.moonshot.ai/v1",
          allowedModels: ["moonshotai/kimi-k2.5", "moonshotai/kimi-k2-turbo-preview"],
          modelRoleBindings: [
            {
              modelId: "moonshotai/kimi-k2.5",
              roleIds: ["general.chat", "coder.patch"],
            },
          ],
          deniedModels: [],
          entitlementTags: ["chat"],
          budgetPolicyRef: "budget.default",
          quotaPolicyRef: "quota.default",
          status: "active",
          healthStatus: "healthy",
          rotationState: "stable",
        },
      ],
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.accounts[0]).toMatchObject({
      providerAccountId: "moonshot.personal.primary",
      modelRoleBindings: [
        {
          modelId: "moonshotai/kimi-k2.5",
          roleIds: ["general.chat", "coder.patch"],
        },
      ],
    });
  });

  test("rejects model role assignments that target models outside the allowed model set", () => {
    const result = validateProviderAccounts({
      catalog: {
        catalogVersion: "1",
        source: {
          vendor: "models.dev",
          commit: "moonshot-run14",
          capturedAt: "2026-05-05T00:00:00Z",
          schemaVersion: "models.dev.v1",
        },
        providers: [
          {
            providerId: "moonshotai",
            displayName: "Moonshot AI",
            providerKind: "provider-openai",
            authFamily: "api-key",
            adapterFamily: "ai-sdk-openai-compatible",
            apiBase: "https://api.moonshot.ai/v1",
            envVars: ["MOONSHOT_API_KEY"],
            controlPlaneRequirements: ["kimi-code.oauth.device"],
            localOverrideApplied: true,
            upstreamProvenance: {
              vendor: "models.dev",
              commit: "moonshot-run14",
              capturedAt: "2026-05-05T00:00:00Z",
              schemaVersion: "models.dev.v1",
            },
            supportedAuthModes: ["api-key-static"],
          },
        ],
        models: [],
      } as Parameters<typeof validateProviderAccounts>[0]["catalog"],
      allowedRoleIds: ["general.chat"],
      accounts: [
        {
          providerAccountId: "moonshot.personal.primary",
          providerId: "moonshotai",
          providerKind: "provider-openai",
          orgScope: "personal",
          accountScope: "workspace-default",
          credentialRef: {
            backend: "env",
            ref: "MOONSHOT_API_KEY",
          },
          authMode: "api-key-static",
          regionPolicy: {
            mode: "prefer",
            regions: ["global"],
          },
          baseUrlOverride: "https://api.moonshot.ai/v1",
          allowedModels: ["moonshotai/kimi-k2.5"],
          modelRoleBindings: [
            {
              modelId: "moonshotai/kimi-k2-turbo-preview",
              roleIds: ["general.chat"],
            },
          ],
          deniedModels: [],
          entitlementTags: ["chat"],
          budgetPolicyRef: "budget.default",
          quotaPolicyRef: "quota.default",
          status: "active",
          healthStatus: "healthy",
          rotationState: "stable",
        },
      ],
    });

    expect(result.accounts).toHaveLength(0);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        providerAccountId: "moonshot.personal.primary",
        code: "MODEL_ROLE_MODEL_NOT_ALLOWED",
      }),
    );
  });
});
