import {
  extractCompareGradingJsonText,
  extractJudgeGradingJsonText,
} from "@role-model-router/bench-judge";
import {
  buildAnswerFormatInstruction,
  type AnswerFormatCaseRef,
} from "@role-model-router/bench-routing";

export interface BenchmarkChatCompletionsExecutionResult {
  readonly outputText?: string;
  readonly contentText?: string;
  readonly reasoningText?: string;
  readonly toolCalls?: readonly {
    readonly function: {
      readonly name: string;
      readonly arguments: string;
    };
  }[];
}

export const BENCHMARK_FINAL_ANSWER_PROMPT =
  "Provide your formatted final deliverable now. Output only the required JSON/code format — no reasoning, chain-of-thought, or meta commentary.";

export const BENCHMARK_MAX_ANSWER_TURNS = 6;

const REASONING_PREAMBLE_PATTERNS = [
  /^the user wants\b/i,
  /^the user asked\b/i,
  /^we need to\b/i,
  /^let me\b/i,
  /^i need to\b/i,
  /^i'll\b/i,
  /^i will\b/i,
  /^they want\b/i,
];

export function readBenchmarkContentText(result: BenchmarkChatCompletionsExecutionResult): string {
  return result.contentText?.trim() ?? result.outputText?.trim() ?? "";
}

export function readBenchmarkReasoningText(
  result: BenchmarkChatCompletionsExecutionResult,
): string {
  return result.reasoningText?.trim() ?? "";
}

export function readJudgeResponseText(result: BenchmarkChatCompletionsExecutionResult): string {
  const content = readBenchmarkContentText(result);
  const reasoning = readBenchmarkReasoningText(result);
  if (content && reasoning) {
    return `${reasoning}\n${content}`;
  }
  return content || reasoning;
}

/** Prefer compact content channel for judge parsing; fall back to parseable JSON in reasoning. */
export function readJudgeGradingText(result: BenchmarkChatCompletionsExecutionResult): string {
  for (const candidate of [
    readBenchmarkContentText(result),
    readBenchmarkReasoningText(result),
    readJudgeResponseText(result),
  ]) {
    const extracted = extractJudgeGradingJsonText(candidate);
    if (extracted) {
      return extracted;
    }
  }
  return "";
}

/** Prefer compact content channel for compare parsing; fall back to parseable JSON in reasoning. */
export function readCompareGradingText(result: BenchmarkChatCompletionsExecutionResult): string {
  for (const candidate of [
    readBenchmarkContentText(result),
    readBenchmarkReasoningText(result),
    readJudgeResponseText(result),
  ]) {
    const extracted = extractCompareGradingJsonText(candidate);
    if (extracted) {
      return extracted;
    }
  }
  return "";
}

export function looksLikeReasoningPreamble(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) {
    return false;
  }
  if (!REASONING_PREAMBLE_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return false;
  }
  if (/```[\s\S]+```/.test(trimmed)) {
    return false;
  }
  return trimmed.length >= 120;
}

export function needsFinalAnswerFollowUp(
  result: BenchmarkChatCompletionsExecutionResult,
): boolean {
  if (result.toolCalls?.length) {
    return false;
  }
  const content = readBenchmarkContentText(result);
  const reasoning = readBenchmarkReasoningText(result);
  if (!content && reasoning) {
    return true;
  }
  if (!content) {
    return false;
  }
  return looksLikeReasoningPreamble(content);
}

export function buildFollowUpMessages(
  caseItem: AnswerFormatCaseRef,
  priorMessages: readonly Record<string, unknown>[],
  assistantOutput: string,
): Record<string, unknown>[] {
  return [
    ...priorMessages,
    { role: "assistant", content: assistantOutput },
    {
      role: "user",
      content: `${BENCHMARK_FINAL_ANSWER_PROMPT}\n${buildAnswerFormatInstruction(caseItem)}`,
    },
  ];
}
