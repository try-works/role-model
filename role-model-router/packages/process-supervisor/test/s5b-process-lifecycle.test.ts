import { rm } from "node:fs/promises";
import { createServer as createNetServer } from "node:net";

import { afterEach, describe, expect, test } from "vitest";

import { ProcessSupervisor } from "../src/index.js";

const supervisors: ProcessSupervisor[] = [];
const windowsOnly = process.platform === "win32" ? test : test.skip;
const posixOnly = process.platform === "win32" ? test.skip : test;

afterEach(async () => {
  while (supervisors.length > 0) await supervisors.pop()?.shutdown();
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function allocatePort(): Promise<number> {
  return await new Promise((resolve, reject) => {
    const server = createNetServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") return reject(new Error("no port"));
      server.close((error) => (error ? reject(error) : resolve(address.port)));
    });
  });
}

const healthyChildScript =
  'const http=require("node:http");const port=Number(process.env.PORT);const server=http.createServer((req,res)=>{res.statusCode=req.url==="/healthz"?200:404;res.end("ok");});server.listen(port,"127.0.0.1");const shutdown=()=>server.close(()=>process.exit(0));process.on("SIGTERM",shutdown);process.on("SIGINT",shutdown);';
const stubbornChildScript =
  'const http=require("node:http");const server=http.createServer((req,res)=>{res.statusCode=req.url==="/healthz"?200:404;res.end("ok");});server.listen(Number(process.env.PORT),"127.0.0.1");process.on("SIGTERM",()=>{});setInterval(()=>{},1000);';
const promptChildScript =
  'const http=require("node:http");const server=http.createServer((req,res)=>{res.statusCode=req.url==="/healthz"?200:404;res.end("ok");});server.listen(Number(process.env.PORT),"127.0.0.1");const shutdown=()=>server.close(()=>process.exit(0));process.on("SIGTERM",shutdown);';

describe("S5b process lifecycle damage paths", () => {
  test("repeated and concurrent stops settle once, signal once, and resolve after deletion", async () => {
    const port = await allocatePort();
    const supervisor = new ProcessSupervisor();
    supervisors.push(supervisor);
    await supervisor.startVendor({
      command: process.execPath,
      args: ["-e", healthyChildScript],
      env: { PORT: String(port) },
      healthCheckUrl: `http://127.0.0.1:${port}/healthz`,
      required: true,
      startupTimeoutMs: 5000,
      shutdownTimeoutMs: 1000,
      vendorId: "s5b-repeated-stop",
    });

    const [first, second] = await Promise.all([
      supervisor.stopVendor("s5b-repeated-stop"),
      supervisor.stopVendor("s5b-repeated-stop"),
    ]);
    await expect(supervisor.stopVendor("s5b-repeated-stop")).resolves.toBeUndefined();
    expect(first).toBeUndefined();
    expect(second).toBeUndefined();
    expect(supervisor.getVendorStatus("s5b-repeated-stop")).toBeUndefined();
    expect(supervisor.getStopTrace("s5b-repeated-stop")?.gracefulRequests).toBe(1);
  });

  test("a child that dies during startup surfaces the startup failure with stderr, not a readiness timeout", async () => {
    const port = await allocatePort();
    const supervisor = new ProcessSupervisor();
    supervisors.push(supervisor);
    const startedAt = Date.now();
    const failure = await supervisor
      .startVendor({
        command: process.execPath,
        args: ["-e", 'console.error("startup stderr marker");setTimeout(()=>process.exit(3),100);'],
        env: {},
        healthCheckUrl: `http://127.0.0.1:${port}/healthz`,
        required: false,
        startupTimeoutMs: 2000,
        vendorId: "s5b-partial-startup",
      })
      .catch((error: unknown) => error);
    const elapsedMs = Date.now() - startedAt;

    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).message).toMatch(/exited during startup.*code 3/i);
    expect((failure as Error).message).toMatch(/startup stderr marker/);
    expect((failure as Error).message).not.toMatch(
      /did not become healthy before startup timed out/i,
    );
    expect(elapsedMs).toBeLessThan(1500);
  });

  windowsOnly("Windows records the force-only stop limitation for a console child", async () => {
    const port = await allocatePort();
    const supervisor = new ProcessSupervisor();
    supervisors.push(supervisor);
    await supervisor.startVendor({
      command: process.execPath,
      args: ["-e", healthyChildScript],
      env: { PORT: String(port) },
      healthCheckUrl: `http://127.0.0.1:${port}/healthz`,
      required: true,
      startupTimeoutMs: 5000,
      shutdownTimeoutMs: 500,
      vendorId: "s5b-windows-force-only",
    });
    await supervisor.stopVendor("s5b-windows-force-only");
    const trace = supervisor.getStopTrace("s5b-windows-force-only");
    expect(trace?.mode).toBe("force-only");
    expect(trace?.forceSignal).toBe("taskkill /T /F");
    expect(trace?.gracefulRequests).toBe(1);
    expect(trace?.escapedGraceful).toBe(false);
  });

  posixOnly(
    "a child that ignores graceful stop is escalated after the bound with SIGKILL",
    async () => {
      const shutdownTimeoutMs = 150;
      const port = await allocatePort();
      const supervisor = new ProcessSupervisor();
      supervisors.push(supervisor);
      await supervisor.startVendor({
        command: process.execPath,
        args: ["-e", stubbornChildScript],
        env: { PORT: String(port) },
        healthCheckUrl: `http://127.0.0.1:${port}/healthz`,
        required: true,
        shutdownTimeoutMs,
        startupTimeoutMs: 5000,
        vendorId: "s5b-stubborn",
      });
      const startedAt = Date.now();
      await supervisor.stopVendor("s5b-stubborn");
      const elapsedMs = Date.now() - startedAt;
      const trace = supervisor.getStopTrace("s5b-stubborn");
      expect(trace?.escapedGraceful).toBe(true);
      expect(trace?.forceSignal).toBe("SIGKILL");
      // 25 ms timer settle slack in the implementation; the bound itself is >= 150 ms.
      expect(trace?.escalatedAfterMs).toBeGreaterThanOrEqual(shutdownTimeoutMs);
      expect(elapsedMs).toBeGreaterThanOrEqual(shutdownTimeoutMs);
    },
  );

  posixOnly("a child that exits on graceful stop is never escalated", async () => {
    const port = await allocatePort();
    const supervisor = new ProcessSupervisor();
    supervisors.push(supervisor);
    await supervisor.startVendor({
      command: process.execPath,
      args: ["-e", promptChildScript],
      env: { PORT: String(port) },
      healthCheckUrl: `http://127.0.0.1:${port}/healthz`,
      required: true,
      shutdownTimeoutMs: 1000,
      startupTimeoutMs: 5000,
      vendorId: "s5b-prompt",
    });
    const startedAt = Date.now();
    await supervisor.stopVendor("s5b-prompt");
    const elapsedMs = Date.now() - startedAt;
    const trace = supervisor.getStopTrace("s5b-prompt");
    expect(elapsedMs).toBeLessThan(1000);
    expect(trace?.escapedGraceful).toBe(false);
    expect(trace?.forceSignal).toBeNull();
    expect(trace?.gracefulSignal).toBe("SIGTERM");
  });
});
