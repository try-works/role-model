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
});
