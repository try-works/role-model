/**
 * Run 104 SP7 (`R10`): the contribution aggregate is bounded far below the operations default and
 * every timeout used to degrade the upload silently (`contribution upload degraded:… timed out after
 * 5000ms`). The bound stays (it protects the background drain), but a typed timeout is now retried
 * under the bridge's shared retry schedule with the *same* request identity, so the private
 * boundary's `contribution_request_receipts` idempotency key can absorb the retry.
 */
import { type Server, createServer } from "node:http";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import {
  CONTRIBUTION_AGGREGATE_TIMEOUT_RETRY_ATTEMPTS,
  CONTRIBUTION_AGGREGATE_TIMEOUT_RETRY_DELAYS_MS,
  DEFAULT_CONTRIBUTION_AGGREGATE_TIMEOUT_MS,
  createTrackBOperations,
  resolveContributionAggregateTimeoutMs,
} from "../src/track-b-operations.js";

const token = "run104-sp7-contribution-budget-token";

const servers: Server[] = [];
afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve) => {
          server.closeAllConnections();
          server.close(() => resolve());
        }),
    ),
  );
});

async function listen(server: Server): Promise<number> {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  servers.push(server);
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("test server did not bind");
  return address.port;
}

const aggregatePayload = {
  requestId: "req-104-sp7-contribution",
  correlationId: "corr-104-sp7-contribution-identity",
  routingDecisionId: "decision-104-sp7",
  endpointId: "endpoint-104-sp7",
  modelId: "model-104-sp7",
  reasoningEffort: null,
  effortSource: "none" as const,
  taskType: "general.chat",
  inputTokens: 12,
  outputTokens: 4,
  success: true,
};

describe("run104 SP7 contribution aggregate budget", () => {
  test("pins the contribution aggregate budget to a documented, operator-visible constant", () => {
    // (c) the budget is asserted against the constant so a future edit cannot silently regress it.
    expect(DEFAULT_CONTRIBUTION_AGGREGATE_TIMEOUT_MS).toBe(30_000);
    // The operations default is 600 s; the aggregate cap must stay the smaller of the two.
    expect(resolveContributionAggregateTimeoutMs(600_000)).toBe(
      DEFAULT_CONTRIBUTION_AGGREGATE_TIMEOUT_MS,
    );
    // An explicitly smaller operations bound still wins (the cap is a ceiling, not a floor).
    expect(resolveContributionAggregateTimeoutMs(25)).toBe(25);
    expect(CONTRIBUTION_AGGREGATE_TIMEOUT_RETRY_ATTEMPTS).toBeGreaterThan(1);
    expect(CONTRIBUTION_AGGREGATE_TIMEOUT_RETRY_DELAYS_MS.length).toBe(
      CONTRIBUTION_AGGREGATE_TIMEOUT_RETRY_ATTEMPTS - 1,
    );
  });

  test("classifies a timed-out aggregate as a retryable typed timeout and retries it under the shared schedule", async () => {
    const attemptsSeen: { requestId: string; correlationId: string; authorization: string }[] = [];
    const server = createServer((request, response) => {
      // Never answer: the caller's bound fires while the sidecar is still working, exactly the
      // live degradation shape.
      void response;
      const seen = {
        requestId: "",
        correlationId: "",
        authorization: String(request.headers.authorization ?? ""),
      };
      attemptsSeen.push(seen);
      const chunks: Buffer[] = [];
      request.on("data", (chunk: Buffer) => chunks.push(chunk));
      request.on("end", () => {
        let body: Record<string, unknown> = {};
        try {
          body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>;
        } catch {
          body = {};
        }
        seen.requestId = String(body.requestId ?? "");
        seen.correlationId = String(body.correlationId ?? "");
      });
    });
    const port = await listen(server);
    const delays: number[] = [];
    const operations = createTrackBOperations({
      statePath: path.join(os.tmpdir(), "run104-sp7-contribution-budget-state.json"),
      catalog: [],
      operationsEndpoint: `http://127.0.0.1:${port}`,
      operationsToken: token,
      operationsTimeoutMs: 250,
      contributionAggregateRetry: {
        sleep: async (delayMs) => {
          delays.push(delayMs);
        },
      },
    });

    await expect(operations.recordContributionAggregate(aggregatePayload)).rejects.toMatchObject({
      name: "TrackBPrivateOperationTimeoutError",
      status: 504,
      retryable: true,
      attempts: CONTRIBUTION_AGGREGATE_TIMEOUT_RETRY_ATTEMPTS,
      message: "private Track B operation timed out after 250ms",
    });
    // (a) attempt count proves the retry actually ran; the injected sleeper means no real waits.
    expect(attemptsSeen.length).toBe(CONTRIBUTION_AGGREGATE_TIMEOUT_RETRY_ATTEMPTS);
    expect(delays).toEqual([...CONTRIBUTION_AGGREGATE_TIMEOUT_RETRY_DELAYS_MS]);
    for (const seen of attemptsSeen) {
      expect(seen.authorization).toBe(`Bearer ${token}`);
      // The retry reuses the caller's identity, so the private boundary's request receipt
      // (`contribution_request_receipts`, keyed by requestId) can absorb it instead of
      // manufacturing a second aggregate.
      expect(seen.requestId).toBe(aggregatePayload.requestId);
      expect(seen.correlationId).toBe(aggregatePayload.correlationId);
    }
  });

  test("does not retry a refused aggregate into a double upload", async () => {
    let attempts = 0;
    const server = createServer((request, response) => {
      attempts += 1;
      response.writeHead(409, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: "aggregate request idempotency identity conflict" }));
    });
    const port = await listen(server);
    const delays: number[] = [];
    const operations = createTrackBOperations({
      statePath: path.join(os.tmpdir(), "run104-sp7-contribution-refusal-state.json"),
      catalog: [],
      operationsEndpoint: `http://127.0.0.1:${port}`,
      operationsToken: token,
      operationsTimeoutMs: 250,
      contributionAggregateRetry: {
        sleep: async (delayMs) => {
          delays.push(delayMs);
        },
      },
    });

    await expect(operations.recordContributionAggregate(aggregatePayload)).rejects.toMatchObject({
      name: "TrackBPrivateOperationError",
      status: 409,
      message: "aggregate request idempotency identity conflict",
    });
    // (b) a stated refusal is terminal: exactly one upload attempt reached the boundary.
    expect(attempts).toBe(1);
    expect(delays).toEqual([]);
  });
});
