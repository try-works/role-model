import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Run 115 S134 (R27): every host resource registration closes a scope.
 *
 * After five slices the release path is uniform: releaseHostResources -> registration ->
 * Scope.close -> finalizer. This pins that uniformity, so a new resource cannot be released by a
 * bare close call while the others go through scopes.
 */
const cli = readFileSync(path.join(import.meta.dirname, "..", "src", "cli.ts"), "utf8");

const kinds = [...cli.matchAll(/hostScope\.register\("([a-zA-Z]+)"/g)].map((match) => match[1]);

describe("S134 every registration closes a scope", () => {
  it("registers the four hostScope resources; the server is DAG-owned", () => {
    expect(kinds.sort()).toEqual([
      "backend",
      "extensionRuntime",
      "extensionRuntimeOwner",
      "packagedRuntime",
    ]);
    expect(cli).not.toContain('hostScope.register("server"');
    expect(cli).toContain("server: async () => {");
  });

  it("every registration body closes a scope and none calls a resource close directly", () => {
    for (const kind of kinds) {
      const start = cli.indexOf(`hostScope.register("${kind}"`);
      const body = cli.slice(start, start + 300);
      if (kind === "packagedRuntime") {
        expect(body, kind).toContain("closePackagedRuntimeOnce()");
      } else {
        expect(body, kind).toContain("Scope.close(");
      }
      expect(body, kind).not.toMatch(/await (server|backend|packagedRuntime|extensionRuntime)\.(close|shutdown)\(\)/);
    }
  });
});
