import { describe, expect, test } from "vitest";

import {
  resolvePostureRequestBinding,
  type AgentStrategyEntry,
} from "../src/agent-strategy.js";
import { overlayPostureOperator, decodeLegacyRoutingStrategy } from "../src/scoring-strategy.js";

/**
 * Run 103 / SP5g - the request path: a request that names a posture alias inherits the saved
 * binding, while a role the request itself declares stays authoritative (design document section 5,
 * requirements R5, R6).
 */
const coderEntry: AgentStrategyEntry = {
  name: "coder",
  kind: "role",
  roleId: "coder",
  scoringStrategy: "quality",
  routingMode: "difficulty",
  computePreference: "local",
  modelIds: [],
  requiredCapabilities: [],
  violations: [],
};

const embeddingEntry: AgentStrategyEntry = {
  name: "embedding",
  kind: "workload",
  roleId: null,
  scoringStrategy: "cost",
  routingMode: null,
  computePreference: "auto",
  modelIds: [],
  requiredCapabilities: ["embeddings.text", "text.chat"],
  violations: [],
};

describe("posture request binding", () => {
  test("a declared role wins over the alias preset and both are recorded", () => {
    const binding = resolvePostureRequestBinding({
      entry: coderEntry,
      aliasId: "coder.remote-only",
      declaredRoleId: "researcher",
    });
    expect(binding).toMatchObject({
      aliasId: "coder.remote-only",
      name: "coder",
      kind: "role",
      declaredRoleId: "researcher",
      presetRoleId: "coder",
      roleId: "researcher",
      roleSource: "declared",
      scoringStrategy: "quality",
    });
  });

  test("the alias preset supplies the role when the request declares none", () => {
    const binding = resolvePostureRequestBinding({
      entry: coderEntry,
      aliasId: "coder.remote-only",
      declaredRoleId: null,
    });
    expect(binding).toMatchObject({
      roleId: "coder",
      roleSource: "preset",
      declaredRoleId: null,
      presetRoleId: "coder",
    });
  });

  test("a workload entry without a role records none", () => {
    const binding = resolvePostureRequestBinding({
      entry: embeddingEntry,
      aliasId: "embedding.remote-only",
    });
    expect(binding).toMatchObject({ roleId: null, roleSource: "none", presetRoleId: null });
  });

  test("workload capabilities are unioned with the request's own requirements", () => {
    const binding = resolvePostureRequestBinding({
      entry: embeddingEntry,
      aliasId: "embedding.remote-only",
      requiredCapabilities: ["text.chat", "vision.image"],
    });
    expect(binding.requiredCapabilities).toEqual([
      "text.chat",
      "vision.image",
      "embeddings.text",
    ]);
  });

  test("compute preference maps to the request's local preference", () => {
    expect(
      resolvePostureRequestBinding({ entry: coderEntry, aliasId: "coder.remote-only" }).preferLocal,
    ).toBe(true);
    expect(
      resolvePostureRequestBinding({ entry: embeddingEntry, aliasId: "embedding.remote-only" })
        .preferLocal,
    ).toBe(false);
  });
});

describe("alias scoring strategy overlay", () => {
  test("an alias preset strategy replaces the configured scoring strategy", () => {
    const overlaid = overlayPostureOperator({
      posture: decodeLegacyRoutingStrategy("intelligent"),
      aliasStrategy: "quality",
    });
    expect(overlaid?.mode).toBe("intelligent");
    expect(overlaid?.scoringStrategy).toBe("quality");
    expect(overlaid?.operator?.name).toBe("quality");
  });

  test("an alias without a scoring strategy leaves the configured posture untouched", () => {
    const posture = decodeLegacyRoutingStrategy("quality");
    expect(overlayPostureOperator({ posture, aliasStrategy: null })).toBe(posture);
  });

  test("an alias asking for custom without configured weights fails closed", () => {
    const posture = decodeLegacyRoutingStrategy("quality");
    expect(overlayPostureOperator({ posture, aliasStrategy: "custom" })?.scoringStrategy).toBe(
      "quality",
    );
  });

  test("an alias asking for custom keeps the configured custom weights", () => {
    const custom = decodeLegacyRoutingStrategy("custom");
    const overlaid = overlayPostureOperator({ posture: custom, aliasStrategy: "custom" });
    expect(overlaid?.operator).toEqual(custom.operator);
  });
});
