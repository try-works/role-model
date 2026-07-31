import { describe, expect, it } from "vitest";

import { ChartGrid, ChartGridCell } from "./chart-grid";

describe("chart grid", () => {
  it("exports ChartGrid and ChartGridCell", () => {
    expect(ChartGrid).toBeTypeOf("function");
    expect(ChartGridCell).toBeTypeOf("function");
  });
});
