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
]);

const DEFAULT_MAX_TERMS = 3;
const MIN_TERM_LENGTH = 4;
const MAX_TERM_LENGTH = 32;

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
