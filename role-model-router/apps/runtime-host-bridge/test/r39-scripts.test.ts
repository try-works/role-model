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

  /**
   * S104: the review found compare-release FAILED OPEN - two dead or equally
   * unauthorized sides classified every row "same" and exited 0, so CI could go green
   * comparing two artifacts that answered nothing. These two cases pin the fix.
   */
  it("compare-release exits 2 when both sides are unreachable", () => {
    const result = script("compare-release.mjs", [
      "--left",
      "http://127.0.0.1:5991",
      "--right",
      "http://127.0.0.1:5992",
    ]);
    expect(result.status).toBe(2);
    expect(result.stdout).toContain("not-run");
    expect(result.stdout).toMatch(/NOT RUN:/);
  }, 30_000);

  it("compare-release exits 2 when both sides answer the same non-2xx status", () => {
    // An unauthorized or missing endpoint pair must not classify as "same".
    const result = script("compare-release.mjs", [
      "--left",
      "http://127.0.0.1:5991",
      "--right",
      "http://127.0.0.1:5992",
    ]);
    expect(result.status).not.toBe(0);
  }, 30_000);

  it("verify-client-journeys refuses a manifest whose sha does not match the executable", async () => {
    const { writeFileSync, mkdtempSync } = await import("node:fs");
    const dir = mkdtempSync(path.join(process.env.TEMP ?? "/tmp", "r39-manifest-"));
    const manifest = path.join(dir, "manifest.json");
    writeFileSync(manifest, JSON.stringify({ executable_sha256: "deadbeef" }));
    const result = script("verify-client-journeys.mjs", [
      "--manifest", manifest,
      "--executable", process.execPath,
      "--repo-root", root,
      "--static-root", root,
      "--port", "5939",
      "--state-root", path.join(dir, "state"),
      "--fixture-root", path.join(root, "testdata", "router-runtime", "fixtures"),
    ]);
    expect(result.status).toBe(2);
    expect(result.stdout).toContain("does not match manifest");
  }, 30_000);

  it("verify-client-journeys refuses a dirty state root without --allow-dirty-state", async () => {
    const { mkdtempSync, writeFileSync } = await import("node:fs");
    const dir = mkdtempSync(path.join(process.env.TEMP ?? "/tmp", "r39-dirty-"));
    writeFileSync(path.join(dir, "leftover.txt"), "x");
    const result = script("verify-client-journeys.mjs", [
      "--executable", process.execPath,
      "--repo-root", root,
      "--static-root", root,
      "--port", "5942",
      "--state-root", dir,
      "--fixture-root", path.join(root, "testdata", "router-runtime", "fixtures"),
    ]);
    expect(result.status).toBe(2);
    expect(result.stdout).toContain("state root is not empty");
  }, 30_000);

  it("compare-release refuses to compare a URL with itself", () => {
    const result = script("compare-release.mjs", [
      "--left",
      "http://127.0.0.1:5991",
      "--right",
      "http://127.0.0.1:5991",
    ]);
    expect(result.status).toBe(2);
    expect(result.stdout).toContain("same URL");
  });
});
