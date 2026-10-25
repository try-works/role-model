import { spawnSync } from "node:child_process";
import { createServer as createNetServer } from "node:net";

import { afterEach, describe, expect, test } from "vitest";

import { ProcessSupervisor } from "../src/index.js";

const supervisors: ProcessSupervisor[] = [];
const windowsOnly = process.platform === "win32" ? test : test.skip;
const posixOnly = process.platform === "win32" ? test.skip : test;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

afterEach(async () => {
  while (supervisors.length > 0) {
    await supervisors.pop()?.shutdown();
  }
});

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
  'const http=require("node:http");const port=Number(process.env.PORT);const server=http.createServer((req,res)=>{res.statusCode=req.url==="/healthz"?200:404;res.end("ok");});server.listen(port,"127.0.0.1");const shutdown=()=>server.close(()=>process.exit(0));process.on("SIGTERM",()=>setTimeout(shutdown,10));';

async function startHealthy(
  supervisor: ProcessSupervisor,
  vendorId: string,
  shutdownTimeoutMs: number,
): Promise<number> {
  const port = await allocatePort();
  await supervisor.startVendor({
    command: process.execPath,
    args: ["-e", healthyChildScript],
    env: { PORT: String(port) },
    healthCheckUrl: `http://127.0.0.1:${port}/healthz`,
    required: true,
    shutdownTimeoutMs,
    startupTimeoutMs: 5000,
    vendorId,
  });
  return port;
}

describe("S5c supervisor repairs", () => {
  posixOnly(
    "a prompt SIGTERM exit is never SIGKILLed across repeated short-bound stops",
    async () => {
      const supervisor = new ProcessSupervisor();
      supervisors.push(supervisor);
      for (let run = 0; run < 5; run += 1) {
        const vendorId = `s5c-prompt-${run}`;
        await startHealthy(supervisor, vendorId, 1);
        await supervisor.stopVendor(vendorId);
        const trace = supervisor.getStopTrace(vendorId);
        expect(trace?.escapedGraceful, `run ${run} escalated a prompt exit`).toBe(false);
        expect(trace?.forceSignal, `run ${run} sent a force signal`).toBeNull();
      }
    },
  );

  windowsOnly("a failed taskkill rejects within the stop bound instead of hanging", async () => {
    const supervisor = new ProcessSupervisor({
      terminationRunner: () => {
        // Simulate access-denied/failed taskkill: no process is signalled.
      },
    });
    supervisors.push(supervisor);
    const vendorId = "s5c-taskkill-failure";
    await startHealthy(supervisor, vendorId, 100);
    const pid = supervisor.getVendorStatus(vendorId)?.pid;
    expect(pid).toBeGreaterThan(0);

    const startedAt = Date.now();
    const outcome = await Promise.race([
      supervisor.stopVendor(vendorId).then(
        () => ({ kind: "resolved" as const }),
        (error: unknown) => ({ kind: "rejected" as const, error }),
      ),
      sleep(1500).then(() => ({ kind: "hung" as const })),
    ]);
    const elapsedMs = Date.now() - startedAt;

    try {
      expect(outcome.kind).toBe("rejected");
      if (outcome.kind === "rejected") {
        const error = outcome.error as { code?: string; message?: string };
        expect(error.code).toBe("PROCESS_STOP_TIMEOUT");
        expect(error.message).toMatch(/stop timed out/i);
      }
      expect(elapsedMs).toBeLessThan(100 + 1000);
    } finally {
      if (pid !== undefined) {
        spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], {
          stdio: "ignore",
          windowsHide: true,
        });
        await sleep(150);
        await supervisor.stopVendor(vendorId).catch(() => undefined);
      }
    }
  });
});
