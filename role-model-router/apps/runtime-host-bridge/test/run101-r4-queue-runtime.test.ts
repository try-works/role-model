import { execFileSync } from "node:child_process";
/**
 * Run 101 / R4 - the host's replay queue runtime.
 *
 * This is the composition the runtime start path calls: it resolves the plane's
 * mode from the operator's policy document and hands the host either nothing
 * (`legacy`), an offer (`shadow`), or an offer plus a worker (`queue`).
 *
 * The safety property under test: an unreadable or invalid policy document must
 * leave the plane on `legacy` rather than silently making the queue
 * authoritative.
 */
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { startReplayQueueRuntime } from "../src/queue-runtime/index.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

function ensureWrapperBuilt(packageDirName: string): void {
  const packageDir = path.join(repoRoot, "role-model-router", "packages", packageDirName);
  if (existsSync(path.join(packageDir, "dist", "index.js"))) return;
  execFileSync(process.execPath, ["build.mjs"], { cwd: packageDir, stdio: "pipe" });
}

ensureWrapperBuilt("effect");
ensureWrapperBuilt("effect-mq");
ensureWrapperBuilt("sql-sqlite-node");

function policyDocument(mode: string, killSwitch = false) {
  return {
    schemaVersion: "role-model.queue-policy.v1",
    policyVersion: 1,
    global: { killSwitch },
    queues: {
      "replay.dispatch": {
        mode,
        concurrency: 1,
        attempts: 3,
        backoffBaseMs: 100,
        backoffCapMs: 1_000,
        lockRefreshMs: 1_000,
        lockExpirationMs: 5_000,
        retentionDays: 30,
      },
    },
    updatedAt: null,
    receipts: [],
  };
}

let stateRoot = "";
beforeEach(async () => {
  stateRoot = await mkdtemp(path.join(os.tmpdir(), "run101-sp4-runtime-"));
});
afterEach(async () => {
  await rm(stateRoot, { recursive: true, force: true });
});

async function publishPolicy(document: unknown) {
  await mkdir(path.join(stateRoot, "queues"), { recursive: true });
  await writeFile(
    path.join(stateRoot, "queues", "queue-policy.json"),
    JSON.stringify(document),
    "utf8",
  );
}

describe("@recursive:101-effect-mq-queue-rebuild @sp4 R4 replay queue runtime", () => {
  it("stays legacy when no policy document exists", () => {
    const runtime = startReplayQueueRuntime({ stateRoot });
    expect(runtime.mode).toBe("legacy");
    expect(runtime.dispatchQueue).toBeUndefined();
    expect(runtime.worker).toBeUndefined();
  });

  it("stays legacy when the document is invalid", async () => {
    await publishPolicy({ ...policyDocument("queue"), schemaVersion: "wrong" });
    const runtime = startReplayQueueRuntime({ stateRoot });
    expect(runtime.mode).toBe("legacy");
  });

  it("exposes an offer and no worker in shadow mode", async () => {
    await publishPolicy(policyDocument("shadow"));
    const runtime = startReplayQueueRuntime({ stateRoot, handler: async () => undefined });
    expect(runtime.mode).toBe("shadow");
    expect(runtime.dispatchQueue?.mode).toBe("shadow");
    expect(runtime.worker).toBeUndefined();
    const offered = await runtime.dispatchQueue?.offer({
      captureRef: "req-runtime-1",
      endpointIds: ["endpoint-b"],
      policySetDigest: "d",
    });
    expect(offered).toEqual({ enqueued: true, jobId: "req-runtime-1" });
    await runtime.stop();
  });

  it("runs a worker in queue mode and hands it the offered job", async () => {
    await publishPolicy(policyDocument("queue"));
    const handled: string[] = [];
    const runtime = startReplayQueueRuntime({
      stateRoot,
      handler: async (job) => {
        handled.push(job.captureRef);
      },
    });
    expect(runtime.mode).toBe("queue");
    expect(runtime.worker).toBeDefined();
    await runtime.dispatchQueue?.offer({
      captureRef: "req-runtime-2",
      endpointIds: ["endpoint-b"],
      policySetDigest: "d",
    });
    await new Promise((resolve) => setTimeout(resolve, 1_500));
    await runtime.stop();
    expect(handled).toContain("req-runtime-2");
  });

  it("keeps the worker from claiming while the kill switch is engaged", async () => {
    await publishPolicy(policyDocument("queue", true));
    const handled: string[] = [];
    const runtime = startReplayQueueRuntime({
      stateRoot,
      handler: async (job) => {
        handled.push(job.captureRef);
      },
    });
    await runtime.dispatchQueue?.offer({
      captureRef: "req-runtime-3",
      endpointIds: ["endpoint-b"],
      policySetDigest: "d",
    });
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    await runtime.stop();
    expect(handled).toHaveLength(0);
  });
});
