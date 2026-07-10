import { mkdir, rm, writeFile } from "node:fs/promises";
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
            roleIds: ["writer"],
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

  test("reconnect starts a fresh Codex Subscription device-code session instead of reusing a stale pending one", async () => {
    const runtimeStateRoot = path.join(os.tmpdir(), `account-repair-codex-reconnect-${Date.now()}`);
    const scopeId = "account-repair-codex-reconnect-tests";
    let loginCount = 0;
    let networkRequests = 0;

    const backend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: testFixtureRoot,
      runtimeStateRoot,
      scopeId,
      networkFetcher: async (input) => {
        const url =
          typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        networkRequests += 1;
        throw new Error(`Unexpected network request: ${url}`);
      },
      codexAuthAdapter: {
        startDeviceCodeLogin: async () => {
          loginCount += 1;
          return {
            loginId: `login-codex-${loginCount.toString().padStart(3, "0")}`,
            verificationUrl: "https://auth.openai.com/codex/device",
            userCode: `UDHG-2HKJ${loginCount}`,
            wsUrl: `ws://127.0.0.1:${4510 + loginCount}`,
            pid: 4300 + loginCount,
          };
        },
        readAccount: async () => ({
          account: null,
          requiresOpenaiAuth: true,
        }),
      },
      // biome-ignore lint/suspicious/noExplicitAny: test mock object
    } as any);

    try {
      const firstPending = await backend.startProviderDeviceAuthorization({
        providerAccountId: "openai.personal.codex-subscription",
        providerId: "openai",
        providerKind: "provider-openai",
        variantId: "openai-codex-subscription",
        orgScope: "personal",
        accountScope: "workspace-default",
        allowedModels: ["chatgpt/gpt-5.3-codex"],
        deniedModels: [],
        entitlementTags: ["chat"],
        budgetPolicyRef: "budget.default",
        quotaPolicyRef: "quota.default",
      });

      const repairBackend = backend as typeof backend & {
        reconnectProviderAccount?: (body: Record<string, unknown>) => Promise<unknown>;
      };
      const secondPending = (await repairBackend.reconnectProviderAccount?.({
        providerAccountId: "openai.personal.codex-subscription",
      })) as {
        authRequestId: string;
        providerAccountId: string;
        status: string;
        userCode?: string;
      };

      expect(firstPending.status).toBe("pending");
      expect(secondPending).toEqual(
        expect.objectContaining({
          providerAccountId: "openai.personal.codex-subscription",
          status: "pending",
          userCode: "UDHG-2HKJ2",
        }),
      );
      expect(secondPending.authRequestId).not.toBe(firstPending.authRequestId);
      expect(loginCount).toBe(2);
      expect(networkRequests).toBe(0);

      await expect(backend.listProviderDeviceAuthorizations()).resolves.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            authRequestId: firstPending.authRequestId,
            providerAccountId: "openai.personal.codex-subscription",
            status: "failed",
            lastError: "Superseded by a newer sign-in attempt.",
          }),
          expect.objectContaining({
            authRequestId: secondPending.authRequestId,
            providerAccountId: "openai.personal.codex-subscription",
            status: "pending",
            userCode: "UDHG-2HKJ2",
          }),
        ]),
      );
    } finally {
      await backend.shutdown();
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  });

  test("starting Codex Subscription authorization again supersedes the older pending session", async () => {
    const runtimeStateRoot = path.join(os.tmpdir(), `account-repair-codex-restart-${Date.now()}`);
    const scopeId = "account-repair-codex-restart-tests";
    let loginCount = 0;

    const backend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: testFixtureRoot,
      runtimeStateRoot,
      scopeId,
      networkFetcher: async (input) => {
        const url =
          typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        throw new Error(`Unexpected network request: ${url}`);
      },
      codexAuthAdapter: {
        startDeviceCodeLogin: async () => {
          loginCount += 1;
          return {
            loginId: `login-codex-${loginCount.toString().padStart(3, "0")}`,
            verificationUrl: "https://auth.openai.com/codex/device",
            userCode: `FRESH-CODE-${loginCount}`,
            wsUrl: `ws://127.0.0.1:${4610 + loginCount}`,
            pid: 4400 + loginCount,
          };
        },
        readAccount: async () => ({
          account: null,
          requiresOpenaiAuth: true,
        }),
      },
      // biome-ignore lint/suspicious/noExplicitAny: test mock object
    } as any);

    try {
      const firstPending = await backend.startProviderDeviceAuthorization({
        providerAccountId: "openai.personal.codex-subscription",
        providerId: "openai",
        providerKind: "provider-openai",
        variantId: "openai-codex-subscription",
        orgScope: "personal",
        accountScope: "workspace-default",
        allowedModels: ["chatgpt/gpt-5.3-codex"],
        deniedModels: [],
        entitlementTags: ["chat"],
        budgetPolicyRef: "budget.default",
        quotaPolicyRef: "quota.default",
      });
      const secondPending = await backend.startProviderDeviceAuthorization({
        providerAccountId: "openai.personal.codex-subscription",
        providerId: "openai",
        providerKind: "provider-openai",
        variantId: "openai-codex-subscription",
        orgScope: "personal",
        accountScope: "workspace-default",
        allowedModels: ["chatgpt/gpt-5.3-codex"],
        deniedModels: [],
        entitlementTags: ["chat"],
        budgetPolicyRef: "budget.default",
        quotaPolicyRef: "quota.default",
      });

      expect(firstPending.status).toBe("pending");
      expect(secondPending).toEqual(
        expect.objectContaining({
          providerAccountId: "openai.personal.codex-subscription",
          status: "pending",
          userCode: "FRESH-CODE-2",
        }),
      );
      expect(secondPending.authRequestId).not.toBe(firstPending.authRequestId);
      expect(loginCount).toBe(2);

      await expect(backend.listProviderDeviceAuthorizations()).resolves.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            authRequestId: firstPending.authRequestId,
            providerAccountId: "openai.personal.codex-subscription",
            status: "failed",
            lastError: "Superseded by a newer sign-in attempt.",
          }),
          expect.objectContaining({
            authRequestId: secondPending.authRequestId,
            providerAccountId: "openai.personal.codex-subscription",
            status: "pending",
            userCode: "FRESH-CODE-2",
          }),
        ]),
      );
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
            roleIds: ["writer"],
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
              roleIds: ["writer"],
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
                roleIds: ["writer"],
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
            roleIds: ["writer"],
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
                roleIds: ["writer"],
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

  test("codex subscription start returns a real device-code session and poll connects through managed Codex auth", async () => {
    const runtimeStateRoot = path.join(os.tmpdir(), `account-repair-openai-codex-${Date.now()}`);
    const scopeId = "account-repair-openai-codex-tests";
    let networkRequests = 0;
    let managedCodexHome: string | null = null;
    const codexExecutionRequests: Array<{
      requestId: string;
      providerAccountId: string;
      modelId: string;
      requestCapture: {
        url: string;
        body: Record<string, unknown>;
      };
    }> = [];

    const backend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: testFixtureRoot,
      runtimeStateRoot,
      scopeId,
      networkFetcher: async (input) => {
        const url =
          typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        networkRequests += 1;
        throw new Error(`Unexpected network request: ${url}`);
      },
      codexAuthAdapter: {
        startDeviceCodeLogin: async ({ codexHome }) => {
          managedCodexHome = codexHome;
          return {
            loginId: "login-codex-001",
            verificationUrl: "https://auth.openai.com/codex/device",
            userCode: "UDHG-2HKJV",
            wsUrl: "ws://127.0.0.1:4511",
            pid: 4321,
          };
        },
        readAccount: async ({ codexHome }) => {
          await mkdir(codexHome, { recursive: true });
          await writeFile(
            path.join(codexHome, "auth.json"),
            JSON.stringify(
              {
                auth_mode: "chatgpt",
                tokens: {
                  access_token: "codex-access-001",
                  refresh_token: "codex-refresh-001",
                  account_id: "codex-account-001",
                },
                last_refresh: "2026-06-18T18:00:00.000Z",
              },
              null,
              2,
            ),
            "utf8",
          );
          return {
            account: {
              type: "chatgpt",
              email: "user@example.com",
              planType: "prolite",
            },
            requiresOpenaiAuth: true,
          };
        },
      },
      codexExecutionAdapter: {
        executeRequest: async ({ requestId, providerAccountId, modelId, requestCapture }) => {
          codexExecutionRequests.push({
            requestId,
            providerAccountId,
            modelId,
            requestCapture: {
              url: requestCapture.url,
              body: requestCapture.body,
            },
          });
          return {
            statusCode: 200,
            body: requestCapture.url.endsWith("/chat/completions")
              ? {
                  id: "chatcmpl-codex-001",
                  choices: [
                    {
                      index: 0,
                      finish_reason: "stop",
                      message: {
                        role: "assistant",
                        content: "Codex subscription reply",
                      },
                    },
                  ],
                  usage: {
                    prompt_tokens: 21,
                    completion_tokens: 7,
                  },
                }
              : {
                  id: "resp-codex-001",
                  output: [
                    {
                      type: "message",
                      role: "assistant",
                      content: [
                        {
                          type: "output_text",
                          text: "Codex subscription reply",
                        },
                      ],
                    },
                  ],
                  usage: {
                    input_tokens: 21,
                    output_tokens: 7,
                  },
                },
            vendorMetadata: {
              vendorId: "chatgpt-codex-responses",
              latencyMs: 12,
            },
          };
        },
      },
      // biome-ignore lint/suspicious/noExplicitAny: test mock object
    } as any);

    try {
      const pending = await backend.startProviderDeviceAuthorization({
        providerAccountId: "openai.personal.codex-subscription",
        providerId: "openai",
        providerKind: "provider-openai",
        variantId: "openai-codex-subscription",
        orgScope: "personal",
        accountScope: "workspace-default",
        allowedModels: ["chatgpt/gpt-5.3-codex"],
        deniedModels: [],
        entitlementTags: ["chat"],
        budgetPolicyRef: "budget.default",
        quotaPolicyRef: "quota.default",
      });

      expect(pending).toEqual(
        expect.objectContaining({
          providerAccountId: "openai.personal.codex-subscription",
          status: "pending",
          userCode: "UDHG-2HKJV",
          verificationUri: "https://auth.openai.com/codex/device",
        }),
      );
      expect(managedCodexHome).toBeTruthy();

      await expect(
        backend.pollProviderDeviceAuthorization({
          authRequestId: pending.authRequestId,
        }),
      ).resolves.toEqual(
        expect.objectContaining({
          authRequestId: pending.authRequestId,
          providerAccountId: "openai.personal.codex-subscription",
          status: "connected",
        }),
      );

      await expect(backend.listAccounts()).resolves.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            providerAccountId: "openai.personal.codex-subscription",
            providerId: "openai",
            authMode: "oauth2-device-code",
            credentialRef: {
              backend: "local-file",
              ref: "oauth/openai/openai.personal.codex-subscription",
            },
            status: "active",
            healthStatus: "healthy",
            rotationState: "stable",
          }),
        ]),
      );

      await expect(
        backend.activateEndpoint({
          providerAccountId: "openai.personal.codex-subscription",
          modelId: "chatgpt/gpt-5.3-codex",
          region: "global",
        }),
      ).resolves.toEqual(
        expect.objectContaining({
          providerAccountId: "openai.personal.codex-subscription",
          providerId: "openai",
          modelId: "chatgpt/gpt-5.3-codex",
          status: "active",
        }),
      );

      await expect(backend.listEndpoints()).resolves.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            endpointId: "openai.personal.codex-subscription.global.gpt-5.3-codex",
            providerAccountId: "openai.personal.codex-subscription",
            modelId: "chatgpt/gpt-5.3-codex",
            toolCallingSupported: true,
            toolCallingStyle: "none",
          }),
        ]),
      );

      await expect(
        backend.executeResponses(
          {
            model: "chatgpt/gpt-5.3-codex",
            input: "Reply with Codex subscription reply.",
          },
          "req-codex-subscription-001",
        ),
      ).resolves.toEqual(
        expect.objectContaining({
          responseId: expect.stringMatching(/^(resp|chatcmpl)-codex-/),
          model: "chatgpt/gpt-5.3-codex",
          endpointId: "openai.personal.codex-subscription.global.gpt-5.3-codex",
          outputText: "Codex subscription reply",
          finishReason: "stop",
          usage: {
            inputTokens: 21,
            outputTokens: 7,
          },
        }),
      );

      expect(codexExecutionRequests).toEqual([
        expect.objectContaining({
          requestId: "req-codex-subscription-001",
          providerAccountId: "openai.personal.codex-subscription",
          modelId: "chatgpt/gpt-5.3-codex",
          requestCapture: expect.objectContaining({
            url: expect.stringMatching(/\/v1\/(chat\/completions|responses)$/),
            body: expect.objectContaining({
              model: "gpt-5.3-codex",
            }),
          }),
        }),
      ]);
      expect(networkRequests).toBe(0);

      await expect(
        backend.startProviderDeviceAuthorization({
          providerAccountId: "openai.personal.codex-subscription",
          providerId: "openai",
          providerKind: "provider-openai",
          variantId: "openai-codex-subscription",
          orgScope: "personal",
          accountScope: "workspace-default",
          allowedModels: ["chatgpt/gpt-5.3-codex"],
          deniedModels: [],
          entitlementTags: ["chat"],
          budgetPolicyRef: "budget.default",
          quotaPolicyRef: "quota.default",
        }),
      ).resolves.toEqual(
        expect.objectContaining({
          providerAccountId: "openai.personal.codex-subscription",
          status: "pending",
          userCode: "UDHG-2HKJV",
        }),
      );

      const summary = await backend.readRuntimeSummary();
      expect(summary.credentialLifecycle.counts.executionReady).toBe(1);
      expect(summary.credentialLifecycle.counts.pendingAuthorization).toBe(0);
      expect(summary.credentialLifecycle.accounts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            providerAccountId: "openai.personal.codex-subscription",
            lifecycleState: "execution-ready",
            reasonCode: "active-endpoint-present",
            blocking: false,
            activeEndpointIds: ["openai.personal.codex-subscription.global.gpt-5.3-codex"],
          }),
        ]),
      );
    } finally {
      await backend.shutdown();
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  });
});
