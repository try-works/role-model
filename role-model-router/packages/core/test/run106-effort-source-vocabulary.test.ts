import { describe, expect, test } from "vitest";

import { normalizeEffortSource } from "../src/types.js";

describe("Run 106 effort-source vocabulary", () => {
  test("round-trips all four canonical states losslessly", () => {
    expect(normalizeEffortSource("named")).toEqual({ source: "named", coerced: false });
    expect(normalizeEffortSource("disabled")).toEqual({ source: "disabled", coerced: false });
    expect(normalizeEffortSource("provider_default")).toEqual({
      source: "provider_default",
      coerced: false,
    });
    expect(normalizeEffortSource("none")).toEqual({ source: "none", coerced: false });
  });

  test("maps historical named sources onto the named state", () => {
    expect(normalizeEffortSource("client")).toEqual({ source: "named", coerced: false });
    expect(normalizeEffortSource("variant")).toEqual({ source: "named", coerced: false });
  });

  test("keeps historical variant_coerced readable as a coerced named effort", () => {
    expect(normalizeEffortSource("variant_coerced")).toEqual({ source: "named", coerced: true });
  });

  test("migrates null, undefined, and empty deterministically to provider_default", () => {
    expect(normalizeEffortSource(null)).toEqual({ source: "provider_default", coerced: false });
    expect(normalizeEffortSource(undefined)).toEqual({
      source: "provider_default",
      coerced: false,
    });
    expect(normalizeEffortSource("")).toEqual({ source: "provider_default", coerced: false });
  });

  test("rejects unrecognized states instead of silently dropping them", () => {
    expect(() => normalizeEffortSource("bogus")).toThrow(/effort_source/i);
  });
});
