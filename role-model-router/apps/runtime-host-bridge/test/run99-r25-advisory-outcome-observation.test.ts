import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

import {
  appendTrackBRouteAdvisoryObservation,
  buildLiveRouteAdvisoryObservation,
} from "../src/track-b-runtime.js";

/**
 * Run 99 R25 / addendum 06: `AC-R05-03` requires the RouterDecision to record whether the
 * advisory was applied, its package, confidence, threshold set version and the fallback reason.
 * Observed live before this slice: every ledger row said `mode: "shadow"` /
 * `selection: "baseline_retained"` because the builder hardcoded the S1 vocabulary, so the
 * Learning > Decisions page read "unavailable" even while a fresh advisory was being consulted.
 */

const decision = (overrides: Record<string, unknown> = {}) => ({
  decisionId: "decision-req-r25",
  routePackage: "deepseek.personal.deepseek-api-key.global.deepseek-flash-max",
  eligibleRoutePackages: [
    "deepseek.personal.deepseek-api-key.global.deepseek-flash-max",
    "deepseek.personal.deepseek-api-key.global.deepseek-flash-high",
  ],
  advisory: {
    candidateId: "shadow-r25",
    preferredEndpointId: "deepseek.personal.deepseek-api-key.global.deepseek-flash-high",
    advisoryId: "pack-r25",
    advisoryState: "fresh",
    confidence: 0.5,
    stage: "S2",
    policyVersion: "policy:24:46bd40b0120609c9",
    cohortPercent: 10,
  },
  outcome: {
    applied: false,
    fallbackReason: "below_confidence_floor",
    cohortBucket: 42,
    explorationMode: "baseline",
  },
  observedAtMs: 1_789_440_400_000,
  ...overrides,
});

describe("run99 R25 live advisory outcome observation", () => {
  test("records a considered-but-retained decision with its typed fallback reason", () => {
    const observation = buildLiveRouteAdvisoryObservation(decision() as never);
    expect(observation).toMatchObject({
      decisionId: "decision-req-r25",
      routePackage: "deepseek.personal.deepseek-api-key.global.deepseek-flash-max",
      preferredRoutePackage: "deepseek.personal.deepseek-api-key.global.deepseek-flash-high",
      preferredEligible: true,
      advisoryState: "fresh",
      confidence: 0.5,
      candidateId: "shadow-r25",
      advisoryId: "pack-r25",
      mode: "advisory_considered",
      selection: "baseline_retained",
      applied: false,
      fallbackReason: "below_confidence_floor",
      cohortBucket: 42,
      cohortPercent: 10,
      stage: "S2",
      policyVersion: "policy:24:46bd40b0120609c9",
      origin: "live",
    });
  });

  test("records an applied decision as influence with the stage-appropriate mode", () => {
    const applied = buildLiveRouteAdvisoryObservation(
      decision({
        outcome: {
          applied: true,
          fallbackReason: null,
          cohortBucket: 7,
          explorationMode: "advisory_considered",
        },
      }) as never,
    );
    expect(applied).toMatchObject({
      mode: "advisory_considered",
      selection: "advisory_applied",
      applied: true,
      fallbackReason: null,
      wouldHaveChanged: true,
    });

    const bounded = buildLiveRouteAdvisoryObservation(
      decision({
        advisory: { ...decision().advisory, stage: "S3" },
        outcome: { applied: true, fallbackReason: null, cohortBucket: 3 },
      }) as never,
    );
    expect(bounded).toMatchObject({ mode: "bounded_cohort", selection: "advisory_applied" });

    const active = buildLiveRouteAdvisoryObservation(
      decision({
        advisory: { ...decision().advisory, stage: "S4" },
        outcome: { applied: true, fallbackReason: null, cohortBucket: 1 },
      }) as never,
    );
    expect(active).toMatchObject({ mode: "active", selection: "advisory_applied" });
  });

  test("stays in the S1 vocabulary when the stage never consults an advisory", () => {
    const shadow = buildLiveRouteAdvisoryObservation(
      decision({
        advisory: { ...decision().advisory, stage: "S1" },
        outcome: { applied: true, fallbackReason: null },
      }) as never,
    );
    expect(shadow).toMatchObject({ mode: "shadow", selection: "baseline_retained", applied: false });
  });

  test("records the score gap and band so a refusal can be read without guessing", () => {
    // Run 99 R27: the operator has to see *why* the router refused - the confidence floor and
    // the in-band requirement are different levers and only the gap distinguishes them.
    const retained = buildLiveRouteAdvisoryObservation(
      decision({
        advisory: { ...decision().advisory, scoreBand: 0.05 },
        outcome: {
          applied: false,
          fallbackReason: "below_confidence_floor",
          scoreGapBefore: 0.031,
          cohortBucket: 42,
        },
      }) as never,
    );
    expect(retained).toMatchObject({
      fallbackReason: "below_confidence_floor",
      scoreBand: 0.05,
      scoreGapBefore: 0.031,
    });
  });
});

describe("run99 R25 advisory ledger totals", () => {
  test("tracks applied influence separately from would-have-changed evidence", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "run99-r25-ledger-"));
    try {
      const filePath = path.join(root, "advisory-observations.json");
      await appendTrackBRouteAdvisoryObservation({
        filePath,
        observation: buildLiveRouteAdvisoryObservation(decision() as never),
      });
      await appendTrackBRouteAdvisoryObservation({
        filePath,
        observation: buildLiveRouteAdvisoryObservation(
          decision({
            decisionId: "decision-req-r25-applied",
            outcome: { applied: true, fallbackReason: null, cohortBucket: 9 },
          }) as never,
        ),
      });
      const ledger = JSON.parse(await readFile(filePath, "utf8"));
      expect(ledger.totals).toMatchObject({
        observed: 2,
        applied: 1,
        considered: 2,
        wouldHaveChanged: 1,
      });
      expect(ledger.entries).toHaveLength(2);
      expect(ledger.entries[1]).toMatchObject({
        selection: "advisory_applied",
        origin: "live",
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
