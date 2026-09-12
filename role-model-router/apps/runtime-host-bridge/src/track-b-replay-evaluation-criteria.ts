/**
 * Run 97 semantic evaluation criteria derivation.
 *
 * The supervised replay endpoint requires `role-model.semantic-criteria.v1`, and the
 * routing-shadow scorer scores `required_terms`. Automatic replay has no operator to
 * type criteria, so the loop derives a bounded, deterministic criterion from the
 * recorded source output and records the derivation. It never invents a term when the
 * output cannot support one: the caller defers that capture with a receipt instead.
 */

export interface TrackBSemanticEvaluationCriteriaLike {
  readonly schemaVersion: "role-model.semantic-criteria.v1";
  readonly requiredTerms: readonly string[];
  readonly forbiddenTerms: readonly string[];
  readonly minOutputChars: number;
}

/**
 * Where an automatic replay's required terms came from. The source trial is graded
 * on the recorded source output, so criteria derived from that same output make the
 * source satisfy its own criterion by construction and no counterfactual can ever
 * win. Task evidence is branch-shared and keeps the comparison decidable.
 */
export type TrackBCriteriaEvidenceSource = "task_literal" | "task_text" | "recorded_output";

export interface TrackBAutomaticReplayCriteria {
  readonly criteria: TrackBSemanticEvaluationCriteriaLike;
  readonly derivation: string;
  readonly evidenceSource: TrackBCriteriaEvidenceSource;
}

const STOPWORDS = new Set([
  "about",
  "after",
  "again",
  "also",
  "because",
  "been",
  "before",
  "being",
  "between",
  "both",
  "could",
  "does",
  "doing",
  "done",
  "each",
  "from",
  "have",
  "having",
  "here",
  "into",
  "itself",
  "just",
  "more",
  "most",
  "must",
  "only",
  "other",
  "over",
  "same",
  "should",
  "some",
  "such",
  "than",
  "that",
  "their",
  "them",
  "then",
  "there",
  "these",
  "they",
  "this",
  "those",
  "through",
  "under",
  "until",
  "very",
  "were",
  "what",
  "when",
  "where",
  "which",
  "while",
  "with",
  "would",
  "your",
  "the",
  "and",
  "are",
  "but",
  "her",
  "his",
  "him",
  "had",
  "has",
  "get",
  "got",
  "will",
  "into",
  "yes",
  "no",
  "not",
  "one",
  "two",
  "all",
  "any",
  "can",
  "did",
  "for",
  "how",
  "its",
  "let",
  "may",
  "new",
  "now",
  "off",
  "old",
  "our",
  "out",
  "own",
  "say",
  "see",
  "set",
  "she",
  "too",
  "use",
  "was",
  "who",
  "why",
  "you",
]);

const DEFAULT_MAX_TERMS = 3;
/** Short substantive outputs (for example "OK") must still yield a criterion. */
const MIN_TERM_LENGTH = 2;
const MAX_TERM_LENGTH = 32;

function textFromContent(value: unknown): string | null {
  if (typeof value === "string") return value.trim() ? value : null;
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    for (const key of ["text", "content", "value", "output_text", "outputText"]) {
      const candidate = textFromContent(record[key]);
      if (candidate) return candidate;
    }
    return collectStrings(value).join(" ") || null;
  }
  if (!Array.isArray(value)) return null;
  const parts: string[] = [];
  for (const part of value) {
    if (typeof part === "string") {
      if (part.trim()) parts.push(part);
      continue;
    }
    if (!part || typeof part !== "object" || Array.isArray(part)) continue;
    const record = part as Record<string, unknown>;
    const text = typeof record.text === "string" ? record.text : record.content;
    if (typeof text === "string" && text.trim()) parts.push(text);
  }
  return parts.length ? parts.join(" ") : null;
}

/** Bounded recursive string collection for unknown response shapes. */
function collectStrings(value: unknown, depth = 0, collected: string[] = []): string[] {
  if (depth > 4 || collected.length >= 64) return collected;
  if (typeof value === "string") {
    if (value.trim()) collected.push(value);
    return collected;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, depth + 1, collected);
    return collected;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value as Record<string, unknown>)) {
      collectStrings(item, depth + 1, collected);
      if (collected.length >= 64) break;
    }
  }
  return collected;
}

/**
 * Read the recorded output text a capture can support. Durable captures store the
 * response either inline (`response.content`, legacy `outputText`) or as an ordered
 * message list whose assistant turn carries the output; text-only fallbacks keep the
 * automatic path deterministic without inventing content.
 */
export function extractSourceOutputText(capture: Record<string, unknown>): string | null {
  // A bounded excerpt supplied by the operations boundary takes precedence: it is the
  // only form available when the capture stores its response as a sealed artifact.
  const responseText = typeof capture.responseText === "string" ? capture.responseText : null;
  if (responseText?.trim()) return responseText;
  const response =
    capture.response && typeof capture.response === "object" && !Array.isArray(capture.response)
      ? (capture.response as Record<string, unknown>)
      : null;
  const responseContent = textFromContent(response?.content);
  if (responseContent) return responseContent;
  const outputText = typeof capture.outputText === "string" ? capture.outputText : null;
  if (outputText?.trim()) return outputText;
  const messages = Array.isArray(capture.messages) ? capture.messages : [];
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (!message || typeof message !== "object" || Array.isArray(message)) continue;
    const record = message as Record<string, unknown>;
    if (record.role !== "assistant") continue;
    const content = textFromContent(record.content);
    if (content) return content;
  }
  // Last resort: the recorded request text. It is branch-shared evidence, so the
  // derived criterion never depends on the branch being scored.
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (!message || typeof message !== "object" || Array.isArray(message)) continue;
    const record = message as Record<string, unknown>;
    if (record.role !== "user") continue;
    const content = textFromContent(record.content);
    if (content) return content;
  }
  return null;
}

/**
 * Read the task instruction a capture can support: the last user turn, or an inline
 * prompt field when the capture stores no message list. Assistant turns are never
 * used here because they are the graded artifact, not the task.
 */
export function extractTaskInstructionText(capture: Record<string, unknown>): string | null {
  const messageLists = [capture.messages, (capture.request as Record<string, unknown> | undefined)?.messages];
  for (const list of messageLists) {
    if (!Array.isArray(list)) continue;
    for (let index = list.length - 1; index >= 0; index -= 1) {
      const message = list[index];
      if (!message || typeof message !== "object" || Array.isArray(message)) continue;
      const record = message as Record<string, unknown>;
      if (record.role !== "user") continue;
      const content = textFromContent(record.content);
      if (content) return content;
    }
  }
  for (const key of ["promptText", "requestText"]) {
    const value = capture[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

function collectBoundedTerms(text: string, maxTerms: number): string[] {
  const terms: string[] = [];
  for (const token of text.toLowerCase().split(/[^a-z0-9]+/u)) {
    if (token.length < MIN_TERM_LENGTH || token.length > MAX_TERM_LENGTH) continue;
    if (STOPWORDS.has(token)) continue;
    if (terms.includes(token)) continue;
    terms.push(token);
    if (terms.length === maxTerms) break;
  }
  return terms;
}

/**
 * Bounded explicit-literal extraction from a task instruction: backticked or quoted
 * literals, and the word that follows "exactly" or "only". The literals are the parts
 * of the task a compliant answer must reproduce, so they are branch-shared evidence.
 */
function extractTaskLiterals(taskText: string): string[] {
  const literals: string[] = [];
  const quoted = /`([^`]{1,128})`|"([^"]{1,128})"|'([^']{1,128})'/gu;
  for (const match of taskText.matchAll(quoted)) {
    const value = match[1] ?? match[2] ?? match[3];
    if (value?.trim()) literals.push(value);
  }
  const required =
    /\b(?:exactly|only|token|marker|word|phrase|value)\s+([A-Za-z0-9][A-Za-z0-9._-]{1,63})/giu;
  for (const match of taskText.matchAll(required)) {
    if (match[1]) literals.push(match[1]);
  }
  return literals;
}

/**
 * Derive the automatic replay criterion from branch-shared task evidence, falling
 * back to the recorded source output only when the capture carries no usable task
 * text. Callers keep the recorded-output derivation available for receipts, but the
 * task-literal tier is what makes a counterfactual win reachable at all.
 */
export function deriveAutomaticReplayCriteria(input: {
  readonly taskText?: string | null;
  readonly sourceOutput?: string | null;
  readonly maxTerms?: number;
}): TrackBAutomaticReplayCriteria | null {
  const maxTerms =
    Number.isSafeInteger(input.maxTerms) && (input.maxTerms ?? 0) > 0
      ? Math.min(Number(input.maxTerms), 8)
      : DEFAULT_MAX_TERMS;
  const taskText = typeof input.taskText === "string" ? input.taskText : "";
  const literalTerms = collectBoundedTerms(extractTaskLiterals(taskText).join(" "), maxTerms);
  if (literalTerms.length > 0) {
    return {
      criteria: {
        schemaVersion: "role-model.semantic-criteria.v1",
        requiredTerms: literalTerms,
        forbiddenTerms: [],
        minOutputChars: 1,
      },
      derivation: `derived from task literal: ${literalTerms.join(", ")}`,
      evidenceSource: "task_literal",
    };
  }
  const taskTerms = collectBoundedTerms(taskText, maxTerms);
  if (taskTerms.length > 0) {
    return {
      criteria: {
        schemaVersion: "role-model.semantic-criteria.v1",
        requiredTerms: taskTerms,
        forbiddenTerms: [],
        minOutputChars: 1,
      },
      derivation: `derived from task text: ${taskTerms.join(", ")}`,
      evidenceSource: "task_text",
    };
  }
  const recorded = deriveSemanticEvaluationCriteria({
    sourceOutput: input.sourceOutput,
    maxTerms,
  });
  if (!recorded) return null;
  return {
    criteria: recorded.criteria,
    derivation: recorded.derivation,
    evidenceSource: "recorded_output",
  };
}

export function deriveSemanticEvaluationCriteria(input: {
  readonly sourceOutput: string | null | undefined;
  readonly maxTerms?: number;
}): {
  readonly criteria: TrackBSemanticEvaluationCriteriaLike;
  readonly derivation: string;
} | null {
  const raw = typeof input.sourceOutput === "string" ? input.sourceOutput : "";
  if (!raw.trim()) return null;
  const maxTerms =
    Number.isSafeInteger(input.maxTerms) && (input.maxTerms ?? 0) > 0
      ? Math.min(Number(input.maxTerms), 8)
      : DEFAULT_MAX_TERMS;
  const terms: string[] = [];
  for (const token of raw.toLowerCase().split(/[^a-z0-9]+/u)) {
    if (token.length < MIN_TERM_LENGTH || token.length > MAX_TERM_LENGTH) continue;
    if (STOPWORDS.has(token)) continue;
    if (terms.includes(token)) continue;
    terms.push(token);
    if (terms.length === maxTerms) break;
  }
  if (terms.length === 0) return null;
  return {
    criteria: {
      schemaVersion: "role-model.semantic-criteria.v1",
      requiredTerms: terms,
      forbiddenTerms: [],
      minOutputChars: 1,
    },
    derivation: `derived from recorded source output: ${terms.join(", ")}`,
  };
}
