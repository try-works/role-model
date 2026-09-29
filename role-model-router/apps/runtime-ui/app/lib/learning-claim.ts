import { readEndpointModelLeaf } from "./effort-identity";

const textOrNull = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  const text = typeof value === "string" ? value.trim() : String(value);
  return text.length > 0 ? text : null;
};

/**
 * Run 101 addendum 50 `A50-R4` (operator-reported): "you shouldn't leak the full endpoint names and evidence file
 * name into the ui, is too long and not legible for users". The claim is recorded prose and reads, verbatim:
 *
 *   deepseek.personal.deepseek-api-key.global.deepseek-v4-pro-max outperformed
 *   openai.personal.openai-codex-subscription.global.gpt-5.6-luna for
 *   decision-req-4180d3df-48f5-4d8e-8385-2350ed320f72:holdout on run96-semantic-criteria@3+16364bdcbc6f by 1.00
 *   (holdout artifact:…)
 *
 * In a narrow column that is a wall of ids. This is a **display** transform only - the recorded text is unchanged
 * and is kept in the cell's title - and it does exactly three things: an endpoint id becomes the model it routes
 * with, using the same leaf the model columns show; a decision uuid collapses to its first eight characters; and a
 * scorer build hash and an artifact digest, neither of which a reader can use, are dropped.
 *
 * The store bounds a recorded claim to 256 characters (`MAX_TIP_CHARS`, `extensions/knowledge-worker/index.mjs`), so
 * a claim can also end mid-token: a dangling unterminated group is dropped for the same reason, and the recorded
 * text stays whole in the title.
 */
export function formatLearningClaim(recorded: unknown): string | null {
  const text = textOrNull(recorded);
  if (!text) return null;
  return (
    text
      // A dotted endpoint id → the model it routes with. Two dots or more, so a version such as `1.00` is untouched.
      .replace(
        /\b[a-z0-9-]+(?:\.[a-z0-9-]+){2,}\b/gi,
        (match) => readEndpointModelLeaf(match) || match,
      )
      // `decision-req-<uuid>:holdout` → `decision 4180d3df…`, and the `decision-replay-req-<uuid>-<hash>` form too.
      .replace(/\bdecision-(?:replay-)?req-([0-9a-f]{8})[0-9a-f-]*(?::[a-z]+)?/gi, "decision $1…")
      // Keep the scorer and its version; drop the build hash behind it. The lookahead keeps a version that is
      // followed by a word (and so is not a trailing hash) intact.
      .replace(/([a-z0-9][a-z0-9-]*@[0-9][0-9.]*)\+[0-9a-f]*(?![0-9a-z])/gi, "$1")
      // An artifact reference is a digest, not information for a reader. A group that carries nothing but the
      // reference goes whole; otherwise the reference is dropped and its host group is left balanced.
      .replace(/\s*\(\s*artifact:[0-9a-f]+\s*\)/gi, "")
      .replace(/\s*artifact:[0-9a-f]+/gi, "")
      // Removing the digest can leave empty or unbalanced parentheses behind.
      .replace(/\(\s*\)/g, "")
      .replace(/\s+\)/g, ")")
      // The store records the claim bounded to 256 characters, so a long one can end mid-group or mid-token. The
      // dangling fragment says nothing a reader can use; the recorded text stays whole in the cell's title.
      .replace(/\s*\([^)]*$/u, "")
      .replace(/\s+([.,])/g, "$1")
      .replace(/\s{2,}/g, " ")
      .trim()
  );
}
