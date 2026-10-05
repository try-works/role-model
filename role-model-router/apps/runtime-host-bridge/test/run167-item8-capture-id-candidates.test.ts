import { expect, test } from "vitest";

import {
  branchCaptureRequestIdCandidatesFromJob,
  resolveResumedArmEvidence,
} from "../src/supervised-replay-handoff-recovery.js";

/**
 * Run 100 — item 8's `capture_missing` class, root-caused independently by two audit subagents on the live
 * store 2026-09-25:
 *
 * - 67 distinct `capture_missing(<id>)` ids across 39 failed jobs, **all** shaped `…-<hash16>-branch`;
 * - **0 of 2 965** queue receipts carry those ids, and **0 receipts end in `-branch` at all**;
 * - the receipts for the same request exist as `replay-<uuid>-<candidateHash16>` — the *dispatch* captures the
 *   arms actually wrote (`status: "captured"`, with the arm's response payload);
 * - `branchCaptureRequestIdsFromJob` derives `<providerResultRef>-branch` from the job's dispatch receipt, so
 *   the reader asks for a name that no producer writes (dispatch captures became attempt-scoped in run-100
 *   addendum 04 S9).
 *
 * So the arm evidence is present under the dispatch id while the recovery asks for a `-branch` sibling. The
 * resolution must return the **ordered candidates** the job can name, and the recovery must try each before
 * declaring the arm unreadable.
 */

const REQUEST = "replay-req-0673e0e4-4bdd-48eb-a0da-4ff8e7531b6b";
const ARM = "deepseek.personal.deepseek-api-key.global.deepseek-flash-low";

test("run167 item 8 the arm's candidate ids are ordered from recorded to legacy", () => {
  const candidates = branchCaptureRequestIdCandidatesFromJob({
    replayJobId: "job-1",
    requestId: REQUEST,
    dispatches: {
      [ARM]: {
        result: {
          providerResultRef: `route-capture:${REQUEST}-9046a09920776b99`,
        },
      },
    },
    candidateEndpointIds: [ARM],
  });

  const ids = candidates.get(ARM);
  expect(ids).toBeDefined();
  // The dispatch capture itself — the name the store measured as present — is among the candidates.
  expect(ids).toContain(`${REQUEST}-9046a09920776b99`);
  // The `-branch` sibling the previous code derived is still tried, but no longer alone.
  expect(ids).toContain(`${REQUEST}-9046a09920776b99-branch`);
  expect(ids?.[0]).toBe(`${REQUEST}-9046a09920776b99`);
});

test("run167 item 8 a recorded branch id still wins over the derived names", () => {
  const candidates = branchCaptureRequestIdCandidatesFromJob({
    replayJobId: "job-1",
    requestId: REQUEST,
    dispatches: {
      [ARM]: {
        result: {
          branchRequestId: `${REQUEST}-recorded-branch`,
          providerResultRef: `route-capture:${REQUEST}-9046a09920776b99`,
        },
      },
    },
    candidateEndpointIds: [ARM],
  });
  expect(candidates.get(ARM)?.[0]).toBe(`${REQUEST}-recorded-branch`);
});

test("run167 item 8 an arm is recovered from the dispatch capture when the branch sibling is gone", async () => {
  const captured = {
    requestId: `${REQUEST}-9046a09920776b99`,
    endpointId: ARM,
    modelId: "deepseek/deepseek-flash",
    reasoningEffort: "low",
    responseText: "the arm's recorded answer",
  };
  const asked: string[] = [];
  const result = await resolveResumedArmEvidence({
    counterfactualPackages: [
      { endpointId: ARM, modelId: "deepseek/deepseek-flash", reasoningEffort: "low" },
    ],
    branchCaptureRequestIds: new Map([
      [ARM, [`${REQUEST}-9046a09920776b99`, `${REQUEST}-9046a09920776b99-branch`]],
    ]),
    readCapture: async (requestId: string) => {
      asked.push(requestId);
      return requestId.endsWith("-branch") ? null : captured;
    },
  });

  expect(asked).toEqual([`${REQUEST}-9046a09920776b99`]);
  expect(result.unreadable).toHaveLength(0);
  expect(result.arms).toHaveLength(1);
  expect(result.arms[0]).toMatchObject({
    endpointId: ARM,
    outputText: "the arm's recorded answer",
  });
});

test("run167 item 8 an arm whose every candidate is absent is still reported missing by name", async () => {
  const result = await resolveResumedArmEvidence({
    counterfactualPackages: [
      { endpointId: ARM, modelId: "deepseek/deepseek-flash", reasoningEffort: "low" },
    ],
    branchCaptureRequestIds: new Map([[ARM, [`${REQUEST}-a-branch`, `${REQUEST}-a`]]]),
    readCapture: async () => null,
  });
  expect(result.arms).toHaveLength(0);
  expect(result.unreadable).toHaveLength(1);
  expect(result.unreadable[0].reason).toBe("capture_missing");
  expect(result.unreadable[0].detail).toBe(`${REQUEST}-a`);
});
