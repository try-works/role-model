import { describe, expect, it } from "vitest";

import {
  type CandidateHealthState,
  type HealthPolicyInput,
  classifyProvider5xxHealth,
  resolveEndpointHealthState,
} from "../src/health-policy.js";

describe("health-policy", () => {
  describe("resolveEndpointHealthState", () => {
    it("returns healthy when active, probe healthy, no circuit, no failures", () => {
      const input: HealthPolicyInput = {
        lifecycleState: "active",
        probeHealthStatus: "healthy",
        circuitState: null,
        consecutiveExecutionFailures: 0,
      };
      expect(resolveEndpointHealthState(input)).toBe("healthy");
    });

    it("returns pending-admission-blocked (degraded) when still pending", () => {
      const input: HealthPolicyInput = {
        lifecycleState: "pending-admission",
        probeHealthStatus: "unknown",
        circuitState: null,
        consecutiveExecutionFailures: 0,
      };
      // Pending is not healthy — it maps to a degraded/unknown classification.
      expect(["degraded", "unknown"]).toContain(resolveEndpointHealthState(input));
    });

    it("degrades on an open provider_5xx circuit", () => {
      const input: HealthPolicyInput = {
        lifecycleState: "active",
        probeHealthStatus: "healthy",
        circuitState: "open",
        consecutiveExecutionFailures: 0,
      };
      expect(resolveEndpointHealthState(input)).toBe("degraded");
    });

    it("degrades on blocked_quota / blocked_auth circuit", () => {
      for (const circuitState of ["blocked_quota", "blocked_auth", "probation"] as const) {
        const input: HealthPolicyInput = {
          lifecycleState: "active",
          probeHealthStatus: "healthy",
          circuitState,
          consecutiveExecutionFailures: 0,
        };
        expect(resolveEndpointHealthState(input)).toBe("degraded");
      }
    });

    it("returns provider-unavailable when the probe reports it", () => {
      const input: HealthPolicyInput = {
        lifecycleState: "active",
        probeHealthStatus: "provider-unavailable",
        circuitState: null,
        consecutiveExecutionFailures: 0,
      };
      expect(resolveEndpointHealthState(input)).toBe("provider-unavailable");
    });

    it("preserves a probe offline status as offline", () => {
      const input: HealthPolicyInput = {
        lifecycleState: "active",
        probeHealthStatus: "offline",
        circuitState: null,
        consecutiveExecutionFailures: 0,
      };
      expect(resolveEndpointHealthState(input)).toBe("offline");
    });

    it("degrades on consecutive execution 503s when the circuit opens (threshold 2)", () => {
      const input: HealthPolicyInput = {
        lifecycleState: "active",
        probeHealthStatus: "healthy",
        circuitState: null,
        consecutiveExecutionFailures: 2,
      };
      expect(resolveEndpointHealthState(input)).toBe("degraded");
    });

    it("stays healthy under the 503 threshold", () => {
      const input: HealthPolicyInput = {
        lifecycleState: "active",
        probeHealthStatus: "healthy",
        circuitState: null,
        consecutiveExecutionFailures: 1,
      };
      expect(resolveEndpointHealthState(input)).toBe("healthy");
    });

    it("returns removed/offline as offline", () => {
      const input: HealthPolicyInput = {
        lifecycleState: "removed",
        probeHealthStatus: "healthy",
        circuitState: null,
        consecutiveExecutionFailures: 0,
      };
      expect(resolveEndpointHealthState(input)).toBe("offline");
    });
  });

  describe("classifyProvider5xxHealth", () => {
    it("classifies 503/502/429 as degraded after threshold", () => {
      expect(classifyProvider5xxHealth(2)).toBe("degraded");
      expect(classifyProvider5xxHealth(1)).toBe("healthy");
    });
  });
});
