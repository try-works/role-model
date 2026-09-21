import { canonicalTaxonomy } from "@role-model-router/core";

/**
 * Run 98 addendum 58 slice 2.
 *
 * Requests that declare no `role_model.intent` still have to be attributed to the taxonomy: replay,
 * evaluation, the route-learning packs and the router's advisory gate all key on the taxonomy identity
 * (group, role, task, capabilities, modalities, tool classes). Pi declares an intent; DSH and other
 * clients do not, and until now those requests were recorded with `taxonomy_task_type: null` and could
 * never be scoped by task.
 *
 * The derivation here is deliberately deterministic and local — no model call, no network — and it always
 * answers with identifiers that exist in the shipped taxonomy. Its confidence and evidence say how strong
 * the signal was; only the router's advisory gate (confidence floor, cohort, score band) decides whether a
 * derivation may move a routing decision, so a weak derivation scopes evidence without steering traffic.
 */

export interface TaxonomyDerivationInput {
  readonly text: string;
  readonly toolClassIds?: readonly string[];
  readonly modalityIds?: readonly string[];
  readonly outputModalityIds?: readonly string[];
}

export interface DerivedTaxonomyClassification {
  readonly taskTypeId: string;
  readonly roleId: string;
  readonly groupId: string;
  readonly confidence: number;
  readonly evidence: readonly string[];
  readonly toolClassIds: readonly string[];
  readonly modalityIds: readonly string[];
  readonly taxonomyVersion: string;
  readonly contentRevision: string;
  readonly classificationContractVersion: string;
  /** The advisory intent shape the rest of the runtime already consumes. */
  readonly normalizedIntent: {
    readonly contractVersion: 1;
    readonly taxonomyVersion: string;
    readonly contentRevision: string;
    readonly classificationContractVersion: string;
    readonly source: "runtime_heuristic";
    readonly confidence: number;
    readonly role: { readonly id: string; readonly hard: false };
    readonly task: { readonly id: string; readonly hard: false };
    readonly capabilities: {
      readonly required: readonly string[];
      readonly preferred: readonly string[];
    };
    readonly modalities: { readonly required: readonly string[] };
    readonly toolClasses: readonly string[];
    readonly evidence: readonly string[];
  };
}

const MIN_CONFIDENCE = 0.2;
const MAX_CONFIDENCE = 0.9;
/** A generic text task that every text-capable endpoint can serve; used only when nothing else scores. */
const NO_SIGNAL_TASK_ID = "writer.summarize";

const knownToolClasses = new Set(canonicalTaxonomy.toolClasses.map((entry) => entry.id));
const knownModalities = new Set(canonicalTaxonomy.modalities.map((entry) => entry.id));
const roleById = new Map(canonicalTaxonomy.roles.map((role) => [role.id, role]));
const taskById = new Map(canonicalTaxonomy.tasks.map((task) => [task.id, task]));

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "not",
  "with",
  "that",
  "this",
  "from",
  "into",
  "when",
  "user",
  "asks",
  "ask",
  "only",
  "their",
  "they",
  "them",
  "then",
  "than",
  "over",
  "under",
  "about",
  "which",
  "while",
  "without",
  "use",
  "using",
  "request",
  "requests",
  "report",
  "reports",
  "something",
  "instead",
  "directly",
  "already",
  "known",
]);

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
}

/**
 * A request says "summarize" where the taxonomy says "summary", "translating" where it says "translate",
 * "debugging" where it says "debug". A compact suffix stemmer lets those forms meet without a dependency,
 * and — unlike a bare prefix match — it does not confuse "routing" with "routine" or "result" with
 * "restore": the stem keeps the whole word less its common inflection.
 */
const STEM_SUFFIXES = [
  "izations",
  "ization",
  "ations",
  "ation",
  "ments",
  "ment",
  "ings",
  "ing",
  "ies",
  "ied",
  "izes",
  "ize",
  "ises",
  "ise",
  "ers",
  "er",
  "ed",
  "es",
  "s",
] as const;

export function stemTaxonomyToken(token: string): string {
  let stem = token;
  for (const suffix of STEM_SUFFIXES) {
    if (stem.endsWith(suffix) && stem.length - suffix.length >= 4) {
      stem = stem.slice(0, stem.length - suffix.length);
      break;
    }
  }
  if (stem.length >= 6 && stem.endsWith("y")) {
    stem = stem.slice(0, -1);
  }
  if (stem.length >= 5 && stem.endsWith("e")) {
    stem = stem.slice(0, -1);
  }
  // "debugging" -> "debugg" -> "debug"; "planned" -> "plann" -> "plan".
  stem = stem.replace(/([bcdfglmnprst])\1$/, "$1");
  return stem;
}

interface RequestTokenIndex {
  readonly exact: ReadonlySet<string>;
  readonly stems: ReadonlySet<string>;
  readonly counts: ReadonlyMap<string, number>;
}

function requestTokenIndex(tokens: Iterable<string>): RequestTokenIndex {
  const exact = new Set<string>();
  const stems = new Set<string>();
  const counts = new Map<string, number>();
  for (const token of tokens) {
    exact.add(token);
    stems.add(stemTaxonomyToken(token));
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return { exact, stems, counts };
}

/** Document frequency per token over the taxonomy's own classifier text, so discriminative words weigh more. */
const tokenWeights = (() => {
  const documentFrequency = new Map<string, number>();
  for (const task of canonicalTaxonomy.tasks) {
    const tokens = new Set(tokenize(`${task.classifier.useWhen} ${task.label} ${task.description}`));
    for (const token of tokens) {
      documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1);
    }
  }
  const weights = new Map<string, number>();
  const total = Math.max(1, canonicalTaxonomy.tasks.length);
  for (const [token, frequency] of documentFrequency) {
    weights.set(token, Math.log(1 + total / frequency));
  }
  return weights;
})();

function tokenWeight(token: string): number {
  return tokenWeights.get(token) ?? Math.log(1 + canonicalTaxonomy.tasks.length);
}

function tokenMatchesRequestToken(
  token: string,
  request: RequestTokenIndex,
): boolean {
  if (request.exact.has(token)) {
    return true;
  }
  return request.stems.has(stemTaxonomyToken(token));
}

const taskTokenWeights = (() => {
  const map = new Map<string, Map<string, number>>();
  for (const task of canonicalTaxonomy.tasks) {
    const weights = new Map<string, number>();
    for (const token of tokenize(task.classifier.useWhen)) {
      weights.set(token, (weights.get(token) ?? 0) + tokenWeight(token));
    }
    for (const token of tokenize(`${task.label} ${task.description}`)) {
      weights.set(token, (weights.get(token) ?? 0) + tokenWeight(token) * 0.5);
    }
    map.set(task.id, weights);
  }
  return map;
})();

const taskNegativeWeights = (() => {
  const map = new Map<string, Map<string, number>>();
  for (const task of canonicalTaxonomy.tasks) {
    const weights = new Map<string, number>();
    for (const token of tokenize(task.classifier.doNotUseWhen)) {
      weights.set(token, (weights.get(token) ?? 0) + tokenWeight(token));
    }
    map.set(task.id, weights);
  }
  return map;
})();

/** Transport facts a taxonomy capability requirement can be satisfied by, as far as the request shape shows. */
function resolveTransportCapabilities(
  toolClassIds: readonly string[],
  modalityIds: readonly string[],
  outputModalityIds: readonly string[],
): Set<string> {
  const capabilities = new Set<string>(["text.chat"]);
  if (toolClassIds.length > 0) {
    capabilities.add("tools.function_calling");
  }
  if (toolClassIds.includes("shell.execute")) {
    capabilities.add("tools.command_execution");
  }
  if (toolClassIds.includes("browser.control")) {
    capabilities.add("tools.browser_control");
  }
  if (toolClassIds.includes("web.search") || toolClassIds.includes("http.fetch")) {
    capabilities.add("web.search");
  }
  if (modalityIds.includes("image")) {
    capabilities.add("vision.input");
  }
  if (outputModalityIds.includes("image")) {
    capabilities.add("vision.output");
  }
  return capabilities;
}

function scoreTask(input: {
  readonly taskId: string;
  readonly tokens: RequestTokenIndex;
  readonly normalizedPhrase: string;
  readonly toolClassIds: readonly string[];
  readonly modalityIds: readonly string[];
  readonly transportCapabilities: ReadonlySet<string>;
}): { readonly score: number; readonly lexical: number } {
  const task = taskById.get(input.taskId);
  if (!task) {
    return { score: Number.NEGATIVE_INFINITY, lexical: 0 };
  }
  let lexical = 0;
  const positive = taskTokenWeights.get(task.id);
  if (positive) {
    for (const [token, weight] of positive) {
      if (tokenMatchesRequestToken(token, input.tokens)) {
        lexical += weight;
      }
    }
  }
  const negative = taskNegativeWeights.get(task.id);
  if (negative) {
    /**
     * A single incidental word is not the "do not use when" condition: `writer.summarize` says "User asks to
     * make a routing decision requiring tools", and a request that merely mentions a routing result must not
     * lose the task. The condition is assumed only when the whole phrase appears or when at least two of its
     * distinctive words do.
     */
    let matchedNegativeWeight = 0;
    let matchedNegativeCount = 0;
    for (const [token, weight] of negative) {
      if (tokenMatchesRequestToken(token, input.tokens)) {
        matchedNegativeWeight += weight;
        matchedNegativeCount += 1;
      }
    }
    const negativePhrase = task.classifier.doNotUseWhen
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();
    const negativePhraseMatched =
      negativePhrase.length >= 12 && input.normalizedPhrase.includes(negativePhrase);
    if (negativePhraseMatched || matchedNegativeCount >= 2) {
      lexical -= Math.min(6, matchedNegativeWeight);
    }
  }
  // A request that contains the task's own declared signal verbatim is strong evidence for that task.
  const useWhenPhrase = task.classifier.useWhen.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  if (useWhenPhrase.length >= 12 && input.normalizedPhrase.includes(useWhenPhrase)) {
    lexical += 8;
  }
  let score = lexical;
  const modalityFit = task.requiredModalities.every((modality) =>
    input.modalityIds.includes(modality),
  );
  score += modalityFit ? 1.5 : -4;
  const toolMatches = task.toolClasses.filter((toolClass) =>
    input.toolClassIds.includes(toolClass),
  ).length;
  score += Math.min(2, toolMatches * 0.75);
  const transportMatches = task.requiredCapabilities.filter((capability) =>
    input.transportCapabilities.has(capability),
  ).length;
  score += Math.min(2, transportMatches * 0.5);
  /**
   * A task whose declared requirements are not visible anywhere in the request shape is a weaker reading of
   * the same words: "Summarize the routing result" shows text and nothing legal, so the generic
   * `writer.summarize` (text.chat) beats `legal.contract.summarize` (legal.analysis, long_context) unless the
   * text itself carries the legal evidence. The penalty is capped so a strong lexical match still wins.
   */
  const missingRequired = task.requiredCapabilities.filter(
    (capability) => !input.transportCapabilities.has(capability),
  ).length;
  score -= Math.min(2.25, missingRequired * 0.75);
  return { score, lexical };
}

export function deriveTaxonomyClassification(
  input: TaxonomyDerivationInput,
): DerivedTaxonomyClassification {
  const toolClassIds = [
    ...new Set((input.toolClassIds ?? []).filter((id) => knownToolClasses.has(id))),
  ].sort();
  const modalityIds = [
    ...new Set((input.modalityIds ?? []).filter((id) => knownModalities.has(id))),
  ].sort();
  const outputModalityIds = [
    ...new Set((input.outputModalityIds ?? []).filter((id) => knownModalities.has(id))),
  ].sort();
  const tokens = new Map<string, number>();
  for (const token of tokenize(input.text)) {
    tokens.set(token, (tokens.get(token) ?? 0) + 1);
  }
  const requestTokens = requestTokenIndex(tokens.keys());
  const normalizedPhrase = input.text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const transportCapabilities = resolveTransportCapabilities(
    toolClassIds,
    modalityIds,
    outputModalityIds,
  );

  const roleSignals = new Map<string, number>();
  for (const role of canonicalTaxonomy.roles) {
    let score = 0;
    for (const signal of role.classification?.positiveSignals ?? []) {
      const normalized = signal.toLowerCase().trim();
      if (normalized.length >= 3 && normalizedPhrase.includes(normalized)) {
        score += 2;
      }
    }
    for (const signal of role.classification?.negativeSignals ?? []) {
      const normalized = signal.toLowerCase().trim();
      if (normalized.length >= 3 && normalizedPhrase.includes(normalized)) {
        score -= 2;
      }
    }
    roleSignals.set(role.id, score);
  }

  let best:
    | {
        readonly roleId: string;
        readonly taskId: string;
        readonly score: number;
        readonly lexical: number;
      }
    | undefined;
  let runnerUpScore = Number.NEGATIVE_INFINITY;
  /**
   * One pass over the tasks: the lexical/shape score does not depend on the role, so it is computed once and
   * combined with each role the task may be routed under (its own primary role, then its compatible roles).
   */
  for (const task of canonicalTaxonomy.tasks) {
    const { score: taskScore, lexical } = scoreTask({
      taskId: task.id,
      tokens: requestTokens,
      normalizedPhrase,
      toolClassIds,
      modalityIds,
      transportCapabilities,
    });
    const roleCandidates = [
      task.primaryRole,
      ...task.compatibleRoles.filter((roleId) => roleId !== task.primaryRole),
    ];
    for (const roleId of roleCandidates) {
      const roleScore = roleSignals.get(roleId) ?? 0;
      const affinity = roleId === task.primaryRole ? 2 : 1;
      const combined = roleScore + taskScore + affinity;
      if (!best || combined > best.score) {
        if (best) {
          runnerUpScore = Math.max(runnerUpScore, best.score);
        }
        best = {
          roleId,
          taskId: task.id,
          score: combined,
          lexical: lexical + roleScore,
        };
      } else {
        runnerUpScore = Math.max(runnerUpScore, combined);
      }
    }
  }

  const evidence: string[] = [];
  let taskId: string;
  let roleId: string;
  let confidence: number;
  if (!best || best.lexical <= 0) {
    taskId = NO_SIGNAL_TASK_ID;
    roleId = taskById.get(taskId)?.primaryRole ?? "writer";
    confidence = MIN_CONFIDENCE;
    evidence.push("no-signal-default");
  } else {
    taskId = best.taskId;
    roleId = best.roleId;
    const margin = Number.isFinite(runnerUpScore) ? Math.max(0, best.score - runnerUpScore) : 0;
    confidence = Math.min(
      MAX_CONFIDENCE,
      Math.max(
        MIN_CONFIDENCE + 0.05,
        0.25 + Math.min(0.35, margin * 0.05) + Math.min(0.3, best.score * 0.03),
      ),
    );
    evidence.push(
      `taxonomy-signal:${taskId}`,
      `margin:${margin.toFixed(2)}`,
      `score:${best.score.toFixed(2)}`,
    );
  }

  const task = taskById.get(taskId);
  const role = roleById.get(roleId) ?? (task ? roleById.get(task.primaryRole) : undefined);
  const resolvedRoleId = role?.id ?? "writer";
  const groupId = role?.primaryGroupId ?? "communication";
  const requiredCapabilities = [...(task?.requiredCapabilities ?? ["text.chat"])];
  const preferredCapabilities = [...(task?.preferredCapabilities ?? [])];

  return {
    taskTypeId: taskId,
    roleId: resolvedRoleId,
    groupId,
    confidence,
    evidence,
    toolClassIds,
    modalityIds,
    taxonomyVersion: canonicalTaxonomy.manifest.taxonomyVersion,
    contentRevision: canonicalTaxonomy.manifest.contentRevision,
    classificationContractVersion: canonicalTaxonomy.manifest.classificationContractVersion,
    normalizedIntent: {
      contractVersion: 1,
      taxonomyVersion: canonicalTaxonomy.manifest.taxonomyVersion,
      contentRevision: canonicalTaxonomy.manifest.contentRevision,
      classificationContractVersion: canonicalTaxonomy.manifest.classificationContractVersion,
      source: "runtime_heuristic",
      confidence,
      role: { id: resolvedRoleId, hard: false },
      task: { id: taskId, hard: false },
      capabilities: {
        required: requiredCapabilities,
        preferred: preferredCapabilities,
      },
      modalities: { required: modalityIds },
      toolClasses: toolClassIds,
      evidence,
    },
  };
}
