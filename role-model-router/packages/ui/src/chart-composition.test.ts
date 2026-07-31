import { describe, expect, it } from "vitest";

import { CompositionChart, defaultRanks, totalValue } from "./chart-composition";

describe("composition chart helpers", () => {
  it("sums segment values", () => {
    expect(
      totalValue([
        { key: "a", label: "a", value: 10 },
        { key: "b", label: "b", value: 5 },
      ]),
    ).toBe(15);
  });

  it("ranks nested children before parents", () => {
    const ranks = defaultRanks(
      [
        {
          key: "coder",
          label: "coder",
          value: 100,
          children: [
            { key: "edit", label: "edit", value: 60 },
            { key: "review", label: "review", value: 40 },
          ],
        },
        { key: "chat", label: "chat", value: 30 },
      ],
      3,
    );
    expect(ranks.map((r) => r.key)).toEqual(["edit", "review", "chat"]);
  });

  it("exports CompositionChart", () => {
    expect(CompositionChart).toBeTypeOf("function");
  });
});
