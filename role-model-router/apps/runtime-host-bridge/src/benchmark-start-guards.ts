export interface BenchmarkStartGuardInput {
  readonly endpointIds?: readonly string[];
  readonly judgeEndpointId?: string;
  readonly useJudge?: boolean;
}

export interface BenchmarkStartGuardResult {
  readonly allowed: boolean;
  readonly warnings: readonly string[];
  readonly judgeSubjectOverlap: boolean;
  readonly compareExpected: boolean;
}

export const INSUFFICIENT_SUBJECTS_WARNING =
  "insufficient_subjects_for_compare: endpointIds.length < 2; compare phase will be skipped";

export const JUDGE_SUBJECT_OVERLAP_WARNING =
  "judge_subject_overlap: judge endpoint is also a benchmark subject; judge exhaustion risk";

export function selectPreferredJudgeEndpoint(input: {
  readonly endpointIds: readonly string[];
  readonly endpoints: readonly { readonly endpointId: string; readonly modelId: string }[];
}): string | null {
  const nonSubjects = input.endpoints.filter(
    (endpoint) => !input.endpointIds.includes(endpoint.endpointId),
  );
  if (nonSubjects.length > 0) {
    return nonSubjects[0]?.endpointId ?? null;
  }
  const overlapSubjects = input.endpoints.filter((endpoint) =>
    input.endpointIds.includes(endpoint.endpointId),
  );
  // Prefer the more capable remote judge when overlap is unavoidable: grade weaker
  // subjects first, then accept self-grade overlap risk on the judge model last.
  const remoteJudge = overlapSubjects.find((endpoint) =>
    /kimi|moonshot|claude|gpt|gemini/i.test(endpoint.modelId),
  );
  if (remoteJudge) {
    return remoteJudge.endpointId;
  }
  return overlapSubjects[0]?.endpointId ?? input.endpointIds[0] ?? null;
}

export function evaluateBenchmarkStartGuards(
  input: BenchmarkStartGuardInput,
): BenchmarkStartGuardResult {
  const useJudge = input.useJudge !== false;
  const explicitSubjectCount = input.endpointIds?.length ?? 0;
  const compareExpected = useJudge && (explicitSubjectCount === 0 || explicitSubjectCount >= 2);

  const warnings: string[] = [];
  let allowed = true;

  if (useJudge && explicitSubjectCount > 0 && explicitSubjectCount < 2) {
    allowed = false;
    warnings.push(INSUFFICIENT_SUBJECTS_WARNING);
  }

  const judgeSubjectOverlap = Boolean(
    input.judgeEndpointId && input.endpointIds?.includes(input.judgeEndpointId),
  );
  if (judgeSubjectOverlap) {
    warnings.push(JUDGE_SUBJECT_OVERLAP_WARNING);
  }

  return {
    allowed,
    warnings,
    judgeSubjectOverlap,
    compareExpected,
  };
}
