import { describe, expect, test } from "vitest";

import { mapDiscoveryToProviderConfig } from "../src/downstream-openai.js";
import { createDiscovery, createModelRecord } from "./fixtures.js";

describe("Codex endpoint-instance compatibility", () => {
  test("keeps endpoint rows distinct instead of collapsing upstream effort siblings", () => {
    const discovery = createDiscovery({
      models: [
        createModelRecord({
          id: "deepseek.personal.global.deepseek-v4-pro:low",
          type: "endpoint" as never,
          endpoint_ids: ["deepseek.personal.global.deepseek-v4-pro:low"],
          upstreamModelId: "deepseek/deepseek-v4-pro" as never,
          fixedEffort: "low" as never,
        }),
        createModelRecord({
          id: "deepseek.personal.global.deepseek-v4-pro:medium",
          type: "endpoint" as never,
          endpoint_ids: ["deepseek.personal.global.deepseek-v4-pro:medium"],
          upstreamModelId: "deepseek/deepseek-v4-pro" as never,
          fixedEffort: "medium" as never,
        }),
      ],
    });

    const registration = mapDiscoveryToProviderConfig(discovery);
    expect(registration.config.models.map((entry) => entry.id)).toEqual([
      "deepseek.personal.global.deepseek-v4-pro:low",
      "deepseek.personal.global.deepseek-v4-pro:medium",
    ]);
    expect(registration.config.models.map((entry) => entry.name)).toEqual([
      "deepseek/deepseek-v4-pro (Low)",
      "deepseek/deepseek-v4-pro (Medium)",
    ]);
  });
});
