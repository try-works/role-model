import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * S617 reconciliation CLI guards (process level).
 *
 * These spawn the real generator, so the exit codes and the no-write property are proven end-to-end rather
 * than only inside planReconcile. Each test runs in an isolated evidence directory via
 * S617_RECONCILE_EVIDENCE / S617_RECONCILE_MAPPING so committed evidence is never touched.
 *
 * Contract: unchanged -> exit 0, no write. Changed -> exit 2, no write. Missing -> non-zero, no write,
 * "run with --refresh to bootstrap". --refresh -> writes; the next run is then unchanged (exit 0).
 */

const appDir = process.cwd();
const generator = join(appDir, "test", "tools", "handler-presence-reconcile.ts");
const humanSource = resolve(appDir, "../../../", ".recursive", "run", "115-effect-foldkit-runtime-migration", "evidence", "logs", "ui-dead-controls-inventory.md");

const sha256 = (path: string): string => createHash("sha256").update(readFileSync(path)).digest("hex");

// Async spawn: spawnSync blocks the worker event loop for each 8-35s generator run and trips vitest's
// worker onTaskUpdate RPC timeout even when every assertion passes. Awaiting the child keeps heartbeats
// flowing, so a green suite exits 0.
const run = (env: Record<string, string>, args: ReadonlyArray<string> = []) =>
  new Promise<{ status: number | null; stderr: string; stdout: string }>((resolve) => {
    const child = spawn(process.execPath, ["--import", "tsx", generator, ...args], {
      cwd: appDir,
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString("utf8"); });
    child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString("utf8"); });
    child.on("close", (status) => resolve({ status, stderr, stdout }));
  });

const fixture = () => {
  const dir = mkdtempSync(join(tmpdir(), "s617-cli-"));
  copyFileSync(humanSource, join(dir, "ui-dead-controls-inventory.md"));
  const mappingPath = join(dir, "s617-handler-presence-mapping.json");
  return { dir, env: { S617_RECONCILE_EVIDENCE: dir, S617_RECONCILE_MAPPING: mappingPath }, mappingPath };
};

describe("S617 reconciliation CLI guard", () => {
  it("missing mapping fails closed: non-zero, no files written", { timeout: 240_000 }, async () => {
    const { dir, env, mappingPath } = fixture();
    const humanBefore = sha256(join(dir, "ui-dead-controls-inventory.md"));
    const result = await run(env);
    // Fail closed with a distinct exit code: 3 = missing mapping (2 is changed, 1 is invalid).
    expect(result.status).toBe(3);
    expect(result.stderr).toContain("missing");
    expect(result.stderr).toContain("--refresh");
    expect(existsSync(mappingPath)).toBe(false);
    expect(sha256(join(dir, "ui-dead-controls-inventory.md"))).toBe(humanBefore);
    rmSync(dir, { force: true, recursive: true });
  });

  it("--refresh bootstraps, and the next run is unchanged with no write", { timeout: 240_000 }, async () => {
    const { dir, env, mappingPath } = fixture();
    const first = await run(env, ["--refresh"]);
    expect(first.status).toBe(0);
    expect(existsSync(mappingPath)).toBe(true);
    const shaAfterRefresh = sha256(mappingPath);
    const second = await run(env);
    expect(second.status).toBe(0);
    expect(second.stdout).toContain("no files written");
    expect(sha256(mappingPath)).toBe(shaAfterRefresh);
    rmSync(dir, { force: true, recursive: true });
  });

  it("invalid mapping fails with exit 1, names the violation and writes nothing", { timeout: 240_000 }, async () => {
    const { dir, env, mappingPath } = fixture();
    expect((await run(env, ["--refresh"])).status).toBe(0);
    const mapping = JSON.parse(readFileSync(mappingPath, "utf8"));
    const matched = mapping.items.find((entry: { bucket: string; walkerPath: string | null }) => entry.bucket === "wired_after_inventory");
    expect(matched).toBeDefined();
    matched.walkerPath = "div[1]>button[1]"; // convention violation: non-matched rows must carry a null walkerPath
    writeFileSync(mappingPath, JSON.stringify(mapping, null, 2) + "\n");
    const before = sha256(mappingPath);
    const humanBefore = sha256(join(dir, "ui-dead-controls-inventory.md"));
    const result = await run(env);
    expect(result.status).toBe(1); // invalid contract shape -> exactly 1 (changed is 2, missing is 3)
    expect(result.stderr).toContain("walkerPath");
    expect(result.stderr.toLowerCase()).toContain("nothing written");
    expect(sha256(mappingPath)).toBe(before);
    expect(sha256(join(dir, "ui-dead-controls-inventory.md"))).toBe(humanBefore);
    rmSync(dir, { force: true, recursive: true });
  });

  it("changed mapping fails with exit 2 and no write", { timeout: 240_000 }, async () => {
    const { dir, env, mappingPath } = fixture();
    expect((await run(env, ["--refresh"])).status).toBe(0);
    const tampered = JSON.parse(readFileSync(mappingPath, "utf8"));
    tampered.items.splice(7, 1);
    writeFileSync(mappingPath, JSON.stringify(tampered, null, 2) + "\n");
    const before = sha256(mappingPath);
    const result = await run(env);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("nothing written");
    expect(sha256(mappingPath)).toBe(before);
    rmSync(dir, { force: true, recursive: true });
  });
});
