import { describe, expect, test } from "vitest";

import { selectTrackBLearningTarget } from "../src/track-b-learning-evidence.js";

/**
 * Run 97 Repair Cycle 06 - L6.
 *
 * The routed package of a counterfactual comparison is the *winner's* package, not
 * always the incumbent's. Live stage v39 evidence: 28 finalized groups, three of them
 * decided for the incumbent (`outcome: "source"`) and one for the counterfactual
 * (`outcome: "candidate"`), with the learned evidence discarded in every direction.
 * Canonical basis: `guidance/07` ("compare winners and losers", `add`/`keep`) and
 * `guidance/13` (route-package attribution is the package a comparison measured).
 */

const member = (
  overrides: Record<string, unknown>,
): Record<string, unknown> => ({
  trialId: "trial:source",
  scoreId: "trial-score:source",
  score: 1,
  confidence: 1,
  disposition: "positive",
  role: "source",
  candidateRef: "endpoint:source",
  ...overrides,
});

describe("run97 rc06 learning target selection", () => {
  test("an incumbent win learns about the incumbent package", () => {
    const target = selectTrackBLearningTarget({
      comparisonOutcome: "source",
      members: [member({}), member({ trialId: "trial:counterfactual", disposition: "negative", role: "counterfactual", score: 0, candidateRef: "endpoint:counterfactual" })],
      sourceRoutePackage: "endpoint:source",
    });
    expect(target).toEqual({
      decisive: true,
      winnerRole: "source",
      routePackage: "endpoint:source",
    });
  });

  test("a counterfactual win learns about the counterfactual package", () => {
    const target = selectTrackBLearningTarget({
      comparisonOutcome: "candidate",
      members: [
        member({ disposition: "negative", role: "source", score: 0 }),
        member({
          trialId: "trial:counterfactual",
          disposition: "positive",
          role: "counterfactual",
          candidateRef: "endpoint:counterfactual",
        }),
      ],
      sourceRoutePackage: "endpoint:source",
      routePackages: [
        { endpointId: "endpoint:source", routePackage: "package:incumbent" },
        { endpointId: "endpoint:counterfactual", routePackage: "package:counterfactual" },
      ],
    });
    expect(target).toEqual({
      decisive: true,
      winnerRole: "counterfactual",
      routePackage: "package:counterfactual",
    });
  });

  test("non-decisive comparisons have no learning target", () => {
    for (const comparisonOutcome of ["tie", "disagreement", "insufficient", "incomplete", "rejected", null]) {
      expect(
        selectTrackBLearningTarget({
          comparisonOutcome,
          members: [member({})],
          sourceRoutePackage: "endpoint:source",
        }),
      ).toEqual({ decisive: false, winnerRole: null, routePackage: null });
    }
  });

  test("the winner role is implied by the outcome when dispositions are absent", () => {
    expect(
      selectTrackBLearningTarget({
        comparisonOutcome: "source",
        members: [],
        sourceRoutePackage: "endpoint:source",
      }),
    ).toEqual({ decisive: true, winnerRole: "source", routePackage: "endpoint:source" });
    // A counterfactual win with no recorded winner reference cannot be attributed to
    // any package: the incumbent's package is the loser, so the target fails closed
    // instead of learning the wrong package.
    expect(
      selectTrackBLearningTarget({
        comparisonOutcome: "candidate",
        members: [],
        sourceRoutePackage: "endpoint:source",
      }),
    ).toEqual({
      decisive: true,
      winnerRole: "counterfactual",
      routePackage: null,
    });
  });

  test("a single counterfactual comparison resolves the winner without member refs", () => {
    expect(
      selectTrackBLearningTarget({
        comparisonOutcome: "candidate",
        members: [],
        sourceRoutePackage: "endpoint:source",
        counterfactualRoutePackages: ["endpoint:counterfactual"],
      }),
    ).toEqual({
      decisive: true,
      winnerRole: "counterfactual",
      routePackage: "endpoint:counterfactual",
    });
  });

  test("several counterfactual packages stay ambiguous and fail closed", () => {
    expect(
      selectTrackBLearningTarget({
        comparisonOutcome: "candidate",
        members: [],
        sourceRoutePackage: "endpoint:source",
        counterfactualRoutePackages: ["endpoint:a", "endpoint:b"],
      }),
    ).toEqual({
      decisive: true,
      winnerRole: "counterfactual",
      routePackage: null,
    });
  });
});
