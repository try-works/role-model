import { describe, expect, test } from "vitest";

import { normalizeRuntimeEffortReceipt } from "../src/index.js";

describe("Run 106 runtime effort-source round-trip", () => {
  test("round-trips the occurrence/telemetry effort-source vocabulary", () => {
    expect(
      normalizeRuntimeEffortReceipt({ reasoningEffort: "high", effortSource: "client" }),
    ).toEqual({ reasoningEffort: "high", effortSource: "client", coerced: false });
    expect(
      normalizeRuntimeEffortReceipt({ reasoningEffort: "high", effortSource: "variant" }),
    ).toEqual({ reasoningEffort: "high", effortSource: "variant", coerced: false });
    expect(
      normalizeRuntimeEffortReceipt({ reasoningEffort: "high", effortSource: "variant_coerced" }),
    ).toEqual({ reasoningEffort: "high", effortSource: "variant_coerced", coerced: true });
    expect(normalizeRuntimeEffortReceipt({ reasoningEffort: null, effortSource: "none" })).toEqual({
      reasoningEffort: null,
      effortSource: "none",
      coerced: false,
    });
  });

  test("defaults a missing source to none for a null-effort request", () => {
    expect(normalizeRuntimeEffortReceipt({ reasoningEffort: null })).toEqual({
      reasoningEffort: null,
      effortSource: "none",
      coerced: false,
    });
  });

  test("defaults a missing source to client for an efforted request", () => {
    expect(normalizeRuntimeEffortReceipt({ reasoningEffort: "high" })).toEqual({
      reasoningEffort: "high",
      effortSource: "client",
      coerced: false,
    });
  });

  test("rejects a non-none source without a reasoning effort", () => {
    expect(() =>
      normalizeRuntimeEffortReceipt({ reasoningEffort: null, effortSource: "variant" }),
    ).toThrow(/none|reasoningEffort|effort/i);
  });

  test("rejects a none source carrying a reasoning effort", () => {
    expect(() =>
      normalizeRuntimeEffortReceipt({ reasoningEffort: "high", effortSource: "none" }),
    ).toThrow(/none|reasoningEffort|effort/i);
  });
});
