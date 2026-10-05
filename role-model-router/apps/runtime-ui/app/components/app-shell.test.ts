import { describe, expect, test } from "vitest";

import type { RuntimeTelemetryRequestRecord } from "../lib/runtime-api";
import * as appShellModule from "./app-shell";

/**
 * Run 104 `R14` follow-up (`SP9` remainder) - the shell's cache sample is live-only.
 *
 * `SP9` (commit `54db3d67`) added and tested `latestLiveRequest` in `lib/sidebar-footer.ts`, but the
 * caller was outside its scope: the app shell still sampled `requests[0] ?? dashboard.requests[0]`,
 * so a newer replay/benchmark row became the displayed "latest request" and a window with no live
 * row still rendered `0%` (from `cacheHitRateFromRequest(null)`).
 *
 * These tests pin the call-site rule: the sample is the newest live row across the polled page and
 * the dashboard fallback, and an empty live set resolves to `null` so the sidebar can render its
 * absence label.
 */

type FooterSampleInput = {
  readonly requests: readonly RuntimeTelemetryRequestRecord[];
  readonly dashboardRequests: readonly RuntimeTelemetryRequestRecord[];
};
type FooterSampleResolver = (input: FooterSampleInput) => number | null;

/**
 * This slice adds `resolveFooterCacheHitRate`; reading it off the module namespace keeps the RED run
 * a behavioural assertion failure rather than a missing-export collection error.
 */
const resolveFooterCacheHitRate = (
  appShellModule as { resolveFooterCacheHitRate?: FooterSampleResolver }
).resolveFooterCacheHitRate;

function sampleFooterCacheHitRate(input: FooterSampleInput): number | null {
  expect(resolveFooterCacheHitRate).toBeTypeOf("function");
  if (!resolveFooterCacheHitRate) {
    throw new Error("resolveFooterCacheHitRate is not exported by the app shell");
  }
  return resolveFooterCacheHitRate(input);
}

function request(
  partial: Partial<RuntimeTelemetryRequestRecord> &
    Pick<RuntimeTelemetryRequestRecord, "requestId">,
): RuntimeTelemetryRequestRecord {
  return {
    endpointId: "run104.endpoint",
    sourceType: "remote",
    createdAtMs: 1,
    ...partial,
  } as RuntimeTelemetryRequestRecord;
}

function measured(input: {
  readonly requestClass: NonNullable<RuntimeTelemetryRequestRecord["requestClass"]>;
  readonly createdAtMs: number;
  readonly cacheReadTokens: number;
  readonly inputTokens?: number;
}): RuntimeTelemetryRequestRecord {
  return request({
    requestId: `req-${input.requestClass}-${input.createdAtMs}`,
    requestClass: input.requestClass,
    createdAtMs: input.createdAtMs,
    promptCacheSupported: true,
    cacheReadTokensSupported: true,
    cacheReadTokens: input.cacheReadTokens,
    inputTokens: input.inputTokens ?? 100,
  });
}

describe("run105 Phase5 responsive app shell", () => {
  test("mobile shell hides the fixed desktop sidebar and keeps the content lane full width", () => {
    const source = require("node:fs").readFileSync(
      new URL("./app-shell.tsx", import.meta.url),
      "utf8",
    );
    expect(source).toMatch(/<Sidebar[^>]+className="[^"]*hidden[^"]*md:flex/);
    expect(source).toContain("md:hidden");
    expect(source).toContain("overflow-x-auto");
  });
});

describe("run104 R14 app-shell footer sampling", () => {
  test("samples the newest live request, not the newer benchmark row", () => {
    const sample = sampleFooterCacheHitRate({
      requests: [
        measured({ requestClass: "benchmark", createdAtMs: 300, cacheReadTokens: 100 }),
        measured({ requestClass: "live", createdAtMs: 200, cacheReadTokens: 40 }),
      ],
      dashboardRequests: [],
    });
    expect(sample).toBe(40);
  });

  test("no live request in either source means no sample at all", () => {
    expect(
      sampleFooterCacheHitRate({
        requests: [measured({ requestClass: "benchmark", createdAtMs: 300, cacheReadTokens: 100 })],
        dashboardRequests: [
          measured({ requestClass: "replay", createdAtMs: 250, cacheReadTokens: 90 }),
        ],
      }),
    ).toBeNull();
  });

  test("the dashboard fallback is sampled by the same live-only rule", () => {
    expect(
      sampleFooterCacheHitRate({
        requests: [],
        dashboardRequests: [
          measured({ requestClass: "benchmark", createdAtMs: 400, cacheReadTokens: 100 }),
          measured({ requestClass: "live", createdAtMs: 100, cacheReadTokens: 25 }),
        ],
      }),
    ).toBe(25);
  });
});
