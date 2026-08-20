import { describe, expect, test } from "vitest";

import * as endpointRegistry from "../src/index.ts";

describe("effort instance identity", () => {
  test("exports one canonical identity constructor with stable legacy and encoded effort ids", () => {
    const createIdentity = (
      endpointRegistry as typeof endpointRegistry & {
        createEndpointInstanceIdentity?: (input: {
          providerAccountId: string;
          region: string;
          modelId: string;
          reasoningEffort?: string | null;
        }) => {
          endpointId: string;
          providerAccountId: string;
          region: string;
          modelId: string;
          reasoningEffort: string | null;
        };
      }
    ).createEndpointInstanceIdentity;

    expect(createIdentity).toBeTypeOf("function");

    expect(
      createIdentity?.({
        providerAccountId: "deepseek.personal.primary",
        region: "global",
        modelId: "deepseek/deepseek-v4-pro",
      }),
    ).toEqual({
      endpointId: "deepseek.personal.primary.global.deepseek-v4-pro",
      providerAccountId: "deepseek.personal.primary",
      region: "global",
      modelId: "deepseek/deepseek-v4-pro",
      reasoningEffort: null,
    });

    const medium = createIdentity?.({
      providerAccountId: "deepseek.personal.primary",
      region: "global",
      modelId: "deepseek/deepseek-v4-pro",
      reasoningEffort: "medium",
    });
    const max = createIdentity?.({
      providerAccountId: "deepseek.personal.primary",
      region: "global",
      modelId: "deepseek/deepseek-v4-pro",
      reasoningEffort: "max",
    });

    expect(medium?.endpointId).toBe(
      "deepseek.personal.primary.global.deepseek-v4-pro~effort-v1~bWVkaXVt",
    );
    expect(max?.endpointId).toBe("deepseek.personal.primary.global.deepseek-v4-pro~effort-v1~bWF4");
    expect(medium?.endpointId).not.toBe(max?.endpointId);
    expect(medium?.reasoningEffort).toBe("medium");
  });

  test("normalizes canonical Unicode and rejects unsafe or oversized effort tokens", () => {
    const createIdentity = (
      endpointRegistry as typeof endpointRegistry & {
        createEndpointInstanceIdentity?: (input: {
          providerAccountId: string;
          region: string;
          modelId: string;
          reasoningEffort?: string | null;
        }) => unknown;
      }
    ).createEndpointInstanceIdentity;

    expect(
      createIdentity?.({
        providerAccountId: "account",
        region: "global",
        modelId: "provider/model",
        reasoningEffort: "e\u0301",
      }),
    ).toMatchObject({ reasoningEffort: "é" });
    expect(() =>
      createIdentity?.({
        providerAccountId: "account",
        region: "global",
        modelId: "provider/model",
        reasoningEffort: "medium\u200b",
      }),
    ).toThrow(/control|format|unsafe/i);
    expect(() =>
      createIdentity?.({
        providerAccountId: "account",
        region: "global",
        modelId: "provider/model",
        reasoningEffort: "x".repeat(129),
      }),
    ).toThrow(/128|length|long/i);
  });
});
