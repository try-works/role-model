/**
 * Progressive-disclosure taxonomy classification.
 *
 * Ported from `packages/pi-role-model/src/taxonomy/classify-with-progressive-disclosure.ts`
 * with the algorithm unchanged, because the emitted `role_model.intent` object is
 * the runtime's routing input and a behavioural drift here would silently change
 * routing. Every scoring rule, threshold, ordering dependency and literal below is
 * deliberate; see `docs/plans/dsh-role-model-implementation.md` §5.
 *
 * Two properties are load-bearing and pinned by specs:
 *  - role selection is **always** group-first scoring (the regex rule table only
 *    refines the task type, seeds capabilities, and supplies a tool-class fallback);
 *  - ties resolve by declaration order, so the on-disk order of `roleSummaries` and
 *    of each role's task chunk must not be re-sorted.
 *
 * @module @try-works/dsh-role-model/taxonomy/classify-with-progressive-disclosure
 */

import type { CompactRoleTask, CompactTaxonomy } from "./compact-data.js";
import {
  type StagedCompactTaxonomyReader,
  createStagedCompactTaxonomyReader,
} from "./staged-compact-taxonomy.js";

/** Request signals that bias classification beyond the prompt text. */
export interface ClassificationContext {
  readonly hasTools: boolean;
  readonly toolNames: readonly string[];
  readonly hasImages: boolean;
  readonly hasFiles: boolean;
  readonly fileExtensions: readonly string[];
}

/** Inputs to {@link classifyWithProgressiveDisclosure}. */
export interface ProgressiveClassificationInput {
  readonly prompt: string;
  readonly taxonomy?: CompactTaxonomy | undefined;
  readonly reader?: StagedCompactTaxonomyReader | undefined;
  readonly context?: ClassificationContext | undefined;
}

/** The classification result, including the wire object. */
export interface ProgressiveClassification {
  readonly role_model: {
    readonly contract_version: 1;
    readonly intent: {
      readonly taxonomy_version: string;
      readonly content_revision: string;
      readonly classification_contract_version: string;
      readonly classification_version: string;
      readonly source: "heuristic";
      readonly confidence: number;
      readonly role_hint_id: string;
      readonly role_source: "heuristic";
      readonly task_type: string;
      readonly task_action: string;
      readonly task_variant: string | null;
      readonly task_source: "heuristic";
      readonly task_confidence: number;
      readonly preferred_capabilities: readonly string[];
      readonly required_modalities: readonly string[];
      readonly output_modalities: readonly string[];
      readonly tool_classes: readonly string[];
      readonly context_tokens_estimate: number;
      readonly evidence: readonly string[];
      readonly alternatives: readonly {
        readonly role_hint_id: string;
        readonly task_type: string;
      }[];
    };
  };
  readonly candidateGroupIds: readonly string[];
  readonly candidateRoleIds: readonly string[];
  readonly loadedChunks: readonly string[];
  readonly hiddenModelCallUsed: false;
}

/**
 * Regex rules. Ordered; `rules.find` therefore resolves ties by array order.
 *
 * These never select the role — group-first scoring does. They refine the task
 * type when they agree with the scored role, seed `preferred_capabilities`, and
 * supply `tool_classes` when the selected task declares none.
 */
const rules: readonly {
  readonly pattern: RegExp;
  readonly evidence: string;
  readonly roleId: string;
  readonly taskType: string;
  readonly alternativeTasks?: readonly { readonly roleId: string; readonly taskType: string }[];
  readonly capabilities: readonly string[];
  readonly toolClasses: readonly string[];
}[] = [
  {
    pattern: /\b(implement|bug fix|fix|patch|regression test)\b/iu,
    evidence: "implementation/fix signal",
    roleId: "coder",
    taskType: "coder.edit",
    alternativeTasks: [{ roleId: "coder", taskType: "coder.test.write" }],
    capabilities: ["code.read", "code.write", "tools.command_execution"],
    toolClasses: ["filesystem.read", "filesystem.write", "shell.execute"],
  },
  {
    pattern: /\b(security|risk|vulnerab|threat|diff)\b/iu,
    evidence: "security/risk/diff signal",
    roleId: "security",
    taskType: "security.audit",
    alternativeTasks: [{ roleId: "coder", taskType: "coder.review" }],
    capabilities: ["security.analysis", "code.read"],
    toolClasses: ["filesystem.read"],
  },
  {
    pattern: /\b(current|public documentation|cite|compare|sources?)\b/iu,
    evidence: "current research/citation signal",
    roleId: "researcher",
    taskType: "researcher.web_research.current",
    alternativeTasks: [{ roleId: "researcher", taskType: "researcher.compare_sources" }],
    capabilities: ["web.search", "citation.synthesis"],
    toolClasses: ["web.search", "http.fetch"],
  },
  {
    pattern: /\b(support notes|customer reply|ticket|apology)\b/iu,
    evidence: "support communication signal",
    roleId: "support",
    taskType: "support.ticket.reply",
    alternativeTasks: [{ roleId: "writer", taskType: "writer.email.write" }],
    capabilities: ["communication.user_facing"],
    toolClasses: [],
  },
  {
    pattern: /\b(schema|migration plan|api design|architecture)\b/iu,
    evidence: "architecture/schema migration signal",
    roleId: "architect",
    taskType: "architect.migration.strategy",
    alternativeTasks: [{ roleId: "data", taskType: "data.schema.review" }],
    capabilities: ["reasoning.multi_step", "data.schema"],
    toolClasses: [],
  },
  {
    pattern: /\b(product requirements|acceptance criteria|workflow)\b/iu,
    evidence: "product requirements signal",
    roleId: "product",
    taskType: "product.requirements",
    alternativeTasks: [{ roleId: "planner", taskType: "planner.requirements" }],
    capabilities: ["reasoning.multi_step"],
    toolClasses: [],
  },
];

/** The advisory role used when no candidate group yields a role. */
const fallbackRoleId = "writer";

/** The advisory task used when no candidate group yields a role. */
const fallbackTaskType = "writer.summarize";

/** Split a task type into its action and optional variant. */
function taskParts(taskType: string): readonly [string, string | null] {
  const parts = taskType.split(".").slice(1);
  return [parts[0] ?? taskType, parts.length > 1 ? parts.slice(1).join(".") : null];
}

/**
 * Tokenize for scoring.
 *
 * Lower-cases, strips anything but `[a-z0-9.]`, then splits on whitespace and
 * dots and drops tokens shorter than three characters. Splitting on dots is
 * deliberate: it makes capability ids such as `code.read` contribute `code` and
 * `read`, and it keeps `to`/`a`/`or` from ever matching.
 */
function words(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9.]+/gu, " ")
    .split(/[\s.]+/u)
    .filter((word) => word.length >= 3);
}

/**
 * Score one task against the prompt.
 *
 * Counts every *occurrence* of a prompt word across all searchable fields, so a
 * word present in both the description and `useWhen` counts twice. That quirk is
 * what makes one plausible task outrank another and is intentionally preserved.
 */
function scoreTaskForPrompt(task: CompactRoleTask, prompt: string): number {
  const promptWords = new Set(words(prompt));
  const searchable = [
    task.id,
    task.label,
    task.description ?? "",
    task.classifier?.useWhen ?? "",
    task.classifier?.doNotUseWhen ?? "",
    ...task.requiredCapabilities,
    ...task.preferredCapabilities,
    ...task.toolClasses,
    ...task.variants,
  ].join(" ");
  let score = 0;
  for (const word of words(searchable)) {
    if (promptWords.has(word)) score += 1;
  }
  if (/\b(regression|test|tests|testing)\b/iu.test(prompt) && /\btest\b/u.test(task.id)) score += 5;
  if (
    /\b(review|audit|risk|risks|security)\b/iu.test(prompt) &&
    /\b(audit|review|security)\b/u.test(task.id)
  ) {
    score += 4;
  }
  if (
    /\b(requirements|acceptance|workflow)\b/iu.test(prompt) &&
    /\b(requirements|plan)\b/u.test(task.id)
  ) {
    score += 4;
  }
  if (
    /\b(current|public|docs|documentation|cite|compare|sources|web)\b/iu.test(prompt) &&
    /\b(web_research|research)\b/u.test(task.id)
  ) {
    score += 4;
  }
  if (
    /\b(schema|migration|architecture|api)\b/iu.test(prompt) &&
    /\b(migration|architecture|design)\b/u.test(task.id)
  ) {
    score += 4;
  }
  return score;
}

/**
 * Choose one task: an exact id match first, else the highest-scoring task with a
 * positive score, else nothing (the caller then keeps the requested task type).
 */
function selectTask(
  roleTasks: readonly CompactRoleTask[],
  requestedTaskType: string,
  prompt: string,
): CompactRoleTask | undefined {
  const exactTask = roleTasks.find((task) => task.id === requestedTaskType);
  if (exactTask !== undefined) return exactTask;
  return roleTasks
    .map((task) => ({ task, score: scoreTaskForPrompt(task, prompt) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)[0]?.task;
}

/** Alternatives offered when no role scored at all. */
function fallbackAlternatives(taxonomy: CompactTaxonomy): readonly {
  readonly role_hint_id: string;
  readonly task_type: string;
}[] {
  return ["researcher", "writer", "product", "analyst"]
    .filter((roleId) => roleId !== fallbackRoleId)
    .filter((roleId) => taxonomy.roleSummaries.some((role) => role.id === roleId))
    .slice(0, 3)
    .map((roleId) => ({
      role_hint_id: roleId,
      task_type: taxonomy.roleTaskChunks[roleId]?.[0]?.id ?? `${roleId}.general`,
    }));
}

/** Group keyword sets used by group scoring. */
const groupKeywordSets: Record<string, readonly string[]> = {
  engineering: [
    "code",
    "implement",
    "bug",
    "fix",
    "patch",
    "diff",
    "security",
    "schema",
    "migration",
    "api",
    "runtime",
    "test",
    "deploy",
    "debug",
    "refactor",
    "database",
    "sql",
    "query",
    "infrastructure",
    "server",
    "compile",
    "build",
    "pipeline",
    "ci",
    "cd",
    "container",
    "kubernetes",
    "docker",
    "endpoint",
    "service",
    "crash",
    "failure",
    "startup",
    "port",
    "install",
    "configure",
    "package",
    "dependency",
    "vulnerability",
    "threat",
    "auth",
    "permission",
    "role",
    "access",
    "incident",
    "script",
    "module",
    "library",
    "framework",
    "version",
    "upgrade",
    "unit test",
    "integration test",
    "e2e",
    "performance test",
  ],
  product_design: [
    "product",
    "requirements",
    "acceptance criteria",
    "workflow",
    "design",
    "roadmap",
    "user story",
    "feature",
    "prioritize",
    "milestone",
    "sprint",
    "backlog",
    "release plan",
    "rollout",
    "ui",
    "interface",
    "visual",
    "layout",
    "wireframe",
    "prototype",
    "mockup",
    "usability",
    "accessibility",
    "responsive",
    "interaction",
    "compare options",
    "evaluate",
    "assess",
    "score",
    "rank",
    "decision matrix",
    "tradeoff",
    "analysis",
    "metrics",
    "kpi",
    "business plan",
    "strategy",
    "operating model",
    "okr",
  ],
  knowledge_research: [
    "research",
    "current",
    "public documentation",
    "cite",
    "compare",
    "sources",
    "evidence",
    "literature",
    "paper",
    "study",
    "experiment",
    "scientific",
    "hypothesis",
    "method",
    "peer review",
    "protocol",
    "math",
    "solve",
    "calculate",
    "proof",
    "derive",
    "formula",
    "statistics",
    "optimize",
    "model",
    "simulation",
    "teach",
    "learn",
    "lesson",
    "curriculum",
    "quiz",
    "tutor",
    "educate",
    "concept",
    "explain in simple terms",
    "organize notes",
    "knowledge base",
    "retrieve",
    "memory",
    "summarize notes",
    "archive",
    "context brief",
  ],
  business: [
    "strategy",
    "market",
    "sales",
    "finance",
    "procurement",
    "vendor",
    "cost",
    "budget",
    "pricing",
    "roi",
    "revenue",
    "forecast",
    "positioning",
    "campaign",
    "seo",
    "ad copy",
    "marketing",
    "audience",
    "email sequence",
    "landing page",
    "social media",
    "outreach",
    "proposal",
    "enterprise",
    "discovery call",
    "objection",
    "cold email",
    "sales pitch",
    "account plan",
    "rfp",
    "purchase",
    "contract",
    "negotiation",
    "scorecard",
    "competitive",
    "swot",
    "partnership",
  ],
  communication: [
    "write",
    "edit",
    "summarize",
    "documentation",
    "blog",
    "article",
    "email",
    "release notes",
    "prose",
    "style",
    "tone",
    "voice",
    "translate",
    "localize",
    "locale",
    "language",
    "multilingual",
    "creative",
    "brainstorm",
    "name",
    "tagline",
    "script",
    "story",
    "copywriting",
    "brand",
    "visual prompt",
    "social post",
    "support",
    "customer",
    "ticket",
    "triage",
    "faq",
    "meeting",
    "agenda",
    "schedule",
    "follow up",
    "coordinate",
    "handoff",
    "status update",
    "reminder",
    "inbox",
  ],
  governance_safety: [
    "legal",
    "compliance",
    "privacy",
    "health",
    "safety",
    "risk",
    "policy",
    "license",
    "terms",
    "regulation",
    "gdpr",
    "recruit",
    "hire",
    "job description",
    "interview",
    "candidate",
    "offer",
    "pipeline",
    "sourcing",
    "scorecard",
    "symptom",
    "medication",
    "wellness",
    "exercise",
    "nutrition",
    "appointment",
    "care",
    "mental health",
  ],
};

/**
 * Choose up to three candidate groups: ordered regex signals, then keyword
 * hit-counts, then context boosts, deduped and filtered to known groups. An empty
 * result falls back to the first three groups in on-disk order.
 */
function selectCandidateGroupIds(
  prompt: string,
  groups: CompactTaxonomy["groups"],
  context?: ClassificationContext,
): readonly string[] {
  const groupRegexSignals: readonly { readonly groupId: string; readonly pattern: RegExp }[] = [
    {
      groupId: "engineering",
      pattern:
        /\b(code|implement|bug|fix|patch|diff|security|schema|migration|api|runtime|test|deploy)\b/iu,
    },
    {
      groupId: "knowledge_research",
      pattern: /\b(current|public documentation|cite|compare|sources?|research|evidence)\b/iu,
    },
    {
      groupId: "product_design",
      pattern: /\b(product|requirements|acceptance criteria|workflow|design|roadmap)\b/iu,
    },
    {
      groupId: "communication",
      pattern: /\b(support|customer|reply|ticket|notes|email|write|summarize)\b/iu,
    },
    {
      groupId: "business",
      pattern: /\b(strategy|market|sales|finance|procurement|vendor|cost)\b/iu,
    },
    {
      groupId: "governance_safety",
      pattern: /\b(legal|compliance|privacy|health|safety|risk|policy)\b/iu,
    },
  ];

  const matchedByRegex = groupRegexSignals
    .filter((signal) => signal.pattern.test(prompt))
    .map((signal) => signal.groupId);

  const promptWords = words(prompt);
  const scoredByKeywords = Object.entries(groupKeywordSets)
    .filter(([, keywords]) => keywords.length > 0)
    .map(([groupId, keywords]) => {
      const hits = keywords.filter(
        (keyword) =>
          promptWords.includes(keyword) || prompt.toLowerCase().includes(keyword.toLowerCase()),
      );
      return { groupId, score: hits.length };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  const contextBoosted: string[] = [];
  if (context !== undefined) {
    if (context.hasTools) contextBoosted.push("engineering");
    if (context.hasImages) contextBoosted.push("product_design");
    if (context.hasFiles) contextBoosted.push("engineering", "knowledge_research");
  }

  const matchedGroupIds = [
    ...new Set([
      ...matchedByRegex,
      ...scoredByKeywords.map((entry) => entry.groupId),
      ...contextBoosted,
    ]),
  ].filter((groupId) => groups.some((group) => group.id === groupId));

  return matchedGroupIds.length > 0
    ? matchedGroupIds.slice(0, 3)
    : groups.slice(0, 3).map((group) => group.id);
}

/** Whether a role belongs to one of the candidate groups. */
function roleIsInCandidateGroup(
  role: CompactTaxonomy["roleSummaries"][number] | undefined,
  candidateGroupIds: readonly string[],
): boolean {
  if (role === undefined) return false;
  return (
    candidateGroupIds.includes(role.primaryGroupId) ||
    role.secondaryGroupIds.some((groupId) => candidateGroupIds.includes(groupId))
  );
}

/** Tool-name to role hints, worth at most +1 per role. */
const toolNameRoleHints: Record<string, readonly string[]> = {
  read_file: ["coder", "architect", "security", "data"],
  write_file: ["coder", "architect"],
  edit_file: ["coder"],
  search_file: ["coder", "architect", "researcher"],
  execute_command: ["coder", "operator", "tester"],
  browser_navigate: ["researcher", "tester", "designer"],
  browser_click: ["tester", "designer"],
  browser_snapshot: ["tester", "designer"],
  web_search: ["researcher", "analyst", "knowledge"],
  web_fetch: ["researcher", "knowledge"],
  db_query: ["data", "analyst"],
  db_schema: ["data", "architect"],
  git_commit: ["coder"],
  git_diff: ["coder", "security"],
  run_tests: ["tester", "coder"],
  // DeepSeek Harness tool names, so the same +1 signals fire here.
  read: ["coder", "architect", "security", "data", "knowledge"],
  write: ["coder", "architect", "writer"],
  edit: ["coder", "writer"],
  glob: ["coder", "architect", "data"],
  grep: ["coder", "architect", "security", "data"],
  pwsh: ["coder", "operator", "tester"],
  bash: ["coder", "operator", "tester"],
  subagent: ["coordinator", "planner", "architect"],
  skill: ["knowledge", "educator", "coordinator"],
  present: ["writer", "designer", "product"],
  list_agents: ["coordinator"],
  send_message: ["coordinator"],
  create_goal: ["planner", "product"],
  todo_write: ["planner", "coordinator"],
  read_image: ["designer", "product", "analyst"],
};

/** File-extension to role hints, worth at most +1 per role. */
const fileExtensionRoleHints: Record<string, readonly string[]> = {
  ".sql": ["data", "architect"],
  ".csv": ["data", "analyst"],
  ".json": ["data", "coder", "architect"],
  ".yaml": ["coder", "operator", "architect"],
  ".yml": ["coder", "operator", "architect"],
  ".py": ["coder", "data"],
  ".ts": ["coder", "architect"],
  ".tsx": ["coder", "designer"],
  ".js": ["coder"],
  ".html": ["coder", "designer"],
  ".css": ["designer"],
  ".md": ["writer", "knowledge", "support"],
  ".pdf": ["knowledge", "legal", "researcher"],
  ".png": ["designer", "product"],
  ".jpg": ["designer", "product"],
  ".svg": ["designer"],
  ".toml": ["coder", "operator"],
};

/** Roles that benefit from tools being present at all. */
const engineeringRoles = ["coder", "architect", "operator", "tester", "security", "data"];

/** Roles that benefit from image input. */
const productDesignRoles = ["designer", "product"];

/** Roles that benefit from files being present. */
const knowledgeRoles = ["researcher", "knowledge", "scientist"];

/**
 * Score one role against the prompt.
 *
 * Positive signals are counted once each (presence, not occurrences); negative
 * signals subtract three, which is what lets an explicit "this is not that" beat a
 * single weak positive.
 */
function scoreRoleForPrompt(
  role: CompactTaxonomy["roleSummaries"][number],
  prompt: string,
  context?: ClassificationContext,
): number {
  const promptLower = prompt.toLowerCase();
  let score = 0;
  const classification = role.classification;
  if (classification !== undefined) {
    for (const signal of classification.positiveSignals) {
      if (promptLower.includes(signal.toLowerCase())) score += 2;
    }
    for (const signal of classification.negativeSignals) {
      if (promptLower.includes(signal.toLowerCase())) score -= 3;
    }
    const promptWords = new Set(words(prompt));
    for (const word of words(classification.summary)) {
      if (promptWords.has(word)) score += 1;
    }
  }
  const descWords = words(role.description ?? "");
  const promptWords = new Set(words(prompt));
  for (const word of descWords) {
    if (promptWords.has(word)) score += 1;
  }
  if (promptLower.includes(role.id)) score += 4;
  if (promptLower.includes(role.label.toLowerCase())) score += 3;

  if (context !== undefined) {
    if (context.hasTools && engineeringRoles.includes(role.id)) score += 2;
    if (context.hasImages && productDesignRoles.includes(role.id)) score += 2;
    if (
      context.hasFiles &&
      (engineeringRoles.includes(role.id) || knowledgeRoles.includes(role.id))
    ) {
      score += 1;
    }
    for (const toolName of context.toolNames) {
      const hints = toolNameRoleHints[toolName];
      if (hints?.includes(role.id)) {
        score += 1;
        break;
      }
    }
    for (const extension of context.fileExtensions) {
      const hints = fileExtensionRoleHints[extension];
      if (hints?.includes(role.id)) {
        score += 1;
        break;
      }
    }
  }
  return score;
}

/** The group-and-role scoring stage's result. */
interface GroupScoringResult {
  readonly roleId: string;
  readonly taskType: string;
  readonly confidence: number;
  readonly evidence: readonly string[];
  readonly alternatives: readonly { readonly role_hint_id: string; readonly task_type: string }[];
  /** True when no candidate role existed at all, so the broad fallback was used. */
  readonly usedNoCandidateFallback: boolean;
}

/**
 * Score candidate roles, take the winner, and pick its task.
 *
 * `sort` is stable, so equal scores keep the role-summaries declaration order and
 * equal task scores keep the chunk's order — both are part of the contract.
 */
function classifyByGroupAndRoleScoring(
  prompt: string,
  taxonomy: CompactTaxonomy,
  candidateGroupIds: readonly string[],
  context?: ClassificationContext,
): GroupScoringResult {
  const candidateRoles = taxonomy.roleSummaries.filter((role) =>
    roleIsInCandidateGroup(role, candidateGroupIds),
  );
  if (candidateRoles.length === 0) {
    return {
      roleId: fallbackRoleId,
      taskType: fallbackTaskType,
      confidence: 0.25,
      evidence: [
        "No taxonomy role matched any candidate group.",
        `Selected broad advisory role ${fallbackRoleId} so the controller can reclassify if needed.`,
      ],
      alternatives: fallbackAlternatives(taxonomy),
      usedNoCandidateFallback: true,
    };
  }

  const scoredRoles = candidateRoles
    .map((role) => ({ role, score: scoreRoleForPrompt(role, prompt, context) }))
    .sort((a, b) => b.score - a.score);

  // `candidateRoles` is non-empty here (the empty case returned above), so the
  // sorted list has a first entry. Read it once without a non-null assertion: a
  // single read also removes any chance of the two lines disagreeing.
  const best = scoredRoles[0];
  if (best === undefined) throw new Error("classifier invariant: a scored role must exist");
  const bestRole = best.role;
  const bestScore = best.score;
  const runnerUpScore = scoredRoles.length > 1 ? (scoredRoles[1]?.score ?? 0) : 0;
  const scoreMargin = bestScore - runnerUpScore;

  const roleTasks = taxonomy.roleTaskChunks[bestRole.id] ?? [];
  const bestTask =
    roleTasks.length > 0
      ? (roleTasks
          .map((task) => ({ task, score: scoreTaskForPrompt(task, prompt) }))
          .filter((entry) => entry.score > 0)
          .sort((a, b) => b.score - a.score)[0]?.task ?? roleTasks[0])
      : undefined;

  const taskType = bestTask?.id ?? `${bestRole.id}.general`;
  const confidence = scoreMargin >= 4 ? 0.6 : scoreMargin >= 2 ? 0.5 : 0.38;

  const alternatives = scoredRoles.slice(1, 4).map((entry) => {
    const altTasks = taxonomy.roleTaskChunks[entry.role.id] ?? [];
    return {
      role_hint_id: entry.role.id,
      task_type: altTasks[0]?.id ?? `${entry.role.id}.general`,
    };
  });

  const evidence = [
    `Group-first classification: matched groups [${candidateGroupIds.join(", ")}], scored ${candidateRoles.length} candidate roles.`,
    `Selected ${bestRole.id} (score ${bestScore}, margin ${scoreMargin}) from candidate groups.`,
    bestTask !== undefined
      ? `Task guidance preferred ${bestTask.id}.`
      : "No task matched prompt signals; using default task.",
  ];

  return {
    roleId: bestRole.id,
    taskType,
    confidence,
    evidence,
    alternatives,
    usedNoCandidateFallback: false,
  };
}

/**
 * Build the working taxonomy from the staged reader, choosing the role with
 * group-first scoring and loading only that role's task chunk.
 */
function buildTaxonomyFromStagedReader(
  prompt: string,
  reader: StagedCompactTaxonomyReader,
  context?: ClassificationContext,
): {
  readonly taxonomy: CompactTaxonomy;
  readonly roleTasks: readonly CompactRoleTask[];
  readonly loadedChunks: readonly string[];
} {
  const manifest = reader.loadManifest();
  const groups = reader.loadGroups();
  const roleSummaries = reader.loadRoleSummaries();
  const roleTaskIndex = reader.loadRoleTaskIndex();
  const candidateGroupIds = selectCandidateGroupIds(prompt, groups, context);
  const scored = classifyByGroupAndRoleScoring(
    prompt,
    { manifest, groups, roleSummaries, roleTaskIndex, roleTaskChunks: {} },
    candidateGroupIds,
    context,
  );
  const roleTasks = reader.loadRoleTaskChunk(scored.roleId);
  return {
    taxonomy: {
      manifest,
      groups,
      roleSummaries,
      roleTaskIndex,
      roleTaskChunks: { [scored.roleId]: roleTasks },
    },
    roleTasks,
    loadedChunks: ["groups", "role-summaries", "role-task-index", `tasks:${scored.roleId}`],
  };
}

/**
 * Classify one prompt into the `role_model` wire object.
 * @param input - prompt, optional prebuilt taxonomy or reader, and request signals.
 * @returns the classification, including `role_model` and the local diagnostics.
 */
export function classifyWithProgressiveDisclosure(
  input: ProgressiveClassificationInput,
): ProgressiveClassification {
  const normalizedPrompt = input.prompt.trim();
  const staged =
    input.taxonomy !== undefined
      ? {
          taxonomy: input.taxonomy,
          roleTasks: undefined as readonly CompactRoleTask[] | undefined,
          loadedChunks: ["groups", "role-summaries"] as readonly string[],
        }
      : buildTaxonomyFromStagedReader(
          normalizedPrompt,
          input.reader ?? createStagedCompactTaxonomyReader(),
          input.context,
        );
  const taxonomy = staged.taxonomy;

  // Role selection is always group-first scoring; the rules are task hints only.
  const candidateGroupIds = selectCandidateGroupIds(
    normalizedPrompt,
    taxonomy.groups,
    input.context,
  );
  const groupResult = classifyByGroupAndRoleScoring(
    normalizedPrompt,
    taxonomy,
    candidateGroupIds,
    input.context,
  );
  const roleId = groupResult.roleId;
  let requestedTaskType = groupResult.taskType;
  let confidence = groupResult.confidence;

  const match = rules.find((rule) => rule.pattern.test(normalizedPrompt));
  if (match !== undefined && match.roleId === roleId) {
    requestedTaskType = match.taskType;
    confidence = Math.max(confidence, 0.72);
  }

  const roleTasks = staged.roleTasks ?? taxonomy.roleTaskChunks[roleId] ?? [];
  const selectedTask = selectTask(roleTasks, requestedTaskType, normalizedPrompt);
  const taskType = selectedTask?.id ?? requestedTaskType;
  const roleSummary = taxonomy.roleSummaries.find((role) => role.id === roleId);

  let alternatives = groupResult.alternatives;
  let evidence: readonly string[] = [
    ...groupResult.evidence,
    selectedTask !== undefined && selectedTask.id !== groupResult.taskType
      ? `Task guidance refined selection to ${selectedTask.id}.`
      : `Confirmed taxonomy task ${taskType}.`,
  ];
  if (groupResult.usedNoCandidateFallback) {
    // The "no candidate group roles" path replaces the evidence wholesale, exactly
    // as the ported algorithm does; the group-first lines are not appended.
    alternatives = fallbackAlternatives(taxonomy);
    evidence = [
      "Low-confidence broad fallback: no taxonomy role rule matched the prompt.",
      `Selected broad advisory role ${roleId} so the controller can reclassify if needed.`,
    ];
  }

  const [taskAction, taskVariant] = taskParts(taskType);

  return {
    role_model: {
      contract_version: 1,
      intent: {
        taxonomy_version: taxonomy.manifest.taxonomyVersion,
        content_revision: taxonomy.manifest.contentRevision,
        classification_contract_version: taxonomy.manifest.classificationContractVersion,
        classification_version: "role-model.pi-classifier.v1",
        source: "heuristic",
        confidence,
        role_hint_id: roleId,
        role_source: "heuristic",
        task_type: taskType,
        task_action: taskAction,
        task_variant: taskVariant,
        task_source: "heuristic",
        task_confidence: confidence,
        preferred_capabilities: [
          ...new Set([
            ...(match?.capabilities ?? []),
            ...(selectedTask?.requiredCapabilities ?? []),
            ...(selectedTask?.preferredCapabilities ?? []),
          ]),
        ],
        required_modalities:
          selectedTask !== undefined && selectedTask.requiredModalities.length > 0
            ? selectedTask.requiredModalities
            : ["text"],
        output_modalities: ["text"],
        tool_classes:
          selectedTask !== undefined && selectedTask.toolClasses.length > 0
            ? selectedTask.toolClasses
            : (match?.toolClasses ?? []),
        context_tokens_estimate: Math.max(1, Math.ceil(normalizedPrompt.length / 4)),
        evidence,
        alternatives,
      },
    },
    candidateGroupIds:
      roleSummary?.primaryGroupId !== undefined ? [roleSummary.primaryGroupId] : [],
    candidateRoleIds: [roleId],
    loadedChunks: [...staged.loadedChunks, `tasks:${roleId}`].filter(
      (chunk, index, chunks) => chunks.indexOf(chunk) === index,
    ),
    hiddenModelCallUsed: false,
  };
}
