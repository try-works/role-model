import { describe, expect, it } from "vitest";
import { computeEffortUnionAndIntersection } from "../src/router.js";

describe("run106 effort union and portable intersection", () => {
  it("computes union and portable intersection across models", () => {
    const r = computeEffortUnionAndIntersection({
      modelEfforts: [
        ["low", "high", "max"],
        ["high", "max"],
        ["low", "high"],
      ],
    });
    expect([...r.union].sort()).toEqual(["high", "low", "max"]);
    expect([...r.portableIntersection].sort()).toEqual(["high"]);
  });
  it("returns an empty intersection when no effort is shared", () => {
    const r = computeEffortUnionAndIntersection({ modelEfforts: [["low"], ["max"]] });
    expect(r.portableIntersection).toEqual([]);
  });
  it("ignores null provider-default slots in the union", () => {
    const r = computeEffortUnionAndIntersection({ modelEfforts: [["low", null], ["low"]] });
    expect(r.union).toEqual(["low"]);
    expect(r.portableIntersection).toEqual(["low"]);
  });
  it("an empty pool has an empty union and intersection", () => {
    const r = computeEffortUnionAndIntersection({ modelEfforts: [] });
    expect(r.union).toEqual([]);
    expect(r.portableIntersection).toEqual([]);
  });
});
