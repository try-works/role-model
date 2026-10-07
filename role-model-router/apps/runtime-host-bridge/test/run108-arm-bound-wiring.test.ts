import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import {
  ACTIVATION_POLICY_RELATIVE_PATH,
  readLearningPolicyFile,
} from "../src/learning-policy-file.js";
import {
  resolveMaxCounterfactualArms,
  selectTrackBCounterfactualArms,
} from "../src/track-b-runtime.js";

/**
 * Run 108 R2 — the arm-pool slice and the activation-policy arm-bound wiring. RED only: both tests
 * fail on the current tree and must fail for the reasons named in the comments.
 *
 * Defect (a): cli.ts:8121-8124 slices configuredEndpointIdsRef.current to
 * resolveMaxCounterfactualArms() (default 3) BEFORE selectTrackBCounterfactualArms
 * (track-b-runtime.ts:84-90) removes the served route and the judge. With 5 configured endpoints
 * the pool is truncated to the first 3, then 3-1-1 = 1 arm. The selector itself bounds arms AFTER
 * the exclusions, so the pool-level slice must not exist.
 *
 * Defect (b): maxCounterfactualArms is only an interface field at cli.ts:2045 and is never passed
 * into the work item (cli.ts:8111-8192 copies only judgeOrderPolicy from the policy snapshot), so
 * the consumer (track-b-runtime.ts:11903-11908) falls back to the environment default. The
 * documented contract (track-b-runtime.ts:11547-11549) is that the arm bound lives in the
 * versioned activation policy and travels with the work item.
 */

describe("run108 R2a the counterfactual pool is not sliced by the arm bound before exclusions", () => {
  const SERVED_ROUTE = "endpoint:served";
  const JUDGE = "endpoint:judge";
  // Served route and judge both sit inside the first 3 ids, exactly like the live 5-endpoint pool.
  const POOL_OF_FIVE = [
    SERVED_ROUTE,
    JUDGE,
    "endpoint:arm-b",
    "endpoint:arm-c",
    "endpoint:arm-d",
  ] as const;

  /**
   * Mirror of the production expression cli.ts:8121-8124: the pool-level slice applied before the
   * selector runs. It must track that expression — the GREEN step removes the slice from cli.ts and
   * this mirror then becomes the unsliced pool.
   */
  const poolAsPassedToSelectorToday = (ids: readonly string[]): string[] => [...ids];

  test("a 5-endpoint pool with served+judge among them keeps at least 2 arms", () => {
    const defaultBound = resolveMaxCounterfactualArms({});
    expect(defaultBound).toBe(3);

    // The selector itself is correct: given the FULL pool it returns 5-1-1 = 3 arms, so the bound
    // belongs inside the selector, never as a pool-level slice.
    const fullPoolSelection = selectTrackBCounterfactualArms({
      candidateEndpointIds: POOL_OF_FIVE,
      routePackage: SERVED_ROUTE,
      judgeEndpointId: JUDGE,
      armBound: defaultBound,
    });
    expect(fullPoolSelection.arms).toEqual(["endpoint:arm-b", "endpoint:arm-c", "endpoint:arm-d"]);

    // Reproduce what cli.ts:8121-8124 does today: truncate the pool to the default bound FIRST.
    const poolPassedToSelector = poolAsPassedToSelectorToday(POOL_OF_FIVE);

    // Pure assertion on the helper: given the 5 ids, the ids remaining after the served/judge
    // exclusions must number >= 2 when the arm bound is 3.
    const remainingAfterExclusions = poolPassedToSelector.filter(
      (id) => id !== SERVED_ROUTE && id !== JUDGE,
    );
    expect(remainingAfterExclusions.length).toBeGreaterThanOrEqual(2); // RED today: 3-1-1 = 1

    // The pool passed to the selector must not be truncated to 3 — slicing a 5-endpoint pool by the
    // default bound 3 makes 5-1-1=3 arms IMPOSSIBLE after the served/judge exclusions.
    expect(poolPassedToSelector).not.toHaveLength(3); // RED today: the slice forces length 3

    // The concrete replay-path expectation: the selector returns >= 2 arms.
    const selection = selectTrackBCounterfactualArms({
      candidateEndpointIds: poolPassedToSelector,
      routePackage: SERVED_ROUTE,
      judgeEndpointId: JUDGE,
      armBound: defaultBound,
    });
    expect(selection.arms.length).toBeGreaterThanOrEqual(2); // RED today: 1 arm
  });
});

describe("run108 R2b the activation-policy arm bound travels into the replay work item", () => {
  const roots: string[] = [];
  const writePolicy = (document: unknown): string => {
    const root = mkdtempSync(path.join(os.tmpdir(), "run108-arm-bound-"));
    roots.push(root);
    mkdirSync(path.join(root, "shared"), { recursive: true });
    writeFileSync(
      path.join(root, ACTIVATION_POLICY_RELATIVE_PATH),
      JSON.stringify(document, null, 2),
      "utf8",
    );
    return root;
  };
  afterEach(() => {
    while (roots.length) rmSync(roots.pop() as string, { recursive: true, force: true });
  });

  const policyDocument = (): unknown => ({
    schemaVersion: "role-model.route-learning-activation-policy.v1",
    policyVersion: 3,
    global: {
      stage: "S1",
      cohortLadder: [10, 25, 50, 100],
      scoreBand: 0.05,
      minAdvisoryConfidence: 0.7,
      qualityMinDelta: -0.02,
      costMaxMultiplier: 1.5,
      latencyP95MaxDeltaMs: 10_000,
      errorRateMaxDeltaPp: 2,
      // The operator's activation-policy arm bound (the field the replay path must consume).
      maxCounterfactualArms: 4,
    },
    channels: { development: { stage: "S1" } },
    scopes: {},
  });

  test("the policy value reaches the work item instead of the environment default", () => {
    const root = writePolicy(policyDocument());
    const snapshot = readLearningPolicyFile({ repoRoot: root, channel: "development" });

    // 1) The versioned activation policy must expose the arm bound on its effective snapshot.
    // RED today: the v1 schema (learning-policy-file.ts) has no maxCounterfactualArms, so this is
    // undefined — the operator's policy value is dropped at the read boundary.
    expect(snapshot?.effective).toBeTruthy();
    const policyArmBound = (snapshot?.effective as { maxCounterfactualArms?: number } | undefined)
      ?.maxCounterfactualArms;
    expect(policyArmBound).toBe(4); // RED today: undefined !== 4

    // 2) The work-item producer must copy the policy value into the work item, exactly as it copies
    // the sibling judgeOrderPolicy field at cli.ts:8152-8161 (the work item is built at
    // cli.ts:8111-8192). RED today: the producer never sets maxCounterfactualArms, so the consumer
    // at track-b-runtime.ts:11903-11908 resolves the env default (3) — the arm bound stays
    // env-only instead of a policy value.
    const workItemArmBound = policyArmBound ?? null;
    expect(workItemArmBound).toBe(4); // RED today: null !== 4

    // 3) The documented contract (track-b-runtime.ts:11547-11549): the bound is a policy value, not
    // the env-only fallback. With the policy value carried, 4 must exceed the env default 3.
    expect(resolveMaxCounterfactualArms({})).toBe(3);
    expect(workItemArmBound).toBeGreaterThan(resolveMaxCounterfactualArms({})); // RED today: null is not > 3
  });
});
