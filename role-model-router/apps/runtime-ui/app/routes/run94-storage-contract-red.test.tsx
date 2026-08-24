import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

describe("Run 94 public storage contract", () => {
  test("RED: names physical resources and logical classes as separate API/UI surfaces", () => {
    const api = readFileSync(new URL("../lib/runtime-api.ts", import.meta.url), "utf8");
    const route = readFileSync(new URL("./storage-retention.tsx", import.meta.url), "utf8");
    expect(api).toContain("physicalResources");
    expect(api).toContain("logicalClasses");
    expect(route).toContain("physicalResources");
    expect(route).toContain("logicalClasses");
    expect(route).toContain("Physical resources");
    expect(route).toContain("Logical classes");
  });
});
