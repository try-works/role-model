import { describe, expect, test } from "vitest";

import { mapDiscoveryToProviderConfig } from "../src/downstream-openai.js";
import { createDiscovery, createModelRecord } from "./fixtures.js";

describe("Pi 0.84.2 reasoning-effort endpoint identity", () => {
  test("preserves endpoint rows and exposes native thinkingLevelMap", () => {
    const discovery = createDiscovery({
      models: [
        createModelRecord({
          id: "deepseek.personal.global.deepseek-v4-pro:medium",
          type: "endpoint" as never,
          endpoint_ids: ["deepseek.personal.global.deepseek-v4-pro:medium"],
          upstreamModelId: "deepseek/deepseek-v4-pro" as never,
          fixedEffort: "medium" as never,
          capabilities: {
            reasoning: {
              supported: true,
              effortControl: true,
              effortLevels: ["none", "low", "medium", "high"],
            },
          } as never,
        }),
      ],
    });

    const registration = mapDiscoveryToProviderConfig(discovery);
    expect(registration.config.models).toHaveLength(1);
    expect(registration.config.models[0]?.id).toBe(
      "deepseek.personal.global.deepseek-v4-pro:medium",
    );
    expect(registration.config.models[0]?.thinkingLevelMap).toEqual({
      off: null,
      minimal: null,
      low: null,
      medium: "medium",
      high: null,
      xhigh: null,
      max: null,
    });
  });
});
