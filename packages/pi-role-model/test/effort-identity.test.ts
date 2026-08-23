import { describe, expect, test } from "vitest";

import { mapDiscoveryToProviderConfig } from "../src/downstream-openai.js";
import { createDiscovery, createModelRecord } from "./fixtures.js";

describe("Pi 0.84.2 reasoning-effort endpoint identity", () => {
  test("keeps default and fixed-effort siblings as distinct endpoint identities", () => {
    const upstreamModelId = "deepseek/deepseek-v4-flash";
    const models = [
      ["deepseek.personal.global.deepseek-v4-flash", undefined],
      ["deepseek.personal.global.deepseek-v4-flash-low", "low"],
      ["deepseek.personal.global.deepseek-v4-flash-high", "high"],
      ["deepseek.personal.global.deepseek-v4-flash-max", "max"],
    ] as const;
    const discovery = createDiscovery({
      models: models.map(([id, fixedEffort]) =>
        createModelRecord({
          id,
          type: "endpoint" as never,
          endpoint_id: id,
          endpoint_ids: [id],
          displayName: "DeepSeek V4 Flash",
          upstreamModelId,
          ...(fixedEffort ? { fixedEffort } : {}),
          capabilities: {
            reasoning: {
              supported: true,
              effortControl: true,
              effortLevels: ["low", "high", "max"],
            },
          } as never,
        }),
      ) as [ReturnType<typeof createModelRecord>, ...ReturnType<typeof createModelRecord>[]],
    });

    const registered = mapDiscoveryToProviderConfig(discovery).config.models;

    expect(registered.map((model) => model.id)).toEqual(models.map(([id]) => id));
    expect(registered.map((model) => model.endpointId)).toEqual(models.map(([id]) => id));
    expect(registered.map((model) => model.variantEffort)).toEqual([
      "default",
      "low",
      "high",
      "max",
    ]);
    expect(registered.map((model) => model.name)).toEqual([
      "DeepSeek V4 Flash",
      "DeepSeek V4 Flash (Low)",
      "DeepSeek V4 Flash (High)",
      "DeepSeek V4 Flash (Max)",
    ]);
    expect(registered[0]?.thinkingLevelMap).toBeUndefined();
    expect(registered[2]?.thinkingLevelMap).toEqual({
      off: null,
      minimal: null,
      low: null,
      medium: null,
      high: "high",
      xhigh: null,
      max: null,
    });
  });

  test("does not let an effort unsupported by Pi 0.84.2 block supported siblings", () => {
    const discovery = createDiscovery({
      models: [
        createModelRecord({
          id: "openai.personal.global.gpt-5.6-sol-high",
          type: "endpoint" as never,
          endpoint_ids: ["openai.personal.global.gpt-5.6-sol-high"],
          fixedEffort: "high" as never,
        }),
        createModelRecord({
          id: "openai.personal.global.gpt-5.6-sol-ultra",
          type: "endpoint" as never,
          endpoint_ids: ["openai.personal.global.gpt-5.6-sol-ultra"],
          fixedEffort: "ultra" as never,
        }),
      ],
    });

    const registered = mapDiscoveryToProviderConfig(discovery).config.models;

    expect(registered.map((model) => model.id)).toEqual([
      "openai.personal.global.gpt-5.6-sol-high",
      "openai.personal.global.gpt-5.6-sol-ultra",
    ]);
    expect(registered[0]?.thinkingLevelMap).toMatchObject({ high: "high" });
    expect(registered[1]?.thinkingLevelMap).toBeUndefined();
  });

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
