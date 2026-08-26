import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { expect, test } from "vitest";

import {
  initializeSqliteMemory,
  persistRuntimeObservationBundle,
  persistRuntimeTelemetryFailure,
} from "../src/index.js";

function buildRichObservation(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    requestId: "req-run94-rich",
    routingDecisionId: "decision-run94-rich",
    endpointId: "endpoint-run94-rich",
    conversationId: "conversation-run94-rich",
    reasoningEffort: "medium",
    effortSource: "variant",
    usageEvent: {
      timestamp_ms: Date.now(),
      request_id: "req-run94-rich",
      routing_decision_id: "decision-run94-rich",
      endpoint_id: "endpoint-run94-rich",
      model_id: "model/run94",
      provider_kind: "remote",
      tokens_in: 4,
      tokens_out: 3,
      latency_ms: 900,
      cost_actual: 0.02,
      currency: "USD",
      error_class: undefined,
    },
    observedPerformance: {
      endpointVersion: "v1",
      sample: {
        endpoint_id: "endpoint-run94-rich",
        endpoint_version: "v1",
        source_type: "live_request",
        timestamp_ms: Date.now(),
        latency_ms: 900,
        success: true,
      },
      history: [
        { endpoint_id: "endpoint-run94-rich", latency_ms: 800, timestamp_ms: Date.now() - 1 },
      ],
      profile: { measured_at_ms: Date.now(), sampleCount: 2 },
    },
    decision: {
      chosen_endpoint_id: "endpoint-run94-rich",
      candidate_snapshots: [{ big: "x".repeat(20000) }],
    },
    trace: { spans: ["s".repeat(20000)] },
    diagnostics: { execution: { preview: "y".repeat(20000) } },
    tooling: { executions: [{ toolName: "shell", output: "z".repeat(20000) }] },
    inspection: {
      request: {
        requestId: "req-run94-rich",
        requestCapture: { messages: [{ role: "user", content: "m".repeat(30000) }] },
        responseCapture: { outputText: "o".repeat(30000) },
      },
      endpoint: {
        endpointId: "endpoint-run94-rich",
        recentSamples: [{ latency_ms: 1 }],
      },
    },
    executionSemantics: {
      sourceClient: "openai.responses",
      adapterFamily: "ai-sdk-openai-compatible",
      payloadBytes: { providerResponse: 12345 },
    },
    capturePolicy: { environment: "development", redactionLevel: "strict" },
    privacyReceipt: {
      samplingRate: 1,
      retentionTtlHours: 720,
      retainUntil: Date.now() + 720 * 3600 * 1000,
    },
    taxonomyDimensions: { taxonomy_role_id: "coder", taxonomy_task_type: "edit" },
    providerEvidence: {
      endpointId: "endpoint-run94-rich",
      modelId: "model/run94",
      status: "ok",
      attemptIds: ["req-run94-rich:attempt:1"],
    },
    graphEvidence: {
      rootArtifactId: "root-run94-rich",
      messageNodeIds: ["message-run94-rich"],
      responseNodeId: "response-run94-rich",
      edgeCount: 2,
    },
    run88Correlation: {
      schemaVersion: "run88-correlation.v1",
      correlationId: "correlation-run94-rich",
      requestId: "req-run94-rich",
      routingDecisionId: "decision-run94-rich",
      endpointId: "endpoint-run94-rich",
      releaseId: `sha256:${"a".repeat(64)}`,
      sourceId: "b".repeat(40),
      deploymentId: `local-development:${"c".repeat(64)}`,
      scope: "tenant:run94",
    },
    ...overrides,
  };
}

test("run94 F1: persistRuntimeObservationBundle writes a <=16KiB compact stub with no journal present when graph content is externalized", async () => {
  const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "run94-compact-stub-"));
  const initialized = initializeSqliteMemory({
    runtimeStateRoot,
    scopeId: "run94-compact",
    channel: "development",
  });
  const artifactRef = {
    scopeId: "tenant:run94",
    artifactId: "artifact-req-run94-rich",
    contentHash: "sha256:rich",
  };
  persistRuntimeObservationBundle({
    databasePath: initialized.databasePath,
    channel: "development",
    observation: buildRichObservation() as never,
    artifactRef,
  });
  const database = new DatabaseSync(initialized.databasePath);
  const row = database
    .prepare("SELECT observation_json FROM runtime_observations WHERE request_id=?")
    .get("req-run94-rich") as { observation_json: string };
  database.close();
  expect(Buffer.byteLength(row.observation_json, "utf8")).toBeLessThanOrEqual(16 * 1024);
  const stub = JSON.parse(row.observation_json) as Record<string, unknown>;
  expect(stub.requestId).toBe("req-run94-rich");
  expect(stub.artifactRef).toEqual(artifactRef);
  expect(stub.graphPrimary).toBe(true);
  expect(stub.usageEvent.tokens_in).toBe(4);
  expect(row.observation_json).not.toContain("recentSamples");
  expect(row.observation_json).not.toContain("history");
  expect(row.observation_json).not.toContain("requestCapture");
  // payloadBytes.providerResponse is a bounded byte count and must survive as compact telemetry.
  expect(stub.executionSemantics.payloadBytes.providerResponse).toBe(12345);
  expect(stub.providerEvidence).toEqual({
    endpointId: "endpoint-run94-rich",
    modelId: "model/run94",
    status: "ok",
    attemptIds: ["req-run94-rich:attempt:1"],
  });
  expect(stub.graphEvidence).toEqual({
    rootArtifactId: "root-run94-rich",
    messageNodeIds: ["message-run94-rich"],
    responseNodeId: "response-run94-rich",
    edgeCount: 2,
  });
  expect(stub.run88Correlation).toMatchObject({ correlationId: "correlation-run94-rich" });
  expect(row.observation_json).not.toContain("m".repeat(30000));
  expect(stub.observedPerformance).not.toHaveProperty("history");
  expect(stub.inspection).toBeUndefined();
  expect(stub.tooling).toBeUndefined();
});

test("run94 F1: schema guard rejects accidental rich inline persistence beyond 16 KiB", async () => {
  const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "run94-compact-guard-"));
  const initialized = initializeSqliteMemory({
    runtimeStateRoot,
    scopeId: "run94-compact-guard",
    channel: "development",
  });
  const database = new DatabaseSync(initialized.databasePath);
  expect(() =>
    database
      .prepare(
        "INSERT INTO runtime_observations (request_id, routing_decision_id, endpoint_id, conversation_id, created_at_ms, observation_json) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .run(
        "req-guard",
        "decision-guard",
        "endpoint-guard",
        "conversation-guard",
        Date.now(),
        JSON.stringify({ payload: "x".repeat(20000) }),
      ),
  ).toThrow(/16 KiB|compact|limit/i);
  database.close();
});

test("run94 F1: persistRuntimeObservationBundle fails closed instead of writing rich content inline without graph externalization", async () => {
  const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "run94-compact-failclosed-"));
  const initialized = initializeSqliteMemory({
    runtimeStateRoot,
    scopeId: "run94-compact-failclosed",
    channel: "development",
  });
  expect(() =>
    persistRuntimeObservationBundle({
      databasePath: initialized.databasePath,
      channel: "development",
      observation: buildRichObservation() as never,
    }),
  ).toThrow(/graph|artifact|compact|16 KiB/i);
});

test("run94 F1: persistRuntimeTelemetryFailure writes a bounded classification stub, never the original observation", async () => {
  const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "run94-compact-telemetry-"));
  const initialized = initializeSqliteMemory({
    runtimeStateRoot,
    scopeId: "run94-compact-telemetry",
    channel: "development",
  });
  persistRuntimeTelemetryFailure({
    databasePath: initialized.databasePath,
    requestId: "req-run94-failure",
    routingDecisionId: "decision-run94-failure",
    endpointId: "endpoint-run94-failure",
    statusCode: 500,
    errorClass: "provider_timeout",
    latencyMs: 1200,
    requestClass: "live_request",
    observation: {
      requestId: "req-run94-failure",
      routingDecisionId: "decision-run94-failure",
      endpointId: "endpoint-run94-failure",
      conversationId: "conversation-main",
      statusFamily: "failure",
      usageEvent: {
        request_id: "req-run94-failure",
        timestamp_ms: Date.now(),
        tokens_in: 0,
        tokens_out: 0,
        latency_ms: 1200,
        error_class: "provider_timeout",
      },
      providerResponse: "f".repeat(30000),
      messages: [{ role: "user", content: "g".repeat(30000) }],
      executionSemantics: {
        adapterFamily: "ai-sdk-openai-compatible",
        failedAttempts: [
          { failedEndpointId: "endpoint-run94-failure", failureClass: "provider_timeout" },
        ],
      },
    },
  });
  const database = new DatabaseSync(initialized.databasePath);
  const row = database
    .prepare("SELECT observation_json FROM runtime_observations WHERE request_id=?")
    .get("req-run94-failure") as { observation_json: string };
  database.close();
  expect(Buffer.byteLength(row.observation_json, "utf8")).toBeLessThanOrEqual(16 * 1024);
  expect(row.observation_json).not.toContain("providerResponse");
  expect(row.observation_json).not.toContain("messages");
  const stub = JSON.parse(row.observation_json) as Record<string, unknown>;
  expect(stub.requestId).toBe("req-run94-failure");
  expect(stub.statusFamily).toBe("failure");
  expect(stub.failure).toMatchObject({ statusCode: 500, errorClass: "provider_timeout" });
});
