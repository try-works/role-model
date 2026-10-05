import { describe, expect, test } from "vitest";

import { selectFocusTask } from "@role-model-router/core";

/**
 * Run 105 R8: tasks are discovered from live requests; the dispatcher holds ONE focus task and
 * fills its ladder depth-first. A (role, task) with no recorded request never enters the work
 * queue, the order is most-requested (over the staleness window) then most-unfilled, and a
 * rolled-back task is paused rather than dispatched.
 */
describe("run105 R8 focus task selection", () => {
  const task = (overrides: Record<string, unknown> = {}) => ({
    roleId: "role:code-review",
    taskTypeId: "task:code-review",
    requestCount: 4,
    admitted: 0,
    configured: 3,
    ...overrides,
  });

  test("only a classified request with recorded volume becomes the focus task", () => {
    expect(selectFocusTask([task({ requestCount: 0 })])).toBeNull();
    expect(selectFocusTask([])).toBeNull();
    expect(selectFocusTask([task({ requestCount: 1 })])).toMatchObject({
      roleId: "role:code-review",
      taskTypeId: "task:code-review",
    });
  });

  test("depth-first: most-requested wins, then most-unfilled", () => {
    expect(
      selectFocusTask([
        task({ taskTypeId: "quiet", requestCount: 1 }),
        task({ taskTypeId: "busy", requestCount: 40 }),
      ]),
    ).toMatchObject({ taskTypeId: "busy" });
    expect(
      selectFocusTask([
        task({ taskTypeId: "full", requestCount: 7, admitted: 3, configured: 3 }),
        task({ taskTypeId: "empty", requestCount: 7, admitted: 0, configured: 3 }),
      ]),
    ).toMatchObject({ taskTypeId: "empty" });
  });

  test("the chosen focus task carries its completeness so the tick can size the fill", () => {
    const focus = selectFocusTask([task({ admitted: 1, configured: 4 })]);
    expect(focus).toMatchObject({ admitted: 1, configured: 4 });
    expect(focus?.remaining).toBe(3);
  });
});
