import { createServer } from "node:http";
import os from "node:os";
import path from "node:path";

import { expect, test } from "vitest";

import { createTrackBOperations } from "../src/track-b-operations.js";

const token = "run97-operations-token-0123456789";

test("run97 operations client reads pending replay captures from the private boundary", async () => {
  const expected = {
    policySetDigest: "digest-a",
    captureCount: 3,
    pendingCount: 2,
    pending: ["req-1", "req-3"],
    health: { channel: "stage", rows: 1, byOutcome: { replayed: 1 } },
  };
  const server = createServer((request, response) => {
    expect(request.method).toBe("POST");
    expect(request.url).toBe("/capture/replay-pending");
    expect(request.headers.authorization).toBe(`Bearer ${token}`);
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify(expected));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("stub server did not bind");
  try {
    const operations = createTrackBOperations({
      statePath: path.join(os.tmpdir(), "run97-replay-operations-state.json"),
      catalog: [],
      operationsEndpoint: `http://127.0.0.1:${address.port}`,
      operationsToken: token,
    });
    await expect(
      operations.listPendingReplayCaptures({ policySetDigest: "digest-a", limit: 100 }),
    ).resolves.toEqual(expected);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test("run97 operations client records a replay disposition and lists dispositions", async () => {
  const seen: string[] = [];
  const server = createServer((request, response) => {
    seen.push(`${request.method} ${request.url}`);
    const body = {
      recorded: true,
      disposition: { captureRef: "req-1", outcome: "replayed" },
      rows: [{ captureRef: "req-1", outcome: "replayed" }],
      cursor: null,
      health: { channel: "stage", rows: 1, byOutcome: { replayed: 1 } },
    };
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify(body));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("stub server did not bind");
  try {
    const operations = createTrackBOperations({
      statePath: path.join(os.tmpdir(), "run97-replay-operations-state.json"),
      catalog: [],
      operationsEndpoint: `http://127.0.0.1:${address.port}`,
      operationsToken: token,
    });
    const recorded = (await operations.recordReplayDisposition({
      captureRef: "req-1",
      policySetDigest: "digest-a",
      outcome: "replayed",
      branches: 3,
    })) as { recorded: boolean };
    expect(recorded.recorded).toBe(true);
    const listed = (await operations.listReplayDispositions({
      policySetDigest: "digest-a",
      limit: 10,
    })) as { rows: unknown[] };
    expect(listed.rows).toHaveLength(1);
    expect(seen).toEqual(["POST /capture/replay-disposition", "POST /capture/replay-dispositions"]);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test("run97 operations client degrades safely when the boundary is unconfigured", async () => {
  const operations = createTrackBOperations({
    statePath: path.join(os.tmpdir(), "run97-replay-operations-state.json"),
    catalog: [],
  });
  await expect(
    operations.listPendingReplayCaptures({ policySetDigest: "digest-a" }),
  ).resolves.toMatchObject({ pendingCount: 0, pending: [] });
  await expect(
    operations.recordReplayDisposition({ captureRef: "req-1", outcome: "replayed" }),
  ).resolves.toMatchObject({ recorded: false });
  await expect(
    operations.listReplayDispositions({ policySetDigest: "digest-a" }),
  ).resolves.toMatchObject({ rows: [] });
});
