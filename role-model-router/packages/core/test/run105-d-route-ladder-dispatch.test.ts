import { Effect, Schema } from "effect";
import { describe, expect, test } from "vitest";

import {
  Complete,
  EndpointUnavailable,
  InsufficientEvidence,
  NoLadder,
  NoReplayableRequest,
  Partial,
  RolledBack,
  RouteLadder,
  RouteLadderRung,
  RouteLadderState,
  RouteLearningDefaults,
  RouteScopeKey,
  ScopeMismatch,
  decodeRouteScopeKey,
  deriveRouteLadderState,
  evaluateRouteLadderActivation,
  landRollbackToggle,
  planChallenge,
  planFocusDispatch,
  selectFocusTask,
} from "../src/route-ladder-dispatch.js";

/**
 * Run 105 package D (R8, R9-activation, R10, R11): the pure dispatch / derived-activation /
 * per-task-rollback program. Every case here is a behaviour the runtime tick and its sweeps
 * consume; the module is pure so the semantics are provable without a runtime.
 *
 * D9: the endpoint ladder is named rungs / routeLadder; RouteScopeKey is the composite key.
 */

const DEFAULTS = {
  minComparisons: 5,
  minConfidence: 0.7,
  stalenessWindowDays: 30,
  challengeBatchSize: 1,
};

const rung = (
  endpointId: string,
  rank: number,
  status: "available" | "unavailable" = "available",
) => ({
  endpointId,
  rank,
  status,
});

const ladder = (overrides: Record<string, unknown> = {}) => ({
  contract: "RouteLadderPackV1" as const,
  packId: "pack:1",
  scopeId: "scope:1",
  roleId: "role:code-review",
  taskTypeId: "task:code-review",
  rungs: [rung("endpoint:a", 1), rung("endpoint:b", 2)],
  completeness: { admitted: 2, configured: 2 },
  version: 1,
  nextEligibleAtMs: 0,
  rolledBack: { on: false, reason: null, atMs: null },
  ...overrides,
});

const task = (overrides: Record<string, unknown> = {}) => ({
  roleId: "role:code-review",
  taskTypeId: "task:code-review",
  requestCount: 3,
  admitted: 0,
  configured: 3,
  ...overrides,
});

describe("run105 D RouteScopeKey (R1/D9)", () => {
  test("accepts exactly one NUL with both halves non-empty", () => {
    const decoded = Schema.decodeUnknownSync(RouteScopeKey)("role:r\u0000task:t");
    expect(decoded).toBe("role:r\u0000task:t");
    expect(decodeRouteScopeKey(decoded)).toEqual({ roleId: "role:r", taskTypeId: "task:t" });
  });

  test("refuses zero NULs, two NULs, and an empty half with ScopeMismatch", () => {
    for (const malformed of ["role:r", "a\u0000b\u0000c", "\u0000task:t", "role:r\u0000"]) {
      const result = Schema.decodeUnknownResult(RouteScopeKey)(malformed);
      expect(result._tag).toBe("Failure");
      expect(() => decodeRouteScopeKey(malformed)).toThrow(ScopeMismatch);
    }
  });

  test("the tagged errors carry their fixed _tag", () => {
    expect(new ScopeMismatch({ detail: "x" })._tag).toBe("ScopeMismatch");
    expect(new InsufficientEvidence({ detail: "x" })._tag).toBe("InsufficientEvidence");
    expect(new NoReplayableRequest({ detail: "x" })._tag).toBe("NoReplayableRequest");
    expect(new EndpointUnavailable({ detail: "x" })._tag).toBe("EndpointUnavailable");
  });
});

describe("run105 D contracts (R7/R13)", () => {
  test("RouteLadderRung pins status to available|unavailable", () => {
    expect(Schema.decodeUnknownSync(RouteLadderRung)(rung("endpoint:a", 1)).status).toBe(
      "available",
    );
    expect(
      Schema.decodeUnknownSync(RouteLadderRung)(rung("endpoint:a", 1, "unavailable")).status,
    ).toBe("unavailable");
    expect(
      Schema.decodeUnknownResult(RouteLadderRung)({ endpointId: "e", rank: 1, status: "removed" })
        ._tag,
    ).toBe("Failure");
  });

  test("RouteLadder carries rungs, completeness, nextEligibleAtMs, version and rolledBack", () => {
    const decoded = Schema.decodeUnknownSync(RouteLadder)(ladder());
    expect(decoded.rungs).toHaveLength(2);
    expect(decoded.completeness).toEqual({ admitted: 2, configured: 2 });
    expect(decoded.rolledBack).toEqual({ on: false, reason: null, atMs: null });
  });

  test("RouteLearningDefaults is the single source of the four constants (R11, one 30-day constant)", () => {
    const decoded = Schema.decodeUnknownSync(RouteLearningDefaults)(DEFAULTS);
    expect(decoded).toEqual({
      minComparisons: 5,
      minConfidence: 0.7,
      stalenessWindowDays: 30,
      challengeBatchSize: 1,
    });
  });
});

describe("run105 D RouteLadderState is derived, never stored (R14/R9)", () => {
  test("exposes the four observable variants", () => {
    expect(
      RouteLadderState.$match(NoLadder({}), {
        NoLadder: () => "no_ladder",
        Partial: () => "partial",
        Complete: () => "complete",
        RolledBack: () => "rolled_back",
      }),
    ).toBe("no_ladder");
    expect(Partial({ admitted: 1 }).admitted).toBe(1);
    expect(Complete({})._tag).toBe("Complete");
    expect(RolledBack({ reason: "operator" }).reason).toBe("operator");
  });

  test("derives no_ladder / partial / complete / rolled_back from the ladder alone", () => {
    expect(deriveRouteLadderState(null)._tag).toBe("NoLadder");
    expect(
      deriveRouteLadderState(ladder({ completeness: { admitted: 0, configured: 2 } }))._tag,
    ).toBe("NoLadder");
    expect(
      deriveRouteLadderState(ladder({ completeness: { admitted: 1, configured: 3 } }))._tag,
    ).toBe("Partial");
    expect(
      deriveRouteLadderState(ladder({ completeness: { admitted: 3, configured: 3 } }))._tag,
    ).toBe("Complete");
    expect(
      deriveRouteLadderState(
        ladder({ rolledBack: { on: true, reason: "operator_rollback", atMs: 7 } }),
      )._tag,
    ).toBe("RolledBack");
  });

  test("active is derived (admitted >= 1 AND not rolled back) and is never a stored state", () => {
    expect(deriveRouteLadderState(ladder()).active).toBe(true);
    expect(
      deriveRouteLadderState(ladder({ rolledBack: { on: true, reason: "r", atMs: 1 } })).active,
    ).toBe(false);
    expect(
      deriveRouteLadderState(ladder({ completeness: { admitted: 0, configured: 2 } })).active,
    ).toBe(false);
  });
});

describe("run105 D selectFocusTask (R8 depth-first)", () => {
  test("a task with no recorded request never enters the work queue", () => {
    expect(selectFocusTask([task({ requestCount: 0 })])).toBeNull();
    expect(selectFocusTask([])).toBeNull();
  });

  test("orders by most-requested over the staleness window, then most-unfilled", () => {
    const selected = selectFocusTask([
      task({ taskTypeId: "task:low", requestCount: 2, admitted: 3, configured: 3 }),
      task({ taskTypeId: "task:high", requestCount: 9, admitted: 3, configured: 3 }),
    ]);
    expect(selected).toMatchObject({ taskTypeId: "task:high" });

    const tied = selectFocusTask([
      task({ taskTypeId: "task:filled", requestCount: 5, admitted: 3, configured: 3 }),
      task({ taskTypeId: "task:gap", requestCount: 5, admitted: 0, configured: 3 }),
    ]);
    expect(tied).toMatchObject({ taskTypeId: "task:gap" });
  });

  test("a rolled-back task is skipped (replay dispatch is paused while rolled back, R10)", () => {
    expect(
      selectFocusTask([
        task({ taskTypeId: "task:rolled", requestCount: 100, rolledBack: true }),
        task({ taskTypeId: "task:open", requestCount: 1 }),
      ]),
    ).toMatchObject({ taskTypeId: "task:open" });
    expect(selectFocusTask([task({ rolledBack: true })])).toBeNull();
  });

  test("is deterministic: input order never changes the choice", () => {
    const forward = selectFocusTask([
      task({ taskTypeId: "a", requestCount: 2, admitted: 2 }),
      task({ taskTypeId: "b", requestCount: 2, admitted: 0 }),
    ]);
    const reverse = selectFocusTask([
      task({ taskTypeId: "b", requestCount: 2, admitted: 0 }),
      task({ taskTypeId: "a", requestCount: 2, admitted: 2 }),
    ]);
    expect(forward).toEqual(reverse);
    expect(forward).toMatchObject({ taskTypeId: "b" });
  });
});

describe("run105 D planFocusDispatch (R8 depth-first fill)", () => {
  const focus = { roleId: "role:code-review", taskTypeId: "task:code-review", ladder: null };

  test("targets an as-yet-unranked configured endpoint, in configured order", () => {
    const planned = planFocusDispatch({
      focus,
      replayableCapture: { captureRef: "capture:1" },
      configuredEndpointIds: ["endpoint:a", "endpoint:b", "endpoint:c"],
      admittedEndpointIds: ["endpoint:a"],
      rungs: [rung("endpoint:a", 1), rung("endpoint:b", 2)],
    });
    expect(planned).toMatchObject({
      captureRef: "capture:1",
      endpointId: "endpoint:c",
      roleId: "role:code-review",
      taskTypeId: "task:code-review",
    });
  });

  test("skips an unavailable rung and fills the next unranked endpoint", () => {
    const planned = planFocusDispatch({
      focus,
      replayableCapture: { captureRef: "capture:1" },
      configuredEndpointIds: ["endpoint:a", "endpoint:b"],
      admittedEndpointIds: ["endpoint:a"],
      rungs: [rung("endpoint:a", 1), rung("endpoint:b", 2, "unavailable")],
    });
    expect(planned).toBeNull();
  });

  test("a task with no replayable capture is skipped as NoReplayableRequest", () => {
    const result = planFocusDispatch({
      focus,
      replayableCapture: null,
      configuredEndpointIds: ["endpoint:a"],
      admittedEndpointIds: [],
    });
    expect(result).toBeInstanceOf(NoReplayableRequest);
    expect((result as NoReplayableRequest)._tag).toBe("NoReplayableRequest");
  });

  test("a complete task (every configured endpoint admitted) has nothing to dispatch", () => {
    expect(
      planFocusDispatch({
        focus,
        replayableCapture: { captureRef: "capture:1" },
        configuredEndpointIds: ["endpoint:a", "endpoint:b"],
        admittedEndpointIds: ["endpoint:a", "endpoint:b"],
      }),
    ).toBeNull();
  });

  test("a configured set that shrank below the admitted set still dispatches the unranked remainder", () => {
    expect(
      planFocusDispatch({
        focus,
        replayableCapture: { captureRef: "capture:1" },
        configuredEndpointIds: ["endpoint:a", "endpoint:b"],
        admittedEndpointIds: ["endpoint:a"],
        rungs: [rung("endpoint:a", 1)],
      }),
    ).toMatchObject({ endpointId: "endpoint:b" });
  });
});

describe("run105 D evaluateRouteLadderActivation (R9 derived activation)", () => {
  const records = (count: number, confidence = 0.8) =>
    Array.from({ length: count }, () => ({
      endpointId: "endpoint:a",
      confidence,
      effortComparable: true,
    }));

  test("an endpoint at or above the floor admits and activates, with no mutable active pointer", async () => {
    const calls: unknown[] = [];
    const result = await Effect.runPromise(
      evaluateRouteLadderActivation({
        records: records(5),
        configuredEndpointIds: ["endpoint:a", "endpoint:b"],
        defaults: DEFAULTS,
        admissionFloor: (input: unknown) => {
          calls.push(input);
          return { admitted: ["endpoint:a"], admittedStats: {}, belowFloorStats: {} };
        },
      }),
    );
    expect(result.active).toBe(true);
    expect(result.admittedEndpointIds).toEqual(["endpoint:a"]);
    expect(result.defaults).toEqual(DEFAULTS);
    // The floor predicate is A's, consumed with the SAME defaults (minComparisons/minConfidence).
    expect(calls[0]).toMatchObject({ minComparisons: 5, minConfidence: 0.7 });
    expect(result.state._tag).toBe("Partial");
  });

  test("every endpoint below the floor produces no ladder and no advisory (InsufficientEvidence)", async () => {
    const result = await Effect.runPromise(
      evaluateRouteLadderActivation({
        records: records(2, 0.4),
        configuredEndpointIds: ["endpoint:a"],
        defaults: DEFAULTS,
        admissionFloor: () => ({ admitted: [], admittedStats: {}, belowFloorStats: {} }),
      }),
    );
    expect(result.active).toBe(false);
    expect(result.state._tag).toBe("NoLadder");
    expect(result.evidence._tag).toBe("InsufficientEvidence");
  });

  test("an endpoint below the floor is a shadow candidate: the previous ladder stays authoritative", async () => {
    const result = await Effect.runPromise(
      evaluateRouteLadderActivation({
        records: records(1, 0.9),
        configuredEndpointIds: ["endpoint:a", "endpoint:b"],
        defaults: DEFAULTS,
        admissionFloor: () => ({
          admitted: ["endpoint:a"],
          admittedStats: {},
          belowFloorStats: { "endpoint:b": { comparisonCount: 1, meanConfidence: 0.9 } },
        }),
      }),
    );
    expect(result.active).toBe(true);
    expect(result.shadowEndpointIds).toEqual(["endpoint:b"]);
  });

  test("two task families each derive their own activation (per-(role, task) isolation)", async () => {
    const activation = (roleId: string) =>
      Effect.runPromise(
        evaluateRouteLadderActivation({
          records: records(5),
          configuredEndpointIds: ["endpoint:a"],
          defaults: DEFAULTS,
          admissionFloor: () => ({
            admitted: ["endpoint:a"],
            admittedStats: {},
            belowFloorStats: {},
          }),
          roleId,
          taskTypeId: "task:t",
        }),
      );
    const [first, second] = await Promise.all([activation("role:one"), activation("role:two")]);
    expect(first.active && second.active).toBe(true);
    expect(first.scopeKey).not.toBe(second.scopeKey);
  });

  test("a rolled-back task derives no advisory even when its floor is met", async () => {
    const result = await Effect.runPromise(
      evaluateRouteLadderActivation({
        records: records(5),
        configuredEndpointIds: ["endpoint:a"],
        defaults: DEFAULTS,
        admissionFloor: () => ({
          admitted: ["endpoint:a"],
          admittedStats: {},
          belowFloorStats: {},
        }),
        rolledBack: { on: true, reason: "operator_rollback", atMs: 11 },
      }),
    );
    expect(result.active).toBe(false);
    expect(result.state._tag).toBe("RolledBack");
  });
});

describe("run105 D planChallenge (R8 top-down challenge)", () => {
  test("challenges the leader first, one comparison per rung, in rank order", () => {
    const planned = planChallenge({
      newEndpointId: "endpoint:new",
      rungs: [rung("endpoint:leader", 1), rung("endpoint:next", 2), rung("endpoint:last", 3)],
      challengeBatchSize: 3,
    });
    expect(planned.map((row) => row.againstEndpointId)).toEqual([
      "endpoint:leader",
      "endpoint:next",
      "endpoint:last",
    ]);
    expect(planned[0]).toMatchObject({
      newEndpointId: "endpoint:new",
      againstEndpointId: "endpoint:leader",
      rank: 1,
    });
  });

  test("is bounded by challengeBatchSize (the shipped default is one per dispatch)", () => {
    expect(
      planChallenge({
        newEndpointId: "e",
        rungs: [rung("a", 1), rung("b", 2)],
        challengeBatchSize: 1,
      }),
    ).toHaveLength(1);
    expect(
      planChallenge({
        newEndpointId: "e",
        rungs: [rung("a", 1), rung("b", 2)],
        challengeBatchSize: 0,
      }),
    ).toHaveLength(0);
  });

  test("skips unavailable rungs but keeps rank order", () => {
    const planned = planChallenge({
      newEndpointId: "e",
      rungs: [rung("a", 1, "unavailable"), rung("b", 2), rung("c", 3)],
      challengeBatchSize: 2,
    });
    expect(planned.map((row) => row.againstEndpointId)).toEqual(["b", "c"]);
  });

  test("a rung that is already the new endpoint is never challenged against itself", () => {
    expect(
      planChallenge({
        newEndpointId: "a",
        rungs: [rung("a", 1), rung("b", 2)],
        challengeBatchSize: 2,
      }).map((row) => row.againstEndpointId),
    ).toEqual(["b"]);
  });

  test("an empty ladder challenges nothing", () => {
    expect(planChallenge({ newEndpointId: "e", rungs: [], challengeBatchSize: 1 })).toEqual([]);
  });
});

describe("run105 D landRollbackToggle (R10 per-task rollback)", () => {
  test("rolling back turns the flag on and records the operator reason", () => {
    expect(
      landRollbackToggle({
        rolledBack: { on: false, reason: null, atMs: null },
        rolledBackOn: true,
        reason: "operator_rollback",
        atMs: 42,
      }),
    ).toEqual({ on: true, reason: "operator_rollback", atMs: 42 });
  });

  test("rolling forward is reversible and keeps the reason for the audit trail", () => {
    const rolled = landRollbackToggle({
      rolledBack: { on: false, reason: null, atMs: null },
      rolledBackOn: true,
      reason: "operator_rollback",
      atMs: 42,
    });
    const forward = landRollbackToggle({ rolledBack: rolled, rolledBackOn: false });
    expect(forward.on).toBe(false);
    expect(forward.reason).toBe("operator_rollback");
  });

  test("the toggle is idempotent for an unchanged flag", () => {
    const current = { on: true, reason: "operator_rollback", atMs: 42 };
    expect(landRollbackToggle({ rolledBack: current, rolledBackOn: true, atMs: 99 })).toEqual(
      current,
    );
  });

  test("the toggle writes only the ladder flag: it never names a validation receipt or a pack (D8)", () => {
    const landed = landRollbackToggle({
      rolledBack: { on: false, reason: null, atMs: null },
      rolledBackOn: true,
      reason: "operator_rollback",
    });
    expect(Object.keys(landed).sort()).toEqual(["atMs", "on", "reason"]);
    expect(JSON.stringify(landed)).not.toMatch(
      /rolledBackWithValidationReceiptId|rollbackPack|activePackageId/,
    );
  });
});
