import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

import { validateProviderAccounts } from "@role-model-router/provider-account";
import { runRuntimeAdapterValidation } from "../../adapter-execution/src/cli.ts";
import { createRuntimeObservationBundle } from "../../runtime-observability/src/index.ts";

import { runRuntimeStateValidation } from "../src/cli.ts";
import * as sqliteMemory from "../src/index.ts";
import {
  clearAllObservedBenchmarkData,
  clearObservedBenchmarkDataForEndpoint,
  initializeSqliteMemory,
  listRuntimeTelemetryRecords,
  persistContinuitySnapshot,
  persistObservedBenchmarkSample,
  persistProviderAccounts,
  persistRetrievalReceipt,
  persistRuntimeObservationBundle,
  persistRuntimeTelemetryFailure,
  readConversationContinuity,
  readLatestObservedProfile,
  readObservedPerformanceSamples,
  readRetrievalReceipts,
  readRuntimeObservationBundle,
  readRuntimeTelemetrySummary,
  resolveSqliteMemoryLocation,
} from "../src/index.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");

async function readJson<T>(relativePath: string): Promise<T> {
  const filePath = path.join(repoRoot, relativePath);
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

function requireChildStdout(
  child: ReturnType<typeof spawn>,
): NonNullable<ReturnType<typeof spawn>["stdout"]> {
  if (!child.stdout) {
    throw new Error("Expected child process stdout to be piped.");
  }
  return child.stdout;
}

describe("initializeSqliteMemory", () => {
  test("creates the planned schema, WAL mode, and initial migration receipt under the runtime state root", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-state-"));

    const result = initializeSqliteMemory({
      runtimeStateRoot,
      scopeId: "workspace-dev",
    });

    expect(resolveSqliteMemoryLocation({ runtimeStateRoot, scopeId: "workspace-dev" })).toBe(
      result.databasePath,
    );
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
    expect(migrations).toEqual([
      { migration_id: "run06-v1-initial-schema" },
      { migration_id: "run62-observation-metadata-backfill-v1" },
      { migration_id: "run62-telemetry-metadata-backfill-v1" },
    ]);
  });

  test("persists validated provider accounts by credential reference without storing raw secrets", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-state-"));
    const catalog = await readJson(
      "role-model-router/packages/catalog/data/normalized-catalog.json",
    );
    const fixture = await readJson<{ accounts: unknown[] }>(
      "testdata/router-runtime/fixtures/provider-accounts.json",
    );
    const validated = validateProviderAccounts({
      catalog,
      additionalProviders: [
        {
          providerId: "openai",
          displayName: "OpenAI",
          providerKind: "provider-openai",
          authFamily: "api-key",
          adapterFamily: "ai-sdk-openai",
          apiBase: "https://api.openai.com/v1",
          envVars: ["OPENAI_API_KEY"],
          supportedAuthModes: [],
          controlPlaneRequirements: [],
          localOverrideApplied: true,
          upstreamProvenance: {
            vendor: "models.dev",
            commit: "test",
            capturedAt: "2026-05-01T00:00:00Z",
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
          controlPlaneRequirements: [],
          localOverrideApplied: true,
          upstreamProvenance: {
            vendor: "models.dev",
            commit: "test",
            capturedAt: "2026-05-01T00:00:00Z",
            schemaVersion: "models.dev.v1",
          },
        },
      ],
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
    const columns = database.prepare("PRAGMA table_info(provider_accounts)").all() as Array<{
      name: string;
    }>;

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
    expect(rows.every((row) => !/^sk-[A-Za-z0-9]/.test(row.credential_ref))).toBe(true);
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
        providerId: "moonshot",
        authMode: "api-key-static",
        baseUrlOverride: "https://api.moonshot.ai/v1",
        modelRoleBindings: [
          {
            modelId: "moonshot/kimi-k2.5",
            roleIds: ["general.chat", "coder.patch"],
          },
        ],
      }),
    ]);
  });

  test("persists runtime-managed endpoint activations for dynamic registry materialization", async () => {
    expect(typeof (sqliteMemory as { listRuntimeEndpoints?: unknown }).listRuntimeEndpoints).toBe(
      "function",
    );
    expect(typeof (sqliteMemory as { upsertRuntimeEndpoint?: unknown }).upsertRuntimeEndpoint).toBe(
      "function",
    );

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
        modelId: "moonshot/kimi-k2.5",
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
        modelId: "moonshot/kimi-k2.5",
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
          listProviderDeviceAuthSessions?: unknown;
        }
      ).listProviderDeviceAuthSessions,
    ).toBe("function");
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
        providerId: "moonshot",
        variantId: "kimi-code",
        credentialBackend: "local-encrypted-file",
        credentialRef: "oauth/moonshot/moonshot.personal.kimi-code",
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
          listProviderDeviceAuthSessions: (value: {
            databasePath: string;
          }) => Array<{
            authRequestId: string;
            providerAccountId: string;
            status: string;
          }>;
        }
      ).listProviderDeviceAuthSessions({
        databasePath: initialized.databasePath,
      }),
    ).toEqual([
      expect.objectContaining({
        authRequestId: "auth-001",
        providerAccountId: "moonshot.personal.kimi-code",
        status: "pending",
      }),
    ]);

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
      .prepare(
        "SELECT maintenance_key, maintenance_value FROM memory_maintenance ORDER BY maintenance_key",
      )
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

  test("does not repeat observation metadata JSON backfills after migration receipt", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-state-"));
    const initialized = initializeSqliteMemory({
      runtimeStateRoot,
      scopeId: "workspace-dev-backfill-receipt",
    });
    const observationBackfillMigrationId = "run62-observation-metadata-backfill-v1";
    const telemetryBackfillMigrationId = "run62-telemetry-metadata-backfill-v1";
    const observationJson = JSON.stringify({
      clientRequestId: "client-legacy-1",
      observedPerformance: {
        sample: {
          source_type: "live_request",
        },
      },
      executionSemantics: {
        sourceClient: "pi",
        executionFamily: "remote",
        adapterFamily: "codex-subscription-responses",
        payloadBytes: {
          ingress: 111,
          translated: 222,
          providerCanonical: 333,
          providerWire: 444,
          providerResponse: 555,
        },
        cooldownDecision: "none",
        idempotencyDecision: "new",
        toolSideEffectState: "none",
      },
      executionTelemetry: {
        vendorId: "chatgpt-codex-responses",
      },
      taxonomyDimensions: {},
    });

    const seedDatabase = new DatabaseSync(initialized.databasePath);
    seedDatabase
      .prepare(
        "INSERT INTO runtime_observations (request_id, routing_decision_id, endpoint_id, conversation_id, created_at_ms, observation_json) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .run(
        "req-legacy-backfill",
        "decision-legacy-backfill",
        "endpoint-legacy",
        "conversation-legacy",
        1_000,
        observationJson,
      );
    seedDatabase
      .prepare(
        `INSERT INTO runtime_telemetry_records (
          request_id,
          routing_decision_id,
          endpoint_id,
          conversation_id,
          created_at_ms,
          input_tokens,
          output_tokens,
          total_tokens,
          prompt_cache_requested,
          prompt_cache_used,
          cache_read_tokens,
          cache_write_tokens,
          tool_call_count,
          tool_execution_count,
          cost_provenance
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        "req-legacy-backfill",
        "decision-legacy-backfill",
        "endpoint-legacy",
        "conversation-legacy",
        1_000,
        1,
        2,
        3,
        0,
        0,
        0,
        0,
        0,
        0,
        "unavailable",
      );
    seedDatabase
      .prepare("DELETE FROM migration_receipts WHERE migration_id IN (?, ?)")
      .run(observationBackfillMigrationId, telemetryBackfillMigrationId);
    seedDatabase.close();

    initializeSqliteMemory({
      runtimeStateRoot,
      scopeId: "workspace-dev-backfill-receipt",
    });

    const firstBackfillDatabase = new DatabaseSync(initialized.databasePath);
    const receipts = firstBackfillDatabase
      .prepare(
        "SELECT migration_id FROM migration_receipts WHERE migration_id IN (?, ?) ORDER BY migration_id",
      )
      .all(observationBackfillMigrationId, telemetryBackfillMigrationId) as Array<{
      migration_id: string;
    }>;
    const observationAfterFirstBackfill = firstBackfillDatabase
      .prepare(
        "SELECT client_request_id, request_class, taxonomy_role_id, taxonomy_task_type FROM runtime_observations WHERE request_id = ?",
      )
      .get("req-legacy-backfill") as {
      client_request_id: string | null;
      request_class: string | null;
      taxonomy_role_id: string | null;
      taxonomy_task_type: string | null;
    };
    const telemetryAfterFirstBackfill = firstBackfillDatabase
      .prepare(
        "SELECT client_request_id, request_class, source_client, execution_family, adapter_family, vendor_id, request_payload_bytes, response_payload_bytes FROM runtime_telemetry_records WHERE request_id = ?",
      )
      .get("req-legacy-backfill") as {
      client_request_id: string | null;
      request_class: string | null;
      source_client: string | null;
      execution_family: string | null;
      adapter_family: string | null;
      vendor_id: string | null;
      request_payload_bytes: number | null;
      response_payload_bytes: number | null;
    };

    expect(receipts.map((row) => row.migration_id)).toEqual([
      observationBackfillMigrationId,
      telemetryBackfillMigrationId,
    ]);
    expect(observationAfterFirstBackfill).toEqual({
      client_request_id: null,
      request_class: null,
      taxonomy_role_id: null,
      taxonomy_task_type: null,
    });
    expect(telemetryAfterFirstBackfill).toEqual({
      client_request_id: null,
      request_class: null,
      source_client: null,
      execution_family: null,
      adapter_family: null,
      vendor_id: null,
      request_payload_bytes: null,
      response_payload_bytes: null,
    });
    firstBackfillDatabase.close();

    initializeSqliteMemory({
      runtimeStateRoot,
      scopeId: "workspace-dev-backfill-receipt",
    });

    const secondBackfillDatabase = new DatabaseSync(initialized.databasePath);
    const observationAfterSecondBackfill = secondBackfillDatabase
      .prepare(
        "SELECT client_request_id, request_class, taxonomy_role_id, taxonomy_task_type FROM runtime_observations WHERE request_id = ?",
      )
      .get("req-legacy-backfill");
    const telemetryAfterSecondBackfill = secondBackfillDatabase
      .prepare(
        "SELECT client_request_id, request_class, source_client, execution_family, adapter_family, vendor_id, request_payload_bytes, response_payload_bytes FROM runtime_telemetry_records WHERE request_id = ?",
      )
      .get("req-legacy-backfill");
    secondBackfillDatabase.close();

    expect(observationAfterSecondBackfill).toEqual({
      client_request_id: null,
      request_class: null,
      taxonomy_role_id: null,
      taxonomy_task_type: null,
    });
    expect(telemetryAfterSecondBackfill).toEqual({
      client_request_id: null,
      request_class: null,
      source_client: null,
      execution_family: null,
      adapter_family: null,
      vendor_id: null,
      request_payload_bytes: null,
      response_payload_bytes: null,
    });
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
    }>("testdata/router-runtime/fixtures/context-envelope.json");
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
    expect(continuity.turns.map((turn) => turn.turnId)).toEqual([
      "turn-001",
      "turn-002",
      "turn-003",
      "turn-004",
    ]);
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
        receiptSummary: '{"selectedTurns":2,"selectedArtifacts":1,"estimatedTokens":240}',
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
      fixtureRoot: path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
      runtimeStateRoot,
      scopeId: "workspace-dev",
    });
    const history = await readJson<{
      byEndpointId: Record<
        string,
        Parameters<typeof createRuntimeObservationBundle>[0]["priorSamples"]
      >;
    }>("testdata/router-runtime/fixtures/observability-history.json");
    const policy = await readJson<
      Parameters<typeof createRuntimeObservationBundle>[0]["capturePolicy"]
    >("testdata/router-runtime/fixtures/observability-policy.json");

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

  describe("listRecentRuntimeRequestIds", () => {
    test("returns latest request ids in recency order without parsing observation_json", async () => {
      expect(
        typeof (
          sqliteMemory as {
            listRecentRuntimeRequestIds?: unknown;
          }
        ).listRecentRuntimeRequestIds,
      ).toBe("function");

      const listRecentRuntimeRequestIds = (
        sqliteMemory as {
          listRecentRuntimeRequestIds?: unknown;
        }
      ).listRecentRuntimeRequestIds;
      if (typeof listRecentRuntimeRequestIds !== "function") {
        return;
      }

      const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-state-"));
      const initialized = initializeSqliteMemory({
        runtimeStateRoot,
        scopeId: "workspace-dev-latest-request-ids",
      });
      const database = new DatabaseSync(initialized.databasePath);
      const insertObservation = database.prepare(
        "INSERT INTO runtime_observations (request_id, routing_decision_id, endpoint_id, conversation_id, created_at_ms, observation_json) VALUES (?, ?, ?, ?, ?, ?)",
      );
      insertObservation.run(
        "req-001",
        "decision-001",
        "endpoint-001",
        "conversation-001",
        1000,
        "{",
      );
      insertObservation.run(
        "req-002",
        "decision-002",
        "endpoint-002",
        "conversation-002",
        2000,
        '{"clientRequestId":"client-002"}',
      );
      insertObservation.run(
        "req-003",
        "decision-003",
        "endpoint-003",
        "conversation-003",
        3000,
        "not-json",
      );
      database.close();

      expect(
        (
          listRecentRuntimeRequestIds as (input: {
            databasePath: string;
            limit?: number;
          }) => readonly string[]
        )({
          databasePath: initialized.databasePath,
          limit: 10,
        }),
      ).toEqual(["req-003", "req-002", "req-001"]);
    });

    test("enforces limit 10 for the lightweight latest-id query", async () => {
      expect(
        typeof (
          sqliteMemory as {
            listRecentRuntimeRequestIds?: unknown;
          }
        ).listRecentRuntimeRequestIds,
      ).toBe("function");

      const listRecentRuntimeRequestIds = (
        sqliteMemory as {
          listRecentRuntimeRequestIds?: unknown;
        }
      ).listRecentRuntimeRequestIds;
      if (typeof listRecentRuntimeRequestIds !== "function") {
        return;
      }

      const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-state-"));
      const initialized = initializeSqliteMemory({
        runtimeStateRoot,
        scopeId: "workspace-dev-latest-request-ids-limit",
      });
      const database = new DatabaseSync(initialized.databasePath);
      const insertObservation = database.prepare(
        "INSERT INTO runtime_observations (request_id, routing_decision_id, endpoint_id, conversation_id, created_at_ms, observation_json) VALUES (?, ?, ?, ?, ?, ?)",
      );
      for (let index = 1; index <= 12; index += 1) {
        insertObservation.run(
          `req-${index.toString().padStart(3, "0")}`,
          `decision-${index.toString().padStart(3, "0")}`,
          `endpoint-${index.toString().padStart(3, "0")}`,
          `conversation-${index.toString().padStart(3, "0")}`,
          index,
          "{",
        );
      }
      database.close();

      expect(
        (
          listRecentRuntimeRequestIds as (input: {
            databasePath: string;
            limit?: number;
          }) => readonly string[]
        )({
          databasePath: initialized.databasePath,
          limit: 10,
        }),
      ).toHaveLength(10);
    });

    test("returns an empty array when no runtime observations exist", async () => {
      expect(
        typeof (
          sqliteMemory as {
            listRecentRuntimeRequestIds?: unknown;
          }
        ).listRecentRuntimeRequestIds,
      ).toBe("function");

      const listRecentRuntimeRequestIds = (
        sqliteMemory as {
          listRecentRuntimeRequestIds?: unknown;
        }
      ).listRecentRuntimeRequestIds;
      if (typeof listRecentRuntimeRequestIds !== "function") {
        return;
      }

      const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-state-"));
      const initialized = initializeSqliteMemory({
        runtimeStateRoot,
        scopeId: "workspace-dev-latest-request-ids-empty",
      });

      expect(
        (
          listRecentRuntimeRequestIds as (input: {
            databasePath: string;
            limit?: number;
          }) => readonly string[]
        )({
          databasePath: initialized.databasePath,
          limit: 10,
        }),
      ).toEqual([]);
    });
  });

  test("stores and reads conversation-level difficulty classification cache entries", async () => {
    expect(
      typeof (
        sqliteMemory as {
          upsertDifficultyClassificationCache?: unknown;
        }
      ).upsertDifficultyClassificationCache,
    ).toBe("function");
    expect(
      typeof (
        sqliteMemory as {
          readDifficultyClassificationCache?: unknown;
        }
      ).readDifficultyClassificationCache,
    ).toBe("function");

    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-state-"));
    const initialized = initializeSqliteMemory({
      runtimeStateRoot,
      scopeId: "workspace-dev-difficulty-cache",
    });

    (
      sqliteMemory as {
        upsertDifficultyClassificationCache(input: {
          databasePath: string;
          cache: {
            conversationId: string;
            difficulty: "easy" | "medium" | "hard";
            fallbackApplied: boolean;
            fallbackReason?: string;
            cachedAtMs: number;
            expiresAtMs: number;
            rubricSignals: {
              contextTokens: number;
              toolCount: number;
              historyTurnCount: number;
              instructionConstraintCount: number;
              decompositionKeywordCount: number;
              codeOrSchemaBurden: boolean;
            };
          };
        }): void;
      }
    ).upsertDifficultyClassificationCache({
      databasePath: initialized.databasePath,
      cache: {
        conversationId: "conversation-cache-001",
        difficulty: "medium",
        fallbackApplied: false,
        cachedAtMs: 1000,
        expiresAtMs: 2000,
        rubricSignals: {
          contextTokens: 640,
          toolCount: 1,
          historyTurnCount: 2,
          instructionConstraintCount: 3,
          decompositionKeywordCount: 1,
          codeOrSchemaBurden: false,
        },
      },
    });

    expect(
      (
        sqliteMemory as {
          readDifficultyClassificationCache(input: {
            databasePath: string;
            conversationId: string;
          }): {
            conversationId: string;
            difficulty: "easy" | "medium" | "hard";
            fallbackApplied: boolean;
            fallbackReason?: string;
            cachedAtMs: number;
            expiresAtMs: number;
            rubricSignals: {
              contextTokens: number;
              toolCount: number;
              historyTurnCount: number;
              instructionConstraintCount: number;
              decompositionKeywordCount: number;
              codeOrSchemaBurden: boolean;
            };
          } | null;
        }
      ).readDifficultyClassificationCache({
        databasePath: initialized.databasePath,
        conversationId: "conversation-cache-001",
      }),
    ).toEqual({
      conversationId: "conversation-cache-001",
      difficulty: "medium",
      fallbackApplied: false,
      cachedAtMs: 1000,
      expiresAtMs: 2000,
      rubricSignals: {
        contextTokens: 640,
        toolCount: 1,
        historyTurnCount: 2,
        instructionConstraintCount: 3,
        decompositionKeywordCount: 1,
        codeOrSchemaBurden: false,
      },
    });
  });

  test("persists and reads segmented observed samples and profiles by difficulty bucket", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-state-"));
    const validation = await runRuntimeAdapterValidation({
      repoRoot,
      fixtureRoot: path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
      runtimeStateRoot,
      scopeId: "workspace-dev-difficulty-profiles",
    });
    const policy = await readJson<
      Parameters<typeof createRuntimeObservationBundle>[0]["capturePolicy"]
    >("testdata/router-runtime/fixtures/observability-policy.json");

    const bundle = createRuntimeObservationBundle({
      decision: validation.decision,
      routingDiagnostics: {
        ...validation.routingDiagnostics,
        difficultyRouting: {
          difficulty: "hard",
          strategy: "quality",
          fallbackApplied: false,
          rubricSignals: {
            contextTokens: 2048,
            toolCount: 2,
            historyTurnCount: 3,
            instructionConstraintCount: 4,
            decompositionKeywordCount: 2,
            codeOrSchemaBurden: true,
          },
        },
      },
      retrievalReceipt: validation.retrievalReceipt,
      contextEnvelope: validation.contextEnvelope,
      execution: validation.execution,
      priorSamples: [],
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
          readObservedPerformanceSamples(input: {
            databasePath: string;
            endpointId: string;
            difficultyBucket?: "easy" | "medium" | "hard";
          }): Array<{ request_id?: string; source_type: string; difficulty_bucket?: string }>;
        }
      ).readObservedPerformanceSamples({
        databasePath: validation.databasePath,
        endpointId: validation.decision.chosen_endpoint_id,
        difficultyBucket: "hard",
      }),
    ).toEqual([
      expect.objectContaining({
        request_id: validation.decision.request_id,
        source_type: "live_request",
        difficulty_bucket: "hard",
      }),
    ]);
    expect(
      (
        sqliteMemory as {
          readLatestObservedProfile(input: {
            databasePath: string;
            endpointId: string;
            difficultyBucket?: "easy" | "medium" | "hard";
          }): { endpoint_id: string; sample_size: number } | null;
        }
      ).readLatestObservedProfile({
        databasePath: validation.databasePath,
        endpointId: validation.decision.chosen_endpoint_id,
        difficultyBucket: "hard",
      }),
    ).toMatchObject({
      endpoint_id: validation.decision.chosen_endpoint_id,
      sample_size: 1,
    });
  });

  test("derives an advisory max-difficulty recommendation from bucketed observed profiles", async () => {
    expect(
      typeof (
        sqliteMemory as {
          readAdvisoryMaxDifficultyRecommendation?: unknown;
        }
      ).readAdvisoryMaxDifficultyRecommendation,
    ).toBe("function");

    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-state-"));
    const initialized = initializeSqliteMemory({
      runtimeStateRoot,
      scopeId: "workspace-dev-advisory-difficulty",
    });
    const database = new DatabaseSync(initialized.databasePath);
    const endpointId = "openai.personal.primary.us-east-1.fast";
    const baseProfile = {
      endpoint_id: endpointId,
      endpoint_version: "run27-test-v1",
      measurement_window: {
        started_at_ms: 1_000,
        ended_at_ms: 2_000,
      },
      freshness_score: 0.98,
      confidence_score: 0.96,
      latency_ms_p50: 420,
      latency_ms_p95: 700,
      sources: {
        live_request_samples: 4,
        benchmark_samples: 0,
      },
      currency: "USD",
    };

    const insertProfile = database.prepare(
      "INSERT INTO observed_profile_snapshots_by_difficulty (snapshot_id, endpoint_id, difficulty_bucket, measured_at_ms, profile_json) VALUES (?, ?, ?, ?, ?)",
    );
    insertProfile.run(
      "snapshot-easy",
      endpointId,
      "easy",
      10_000,
      JSON.stringify({
        ...baseProfile,
        measured_at_ms: 10_000,
        sample_size: 5,
        failure_rate: 0.02,
        quality_score: 0.96,
        tokens_per_sec: 36,
        cost_per_1k_tokens_est: 0.8,
      }),
    );
    insertProfile.run(
      "snapshot-medium",
      endpointId,
      "medium",
      11_000,
      JSON.stringify({
        ...baseProfile,
        measured_at_ms: 11_000,
        sample_size: 4,
        failure_rate: 0.12,
        quality_score: 0.84,
        tokens_per_sec: 25,
        cost_per_1k_tokens_est: 1.1,
      }),
    );
    insertProfile.run(
      "snapshot-hard",
      endpointId,
      "hard",
      12_000,
      JSON.stringify({
        ...baseProfile,
        measured_at_ms: 12_000,
        sample_size: 4,
        failure_rate: 0.29,
        quality_score: 0.82,
        tokens_per_sec: 29,
        cost_per_1k_tokens_est: 1.7,
      }),
    );
    database.close();

    expect(
      (
        sqliteMemory as {
          readAdvisoryMaxDifficultyRecommendation(input: {
            databasePath: string;
            endpointId: string;
            thresholds: {
              minSamples: number;
              maxFailureRate: number;
              minQualityScore: number;
              minTokensPerSec: number;
            };
          }): {
            recommendedMaxDifficulty: "easy" | "medium" | "hard" | null;
            evaluations: Record<
              "easy" | "medium" | "hard",
              {
                eligible: boolean;
                rejectionReasons: readonly string[];
                profile: { sample_size: number; failure_rate: number } | null;
              }
            >;
          };
        }
      ).readAdvisoryMaxDifficultyRecommendation({
        databasePath: initialized.databasePath,
        endpointId,
        thresholds: {
          minSamples: 4,
          maxFailureRate: 0.2,
          minQualityScore: 0.8,
          minTokensPerSec: 22,
        },
      }),
    ).toEqual({
      recommendedMaxDifficulty: "medium",
      thresholds: {
        minSamples: 4,
        maxFailureRate: 0.2,
        minQualityScore: 0.8,
        minTokensPerSec: 22,
      },
      evaluations: {
        easy: {
          eligible: true,
          rejectionReasons: [],
          profile: expect.objectContaining({
            sample_size: 5,
            failure_rate: 0.02,
          }),
        },
        medium: {
          eligible: true,
          rejectionReasons: [],
          profile: expect.objectContaining({
            sample_size: 4,
            failure_rate: 0.12,
          }),
        },
        hard: {
          eligible: false,
          rejectionReasons: ["max-failure-rate"],
          profile: expect.objectContaining({
            sample_size: 4,
            failure_rate: 0.29,
          }),
        },
      },
    });
  });

  test("reads the latest observed profiles for a set of endpoint ids", async () => {
    expect(
      typeof (
        sqliteMemory as {
          readLatestObservedProfilesByEndpointIds?: unknown;
        }
      ).readLatestObservedProfilesByEndpointIds,
    ).toBe("function");

    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-state-"));
    const validation = await runRuntimeAdapterValidation({
      repoRoot,
      fixtureRoot: path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
      runtimeStateRoot,
      scopeId: "workspace-dev-latest-profiles",
    });
    const history = await readJson<{
      byEndpointId: Record<
        string,
        Parameters<typeof createRuntimeObservationBundle>[0]["priorSamples"]
      >;
    }>("testdata/router-runtime/fixtures/observability-history.json");
    const policy = await readJson<
      Parameters<typeof createRuntimeObservationBundle>[0]["capturePolicy"]
    >("testdata/router-runtime/fixtures/observability-policy.json");

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
          readLatestObservedProfilesByEndpointIds(input: {
            databasePath: string;
            endpointIds: readonly string[];
          }): Record<string, { endpoint_id: string }>;
        }
      ).readLatestObservedProfilesByEndpointIds({
        databasePath: validation.databasePath,
        endpointIds: [validation.decision.chosen_endpoint_id, "missing-endpoint"],
      }),
    ).toEqual({
      [validation.decision.chosen_endpoint_id]: expect.objectContaining({
        endpoint_id: validation.decision.chosen_endpoint_id,
      }),
    });
  });

  test("flattens persisted runtime observations into canonical telemetry summary, comparison, and request rows", async () => {
    expect(
      typeof (
        sqliteMemory as {
          readRuntimeTelemetrySummary?: unknown;
        }
      ).readRuntimeTelemetrySummary,
    ).toBe("function");
    expect(
      typeof (
        sqliteMemory as {
          listRuntimeTelemetryComparisonRows?: unknown;
        }
      ).listRuntimeTelemetryComparisonRows,
    ).toBe("function");
    expect(
      typeof (
        sqliteMemory as {
          listRuntimeTelemetryRecords?: unknown;
        }
      ).listRuntimeTelemetryRecords,
    ).toBe("function");

    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-state-"));
    const validation = await runRuntimeAdapterValidation({
      repoRoot,
      fixtureRoot: path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
      runtimeStateRoot,
      scopeId: "workspace-dev",
    });
    const history = await readJson<{
      byEndpointId: Record<
        string,
        Parameters<typeof createRuntimeObservationBundle>[0]["priorSamples"]
      >;
    }>("testdata/router-runtime/fixtures/observability-history.json");
    const policy = await readJson<
      Parameters<typeof createRuntimeObservationBundle>[0]["capturePolicy"]
    >("testdata/router-runtime/fixtures/observability-policy.json");

    const baseBundle = createRuntimeObservationBundle({
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

    const remoteTimestampMs = Date.now() - 1_000;
    const localTimestampMs = Date.now();

    const remoteBundle = {
      ...baseBundle,
      requestId: "req-telemetry-remote-001",
      routingDecisionId: "decision-telemetry-remote-001",
      endpointId: "openai.personal.primary.us-east-1.fast",
      routingDiagnostics: {
        ...baseBundle.routingDiagnostics,
        routingMode: {
          source: "alias-default",
          aliasMode: "hybrid",
          effectiveMode: "hybrid",
        },
        difficultyRouting: {
          difficulty: "easy",
          strategy: "cost",
          fallbackApplied: false,
          rubricSignals: {
            contextTokens: 32,
            toolCount: 0,
            historyTurnCount: 1,
            instructionConstraintCount: 0,
            decompositionKeywordCount: 0,
            codeOrSchemaBurden: false,
          },
        },
        controllerRouting: {
          active: true,
          acceptedDirectives: {
            requestedRoleId: "coder.patch",
            strategy: "quality",
            preferLocal: true,
          },
        },
        hybridArbitration: {
          active: true,
          difficultyStrategy: "cost",
          finalStrategy: "quality",
          controllerChangedPlan: true,
          dominantSignal: "controller",
        },
        rolePolicy: {
          requestedRoleId: "coder.patch",
          appliedRoleId: "coder.patch",
          defaultSystemInstructionsApplied: true,
          toolPolicyMode: "limited",
          allowedTools: ["run_tests"],
          outputContracts: ["review.checklist"],
          safetyPolicyRefs: ["safety.review"],
        },
      },
      usageEvent: {
        ...baseBundle.usageEvent,
        request_id: "req-telemetry-remote-001",
        routing_decision_id: "decision-telemetry-remote-001",
        endpoint_id: "openai.personal.primary.us-east-1.fast",
        model_id: "openai/gpt-4.1-mini-fast",
        provider_kind: "remote_openai_compat",
        tokens_in: 120,
        tokens_in_source: "normalized",
        tokens_in_available: true,
        tokens_out: 48,
        tokens_out_source: "normalized",
        tokens_out_available: true,
        latency_ms: 840,
        cost_actual: 0.0042,
        cost_estimate: 0.0042,
        currency: "USD",
        error_class: undefined,
        timestamp_ms: remoteTimestampMs,
      },
      observedPerformance: {
        ...baseBundle.observedPerformance,
        sample: {
          ...baseBundle.observedPerformance.sample,
          request_id: "req-telemetry-remote-001",
          routing_decision_id: "decision-telemetry-remote-001",
          endpoint_id: "openai.personal.primary.us-east-1.fast",
          timestamp_ms: remoteTimestampMs,
          latency_ms: 840,
          latency_ms_p95: 840,
          failure: false,
          error_class: undefined,
        },
        profile: {
          ...baseBundle.observedPerformance.profile,
          endpoint_id: "openai.personal.primary.us-east-1.fast",
          measured_at_ms: remoteTimestampMs,
        },
      },
      cacheObservability: {
        promptCacheRequested: true,
        promptCacheRequestSource: "explicit",
        promptCacheUsed: true,
        cacheReadTokens: 16,
        cacheWriteTokens: 8,
        routingCacheAffinity: true,
      },
      executionTelemetry: {
        providerFamily: "ai-sdk-openai",
        finishReason: "stop",
        stream: {
          requested: true,
          textDeltas: 4,
          toolCallDeltas: 1,
          toolArgumentDeltas: 2,
        },
        streamSupport: {
          text: "delta",
          toolCalls: "delta",
          toolArguments: "delta",
        },
        promptCaching: {
          supported: true,
          mode: "explicit",
        },
        usageSupport: {
          inputTokens: true,
          outputTokens: true,
          cacheReadTokens: true,
          cacheWriteTokens: true,
        },
        costProvenance: "actual",
      },
      tooling: {
        ...baseBundle.tooling,
        toolCalls: [
          {
            toolCallId: "tool-call-1",
            toolName: "lookupRegistry",
            arguments: {
              endpointId: "openai.personal.primary.us-east-1.fast",
            },
          },
        ],
        executions: [],
      },
      telemetrySnapshot: {
        providerId: "openai",
        providerAccountId: "openai.personal",
        sourceType: "remote",
        endpointKind: "remote_api",
        servingSource: "remote-service",
        region: "us-east-1",
        lifecycleStateAtRequest: "active",
        healthStatusAtRequest: "healthy",
        requestedModelId: "mixed.local-remote",
        requestOperation: "chat",
        roleIds: ["coder.patch", "general.chat"],
        toolingUsed: true,
        cacheState: "hit",
        eligibleEndpointIds: [
          "openai.personal.primary.us-east-1.fast",
          "llama-swap.local.local-mock-llama",
        ],
        eligibleModelIds: ["openai/gpt-4.1-mini-fast", "local/mock-llama"],
        candidateCostSnapshot: {
          "openai.personal.primary.us-east-1.fast": {
            modelId: "openai/gpt-4.1-mini-fast",
            providerId: "openai",
            sourceType: "remote",
            estimatedRequestUsd: 0.0062,
          },
          "llama-swap.local.local-mock-llama": {
            modelId: "local/mock-llama",
            providerId: "llama-swap",
            sourceType: "local",
            estimatedRequestUsd: 0.0116,
          },
        },
        selectedPricingSnapshot: {
          modelId: "openai/gpt-4.1-mini-fast",
          providerId: "openai",
          sourceType: "remote",
          estimatedRequestUsd: 0.0062,
        },
        selectedUncachedCostUsd: 0.0062,
        baselineMaxEligibleCostUsd: 0.0116,
        routingCostSavingsUsd: 0.0054,
        cacheCostSavingsUsd: 0.002,
        totalAvoidedCostUsd: 0.0074,
        costBaselineSource: "eligible_candidate_max",
        costSavingsSupport: "full",
        dimensions: {
          requestedModelFamily: "mixed.local-remote",
          chartSourceLabel: "Remote",
        },
      },
      inspection: {
        ...baseBundle.inspection,
        request: {
          ...baseBundle.inspection.request,
          requestId: "req-telemetry-remote-001",
          routingDecisionId: "decision-telemetry-remote-001",
          responseCapture: {
            ...baseBundle.inspection.request.responseCapture,
            statusCode: 200,
          },
        },
        endpoint: {
          ...baseBundle.inspection.endpoint,
          endpointId: "openai.personal.primary.us-east-1.fast",
          latestProfile: {
            ...baseBundle.inspection.endpoint.latestProfile,
            endpoint_id: "openai.personal.primary.us-east-1.fast",
            measured_at_ms: remoteTimestampMs,
          },
        },
      },
    } as ReturnType<typeof createRuntimeObservationBundle>;

    const localBundle = {
      ...baseBundle,
      requestId: "req-telemetry-local-001",
      routingDecisionId: "decision-telemetry-local-001",
      endpointId: "llama-swap.local.local-mock-llama",
      usageEvent: {
        ...baseBundle.usageEvent,
        request_id: "req-telemetry-local-001",
        routing_decision_id: "decision-telemetry-local-001",
        endpoint_id: "llama-swap.local.local-mock-llama",
        model_id: "local/mock-llama",
        provider_kind: "local_openai_compat",
        tokens_in: 32,
        tokens_out: 0,
        latency_ms: 1200,
        cost_actual: undefined,
        cost_estimate: 0.0011,
        currency: "USD",
        error_class: "upstream_timeout",
        timestamp_ms: localTimestampMs,
      },
      observedPerformance: {
        ...baseBundle.observedPerformance,
        sample: {
          ...baseBundle.observedPerformance.sample,
          request_id: "req-telemetry-local-001",
          routing_decision_id: "decision-telemetry-local-001",
          endpoint_id: "llama-swap.local.local-mock-llama",
          timestamp_ms: localTimestampMs,
          latency_ms: 1200,
          latency_ms_p95: 1200,
          failure: true,
          error_class: "upstream_timeout",
        },
        profile: {
          ...baseBundle.observedPerformance.profile,
          endpoint_id: "llama-swap.local.local-mock-llama",
          measured_at_ms: localTimestampMs,
        },
      },
      cacheObservability: {
        promptCacheRequested: false,
        promptCacheUsed: false,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        routingCacheAffinity: false,
      },
      executionTelemetry: {
        providerFamily: "llama-swap",
        finishReason: "error",
        stream: {
          requested: true,
          textDeltas: 2,
          toolCallDeltas: 0,
          toolArgumentDeltas: 0,
        },
        streamSupport: {
          text: "delta",
          toolCalls: "unsupported",
          toolArguments: "unsupported",
        },
        promptCaching: {
          supported: false,
          mode: "unsupported",
        },
        usageSupport: {
          inputTokens: true,
          outputTokens: true,
          cacheReadTokens: false,
          cacheWriteTokens: false,
        },
        costProvenance: "estimated",
      },
      tooling: {
        ...baseBundle.tooling,
        toolCalls: [],
        executions: [],
      },
      telemetrySnapshot: {
        providerId: "llama-swap",
        providerAccountId: null,
        sourceType: "local",
        endpointKind: "local_engine",
        servingSource: "local-process",
        region: "local",
        lifecycleStateAtRequest: "active",
        healthStatusAtRequest: "healthy",
        requestedModelId: "local/mock-llama",
        requestOperation: "chat",
        roleIds: ["general.chat"],
        toolingUsed: false,
        cacheState: "unsupported",
        eligibleEndpointIds: ["llama-swap.local.local-mock-llama"],
        eligibleModelIds: ["local/mock-llama"],
        candidateCostSnapshot: {
          "llama-swap.local.local-mock-llama": {
            modelId: "local/mock-llama",
            providerId: "llama-swap",
            sourceType: "local",
            estimatedRequestUsd: 0.0011,
          },
        },
        selectedPricingSnapshot: {
          modelId: "local/mock-llama",
          providerId: "llama-swap",
          sourceType: "local",
          estimatedRequestUsd: 0.0011,
        },
        selectedUncachedCostUsd: 0.0011,
        baselineMaxEligibleCostUsd: 0.0011,
        routingCostSavingsUsd: 0,
        cacheCostSavingsUsd: 0,
        totalAvoidedCostUsd: 0,
        costBaselineSource: "selected_only",
        costSavingsSupport: "partial",
        dimensions: {
          requestedModelFamily: "local/mock-llama",
          chartSourceLabel: "Local",
        },
      },
      inspection: {
        ...baseBundle.inspection,
        request: {
          ...baseBundle.inspection.request,
          requestId: "req-telemetry-local-001",
          routingDecisionId: "decision-telemetry-local-001",
          responseCapture: {
            ...baseBundle.inspection.request.responseCapture,
            statusCode: 504,
          },
        },
        endpoint: {
          ...baseBundle.inspection.endpoint,
          endpointId: "llama-swap.local.local-mock-llama",
          latestProfile: {
            ...baseBundle.inspection.endpoint.latestProfile,
            endpoint_id: "llama-swap.local.local-mock-llama",
            measured_at_ms: localTimestampMs,
          },
        },
      },
    } as ReturnType<typeof createRuntimeObservationBundle>;

    (
      sqliteMemory as {
        persistRuntimeObservationBundle(input: {
          databasePath: string;
          observation: ReturnType<typeof createRuntimeObservationBundle>;
        }): void;
      }
    ).persistRuntimeObservationBundle({
      databasePath: validation.databasePath,
      observation: remoteBundle,
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
      observation: localBundle,
    });

    expect(
      (
        sqliteMemory as {
          readRuntimeTelemetrySummary(input: {
            databasePath: string;
            windowMs?: number;
          }): Record<string, number | null>;
        }
      ).readRuntimeTelemetrySummary({
        databasePath: validation.databasePath,
        windowMs: 60_000,
      }),
    ).toEqual(
      expect.objectContaining({
        requestCount: 2,
        successCount: 1,
        failureCount: 1,
        totalInputTokens: 152,
        totalOutputTokens: 48,
        totalTokens: 200,
        cachedRequestCount: 1,
        totalActualCostUsd: 0.0042,
        totalEstimatedCostUsd: 0.0053,
        totalEffectiveCostUsd: 0.0053,
        averageLatencyMs: 1020,
        p95LatencyMs: 1200,
        lastSeenAtMs: localTimestampMs,
      }),
    );
    expect(
      (
        sqliteMemory as {
          listRuntimeTelemetryComparisonRows(input: {
            databasePath: string;
            windowMs?: number;
            limit?: number;
          }): Array<Record<string, number | string | null>>;
        }
      ).listRuntimeTelemetryComparisonRows({
        databasePath: validation.databasePath,
        windowMs: 60_000,
        limit: 10,
      }),
    ).toEqual([
      expect.objectContaining({
        endpointId: "llama-swap.local.local-mock-llama",
        modelId: "local/mock-llama",
        providerKind: "local_openai_compat",
        providerFamily: "llama-swap",
        promptCacheSupported: false,
        requestCount: 1,
        successCount: 0,
        failureCount: 1,
        averageLatencyMs: 1200,
        p95LatencyMs: 1200,
        totalTokens: 32,
        cachedRequestCount: 0,
        lastSeenAtMs: localTimestampMs,
      }),
      expect.objectContaining({
        endpointId: "openai.personal.primary.us-east-1.fast",
        modelId: "openai/gpt-4.1-mini-fast",
        providerKind: "remote_openai_compat",
        providerFamily: "ai-sdk-openai",
        promptCacheSupported: true,
        requestCount: 1,
        successCount: 1,
        failureCount: 0,
        averageLatencyMs: 840,
        p95LatencyMs: 840,
        totalTokens: 168,
        cachedRequestCount: 1,
        lastSeenAtMs: remoteTimestampMs,
      }),
    ]);
    expect(
      (
        sqliteMemory as {
          listRuntimeTelemetryRecords(input: {
            databasePath: string;
            windowMs?: number;
            limit?: number;
          }): Array<Record<string, number | string | boolean | null>>;
        }
      ).listRuntimeTelemetryRecords({
        databasePath: validation.databasePath,
        windowMs: 60_000,
        limit: 10,
      }),
    ).toEqual([
      expect.objectContaining({
        requestId: "req-telemetry-local-001",
        endpointId: "llama-swap.local.local-mock-llama",
        modelId: "local/mock-llama",
        providerKind: "local_openai_compat",
        sourceType: "local",
        endpointKind: "local_engine",
        servingSource: "local-process",
        requestedModelId: "local/mock-llama",
        requestOperation: "chat",
        statusFamily: "failure",
        toolingUsed: false,
        cacheState: "unsupported",
        selectedUncachedCostUsd: 0.0011,
        baselineMaxEligibleCostUsd: 0.0011,
        routingCostSavingsUsd: 0,
        cacheCostSavingsUsd: 0,
        totalAvoidedCostUsd: 0,
        latencyMs: 1200,
        inputTokens: 32,
        outputTokens: 0,
        totalTokens: 32,
        errorClass: "upstream_timeout",
        statusCode: 504,
        promptCacheRequested: false,
        promptCacheUsed: false,
        promptCacheSupported: false,
        providerFamily: "llama-swap",
        finishReason: "error",
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        cacheReadTokensSupported: false,
        cacheWriteTokensSupported: false,
        streamTextDeltaCount: 2,
        streamTextSupported: true,
        streamToolCallDeltaCount: 0,
        streamToolCallSupported: false,
        streamToolArgumentDeltaCount: 0,
        streamToolArgumentSupported: false,
        toolCallCount: 0,
        costProvenance: "estimated",
        actualCostUsd: null,
        estimatedCostUsd: 0.0011,
      }),
      expect.objectContaining({
        requestId: "req-telemetry-remote-001",
        endpointId: "openai.personal.primary.us-east-1.fast",
        modelId: "openai/gpt-4.1-mini-fast",
        providerKind: "remote_openai_compat",
        sourceType: "remote",
        endpointKind: "remote_api",
        servingSource: "remote-service",
        requestedModelId: "mixed.local-remote",
        requestOperation: "chat",
        statusFamily: "success",
        toolingUsed: true,
        cacheState: "hit",
        latencyMs: 840,
        inputTokens: 120,
        inputTokensSource: "normalized",
        inputTokensAvailable: true,
        outputTokens: 48,
        outputTokensSource: "normalized",
        outputTokensAvailable: true,
        totalTokens: 168,
        errorClass: null,
        statusCode: 200,
        promptCacheRequested: true,
        promptCacheRequestSource: "explicit",
        promptCacheUsed: true,
        promptCacheSupported: true,
        providerFamily: "ai-sdk-openai",
        finishReason: "stop",
        cacheReadTokens: 16,
        cacheWriteTokens: 8,
        cacheReadTokensSupported: true,
        cacheWriteTokensSupported: true,
        streamTextDeltaCount: 4,
        streamTextSupported: true,
        streamToolCallDeltaCount: 1,
        streamToolCallSupported: true,
        streamToolArgumentDeltaCount: 2,
        streamToolArgumentSupported: true,
        toolCallCount: 1,
        costProvenance: "actual",
        actualCostUsd: 0.0042,
        estimatedCostUsd: 0.0042,
        effectiveCostUsd: 0.0042,
        costCalculationBasis: "actual_vendor_cost",
        costCalculationVersion: "run49.v1",
        difficultyBucket: "easy",
        routingMode: "hybrid",
        requestedRoleId: "coder.patch",
        selectedStrategy: "quality",
        providerId: "openai",
        providerAccountId: "openai.personal",
        healthStatusAtRequest: "healthy",
        selectedUncachedCostUsd: 0.0062,
        baselineMaxEligibleCostUsd: 0.0116,
        routingCostSavingsUsd: 0.0054,
        cacheCostSavingsUsd: 0.002,
        totalAvoidedCostUsd: 0.0074,
        costBaselineSource: "eligible_candidate_max",
        costSavingsSupport: "full",
      }),
    ]);

    const controllerFallbackTimestampMs = Date.now();
    const controllerFallbackBundle = {
      ...baseBundle,
      requestId: "req-telemetry-controller-fallback-001",
      routingDecisionId: "decision-telemetry-controller-fallback-001",
      endpointId: "openai.personal.primary.us-east-1.fast",
      routingDiagnostics: {
        ...baseBundle.routingDiagnostics,
        routingMode: {
          source: "runtime-config",
          effectiveMode: "controller",
        },
        controllerRouting: {
          active: true,
        },
      },
      usageEvent: {
        ...baseBundle.usageEvent,
        request_id: "req-telemetry-controller-fallback-001",
        routing_decision_id: "decision-telemetry-controller-fallback-001",
        endpoint_id: "openai.personal.primary.us-east-1.fast",
        model_id: "openai/gpt-4.1-mini-fast",
        provider_kind: "remote_openai_compat",
        tokens_in: 20,
        tokens_out: 5,
        latency_ms: 320,
        timestamp_ms: controllerFallbackTimestampMs,
      },
      observedPerformance: {
        ...baseBundle.observedPerformance,
        sample: {
          ...baseBundle.observedPerformance.sample,
          request_id: "req-telemetry-controller-fallback-001",
          routing_decision_id: "decision-telemetry-controller-fallback-001",
          endpoint_id: "openai.personal.primary.us-east-1.fast",
          timestamp_ms: controllerFallbackTimestampMs,
          latency_ms: 320,
          latency_ms_p95: 320,
        },
      },
    } as ReturnType<typeof createRuntimeObservationBundle>;

    (
      sqliteMemory as {
        persistRuntimeObservationBundle(input: {
          databasePath: string;
          observation: ReturnType<typeof createRuntimeObservationBundle>;
        }): void;
      }
    ).persistRuntimeObservationBundle({
      databasePath: validation.databasePath,
      observation: controllerFallbackBundle,
    });

    expect(
      (
        sqliteMemory as {
          listRuntimeTelemetryRecords(input: {
            databasePath: string;
            windowMs?: number;
            limit?: number;
          }): Array<Record<string, number | string | boolean | null>>;
        }
      )
        .listRuntimeTelemetryRecords({
          databasePath: validation.databasePath,
          windowMs: 60_000,
          limit: 10,
        })
        .find((record) => record.requestId === "req-telemetry-controller-fallback-001"),
    ).toEqual(
      expect.objectContaining({
        routingMode: "controller",
        selectedStrategy: "balanced",
      }),
    );
  });

  test("persistRuntimeTelemetryFailure records latencyMs in telemetry summary average", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-state-"));
    const validation = await runRuntimeAdapterValidation({
      repoRoot,
      fixtureRoot: path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
      runtimeStateRoot,
      scopeId: "workspace-dev",
    });

    persistRuntimeTelemetryFailure({
      databasePath: validation.databasePath,
      requestId: "req-failure-latency-850",
      modelId: "local/mock-llama",
      statusCode: 504,
      errorClass: "execution_failed",
      latencyMs: 850,
    });

    expect(
      readRuntimeTelemetrySummary({
        databasePath: validation.databasePath,
        windowMs: 60_000,
      }),
    ).toEqual(
      expect.objectContaining({
        requestCount: 1,
        failureCount: 1,
        averageLatencyMs: 850,
      }),
    );
  });

  test("keeps positive legacy token counts available when provenance metadata is absent", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-state-"));
    const validation = await runRuntimeAdapterValidation({
      repoRoot,
      fixtureRoot: path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
      runtimeStateRoot,
      scopeId: "workspace-dev-legacy-token-truth",
    });
    const history = await readJson<{
      byEndpointId: Record<
        string,
        Parameters<typeof createRuntimeObservationBundle>[0]["priorSamples"]
      >;
    }>("testdata/router-runtime/fixtures/observability-history.json");
    const policy = await readJson<
      Parameters<typeof createRuntimeObservationBundle>[0]["capturePolicy"]
    >("testdata/router-runtime/fixtures/observability-policy.json");
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
    const {
      tokens_in_source: _inputSource,
      tokens_in_available: _inputAvailable,
      tokens_out_source: _outputSource,
      tokens_out_available: _outputAvailable,
      ...legacyUsageEvent
    } = bundle.usageEvent;

    persistRuntimeObservationBundle({
      databasePath: validation.databasePath,
      observation: {
        ...bundle,
        usageEvent: {
          ...legacyUsageEvent,
          tokens_in: 120,
          tokens_out: 48,
        },
      },
    });

    expect(
      listRuntimeTelemetryRecords({
        databasePath: validation.databasePath,
        windowMs: 60_000,
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requestId: bundle.requestId,
          inputTokens: 120,
          inputTokensSource: "unavailable",
          inputTokensAvailable: true,
          outputTokens: 48,
          outputTokensSource: "unavailable",
          outputTokensAvailable: true,
          totalTokens: 168,
        }),
      ]),
    );
  });

  test("persistRuntimeTelemetryFailure preserves caller correlation and request classification for failed rows", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-state-"));
    const validation = await runRuntimeAdapterValidation({
      repoRoot,
      fixtureRoot: path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
      runtimeStateRoot,
      scopeId: "workspace-dev",
    });

    persistRuntimeTelemetryFailure({
      databasePath: validation.databasePath,
      requestId: "req-failure-metadata-001",
      endpointId: "routing.failed.pre-execution",
      modelId: "mixed.local-remote",
      statusCode: 400,
      errorClass: "execution_failed",
      latencyMs: 120,
      clientRequestId: "req-client-failure-001",
      requestClass: "live_request",
      sourceType: "local",
    });

    expect(
      listRuntimeTelemetryRecords({
        databasePath: validation.databasePath,
        windowMs: 60_000,
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requestId: "req-failure-metadata-001",
          endpointId: "routing.failed.pre-execution",
          clientRequestId: "req-client-failure-001",
          requestClass: "live_request",
          sourceType: "local",
        }),
      ]),
    );
  });

  test("persistRuntimeTelemetryFailure preserves routed provider failure context and structured observation", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-state-"));
    const validation = await runRuntimeAdapterValidation({
      repoRoot,
      fixtureRoot: path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
      runtimeStateRoot,
      scopeId: "workspace-dev",
    });

    const requestId = "req-failure-routed-provider-001";
    const routingDecisionId = "decision-req-failure-routed-provider-001";
    const endpointId = "deepseek.personal.deepseek-api-key.global.deepseek-v4-pro";
    const failureObservation = {
      requestId,
      routingDecisionId,
      endpointId,
      conversationId: "conversation-main",
      statusFamily: "failure",
      usageEvent: {
        request_id: requestId,
        routing_decision_id: routingDecisionId,
        endpoint_id: endpointId,
        model_id: "deepseek/deepseek-v4-pro",
        provider_kind: null,
        tokens_in: 0,
        tokens_out: 0,
        latency_ms: 1626,
        cost_actual: null,
        cost_estimate: null,
        currency: "USD",
        error_class: "quota_exhausted",
        timestamp_ms: Date.now(),
      },
      capturePolicy: {
        environment: "runtime-failure",
        redactionLevel: "strict",
        retentionClass: "standard",
        structuredInspectionMode: "summary",
        rawCaptureAvailable: false,
        structuredInspectionAvailable: true,
        redactedFields: ["request.headers.authorization"],
        suppressedFields: [],
      },
      executionSemantics: {
        sourceClient: "openai.chat.completions",
        executionFamily: "remote-service",
        adapterFamily: "ai-sdk-openai-compatible",
        retryCount: 0,
        rerouteCount: 0,
        cooldownDecision: "not_applied",
        failedAttempts: [
          {
            failedEndpointId: endpointId,
            failureClass: "quota_exhausted",
            failurePhase: "provider_execution",
            retryable: false,
            fallbackEligible: true,
            errorPreview: {
              message: "Insufficient Balance",
              statusCode: 402,
            },
          },
        ],
      },
    };

    persistRuntimeTelemetryFailure({
      databasePath: validation.databasePath,
      requestId,
      routingDecisionId,
      endpointId,
      modelId: "deepseek/deepseek-v4-pro",
      requestedModelId: "difficulty.remote-only",
      selectedModelId: "deepseek/deepseek-v4-pro",
      statusCode: 402,
      errorClass: "quota_exhausted",
      latencyMs: 1626,
      clientRequestId: "client-routed-failure-001",
      requestClass: "live_request",
      sourceType: "remote",
      providerId: "deepseek",
      providerFamily: "deepseek",
      vendorId: "direct-openai-compatible",
      providerAccountId: "deepseek.personal.deepseek-api-key",
      endpointKind: "remote_api",
      servingSource: "remote-service",
      region: "global",
      lifecycleStateAtRequest: "active",
      healthStatusAtRequest: "healthy",
      routingMode: "difficulty",
      selectedStrategy: "quality",
      sourceClient: "openai.chat.completions",
      executionFamily: "remote-service",
      adapterFamily: "ai-sdk-openai-compatible",
      requestPayloadBytes: 128,
      ingressPayloadBytes: 120,
      translatedPayloadBytes: 121,
      providerCanonicalPayloadBytes: 122,
      providerWirePayloadBytes: 123,
      responsePayloadBytes: 96,
      retryCount: 0,
      rerouteCount: 0,
      cooldownDecision: "not_applied",
      idempotencyDecision: "not_needed",
      toolSideEffectState: "none",
      roleIds: ["coder"],
      eligibleEndpointIds: ["openai.personal.openai-codex-subscription.global.gpt-5.4", endpointId],
      eligibleModelIds: ["chatgpt/gpt-5.4", "deepseek/deepseek-v4-pro"],
      dimensions: {
        selectedEndpointId: endpointId,
        candidateCount: 2,
        failurePhase: "provider_execution",
        fallbackEligible: true,
        retryable: false,
        errorPreview: {
          message: "Insufficient Balance",
          statusCode: 402,
        },
      },
      observation: failureObservation,
    });

    expect(
      listRuntimeTelemetryRecords({
        databasePath: validation.databasePath,
        windowMs: 60_000,
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requestId,
          routingDecisionId,
          endpointId,
          modelId: "deepseek/deepseek-v4-pro",
          requestedModelId: "difficulty.remote-only",
          selectedModelId: "deepseek/deepseek-v4-pro",
          providerId: "deepseek",
          providerFamily: "deepseek",
          vendorId: "direct-openai-compatible",
          providerAccountId: "deepseek.personal.deepseek-api-key",
          endpointKind: "remote_api",
          servingSource: "remote-service",
          region: "global",
          lifecycleStateAtRequest: "active",
          healthStatusAtRequest: "healthy",
          routingMode: "difficulty",
          selectedStrategy: "quality",
          sourceClient: "openai.chat.completions",
          executionFamily: "remote-service",
          adapterFamily: "ai-sdk-openai-compatible",
          requestPayloadBytes: 128,
          ingressPayloadBytes: 120,
          translatedPayloadBytes: 121,
          providerCanonicalPayloadBytes: 122,
          providerWirePayloadBytes: 123,
          responsePayloadBytes: 96,
          retryCount: 0,
          rerouteCount: 0,
          cooldownDecision: "not_applied",
          idempotencyDecision: "not_needed",
          toolSideEffectState: "none",
          roleIds: ["coder"],
          eligibleEndpointIds: [
            "openai.personal.openai-codex-subscription.global.gpt-5.4",
            endpointId,
          ],
          eligibleModelIds: ["chatgpt/gpt-5.4", "deepseek/deepseek-v4-pro"],
          rawCaptureAvailable: false,
          structuredInspectionAvailable: true,
          statusCode: 402,
          errorClass: "quota_exhausted",
        }),
      ]),
    );
    expect(
      readRuntimeObservationBundle({ databasePath: validation.databasePath, requestId }),
    ).toEqual(
      expect.objectContaining({
        requestId,
        routingDecisionId,
        endpointId,
        statusFamily: "failure",
        executionSemantics: expect.objectContaining({
          adapterFamily: "ai-sdk-openai-compatible",
          failedAttempts: [
            expect.objectContaining({
              failedEndpointId: endpointId,
              failureClass: "quota_exhausted",
              fallbackEligible: true,
            }),
          ],
        }),
      }),
    );
  });

  test("persistRuntimeTelemetryFailure persists authoritative zero-cost metadata for pre-execution failures", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-state-"));
    const validation = await runRuntimeAdapterValidation({
      repoRoot,
      fixtureRoot: path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
      runtimeStateRoot,
      scopeId: "workspace-dev",
    });

    persistRuntimeTelemetryFailure({
      databasePath: validation.databasePath,
      requestId: "req-failure-cost-001",
      endpointId: "routing.failed.pre-execution",
      modelId: "mixed.local-remote",
      statusCode: 400,
      errorClass: "execution_failed",
      latencyMs: 120,
      clientRequestId: "req-client-failure-cost-001",
      requestClass: "live_request",
      sourceType: "remote",
    });

    const database = new DatabaseSync(validation.databasePath);
    const columns = database
      .prepare("PRAGMA table_info(runtime_telemetry_records)")
      .all() as Array<{
      name: string;
    }>;
    const persistedRow = database
      .prepare(
        "SELECT effective_cost_usd, cost_calculation_basis, cost_calculation_version, sampling_rate, retention_ttl_hours, retain_until_ms, redaction_level, retention_class, structured_inspection_mode, raw_capture_available, structured_inspection_available FROM runtime_telemetry_records WHERE request_id = ?",
      )
      .get("req-failure-cost-001") as
      | {
          effective_cost_usd: number;
          cost_calculation_basis: string;
          cost_calculation_version: string;
          sampling_rate: number | null;
          retention_ttl_hours: number | null;
          retain_until_ms: number | null;
          redaction_level: string | null;
          retention_class: string | null;
          structured_inspection_mode: string | null;
          raw_capture_available: number;
          structured_inspection_available: number;
        }
      | undefined;
    database.close();

    expect(columns.map((column) => column.name)).toEqual(
      expect.arrayContaining([
        "effective_cost_usd",
        "cost_calculation_basis",
        "cost_calculation_version",
        "sampling_rate",
        "retention_ttl_hours",
        "retain_until_ms",
        "redaction_level",
        "retention_class",
        "structured_inspection_mode",
        "raw_capture_available",
        "structured_inspection_available",
      ]),
    );
    expect(persistedRow).toEqual({
      effective_cost_usd: 0,
      cost_calculation_basis: "no_execution_zero",
      cost_calculation_version: "run49.v1",
      sampling_rate: null,
      retention_ttl_hours: null,
      retain_until_ms: null,
      redaction_level: null,
      retention_class: null,
      structured_inspection_mode: null,
      raw_capture_available: 0,
      structured_inspection_available: 0,
    });
  });

  test("persistRuntimeObservationBundle projects telemetry handling receipts into the telemetry ledger", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-state-"));
    const validation = await runRuntimeAdapterValidation({
      repoRoot,
      fixtureRoot: path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
      runtimeStateRoot,
      scopeId: "workspace-dev",
    });
    const history = await readJson<{
      byEndpointId: Record<
        string,
        Parameters<typeof createRuntimeObservationBundle>[0]["priorSamples"]
      >;
    }>("testdata/router-runtime/fixtures/observability-history.json");
    const policy = await readJson<
      Parameters<typeof createRuntimeObservationBundle>[0]["capturePolicy"]
    >("testdata/router-runtime/fixtures/observability-policy.json");
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
      telemetryConfig: {
        samplingRate: 0.25,
        retentionTtlHours: 48,
      },
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

    const database = new DatabaseSync(validation.databasePath);
    const persistedRow = database
      .prepare(
        "SELECT sampling_rate, retention_ttl_hours, retain_until_ms, redaction_level, retention_class, structured_inspection_mode, raw_capture_available, structured_inspection_available FROM runtime_telemetry_records WHERE request_id = ?",
      )
      .get(validation.decision.request_id) as
      | {
          sampling_rate: number;
          retention_ttl_hours: number;
          retain_until_ms: number;
          redaction_level: string;
          retention_class: string;
          structured_inspection_mode: string;
          raw_capture_available: number;
          structured_inspection_available: number;
        }
      | undefined;
    database.close();

    expect(persistedRow).toEqual({
      sampling_rate: 0.25,
      retention_ttl_hours: 48,
      retain_until_ms: bundle.privacyReceipt.retainUntil,
      redaction_level: "strict",
      retention_class: "standard",
      structured_inspection_mode: bundle.capturePolicy.structuredInspectionMode,
      raw_capture_available: bundle.capturePolicy.rawCaptureAvailable ? 1 : 0,
      structured_inspection_available: 1,
    });
  });

  test("persistRuntimeObservationBundle projects execution semantics receipts into the telemetry ledger", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-state-"));
    const validation = await runRuntimeAdapterValidation({
      repoRoot,
      fixtureRoot: path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
      runtimeStateRoot,
      scopeId: "workspace-dev",
    });
    const history = await readJson<{
      byEndpointId: Record<
        string,
        Parameters<typeof createRuntimeObservationBundle>[0]["priorSamples"]
      >;
    }>("testdata/router-runtime/fixtures/observability-history.json");
    const policy = await readJson<
      Parameters<typeof createRuntimeObservationBundle>[0]["capturePolicy"]
    >("testdata/router-runtime/fixtures/observability-policy.json");
    const bundle = createRuntimeObservationBundle({
      decision: validation.decision,
      clientRequestId: "client-semantic-001",
      routingDiagnostics: validation.routingDiagnostics,
      retrievalReceipt: validation.retrievalReceipt,
      contextEnvelope: validation.contextEnvelope,
      execution: validation.execution,
      priorSamples: history.byEndpointId[validation.decision.chosen_endpoint_id] ?? [],
      capturePolicy: policy,
      executionSemantics: {
        sourceClient: "openai.responses",
        payloadBytes: {
          ingress: 111,
          translated: 222,
          providerCanonical: 333,
          providerWire: 280,
          providerResponse: 444,
        },
        retryCount: 1,
        rerouteCount: 2,
        cooldownDecision: "skipped-no-failure",
        idempotencyDecision: "tool_replay_guard_required",
        failedAttempts: [
          {
            attemptId: "attempt-1",
            requestId: validation.decision.request_id,
            routingDecisionId: validation.decision.routing_decision_id,
            failedEndpointId: validation.execution.target.endpointId,
            providerId: validation.execution.target.providerId,
            providerFamily: validation.execution.target.providerId,
            executionFamily: validation.execution.target.candidate.identity.serving_source,
            adapterFamily: validation.execution.target.adapterFamily,
            statusCode: 503,
            failureClass: "upstream_timeout",
            retryable: true,
            fallbackEligible: true,
            failurePhase: "provider_execution",
            cooldownRecorded: true,
            cooldownFailureCount: 1,
            cooldownUntilMs: 1_750_000_000_000,
            errorPreview: {
              message: "Provider request timed out.",
            },
          },
        ],
      },
      tooling: {
        toolCalls: [
          {
            name: "apply_patch",
            arguments: {
              file: "src/router.ts",
            },
            providerToolId: "provider-tool-1",
          },
        ],
        executions: [
          {
            toolCallId: "provider-tool-1",
            toolName: "apply_patch",
            connectorId: "filesystem",
            connectorKind: "local",
            status: "succeeded",
            output: {
              patched: true,
            },
            diagnostics: [],
          },
        ],
      },
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

    const database = new DatabaseSync(validation.databasePath);
    const persistedRow = database
      .prepare(
        "SELECT provider_family, vendor_id, source_client, execution_family, adapter_family, ingress_payload_bytes, translated_payload_bytes, provider_canonical_payload_bytes, provider_wire_payload_bytes, response_payload_bytes, retry_count, reroute_count, cooldown_decision, idempotency_decision, tool_side_effect_state FROM runtime_telemetry_records WHERE request_id = ?",
      )
      .get(validation.decision.request_id) as
      | {
          provider_family: string;
          vendor_id: string | null;
          source_client: string;
          execution_family: string;
          adapter_family: string;
          ingress_payload_bytes: number;
          translated_payload_bytes: number;
          provider_canonical_payload_bytes: number;
          provider_wire_payload_bytes: number;
          response_payload_bytes: number;
          retry_count: number;
          reroute_count: number;
          cooldown_decision: string;
          idempotency_decision: string;
          tool_side_effect_state: string;
        }
      | undefined;
    database.close();

    expect(persistedRow).toEqual({
      provider_family: validation.execution.target.providerId,
      vendor_id: validation.execution.normalized.vendorMetadata?.vendorId ?? null,
      source_client: "openai.responses",
      execution_family: validation.execution.target.candidate.identity.serving_source,
      adapter_family: validation.execution.target.adapterFamily,
      ingress_payload_bytes: 111,
      translated_payload_bytes: 222,
      provider_canonical_payload_bytes: 333,
      provider_wire_payload_bytes: 280,
      response_payload_bytes: 444,
      retry_count: 1,
      reroute_count: 2,
      cooldown_decision: "skipped-no-failure",
      idempotency_decision: "tool_replay_guard_required",
      tool_side_effect_state: "executed",
    });

    const persistedObservation = readRuntimeObservationBundle({
      databasePath: validation.databasePath,
      requestId: validation.decision.request_id,
    });
    expect(persistedObservation).toEqual(
      expect.objectContaining({
        executionSemantics: expect.objectContaining({
          failedAttempts: [
            expect.objectContaining({
              attemptId: "attempt-1",
              failedEndpointId: validation.execution.target.endpointId,
              failureClass: "upstream_timeout",
              cooldownRecorded: true,
              cooldownFailureCount: 1,
            }),
          ],
        }),
      }),
    );
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
      fixtureRoot: path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
      runtimeStateRoot,
      scopeId: "workspace-dev",
    });
    const history = await readJson<{
      byEndpointId: Record<
        string,
        Parameters<typeof createRuntimeObservationBundle>[0]["priorSamples"]
      >;
    }>("testdata/router-runtime/fixtures/observability-history.json");
    const policy = await readJson<
      Parameters<typeof createRuntimeObservationBundle>[0]["capturePolicy"]
    >("testdata/router-runtime/fixtures/observability-policy.json");
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
      fixtureRoot: path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
      runtimeStateRoot,
      scopeId: "workspace-dev",
    });
    const history = await readJson<{
      byEndpointId: Record<
        string,
        Parameters<typeof createRuntimeObservationBundle>[0]["priorSamples"]
      >;
    }>("testdata/router-runtime/fixtures/observability-history.json");
    const policy = await readJson<
      Parameters<typeof createRuntimeObservationBundle>[0]["capturePolicy"]
    >("testdata/router-runtime/fixtures/observability-policy.json");
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
        backupRuntimeState(input: { databasePath: string; backupPath: string }): {
          backupPath: string;
        };
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

  test("persists throughput penalty state and expires it after the penalty window", async () => {
    expect(
      typeof (
        sqliteMemory as {
          upsertObservedThroughputPenaltyState?: unknown;
        }
      ).upsertObservedThroughputPenaltyState,
    ).toBe("function");
    expect(
      typeof (
        sqliteMemory as {
          readObservedThroughputPenaltyState?: unknown;
        }
      ).readObservedThroughputPenaltyState,
    ).toBe("function");

    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-state-"));
    const initialized = initializeSqliteMemory({
      runtimeStateRoot,
      scopeId: "workspace-dev",
    });

    (
      sqliteMemory as {
        upsertObservedThroughputPenaltyState: (value: {
          databasePath: string;
          penaltyState: {
            endpointId: string;
            lastObservedTokensPerSec: number;
            minTokensPerSec: number;
            penaltyFactor: number;
            activatedAtMs: number;
            expiresAtMs: number;
            lastObservationMeasuredAtMs: number;
          };
        }) => void;
      }
    ).upsertObservedThroughputPenaltyState({
      databasePath: initialized.databasePath,
      penaltyState: {
        endpointId: "openai.litellm.global.openai-gpt-4-1-mini-fast",
        lastObservedTokensPerSec: 12,
        minTokensPerSec: 24,
        penaltyFactor: 0,
        activatedAtMs: 1_762_000_100_000,
        expiresAtMs: 1_762_000_700_000,
        lastObservationMeasuredAtMs: 1_762_000_095_000,
      },
    });

    expect(
      (
        sqliteMemory as {
          readObservedThroughputPenaltyState: (value: {
            databasePath: string;
            endpointId: string;
            nowMs: number;
          }) => {
            endpointId: string;
            lastObservedTokensPerSec: number;
            minTokensPerSec: number;
            penaltyFactor: number;
            activatedAtMs: number;
            expiresAtMs: number;
            lastObservationMeasuredAtMs: number;
          } | null;
        }
      ).readObservedThroughputPenaltyState({
        databasePath: initialized.databasePath,
        endpointId: "openai.litellm.global.openai-gpt-4-1-mini-fast",
        nowMs: 1_762_000_650_000,
      }),
    ).toEqual(
      expect.objectContaining({
        endpointId: "openai.litellm.global.openai-gpt-4-1-mini-fast",
        lastObservedTokensPerSec: 12,
        minTokensPerSec: 24,
        penaltyFactor: 0,
        activatedAtMs: 1_762_000_100_000,
        expiresAtMs: 1_762_000_700_000,
      }),
    );

    expect(
      (
        sqliteMemory as {
          readObservedThroughputPenaltyState: (value: {
            databasePath: string;
            endpointId: string;
            nowMs: number;
          }) => unknown | null;
        }
      ).readObservedThroughputPenaltyState({
        databasePath: initialized.databasePath,
        endpointId: "openai.litellm.global.openai-gpt-4-1-mini-fast",
        nowMs: 1_762_000_700_001,
      }),
    ).toBeNull();
  });
});

describe("clearAllObservedBenchmarkData", () => {
  test("removes all benchmark samples across endpoints and clears profiles", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-state-"));
    const initialized = initializeSqliteMemory({
      runtimeStateRoot,
      scopeId: "workspace-dev-clear-all-benchmark",
    });
    const endpointA = "local.test.model-a";
    const endpointB = "local.test.model-b";

    persistObservedBenchmarkSample({
      databasePath: initialized.databasePath,
      sample: {
        endpoint_id: endpointA,
        endpoint_version: "v1",
        source_type: "benchmark",
        difficulty_bucket: "hard",
        timestamp_ms: 1_000,
        latency_ms: 900,
        judge_score: 0.35,
      },
    });
    persistObservedBenchmarkSample({
      databasePath: initialized.databasePath,
      sample: {
        endpoint_id: endpointB,
        endpoint_version: "v1",
        source_type: "benchmark",
        difficulty_bucket: "easy",
        timestamp_ms: 2_000,
        latency_ms: 800,
        judge_score: 0.9,
      },
    });

    const cleared = clearAllObservedBenchmarkData({
      databasePath: initialized.databasePath,
      nowMs: 3_000,
    });
    expect(cleared).toEqual({ clearedSampleCount: 2, affectedEndpointCount: 2 });

    expect(
      readLatestObservedProfile({
        databasePath: initialized.databasePath,
        endpointId: endpointA,
      }),
    ).toBeNull();
    expect(
      readLatestObservedProfile({
        databasePath: initialized.databasePath,
        endpointId: endpointB,
      }),
    ).toBeNull();
  });
});

describe("persistObservedBenchmarkSample benchmark_mode", () => {
  test("retains benchmark_mode on readback for quick benchmark samples", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-state-"));
    const initialized = initializeSqliteMemory({
      runtimeStateRoot,
      scopeId: "workspace-dev-benchmark-mode",
    });
    const endpointId = "local.test.model";

    persistObservedBenchmarkSample({
      databasePath: initialized.databasePath,
      sample: {
        endpoint_id: endpointId,
        endpoint_version: "v1",
        source_type: "benchmark",
        benchmark_mode: "quick",
        difficulty_bucket: "hard",
        timestamp_ms: 1_000,
        latency_ms: 900,
        judge_score: 0.71,
        request_id: "quick-hard-1",
      },
    });

    const samples = readObservedPerformanceSamples({
      databasePath: initialized.databasePath,
      endpointId,
    });
    expect(samples).toHaveLength(1);
    expect(samples[0]?.benchmark_mode).toBe("quick");
  });

  test("retries through a transient sqlite write lock when persisting benchmark samples", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-state-"));
    const initialized = initializeSqliteMemory({
      runtimeStateRoot,
      scopeId: "workspace-dev-benchmark-lock-retry",
    });
    const endpointId = "local.test.model.locked";
    const locker = spawn(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        [
          'import { DatabaseSync } from "node:sqlite";',
          "const databasePath = process.argv[1];",
          "const database = new DatabaseSync(databasePath);",
          'database.exec("PRAGMA journal_mode = WAL");',
          'database.exec("BEGIN IMMEDIATE");',
          'process.stdout.write("locked\\n");',
          "setTimeout(() => {",
          "  try {",
          '    database.exec("COMMIT");',
          "  } finally {",
          "    database.close();",
          "    process.exit(0);",
          "  }",
          "}, 250);",
        ].join(" "),
        initialized.databasePath,
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );

    try {
      await once(requireChildStdout(locker), "data");
      persistObservedBenchmarkSample({
        databasePath: initialized.databasePath,
        sample: {
          endpoint_id: endpointId,
          endpoint_version: "v1",
          source_type: "benchmark",
          benchmark_mode: "full",
          difficulty_bucket: "hard",
          timestamp_ms: 3_000,
          latency_ms: 700,
          judge_score: 0.82,
          request_id: "full-hard-locked-1",
        },
      });
      await once(locker, "exit");
    } finally {
      if (!locker.killed) {
        locker.kill("SIGTERM");
      }
    }

    const samples = readObservedPerformanceSamples({
      databasePath: initialized.databasePath,
      endpointId,
    });
    expect(samples).toHaveLength(1);
    expect(samples[0]?.benchmark_mode).toBe("full");
    expect(samples[0]?.judge_score).toBe(0.82);
  });

  test("retries through a transient sqlite write lock when persisting runtime observation bundles", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-state-"));
    const initialized = initializeSqliteMemory({
      runtimeStateRoot,
      scopeId: "workspace-dev-observation-lock-retry",
    });

    const validation = await runRuntimeAdapterValidation({
      repoRoot,
      fixtureRoot: path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
      runtimeStateRoot,
      scopeId: "workspace-dev-observation-lock-retry",
    });
    const history = await readJson<{
      byEndpointId: Record<
        string,
        Parameters<typeof createRuntimeObservationBundle>[0]["priorSamples"]
      >;
    }>("testdata/router-runtime/fixtures/observability-history.json");
    const policy = await readJson<
      Parameters<typeof createRuntimeObservationBundle>[0]["capturePolicy"]
    >("testdata/router-runtime/fixtures/observability-policy.json");
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

    const locker = spawn(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        [
          'import { DatabaseSync } from "node:sqlite";',
          "const databasePath = process.argv[1];",
          "const database = new DatabaseSync(databasePath);",
          'database.exec("PRAGMA journal_mode = WAL");',
          'database.exec("BEGIN IMMEDIATE");',
          'process.stdout.write("locked\\n");',
          "setTimeout(() => {",
          "  try {",
          '    database.exec("COMMIT");',
          "  } finally {",
          "    database.close();",
          "    process.exit(0);",
          "  }",
          "}, 250);",
        ].join(" "),
        initialized.databasePath,
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );

    try {
      await once(requireChildStdout(locker), "data");
      expect(() =>
        persistRuntimeObservationBundle({
          databasePath: initialized.databasePath,
          observation: bundle,
        }),
      ).not.toThrow();
      await once(locker, "exit");
    } finally {
      if (!locker.killed) {
        locker.kill("SIGTERM");
      }
    }
  });

  test("waits through a transient sqlite lock when reading difficulty classification cache", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-state-"));
    const initialized = initializeSqliteMemory({
      runtimeStateRoot,
      scopeId: "workspace-dev-difficulty-cache-lock-read",
    });

    const locker = spawn(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        [
          'import { DatabaseSync } from "node:sqlite";',
          "const databasePath = process.argv[1];",
          "const database = new DatabaseSync(databasePath);",
          'database.exec("PRAGMA journal_mode = WAL");',
          'database.exec("BEGIN IMMEDIATE");',
          'process.stdout.write("locked\\n");',
          "setTimeout(() => {",
          "  try {",
          '    database.exec("COMMIT");',
          "  } finally {",
          "    database.close();",
          "    process.exit(0);",
          "  }",
          "}, 250);",
        ].join(" "),
        initialized.databasePath,
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );

    try {
      await once(requireChildStdout(locker), "data");
      expect(
        sqliteMemory.readDifficultyClassificationCache({
          databasePath: initialized.databasePath,
          conversationId: "bench-conversation",
        }),
      ).toBeNull();
      await once(locker, "exit");
    } finally {
      if (!locker.killed) {
        locker.kill("SIGTERM");
      }
    }
  });

  test("retries through a transient sqlite write lock when persisting difficulty classification cache", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-state-"));
    const initialized = initializeSqliteMemory({
      runtimeStateRoot,
      scopeId: "workspace-dev-difficulty-cache-lock-write",
    });

    const locker = spawn(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        [
          'import { DatabaseSync } from "node:sqlite";',
          "const databasePath = process.argv[1];",
          "const database = new DatabaseSync(databasePath);",
          'database.exec("PRAGMA journal_mode = WAL");',
          'database.exec("BEGIN IMMEDIATE");',
          'process.stdout.write("locked\\n");',
          "setTimeout(() => {",
          "  try {",
          '    database.exec("COMMIT");',
          "  } finally {",
          "    database.close();",
          "    process.exit(0);",
          "  }",
          "}, 250);",
        ].join(" "),
        initialized.databasePath,
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );

    try {
      await once(requireChildStdout(locker), "data");
      expect(() =>
        sqliteMemory.upsertDifficultyClassificationCache({
          databasePath: initialized.databasePath,
          cache: {
            conversationId: "bench-conversation",
            difficulty: "easy",
            fallbackApplied: false,
            cachedAtMs: 1_000,
            expiresAtMs: 2_000,
            rubricSignals: {
              codeIndicators: 0,
              toolCount: 0,
              historyTurnCount: 0,
              instructionConstraintCount: 0,
              contextTokens: 0,
            },
          },
        }),
      ).not.toThrow();
      await once(locker, "exit");
    } finally {
      if (!locker.killed) {
        locker.kill("SIGTERM");
      }
    }

    expect(
      sqliteMemory.readDifficultyClassificationCache({
        databasePath: initialized.databasePath,
        conversationId: "bench-conversation",
      }),
    ).toMatchObject({
      difficulty: "easy",
      fallbackApplied: false,
    });
  });

  test("waits through a transient sqlite lock when reading advisory max difficulty recommendations", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-state-"));
    const initialized = initializeSqliteMemory({
      runtimeStateRoot,
      scopeId: "workspace-dev-advisory-lock-read",
    });

    const locker = spawn(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        [
          'import { DatabaseSync } from "node:sqlite";',
          "const databasePath = process.argv[1];",
          "const database = new DatabaseSync(databasePath);",
          'database.exec("PRAGMA journal_mode = WAL");',
          'database.exec("BEGIN IMMEDIATE");',
          'process.stdout.write("locked\\n");',
          "setTimeout(() => {",
          "  try {",
          '    database.exec("COMMIT");',
          "  } finally {",
          "    database.close();",
          "    process.exit(0);",
          "  }",
          "}, 250);",
        ].join(" "),
        initialized.databasePath,
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );

    try {
      await once(requireChildStdout(locker), "data");
      expect(
        sqliteMemory.readAdvisoryMaxDifficultyRecommendation({
          databasePath: initialized.databasePath,
          endpointId: "remote.test.endpoint",
          thresholds: {
            minSamples: 1,
            maxFailureRate: 0.5,
            minQualityScore: 0.5,
            minTokensPerSec: 1,
          },
        }),
      ).toMatchObject({
        recommendedMaxDifficulty: null,
      });
      await once(locker, "exit");
    } finally {
      if (!locker.killed) {
        locker.kill("SIGTERM");
      }
    }
  });

  test("waits through a transient sqlite lock when listing runtime telemetry records", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-state-"));
    const validation = await runRuntimeAdapterValidation({
      repoRoot,
      fixtureRoot: path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
      runtimeStateRoot,
      scopeId: "workspace-dev-telemetry-lock-read",
    });
    const history = await readJson<{
      byEndpointId: Record<
        string,
        Parameters<typeof createRuntimeObservationBundle>[0]["priorSamples"]
      >;
    }>("testdata/router-runtime/fixtures/observability-history.json");
    const policy = await readJson<
      Parameters<typeof createRuntimeObservationBundle>[0]["capturePolicy"]
    >("testdata/router-runtime/fixtures/observability-policy.json");
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
    persistRuntimeObservationBundle({
      databasePath: validation.databasePath,
      observation: bundle,
    });

    const locker = spawn(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        [
          'import { DatabaseSync } from "node:sqlite";',
          "const databasePath = process.argv[1];",
          "const database = new DatabaseSync(databasePath);",
          'database.exec("PRAGMA journal_mode = WAL");',
          'database.exec("BEGIN IMMEDIATE");',
          'process.stdout.write("locked\\n");',
          "setTimeout(() => {",
          "  try {",
          '    database.exec("COMMIT");',
          "  } finally {",
          "    database.close();",
          "    process.exit(0);",
          "  }",
          "}, 250);",
        ].join(" "),
        validation.databasePath,
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );

    try {
      await once(requireChildStdout(locker), "data");
      expect(
        sqliteMemory.listRuntimeTelemetryRecords({
          databasePath: validation.databasePath,
          windowMs: 60_000,
          limit: 10,
        }),
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            requestId: validation.decision.request_id,
          }),
        ]),
      );
      await once(locker, "exit");
    } finally {
      if (!locker.killed) {
        locker.kill("SIGTERM");
      }
    }
  });

  test("waits through a transient sqlite lock when reading batched observation telemetry columns", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-state-"));
    const validation = await runRuntimeAdapterValidation({
      repoRoot,
      fixtureRoot: path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
      runtimeStateRoot,
      scopeId: "workspace-dev-observation-columns-lock-read",
    });
    const history = await readJson<{
      byEndpointId: Record<
        string,
        Parameters<typeof createRuntimeObservationBundle>[0]["priorSamples"]
      >;
    }>("testdata/router-runtime/fixtures/observability-history.json");
    const policy = await readJson<
      Parameters<typeof createRuntimeObservationBundle>[0]["capturePolicy"]
    >("testdata/router-runtime/fixtures/observability-policy.json");
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
    persistRuntimeObservationBundle({
      databasePath: validation.databasePath,
      observation: bundle,
    });

    const locker = spawn(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        [
          'import { DatabaseSync } from "node:sqlite";',
          "const databasePath = process.argv[1];",
          "const database = new DatabaseSync(databasePath);",
          'database.exec("PRAGMA journal_mode = WAL");',
          'database.exec("BEGIN IMMEDIATE");',
          'process.stdout.write("locked\\n");',
          "setTimeout(() => {",
          "  try {",
          '    database.exec("COMMIT");',
          "  } finally {",
          "    database.close();",
          "    process.exit(0);",
          "  }",
          "}, 250);",
        ].join(" "),
        validation.databasePath,
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );

    try {
      await once(requireChildStdout(locker), "data");
      expect(
        sqliteMemory.readObservationTelemetryColumnsBatch({
          databasePath: validation.databasePath,
          requestIds: [validation.decision.request_id],
        }),
      ).toEqual(
        new Map([
          [
            validation.decision.request_id,
            {
              clientRequestId: null,
              requestClass: "live_request",
              taxonomyRoleId: null,
              taxonomyTaskType: null,
            },
          ],
        ]),
      );
      await once(locker, "exit");
    } finally {
      if (!locker.killed) {
        locker.kill("SIGTERM");
      }
    }
  });
});

describe("clearObservedBenchmarkDataForEndpoint", () => {
  test("removes benchmark samples and clears the endpoint profile when no live samples remain", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-state-"));
    const initialized = initializeSqliteMemory({
      runtimeStateRoot,
      scopeId: "workspace-dev-clear-benchmark",
    });
    const endpointId = "local.test.model";

    persistObservedBenchmarkSample({
      databasePath: initialized.databasePath,
      sample: {
        endpoint_id: endpointId,
        endpoint_version: "v1",
        source_type: "benchmark",
        difficulty_bucket: "hard",
        timestamp_ms: 1_000,
        latency_ms: 900,
        judge_score: 0.35,
      },
    });

    const before = readLatestObservedProfile({
      databasePath: initialized.databasePath,
      endpointId,
    });
    expect(before?.sources.benchmark_samples).toBe(1);

    const cleared = clearObservedBenchmarkDataForEndpoint({
      databasePath: initialized.databasePath,
      endpointId,
      nowMs: 3_000,
    });
    expect(cleared).toEqual({ endpointId, clearedSampleCount: 1 });

    const after = readLatestObservedProfile({
      databasePath: initialized.databasePath,
      endpointId,
    });
    expect(after).toBeNull();
  });
});

describe("runRuntimeStateValidation", () => {
  test("validates provider accounts and initializes SQLite through the local validation path", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-state-"));

    const result = await runRuntimeStateValidation({
      repoRoot,
      fixtureRoot: path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
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
