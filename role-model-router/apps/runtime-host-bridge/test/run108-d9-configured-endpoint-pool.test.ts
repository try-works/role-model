import { expect, test } from "vitest";

import { resolveUserConfiguredEndpointPool } from "../src/track-b-runtime.js";

test("run108 D9 learner denominator uses persisted user-configured endpoint rows exactly", () => {
  expect(
    resolveUserConfiguredEndpointPool({
      configuredEndpointRows: [
        { endpoint_id: "deepseek.account.global.deepseek-flash", reasoning_effort: null },
        { endpoint_id: "deepseek.account.global.deepseek-flash-max", reasoning_effort: "max" },
        { endpoint_id: "deepseek.account.global.deepseek-v4-pro", reasoning_effort: null },
        { endpoint_id: "deepseek.account.global.deepseek-v4-pro-max", reasoning_effort: "max" },
      ],
      expandedEndpointIds: [
        "deepseek.account.global.deepseek-flash",
        "deepseek.account.global.deepseek-flash-low",
        "deepseek.account.global.deepseek-flash-high",
        "deepseek.account.global.deepseek-flash-max",
        "deepseek.account.global.deepseek-v4-pro",
        "deepseek.account.global.deepseek-v4-pro-high",
        "deepseek.account.global.deepseek-v4-pro-max",
      ],
    }),
  ).toEqual([
    "deepseek.account.global.deepseek-flash",
    "deepseek.account.global.deepseek-flash-max",
    "deepseek.account.global.deepseek-v4-pro",
    "deepseek.account.global.deepseek-v4-pro-max",
  ]);
});

test("run108 D9 learner denominator falls back to expanded ids only without configured rows", () => {
  expect(
    resolveUserConfiguredEndpointPool({
      configuredEndpointRows: [],
      expandedEndpointIds: ["provider.model", "provider.model-high"],
    }),
  ).toEqual(["provider.model", "provider.model-high"]);
});
