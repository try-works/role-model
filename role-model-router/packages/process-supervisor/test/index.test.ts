import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { createServer as createNetServer } from "node:net";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import { ProcessSupervisor } from "../src/index.js";

async function allocatePort(): Promise<number> {
  return await new Promise<number>((resolve, reject) => {
    const server = createNetServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Failed to allocate a local port."));
        return;
      }
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(address.port);
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
  await Promise.all(
    tempRoots.splice(0).map(async (tempRoot) => {
      await rm(tempRoot, { recursive: true, force: true });
    }),
  );
});

async function waitFor(predicate: () => boolean, timeoutMs = 5000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error("Timed out waiting for expected process-supervisor state.");
}

async function waitForHttpOk(url: string, timeoutMs = 5000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Retry until the server becomes reachable.
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`Timed out waiting for ${url} to become healthy.`);
}

async function waitForHttpDown(url: string, timeoutMs = 1000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        return;
      }
    } catch {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`Timed out waiting for ${url} to stop responding.`);
}

const windowsOnly = process.platform === "win32" ? test : test.skip;

describe("process-supervisor", () => {
  test("starts a vendor process, waits for health, and reports it as healthy", async () => {
    const port = await allocatePort();
    const supervisor = new ProcessSupervisor();
    supervisors.push(supervisor);

    const managed = await supervisor.startVendor({
      vendorId: "mock-health",
      command: process.execPath,
      args: [
        "-e",
        `const http=require("node:http");const port=Number(process.env.PORT);const server=http.createServer((req,res)=>{res.statusCode=req.url==="/healthz"?200:404;res.end(req.url==="/healthz"?"ok":"missing");});server.listen(port,"127.0.0.1");const shutdown=()=>server.close(()=>process.exit(0));process.on("SIGTERM",shutdown);process.on("SIGINT",shutdown);`,
      ],
      env: {
        PORT: String(port),
      },
      healthCheckUrl: `http://127.0.0.1:${port}/healthz`,
      startupTimeoutMs: 5000,
      required: true,
    });

    expect(supervisor.isVendorRunning("mock-health")).toBe(true);
    expect(managed.healthStatus).toBe("healthy");
    expect(supervisor.getVendorStatus("mock-health")?.port).toBe(port);
  });

  test("tracks crash callbacks when a managed vendor exits unexpectedly", async () => {
    const port = await allocatePort();
    const supervisor = new ProcessSupervisor();
    supervisors.push(supervisor);
    const crashes: Array<{ vendorId: string; exitCode: number | null }> = [];
    supervisor.onVendorCrash((vendorId, exitCode) => {
      crashes.push({ vendorId, exitCode });
    });

    await expect(
      supervisor.startVendor({
        vendorId: "crashy",
        command: process.execPath,
        args: ["-e", "setTimeout(() => process.exit(7), 50)"],
        env: {},
        healthCheckUrl: `http://127.0.0.1:${port}/healthz`,
        startupTimeoutMs: 250,
        required: false,
      }),
    ).rejects.toThrow(/crashy/i);

    expect(crashes).toEqual(
      expect.arrayContaining([
        {
          vendorId: "crashy",
          exitCode: 7,
        },
      ]),
    );
  });

  test("captures child logs and restarts an unexpectedly crashed vendor with backoff", async () => {
    const port = await allocatePort();
    const supervisor = new ProcessSupervisor();
    supervisors.push(supervisor);
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-supervisor-"));
    tempRoots.push(tempRoot);
    const markerPath = path.join(tempRoot, "restart-once.txt");

    await supervisor.startVendor({
      vendorId: "restartable",
      command: process.execPath,
      args: [
        "-e",
        `const fs=require("node:fs");const http=require("node:http");const marker=process.env.RESTART_MARKER;const shouldCrash=!fs.existsSync(marker);if(shouldCrash){fs.writeFileSync(marker,"first");}const server=http.createServer((req,res)=>{if(req.url==="/healthz"){res.statusCode=200;res.end("ok");return;}res.statusCode=404;res.end("missing");});server.listen(Number(process.env.PORT),"127.0.0.1",()=>{console.log("vendor-ready");console.error("vendor-stderr");if(shouldCrash){setTimeout(()=>process.exit(23),100);}});const shutdown=()=>server.close(()=>process.exit(0));process.on("SIGTERM",shutdown);process.on("SIGINT",shutdown);`,
      ],
      env: {
        PORT: String(port),
        RESTART_MARKER: markerPath,
      },
      healthCheckUrl: `http://127.0.0.1:${port}/healthz`,
      startupTimeoutMs: 5000,
      required: true,
    });

    await waitFor(() => supervisor.getVendorStatus("restartable")?.restartCount === 1);
    await waitFor(() => supervisor.getVendorStatus("restartable")?.healthStatus === "healthy");

    expect(supervisor.getVendorStatus("restartable")).toEqual(
      expect.objectContaining({
        vendorId: "restartable",
        restartCount: 1,
        healthStatus: "healthy",
        logs: expect.arrayContaining([
          expect.stringContaining("vendor-ready"),
          expect.stringContaining("vendor-stderr"),
        ]),
      }),
    );
  });

  test("forces bounded shutdown when a vendor ignores the initial termination signal", async () => {
    const port = await allocatePort();
    const supervisor = new ProcessSupervisor();
    supervisors.push(supervisor);

    await supervisor.startVendor({
      vendorId: "stubborn",
      command: process.execPath,
      args: [
        "-e",
        `const http=require("node:http");const server=http.createServer((req,res)=>{if(req.url==="/healthz"){res.statusCode=200;res.end("ok");return;}res.statusCode=404;res.end("missing");});server.listen(Number(process.env.PORT),"127.0.0.1");process.on("SIGTERM",()=>{});process.on("SIGINT",()=>{});setInterval(()=>{},1000);`,
      ],
      env: {
        PORT: String(port),
      },
      healthCheckUrl: `http://127.0.0.1:${port}/healthz`,
      startupTimeoutMs: 5000,
      shutdownTimeoutMs: 100,
      required: true,
    });

    await supervisor.stopVendor("stubborn");

    expect(supervisor.isVendorRunning("stubborn")).toBe(false);
    expect(supervisor.getVendorStatus("stubborn")).toBeUndefined();
  });

  windowsOnly(
    "stops spawned child processes when a managed vendor shuts down on Windows",
    async () => {
      const port = await allocatePort();
      const childPort = await allocatePort();
      const supervisor = new ProcessSupervisor();
      supervisors.push(supervisor);
      const tempRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-supervisor-tree-"));
      tempRoots.push(tempRoot);
      const childPidPath = path.join(tempRoot, "child.pid");
      const childHealthUrl = `http://127.0.0.1:${childPort}/healthz`;

      const childScript =
        'const http=require("node:http");const server=http.createServer((req,res)=>{if(req.url==="/healthz"){res.statusCode=200;res.end("ok");return;}res.statusCode=404;res.end("missing");});server.listen(Number(process.env.PORT),"127.0.0.1");const shutdown=()=>server.close(()=>process.exit(0));process.on("SIGTERM",shutdown);process.on("SIGINT",shutdown);setInterval(()=>{},1000);';
      const parentScript = `const { spawn } = require("node:child_process");const { writeFileSync } = require("node:fs");const http=require("node:http");const child=spawn(process.execPath,["-e",${JSON.stringify(childScript)}],{env:{...process.env,PORT:process.env.CHILD_PORT},stdio:"ignore",detached:true});child.unref();writeFileSync(process.env.CHILD_PID_FILE,String(child.pid ?? ""));const server=http.createServer((req,res)=>{if(req.url==="/healthz"){res.statusCode=200;res.end("ok");return;}res.statusCode=404;res.end("missing");});server.listen(Number(process.env.PORT),"127.0.0.1");const shutdown=()=>server.close(()=>process.exit(0));process.on("SIGTERM",shutdown);process.on("SIGINT",shutdown);setInterval(()=>{},1000);`;

      try {
        await supervisor.startVendor({
          vendorId: "tree-parent",
          command: process.execPath,
          args: ["-e", parentScript],
          env: {
            PORT: String(port),
            CHILD_PORT: String(childPort),
            CHILD_PID_FILE: childPidPath,
          },
          healthCheckUrl: `http://127.0.0.1:${port}/healthz`,
          startupTimeoutMs: 5000,
          shutdownTimeoutMs: 250,
          required: true,
        });

        await waitForHttpOk(childHealthUrl);

        await supervisor.stopVendor("tree-parent");

        await waitForHttpDown(childHealthUrl);
      } finally {
        const childPid = Number.parseInt(
          (await readFile(childPidPath, "utf8").catch(() => "")).trim(),
          10,
        );
        if (Number.isFinite(childPid) && childPid > 0) {
          spawnSync("taskkill", ["/PID", String(childPid), "/T", "/F"], {
            stdio: "ignore",
            windowsHide: true,
          });
        }
      }
    },
  );
});
