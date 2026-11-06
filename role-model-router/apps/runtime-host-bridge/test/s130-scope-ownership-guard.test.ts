import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Run 115 S130 (R27): the scope-owned slices must not silently revert to imperative ownership.
 *
 * S128 moved the server onto an Effect scope and S129 moved the non-packaged backend. Nothing in
 * the suite would notice if a later edit went back to `server.close()` behind a plain register call,
 * so this pins the ownership mechanism in the source itself.
 */
const cli = readFileSync(path.join(import.meta.dirname, "..", "src", "cli.ts"), "utf8");

const registrationBody = (kind: string): string => {
  const start = cli.indexOf(`hostScope.register("${kind}"`);
  expect(start, `${kind} registration missing`).toBeGreaterThan(-1);
  return cli.slice(start, start + 400);
};

describe("S130 scope-owned resources stay scope-owned", () => {
  it("the server is owned by the DAG server node, not a hostScope registration", () => {
    expect(cli).not.toContain('hostScope.register("server"');
    expect(cli).toContain("acquire: {");
    expect(cli).toContain("server: async () => {");
    expect(cli).toContain("return { handle: value, release: () => value.close() };");
  });

  it("the backend registration closes its scope instead of calling backend.shutdown directly", () => {
    const body = registrationBody("backend");
    expect(body).toContain("Scope.close(backendScope");
    expect(body).not.toContain("backend.shutdown()");
  });

  it("the extension runtime owner registration closes its scope too", () => {
    const body = registrationBody("extensionRuntimeOwner");
    expect(body).toContain("Scope.close(extensionOwnerScope");
    expect(body).not.toContain("extensionRuntimeOwner.close(); }");
  });

  it("the extension runtime registration closes the owner scope instead of calling close directly", () => {
    const body = registrationBody("extensionRuntime");
    expect(body).toContain("Scope.close(extensionOwnerScope");
    expect(body).not.toContain("await extensionRuntimeOwner.close()");
  });

  it("both resources are acquired through acquireRelease, not bare awaits", () => {
    const acquireReleaseCount = (cli.match(/Effect\.acquireRelease\(/g) ?? []).length;
    expect(acquireReleaseCount).toBeGreaterThanOrEqual(2);
    // Each acquisition must be provided to a scope; a bare `await createBackend()` is the shape
    // this guard exists to prevent.
    expect(cli).not.toMatch(/backend = await createBackend\(\)/);
    expect(cli).toContain("startedServer = acquiredServer as BridgeServer;");
  });
});
