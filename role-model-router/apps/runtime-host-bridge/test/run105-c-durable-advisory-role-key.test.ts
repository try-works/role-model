import { describe, expect, test } from "vitest";

import {
  clearTrackBDurableRouteAdvisoryCacheForTests,
  recallTrackBDurableRouteAdvisory,
  rememberTrackBDurableRouteAdvisory,
} from "../src/track-b-runtime.js";

/**
 * Run 105 package C (C11): the advisory layer had no roleId anywhere, so one scope's advisory
 * could be recalled for another role. The durable cache key gains the role dimension
 * (`channel NUL scope NUL roleId`), remember/recall accept it, a re-remember refreshes recency,
 * and the cache bound is raised for the per-(role, task) fan-out.
 */

const advisory = (preferredRoutePackage: string | null, overrides: Record<string, unknown> = {}) => ({
  preferredRoutePackage,
  advisoryState: "fresh" as const,
  confidence: 0.8,
  candidateId: "candidate-1",
  advisoryId: "pack-1",
  cohortPercent: 100,
  reason: null,
  taskTypeId: "coder.review",
  taxonomyVersion: "taxonomy-v1-alpha.1",
  revalidationDue: false,
  ...overrides,
});

describe("run105 C durable advisory role key", () => {
  test("C11 two roles in one scope keep separate durable entries", () => {
    clearTrackBDurableRouteAdvisoryCacheForTests();
    rememberTrackBDurableRouteAdvisory({
      channel: "stage",
      scope: "scope-c",
      roleId: "role.coder",
      advisory: advisory("endpoint-a") as never,
      nowMs: 1_000,
    });
    rememberTrackBDurableRouteAdvisory({
      channel: "stage",
      scope: "scope-c",
      roleId: "role.planner",
      advisory: advisory("endpoint-b") as never,
      nowMs: 2_000,
    });

    expect(
      recallTrackBDurableRouteAdvisory({ channel: "stage", scope: "scope-c", roleId: "role.coder" })
        ?.preferredRoutePackage,
    ).toBe("endpoint-a");
    expect(
      recallTrackBDurableRouteAdvisory({
        channel: "stage",
        scope: "scope-c",
        roleId: "role.planner",
      })?.preferredRoutePackage,
    ).toBe("endpoint-b");
    // A different role never reads the other role's entitlement.
    expect(
      recallTrackBDurableRouteAdvisory({ channel: "stage", scope: "scope-c", roleId: "role.other" }),
    ).toBeNull();
  });

  test("C11 a null roleId keeps the pre-run105 (channel, scope) behaviour", () => {
    clearTrackBDurableRouteAdvisoryCacheForTests();
    rememberTrackBDurableRouteAdvisory({
      channel: "stage",
      scope: "scope-unscoped",
      advisory: advisory("endpoint-c") as never,
      nowMs: 1_000,
    });
    expect(
      recallTrackBDurableRouteAdvisory({ channel: "stage", scope: "scope-unscoped" })
        ?.preferredRoutePackage,
    ).toBe("endpoint-c");
  });

  test("C11 re-remembering the same (channel, scope, role) refreshes the entry in place", () => {
    clearTrackBDurableRouteAdvisoryCacheForTests();
    rememberTrackBDurableRouteAdvisory({
      channel: "stage",
      scope: "scope-refresh",
      roleId: "role.coder",
      advisory: advisory("endpoint-a") as never,
      nowMs: 1_000,
    });
    rememberTrackBDurableRouteAdvisory({
      channel: "stage",
      scope: "scope-refresh",
      roleId: "role.coder",
      advisory: advisory("endpoint-d") as never,
      nowMs: 9_000,
    });
    const entry = recallTrackBDurableRouteAdvisory({
      channel: "stage",
      scope: "scope-refresh",
      roleId: "role.coder",
    });
    expect(entry?.preferredRoutePackage).toBe("endpoint-d");
    expect(entry?.cachedAtMs).toBe(9_000);
  });

  test("C11 the recency bound still ages a role-scoped entry", () => {
    clearTrackBDurableRouteAdvisoryCacheForTests();
    rememberTrackBDurableRouteAdvisory({
      channel: "stage",
      scope: "scope-age",
      roleId: "role.coder",
      advisory: advisory("endpoint-a") as never,
      nowMs: 1_000,
    });
    expect(
      recallTrackBDurableRouteAdvisory({
        channel: "stage",
        scope: "scope-age",
        roleId: "role.coder",
        nowMs: 2_000,
        maxAgeMs: 500,
      })?.advisoryState,
    ).toBe("stale");
  });

  test("C11 the cache bound is raised to 512 for the per-(role, task) fan-out", () => {
    clearTrackBDurableRouteAdvisoryCacheForTests();
    for (let index = 0; index < 520; index += 1) {
      rememberTrackBDurableRouteAdvisory({
        channel: "stage",
        scope: `scope-${index}`,
        roleId: "role.coder",
        advisory: advisory(`endpoint-${index}`) as never,
        nowMs: index,
      });
    }
    // The oldest entries are evicted, but the newest 512 survive (the pre-run105 bound was 128).
    expect(
      recallTrackBDurableRouteAdvisory({
        channel: "stage",
        scope: "scope-519",
        roleId: "role.coder",
      })?.preferredRoutePackage,
    ).toBe("endpoint-519");
    expect(
      recallTrackBDurableRouteAdvisory({
        channel: "stage",
        scope: "scope-200",
        roleId: "role.coder",
      })?.preferredRoutePackage,
    ).toBe("endpoint-200");
    expect(
      recallTrackBDurableRouteAdvisory({
        channel: "stage",
        scope: "scope-7",
        roleId: "role.coder",
      }),
    ).toBeNull();
  });
});
