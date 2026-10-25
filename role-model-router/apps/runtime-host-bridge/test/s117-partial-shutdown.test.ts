import { describe, expect, it } from "vitest";

import { acquireWithPartialShutdown } from "../src/partial-shutdown.js";

/**
 * Run 115 S117 (R27): partial shutdown.
 *
 * R27 requires a failed start to release everything already started, in reverse start order,
 * and to report the failure - the runtime must not leak a half-started host because the fifth
 * acquisition threw.
 */
const recorder = () => {
  const released: string[] = [];
  return {
    released,
    owner: (kind: string, fail = false) => ({
      acquire: async () => {
        if (fail) throw new Error(kind + " failed");
        return { kind };
      },
      kind,
      release: async () => {
        released.push(kind);
      },
    }),
  };
};

describe("S117 partial shutdown on a failed start", () => {
  it("releases already started owners in reverse order when a later acquire fails", async () => {
    const { owner, released } = recorder();
    const result = await acquireWithPartialShutdown([
      owner("server"),
      owner("backend"),
      owner("extension", true),
    ]);
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.failedAt).toBe("extension");
      expect(result.error.message).toContain("extension failed");
      expect(result.released).toEqual(["backend", "server"]);
    }
    expect(released).toEqual(["backend", "server"]);
  });

  it("keeps releasing the rest when one rollback release itself throws", async () => {
    const released: string[] = [];
    const result = await acquireWithPartialShutdown([
      { acquire: async () => ({}), kind: "server", release: async () => { released.push("server"); } },
      { acquire: async () => ({}), kind: "backend", release: async () => { throw new Error("backend release failed"); } },
      { acquire: async () => { throw new Error("stop"); }, kind: "extension", release: async () => { released.push("extension"); } },
    ]);
    expect(result.ok).toBe(false);
    expect(released).toEqual(["server"]);
    if (result.ok === false) {
      expect(result.rollbackErrors.map((entry) => entry.kind)).toEqual(["backend"]);
    }
  });

  it("releases in reverse start order on a clean shutdown", async () => {
    const { owner, released } = recorder();
    const result = await acquireWithPartialShutdown([owner("server"), owner("backend"), owner("extension")]);
    expect(result.ok).toBe(true);
    if (result.ok === true) {
      await result.release();
    }
    expect(released).toEqual(["extension", "backend", "server"]);
  });

  it("does not throw on a failed start - it returns a typed failure", async () => {
    const { owner } = recorder();
    await expect(acquireWithPartialShutdown([owner("server", true)])).resolves.toMatchObject({ ok: false });
  });
});
