import os from "node:os";
import path from "node:path";
import { mkdtemp, readFile, rm } from "node:fs/promises";
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
          providerFamily: validation.execution.normalized.providerFamily,
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
      });

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
      expect((bundle.diagnostics as { memoryQuality: Array<{ code: string }> }).memoryQuality).toEqual(
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
});
