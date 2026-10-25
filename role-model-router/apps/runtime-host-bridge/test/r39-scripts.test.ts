import { spawnSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "../../../..");
const script = (name: string, args: string[]) => spawnSync(process.execPath, [path.join(root, "scripts", "runtime", name), ...args], { encoding: "utf8" });

describe("S103a R39 scripts fail closed", () => {
  it("verify-client-journeys exits 2 and prints NOT RUN when inputs are missing", () => {
    const result = script("verify-client-journeys.mjs", []);
    expect(result.status).toBe(2);
    expect(result.stdout).toMatch(/NOT RUN:/);
  });
  it("verify-client-journeys refuses operator ports", () => {
    const result = script("verify-client-journeys.mjs", ["--executable", process.execPath, "--repo-root", root, "--static-root", root, "--port", "3456", "--state-root", path.join("E:/rm-tmp/s103a-test-state")]);
    expect(result.status).toBe(2);
    expect(result.stdout).toContain("operator port");
  });
  it("compare-release exits 2 and prints NOT RUN when inputs are missing", () => {
    const result = script("compare-release.mjs", []);
    expect(result.status).toBe(2);
    expect(result.stdout).toMatch(/NOT RUN:/);
  });
  it("compare-release refuses operator ports", () => {
    const result = script("compare-release.mjs", ["--left", "http://127.0.0.1:3456"]);
    expect(result.status).toBe(2);
    expect(result.stdout).toContain("operator port");
  });
});
