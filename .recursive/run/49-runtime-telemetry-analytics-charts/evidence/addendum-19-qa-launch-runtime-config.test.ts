import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

const repoRoot = path.resolve(import.meta.dirname, "../../../..");
const launcherSource = readFileSync(
  path.join(
    repoRoot,
    ".recursive",
    "run",
    "49-runtime-telemetry-analytics-charts",
    "evidence",
    "phase5-qa-launch.ts",
  ),
  "utf8",
);

describe("Phase 5 QA launcher runtime config editing", () => {
  test("seeds and passes an editable unified runtime config path", () => {
    expect(launcherSource).toContain("createQaRuntimeBridgeBackendOptions");
    expect(launcherSource).toContain("createQaRuntimeConfigPath");
    expect(launcherSource).toContain("createQaRuntimeConfigText");
    expect(launcherSource).toContain("unifiedRuntimeConfigPath");
    expect(launcherSource).toContain("writeFile(unifiedRuntimeConfigPath");
  });
});
