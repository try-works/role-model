import {
  type BenchmarkAnswerFormat,
  buildAnswerFormatInstruction,
  resolveAnswerFormat,
} from "./answer-format.js";

export interface JudgeBriefCaseRef {
  readonly case_id: string;
  readonly category: string;
  readonly messages: readonly Record<string, unknown>[];
  readonly expected_response: string;
  readonly grading_criteria: string;
  readonly accept_patterns?: readonly string[];
  readonly required_tool_call?: boolean;
  readonly expected_tool_names?: readonly string[];
  readonly answer_format?: BenchmarkAnswerFormat;
  readonly example_deliverable?: string;
  readonly judge_guidance?: {
    readonly exemplar?: { readonly summary?: string; readonly deliverable?: string };
  };
}

export interface JudgeGradingBrief {
  readonly questionTranscript: string;
  readonly exemplarAnswer: string;
  readonly exemplarQuality: "authored" | "derived";
  readonly deliverablesChecklist: readonly string[];
  readonly antiPatterns: readonly string[];
  readonly answerFormatInstruction: string;
  readonly gradingCriteria: string;
}

const GLOBAL_ANTI_PATTERNS = [
  "MUST NOT use diff placeholders (----/+++, [file header])",
  "MUST NOT emit prose-only TOOL_CALL lines without API tool_calls",
  "MUST NOT submit reasoning prose as the graded code deliverable",
  "MUST NOT leave apply_patch arguments as placeholder or malformed patch content",
] as const;

export function formatQuestionTranscript(caseItem: JudgeBriefCaseRef): string {
  return caseItem.messages
    .map((message) => {
      const role = typeof message.role === "string" ? message.role : "unknown";
      const content = typeof message.content === "string" ? message.content : "";
      return `[${role}]\n${content}`;
    })
    .join("\n\n");
}

function splitGradingCriteria(criteria: string): string[] {
  return criteria
    .split(/[.;]\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 8);
}

function isTrivialAcceptPattern(pattern: string): boolean {
  const trimmed = pattern.trim();
  return (
    trimmed === ".+" ||
    /^\.\{\d+(,\d*)?\}$/.test(trimmed) ||
    /^[\^\$\.\+\*\?\(\)\[\]\{\}\\|,\s]+$/.test(trimmed)
  );
}

function describeAcceptPattern(pattern: string): string | null {
  const trimmed = pattern.trim();
  if (!trimmed || isTrivialAcceptPattern(trimmed)) {
    return null;
  }
  const exactLiteralMatch = trimmed.match(/^\^([A-Za-z0-9 _:/.-]+)\$$/);
  if (exactLiteralMatch) {
    return `exact value ${exactLiteralMatch[1]}`;
  }
  return trimmed;
}

function summarizeAcceptPatternsForJudge(patterns: readonly string[]): string[] {
  return [
    ...new Set(patterns.map(describeAcceptPattern).filter((value): value is string => !!value)),
  ];
}

function parseRequiredKeys(format: BenchmarkAnswerFormat): string[] {
  return Array.isArray(format.schema?.required) ? (format.schema.required as string[]) : [];
}

function hasExactCodeFence(answer: string, language?: string): boolean {
  const trimmed = answer.trim();
  const languageTag = (language ?? "").trim();
  const prefix = languageTag ? `\`\`\`${languageTag}` : "```";
  return trimmed.startsWith(prefix) && trimmed.endsWith("```");
}

function hasABCDSections(answer: string): boolean {
  return ["A", "B", "C", "D"].every((label) =>
    new RegExp(`(?:^|\\n)\\s*${label}[):]`, "m").test(answer),
  );
}

export function validateJudgeCaseContract(caseItem: JudgeBriefCaseRef): void {
  const format = resolveAnswerFormat(caseItem);
  const authored =
    caseItem.example_deliverable?.trim() ||
    caseItem.judge_guidance?.exemplar?.deliverable?.trim() ||
    "";
  if (!authored) {
    return;
  }

  if (format.kind === "code_fence" && !hasExactCodeFence(authored, format.language)) {
    throw new Error(
      `Contradictory code_fence example_deliverable for ${caseItem.case_id}: expected a fenced ${format.language ?? "code"} block.`,
    );
  }

  const requiredKeys = parseRequiredKeys(format);
  const requiresABCD = /A\/B\/C\/D sections/i.test(caseItem.grading_criteria);
  const structuredJsonFormat =
    format.kind === "json" ||
    format.kind === "tool_calls_with_answer" ||
    format.kind === "tool_calls_with_summary";
  const schemaCarriesABCD = requiredKeys.some((key) => /^(section_)?[abcd]$/i.test(key));
  if (requiresABCD && structuredJsonFormat && !schemaCarriesABCD && !hasABCDSections(authored)) {
    throw new Error(
      `Contradictory deliverable contract for ${caseItem.case_id}: grading_criteria require A/B/C/D sections but the structured answer format and authored exemplar do not carry them.`,
    );
  }
}

export function buildJudgeDeliverablesChecklist(caseItem: JudgeBriefCaseRef): string[] {
  const checklist: string[] = [];

  for (const part of splitGradingCriteria(caseItem.grading_criteria)) {
    checklist.push(`[MUST] ${part}`);
  }

  if (caseItem.expected_tool_names?.length) {
    checklist.push(`[MUST] Emit API tool calls: ${caseItem.expected_tool_names.join(", ")}`);
  }

  const format = resolveAnswerFormat(caseItem);
  const required = parseRequiredKeys(format);
  if (required.length > 0) {
    checklist.push(`[MUST] Include JSON keys: ${required.join(", ")}`);
  }

  if (caseItem.accept_patterns?.length) {
    const patternSummaries = summarizeAcceptPatternsForJudge(caseItem.accept_patterns);
    if (patternSummaries.length > 0) {
      checklist.push(`[SHOULD] Match clues: ${patternSummaries.join(", ")}`);
    }
  }

  if (caseItem.expected_tool_names?.includes("apply_patch")) {
    checklist.push(
      "[MUST] apply_patch must contain either ---/+++ headers plus an @@ hunk marker and real change content, or a valid Codex patch envelope with real content; line numbers are optional and bare @@ is acceptable",
    );
  }

  if (caseItem.category === "code-implementation" || format.kind === "code_fence") {
    checklist.push(
      "[MUST] Provide complete working TypeScript — no placeholders or partial helpers only",
    );
  }

  return checklist;
}

function deriveExemplarAnswer(caseItem: JudgeBriefCaseRef): string {
  const format = resolveAnswerFormat(caseItem);
  const required = parseRequiredKeys(format);
  const toolNames = caseItem.expected_tool_names ?? [];
  const parts: string[] = [caseItem.expected_response];

  if (toolNames.length > 0) {
    parts.push(
      `Tool calls: ${toolNames
        .map((name) =>
          name === "apply_patch"
            ? `${name} with ---/+++ headers plus @@ hunk marker (line numbers optional) or Codex patch envelope`
            : name,
        )
        .join(", ")}`,
    );
  }

  if (required.length > 0) {
    parts.push(`Required fields: ${required.join(", ")}`);
  }

  return parts.join("\n");
}

export function resolveExemplarAnswer(caseItem: JudgeBriefCaseRef): {
  readonly answer: string;
  readonly quality: "authored" | "derived";
} {
  const authored =
    caseItem.example_deliverable?.trim() ||
    caseItem.judge_guidance?.exemplar?.deliverable?.trim() ||
    "";
  if (authored) {
    return { answer: authored, quality: "authored" };
  }
  return { answer: deriveExemplarAnswer(caseItem), quality: "derived" };
}

export function buildJudgeGradingBrief(caseItem: JudgeBriefCaseRef): JudgeGradingBrief {
  validateJudgeCaseContract(caseItem);
  const exemplar = resolveExemplarAnswer(caseItem);
  return {
    questionTranscript: formatQuestionTranscript(caseItem),
    exemplarAnswer: exemplar.answer,
    exemplarQuality: exemplar.quality,
    deliverablesChecklist: buildJudgeDeliverablesChecklist(caseItem),
    antiPatterns: [...GLOBAL_ANTI_PATTERNS],
    answerFormatInstruction: buildAnswerFormatInstruction(caseItem),
    gradingCriteria: caseItem.grading_criteria,
  };
}
