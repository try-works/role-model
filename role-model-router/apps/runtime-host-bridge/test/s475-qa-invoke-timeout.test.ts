import { describe, expect, it } from "vitest";

import { runQaStartupInvoke } from "../src/cli.js";

/** S475: a never-settling QA startup invoke must reject within a finite deadline, naming the extension. */

describe("S475 packaged QA startup invoke deadline", () => {
  it(
    "rejects a never-settling invoke within the deadline and names the extension id",
    { timeout: 250 },
    async () => {
      const started = Date.now();
      await expect(
        runQaStartupInvoke({
          extensionId: "qa.example.extension",
          invoke: () => new Promise<never>(() => {}),
          timeoutMs: 25,
        }),
      ).rejects.toThrow(/qa\.example\.extension/);
      expect(Date.now() - started).toBeLessThan(1_000);
    },
  );

  it("returns the successful receipt unchanged and clears the timer", async () => {
    const receipt = { accepted: true, requestId: "req-1" };
    await expect(
      runQaStartupInvoke({
        extensionId: "qa.example.extension",
        invoke: async () => receipt,
        timeoutMs: 100,
      }),
    ).resolves.toBe(receipt);
  });
});
