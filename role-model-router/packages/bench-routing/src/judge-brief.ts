import { buildAnswerFormatInstruction, resolveAnswerFormat, type BenchmarkAnswerFormat } from "./answer-format.js";

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
  "MUST NOT leave apply_patch arguments as stub text without @@ hunks",
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

export function buildJudgeDeliverablesChecklist(caseItem: JudgeBriefCaseRef): string[] {
  const checklist: string[] = [];

  for (const part of splitGradingCriteria(caseItem.grading_criteria)) {
    checklist.push(`[MUST] ${part}`);
  }

  if (caseItem.expected_tool_names?.length) {
    checklist.push(
      `[MUST] Emit API tool calls: ${caseItem.expected_tool_names.join(", ")}`,
    );
  }

  const format = resolveAnswerFormat(caseItem);
  const required = Array.isArray(format.schema?.required)
    ? (format.schema.required as string[])
    : [];
  if (required.length > 0) {
    checklist.push(`[MUST] Include JSON keys: ${required.join(", ")}`);
  }

  if (caseItem.accept_patterns?.length) {
    checklist.push(`[SHOULD] Match patterns: ${caseItem.accept_patterns.join(", ")}`);
  }

  if (caseItem.expected_tool_names?.includes("apply_patch")) {
    checklist.push(
      "[MUST] apply_patch diff must contain ---/+++ file headers and @@ hunk markers with real content",
    );
  }

  if (caseItem.category === "code-implementation" || format.kind === "code_fence") {
    checklist.push("[MUST] Provide complete working TypeScript — no placeholders or partial helpers only");
  }

  return checklist;
}

function deriveExemplarAnswer(caseItem: JudgeBriefCaseRef): string {
  const format = resolveAnswerFormat(caseItem);
  const required = Array.isArray(format.schema?.required)
    ? (format.schema.required as string[])
    : [];
  const toolNames = caseItem.expected_tool_names ?? [];
  const parts: string[] = [caseItem.expected_response];

  if (toolNames.length > 0) {
    parts.push(
      `Tool calls: ${toolNames
        .map((name) =>
          name === "apply_patch"
            ? `${name} with valid unified diff (---/+++/@@)`
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
