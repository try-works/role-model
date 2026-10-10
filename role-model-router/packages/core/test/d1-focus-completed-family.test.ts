import { describe, expect, it } from "vitest";
import { selectFocusTask } from "@role-model-router/core";

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
    const picked = selectFocusTask([complete({ requestCount: 100000 }), incomplete({ requestCount: 1 })]);
    expect(picked?.roleId).toBe("writer");
  });

  it("selects a complete family only when nothing is left to fill", () => {
    const picked = selectFocusTask([complete(), incomplete({ admitted: 7, configured: 7, remaining: 0 })]);
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
