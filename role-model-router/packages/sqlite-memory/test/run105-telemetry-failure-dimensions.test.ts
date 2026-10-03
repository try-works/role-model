import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, expect, test } from "vitest";
import { initializeSqliteMemory, persistRuntimeTelemetryFailure, projectRuntimeTelemetryFailureDimensions, type RuntimeObservationGraphStore } from "../src/index.js";
const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
const actual = JSON.parse(readFileSync(new URL("../../../../.recursive/run/105-route-learning-matching-scope-activation/evidence/phase35/r15-hotfix-build/diagnostic-actual-observation.json", import.meta.url), "utf8"));
function persistCase(dimensions: Record<string, unknown>, observation: Record<string, unknown>, graph: boolean, expectedError?: RegExp) {
  const root = mkdtempSync(path.join(os.tmpdir(), "r15-dimensions-")); roots.push(root);
  const { databasePath } = initializeSqliteMemory({ runtimeStateRoot: root, scopeId: "r15-dimensions", channel: "development" });
  const graphStore: RuntimeObservationGraphStore | undefined = graph ? { scopeId: "r15-dimensions",
    write(input) { const artifactPath = path.join(root, "dimensions.json"); writeFileSync(artifactPath, input.content); return { artifactId: "dimensions-artifact", artifactPath, contentHash: input.contentHash }; },
    read(ref) { return readFileSync(ref.artifactPath!, "utf8"); },
  } : undefined;
  let error: unknown;
  try { persistRuntimeTelemetryFailure({ databasePath, requestId: "r15-diagnostic-actual", routingDecisionId: "decision-r15-diagnostic-actual", endpointId: "routing.failed.pre-execution", statusCode: 422, errorClass: "execution_failed", retryCount: 2, rerouteCount: 1, streamTextDeltaCount: 789, streamToolCallDeltaCount: 3, streamToolArgumentDeltaCount: 7, dimensions, observation, ...(graphStore ? { graphStore } : {}) }); } catch (caught) { error = caught; }
  if (error) console.log("R15 actual dimensions reproduction:", (error as Error).message);
  if (expectedError) { expect(error).toBeInstanceOf(Error); expect((error as Error).message).toMatch(expectedError); return undefined as never; }
  expect(error, "actual live dimensions must not interrupt primary failure persistence").toBeUndefined();
  const db = new DatabaseSync(databasePath);
  try {
    const row = db.prepare("SELECT * FROM runtime_telemetry_records WHERE request_id='r15-diagnostic-actual'").get() as any;
    expect(row).toMatchObject({ request_id: "r15-diagnostic-actual", routing_decision_id: "decision-r15-diagnostic-actual", endpoint_id: "routing.failed.pre-execution", status_code: 422, error_class: "execution_failed", retry_count: 2, reroute_count: 1, stream_text_delta_count: 789, stream_tool_call_delta_count: 3, stream_tool_argument_delta_count: 7 });
    expect(Buffer.byteLength(row.dimensions_json, "utf8")).toBeLessThanOrEqual(16384);
    console.log("R15 final dimensions bytes:", Buffer.byteLength(row.dimensions_json, "utf8"));
    return { dimensions: JSON.parse(row.dimensions_json), graphStore, payload: row.dimensions_json };
  } finally { db.close(); }
}
for (const bytes of [16383, 16384, 16385]) test("R15 necessary metadata boundary " + bytes, () => {
  const base = { taxonomyRoleId: "coder", necessaryMetadata: "" };
  const value = { ...base, necessaryMetadata: "界".repeat(Math.floor((bytes - Buffer.byteLength(JSON.stringify(base))) / 3)) };
  value.necessaryMetadata += "x".repeat(bytes - Buffer.byteLength(JSON.stringify(value)));
  expect(Buffer.byteLength(JSON.stringify(value))).toBe(bytes);
  expect(projectRuntimeTelemetryFailureDimensions(value)).toEqual(value);
  if (bytes <= 16384) expect(persistCase(value, actual.observation, false).dimensions).toEqual(value);
  else persistCase(value, actual.observation, false, /runtime telemetry dimensions_json exceeds 16384 bytes/);
});
for (const bytes of [8191, 8192, 8193]) test("R15 diagnostic facts aggregate boundary " + bytes, () => {
  const base = { errorContext: { endpointId: "" } };
  base.errorContext.endpointId = "x".repeat(bytes - Buffer.byteLength(JSON.stringify(base)));
  const projected = projectRuntimeTelemetryFailureDimensions(base)!;
  expect(projected.errorContext).toEqual(base.errorContext);
  if (bytes > 8192) expect(projected.compactTruncation).toMatchObject({ reason: "diagnostic_facts_budget", diagnosticFactsAvailable: true });
});
for (const graph of [false, true]) test("R15 exact saved live dimensions input persists (graph=" + graph + ")", () => {
  expect(Buffer.byteLength(JSON.stringify(actual.dimensions), "utf8")).toBe(240535);
  const before = JSON.stringify(actual);
  const { dimensions, graphStore, payload } = persistCase(actual.dimensions, actual.observation, graph);
  expect(dimensions.errorContext).toMatchObject({ statusCode: 422, code: "execution_failed", endpointId: actual.dimensions.errorContext.endpointId, providerId: "deepseek" });
  expect(dimensions.errorContext.errorPreview).toMatchObject({ statusCode: 422, code: "r15_mock_contract_rejection", type: "invalid_request_error", messageTruncated: true });
  expect(dimensions.errorContext.messageTruncated).toBe(true);
  expect(dimensions.compactTruncation).toMatchObject({ originalUtf8Bytes: 240535 });
  expect(payload).not.toContain(actual.dimensions.errorContext.message);
  if (graphStore) { expect(dimensions.artifactRef).toBeDefined(); const rich = JSON.parse(graphStore.read(dimensions.artifactRef)); expect(rich.telemetryDimensions).toEqual(actual.dimensions); expect(rich.requestId).toBe(actual.observation.requestId); }
  else expect(dimensions.artifactRef).toBeUndefined();
  expect(JSON.stringify(actual)).toBe(before);
});
test("R15 dimensions bound Unicode lists and aggregate while preserving primary facts and privacy", () => {
  const diagnostic = { ...actual.dimensions.errorContext, message: "😀界\u0000".repeat(5000), errorPreview: { message: "界😀".repeat(5000), statusCode: 503, code: "provider_unavailable", responseBody: "PRIVATE-RESPONSE" } };
  const input = { errorContext: diagnostic, failedAttempts: Array.from({ length: 100 }, (_, i) => ({ ...diagnostic, attemptId: "attempt-" + i })), diagnostics: Array.from({ length: 100 }, () => "界".repeat(1000)), prompt: "PRIVATE-PROMPT", responseBody: "PRIVATE-BODY", requestId: "r15-diagnostic-actual" };
  const { dimensions, payload } = persistCase(input, actual.observation, false);
  expect(dimensions.failedAttempts.length).toBeLessThanOrEqual(8);
  expect(dimensions.failedAttempts[0]).toMatchObject({ attemptId: "attempt-0", statusCode: 422, code: "execution_failed" });
  expect(dimensions.compactTruncation).toHaveProperty("omittedFields");
  expect(dimensions.requestId).toBe(input.requestId);
  expect(Buffer.byteLength(JSON.stringify({ errorContext: dimensions.errorContext, failedAttempts: dimensions.failedAttempts }), "utf8")).toBeLessThanOrEqual(8192);
  for (const secret of ["PRIVATE-RESPONSE", "PRIVATE-PROMPT", "PRIVATE-BODY"]) expect(payload).not.toContain(secret);
});
