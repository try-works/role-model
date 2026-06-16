import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { describe, expect, test } from "vitest";

import {
  listRuntimeEndpoints,
  resolveSqliteMemoryLocation,
} from "@role-model-router/sqlite-memory";

import { createRuntimeBridgeBackend } from "../src/index.js";

const repoRoot = path.resolve(import.meta.dirname, "..", "..", "..", "..");
const testFixtureRoot = path.join(import.meta.dirname, "fixtures-restart-rehydration");

describe("restart rehydration", () => {
  test("restores activated endpoints and session readiness summary after backend restart", async () => {
    const runtimeStateRoot = path.join(os.tmpdir(), `restart-rehydration-${Date.now()}`);
    const scopeId = "restart-rehydration-tests";
    const databasePath = resolveSqliteMemoryLocation({ runtimeStateRoot, scopeId });
    const originalMoonshotApiKey = process.env.MOONSHOT_API_KEY;
    process.env.MOONSHOT_API_KEY = "moonshot-restart-rehydration-key";

    const createBackend = () =>
      createRuntimeBridgeBackend({
        repoRoot,
        fixtureRoot: testFixtureRoot,
        runtimeStateRoot,
        scopeId,
      });

    try {
      const firstBackend = await createBackend();
      await firstBackend.upsertProviderAccount({
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
      const activation = await firstBackend.activateEndpoint({
        providerAccountId: "moonshot.personal.primary",
        modelId: "moonshot/kimi-k2.5",
        region: "global",
      });
      await firstBackend.shutdown();

      const persistedEndpoints = listRuntimeEndpoints({ databasePath });
      expect(persistedEndpoints.map((endpoint) => endpoint.endpointId)).toContain(
        activation.endpointId,
      );

      const secondBackend = await createBackend();
      try {
        let health = await secondBackend.readHealthStatus();
        for (
          let attempt = 0;
          attempt < 20 && health.sessionBootstrap.status === "running";
          attempt += 1
        ) {
          await delay(50);
          health = await secondBackend.readHealthStatus();
        }

        const summary = await secondBackend.readRuntimeSummary();
        expect(summary.readinessSummary.connectedWithoutEndpointCount).toBe(0);
        const lifecycle = (
          summary as {
            credentialLifecycle?: {
              counts: {
                executionReady: number;
                connectedNoEndpoint: number;
              };
              providerRollups: readonly {
                providerId: string;
                readyAccountIds: readonly string[];
                attentionAccountIds: readonly string[];
              }[];
            };
          }
        ).credentialLifecycle;
        expect(lifecycle).toBeDefined();
        expect(lifecycle?.counts.executionReady).toBe(1);
        expect(lifecycle?.counts.connectedNoEndpoint).toBe(0);
        expect(lifecycle?.accounts).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              providerAccountId: "moonshot.personal.primary",
              lifecycleState: "execution-ready",
              availableActions: ["update-api-key"],
            }),
          ]),
        );
        expect(lifecycle?.providerRollups).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              providerId: "moonshot",
              readyAccountIds: ["moonshot.personal.primary"],
              attentionAccountIds: [],
            }),
          ]),
        );
        expect(summary.inventorySummary.endpointIdCount).toBeGreaterThan(0);
        expect(summary.sessionBootstrap.stages.map((stage) => stage.stageId)).toContain(
          "endpoints",
        );

        const endpoints = await secondBackend.listEndpoints();
        expect(endpoints.map((endpoint) => endpoint.endpointId)).toContain(activation.endpointId);
      } finally {
        await secondBackend.shutdown();
      }
    } finally {
      if (originalMoonshotApiKey === undefined) {
        delete process.env.MOONSHOT_API_KEY;
      } else {
        process.env.MOONSHOT_API_KEY = originalMoonshotApiKey;
      }
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  });

  test("does not count expired pending device authorization as an active readiness blocker after restart", async () => {
    const runtimeStateRoot = path.join(os.tmpdir(), `restart-expired-auth-${Date.now()}`);
    const scopeId = "restart-expired-auth-tests";
    const databasePath = resolveSqliteMemoryLocation({ runtimeStateRoot, scopeId });

    const firstBackend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: testFixtureRoot,
      runtimeStateRoot,
      scopeId,
      networkFetcher: async (input, init) => {
        const url =
          typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        if (url === "https://auth.kimi.com/api/oauth/device_authorization") {
          expect(init?.method ?? "POST").toBe("POST");
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
      await firstBackend.startProviderDeviceAuthorization({
        providerAccountId: "moonshot.personal.kimi-code",
        providerId: "moonshot",
        providerKind: "provider-openai",
        variantId: "kimi-code",
        orgScope: "personal",
        accountScope: "workspace-default",
        allowedModels: ["moonshot/kimi-k2.5"],
        deniedModels: [],
        entitlementTags: ["chat"],
        budgetPolicyRef: "budget.default",
        quotaPolicyRef: "quota.default",
      });
      await firstBackend.shutdown();

      const database = new DatabaseSync(databasePath);
      database
        .prepare("UPDATE provider_device_auth_sessions SET expires_at_ms = ?, updated_at_ms = ?")
        .run(Date.now() - 60_000, Date.now());
      database.close();

      const secondBackend = await createRuntimeBridgeBackend({
        repoRoot,
        fixtureRoot: testFixtureRoot,
        runtimeStateRoot,
        scopeId,
        networkFetcher: async (input) => {
          const url =
            typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
          throw new Error(`Unexpected network request after restart: ${url}`);
        },
      });

      try {
        let health = await secondBackend.readHealthStatus();
        for (
          let attempt = 0;
          attempt < 20 && health.sessionBootstrap.status === "running";
          attempt += 1
        ) {
          await delay(50);
          health = await secondBackend.readHealthStatus();
        }

        const summary = await secondBackend.readRuntimeSummary();
        expect(summary.readinessSummary.pendingDeviceAuthorizationCount).toBe(0);
        expect(summary.credentialLifecycle.counts.pendingAuthorization).toBe(0);
        expect(summary.credentialLifecycle.archivedArtifacts).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              providerAccountId: "moonshot.personal.kimi-code",
              artifactType: "device-authorization",
              reasonCode: "expired-pending-authorization",
            }),
          ]),
        );
      } finally {
        await secondBackend.shutdown();
      }
    } finally {
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  });

  test("archives orphan pending authorizations and orphan credential files instead of counting them as active readiness", async () => {
    const runtimeStateRoot = path.join(os.tmpdir(), `restart-orphan-artifacts-${Date.now()}`);
    const scopeId = "restart-orphan-artifacts-tests";
    const databasePath = resolveSqliteMemoryLocation({ runtimeStateRoot, scopeId });
    const orphanCredentialPath = path.join(
      runtimeStateRoot,
      scopeId,
      "credentials",
      "api-key",
      "moonshot",
      "orphan-account.json",
    );

    const firstBackend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: testFixtureRoot,
      runtimeStateRoot,
      scopeId,
      networkFetcher: async (input, init) => {
        const url =
          typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        if (url === "https://auth.kimi.com/api/oauth/device_authorization") {
          expect(init?.method ?? "POST").toBe("POST");
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
      await firstBackend.startProviderDeviceAuthorization({
        providerAccountId: "moonshot.personal.orphan-pending",
        providerId: "moonshot",
        providerKind: "provider-openai",
        variantId: "kimi-code",
        orgScope: "personal",
        accountScope: "workspace-default",
        allowedModels: ["moonshot/kimi-k2.5"],
        deniedModels: [],
        entitlementTags: ["chat"],
        budgetPolicyRef: "budget.default",
        quotaPolicyRef: "quota.default",
      });
      await firstBackend.shutdown();

      const database = new DatabaseSync(databasePath);
      database
        .prepare("DELETE FROM provider_accounts WHERE provider_account_id = ?")
        .run("moonshot.personal.orphan-pending");
      database.close();

      await mkdir(path.dirname(orphanCredentialPath), { recursive: true });
      await writeFile(
        orphanCredentialPath,
        JSON.stringify(
          {
            access_token: "orphan-key",
            token_type: "Bearer",
            saved_at_ms: Date.now(),
          },
          null,
          2,
        ),
        "utf8",
      );

      const secondBackend = await createRuntimeBridgeBackend({
        repoRoot,
        fixtureRoot: testFixtureRoot,
        runtimeStateRoot,
        scopeId,
        networkFetcher: async (input) => {
          const url =
            typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
          throw new Error(`Unexpected network request after restart: ${url}`);
        },
      });

      try {
        let health = await secondBackend.readHealthStatus();
        for (
          let attempt = 0;
          attempt < 20 && health.sessionBootstrap.status === "running";
          attempt += 1
        ) {
          await delay(50);
          health = await secondBackend.readHealthStatus();
        }

        const summary = await secondBackend.readRuntimeSummary();
        expect(summary.readinessSummary.pendingDeviceAuthorizationCount).toBe(0);
        expect(summary.credentialLifecycle.counts.pendingAuthorization).toBe(0);
        expect(summary.credentialLifecycle.archivedArtifacts).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              providerAccountId: "moonshot.personal.orphan-pending",
              artifactType: "device-authorization",
              reasonCode: "orphan-device-authorization",
            }),
            expect.objectContaining({
              providerAccountId: null,
              artifactType: "credential-file",
              reasonCode: "orphan-credential-file",
            }),
          ]),
        );
      } finally {
        await secondBackend.shutdown();
      }
    } finally {
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  });

  test("archives invalid persisted provider accounts instead of surfacing them as active lifecycle records", async () => {
    const runtimeStateRoot = path.join(os.tmpdir(), `restart-invalid-account-${Date.now()}`);
    const scopeId = "restart-invalid-account-tests";
    const databasePath = resolveSqliteMemoryLocation({ runtimeStateRoot, scopeId });
    const originalMoonshotApiKey = process.env.MOONSHOT_API_KEY;
    process.env.MOONSHOT_API_KEY = "moonshot-invalid-account-key";

    const firstBackend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: testFixtureRoot,
      runtimeStateRoot,
      scopeId,
    });

    try {
      await firstBackend.upsertProviderAccount({
        providerAccountId: "moonshot.personal.invalid",
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
      await firstBackend.shutdown();

      const database = new DatabaseSync(databasePath);
      database
        .prepare("UPDATE provider_accounts SET provider_id = ? WHERE provider_account_id = ?")
        .run("ghost-provider", "moonshot.personal.invalid");
      database.close();

      const secondBackend = await createRuntimeBridgeBackend({
        repoRoot,
        fixtureRoot: testFixtureRoot,
        runtimeStateRoot,
        scopeId,
      });

      try {
        let health = await secondBackend.readHealthStatus();
        for (
          let attempt = 0;
          attempt < 20 && health.sessionBootstrap.status === "running";
          attempt += 1
        ) {
          await delay(50);
          health = await secondBackend.readHealthStatus();
        }

        const summary = await secondBackend.readRuntimeSummary();
        expect(summary.accountCount).toBe(0);
        expect(summary.credentialLifecycle.accounts).not.toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              providerAccountId: "moonshot.personal.invalid",
            }),
          ]),
        );
        expect(summary.credentialLifecycle.archivedArtifacts).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              providerAccountId: "moonshot.personal.invalid",
              artifactType: "provider-account",
              reasonCode: "provider-not-found",
            }),
          ]),
        );
      } finally {
        await secondBackend.shutdown();
      }
    } finally {
      if (originalMoonshotApiKey === undefined) {
        delete process.env.MOONSHOT_API_KEY;
      } else {
        process.env.MOONSHOT_API_KEY = originalMoonshotApiKey;
      }
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  });

  test("surfaces failed pending authorization polling in bootstrap stage details after restart", async () => {
    const runtimeStateRoot = path.join(os.tmpdir(), `restart-pending-poll-failure-${Date.now()}`);
    const scopeId = "restart-pending-poll-failure-tests";

    const firstBackend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: testFixtureRoot,
      runtimeStateRoot,
      scopeId,
      networkFetcher: async (input, init) => {
        const url =
          typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        if (url === "https://auth.kimi.com/api/oauth/device_authorization") {
          expect(init?.method ?? "POST").toBe("POST");
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
      await firstBackend.startProviderDeviceAuthorization({
        providerAccountId: "moonshot.personal.kimi-code",
        providerId: "moonshot",
        providerKind: "provider-openai",
        variantId: "kimi-code",
        orgScope: "personal",
        accountScope: "workspace-default",
        allowedModels: ["moonshot/kimi-k2.5"],
        deniedModels: [],
        entitlementTags: ["chat"],
        budgetPolicyRef: "budget.default",
        quotaPolicyRef: "quota.default",
      });
      await firstBackend.shutdown();

      const secondBackend = await createRuntimeBridgeBackend({
        repoRoot,
        fixtureRoot: testFixtureRoot,
        runtimeStateRoot,
        scopeId,
        networkFetcher: async (input) => {
          const url =
            typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
          throw new Error(`Unexpected network request after restart: ${url}`);
        },
      });

      try {
        let health = await secondBackend.readHealthStatus();
        for (
          let attempt = 0;
          attempt < 20 && health.sessionBootstrap.status === "running";
          attempt += 1
        ) {
          await delay(50);
          health = await secondBackend.readHealthStatus();
        }

        const summary = await secondBackend.readRuntimeSummary();
        const credentialsStage = summary.sessionBootstrap.stages.find(
          (stage) => stage.stageId === "credentials",
        );
        expect(credentialsStage).toEqual(
          expect.objectContaining({
            status: "degraded",
            details: expect.objectContaining({
              pendingAttempted: 1,
              pendingFailed: 1,
              pendingSucceeded: 0,
            }),
          }),
        );
      } finally {
        await secondBackend.shutdown();
      }
    } finally {
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  });

  test("classifies failed startup OAuth refresh as expired auth after restart", async () => {
    const runtimeStateRoot = path.join(os.tmpdir(), `restart-expired-refresh-${Date.now()}`);
    const scopeId = "restart-expired-refresh-tests";
    const credentialPath = path.join(
      runtimeStateRoot,
      scopeId,
      "credentials",
      "oauth",
      "moonshot",
      "moonshot.personal.kimi-code.json",
    );

    const firstBackend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: testFixtureRoot,
      runtimeStateRoot,
      scopeId,
      networkFetcher: async (input, init) => {
        const url =
          typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        if (url === "https://auth.kimi.com/api/oauth/device_authorization") {
          expect(init?.method ?? "POST").toBe("POST");
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
      const pending = await firstBackend.startProviderDeviceAuthorization({
        providerAccountId: "moonshot.personal.kimi-code",
        providerId: "moonshot",
        providerKind: "provider-openai",
        variantId: "kimi-code",
        orgScope: "personal",
        accountScope: "workspace-default",
        allowedModels: ["moonshot/kimi-k2.5"],
        deniedModels: [],
        entitlementTags: ["chat"],
        budgetPolicyRef: "budget.default",
        quotaPolicyRef: "quota.default",
      });
      await firstBackend.pollProviderDeviceAuthorization({
        authRequestId: pending.authRequestId,
      });
      await firstBackend.activateEndpoint({
        providerAccountId: "moonshot.personal.kimi-code",
        modelId: "moonshot/kimi-k2.5",
        region: "global",
      });
      await firstBackend.shutdown();

      const tokenPayload = JSON.parse(await readFile(credentialPath, "utf8")) as {
        expires_in?: number;
        saved_at_ms?: number;
      };
      await writeFile(
        credentialPath,
        JSON.stringify(
          {
            ...tokenPayload,
            expires_in: 3600,
            saved_at_ms: Date.now() - 7_200_000,
          },
          null,
          2,
        ),
        "utf8",
      );

      const secondBackend = await createRuntimeBridgeBackend({
        repoRoot,
        fixtureRoot: testFixtureRoot,
        runtimeStateRoot,
        scopeId,
        networkFetcher: async (input, init) => {
          const url =
            typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
          if (url === "https://auth.kimi.com/api/oauth/token") {
            expect(init?.method ?? "POST").toBe("POST");
            return new Response(
              JSON.stringify({
                error: "invalid_grant",
                error_description: "Refresh token expired.",
              }),
              { status: 401, headers: { "content-type": "application/json" } },
            );
          }
          throw new Error(`Unexpected network request after restart: ${url}`);
        },
      });

      try {
        let health = await secondBackend.readHealthStatus();
        for (
          let attempt = 0;
          attempt < 20 && health.sessionBootstrap.status === "running";
          attempt += 1
        ) {
          await delay(50);
          health = await secondBackend.readHealthStatus();
        }

        const summary = await secondBackend.readRuntimeSummary();
        const credentialsStage = summary.sessionBootstrap.stages.find(
          (stage) => stage.stageId === "credentials",
        );
        expect(credentialsStage).toEqual(
          expect.objectContaining({
            status: "degraded",
            details: expect.objectContaining({
              refreshAttempted: 1,
              refreshSucceeded: 0,
              refreshFailed: 1,
            }),
          }),
        );
        expect(summary.readinessSummary.readyAccountCount).toBe(0);
        expect(summary.credentialLifecycle.counts.executionReady).toBe(0);
        expect(summary.credentialLifecycle.counts.expiredAuth).toBe(1);
        expect(summary.credentialLifecycle.accounts).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              providerAccountId: "moonshot.personal.kimi-code",
              lifecycleState: "expired-auth",
              reasonCode: "oauth-refresh-failed",
              blocking: true,
              availableActions: ["reconnect"],
            }),
          ]),
        );
        expect(summary.credentialLifecycle.providerRollups).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              providerId: "moonshot",
              readyAccountIds: [],
              attentionAccountIds: ["moonshot.personal.kimi-code"],
            }),
          ]),
        );
      } finally {
        await secondBackend.shutdown();
      }
    } finally {
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  });

  test("polls the earliest-expiring pending authorizations first and surfaces deferred count", async () => {
    const runtimeStateRoot = path.join(os.tmpdir(), `restart-pending-priority-${Date.now()}`);
    const scopeId = "restart-pending-priority-tests";
    const databasePath = resolveSqliteMemoryLocation({ runtimeStateRoot, scopeId });
    let deviceAuthorizationCounter = 0;

    const firstBackend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: testFixtureRoot,
      runtimeStateRoot,
      scopeId,
      networkFetcher: async (input, init) => {
        const url =
          typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        if (url === "https://auth.kimi.com/api/oauth/device_authorization") {
          expect(init?.method ?? "POST").toBe("POST");
          deviceAuthorizationCounter += 1;
          return new Response(
            JSON.stringify({
              user_code: `CODE-${deviceAuthorizationCounter}`,
              device_code: `device-${deviceAuthorizationCounter}`,
              verification_uri: "https://auth.kimi.com/device",
              verification_uri_complete: `https://auth.kimi.com/device?user_code=CODE-${deviceAuthorizationCounter}`,
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
      for (let index = 0; index < 6; index += 1) {
        await firstBackend.startProviderDeviceAuthorization({
          providerAccountId: `moonshot.personal.pending-${index}`,
          providerId: "moonshot",
          providerKind: "provider-openai",
          variantId: "kimi-code",
          orgScope: "personal",
          accountScope: "workspace-default",
          allowedModels: ["moonshot/kimi-k2.5"],
          deniedModels: [],
          entitlementTags: ["chat"],
          budgetPolicyRef: "budget.default",
          quotaPolicyRef: "quota.default",
        });
      }
      await firstBackend.shutdown();

      const database = new DatabaseSync(databasePath);
      const baseNow = Date.now();
      const expiriesByAccountId = new Map<string, number>([
        ["moonshot.personal.pending-0", baseNow + 60_000],
        ["moonshot.personal.pending-1", baseNow + 120_000],
        ["moonshot.personal.pending-2", baseNow + 180_000],
        ["moonshot.personal.pending-3", baseNow + 240_000],
        ["moonshot.personal.pending-4", baseNow + 360_000],
        ["moonshot.personal.pending-5", baseNow + 30_000],
      ]);
      for (const [providerAccountId, expiresAtMs] of expiriesByAccountId) {
        database
          .prepare(
            "UPDATE provider_device_auth_sessions SET expires_at_ms = ?, updated_at_ms = ? WHERE provider_account_id = ?",
          )
          .run(expiresAtMs, baseNow, providerAccountId);
      }
      database.close();

      const secondBackend = await createRuntimeBridgeBackend({
        repoRoot,
        fixtureRoot: testFixtureRoot,
        runtimeStateRoot,
        scopeId,
        networkFetcher: async (input, init) => {
          const url =
            typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
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
          throw new Error(`Unexpected network request after restart: ${url}`);
        },
      });

      try {
        let health = await secondBackend.readHealthStatus();
        for (
          let attempt = 0;
          attempt < 20 && health.sessionBootstrap.status === "running";
          attempt += 1
        ) {
          await delay(50);
          health = await secondBackend.readHealthStatus();
        }

        const summary = await secondBackend.readRuntimeSummary();
        const credentialsStage = summary.sessionBootstrap.stages.find(
          (stage) => stage.stageId === "credentials",
        );
        expect(credentialsStage).toEqual(
          expect.objectContaining({
            details: expect.objectContaining({
              pendingAttempted: 5,
              pendingDeferred: 1,
              pendingSucceeded: 5,
              pendingFailed: 0,
            }),
          }),
        );

        const sessions = await secondBackend.listProviderDeviceAuthorizations();
        const statusByAccountId = new Map(
          sessions.map((session) => [session.providerAccountId, session.status]),
        );
        expect(statusByAccountId.get("moonshot.personal.pending-5")).toBe("connected");
        expect(statusByAccountId.get("moonshot.personal.pending-4")).toBe("pending");
      } finally {
        await secondBackend.shutdown();
      }
    } finally {
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  });
});
