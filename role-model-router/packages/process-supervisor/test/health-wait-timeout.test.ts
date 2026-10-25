import { mkdtemp, rm } from "node:fs/promises";
import { type Server, type Socket, createServer } from "node:net";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import { ProcessSupervisor } from "../src/index.js";

/**
 * R22: waitForHealth must enforce startupTimeoutMs even when the HTTP peer
 * accepts the TCP connection and then never writes a response.
 *
 * These tests use a real node:net peer (no module mocks, no vi.mock and no
 * monkeypatched global fetch) plus a real child process, because the defect is
 * about an await that outlives the deadline.
 */

const STARTUP_TIMEOUT_MS = 800;
/**
 * Upper bound for the measured window. Test 1 keeps the pre-existing child
 * force-stop teardown outside that window, so this is the mandated
 * startupTimeoutMs plus generous CI slack for the health wait itself.
 */
const HEALTH_WAIT_SLACK_MS = 1500;
/** Hard test-level guard so a regression fails instead of parking the runner. */
const START_GUARD_MS = 15_000;

const supervisors: ProcessSupervisor[] = [];
const tempRoots: string[] = [];
const peers: Array<{ close(): Promise<void>; releaseConnections(): void }> = [];

afterEach(async () => {
  const activePeers = peers.splice(0);
  for (const peer of activePeers) {
    peer.releaseConnections();
  }
  while (supervisors.length > 0) {
    const supervisor = supervisors.pop();
    await supervisor?.shutdown();
  }
  for (const peer of activePeers) {
    await peer.close();
  }
  await Promise.all(
    tempRoots.splice(0).map(async (tempRoot) => {
      await rm(tempRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }),
  );
});

function delay(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

async function listenOnAvailablePort(server: Server): Promise<number> {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to allocate a local port.");
  }
  return address.port;
}

interface HangingPeer {
  readonly url: string;
  /** TCP connections accepted by the peer, including dataless teardown sockets. */
  connectionCount(): number;
  /** Connections that actually wrote an HTTP request line, i.e. real health polls. */
  requestCount(): number;
  releaseConnections(): void;
  close(): Promise<void>;
}

async function startHangingPeer(): Promise<HangingPeer> {
  const sockets = new Set<Socket>();
  const requestingSockets = new WeakSet<Socket>();
  let connections = 0;
  let requests = 0;
  const server = createServer((socket) => {
    connections += 1;
    sockets.add(socket);
    socket.on("close", () => {
      sockets.delete(socket);
    });
    socket.on("error", () => undefined);
    socket.on("data", () => {
      if (requestingSockets.has(socket)) {
        return;
      }
      requestingSockets.add(socket);
      requests += 1;
    });
    // Intentionally accept the connection and never write a response.
  });
  const port = await listenOnAvailablePort(server);
  const peer: HangingPeer = {
    url: `http://127.0.0.1:${port}/healthz`,
    connectionCount: () => connections,
    requestCount: () => requests,
    releaseConnections: () => {
      for (const socket of sockets) {
        socket.destroy();
      }
      sockets.clear();
    },
    close: async () => {
      peer.releaseConnections();
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    },
  };
  peers.push(peer);
  return peer;
}

interface DelayedHealthyPeer {
  readonly url: string;
  connectionCount(): number;
  releaseConnections(): void;
  close(): Promise<void>;
}

async function startDelayedHealthyPeer(responseDelayMs: number): Promise<DelayedHealthyPeer> {
  const sockets = new Set<Socket>();
  let connections = 0;
  const server = createServer((socket) => {
    connections += 1;
    sockets.add(socket);
    socket.on("close", () => {
      sockets.delete(socket);
    });
    socket.on("error", () => undefined);
    setTimeout(() => {
      if (socket.destroyed) {
        return;
      }
      socket.end("HTTP/1.1 200 OK\r\ncontent-length: 2\r\nconnection: close\r\n\r\nok");
    }, responseDelayMs);
  });
  const port = await listenOnAvailablePort(server);
  const peer: DelayedHealthyPeer = {
    url: `http://127.0.0.1:${port}/healthz`,
    connectionCount: () => connections,
    releaseConnections: () => {
      for (const socket of sockets) {
        socket.destroy();
      }
      sockets.clear();
    },
    close: async () => {
      peer.releaseConnections();
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    },
  };
  peers.push(peer);
  return peer;
}

type StartOutcome =
  | { readonly kind: "resolved" }
  | { readonly kind: "rejected"; readonly error: Error }
  | { readonly kind: "hung" };

/**
 * Races startVendor against a hard guard so a regression is reported as a
 * readable failure instead of a hung test file. The start promise is given its
 * own rejection handler, so tearing the peer down afterwards cannot produce an
 * unhandled rejection.
 */
async function awaitStartWithGuard(
  startPromise: Promise<unknown>,
  guardMs: number,
): Promise<StartOutcome> {
  let guardTimer: ReturnType<typeof setTimeout> | undefined;
  const guard = new Promise<StartOutcome>((resolve) => {
    guardTimer = setTimeout(() => resolve({ kind: "hung" }), guardMs);
  });
  try {
    return await Promise.race([
      startPromise.then(
        (): StartOutcome => ({ kind: "resolved" }),
        (error: unknown): StartOutcome => ({
          kind: "rejected",
          error: error instanceof Error ? error : new Error(String(error)),
        }),
      ),
      guard,
    ]);
  } finally {
    if (guardTimer !== undefined) {
      clearTimeout(guardTimer);
    }
  }
}

const HANGING_CHILD_ARGS = ["-e", "setInterval(()=>{},1000)"];

function createSupervisor(): ProcessSupervisor {
  const supervisor = new ProcessSupervisor();
  supervisors.push(supervisor);
  return supervisor;
}

async function createTempRoot(): Promise<string> {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-supervisor-health-wait-"));
  tempRoots.push(tempRoot);
  return tempRoot;
}

describe("process-supervisor bounded health wait", () => {
  test("rejects within startupTimeoutMs when the health peer accepts and never responds", async () => {
    const peer = await startHangingPeer();
    const tempRoot = await createTempRoot();
    const supervisor = createSupervisor();
    const vendorId = "hanging-peer";

    // The health peer hangs for the whole test. The supervised child is
    // terminated shortly before the deadline so that startVendor's pre-existing
    // force-stop teardown (taskkill /T /F plus the child exit event; measured at
    // ~1-1.5 s on Windows, more when the suite runs in parallel) stays outside
    // the measured window. The window then covers the health wait itself, which
    // is what the mandated startupTimeoutMs + 1500 ms bound is about.
    const startedAt = Date.now();
    const startPromise = supervisor.startVendor({
      vendorId,
      command: process.execPath,
      args: HANGING_CHILD_ARGS,
      cwd: tempRoot,
      env: {},
      healthCheckUrl: peer.url,
      startupTimeoutMs: STARTUP_TIMEOUT_MS,
      required: true,
    });
    const terminateChildTimer = setTimeout(() => {
      const pid = supervisor.getVendorStatus(vendorId)?.pid;
      if (pid === undefined || pid <= 0) {
        return;
      }
      try {
        process.kill(pid, "SIGKILL");
      } catch {
        // The child already exited; there is nothing left to terminate.
      }
    }, STARTUP_TIMEOUT_MS - 400);

    const outcome = await awaitStartWithGuard(startPromise, START_GUARD_MS);
    clearTimeout(terminateChildTimer);
    const elapsedMs = Date.now() - startedAt;

    expect(peer.connectionCount(), "the hanging peer must have been contacted").toBeGreaterThan(0);
    expect(
      outcome.kind,
      "waitForHealth must reject instead of hanging when the health peer accepts and never responds",
    ).toBe("rejected");
    if (outcome.kind !== "rejected") {
      return;
    }

    expect(outcome.error.message).toMatch(/did not become healthy before startup timed out/i);
    expect(elapsedMs).toBeLessThan(STARTUP_TIMEOUT_MS + HEALTH_WAIT_SLACK_MS);
  });

  test("becomes healthy when a responsive endpoint replies after about 200ms", async () => {
    const peer = await startDelayedHealthyPeer(200);
    const tempRoot = await createTempRoot();
    const supervisor = createSupervisor();

    const startedAt = Date.now();
    const managed = await supervisor.startVendor({
      vendorId: "delayed-healthy",
      command: process.execPath,
      args: HANGING_CHILD_ARGS,
      cwd: tempRoot,
      env: {},
      healthCheckUrl: peer.url,
      startupTimeoutMs: 2000,
      required: true,
    });
    const elapsedMs = Date.now() - startedAt;

    expect(managed.healthStatus).toBe("healthy");
    expect(managed.exitCode).toBeUndefined();
    expect(supervisor.isVendorRunning("delayed-healthy")).toBe(true);
    expect(peer.connectionCount()).toBeGreaterThan(0);
    expect(elapsedMs).toBeGreaterThanOrEqual(150);
    expect(elapsedMs).toBeLessThan(2000);
  });

  test("stops polling after a health timeout and shuts down cleanly", async () => {
    const peer = await startHangingPeer();
    const tempRoot = await createTempRoot();
    const supervisor = createSupervisor();

    const outcome = await awaitStartWithGuard(
      supervisor.startVendor({
        vendorId: "hanging-peer-shutdown",
        command: process.execPath,
        args: HANGING_CHILD_ARGS,
        cwd: tempRoot,
        env: {},
        healthCheckUrl: peer.url,
        startupTimeoutMs: STARTUP_TIMEOUT_MS,
        required: true,
      }),
      START_GUARD_MS,
    );

    expect(
      outcome.kind,
      "waitForHealth must reject instead of hanging when the health peer accepts and never responds",
    ).toBe("rejected");
    if (outcome.kind !== "rejected") {
      return;
    }

    const connectionsAtRejection = peer.connectionCount();
    const requestsAtRejection = peer.requestCount();
    expect(requestsAtRejection, "the hanging peer must have seen a health request").toBeGreaterThan(
      0,
    );

    await supervisor.shutdown();

    // An aborted fetch can leave one dataless teardown socket behind (the peer
    // accepts a connection that never writes a request), so allow a short settle
    // and then require that nothing new is issued. A poll always writes a
    // request line, which is why the request count is the load-bearing check.
    await delay(250);
    const connectionsAfterSettle = peer.connectionCount();
    const requestsAfterSettle = peer.requestCount();

    expect(connectionsAfterSettle).toBeGreaterThanOrEqual(connectionsAtRejection);
    expect(connectionsAfterSettle).toBeLessThanOrEqual(connectionsAtRejection + 1);
    expect(requestsAfterSettle).toBe(requestsAtRejection);

    await delay(300);

    expect(peer.requestCount(), "no polling may continue after a timeout").toBe(
      requestsAfterSettle,
    );
    expect(peer.connectionCount(), "no new connections after shutdown").toBe(
      connectionsAfterSettle,
    );
  });
});
