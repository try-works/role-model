import type { ContextEnvelopeResult } from "@role-model-router/context-envelope";

export interface RetrievalReceiptEntry {
  readonly itemId: string;
  readonly kind: "turn" | "artifact" | "handoff";
  readonly reason: string;
}

export interface RetrievalReceiptSummary {
  readonly selectedTurns: number;
  readonly selectedArtifacts: number;
  readonly omittedTurns: number;
  readonly omittedArtifacts: number;
  readonly estimatedTokens: number;
}

export interface RetrievalReceipt {
  readonly receiptId: string;
  readonly conversationId: string;
  readonly summary: RetrievalReceiptSummary;
  readonly entries: readonly RetrievalReceiptEntry[];
}

export interface CreateRetrievalReceiptInput {
  readonly envelope: ContextEnvelopeResult;
  readonly totalTurns: number;
  readonly totalArtifacts: number;
}

function artifactReason(artifactKind: string): string {
  switch (artifactKind) {
    case "summary":
      return "summary-context";
    case "fact":
      return "fact-context";
    case "policy":
      return "policy-context";
    default:
      return "context-artifact";
  }
}

export function createRetrievalReceipt(input: CreateRetrievalReceiptInput): RetrievalReceipt {
  return {
    receiptId: `${input.envelope.conversationId}-retrieval-receipt`,
    conversationId: input.envelope.conversationId,
    summary: {
      selectedTurns: input.envelope.selectedTurns.length,
      selectedArtifacts: input.envelope.selectedArtifacts.length,
      omittedTurns: input.totalTurns - input.envelope.selectedTurns.length,
      omittedArtifacts: input.totalArtifacts - input.envelope.selectedArtifacts.length,
      estimatedTokens: input.envelope.estimatedTokenCount,
    },
    entries: [
      ...input.envelope.selectedTurns.map<RetrievalReceiptEntry>((turn) => ({
        itemId: turn.turnId,
        kind: "turn",
        reason: "recent-turn",
      })),
      ...input.envelope.selectedArtifacts.map<RetrievalReceiptEntry>((artifact) => ({
        itemId: artifact.artifactId,
        kind: "artifact",
        reason: artifactReason(artifact.artifactKind),
      })),
      ...(input.envelope.latestHandoff
        ? [
            {
              itemId: input.envelope.latestHandoff.handoffId,
              kind: "handoff" as const,
              reason: "latest-handoff",
            },
          ]
        : []),
    ],
  };
}
