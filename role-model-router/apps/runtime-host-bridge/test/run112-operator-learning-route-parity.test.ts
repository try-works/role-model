import { expect, test } from "vitest";

import { startBridgeServer } from "../src/index.js";

/**
 * Run 112 (addendum 08 S2): every Learning readback the host exposes must answer on a runtime that is started
 * **without** a private operations endpoint.
 *
 * Measured live before the profile fix: `records`, `decisions`, `policy` and `rollout` answered 200 while
 * `/profile` answered 503 `operator_capability_unavailable`, because that one route resolved through the
 * private-endpoint client (`privateRetentionRequest` returns null only when the endpoint is missing, and the
 * release's launcher never passes one). Refusing a readback the UI needs - for a dependency its siblings do not
 * have - is the class this test pins: with the packaged option set, every Learning readback answers a payload or
 * its own bounded state, and none answers the unavailable projection.
 */

const unavailableProjection = {
  schemaVersion: "role-model.operator-status.v1",
  overall: "unavailable",
  error: "operator_capability_unavailable",
  capability: "learning profile inspection",
  detail: "private transport answered null for operator/learning/profile",
};

const learningCallbacks = {
  readLearningState: () => ({ knowledge: { available: true } }),
  // The packaged composition's profile readback goes through the private-endpoint client and degrades.
  readLearningProfile: () => unavailableProjection,
  readLearningAdvisory: () => ({ state: "unavailable" }),
  readLearningPolicy: () => ({ policyVersion: 56 }),
  readLearningRollout: () => ({ state: "active" }),
  readLearningRecords: () => ({ records: [] }),
  readLearningDecisions: () => ({ decisions: [] }),
  readLearningMeasurement: () => ({ rows: 0 }),
  readLearningActivity: () => ({ buckets: [] }),
  readLearningHistory: () => ({ buckets: [] }),
};

/** The runtime's own operator context: the packaged runtime binds one and applies it to header-less calls. */
const operatorContext = {
  channel: "stage" as const,
  scope: "standalone-runtime-stage",
  authorizationEpoch: 1,
};

const READ_ROUTES = [
  "/api/role-model/operator/learning",
  "/api/role-model/operator/learning/profile",
  "/api/role-model/operator/learning/advisory",
  "/api/role-model/operator/learning/policy",
  "/api/role-model/operator/learning/rollout",
  "/api/role-model/operator/learning/records",
  "/api/role-model/operator/learning/decisions",
  "/api/role-model/operator/learning/measurement",
  "/api/role-model/operator/learning/activity",
  "/api/role-model/operator/learning/history",
];

test("run112 every Learning readback answers without a private operations endpoint", async () => {
  const server = await startBridgeServer({
    host: "127.0.0.1",
    port: 0,
    registry: { revision: 0, endpoints: [] },
    anonymousLearningReads: "on",
    operatorContext,
    ...learningCallbacks,
  });
  try {
    const failures: string[] = [];
    for (const route of READ_ROUTES) {
      const response = await fetch(
        `http://127.0.0.1:${server.port}${route}?scopeId=standalone-runtime-stage`,
      );
      const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      if (response.status !== 200 || body.error === "operator_capability_unavailable") {
        failures.push(`${route} -> ${response.status} ${JSON.stringify(body).slice(0, 160)}`);
      }
    }
    expect(failures).toEqual([]);
  } finally {
    await server.close();
  }
});

test("run112 the profile readback answers the bounded state, not the transport projection", async () => {
  const server = await startBridgeServer({
    host: "127.0.0.1",
    port: 0,
    registry: { revision: 0, endpoints: [] },
    anonymousLearningReads: "on",
    operatorContext,
    ...learningCallbacks,
  });
  try {
    const response = await fetch(
      `http://127.0.0.1:${server.port}/api/role-model/operator/learning/profile?scopeId=standalone-runtime-stage`,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      schemaVersion: "role-model.learning-profile-inspection.v1",
      state: "unavailable",
      reason: "no current estimate for this scope yet",
    });
  } finally {
    await server.close();
  }
});

test("run112 a Learning readback the runtime does not provide is the only acceptable 503", async () => {
  const server = await startBridgeServer({
    host: "127.0.0.1",
    port: 0,
    registry: { revision: 0, endpoints: [] },
    anonymousLearningReads: "on",
    operatorContext,
    ...learningCallbacks,
    readLearningAdvisory: undefined,
  });
  try {
    const response = await fetch(
      `http://127.0.0.1:${server.port}/api/role-model/operator/learning/advisory`,
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      error: "operator_capability_unavailable",
      capability: "learning advisory",
    });
  } finally {
    await server.close();
  }
});
