import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

import {
  appendTrackBRouteAdvisoryObservation,
  buildTrackBRouteAdvisoryObservation,
  clearTrackBRouteAdvisoryCacheForTests,
  observeTrackBRouteAdvisoryForDecision,
  recallTrackBRouteAdvisory,
  rememberTrackBRouteAdvisory,
} from "../src/track-b-runtime.js";

/**
 * Run 98 R4 (stage S1, advisory-observed): the runtime records what the advisory would
 * have preferred without changing the decision, and the observations accumulate into a
 * durable ledger the operator readback can aggregate.
 */

const tempDir = async (label: string) => {
  const root = await mkdtemp(path.join(os.tmpdir(), `run98-r04-${label}-`));
  return { root, filePath: path.join(root, "track-b", "advisory-observations.json"), cleanup: () => rm(root, { recursive: true, force: true }) };
};

describe("run98 R4 advisory observation", () => {
  test("AC-R04-01 records the advised package and whether it was eligible and different", () => {
    const changed = buildTrackBRouteAdvisoryObservation({
      decisionId: "decision-1",
      routePackage: "endpoint:incumbent",
      preferredRoutePackage: "endpoint:candidate",
      eligibleRoutePackages: ["endpoint:incumbent", "endpoint:candidate"],
      advisoryState: "fresh",
      confidence: 0.82,
      profileSnapshotIds: ["snapshot:1"],
      candidateId: "candidate-1",
      advisoryId: "advisory:1",
      observedAtMs: 1,
    });
    expect(changed).toMatchObject({
      schemaVersion: "role-model.route-advisory-observation.v1",
      decisionId: "decision-1",
      routePackage: "endpoint:incumbent",
      preferredRoutePackage: "endpoint:candidate",
      preferredEligible: true,
      wouldHaveChanged: true,
      advisoryState: "fresh",
      confidence: 0.82,
      profileSnapshotIds: ["snapshot:1"],
      candidateId: "candidate-1",
      mode: "shadow",
      selection: "baseline_retained",
    });

    const ineligible = buildTrackBRouteAdvisoryObservation({
      decisionId: "decision-2",
      routePackage: "endpoint:incumbent",
      preferredRoutePackage: "endpoint:unconfigured",
      eligibleRoutePackages: ["endpoint:incumbent"],
      advisoryState: "fresh",
      confidence: 0.9,
      observedAtMs: 1,
    });
    // An advisory can never route to a candidate the base policy excluded (`AC-R13-01`).
    expect(ineligible.preferredEligible).toBe(false);
    expect(ineligible.wouldHaveChanged).toBe(false);

    const same = buildTrackBRouteAdvisoryObservation({
      decisionId: "decision-3",
      routePackage: "endpoint:incumbent",
      preferredRoutePackage: "endpoint:incumbent",
      eligibleRoutePackages: ["endpoint:incumbent"],
      advisoryState: "fresh",
      observedAtMs: 1,
    });
    expect(same.wouldHaveChanged).toBe(false);
  });

  test("AC-R04-04 stale and unavailable advisories are recorded with their reason", () => {
    const stale = buildTrackBRouteAdvisoryObservation({
      decisionId: "decision-4",
      routePackage: "endpoint:incumbent",
      advisoryState: "stale",
      confidence: 0,
      reason: "route-learning advisory authorization is invalid",
      observedAtMs: 1,
    });
    expect(stale).toMatchObject({
      advisoryState: "stale",
      wouldHaveChanged: false,
      reason: "route-learning advisory authorization is invalid",
      selection: "baseline_retained",
    });
    const unavailable = buildTrackBRouteAdvisoryObservation({
      decisionId: "decision-5",
      routePackage: "endpoint:incumbent",
      advisoryState: "unavailable",
      observedAtMs: 1,
    });
    expect(unavailable.advisoryState).toBe("unavailable");
  });

  test("AC-R04-03 the ledger accumulates the state distribution and the influence rate", async () => {
    const space = await tempDir("ledger");
    try {
      const states: Array<"fresh" | "stale" | "unavailable"> = ["fresh", "stale", "unavailable"];
      for (const [index, state] of states.entries()) {
        await appendTrackBRouteAdvisoryObservation({
          filePath: space.filePath,
          observation: buildTrackBRouteAdvisoryObservation({
            decisionId: `decision-${index}`,
            routePackage: "endpoint:incumbent",
            preferredRoutePackage: index === 0 ? "endpoint:candidate" : null,
            eligibleRoutePackages: ["endpoint:incumbent", "endpoint:candidate"],
            advisoryState: state,
            confidence: index === 0 ? 0.7 : 0,
            observedAtMs: index,
          }),
        });
      }
      const ledger = JSON.parse(await readFile(space.filePath, "utf8")) as {
        revision: number;
        totals: Record<string, number>;
        entries: readonly Record<string, unknown>[];
      };
      expect(ledger.revision).toBe(3);
      expect(ledger.entries).toHaveLength(3);
      expect(ledger.totals).toMatchObject({
        observed: 3,
        fresh: 1,
        stale: 1,
        unavailable: 1,
        wouldHaveChanged: 1,
        preferredEligible: 1,
      });
      // Influence rate = wouldHaveChanged / observed, computed by the reader.
      expect(ledger.totals.wouldHaveChanged / ledger.totals.observed).toBeCloseTo(1 / 3, 5);
    } finally {
      await space.cleanup();
    }
  });

  test("AC-R04-03 the ledger is bounded and survives a re-read", async () => {
    const space = await tempDir("bounded");
    try {
      for (let index = 0; index < 5; index += 1) {
        await appendTrackBRouteAdvisoryObservation({
          filePath: space.filePath,
          maxEntries: 2,
          observation: buildTrackBRouteAdvisoryObservation({
            decisionId: `decision-${index}`,
            routePackage: "endpoint:incumbent",
            advisoryState: "unavailable",
            observedAtMs: index,
          }),
        });
      }
      const ledger = JSON.parse(await readFile(space.filePath, "utf8")) as {
        revision: number;
        totals: Record<string, number>;
        entries: readonly { readonly decisionId: string }[];
      };
      expect(ledger.totals.observed).toBe(5);
      expect(ledger.entries).toHaveLength(2);
      expect(ledger.entries.map((entry) => entry.decisionId)).toEqual([
        "decision-3",
        "decision-4",
      ]);
    } finally {
      await space.cleanup();
    }
  });

  test("AC-R04-01/04 a live decision observes the newest advisory for its scope", () => {
    clearTrackBRouteAdvisoryCacheForTests();
    const unavailable = observeTrackBRouteAdvisoryForDecision({
      channel: "stage",
      scope: "scope:live",
      routePackage: "endpoint:incumbent",
      decisionId: "decision-live-1",
      eligibleRoutePackages: ["endpoint:incumbent", "endpoint:candidate"],
      nowMs: 1,
    });
    expect(unavailable).toMatchObject({
      advisoryState: "unavailable",
      wouldHaveChanged: false,
      selection: "baseline_retained",
    });

    rememberTrackBRouteAdvisory({
      channel: "stage",
      scope: "scope:live",
      routePackage: "endpoint:incumbent",
      preferredRoutePackage: "endpoint:candidate",
      advisoryState: "fresh",
      confidence: 0.7,
      profileSnapshotIds: ["snapshot:live"],
      candidateId: "candidate-live",
      advisoryId: "advisory:live",
      nowMs: 2,
    });
    expect(
      recallTrackBRouteAdvisory({ channel: "stage", scope: "scope:live", routePackage: "endpoint:incumbent" }),
    ).toMatchObject({ preferredRoutePackage: "endpoint:candidate", advisoryState: "fresh" });

    const observed = observeTrackBRouteAdvisoryForDecision({
      channel: "stage",
      scope: "scope:live",
      routePackage: "endpoint:incumbent",
      decisionId: "decision-live-2",
      eligibleRoutePackages: ["endpoint:incumbent", "endpoint:candidate"],
      nowMs: 3,
    });
    expect(observed).toMatchObject({
      decisionId: "decision-live-2",
      advisoryState: "fresh",
      confidence: 0.7,
      candidateId: "candidate-live",
      preferredEligible: true,
      wouldHaveChanged: true,
      selection: "baseline_retained",
    });

    // An advisory for a different scope never leaks into this decision.
    const otherScope = observeTrackBRouteAdvisoryForDecision({
      channel: "stage",
      scope: "scope:other",
      routePackage: "endpoint:incumbent",
      decisionId: "decision-live-3",
      eligibleRoutePackages: ["endpoint:incumbent"],
      nowMs: 4,
    });
    expect(otherScope.advisoryState).toBe("unavailable");
    expect(otherScope.wouldHaveChanged).toBe(false);
    clearTrackBRouteAdvisoryCacheForTests();
  });
});