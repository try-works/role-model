import { describe, expect, test } from "vitest";

import { classifyBridgeRoutePass } from "../src/index.js";

/**
 * Run 100 addendum 10, E1 follow-on. Measured live on `run118-d26c8343`: the counterfactual pass of a capture goes
 * through the same host call site as the live pass, so its verdict line read `pass=live` while its request id was
 * `replay-req-...`. A label that names the wrong pass is worse than no label - the whole purpose of the field is that
 * a reader can trust it. The replay executor names its requests with the `replay-` prefix; the live path never does.
 */
describe("run118 E1: the pass label names the pass that produced the verdict", () => {
  test("a replay-executor request is a replay pass, not the live pass", () => {
    expect(
      classifyBridgeRoutePass({
        requestId: "replay-req-daca923f-ccd3-44b8-9265-ce591199f8ae-f3872fa5c8861624",
        denyCount: 0,
      }),
    ).toBe("replay");
  });

  test("a live request that carries a deny list is a reroute of the live pass", () => {
    expect(
      classifyBridgeRoutePass({
        requestId: "req-daca923f-ccd3-44b8-9265-ce591199f8ae",
        denyCount: 1,
      }),
    ).toBe("live:reroute");
  });

  test("a live request without a deny list is the live pass", () => {
    expect(
      classifyBridgeRoutePass({
        requestId: "req-daca923f-ccd3-44b8-9265-ce591199f8ae",
        denyCount: 0,
      }),
    ).toBe("live");
  });

  test("an unattributed request is reported as unattributed rather than assumed live", () => {
    expect(classifyBridgeRoutePass({ requestId: null, denyCount: 0 })).toBe("-");
  });
});
