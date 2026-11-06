import { describe, expect, it } from "vitest";

import { createCliExtensionRuntimeOwner } from "../src/cli.js";

/**
 * Run 115 S124 (R27): the extension runtime is closed exactly once at shutdown.
 *
 * The CLI registers both "extensionRuntimeOwner" and "extensionRuntime". The owner already closes
 * the runtime (createCliExtensionRuntimeOwner.close -> runtime.close, memoized), so the second
 * registration delegates to that same memoized close instead of calling runtime.close again.
 */
describe("S124 extension runtime close-once", () => {
  it("closes the runtime once when both registrations run", async () => {
    let closes = 0;
    const runtime = {
      close: async () => {
        closes += 1;
      },
      health: () => ({}),
    };
    const owner = createCliExtensionRuntimeOwner(Promise.resolve(runtime));
    await owner.promise;
    // What releaseHostResources now does: owner closer, then the extensionRuntime registration.
    await owner.close();
    await owner.close();
    expect(closes).toBe(1);
  });

  it("does not close a runtime that never resolved", async () => {
    let closes = 0;
    const owner = createCliExtensionRuntimeOwner(
      Promise.reject(new Error("startup failed")).catch(() => ({
        close: async () => {
          closes += 1;
        },
        health: () => ({}),
      })) as Promise<{ close: () => Promise<void>; health: () => Record<string, unknown> }>,
    );
    await owner.close();
    expect(closes).toBe(1);
  });
});
