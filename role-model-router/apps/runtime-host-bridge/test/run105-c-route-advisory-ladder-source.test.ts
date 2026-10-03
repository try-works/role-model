import { describe, expect, test } from "vitest";

import { readTrackBRouteAdvisoryFromRollout } from "../src/route-advisory-source.js";

/**
 * Run 105 package C (R1 read, R4, R5): the advisory source reads ONE (role, task) ladder from
 * the store's `knowledge:read-route-ladder` capability, filters ONLY by stored rung status,
 * and returns the ordered rungs plus the rank-1 available rung as the preferred endpoint.
 * `taxonomyVersion` is provenance (addendum A1); the router keeps the matching gate.
 */

interface InvokeCall {
  readonly capability: string;
  readonly value: Record<string, unknown>;
}

const context = (answer: unknown) => {
  const calls: InvokeCall[] = [];
  return {
    calls,
    invoke: async (capability: string, value: Readonly<Record<string, unknown>>) => {
      calls.push({ capability, value: { ...value } });
      return answer;
    },
    scopeId: "scope-c",
    roleId: "role.coder",
    taskTypeId: "coder.review",
    nowMs: 1_000,
    evidenceMaxAgeMs: 86_400_000,
  };
};

const ladderRead = (overrides: Record<string, unknown> = {}) => ({
  schemaVersion: "role-model.route-ladder-read.v1",
  contract: "RouteLadderPackV1",
  roleId: "role.coder",
  taskTypeId: "coder.review",
  ladder: {
    contract: "RouteLadderPackV1",
    packId: "pack-c",
    scopeId: "scope-c",
    version: 3,
    taxonomyVersion: "taxonomy-v1-alpha.1",
    rungs: [
      { endpointId: "endpoint-b", rank: 2, status: "available" },
      { endpointId: "endpoint-a", rank: 1, status: "unavailable" },
      { endpointId: "endpoint-c", rank: 3, status: "available" },
    ],
    completeness: { admitted: 2, configured: 3 },
    nextEligibleAtMs: null,
    rolledBack: { on: false, reason: null, atMs: null },
  },
  ...overrides,
});

describe("run105 C route advisory ladder source", () => {
  test("reads one role-task ladder and returns rank-sorted status-filtered rungs", async () => {
    const ctx = context(ladderRead());
    const result = await readTrackBRouteAdvisoryFromRollout(ctx as never);
    expect(result).toMatchObject({
      advisoryState: "fresh",
      roleId: "role.coder",
      taskTypeId: "coder.review",
      taxonomyVersion: "taxonomy-v1-alpha.1",
      advisoryLadder: [
        { endpointId: "endpoint-b", rank: 2, status: "available" },
        { endpointId: "endpoint-c", rank: 3, status: "available" },
      ],
      preferredRoutePackage: "endpoint-b",
    });
    // Exactly one indexed read, keyed by the composite (role, task).
    expect(ctx.calls).toEqual([
      {
        capability: "knowledge:read-route-ladder",
        value: { roleId: "role.coder", taskTypeId: "coder.review" },
      },
    ]);
  });

  test("an all-unavailable ladder is unavailable and never invents a preferred endpoint", async () => {
    const ctx = context(
      ladderRead({
        ladder: {
          ...ladderRead().ladder,
          rungs: [{ endpointId: "endpoint-a", rank: 1, status: "unavailable" }],
        },
      }),
    );
    const result = await readTrackBRouteAdvisoryFromRollout(ctx as never);
    expect(result).toMatchObject({
      advisoryState: "unavailable",
      preferredRoutePackage: null,
      advisoryLadder: [],
    });
    expect(result.reason).toMatch(/no admitted rung/i);
  });

  test("an empty or absent ladder is unavailable with the same bounded reason", async () => {
    for (const answer of [
      ladderRead({ ladder: { ...ladderRead().ladder, rungs: [] } }),
      ladderRead({ ladder: null }),
      null,
    ]) {
      const result = await readTrackBRouteAdvisoryFromRollout(context(answer) as never);
      // The shared guarantee for all three "nothing to offer" inputs is the SAME bounded outcome:
      // unavailable, no preferred package, an empty ladder. The reason is bounded too, but a
      // store that answers nothing at all is a different (also bounded) diagnosis than a ladder
      // that exists with no admitted rung.
      expect(result).toMatchObject({
        advisoryState: "unavailable",
        preferredRoutePackage: null,
        advisoryLadder: [],
      });
      expect(result.reason).toMatch(/no admitted rung|route ladder unavailable/i);
    }
  });

  test("a rolled-back ladder is refused before any rung is offered", async () => {
    const ctx = context(
      ladderRead({
        ladder: {
          ...ladderRead().ladder,
          rolledBack: { on: true, reason: "operator_rollback", atMs: 500 },
        },
      }),
    );
    const result = await readTrackBRouteAdvisoryFromRollout(ctx as never);
    expect(result).toMatchObject({
      advisoryState: "unavailable",
      preferredRoutePackage: null,
      advisoryLadder: [],
    });
    expect(result.reason).toMatch(/rolled back/i);
  });

  test("a store failure degrades to unavailable, never to influence", async () => {
    const result = await readTrackBRouteAdvisoryFromRollout({
      invoke: async () => {
        throw new Error("store offline");
      },
      scopeId: "scope-c",
      roleId: "role.coder",
      taskTypeId: "coder.review",
      nowMs: 1_000,
      evidenceMaxAgeMs: 86_400_000,
    } as never);
    expect(result).toMatchObject({ advisoryState: "unavailable", preferredRoutePackage: null });
    expect(result.reason).toMatch(/store offline|unavailable/i);
  });

  test("a missing role or task id refuses the read instead of querying the store", async () => {
    const ctx = context(ladderRead());
    const result = await readTrackBRouteAdvisoryFromRollout({ ...ctx, roleId: null } as never);
    expect(result).toMatchObject({ advisoryState: "unavailable", advisoryLadder: [] });
    expect(ctx.calls).toEqual([]);
  });
});
