export type BenchmarkAnswerFormatKind =
  | "json"
  | "code_fence"
  | "tool_calls"
  | "tool_calls_with_answer"
  | "tool_calls_with_summary";

export interface BenchmarkAnswerFormat {
  readonly kind: BenchmarkAnswerFormatKind;
  readonly instruction: string;
  readonly schema?: Record<string, unknown>;
  readonly language?: string;
}

export interface ExtractedBenchmarkAnswer {
  readonly format: BenchmarkAnswerFormat;
  readonly payload: unknown;
  readonly serialized: string;
  readonly extractionMethod: "api_tool_calls" | "json_fence" | "json_object" | "code_fence" | "missing";
}

const JSON_FENCE_PATTERN = /```(?:json)?\s*([\s\S]*?)```/gi;
const PLACEHOLDER_PATTERN =
  /^\.{3}$|^<[^>]+>$|^check\s*[12]$|complete typescript|your answer here|placeholder|todo|tbd|first bullet|second bullet|one sentence comparing|fenced code block|no reasoning|your final short answer|milestone 1|what changed|short test idea|what schema fields|tests you validated/i;

export interface AnswerFormatCaseRef {
  readonly case_id: string;
  readonly category: string;
  readonly messages: readonly Record<string, unknown>[];
  readonly required_tool_call?: boolean;
  readonly expected_tool_names?: readonly string[];
  readonly answer_format?: BenchmarkAnswerFormat;
  readonly grading_criteria?: string;
}

function messageText(caseItem: AnswerFormatCaseRef): string {
  return caseItem.messages
    .map((message) => (typeof message.content === "string" ? message.content : ""))
    .join("\n");
}

function needsTextDeliverable(caseItem: AnswerFormatCaseRef): boolean {
  const text = `${messageText(caseItem)}\n${caseItem.grading_criteria ?? ""}`;
  return /function name|bullets|sentence|compare|strategy value|milestones|plan|checklist|sections? A/i.test(
    text,
  );
}

function wantsCodeFence(caseItem: AnswerFormatCaseRef): boolean {
  return /fenced code block|code block only|```ts|typescript fenced|Output code only/i.test(
    messageText(caseItem),
  );
}

export function resolveAnswerFormat(caseItem: AnswerFormatCaseRef): BenchmarkAnswerFormat {
  if (caseItem.answer_format) {
    return caseItem.answer_format;
  }
  if (caseItem.required_tool_call && caseItem.expected_tool_names?.length) {
    const combined = `${messageText(caseItem)}\n${caseItem.grading_criteria ?? ""}`;
    if (/bullet/i.test(combined)) {
      return {
        kind: "tool_calls_with_summary",
        instruction:
          "Step 1: emit required API tool calls. Step 2: after tools, output ONLY a ```json fence: {\"bullets\":[\"...\",\"...\"]}. No reasoning in the JSON.",
        schema: {
          type: "object",
          required: ["bullets"],
          properties: { bullets: { type: "array", items: { type: "string" }, minItems: 2 } },
        },
      };
    }
    if (/sentence|compare|strategy value|function name/i.test(combined)) {
      return {
        kind: "tool_calls_with_answer",
        instruction:
          "Step 1: emit required API tool calls. Step 2: after tools, output ONLY a ```json fence: {\"answer\":\"...\"} with your final short answer. No reasoning in the JSON.",
        schema: {
          type: "object",
          required: ["answer"],
          properties: { answer: { type: "string", minLength: 1 } },
        },
      };
    }
    if (caseItem.category === "max-signal" || caseItem.case_id.startsWith("x01") || caseItem.case_id.startsWith("h15")) {
      return {
        kind: "tool_calls_with_summary",
        instruction:
          "Step 1: emit read_file, grep_search, apply_patch via API as needed. Step 2: output ONLY ```json with {\"plan\":[\"milestone 1\",...],\"patch_summary\":\"...\",\"test_snippet\":\"...\"}.",
        schema: {
          type: "object",
          required: ["plan", "patch_summary"],
          properties: {
            plan: { type: "array", items: { type: "string" } },
            patch_summary: { type: "string" },
            test_snippet: { type: "string" },
          },
        },
      };
    }
    return {
      kind: "tool_calls",
      instruction:
        "Emit all required tool calls through the API. Do not write fake TOOL_CALL text. Reasoning is ignored.",
    };
  }
  if (wantsCodeFence(caseItem) || caseItem.category === "code-implementation") {
    return {
      kind: "code_fence",
      language: "typescript",
      instruction:
        "You may reason first. Your final message must contain exactly one ```typescript fenced code block with complete working code. No placeholders.",
    };
  }
  return {
    kind: "json",
    instruction:
      'Your final deliverable must be ONLY a ```json fence: {"answer":"..."}. No placeholders.',
    schema: {
      type: "object",
      required: ["answer"],
      properties: { answer: { type: "string", minLength: 1 } },
    },
  };
}

export function buildAnswerFormatInstruction(caseItem: AnswerFormatCaseRef): string {
  const format = resolveAnswerFormat(caseItem);
  const schemaText = format.schema ? JSON.stringify(format.schema, null, 2) : "";
  return [
    "BENCHMARK DELIVERABLE RULES:",
    format.instruction,
    ...(schemaText ? [`Schema:`, schemaText] : []),
    "Reasoning is allowed before the deliverable, but only the formatted deliverable is graded.",
  ].join("\n");
}

export const BENCHMARK_SUBJECT_SYSTEM_PROMPT =
  "You are a benchmark subject. Output only the required structured deliverable (JSON, code fence, or API tool calls). No chain-of-thought, planning prose, or meta commentary in the graded deliverable.";

export function augmentCaseMessages(caseItem: AnswerFormatCaseRef): Record<string, unknown>[] {
  return [
    {
      role: "system",
      content: `${BENCHMARK_SUBJECT_SYSTEM_PROMPT}\n\n${buildAnswerFormatInstruction(caseItem)}`,
    },
    ...caseItem.messages.map((message) => ({ ...message })),
  ];
}

function parseJsonCandidate(candidate: string): unknown | null {
  const trimmed = candidate.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    return null;
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

function collectJsonFenceCandidates(raw: string): unknown[] {
  const candidates: unknown[] = [];
  for (const match of raw.matchAll(JSON_FENCE_PATTERN)) {
    const parsed = parseJsonCandidate(match[1] ?? "");
    if (parsed !== null) {
      candidates.push(parsed);
    }
  }
  return candidates;
}

function collectJsonObjectCandidates(raw: string): unknown[] {
  const candidates: unknown[] = [];
  const trimmed = raw.trim();
  const start = trimmed.lastIndexOf("{");
  if (start >= 0) {
    for (let end = trimmed.length; end > start; end -= 1) {
      const parsed = parseJsonCandidate(trimmed.slice(start, end));
      if (parsed !== null) {
        candidates.push(parsed);
        break;
      }
    }
  }
  return candidates;
}

function looksLikeReasoningProse(code: string): boolean {
  const trimmed = code.trim();
  if (!trimmed) {
    return true;
  }
  const hasCodeShape = /^\s*(export\s+)?(async\s+)?function\s|^\s*class\s|^\s*const\s+\w+\s*=/.test(
    trimmed,
  );
  if (hasCodeShape) {
    return false;
  }
  return /^(the user wants|the user asked|we need to|let me|i need to|i'll|i will)\b/i.test(
    trimmed,
  );
}

function collectCodeFences(raw: string, language?: string): string[] {
  const results: string[] = [];
  for (const lang of [language ?? "typescript", "ts", "typescript"]) {
    const pattern = new RegExp("```" + lang + "\\s*([\\s\\S]*?)```", "gi");
    for (const match of raw.matchAll(pattern)) {
      const body = match[1]?.trim();
      if (body) {
        results.push(body);
      }
    }
  }
  return results;
}

function scoreCodeCandidate(code: string): number {
  if (code.length < 40 || isPlaceholderString(code) || looksLikeReasoningProse(code)) {
    return -1;
  }
  if (!/function|class|export|const\s+\w+\s*=/.test(code)) {
    return code.length;
  }
  return code.length + (code.includes("async") ? 50 : 0) + (code.includes("function") ? 30 : 0);
}

function extractBestCodeFence(raw: string, language?: string): string | null {
  let best: string | null = null;
  let bestScore = -1;
  for (const candidate of collectCodeFences(raw, language)) {
    const score = scoreCodeCandidate(candidate);
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  return best;
}

function extractCodeFence(raw: string, language?: string): string | null {
  return extractBestCodeFence(raw, language);
}

function isPlaceholderString(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length < 2) {
    return true;
  }
  return PLACEHOLDER_PATTERN.test(trimmed);
}

function serializeToolCalls(
  structuredToolNames: readonly string[],
  toolCalls?: readonly { function: { name: string; arguments: string } }[],
): Record<string, unknown>[] {
  if (toolCalls?.length) {
    return toolCalls.map((toolCall) => ({
      name: toolCall.function.name,
      arguments: parseJsonCandidate(toolCall.function.arguments) ?? toolCall.function.arguments,
    }));
  }
  return structuredToolNames.map((name) => ({ name, arguments: {} }));
}

function recordHasNonPlaceholderRequiredFields(
  record: Record<string, unknown>,
  required: readonly string[],
): boolean {
  return required.every((key) => {
    const value = record[key];
    if (typeof value === "string") {
      return !isPlaceholderString(value);
    }
    if (Array.isArray(value)) {
      return value.length > 0 && value.every((item) => typeof item === "string" && !isPlaceholderString(item));
    }
    return value !== undefined && value !== null;
  });
}

function pickJsonPayload(candidates: unknown[], format: BenchmarkAnswerFormat): unknown | null {
  if (candidates.length === 0) {
    return null;
  }
  const required = Array.isArray(format.schema?.required)
    ? (format.schema.required as string[])
    : [];
  for (let index = candidates.length - 1; index >= 0; index -= 1) {
    const candidate = candidates[index];
    if (!candidate || typeof candidate !== "object") {
      continue;
    }
    const record = candidate as Record<string, unknown>;
    if (required.length === 0) {
      return candidate;
    }
    if (required.every((key) => key in record) && recordHasNonPlaceholderRequiredFields(record, required)) {
      return candidate;
    }
  }
  return null;
}

function extractTextJsonFields(raw: string, format: BenchmarkAnswerFormat): Record<string, unknown> {
  const fenceCandidates = collectJsonFenceCandidates(raw);
  const objectCandidates = collectJsonObjectCandidates(raw);
  const jsonPayload = pickJsonPayload([...fenceCandidates, ...objectCandidates], format);
  return jsonPayload && typeof jsonPayload === "object"
    ? (jsonPayload as Record<string, unknown>)
    : {};
}

function extractTextJsonFieldsFromTurns(
  turnRawContents: readonly string[],
  format: BenchmarkAnswerFormat,
): Record<string, unknown> {
  for (let index = turnRawContents.length - 1; index >= 0; index -= 1) {
    const fields = extractTextJsonFields(turnRawContents[index] ?? "", format);
    if (Object.keys(fields).length > 0) {
      return fields;
    }
  }
  return {};
}

function extractCodeFenceFromTurns(
  turnRawContents: readonly string[],
  language?: string,
): string | null {
  let best: string | null = null;
  let bestScore = -1;
  for (const turn of turnRawContents) {
    for (const candidate of collectCodeFences(turn, language)) {
      const score = scoreCodeCandidate(candidate);
      if (score > bestScore) {
        bestScore = score;
        best = candidate;
      }
    }
  }
  return best;
}

export function deliverableCompleteness(input: {
  readonly caseItem: AnswerFormatCaseRef;
  readonly extracted: ExtractedBenchmarkAnswer;
  readonly structuredToolNames: readonly string[];
}): number {
  if (
    isValidDeliverable({
      caseItem: input.caseItem,
      extracted: input.extracted,
      structuredToolNames: input.structuredToolNames,
    })
  ) {
    return 1000;
  }
  const expectedTools = input.caseItem.expected_tool_names ?? [];
  const toolScore =
    expectedTools.length === 0
      ? 1
      : expectedTools.filter((name) => input.structuredToolNames.includes(name)).length /
        expectedTools.length;
  const payload =
    input.extracted.payload && typeof input.extracted.payload === "object"
      ? (input.extracted.payload as Record<string, unknown>)
      : null;
  if (!payload) {
    return toolScore * 10;
  }
  if (input.extracted.format.kind === "tool_calls_with_answer") {
    const answer = String(payload.answer ?? "");
    const textScore = answer.length >= 2 && !isPlaceholderString(answer) ? 1 : 0;
    return toolScore * 50 + textScore * 50;
  }
  if (input.extracted.format.kind === "tool_calls_with_summary") {
    const hasBullets = Array.isArray(payload.bullets) && payload.bullets.length >= 2;
    const hasPlan = Array.isArray(payload.plan) && String(payload.patch_summary ?? "").length >= 8;
    const textScore = hasBullets || hasPlan ? 1 : 0;
    return toolScore * 50 + textScore * 50;
  }
  if (input.extracted.format.kind === "code_fence") {
    const code = String(payload.code ?? "");
    return code.length >= 40 ? 80 + Math.min(code.length, 200) / 10 : 0;
  }
  return toolScore * 100;
}

export function extractFormattedAnswer(input: {
  readonly caseItem: AnswerFormatCaseRef;
  readonly rawContent: string;
  readonly turnRawContents?: readonly string[];
  readonly structuredToolNames: readonly string[];
  readonly toolCalls?: readonly { function: { name: string; arguments: string } }[];
}): ExtractedBenchmarkAnswer {
  const format = resolveAnswerFormat(input.caseItem);
  const apiToolCalls = serializeToolCalls(input.structuredToolNames, input.toolCalls);

  if (format.kind === "tool_calls") {
    const payload = { tool_calls: apiToolCalls };
    return {
      format,
      payload,
      serialized: JSON.stringify(payload, null, 2),
      extractionMethod: apiToolCalls.length > 0 ? "api_tool_calls" : "missing",
    };
  }

  if (format.kind === "tool_calls_with_answer" || format.kind === "tool_calls_with_summary") {
    const textFields = input.turnRawContents?.length
      ? extractTextJsonFieldsFromTurns(input.turnRawContents, format)
      : extractTextJsonFields(input.rawContent, format);
    const payload = { tool_calls: apiToolCalls, ...textFields };
    const hasTools = apiToolCalls.length > 0;
    const hasText = Object.keys(textFields).length > 0;
    return {
      format,
      payload,
      serialized: JSON.stringify(payload, null, 2),
      extractionMethod: hasTools || hasText ? (hasTools ? "api_tool_calls" : "json_fence") : "missing",
    };
  }

  const fenceCandidates = collectJsonFenceCandidates(input.rawContent);
  const objectCandidates = collectJsonObjectCandidates(input.rawContent);
  const jsonPayload = pickJsonPayload([...fenceCandidates, ...objectCandidates], format);

  if (format.kind === "code_fence") {
    const codeFromFence = input.turnRawContents?.length
      ? extractCodeFenceFromTurns(input.turnRawContents, format.language)
      : extractCodeFence(input.rawContent, format.language);
    const codeFromJson =
      jsonPayload && typeof jsonPayload === "object" && "code" in jsonPayload
        ? String((jsonPayload as { code?: unknown }).code ?? "")
        : "";
    const code = codeFromFence || codeFromJson || "";
    const payload = { code };
    return {
      format,
      payload,
      serialized: code ? JSON.stringify(payload, null, 2) : "",
      extractionMethod: codeFromFence ? "code_fence" : codeFromJson ? "json_fence" : "missing",
    };
  }

  if (jsonPayload) {
    return {
      format,
      payload: jsonPayload,
      serialized: JSON.stringify(jsonPayload, null, 2),
      extractionMethod: fenceCandidates.includes(jsonPayload) ? "json_fence" : "json_object",
    };
  }

  return {
    format,
    payload: null,
    serialized: "",
    extractionMethod: "missing",
  };
}

export function isValidDeliverable(input: {
  readonly caseItem: AnswerFormatCaseRef;
  readonly extracted: ExtractedBenchmarkAnswer;
  readonly structuredToolNames: readonly string[];
}): boolean {
  const { extracted, caseItem, structuredToolNames } = input;
  if (extracted.extractionMethod === "missing" || !extracted.serialized) {
    return false;
  }
  const payload =
    extracted.payload && typeof extracted.payload === "object"
      ? (extracted.payload as Record<string, unknown>)
      : null;
  if (!payload) {
    return false;
  }

  const expectedTools = caseItem.expected_tool_names ?? [];
  if (expectedTools.length > 0) {
    const missingTools = expectedTools.filter((name) => !structuredToolNames.includes(name));
    if (missingTools.length > 0) {
      return false;
    }
  }

  if (extracted.format.kind === "code_fence") {
    const code = String(payload.code ?? "");
    return (
      code.length >= 40 &&
      !isPlaceholderString(code) &&
      /function|class|const|let/.test(code) &&
      !/fenced code block|no reasoning|deliverable rules/i.test(code) &&
      (code.includes("}") || code.includes(";"))
    );
  }

  if (extracted.format.kind === "tool_calls_with_summary") {
    const hasRequiredTools =
      expectedTools.length === 0 ||
      expectedTools.every((name) => structuredToolNames.includes(name));
    const bullets = payload.bullets;
    if (Array.isArray(bullets)) {
      return (
        hasRequiredTools &&
        bullets.length >= 2 &&
        bullets.every((item) => typeof item === "string" && !isPlaceholderString(item))
      );
    }
    const plan = payload.plan;
    const patchSummary = String(payload.patch_summary ?? "");
    if (Array.isArray(plan)) {
      return (
        hasRequiredTools &&
        plan.length >= 1 &&
        patchSummary.length >= 8 &&
        !isPlaceholderString(patchSummary)
      );
    }
    const summary = String(payload.summary ?? "");
    return hasRequiredTools && summary.length >= 8 && !isPlaceholderString(summary);
  }

  if (extracted.format.kind === "tool_calls_with_answer") {
    const hasRequiredTools =
      expectedTools.length === 0 ||
      expectedTools.every((name) => structuredToolNames.includes(name));
    const answer = String(payload.answer ?? "");
    return hasRequiredTools && answer.length >= 2 && !isPlaceholderString(answer);
  }

  if (extracted.format.kind === "json") {
    const answer = String(payload.answer ?? "");
    return answer.length >= 1 && !isPlaceholderString(answer);
  }

  return structuredToolNames.length > 0 || Boolean(payload.tool_calls);
}

function textDeliverableFollowUp(format: BenchmarkAnswerFormat): string {
  if (format.kind === "tool_calls_with_answer") {
    return "Tools received. Reply with ONLY a ```json fence containing {\"answer\":\"...\"} — a real short answer, not instructions.";
  }
  if (format.kind === "tool_calls_with_summary") {
    if (format.schema && "bullets" in (format.schema.properties as Record<string, unknown>)) {
      return "Tools received. Reply with ONLY ```json {\"bullets\":[\"...\",\"...\"]} with two real eligibility-check summary bullets.";
    }
    return 'Tools received. Reply with ONLY ```json {"plan":["<step>"],"patch_summary":"<what changed>","test_snippet":"<test idea>"} using real content.';
  }
  if (format.kind === "code_fence") {
    return "Reply with ONLY one complete ```typescript code block. No prose before or after the fence.";
  }
  return "Reply with ONLY the final formatted deliverable. No reasoning text.";
}

function buildAssistantScaffoldMessage(
  assistantOutput: string,
  toolCalls?: readonly { function: { name: string; arguments: string } }[],
): Record<string, unknown> {
  if (toolCalls?.length) {
    return {
      role: "assistant",
      content: assistantOutput || null,
      tool_calls: toolCalls.map((toolCall, index) => ({
        id: `bench_scaffold_${index}`,
        type: "function",
        function: {
          name: toolCall.function.name,
          arguments: toolCall.function.arguments,
        },
      })),
    };
  }
  return { role: "assistant", content: assistantOutput };
}

export function buildTextDeliverableResponseFormat(
  caseItem: AnswerFormatCaseRef,
): Record<string, unknown> | undefined {
  const format = resolveAnswerFormat(caseItem);
  if (
    format.kind !== "tool_calls_with_answer" &&
    format.kind !== "tool_calls_with_summary" &&
    format.kind !== "json"
  ) {
    return undefined;
  }
  if (!format.schema) {
    return undefined;
  }
  return {
    type: "json_schema",
    json_schema: {
      name: "benchmark_deliverable",
      strict: true,
      schema: format.schema,
    },
  };
}

export function shouldOmitToolsForTurn(
  caseItem: AnswerFormatCaseRef,
  structuredToolNames: readonly string[],
): boolean {
  const expectedTools = caseItem.expected_tool_names ?? [];
  if (expectedTools.length === 0) {
    return false;
  }
  const missingTools = expectedTools.filter((name) => !structuredToolNames.includes(name));
  if (missingTools.length > 0) {
    return false;
  }
  return resolveAnswerFormat(caseItem).kind !== "tool_calls";
}

export function buildScaffoldFollowUp(
  caseItem: AnswerFormatCaseRef,
  priorMessages: readonly Record<string, unknown>[],
  assistantOutput: string,
  structuredToolNames: readonly string[],
  _extracted: ExtractedBenchmarkAnswer,
  toolCalls?: readonly { function: { name: string; arguments: string } }[],
): Record<string, unknown>[] {
  const assistantMessage = buildAssistantScaffoldMessage(assistantOutput, toolCalls);
  const expectedTools = caseItem.expected_tool_names ?? [];
  const missingTools = expectedTools.filter((name) => !structuredToolNames.includes(name));
  if (missingTools.length > 0) {
    const nextTool = missingTools[0];
    return [
      ...priorMessages,
      assistantMessage,
      {
        role: "user",
        content: `Emit exactly one API tool call now (no prose): ${nextTool}`,
      },
    ];
  }

  const format = resolveAnswerFormat(caseItem);
  return [
    ...priorMessages,
    assistantMessage,
    {
      role: "user",
      content: textDeliverableFollowUp(format),
    },
  ];
}
