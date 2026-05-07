import os from "node:os";
import path from "node:path";
import { mkdtemp, readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

import { validateProviderAccounts } from "@role-model-router/provider-account";
import { runRuntimeAdapterValidation } from "../../adapter-execution/src/cli.ts";
import { createRuntimeObservationBundle } from "../../runtime-observability/src/index.ts";

import { runRuntimeStateValidation } from "../src/cli.ts";
import * as sqliteMemory from "../src/index.ts";
import {
  initializeSqliteMemory,
  persistContinuitySnapshot,
  persistProviderAccounts,
  persistRetrievalReceipt,
  readConversationContinuity,
  readRetrievalReceipts,
  resolveSqliteMemoryLocation,
} from "../src/index.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");

async function readJson<T>(relativePath: string): Promise<T> {
  const filePath = path.join(repoRoot, relativePath);
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

describe("initializeSqliteMemory", () => {
  test("creates the planned schema, WAL mode, and initial migration receipt under the runtime state root", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-state-"));

    const result = initializeSqliteMemory({
      runtimeStateRoot,
      scopeId: "workspace-dev",
    });

    expect(resolveSqliteMemoryLocation({ runtimeStateRoot, scopeId: "workspace-dev" })).toBe(result.databasePath);
    expect(result.databasePath).toContain(path.join("workspace-dev", "memory", "memory.sqlite"));
    expect(result.appliedMigrations).toEqual(["run06-v1-initial-schema"]);

    const database = new DatabaseSync(result.databasePath);
    const tables = database
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all() as Array<{ name: string }>;
    const tableNames = tables.map((row) => row.name);
    const journalMode = database.prepare("PRAGMA journal_mode").get() as { journal_mode: string };
    const migrations = database
      .prepare("SELECT migration_id FROM migration_receipts ORDER BY migration_id")
      .all() as Array<{ migration_id: string }>;

    expect(tableNames).toEqual(
      expect.arrayContaining([
        "artifact_links",
        "context_artifacts",
        "conversation_turns",
        "conversations",
        "memory_maintenance",
        "migration_receipts",
        "provider_account_diagnostics",
        "provider_accounts",
        "retrieval_receipts",
        "routing_handoffs",
        "schema_version",
        "sessions",
      ]),
    );
    expect(journalMode.journal_mode.toLowerCase()).toBe("wal");
    expect(migrations).toEqual([{ migration_id: "run06-v1-initial-schema" }]);
  });

  test("persists validated provider accounts by credential reference without storing raw secrets", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-state-"));
    const catalog = await readJson("role-model-router/packages/catalog/data/normalized-catalog.json");
    const fixture = await readJson<{ accounts: unknown[] }>("testdata/router-runtime/provider-accounts.json");
    const validated = validateProviderAccounts({
      catalog,
      accounts: fixture.accounts,
    });

    expect(validated.diagnostics).toEqual([]);

    const result = initializeSqliteMemory({
      runtimeStateRoot,
      scopeId: "workspace-dev",
    });

    persistProviderAccounts({
      databasePath: result.databasePath,
      accounts: validated.accounts,
    });

    const database = new DatabaseSync(result.databasePath);
    const rows = database
      .prepare(
        "SELECT provider_account_id, provider_kind, auth_mode, credential_backend, credential_ref FROM provider_accounts ORDER BY provider_account_id",
      )
      .all() as Array<{
      provider_account_id: string;
      provider_kind: string;
      auth_mode: string;
      credential_backend: string;
      credential_ref: string;
    }>;
    const columns = database.prepare("PRAGMA table_info(provider_accounts)").all() as Array<{ name: string }>;

    expect(rows).toEqual([
      {
        provider_account_id: "anthropic.team.shared",
        provider_kind: "provider-anthropic",
        auth_mode: "api-key-rotating-ref",
        credential_backend: "local-keychain",
        credential_ref: "anthropic/team/shared",
      },
      {
        provider_account_id: "openai.personal.primary",
        provider_kind: "provider-openai",
        auth_mode: "api-key-static",
        credential_backend: "env",
        credential_ref: "OPENAI_API_KEY",
      },
    ]);
    expect(columns.some((column) => column.name === "secret_value")).toBe(false);
  });

  test("upserts and lists provider accounts for runtime control-plane reads", async () => {
    expect(
      typeof (
        sqliteMemory as {
          listProviderAccounts?: unknown;
        }
      ).listProviderAccounts,
    ).toBe("function");
    expect(
      typeof (
        sqliteMemory as {
          upsertProviderAccount?: unknown;
        }
      ).upsertProviderAccount,
    ).toBe("function");

    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-state-"));
    const initialized = initializeSqliteMemory({
      runtimeStateRoot,
      scopeId: "workspace-dev",
    });

    (
      sqliteMemory as {
        upsertProviderAccount: (value: {
          databasePath: string;
          account: {
            providerAccountId: string;
            providerId: string;
            providerKind: string;
            orgScope: string;
            accountScope: string;
            credentialRef: {
              backend: string;
              ref: string;
             };
             authMode: string;
             regionPolicy: {
               mode: string;
               regions: string[];
             };
             baseUrlOverride?: string;
             allowedModels: string[];
             modelRoleBindings: Array<{
               modelId: string;
               roleIds: string[];
             }>;
             deniedModels: string[];
             entitlementTags: string[];
             budgetPolicyRef: string;
             quotaPolicyRef: string;
            status: string;
            healthStatus: string;
            rotationState: string;
          };
        }) => void;
      }
    ).upsertProviderAccount({
      databasePath: initialized.databasePath,
      account: {
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
    });

    expect(
      (
        sqliteMemory as {
           listProviderAccounts: (value: { databasePath: string }) => Array<{
             providerAccountId: string;
             providerId: string;
             authMode: string;
             baseUrlOverride?: string;
             modelRoleBindings: Array<{
               modelId: string;
               roleIds: string[];
             }>;
           }>;
         }
       ).listProviderAccounts({
         databasePath: initialized.databasePath,
      }),
    ).toEqual([
        expect.objectContaining({
          providerAccountId: "moonshot.personal.primary",
          providerId: "moonshotai",
          authMode: "api-key-static",
          baseUrlOverride: "https://api.moonshot.ai/v1",
          modelRoleBindings: [
            {
              modelId: "moonshotai/kimi-k2.5",
              roleIds: ["general.chat", "coder.patch"],
            },
          ],
        }),
      ]);
  });

  test("persists runtime-managed endpoint activations for dynamic registry materialization", async () => {
    expect(typeof (sqliteMemory as { listRuntimeEndpoints?: unknown }).listRuntimeEndpoints).toBe("function");
    expect(typeof (sqliteMemory as { upsertRuntimeEndpoint?: unknown }).upsertRuntimeEndpoint).toBe("function");

    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-state-"));
    const initialized = initializeSqliteMemory({
      runtimeStateRoot,
      scopeId: "workspace-dev",
    });

    (
      sqliteMemory as {
        upsertRuntimeEndpoint: (value: {
          databasePath: string;
          endpoint: {
            endpointId: string;
            providerAccountId: string;
            modelId: string;
            region: string;
            endpointKind: string;
            servingSource: string;
            lifecycleState: string;
            healthStatus: string;
          };
        }) => void;
      }
    ).upsertRuntimeEndpoint({
      databasePath: initialized.databasePath,
      endpoint: {
        endpointId: "moonshot.personal.primary.global.kimi-k2-5",
        providerAccountId: "moonshot.personal.primary",
        modelId: "moonshotai/kimi-k2.5",
        region: "global",
        endpointKind: "remote-openai-compatible",
        servingSource: "remote-service",
        lifecycleState: "active",
        healthStatus: "healthy",
      },
    });

    expect(
      (
        sqliteMemory as {
          listRuntimeEndpoints: (value: { databasePath: string }) => Array<{
            endpointId: string;
            providerAccountId: string;
            modelId: string;
            region: string;
          }>;
        }
      ).listRuntimeEndpoints({
        databasePath: initialized.databasePath,
      }),
    ).toEqual([
      expect.objectContaining({
        endpointId: "moonshot.personal.primary.global.kimi-k2-5",
        providerAccountId: "moonshot.personal.primary",
        modelId: "moonshotai/kimi-k2.5",
        region: "global",
      }),
    ]);
  });

  test("persists and reads the global controller assignment for the runtime control plane", async () => {
    expect(
      typeof (
        sqliteMemory as {
          readRuntimeControllerAssignment?: unknown;
        }
      ).readRuntimeControllerAssignment,
    ).toBe("function");
    expect(
      typeof (
        sqliteMemory as {
          upsertRuntimeControllerAssignment?: unknown;
        }
      ).upsertRuntimeControllerAssignment,
    ).toBe("function");

    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-state-"));
    const initialized = initializeSqliteMemory({
      runtimeStateRoot,
      scopeId: "workspace-dev",
    });

    (
      sqliteMemory as {
        upsertRuntimeControllerAssignment: (value: {
          databasePath: string;
          assignment: {
            scope: string;
            endpointId: string;
            modelId: string;
            sourceType: string;
          };
        }) => void;
      }
    ).upsertRuntimeControllerAssignment({
      databasePath: initialized.databasePath,
      assignment: {
        scope: "global",
        endpointId: "cli.local.coder",
        modelId: "gpt-5.4",
        sourceType: "local",
      },
    });

    expect(
      (
        sqliteMemory as {
          readRuntimeControllerAssignment: (value: {
            databasePath: string;
            scope: string;
          }) => {
            scope: string;
            endpointId: string;
            modelId: string;
            sourceType: string;
          } | null;
        }
      ).readRuntimeControllerAssignment({
        databasePath: initialized.databasePath,
        scope: "global",
      }),
    ).toEqual(
      expect.objectContaining({
        scope: "global",
        endpointId: "cli.local.coder",
        modelId: "gpt-5.4",
        sourceType: "local",
      }),
    );
  });

  test("persists device-auth session state for runtime OAuth polling", async () => {
    expect(
      typeof (
        sqliteMemory as {
          readProviderDeviceAuthSession?: unknown;
        }
      ).readProviderDeviceAuthSession,
    ).toBe("function");
    expect(
      typeof (
        sqliteMemory as {
          upsertProviderDeviceAuthSession?: unknown;
        }
      ).upsertProviderDeviceAuthSession,
    ).toBe("function");

    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-state-"));
    const initialized = initializeSqliteMemory({
      runtimeStateRoot,
      scopeId: "workspace-dev",
    });

    (
      sqliteMemory as {
        upsertProviderDeviceAuthSession: (value: {
          databasePath: string;
          session: {
            authRequestId: string;
            providerAccountId: string;
            providerId: string;
            variantId: string;
            credentialBackend: string;
            credentialRef: string;
            authMode: string;
            verificationUri: string;
            verificationUriComplete: string;
            userCode: string;
            deviceCode: string;
            intervalSeconds: number;
            status: string;
            lastError: string | null;
            expiresAtMs: number;
          };
        }) => void;
      }
    ).upsertProviderDeviceAuthSession({
      databasePath: initialized.databasePath,
      session: {
        authRequestId: "auth-001",
        providerAccountId: "moonshot.personal.kimi-code",
        providerId: "moonshotai",
        variantId: "kimi-code",
        credentialBackend: "local-encrypted-file",
        credentialRef: "oauth/moonshotai/moonshot.personal.kimi-code",
        authMode: "oauth2-device-code",
        verificationUri: "https://auth.kimi.com/device",
        verificationUriComplete: "https://auth.kimi.com/device?user_code=ABCD-EFGH",
        userCode: "ABCD-EFGH",
        deviceCode: "device-001",
        intervalSeconds: 5,
        status: "pending",
        lastError: null,
        expiresAtMs: 1_762_000_000_000,
      },
    });

    expect(
      (
        sqliteMemory as {
          readProviderDeviceAuthSession: (value: {
            databasePath: string;
            authRequestId: string;
          }) => {
            authRequestId: string;
            providerAccountId: string;
            status: string;
            userCode: string;
          } | null;
        }
      ).readProviderDeviceAuthSession({
        databasePath: initialized.databasePath,
        authRequestId: "auth-001",
      }),
    ).toEqual(
      expect.objectContaining({
        authRequestId: "auth-001",
        providerAccountId: "moonshot.personal.kimi-code",
        status: "pending",
        userCode: "ABCD-EFGH",
      }),
    );
  });

  test("records explicit maintenance defaults and idempotent migration behavior", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-state-"));

    const first = initializeSqliteMemory({
      runtimeStateRoot,
      scopeId: "workspace-dev",
    });
    const second = initializeSqliteMemory({
      runtimeStateRoot,
      scopeId: "workspace-dev",
    });

    const database = new DatabaseSync(first.databasePath);
    const maintenanceRows = database
      .prepare("SELECT maintenance_key, maintenance_value FROM memory_maintenance ORDER BY maintenance_key")
      .all() as Array<{
      maintenance_key: string;
      maintenance_value: string;
    }>;

    expect(first.appliedMigrations).toEqual(["run06-v1-initial-schema"]);
    expect(second.appliedMigrations).toEqual([]);
    expect(maintenanceRows).toEqual(
      expect.arrayContaining([
        { maintenance_key: "backup.policy", maintenance_value: "wal-copy-on-demand" },
        { maintenance_key: "deletion.policy", maintenance_value: "explicit-export-delete" },
        { maintenance_key: "redaction.level", maintenance_value: "strict" },
        { maintenance_key: "retention.class", maintenance_value: "standard" },
      ]),
    );
  });

  test("persists and reloads the continuity rows needed for bounded context assembly", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-state-"));
    const fixture = await readJson<{
      session: {
        sessionId: string;
        workspaceScope: string;
        createdAtMs: number;
        updatedAtMs: number;
      };
      conversation: {
        conversationId: string;
        sessionId: string;
        createdAtMs: number;
        updatedAtMs: number;
      };
      turns: Array<{
        turnId: string;
        conversationId: string;
        role: string;
        contentRef: string;
        createdAtMs: number;
      }>;
      artifacts: Array<{
        artifactId: string;
        artifactKind: string;
        storageRef: string;
        createdAtMs: number;
      }>;
      artifactLinks: Array<{
        linkId: string;
        artifactId: string;
        conversationId: string | null;
        sessionId: string | null;
        createdAtMs: number;
      }>;
      handoffs: Array<{
        handoffId: string;
        conversationId: string | null;
        fromEndpointId: string | null;
        toEndpointId: string | null;
        createdAtMs: number;
      }>;
    }>("testdata/router-runtime/context-envelope.json");
    const initialized = initializeSqliteMemory({
      runtimeStateRoot,
      scopeId: "workspace-dev",
    });

    persistContinuitySnapshot({
      databasePath: initialized.databasePath,
      session: fixture.session,
      conversation: fixture.conversation,
      turns: fixture.turns,
      artifacts: fixture.artifacts,
      artifactLinks: fixture.artifactLinks,
      handoffs: fixture.handoffs,
    });

    const continuity = readConversationContinuity({
      databasePath: initialized.databasePath,
      conversationId: fixture.conversation.conversationId,
    });

    expect(continuity.session).toEqual(fixture.session);
    expect(continuity.conversation).toEqual(fixture.conversation);
    expect(continuity.turns.map((turn) => turn.turnId)).toEqual(["turn-001", "turn-002", "turn-003", "turn-004"]);
    expect(continuity.artifacts.map((artifact) => artifact.artifactId)).toEqual([
      "artifact-stale",
      "artifact-summary",
      "artifact-policy",
    ]);
    expect(continuity.handoffs).toEqual([
      {
        handoffId: "handoff-1",
        conversationId: "conversation-main",
        fromEndpointId: "openai.personal.primary.us-east-1.fast",
        toEndpointId: "anthropic.team.shared.us-east-1.default",
        createdAtMs: 1700000003500,
      },
    ]);
  });

  test("persists retrieval receipts for later routing diagnostics", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-state-"));
    const initialized = initializeSqliteMemory({
      runtimeStateRoot,
      scopeId: "workspace-dev",
    });

    persistRetrievalReceipt({
      databasePath: initialized.databasePath,
      retrievalReceiptId: "conversation-main-retrieval-receipt",
      conversationId: "conversation-main",
      receiptSummary: JSON.stringify({
        selectedTurns: 2,
        selectedArtifacts: 1,
        estimatedTokens: 240,
      }),
    });

    expect(
      readRetrievalReceipts({
        databasePath: initialized.databasePath,
        conversationId: "conversation-main",
      }),
    ).toEqual([
      {
        retrievalReceiptId: "conversation-main-retrieval-receipt",
        conversationId: "conversation-main",
        receiptSummary: "{\"selectedTurns\":2,\"selectedArtifacts\":1,\"estimatedTokens\":240}",
      },
    ]);
  });

  test("persists runtime observation bundles, profile snapshots, and maintenance-policy reads", async () => {
    expect(
      typeof (
        sqliteMemory as {
          persistRuntimeObservationBundle?: unknown;
        }
      ).persistRuntimeObservationBundle,
    ).toBe("function");
    expect(
      typeof (
        sqliteMemory as {
          readRuntimeObservationBundle?: unknown;
        }
      ).readRuntimeObservationBundle,
    ).toBe("function");
    expect(
      typeof (
        sqliteMemory as {
          readObservedPerformanceSamples?: unknown;
        }
      ).readObservedPerformanceSamples,
    ).toBe("function");
    expect(
      typeof (
        sqliteMemory as {
          readLatestObservedProfile?: unknown;
        }
      ).readLatestObservedProfile,
    ).toBe("function");
    expect(
      typeof (
        sqliteMemory as {
          readRuntimeMaintenancePolicy?: unknown;
        }
      ).readRuntimeMaintenancePolicy,
    ).toBe("function");

    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-state-"));
    const validation = await runRuntimeAdapterValidation({
      repoRoot,
      runtimeStateRoot,
      scopeId: "workspace-dev",
    });
    const history = await readJson<{
      byEndpointId: Record<string, Parameters<typeof createRuntimeObservationBundle>[0]["priorSamples"]>;
    }>("testdata/router-runtime/observability-history.json");
    const policy = await readJson<Parameters<typeof createRuntimeObservationBundle>[0]["capturePolicy"]>(
      "testdata/router-runtime/observability-policy.json",
    );

    const bundle = createRuntimeObservationBundle({
      decision: validation.decision,
      routingDiagnostics: validation.routingDiagnostics,
      retrievalReceipt: validation.retrievalReceipt,
      contextEnvelope: validation.contextEnvelope,
      execution: validation.execution,
      priorSamples: history.byEndpointId[validation.decision.chosen_endpoint_id] ?? [],
      maintenancePolicy: {
        "redaction.level": "strict",
        "retention.class": "standard",
      },
      capturePolicy: policy,
    });

    (
      sqliteMemory as {
        persistRuntimeObservationBundle(input: {
          databasePath: string;
          observation: ReturnType<typeof createRuntimeObservationBundle>;
        }): void;
      }
    ).persistRuntimeObservationBundle({
      databasePath: validation.databasePath,
      observation: bundle,
    });

    expect(
      (
        sqliteMemory as {
          readRuntimeMaintenancePolicy(input: { databasePath: string }): Record<string, string>;
        }
      ).readRuntimeMaintenancePolicy({
        databasePath: validation.databasePath,
      }),
    ).toEqual({
      "backup.policy": "wal-copy-on-demand",
      "deletion.policy": "explicit-export-delete",
      "redaction.level": "strict",
      "retention.class": "standard",
    });
    expect(
      (
        sqliteMemory as {
          readRuntimeObservationBundle(input: {
            databasePath: string;
            requestId: string;
          }): ReturnType<typeof createRuntimeObservationBundle> | null;
        }
      ).readRuntimeObservationBundle({
        databasePath: validation.databasePath,
        requestId: validation.decision.request_id,
      }),
    ).toMatchObject({
      requestId: validation.decision.request_id,
      routingDecisionId: validation.decision.routing_decision_id,
      endpointId: validation.decision.chosen_endpoint_id,
    });
    expect(
      (
        sqliteMemory as {
          readObservedPerformanceSamples(input: {
            databasePath: string;
            endpointId: string;
          }): Array<{ request_id?: string; source_type: string }>;
        }
      ).readObservedPerformanceSamples({
        databasePath: validation.databasePath,
        endpointId: validation.decision.chosen_endpoint_id,
      }),
    ).toEqual([
      expect.objectContaining({
        request_id: validation.decision.request_id,
        source_type: "live_request",
      }),
    ]);
    expect(
      (
        sqliteMemory as {
          readLatestObservedProfile(input: {
            databasePath: string;
            endpointId: string;
          }): { endpoint_id: string; sample_size: number } | null;
        }
      ).readLatestObservedProfile({
        databasePath: validation.databasePath,
        endpointId: validation.decision.chosen_endpoint_id,
      }),
    ).toMatchObject({
      endpoint_id: validation.decision.chosen_endpoint_id,
      sample_size: 2,
    });
  });

  test("exports persisted runtime state for operator drills", async () => {
    expect(
      typeof (
        sqliteMemory as {
          exportRuntimeState?: unknown;
        }
      ).exportRuntimeState,
    ).toBe("function");

    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-state-"));
    const validation = await runRuntimeAdapterValidation({
      repoRoot,
      runtimeStateRoot,
      scopeId: "workspace-dev",
    });
    const history = await readJson<{
      byEndpointId: Record<string, Parameters<typeof createRuntimeObservationBundle>[0]["priorSamples"]>;
    }>("testdata/router-runtime/observability-history.json");
    const policy = await readJson<Parameters<typeof createRuntimeObservationBundle>[0]["capturePolicy"]>(
      "testdata/router-runtime/observability-policy.json",
    );
    const bundle = createRuntimeObservationBundle({
      decision: validation.decision,
      routingDiagnostics: validation.routingDiagnostics,
      retrievalReceipt: validation.retrievalReceipt,
      contextEnvelope: validation.contextEnvelope,
      execution: validation.execution,
      priorSamples: history.byEndpointId[validation.decision.chosen_endpoint_id] ?? [],
      maintenancePolicy: {
        "redaction.level": "strict",
        "retention.class": "standard",
      },
      capturePolicy: policy,
    });

    (
      sqliteMemory as {
        persistRuntimeObservationBundle(input: {
          databasePath: string;
          observation: ReturnType<typeof createRuntimeObservationBundle>;
        }): void;
      }
    ).persistRuntimeObservationBundle({
      databasePath: validation.databasePath,
      observation: bundle,
    });

    const exportPath = path.join(runtimeStateRoot, "runtime-export.json");
    const summary = (
      sqliteMemory as {
        exportRuntimeState(input: { databasePath: string; exportPath: string }): {
          exportPath: string;
          observationCount: number;
          profileCount: number;
        };
      }
    ).exportRuntimeState({
      databasePath: validation.databasePath,
      exportPath,
    });

    const exported = JSON.parse(await readFile(exportPath, "utf8")) as {
      maintenancePolicy: Record<string, string>;
      observations: Array<{ requestId: string; endpointId: string }>;
      observedProfiles: Array<{ endpointId: string }>;
    };

    expect(summary).toEqual({
      exportPath,
      observationCount: 1,
      profileCount: 1,
    });
    expect(exported.maintenancePolicy).toEqual({
      "backup.policy": "wal-copy-on-demand",
      "deletion.policy": "explicit-export-delete",
      "redaction.level": "strict",
      "retention.class": "standard",
    });
    expect(exported.observations).toEqual([
      {
        requestId: validation.decision.request_id,
        endpointId: validation.decision.chosen_endpoint_id,
      },
    ]);
    expect(exported.observedProfiles).toEqual([
      {
        endpointId: validation.decision.chosen_endpoint_id,
      },
    ]);
  });

  test("restores runtime state from a backup after scoped deletion", async () => {
    expect(
      typeof (
        sqliteMemory as {
          backupRuntimeState?: unknown;
        }
      ).backupRuntimeState,
    ).toBe("function");
    expect(
      typeof (
        sqliteMemory as {
          deleteRuntimeState?: unknown;
        }
      ).deleteRuntimeState,
    ).toBe("function");
    expect(
      typeof (
        sqliteMemory as {
          restoreRuntimeState?: unknown;
        }
      ).restoreRuntimeState,
    ).toBe("function");

    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-state-"));
    const validation = await runRuntimeAdapterValidation({
      repoRoot,
      runtimeStateRoot,
      scopeId: "workspace-dev",
    });
    const history = await readJson<{
      byEndpointId: Record<string, Parameters<typeof createRuntimeObservationBundle>[0]["priorSamples"]>;
    }>("testdata/router-runtime/observability-history.json");
    const policy = await readJson<Parameters<typeof createRuntimeObservationBundle>[0]["capturePolicy"]>(
      "testdata/router-runtime/observability-policy.json",
    );
    const bundle = createRuntimeObservationBundle({
      decision: validation.decision,
      routingDiagnostics: validation.routingDiagnostics,
      retrievalReceipt: validation.retrievalReceipt,
      contextEnvelope: validation.contextEnvelope,
      execution: validation.execution,
      priorSamples: history.byEndpointId[validation.decision.chosen_endpoint_id] ?? [],
      maintenancePolicy: {
        "redaction.level": "strict",
        "retention.class": "standard",
      },
      capturePolicy: policy,
    });

    (
      sqliteMemory as {
        persistRuntimeObservationBundle(input: {
          databasePath: string;
          observation: ReturnType<typeof createRuntimeObservationBundle>;
        }): void;
      }
    ).persistRuntimeObservationBundle({
      databasePath: validation.databasePath,
      observation: bundle,
    });

    const backupPath = path.join(runtimeStateRoot, "memory-backup.sqlite");
    (
      sqliteMemory as {
        backupRuntimeState(input: { databasePath: string; backupPath: string }): { backupPath: string };
      }
    ).backupRuntimeState({
      databasePath: validation.databasePath,
      backupPath,
    });

    (
      sqliteMemory as {
        deleteRuntimeState(input: { databasePath: string }): void;
      }
    ).deleteRuntimeState({
      databasePath: validation.databasePath,
    });
    await expect(readFile(validation.databasePath)).rejects.toThrow();

    (
      sqliteMemory as {
        restoreRuntimeState(input: { databasePath: string; backupPath: string }): void;
      }
    ).restoreRuntimeState({
      databasePath: validation.databasePath,
      backupPath,
    });

    expect(
      (
        sqliteMemory as {
          readRuntimeObservationBundle(input: {
            databasePath: string;
            requestId: string;
          }): ReturnType<typeof createRuntimeObservationBundle> | null;
        }
      ).readRuntimeObservationBundle({
        databasePath: validation.databasePath,
        requestId: validation.decision.request_id,
      }),
    ).toMatchObject({
      requestId: validation.decision.request_id,
      endpointId: validation.decision.chosen_endpoint_id,
    });
  });
});

describe("runRuntimeStateValidation", () => {
  test("validates provider accounts and initializes SQLite through the local validation path", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-state-"));

    const result = await runRuntimeStateValidation({
      repoRoot,
      runtimeStateRoot,
      scopeId: "workspace-dev",
    });

    expect(result.accountsValidated).toBe(2);
    expect(result.schemaVersion).toBe(1);
    expect(result.appliedMigrations).toEqual(["run06-v1-initial-schema"]);
    expect(result.databasePath).toContain(path.join("workspace-dev", "memory", "memory.sqlite"));
    expect(result.diagnostics).toEqual([]);
  });
});
