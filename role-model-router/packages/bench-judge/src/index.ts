export function judgeAverage(scores: number[]): number {
  if (scores.length === 0) {
    return 0;
  }

  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

export interface JudgeGradingBriefInput {
  readonly questionTranscript: string;
  readonly exemplarAnswer: string;
  readonly exemplarQuality?: "authored" | "derived";
  readonly deliverablesChecklist: readonly string[];
  readonly antiPatterns: readonly string[];
}

export interface JudgeGradingInput {
  readonly caseId: string;
  readonly promptSummary?: string;
  readonly expectedResponse: string;
  readonly gradingCriteria: string;
  readonly actualResponse: string;
  readonly formattedDeliverable?: string;
  readonly answerFormatInstruction?: string;
  readonly acceptPatterns?: readonly string[];
  readonly structuredToolNames?: readonly string[];
  readonly requiredToolNames?: readonly string[];
  readonly requiredToolCall?: boolean;
  readonly briefing?: JudgeGradingBriefInput;
}

export interface JudgeGradingResult {
  readonly score: number;
  readonly rationale: string;
  readonly method: "heuristic" | "judge";
}

export const JUDGE_JSON_ONLY_FOLLOW_UP =
  'Reply with JSON only on one line: {"score":0.0,"rationale":"..."}. No reasoning, markdown, or extra text.';

export function buildJudgeGradingPrompt(input: JudgeGradingInput): string {
  const toolLines: string[] = [];
  if (input.requiredToolCall || input.requiredToolNames?.length) {
    toolLines.push(
      `Required API tool calls: ${(input.requiredToolNames ?? []).join(", ") || "at least one"}.`,
    );
    toolLines.push(
      `Actual structured tool calls from API: ${
        input.structuredToolNames?.length ? input.structuredToolNames.join(", ") : "none"
      }.`,
    );
    toolLines.push(
      "Fake tool syntax in prose (e.g. TOOL_CALL name=...) does not count unless criteria explicitly allow it.",
    );
  }

  const preamble = [
    "You are grading a model response for a routing capability benchmark.",
    "Return JSON only with keys: score (number 0 to 1), rationale (string). No markdown fences.",
    "Score 1.0 = fully meets expected response and grading criteria.",
    "Score 0.0 = completely wrong or refusal without attempt.",
    "Ignore chain-of-thought or reasoning preambles. Grade ONLY the extracted formatted deliverable.",
    "For code-fix cases, verify the fix is correct — unchanged buggy code must score 0.",
    "Placeholder diffs (----/+++), stub patches without @@ hunks, and reasoning prose submitted as code score 0.",
    ...toolLines,
    "",
    `Case: ${input.caseId}`,
  ];

  if (input.briefing) {
    return [
      ...preamble,
      "",
      "## Original question",
      input.briefing.questionTranscript,
      "",
      "## Example expected answer",
      input.briefing.exemplarAnswer,
      `(exemplar quality: ${input.briefing.exemplarQuality ?? "authored"})`,
      "",
      "## Key deliverables (grade against this checklist)",
      ...input.briefing.deliverablesChecklist,
      "",
      "## MUST NOT",
      ...input.briefing.antiPatterns,
      "",
      "## Answer format requirements",
      input.answerFormatInstruction ?? "See grading criteria.",
      "",
      "## Grading criteria (authoritative)",
      input.gradingCriteria,
      "",
      "## Subject deliverable to grade",
      input.formattedDeliverable ?? input.actualResponse,
    ].join("\n");
  }

  return [
    ...preamble,
    ...(input.promptSummary ? [`Prompt summary: ${input.promptSummary}`] : []),
    ...(input.answerFormatInstruction
      ? [`Required answer format: ${input.answerFormatInstruction}`]
      : []),
    `Expected ideal response: ${input.expectedResponse}`,
    `Grading criteria: ${input.gradingCriteria}`,
    ...(input.formattedDeliverable
      ? [`Formatted deliverable (grade this only): ${input.formattedDeliverable}`]
      : [`Actual model response: ${input.actualResponse}`]),
  ].join("\n");
}

function parseScoreValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return clampScore(value);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) {
      return clampScore(parsed);
    }
  }
  return null;
}

function extractBalancedJsonObjects(text: string): string[] {
  const objects: string[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index] ?? "";
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") {
      if (depth === 0) {
        start = index;
      }
      depth += 1;
      continue;
    }

    if (char === "}") {
      if (depth === 0) {
        continue;
      }
      depth -= 1;
      if (depth === 0 && start >= 0) {
        objects.push(text.slice(start, index + 1));
        start = -1;
      }
    }
  }

  return objects;
}

function tryParseJudgeJson(candidate: string): JudgeGradingResult | null {
  try {
    const parsed = JSON.parse(candidate) as { score?: unknown; rationale?: unknown };
    const score = parseScoreValue(parsed.score);
    if (score === null) {
      return null;
    }
    return {
      score,
      rationale: typeof parsed.rationale === "string" ? parsed.rationale : "Judge provided score.",
      method: "judge",
    };
  } catch {
    return null;
  }
}

function normalizeJudgeGradingRawText(raw: string): string {
  return raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

/** Return the best JSON-bearing substring for judge parsing, or empty when none found. */
export function extractJudgeGradingJsonText(raw: string): string {
  const withoutFences = normalizeJudgeGradingRawText(raw);
  if (!withoutFences) {
    return "";
  }
  if (tryParseJudgeJson(withoutFences)) {
    return withoutFences;
  }
  const jsonCandidates = extractBalancedJsonObjects(withoutFences);
  for (let index = jsonCandidates.length - 1; index >= 0; index -= 1) {
    const candidate = jsonCandidates[index] ?? "";
    if (tryParseJudgeJson(candidate)) {
      return candidate;
    }
  }
  if (/"score"\s*:/.test(withoutFences)) {
    return withoutFences;
  }
  return "";
}

export function parseJudgeGradingResponse(raw: string): JudgeGradingResult | null {
  const withoutFences = normalizeJudgeGradingRawText(raw);
  if (!withoutFences) {
    return null;
  }

  const direct = tryParseJudgeJson(withoutFences);
  if (direct) {
    return direct;
  }

  const jsonCandidates = extractBalancedJsonObjects(withoutFences);
  for (let index = jsonCandidates.length - 1; index >= 0; index -= 1) {
    const parsed = tryParseJudgeJson(jsonCandidates[index] ?? "");
    if (parsed) {
      return parsed;
    }
  }

  const scoreMatch = withoutFences.match(/"score"\s*:\s*([0-9.]+)/i);
  if (scoreMatch) {
    const score = parseScoreValue(scoreMatch[1]);
    if (score !== null) {
      const rationaleMatch = withoutFences.match(/"rationale"\s*:\s*"([^"]*)"/i);
      return {
        score,
        rationale: rationaleMatch?.[1] ?? "Judge provided score.",
        method: "judge",
      };
    }
  }

  return null;
}

export interface CompareGradingInput {
  readonly caseId: string;
  readonly briefing?: JudgeGradingBriefInput;
  readonly gradingCriteria?: string;
  readonly answerFormatInstruction?: string;
  readonly models: readonly {
    readonly endpointId: string;
    readonly deliverable: string;
    readonly perCaseScore: number;
  }[];
}

export interface CompareGradingResult {
  readonly relativeRanking: readonly string[];
  readonly rationale: string;
}

export function buildCompareGradingPrompt(input: CompareGradingInput): string {
  const modelLines = input.models.map((model) =>
    [
      `Endpoint: ${model.endpointId}`,
      `Per-case score: ${model.perCaseScore}`,
      `Deliverable: ${model.deliverable}`,
    ].join("\n"),
  );

  const preamble = [
    "You compare benchmark responses from multiple models for the same case.",
    "Return JSON only with keys: relativeRanking (string array of endpoint ids, best to worst), rationale (string).",
    "Use the endpoint ids exactly as provided.",
    "Rank by substantive correctness against the exemplar and checklist — not tool-name presence alone.",
    "",
    `Case: ${input.caseId}`,
  ];

  if (input.briefing) {
    return [
      ...preamble,
      "",
      "## Original question",
      input.briefing.questionTranscript,
      "",
      "## Example expected answer",
      input.briefing.exemplarAnswer,
      "",
      "## Key deliverables (grade against this checklist)",
      ...input.briefing.deliverablesChecklist,
      "",
      "## MUST NOT",
      ...input.briefing.antiPatterns,
      ...(input.answerFormatInstruction
        ? ["", "## Answer format requirements", input.answerFormatInstruction]
        : []),
      ...(input.gradingCriteria
        ? ["", "## Grading criteria (authoritative)", input.gradingCriteria]
        : []),
      "",
      "## Model deliverables",
      ...modelLines,
    ].join("\n");
  }

  return [...preamble, "", ...modelLines].join("\n");
}

function tryParseCompareJson(candidate: string): CompareGradingResult | null {
  try {
    const parsed = JSON.parse(candidate) as {
      relativeRanking?: unknown;
      rationale?: unknown;
    };
    if (!Array.isArray(parsed.relativeRanking)) {
      return null;
    }
    const relativeRanking = parsed.relativeRanking.filter(
      (entry): entry is string => typeof entry === "string" && entry.length > 0,
    );
    if (relativeRanking.length === 0) {
      return null;
    }
    return {
      relativeRanking,
      rationale:
        typeof parsed.rationale === "string" ? parsed.rationale : "Compare ranking provided.",
    };
  } catch {
    return null;
  }
}

/** Return the best JSON-bearing substring for compare parsing, or empty when none found. */
export function extractCompareGradingJsonText(raw: string): string {
  const withoutFences = normalizeJudgeGradingRawText(raw);
  if (!withoutFences) {
    return "";
  }
  if (tryParseCompareJson(withoutFences)) {
    return withoutFences;
  }
  const jsonCandidates = extractBalancedJsonObjects(withoutFences);
  for (let index = jsonCandidates.length - 1; index >= 0; index -= 1) {
    const candidate = jsonCandidates[index] ?? "";
    if (tryParseCompareJson(candidate)) {
      return candidate;
    }
  }
  if (/"relativeRanking"\s*:/.test(withoutFences)) {
    return withoutFences;
  }
  return "";
}

export function parseCompareGradingResponse(raw: string): CompareGradingResult | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  const withoutFences = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const direct = tryParseCompareJson(withoutFences);
  if (direct) {
    return direct;
  }

  const jsonCandidates = extractBalancedJsonObjects(withoutFences);
  for (let index = jsonCandidates.length - 1; index >= 0; index -= 1) {
    const parsed = tryParseCompareJson(jsonCandidates[index] ?? "");
    if (parsed) {
      return parsed;
    }
  }

  return null;
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

export function gradeResponseHeuristically(input: JudgeGradingInput): JudgeGradingResult {
  const actual = input.actualResponse.trim();
  const expected = input.expectedResponse.trim();
  if (!actual) {
    return { score: 0, rationale: "Empty response.", method: "heuristic" };
  }

  if (expected && actual.toLowerCase() === expected.toLowerCase()) {
    return { score: 1, rationale: "Exact match to expected response.", method: "heuristic" };
  }

  if (input.acceptPatterns?.length) {
    for (const pattern of input.acceptPatterns) {
      try {
        if (new RegExp(pattern, "i").test(actual)) {
          return {
            score: 0.5,
            rationale: `Keyword/pattern overlap (${pattern}); judge confirmation required for full credit.`,
            method: "heuristic",
          };
        }
      } catch {
        // ignore invalid pattern
      }
    }
  }

  if (expected && actual.toLowerCase().includes(expected.toLowerCase())) {
    return {
      score: 0.85,
      rationale: "Response contains expected content.",
      method: "heuristic",
    };
  }

  const wordOverlap = tokenOverlap(actual, expected);
  if (wordOverlap >= 0.5) {
    return {
      score: 0.5 + wordOverlap * 0.3,
      rationale: `Partial overlap with expected response (${Math.round(wordOverlap * 100)}%).`,
      method: "heuristic",
    };
  }

  return {
    score: 0.25,
    rationale: "Response did not match expected shape; judge review recommended.",
    method: "heuristic",
  };
}

function tokenOverlap(left: string, right: string): number {
  const leftTokens = new Set(left.toLowerCase().split(/\s+/).filter(Boolean));
  const rightTokens = right.toLowerCase().split(/\s+/).filter(Boolean);
  if (leftTokens.size === 0 || rightTokens.length === 0) {
    return 0;
  }
  let hits = 0;
  for (const token of rightTokens) {
    if (leftTokens.has(token)) {
      hits += 1;
    }
  }
  return hits / rightTokens.length;
}
