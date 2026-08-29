import { describe, expect, test } from "vitest";

describe("Run 95 graph registry contract", () => {
  test("SP0 rejects an incomplete graph registry before an extension can consume it", async () => {
    const host = await import("../../../packages/extension-host/index.mjs");
    expect(host.validateGraphRegistry).toBeTypeOf("function");
    expect(() =>
      host.validateGraphRegistry({ version: 1, kinds: [{ id: "core.message", version: 1 }] }),
    ).toThrow(/incomplete/i);
  });
});
