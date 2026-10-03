import { describe, expect, test } from "vitest";

import { buildRequestClassification } from "../src/index.js";

/**
 * Run 104 `R6` / `SP4` - taxonomy fidelity into captures, observations and learning rows.
 *
 * Locked AS-IS `T1.2d`: `buildRequestClassification` kept a declared `taskTypeId` only when it was a
 * known taxonomy id and had **no fallback**, while the role next to it already resolved through a
 * three-step chain (`requestedRoleId` -> `taxonomyIdentity.roleId` -> intent role id). The three real
 * capture paths therefore passed `plan.routingRequest.taskType ?? null` and the resolved identity the
 * runtime had already computed (`buildBridgeTaxonomyIdentity` defaults the task to `text.chat`) was
 * thrown away: telemetry showed `taxonomyTaskType` while every learning row carried `taskTypeId: null`.
 *
 * These tests pin the chain and its validation: the same three sources the role uses, the declared
 * value still authoritative, an unknown declared id still dropped rather than guessed, and the task
 * variant travelling with the classification when the runtime resolved one.
 */
describe("run104 R6 buildRequestClassification task-family fallback", () => {
  test("falls back to the resolved taxonomy identity when the request declared no task", () => {
    const classification = buildRequestClassification({
      taskTypeId: null,
      identityTaskTypeId: "data.quality.audit",
      intentTaskTypeId: null,
      roleId: "data",
    });
    // The identity the runtime actually routed under, not `null`.
    expect(classification?.taskTypeId).toBe("data.quality.audit");
  });

  /**
   * `buildBridgeTaxonomyIdentity` defaults the task to `text.chat`, which is a *capability* name, not
   * a shipped task id: measured against the pinned taxonomy (`packages/core/data/taxonomy/task-types.json`,
   * 280 tasks) there is no `text.*` task. Validation therefore drops it exactly as it dropped every
   * unknown id before this change - the runtime records absence rather than a family it does not have.
   */
  test("the identity's non-taxonomy text.chat default is dropped, not recorded", () => {
    const classification = buildRequestClassification({
      taskTypeId: null,
      identityTaskTypeId: "text.chat",
      intentTaskTypeId: null,
      roleId: "writer",
    });
    expect(classification?.taskTypeId).toBeNull();
    expect(classification?.roleId).toBe("writer");
  });

  test("an unknown identity is skipped so the intent's known task id can still supply the family", () => {
    const classification = buildRequestClassification({
      taskTypeId: null,
      identityTaskTypeId: "text.chat",
      intentTaskTypeId: "data.quality.audit",
    });
    expect(classification?.taskTypeId).toBe("data.quality.audit");
  });

  test("a declared task still wins over the resolved identity", () => {
    const classification = buildRequestClassification({
      taskTypeId: "coder.review",
      identityTaskTypeId: "text.chat",
      intentTaskTypeId: "data.quality.audit",
    });
    expect(classification?.taskTypeId).toBe("coder.review");
  });

  test("falls back to the intent task id when neither the declaration nor the identity resolved one", () => {
    const classification = buildRequestClassification({
      taskTypeId: null,
      identityTaskTypeId: null,
      intentTaskTypeId: "data.quality.audit",
    });
    expect(classification?.taskTypeId).toBe("data.quality.audit");
  });

  test("an unknown declared id is still dropped, not guessed", () => {
    const classification = buildRequestClassification({
      taskTypeId: "not.a.taxonomy.task",
      identityTaskTypeId: "text.chat",
    });
    // Validation is unchanged: an unknown identifier is dropped rather than replaced by another source.
    expect(classification?.taskTypeId).toBeNull();
  });

  test("an unknown fallback id is dropped as well", () => {
    const classification = buildRequestClassification({
      identityTaskTypeId: "not.a.taxonomy.task",
    });
    expect(classification?.taskTypeId).toBeNull();
  });

  test("carries the task variant the runtime resolved, and omits it when none was resolved", () => {
    const withVariant = buildRequestClassification({
      taskTypeId: "data.quality.audit",
      taskVariant: "audit",
    });
    expect(withVariant?.taskVariant).toBe("audit");

    const withoutVariant = buildRequestClassification({ taskTypeId: "data.quality.audit" });
    expect(withoutVariant?.taskVariant ?? null).toBeNull();
  });

  test("every capture site's input produces the same classification for one fixture", () => {
    // The four capture paths (routed answer, failed request, observation bundle, supervised-replay
    // capture) all resolve the three sources from the same plan fields, so the classification they
    // record has to be identical for the same request.
    const sources = {
      taskTypeId: null,
      identityTaskTypeId: "data.quality.audit",
      intentTaskTypeId: null,
      taskVariant: "audit",
      roleId: "data",
      toolClasses: ["filesystem.read", "not.a.tool.class"],
    } as const;
    const routedCapture = buildRequestClassification(sources);
    const failedCapture = buildRequestClassification(sources);
    const observationBundle = buildRequestClassification(sources);
    const replayCapture = buildRequestClassification(sources);
    expect(failedCapture).toEqual(routedCapture);
    expect(observationBundle).toEqual(routedCapture);
    expect(replayCapture).toEqual(routedCapture);
    expect(routedCapture?.taskTypeId).toBe("data.quality.audit");
    // Tool classes stay filtered against the shipped taxonomy, exactly as before.
    expect(routedCapture?.toolClassIds).toEqual(["filesystem.read"]);
  });
});
