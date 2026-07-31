import { describe, expect, it } from "vitest";

import {
  MODEL_STATUS_DOT_CLASS,
  clampCacheHitRate,
  formatCacheHitRate,
  formatRequestCount,
} from "./sidebar";

describe("rm3 sidebar helpers", () => {
  it("formats request counts with grouping separators", () => {
    expect(formatRequestCount(0)).toBe("0");
    expect(formatRequestCount(1044)).toBe("1,044");
    expect(formatRequestCount(12_482)).toBe("12,482");
    expect(formatRequestCount(-3)).toBe("0");
    expect(formatRequestCount(Number.NaN)).toBe("0");
  });

  it("clamps and formats cache hit rate", () => {
    expect(clampCacheHitRate(73)).toBe(73);
    expect(clampCacheHitRate(-10)).toBe(0);
    expect(clampCacheHitRate(140)).toBe(100);
    expect(clampCacheHitRate(Number.NaN)).toBe(0);
    expect(formatCacheHitRate(73.4)).toBe("73%");
    expect(formatCacheHitRate(99.6)).toBe("100%");
  });

  it("maps model status to semantic dot classes", () => {
    expect(MODEL_STATUS_DOT_CLASS.active).toBe("bg-chart-cache");
    expect(MODEL_STATUS_DOT_CLASS.degraded).toBe("bg-status-warning");
    expect(MODEL_STATUS_DOT_CLASS.offline).toBe("bg-muted-foreground");
  });
});
