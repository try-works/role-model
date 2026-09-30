/**
 * L1: the `role-model.downstream.openai.v1` discovery contract and the mapping
 * from discovered records to DSH model-catalog entries.
 *
 * The mapping is what makes the runtime's aliases, models, and endpoints
 * selectable in DSH's main model selector, so the important properties here are:
 * every entry names the owning provider exactly (a mismatch makes DSH throw
 * `INVALID_CATALOG` and turns the whole selector group into a failure chip),
 * effort sets are declared exactly, and missing limits degrade obsessively
 * rather than throwing.
 */

import { describe, expect, test } from "vitest";
import {
  CONSERVATIVE_CONTEXT_WINDOW,
  CONSERVATIVE_MAX_TOKENS,
  appendOpenAIPath,
  createRoleModelCatalog,
  modelDisplayName,
  readEffortLevels,
  readEffortToken,
  readReasoningEfforts,
  validateDownstreamOpenAIDiscovery,
} from "../src/downstream-openai.js";
import { createDiscovery, createModelRecord, malformedModelRecord } from "./fixtures.js";

describe("appendOpenAIPath", () => {
  test("appends /v1 exactly once", () => {
    expect(appendOpenAIPath("http://127.0.0.1:3457")).toBe("http://127.0.0.1:3457/v1");
    expect(appendOpenAIPath("http://127.0.0.1:3457/")).toBe("http://127.0.0.1:3457/v1");
    expect(appendOpenAIPath("http://127.0.0.1:3457/v1")).toBe("http://127.0.0.1:3457/v1");
    expect(appendOpenAIPath("http://127.0.0.1:3457/v1/")).toBe("http://127.0.0.1:3457/v1");
  });
});

describe("validateDownstreamOpenAIDiscovery", () => {
  test("accepts a well-formed discovery payload", () => {
    const discovery = validateDownstreamOpenAIDiscovery(createDiscovery());
    expect(discovery.contractVersion).toBe("role-model.downstream.openai.v1");
    expect(discovery.models.length).toBeGreaterThan(0);
  });

  test("rejects a payload with the wrong contract version", () => {
    expect(() =>
      validateDownstreamOpenAIDiscovery({ ...createDiscovery(), contractVersion: "nope" }),
    ).toThrow();
  });

  test("rejects a payload that is not an object", () => {
    expect(() => validateDownstreamOpenAIDiscovery(null)).toThrow();
    expect(() => validateDownstreamOpenAIDiscovery("x")).toThrow();
  });

  test("rejects an empty model list", () => {
    expect(() => validateDownstreamOpenAIDiscovery({ ...createDiscovery(), models: [] })).toThrow();
  });

  test("rejects a model entry missing its piMapping", () => {
    expect(() =>
      validateDownstreamOpenAIDiscovery(
        createDiscovery({ models: [malformedModelRecord({}, ["piMapping"])] }),
      ),
    ).toThrow();
  });

  test("rejects a model entry with an unknown type", () => {
    expect(() =>
      validateDownstreamOpenAIDiscovery(
        createDiscovery({ models: [createModelRecord({ type: "bogus" })] }),
      ),
    ).toThrow();
  });

  test("fails closed, with a specific message, when the runtime requires auth", () => {
    expect(() =>
      validateDownstreamOpenAIDiscovery(createDiscovery({ authentication: { required: true } })),
    ).toThrow(/auth is required/iu);
  });

  test("rejects a blank placeholder token", () => {
    expect(() =>
      validateDownstreamOpenAIDiscovery(
        createDiscovery({ authentication: { placeholderToken: "" } }),
      ),
    ).toThrow();
  });
});

describe("readEffortToken", () => {
  test("reads the camelCase and snake_case spellings, in priority order", () => {
    expect(readEffortToken(createModelRecord({ reasoningEffort: "High" }))).toBe("high");
    expect(readEffortToken(createModelRecord({ reasoning_effort: "LOW" }))).toBe("low");
    expect(readEffortToken(createModelRecord({ fixedEffort: "medium" }))).toBe("medium");
    expect(readEffortToken(createModelRecord({ fixed_effort: "MAX" }))).toBe("max");
    expect(
      readEffortToken(createModelRecord({ reasoningEffort: "high", fixedEffort: "low" })),
    ).toBe("high");
  });

  test("returns null when absent or blank", () => {
    expect(readEffortToken(createModelRecord({}))).toBeNull();
    expect(readEffortToken(createModelRecord({ reasoningEffort: "   " }))).toBeNull();
    expect(readEffortToken(createModelRecord({ reasoningEffort: null }))).toBeNull();
  });
});

describe("readEffortLevels", () => {
  test("reads advertised levels from either spelling", () => {
    expect(readEffortLevels(createModelRecord({ reasoningEffortLevels: ["Low", "HIGH"] }))).toEqual(
      ["low", "high"],
    );
    expect(readEffortLevels(createModelRecord({ reasoning_effort_levels: ["medium"] }))).toEqual([
      "medium",
    ]);
  });

  test("falls back to the nested capabilities shape", () => {
    const record = createModelRecord({
      capabilities: {
        reasoning: { supported: true, effortControl: true, effortLevels: ["none", "High"] },
      },
    });
    expect(readEffortLevels(record)).toEqual(["none", "high"]);
  });

  test("returns an empty list when nothing is advertised", () => {
    expect(readEffortLevels(createModelRecord({ capabilities: { reasoning: undefined } }))).toEqual(
      [],
    );
  });
});

describe("readReasoningEfforts", () => {
  test("a fixed effort yields a single-effort set whose default is that effort", () => {
    expect(
      readReasoningEfforts(createModelRecord({ type: "endpoint", fixedEffort: "high" })),
    ).toEqual({ efforts: [{ id: "high", name: "high" }], defaultEffort: "high" });
  });

  test("normalizes the none token to off", () => {
    expect(
      readReasoningEfforts(createModelRecord({ type: "endpoint", fixedEffort: "none" })),
    ).toEqual({ efforts: [{ id: "off", name: "off" }], defaultEffort: "off" });
  });

  test("advertised levels become the offered set, with no default forced", () => {
    expect(
      readReasoningEfforts(createModelRecord({ reasoningEffortLevels: ["low", "medium", "high"] })),
    ).toEqual({
      efforts: [
        { id: "low", name: "low" },
        { id: "medium", name: "medium" },
        { id: "high", name: "high" },
      ],
    });
  });

  test("a token DSH cannot express yields no reasoning control rather than a broken one", () => {
    expect(
      readReasoningEfforts(createModelRecord({ type: "endpoint", fixedEffort: "ultra" })),
    ).toBeUndefined();
  });

  test("a fixed effort alongside levels still yields only the fixed effort", () => {
    const record = createModelRecord({
      type: "endpoint",
      fixedEffort: "medium",
      reasoningEffortLevels: ["low", "medium", "high"],
    });
    expect(readReasoningEfforts(record)).toEqual({
      efforts: [{ id: "medium", name: "medium" }],
      defaultEffort: "medium",
    });
  });

  test("an endpoint with no fixed effort declares no control at all", () => {
    expect(readReasoningEfforts(createModelRecord({ type: "endpoint" }))).toBeUndefined();
  });

  test("a plain model with no effort metadata declares no control", () => {
    expect(
      readReasoningEfforts(
        createModelRecord({ type: "model", capabilities: { reasoning: undefined } }),
      ),
    ).toBeUndefined();
  });

  test("a plain model advertising levels declares them without forcing a default", () => {
    expect(readReasoningEfforts(createModelRecord({ type: "model" }))).toEqual({
      efforts: [
        { id: "medium", name: "medium" },
        { id: "max", name: "max" },
      ],
    });
  });
});

describe("modelDisplayName", () => {
  test("prefers displayName, then upstream id, then the record id", () => {
    expect(modelDisplayName(createModelRecord({ id: "a", displayName: "DeepSeek V4 Flash" }))).toBe(
      "DeepSeek V4 Flash",
    );
    expect(
      modelDisplayName(
        createModelRecord({ id: "a", upstreamModelId: "deepseek/deepseek-v4-flash" }),
      ),
    ).toBe("deepseek/deepseek-v4-flash");
    expect(modelDisplayName(createModelRecord({ id: "baseline.remote-only" }))).toBe(
      "baseline.remote-only",
    );
  });

  test("appends the effort label when a fixed effort exists", () => {
    expect(
      modelDisplayName(createModelRecord({ id: "a", displayName: "Flash", fixedEffort: "high" })),
    ).toBe("Flash (high)");
    expect(
      modelDisplayName(createModelRecord({ id: "a", displayName: "Flash", fixedEffort: "none" })),
    ).toBe("Flash (off)");
  });

  test("does not append a label that is already there", () => {
    expect(
      modelDisplayName(
        createModelRecord({ id: "a", displayName: "Flash (high)", fixedEffort: "high" }),
      ),
    ).toBe("Flash (high)");
  });
});

describe("createRoleModelCatalog", () => {
  test("names the owning provider on every entry, as DSH requires", () => {
    const catalog = createRoleModelCatalog(createDiscovery(), "role-model");
    expect(catalog.entries.length).toBeGreaterThan(0);
    for (const entry of catalog.entries) expect(entry.provider).toBe("role-model");
  });

  test("never emits a duplicate or blank model id", () => {
    const catalog = createRoleModelCatalog(createDiscovery(), "role-model");
    const ids = catalog.entries.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id.length).toBeGreaterThan(0);
  });

  test("orders aliases first, with the recommended alias at the very top", () => {
    const discovery = createDiscovery({
      setup: { recommendedModel: "baseline.remote-only", notes: [] },
      models: [
        createModelRecord({ id: "endpoint.one", type: "endpoint" }),
        createModelRecord({ id: "other.alias", type: "alias" }),
        createModelRecord({ id: "baseline.remote-only", type: "alias" }),
      ],
    });
    const catalog = createRoleModelCatalog(discovery, "role-model");
    expect(catalog.entries.map((entry) => entry.id)).toEqual([
      "baseline.remote-only",
      "other.alias",
      "endpoint.one",
    ]);
  });

  test("declares image input modality only when discovery advertises it", () => {
    const withImage = createDiscovery({
      models: [createModelRecord({ id: "x", modalities: { availableInput: ["text", "image"] } })],
    });
    expect(createRoleModelCatalog(withImage, "role-model").entries[0]?.inputModalities).toEqual([
      "text",
      "image",
    ]);

    const textOnly = createDiscovery({
      models: [createModelRecord({ id: "x", modalities: { availableInput: ["text"] } })],
    });
    expect(createRoleModelCatalog(textOnly, "role-model").entries[0]?.inputModalities).toEqual([
      "text",
    ]);
  });

  test("uses piMapping limits when present, with no degradation diagnosed", () => {
    const discovery = createDiscovery({
      models: [
        createModelRecord({ id: "x", piMapping: { contextWindow: 1_000_000, maxTokens: 128_000 } }),
      ],
    });
    const catalog = createRoleModelCatalog(discovery, "role-model");
    expect(catalog.entries[0]?.contextWindow).toBe(1_000_000);
    expect(catalog.entries[0]?.maxTokens).toBe(128_000);
    expect(catalog.diagnostics).toEqual([]);
  });

  test("falls back to safe limits and diagnoses the degradation when piMapping is missing", () => {
    const discovery = createDiscovery({
      models: [
        createModelRecord({
          id: "x",
          piMapping: {},
          limits: { safeContextWindow: 32_000, safeMaxOutputTokens: 4_000 },
        }),
      ],
    });
    const catalog = createRoleModelCatalog(discovery, "role-model");
    expect(catalog.entries[0]?.contextWindow).toBe(32_000);
    expect(catalog.entries[0]?.maxTokens).toBe(4_000);
    expect(catalog.diagnostics).toEqual([
      {
        id: "x",
        degraded: true,
        reasons: ["missing piMapping.contextWindow", "missing piMapping.maxTokens"],
      },
    ]);
  });

  test("uses conservative defaults and diagnoses them when nothing sizes the model", () => {
    const discovery = createDiscovery({
      models: [createModelRecord({ id: "x", piMapping: {}, limits: {} })],
    });
    const catalog = createRoleModelCatalog(discovery, "role-model");
    expect(catalog.entries[0]?.contextWindow).toBe(CONSERVATIVE_CONTEXT_WINDOW);
    expect(catalog.entries[0]?.maxTokens).toBe(CONSERVATIVE_MAX_TOKENS);
    expect(catalog.diagnostics[0]?.reasons).toContain("using conservative context window default");
  });

  test("never leaks diagnostics into a model entry", () => {
    const discovery = createDiscovery({
      models: [createModelRecord({ id: "x", piMapping: {}, limits: {} })],
    });
    const catalog = createRoleModelCatalog(discovery, "role-model");
    expect(Object.keys(catalog.entries[0] ?? {})).not.toContain("reasons");
    expect(Object.keys(catalog.entries[0] ?? {})).not.toContain("degraded");
  });

  test("exposes the placeholder token as the bearer credential, never a real one", () => {
    const catalog = createRoleModelCatalog(createDiscovery(), "role-model");
    expect(catalog.baseUrl).toBe("http://127.0.0.1:3457/v1");
    expect(catalog.apiKey).toBe("role-model-local");
    expect(catalog.recommendedModel).toBe("baseline.remote-only");
  });

  test("carries the route name through verbatim, lower-case", () => {
    const catalog = createRoleModelCatalog(createDiscovery(), "role-model");
    expect(catalog.providerRoute).toBe("role-model");
    expect(catalog.displayName).toBe("role-model");
  });
});
