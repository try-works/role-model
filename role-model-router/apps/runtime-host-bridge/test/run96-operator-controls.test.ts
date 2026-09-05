import { afterEach, describe, expect, test } from "vitest";
import { createCliServerOptions } from "../src/cli.js";
import { type StartBridgeServerOptions, startBridgeServer } from "../src/index.js";

const servers: Array<{ close: () => Promise<void> }> = [];

function testOptions(overrides: Partial<StartBridgeServerOptions>): StartBridgeServerOptions {
  return {
    host: "127.0.0.1",
    port: 0,
    registry: {} as StartBridgeServerOptions["registry"],
    executeChatCompletions: async () => ({}) as never,
    executeResponses: async () => ({}) as never,
    ...overrides,
  } as StartBridgeServerOptions;
}

async function startTestServer(overrides: Partial<StartBridgeServerOptions>) {
  const server = await startBridgeServer(testOptions(overrides));
  servers.push(server);
  return server;
}

async function getJson(server: { port: number }, path: string, token?: string) {
  const headers = token ? { authorization: `Bearer ${token}` } : undefined;
  const response = await fetch(`http://127.0.0.1:${server.port}${path}`, { headers });
  return { response, body: (await response.json()) as Record<string, unknown> };
}

afterEach(async () => {
  while (servers.length > 0) await servers.pop()?.close();
});

describe("Run 96 operator controls", () => {
  test("requires operator authentication and returns a truthful unavailable status", async () => {
    const server = await startTestServer({ operatorAuthToken: "operator-secret" });

    const unauthorized = await getJson(server, "/api/role-model/operator/status");
    const wrongToken = await getJson(server, "/api/role-model/operator/status", "wrong");
    const status = await getJson(server, "/api/role-model/operator/status", "operator-secret");

    expect(unauthorized.response.status).toBe(401);
    expect(wrongToken.response.status).toBe(401);
    expect(status.response.status).toBe(503);
    expect(status.body).toMatchObject({
      schemaVersion: "role-model.operator-status.v1",
      overall: "unavailable",
    });
    expect(status.body.reason).toEqual(expect.any(String));
  });

  test("routes authenticated replay, evaluation, and learning actions to backend callbacks", async () => {
    const calls: string[] = [];
    const server = await startTestServer({
      operatorAuthToken: "operator-secret",
      readOperatorStatus: async () => ({
        schemaVersion: "role-model.operator-status.v1",
        overall: "available",
        observedAtMs: 1,
        capabilities: {},
      }),
      listReplayJobs: async (query) => {
        calls.push(`listReplayJobs:${query?.limit ?? ""}`);
        return { jobs: [{ jobId: "replay-1", status: "running" }] };
      },
      createReplayJob: async (body) => {
        calls.push(`createReplayJob:${String(body.traceRootId)}`);
        return { jobId: "replay-2", status: "queued" };
      },
      cancelReplayJob: async (jobId) => {
        calls.push(`cancelReplayJob:${jobId}`);
        return { jobId, status: "cancelled" };
      },
      listEvaluationJobs: async () => {
        calls.push("listEvaluationJobs");
        return { jobs: [{ jobId: "eval-1", status: "running" }] };
      },
      readEvaluationJob: async (jobId) => {
        calls.push(`readEvaluationJob:${jobId}`);
        return { jobId, status: "running", trials: 2 };
      },
      cancelEvaluationJob: async (jobId) => {
        calls.push(`cancelEvaluationJob:${jobId}`);
        return { jobId, status: "cancelled" };
      },
      retryEvaluationJob: async (jobId) => {
        calls.push(`retryEvaluationJob:${jobId}`);
        return { jobId, status: "queued" };
      },
      readLearningState: async () => {
        calls.push("readLearningState");
        return { mode: "advisory", rollbackAvailable: true };
      },
      updateLearningMode: async (body) => {
        calls.push(`updateLearningMode:${String(body.mode)}`);
        return { mode: body.mode };
      },
      rollbackLearning: async () => {
        calls.push("rollbackLearning");
        return { mode: "advisory", rolledBack: true };
      },
    });

    const request = (path: string, init?: RequestInit) =>
      fetch(`http://127.0.0.1:${server.port}${path}`, {
        ...init,
        headers: { authorization: "Bearer operator-secret", ...(init?.headers ?? {}) },
      });

    const responses = await Promise.all([
      request("/api/role-model/operator/replay/jobs?limit=10"),
      request("/api/role-model/operator/replay/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ traceRootId: "trace-1" }),
      }),
      request("/api/role-model/operator/replay/jobs/replay-1/cancel", { method: "POST" }),
      request("/api/role-model/operator/evaluation/jobs"),
      request("/api/role-model/operator/evaluation/jobs/eval-1"),
      request("/api/role-model/operator/evaluation/jobs/eval-1/cancel", { method: "POST" }),
      request("/api/role-model/operator/evaluation/jobs/eval-1/retry", { method: "POST" }),
      request("/api/role-model/operator/learning"),
      request("/api/role-model/operator/learning/mode", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "shadow" }),
      }),
      request("/api/role-model/operator/learning/rollback", { method: "POST" }),
    ]);

    expect(responses.every((response) => response.status === 200)).toBe(true);
    expect(calls).toEqual(
      expect.arrayContaining([
        "listReplayJobs:10",
        "createReplayJob:trace-1",
        "cancelReplayJob:replay-1",
        "listEvaluationJobs",
        "readEvaluationJob:eval-1",
        "cancelEvaluationJob:eval-1",
        "retryEvaluationJob:eval-1",
        "readLearningState",
        "updateLearningMode:shadow",
        "rollbackLearning",
      ]),
    );
  });

  test("wires operator controls through the CLI server composition", async () => {
    const calls: string[] = [];
    const backend = {
      effectiveRegistry: {},
      getExecutionCatalog: () => ({}),
      readOperatorStatus: async () => ({
        schemaVersion: "role-model.operator-status.v1",
        overall: "available",
        observedAtMs: 1,
        capabilities: {},
      }),
      listReplayJobs: async () => {
        calls.push("listReplayJobs");
        return { jobs: [] };
      },
      createReplayJob: async (body) => {
        calls.push(`createReplayJob:${String(body.traceRootId)}`);
        return { jobId: "replay-1", status: "queued" };
      },
      cancelReplayJob: async (jobId) => {
        calls.push(`cancelReplayJob:${jobId}`);
        return { jobId, status: "cancelled" };
      },
      listEvaluationJobs: async () => {
        calls.push("listEvaluationJobs");
        return { jobs: [] };
      },
      readEvaluationJob: async (jobId) => {
        calls.push(`readEvaluationJob:${jobId}`);
        return { jobId, status: "running" };
      },
      cancelEvaluationJob: async (jobId) => {
        calls.push(`cancelEvaluationJob:${jobId}`);
        return { jobId, status: "cancelled" };
      },
      retryEvaluationJob: async (jobId) => {
        calls.push(`retryEvaluationJob:${jobId}`);
        return { jobId, status: "queued" };
      },
      readLearningState: async () => {
        calls.push("readLearningState");
        return { mode: "advisory" };
      },
      updateLearningMode: async (body) => {
        calls.push(`updateLearningMode:${String(body.mode)}`);
        return { mode: body.mode };
      },
      rollbackLearning: async () => {
        calls.push("rollbackLearning");
        return { mode: "advisory", rolledBack: true };
      },
    } as unknown as Parameters<typeof createCliServerOptions>[1];
    const options = createCliServerOptions(
      {
        host: "127.0.0.1",
        port: 0,
        operatorAuthToken: "operator-secret",
      },
      backend,
    );
    const server = await startBridgeServer(options);
    servers.push(server);

    const request = (path: string, init?: RequestInit) =>
      fetch(`http://127.0.0.1:${server.port}${path}`, {
        ...init,
        headers: { authorization: "Bearer operator-secret", ...(init?.headers ?? {}) },
      });
    const responses = await Promise.all([
      request("/api/role-model/operator/status"),
      request("/api/role-model/operator/replay/jobs"),
      request("/api/role-model/operator/replay/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ traceRootId: "trace-1" }),
      }),
      request("/api/role-model/operator/replay/jobs/replay-1/cancel", { method: "POST" }),
      request("/api/role-model/operator/evaluation/jobs"),
      request("/api/role-model/operator/evaluation/jobs/eval-1"),
      request("/api/role-model/operator/evaluation/jobs/eval-1/cancel", { method: "POST" }),
      request("/api/role-model/operator/evaluation/jobs/eval-1/retry", { method: "POST" }),
      request("/api/role-model/operator/learning"),
      request("/api/role-model/operator/learning/mode", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "shadow" }),
      }),
      request("/api/role-model/operator/learning/rollback", { method: "POST" }),
    ]);

    expect(responses.every((response) => response.status === 200)).toBe(true);
    expect(calls).toEqual(
      expect.arrayContaining([
        "listReplayJobs",
        "createReplayJob:trace-1",
        "cancelReplayJob:replay-1",
        "listEvaluationJobs",
        "readEvaluationJob:eval-1",
        "cancelEvaluationJob:eval-1",
        "retryEvaluationJob:eval-1",
        "readLearningState",
        "updateLearningMode:shadow",
        "rollbackLearning",
      ]),
    );
  });
});
