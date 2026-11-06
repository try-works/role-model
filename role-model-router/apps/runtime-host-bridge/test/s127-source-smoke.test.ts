import { spawn, spawnSync } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "../../../..");
const run = (args: string[]) =>
  spawnSync(
    process.execPath,
    [path.join(root, "scripts", "runtime", "smoke-host-source.mjs"), ...args],
    {
      encoding: "utf8",
      timeout: 120_000,
    },
  );

/**
 * Run 115 S127: the source smoke fails closed. It must never report a pass without a host.
 */
describe("S127 source-host smoke fail-closed", () => {
  it("exits 2 and prints NOT RUN without --repo-root", () => {
    const result = run([]);
    expect(result.status).toBe(2);
    expect(result.stdout).toMatch(/NOT RUN:/);
    expect(result.stdout).toContain("--repo-root is required");
  });

  it("refuses operator ports", () => {
    const result = run(["--repo-root", root, "--port", "3456"]);
    expect(result.status).toBe(2);
    expect(result.stdout).toContain("operator port");
  });

  it("refuses a missing fixture root instead of running without one", () => {
    const result = run([
      "--repo-root",
      root,
      "--fixture-root",
      path.join(root, "no-such-fixtures"),
    ]);
    expect(result.status).toBe(2);
    expect(result.stdout).toContain("fixture root does not exist");
  });

  it("refuses an occupied port instead of measuring another process", async () => {
    const blocker = net.createServer();
    const port = await new Promise<number>((resolve) => {
      blocker.listen(0, "127.0.0.1", () => {
        const address = blocker.address();
        resolve(typeof address === "object" && address !== null ? address.port : 0);
      });
    });
    try {
      const result = run(["--repo-root", root, "--port", String(port)]);
      expect(result.status).toBe(2);
      expect(result.stdout).toContain("already in use");
    } finally {
      await new Promise<void>((resolve) => blocker.close(() => resolve()));
    }
  }, 60_000);
});
