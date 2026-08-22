import { describe, expect, it } from "vitest";

import {
  ADMISSION_LIFECYCLE,
  type AdmissionLifecycleState,
  type EndpointLifecycleTransitionInput,
  type EndpointLifecycleTransitionResult,
  createAdmissionReceipt,
  describeEndpointLifecycle,
  transitionEndpointLifecycle,
} from "../src/runtime-endpoint-lifecycle.js";

describe("runtime-endpoint-lifecycle", () => {
  describe("transitionEndpointLifecycle", () => {
    it("accepts a legal add/re-add transition from none to pending-admission", () => {
      const result = transitionEndpointLifecycle({
        currentState: null,
        nextState: "pending-admission",
        reasonCode: "add",
        nowMs: 1_000,
      });
      expect(result.ok).toBe(true);
      expect(result.next?.state).toBe("pending-admission");
      expect(result.next?.admittedAtMs).toBeUndefined();
      expect(result.next?.transitionedAtMs).toBe(1_000);
    });

    it("accepts admission success pending-admission -> active and records admittedAtMs", () => {
      const result = transitionEndpointLifecycle({
        currentState: { state: "pending-admission", reasonCode: "add", transitionedAtMs: 1_000 },
        nextState: "active",
        reasonCode: "admission-probe-success",
        nowMs: 2_000,
      });
      expect(result.ok).toBe(true);
      expect(result.next?.state).toBe("active");
      expect(result.next?.admittedAtMs).toBe(2_000);
    });

    it("accepts probe failure pending-admission -> degraded with an actionable reason", () => {
      const result = transitionEndpointLifecycle({
        currentState: { state: "pending-admission", reasonCode: "add", transitionedAtMs: 1_000 },
        nextState: "degraded",
        reasonCode: "probe-503",
        reasonMessage: "upstream 503 upstream_connection_error",
        nowMs: 2_000,
      });
      expect(result.ok).toBe(true);
      expect(result.next?.state).toBe("degraded");
      expect(result.next?.reasonCode).toBe("probe-503");
      expect(result.next?.reasonMessage).toContain("503");
    });

    it("rejects active -> pending-admission (no re-admission after admitted)", () => {
      const result = transitionEndpointLifecycle({
        currentState: {
          state: "active",
          reasonCode: "admission-probe-success",
          transitionedAtMs: 1_000,
          admittedAtMs: 1_000,
        },
        nextState: "pending-admission",
        reasonCode: "re-add",
        nowMs: 2_000,
      });
      expect(result.ok).toBe(false);
      expect((result as { ok: false }).error).toContain("illegal");
    });

    it("rejects removed -> active without a pending-admission re-entry", () => {
      const result = transitionEndpointLifecycle({
        currentState: {
          state: "removed",
          reasonCode: "remove",
          transitionedAtMs: 1_000,
          admittedAtMs: 500,
        },
        nextState: "active",
        reasonCode: "re-add",
        nowMs: 2_000,
      });
      expect(result.ok).toBe(false);
      expect((result as { ok: false }).error).toContain("illegal");
    });

    it("rejects a null nextState", () => {
      const result = transitionEndpointLifecycle({
        currentState: { state: "pending-admission", reasonCode: "add", transitionedAtMs: 1_000 },
        nextState: null as unknown as AdmissionLifecycleState,
        reasonCode: "add",
        nowMs: 2_000,
      });
      expect(result.ok).toBe(false);
    });

    it("rejects an unknown state name", () => {
      const result = transitionEndpointLifecycle({
        currentState: null,
        nextState: "bogus" as AdmissionLifecycleState,
        reasonCode: "add",
        nowMs: 2_000,
      });
      expect(result.ok).toBe(false);
    });

    it("removal accepts active -> removed and preserves admittedAtMs", () => {
      const result = transitionEndpointLifecycle({
        currentState: {
          state: "active",
          reasonCode: "admission-probe-success",
          transitionedAtMs: 1_000,
          admittedAtMs: 1_000,
        },
        nextState: "removed",
        reasonCode: "remove",
        nowMs: 2_000,
      });
      expect(result.ok).toBe(true);
      expect(result.next?.state).toBe("removed");
      expect(result.next?.admittedAtMs).toBe(1_000);
    });
  });

  describe("createAdmissionReceipt", () => {
    it("creates a sanitized secret-free receipt", () => {
      const receipt = createAdmissionReceipt({
        endpointId: "acct.global.gpt-5-high",
        lifecycleState: "active",
        reasonCode: "admission-probe-success",
        nowMs: 1_000,
      });
      expect(receipt.endpointId).toBe("acct.global.gpt-5-high");
      expect(receipt.lifecycleState).toBe("active");
      expect(receipt.reasonCode).toBe("admission-probe-success");
      expect(receipt.transitionedAtMs).toBe(1_000);
      expect(receipt.receiptId).toMatch(/^adm-[a-z0-9]{6,}$/);
      expect(receipt.secretFree).toBe(true);
    });
  });

  describe("describeEndpointLifecycle", () => {
    it("describes every canonical state", () => {
      const labels = Object.fromEntries(
        ADMISSION_LIFECYCLE.map((state) => [state, describeEndpointLifecycle(state).label]),
      );
      expect(labels["pending-admission"]).toBeTruthy();
      expect(labels.active).toBeTruthy();
      expect(labels.degraded).toBeTruthy();
      expect(labels.removed).toBeTruthy();
    });
  });
});
