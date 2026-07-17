import { describe, expect, test } from "vitest";

import { readPromptCacheRequestSource, readTokenTruth } from "./request-detail";

describe("request detail token truth", () => {
  test.each([
    ["measured", 0, "0 · measured"],
    ["normalized", 42, "42 · normalized"],
    ["estimated", 107, "107 · estimated"],
  ] as const)("renders available %s input usage from backend truth", (source, value, text) => {
    expect(
      readTokenTruth(
        {
          tokens_in: value,
          tokens_in_source: source,
          tokens_in_available: true,
        },
        "input",
      ),
    ).toEqual({ available: true, source, value, text });
  });

  test("does not render a numeric placeholder when input usage is unavailable", () => {
    expect(
      readTokenTruth(
        {
          tokens_in: 0,
          tokens_in_source: "unavailable",
          tokens_in_available: false,
        },
        "input",
      ),
    ).toEqual({
      available: false,
      source: "unavailable",
      value: null,
      text: "n/a · unavailable",
    });
  });

  test("does not infer token provenance from numeric presence", () => {
    expect(readTokenTruth({ tokens_out: 12 }, "output")).toEqual({
      available: false,
      source: "unavailable",
      value: null,
      text: "n/a · unavailable",
    });
  });

  test("reads only canonical prompt-cache request provenance", () => {
    expect(readPromptCacheRequestSource({ promptCacheRequestSource: "explicit" })).toBe("explicit");
    expect(readPromptCacheRequestSource({ promptCacheRequestSource: "synthesized" })).toBe(
      "synthesized",
    );
    expect(readPromptCacheRequestSource({ promptCacheRequested: true })).toBeNull();
  });
});
