import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

const run88LintPaths = Object.freeze([
  ".github/workflows/build-binaries.yml",
  ".github/workflows/ci.yml",
  "role-model-router/apps/runtime-host-bridge/src/cli.ts",
  "role-model-router/apps/runtime-host-bridge/src/kw-private-loader.ts",
  "role-model-router/apps/runtime-host-bridge/src/package-sea.ts",
  "role-model-router/apps/runtime-host-bridge/src/runtime-version.ts",
  "role-model-router/apps/runtime-host-bridge/src/track-b-runtime.ts",
  "role-model-router/apps/runtime-host-bridge/test/recursive-87-compatibility.test.ts",
  "role-model-router/apps/runtime-host-bridge/test/run88-public-runtime-probes.ts",
  "role-model-router/apps/runtime-host-bridge/test/run88-stage-release.integration.test.ts",
  "role-model-router/apps/runtime-host-bridge/test/run88-stage-release.regression.test.ts",
  "role-model-router/apps/runtime-host-bridge/test/run88-stage-release.unit.test.ts",
  "scripts/run88-format-regression.test.mjs",
  "scripts/run88-public-semantic-probes.mjs",
  "scripts/run88-run-focused-tests.mjs",
  "scripts/run88-run-focused-tests.test.mjs",
  "scripts/run88-stage-release-regression.test.mjs",
  "scripts/run88-stage-release-workflow.integration.test.mjs",
  "scripts/run88-stage-release-workflow.regression.test.mjs",
  "scripts/run88-stage-release-workflow.test.mjs",
  "scripts/run88-stage-release.mjs",
  "scripts/run88-stage-release.test.mjs",
]);

test("Run 88 public release paths remain formatter- and linter-clean", () => {
  const [executable, args] =
    process.platform === "win32"
      ? [
          "cmd.exe",
          ["/d", "/s", "/c", "corepack", "pnpm", "exec", "biome", "check", ...run88LintPaths],
        ]
      : ["corepack", ["pnpm", "exec", "biome", "check", ...run88LintPaths]];
  const result = spawnSync(executable, args, {
    cwd: new URL("..", import.meta.url),
    encoding: "utf8",
  });

  assert.equal(result.status, 0, [result.stdout, result.stderr].filter(Boolean).join("\n"));
});
