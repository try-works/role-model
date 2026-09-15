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

  /**
   * Run 99 R33 (addendum 21 D12): the five-minute "canonical" bound was read by nothing. The
   * replacement is an operator-settable advisory-source age limit the runtime actually enforces:
   * a record older than the bound is reported `stale` with a bounded reason instead of silently
   * continuing to authorize influence.
   */
  test("an advisory older than the source age bound is reported stale", () => {
    const channel = "stage";
    const scope = "run99-r33-advisory-age-scope";
    rememberTrackBDurableRouteAdvisory({
      channel,
      scope,
      advisory: {
        preferredRoutePackage: "deepseek.flash-high",
        advisoryState: "fresh",
        confidence: 0.82,
        candidateId: "shadow-r33",
        advisoryId: "pack-r33",
        cohortPercent: 100,
        reason: null,
      },
      nowMs: 1_000,
    });

    expect(
      recallTrackBDurableRouteAdvisory({ channel, scope, nowMs: 1_000, maxAgeMs: 900_000 })
        ?.advisoryState,
    ).toBe("fresh");

    const aged = recallTrackBDurableRouteAdvisory({
      channel,
      scope,
      nowMs: 1_000 + 900_001,
      maxAgeMs: 900_000,
    });
    expect(aged?.advisoryState).toBe("stale");
    expect(aged?.reason).toMatch(/max age/i);
    // Without a bound the record is returned unchanged, so existing callers keep their behaviour.
    expect(
      recallTrackBDurableRouteAdvisory({ channel, scope, nowMs: 1_000 + 900_001 })?.advisoryState,
    ).toBe("fresh");
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

  /**
   * Run 99 R33 (S37 live finding): a durable entry scoped to another task family must still reach
   * the router, so the refusal is reported as `advisory_task_mismatch`. Withholding it in the cache
   * made the host fall through to the transient pipeline advisory, which the eligibility gate
   * refuses first — hiding the family verdict from the operator.
   */
  test("a family-mismatched durable advisory is returned so the router can name the refusal", () => {
    const channel = "stage";
    const scope = "run99-r33-family-mismatch-scope";
    rememberTrackBDurableRouteAdvisory({
      channel,
      scope,
      advisory: {
        preferredRoutePackage: "moonshot.personal.kimi-code.global.kimi-k3",
        advisoryState: "fresh",
        confidence: 0.82,
        candidateId: "shadow-r33-family",
        advisoryId: "pack-r33-family-proof",
        cohortPercent: 100,
        reason: null,
        taskTypeId: "coder.review",
        taxonomyVersion: "1.0.0-alpha.1",
      },
      nowMs: 1_000,
    });

    const other = recallTrackBDurableRouteAdvisory({
      channel,
      scope,
      taskTypeId: "coder.test.write",
    });
    expect(other?.taskTypeId).toBe("coder.review");
    expect(other?.advisoryState).toBe("fresh");
  });
});
