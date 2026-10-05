import { expect, test } from "vitest";

import { toObservedSourceType } from "../src/index.js";

/**
 * Run 104 / R14 (addendum-03): the observation sample's `source_type` must carry the request's declared class
 * instead of the hardcoded `live_request`, and an unclassified execution defaults to `live`.
 */
test("run104: the observation sample source type follows the declared traffic class", () => {
  expect(toObservedSourceType("live")).toBe("live");
  expect(toObservedSourceType("replay")).toBe("replay");
  expect(toObservedSourceType("evaluation")).toBe("evaluation");
  expect(toObservedSourceType("benchmark")).toBe("benchmark");
  expect(toObservedSourceType("probe")).toBe("probe");
  expect(toObservedSourceType(undefined)).toBe("live");
  expect(toObservedSourceType(null)).toBe("live");
});
