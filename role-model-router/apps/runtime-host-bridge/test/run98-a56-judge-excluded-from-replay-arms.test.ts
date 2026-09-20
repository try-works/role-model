import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { expect, test } from "vitest";

import { runAutoReplayTick } from "../src/track-b-auto-replay.js";
import { createReplayLedger } from "../src/track-b-replay-ledger.js";
import { buildReplayPolicySet } from "../src/track-b-replay-policy.js";

/**
 * Run 98 addendum 56 §6 — the `judge_candidate_overlap` refusal class.
 *
 * The live ledger carries four captures deferred with
 * `extension evaluation-core failed: judge_candidate_overlap: candidate …flash-high is the judge declared by
 * scorer set run96-routing-shadow-v3`. The protection itself is correct and intended (addendum 30/33: a battle
 * must not contain the endpoint that judges it), and `selectReplayCandidates` already accepts
 * `excludedEndpointIds` for exactly that purpose — but the auto-replay tick never passes the configured judge, so
 * every capture whose planned arms include the judge is dispatched, refused at job creation, and deferred again
 * on the next tick.
 *
 * Two things are pinned here: the judge is excluded from the planned arms, and a capture whose *source* is the
 * judge is deferred with the named code instead of being dispatched into a guaranteed refusal.
 */
const configured = ["endpoint-a", "endpoint-b", "endpoint-c", "endpoint-judge"];

const tempLedger = () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "run98-a56-"));
  return {
    ledger: createReplayLedger({
      filePath: path.join(dir, "ledger.json"),
      now: () => Date.parse("2026-09-21T01:00:00Z"),
    }),
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
};

test("the configured judge is never planned as a counterfactual arm", async () => {
  const { ledger, cleanup } = tempLedger();
  try {
    const planned: readonly string[][] = [];
    const result = await runAutoReplayTick({
      captures: [
        { captureRef: "req-plain", sourceEndpointId: "endpoint-a", hasRecordedToolResults: false },
      ],
      configuredEndpointIds: configured,
      judgeEndpointId: "endpoint-judge",
      ledger,
      policySet: buildReplayPolicySet(),
      executor: async ({ candidates }) => {
        planned.push([...candidates]);
        return {
          terminal: true,
          branches: candidates.map((endpointId) => ({ endpointId, outcome: "complete" as const })),
        };
      },
    });
    expect(result.replayed).toBe(1);
    expect(planned).toHaveLength(1);
    expect(planned[0]).not.toContain("endpoint-judge");
    expect(planned[0]).not.toContain("endpoint-a");
    expect(planned[0]).toEqual(expect.arrayContaining(["endpoint-b", "endpoint-c"]));
  } finally {
    cleanup();
  }
});

test("a capture whose source is the judge defers with the named code instead of dispatching", async () => {
  const { ledger, cleanup } = tempLedger();
  try {
    let executed = 0;
    const result = await runAutoReplayTick({
      captures: [
        {
          captureRef: "req-judged-itself",
          sourceEndpointId: "endpoint-judge",
          hasRecordedToolResults: false,
        },
      ],
      configuredEndpointIds: configured,
      judgeEndpointId: "endpoint-judge",
      ledger,
      policySet: buildReplayPolicySet(),
      executor: async () => {
        executed += 1;
        return { terminal: true, branches: [] };
      },
    });
    expect(executed).toBe(0, "a guaranteed refusal must not be dispatched");
    expect(result.deferred).toBe(1);
    expect(result.dispositions[0]?.code).toBe("judge_candidate_overlap");
    expect(ledger.status()).toMatchObject({ reservedCounterfactuals: 0, reservedDispatches: 0 });
  } finally {
    cleanup();
  }
});
