import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";

import { createRuntimeBridgeBackend } from "../src/index.js";

const repoRoot = path.resolve(import.meta.dirname, "..", "..", "..", "..");
const testFixtureRoot = path.join(import.meta.dirname, "fixtures-restart-rehydration");

describe("account repair mutations", () => {
  test("reconnect returns the current pending device-authorization session for the same account", async () => {
    const runtimeStateRoot = path.join(os.tmpdir(), `account-repair-reconnect-${Date.now()}`);
    const scopeId = "account-repair-reconnect-tests";
    let deviceAuthorizationRequests = 0;

    const backend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: testFixtureRoot,
      runtimeStateRoot,
      scopeId,
      networkFetcher: async (input, init) => {
        const url =
          typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        if (url === "https://auth.kimi.com/api/oauth/device_authorization") {
          expect(init?.method ?? "POST").toBe("POST");
          deviceAuthorizationRequests += 1;
          return new Response(
            JSON.stringify({
              user_code: "ABCD-EFGH",
              device_code: "device-001",
              verification_uri: "https://auth.kimi.com/device",
              verification_uri_complete: "https://auth.kimi.com/device?user_code=ABCD-EFGH",
              expires_in: 900,
              interval: 5,
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
        throw new Error(`Unexpected network request: ${url}`);
      },
    });

    try {
      const pending = await backend.startProviderDeviceAuthorization({
        providerAccountId: "moonshot.personal.kimi-code",
        providerId: "moonshot",
        providerKind: "provider-openai",
        variantId: "kimi-code",
        orgScope: "personal",
        accountScope: "workspace-default",
        allowedModels: ["moonshot/kimi-k2.5"],
        modelRoleBindings: [
          {
            modelId: "moonshot/kimi-k2.5",
            roleIds: ["general.chat"],
          },
        ],
        deniedModels: [],
        entitlementTags: ["chat"],
        budgetPolicyRef: "budget.default",
        quotaPolicyRef: "quota.default",
      });

      const repairBackend = backend as typeof backend & {
        reconnectProviderAccount?: (body: Record<string, unknown>) => Promise<unknown>;
      };
      await expect(
        repairBackend.reconnectProviderAccount?.({
          providerAccountId: "moonshot.personal.kimi-code",
        }),
      ).resolves.toEqual(
        expect.objectContaining({
          authRequestId: pending.authRequestId,
          providerAccountId: "moonshot.personal.kimi-code",
          status: "pending",
        }),
      );
      expect(deviceAuthorizationRequests).toBe(1);
    } finally {
      await backend.shutdown();
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  });

  test("update API key preserves account identity, bindings, and endpoint associations", async () => {
    const runtimeStateRoot = path.join(os.tmpdir(), `account-repair-apikey-${Date.now()}`);
    const scopeId = "account-repair-apikey-tests";
    const originalMoonshotApiKey = process.env.MOONSHOT_API_KEY;
    process.env.MOONSHOT_API_KEY = "sk-inline-seed-key";

    const backend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: testFixtureRoot,
      runtimeStateRoot,
      scopeId,
    });

    try {
      await backend.upsertProviderAccount({
        providerAccountId: "moonshot.personal.primary",
        providerId: "moonshot",
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
        allowedModels: ["moonshot/kimi-k2.5"],
        modelRoleBindings: [
          {
            modelId: "moonshot/kimi-k2.5",
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
      });
      const activation = await backend.activateEndpoint({
        providerAccountId: "moonshot.personal.primary",
        modelId: "moonshot/kimi-k2.5",
        region: "global",
      });

      const repairBackend = backend as typeof backend & {
        updateProviderApiKey?: (body: Record<string, unknown>) => Promise<unknown>;
      };
      await expect(
        repairBackend.updateProviderApiKey?.({
          providerAccountId: "moonshot.personal.primary",
          apiKey: "sk-inline-updated-key",
        }),
      ).resolves.toEqual(
        expect.objectContaining({
          providerAccountId: "moonshot.personal.primary",
          credentialRef: {
            backend: "local-file",
            ref: "api-key/moonshot/moonshot.personal.primary",
          },
          allowedModels: ["moonshot/kimi-k2.5"],
          modelRoleBindings: [
            {
              modelId: "moonshot/kimi-k2.5",
              roleIds: ["general.chat"],
            },
          ],
        }),
      );

      await expect(backend.listAccounts()).resolves.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            providerAccountId: "moonshot.personal.primary",
            credentialRef: {
              backend: "local-file",
              ref: "api-key/moonshot/moonshot.personal.primary",
            },
            allowedModels: ["moonshot/kimi-k2.5"],
            modelRoleBindings: [
              {
                modelId: "moonshot/kimi-k2.5",
                roleIds: ["general.chat"],
              },
            ],
          }),
        ]),
      );
      await expect(backend.listEndpoints()).resolves.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            endpointId: activation.endpointId,
            providerAccountId: "moonshot.personal.primary",
          }),
        ]),
      );
    } finally {
      await backend.shutdown();
      if (originalMoonshotApiKey === undefined) {
        delete process.env.MOONSHOT_API_KEY;
      } else {
        process.env.MOONSHOT_API_KEY = originalMoonshotApiKey;
      }
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  });

  test("rejects overlapping repair mutations for the same account without partially mutating state", async () => {
    const runtimeStateRoot = path.join(os.tmpdir(), `account-repair-overlap-${Date.now()}`);
    const scopeId = "account-repair-overlap-tests";
    let deviceAuthorizationRequests = 0;
    let resolveReconnectStarted: (() => void) | null = null;
    let resolveReconnectResponse: ((response: Response) => void) | null = null;
    const reconnectStarted = new Promise<void>((resolve) => {
      resolveReconnectStarted = resolve;
    });
    const reconnectResponse = new Promise<Response>((resolve) => {
      resolveReconnectResponse = resolve;
    });

    const backend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: testFixtureRoot,
      runtimeStateRoot,
      scopeId,
      networkFetcher: async (input, init) => {
        const url =
          typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        if (url === "https://auth.kimi.com/api/oauth/device_authorization") {
          expect(init?.method ?? "POST").toBe("POST");
          deviceAuthorizationRequests += 1;
          if (deviceAuthorizationRequests === 1) {
            return new Response(
              JSON.stringify({
                user_code: "ABCD-EFGH",
                device_code: "device-001",
                verification_uri: "https://auth.kimi.com/device",
                verification_uri_complete: "https://auth.kimi.com/device?user_code=ABCD-EFGH",
                expires_in: 900,
                interval: 5,
              }),
              { status: 200, headers: { "content-type": "application/json" } },
            );
          }
          resolveReconnectStarted?.();
          return reconnectResponse;
        }
        if (url === "https://auth.kimi.com/api/oauth/token") {
          expect(init?.method ?? "POST").toBe("POST");
          return new Response(
            JSON.stringify({
              access_token: "access-001",
              refresh_token: "refresh-001",
              expires_in: 3600,
              scope: "openid profile",
              token_type: "Bearer",
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
        throw new Error(`Unexpected network request: ${url}`);
      },
    });

    try {
      const pending = await backend.startProviderDeviceAuthorization({
        providerAccountId: "moonshot.personal.kimi-code",
        providerId: "moonshot",
        providerKind: "provider-openai",
        variantId: "kimi-code",
        orgScope: "personal",
        accountScope: "workspace-default",
        allowedModels: ["moonshot/kimi-k2.5"],
        modelRoleBindings: [
          {
            modelId: "moonshot/kimi-k2.5",
            roleIds: ["general.chat"],
          },
        ],
        deniedModels: [],
        entitlementTags: ["chat"],
        budgetPolicyRef: "budget.default",
        quotaPolicyRef: "quota.default",
      });
      await backend.pollProviderDeviceAuthorization({
        authRequestId: pending.authRequestId,
      });

      const repairBackend = backend as typeof backend & {
        reconnectProviderAccount?: (body: Record<string, unknown>) => Promise<unknown>;
        updateProviderApiKey?: (body: Record<string, unknown>) => Promise<unknown>;
      };
      const reconnectPromise = repairBackend.reconnectProviderAccount?.({
        providerAccountId: "moonshot.personal.kimi-code",
      });
      await reconnectStarted;

      await expect(
        repairBackend.updateProviderApiKey?.({
          providerAccountId: "moonshot.personal.kimi-code",
          apiKey: "sk-inline-should-not-persist",
        }),
      ).rejects.toThrow(
        "Provider account moonshot.personal.kimi-code already has a repair in progress.",
      );

      resolveReconnectResponse?.(
        new Response(
          JSON.stringify({
            user_code: "WXYZ-1234",
            device_code: "device-002",
            verification_uri: "https://auth.kimi.com/device",
            verification_uri_complete: "https://auth.kimi.com/device?user_code=WXYZ-1234",
            expires_in: 900,
            interval: 5,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );

      await expect(reconnectPromise).resolves.toEqual(
        expect.objectContaining({
          providerAccountId: "moonshot.personal.kimi-code",
          status: "pending",
          userCode: "WXYZ-1234",
        }),
      );
      await expect(backend.listAccounts()).resolves.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            providerAccountId: "moonshot.personal.kimi-code",
            authMode: "oauth2-device-code",
            credentialRef: {
              backend: "local-file",
              ref: "oauth/moonshot/moonshot.personal.kimi-code",
            },
            modelRoleBindings: [
              {
                modelId: "moonshot/kimi-k2.5",
                roleIds: ["general.chat"],
              },
            ],
          }),
        ]),
      );
      expect(deviceAuthorizationRequests).toBe(2);
    } finally {
      resolveReconnectResponse?.(
        new Response(
          JSON.stringify({
            user_code: "WXYZ-1234",
            device_code: "device-002",
            verification_uri: "https://auth.kimi.com/device",
            verification_uri_complete: "https://auth.kimi.com/device?user_code=WXYZ-1234",
            expires_in: 900,
            interval: 5,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );
      await backend.shutdown();
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  });
});
