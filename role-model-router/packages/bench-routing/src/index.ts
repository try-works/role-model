import routingCapabilitySuite from "../data/routing-capability-suite.json" with { type: "json" };

import {
  type JudgeGradingInput,
  type JudgeGradingResult,
  buildCompareGradingPrompt,
  buildJudgeGradingPrompt,
  gradeResponseHeuristically,
  judgeAverage,
  parseJudgeGradingResponse,
} from "@role-model-router/bench-judge";

import {
  buildJudgeDeliverablesChecklist,
  buildJudgeGradingBrief,
  formatQuestionTranscript,
  resolveExemplarAnswer,
} from "./judge-brief.js";

import {
  capJudgeScoreForInvalidDeliverable,
  deliverableHasInvalidPatch,
  isPlaceholderUnifiedDiff,
} from "./diff-validator.js";

import {
  type BenchmarkAnswerFormat,
  augmentCaseMessages,
  buildAnswerFormatInstruction,
  buildScaffoldFollowUp,
  buildTextDeliverableResponseFormat,
  deliverableCompleteness,
  extractFormattedAnswer,
  isValidDeliverable,
  resolveAnswerFormat,
  shouldOmitToolsForTurn,
} from "./answer-format.js";

export type BenchmarkDifficultyBucket = "easy" | "medium" | "hard";

export interface RoutingBenchmarkCase {
  readonly case_id: string;
  readonly category: string;
  readonly difficulty_bucket: BenchmarkDifficultyBucket;
  readonly benchmark_eligible: boolean;
  readonly capability_targets: readonly string[];
  readonly messages: readonly Record<string, unknown>[];
  readonly tools?: readonly Record<string, unknown>[];
  readonly max_tokens?: number;
  readonly expected_response: string;
  readonly grading_criteria: string;
  readonly accept_patterns?: readonly string[];
  readonly quick_benchmark?: boolean;
  readonly required_tool_call?: boolean;
  readonly expected_tool_names?: readonly string[];
  readonly answer_format?: BenchmarkAnswerFormat;
  readonly example_deliverable?: string;
  readonly taxonomy_tags?: {
    readonly roleId: string;
    readonly taskType: string;
    readonly requiredCapabilities?: readonly string[];
    readonly preferredCapabilities?: readonly string[];
    readonly requiredModalities?: readonly string[];
    readonly toolClasses?: readonly string[];
  };
  readonly judge_guidance?: {
    readonly exemplar?: { readonly summary?: string; readonly deliverable?: string };
  };
}

export interface RoutingCapabilityBenchmarkSuite {
  readonly suite_id: string;
  readonly suite_version: string;
  readonly description: string;
  readonly task_type: string;
  readonly capability_targets: readonly string[];
  readonly cases: readonly RoutingBenchmarkCase[];
}

const CATEGORY_DIFFICULTY: Record<string, BenchmarkDifficultyBucket> = {
  "easy-trivial": "easy",
  "easy-short": "easy",
  "medium-qa": "medium",
  "long-context": "medium",
  "code-burden": "medium",
  "tools-light": "medium",
  "tools-heavy": "hard",
  decomposition: "medium",
  "max-signal": "hard",
  "exact-model": "easy",
  "cache-probe": "easy",
  "multi-step": "hard",
  "code-implementation": "hard",
};

/** Cap partial heuristic credit when judge was enabled but unavailable (avoids 0.5 pattern inflation). */
export const JUDGE_UNAVAILABLE_HEURISTIC_CAP = 0.25;

const CATEGORY_CAPABILITIES: Record<string, readonly string[]> = {
  "easy-trivial": ["instruction_following"],
  "easy-short": ["instruction_following", "general_knowledge"],
  "medium-qa": ["explanation", "reasoning"],
  "long-context": ["long_context", "summarization"],
  "code-burden": ["code_generation", "debugging"],
  "tools-light": ["tool_calling"],
  "tools-heavy": ["tool_calling", "agentic_workflow"],
  decomposition: ["planning", "reasoning"],
  "max-signal": ["tool_calling", "code_generation", "planning"],
  "exact-model": ["instruction_following"],
  "cache-probe": ["instruction_following"],
};

export function mapCategoryToDifficultyBucket(category: string): BenchmarkDifficultyBucket {
  return CATEGORY_DIFFICULTY[category] ?? "medium";
}

export function loadRoutingCapabilitySuite(): RoutingCapabilityBenchmarkSuite {
  return routingCapabilitySuite as RoutingCapabilityBenchmarkSuite;
}

export function selectBenchmarkCases(
  suite: RoutingCapabilityBenchmarkSuite,
  input: { readonly mode?: "quick" | "full"; readonly caseIds?: readonly string[] },
): readonly RoutingBenchmarkCase[] {
  if (input.caseIds?.length) {
    const wanted = new Set(input.caseIds);
    return suite.cases.filter((item) => wanted.has(item.case_id) && item.benchmark_eligible);
  }
  if (input.mode === "quick") {
    return suite.cases.filter((item) => item.benchmark_eligible && item.quick_benchmark === true);
  }
  return suite.cases.filter((item) => item.benchmark_eligible);
}

export function summarizePrompt(caseItem: RoutingBenchmarkCase): string {
  const lastUser = [...caseItem.messages].reverse().find((message) => message.role === "user");
  const content = typeof lastUser?.content === "string" ? lastUser.content : "";
  return content.length > 240 ? `${content.slice(0, 240)}…` : content;
}

function gradeRequiredToolCalls(
  caseItem: RoutingBenchmarkCase,
  structuredToolNames: readonly string[],
): JudgeGradingResult | null {
  if (!caseItem.required_tool_call && !caseItem.expected_tool_names?.length) {
    return null;
  }
  const found = [...new Set(structuredToolNames)];
  if (caseItem.required_tool_call && found.length === 0) {
    return {
      score: 0,
      rationale: "Required tool call missing from model output.",
      method: "heuristic",
    };
  }
  const expected = caseItem.expected_tool_names ?? [];
  if (expected.length === 0) {
    return {
      score: found.length > 0 ? 1 : 0,
      rationale: found.length > 0 ? "Tool call emitted." : "No tool call emitted.",
      method: "heuristic",
    };
  }
  const missing = expected.filter((name) => !found.includes(name));
  if (missing.length === 0) {
    return {
      score: 1,
      rationale: `Required tool calls present: ${expected.join(", ")}.`,
      method: "heuristic",
    };
  }
  const matched = expected.length - missing.length;
  return {
    score: Math.max(0.15, matched / expected.length),
    rationale: `Missing required tool calls: ${missing.join(", ")}.`,
    method: "heuristic",
  };
}

export const JUDGE_GRADING_SYSTEM_PROMPT =
  'You grade benchmark responses. Output ONLY one JSON object on a single line: {"score":0.0,"rationale":"..."}. No chain-of-thought, no markdown fences, no prose before or after the JSON. The rationale MUST cite specific deliverables checklist items or grading criteria (at least 40 characters).';

export const JUDGE_SELF_GRADE_STRICT_ADDENDUM =
  "STRICT SELF-GRADE: the subject model produced this deliverable. Apply the checklist literally — placeholder diffs, stub patches, missing tool calls, and reasoning-only prose score 0. Do not award partial credit for format alone.";

export const COMPARE_GRADING_SYSTEM_PROMPT =
  'You compare benchmark responses. Output ONLY one JSON object: {"relativeRanking":["endpoint-id"],"rationale":"..."}. No chain-of-thought or markdown.';

function gradeBenchmarkCaseHeuristic(input: {
  readonly caseItem: RoutingBenchmarkCase;
  readonly actualResponse: string;
  readonly structuredToolNames?: readonly string[];
}): JudgeGradingResult {
  const toolGrade = gradeRequiredToolCalls(input.caseItem, input.structuredToolNames ?? []);
  const gradingInput: JudgeGradingInput = {
    caseId: input.caseItem.case_id,
    promptSummary: summarizePrompt(input.caseItem),
    expectedResponse: input.caseItem.expected_response,
    gradingCriteria: input.caseItem.grading_criteria,
    actualResponse: input.actualResponse,
    acceptPatterns: input.caseItem.accept_patterns,
    structuredToolNames: input.structuredToolNames,
    requiredToolNames: input.caseItem.expected_tool_names,
    requiredToolCall: input.caseItem.required_tool_call,
  };
  const contentGrade = gradeResponseHeuristically(gradingInput);
  if (!toolGrade) {
    return contentGrade;
  }
  if (input.caseItem.required_tool_call) {
    return {
      score: Math.min(contentGrade.score, toolGrade.score),
      rationale: `${toolGrade.rationale} ${contentGrade.rationale}`.trim(),
      method: "heuristic",
    };
  }
  if (toolGrade.score < 1) {
    return {
      score: Math.min(contentGrade.score, Math.max(toolGrade.score, contentGrade.score * 0.85)),
      rationale: `${toolGrade.rationale} ${contentGrade.rationale}`.trim(),
      method: "heuristic",
    };
  }
  return contentGrade;
}

function tryParseDeliverableJson(deliverable: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(deliverable) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function readNormalizedBinaryAnswer(
  caseItem: RoutingBenchmarkCase,
  deliverable: string,
): string | null {
  const expected = caseItem.expected_response.trim().toLowerCase();
  if (!["yes", "no", "true", "false"].includes(expected)) {
    return null;
  }

  const parsed = tryParseDeliverableJson(deliverable);
  const answer =
    typeof parsed?.answer === "string"
      ? parsed.answer
      : typeof parsed?.value === "string"
        ? parsed.value
        : deliverable;
  const normalized = answer.trim().toLowerCase();
  return normalized === expected ? normalized : null;
}

function readToolCallArguments(
  toolCall: Record<string, unknown> | undefined,
): Record<string, unknown> | null {
  if (!toolCall) {
    return null;
  }
  const argumentsValue = toolCall.arguments;
  if (argumentsValue && typeof argumentsValue === "object") {
    return argumentsValue as Record<string, unknown>;
  }
  if (typeof argumentsValue === "string") {
    try {
      const parsed = JSON.parse(argumentsValue) as unknown;
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
  return null;
}

function readToolCalls(deliverable: Record<string, unknown>): readonly Record<string, unknown>[] {
  const toolCalls = deliverable.tool_calls;
  if (!Array.isArray(toolCalls)) {
    return [];
  }
  return toolCalls.filter(
    (toolCall): toolCall is Record<string, unknown> => !!toolCall && typeof toolCall === "object",
  );
}

function normalizeGroundedToolPath(pathValue: unknown): string | null {
  if (typeof pathValue !== "string") {
    return null;
  }
  return pathValue.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
}

function groundedTruthMismatchDetails(
  caseItem: RoutingBenchmarkCase,
  deliverable: string,
): string[] {
  const parsed = tryParseDeliverableJson(deliverable);
  if (!parsed) {
    return [];
  }
  const toolCalls = readToolCalls(parsed);
  const answer = typeof parsed.answer === "string" ? parsed.answer : "";
  const lowerAnswer = answer.toLowerCase();

  switch (caseItem.case_id) {
    case "p15-tools-read-one":
    case "h08-multi-turn-tool-refine": {
      const hasGroundedReadFile = toolCalls.some((toolCall) => {
        if (toolCall.name !== "read_file") {
          return false;
        }
        const normalizedPath = normalizeGroundedToolPath(readToolCallArguments(toolCall)?.path);
        return (
          normalizedPath === "state/runtime-config.yaml" ||
          normalizedPath?.endsWith("/state/runtime-config.yaml") === true
        );
      });
      if (!hasGroundedReadFile) {
        return ["expected read_file path state/runtime-config.yaml"];
      }
      if (lowerAnswer !== "controller") {
        return ['expected grounded answer "controller"'];
      }
      return [];
    }
    case "t01-tools-list-dir": {
      const inspectedConfigDir = toolCalls.some((toolCall) => {
        if (toolCall.name !== "list_dir") {
          return false;
        }
        const normalizedPath = normalizeGroundedToolPath(readToolCallArguments(toolCall)?.path);
        return normalizedPath === "config" || normalizedPath?.endsWith("/config") === true;
      });
      if (!inspectedConfigDir) {
        return ["expected list_dir path config"];
      }
      if (!lowerAnswer.includes("router.yaml") || !lowerAnswer.includes("routing-policy.json")) {
        return ["expected answer grounded in router.yaml and routing-policy.json"];
      }
      return [];
    }
    case "p18-tools-agent": {
      const hasListEndpoints = toolCalls.some((toolCall) => toolCall.name === "list_endpoints");
      if (!hasListEndpoints) {
        return ["expected list_endpoints call before routing recommendation"];
      }
      const metricEndpointIds = [
        ...new Set(
          toolCalls
            .filter((toolCall) => toolCall.name === "get_metrics")
            .map((toolCall) => readToolCallArguments(toolCall)?.endpoint_id)
            .filter((value): value is string => typeof value === "string" && value.length > 0),
        ),
      ];
      if (metricEndpointIds.length < 2) {
        return ["expected get_metrics calls for both endpoints used in the comparison"];
      }
      return [];
    }
    case "h09-agent-metrics-chain": {
      const hasListEndpoints = toolCalls.some((toolCall) => toolCall.name === "list_endpoints");
      if (!hasListEndpoints) {
        return ["expected list_endpoints call before latency comparison"];
      }
      const metricEndpointIds = [
        ...new Set(
          toolCalls
            .filter((toolCall) => toolCall.name === "get_metrics")
            .map((toolCall) => readToolCallArguments(toolCall)?.endpoint_id)
            .filter((value): value is string => typeof value === "string" && value.length > 0),
        ),
      ];
      if (
        !metricEndpointIds.includes("local.lfm2.5-8b-a1b") ||
        !metricEndpointIds.includes("remote.deepseek-v4-flash")
      ) {
        return [
          "expected get_metrics calls for both local.lfm2.5-8b-a1b and remote.deepseek-v4-flash",
        ];
      }
      if (/not available|unavailable|unknown|missing/i.test(answer)) {
        return [
          "expected explicit remote-vs-local latency comparison, not an unavailable-data answer",
        ];
      }
      const lowerAnswerText = answer.toLowerCase();
      const mentionsBothSides =
        lowerAnswerText.includes("local") && lowerAnswerText.includes("remote");
      const comparisonConnector =
        lowerAnswerText.includes(" than ") ||
        lowerAnswerText.includes(" versus ") ||
        lowerAnswerText.includes(" vs ") ||
        lowerAnswerText.includes(" compared ");
      const localBetter =
        mentionsBothSides &&
        (lowerAnswerText.includes("lower") ||
          lowerAnswerText.includes("less") ||
          lowerAnswerText.includes("faster") ||
          lowerAnswerText.includes("smaller") ||
          lowerAnswerText.includes("better")) &&
        comparisonConnector;
      const remoteWorse =
        mentionsBothSides &&
        (lowerAnswerText.includes("higher") ||
          lowerAnswerText.includes("greater") ||
          lowerAnswerText.includes("slower") ||
          lowerAnswerText.includes("worse")) &&
        comparisonConnector;
      const numericComparison =
        lowerAnswerText.includes("62") && lowerAnswerText.includes("245") && comparisonConnector;
      const comparesLocalLower = localBetter || remoteWorse || numericComparison;
      if (!comparesLocalLower) {
        return [
          "expected grounded comparison that local.lfm2.5-8b-a1b has lower p95 latency than remote.deepseek-v4-flash",
        ];
      }
      return [];
    }
    default:
      return [];
  }
}

export function capJudgeScoreForGroundedTruthMismatch(input: {
  readonly caseItem: RoutingBenchmarkCase;
  readonly score: number;
  readonly rationale: string;
  readonly deliverable: string;
}): { readonly score: number; readonly rationale: string } {
  const mismatches = groundedTruthMismatchDetails(input.caseItem, input.deliverable);
  if (mismatches.length === 0) {
    return {
      score: input.score,
      rationale: input.rationale,
    };
  }
  return {
    score: 0,
    rationale: `[grounded_truth_mismatch] ${mismatches.join("; ")}. ${input.rationale}`.trim(),
  };
}

export function gradeBenchmarkCase(input: {
  readonly caseItem: RoutingBenchmarkCase;
  readonly actualResponse: string;
  readonly structuredToolNames?: readonly string[];
  readonly judgeGrade?: JudgeGradingResult | null;
  readonly requireJudge?: boolean;
  readonly judgeUnavailable?: boolean;
}): JudgeGradingResult {
  if (input.requireJudge) {
    if (!input.judgeGrade || input.judgeGrade.method !== "judge") {
      return {
        score: 0,
        rationale: input.judgeGrade?.rationale ?? "Judge grading unavailable.",
        method: "judge",
      };
    }
    const normalizedBinaryAnswer = readNormalizedBinaryAnswer(input.caseItem, input.actualResponse);
    if (normalizedBinaryAnswer) {
      return {
        ...input.judgeGrade,
        score: 1,
        rationale: `[case_normalized_exact_match] Accepted ${normalizedBinaryAnswer} after case-insensitive normalization.`,
      };
    }
    const capped = capJudgeScoreForGroundedTruthMismatch({
      caseItem: input.caseItem,
      score: input.judgeGrade.score,
      rationale: input.judgeGrade.rationale,
      deliverable: input.actualResponse,
    });
    return {
      ...input.judgeGrade,
      score: capped.score,
      rationale: capped.rationale,
    };
  }

  const heuristic = gradeBenchmarkCaseHeuristic(input);
  const grounded = capJudgeScoreForGroundedTruthMismatch({
    caseItem: input.caseItem,
    score: heuristic.score,
    rationale: heuristic.rationale,
    deliverable: input.actualResponse,
  });
  const cappedHeuristic = {
    ...heuristic,
    score: grounded.score,
    rationale: grounded.rationale,
  };
  if (input.judgeUnavailable) {
    const cappedScore =
      cappedHeuristic.score >= 1
        ? cappedHeuristic.score
        : Math.min(cappedHeuristic.score, JUDGE_UNAVAILABLE_HEURISTIC_CAP);
    return {
      ...cappedHeuristic,
      score: cappedScore,
      rationale: `[judge_unavailable] Heuristic fallback: ${cappedHeuristic.rationale}`,
      method: "heuristic",
    };
  }
  return cappedHeuristic;
}

export function buildJudgeRequestMessages(
  caseItem: RoutingBenchmarkCase,
  actualResponse: string,
  structuredToolNames: readonly string[] = [],
  options?: { readonly strictSelfGrade?: boolean },
) {
  const briefing = buildJudgeGradingBrief(caseItem);
  const systemPrompt = options?.strictSelfGrade
    ? `${JUDGE_GRADING_SYSTEM_PROMPT}\n${JUDGE_SELF_GRADE_STRICT_ADDENDUM}`
    : JUDGE_GRADING_SYSTEM_PROMPT;
  return [
    {
      role: "system" as const,
      content: systemPrompt,
    },
    {
      role: "user" as const,
      content: buildJudgeGradingPrompt({
        caseId: caseItem.case_id,
        expectedResponse: caseItem.expected_response,
        gradingCriteria: caseItem.grading_criteria,
        actualResponse,
        formattedDeliverable: actualResponse,
        answerFormatInstruction: briefing.answerFormatInstruction,
        acceptPatterns: caseItem.accept_patterns,
        requiredToolCall: caseItem.required_tool_call,
        requiredToolNames: caseItem.expected_tool_names,
        structuredToolNames,
        briefing: {
          questionTranscript: briefing.questionTranscript,
          exemplarAnswer: briefing.exemplarAnswer,
          exemplarQuality: briefing.exemplarQuality,
          deliverablesChecklist: briefing.deliverablesChecklist,
          antiPatterns: briefing.antiPatterns,
        },
      }),
    },
  ];
}

export function buildHeuristicCompareRanking(
  models: readonly {
    readonly endpointId: string;
    readonly perCaseScore: number;
  }[],
): { readonly relativeRanking: readonly string[]; readonly rationale: string } {
  const sorted = [...models].sort((left, right) => {
    if (right.perCaseScore !== left.perCaseScore) {
      return right.perCaseScore - left.perCaseScore;
    }
    return left.endpointId.localeCompare(right.endpointId);
  });
  const scoreSummary = sorted
    .map((model) => `${model.endpointId}=${model.perCaseScore}`)
    .join(", ");
  return {
    relativeRanking: sorted.map((model) => model.endpointId),
    rationale: `[compare_unavailable] Heuristic fallback: ranked by per-case scores (${scoreSummary}).`,
  };
}

export function buildCompareRequestMessages(
  caseItem: RoutingBenchmarkCase,
  models: readonly {
    readonly endpointId: string;
    readonly deliverable: string;
    readonly perCaseScore: number;
  }[],
) {
  const briefing = buildJudgeGradingBrief(caseItem);
  return [
    {
      role: "system" as const,
      content: COMPARE_GRADING_SYSTEM_PROMPT,
    },
    {
      role: "user" as const,
      content: buildCompareGradingPrompt({
        caseId: caseItem.case_id,
        briefing: {
          questionTranscript: briefing.questionTranscript,
          exemplarAnswer: briefing.exemplarAnswer,
          exemplarQuality: briefing.exemplarQuality,
          deliverablesChecklist: briefing.deliverablesChecklist,
          antiPatterns: briefing.antiPatterns,
        },
        gradingCriteria: briefing.gradingCriteria,
        answerFormatInstruction: briefing.answerFormatInstruction,
        models,
      }),
    },
  ];
}

export interface BenchmarkEndpointGrade {
  readonly endpointId: string;
  readonly modelId: string;
  readonly sourceType: string | null;
  readonly overallScore: number;
  readonly byDifficulty: Record<
    BenchmarkDifficultyBucket,
    { readonly score: number; readonly cases: number }
  >;
  readonly caseResults: readonly {
    readonly caseId: string;
    readonly difficultyBucket: BenchmarkDifficultyBucket;
    readonly score: number;
    readonly rationale: string;
    readonly gradingMethod: string;
    readonly latencyMs: number;
    readonly actualPreview: string;
    readonly parseSuccess?: boolean;
    readonly judgeError?: string | null;
    readonly judgeUnavailable?: boolean;
    readonly cappedByValidator?: boolean;
  }[];
}

export function summarizeEndpointGrade(
  endpointId: string,
  modelId: string,
  sourceType: string | null,
  caseResults: BenchmarkEndpointGrade["caseResults"],
): BenchmarkEndpointGrade {
  const byDifficulty: BenchmarkEndpointGrade["byDifficulty"] = {
    easy: { score: 0, cases: 0 },
    medium: { score: 0, cases: 0 },
    hard: { score: 0, cases: 0 },
  };
  const buckets: Record<BenchmarkDifficultyBucket, number[]> = {
    easy: [],
    medium: [],
    hard: [],
  };
  for (const result of caseResults) {
    buckets[result.difficultyBucket].push(result.score);
  }
  for (const bucket of Object.keys(buckets) as BenchmarkDifficultyBucket[]) {
    const scores = buckets[bucket];
    byDifficulty[bucket] = {
      cases: scores.length,
      score: judgeAverage(scores),
    };
  }
  return {
    endpointId,
    modelId,
    sourceType,
    overallScore: judgeAverage(caseResults.map((item) => item.score)),
    byDifficulty,
    caseResults,
  };
}

export {
  augmentCaseMessages,
  BENCHMARK_SUBJECT_SYSTEM_PROMPT,
  buildAnswerFormatInstruction,
  buildScaffoldFollowUp,
  deliverableCompleteness,
  extractFormattedAnswer,
  isValidDeliverable,
  resolveAnswerFormat,
  shouldOmitToolsForTurn,
  buildTextDeliverableResponseFormat,
  type AnswerFormatCaseRef,
  type BenchmarkAnswerFormat,
  type ExtractedBenchmarkAnswer,
} from "./answer-format.js";

export {
  buildJudgeGradingPrompt,
  buildCompareGradingPrompt,
  gradeResponseHeuristically,
  judgeAverage,
  parseJudgeGradingResponse,
};

export {
  buildJudgeDeliverablesChecklist,
  buildJudgeGradingBrief,
  formatQuestionTranscript,
  resolveExemplarAnswer,
  type JudgeGradingBrief,
  type JudgeBriefCaseRef,
} from "./judge-brief.js";

export {
  capJudgeScoreForInvalidDeliverable,
  deliverableHasInvalidPatch,
  isPlaceholderUnifiedDiff,
} from "./diff-validator.js";
