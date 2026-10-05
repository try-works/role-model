import { describe, expect, it } from "vitest";

import { evaluateDispatchContextGuard } from "../src/dispatch-context-guard.js";

/**
 * Run 99 R33 live finding (stage v146): the runtime forwarded a 2,340,111-byte prompt — 630,034
 * estimated tokens — to `deepseek…flash-max` and only the *client* noticed (`pi-ai detected context
 * overflow for model "difficulty.remote-only"`). The router filters candidates whose declared context
 * is too small, but nothing guarded the selected candidate at dispatch time, so an oversized prompt
 * was handed to a model that could not hold it and the failure surfaced as a provider/client error
 * instead of a clear, bounded runtime answer.
 */
describe("run99 R33 dispatch-side context guard", () => {
  it("allows a prompt that fits the selected model's declared context", () => {
    expect(
      evaluateDispatchContextGuard({
        estimatedContextTokens: 12_000,
        maxContextTokens: 128_000,
        modelId: "deepseek/deepseek-flash",
        endpointId: "endpoint:flash-max",
      }),
    ).toEqual({ allowed: true });
  });

  it("refuses with the estimate, the limit and the model named", () => {
    const guard = evaluateDispatchContextGuard({
      estimatedContextTokens: 630_034,
      maxContextTokens: 131_072,
      modelId: "deepseek/deepseek-flash",
      endpointId: "endpoint:flash-max",
    });

    expect(guard.allowed).toBe(false);
    if (guard.allowed) throw new Error("unreachable");
    expect(guard.code).toBe("context_window_exceeded");
    expect(guard.estimatedContextTokens).toBe(630_034);
    expect(guard.maxContextTokens).toBe(131_072);
    expect(guard.modelId).toBe("deepseek/deepseek-flash");
    expect(guard.reason).toMatch(/context/i);
  });

  it("does not invent a limit when the endpoint declares none", () => {
    for (const maxContextTokens of [null, undefined, 0]) {
      expect(
        evaluateDispatchContextGuard({
          estimatedContextTokens: 630_034,
          maxContextTokens,
          modelId: "deepseek/deepseek-flash",
          endpointId: "endpoint:flash-max",
        }),
      ).toEqual({ allowed: true });
    }
  });

  it("reroutes to a larger-context alternative when one is offered", () => {
    const guard = evaluateDispatchContextGuard({
      estimatedContextTokens: 630_034,
      maxContextTokens: 131_072,
      modelId: "deepseek/deepseek-flash",
      endpointId: "endpoint:flash-max",
      alternatives: [
        { endpointId: "endpoint:small", modelId: "model:small", maxContextTokens: 32_000 },
        { endpointId: "endpoint:long", modelId: "model:long", maxContextTokens: 1_000_000 },
      ],
    });

    expect(guard.allowed).toBe(false);
    if (guard.allowed) throw new Error("unreachable");
    expect(guard.code).toBe("context_window_exceeded");
    expect(guard.reroute).toEqual({
      endpointId: "endpoint:long",
      modelId: "model:long",
      maxContextTokens: 1_000_000,
    });
  });
});
