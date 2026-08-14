import { createHash } from "node:crypto";

import { expect, test } from "vitest";

import * as projections from "../src/projections/index.js";

const evidence = [
  {
    artifactRef: "sha256:semantic",
    sourceHash: `sha256:${"a".repeat(64)}`,
    scope: "tenant:run87",
    verified: true,
    capabilities: ["routing_history", "full_replay"],
  },
  {
    artifactRef: "sha256:tokens",
    sourceHash: `sha256:${"b".repeat(64)}`,
    scope: "tenant:run87",
    verified: true,
    capabilities: ["token_exact"],
  },
];

test("SP4 creates deterministic v2 projections with independent readiness axes", () => {
  expect(typeof projections.createProjectionV2).toBe("function");
  const input = {
    scope: "tenant:run87",
    purpose: "routing_shadow",
    permittedUse: true,
    authorizationState: "authorized",
    validUntilMs: 20_000,
    trainingAllowed: true,
    evaluatedAtMs: 10_000,
    evidence,
    payload: { decision: "endpoint-a", score: 1 },
  } as const;
  const left = projections.createProjectionV2(input);
  const right = projections.createProjectionV2({ ...input, evidence: [...evidence].reverse() });
  expect(left).toEqual(right);
  expect(left).toMatchObject({
    schemaVersion: "role-model.projection.v2",
    scope: "tenant:run87",
    readiness: {
      completeness: "complete",
      evidenceCapability: "token_exact",
      tokenFidelity: "exact",
      permittedUse: true,
      rolloutPurpose: "routing_shadow",
      authorizationState: "authorized",
      lifecycleReadiness: "ready",
      routingTrainingSuitability: "eligible",
    },
  });

  const tokenPruned = projections.downgradeProjectionV2(left, {
    artifactRef: "sha256:tokens",
    reason: "pruned",
  });
  expect(tokenPruned.readiness).toEqual({
    completeness: "partial",
    evidenceCapability: "full_replay",
    tokenFidelity: "semantic",
    permittedUse: true,
    rolloutPurpose: "routing_shadow",
    authorizationState: "authorized",
    lifecycleReadiness: "ready",
    routingTrainingSuitability: "eligible",
  });
  const revoked = projections.downgradeProjectionV2(tokenPruned, {
    artifactRef: "sha256:semantic",
    reason: "revoked",
  });
  expect(revoked.readiness).toMatchObject({
    completeness: "unavailable",
    evidenceCapability: "unavailable",
    tokenFidelity: "unknown",
    permittedUse: false,
    rolloutPurpose: "routing_shadow",
  });
});

test("SP4 rejects malformed, cross-scope, and unsupported future projection inputs", () => {
  expect(() =>
    projections.createProjectionV2({
      scope: "tenant:run87",
      purpose: "evaluation",
      permittedUse: true,
      authorizationState: "authorized",
      validUntilMs: null,
      trainingAllowed: true,
      evaluatedAtMs: 10_000,
      evidence: [{ ...evidence[0], scope: "tenant:other" }],
      payload: {},
    }),
  ).toThrow(/scope/i);
  expect(() =>
    projections.validateProjectionV2({ schemaVersion: "role-model.projection.v3" }),
  ).toThrow(/unsupported projection schema/i);
});

test("Phase 3.5 rejects caller-forged readiness even when the attacker recomputes the content ID", () => {
  const projection = projections.createProjectionV2({
    scope: "tenant:run87",
    purpose: "routing_shadow",
    permittedUse: true,
    authorizationState: "authorized",
    validUntilMs: null,
    trainingAllowed: true,
    evaluatedAtMs: 10_000,
    evidence,
    payload: { decision: "endpoint-a" },
  });
  const forgedBody = {
    ...projection,
    evidence: projection.evidence.map((row) => ({ ...row, invalidation: "revoked" as const })),
    readiness: { ...projection.readiness, permittedUse: true },
  };
  const canonical = (value: unknown): string => {
    if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
    if (value && typeof value === "object") {
      const record = value as Record<string, unknown>;
      return `{${Object.keys(record)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`)
        .join(",")}}`;
    }
    return JSON.stringify(value);
  };
  const { id: _oldId, ...body } = forgedBody;
  const forged = {
    ...body,
    id: `sha256:${createHash("sha256").update(canonical(body)).digest("hex")}`,
  };
  expect(() => projections.validateProjectionV2(forged)).toThrow(/readiness|policy/i);
  expect(() =>
    projections.createProjectionV2({
      scope: "tenant:run87",
      purpose: "routing_shadow",
      permittedUse: true,
      authorizationState: "authorized",
      validUntilMs: null,
      trainingAllowed: true,
      evaluatedAtMs: 10_000,
      evidence,
      payload: { ambiguous: [undefined] },
    }),
  ).toThrow(/json|undefined|payload/i);
});

test("Phase 3.5 derives authorization, expiry, and routing-training suitability independently", () => {
  const make = (overrides: Partial<Parameters<typeof projections.createProjectionV2>[0]>) =>
    projections.createProjectionV2({
      scope: "tenant:run87",
      purpose: "routing_shadow",
      permittedUse: true,
      authorizationState: "authorized",
      validUntilMs: 20_000,
      trainingAllowed: true,
      evaluatedAtMs: 10_000,
      evidence,
      payload: {},
      ...overrides,
    });
  expect(make({ authorizationState: "revoked" }).readiness).toMatchObject({
    authorizationState: "revoked",
    lifecycleReadiness: "ready",
    routingTrainingSuitability: "ineligible",
    permittedUse: false,
  });
  expect(make({ validUntilMs: 9_999 }).readiness).toMatchObject({
    authorizationState: "authorized",
    lifecycleReadiness: "expired",
    routingTrainingSuitability: "ineligible",
    permittedUse: false,
  });
  expect(make({ trainingAllowed: false }).readiness).toMatchObject({
    authorizationState: "authorized",
    lifecycleReadiness: "ready",
    routingTrainingSuitability: "ineligible",
    permittedUse: true,
  });
});

test("Phase 3.5 rejects a projection that expires after its original evaluation", () => {
  const projection = projections.createProjectionV2({
    scope: "tenant:run87",
    purpose: "routing_shadow",
    permittedUse: true,
    authorizationState: "authorized",
    validUntilMs: 11_000,
    trainingAllowed: true,
    evaluatedAtMs: 10_000,
    evidence,
    payload: { decision: "endpoint-a" },
  });
  expect(projection.readiness.lifecycleReadiness).toBe("ready");
  expect(() => projections.validateProjectionV2(projection, { nowMs: 11_001 })).toThrow(
    /expired|lifecycle|valid/i,
  );
});
