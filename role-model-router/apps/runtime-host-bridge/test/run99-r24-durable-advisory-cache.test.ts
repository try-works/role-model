import { describe, expect, test } from "vitest";

import {
  recallNewestTrackBRouteAdvisory,
  recallTrackBDurableRouteAdvisory,
  rememberTrackBDurableRouteAdvisory,
  rememberTrackBRouteAdvisory,
} from "../src/track-b-runtime.js";

/**
 * Run 99 R24 / addendum 06: the durable advisory is the authorization for influence, so it is
 * cached apart from the per-replay advisory and survives an empty pipeline entry.
 */

describe("run99 R24 durable route advisory cache", () => {
  test("keeps the activated pack independent from the per-replay advisory", () => {
    const channel = "stage";
    const scope = "run99-r24-cache-scope";

    rememberTrackBRouteAdvisory({
      channel,
      scope,
      routePackage: "route-package:transient",
      preferredRoutePackage: null,
      advisoryState: "fresh",
      confidence: 0,
      profileSnapshotIds: [],
      candidateId: null,
      advisoryId: "advisory:transient",
      nowMs: 1_000,
    });
    rememberTrackBDurableRouteAdvisory({
      channel,
      scope,
      advisory: {
        preferredRoutePackage: "deepseek.flash-high",
        advisoryState: "fresh",
        confidence: 0.82,
        candidateId: "shadow-r24",
        advisoryId: "pack-r24",
        cohortPercent: 10,
        reason: null,
      },
      nowMs: 2_000,
    });

    const durable = recallTrackBDurableRouteAdvisory({ channel, scope });
    expect(durable).toMatchObject({
      preferredRoutePackage: "deepseek.flash-high",
      confidence: 0.82,
      candidateId: "shadow-r24",
      advisoryId: "pack-r24",
      cohortPercent: 10,
      reason: null,
      cachedAtMs: 2_000,
    });
    // The transient entry stays where it was: the pipeline cache is evidence, not authorization.
    expect(recallNewestTrackBRouteAdvisory({ channel, scope })).toMatchObject({
      advisoryId: "advisory:transient",
      preferredRoutePackage: null,
    });
    expect(recallTrackBDurableRouteAdvisory({ channel, scope: "other-scope" })).toBeNull();
  });

  test("records an unavailable durable answer instead of leaving a stale fresh advisory", () => {
    const channel = "stage";
    const scope = "run99-r24-unavailable-scope";
    rememberTrackBDurableRouteAdvisory({
      channel,
      scope,
      advisory: {
        preferredRoutePackage: null,
        advisoryState: "unavailable",
        confidence: 0,
        candidateId: null,
        advisoryId: null,
        cohortPercent: 0,
        reason: "no active pack",
      },
      nowMs: 5_000,
    });
    expect(recallTrackBDurableRouteAdvisory({ channel, scope })).toMatchObject({
      advisoryState: "unavailable",
      reason: "no active pack",
      preferredRoutePackage: null,
      cohortPercent: 0,
    });
  });
});
