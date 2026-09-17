import { expect, test } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  createPairCoverageLedger,
  pairKey,
  planPairComparisons,
} from "../src/track-b-pair-coverage.js";
import { resolveMaxExtraPairComparisons } from "../src/cli.js";

test("run98 A34 S1 the extra-pair bound defaults to three and refuses nonsense", () => {
  expect(resolveMaxExtraPairComparisons({})).toBe(3);
  expect(resolveMaxExtraPairComparisons({ ROLE_MODEL_MAX_EXTRA_PAIR_COMPARISONS: "0" })).toBe(0);
  expect(resolveMaxExtraPairComparisons({ ROLE_MODEL_MAX_EXTRA_PAIR_COMPARISONS: "2" })).toBe(2);
  // Out-of-range or unparseable values fall back to the default rather than disabling the feature.
  expect(resolveMaxExtraPairComparisons({ ROLE_MODEL_MAX_EXTRA_PAIR_COMPARISONS: "99" })).toBe(3);
  expect(resolveMaxExtraPairComparisons({ ROLE_MODEL_MAX_EXTRA_PAIR_COMPARISONS: "soon" })).toBe(3);
});

/**
 * Run 98 addendum 34 S1. Live v211: 501 groups, every one of them two members, `deepseek-flash-high` in
 * 497, and 13 of 21 candidate pairs with no direct comparison — every missing pair excludes the served
 * model, so rotating the counterfactual arm cannot close any of them. The planner below chooses the
 * comparisons a capture adds, least-covered pair first.
 */

const arm = (id: string) => id;

test("run98 A34 S1 a star-shaped store closes its missing pairs before repeating a covered one", () => {
  // The live shape: a hub with every pair it already covers, plus arms whose mutual pairs are at zero.
  const coverage = {
    pairCounts: {
      [pairKey("hub", "a")]: 283,
      [pairKey("hub", "b")]: 148,
      [pairKey("hub", "c")]: 57,
    },
  };
  const planned = planPairComparisons({
    source: arm("hub"),
    arms: [arm("a"), arm("b"), arm("c")],
    endpointIdOf: (value) => value,
    coverage,
    maxPairs: 3,
  });
  // The three zero-coverage pairs (a,b), (a,c) and (b,c) come first; the hub's own pairs wait.
  expect(planned.map((pair) => [pair.left, pair.right, pair.priorCount])).toEqual([
    ["a", "b", 0],
    ["a", "c", 0],
    ["b", "c", 0],
  ]);
});

test("run98 A34 S1 the plan is deterministic and bounded", () => {
  const coverage = { pairCounts: { [pairKey("hub", "a")]: 0 } };
  const plan = () =>
    planPairComparisons({
      source: arm("hub"),
      arms: [arm("c"), arm("a"), arm("b")],
      endpointIdOf: (value) => value,
      coverage,
      maxPairs: 2,
    });
  expect(plan()).toEqual(plan());
  expect(plan()).toHaveLength(2);
});

test("run98 A34 S1 once the graph is connected the plan stops adding comparisons", () => {
  const coverage = {
    pairCounts: {
      [pairKey("hub", "a")]: 5,
      [pairKey("hub", "b")]: 5,
      [pairKey("hub", "c")]: 5,
      [pairKey("a", "b")]: 4,
      [pairKey("a", "c")]: 4,
      [pairKey("b", "c")]: 4,
    },
  };
  const planned = planPairComparisons({
    source: arm("hub"),
    arms: [arm("a"), arm("b"), arm("c")],
    endpointIdOf: (value) => value,
    coverage,
    maxPairs: 2,
    // The capture has already produced every pair it could (the caller marks them), so a repeat tick
    // plans nothing: the planner never re-spends on a pair the capture already contributed.
    excludePairs: [
      pairKey("hub", "a"),
      pairKey("hub", "b"),
      pairKey("hub", "c"),
      pairKey("a", "b"),
      pairKey("a", "c"),
      pairKey("b", "c"),
    ],
  });
  expect(planned).toEqual([]);
});

test("run98 A34 S1 the ledger survives a restart and drives the next plan", () => {
  const root = mkdtempSync(path.join(tmpdir(), "a34-pair-ledger-"));
  const filePath = path.join(root, "pair-coverage-ledger.json");
  try {
    const ledger = createPairCoverageLedger({ filePath });
    expect(ledger.snapshot().pairCounts).toEqual({});
    ledger.record("hub", "a");
    ledger.record("a", "hub"); // order-independent
    ledger.record("hub", "b");

    const reopened = createPairCoverageLedger({ filePath });
    expect(reopened.snapshot().pairCounts[pairKey("hub", "a")]).toBe(2);
    const planned = planPairComparisons({
      source: "hub",
      arms: ["a", "b"],
      endpointIdOf: (value) => value,
      coverage: reopened.snapshot(),
      maxPairs: 1,
    });
    // (hub,b) has one comparison and (a,b) has none, so the uncovered pair is planned first.
    expect(planned.map((pair) => [pair.left, pair.right])).toEqual([["a", "b"]]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
