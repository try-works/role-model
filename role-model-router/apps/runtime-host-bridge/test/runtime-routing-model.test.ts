import { describe, expect, test } from "vitest";
import {
  resolveRuntimeRoutingModelSelection,
  summarizeRouterGuidance,
} from "../src/runtime-routing-model.js";

describe("resolveRuntimeRoutingModelSelection", () => {
  test("returns undefined when fixture ids are not routable and config has no routable guidance", () => {
    expect(
      resolveRuntimeRoutingModelSelection({
        fixtureRoutingModel: {
          endpointId: "openai.personal.primary.us-east-1.fast",
          preferredEndpointIds: ["openai.personal.primary.us-east-1.fast"],
        },
        unifiedConfig: null,
        routableEndpointIds: [
          "local-openai-compatible.personal.example.local.lfm2.5-8b-a1b",
          "moonshot.personal.kimi-code.global.kimi-k2.6",
        ],
      }),
    ).toBeUndefined();
  });

  test("prefers unified config classifier endpoint when routable", () => {
    expect(
      resolveRuntimeRoutingModelSelection({
        fixtureRoutingModel: {
          endpointId: "openai.personal.primary.us-east-1.fast",
          preferredEndpointIds: ["openai.personal.primary.us-east-1.fast"],
        },
        unifiedConfig: {
          difficultyClassifier: {
            enabled: true,
            rubricVersion: "v1",
            sourceType: "local",
            endpointId: "moonshot.personal.kimi-code.global.kimi-k2.6",
            modelId: null,
            timeoutMs: 1500,
            fallbackDifficulty: "easy",
          },
        } as never,
        routableEndpointIds: ["moonshot.personal.kimi-code.global.kimi-k2.6"],
      }),
    ).toEqual({
      endpointId: "moonshot.personal.kimi-code.global.kimi-k2.6",
      preferredEndpointIds: ["moonshot.personal.kimi-code.global.kimi-k2.6"],
    });
  });

  test("keeps only routable fixture preferred endpoint ids", () => {
    expect(
      resolveRuntimeRoutingModelSelection({
        fixtureRoutingModel: {
          endpointId: "openai.personal.primary.us-east-1.fast",
          preferredEndpointIds: [
            "openai.personal.primary.us-east-1.fast",
            "cli.local.coder",
          ],
        },
        unifiedConfig: null,
        routableEndpointIds: ["cli.local.coder"],
      }),
    ).toEqual({
      endpointId: "cli.local.coder",
      preferredEndpointIds: ["cli.local.coder"],
    });
  });
});

describe("summarizeRouterGuidance", () => {
  test("returns empty guidance when routing model is undefined", () => {
    expect(
      summarizeRouterGuidance({
        routingModel: undefined,
        routableEndpointIds: ["cli.local.coder"],
      }),
    ).toEqual({
      endpointId: null,
      preferredEndpointIds: [],
      ignoredEndpointIds: [],
    });
  });
});
