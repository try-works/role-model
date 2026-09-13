/**
 * Run 97 RC04 (L4): the router-backed pairwise judge contract for automatic routing
 * counterfactual comparisons.
 *
 * The judge is dispatched by the host (which owns provider execution and the replay
 * ledger); the pipeline only consumes the decision and records it as the
 * `role_model_pairwise_judge.battle` scorer dimension. The judge is an evaluation
 * producer, never the authority for correctness: it returns a bounded preference with
 * confidence and a durable dispatch receipt, and a failure is persisted as bounded
 * score missingness instead of a fabricated score (`guidance/09` "role-model judge
 * scorer failure persistence").
 */

export const TRACK_B_PAIRWISE_JUDGE_WINNER_SOURCE = "source" as const;
export const TRACK_B_PAIRWISE_JUDGE_WINNER_COUNTERFACTUAL = "counterfactual" as const;
export const TRACK_B_PAIRWISE_JUDGE_WINNER_TIE = "tie" as const;

export type TrackBPairwiseJudgeWinner =
  | typeof TRACK_B_PAIRWISE_JUDGE_WINNER_SOURCE
  | typeof TRACK_B_PAIRWISE_JUDGE_WINNER_COUNTERFACTUAL
  | typeof TRACK_B_PAIRWISE_JUDGE_WINNER_TIE;

export interface TrackBPairwiseJudgeBranch {
  readonly trialId: string;
  readonly candidateRef: string;
  readonly outputRef: string;
  readonly outputDigest: string;
  readonly outputText: string;
}

export interface TrackBPairwiseJudgeRequest {
  readonly requestId: string;
  readonly channel: string;
  readonly scope: string;
  readonly authorizationEpoch: number;
  readonly evaluationJobId: string;
  readonly judgeEndpointId: string;
  readonly evaluationCriteriaDigest?: string;
  readonly source: TrackBPairwiseJudgeBranch;
  readonly counterfactual: TrackBPairwiseJudgeBranch;
}

export interface TrackBPairwiseJudgeDecision {
  readonly winner: TrackBPairwiseJudgeWinner;
  readonly confidence: number;
  readonly dispatchReceiptId: string;
  readonly routerDecisionId: string;
  readonly judgeResultRef: string;
  readonly judgeEndpointId: string;
}

export interface TrackBPairwiseJudge {
  readonly endpointId: string;
  readonly dispatch: (
    request: TrackBPairwiseJudgeRequest,
  ) => Promise<TrackBPairwiseJudgeDecision>;
}

/**
 * RC04: the winner's preference is encoded on the canonical 0..1 range so Evaluation
 * Core's comparison math stays a pure score fold: the preferred branch scores 1, the
 * other 0, and an explicit `tie` scores both branches 0.5 (never a fabricated
 * preference in either direction).
 */
export function pairwiseJudgeScores(input: {
  readonly winner: TrackBPairwiseJudgeWinner;
  readonly role: "source" | "counterfactual";
}): number {
  if (input.winner === TRACK_B_PAIRWISE_JUDGE_WINNER_TIE) return 0.5;
  return input.winner === input.role ? 1 : 0;
}

export const PAIRWISE_JUDGE_MAX_EXCERPT_CHARS = 4_000;
export const PAIRWISE_JUDGE_MAX_TASK_CHARS = 2_000;

/**
 * RC04: bounded, redacted excerpts cross the judge boundary. The judge sees the task
 * and the two branch answers only - never the capture's credentials, headers, or
 * tool transport, which stay in the durable capture (`guidance/23` privacy scope).
 */
export function redactJudgeExcerpt(value: string, maxChars = PAIRWISE_JUDGE_MAX_EXCERPT_CHARS): string {
  if (typeof value !== "string") return "";
  const redacted = value
    .replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, "[redacted-private-key]")
    .replace(/\b(?:sk|rk|pk|ghp|github_pat|xox[baprs])[-_][A-Za-z0-9._-]{12,}\b/g, "[redacted-token]")
    .replace(/\bBearer\s+[A-Za-z0-9._-]{12,}/gi, "Bearer [redacted-token]")
    .replace(/\b(?:api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|password)\b\s*[:=]\s*["']?[^\s"',}]{8,}/gi, "[redacted-secret]");
  const limit = Number.isSafeInteger(maxChars) && maxChars > 0 ? maxChars : PAIRWISE_JUDGE_MAX_EXCERPT_CHARS;
  if (redacted.length <= limit) return redacted;
  return `${redacted.slice(0, limit)}\n[truncated ${redacted.length - limit} chars]`;
}

export const PAIRWISE_JUDGE_SYSTEM_PROMPT = [
  "You are an impartial evaluation judge for a local model router.",
  "You receive one user task and two assistant answers labeled A and B.",
  "Decide which answer better satisfies the task for the same conversation state.",
  "Prefer the answer that is correct, complete, and directly usable; ignore length and style.",
  'Respond with ONLY a JSON object: {"winner":"A"|"B"|"tie","confidence":<0..1>,"rationale":"<short>"}.',
].join(" ");

export function buildPairwiseJudgeMessages(input: {
  readonly taskText: string;
  readonly sourceText: string;
  readonly counterfactualText: string;
  readonly sourceCandidateRef: string;
  readonly counterfactualCandidateRef: string;
}): readonly { readonly role: "system" | "user"; readonly content: string }[] {
  const task = redactJudgeExcerpt(input.taskText, PAIRWISE_JUDGE_MAX_TASK_CHARS);
  const source = redactJudgeExcerpt(input.sourceText);
  const counterfactual = redactJudgeExcerpt(input.counterfactualText);
  return [
    { role: "system", content: PAIRWISE_JUDGE_SYSTEM_PROMPT },
    {
      role: "user",
      content: [
        "<task>",
        task,
        "</task>",
        `<answer label="A" model="${input.sourceCandidateRef}">`,
        source,
        "</answer>",
        `<answer label="B" model="${input.counterfactualCandidateRef}">`,
        counterfactual,
        "</answer>",
        "Which answer better satisfies the task? JSON only.",
      ].join("\n"),
    },
  ];
}

export interface TrackBPairwiseJudgeResponse {
  readonly winner: TrackBPairwiseJudgeWinner;
  readonly confidence: number;
  readonly rationale: string;
}

/**
 * RC04: judge responses are parsed defensively. An unparseable or unbounded judge
 * response is a scorer failure (the caller records missingness); it never becomes a
 * silent tie.
 */
export function parsePairwiseJudgeResponse(
  value: unknown,
): TrackBPairwiseJudgeResponse | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const match = value.match(/\{[\s\S]*\}/);
  if (!match) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const record = parsed as Record<string, unknown>;
  const rawWinner = typeof record.winner === "string" ? record.winner.trim().toLowerCase() : "";
  const winner =
    rawWinner === "a" || rawWinner === "source"
      ? TRACK_B_PAIRWISE_JUDGE_WINNER_SOURCE
      : rawWinner === "b" || rawWinner === "counterfactual"
        ? TRACK_B_PAIRWISE_JUDGE_WINNER_COUNTERFACTUAL
        : rawWinner === "tie"
          ? TRACK_B_PAIRWISE_JUDGE_WINNER_TIE
          : null;
  if (!winner) return null;
  const confidence = typeof record.confidence === "number" ? record.confidence : Number(record.confidence);
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) return null;
  const rationale =
    typeof record.rationale === "string" ? record.rationale.trim().slice(0, 400) : "";
  return { winner, confidence, rationale };
}
