import { expect, test } from "vitest";

import { readCaptureRoleId, readCaptureTaskTypeId } from "../src/cli.js";

/**
 * Run 104 R22 (R22-B), TDD strict - the replay path's declared taxonomy must reach the comparison.
 *
 * Measured live on the stage state root (`:3457`, `stage-rc-43ccd509916f`): every pack promoted from a
 * comparison the *replay* path produced was endpoint-id-only (27 of 27), while packs from the live
 * shadow path were role-scoped (14 of 16). The Packs table renders an endpoint-id-only pack as
 * `scope-wide` - correct output for a scope-less pack, but the operator expects a pack to name the
 * role and task it was learned for.
 *
 * The capture already records the whole classification:
 * `track_b_route_capture_receipts.result.classification` carries
 * `{taskTypeId, roleId, toolClassIds, taxonomyVersion}`. What dropped it was the pipeline plumbing:
 * `runTrackBPostObservation` has three branches, and only the shadow branch passed the taxonomy -
 * `runTrackBReplayIntentPipeline` declared no `taskTypeId`/`roleId`/`classification` input at all.
 *
 * These tests pin the reader that both branches now share, so a capture's role survives whether the
 * comparison was produced by the shadow path or the replay-intent path.
 */

const captureWithRole = (roleId: unknown, taskTypeId = "coder.review") => ({
  roleId,
  taskTypeId,
  classification: { taskTypeId, roleId, taxonomyVersion: "1.0.0-alpha.1", toolClassIds: [] },
});

test("R22-B: a role declared on the capture itself is returned", () => {
  expect(readCaptureRoleId(captureWithRole("planner") as never)).toBe("planner");
});

test("R22-B: a role declared only inside the capture's classification is returned", () => {
  // The live replay capture's shape: no flat `roleId`, the role inside `classification`.
  const capture = {
    taskTypeId: "planner.resource.plan",
    classification: {
      taskTypeId: "planner.resource.plan",
      roleId: "planner",
      taxonomyVersion: "1.0.0-alpha.1",
      toolClassIds: [],
    },
  };
  expect(readCaptureRoleId(capture as never)).toBe("planner");
});

test("R22-B: a capture that classified no role reports absence rather than inventing one", () => {
  expect(
    readCaptureRoleId({ classification: { taskTypeId: "coder.review" } } as never),
  ).toBeUndefined();
  expect(readCaptureRoleId({} as never)).toBeUndefined();
  expect(readCaptureRoleId({ classification: { roleId: "   " } } as never)).toBeUndefined();
});

/**
 * Run 106 (live finding on the dev replay queue, 2026-10-07): the family travels with the role, and it
 * needs the SAME classification fallback. Every fixture above declares a flat \`taskTypeId\`, which is why
 * the gap was invisible: the reader used for the family read only that flat copy, so a capture that
 * records the family where the contract actually puts it - \`classification.taskTypeId\` - produced a
 * comparison whose comparability block named the role and not the task. The knowledge worker scopes a
 * comparison by \`(comparability.roleId, comparability.taskTypeId)\` and excludes anything incomplete
 * fail-closed (\`incomplete_scope\`), so those comparisons were finalized, never counted by the admission
 * floor, and no pack could ever be written for the task.
 *
 * Measured: two of eight finalized groups on the dev root carried \`taskTypeId: null\` while their captures'
 * durable classification named \`writer.summarize\`.
 */
const captureWithClassifiedFamily = () => ({
  classification: {
    taskTypeId: "writer.summarize",
    roleId: "writer",
    taxonomyVersion: "1.0.0-alpha.1",
    toolClassIds: [],
  },
});

test("R22-B follow-up: a family declared only inside the capture's classification is returned", () => {
  expect(readCaptureTaskTypeId(captureWithClassifiedFamily() as never)).toBe("writer.summarize");
});

test("R22-B follow-up: a family declared on the capture itself is still preferred", () => {
  expect(
    readCaptureTaskTypeId({
      taskTypeId: " coder.review ",
      ...captureWithClassifiedFamily(),
    } as never),
  ).toBe("coder.review");
});

test("R22-B follow-up: a capture that classified no family reports absence rather than inventing one", () => {
  expect(readCaptureTaskTypeId({} as never)).toBeUndefined();
  expect(readCaptureTaskTypeId({ taskTypeId: "   " } as never)).toBeUndefined();
  expect(
    readCaptureTaskTypeId({ classification: { roleId: "writer", taskTypeId: "  " } } as never),
  ).toBeUndefined();
});
