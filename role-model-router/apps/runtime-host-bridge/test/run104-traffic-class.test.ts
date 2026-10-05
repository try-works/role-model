import { expect, test } from "vitest";

import { isLiveTrafficClass, toPersistedTrafficClass } from "../src/traffic-class.ts";

/**
 * Run 104 / R14 (as amended by addendum-03): the telemetry writer must persist the request's declared traffic
 * class instead of an unconditional `live_request`, and the execution plane's enum must map into the persisted
 * vocabulary (`live | replay | evaluation | benchmark | probe | unknown`).
 */
test("run104: execution traffic classes map into the persisted vocabulary", () => {
  expect(toPersistedTrafficClass("live")).toBe("live");
  expect(toPersistedTrafficClass("benchmark")).toBe("benchmark");
  expect(toPersistedTrafficClass("replay")).toBe("replay");
  expect(toPersistedTrafficClass("health")).toBe("probe");
  expect(toPersistedTrafficClass("synthetic")).toBe("probe");
  expect(toPersistedTrafficClass(undefined)).toBe("live");
  expect(toPersistedTrafficClass(null)).toBe("live");
});

test("run104: live traffic includes the legacy live_request value", () => {
  expect(isLiveTrafficClass("live")).toBe(true);
  expect(isLiveTrafficClass("live_request")).toBe(true);
  expect(isLiveTrafficClass("replay")).toBe(false);
  expect(isLiveTrafficClass("benchmark")).toBe(false);
  expect(isLiveTrafficClass(undefined)).toBe(false);
});
