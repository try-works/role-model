import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, expect, test } from "vitest";

import { attachRouterPolicyResolution, startBridgeServer } from "../src/index.js";
import {
  ACTIVATION_POLICY_RELATIVE_PATH,
  describeRouterPolicyResolution,
  readLearningPolicyFile,
} from "../src/learning-policy-file.js";

/**
 * Run 98 addendum 44 `A44-S4`: the Configuration page must be able to report the degraded policy state.
 *
 * The readback the page renders comes from the sidecar's durable store, while the routing decision comes from
 * the host loader. When the two disagree — a damaged state file, an unreadable seed, a bound-violating document
 * — the page has to say which one the router actually used and why, instead of presenting the stored document
 * as if it were in effect.
 */
const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

const rootWithPolicy = (content: string | null): string => {
  const root = mkdtempSync(path.join(os.tmpdir(), "run98-a44-s4-readback-"));
  roots.push(root);
  if (content !== null) {
    mkdirSync(path.join(root, "shared"), { recursive: true });
    writeFileSync(path.join(root, ACTIVATION_POLICY_RELATIVE_PATH), content, "utf8");
  }
  return root;
};

const registry = { endpoints: [] } as never;

const startServer = async (options: Record<string, unknown>) => {
  const server = await startBridgeServer({
    host: "127.0.0.1",
    port: 0,
    registry,
    getRegistry: () => registry,
    executeChatCompletions: async () => {
      throw new Error("not used");
    },
    executeResponses: async () => {
      throw new Error("not used");
    },
    readRuntimeSummary: async () => ({ status: "ok" }),
    readHealthStatus: async () => ({ status: "ok" }),
    operatorContext: { channel: "stage", scope: "run98-a44-s4", authorizationEpoch: 1 },
    ...options,
  } as never);
  return server;
};

test("run98 a44 s4: a degraded loader snapshot projects to a bounded router resolution", () => {
  const snapshot = readLearningPolicyFile({
    repoRoot: rootWithPolicy('{"schemaVersion":"role-model.route-learning-activation-policy.v1",'),
    channel: "stage",
  });
  const resolution = describeRouterPolicyResolution(snapshot);
  expect(resolution?.stage).toBe("S0");
  expect(resolution?.policyVersion).toBe(1);
  expect(resolution?.degraded?.reason).toBe("policy_source_unreadable");
  expect(resolution?.degraded?.source).toBe(ACTIVATION_POLICY_RELATIVE_PATH);
  expect(resolution?.digest).toMatch(/^sha256:[a-f0-9]{64}$/);

  // A healthy file resolves with the same shape and no degradation, so the page can render one block.
  const healthy = readLearningPolicyFile({
    repoRoot: rootWithPolicy(
      JSON.stringify({
        schemaVersion: "role-model.route-learning-activation-policy.v1",
        policyVersion: 33,
        global: { stage: "S3" },
        channels: {},
        scopes: {},
      }),
    ),
    channel: "stage",
  });
  const healthyResolution = describeRouterPolicyResolution(healthy);
  expect(healthyResolution?.stage).toBe("S3");
  expect(healthyResolution?.policyVersion).toBe(33);
  expect(healthyResolution?.degraded).toBeNull();
});

test("run98 a44 s4: the policy readback carries the router resolution without mutating the sidecar payload", () => {
  const payload = {
    policyVersion: 33,
    digest: "sha256:stored",
    effective: { stage: "S4" },
  };
  const resolution = {
    stage: "S0",
    policyVersion: 1,
    digest: "sha256:degraded",
    source: ACTIVATION_POLICY_RELATIVE_PATH,
    degraded: {
      reason: "policy_source_unreadable",
      detail: "the staged policy could not be parsed",
      field: null,
      version: null,
      source: ACTIVATION_POLICY_RELATIVE_PATH,
      atMs: 1,
    },
  };
  const merged = attachRouterPolicyResolution(payload, () => resolution) as Record<string, unknown>;
  expect(merged.policyVersion).toBe(33);
  expect(merged.digest).toBe("sha256:stored");
  expect(merged.routerResolution).toEqual(resolution);
  expect(payload).toEqual({
    policyVersion: 33,
    digest: "sha256:stored",
    effective: { stage: "S4" },
  });

  // A resolver that throws, or answers nothing, must never break the readback.
  expect(
    attachRouterPolicyResolution(payload, () => {
      throw new Error("resolver exploded");
    }),
  ).toMatchObject({ policyVersion: 33 });
  expect(attachRouterPolicyResolution(payload, () => undefined)).toMatchObject({
    policyVersion: 33,
  });
  expect(attachRouterPolicyResolution(null, () => resolution)).toBeNull();
});

test("run98 a44 s4: the operator readback route serves the merged resolution", async () => {
  const resolution = {
    stage: "S0",
    policyVersion: 1,
    digest: "sha256:degraded",
    source: ACTIVATION_POLICY_RELATIVE_PATH,
    degraded: {
      reason: "policy_source_invalid_field",
      detail: "global.scoreBand out of range 0..0.25 (saw 4)",
      field: "scoreBand",
      version: "role-model.route-learning-activation-policy.v1",
      source: ACTIVATION_POLICY_RELATIVE_PATH,
      atMs: 1,
    },
  };
  const server = await startServer({
    readLearningPolicy: async () => ({ policyVersion: 33, digest: "sha256:stored", fields: [] }),
    resolveLearningPolicySource: () => resolution,
  });
  try {
    const response = await fetch(
      `http://127.0.0.1:${server.port}/api/role-model/operator/learning/policy`,
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body.policyVersion).toBe(33);
    expect(body.routerResolution).toEqual(resolution);
  } finally {
    await server.close();
  }
});
