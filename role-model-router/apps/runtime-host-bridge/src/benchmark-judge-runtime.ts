import type { BenchmarkChatCompletionsExecutionResult } from "./benchmark-reasoning.js";

export const JUDGE_CIRCUIT_FAILURE_THRESHOLD = 3;
export const JUDGE_CIRCUIT_BACKOFF_MS = 30_000;
export const JUDGE_ADAPTIVE_LATENCY_RATIO = 0.1;

const isVitest = process.env.VITEST === "true";
export const JUDGE_MIN_INTERVAL_MS = isVitest ? 0 : 2_000;

let lastJudgeRequestAtMs = 0;
let lastSuccessfulJudgeLatencyMs = 0;
let consecutiveJudgeFailures = 0;
let judgeCircuitOpenUntilMs = 0;
let judgeSubjectOverlapMode = false;

export const JUDGE_OVERLAP_THROTTLE_MULTIPLIER = 2;
export const JUDGE_OVERLAP_CIRCUIT_BACKOFF_MS = 45_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function resetBenchmarkJudgeRuntimeForTests(): void {
  lastJudgeRequestAtMs = 0;
  lastSuccessfulJudgeLatencyMs = 0;
  consecutiveJudgeFailures = 0;
  judgeCircuitOpenUntilMs = 0;
  judgeSubjectOverlapMode = false;
}

export function setJudgeSubjectOverlapMode(overlap: boolean): void {
  judgeSubjectOverlapMode = overlap;
}

export function isJudgeSubjectOverlapMode(): boolean {
  return judgeSubjectOverlapMode;
}

export function computeAdaptiveThrottleMs(): number {
  const adaptive = Math.round(lastSuccessfulJudgeLatencyMs * JUDGE_ADAPTIVE_LATENCY_RATIO);
  const base = Math.max(JUDGE_MIN_INTERVAL_MS, adaptive);
  return judgeSubjectOverlapMode ? Math.round(base * JUDGE_OVERLAP_THROTTLE_MULTIPLIER) : base;
}

export function isJudgeCircuitOpen(nowMs: number = Date.now()): boolean {
  return judgeCircuitOpenUntilMs > nowMs;
}

export function recordJudgeCallOutcome(input: {
  readonly success: boolean;
  readonly latencyMs: number;
  readonly nowMs?: number;
}): { readonly circuitOpen: boolean } {
  const nowMs = input.nowMs ?? Date.now();
  if (input.success) {
    consecutiveJudgeFailures = 0;
    judgeCircuitOpenUntilMs = 0;
    if (input.latencyMs > 0) {
      lastSuccessfulJudgeLatencyMs = input.latencyMs;
    }
    return { circuitOpen: false };
  }

  consecutiveJudgeFailures += 1;
  if (consecutiveJudgeFailures >= JUDGE_CIRCUIT_FAILURE_THRESHOLD) {
    const backoffMs = judgeSubjectOverlapMode
      ? JUDGE_OVERLAP_CIRCUIT_BACKOFF_MS
      : JUDGE_CIRCUIT_BACKOFF_MS;
    judgeCircuitOpenUntilMs = nowMs + backoffMs;
    consecutiveJudgeFailures = 0;
    return { circuitOpen: true };
  }
  return { circuitOpen: false };
}

export async function awaitJudgeThrottle(): Promise<void> {
  const now = Date.now();
  if (judgeCircuitOpenUntilMs > now) {
    await sleep(judgeCircuitOpenUntilMs - now);
  }
  const throttleMs = computeAdaptiveThrottleMs();
  const waitMs = Math.max(0, throttleMs - (Date.now() - lastJudgeRequestAtMs));
  if (waitMs > 0) {
    await sleep(waitMs);
  }
  lastJudgeRequestAtMs = Date.now();
}

export function describeResponseChannels(
  result: BenchmarkChatCompletionsExecutionResult,
): {
  readonly hasContentText: boolean;
  readonly hasReasoningText: boolean;
  readonly hasOutputText: boolean;
  readonly hasToolCalls: boolean;
  readonly contentLength: number;
  readonly reasoningLength: number;
} {
  const contentText = result.contentText?.trim() ?? "";
  const reasoningText = result.reasoningText?.trim() ?? "";
  const outputText = result.outputText?.trim() ?? "";
  return {
    hasContentText: contentText.length > 0,
    hasReasoningText: reasoningText.length > 0,
    hasOutputText: outputText.length > 0,
    hasToolCalls: (result.toolCalls?.length ?? 0) > 0,
    contentLength: contentText.length,
    reasoningLength: reasoningText.length,
  };
}
