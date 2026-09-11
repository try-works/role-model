import { describe, expect, test } from "vitest";

import type { RuntimeEndpointRecord } from "@role-model-router/sqlite-memory";

import { reconcileLegacyExecutionAdmissionRows } from "../src/legacy-execution-admission-reconciliation.js";

const endpoint = (overrides: Partial<RuntimeEndpointRecord> = {}): RuntimeEndpointRecord => ({
  endpointId: "deepseek.personal.primary.global.deepseek-v4-flash",
  providerAccountId: "deepseek.personal.primary",
  modelId: "deepseek/deepseek-v4-flash",
  region: "global",
  endpointKind: "remote_api",
  servingSource: "remote-service",
  lifecycleState: "degraded",
  healthStatus: "degraded",
  ...overrides,
});

describe("legacy execution admission reconciliation", () => {
  test("restores only a source-bound transient circuit from the legacy degraded row shape", () => {
    const result = reconcileLegacyExecutionAdmissionRows({
      endpoints: [endpoint()],
      circuits: {
        schemaVersion: 2,
        endpoints: {
          "deepseek.personal.primary.global.deepseek-v4-flash": {
            endpointId: "deepseek.personal.primary.global.deepseek-v4-flash",
            circuitState: "open",
            failureCategory: "timeout",
            failureCount: 2,
            sequenceStartedAtMs: 1_000,
            lastFailureAtMs: 2_000,
            lastErrorClass: "upstream_timeout",
            sourceAttemptId: "attempt-001",
            sourceRequestId: "req-001",
            sourceRoutingDecisionId: "decision-001",
          },
        },
      },
    });

    expect(result.restoredEndpointIds).toEqual([
      "deepseek.personal.primary.global.deepseek-v4-flash",
    ]);
    expect(result.endpoints).toEqual([
      expect.objectContaining({ lifecycleState: "active", healthStatus: "healthy" }),
    ]);
  });

  test.each([
    ["blocked auth", "blocked_auth", "auth"],
    ["blocked quota", "blocked_quota", "quota"],
  ] as const)(
    "preserves %s because durable admission must remain fail-closed",
    (_, circuitState, failureCategory) => {
      const result = reconcileLegacyExecutionAdmissionRows({
        endpoints: [endpoint()],
        circuits: {
          schemaVersion: 2,
          endpoints: {
            "deepseek.personal.primary.global.deepseek-v4-flash": {
              endpointId: "deepseek.personal.primary.global.deepseek-v4-flash",
              circuitState,
              failureCategory,
              failureCount: 1,
              sequenceStartedAtMs: 1_000,
              lastFailureAtMs: 2_000,
              lastErrorClass: "provider_failure",
              sourceAttemptId: "attempt-001",
              sourceRequestId: "req-001",
              sourceRoutingDecisionId: "decision-001",
            },
          },
        },
      });

      expect(result.restoredEndpointIds).toEqual([]);
      expect(result.endpoints).toEqual([endpoint()]);
    },
  );

  test("preserves an unproven legacy degraded row without a complete source chain", () => {
    const result = reconcileLegacyExecutionAdmissionRows({
      endpoints: [endpoint()],
      circuits: {
        schemaVersion: 2,
        endpoints: {
          "deepseek.personal.primary.global.deepseek-v4-flash": {
            endpointId: "deepseek.personal.primary.global.deepseek-v4-flash",
            circuitState: "open",
            failureCategory: "provider_5xx",
            failureCount: 2,
            sequenceStartedAtMs: 1_000,
            lastFailureAtMs: 2_000,
            lastErrorClass: "upstream_error",
          },
        },
      },
    });

    expect(result.restoredEndpointIds).toEqual([]);
    expect(result.endpoints).toEqual([endpoint()]);
  });
});
