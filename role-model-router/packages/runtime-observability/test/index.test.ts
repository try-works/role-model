import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { describe, expect, test } from "vitest";

import { runRuntimeAdapterValidation } from "@role-model-router/adapter-execution/cli";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");

async function readJson<T>(relativePath: string): Promise<T> {
  const filePath = path.join(repoRoot, relativePath);
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

describe("runtime-observability", () => {
  test("creates a redacted runtime observation bundle with diagnostics and profile updates", async () => {
    const moduleImport = import(pathToFileURL(path.join(__dirname, "..", "src", "index.js")).href);
    await expect(moduleImport).resolves.toHaveProperty("createRuntimeObservationBundle");

    const runtimeStateRoot = await mkdtemp(
      path.join(os.tmpdir(), "role-model-runtime-observability-red-"),
    );

    try {
      const runtimeObservability = (await moduleImport) as {
        createRuntimeObservationBundle(input: Record<string, unknown>): Record<string, unknown>;
      };
      const validation = await runRuntimeAdapterValidation({
        repoRoot,
        fixtureRoot: path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
        runtimeStateRoot,
        scopeId: "runtime-observability-test",
      });
      const history = await readJson<{
        byEndpointId: Record<string, unknown[]>;
      }>("testdata/router-runtime/observability-history.json");
      const policy = await readJson<Record<string, unknown>>(
        "testdata/router-runtime/observability-policy.json",
      );

      const bundle = runtimeObservability.createRuntimeObservationBundle({
        decision: validation.decision,
        routingDiagnostics: validation.routingDiagnostics,
        retrievalReceipt: validation.retrievalReceipt,
        contextEnvelope: validation.contextEnvelope,
        execution: validation.execution,
        priorSamples: history.byEndpointId[validation.decision.chosen_endpoint_id] ?? [],
        normalizedIntent: {
          originalRoleHintId: "coder",
          originalTaskType: "coder.review",
          role: { id: "coder" },
          task: { id: "coder.review" },
          taskAction: "review",
          taskVariant: "security",
          capabilities: {
            required: ["code.read"],
            preferred: ["security.analysis", "code.read"],
          },
          modalities: {
            required: ["text"],
            output: ["text", "json"],
          },
          toolClasses: ["filesystem.read", "shell.execute", "filesystem.read"],
          source: "heuristic.classifier",
          roleSource: "heuristic",
          taskSource: "heuristic",
          taskConfidence: 0.8,
          confidence: 0.85,
          taxonomyVersion: "1.0.0-alpha.1",
          contentRevision: "taxonomy-v1-alpha.1",
          classificationContractVersion: "role-model.classification.v1",
          alternatives: [
            { roleId: "security", taskType: "security.audit", confidence: 0.45 },
            { roleId: "coder", taskType: "coder.test.write", confidence: 0.31 },
          ],
        },
        telemetryConfig: {
          samplingRate: 1.0,
          retentionTtlHours: 720,
        },
        maintenancePolicy: {
          "redaction.level": "strict",
          "retention.class": "standard",
          "backup.policy": "wal-copy-on-demand",
          "deletion.policy": "explicit-export-delete",
        },
        capturePolicy: policy,
        accountState: {
          providerAccountId: validation.execution.target.providerAccountId,
          status: "active",
          healthStatus: "provider-auth-error",
          rotationState: "failed",
        },
      });

      expect(bundle).toMatchObject({
        requestId: validation.decision.request_id,
        routingDecisionId: validation.decision.routing_decision_id,
        endpointId: validation.decision.chosen_endpoint_id,
        executionTelemetry: {
          providerFamily: validation.execution.target.providerId,
          finishReason: validation.execution.normalized.finishReason,
          stream: {
            requested: validation.execution.normalized.stream.requested,
            textDeltas: validation.execution.normalized.stream.textDeltas,
            toolCallDeltas: validation.execution.normalized.stream.toolCallDeltas,
            toolArgumentDeltas: validation.execution.normalized.stream.toolArgumentDeltas,
          },
          streamSupport: validation.execution.capabilities.streaming,
          promptCaching: validation.execution.capabilities.promptCaching,
          usageSupport: validation.execution.capabilities.usage,
          costProvenance: expect.stringMatching(/actual|estimated|unavailable/),
        },
        observedPerformance: {
          sample: {
            source_type: "live_request",
            request_id: validation.decision.request_id,
            routing_decision_id: validation.decision.routing_decision_id,
          },
          profile: {
            endpoint_id: validation.decision.chosen_endpoint_id,
          },
        },
        cacheObservability: {
          promptCacheRequested: true,
          promptCacheUsed: false,
        },
        capturePolicy: {
          redactionLevel: "strict",
          retentionClass: "standard",
          structuredInspectionAvailable: true,
          rawCaptureAvailable: true,
          redactedFields: expect.arrayContaining(["request.headers.authorization"]),
          suppressedFields: expect.arrayContaining(["request.body", "response.body"]),
        },
        privacyReceipt: {
          samplingRate: 1.0,
          retentionTtlHours: 720,
          retainUntil: expect.any(Number),
        },
        taxonomyDimensions: {
          taxonomy_original_role_hint_id: "coder",
          taxonomy_original_task_type: "coder.review",
          taxonomy_group_id: null,
          taxonomy_role_id: "coder",
          taxonomy_task_type: "coder.review",
          taxonomy_task_action: "review",
          taxonomy_task_variant: "security",
          taxonomy_capability_ids: ["code.read", "security.analysis"],
          taxonomy_modality_ids: ["json", "text"],
          taxonomy_tool_class_ids: ["filesystem.read", "shell.execute"],
          taxonomy_role_source: "heuristic",
          taxonomy_task_source: "heuristic",
          taxonomy_classification_source: "heuristic.classifier",
          taxonomy_confidence: 0.85,
          taxonomy_task_confidence: 0.8,
          taxonomy_alternative_count: 2,
          taxonomy_alternative_role_ids: ["coder", "security"],
          taxonomy_alternative_task_types: ["coder.test.write", "security.audit"],
          taxonomy_version: "1.0.0-alpha.1",
          taxonomy_content_revision: "taxonomy-v1-alpha.1",
          classification_contract_version: "role-model.classification.v1",
        },
      });
      expect(
        (
          bundle as {
            executionTelemetry: {
              vendorId?: string;
            };
          }
        ).executionTelemetry.vendorId,
      ).toBe(validation.execution.normalized.vendorMetadata?.vendorId);

      expect((bundle.diagnostics as { routing: Array<{ code: string }> }).routing).toEqual(
        expect.arrayContaining([expect.objectContaining({ code: "ROUTING_MODEL_ENABLED" })]),
      );
      expect((bundle.diagnostics as { execution: Array<{ code: string }> }).execution).toEqual(
        expect.arrayContaining([expect.objectContaining({ code: "PROMPT_CACHE_UNAVAILABLE" })]),
      );
      expect((bundle.diagnostics as { authAccount: Array<{ code: string }> }).authAccount).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: "AUTH_ACCOUNT_PROVIDER_AUTH_ERROR" }),
        ]),
      );
      expect(
        (bundle.diagnostics as { memoryQuality: Array<{ code: string }> }).memoryQuality,
      ).toEqual(
        expect.arrayContaining([expect.objectContaining({ code: "MEMORY_CONTEXT_OMITTED" })]),
      );
      expect(
        (
          bundle.inspection as {
            request: {
              requestCapture: {
                headers: Record<string, string>;
                body: { suppressed: boolean; reason: string };
              };
              responseCapture: {
                body: { suppressed: boolean; reason: string };
              };
            };
          }
        ).request.requestCapture.headers.authorization,
      ).toBe("[redacted]");
      expect(
        (
          bundle.inspection as {
            request: {
              requestCapture: {
                body: { suppressed: boolean; reason: string };
              };
              responseCapture: {
                body: { suppressed: boolean; reason: string };
              };
            };
          }
        ).request.requestCapture.body,
      ).toEqual({
        suppressed: true,
        reason: "policy.rawCapture.requestBody.disabled",
      });
      expect(
        (
          bundle.inspection as {
            request: {
              responseCapture: {
                body: { suppressed: boolean; reason: string };
              };
            };
          }
        ).request.responseCapture.body,
      ).toEqual({
        suppressed: true,
        reason: "policy.rawCapture.responseBody.disabled",
      });
    } finally {
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  });

  test("tags live-request samples with the classified difficulty bucket when difficulty routing is present", async () => {
    const moduleImport = import(pathToFileURL(path.join(__dirname, "..", "src", "index.js")).href);
    await expect(moduleImport).resolves.toHaveProperty("createRuntimeObservationBundle");

    const runtimeStateRoot = await mkdtemp(
      path.join(os.tmpdir(), "role-model-runtime-observability-difficulty-"),
    );

    try {
      const runtimeObservability = (await moduleImport) as {
        createRuntimeObservationBundle(input: Record<string, unknown>): {
          observedPerformance: {
            sample: {
              difficulty_bucket?: string;
            };
          };
          privacyReceipt: {
            samplingRate: number;
            retentionTtlHours: number;
            retainUntil: number;
          };
          taxonomyDimensions?: Record<string, unknown>;
        };
      };
      const validation = await runRuntimeAdapterValidation({
        repoRoot,
        fixtureRoot: path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
        runtimeStateRoot,
        scopeId: "runtime-observability-difficulty-test",
      });
      const policy = await readJson<Record<string, unknown>>(
        "testdata/router-runtime/observability-policy.json",
      );

      const bundle = runtimeObservability.createRuntimeObservationBundle({
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
          "backup.policy": "wal-copy-on-demand",
          "deletion.policy": "explicit-export-delete",
        },
        capturePolicy: policy,
      });

      expect(bundle.observedPerformance.sample.difficulty_bucket).toBe("hard");
      // privacyReceipt always present even without explicit telemetryConfig
      expect(bundle.privacyReceipt).toBeDefined();
      expect(bundle.privacyReceipt.samplingRate).toBeGreaterThanOrEqual(0);
      expect(bundle.privacyReceipt.retentionTtlHours).toBeGreaterThan(0);
      expect(typeof bundle.privacyReceipt.retainUntil).toBe("number");
      // taxonomyDimensions absent when normalizedIntent is not provided
      expect(bundle.taxonomyDimensions).toBeUndefined();
    } finally {
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  });

  test("captures execution semantics receipts and per-tool side-effect state", async () => {
    const moduleImport = import(pathToFileURL(path.join(__dirname, "..", "src", "index.js")).href);
    await expect(moduleImport).resolves.toHaveProperty("createRuntimeObservationBundle");

    const runtimeStateRoot = await mkdtemp(
      path.join(os.tmpdir(), "role-model-runtime-observability-semantics-"),
    );

    try {
      const runtimeObservability = (await moduleImport) as {
        createRuntimeObservationBundle(input: Record<string, unknown>): Record<string, unknown>;
      };
      const validation = await runRuntimeAdapterValidation({
        repoRoot,
        fixtureRoot: path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
        runtimeStateRoot,
        scopeId: "runtime-observability-semantics-test",
      });
      const history = await readJson<{
        byEndpointId: Record<string, unknown[]>;
      }>("testdata/router-runtime/observability-history.json");
      const policy = await readJson<Record<string, unknown>>(
        "testdata/router-runtime/observability-policy.json",
      );

      const bundle = runtimeObservability.createRuntimeObservationBundle({
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
          reasoning: {
            requested: true,
            controlForwarded: true,
            deltaCount: 2,
            outputTokens: 17,
            streamSuppressed: false,
          },
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

      expect(bundle).toMatchObject({
        executionSemantics: {
          sourceClient: "openai.responses",
          executionFamily: validation.execution.target.candidate.identity.serving_source,
          adapterFamily: validation.execution.target.adapterFamily,
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
          toolSideEffectState: "executed",
          reasoning: {
            requested: true,
            controlForwarded: true,
            deltaCount: 2,
            outputTokens: 17,
            streamSuppressed: false,
          },
          failedAttempts: [
            expect.objectContaining({
              attemptId: "attempt-1",
              failedEndpointId: validation.execution.target.endpointId,
              failureClass: "upstream_timeout",
              cooldownRecorded: true,
              cooldownFailureCount: 1,
            }),
          ],
        },
        tooling: {
          toolCalls: [
            {
              toolCallId: "provider-tool-1",
              toolName: "apply_patch",
              providerToolId: "provider-tool-1",
              sideEffectState: "executed",
            },
          ],
        },
      });
      expect(
        (
          bundle as {
            executionSemantics: {
              payloadBytes: {
                ingress: number;
                translated: number;
                providerCanonical: number;
                providerWire: number;
                providerResponse: number;
              };
            };
          }
        ).executionSemantics.payloadBytes.ingress,
      ).toBe(111);
      expect(
        (
          bundle as {
            executionSemantics: {
              payloadBytes: {
                ingress: number;
                translated: number;
                providerCanonical: number;
                providerWire: number;
                providerResponse: number;
              };
            };
          }
        ).executionSemantics.payloadBytes.translated,
      ).toBe(222);
      expect(
        (
          bundle as {
            executionSemantics: {
              payloadBytes: {
                ingress: number;
                translated: number;
                providerCanonical: number;
                providerWire: number;
                providerResponse: number;
              };
            };
          }
        ).executionSemantics.payloadBytes.providerCanonical,
      ).toBe(333);
      expect(
        (
          bundle as {
            executionSemantics: {
              payloadBytes: {
                ingress: number;
                translated: number;
                providerCanonical: number;
                providerWire: number;
                providerResponse: number;
              };
            };
          }
        ).executionSemantics.payloadBytes.providerWire,
      ).toBe(280);
      expect(
        (
          bundle as {
            executionSemantics: {
              payloadBytes: {
                ingress: number;
                translated: number;
                providerCanonical: number;
                providerWire: number;
                providerResponse: number;
              };
            };
          }
        ).executionSemantics.payloadBytes.providerResponse,
      ).toBe(444);
    } finally {
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  });
});

// ── SP-A2: extractTaxonomyFields direct unit tests ──

describe("extractTaxonomyFields", () => {
  test("extracts all fields from a fully populated normalizedIntent", async () => {
    const moduleImport = import(pathToFileURL(path.join(__dirname, "..", "src", "index.js")).href);
    const mod = (await moduleImport) as {
      extractTaxonomyFields(intent: Readonly<Record<string, unknown>>): Record<string, unknown>;
    };
    const result = mod.extractTaxonomyFields({
      originalRoleHintId: "coder",
      originalTaskType: "coder.review",
      role: { id: "coder" },
      task: { id: "coder.review" },
      taskAction: "review",
      taskVariant: "security",
      capabilities: {
        required: ["code.read"],
        preferred: ["security.analysis", "code.read"],
      },
      modalities: {
        required: ["text"],
        output: ["text", "json"],
      },
      toolClasses: ["filesystem.read", "shell.execute", "filesystem.read"],
      source: "heuristic.classifier",
      roleSource: "heuristic",
      taskSource: "heuristic",
      taskConfidence: 0.8,
      confidence: 0.85,
      taxonomyVersion: "1.0.0-alpha.1",
      contentRevision: "taxonomy-v1-alpha.1",
      classificationContractVersion: "role-model.classification.v1",
      alternatives: [
        { roleId: "security", taskType: "security.audit", confidence: 0.45 },
        { roleId: "coder", taskType: "coder.test.write", confidence: 0.31 },
      ],
    });
    expect(result).toEqual({
      taxonomy_original_role_hint_id: "coder",
      taxonomy_original_task_type: "coder.review",
      taxonomy_group_id: null,
      taxonomy_role_id: "coder",
      taxonomy_task_type: "coder.review",
      taxonomy_task_action: "review",
      taxonomy_task_variant: "security",
      taxonomy_capability_ids: ["code.read", "security.analysis"],
      taxonomy_modality_ids: ["json", "text"],
      taxonomy_tool_class_ids: ["filesystem.read", "shell.execute"],
      taxonomy_role_source: "heuristic",
      taxonomy_task_source: "heuristic",
      taxonomy_classification_source: "heuristic.classifier",
      taxonomy_confidence: 0.85,
      taxonomy_task_confidence: 0.8,
      taxonomy_alternative_count: 2,
      taxonomy_alternative_role_ids: ["coder", "security"],
      taxonomy_alternative_task_types: ["coder.test.write", "security.audit"],
      taxonomy_version: "1.0.0-alpha.1",
      taxonomy_content_revision: "taxonomy-v1-alpha.1",
      classification_contract_version: "role-model.classification.v1",
    });
  });

  test("returns null for missing fields", async () => {
    const moduleImport = import(pathToFileURL(path.join(__dirname, "..", "src", "index.js")).href);
    const mod = (await moduleImport) as {
      extractTaxonomyFields(intent: Readonly<Record<string, unknown>>): Record<string, unknown>;
    };
    const result = mod.extractTaxonomyFields({});
    expect(result).toEqual({
      taxonomy_original_role_hint_id: null,
      taxonomy_original_task_type: null,
      taxonomy_group_id: null,
      taxonomy_role_id: null,
      taxonomy_task_type: null,
      taxonomy_task_action: null,
      taxonomy_task_variant: null,
      taxonomy_capability_ids: null,
      taxonomy_modality_ids: null,
      taxonomy_tool_class_ids: null,
      taxonomy_role_source: null,
      taxonomy_task_source: null,
      taxonomy_classification_source: null,
      taxonomy_confidence: null,
      taxonomy_task_confidence: null,
      taxonomy_alternative_count: null,
      taxonomy_alternative_role_ids: null,
      taxonomy_alternative_task_types: null,
      taxonomy_version: null,
      taxonomy_content_revision: null,
      classification_contract_version: null,
    });
  });
});
