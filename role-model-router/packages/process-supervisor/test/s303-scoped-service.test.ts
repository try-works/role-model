import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer as createNetServer } from "node:net";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import { ProcessSupervisor, VendorScope, startScopedVendor } from "../src/index.js";

/**
 * S303 (R22): scoped process-service ownership. The scope must run every release even when an earlier release
 * rejects, and a scoped vendor must preserve its env/cwd/logs while remaining stoppable, including the Windows
 * grandchild tree.
 */

async function allocatePort(): Promise<number> {
  return await new Promise<number>((resolve, reject) => {
    const server = createNetServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address === null || !("port" in Object(address))) {
        reject(new Error("Failed to allocate a local port."));
        return;
      }
      server.close((error) => {
        if (error) reject(error);
        else resolve(address.port);
      });
    });
  });
}

const supervisors: ProcessSupervisor[] = [];
const tempRoots: string[] = [];

afterEach(async () => {
  while (supervisors.length > 0) {
    const supervisor = supervisors.pop();
    await supervisor?.shutdown();
  }
  await Promise.all(tempRoots.splice(0).map(async (tempRoot) => rm(tempRoot, { recursive: true, force: true })));
});

async function waitFor(predicate: () => boolean, timeoutMs = 10_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error("Timed out waiting for process-supervisor state.");
}

async function waitForHttpDown(url: string, timeoutMs = 10_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (!response.ok) return;
    } catch {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error("Timed out waiting for " + url + " to stop responding.");
}

const LOOPBACK_HOSTS = ["127.0.0.1", "::1", "localhost"];

/**
 * S305 micro-repair: validates the ACTUAL health URL a vendor reports/serves (never a literal rebuilt in the
 * test), returning an issue string when the host is not loopback or the port differs from the bound port.
 * Staged as the weak S305-RED version first (always null); the negative test fails against it.
 */
const reportedHealthIssue = (reportedUrl: string | undefined, boundPort: number): string | null => {
  if (reportedUrl === undefined || reportedUrl.length === 0) return "the vendor must report a health URL";
  let url: URL;
  try {
    url = new URL(reportedUrl);
  } catch {
    return "the reported health URL is not a URL: " + reportedUrl;
  }
  if (!LOOPBACK_HOSTS.includes(url.hostname)) return "non-loopback health host: " + url.hostname;
  const reportedPort = url.port.length > 0 ? Number(url.port) : url.protocol === "https:" ? 443 : 80;
  return reportedPort === boundPort ? null : "health port " + String(reportedPort) + " does not match the bound port " + String(boundPort);
};

const processIsAlive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

const windowsOnly = process.platform === "win32" ? test : test.skip;

describe("S303 scoped process service", () => {
  test("scope close runs every release in reverse order even when an earlier release rejects", async () => {
    const order: string[] = [];
    const scope = new VendorScope();
    scope.register(async () => {
      order.push("first");
    });
    scope.register(async () => {
      order.push("second");
      throw new Error("second release failed");
    });
    scope.register(async () => {
      order.push("third");
    });
    await expect(scope.close()).rejects.toBeInstanceOf(AggregateError);
    expect(order).toEqual(["third", "second", "first"]);
    expect(() => scope.register(async () => undefined)).toThrow(/closed/);
  });

  test("scoped vendor preserves env, cwd and logs, and close stops the child", async () => {
    const port = await allocatePort();
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "s303-scoped-"));
    tempRoots.push(tempRoot);
    const markerPath = path.join(tempRoot, "marker.txt");
    const script = [
      'const { appendFileSync } = require("node:fs");',
      'const { createServer } = require("node:http");',
      'appendFileSync(process.env.MARKER, "env=" + String(process.env.S303_MARK) + " token=" + String(process.env.S303_TOKEN) + " cwd=" + process.cwd() + "\\n");',
      'const server = createServer((request, response) => { response.writeHead(200, { "content-type": "text/plain" }); response.end("ok"); });',
      'server.listen(Number(process.env.PORT), "127.0.0.1", () => { const address = server.address(); appendFileSync(process.env.MARKER, "bind=" + String(address.address) + ":" + String(address.port) + "\\n"); });',
      'console.log("s303-scoped-log-line");',
      'setInterval(() => {}, 1000);',
    ].join("\n");
    const supervisor = new ProcessSupervisor();
    supervisors.push(supervisor);
    const scope = new VendorScope();
    const vendor = await startScopedVendor(supervisor, scope, {
      vendorId: "s303-scoped",
      command: process.execPath,
      args: ["-e", script],
      cwd: tempRoot,
      env: { MARKER: markerPath, PORT: String(port), S303_MARK: "scoped-mark", S303_TOKEN: "token-s303" },
      healthCheckUrl: "http://127.0.0.1:" + String(port) + "/healthz",
      required: true,
      shutdownTimeoutMs: 10_000,
      startupTimeoutMs: 15_000,
    });
    expect(vendor.healthStatus).toBe("healthy");
    const marker = await readFile(markerPath, "utf8");
    expect(marker).toContain("env=scoped-mark");
    expect(marker).toContain("token=token-s303");
    // Parse the address the child ACTUALLY bound (recorded by the child) and the port the supervisor
    // recorded — never a literal URL rebuilt in the test.
    await waitFor(() => (supervisor.getVendorStatus("s303-scoped")?.logs ?? []).length >= 0 && marker.includes("bind="));
    const bindLine = marker.split("\n").find((line) => line.startsWith("bind="));
    expect(bindLine).toBeDefined();
    const bind = String(bindLine).slice("bind=".length);
    expect(reportedHealthIssue("http://" + bind + "/healthz", vendor.port)).toBeNull();
    expect(vendor.port).toBe(port);
    expect(marker).toContain("cwd=" + tempRoot);
    await waitFor(() => (supervisor.getVendorStatus("s303-scoped")?.logs ?? []).some((line) => line.includes("s303-scoped-log-line")));
    await scope.close();
    await waitForHttpDown("http://127.0.0.1:" + String(port) + "/healthz");
  });

  test("starting into a closed scope rolls the vendor back and kills the child", async () => {
    const port = await allocatePort();
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "s303-rollback-"));
    tempRoots.push(tempRoot);
    const script = [
      'const { createServer } = require("node:http");',
      'createServer((request, response) => { response.writeHead(200); response.end("ok"); }).listen(Number(process.env.PORT), "127.0.0.1");',
      'setInterval(() => {}, 1000);',
    ].join("\n");
    const supervisor = new ProcessSupervisor();
    supervisors.push(supervisor);
    const scope = new VendorScope();
    await scope.close();
    let rejected = false;
    try {
      await startScopedVendor(supervisor, scope, {
        vendorId: "s303-closed-scope",
        command: process.execPath,
        args: ["-e", script],
        env: { PORT: String(port) },
        healthCheckUrl: "http://127.0.0.1:" + String(port) + "/healthz",
        required: true,
        shutdownTimeoutMs: 10_000,
        startupTimeoutMs: 15_000,
      });
    } catch {
      rejected = true;
    }
    expect(rejected).toBe(true);
    await waitForHttpDown("http://127.0.0.1:" + String(port) + "/healthz");
  });

  test("a rejecting stop during the rollback is surfaced, never swallowed", async () => {
    const calls: string[] = [];
    const supervisor = new ProcessSupervisor();
    // Injectable behaviour without a cast: only startVendor is exercised by startScopedVendor, and the
    // vendor stop deliberately rejects to prove the rollback failure is surfaced.
    supervisor.startVendor = async () => ({
      healthStatus: "healthy",
      logs: [],
      pid: 4242,
      port: undefined,
      restartCount: 0,
      startTime: new Date().toISOString(),
      stop: async () => {
        calls.push("stop");
        throw new Error("stop-rollback-boom");
      },
      vendorId: "s303-stop-failure",
    });
    const scope = new VendorScope();
    await scope.close();
    const caught: unknown = await startScopedVendor(supervisor, scope, {
      command: process.execPath,
      env: {},
      vendorId: "s303-stop-failure",
    }).catch((error) => error);
    expect(caught).toBeInstanceOf(AggregateError);
    expect(calls).toEqual(["stop"]);
    const aggregate = caught instanceof AggregateError ? caught : undefined;
    expect(aggregate?.errors.length).toBe(2);
    expect(String(aggregate?.message)).toMatch(/rollback/);
  });

  test("two concurrent closes join one teardown instead of returning early", async () => {
    const calls: string[] = [];
    const scope = new VendorScope();
    scope.register(async () => {
      await new Promise((resolve) => setTimeout(resolve, 120));
      calls.push("slow-release");
    });
    scope.register(async () => {
      calls.push("fast-release");
    });
    const first = scope.close();
    const startedAt = Date.now();
    const second = scope.close();
    await second;
    expect(Date.now() - startedAt).toBeGreaterThanOrEqual(100);
    await first;
    expect(calls).toEqual(["fast-release", "slow-release"]);
  });

  test("a vendor reporting a non-loopback health URL is rejected (negative harness test)", async () => {
    const port = await allocatePort();
    // A vendor double that reports 0.0.0.0 (and a LAN address) must be rejected by the same assertion helper.
    expect(reportedHealthIssue("http://0.0.0.0:" + String(port) + "/healthz", port)).toMatch(/non-loopback/);
    expect(reportedHealthIssue("http://192.168.1.10:" + String(port) + "/healthz", port)).toMatch(/non-loopback/);
    // A mismatched port is rejected even on a loopback host.
    expect(reportedHealthIssue("http://127.0.0.1:" + String(port + 1) + "/healthz", port)).toMatch(/port/);
    expect(reportedHealthIssue("http://127.0.0.1:" + String(port) + "/healthz", port)).toBeNull();
    expect(reportedHealthIssue(undefined, port)).toMatch(/report/);
  });

  windowsOnly("stopping a scoped vendor kills its grandchild tree", async () => {
    const port = await allocatePort();
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "s303-tree-"));
    tempRoots.push(tempRoot);
    const grandchildPidPath = path.join(tempRoot, "grandchild.pid");
    const grandchildScript = "setInterval(() => {}, 1000);";
    const parentScript = [
      'const { spawn } = require("node:child_process");',
      'const { writeFileSync } = require("node:fs");',
      'const { createServer } = require("node:http");',
      'const grandchild = spawn(process.execPath, ["-e", ' + JSON.stringify(grandchildScript) + '], { stdio: "ignore" });',
      'writeFileSync(process.env.GRANDCHILD_PID, String(grandchild.pid));',
      'createServer((request, response) => { response.writeHead(200); response.end("ok"); }).listen(Number(process.env.PORT), "127.0.0.1");',
    ].join("\n");
    const supervisor = new ProcessSupervisor();
    supervisors.push(supervisor);
    const scope = new VendorScope();
    const vendor = await startScopedVendor(supervisor, scope, {
      vendorId: "s303-tree",
      command: process.execPath,
      args: ["-e", parentScript],
      env: { GRANDCHILD_PID: grandchildPidPath, PORT: String(port) },
      healthCheckUrl: "http://127.0.0.1:" + String(port) + "/healthz",
      required: true,
      shutdownTimeoutMs: 10_000,
      startupTimeoutMs: 15_000,
    });
    await waitFor(() => existsSync(grandchildPidPath));
    const grandchildPid = Number((await readFile(grandchildPidPath, "utf8")).trim());
    expect(Number.isInteger(grandchildPid) && grandchildPid > 0).toBe(true);
    expect(processIsAlive(vendor.pid)).toBe(true);
    expect(processIsAlive(grandchildPid)).toBe(true);
    await scope.close();
    await waitFor(() => !processIsAlive(vendor.pid));
    await waitFor(() => !processIsAlive(grandchildPid));
  });
});
