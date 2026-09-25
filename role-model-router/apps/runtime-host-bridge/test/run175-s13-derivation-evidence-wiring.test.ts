import { describe, expect, test } from "vitest";

import { deriveLearnerTrajectoryEvidenceForReplay } from "../src/cli.js";

/**
 * Run 100 item S13 follow-up: the derivation sweep's capture wiring, unit-tested without standing up the
 * sweep. The source capture is named by the replay job's durable locator (`decision-<captureRef>`), each
 * counterfactual capture by its dispatch's `providerResultRef` (`route-capture:<replayRequestId>` plus the
 * `-branch` suffix the executor writes). A capture that cannot be read is a named unavailability - never a
 * fabricated timeline.
 */

const WINNER = "deepseek.personal.primary.global.deepseek-v4-pro-high";
const SOURCE_CAPTURE = {
  requestId: "req-abc",
  capturedAt: "2026-09-25T00:00:00.000Z",
  rootArtifactId: "1".repeat(64),
  routeDecisionArtifactId: "2".repeat(64),
  responseArtifactId: "3".repeat(64),
};
const BRANCH_CAPTURE = {
  requestId: "replay-req-xyz-branch",
  capturedAt: "2026-09-25T00:00:01.000Z",
  rootArtifactId: "4".repeat(64),
  routeDecisionArtifactId: "5".repeat(64),
  responseArtifactId: "6".repeat(64),
};

const job = {
  jobId: "b".repeat(64),
  state: "complete",
  sourceDecisionId: "decision-req-abc",
  sharedPrefixRef: "shared-prefix-ref",
  dispatches: {
    [WINNER]: { result: { providerResultRef: "route-capture:replay-req-xyz" } },
  },
};

const EVENTS = [
  { id: "req-abc:route", type: "route_selected", evidenceRef: `artifact:${"2".repeat(64)}` },
  { id: "req-abc:response", type: "model_response", evidenceRef: `artifact:${"3".repeat(64)}` },
];

describe("run175 S13: the derivation reads the captures the replay job names", () => {
  test("reads the source capture and each branch capture by the durable locator", async () => {
    const readIds: string[] = [];
    const derivedFrom: Array<{
      readonly sourceCapture: Record<string, unknown>;
      readonly counterfactualCaptures: readonly Record<string, unknown>[];
    }> = [];
    const evidence = await deriveLearnerTrajectoryEvidenceForReplay({
      job,
      readCapture: async (requestId) => {
        readIds.push(requestId);
        if (requestId === "req-abc") return SOURCE_CAPTURE;
        if (requestId === "replay-req-xyz-branch") return BRANCH_CAPTURE;
        return null;
      },
      deriveEvents: (input) => {
        derivedFrom.push(input as never);
        return EVENTS;
      },
    });

    expect(readIds).toEqual(["req-abc", "replay-req-xyz-branch"]);
    expect(derivedFrom).toHaveLength(1);
    expect(derivedFrom[0].sourceCapture).toBe(SOURCE_CAPTURE);
    expect(derivedFrom[0].counterfactualCaptures).toEqual([BRANCH_CAPTURE]);
    expect(evidence).toEqual({
      kind: "evidence",
      events: EVENTS,
      graphRef: `artifact:${SOURCE_CAPTURE.rootArtifactId}`,
      replayRef: "shared-prefix-ref",
    });
  });

  test("reports an unreadable branch capture as unavailability rather than a timeline", async () => {
    let derived = 0;
    const evidence = await deriveLearnerTrajectoryEvidenceForReplay({
      job,
      readCapture: async (requestId) => (requestId === "req-abc" ? SOURCE_CAPTURE : null),
      deriveEvents: () => {
        derived += 1;
        return EVENTS;
      },
    });

    expect(evidence.kind).toBe("unavailable");
    expect(String((evidence as { reason?: unknown }).reason)).toContain("replay-req-xyz-branch");
    expect(derived).toBe(0);
  });
});
