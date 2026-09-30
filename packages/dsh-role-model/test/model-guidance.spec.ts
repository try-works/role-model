/**
 * L1: model id normalization and invalid-id diagnostics.
 *
 * These back the recovery text a user sees when they pick a model id that no
 * role-model route owns. The classification decides whether the message points
 * at "you named a different provider's model" or "that id does not exist".
 */

import { describe, expect, test } from "vitest";
import {
  classifyRoleModelModelId,
  findRoleModelModel,
  formatInvalidRoleModelModelId,
  normalizeRoleModelModelId,
  recommendedRoleModelModelId,
} from "../src/model-guidance.js";
import { createDiscovery, createModelRecord } from "./fixtures.js";

describe("normalizeRoleModelModelId", () => {
  test("strips a role-model/ prefix", () => {
    expect(normalizeRoleModelModelId("role-model/baseline.remote-only")).toBe(
      "baseline.remote-only",
    );
  });

  test("leaves a bare id alone and is idempotent", () => {
    expect(normalizeRoleModelModelId("baseline.remote-only")).toBe("baseline.remote-only");
    const once = normalizeRoleModelModelId("role-model/x");
    expect(normalizeRoleModelModelId(once)).toBe(once);
  });
});

describe("findRoleModelModel", () => {
  test("finds by bare id and by qualified id", () => {
    const discovery = createDiscovery();
    expect(findRoleModelModel(discovery, "baseline.remote-only")?.id).toBe("baseline.remote-only");
    expect(findRoleModelModel(discovery, "role-model/baseline.remote-only")?.id).toBe(
      "baseline.remote-only",
    );
  });

  test("returns undefined for an unknown id", () => {
    expect(findRoleModelModel(createDiscovery(), "nope")).toBeUndefined();
  });
});

describe("recommendedRoleModelModelId", () => {
  test("prefers the runtime recommendation", () => {
    const discovery = createDiscovery({
      setup: { recommendedModel: "baseline.hybrid", notes: [] },
    });
    expect(recommendedRoleModelModelId(discovery)).toBe("baseline.hybrid");
  });

  test("falls back to the first model, then null", () => {
    const noRecommendation = createDiscovery({ setup: { recommendedModel: null, notes: [] } });
    expect(recommendedRoleModelModelId(noRecommendation)).toBe("baseline.remote-only");
  });
});

describe("classifyRoleModelModelId", () => {
  test("recognizes a qualified and a bare role-model id as known", () => {
    const discovery = createDiscovery();
    expect(classifyRoleModelModelId("baseline.remote-only", discovery)).toBe("known");
    expect(classifyRoleModelModelId("role-model/baseline.remote-only", discovery)).toBe("known");
  });

  test("classifies another provider's model id as foreign", () => {
    const discovery = createDiscovery();
    for (const id of [
      "gpt-4o",
      "claude-3-opus",
      "deepseek-chat",
      "openai/gpt-5",
      "gemini-1.5-pro",
    ]) {
      expect(classifyRoleModelModelId(id, discovery), id).toBe("foreign-provider-model");
    }
  });

  test("classifies anything else as an unknown role-model id", () => {
    expect(classifyRoleModelModelId("baseline.does-not-exist", createDiscovery())).toBe(
      "unknown-model-id",
    );
  });
});

describe("formatInvalidRoleModelModelId", () => {
  test("names the model, the provider, and the recommended alias", () => {
    const discovery = createDiscovery();
    const text = formatInvalidRoleModelModelId(discovery, "gpt-4o", true);
    expect(text).toContain("invalid role-model model id");
    expect(text).toContain("gpt-4o");
    expect(text).toContain("foreign-provider-model");
    expect(text).toContain("provider: role-model");
    expect(text).toContain("recommended alias: baseline.remote-only");
  });

  test("states whether the runtime was reached", () => {
    const discovery = createDiscovery();
    expect(formatInvalidRoleModelModelId(discovery, "gpt-4o", true)).toContain(
      "runtime reached: yes",
    );
    expect(formatInvalidRoleModelModelId(discovery, "gpt-4o", false)).toContain(
      "runtime reached: no",
    );
  });

  test("points at the recovery commands", () => {
    const text = formatInvalidRoleModelModelId(createDiscovery(), "nope", true);
    expect(text).toContain("/role-model alias list");
    expect(text).toContain("/role-model alias recommended");
  });

  test("never uses a capitalised product name", () => {
    const text = formatInvalidRoleModelModelId(createDiscovery(), "nope", true);
    expect(text).not.toMatch(/Role[ -]Model/u);
    expect(text).not.toMatch(/\bRole Model\b/u);
  });

  test("lists the available aliases so the user can pick one", () => {
    const discovery = createDiscovery({
      models: [
        createModelRecord({ id: "baseline.remote-only", type: "alias" }),
        createModelRecord({ id: "baseline.hybrid", type: "alias" }),
        createModelRecord({ id: "endpoint.one", type: "endpoint" }),
      ],
    });
    const text = formatInvalidRoleModelModelId(discovery, "nope", true);
    expect(text).toContain("baseline.remote-only");
    expect(text).toContain("baseline.hybrid");
  });
});
