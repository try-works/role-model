import { createHash, createHmac, createPublicKey, generateKeyPairSync, sign } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import {
  readRuntimeObservationStorageRecord,
  readRuntimeTelemetryRecord,
  resolveSqliteMemoryLocation,
} from "@role-model-router/sqlite-memory";
import { afterEach, describe, expect, test, vi } from "vitest";
import { LegacySqliteMigration } from "../../../packages/sqlite-memory/src/legacy-migration.js";

import { applyRecommendationServiceLauncherConfig } from "../src/cli.js";
import { createRuntimeBridgeBackend, startBridgeServer } from "../src/index.js";
import {
  buildGraphEvidenceFromCapture,
  buildLegacyTerminalFailureRecoveryCapture,
  buildProviderEvidenceFromObservation,
  buildVerifiersLiveExport,
  createTrackBOperations,
  seedTrackBExtensionBridgeState,
} from "../src/track-b-operations.js";

const repoRoot = path.resolve(import.meta.dirname, "..", "..", "..", "..");
const fixtureRoot = path.join(import.meta.dirname, "fixtures");
const canonicalJson = (value: unknown): string =>
  Array.isArray(value)
    ? `[${value.map(canonicalJson).join(",")}]`
    : value && typeof value === "object"
      ? `{${Object.keys(value)
          .sort()
          .map(
            (key) =>
              `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`,
          )
          .join(",")}}`
      : JSON.stringify(value);
const roots: string[] = [];
afterEach(async () => {
  vi.unstubAllGlobals();
  delete process.env.ROLE_MODEL_RECOMMENDATION_SERVICE_URL;
  delete process.env.ROLE_MODEL_RECOMMENDATION_VERIFICATION_KEY;
  delete process.env.ROLE_MODEL_RECOMMENDATION_SERVICE_TOKEN;
  delete process.env.ROLE_MODEL_RECOMMENDATION_CHANNEL;
  delete process.env.ROLE_MODEL_RECOMMENDATION_SCOPE;
  delete process.env.ROLE_MODEL_AGGREGATE_SCOPE;
  delete process.env.ROLE_MODEL_TRACK_B_OPERATIONS_URL;
  delete process.env.ROLE_MODEL_TRACK_B_OPERATIONS_TOKEN;
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("Track B operations APIs", () => {
  test("retries durable contribution aggregates without manufacturing another request", async () => {
    const token = "run95-contribution-retry-token";
    const server = createServer((request, response) => {
      expect(request.method).toBe("POST");
      expect(request.url).toBe("/contribution/retry");
      expect(request.headers.authorization).toBe(`Bearer ${token}`);
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ status: "uploaded", delivered: 1, queued: 0 }));
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("operations server did not bind");
    try {
      const operations = createTrackBOperations({
        statePath: path.join(os.tmpdir(), "run95-contribution-retry-state.json"),
        catalog: [],
        operationsEndpoint: `http://127.0.0.1:${address.port}`,
        operationsToken: token,
      });
      await expect(operations.retryContributionAggregates()).resolves.toEqual({
        status: "uploaded",
        delivered: 1,
        queued: 0,
      });
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });

  test("builds provider evidence and a semantic Verifiers export from the exact durable graph", () => {
    const observation = {
      requestId: "request-export-94",
      routingDecisionId: "decision-export-94",
      endpointId: "endpoint-export-94",
      usageEvent: { model_id: "provider/model-export-94" },
      run88Correlation: { correlationId: "correlation-export-94" },
      executionSemantics: {
        failedAttempts: [{ attemptId: "request-export-94:attempt:1" }],
      },
    };
    expect(buildProviderEvidenceFromObservation(observation)).toEqual({
      endpointId: "endpoint-export-94",
      modelId: "provider/model-export-94",
      status: "ok",
      attemptIds: ["request-export-94:attempt:1", "request-export-94:attempt:2"],
    });
    const capture = {
      schemaVersion: "role-model.route-capture-read.v1",
      requestId: "request-export-94",
      routingDecisionId: "decision-export-94",
      rootArtifactId: "root-export-94",
      messages: [
        { nodeId: "node-system-94", role: "system", content: "route safely" },
        { nodeId: "node-user-94", role: "user", content: "route this" },
        {
          nodeId: "node-assistant-tool-94",
          role: "assistant",
          content: null,
          toolCalls: [
            {
              id: "call-pi-94",
              type: "function",
              function: { name: "bash", arguments: '{"command":"printf run94-tool-ok"}' },
            },
          ],
        },
        {
          nodeId: "node-tool-message-94",
          role: "tool",
          content: "run94-tool-ok",
          toolCallId: "call-pi-94",
          name: "bash",
        },
      ],
      response: { nodeId: "node-response-94", role: "assistant", content: "routed" },
      tools: [
        { nodeId: "node-tool-execution-94", kind: "tool_execution", toolName: "router-tool" },
        {
          nodeId: "node-tool-call-94",
          kind: "tool_call",
          toolCallId: "call-pi-94",
          toolName: "bash",
        },
        {
          nodeId: "node-tool-result-94",
          kind: "tool_result",
          toolCallId: "call-pi-94",
          toolName: "bash",
        },
      ],
      captureMetrics: {
        captureCpuMs: 4,
        captureWallMs: 7,
        sqliteLockWaitMs: 1,
        queueDepthBefore: 0,
        queueDepthAfter: 0,
        filesystemBytesBefore: 300,
        filesystemBytesAfter: 400,
        casBytesBefore: 100,
        casBytesAfter: 140,
        normalizedStateBytesBefore: 200,
        normalizedStateBytesAfter: 260,
        archiveManifestInlineContentBytes: 0,
      },
      edgeCount: 6,
    };
    expect(buildGraphEvidenceFromCapture(capture)).toEqual({
      rootArtifactId: "root-export-94",
      messageNodeIds: [
        "node-system-94",
        "node-user-94",
        "node-assistant-tool-94",
        "node-tool-message-94",
      ],
      responseNodeId: "node-response-94",
      toolExecutionNodeIds: ["node-tool-execution-94"],
      toolCallNodeIds: ["node-tool-call-94"],
      toolResultNodeIds: ["node-tool-result-94"],
      captureMetrics: capture.captureMetrics,
      edgeCount: 6,
    });
    const exported = buildVerifiersLiveExport({
      channel: "development",
      request: {
        requestId: "request-export-94",
        correlationId: "correlation-export-94",
        graphRootArtifactId: "root-export-94",
        readiness: "semantic",
        taskIndex: 7,
      },
      observation,
      capture,
    });
    expect(exported).toMatchObject({
      schemaVersion: "role-model.verifiers-live-export.v1",
      channel: "development",
      requestId: "request-export-94",
      correlationId: "correlation-export-94",
      graphRootArtifactId: "root-export-94",
      responseNodeIndex: 4,
      tokenExactDisposition: "refused_missing_evidence",
      trace: {
        task: {
          type: "RoleModelTraceTask",
          data: {
            idx: 7,
            prompt: "route this",
          },
        },
        nodes: [
          { parent: null, message: { role: "system", content: "route safely" }, sampled: false },
          { parent: 0, message: { role: "user", content: "route this" }, sampled: false },
          {
            parent: 1,
            message: {
              role: "assistant",
              content: null,
              tool_calls: [
                { id: "call-pi-94", name: "bash", arguments: '{"command":"printf run94-tool-ok"}' },
              ],
            },
            sampled: false,
          },
          {
            parent: 2,
            message: {
              role: "tool",
              content: "run94-tool-ok",
              tool_call_id: "call-pi-94",
              name: "bash",
            },
            sampled: false,
          },
          { parent: 3, message: { role: "assistant", content: "routed" }, sampled: true },
        ],
        info: {
          routeDecisionId: "decision-export-94",
          roleModelGraphRootArtifactId: "root-export-94",
          roleModelResponseNodeId: "node-response-94",
        },
      },
    });
    expect(() =>
      buildVerifiersLiveExport({
        channel: "development",
        request: {
          requestId: "request-export-94",
          correlationId: "correlation-export-94",
          graphRootArtifactId: "wrong-root",
          readiness: "semantic",
          taskIndex: 7,
        },
        observation,
        capture,
      }),
    ).toThrow(/exact live graph/i);
    expect(() =>
      buildVerifiersLiveExport({
        channel: "development",
        request: {
          requestId: "request-export-94",
          correlationId: "correlation-export-94",
          graphRootArtifactId: "root-export-94",
          readiness: "semantic",
        },
        observation,
        capture,
      }),
    ).toThrow(/task index/i);
    const failureExport = buildVerifiersLiveExport({
      channel: "development",
      request: {
        requestId: "request-export-94",
        correlationId: "correlation-export-94",
        graphRootArtifactId: "root-export-94",
        readiness: "semantic",
        taskIndex: 8,
      },
      observation,
      capture: {
        ...capture,
        terminalState: "provider_error",
        failure: {
          errorClass: "provider_unavailable",
          statusCode: 503,
          message: "provider unavailable",
        },
        response: {
          nodeId: "node-response-94",
          role: "assistant",
          content: null,
          failure: {
            errorClass: "provider_unavailable",
            statusCode: 503,
            message: "provider unavailable",
          },
        },
      },
    });
    expect(failureExport).toMatchObject({
      trace: {
        task: { data: { idx: 8, prompt: "route this" } },
        nodes: expect.arrayContaining([
          expect.objectContaining({
            message: { role: "assistant", content: null },
            sampled: false,
            finish_reason: "stop",
          }),
        ]),
        is_completed: true,
        stop_condition: "provider_error",
        errors: [
          { type: "provider_unavailable", message: "provider unavailable", traceback: null },
        ],
        info: expect.objectContaining({
          providerStatusCode: 503,
          limitations: expect.arrayContaining(["provider failed before a sampled completion"]),
        }),
      },
    });
  });

  test("preserves metadata-only legacy failure recovery and refuses to invent a Verifiers prompt", () => {
    const capture = {
      schemaVersion: "role-model.route-capture-read.v1",
      requestId: "request-legacy-failure-94",
      routingDecisionId: "decision-legacy-failure-94",
      rootArtifactId: "root-legacy-failure-94",
      projectionCompleteness: "metadata_only",
      recovery: {
        kind: "legacy_terminal_failure",
        source: "persisted_runtime_observation",
      },
      messages: [],
      response: {
        nodeId: "response-legacy-failure-94",
        role: "assistant",
        content: null,
        failure: {
          errorClass: "provider_auth_error",
          statusCode: 401,
          message: "provider rejected router-owned credentials",
        },
      },
      terminalState: "provider_error",
      failure: {
        errorClass: "provider_auth_error",
        statusCode: 401,
        message: "provider rejected router-owned credentials",
      },
      tools: [],
      edgeCount: 1,
    };
    expect(buildGraphEvidenceFromCapture(capture)).toEqual({
      rootArtifactId: "root-legacy-failure-94",
      messageNodeIds: [],
      responseNodeId: "response-legacy-failure-94",
      toolExecutionNodeIds: [],
      toolCallNodeIds: [],
      toolResultNodeIds: [],
      projectionCompleteness: "metadata_only",
      recovery: {
        kind: "legacy_terminal_failure",
        source: "persisted_runtime_observation",
      },
      edgeCount: 1,
    });
    expect(() =>
      buildVerifiersLiveExport({
        channel: "development",
        request: {
          requestId: "request-legacy-failure-94",
          correlationId: "correlation-legacy-failure-94",
          graphRootArtifactId: "root-legacy-failure-94",
          readiness: "semantic",
          taskIndex: 2,
        },
        observation: {
          requestId: "request-legacy-failure-94",
          routingDecisionId: "decision-legacy-failure-94",
          correlationId: "correlation-legacy-failure-94",
        },
        capture,
      }),
    ).toThrow(/prompt content/i);
  });

  test("derives metadata-only recovery solely from a persisted terminal failure", () => {
    const observation = {
      requestId: "request-legacy-failure-94",
      routingDecisionId: "decision-legacy-failure-94",
      endpointId: "endpoint-legacy-failure-94",
      reasoningEffort: "high",
      effortSource: "variant",
      statusFamily: "failure",
      correlationId: "correlation-legacy-failure-94",
      usageEvent: { model_id: "provider/model-legacy-failure-94" },
      failure: { errorClass: "provider_auth_error", statusCode: 401, latencyMs: 17 },
      inspection: { request: { requestCapture: { body: "must-not-be-recovered" } } },
    };
    expect(buildLegacyTerminalFailureRecoveryCapture(observation)).toEqual({
      requestId: "request-legacy-failure-94",
      routingDecisionId: "decision-legacy-failure-94",
      endpointId: "endpoint-legacy-failure-94",
      modelId: "provider/model-legacy-failure-94",
      reasoningEffort: "high",
      effortSource: "variant",
      messages: [],
      projectionCompleteness: "metadata_only",
      recovery: {
        kind: "legacy_terminal_failure",
        source: "persisted_runtime_observation",
      },
      failure: {
        errorClass: "provider_auth_error",
        statusCode: 401,
        message: "Persisted runtime observation recorded provider_auth_error (HTTP 401).",
      },
      toolExecutions: [],
    });
    expect(() =>
      buildLegacyTerminalFailureRecoveryCapture({ ...observation, statusFamily: "success" }),
    ).toThrow(/terminal failure/i);
    expect(() =>
      buildLegacyTerminalFailureRecoveryCapture({ ...observation, failure: undefined }),
    ).toThrow(/terminal failure/i);
  });

  test("reads one exact graph capture through the authenticated loopback sidecar", async () => {
    const received: Array<{ path: string; authorization?: string; body: unknown }> = [];
    const operations = createServer(async (request, response) => {
      let body = "";
      for await (const chunk of request) body += chunk;
      received.push({
        path: request.url ?? "",
        authorization: request.headers.authorization,
        body: JSON.parse(body),
      });
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          schemaVersion: "role-model.route-capture-read.v1",
          requestId: "request-exact-94",
          routingDecisionId: "decision-exact-94",
          rootArtifactId: "root-exact-94",
          messages: [{ nodeId: "message-exact-94", role: "user", content: "route me" }],
          response: { nodeId: "response-exact-94", role: "assistant", content: "routed" },
          tools: [],
          edgeCount: 2,
        }),
      );
    });
    await new Promise<void>((resolve, reject) => {
      operations.once("error", reject);
      operations.listen(0, "127.0.0.1", resolve);
    });
    try {
      const address = operations.address();
      if (!address || typeof address === "string")
        throw new Error("operations server did not bind");
      const api = createTrackBOperations({
        statePath: path.join(os.tmpdir(), `run94-exact-capture-${Date.now()}.json`),
        catalog: [],
        operationsEndpoint: `http://127.0.0.1:${address.port}`,
        operationsToken: "run94-exact-capture-token-0001",
      });
      const exact = await api.readLocalRouteCapture({ requestId: "request-exact-94" });
      expect(exact).toMatchObject({
        schemaVersion: "role-model.route-capture-read.v1",
        requestId: "request-exact-94",
        rootArtifactId: "root-exact-94",
      });
      expect(received).toEqual([
        {
          path: "/capture/read",
          authorization: "Bearer run94-exact-capture-token-0001",
          body: { requestId: "request-exact-94" },
        },
      ]);
    } finally {
      await new Promise<void>((resolve, reject) =>
        operations.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });

  test("reads the measured no-rich baseline through the authenticated loopback sidecar", async () => {
    const received: Array<{ path: string; authorization?: string; body: unknown }> = [];
    const operations = createServer(async (request, response) => {
      let body = "";
      for await (const chunk of request) body += chunk;
      received.push({
        path: request.url ?? "",
        authorization: request.headers.authorization,
        body: JSON.parse(body),
      });
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          schemaVersion: "role-model.no-rich-capture-baseline-channel.v1",
          sourceMode: "measured_capture_disabled_packaged_runtime",
          channel: "development",
          sampleCount: 5,
          captureCpuP95Ms: 12,
          providerPathLatencyP95Ms: 18,
          sqliteLockWaitP95Ms: 2,
        }),
      );
    });
    await new Promise<void>((resolve, reject) => {
      operations.once("error", reject);
      operations.listen(0, "127.0.0.1", resolve);
    });
    try {
      const address = operations.address();
      if (!address || typeof address === "string")
        throw new Error("operations server did not bind");
      const api = createTrackBOperations({
        statePath: path.join(os.tmpdir(), `run94-no-rich-baseline-${Date.now()}.json`),
        catalog: [],
        operationsEndpoint: `http://127.0.0.1:${address.port}`,
        operationsToken: "run94-baseline-token-0001",
      });
      await expect(api.measureNoRichCaptureBaseline({ sampleCount: 5 })).resolves.toMatchObject({
        schemaVersion: "role-model.no-rich-capture-baseline-channel.v1",
        channel: "development",
        sampleCount: 5,
      });
      expect(received).toEqual([
        {
          path: "/capture/performance-baseline",
          authorization: "Bearer run94-baseline-token-0001",
          body: { sampleCount: 5 },
        },
      ]);
    } finally {
      await new Promise<void>((resolve, reject) =>
        operations.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });

  test("fails closed instead of issuing unauthenticated calls to an owned operations endpoint", async () => {
    const runtimeStateRoot = path.join(os.tmpdir(), `track-b-operations-auth-${Date.now()}`);
    roots.push(runtimeStateRoot);
    const backend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot,
      runtimeStateRoot,
      scopeId: "track-b-operations-auth",
      trackBOperationsEndpoint: "http://127.0.0.1:1",
    });

    await expect(backend.readStorageRetention()).rejects.toThrow(
      /launcher-issued authentication token/i,
    );
    await backend.shutdown();
  });

  test("serves extension lifecycle and storage retention through bounded callbacks", async () => {
    const runtimeStateRoot = path.join(os.tmpdir(), `track-b-operations-${Date.now()}`);
    roots.push(runtimeStateRoot);
    const backend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot,
      runtimeStateRoot,
      scopeId: "track-b-operations",
    });
    const extensions = [
      {
        id: "artifact-store",
        packageClass: "canonical_extension",
        lifecycle: "ready",
        installed: true,
        enabled: true,
        channel: "production",
        scope: "global",
        authorizationEpoch: 2,
        health: { available: true, routingDependency: false },
        permissions: ["graph:write"],
        dataClasses: ["rich_artifact"],
        retention: "policy_bound",
        degradation: "routing_continues",
        compatibility: ["N/N", "N/N-1"],
      },
    ];
    const summary = {
      totalBytes: 100,
      categories: [{ id: "graph", tier: "canonical", scope: "global", bytes: 100, count: 2 }],
      managedPolicy: false,
      conflicts: [],
      receipts: [],
      activeJob: null,
    };
    let dryRunCount = 0;
    const graphMutationCallbacks = {
      advanceGraphMigration: async (body: Record<string, unknown>) => ({
        action: "advance",
        state: "shadow_mirror",
        verified: body,
      }),
      rollbackGraphMigration: async () => ({ action: "rollback", state: "legacy_primary" }),
    };
    const server = await startBridgeServer({
      host: "127.0.0.1",
      port: 0,
      registry: backend.registry,
      getRegistry: () => backend.registry,
      executeChatCompletions: backend.executeChatCompletions,
      executeResponses: backend.executeResponses,
      listExtensions: async () => extensions,
      readGraphMigration: async () => ({
        state: "graph_primary",
        migrationId: "tb04-legacy-graph-performance-v1",
      }),
      ...graphMutationCallbacks,
      readStorageRetention: async () => summary,
      dryRunStorageRetention: async () => ({
        ...summary,
        receipts: [
          {
            id: `dry-${++dryRunCount}`,
            status: "preview",
            affectedCount: 2,
            rollbackAvailable: true,
          },
        ],
      }),
      updateStorageRetentionPolicy: async (body) => ({ ...summary, policies: [body] }),
      executeStorageRetention: async () => ({
        ...summary,
        activeJob: { id: "job-1", status: "running", progress: 0 },
      }),
      cancelStorageRetentionJob: async () => ({
        ...summary,
        activeJob: { id: "job-1", status: "cancelled", progress: 0 },
      }),
      rollbackStorageRetention: async () => ({
        ...summary,
        receipts: [{ id: "rollback-1", status: "rolled_back" }],
      }),
      readContributionState: async () => ({
        mode: "contributor",
        authorizationState: "pending_disclosure",
      }),
      updateContributionState: async (body) => ({
        mode: body.action === "opt_out" ? "consumer" : "contributor",
        authorizationState: "revoked",
      }),
      listRecommendations: async () => [{ id: "pack-1", signatureValid: true }],
      applyRecommendation: async () => ({ activePack: { id: "pack-1", version: "1" } }),
      readActivePack: async () => ({ id: "pack-1", version: "1" }),
      exportVerifiersTrace: async (body) => ({
        schemaVersion: "role-model.verifiers-live-export.v1",
        requestId: body.requestId,
        graphRootArtifactId: body.graphRootArtifactId,
      }),
      recoverLegacyTerminalFailure: async (body) => ({
        schemaVersion: "role-model.legacy-terminal-failure-recovery.v1",
        requestId: body.requestId,
        status: "recovered",
      }),
    });
    try {
      const base = `http://127.0.0.1:${server.port}`;
      expect(await (await fetch(`${base}/api/role-model/extensions`)).json()).toEqual(extensions);
      expect(await (await fetch(`${base}/api/role-model/graph-migration`)).json()).toEqual({
        state: "graph_primary",
        migrationId: "tb04-legacy-graph-performance-v1",
      });
      const advanced = await fetch(`${base}/api/role-model/graph-migration/advance`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          backupVerified: true,
          restoreVerified: true,
          consumersVerified: true,
        }),
      });
      expect(advanced.status).toBe(200);
      expect(await advanced.json()).toMatchObject({ action: "advance", state: "shadow_mirror" });
      const rolledBack = await fetch(`${base}/api/role-model/graph-migration/rollback`, {
        method: "POST",
      });
      expect(rolledBack.status).toBe(200);
      expect(await rolledBack.json()).toEqual({ action: "rollback", state: "legacy_primary" });
      expect(await (await fetch(`${base}/api/role-model/storage-retention`)).json()).toEqual(
        summary,
      );
      const dryRun = await fetch(`${base}/api/role-model/storage-retention/dry-run`, {
        method: "POST",
      });
      expect(dryRun.status).toBe(200);
      expect((await dryRun.json()).receipts[0].id).toBe("dry-1");
      expect((await (await fetch(`${base}/api/role-model/contribution`)).json()).mode).toBe(
        "contributor",
      );
      expect(
        (
          await (
            await fetch(`${base}/api/role-model/contribution`, {
              method: "PUT",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ action: "opt_out" }),
            })
          ).json()
        ).mode,
      ).toBe("consumer");
      expect((await (await fetch(`${base}/api/role-model/recommendations`)).json())[0].id).toBe(
        "pack-1",
      );
      expect(
        (
          await (
            await fetch(`${base}/api/role-model/recommendations/apply`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ id: "pack-1" }),
            })
          ).json()
        ).activePack.id,
      ).toBe("pack-1");
      expect(
        (
          await (
            await fetch(`${base}/api/role-model/storage-retention/execute`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ manifestHash: "a".repeat(64) }),
            })
          ).json()
        ).activeJob.status,
      ).toBe("running");
      const exported = await fetch(`${base}/api/role-model/track-b/verifiers-export`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          requestId: "request-http-export-94",
          correlationId: "correlation-http-export-94",
          graphRootArtifactId: "root-http-export-94",
          readiness: "semantic",
        }),
      });
      expect(exported.status).toBe(200);
      expect(await exported.json()).toEqual({
        schemaVersion: "role-model.verifiers-live-export.v1",
        requestId: "request-http-export-94",
        graphRootArtifactId: "root-http-export-94",
      });
      const recovered = await fetch(`${base}/api/role-model/track-b/recover-terminal-failure`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          requestId: "request-http-recovery-94",
          acknowledgeMetadataOnly: true,
        }),
      });
      expect(recovered.status).toBe(200);
      expect(await recovered.json()).toEqual({
        schemaVersion: "role-model.legacy-terminal-failure-recovery.v1",
        requestId: "request-http-recovery-94",
        status: "recovered",
      });
    } finally {
      await server.close();
      await backend.shutdown();
    }
  });

  test("fails closed when an operations capability is not wired", async () => {
    const runtimeStateRoot = path.join(os.tmpdir(), `track-b-operations-absent-${Date.now()}`);
    roots.push(runtimeStateRoot);
    const backend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot,
      runtimeStateRoot,
      scopeId: "track-b-operations-absent",
    });
    const server = await startBridgeServer({
      host: "127.0.0.1",
      port: 0,
      registry: backend.registry,
      getRegistry: () => backend.registry,
      executeChatCompletions: backend.executeChatCompletions,
      executeResponses: backend.executeResponses,
    });
    try {
      expect(
        (await fetch(`http://127.0.0.1:${server.port}/api/role-model/extensions`)).status,
      ).toBe(404);
    } finally {
      await server.close();
      await backend.shutdown();
    }
  });

  test("production backend never infers extension health from the catalog", async () => {
    const runtimeStateRoot = path.join(os.tmpdir(), `track-b-production-absent-${Date.now()}`);
    roots.push(runtimeStateRoot);
    const backend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot,
      runtimeStateRoot,
      scopeId: "production",
    });
    try {
      const rows = (await backend.listExtensions()) as readonly {
        installed: boolean;
        lifecycle: string;
        health: { available: boolean };
      }[];
      expect(rows).toHaveLength(13);
      expect(
        rows.every(
          (row) => !row.installed && row.lifecycle === "unavailable" && !row.health.available,
        ),
      ).toBe(true);
    } finally {
      await backend.shutdown();
    }
  });

  test("local Track B bridge seed marks catalog extensions ready without ExtensionHost override", async () => {
    const runtimeStateRoot = path.join(os.tmpdir(), `track-b-seeded-${Date.now()}`);
    roots.push(runtimeStateRoot);
    const contract = JSON.parse(
      await readFile(
        path.join(repoRoot, "packages", "protocol-types", "generated", "product-contracts.json"),
        "utf8",
      ),
    ) as { extensions: readonly Record<string, unknown>[] };
    await seedTrackBExtensionBridgeState({
      statePath: path.join(runtimeStateRoot, "production", "track-b-production-bridge.json"),
      catalog: contract.extensions,
    });
    const backend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot,
      runtimeStateRoot,
      scopeId: "production",
    });
    try {
      const rows = (await backend.listExtensions()) as readonly {
        id: string;
        installed: boolean;
        lifecycle: string;
        enabled: boolean;
        health: { available: boolean };
      }[];
      expect(rows).toHaveLength(13);
      expect(
        rows.every(
          (row) =>
            row.installed && row.enabled && row.lifecycle === "ready" && row.health.available,
        ),
      ).toBe(true);
    } finally {
      await backend.shutdown();
    }
  });

  test("production backend reports readiness only from the supervised ExtensionHost", async () => {
    const runtimeStateRoot = path.join(os.tmpdir(), `track-b-production-hosted-${Date.now()}`);
    roots.push(runtimeStateRoot);
    const backend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot,
      runtimeStateRoot,
      scopeId: "production",
      trackBExtensionHealth: () => ({
        host: { extensions: ["artifact-store", "event-log"] },
        supervisor: { "artifact-store": { status: "ready" }, "event-log": { status: "ready" } },
      }),
    });
    try {
      const rows = (await backend.listExtensions()) as readonly {
        id: string;
        installed: boolean;
        lifecycle: string;
        health: { available: boolean };
      }[];
      expect(
        rows
          .filter((row) => row.health.available)
          .map((row) => row.id)
          .sort(),
      ).toEqual(["artifact-store", "event-log"]);
      expect(rows.find((row) => row.id === "artifact-store")).toMatchObject({
        installed: true,
        lifecycle: "ready",
        health: { available: true },
      });
      expect(rows.find((row) => row.id === "repository-context")).toMatchObject({
        installed: false,
        lifecycle: "unavailable",
        health: { available: false },
      });
    } finally {
      await backend.shutdown();
    }
  });

  test("production backend clean start uses the canonical Advanced aggregate defaults", async () => {
    const runtimeStateRoot = path.join(os.tmpdir(), `track-b-production-fresh-${Date.now()}`);
    roots.push(runtimeStateRoot);
    const backend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot,
      runtimeStateRoot,
      scopeId: "production",
    });
    try {
      expect(await backend.readContributionState()).toEqual({
        mode: "contributor",
        contributionTier: "advanced",
        recommendationTier: "advanced",
        recommendationAccess: "preview_and_apply",
        allowCloudUpload: true,
        authorizationState: "pending_disclosure",
        revocationEpoch: 0,
        queuedCount: 0,
        managed: false,
        disclosureId: null,
      });
    } finally {
      await backend.shutdown();
    }
  });

  test("production request completion reports only aggregate metrics to the private operations boundary", async () => {
    const runtimeStateRoot = path.join(os.tmpdir(), `track-b-production-upload-${Date.now()}`);
    roots.push(runtimeStateRoot);
    const received: Array<{ path: string; authorization?: string; body: Record<string, unknown> }> =
      [];
    let routeCapture: Record<string, unknown> | null = null;
    const operations = createServer(async (request, response) => {
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(Buffer.from(chunk));
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>;
      if (request.url === "/capture/route") routeCapture = body;
      received.push({
        path: request.url ?? "",
        authorization: request.headers.authorization,
        body,
      });
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify(
          request.url === "/capture/read"
            ? {
                schemaVersion: "role-model.route-capture-read.v1",
                requestId: "req-track-b-upload-001",
                routingDecisionId: routeCapture?.routingDecisionId,
                rootArtifactId: "artifact-route-capture",
                messages: (routeCapture?.messages as unknown[]).map((message, index) => ({
                  nodeId: `message-route-capture-${index}`,
                  ...(message as object),
                })),
                response: {
                  nodeId: "response-route-capture",
                  role: "assistant",
                  content: routeCapture?.outputText,
                },
                tools: [],
                captureMetrics: {
                  captureCpuMs: 4,
                  captureWallMs: 7,
                  sqliteLockWaitMs: 1,
                  queueDepthBefore: 0,
                  queueDepthAfter: 0,
                  filesystemBytesBefore: 300,
                  filesystemBytesAfter: 400,
                  casBytesBefore: 100,
                  casBytesAfter: 140,
                  normalizedStateBytesBefore: 200,
                  normalizedStateBytesAfter: 260,
                  archiveManifestInlineContentBytes: 0,
                },
                edgeCount: 2,
              }
            : request.url === "/capture/route"
              ? {
                  status: "captured",
                  scope: "tenant:production-upload",
                  rootArtifactId: "artifact-route-capture",
                  rootArtifactDigest: "a".repeat(64),
                }
              : { status: "accepted" },
        ),
      );
    });
    await new Promise<void>((resolve, reject) => {
      operations.once("error", reject);
      operations.listen(0, "127.0.0.1", resolve);
    });
    const address = operations.address();
    if (!address || typeof address === "string") throw new Error("operations server did not bind");
    const trackBOperationsEndpoint = `http://127.0.0.1:${address.port}`;
    delete process.env.ROLE_MODEL_TRACK_B_OPERATIONS_URL;
    process.env.ROLE_MODEL_TRACK_B_OPERATIONS_TOKEN = "a".repeat(64);
    const backend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot,
      runtimeStateRoot,
      scopeId: "production-upload",
      trackBOperationsEndpoint,
      run88StageIdentity: {
        releaseId: `sha256:${"d".repeat(64)}`,
        sourceId: "e".repeat(40),
        executableSha256: "c".repeat(64),
      },
    });
    try {
      const databasePath = resolveSqliteMemoryLocation({
        runtimeStateRoot,
        scopeId: "production-upload",
      });
      const migration = new LegacySqliteMigration({
        databasePath,
        backupPath: path.join(runtimeStateRoot, "legacy-backup.sqlite"),
        artifactWriter: ({ contentHash }) => ({
          artifactId: contentHash,
          artifactPath: `artifact://${contentHash}`,
          contentHash,
        }),
        routerRoot: path.join(repoRoot, "role-model-router"),
      });
      migration.backfill({ scopeId: "tenant:production-upload", batchSize: 10 });
      migration.enterShadowMirror({ deadlineMs: Date.now() + 10_000 });
      migration.verifyParity({
        backupVerified: true,
        restoreVerified: true,
        consumersVerified: true,
      });
      migration.cutover();
      const result = await backend.executeChatCompletions(
        {
          model: "deepseek/chat-capture-v1",
          messages: [{ role: "user", content: "private prompt must never cross the boundary" }],
        },
        "req-track-b-upload-001",
      );
      expect(result.outputText.length).toBeGreaterThan(0);
      expect(received).toHaveLength(2);
      const aggregate = received.find((entry) => entry.path === "/contribution/aggregate");
      const capture = received.find((entry) => entry.path === "/capture/route");
      expect(aggregate).toMatchObject({
        path: "/contribution/aggregate",
        authorization: `Bearer ${"a".repeat(64)}`,
        body: {
          requestId: "req-track-b-upload-001",
          correlationId: expect.stringMatching(/^corr-[a-f0-9]{24}$/),
          routingDecisionId: result.routingDecisionId,
          endpointId: result.endpointId,
          modelId: "deepseek/chat-capture-v1",
          reasoningEffort: null,
          effortSource: "none",
          taskType: "general.chat",
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
          success: true,
        },
      });
      const serialized = JSON.stringify(aggregate?.body);
      for (const forbidden of [
        "messages",
        "prompt",
        "response",
        "content",
        "toolOutput",
        "providerBody",
      ])
        expect(serialized).not.toContain(forbidden);
      expect(capture).toMatchObject({
        path: "/capture/route",
        body: {
          requestId: "req-track-b-upload-001",
          routingDecisionId: result.routingDecisionId,
          messages: [{ role: "user", content: "private prompt must never cross the boundary" }],
          outputText: result.outputText,
        },
      });
      expect(
        readRuntimeObservationStorageRecord({
          databasePath,
          requestId: "req-track-b-upload-001",
        }),
      ).toMatchObject({
        graphPrimary: true,
        artifactRef: {
          scopeId: "tenant:production-upload",
          artifactId: "artifact-route-capture",
          contentHash: "a".repeat(64),
        },
      });
      const detail = await backend.readRequestObservation("req-track-b-upload-001");
      const telemetry = readRuntimeTelemetryRecord({
        databasePath,
        requestId: "req-track-b-upload-001",
      });
      expect(telemetry?.latencyMs).toEqual(expect.any(Number));
      expect(detail).toMatchObject({
        correlationId: aggregate?.body.correlationId,
        latencyMs: telemetry?.latencyMs,
      });
      expect(detail?.providerEvidence).toMatchObject({
        endpointId: result.endpointId,
        modelId: "deepseek/chat-capture-v1",
        status: "ok",
        attemptIds: ["req-track-b-upload-001:attempt:1"],
      });
      expect(detail?.graphEvidence).toEqual({
        rootArtifactId: "artifact-route-capture",
        messageNodeIds: ["message-route-capture-0"],
        responseNodeId: "response-route-capture",
        toolExecutionNodeIds: [],
        toolCallNodeIds: [],
        toolResultNodeIds: [],
        captureMetrics: {
          captureCpuMs: 4,
          captureWallMs: 7,
          sqliteLockWaitMs: 1,
          queueDepthBefore: 0,
          queueDepthAfter: 0,
          filesystemBytesBefore: 300,
          filesystemBytesAfter: 400,
          casBytesBefore: 100,
          casBytesAfter: 140,
          normalizedStateBytesBefore: 200,
          normalizedStateBytesAfter: 260,
          archiveManifestInlineContentBytes: 0,
        },
        edgeCount: 2,
      });
      expect(
        (
          detail as unknown as {
            liveBudgetEvidence?: { compactObservationBytes?: number; runtimeRssBytes?: number };
          }
        ).liveBudgetEvidence,
      ).toMatchObject({
        compactObservationBytes: expect.any(Number),
        runtimeRssBytes: expect.any(Number),
      });
      expect(
        (detail as unknown as { liveBudgetEvidence: { compactObservationBytes: number } })
          .liveBudgetEvidence.compactObservationBytes,
      ).toBeLessThanOrEqual(16 * 1024);
      const telemetryDatabase = new DatabaseSync(databasePath);
      telemetryDatabase
        .prepare("DELETE FROM runtime_telemetry_records WHERE request_id=?")
        .run("req-track-b-upload-001");
      telemetryDatabase.close();
      expect(await backend.readRequestObservation("req-track-b-upload-001")).not.toHaveProperty(
        "inspection",
      );
      const correlationId = String(
        (detail as unknown as { run88Correlation?: { correlationId?: string } })?.run88Correlation
          ?.correlationId,
      );
      expect(correlationId).not.toBe("undefined");
      expect(
        await backend.exportVerifiersTrace({
          requestId: "req-track-b-upload-001",
          correlationId,
          graphRootArtifactId: "artifact-route-capture",
          readiness: "semantic",
          taskIndex: 3,
        }),
      ).toMatchObject({ responseNodeIndex: 1, tokenExactDisposition: "refused_missing_evidence" });
      const exportServer = await startBridgeServer({
        host: "127.0.0.1",
        port: 0,
        registry: backend.registry,
        getRegistry: () => backend.registry,
        executeChatCompletions: backend.executeChatCompletions,
        executeResponses: backend.executeResponses,
        exportVerifiersTrace: backend.exportVerifiersTrace,
      });
      try {
        const response = await fetch(
          `http://127.0.0.1:${exportServer.port}/api/role-model/track-b/verifiers-export`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              requestId: "req-track-b-upload-001",
              correlationId,
              graphRootArtifactId: "artifact-route-capture",
              readiness: "semantic",
              taskIndex: 3,
            }),
          },
        );
        expect(response.status).toBe(200);
        expect(await response.json()).toMatchObject({
          requestId: "req-track-b-upload-001",
          graphRootArtifactId: "artifact-route-capture",
        });
      } finally {
        await exportServer.close();
      }
    } finally {
      await backend.shutdown();
      await new Promise<void>((resolve, reject) =>
        operations.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });

  test("legacy failure recovery retries extension closure after graph commit and propagates sidecar auth failures", async () => {
    const runtimeStateRoot = path.join(os.tmpdir(), `track-b-recovery-retry-${Date.now()}`);
    roots.push(runtimeStateRoot);
    const scopeId = "track-b-recovery-retry";
    const databasePath = resolveSqliteMemoryLocation({ runtimeStateRoot, scopeId });
    let captureInput: Record<string, unknown> | null = null;
    let extensionAttempts = 0;
    let rejectReadsAsUnauthorized = false;
    const operations = createServer(async (request, response) => {
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(Buffer.from(chunk));
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>;
      if (request.url === "/capture/read" && rejectReadsAsUnauthorized) {
        response.writeHead(401, { "content-type": "application/json" });
        response.end(JSON.stringify({ error: "sidecar authorization refused" }));
        return;
      }
      if (request.url === "/capture/read" && !captureInput) {
        response.writeHead(409, { "content-type": "application/json" });
        response.end(JSON.stringify({ error: `unknown route capture ${body.requestId}` }));
        return;
      }
      if (request.url === "/capture/route") {
        captureInput = body;
        response.writeHead(200, { "content-type": "application/json" });
        response.end(JSON.stringify({ status: "captured" }));
        return;
      }
      const failure = captureInput?.failure as Record<string, unknown>;
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          schemaVersion: "role-model.route-capture-read.v1",
          requestId: captureInput?.requestId,
          routingDecisionId: captureInput?.routingDecisionId,
          rootArtifactId: "root-recovered-94",
          projectionCompleteness: "metadata_only",
          recovery: captureInput?.recovery,
          messages: [],
          response: { nodeId: "response-recovered-94", role: "assistant", content: null, failure },
          terminalState: "provider_error",
          failure,
          tools: [],
          edgeCount: 1,
        }),
      );
    });
    await new Promise<void>((resolve, reject) => {
      operations.once("error", reject);
      operations.listen(0, "127.0.0.1", resolve);
    });
    const address = operations.address();
    if (!address || typeof address === "string") throw new Error("operations server did not bind");
    const backend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot,
      runtimeStateRoot,
      scopeId,
      runtimeChannel: "development",
      trackBOperationsEndpoint: `http://127.0.0.1:${address.port}`,
      trackBOperationsToken: "r".repeat(64),
      trackBPostObservation: async () => {
        extensionAttempts += 1;
        if (extensionAttempts === 1) throw new Error("extension closure interrupted");
        return { status: "processed" };
      },
    });
    try {
      await expect(
        backend.executeChatCompletions(
          {
            model: "nonexistent/run94-recovery-provider",
            messages: [{ role: "user", content: "exercise bounded recovery" }],
          },
          "request-recovery-retry-94",
        ),
      ).rejects.toThrow();
      const input = {
        requestId: "request-recovery-retry-94",
        acknowledgeMetadataOnly: true,
      };
      await expect(backend.recoverLegacyTerminalFailure(input)).rejects.toThrow(
        /extension closure interrupted/i,
      );
      await expect(backend.recoverLegacyTerminalFailure(input)).resolves.toMatchObject({
        status: "already_recovered",
        extensionProcessing: "completed",
      });
      expect(extensionAttempts).toBe(2);

      rejectReadsAsUnauthorized = true;
      await expect(backend.recoverLegacyTerminalFailure(input)).rejects.toThrow(
        /authorization refused/i,
      );
    } finally {
      await backend.shutdown();
      await new Promise<void>((resolve, reject) =>
        operations.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });

  test("production Responses requests report aggregate metrics through the same private operations boundary", async () => {
    const runtimeStateRoot = path.join(
      os.tmpdir(),
      `track-b-production-responses-upload-${Date.now()}`,
    );
    roots.push(runtimeStateRoot);
    const received: Array<{ path: string; authorization?: string; body: Record<string, unknown> }> =
      [];
    const operations = createServer(async (request, response) => {
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(Buffer.from(chunk));
      received.push({
        path: request.url ?? "",
        authorization: request.headers.authorization,
        body: JSON.parse(Buffer.concat(chunks).toString("utf8")),
      });
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify(
          request.url === "/capture/route"
            ? {
                status: "captured",
                scope: "tenant:production-responses-upload",
                rootArtifactId: "artifact-route-capture",
                rootArtifactDigest: "b".repeat(64),
              }
            : { status: "accepted" },
        ),
      );
    });
    await new Promise<void>((resolve, reject) => {
      operations.once("error", reject);
      operations.listen(0, "127.0.0.1", resolve);
    });
    const address = operations.address();
    if (!address || typeof address === "string") throw new Error("operations server did not bind");
    const trackBOperationsEndpoint = `http://127.0.0.1:${address.port}`;
    delete process.env.ROLE_MODEL_TRACK_B_OPERATIONS_URL;
    process.env.ROLE_MODEL_TRACK_B_OPERATIONS_TOKEN = "b".repeat(64);
    const backend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot,
      runtimeStateRoot,
      scopeId: "production-responses-upload",
      trackBOperationsEndpoint,
    });
    try {
      const databasePath = resolveSqliteMemoryLocation({
        runtimeStateRoot,
        scopeId: "production-responses-upload",
      });
      const migration = new LegacySqliteMigration({
        databasePath,
        backupPath: path.join(runtimeStateRoot, "legacy-responses-backup.sqlite"),
        artifactWriter: ({ contentHash }) => ({
          artifactId: contentHash,
          artifactPath: `artifact://${contentHash}`,
          contentHash,
        }),
        routerRoot: path.join(repoRoot, "role-model-router"),
      });
      migration.backfill({ scopeId: "tenant:production-responses-upload", batchSize: 10 });
      migration.enterShadowMirror({ deadlineMs: Date.now() + 10_000 });
      migration.verifyParity({
        backupVerified: true,
        restoreVerified: true,
        consumersVerified: true,
      });
      migration.cutover();
      const result = await backend.executeResponses(
        {
          model: "deepseek/chat-capture-v1",
          input: "private responses prompt must never cross the aggregate boundary",
        },
        "req-track-b-responses-upload-001",
      );
      expect(result.outputText.length).toBeGreaterThan(0);
      expect(received).toHaveLength(2);
      const aggregate = received.find((entry) => entry.path === "/contribution/aggregate");
      const capture = received.find((entry) => entry.path === "/capture/route");
      expect(aggregate).toMatchObject({
        path: "/contribution/aggregate",
        authorization: `Bearer ${"b".repeat(64)}`,
        body: {
          requestId: "req-track-b-responses-upload-001",
          correlationId: expect.stringMatching(/^corr-[a-f0-9]{24}$/),
          routingDecisionId: result.routingDecisionId,
          endpointId: result.endpointId,
          modelId: "deepseek/chat-capture-v1",
          reasoningEffort: null,
          effortSource: "none",
          taskType: "general.chat",
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
          success: true,
        },
      });
      const serialized = JSON.stringify(aggregate?.body);
      expect(Object.keys(aggregate?.body ?? {}).sort()).toEqual([
        "correlationId",
        "effortSource",
        "endpointId",
        "inputTokens",
        "modelId",
        "outputTokens",
        "reasoningEffort",
        "requestId",
        "routingDecisionId",
        "success",
        "taskType",
      ]);
      for (const forbidden of [
        "messages",
        "prompt",
        "content",
        "toolOutput",
        "providerBody",
        "private responses prompt",
      ])
        expect(serialized).not.toContain(forbidden);
      expect(capture).toMatchObject({
        path: "/capture/route",
        body: {
          requestId: "req-track-b-responses-upload-001",
          routingDecisionId: result.routingDecisionId,
          outputText: result.outputText,
        },
      });
      expect(
        readRuntimeObservationStorageRecord({
          databasePath,
          requestId: "req-track-b-responses-upload-001",
        }),
      ).toMatchObject({
        graphPrimary: true,
        artifactRef: {
          scopeId: "tenant:production-responses-upload",
          artifactId: "artifact-route-capture",
          contentHash: "b".repeat(64),
        },
      });
    } finally {
      await backend.shutdown();
      await new Promise<void>((resolve, reject) =>
        operations.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });

  test("production backend reads and atomically updates real bridge storage state", async () => {
    const runtimeStateRoot = path.join(os.tmpdir(), `track-b-production-state-${Date.now()}`);
    const scopeId = "production";
    const directory = path.join(runtimeStateRoot, scopeId);
    roots.push(runtimeStateRoot);
    await mkdir(directory, { recursive: true });
    await writeFile(
      path.join(directory, "track-b-production-bridge.json"),
      JSON.stringify({
        schemaVersion: "role-model.track-b-production-bridge.v1",
        protocolVersion: "1.0",
        revision: 7,
        generatedAt: new Date().toISOString(),
        extensions: [
          {
            id: "artifact-store",
            lifecycle: "ready",
            enabled: true,
            channel: "production",
            scope: "global",
            authorizationEpoch: 3,
            health: { available: true, routingDependency: false },
          },
        ],
        storageServices: [
          {
            id: "artifact-store",
            category: "rich_trace",
            tier: "canonical",
            scope: "global",
            bytes: 100,
            count: 2,
            holds: 1,
            leases: 0,
            conflicts: [],
          },
          {
            id: "event-log",
            category: "routing_only",
            tier: "hot",
            scope: "global",
            bytes: 40,
            count: 4,
            holds: 0,
            leases: 1,
            conflicts: [],
          },
        ],
        retention: {
          managedPolicy: false,
          policies: [{ policyId: "balanced", scope: "global", maxBytes: 1024, maxAgeDays: 30 }],
          receipts: [],
          activeJob: null,
          currentPlan: {
            schemaVersion: "role-model.retention-dry-run.v1",
            channel: "production",
            affectedCount: 1,
            estimatedBytes: 100,
            conflicts: [{ id: "event-log", reason: "active_lease" }],
            lostCapabilities: ["token_exact"],
            retainedCapabilities: ["routing_history"],
            blocks: [],
            manifestHash: "a".repeat(64),
            rollbackAvailable: false,
            sourceRevision: 7,
          },
        },
        contribution: {
          mode: "contributor",
          contributionTier: "advanced",
          recommendationTier: "advanced",
          recommendationAccess: "preview_and_apply",
          allowCloudUpload: true,
          authorizationState: "pending_disclosure",
          revocationEpoch: 0,
          queuedCount: 2,
          managed: false,
        },
        recommendations: [
          {
            id: "pack-1",
            version: "1",
            status: "downloaded",
            signatureValid: true,
            policyAllowed: true,
            provenance: "cloud:bundle-1",
          },
          {
            id: "pack-bad",
            version: "1",
            status: "downloaded",
            signatureValid: false,
            policyAllowed: true,
            provenance: "cloud:bundle-2",
          },
        ],
        activePack: null,
      }),
    );
    const backend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot,
      runtimeStateRoot,
      scopeId,
    });
    try {
      const extensions = (await backend.listExtensions()) as readonly {
        id: string;
        installed: boolean;
        health: { available: boolean };
      }[];
      expect(extensions.find((row) => row.id === "artifact-store")).toMatchObject({
        installed: true,
        health: { available: true },
      });
      expect(extensions.filter((row) => row.installed)).toHaveLength(1);
      expect(await backend.readStorageRetention()).toMatchObject({
        revision: 7,
        totalBytes: 140,
        holds: 1,
        leases: 1,
      });
      const next = (await backend.dryRunStorageRetention()) as {
        revision: number;
        receipts: readonly { affectedCount: number; rollbackAvailable: boolean }[];
      };
      expect(next.revision).toBe(8);
      expect(next.receipts.at(-1)).toMatchObject({ affectedCount: 1, rollbackAvailable: false });
      const policy = await backend.updateStorageRetentionPolicy({
        policyId: "strict",
        scope: "global",
        maxBytes: 512,
        maxAgeDays: 14,
      });
      expect(policy).toMatchObject({
        policies: [{ policyId: "strict", scope: "global", maxBytes: 512, maxAgeDays: 14 }],
        currentPlan: null,
      });
      await expect(
        backend.executeStorageRetention({ manifestHash: "a".repeat(64), scope: "global" }),
      ).rejects.toThrow(/hash-bound/i);
      const replanned = (await backend.dryRunStorageRetention()) as {
        currentPlan: { manifestHash: string };
      };
      await expect(
        backend.executeStorageRetention({
          manifestHash: replanned.currentPlan.manifestHash,
          scope: "global",
        }),
      ).rejects.toThrow(/private operations endpoint/i);
      const contribution = await backend.updateContributionState({ action: "opt_out" });
      expect(contribution).toMatchObject({
        allowCloudUpload: false,
        queuedCount: 0,
        authorizationState: "revoked",
        recommendationAccess: "preview_and_apply",
      });
      const reenabled = await backend.updateContributionState({ action: "reenable" });
      expect(reenabled).toMatchObject({
        authorizationState: "pending_disclosure",
        revocationEpoch: 2,
      });
      const recommendations = (await backend.listRecommendations()) as readonly {
        id: string;
        status: string;
      }[];
      expect(recommendations).toHaveLength(2);
      await expect(backend.applyRecommendation({ id: "pack-bad" })).rejects.toThrow(/signature/i);
      const { privateKey } = generateKeyPairSync("ed25519");
      const publicKey = createPublicKey(privateKey)
        .export({ format: "der", type: "spki" })
        .toString("base64");
      const record = {
        envelope: {
          artifactId: "recommendation-pack-downloaded",
          artifactKind: "endpoint_preference",
          source: { sourceContentHash: "a".repeat(64) },
          privacy: { rawContentIncluded: false, redactionApplied: true },
        },
        snapshotId: "snapshot-pack-downloaded",
        channelSequence: 2,
        recommendationEvidenceTier: "advanced",
        endpointId: "deepseek.run00.dev.global.deepseek-chat",
        modelId: "deepseek-chat",
        reasoningEffort: "max",
        effortSource: "variant",
        preferredFor: ["general.chat"],
        action: "prefer",
        confidence: 0.92,
      };
      const recordBytes = `${canonicalJson(record)}\n`;
      const recordHash = createHash("sha256").update(recordBytes).digest("hex");
      const manifest = {
        artifactFormat: "role-model.artifact-bundle.v1",
        contract: "ServerReturnBundleManifestV1",
        artifactBundleId: "snapshot-pack-downloaded",
        snapshotId: "snapshot-pack-downloaded",
        lifecycleState: "sealed",
        channel: "development",
        channelSequence: 2,
        recommendationTier: "advanced",
        manifestHash: recordHash,
        signingKeyId: "role-model-recommendations-run00-dev-v1",
        signatureRef: "signatures/manifest.sig",
        scopeId: "standalone-runtime-dev",
        boundaryProtocolVersion: "1.1",
        contents: [
          {
            path: "records/endpoint-preferences.jsonl",
            schemaId: "role-model.artifact.endpoint_preference.v1",
            artifactKinds: ["endpoint_preference"],
            recordCount: 1,
            byteLength: Buffer.byteLength(recordBytes),
            sha256: recordHash,
          },
        ],
      };
      const manifestBytes = `${canonicalJson(manifest)}\n`;
      const manifestSha256 = createHash("sha256").update(manifestBytes).digest("hex");
      const signature = {
        keyId: "role-model-recommendations-run00-dev-v1",
        algorithm: "ed25519",
        value: sign(null, Buffer.from(manifestBytes), privateKey).toString("base64"),
        manifestSha256,
      };
      process.env.ROLE_MODEL_RECOMMENDATION_SERVICE_URL = "https://recommendations.example";
      process.env.ROLE_MODEL_RECOMMENDATION_VERIFICATION_KEY = publicKey;
      process.env.ROLE_MODEL_RECOMMENDATION_SERVICE_TOKEN = "service-token";
      process.env.ROLE_MODEL_RECOMMENDATION_CHANNEL = "development";
      process.env.ROLE_MODEL_AGGREGATE_SCOPE = "tenant:run91-live-cohort";
      process.env.ROLE_MODEL_RECOMMENDATION_SCOPE = "public:deepseek-high";
      vi.stubGlobal(
        "fetch",
        vi.fn(async (input, init) => {
          const url = String(input);
          if (url === "https://recommendations.example/api/role-model/recommendations/resolve") {
            expect(init?.method).toBe("POST");
            expect(new Headers(init?.headers).get("authorization")).toBe("Bearer service-token");
            const resolveRequest = JSON.parse(String(init?.body));
            expect(resolveRequest).toMatchObject({
              scopeId: "public:deepseek-high",
            });
            if (
              resolveRequest.activeChannelSequence === 2 &&
              resolveRequest.activeSnapshotId === "snapshot-pack-downloaded" &&
              resolveRequest.activeManifestHash === manifestSha256
            ) {
              return new Response(
                JSON.stringify({
                  contract: "RecommendationResolveResponseV1",
                  channel: "development",
                  status: "not_modified",
                  snapshotId: "snapshot-pack-downloaded",
                  channelSequence: 2,
                }),
                { status: 200, headers: { "content-type": "application/json" } },
              );
            }
            expect(resolveRequest.activeChannelSequence).toBe(0);
            expect(resolveRequest.activeSnapshotId).toBeUndefined();
            expect(resolveRequest.activeManifestHash).toBeUndefined();
            return new Response(
              JSON.stringify({
                contract: "RecommendationResolveResponseV1",
                channel: "development",
                status: "available",
                snapshotId: "snapshot-pack-downloaded",
                channelSequence: 2,
                bundleUri:
                  "https://recommendations.example/snapshots/development/stable/advanced/standalone-runtime-dev/sequence-2/manifest.json",
                manifestHash: manifestSha256,
              }),
              { status: 200, headers: { "content-type": "application/json" } },
            );
          }
          if (url.endsWith("/manifest.json"))
            return new Response(manifestBytes, {
              status: 200,
              headers: { "content-type": "application/json" },
            });
          if (url.endsWith("/records/endpoint-preferences.jsonl"))
            return new Response(recordBytes, {
              status: 200,
              headers: { "content-type": "application/x-ndjson" },
            });
          if (url.endsWith("/signatures/manifest.sig"))
            return new Response(JSON.stringify(signature), {
              status: 200,
              headers: { "content-type": "application/json" },
            });
          return new Response(JSON.stringify({ error: "unexpected_url", url }), {
            status: 404,
            headers: { "content-type": "application/json" },
          });
        }),
      );
      const downloaded = (await backend.downloadRecommendations()) as readonly {
        id: string;
        status: string;
        signatureValid: boolean;
        endpointId?: string;
        modelId?: string;
        preferredFor?: readonly string[];
        confidence?: number;
      }[];
      expect(downloaded).toEqual([
        {
          id: "recommendation-pack-downloaded",
          version: "2",
          provenance: `cloud:${manifestSha256}`,
          status: "validated",
          signatureValid: true,
          policyAllowed: true,
          endpointId: "deepseek.run00.dev.global.deepseek-chat",
          modelId: "deepseek-chat",
          reasoningEffort: "max",
          effortSource: "variant",
          preferredFor: ["general.chat"],
          action: "prefer",
          confidence: 0.92,
        },
      ]);
      await expect(backend.downloadRecommendations()).resolves.toEqual(downloaded);
      const legacyStatePath = path.join(directory, "track-b-production-bridge.json");
      const legacyState = JSON.parse(await readFile(legacyStatePath, "utf8"));
      delete legacyState.recommendationCursor;
      await writeFile(legacyStatePath, `${JSON.stringify(legacyState, null, 2)}\n`, "utf8");
      await expect(backend.downloadRecommendations()).resolves.toEqual(downloaded);
      await expect(backend.downloadRecommendations()).resolves.toEqual(downloaded);
      const applied = await backend.applyRecommendation({ id: "recommendation-pack-downloaded" });
      expect(applied).toMatchObject({
        activePack: {
          id: "recommendation-pack-downloaded",
          version: "2",
          endpointId: "deepseek.run00.dev.global.deepseek-chat",
          modelId: "deepseek-chat",
          reasoningEffort: "max",
          effortSource: "variant",
        },
      });
    } finally {
      await backend.shutdown();
    }
  });

  test("launcher recommendation material config populates runtime download trust without raw env injection", async () => {
    const runtimeStateRoot = path.join(
      os.tmpdir(),
      `track-b-recommendation-material-${Date.now()}`,
    );
    roots.push(runtimeStateRoot);
    const materialPath = path.join(runtimeStateRoot, "recommendation-material.json");
    await mkdir(runtimeStateRoot, { recursive: true });
    await writeFile(
      materialPath,
      JSON.stringify({
        recommendationPublicSpkiBase64: "public-spki-fixture",
        internalServiceToken: "service-token-fixture",
      }),
    );

    applyRecommendationServiceLauncherConfig({
      "recommendation-service-url": "https://recommendations-run00.role-model.dev",
      "recommendation-material-file": materialPath,
      "recommendation-channel": "development",
      "aggregate-scope": "tenant:run91-live-cohort",
      "recommendation-scope": "public:deepseek-high",
    });

    expect(process.env.ROLE_MODEL_RECOMMENDATION_SERVICE_URL).toBe(
      "https://recommendations-run00.role-model.dev",
    );
    expect(process.env.ROLE_MODEL_RECOMMENDATION_CHANNEL).toBe("development");
    expect(process.env.ROLE_MODEL_AGGREGATE_SCOPE).toBe("tenant:run91-live-cohort");
    expect(process.env.ROLE_MODEL_RECOMMENDATION_SCOPE).toBe("public:deepseek-high");
    expect(process.env.ROLE_MODEL_RECOMMENDATION_VERIFICATION_KEY).toBe("public-spki-fixture");
    expect(process.env.ROLE_MODEL_RECOMMENDATION_SERVICE_TOKEN).toBe("service-token-fixture");
  });

  test("RUN88-I-PUB-R8-AC04 stage recommendation downloads propagate candidate correlation", async () => {
    const runtimeStateRoot = path.join(
      os.tmpdir(),
      `run88-stage-recommendation-correlation-${Date.now()}`,
    );
    roots.push(runtimeStateRoot);
    const releaseId = `sha256:${"a".repeat(64)}`;
    const sourceId = "b".repeat(40);
    const executableSha256 = "c".repeat(64);
    const scopeId = "run88-stage-1pct";
    const backend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot,
      runtimeStateRoot,
      scopeId,
      runtimeChannel: "stage",
      run88StageIdentity: { releaseId, sourceId, executableSha256 },
    });
    process.env.ROLE_MODEL_RECOMMENDATION_SERVICE_URL = "https://recommendations-stage.example";
    process.env.ROLE_MODEL_RECOMMENDATION_VERIFICATION_KEY = "verification-key-fixture";
    process.env.ROLE_MODEL_RECOMMENDATION_CHANNEL = "staging";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input, init) => {
        expect(String(input)).toBe(
          "https://recommendations-stage.example/api/role-model/recommendations/resolve",
        );
        const encoded = new Headers(init?.headers).get("x-role-model-correlation");
        expect(encoded).not.toBeNull();
        expect(JSON.parse(encoded ?? "null")).toMatchObject({
          schemaVersion: "run88-correlation.v1",
          service: "runtime-host-bridge",
          operation: "recommendation.resolve",
          runtimeChannel: "staging",
          releaseId,
          sourceId,
          deploymentId: `local-stage:${executableSha256}`,
          outcome: "requested",
        });
        return new Response(
          JSON.stringify({
            contract: "RecommendationResolveResponseV1",
            channel: "staging",
            status: "not_eligible",
            channelSequence: 0,
            runtimeChannel: "staging",
            scopeId,
            boundaryProtocolVersion: "1.1",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }),
    );
    try {
      await expect(backend.downloadRecommendations()).resolves.toEqual([]);
    } finally {
      await backend.shutdown();
    }
  });

  test("RUN88-R-PUB-R8-AC04 stage recommendation downloads fail closed without candidate identity", async () => {
    const runtimeStateRoot = path.join(
      os.tmpdir(),
      `run88-stage-recommendation-missing-identity-${Date.now()}`,
    );
    roots.push(runtimeStateRoot);
    const backend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot,
      runtimeStateRoot,
      scopeId: "run88-stage-1pct",
      runtimeChannel: "stage",
    });
    process.env.ROLE_MODEL_RECOMMENDATION_SERVICE_URL = "https://recommendations-stage.example";
    process.env.ROLE_MODEL_RECOMMENDATION_VERIFICATION_KEY = "verification-key-fixture";
    process.env.ROLE_MODEL_RECOMMENDATION_CHANNEL = "staging";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network must not be called without candidate identity");
      }),
    );
    try {
      await expect(backend.downloadRecommendations()).rejects.toThrow(
        /stage recommendation correlation identity/i,
      );
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      await backend.shutdown();
    }
  });

  test("run79 mutateExtension upserts catalog rows absent from bridge state", async () => {
    const root = path.join(os.tmpdir(), `track-b-mutate-upsert-${Date.now()}`);
    roots.push(root);
    await mkdir(root, { recursive: true });
    const statePath = path.join(root, "bridge.json");
    const ops = createTrackBOperations({
      statePath,
      catalog: [
        {
          id: "event-log",
          packageClass: "canonical_extension",
          dependsOn: [],
          routingDependency: false,
        },
      ],
    });
    const enabled = (await ops.mutateExtension({
      id: "event-log",
      action: "enable",
      mode: "shadow",
    })) as {
      extensions: readonly { id: string; enabled: boolean; enabledMode?: string }[];
      receipts: readonly unknown[];
    };
    const row = enabled.extensions.find((entry) => entry.id === "event-log");
    expect(row).toMatchObject({ enabled: true, enabledMode: "shadow" });
    expect(enabled.receipts).toHaveLength(1);
  });

  test("run94 SP8 local storage fallback never fabricates physical measurements", async () => {
    const root = path.join(os.tmpdir(), `track-b-run94-honest-${Date.now()}`);
    roots.push(root);
    await mkdir(root, { recursive: true });
    const statePath = path.join(root, "bridge.json");
    const catalog = [
      { id: "artifact-store", packageClass: "canonical_extension", routingDependency: true },
      { id: "event-log", packageClass: "canonical_extension", routingDependency: false },
    ];
    await seedTrackBExtensionBridgeState({ statePath, catalog });
    const seeded = JSON.parse(await readFile(statePath, "utf8")) as {
      storageServices?: unknown[];
    };
    seeded.storageServices = [
      {
        id: "artifact-store",
        category: "rich_trace",
        tier: "canonical",
        scope: "repo:a",
        bytes: 10,
        count: 1,
        holds: 0,
        leases: 0,
      },
    ];
    await writeFile(statePath, JSON.stringify(seeded));
    const ops = createTrackBOperations({ statePath, catalog });
    const summary = (await ops.readStorageRetention()) as {
      storageAudit: unknown;
      storageInventory: {
        entries: readonly {
          id: string;
          health: string;
          measurement: string;
          physicalBytes: number | null;
        }[];
      };
    };
    expect(summary.storageAudit).toBeNull();
    expect(summary.storageInventory.entries.length).toBeGreaterThan(0);
    for (const entry of summary.storageInventory.entries) {
      expect(entry.physicalBytes).toBeNull();
      expect(entry.measurement).toBe("unavailable");
      expect(entry.health).toBe("unavailable");
    }
  });

  test("run95 preserves an asynchronous storage-audit readiness state without presenting it as a completed audit", async () => {
    const operations = createServer((request, response) => {
      response.writeHead(200, { "content-type": "application/json" });
      if (request.url === "/storage-retention") {
        response.end(
          JSON.stringify({
            revision: 7,
            totalBytes: 140,
            physicalResources: [],
            logicalClasses: [],
            policyState: { state: "absent", channel: "stage" },
          }),
        );
        return;
      }
      if (request.url === "/storage-audit") {
        response.end(
          JSON.stringify({
            schemaVersion: "role-model.storage-audit-readiness.v1",
            status: "pending",
            observedAt: null,
            freshUntil: null,
            reason: "Read-only storage audit is in progress",
          }),
        );
        return;
      }
      response.writeHead(404).end(JSON.stringify({ error: "not found" }));
    });
    await new Promise<void>((resolve, reject) => {
      operations.once("error", reject);
      operations.listen(0, "127.0.0.1", resolve);
    });
    try {
      const address = operations.address();
      if (!address || typeof address === "string")
        throw new Error("operations server did not bind");
      const api = createTrackBOperations({
        statePath: path.join(os.tmpdir(), `run95-storage-audit-${Date.now()}.json`),
        catalog: [],
        operationsEndpoint: `http://127.0.0.1:${address.port}`,
        operationsToken: "run95-storage-audit-token-0001",
      });
      await expect(api.readStorageRetention()).resolves.toMatchObject({
        revision: 7,
        storageAudit: null,
        storageAuditStatus: {
          schemaVersion: "role-model.storage-audit-readiness.v1",
          status: "pending",
        },
      });
    } finally {
      await new Promise<void>((resolve, reject) =>
        operations.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });

  test("run79 mutateExtension enables disables and sets mode with audit receipts", async () => {
    const runtimeStateRoot = path.join(os.tmpdir(), `track-b-run79-mutate-${Date.now()}`);
    roots.push(runtimeStateRoot);
    const statePath = path.join(runtimeStateRoot, "track-b-production-bridge.json");
    const catalog = [
      {
        id: "event-log",
        packageClass: "canonical_extension",
        routingDependency: true,
      },
      {
        id: "knowledge-worker",
        packageClass: "canonical_extension",
        routingDependency: false,
        dependsOn: ["event-log"],
        modeDependsOn: [{ id: "event-log", modes: ["active", "bounded"] }],
      },
    ];
    await seedTrackBExtensionBridgeState({ statePath, catalog });
    const ops = createTrackBOperations({ statePath, catalog });
    const disabled = (await ops.mutateExtension({
      id: "knowledge-worker",
      action: "disable",
    })) as {
      extensions: readonly { id: string; enabled: boolean; enabledMode: string }[];
      receipts: readonly { action: string; extensionId: string }[];
    };
    expect(disabled.extensions.find((row) => row.id === "knowledge-worker")).toMatchObject({
      enabled: false,
      enabledMode: "disabled",
    });
    expect(disabled.receipts.at(-1)).toMatchObject({
      action: "disable",
      extensionId: "knowledge-worker",
      who: "local-operator",
    });
    const disabledRow = disabled.extensions.find((row) => row.id === "knowledge-worker") as {
      health?: { reason?: string; available?: boolean };
    };
    expect(disabledRow.health).toMatchObject({
      available: false,
      reason: "operator_disabled",
    });
    await ops.mutateExtension({ id: "event-log", action: "disable" });
    await expect(
      ops.mutateExtension({ id: "knowledge-worker", action: "enable", mode: "shadow" }),
    ).rejects.toThrow(/dependenc/i);
    await ops.mutateExtension({ id: "event-log", action: "enable", mode: "shadow" });
    await expect(
      ops.mutateExtension({ id: "knowledge-worker", action: "enable", mode: "shadow" }),
    ).rejects.toThrow(/mode dependency/i);
    await ops.mutateExtension({ id: "event-log", action: "set_mode", mode: "active" });
    const enabled = (await ops.mutateExtension({
      id: "knowledge-worker",
      action: "set_mode",
      mode: "shadow",
    })) as {
      extensions: readonly {
        id: string;
        enabled: boolean;
        enabledMode: string;
        health?: { reason?: string; available?: boolean };
      }[];
    };
    expect(enabled.extensions.find((row) => row.id === "knowledge-worker")).toMatchObject({
      enabled: true,
      enabledMode: "shadow",
      health: {
        available: true,
        reason: "operator_enabled",
      },
    });
    const reenabled = (await ops.mutateExtension({
      id: "event-log",
      action: "enable",
      mode: "active",
    })) as {
      extensions: readonly {
        id: string;
        health?: { reason?: string; probe?: string; summary?: string };
      }[];
    };
    expect(reenabled.extensions.find((row) => row.id === "event-log")?.health).toMatchObject({
      reason: expect.not.stringMatching(/operator_disabled/),
    });
    await expect(ops.mutateExtension({ id: "missing", action: "enable" })).rejects.toThrow(
      /not found|unknown/i,
    );
    await expect(
      ops.mutateExtension({ id: "event-log", action: "set_mode", mode: "nope" }),
    ).rejects.toThrow(/mode|illegal|invalid/i);
  });

  test("run87 rejects obsolete knowledge-worker production activation while retaining shadow bootstrap", async () => {
    const root = path.join(os.tmpdir(), `track-b-run84-activation-${Date.now()}`);
    roots.push(root);
    const statePath = path.join(root, "track-b-production-bridge.json");
    const catalog = [
      {
        id: "knowledge-worker",
        packageClass: "canonical_extension",
        routingDependency: false,
      },
      {
        id: "event-log",
        packageClass: "canonical_extension",
        routingDependency: false,
      },
    ];
    await seedTrackBExtensionBridgeState({ statePath, catalog });
    const ops = createTrackBOperations({ statePath, catalog });
    const receipt = {
      payload: {
        kind: "knowledge_validation",
        reviewed: true,
        safetyReviewed: true,
        redacted: true,
        holdoutPassed: true,
      },
      signature: "a".repeat(64),
    };

    await expect(
      ops.mutateExtension({
        id: "knowledge-worker",
        action: "activate_production",
        activationPolicyVersion: 1,
        operatorAttestation: "activate-production",
      }),
    ).rejects.toThrow(/shadow-only|prohibited/i);

    await expect(
      ops.mutateExtension({
        id: "event-log",
        action: "activate_production",
        activationPolicyVersion: 1,
        operatorAttestation: "activate-production",
        receipt,
      }),
    ).rejects.toThrow(/knowledge-worker/i);

    const bootstrapped = (await ops.mutateExtension({
      id: "knowledge-worker",
      action: "bootstrap_shadow_ready",
      receipt,
      groupDigest: "b".repeat(64),
    })) as {
      extensions: readonly {
        id: string;
        enabledMode: string;
        productionActivation?: boolean;
        health: {
          productionActivation?: boolean;
          knowledgeWorkerBootstrap?: { groupDigest: string };
        };
      }[];
      receipts: readonly { action: string }[];
    };
    expect(bootstrapped.extensions.find((row) => row.id === "knowledge-worker")).toMatchObject({
      enabledMode: "shadow",
      productionActivation: false,
      health: {
        productionActivation: false,
        knowledgeWorkerBootstrap: { groupDigest: "b".repeat(64) },
      },
    });
    expect(bootstrapped.receipts.at(-1)).toMatchObject({ action: "bootstrap_shadow_ready" });

    const listed = (await ops.listExtensions()) as readonly {
      id: string;
      productionActivation?: boolean;
      health: { productionActivation?: boolean };
    }[];
    expect(listed.find((row) => row.id === "knowledge-worker")).toMatchObject({
      productionActivation: false,
      health: { productionActivation: false },
    });
    await expect(
      ops.mutateExtension({ id: "knowledge-worker", action: "deactivate_production" }),
    ).rejects.toThrow(/shadow-only|prohibited/i);
  });

  test("run87 rejects every direct knowledge-worker activation ceremony", async () => {
    const root = path.join(os.tmpdir(), `track-b-run84-ceremony-${Date.now()}`);
    roots.push(root);
    const statePath = path.join(root, "track-b-production-bridge.json");
    const catalog = [{ id: "knowledge-worker", packageClass: "canonical_extension" }];
    await seedTrackBExtensionBridgeState({ statePath, catalog });
    const ops = createTrackBOperations({ statePath, catalog });
    const receipt = {
      payload: {
        kind: "knowledge_validation",
        reviewed: true,
        safetyReviewed: true,
        redacted: true,
        holdoutPassed: true,
      },
      signature: "c".repeat(64),
    };

    await expect(
      ops.mutateExtension({
        id: "knowledge-worker",
        action: "activate_production",
        activationPolicyVersion: 2,
        operatorAttestation: "activate-production",
        receipt,
      }),
    ).rejects.toThrow(/shadow-only|prohibited/i);
    await expect(
      ops.mutateExtension({
        id: "knowledge-worker",
        action: "activate_production",
        activationPolicyVersion: 1,
        operatorAttestation: "activate-production",
        receipt: { ...receipt, signature: "not-a-signature" },
      }),
    ).rejects.toThrow(/shadow-only|prohibited/i);
    await expect(
      ops.mutateExtension({
        id: "knowledge-worker",
        action: "activate_production",
        activationPolicyVersion: 1,
        operatorAttestation: "activate-production",
        receipt,
      }),
    ).rejects.toThrow(/shadow-only|prohibited/i);
  });

  test("run79 dismissRecommendation marks row dismissed without applying pack", async () => {
    const runtimeStateRoot = path.join(os.tmpdir(), `track-b-run79-dismiss-${Date.now()}`);
    roots.push(runtimeStateRoot);
    const statePath = path.join(runtimeStateRoot, "track-b-production-bridge.json");
    await mkdir(runtimeStateRoot, { recursive: true });
    await writeFile(
      statePath,
      JSON.stringify({
        schemaVersion: "role-model.track-b-production-bridge.v1",
        protocolVersion: "1.0",
        revision: 1,
        generatedAt: new Date().toISOString(),
        extensions: [],
        storageServices: [],
        retention: { managedPolicy: false, receipts: [], activeJob: null },
        contribution: {
          mode: "contributor",
          contributionTier: "advanced",
          recommendationTier: "advanced",
          recommendationAccess: "preview_and_apply",
          allowCloudUpload: true,
          authorizationState: "active",
          revocationEpoch: 0,
          queuedCount: 0,
          managed: false,
        },
        recommendations: [
          {
            id: "pack-dismiss",
            version: "1",
            status: "validated",
            signatureValid: true,
            policyAllowed: true,
            provenance: "cloud:bundle-dismiss",
          },
        ],
        recommendationRevision: 1,
        activePack: null,
      }),
    );
    const ops = createTrackBOperations({ statePath, catalog: [] });
    const result = (await ops.dismissRecommendation({ id: "pack-dismiss" })) as {
      recommendations: readonly { id: string; status: string }[];
      activePack: unknown;
    };
    expect(result.recommendations.find((row) => row.id === "pack-dismiss")).toMatchObject({
      status: "dismissed",
    });
    expect(result.activePack).toBeNull();
    await expect(ops.applyRecommendation({ id: "pack-dismiss" })).rejects.toThrow(/dismissed/i);
    await expect(ops.dismissRecommendation({ id: "missing" })).rejects.toThrow(/not found/i);
  });

  test("run80 contribution opt-out does not revoke imported eligible recommendation", async () => {
    const runtimeStateRoot = path.join(os.tmpdir(), `track-b-run80-optout-${Date.now()}`);
    roots.push(runtimeStateRoot);
    const statePath = path.join(runtimeStateRoot, "track-b-production-bridge.json");
    await mkdir(runtimeStateRoot, { recursive: true });
    await writeFile(
      statePath,
      JSON.stringify({
        schemaVersion: "role-model.track-b-production-bridge.v1",
        protocolVersion: "1.0",
        revision: 1,
        generatedAt: new Date().toISOString(),
        extensions: [],
        storageServices: [],
        retention: { managedPolicy: false, receipts: [], activeJob: null },
        contribution: {
          mode: "contributor",
          contributionTier: "advanced",
          recommendationTier: "advanced",
          recommendationAccess: "preview_and_apply",
          allowCloudUpload: false,
          authorizationState: "revoked",
          revocationEpoch: 1,
          queuedCount: 0,
          managed: false,
        },
        recommendations: [
          {
            id: "pack-optout",
            version: "1",
            status: "validated",
            signatureValid: true,
            policyAllowed: true,
            provenance: "cloud:bundle-optout",
          },
        ],
        recommendationRevision: 3,
        activePack: null,
      }),
    );
    const ops = createTrackBOperations({ statePath, catalog: [] });
    const listed = await ops.listRecommendations();
    expect(listed.find((row) => row.id === "pack-optout")).toMatchObject({
      status: "validated",
      signatureValid: true,
    });
    const applied = (await ops.applyRecommendation({ id: "pack-optout" })) as {
      activePack: { id: string };
    };
    expect(applied.activePack.id).toBe("pack-optout");
  });

  test("run94 contribution opt-out rejects stale disclosure while preserving recommendation access", async () => {
    const runtimeStateRoot = path.join(os.tmpdir(), `track-b-run94-optout-${Date.now()}`);
    roots.push(runtimeStateRoot);
    const statePath = path.join(runtimeStateRoot, "track-b-production-bridge.json");
    await mkdir(runtimeStateRoot, { recursive: true });
    await writeFile(
      statePath,
      JSON.stringify({
        schemaVersion: "role-model.track-b-production-bridge.v1",
        protocolVersion: "1.0",
        revision: 1,
        generatedAt: new Date().toISOString(),
        extensions: [],
        storageServices: [],
        retention: { managedPolicy: false, receipts: [], activeJob: null },
        contribution: {
          mode: "contributor",
          contributionTier: "advanced",
          recommendationTier: "advanced",
          recommendationAccess: "preview_and_apply",
          allowCloudUpload: true,
          authorizationState: "active",
          revocationEpoch: 4,
          queuedCount: 0,
          managed: false,
          disclosureId: "disc-run94-old",
        },
        recommendations: [],
        recommendationRevision: 0,
        activePack: null,
      }),
    );
    const ops = createTrackBOperations({ statePath, catalog: [] });
    const optedOut = (await ops.updateContributionState({ action: "opt_out" })) as {
      recommendationAccess: string;
      authorizationState: string;
      revocationEpoch: number;
    };
    expect(optedOut).toMatchObject({
      recommendationAccess: "preview_and_apply",
      authorizationState: "revoked",
      revocationEpoch: 5,
    });
    await expect(
      ops.updateContributionState({
        action: "complete_disclosure",
        disclosureId: "disc-run94-old",
      }),
    ).rejects.toThrow(/pending|stale|revoked/i);
  });

  test("run79 HTTP exposes extensions mutate and recommendations dismiss routes", async () => {
    const runtimeStateRoot = path.join(os.tmpdir(), `track-b-run79-http-${Date.now()}`);
    roots.push(runtimeStateRoot);
    const statePath = path.join(runtimeStateRoot, "production", "track-b-production-bridge.json");
    const contract = JSON.parse(
      await readFile(
        path.join(repoRoot, "packages", "protocol-types", "generated", "product-contracts.json"),
        "utf8",
      ),
    ) as { extensions: readonly Record<string, unknown>[] };
    await seedTrackBExtensionBridgeState({
      statePath,
      catalog: contract.extensions,
    });
    await mkdir(path.dirname(statePath), { recursive: true });
    const existing = JSON.parse(await readFile(statePath, "utf8")) as {
      recommendations?: unknown[];
      [key: string]: unknown;
    };
    existing.recommendations = [
      {
        id: "pack-http-dismiss",
        version: "1",
        status: "validated",
        signatureValid: true,
        policyAllowed: true,
        provenance: "cloud:http",
      },
    ];
    await writeFile(statePath, `${JSON.stringify(existing, null, 2)}\n`);
    const backend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot,
      runtimeStateRoot,
      scopeId: "production",
    });
    const server = await startBridgeServer({
      host: "127.0.0.1",
      port: 0,
      listExtensions: () => backend.listExtensions(),
      mutateExtension: (body) => backend.mutateExtension(body),
      listRecommendations: () => backend.listRecommendations(),
      dismissRecommendation: (body) => backend.dismissRecommendation(body),
      applyRecommendation: (body) => backend.applyRecommendation(body),
    });
    try {
      const base = `http://127.0.0.1:${server.port}`;
      const mutateResponse = await fetch(`${base}/api/role-model/extensions/mutate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: "artifact-store", action: "disable" }),
      });
      expect(mutateResponse.status).toBe(200);
      const mutateBody = (await mutateResponse.json()) as {
        extensions: readonly { id: string; enabled: boolean }[];
      };
      expect(mutateBody.extensions.find((row) => row.id === "artifact-store")?.enabled).toBe(false);
      const dismissResponse = await fetch(`${base}/api/role-model/recommendations/dismiss`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: "pack-http-dismiss" }),
      });
      expect(dismissResponse.status).toBe(200);
      const dismissBody = (await dismissResponse.json()) as {
        recommendations: readonly { id: string; status: string }[];
      };
      expect(
        dismissBody.recommendations.find((row) => row.id === "pack-http-dismiss")?.status,
      ).toBe("dismissed");
    } finally {
      await server.close();
      await backend.shutdown();
    }
  });
});
