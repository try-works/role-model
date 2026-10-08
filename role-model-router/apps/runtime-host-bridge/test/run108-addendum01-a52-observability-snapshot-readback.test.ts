/**
 * Run 108 addendum-01 A5.2 (R7 readback consumers; 03.5 review MJ-1).
 *
 * `collectObservabilitySnapshot` had ZERO production consumers: the wiring helpers wrote the four
 * run-108 metric families into the process registry and nobody ever read them back, so "the operator
 * can see what the runtime measured" was false. This suite pins the readback route that consumes it -
 * `GET /api/role-model/operator/observability-snapshot` - behind the same single operator auth gate
 * as every other operator readback, and proves the route answers from the LIVE registry (a decision
 * recorded in this process shows up in the payload, so a route returning a constant cannot pass).
 */
import { describe, expect, test } from "vitest";

import type { EndpointRegistryResult } from "@role-model-router/endpoint-registry";
import { startBridgeServer } from "../src/index.js";
import {
  type ObservabilityMetricReadback,
  collectObservabilitySnapshot,
  recordFinaliseRefusal,
  recordLearnerDerivation,
  recordReplayAdmission,
  recordRouterDecision,
} from "../src/run108-observability.js";

const SNAPSHOT_PATH = "/api/role-model/operator/observability-snapshot";

const registry = {
  endpoints: [],
  diagnostics: [],
  lifecycleSummary: { active: 0, degraded: 0, offline: 0 },
} as unknown as EndpointRegistryResult;

const operatorContext = {
  channel: "development" as const,
  scope: "run108:addendum01-a52",
  authorizationEpoch: 108,
};

const authHeaders = {
  authorization: "Bearer operator-secret",
  "x-role-model-channel": operatorContext.channel,
  "x-role-model-scope": operatorContext.scope,
  "x-role-model-authorization-epoch": String(operatorContext.authorizationEpoch),
};

interface SnapshotPayload {
  readonly schemaVersion: string;
  readonly metrics: Record<string, ObservabilityMetricReadback>;
}

const startServer = () =>
  startBridgeServer({
    host: "127.0.0.1",
    port: 0,
    operatorAuthToken: "operator-secret",
    deviceOwnerTrust: "off",
    operatorContext,
    registry,
    executeChatCompletions: async () => {
      throw new Error("not used");
    },
    executeResponses: async () => {
      throw new Error("not used");
    },
  });

const readSnapshot = async (server: { port: number }): Promise<SnapshotPayload> => {
  const response = await fetch(`http://127.0.0.1:${server.port}${SNAPSHOT_PATH}`, {
    headers: authHeaders,
  });
  expect(response.status).toBe(200);
  return (await response.json()) as SnapshotPayload;
};

describe("run108 addendum-01 A5.2 observability snapshot readback", () => {
  test("answers 200 with the pinned schemaVersion and a metrics map", async () => {
    const server = await startServer();
    try {
      const body = await readSnapshot(server);
      expect(body.schemaVersion).toBe("role-model.observability-snapshot.v1");
      expect(body.metrics).toBeTypeOf("object");
      expect(body.metrics).not.toBeNull();
    } finally {
      await server.close();
    }
  });

  test("reads the live process registry: recorded metrics appear with their counts", async () => {
    const server = await startServer();
    try {
      const before = collectObservabilitySnapshot();
      recordRouterDecision("baseline_retained");
      recordReplayAdmission("replay", true);
      recordLearnerDerivation(3, "derived");
      recordFinaliseRefusal("finalise", "declared_pair");

      const body = await readSnapshot(server);
      const delta = (name: string): number =>
        (body.metrics[name]?.count ?? 0) - (before[name]?.count ?? 0);
      expect(delta("role-model.router.decisions")).toBe(1);
      expect(delta("role-model.replay.admissions")).toBe(1);
      expect(delta("role-model.learner.derivations")).toBe(3);
      expect(delta("role-model.eval.finalise_refusals")).toBe(1);
    } finally {
      await server.close();
    }
  });

  /**
   * Run 108 phase-03 F2: the readback keeps the per-series breakdown, so the RC-1 question ("which
   * guard refused") is answerable from the route payload. Two refusals under the same metric id
   * arrive as TWO series with their own tags, never as one collapsed total.
   */
  test("keeps the per-attribute series: two refusals arrive as two tagged series", async () => {
    const server = await startServer();
    try {
      recordFinaliseRefusal(
        "finalise",
        "state=declined reason=insufficient refusal=judge_unresolved",
      );
      recordFinaliseRefusal(
        "finalise",
        "state=incomplete reason=disagreement refusal=arms_unresolved",
      );

      const body = await readSnapshot(server);
      const refusals = body.metrics["role-model.eval.finalise_refusals"];
      const reasons = (refusals?.series ?? [])
        .filter((series) => series.attributes.guard === "finalise")
        .map((series) => series.attributes.reason);
      expect(reasons).toContain("state=declined reason=insufficient refusal=judge_unresolved");
      expect(reasons).toContain("state=incomplete reason=disagreement refusal=arms_unresolved");
      const insufficient = (refusals?.series ?? []).find(
        (series) =>
          series.attributes.reason ===
          "state=declined reason=insufficient refusal=judge_unresolved",
      );
      expect(insufficient?.state).toEqual({ kind: "counter", count: 1, incremental: true });
    } finally {
      await server.close();
    }
  });

  test("keeps the snapshot readback behind the operator authentication gate", async () => {
    const server = await startServer();
    try {
      const response = await fetch(`http://127.0.0.1:${server.port}${SNAPSHOT_PATH}`);
      expect(response.status).toBe(401);
      expect(await response.json()).toMatchObject({ error: "operator_authentication_required" });
    } finally {
      await server.close();
    }
  });
});
