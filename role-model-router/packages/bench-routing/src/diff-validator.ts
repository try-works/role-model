const PLACEHOLDER_DIFF_MARKERS = [
  /^----\/\+\+\+$/,
  /^\+\+\+\+\/----$/,
  /^\[file header\]$/i,
  /^<<<<<<< /,
  /^>>>>>>> /,
  /^=======\s*$/,
];

const CODEX_PATCH_BEGIN = /^\*\*\* Begin Patch$/m;
const CODEX_PATCH_END = /^\*\*\* End Patch$/m;
const CODEX_PATCH_FILE_OPERATION = /^\*\*\* (?:Update|Add|Delete) File: .+/m;
const CODEX_PATCH_CONTENT = /^(?:@@|[+-][^\r\n]*)$/m;

function isValidCodexPatchEnvelope(patch: string): boolean {
  return (
    CODEX_PATCH_BEGIN.test(patch) &&
    CODEX_PATCH_END.test(patch) &&
    CODEX_PATCH_FILE_OPERATION.test(patch) &&
    CODEX_PATCH_CONTENT.test(patch)
  );
}

export function isPlaceholderUnifiedDiff(diff: string): boolean {
  const trimmed = diff.trim();
  if (!trimmed) {
    return true;
  }
  if (PLACEHOLDER_DIFF_MARKERS.some((pattern) => pattern.test(trimmed))) {
    return true;
  }
  if (isValidCodexPatchEnvelope(trimmed)) {
    return false;
  }
  if (!trimmed.includes("@@")) {
    return true;
  }
  if (!/^---\s/m.test(trimmed) || !/^\+\+\+\s/m.test(trimmed)) {
    return true;
  }
  return false;
}

export function extractPatchArgumentsFromDeliverable(deliverable: string): string[] {
  const patches: string[] = [];
  try {
    const parsed = JSON.parse(deliverable) as unknown;
    collectPatchValues(parsed, patches);
  } catch {
    const inlineMatches = deliverable.matchAll(/"(?:diff|patch)"\s*:\s*"((?:\\.|[^"\\])*)"/g);
    for (const inline of inlineMatches) {
      if (inline[1]) {
        patches.push(JSON.parse(`"${inline[1]}"`) as string);
      }
    }
  }
  return patches;
}

function collectPatchValues(value: unknown, patches: string[]): void {
  if (!value || typeof value !== "object") {
    return;
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      collectPatchValues(entry, patches);
    }
    return;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.diff === "string") {
    patches.push(record.diff);
  }
  if (typeof record.patch === "string") {
    patches.push(record.patch);
  }
  if (record.arguments && typeof record.arguments === "object") {
    const args = record.arguments as Record<string, unknown>;
    if (typeof args.diff === "string") {
      patches.push(args.diff);
    }
    if (typeof args.patch === "string") {
      patches.push(args.patch);
    }
  }
  if (Array.isArray(record.tool_calls)) {
    for (const toolCall of record.tool_calls) {
      collectPatchValues(toolCall, patches);
    }
  }
  for (const nested of Object.values(record)) {
    if (nested && typeof nested === "object") {
      collectPatchValues(nested, patches);
    }
  }
}

export function deliverableHasInvalidPatch(deliverable: string): boolean {
  const patches = extractPatchArgumentsFromDeliverable(deliverable);
  if (patches.length === 0) {
    return false;
  }
  return patches.some((patch) => isPlaceholderUnifiedDiff(patch));
}

export function capJudgeScoreForInvalidDeliverable(input: {
  readonly score: number;
  readonly rationale: string;
  readonly deliverable: string;
}): { readonly score: number; readonly rationale: string } {
  if (!deliverableHasInvalidPatch(input.deliverable)) {
    return input;
  }
  const capped = Math.min(input.score, 0.4);
  return {
    score: capped,
    rationale: `${input.rationale} Invalid apply_patch payload (placeholder or malformed unified diff / Codex patch envelope); score capped.`,
  };
}
