import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
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

const run = (env: Record<string, string>, args: ReadonlyArray<string> = []) => {
  const result = spawnSync(process.execPath, ["--import", "tsx", generator, ...args], {
    cwd: appDir,
    encoding: "utf8",
    env: { ...process.env, ...env },
    timeout: 180_000,
  });
  return { status: result.status, stderr: result.stderr ?? "", stdout: result.stdout ?? "" };
};

const fixture = () => {
  const dir = mkdtempSync(join(tmpdir(), "s617-cli-"));
  copyFileSync(humanSource, join(dir, "ui-dead-controls-inventory.md"));
  const mappingPath = join(dir, "s617-handler-presence-mapping.json");
  return { dir, env: { S617_RECONCILE_EVIDENCE: dir, S617_RECONCILE_MAPPING: mappingPath }, mappingPath };
};

describe("S617 reconciliation CLI guard", () => {
  it("missing mapping fails closed: non-zero, no files written", { timeout: 240_000 }, () => {
    const { dir, env, mappingPath } = fixture();
    const humanBefore = sha256(join(dir, "ui-dead-controls-inventory.md"));
    const result = run(env);
    // Fail closed with a distinct exit code: 3 = missing mapping (2 is changed, 1 is invalid).
    expect(result.status).toBe(3);
    expect(result.stderr).toContain("missing");
    expect(result.stderr).toContain("--refresh");
    expect(existsSync(mappingPath)).toBe(false);
    expect(sha256(join(dir, "ui-dead-controls-inventory.md"))).toBe(humanBefore);
    rmSync(dir, { force: true, recursive: true });
  });

  it("--refresh bootstraps, and the next run is unchanged with no write", { timeout: 240_000 }, () => {
    const { dir, env, mappingPath } = fixture();
    const first = run(env, ["--refresh"]);
    expect(first.status).toBe(0);
    expect(existsSync(mappingPath)).toBe(true);
    const shaAfterRefresh = sha256(mappingPath);
    const second = run(env);
    expect(second.status).toBe(0);
    expect(second.stdout).toContain("no files written");
    expect(sha256(mappingPath)).toBe(shaAfterRefresh);
    rmSync(dir, { force: true, recursive: true });
  });

  it("changed mapping fails with exit 2 and no write", { timeout: 240_000 }, () => {
    const { dir, env, mappingPath } = fixture();
    expect(run(env, ["--refresh"]).status).toBe(0);
    const tampered = JSON.parse(readFileSync(mappingPath, "utf8"));
    tampered.items.splice(7, 1);
    writeFileSync(mappingPath, JSON.stringify(tampered, null, 2) + "\n");
    const before = sha256(mappingPath);
    const result = run(env);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("nothing written");
    expect(sha256(mappingPath)).toBe(before);
    rmSync(dir, { force: true, recursive: true });
  });
});
