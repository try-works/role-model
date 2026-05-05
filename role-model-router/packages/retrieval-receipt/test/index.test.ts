import { describe, expect, test } from "vitest";

import { createRetrievalReceipt } from "../src/index.ts";

describe("createRetrievalReceipt", () => {
  test("summarizes the selected continuity context with stable inclusion reasons", () => {
    const result = createRetrievalReceipt({
      envelope: {
        sessionId: "session-alpha",
        conversationId: "conversation-main",
        selectedTurns: [
          {
            turnId: "turn-003",
            conversationId: "conversation-main",
            role: "user",
            contentRef: "ref://turn-003?tokens=80&label=user-follow-up",
            createdAtMs: 1700000003000,
          },
          {
            turnId: "turn-004",
            conversationId: "conversation-main",
            role: "assistant",
            contentRef: "ref://turn-004?tokens=90&label=assistant-next-steps",
            createdAtMs: 1700000004000,
          },
        ],
        selectedArtifacts: [
          {
            artifactId: "artifact-summary",
            artifactKind: "summary",
            storageRef: "ref://artifact-summary?tokens=70&label=session-summary",
            createdAtMs: 1700000001500,
            linkId: "link-2",
            conversationId: "conversation-main",
            sessionId: "session-alpha",
            linkedAtMs: 1700000001500,
          },
        ],
        latestHandoff: {
          handoffId: "handoff-1",
          conversationId: "conversation-main",
          fromEndpointId: "openai.personal.primary.us-east-1.fast",
          toEndpointId: "anthropic.team.shared.us-east-1.default",
          createdAtMs: 1700000003500,
        },
        estimatedTokenCount: 240,
        diagnostics: [],
      },
      totalTurns: 4,
      totalArtifacts: 3,
    });

    expect(result.receiptId).toBe("conversation-main-retrieval-receipt");
    expect(result.summary).toEqual({
      selectedTurns: 2,
      selectedArtifacts: 1,
      omittedTurns: 2,
      omittedArtifacts: 2,
      estimatedTokens: 240,
    });
    expect(result.entries).toEqual([
      {
        itemId: "turn-003",
        kind: "turn",
        reason: "recent-turn",
      },
      {
        itemId: "turn-004",
        kind: "turn",
        reason: "recent-turn",
      },
      {
        itemId: "artifact-summary",
        kind: "artifact",
        reason: "summary-context",
      },
      {
        itemId: "handoff-1",
        kind: "handoff",
        reason: "latest-handoff",
      },
    ]);
  });
});
