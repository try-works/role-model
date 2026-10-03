import { describe, expect, test } from "vitest";
import {
  compareLadderRows,
  formatLadderCompleteness,
  ladderRowActive,
  ladderRowState,
  normalizeLadderRows,
  topLadderEndpoints,
  type LadderRowView,
} from "./learning-ladder";

const row = (overrides: Partial<LadderRowView> = {}): LadderRowView => ({
  roleId: "writer",
  taskTypeId: "coder.explain",
  taxonomyVersion: "1.0",
  topEndpoints: [
    { endpointId: "provider.model-a", rank: 1, status: "available" },
    { endpointId: "provider.model-b", rank: 2, status: "available" },
    { endpointId: "provider.model-c", rank: 3, status: "available" },
  ],
  rankedCount: 5,
  completeness: { admitted: 3, configured: 7 },
  state: "partial",
  active: true,
  rolledBack: { on: false, reason: null, atMs: null },
  ladderVersion: 2,
  nextEligibleAtMs: null,
  ...overrides,
});

describe("learning ladder normalization and projection", () => {
  test("normalizes one row per role/task, publishes exactly three endpoints in rank order, and never fabricates absence as zero", () => {
    const rows = normalizeLadderRows({
      ladders: [{
        roleId: "writer", taskTypeId: "coder.explain", taxonomyVersion: "1.0",
        topEndpoints: [
          { endpointId: "e3", rank: 3, status: "available" },
          { endpointId: "e1", rank: 1, status: "available" },
          { endpointId: "e2", rank: 2, status: "unavailable" },
          { endpointId: "e4", rank: 4, status: "available" },
        ], rankedCount: 5, completeness: { admitted: 3, configured: 7 }, state: "partial",
        rolledBack: { on: false, reason: null, atMs: null }, ladderVersion: 1,
      }],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].topEndpoints).toEqual([
      { endpointId: "e1", rank: 1, status: "available" },
      { endpointId: "e2", rank: 2, status: "unavailable" },
      { endpointId: "e3", rank: 3, status: "available" },
    ]);
    expect(rows[0].rankedCount).toBe(5);
    expect(normalizeLadderRows({}).at(0)?.completeness.admitted).toBeUndefined();
    expect(normalizeLadderRows({ ladders: [{ roleId: "writer" }] })).toHaveLength(1);
  });

  test("compares complete first, then partial by largest unfilled gap, then no ladder with deterministic ties", () => {
    const complete = row({ roleId: "z", taskTypeId: "z", state: "complete", completeness: { admitted: 7, configured: 7 } });
    const gap2 = row({ roleId: "a", taskTypeId: "z", completeness: { admitted: 5, configured: 7 } });
    const gap5 = row({ roleId: "b", taskTypeId: "a", completeness: { admitted: 2, configured: 7 } });
    const tieB = row({ roleId: "b", taskTypeId: "z", completeness: { admitted: 2, configured: 7 } });
    const none = row({ roleId: "a", taskTypeId: "a", state: "no_ladder", completeness: { admitted: 0, configured: 7 }, active: false });
    const shuffled = [tieB, none, gap2, complete, gap5];
    const expected = [complete, gap5, tieB, gap2, none];
    expect([...shuffled].sort(compareLadderRows).map((r) => [r.roleId, r.taskTypeId])).toEqual(expected.map((r) => [r.roleId, r.taskTypeId]));
    expect(shuffled.slice().reverse().sort(compareLadderRows).map((r) => [r.roleId, r.taskTypeId])).toEqual(expected.map((r) => [r.roleId, r.taskTypeId]));
  });

  test("formats completeness, derives no_ladder at zero admitted, and honors rollback over active", () => {
    expect(formatLadderCompleteness({ admitted: 3, configured: 7 })).toBe("3 / 7 admitted");
    expect(ladderRowState(row({ completeness: { admitted: 0, configured: 7 }, state: "partial", active: false }))).toBe("no_ladder");
    expect(ladderRowState(row({ completeness: { admitted: 3, configured: 7 }, rolledBack: { on: true, reason: null, atMs: null }, active: true }))).toBe("rolled_back");
    expect(ladderRowState(row({ completeness: { admitted: 3, configured: 7 }, rolledBack: { on: false, reason: null, atMs: null } }))).toBe("partial");
    expect(ladderRowState(row({ completeness: { admitted: 7, configured: 7 }, rolledBack: { on: false, reason: null, atMs: null } }))).toBe("complete");
    // R14: 'active' is DERIVED from the published fields and never stored.
    expect(ladderRowActive(row({ completeness: { admitted: 3, configured: 7 }, rolledBack: { on: false, reason: null, atMs: null }, active: undefined }))).toBe(true);
    expect(ladderRowActive(row({ completeness: { admitted: 0, configured: 7 }, rolledBack: { on: false, reason: null, atMs: null }, active: undefined }))).toBe(false);
    expect(ladderRowActive(row({ completeness: { admitted: 3, configured: 7 }, rolledBack: { on: true, reason: null, atMs: null }, active: undefined }))).toBe(false);
  });

  test("returns at most three rank-ascending endpoint views", () => {
    expect(topLadderEndpoints(row({ topEndpoints: [
      { endpointId: "e4", rank: 4, status: "available" },
      { endpointId: "e2", rank: 2, status: "available" },
      { endpointId: "e1", rank: 1, status: "available" },
      { endpointId: "e3", rank: 3, status: "available" },
    ] }))).toEqual([
      { endpointId: "e1", rank: 1, status: "available" },
      { endpointId: "e2", rank: 2, status: "available" },
      { endpointId: "e3", rank: 3, status: "available" },
    ]);
  });
});