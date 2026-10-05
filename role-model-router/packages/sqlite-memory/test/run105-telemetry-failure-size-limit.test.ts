import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, expect, test } from "vitest";
import {
  LEGACY_INLINE_CAP_BYTES,
  type RuntimeObservationGraphStore,
  buildCompactRuntimeObservationStub,
  initializeSqliteMemory,
  persistRuntimeTelemetryFailure,
} from "../src/index.js";

/**
 * The compact stub carries the diagnostic failure attempts that the production observation type
 * deliberately does not surface, so the boundary cases name that shape once instead of casting
 * every access through `any`.
 */
interface DiagnosticAttempt {
  attemptId: string;
  statusCode: number;
  failureClass: string;
  errorPreview: {
    message: string;
    messageTruncated?: boolean;
    messageOriginalUtf8Bytes?: number;
  };
}
const diagnosticAttempts = (value: { executionSemantics: unknown }): DiagnosticAttempt[] =>
  (value.executionSemantics as { failedAttempts: DiagnosticAttempt[] }).failedAttempts;

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});
function fixture(graph: boolean) {
  const root = mkdtempSync(path.join(os.tmpdir(), "run105-r15-"));
  roots.push(root);
  const { databasePath } = initializeSqliteMemory({
    runtimeStateRoot: root,
    scopeId: "r15",
    channel: "development",
  });
  const graphStore: RuntimeObservationGraphStore | undefined = graph
    ? {
        scopeId: "r15",
        write(input) {
          const artifactPath = path.join(root, "failure-artifact.json");
          writeFileSync(artifactPath, input.content);
          return { artifactId: "failure-artifact", artifactPath, contentHash: input.contentHash };
        },
        read(ref) {
          return readFileSync(ref.artifactPath as string, "utf8");
        },
      }
    : undefined;
  return { databasePath, graphStore };
}
function observation(message: string, count = 8): Record<string, unknown> {
  return {
    requestId: "req-r15",
    routingDecisionId: "decision-r15",
    endpointId: "endpoint-r15",
    executionTelemetry: {
      stream: { requested: true, textDeltas: 789, toolCallDeltas: 3, toolArgumentDeltas: 7 },
    },
    executionSemantics: {
      adapterFamily: "openai-compatible",
      providerAttemptIds: ["attempt-r15"],
      failedAttempts: Array.from({ length: count }, (_, i) => ({
        attemptId: `attempt-${i}`,
        routedAttemptId: `routed-${i}`,
        failedEndpointId: "endpoint-r15",
        statusCode: 503,
        failureClass: "provider_unavailable",
        retryable: true,
        cooldownFailureCount: 2,
        errorPreview: {
          message,
          statusCode: 503,
          errorClass: "provider_unavailable",
          responseBody: "PRIVATE-BODY",
        },
      })),
    },
    diagnostics: { message: "PRIVATE-DIAGNOSTICS" },
    messages: [{ content: "PRIVATE-PROMPT" }],
    providerResponse: "PRIVATE-RESPONSE",
    inspection: { requestCapture: "PRIVATE-CAPTURE" },
  };
}
function persist(
  databasePath: string,
  obs: Record<string, unknown>,
  graphStore?: RuntimeObservationGraphStore,
) {
  persistRuntimeTelemetryFailure({
    databasePath,
    requestId: "req-r15",
    routingDecisionId: "decision-r15",
    endpointId: "endpoint-r15",
    statusCode: 503,
    errorClass: "provider_unavailable",
    retryCount: 2,
    rerouteCount: 1,
    streamTextDeltaCount: 789,
    streamToolCallDeltaCount: 3,
    streamToolArgumentDeltaCount: 7,
    observation: obs,
    ...(graphStore ? { graphStore } : {}),
  });
}
function read(databasePath: string) {
  const db = new DatabaseSync(databasePath);
  try {
    const row = db
      .prepare("SELECT observation_json FROM runtime_observations WHERE request_id='req-r15'")
      .get() as { observation_json: string };
    const telemetry = db
      .prepare(
        "SELECT request_id, routing_decision_id, endpoint_id, status_code, error_class, retry_count, reroute_count, stream_text_delta_count, stream_tool_call_delta_count, stream_tool_argument_delta_count FROM runtime_telemetry_records WHERE request_id='req-r15'",
      )
      .get();
    return { payload: row.observation_json, stub: JSON.parse(row.observation_json), telemetry };
  } finally {
    db.close();
  }
}
for (const graph of [false, true])
  for (const [name, unit] of [
    ["ASCII", "x"],
    ["UTF-8", "界😀"],
  ]) {
    test(`R15 ${name} large allowed errorPreview persists primary failure (graph=${graph})`, () => {
      const { databasePath, graphStore } = fixture(graph);
      const message = unit.repeat(5000);
      const obs = observation(message);
      let failure: unknown;
      try {
        persist(databasePath, obs, graphStore);
      } catch (error) {
        failure = error;
      }
      if (failure) console.log("R15 exact reproduction:", (failure as Error).message);
      expect(
        failure,
        "secondary diagnostics must not replace the primary provider failure",
      ).toBeUndefined();
      const { payload, stub, telemetry } = read(databasePath);
      console.log("R15 measured persisted UTF-8 bytes:", Buffer.byteLength(payload, "utf8"));
      expect(Buffer.byteLength(payload, "utf8")).toBeLessThanOrEqual(LEGACY_INLINE_CAP_BYTES);
      expect(telemetry).toMatchObject({
        request_id: "req-r15",
        routing_decision_id: "decision-r15",
        endpoint_id: "endpoint-r15",
        status_code: 503,
        error_class: "provider_unavailable",
        retry_count: 2,
        reroute_count: 1,
        stream_text_delta_count: 789,
        stream_tool_call_delta_count: 3,
        stream_tool_argument_delta_count: 7,
      });
      expect(stub.failure).toEqual({ statusCode: 503, errorClass: "provider_unavailable" });
      expect(stub.executionSemantics.failedAttempts).toHaveLength(8);
      for (const [i, attempt] of stub.executionSemantics.failedAttempts.entries()) {
        expect(attempt).toMatchObject({
          attemptId: `attempt-${i}`,
          routedAttemptId: `routed-${i}`,
          failedEndpointId: "endpoint-r15",
          statusCode: 503,
          failureClass: "provider_unavailable",
          cooldownFailureCount: 2,
        });
        expect(attempt.errorPreview.messageTruncated).toBe(true);
        expect(attempt.errorPreview.messageOriginalUtf8Bytes).toBe(
          Buffer.byteLength(message, "utf8"),
        );
        expect(
          Buffer.byteLength(JSON.stringify(attempt.errorPreview.message), "utf8"),
        ).toBeLessThanOrEqual(512);
        expect(message.startsWith(attempt.errorPreview.message)).toBe(true);
        expect(attempt.errorPreview.message).not.toMatch(/[\uD800-\uDBFF]$/u);
      }
      for (const secret of [
        "PRIVATE-BODY",
        "PRIVATE-DIAGNOSTICS",
        "PRIVATE-PROMPT",
        "PRIVATE-RESPONSE",
        "PRIVATE-CAPTURE",
      ])
        expect(payload).not.toContain(secret);
      expect(payload).not.toContain(message);
      if (graphStore) {
        expect(stub.graphPrimary).toBe(true);
        expect(JSON.parse(graphStore.read(stub.artifactRef))).toEqual(obs);
      } else expect(stub.artifactRef).toBeUndefined();
      expect(obs.executionSemantics).toEqual(observation(message).executionSemantics);
    });
  }
for (const [message, expectedTruncated] of [
  ["x".repeat(509), false],
  ["x".repeat(510), false],
  ["x".repeat(511), true],
  [`${"😀".repeat(127)}xx`, false],
  [`${"😀".repeat(127)}xxx`, true],
  ["\u0000".repeat(85), false],
  ["\u0000".repeat(86), true],
] as const)
  test(`R15 serialized preview boundary ${Buffer.byteLength(JSON.stringify(message), "utf8")}`, () => {
    const stub = buildCompactRuntimeObservationStub(observation(message, 1));
    const preview = diagnosticAttempts(stub)[0].errorPreview;
    expect(Buffer.byteLength(JSON.stringify(preview.message), "utf8")).toBeLessThanOrEqual(512);
    expect(preview.messageTruncated === true).toBe(expectedTruncated);
    expect(message.startsWith(preview.message)).toBe(true);
    if (!expectedTruncated) expect(preview.message).toBe(message);
  });
test("R15 aggregate message eviction preserves every correlation ID", () => {
  const { databasePath } = fixture(false);
  const obs = observation("x".repeat(5000));
  for (const attempt of diagnosticAttempts(obs)) attempt.attemptId = "id".repeat(600);
  expect(() => persist(databasePath, obs)).not.toThrow();
  const { payload, stub } = read(databasePath);
  expect(Buffer.byteLength(payload, "utf8")).toBeLessThanOrEqual(16384);
  expect(stub.compactTruncation.omittedFields).toContain(
    "executionSemantics.failedAttempts.errorPreview.message",
  );
  for (const attempt of stub.executionSemantics.failedAttempts) {
    expect(attempt.attemptId).toBe("id".repeat(600));
    expect(attempt.statusCode).toBe(503);
    expect(attempt.failureClass).toBe("provider_unavailable");
    expect(attempt.errorPreview.messageOriginalUtf8Bytes).toBe(5000);
  }
});
for (const targetBytes of [16383, 16384, 16385])
  test(`R15 allowed diagnostic at original envelope boundary ${targetBytes}`, () => {
    const { databasePath } = fixture(false);
    const obs = observation("", 1);
    const baseline = JSON.stringify({
      ...buildCompactRuntimeObservationStub(obs),
      statusFamily: "failure",
      failure: { statusCode: 503, errorClass: "provider_unavailable" },
    });
    const message = "x".repeat(targetBytes - Buffer.byteLength(baseline, "utf8"));
    diagnosticAttempts(obs)[0].errorPreview.message = message;
    const originalEnvelope = {
      ...buildCompactRuntimeObservationStub(obs),
      statusFamily: "failure",
      failure: { statusCode: 503, errorClass: "provider_unavailable" },
    };
    diagnosticAttempts(originalEnvelope)[0].errorPreview = {
      message,
      statusCode: 503,
      errorClass: "provider_unavailable",
    };
    expect(Buffer.byteLength(JSON.stringify(originalEnvelope), "utf8")).toBe(targetBytes);
    expect(() => persist(databasePath, obs)).not.toThrow();
    expect(Buffer.byteLength(read(databasePath).payload, "utf8")).toBeLessThanOrEqual(16384);
  });
test("R15 aggregate pressure evicts optional diagnostics explicitly, retaining attempts and counters", () => {
  const { databasePath } = fixture(false);
  const obs = observation("\u0000".repeat(5000));
  obs.retrievalReceipt = { receiptId: "receipt-r15", summary: "界".repeat(20000) };
  obs.routingDiagnostics = { selection: { detail: "x".repeat(20000) } };
  expect(() => persist(databasePath, obs)).not.toThrow();
  const { payload, stub } = read(databasePath);
  expect(Buffer.byteLength(payload, "utf8")).toBeLessThanOrEqual(16384);
  expect(stub.compactTruncation).toMatchObject({
    reason: "inline_byte_budget",
    omittedFields: expect.arrayContaining(["retrievalReceipt"]),
  });
  expect(stub.executionSemantics.failedAttempts).toHaveLength(8);
  expect(stub.executionTelemetry.stream.textDeltas).toBe(789);
});
