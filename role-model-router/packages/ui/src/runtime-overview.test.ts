import { describe, expect, it } from "vitest";

import {
  groupChartRows,
  groupOverviewChartRows,
  type RuntimeOverviewChartBlock,
} from "./runtime-overview";

const stub = (
  title: string,
  span: 6 | 12,
): RuntimeOverviewChartBlock => ({
  title,
  data: [],
  series: [],
  kind: "line",
  span,
});

describe("groupChartRows", () => {
  it("keeps full-width charts alone", () => {
    expect(groupChartRows([stub("a", 12), stub("b", 12)])).toEqual([
      [stub("a", 12)],
      [stub("b", 12)],
    ]);
  });

  it("pairs consecutive half-width charts", () => {
    const rows = groupChartRows([
      stub("token", 12),
      stub("left", 6),
      stub("right", 6),
      stub("solo", 6),
    ]);
    expect(rows.map((r) => r.map((c) => c.title))).toEqual([
      ["token"],
      ["left", "right"],
      ["solo"],
    ]);
  });

  it("aliases groupOverviewChartRows", () => {
    expect(groupOverviewChartRows).toBe(groupChartRows);
  });
});
