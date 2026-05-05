import type {
  ConversationContinuitySnapshot,
  ConversationTurnRecord,
  LinkedContextArtifactRecord,
  RoutingHandoffRecord,
} from "@role-model-router/sqlite-memory";

export interface ContextEnvelopeDiagnostic {
  readonly code: string;
  readonly message: string;
}

export interface ContextEnvelopeResult {
  readonly sessionId: string;
  readonly conversationId: string;
  readonly selectedTurns: readonly ConversationTurnRecord[];
  readonly selectedArtifacts: readonly LinkedContextArtifactRecord[];
  readonly latestHandoff: RoutingHandoffRecord | null;
  readonly estimatedTokenCount: number;
  readonly diagnostics: readonly ContextEnvelopeDiagnostic[];
}

export interface AssembleContextEnvelopeInput {
  readonly continuity: ConversationContinuitySnapshot;
  readonly maxTurns: number;
  readonly maxArtifacts: number;
  readonly tokenBudget: number;
}

function parseEstimatedTokens(reference: string | null): number {
  if (!reference) {
    return 0;
  }

  const tokensMatch = /[?&]tokens=(\d+)/.exec(reference);
  return tokensMatch ? Number.parseInt(tokensMatch[1], 10) : 0;
}

function artifactPriority(artifactKind: string): number {
  switch (artifactKind) {
    case "summary":
      return 0;
    case "fact":
      return 1;
    case "policy":
      return 2;
    default:
      return 3;
  }
}

export function assembleContextEnvelope(input: AssembleContextEnvelopeInput): ContextEnvelopeResult {
  const diagnostics: ContextEnvelopeDiagnostic[] = [];
  const selectedTurns = input.continuity.turns.slice(-input.maxTurns);
  let estimatedTokenCount = selectedTurns.reduce((total, turn) => total + parseEstimatedTokens(turn.contentRef), 0);

  if (input.continuity.turns.length > selectedTurns.length) {
    diagnostics.push({
      code: "TURN_LIMIT_REACHED",
      message: `Context envelope kept the ${selectedTurns.length} most recent turns and omitted ${
        input.continuity.turns.length - selectedTurns.length
      } older turns.`,
    });
  }

  const rankedArtifacts = [...input.continuity.artifacts].sort((left, right) => {
    const priorityDelta = artifactPriority(left.artifactKind) - artifactPriority(right.artifactKind);
    if (priorityDelta !== 0) {
      return priorityDelta;
    }
    return right.createdAtMs - left.createdAtMs;
  });

  const selectedArtifacts: LinkedContextArtifactRecord[] = [];
  let artifactBudgetOmissions = 0;
  for (const artifact of rankedArtifacts) {
    if (selectedArtifacts.length >= input.maxArtifacts) {
      break;
    }

    const artifactTokens = parseEstimatedTokens(artifact.storageRef);
    if (estimatedTokenCount + artifactTokens > input.tokenBudget) {
      artifactBudgetOmissions += 1;
      continue;
    }

    selectedArtifacts.push(artifact);
    estimatedTokenCount += artifactTokens;
  }

  if (artifactBudgetOmissions > 0) {
    diagnostics.push({
      code: "TOKEN_BUDGET_REACHED",
      message: `Context envelope omitted ${artifactBudgetOmissions} artifacts because the token budget was exhausted.`,
    });
  }

  return {
    sessionId: input.continuity.session.sessionId,
    conversationId: input.continuity.conversation.conversationId,
    selectedTurns,
    selectedArtifacts,
    latestHandoff: input.continuity.handoffs.at(-1) ?? null,
    estimatedTokenCount,
    diagnostics,
  };
}
