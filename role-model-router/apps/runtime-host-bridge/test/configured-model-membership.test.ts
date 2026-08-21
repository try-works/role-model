import { describe, expect, test } from "vitest";

import {
  computeConfiguredMembershipRevision,
  findConfiguredModelBlockingReferences,
} from "../src/configured-model-membership.js";
import {
  type UnifiedRuntimeConfig,
  removeUnifiedRuntimeConfigProviderModel,
} from "../src/unified-runtime-config.js";

function configWithMappings(modelIds: readonly string[]): UnifiedRuntimeConfig {
  return {
    version: "1",
    routingStrategy: null,
    executionMode: "remote_only",
    llamaSwap: {
      enabled: false,
      models: [],
      process: { command: null, args: [], env: {}, cwd: null, startupTimeoutMs: null },
    },
    liteLLM: {
      enabled: true,
      providers: [
        {
          providerId: "acme",
          apiKeyRef: "ACME_API_KEY",
          modelNames: [...modelIds],
          modelMappings: modelIds.map((modelId) => ({
            modelId,
            litellmModel: modelId,
            litellmParams: {},
            capabilities: ["chat"],
          })),
        },
      ],
      routerSettings: {},
      litellmSettings: {},
      process: { command: null, args: [], env: {}, cwd: null, startupTimeoutMs: null },
    },
  };
}

describe("configured model membership", () => {
  test("removes an exact config-owned key and preserves its sibling", () => {
    const result = removeUnifiedRuntimeConfigProviderModel(
      configWithMappings(["acme/one", "acme/two"]),
      "acme.litellm",
      "acme/one",
    );

    expect(result.removed).toBe(true);
    expect(result.config.liteLLM.providers[0]?.modelMappings.map((entry) => entry.modelId)).toEqual(
      ["acme/two"],
    );
    expect(result.config.liteLLM.providers[0]?.modelNames).toEqual(["acme/two"]);
  });

  test("is idempotent and drops an empty config-owned provider", () => {
    const removed = removeUnifiedRuntimeConfigProviderModel(
      configWithMappings(["acme/one"]),
      "acme.litellm",
      "acme/one",
    );
    expect(removed.config.liteLLM.providers).toEqual([]);
    expect(
      removeUnifiedRuntimeConfigProviderModel(removed.config, "acme.litellm", "acme/one"),
    ).toEqual({ config: removed.config, removed: false, removedAccount: true });
  });

  test("blocks explicit model references only when no sibling account supplies the model", () => {
    const input = {
      target: { providerAccountId: "acme.primary", modelId: "acme/shared" },
      configuredKeys: [
        { providerAccountId: "acme.primary", modelId: "acme/shared" },
        { providerAccountId: "acme.secondary", modelId: "acme/shared" },
      ],
      references: [
        {
          kind: "custom-alias",
          owner: "unified-runtime-config",
          path: "modelAliases.custom",
          policy: "block",
          modelId: "acme/shared",
        },
      ],
    } as const;
    expect(findConfiguredModelBlockingReferences(input)).toEqual([]);
    expect(
      findConfiguredModelBlockingReferences({ ...input, configuredKeys: [input.target] }),
    ).toEqual([input.references[0]]);
  });

  test("computeConfiguredMembershipRevision is order-stable and effort-variant-aware", () => {
    const entry = (input: {
      readonly providerAccountId: string;
      readonly modelId: string;
      readonly endpointId: string;
      readonly reasoningEffort?: string | null;
    }) => input;

    const ordered = computeConfiguredMembershipRevision([
      entry({ providerAccountId: "acme.primary", modelId: "acme/model", endpointId: "acme.primary.acme/model" }),
      entry({
        providerAccountId: "acme.primary",
        modelId: "acme/model",
        endpointId: "acme.primary.acme/model~high",
        reasoningEffort: "high",
      }),
    ]);
    const reordered = computeConfiguredMembershipRevision([
      entry({
        providerAccountId: "acme.primary",
        modelId: "acme/model",
        endpointId: "acme.primary.acme/model~high",
        reasoningEffort: "high",
      }),
      entry({ providerAccountId: "acme.primary", modelId: "acme/model", endpointId: "acme.primary.acme/model" }),
    ]);

    expect(ordered).toBe(reordered);
    expect(ordered.length).toBeGreaterThan(0);

    // Adding a sibling effort variant changes the revision (membership is endpoint-exact).
    const withSibling = computeConfiguredMembershipRevision([
      entry({ providerAccountId: "acme.primary", modelId: "acme/model", endpointId: "acme.primary.acme/model" }),
      entry({
        providerAccountId: "acme.primary",
        modelId: "acme/model",
        endpointId: "acme.primary.acme/model~high",
        reasoningEffort: "high",
      }),
      entry({
        providerAccountId: "acme.primary",
        modelId: "acme/model",
        endpointId: "acme.primary.acme/model~low",
        reasoningEffort: "low",
      }),
    ]);
    expect(withSibling).not.toBe(ordered);
  });
});
