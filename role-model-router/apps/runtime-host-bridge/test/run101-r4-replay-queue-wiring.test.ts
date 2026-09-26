/**
 * Run 101 / R4 - the replay plane's queue cutover at the admission point.
 *
 * The tick already decides admission (channel, benchmark exclusion, budget via
 * the ledger reservation) before it executes anything. The queue is offered
 * *after* that decision, so the two invariants stay where they are decided:
 *
 * - `legacy`: nothing is offered; the hand-rolled path is authoritative.
 * - `shadow`: the job is offered and the legacy path still executes, so the
 *   queue's behaviour can be compared with the authoritative one.
 * - `queue`: the job is offered and the legacy execution is skipped, because a
 *   worker now owns it.
 *
 * RED at the frozen baseline: `runAutoReplayTick` has no queue input, so every
 * assertion about `offers` fails.
 */
import { describe, expect, it } from "vitest";

import { runAutoReplayTick } from "../src/track-b-auto-replay.js";

const POLICY_SET = {
  policySetDigest: "policy-digest-1",
  policyIds: [],
} as never;

function capture(overrides: Record<string, unknown> = {}) {
  return {
    captureRef: "req-wiring-1",
    sourceEndpointId: "endpoint-a",
    hasRecordedToolResults: false,
    ...overrides,
  } as never;
}

function ledger() {
  return {
    status: () => ({
      dispatches: 0,
      dispatchLimit: 100,
      counterfactuals: 0,
      counterfactualLimit: 100,
    }),
    hasTerminalCounterfactual: () => false,
    reserve: () => ({ accepted: true, reservationId: "res-1" }),
    record: () => ({ accepted: true }),
    complete: () => ({ accepted: true }),
    completeCounterfactual: () => ({ accepted: true }),
    release: () => undefined,
  } as never;
}

async function runTick(options: {
  readonly mode?: "legacy" | "shadow" | "queue";
  readonly captureOverrides?: Record<string, unknown>;
}) {
  const offers: Array<Record<string, unknown>> = [];
  const executions: string[] = [];
  const dispositions: Array<Record<string, unknown>> = [];

  const result = await runAutoReplayTick({
    captures: [capture(options.captureOverrides)],
    configuredEndpointIds: ["endpoint-a", "endpoint-b", "endpoint-c"],
    healthyEndpointIds: ["endpoint-a", "endpoint-b", "endpoint-c"],
    ledger: ledger(),
    policySet: POLICY_SET,
    executor: async (input) => {
      executions.push(input.capture.captureRef);
      // One completed candidate branch, which is the shape the tick records as
      // a `replayed` disposition.
      return {
        branches: [{ endpointId: "endpoint-b", outcome: "complete" }],
        terminal: true,
      } as never;
    },
    dispositionSink: (disposition) => dispositions.push(disposition as never),
    tickBudgetMs: 0,
    dispatchQueue:
      options.mode === undefined
        ? undefined
        : {
            mode: options.mode,
            offer: async (job) => {
              offers.push(job);
              return { enqueued: true };
            },
          },
  });

  return { result, offers, executions, dispositions };
}

describe("@recursive:101-effect-mq-queue-rebuild @sp4 R4 replay queue wiring", () => {
  it("offers nothing when the plane is legacy (or unwired)", async () => {
    const legacy = await runTick({ mode: "legacy" });
    expect(legacy.offers).toHaveLength(0);
    expect(legacy.executions).toHaveLength(1);

    const unwired = await runTick({});
    expect(unwired.offers).toHaveLength(0);
    expect(unwired.executions).toHaveLength(1);
  });

  it("offers the admitted capture once, with the identity the queue dedupes on, in shadow mode", async () => {
    const shadow = await runTick({ mode: "shadow" });
    expect(shadow.offers).toHaveLength(1);
    expect(shadow.offers[0]).toMatchObject({
      captureRef: "req-wiring-1",
      policySetDigest: "policy-digest-1",
    });
    expect((shadow.offers[0]?.endpointIds as string[])?.length).toBeGreaterThan(0);
    // Shadow keeps the legacy path authoritative.
    expect(shadow.executions).toEqual(["req-wiring-1"]);
  });

  it("skips the legacy execution once the queue is authoritative", async () => {
    const queued = await runTick({ mode: "queue" });
    expect(queued.offers).toHaveLength(1);
    expect(queued.executions).toHaveLength(0);
    expect(queued.result.replayed).toBe(0);
    expect(queued.result.queued).toBe(1);
  });

  it("never offers a capture the admission point refused", async () => {
    const refused = await runTick({
      mode: "queue",
      // `bench-`/`bench_` is the marker the admission decision refuses as a
      // benchmark source (`isBenchmarkReplaySourceRef`).
      captureOverrides: { captureRef: "bench-req-wiring-1" },
    });
    expect(refused.offers).toHaveLength(0);
    expect(refused.executions).toHaveLength(0);
    expect(refused.dispositions.some((entry) => String(entry.code).length > 0)).toBe(true);
  });
});
