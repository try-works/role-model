import { describe, expect, test } from "vitest";

import { normalizeRuntimeEffortReceipt } from "../src/index.js";

describe("Run 106 runtime effort-source round-trip", () => {
  test("round-trips all four canonical states", () => {
    expect(normalizeRuntimeEffortReceipt({ reasoningEffort: "high", effortSource: "named" })).toEqual(
      { reasoningEffort: "high", effortSource: "named", coerced: false },
    );
    expect(normalizeRuntimeEffortReceipt({ reasoningEffort: null, effortSource: "disabled" })).toEqual(
      { reasoningEffort: null, effortSource: "disabled", coerced: false },
    );
    expect(
      normalizeRuntimeEffortReceipt({ reasoningEffort: null, effortSource: "provider_default" }),
    ).toEqual({ reasoningEffort: null, effortSource: "provider_default", coerced: false });
    expect(normalizeRuntimeEffortReceipt({ reasoningEffort: null, effortSource: "none" })).toEqual({
      reasoningEffort: null,
      effortSource: "none",
      coerced: false,
    });
  });

  test("normalizes legacy sources onto the canonical vocabulary", () => {
    expect(normalizeRuntimeEffortReceipt({ reasoningEffort: "high", effortSource: "client" })).toEqual(
      { reasoningEffort: "high", effortSource: "named", coerced: false },
    );
    expect(normalizeRuntimeEffortReceipt({ reasoningEffort: "high", effortSource: "variant" })).toEqual(
      { reasoningEffort: "high", effortSource: "named", coerced: false },
    );
    expect(
      normalizeRuntimeEffortReceipt({ reasoningEffort: "high", effortSource: "variant_coerced" }),
    ).toEqual({ reasoningEffort: "high", effortSource: "named", coerced: true });
  });

  test("defaults a missing source to provider_default for a null-effort request", () => {
    expect(normalizeRuntimeEffortReceipt({ reasoningEffort: null })).toEqual({
      reasoningEffort: null,
      effortSource: "provider_default",
      coerced: false,
    });
  });

  test("rejects a named source without a reasoning effort", () => {
    expect(() => normalizeRuntimeEffortReceipt({ reasoningEffort: null, effortSource: "named" })).toThrow(
      /named|reasoningEffort|effort/i,
    );
  });

  test("rejects a non-named source carrying a reasoning effort", () => {
    expect(() =>
      normalizeRuntimeEffortReceipt({ reasoningEffort: "high", effortSource: "disabled" }),
    ).toThrow(/disabled|reasoningEffort|effort/i);
  });
});
