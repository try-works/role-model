import { selectFocusTask } from "@role-model-router/core";
import { describe, expect, it } from "vitest";

/**
 * D1 - a COMPLETED family must not hold the walk focus.
 *
 * Live observation on the stage RC (:3457, 2026-10-10): coordinator.coordinator.follow_up reached
 * complete (admitted 7 == configured 7) and the walk kept selecting it forever, because
 * selectFocusTask ranks requestCount FIRST and consults the fill gap only as a tie-break. A family
 * with gap 0 that is also the most-requested therefore wins every tick, and writer.writer.summarize
 * (2/7, fewer requests) received ZERO new comparisons for over an hour despite holding evidence in
 * all four partitions - so no second ladder and no pack could be produced.
 *
 * These cases pin the required behaviour. They are RED against the current comparator.
 */
const complete = (over: Record<string, unknown> = {}) => ({
  roleId: "coordinator",
  taskTypeId: "coordinator.follow_up",
  scopeKey: "coordinator\u0000coordinator.follow_up",
  requestCount: 184,
  admitted: 7,
  configured: 7,
  remaining: 0,
  ...over,
});

const incomplete = (over: Record<string, unknown> = {}) => ({
  roleId: "writer",
  taskTypeId: "writer.summarize",
  scopeKey: "writer\u0000writer.summarize",
  requestCount: 17,
  admitted: 2,
  configured: 7,
  remaining: 5,
  ...over,
});

describe("focus selection: a completed family must not starve an incomplete one", () => {
  it("selects the INCOMPLETE family even when the complete one is most-requested", () => {
    const picked = selectFocusTask([complete(), incomplete()]);
    expect(picked?.roleId).toBe("writer");
    expect(picked?.taskTypeId).toBe("writer.summarize");
  });

  it("still selects the incomplete family when the complete one has vastly more requests", () => {
    const picked = selectFocusTask([
      complete({ requestCount: 100000 }),
      incomplete({ requestCount: 1 }),
    ]);
    expect(picked?.roleId).toBe("writer");
  });

  /**
   * D9 (operator contract, 2026-10-10): "when a ladder has already been filled up for a task, the replay
   * queue is not supposed to keep replaying requests for that task."
   *
   * This case previously asserted the OPPOSITE - that a completed family is selected once nothing else
   * is fillable. That fallback was the over-feeding: on a workload where every eligible ladder is full,
   * the walk kept dispatching and spent a replay plus a paid provider call per tick to produce evidence
   * the admission floor discards. The contract now says: no gap anywhere means NO FOCUS.
   */
  it("does NOT select a complete family when nothing is left to fill", () => {
    const picked = selectFocusTask([
      complete(),
      incomplete({ admitted: 7, configured: 7, remaining: 0 }),
    ]);
    expect(picked).toBeNull();
  });

  it("does not focus a complete family even when it is the ONLY eligible one", () => {
    expect(selectFocusTask([complete()])).toBeNull();
  });

  it("treats an UNKNOWN configured count as fillable, not as full", () => {
    // Absence of evidence is not evidence that a ladder is full. Excluding an unmeasured family would
    // stop replay work for a task the census simply could not count, so it stays a candidate.
    const unmeasured = complete({ admitted: 0, configured: undefined, remaining: undefined });
    const picked = selectFocusTask([unmeasured]);
    expect(picked?.roleId).toBe("coordinator");
  });

  it("keeps most-requested-first among INCOMPLETE families", () => {
    const picked = selectFocusTask([
      incomplete({ roleId: "writer", taskTypeId: "writer.summarize", requestCount: 17 }),
      incomplete({ roleId: "coder", taskTypeId: "coder.review", requestCount: 900 }),
    ]);
    expect(picked?.roleId).toBe("coder");
  });
});
