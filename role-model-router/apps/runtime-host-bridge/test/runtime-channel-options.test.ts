import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test } from "vitest";

import { resolveBridgeServerOptions, resolveStoredOauthTokenLocations } from "../src/index.js";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("packaged runtime channel options", () => {
  test("resolves an extracted Unix-style package from its adjacent manifest", async () => {
    const packageRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-installed-package-"));
    roots.push(packageRoot);
    const executablePath = path.join(packageRoot, "role-model-stage");
    await writeFile(executablePath, "", "utf8");
    await mkdir(path.join(packageRoot, "build", "client"), { recursive: true });
    await writeFile(path.join(packageRoot, "build", "client", "index.html"), "role-model", "utf8");
    await writeFile(
      path.join(packageRoot, "manifest.json"),
      JSON.stringify({
        channel: "stage",
        name: "role-model-stage",
        host: "127.0.0.1",
        port: 3457,
        state_root_name: "role-model-runtime-stage",
        scope_id: "standalone-runtime-stage",
      }),
      "utf8",
    );

    const options = resolveBridgeServerOptions({
      executablePath,
      localAppData: path.join(packageRoot, "state-base"),
    });
    expect(options.repoRoot).toBe(packageRoot);
    expect(options.staticRoot).toBe(path.join(packageRoot, "build", "client"));
    expect(options.port).toBe(3457);
    expect(options.scopeId).toBe("standalone-runtime-stage");
    expect(options.runtimeStateRoot).toBe(
      path.join(packageRoot, "state-base", "role-model-runtime-stage"),
    );
  });

  test("does not mirror stage or development OAuth locations into production scope names", () => {
    expect(
      resolveStoredOauthTokenLocations({
        runtimeStateRoot: "stage-root",
        scopeId: "standalone-runtime-stage",
      }),
    ).toEqual([{ runtimeStateRoot: "stage-root", scopeId: "standalone-runtime-stage" }]);
    expect(
      resolveStoredOauthTokenLocations({
        runtimeStateRoot: "dev-root",
        scopeId: "standalone-runtime-dev",
      }),
    ).toEqual([{ runtimeStateRoot: "dev-root", scopeId: "standalone-runtime-dev" }]);
  });
});
