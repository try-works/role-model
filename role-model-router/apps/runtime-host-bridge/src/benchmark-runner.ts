import { randomUUID } from "node:crypto";

import path from "node:path";

import {

  type BenchmarkEndpointGrade,

  type RoutingBenchmarkCase,

  augmentCaseMessages,

  buildCompareRequestMessages,

  buildHeuristicCompareRanking,

  buildJudgeGradingBrief,

  buildJudgeRequestMessages,

  JUDGE_GRADING_SYSTEM_PROMPT,

  buildScaffoldFollowUp,

  capJudgeScoreForInvalidDeliverable,

  deliverableCompleteness,

  extractFormattedAnswer,

  gradeBenchmarkCase,

  isValidDeliverable,

  shouldOmitToolsForTurn,

  loadRoutingCapabilitySuite,

  selectBenchmarkCases,

  summarizeEndpointGrade,

} from "@role-model-router/bench-routing";

import {

  JUDGE_JSON_ONLY_FOLLOW_UP,

  extractJudgeGradingJsonText,

  type JudgeGradingResult,

  parseCompareGradingResponse,

  parseJudgeGradingResponse,

} from "@role-model-router/bench-judge";

import type { ObservedPerformanceSample } from "@role-model-router/profile-aggregator";

import { persistObservedBenchmarkSample } from "@role-model-router/sqlite-memory";

import {

  type BenchmarkResponseRecord,

  toBenchmarkArtifactRelativePath,

  writeBenchmarkCompareRecord,

  writeBenchmarkJudgeRecord,

  writeBenchmarkJudgeSummary,

  writeBenchmarkResponseRecord,

  writeBenchmarkRunManifest,

} from "./benchmark-artifacts.js";

import { writeBenchmarkRunResult } from "./benchmark-summary.js";

import {

  completeBenchmarkRunProgress,

  createBenchmarkRunProgress,

  failBenchmarkRunProgress,

  updateBenchmarkRunProgress,

} from "./benchmark-progress.js";

import {

  awaitJudgeThrottle,

  describeResponseChannels,

  isJudgeCircuitOpen,

  recordJudgeCallOutcome,

  resetBenchmarkJudgeRuntimeForTests,

  isJudgeSubjectOverlapMode,

  setJudgeSubjectOverlapMode,

} from "./benchmark-judge-runtime.js";

import { evaluateBenchmarkStartGuards } from "./benchmark-start-guards.js";

import {

  BENCHMARK_MAX_ANSWER_TURNS,

  type BenchmarkChatCompletionsExecutionResult,

  readBenchmarkContentText,

  readBenchmarkReasoningText,

  readCompareGradingText,

  readJudgeGradingText,

} from "./benchmark-reasoning.js";

export { resetBenchmarkJudgeRuntimeForTests };



export type { BenchmarkChatCompletionsExecutionResult };



export interface BenchmarkExecutionRequestOptions {

  readonly endpointId?: string;

}



function formatBenchmarkRawResponse(

  result: BenchmarkChatCompletionsExecutionResult,

): string {

  const chunks: string[] = [];

  const content = readBenchmarkContentText(result);

  if (content) {

    chunks.push(content);

  }

  if (result.toolCalls?.length) {

    for (const toolCall of result.toolCalls) {

      chunks.push(

        `TOOL_CALL name=${toolCall.function.name} args=${toolCall.function.arguments}`,

      );

    }

  }

  return chunks.join("\n");

}



export interface BenchmarkRunRequest {

  readonly runId?: string;

  readonly endpointIds?: readonly string[];

  readonly judgeEndpointId?: string;

  readonly mode?: "quick" | "full";

  readonly caseIds?: readonly string[];

  readonly useJudge?: boolean;

  readonly preflightProbe?: boolean;

}



type BenchmarkEndpointRef = {

  readonly endpointId: string;

  readonly modelId: string;

  readonly sourceType: "local" | "remote";

};

export function orderEndpointsForGrading(
  endpoints: readonly BenchmarkEndpointRef[],
  judgeEndpointId: string,
  options?: { readonly judgeSubjectOverlap?: boolean },
): BenchmarkEndpointRef[] {
  const judgeSubject = endpoints.find((endpoint) => endpoint.endpointId === judgeEndpointId);
  if (!judgeSubject) {
    return [...endpoints];
  }
  const others = endpoints.filter((endpoint) => endpoint.endpointId !== judgeEndpointId);
  if (options?.judgeSubjectOverlap) {
    return [...others, judgeSubject];
  }
  return [judgeSubject, ...others];
}

interface BenchmarkCaseExecution {

  readonly requestId: string;

  readonly actualResponse: string;

  readonly rawResponse: string;

  readonly formattedDeliverable: string;

  readonly extractionMethod: string;

  readonly structuredToolNames: readonly string[];

  readonly latencyMs: number;

  readonly failure: boolean;

  readonly artifactPath: string;

  readonly sourceArtifactPath: string;

  readonly responseRecord: BenchmarkResponseRecord;

  readonly answerTurns: number;

}

interface JudgeGradeOutcome {

  readonly grade: JudgeGradingResult;

  readonly parseSuccess: boolean;

  readonly summaryArtifactPath: string;

  readonly attemptArtifactPaths: readonly string[];

  readonly judgeError?: string | null;

  readonly cappedByValidator?: boolean;

}



function extractStructuredToolNames(

  result: BenchmarkChatCompletionsExecutionResult,

): readonly string[] {

  if (!result.toolCalls?.length) {

    return [];

  }

  return [

    ...new Set(

      result.toolCalls

        .map((toolCall) => toolCall.function.name)

        .filter((name) => name.length > 0),

    ),

  ];

}

type BenchmarkToolCall = NonNullable<BenchmarkChatCompletionsExecutionResult["toolCalls"]>[number];

function mergeBenchmarkToolCalls(
  prior: readonly BenchmarkToolCall[],
  latest: readonly BenchmarkToolCall[] | undefined,
): readonly BenchmarkToolCall[] {
  if (!latest?.length) {
    return prior;
  }
  const merged = new Map<string, BenchmarkToolCall>();
  for (const toolCall of prior) {
    merged.set(toolCall.function.name, toolCall);
  }
  for (const toolCall of latest) {
    merged.set(toolCall.function.name, toolCall);
  }
  return [...merged.values()];
}

function mergeStructuredToolNames(
  prior: readonly string[],
  latest: readonly string[],
): readonly string[] {
  return [...new Set([...prior, ...latest])];
}

function readTurnRawContent(result: BenchmarkChatCompletionsExecutionResult): string {
  return [
    readBenchmarkContentText(result),
    readBenchmarkReasoningText(result),
    formatBenchmarkRawResponse(result),
  ]
    .filter(Boolean)
    .join("\n");
}



export interface BenchmarkRunResult {

  readonly runId: string;

  readonly suiteId: string;

  readonly suiteVersion?: string;

  readonly mode: "quick" | "full";

  readonly judgeEndpointId: string | null;

  readonly startedAtMs: number;

  readonly completedAtMs: number;

  readonly artifactRoot: string;

  readonly endpointGrades: readonly BenchmarkEndpointGrade[];

}



export interface BenchmarkRunnerDependencies {

  readonly databasePath: string;

  readonly benchmarkArtifactRoot?: string;

  readonly listConfiguredEndpoints: () => Promise<

    readonly {

      endpointId: string;

      modelId: string;

      sourceType: "local" | "remote";

      healthStatus: string;

    }[]

  >;

  readonly executeChatCompletions: (

    body: {

      model: string;

      messages: readonly Record<string, unknown>[];

      max_tokens?: number;

      tools?: readonly Record<string, unknown>[];

      response_format?: Record<string, unknown>;

      temperature?: number;

    },

    requestId: string,

    requestOptions?: BenchmarkExecutionRequestOptions,

  ) => Promise<BenchmarkChatCompletionsExecutionResult>;

  readonly deriveEndpointVersion: (endpointId: string) => string;

}



function isHealthyEndpoint(healthStatus: string): boolean {

  return healthStatus !== "policy-blocked" && healthStatus !== "offline";

}



function resolveBenchmarkArtifactRoot(deps: BenchmarkRunnerDependencies): string {

  return deps.benchmarkArtifactRoot ?? path.join(path.dirname(deps.databasePath), "benchmark-runs");

}



async function executeBenchmarkTurn(

  deps: BenchmarkRunnerDependencies,

  endpoint: { endpointId: string; modelId: string },

  caseItem: RoutingBenchmarkCase,

  messages: readonly Record<string, unknown>[],

  requestSuffix: string,

  options?: { readonly omitTools?: boolean },

): Promise<BenchmarkChatCompletionsExecutionResult> {

  const requestId = `bench-${caseItem.case_id}-${endpoint.endpointId}-${requestSuffix}-${randomUUID()}`;

  const omitTools = options?.omitTools === true;

  return deps.executeChatCompletions(

    {

      model: endpoint.modelId,

      messages,

      ...(caseItem.tools && !omitTools ? { tools: caseItem.tools } : {}),

    },

    requestId,

    { endpointId: endpoint.endpointId },

  );

}



async function runCaseOnEndpoint(

  deps: BenchmarkRunnerDependencies,

  endpoint: { endpointId: string; modelId: string },

  caseItem: RoutingBenchmarkCase,

): Promise<{

  actualResponse: string;

  rawResponse: string;

  formattedDeliverable: string;

  extractionMethod: string;

  structuredToolNames: readonly string[];

  latencyMs: number;

  failure: boolean;

  answerTurns: number;

}> {

  const started = Date.now();

  let messages: Record<string, unknown>[] = augmentCaseMessages(caseItem);

  let latestResult: BenchmarkChatCompletionsExecutionResult = { outputText: "" };

  let answerTurns = 0;

  let accumulatedToolCalls: readonly BenchmarkToolCall[] = [];

  let accumulatedToolNames: readonly string[] = [];

  let accumulatedRawContent = "";

  const turnRawContents: string[] = [];

  let bestExtracted: ReturnType<typeof extractFormattedAnswer> | null = null;

  let bestCompleteness = -1;



  try {

    for (let turn = 1; turn <= BENCHMARK_MAX_ANSWER_TURNS; turn += 1) {

      answerTurns = turn;

      latestResult = await executeBenchmarkTurn(

        deps,

        endpoint,

        caseItem,

        messages,

        `turn${turn}`,

        { omitTools: shouldOmitToolsForTurn(caseItem, accumulatedToolNames) },

      );

      const turnToolNames = extractStructuredToolNames(latestResult);

      accumulatedToolCalls = mergeBenchmarkToolCalls(accumulatedToolCalls, latestResult.toolCalls);

      accumulatedToolNames = mergeStructuredToolNames(accumulatedToolNames, turnToolNames);

      const turnRawContent = readTurnRawContent(latestResult);

      accumulatedRawContent = accumulatedRawContent
        ? `${accumulatedRawContent}\n${turnRawContent}`
        : turnRawContent;

      turnRawContents.push(turnRawContent);

      const extracted = extractFormattedAnswer({

        caseItem,

        rawContent: turnRawContent,

        turnRawContents,

        structuredToolNames: accumulatedToolNames,

        toolCalls: accumulatedToolCalls,

      });

      const completeness = deliverableCompleteness({
        caseItem,
        extracted,
        structuredToolNames: accumulatedToolNames,
      });

      if (completeness > bestCompleteness) {
        bestCompleteness = completeness;
        bestExtracted = extracted;
      }

      if (completeness >= 1000) {
        break;
      }

      if (turn >= BENCHMARK_MAX_ANSWER_TURNS) {
        break;
      }

      const assistantOutput =
        readBenchmarkContentText(latestResult) ||
        readBenchmarkReasoningText(latestResult) ||
        latestResult.outputText?.trim() ||
        "";

      messages = buildScaffoldFollowUp(
        caseItem,
        messages,
        assistantOutput,
        accumulatedToolNames,
        extracted,
        latestResult.toolCalls,
      );

    }

    const rawResponse = formatBenchmarkRawResponse(latestResult);

    const extracted =
      bestExtracted ??
      extractFormattedAnswer({

        caseItem,

        rawContent: turnRawContents.at(-1) ?? readTurnRawContent(latestResult),

        turnRawContents,

        structuredToolNames: accumulatedToolNames,

        toolCalls: accumulatedToolCalls,

      });



    return {

      actualResponse: extracted.serialized || rawResponse,

      rawResponse,

      formattedDeliverable: extracted.serialized,

      extractionMethod: extracted.extractionMethod,

      structuredToolNames: accumulatedToolNames,

      latencyMs: Date.now() - started,

      failure: false,

      answerTurns,

    };

  } catch {

    return {

      actualResponse: "",

      rawResponse: "",

      formattedDeliverable: "",

      extractionMethod: "missing",

      structuredToolNames: [],

      latencyMs: Date.now() - started,

      failure: true,

      answerTurns,

    };

  }

}



const JUDGE_RESPONSE_FORMAT = {

  type: "json_schema",

  json_schema: {

    name: "benchmark_grade",

    strict: true,

    schema: {

      type: "object",

      additionalProperties: false,

      properties: {

        score: { type: "number" },

        rationale: { type: "string" },

      },

      required: ["score", "rationale"],

    },

  },

} as const;

const JUDGE_RETRY_BASE_MS = 2_000;

const GENERIC_JUDGE_RATIONALES = new Set([
  "Judge provided score.",
  "Compare ranking provided.",
]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function probeJudgeEndpoint(
  deps: BenchmarkRunnerDependencies,
  judgeEndpoint: { endpointId: string; modelId: string },
): Promise<{ readonly ok: boolean; readonly error?: string }> {
  const probe = await executeJudgeRequest(
    deps,
    judgeEndpoint,
    [
      { role: "system", content: JUDGE_GRADING_SYSTEM_PROMPT },
      {
        role: "user",
        content:
          'Grade this stub deliverable. Output ONLY {"score":1,"rationale":"probe ok"}.',
      },
    ],
    "preflight-probe",
  );
  if (probe.rawResponse && parseJudgeGradingResponse(probe.rawResponse)) {
    return { ok: true };
  }
  return { ok: false, error: probe.errorMessage ?? "judge_probe_failed" };
}

async function executeJudgeRequest(

  deps: BenchmarkRunnerDependencies,

  judgeEndpoint: { endpointId: string; modelId: string },

  messages: readonly Record<string, unknown>[],

  requestSuffix: string,

  options?: { readonly structuredOutput?: boolean },

): Promise<{
  readonly requestId: string;
  readonly rawResponse: string | null;
  readonly reasoningText: string | null;
  readonly errorMessage: string | null;
  readonly responseChannel?: ReturnType<typeof describeResponseChannels>;
  readonly judgeCircuitOpen: boolean;
}> {

  const requestId = `bench-judge-${requestSuffix}-${randomUUID()}`;

  const circuitOpenAtStart = isJudgeCircuitOpen();

  await awaitJudgeThrottle();

  try {

    const startedAtMs = Date.now();

    const structuredOutput = options?.structuredOutput !== false;
    const requestBody: {
      model: string;
      messages: readonly Record<string, unknown>[];
      temperature: number;
      response_format?: Record<string, unknown>;
    } = {
      model: judgeEndpoint.modelId,
      messages,
      temperature: 0,
      ...(structuredOutput ? { response_format: JUDGE_RESPONSE_FORMAT } : {}),
    };

    const result = await deps.executeChatCompletions(
      requestBody,
      requestId,
      { endpointId: judgeEndpoint.endpointId },
    );

    const latencyMs = Date.now() - startedAtMs;

    const responseChannel = describeResponseChannels(result);

    let rawResponse = readJudgeGradingText(result) || null;
    const reasoningText = readBenchmarkReasoningText(result) || null;
    if (!rawResponse && reasoningText) {
      const reasoningJson = extractJudgeGradingJsonText(reasoningText);
      if (reasoningJson) {
        rawResponse = reasoningJson;
      }
    }

    if (!rawResponse) {

      recordJudgeCallOutcome({ success: false, latencyMs });

      return {
        requestId,
        rawResponse: null,
        reasoningText,
        errorMessage: "empty_judge_response",
        responseChannel,
        judgeCircuitOpen: circuitOpenAtStart,
      };

    }

    recordJudgeCallOutcome({ success: true, latencyMs });

    return {
      requestId,
      rawResponse,
      reasoningText,
      errorMessage: null,
      responseChannel,
      judgeCircuitOpen: circuitOpenAtStart,
    };

  } catch (error) {

    recordJudgeCallOutcome({ success: false, latencyMs: 0 });

    return {

      requestId,

      rawResponse: null,

      reasoningText: null,

      errorMessage: error instanceof Error ? error.message : "judge_request_failed",

      judgeCircuitOpen: circuitOpenAtStart,

    };

  }

}



function resolveJudgeDeliverable(responseRecord: BenchmarkResponseRecord): string {

  return responseRecord.formattedDeliverable?.trim() || responseRecord.actualResponse;

}



function isSubstantiveJudgeRationale(rationale: string): boolean {
  const trimmed = rationale.trim();
  if (trimmed.length < 40) {
    return false;
  }
  if (GENERIC_JUDGE_RATIONALES.has(trimmed)) {
    return false;
  }
  return true;
}

async function gradeWithJudge(input: {

  readonly deps: BenchmarkRunnerDependencies;

  readonly artifactRoot: string;

  readonly runId: string;

  readonly judgeEndpoint: { endpointId: string; modelId: string };

  readonly gradedEndpointId: string;

  readonly caseItem: RoutingBenchmarkCase;

  readonly responseRecord: BenchmarkResponseRecord;

  readonly sourceArtifactPath: string;

  readonly structuredToolNames: readonly string[];

}): Promise<JudgeGradeOutcome> {

  const deliverable = resolveJudgeDeliverable(input.responseRecord);

  const gradingBrief = buildJudgeGradingBrief(input.caseItem);

  const judgeSelfGrade =
    input.gradedEndpointId === input.judgeEndpoint.endpointId &&
    isJudgeSubjectOverlapMode();

  const baseMessages = buildJudgeRequestMessages(

    input.caseItem,

    deliverable,

    input.structuredToolNames,

    { strictSelfGrade: judgeSelfGrade },

  );

  const persistedBrief = {

    questionTranscript: gradingBrief.questionTranscript,

    exemplarAnswer: gradingBrief.exemplarAnswer,

    exemplarQuality: gradingBrief.exemplarQuality,

    deliverablesChecklist: gradingBrief.deliverablesChecklist,

    antiPatterns: gradingBrief.antiPatterns,

  };

  const maxAttempts = isJudgeSubjectOverlapMode() ? 4 : 3;

  const attemptArtifactPaths: string[] = [];

  let winningGrade: JudgeGradingResult | null = null;

  let artifactAttempt = 0;

  let cappedByValidator = false;

  let lastJudgeError: string | null = null;



  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {

    if (attempt > 1 && lastJudgeError) {

      const retryDelay =

        JUDGE_RETRY_BASE_MS * attempt * (isJudgeSubjectOverlapMode() ? 2 : 1);

      await sleep(retryDelay);

    }

    const initial = await executeJudgeRequest(

      input.deps,

      input.judgeEndpoint,

      baseMessages,

      `${input.caseItem.case_id}-a${attempt}`,

    );

    const attemptRecords: Array<{

      readonly requestId: string;

      readonly rawResponse: string;

      readonly parsed: JudgeGradingResult | null;

      readonly promptMessages: readonly Record<string, unknown>[];

      readonly judgeError: string | null;

      readonly responseChannel?: ReturnType<typeof describeResponseChannels>;

      readonly judgeCircuitOpen: boolean;

    }> = [];



    if (initial.rawResponse) {

      const parsed = parseJudgeGradingResponse(initial.rawResponse);

      attemptRecords.push({

        requestId: initial.requestId,

        rawResponse: initial.rawResponse,

        parsed,

        promptMessages: baseMessages,

        judgeError: null,

        responseChannel: initial.responseChannel,

        judgeCircuitOpen: initial.judgeCircuitOpen,

      });

      if (parsed && isSubstantiveJudgeRationale(parsed.rationale)) {

        const capped = capJudgeScoreForInvalidDeliverable({

          score: parsed.score,

          rationale: parsed.rationale,

          deliverable,

        });

        if (capped.score < parsed.score) {

          cappedByValidator = true;

        }

        winningGrade = {

          ...parsed,

          score: capped.score,

          rationale: capped.rationale,

        };

      } else {

        const followUp = await executeJudgeRequest(

          input.deps,

          input.judgeEndpoint,

          [

            ...baseMessages,

            { role: "assistant", content: initial.rawResponse },

            { role: "user", content: JUDGE_JSON_ONLY_FOLLOW_UP },

          ],

          `${input.caseItem.case_id}-a${attempt}-followup`,

        );

        if (followUp.rawResponse) {

          const followUpParsed = parseJudgeGradingResponse(followUp.rawResponse);

          attemptRecords.push({

            requestId: followUp.requestId,

            rawResponse: followUp.rawResponse,

            parsed: followUpParsed,

            promptMessages: [

              ...baseMessages,

              { role: "assistant", content: initial.rawResponse },

              { role: "user", content: JUDGE_JSON_ONLY_FOLLOW_UP },

            ],

            judgeError: followUpParsed ? null : followUp.errorMessage,

            responseChannel: followUp.responseChannel,

            judgeCircuitOpen: followUp.judgeCircuitOpen,

          });

          if (followUpParsed && isSubstantiveJudgeRationale(followUpParsed.rationale)) {

            const capped = capJudgeScoreForInvalidDeliverable({

              score: followUpParsed.score,

              rationale: followUpParsed.rationale,

              deliverable,

            });

            if (capped.score < followUpParsed.score) {

              cappedByValidator = true;

            }

            winningGrade = {

              ...followUpParsed,

              score: capped.score,

              rationale: capped.rationale,

            };

          }

        }

      }

    } else {

      lastJudgeError = initial.errorMessage;

      const reasoningAssistant = initial.reasoningText?.trim() ?? "";

      if (!winningGrade) {
        const compactMessages = [
          { role: "system", content: JUDGE_GRADING_SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              `Case: ${input.caseItem.case_id}`,
              `Criteria: ${input.caseItem.grading_criteria}`,
              `Deliverable:\n${deliverable}`,
              'Reply with JSON only: {"score":0.0,"rationale":"..."}',
            ].join("\n\n"),
          },
        ];
        const compact = await executeJudgeRequest(
          input.deps,
          input.judgeEndpoint,
          compactMessages,
          `${input.caseItem.case_id}-a${attempt}-compact`,
          { structuredOutput: false },
        );
        if (compact.rawResponse) {
          const compactParsed = parseJudgeGradingResponse(compact.rawResponse);
          attemptRecords.push({
            requestId: compact.requestId,
            rawResponse: compact.rawResponse,
            parsed: compactParsed,
            promptMessages: compactMessages,
            judgeError: compactParsed ? null : compact.errorMessage,
            responseChannel: compact.responseChannel,
            judgeCircuitOpen: compact.judgeCircuitOpen,
          });
          if (compactParsed) {
            const capped = capJudgeScoreForInvalidDeliverable({
              score: compactParsed.score,
              rationale: compactParsed.rationale,
              deliverable,
            });
            if (capped.score < compactParsed.score) {
              cappedByValidator = true;
            }
            winningGrade = {
              ...compactParsed,
              score: capped.score,
              rationale: capped.rationale,
            };
          }
        }
      }

      if (!winningGrade && reasoningAssistant) {
        const embeddedJson = extractJudgeGradingJsonText(reasoningAssistant);
        if (embeddedJson) {
          const embeddedParsed = parseJudgeGradingResponse(embeddedJson);
          attemptRecords.push({
            requestId: initial.requestId,
            rawResponse: embeddedJson,
            parsed: embeddedParsed,
            promptMessages: baseMessages,
            judgeError: embeddedParsed ? null : initial.errorMessage,
            responseChannel: initial.responseChannel,
            judgeCircuitOpen: initial.judgeCircuitOpen,
          });
          if (embeddedParsed) {
            const capped = capJudgeScoreForInvalidDeliverable({
              score: embeddedParsed.score,
              rationale: embeddedParsed.rationale,
              deliverable,
            });
            if (capped.score < embeddedParsed.score) {
              cappedByValidator = true;
            }
            winningGrade = {
              ...embeddedParsed,
              score: capped.score,
              rationale: capped.rationale,
            };
          }
        }
      }

      if (!winningGrade && reasoningAssistant) {

        const reasoningFollowUp = await executeJudgeRequest(

          input.deps,

          input.judgeEndpoint,

          [

            ...baseMessages,

            { role: "assistant", content: reasoningAssistant },

            { role: "user", content: JUDGE_JSON_ONLY_FOLLOW_UP },

          ],

          `${input.caseItem.case_id}-a${attempt}-reasoning-followup`,

        );

        if (reasoningFollowUp.rawResponse) {

          const reasoningParsed = parseJudgeGradingResponse(reasoningFollowUp.rawResponse);

          attemptRecords.push({

            requestId: reasoningFollowUp.requestId,

            rawResponse: reasoningFollowUp.rawResponse,

            parsed: reasoningParsed,

            promptMessages: [

              ...baseMessages,

              { role: "assistant", content: reasoningAssistant },

              { role: "user", content: JUDGE_JSON_ONLY_FOLLOW_UP },

            ],

            judgeError: reasoningParsed ? null : reasoningFollowUp.errorMessage,

            responseChannel: reasoningFollowUp.responseChannel,

            judgeCircuitOpen: reasoningFollowUp.judgeCircuitOpen,

          });

          if (reasoningParsed) {

            const capped = capJudgeScoreForInvalidDeliverable({

              score: reasoningParsed.score,

              rationale: reasoningParsed.rationale,

              deliverable,

            });

            if (capped.score < reasoningParsed.score) {

              cappedByValidator = true;

            }

            winningGrade = {

              ...reasoningParsed,

              score: capped.score,

              rationale: capped.rationale,

            };

          }

        }

      }

      if (!winningGrade) {

        attemptRecords.push({

          requestId: initial.requestId,

          rawResponse: "",

          parsed: null,

          promptMessages: baseMessages,

          judgeError: initial.errorMessage,

          responseChannel: initial.responseChannel,

          judgeCircuitOpen: initial.judgeCircuitOpen,

        });

      }

    }



    for (const record of attemptRecords) {

      artifactAttempt += 1;

      const artifactPath = await writeBenchmarkJudgeRecord(input.artifactRoot, {

        runId: input.runId,

        caseId: input.caseItem.case_id,

        endpointId: input.responseRecord.endpointId,

        judgeEndpointId: input.judgeEndpoint.endpointId,

        requestId: record.requestId,

        attempt: artifactAttempt,

        promptMessages: record.promptMessages,

        rawResponse: record.rawResponse,

        parseSuccess: record.parsed !== null,

        parsedScore: record.parsed?.score,

        parsedRationale: record.parsed?.rationale,

        gradingMethod: "judge",

        sourceArtifactPath: input.sourceArtifactPath,

        gradingBrief: persistedBrief,

        judgeError: record.judgeError,

        responseChannel: record.responseChannel,

        judgeCircuitOpen: record.judgeCircuitOpen,

        recordedAtMs: Date.now(),

      });

      attemptArtifactPaths.push(artifactPath);

      if (record.judgeError) {

        lastJudgeError = record.judgeError;

      }

    }



    if (winningGrade) {

      break;

    }

    if (attempt < maxAttempts) {

      await sleep(JUDGE_RETRY_BASE_MS * attempt);

    }

  }



  const parseSuccess = winningGrade !== null;

  const summaryArtifactPath = await writeBenchmarkJudgeSummary(input.artifactRoot, {

    runId: input.runId,

    endpointId: input.responseRecord.endpointId,

    caseId: input.caseItem.case_id,

    judgeEndpointId: input.judgeEndpoint.endpointId,

    parseSuccess,

    parsedScore: winningGrade?.score,

    parsedRationale: winningGrade?.rationale,

    sourceArtifactPath: input.sourceArtifactPath,

    attemptArtifactPaths: attemptArtifactPaths.map((artifactPath) =>

      toBenchmarkArtifactRelativePath(path.join(input.artifactRoot, input.runId), artifactPath),

    ),

    recordedAtMs: Date.now(),

  });

  const summaryRelativePath = toBenchmarkArtifactRelativePath(

    path.join(input.artifactRoot, input.runId),

    summaryArtifactPath,

  );



  if (winningGrade) {

    return {

      grade: winningGrade,

      parseSuccess: true,

      summaryArtifactPath,

      attemptArtifactPaths,

      judgeError: null,

      cappedByValidator,

    };

  }



  return {

    grade: {

      score: 0,

      rationale: `Judge parse failed after retries; see ${summaryRelativePath}.`,

      method: "judge",

    },

    parseSuccess: false,

    summaryArtifactPath,

    attemptArtifactPaths,

    judgeError: lastJudgeError,

    cappedByValidator,

  };

}



const COMPARE_RESPONSE_FORMAT = {

  type: "json_schema",

  json_schema: {

    name: "benchmark_compare",

    strict: true,

    schema: {

      type: "object",

      additionalProperties: false,

      properties: {

        relativeRanking: {

          type: "array",

          items: { type: "string" },

        },

        rationale: { type: "string" },

      },

      required: ["relativeRanking", "rationale"],

    },

  },

} as const;



async function gradeCompareAcrossModels(input: {

  readonly deps: BenchmarkRunnerDependencies;

  readonly artifactRoot: string;

  readonly runId: string;

  readonly judgeEndpoint: { endpointId: string; modelId: string };

  readonly caseItem: RoutingBenchmarkCase;

  readonly models: readonly {

    readonly endpointId: string;

    readonly deliverable: string;

    readonly perCaseScore: number;

  }[];

}): Promise<string> {

  const gradingBrief = buildJudgeGradingBrief(input.caseItem);

  const persistedBrief = {

    questionTranscript: gradingBrief.questionTranscript,

    exemplarAnswer: gradingBrief.exemplarAnswer,

    exemplarQuality: gradingBrief.exemplarQuality,

    deliverablesChecklist: gradingBrief.deliverablesChecklist,

    antiPatterns: gradingBrief.antiPatterns,

  };

  const compareMessages = buildCompareRequestMessages(input.caseItem, input.models);

  const requestId = `bench-judge-compare-${input.caseItem.case_id}-${randomUUID()}`;

  const heuristic = buildHeuristicCompareRanking(input.models);

  let rawResponse = "";

  let compareError: string | null = null;

  let responseChannel: ReturnType<typeof describeResponseChannels> | undefined;

  let compareCircuitOpen = isJudgeCircuitOpen();

  let parsed: ReturnType<typeof parseCompareGradingResponse> = null;

  try {

    if (!compareCircuitOpen) {

      await awaitJudgeThrottle();

      const startedAtMs = Date.now();

      const result = await input.deps.executeChatCompletions(

        {

          model: input.judgeEndpoint.modelId,

          messages: compareMessages,

          temperature: 0,

          response_format: COMPARE_RESPONSE_FORMAT,

        },

        requestId,

        { endpointId: input.judgeEndpoint.endpointId },

      );

      const latencyMs = Date.now() - startedAtMs;

      responseChannel = describeResponseChannels(result);

      rawResponse = readCompareGradingText(result);

      if (!rawResponse) {

        compareError = "empty_compare_response";

        const failureState = recordJudgeCallOutcome({ success: false, latencyMs });

        compareCircuitOpen = compareCircuitOpen || failureState.circuitOpen;

      } else {

        parsed = parseCompareGradingResponse(rawResponse);

        if (parsed) {

          recordJudgeCallOutcome({ success: true, latencyMs });

        } else {

          compareError = "compare_parse_failed";

          const failureState = recordJudgeCallOutcome({ success: false, latencyMs });

          compareCircuitOpen = compareCircuitOpen || failureState.circuitOpen;

        }

      }

    } else {

      compareError = "compare_circuit_open";

    }

  } catch (error) {

    compareError = error instanceof Error ? error.message : "compare_request_failed";

    const failureState = recordJudgeCallOutcome({ success: false, latencyMs: 0 });

    compareCircuitOpen = compareCircuitOpen || failureState.circuitOpen;

  }

  return writeBenchmarkCompareRecord(input.artifactRoot, {

    runId: input.runId,

    caseId: input.caseItem.case_id,

    models: input.models.map((model) => ({

      endpointId: model.endpointId,

      deliverablePreview: model.deliverable.slice(0, 240),

      perCaseScore: model.perCaseScore,

    })),

    relativeRanking: parsed?.relativeRanking ?? heuristic.relativeRanking,

    rationale: parsed?.rationale ?? heuristic.rationale,

    rawResponse,

    judgeEndpointId: input.judgeEndpoint.endpointId,

    gradingBrief: persistedBrief,

    compareError,

    compareFallback: parsed === null,

    compareCircuitOpen,

    responseChannel,

    recordedAtMs: Date.now(),

  });

}



function toObservedSample(input: {

  endpointId: string;

  endpointVersion: string;

  caseItem: RoutingBenchmarkCase;

  requestId: string;

  latencyMs: number;

  judgeScore: number;

  failure: boolean;

}): ObservedPerformanceSample {

  const nowMs = Date.now();

  return {

    endpoint_id: input.endpointId,

    endpoint_version: input.endpointVersion,

    source_type: "benchmark",

    difficulty_bucket: input.caseItem.difficulty_bucket,

    timestamp_ms: nowMs,

    latency_ms: input.latencyMs,

    latency_ms_p95: input.latencyMs,

    judge_score: input.failure ? 0 : input.judgeScore,

    failure: input.failure,

    ...(input.failure ? { error_class: "benchmark_execution_failed" } : {}),

    request_id: input.requestId,

  };

}



async function persistResponseRecord(

  artifactRoot: string,

  input: {

    runId: string;

    suiteId: string;

    mode: "quick" | "full";

    endpoint: BenchmarkEndpointRef;

    caseItem: RoutingBenchmarkCase;

    requestId: string;

    actualResponse: string;

    rawResponse: string;

    formattedDeliverable: string;

    extractionMethod: string;

    latencyMs: number;

    failure: boolean;

    answerTurns: number;

  },

): Promise<{

  readonly artifactPath: string;

  readonly record: BenchmarkResponseRecord;

  readonly sourceArtifactPath: string;

}> {

  const record: BenchmarkResponseRecord = {

    runId: input.runId,

    suiteId: input.suiteId,

    mode: input.mode,

    endpointId: input.endpoint.endpointId,

    modelId: input.endpoint.modelId,

    caseId: input.caseItem.case_id,

    requestId: input.requestId,

    actualResponse: input.actualResponse,

    rawResponse: input.rawResponse,

    formattedDeliverable: input.formattedDeliverable,

    extractionMethod: input.extractionMethod,

    latencyMs: input.latencyMs,

    failure: input.failure,

    recordedAtMs: Date.now(),

  };

  const artifactPath = await writeBenchmarkResponseRecord(artifactRoot, record);

  return {

    artifactPath,

    record,

    sourceArtifactPath: toBenchmarkArtifactRelativePath(

      path.join(artifactRoot, record.runId),

      artifactPath,

    ),

  };

}



export async function runRoutingCapabilityBenchmark(

  deps: BenchmarkRunnerDependencies,

  request: BenchmarkRunRequest,

): Promise<BenchmarkRunResult> {

  const suite = loadRoutingCapabilitySuite();

  const mode = request.mode ?? "quick";

  const useJudge = request.useJudge !== false;

  const startGuards = evaluateBenchmarkStartGuards({

    endpointIds: request.endpointIds,

    judgeEndpointId: request.judgeEndpointId,

    useJudge,

  });

  if (!startGuards.allowed) {

    throw new Error(startGuards.warnings[0] ?? "benchmark_start_rejected");

  }

  setJudgeSubjectOverlapMode(startGuards.judgeSubjectOverlap);

  const cases = selectBenchmarkCases(suite, { mode, caseIds: request.caseIds });

  const endpoints = (await deps.listConfiguredEndpoints()).filter((endpoint) =>

    isHealthyEndpoint(endpoint.healthStatus),

  );

  const targetEndpoints = request.endpointIds?.length

    ? endpoints.filter((endpoint) => request.endpointIds?.includes(endpoint.endpointId))

    : endpoints;

  if (targetEndpoints.length === 0) {

    throw new Error("No healthy configured endpoints available for benchmarking.");

  }

  const judgeEndpointId = request.judgeEndpointId ?? null;

  const judgeEndpoint = judgeEndpointId

    ? endpoints.find((endpoint) => endpoint.endpointId === judgeEndpointId)

    : endpoints.find((endpoint) => endpoint.sourceType === "remote") ?? targetEndpoints[0];

  if (!judgeEndpoint) {

    throw new Error("No judge endpoint available. Configure a capable remote model.");

  }

  const runId = request.runId ?? randomUUID();

  const startedAtMs = Date.now();

  const artifactRoot = resolveBenchmarkArtifactRoot(deps);

  const executionSteps = targetEndpoints.length * cases.length;

  let completedSteps = 0;

  const executionByEndpoint = new Map<string, Map<string, BenchmarkCaseExecution>>();

  const compareCaseCount =
    useJudge && targetEndpoints.length >= 2 ? cases.length : 0;

  createBenchmarkRunProgress({

    runId,

    mode,

    endpointCount: targetEndpoints.length,

    caseCount: cases.length,

    judgeEndpointId: judgeEndpoint.endpointId,

    useJudge,

    compareCaseCount,

    artifactRoot,

  });

  try {

    if (request.preflightProbe) {

      await probeJudgeEndpoint(deps, judgeEndpoint);

    }

    for (const [endpointIndex, endpoint] of targetEndpoints.entries()) {

      const endpointExecutions = new Map<string, BenchmarkCaseExecution>();

      executionByEndpoint.set(endpoint.endpointId, endpointExecutions);

      for (const [caseIndex, caseItem] of cases.entries()) {

        const requestId = `bench-${runId}-${caseItem.case_id}-${endpoint.endpointId}`;

        updateBenchmarkRunProgress(runId, {

          runPhase: "execution",

          endpointIndex: endpointIndex + 1,

          currentEndpointId: endpoint.endpointId,

          currentEndpointModelId: endpoint.modelId,

          caseIndex: caseIndex + 1,

          currentCaseId: caseItem.case_id,

          currentPhase: "execute",

          activeJudgeEndpointId: judgeEndpoint.endpointId,

        });

        const execution = await runCaseOnEndpoint(deps, endpoint, caseItem);

        const persisted = await persistResponseRecord(artifactRoot, {

          runId,

          suiteId: suite.suite_id,

          mode,

          endpoint,

          caseItem,

          requestId,

          actualResponse: execution.actualResponse,

          rawResponse: execution.rawResponse,

          formattedDeliverable: execution.formattedDeliverable,

          extractionMethod: execution.extractionMethod,

          latencyMs: execution.latencyMs,

          failure: execution.failure,

          answerTurns: execution.answerTurns,

        });

        endpointExecutions.set(caseItem.case_id, {

          requestId,

          actualResponse: execution.actualResponse,

          rawResponse: execution.rawResponse,

          formattedDeliverable: execution.formattedDeliverable,

          extractionMethod: execution.extractionMethod,

          structuredToolNames: execution.structuredToolNames,

          latencyMs: execution.latencyMs,

          failure: execution.failure,

          artifactPath: persisted.artifactPath,

          sourceArtifactPath: persisted.sourceArtifactPath,

          responseRecord: persisted.record,

          answerTurns: execution.answerTurns,

        });

        completedSteps += 1;

        updateBenchmarkRunProgress(runId, { completedSteps, currentPhase: null });

      }

    }

    const executionCompletedAtMs = Date.now();

    await writeBenchmarkRunManifest(artifactRoot, {

      runId,

      suiteId: suite.suite_id,

      mode,

      judgeEndpointId: judgeEndpoint.endpointId,

      judgeSubjectOverlap: startGuards.judgeSubjectOverlap,

      startWarnings: startGuards.warnings,

      startedAtMs,

      executionCompletedAtMs,

      endpointIds: targetEndpoints.map((endpoint) => endpoint.endpointId),

      caseIds: cases.map((caseItem) => caseItem.case_id),

      responseCount: executionSteps,

    });

    const endpointGrades: BenchmarkEndpointGrade[] = [];

    const compareByCase = new Map<

      string,

      Array<{

        readonly endpointId: string;

        readonly deliverable: string;

        readonly perCaseScore: number;

      }>

    >();

    let judgeArtifactCount = 0;

    let compareArtifactCount = 0;

    updateBenchmarkRunProgress(runId, {

      runPhase: "grading",

      endpointIndex: 0,

      caseIndex: 0,

      currentEndpointId: null,

      currentEndpointModelId: null,

      currentCaseId: null,

      currentPhase: null,

    });

    if (startGuards.judgeSubjectOverlap && process.env.VITEST !== "true") {
      await sleep(5_000);
    }

    const gradingEndpoints = orderEndpointsForGrading(targetEndpoints, judgeEndpoint.endpointId, {
      judgeSubjectOverlap: startGuards.judgeSubjectOverlap,
    });

    const caseResultsByEndpoint = new Map<

      string,

      Array<BenchmarkEndpointGrade["caseResults"][number]>

    >();

    for (const [endpointIndex, endpoint] of gradingEndpoints.entries()) {

      const caseResults: Array<BenchmarkEndpointGrade["caseResults"][number]> = [];

      const endpointExecutions = executionByEndpoint.get(endpoint.endpointId);

      if (!endpointExecutions) {

        continue;

      }

      for (const [caseIndex, caseItem] of cases.entries()) {

        const stored = endpointExecutions.get(caseItem.case_id);

        if (!stored) {

          continue;

        }

        updateBenchmarkRunProgress(runId, {

          runPhase: "grading",

          endpointIndex: endpointIndex + 1,

          currentEndpointId: endpoint.endpointId,

          currentEndpointModelId: endpoint.modelId,

          caseIndex: caseIndex + 1,

          currentCaseId: caseItem.case_id,

          currentPhase: useJudge ? "judge" : null,

          activeJudgeEndpointId: judgeEndpoint.endpointId,

        });

        const judgeOutcome =

          useJudge && !stored.failure

            ? await gradeWithJudge({

                deps,

                artifactRoot,

                runId,

                judgeEndpoint,

                gradedEndpointId: endpoint.endpointId,

                caseItem,

                responseRecord: stored.responseRecord,

                sourceArtifactPath: stored.sourceArtifactPath,

                structuredToolNames: stored.structuredToolNames,

              })

            : null;

        if (judgeOutcome) {

          judgeArtifactCount += judgeOutcome.attemptArtifactPaths.length + 1;

        }

        if (useJudge) {

          completedSteps += 1;

          updateBenchmarkRunProgress(runId, { completedSteps, currentPhase: null });

          if (
            startGuards.judgeSubjectOverlap &&
            process.env.VITEST !== "true"
          ) {
            await sleep(1_500);
          }

        }

        const judgeSucceeded = judgeOutcome?.parseSuccess === true;

        const judgeUnavailable = useJudge && judgeOutcome !== null && !judgeSucceeded;

        const grade = stored.failure

          ? { score: 0, rationale: "Benchmark execution failed.", method: "heuristic" as const }

          : gradeBenchmarkCase({

              caseItem,

              actualResponse: stored.actualResponse,

              structuredToolNames: stored.structuredToolNames,

              judgeGrade: judgeSucceeded ? judgeOutcome?.grade ?? null : null,

              requireJudge: useJudge && judgeSucceeded,

              judgeUnavailable,

            });

        const existingCompare = compareByCase.get(caseItem.case_id) ?? [];

        existingCompare.push({

          endpointId: endpoint.endpointId,

          deliverable: resolveJudgeDeliverable(stored.responseRecord),

          perCaseScore: grade.score,

        });

        compareByCase.set(caseItem.case_id, existingCompare);

        persistObservedBenchmarkSample({

          databasePath: deps.databasePath,

          sample: toObservedSample({

            endpointId: endpoint.endpointId,

            endpointVersion: deps.deriveEndpointVersion(endpoint.endpointId),

            caseItem,

            requestId: stored.requestId,

            latencyMs: stored.latencyMs,

            judgeScore: grade.score,

            failure: stored.failure,

          }),

        });

        caseResults.push({

          caseId: caseItem.case_id,

          difficultyBucket: caseItem.difficulty_bucket,

          score: grade.score,

          rationale: grade.rationale,

          gradingMethod: grade.method,

          latencyMs: stored.latencyMs,

          actualPreview: stored.actualResponse.slice(0, 240),

          parseSuccess: judgeOutcome?.parseSuccess,

          judgeError: judgeOutcome?.judgeError ?? null,

          judgeUnavailable,

          cappedByValidator: judgeOutcome?.cappedByValidator ?? false,

        });

      }

      caseResultsByEndpoint.set(endpoint.endpointId, caseResults);

    }

    for (const endpoint of targetEndpoints) {

      const caseResults = caseResultsByEndpoint.get(endpoint.endpointId) ?? [];

      endpointGrades.push(

        summarizeEndpointGrade(

          endpoint.endpointId,

          endpoint.modelId,

          endpoint.sourceType,

          caseResults,

        ),

      );

    }

    if (useJudge && targetEndpoints.length >= 2) {

      updateBenchmarkRunProgress(runId, {

        runPhase: "compare",

        endpointIndex: 0,

        caseIndex: 0,

        currentEndpointId: null,

        currentEndpointModelId: null,

        currentCaseId: null,

        currentPhase: null,

      });

      for (const [caseIndex, caseItem] of cases.entries()) {

        const models = compareByCase.get(caseItem.case_id) ?? [];

        if (models.length < 2) {

          continue;

        }

        updateBenchmarkRunProgress(runId, {

          runPhase: "compare",

          caseIndex: caseIndex + 1,

          currentCaseId: caseItem.case_id,

          currentPhase: "compare",

          activeJudgeEndpointId: judgeEndpoint.endpointId,

        });

        await gradeCompareAcrossModels({

          deps,

          artifactRoot,

          runId,

          judgeEndpoint,

          caseItem,

          models,

        });

        compareArtifactCount += 1;

        completedSteps += 1;

        updateBenchmarkRunProgress(runId, { completedSteps, currentPhase: null });

      }

    }

    const gradingCompletedAtMs = Date.now();

    await writeBenchmarkRunManifest(artifactRoot, {

      runId,

      suiteId: suite.suite_id,

      mode,

      judgeEndpointId: judgeEndpoint.endpointId,

      judgeSubjectOverlap: startGuards.judgeSubjectOverlap,

      startWarnings: startGuards.warnings,

      startedAtMs,

      executionCompletedAtMs,

      gradingCompletedAtMs,

      endpointIds: targetEndpoints.map((endpoint) => endpoint.endpointId),

      caseIds: cases.map((caseItem) => caseItem.case_id),

      responseCount: executionSteps,

      judgeArtifactCount,

      compareArtifactCount,

    });

    const result: BenchmarkRunResult = {

      runId,

      suiteId: suite.suite_id,

      suiteVersion: suite.suite_version,

      mode,

      judgeEndpointId: judgeEndpoint.endpointId,

      startedAtMs,

      completedAtMs: gradingCompletedAtMs,

      artifactRoot: path.join(artifactRoot, runId),

      endpointGrades,

    };

    await writeBenchmarkRunResult(artifactRoot, {
      runId,
      suiteId: suite.suite_id,
      suiteVersion: suite.suite_version,
      mode,
      judgeEndpointId: judgeEndpoint.endpointId,
      startedAtMs,
      completedAtMs: gradingCompletedAtMs,
      endpointGrades: endpointGrades.map((grade) => ({
        endpointId: grade.endpointId,
        modelId: grade.modelId,
        sourceType: grade.sourceType,
        overallScore: grade.overallScore,
        byDifficulty: grade.byDifficulty,
        caseResults: grade.caseResults.map((caseResult) => ({
          caseId: caseResult.caseId,
          difficultyBucket: caseResult.difficultyBucket,
          score: caseResult.score,
          parseSuccess: caseResult.parseSuccess,
          judgeError: caseResult.judgeError,
          judgeUnavailable: caseResult.judgeUnavailable,
          cappedByValidator: caseResult.cappedByValidator,
        })),
      })),
    });

    completeBenchmarkRunProgress(runId, result);

    return result;

  } catch (error) {

    failBenchmarkRunProgress(

      runId,

      error instanceof Error ? error.message : "benchmark run failed",

    );

    throw error;

  }

}



export function readRoutingCapabilityBenchmarkSuite() {

  return loadRoutingCapabilitySuite();

}


