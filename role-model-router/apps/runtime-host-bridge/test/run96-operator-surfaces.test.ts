import { createServer } from "node:http";
import os from "node:os";
import path from "node:path";

import { describe, expect, test, vi } from "vitest";

import type { EndpointRegistryResult } from "@role-model-router/endpoint-registry";
import { createCliServerOptions, createRuntimeOperatorCallbacks } from "../src/cli.js";
import { startBridgeServer } from "../src/index.js";
import { createTrackBOperations } from "../src/track-b-operations.js";

const registry = {
  endpoints: [],
  diagnostics: [],
  lifecycleSummary: { active: 0, degraded: 0, offline: 0 },
} as unknown as EndpointRegistryResult;

const operatorContext = {
  channel: "development" as const,
  scope: "run96:operator-surfaces",
  authorizationEpoch: 96,
};

const json = (response: Response): Promise<unknown> => response.json();

describe("Run 96 operator evidence routes", () => {
  test("keeps operator evidence authenticated and delegates every evidence view", async () => {
    const calls: string[] = [];
    const server = await startBridgeServer({
      host: "127.0.0.1",
      port: 0,
      operatorAuthToken: "operator-secret",
      operatorContext,
      registry,
      executeChatCompletions: async () => {
        throw new Error("not used");
      },
      executeResponses: async () => {
        throw new Error("not used");
      },
      listOperatorTraceRoots: async (query) => {
        calls.push(`trace-roots:${query?.limit ?? "none"}`);
        return { roots: [{ traceRootId: "trace-1", completeness: "complete" }] };
      },
      readOperatorTraceRoot: async (traceRootId) => {
        calls.push(`trace-root:${traceRootId}`);
        return { traceRootId, generations: 2, branches: 1 };
      },
      readReplayJob: async (jobId) => {
        calls.push(`replay:${jobId}`);
        return { jobId, budget: { maxRequests: 5 }, status: "running" };
      },
      readReplayResults: async (jobId) => {
        calls.push(`replay-results:${jobId}`);
        return { jobId, results: [{ requestId: "req-1" }] };
      },
      listEvaluationTrials: async (jobId) => {
        calls.push(`trials:${jobId}`);
        return { jobId, trials: [{ trialId: "trial-1" }] };
      },
      listEvaluationScorers: async (jobId) => {
        calls.push(`scorers:${jobId}`);
        return { jobId, scorers: [{ scorerId: "scorer-1" }] };
      },
      listEvaluationComparisons: async (jobId) => {
        calls.push(`comparisons:${jobId}`);
        return { jobId, comparisons: [{ comparisonId: "comparison-1" }] };
      },
      listEvaluationGroups: async (jobId) => {
        calls.push(`groups:${jobId}`);
        return { jobId, groups: [{ groupId: "group-1" }] };
      },
      readLearningProfile: async () => {
        calls.push("profile");
        return { confidence: 0.81 };
      },
      readLearningAdvisory: async () => {
        calls.push("advisory");
        return { availability: "available", reason: "shadow-only" };
      },
    });

    try {
      const baseUrl = `http://127.0.0.1:${server.port}`;
      const auth = {
        headers: {
          authorization: "Bearer operator-secret",
          "x-role-model-channel": operatorContext.channel,
          "x-role-model-scope": operatorContext.scope,
          "x-role-model-authorization-epoch": String(operatorContext.authorizationEpoch),
          "x-role-model-capability": "operator",
        },
      };
      const authFor = (capability: string) => ({
        headers: { ...auth.headers, "x-role-model-capability": capability },
      });
      const requests = [
        fetch(`${baseUrl}/api/role-model/operator/trace-roots?limit=10`, authFor("trace")),
        fetch(`${baseUrl}/api/role-model/operator/trace-roots/trace-1`, authFor("trace")),
        fetch(`${baseUrl}/api/role-model/operator/replay/jobs/replay-1`, authFor("replay")),
        fetch(`${baseUrl}/api/role-model/operator/replay/jobs/replay-1/results`, authFor("replay")),
        fetch(
          `${baseUrl}/api/role-model/operator/evaluation/jobs/eval-1/trials`,
          authFor("evaluation"),
        ),
        fetch(
          `${baseUrl}/api/role-model/operator/evaluation/jobs/eval-1/scorers`,
          authFor("evaluation"),
        ),
        fetch(
          `${baseUrl}/api/role-model/operator/evaluation/jobs/eval-1/comparisons`,
          authFor("evaluation"),
        ),
        fetch(
          `${baseUrl}/api/role-model/operator/evaluation/jobs/eval-1/groups`,
          authFor("evaluation"),
        ),
        fetch(`${baseUrl}/api/role-model/operator/learning/profile`, authFor("learning")),
        fetch(`${baseUrl}/api/role-model/operator/learning/advisory`, authFor("learning")),
      ];
      const responses = await Promise.all(requests);
      expect(responses.every((response) => response.status === 200)).toBe(true);
      expect(await json(responses[0])).toEqual({
        roots: [{ traceRootId: "trace-1", completeness: "complete" }],
      });
      expect(await json(responses[2])).toEqual({
        jobId: "replay-1",
        budget: { maxRequests: 5 },
        status: "running",
      });
      expect(calls).toEqual(
        expect.arrayContaining([
          "trace-roots:10",
          "trace-root:trace-1",
          "replay:replay-1",
          "replay-results:replay-1",
          "trials:eval-1",
          "scorers:eval-1",
          "comparisons:eval-1",
          "groups:eval-1",
          "profile",
          "advisory",
        ]),
      );

      const unauthorized = await fetch(`${baseUrl}/api/role-model/operator/trace-roots`);
      expect(unauthorized.status).toBe(401);
      expect(await json(unauthorized)).toMatchObject({ error: "operator_authentication_required" });
    } finally {
      await server.close();
    }
  });

  test("returns a truthful unavailable response when an optional operator view is not wired", async () => {
    const server = await startBridgeServer({
      host: "127.0.0.1",
      port: 0,
      operatorAuthToken: "operator-secret",
      operatorContext,
      registry,
      executeChatCompletions: async () => {
        throw new Error("not used");
      },
      executeResponses: async () => {
        throw new Error("not used");
      },
    });

    try {
      const response = await fetch(
        `http://127.0.0.1:${server.port}/api/role-model/operator/learning/advisory`,
        {
          headers: {
            authorization: "Bearer operator-secret",
            "x-role-model-channel": operatorContext.channel,
            "x-role-model-scope": operatorContext.scope,
            "x-role-model-authorization-epoch": String(operatorContext.authorizationEpoch),
            "x-role-model-capability": "learning",
          },
        },
      );
      expect(response.status).toBe(503);
      expect(await json(response)).toMatchObject({
        error: "operator_capability_unavailable",
        capability: "learning advisory",
        overall: "unavailable",
      });
    } finally {
      await server.close();
    }
  });

  test("does not turn an unavailable backend capability into a successful HTTP response", async () => {
    const server = await startBridgeServer({
      host: "127.0.0.1",
      port: 0,
      operatorAuthToken: "operator-secret",
      operatorContext,
      registry,
      executeChatCompletions: async () => {
        throw new Error("not used");
      },
      executeResponses: async () => {
        throw new Error("not used");
      },
      // createRuntimeBridgeBackend exposes this shape when the packaged private
      // operator authority is not wired. The HTTP boundary must preserve that
      // unavailable state instead of reporting a misleading 200.
      readLearningAdvisory: async () => ({
        schemaVersion: "role-model.operator-status.v1",
        overall: "unavailable",
        observedAtMs: Date.now(),
        capabilities: { learningAdvisory: "unavailable" },
        error: "operator_capability_unavailable",
        capability: "learning advisory",
      }),
    });

    try {
      const response = await fetch(
        `http://127.0.0.1:${server.port}/api/role-model/operator/learning/advisory`,
        {
          headers: {
            authorization: "Bearer operator-secret",
            "x-role-model-channel": operatorContext.channel,
            "x-role-model-scope": operatorContext.scope,
            "x-role-model-authorization-epoch": String(operatorContext.authorizationEpoch),
            "x-role-model-capability": "learning",
          },
        },
      );
      expect(response.status).toBe(503);
      expect(await json(response)).toMatchObject({
        error: "operator_capability_unavailable",
        capability: "learning advisory",
        overall: "unavailable",
      });
    } finally {
      await server.close();
    }
  });

  test("wires the same authenticated evidence routes through the CLI server composition", async () => {
    const listOperatorTraceRoots = vi.fn(async () => ({ roots: [], completeness: "unobserved" }));
    const backend = {
      operatorAuthToken: "operator-secret",
      effectiveRegistry: registry,
      listOperatorTraceRoots,
    } as unknown as Parameters<typeof createCliServerOptions>[1];
    const options = createCliServerOptions(
      {
        host: "127.0.0.1",
        port: 0,
        operatorAuthToken: "operator-secret",
        operatorContext,
      },
      backend,
    );
    const server = await startBridgeServer({
      ...options,
      executeChatCompletions: async () => {
        throw new Error("not used");
      },
      executeResponses: async () => {
        throw new Error("not used");
      },
    });

    try {
      const response = await fetch(
        `http://127.0.0.1:${server.port}/api/role-model/operator/trace-roots`,
        {
          headers: {
            authorization: "Bearer operator-secret",
            "x-role-model-channel": operatorContext.channel,
            "x-role-model-scope": operatorContext.scope,
            "x-role-model-authorization-epoch": String(operatorContext.authorizationEpoch),
            "x-role-model-capability": "trace",
          },
        },
      );
      expect(response.status).toBe(200);
      expect(await json(response)).toEqual({ roots: [], completeness: "unobserved" });
      expect(listOperatorTraceRoots).toHaveBeenCalledWith({});
    } finally {
      await server.close();
    }
  });

  test("binds packaged operator reads to the authenticated Track B operations boundary", async () => {
    const token = "run96-operator-boundary-token";
    const requests: string[] = [];
    const payloads: Record<string, unknown> = {
      "/operator/status": { overall: "available", capabilities: { trace: "available" } },
      "/operator/trace-roots?limit=2": { roots: [{ traceRootId: "trace-1" }] },
      "/operator/replay/jobs/replay-1": { jobId: "replay-1", status: "complete" },
      "/operator/evaluation/jobs/eval-1/trials": { jobId: "eval-1", trials: [] },
      "/operator/learning/profile": { confidence: 0.92 },
    };
    const sidecar = createServer((request, response) => {
      const route = request.url ?? "/";
      requests.push(`${request.method} ${route}`);
      expect(request.headers.authorization).toBe(`Bearer ${token}`);
      const payload = payloads[route];
      if (payload === undefined) {
        response.writeHead(404, { "content-type": "application/json" });
        response.end(JSON.stringify({ error: "not found" }));
        return;
      }
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify(payload));
    });
    await new Promise<void>((resolve) => sidecar.listen(0, "127.0.0.1", resolve));
    const address = sidecar.address();
    if (!address || typeof address === "string") throw new Error("operator sidecar did not bind");

    try {
      const operations = createTrackBOperations({
        statePath: path.join(
          os.tmpdir(),
          `run96-operator-boundary-state-${process.pid}-${Date.now()}.json`,
        ),
        catalog: [],
        operationsEndpoint: `http://127.0.0.1:${address.port}`,
        operationsToken: token,
        scope: "run96:operator-boundary",
        authorizationEpoch: 96,
      });
      const callbacks = createRuntimeOperatorCallbacks(operations);
      await expect(callbacks.readOperatorStatus?.()).resolves.toEqual(payloads["/operator/status"]);
      await expect(operations.readOperatorStatus()).resolves.toEqual(payloads["/operator/status"]);
      await expect(operations.listOperatorTraceRoots({ limit: "2" })).resolves.toEqual(
        payloads["/operator/trace-roots?limit=2"],
      );
      await expect(operations.readReplayJob("replay-1")).resolves.toEqual(
        payloads["/operator/replay/jobs/replay-1"],
      );
      await expect(operations.listEvaluationTrials("eval-1")).resolves.toEqual(
        payloads["/operator/evaluation/jobs/eval-1/trials"],
      );
      await expect(operations.readLearningProfile()).resolves.toEqual(
        payloads["/operator/learning/profile"],
      );
      expect(requests).toEqual([
        "GET /operator/status",
        "GET /operator/status",
        "GET /operator/trace-roots?limit=2",
        "GET /operator/replay/jobs/replay-1",
        "GET /operator/evaluation/jobs/eval-1/trials",
        "GET /operator/learning/profile",
      ]);
    } finally {
      await new Promise<void>((resolve, reject) =>
        sidecar.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });
});
