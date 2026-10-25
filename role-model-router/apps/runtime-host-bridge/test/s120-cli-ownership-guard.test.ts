import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { HOST_RUNTIME_KINDS } from "../src/host-runtime-scope.js";

/**
 * Run 115 S120 (R27): the imperative acquisition in cli.ts must keep the ownership contract that
 * the DAG will eventually replace. This is a static guard, not a substitute for rewiring: it
 * fails if a resource is registered under an unknown kind, if a kind is registered twice, or if
 * shutdown stops awaiting the scope close.
 */
const cli = readFileSync(path.join(import.meta.dirname, "..", "src", "cli.ts"), "utf8");

describe("S120 CLI ownership guard", () => {
  it("registers only known kinds, and each kind at most once", () => {
    const kinds = [...cli.matchAll(/hostScope\.register\(\s*"([a-zA-Z]+)"/g)].map((match) => match[1]);
    expect(kinds.length).toBeGreaterThan(0);
    for (const kind of kinds) {
      expect(HOST_RUNTIME_KINDS, kind).toContain(kind);
    }
    expect(new Set(kinds).size, "duplicate registration: " + kinds.join(",")).toBe(kinds.length);
    // The contract is that every owner the runtime can hold is registered exactly once.
    expect([...kinds].sort()).toEqual([...HOST_RUNTIME_KINDS].sort());
  });

  const shutdownBody = (): string => {
    const start = cli.indexOf("const shutdown = async");
    expect(start, "shutdown function not found").toBeGreaterThan(-1);
    // The function opens with an early "return shutdownPromise" guard, so a matching return is not
    // the end of the body; take a bounded window and assert inside it.
    return cli.slice(start, start + 1_600);
  };

  it("awaits the scope close on shutdown and exits non-zero when a release rejects", () => {
    const body = shutdownBody();
    expect(body).toContain("await hostScope.close()");
    expect(body).toContain("process.exit(releaseResult.errors.length > 0 ? 1 : 0)");
  });

  it("closes the scope before nulling the resource holders, so releases are not no-ops", () => {
    const body = shutdownBody();
    const closeAt = body.indexOf("await hostScope.close()");
    expect(closeAt).toBeGreaterThan(-1);
    // Only the RUNTIME HOLDERS matter; loop/watchdog handles are nulled before the close by design.
    for (const holder of ["server = null", "extensionRuntimeOwner = null", "extensionRuntime = null", "packagedRuntime = null", "backend = null"]) {
      const at = body.indexOf(holder);
      expect(at, holder + " not found").toBeGreaterThan(-1);
      expect(at, holder + " nulled before hostScope.close()").toBeGreaterThan(closeAt);
    }
  });
});
