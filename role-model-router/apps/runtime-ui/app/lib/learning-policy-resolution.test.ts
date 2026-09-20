import { describe, expect, test } from "vitest";

import { summarizePolicyResolution } from "./learning-policy-resolution";

/**
 * Run 98 addendum 44 `A44-S4`: the Configuration page must never present a stored policy as in effect when
 * the router resolved something else (or served the base route after a damaged source).
 */
describe("run98 a44 s4 policy resolution summary", () => {
  test("a clean readback reports both sides as authoritative", () => {
    const summary = summarizePolicyResolution({
      policyVersion: 33,
      digest: "sha256:stored",
      authoritative: true,
      routerResolution: {
        stage: "S4",
        policyVersion: 33,
        digest: "sha256:stored",
        source: "learning/activation-policy-state.json",
        degraded: null,
      },
    });
    expect(summary.authoritative).toBe(true);
    expect(summary.warning).toBeNull();
    expect(summary.routerStage).toBe("S4");
    expect(summary.storedPolicyVersion).toBe(33);
  });

  test("a degraded router resolution names the reason, the field or version and the source", () => {
    const summary = summarizePolicyResolution({
      policyVersion: 33,
      digest: "sha256:stored",
      routerResolution: {
        stage: "S0",
        policyVersion: 1,
        digest: "sha256:base",
        source: "shared/route-learning-activation-policy.json",
        degraded: {
          reason: "policy_source_invalid_field",
          detail: "global.scoreBand out of range 0..0.25 (saw 4)",
          field: "scoreBand",
          version: "role-model.route-learning-activation-policy.v1",
          source: "shared/route-learning-activation-policy.json",
        },
      },
    });
    expect(summary.authoritative).toBe(false);
    expect(summary.routerStage).toBe("S0");
    expect(summary.warning).toContain("Router degraded");
    expect(summary.warning).toContain("policy_source_invalid_field");
    expect(summary.warning).toContain("field/version: scoreBand");
    expect(summary.warning).toContain("base route (stage S0)");
    expect(summary.warning).toContain("shared/route-learning-activation-policy.json");
    expect(summary.warning).toContain("out of range");
  });

  test("a degraded stored readback is reported without claiming the router failed", () => {
    const summary = summarizePolicyResolution({
      policyVersion: 33,
      digest: "sha256:stored",
      authoritative: false,
      degraded: {
        reason: "policy_state_unreadable",
        detail: "activation policy state is not readable JSON",
        source: "learning/activation-policy-state.json",
      },
      routerResolution: { stage: "S4", policyVersion: 12, digest: "sha256:seed", source: "shared/route-learning-activation-policy.json", degraded: null },
    });
    expect(summary.authoritative).toBe(false);
    expect(summary.warning).toContain("Stored policy degraded");
    expect(summary.warning).not.toContain("base route");
    expect(summary.routerStage).toBe("S4");
  });

  test("a missing readback is not a degradation claim", () => {
    const summary = summarizePolicyResolution(null);
    expect(summary.authoritative).toBe(true);
    expect(summary.warning).toBeNull();
    expect(summary.routerStage).toBeNull();
  });
});
