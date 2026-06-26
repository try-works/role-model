import type { CompactRoleTask, CompactTaxonomy } from "./compact-data.js";
import {
  type StagedCompactTaxonomyReader,
  createStagedCompactTaxonomyReader,
} from "./staged-compact-taxonomy.js";

export interface ClassificationContext {
  readonly hasTools: boolean;
  readonly toolNames: readonly string[];
  readonly hasImages: boolean;
  readonly hasFiles: boolean;
  readonly fileExtensions: readonly string[];
}

export interface ProgressiveClassificationInput {
  readonly prompt: string;
  readonly taxonomy?: CompactTaxonomy;
  readonly reader?: StagedCompactTaxonomyReader;
  readonly context?: ClassificationContext;
}

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
    pattern: /\b(implement|bug fix|fix|patch|regression test)\b/i,
    evidence: "implementation/fix signal",
    roleId: "coder",
    taskType: "coder.edit",
    alternativeTasks: [{ roleId: "coder", taskType: "coder.test.write" }],
    capabilities: ["code.read", "code.write", "tools.command_execution"],
    toolClasses: ["filesystem.read", "filesystem.write", "shell.execute"],
  },
  {
    pattern: /\b(security|risk|vulnerab|threat|diff)\b/i,
    evidence: "security/risk/diff signal",
    roleId: "security",
    taskType: "security.audit",
    alternativeTasks: [{ roleId: "coder", taskType: "coder.review" }],
    capabilities: ["security.analysis", "code.read"],
    toolClasses: ["filesystem.read"],
  },
  {
    pattern: /\b(current|public documentation|cite|compare|sources?)\b/i,
    evidence: "current research/citation signal",
    roleId: "researcher",
    taskType: "researcher.web_research.current",
    alternativeTasks: [{ roleId: "researcher", taskType: "researcher.compare_sources" }],
    capabilities: ["web.search", "citation.synthesis"],
    toolClasses: ["web.search", "http.fetch"],
  },
  {
    pattern: /\b(support notes|customer reply|ticket|apology)\b/i,
    evidence: "support communication signal",
    roleId: "support",
    taskType: "support.ticket.reply",
    alternativeTasks: [{ roleId: "writer", taskType: "writer.email.write" }],
    capabilities: ["communication.user_facing"],
    toolClasses: [],
  },
  {
    pattern: /\b(schema|migration plan|api design|architecture)\b/i,
    evidence: "architecture/schema migration signal",
    roleId: "architect",
    taskType: "architect.migration.strategy",
    alternativeTasks: [{ roleId: "data", taskType: "data.schema.review" }],
    capabilities: ["reasoning.multi_step", "data.schema"],
    toolClasses: [],
  },
  {
    pattern: /\b(product requirements|acceptance criteria|workflow)\b/i,
    evidence: "product requirements signal",
    roleId: "product",
    taskType: "product.requirements",
    alternativeTasks: [{ roleId: "planner", taskType: "planner.requirements" }],
    capabilities: ["reasoning.multi_step"],
    toolClasses: [],
  },
];

const fallbackRoleId = "writer";
const fallbackTaskType = "writer.summarize";

function taskParts(taskType: string): readonly [string, string | null] {
  const parts = taskType.split(".").slice(1);
  return [parts[0] ?? taskType, parts.length > 1 ? parts.slice(1).join(".") : null];
}

function words(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, " ")
    .split(/[\s.]+/)
    .filter((word) => word.length >= 3);
}

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
  if (/\b(regression|test|tests|testing)\b/i.test(prompt) && /\btest\b/.test(task.id)) score += 5;
  if (
    /\b(review|audit|risk|risks|security)\b/i.test(prompt) &&
    /\b(audit|review|security)\b/.test(task.id)
  ) {
    score += 4;
  }
  if (
    /\b(requirements|acceptance|workflow)\b/i.test(prompt) &&
    /\b(requirements|plan)\b/.test(task.id)
  ) {
    score += 4;
  }
  if (
    /\b(current|public|docs|documentation|cite|compare|sources|web)\b/i.test(prompt) &&
    /\b(web_research|research)\b/.test(task.id)
  ) {
    score += 4;
  }
  if (
    /\b(schema|migration|architecture|api)\b/i.test(prompt) &&
    /\b(migration|architecture|design)\b/.test(task.id)
  ) {
    score += 4;
  }
  return score;
}

function selectTask(
  roleTasks: readonly CompactRoleTask[],
  roleId: string,
  requestedTaskType: string,
  prompt: string,
): CompactRoleTask | undefined {
  const exactTask = roleTasks.find((task) => task.id === requestedTaskType);
  if (exactTask) return exactTask;
  const bestTask = roleTasks
    .map((task) => ({ task, score: scoreTaskForPrompt(task, prompt) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)[0]?.task;
  return bestTask;
}

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
    "study",
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

function selectCandidateGroupIds(
  prompt: string,
  groups: CompactTaxonomy["groups"],
  context?: ClassificationContext,
): readonly string[] {
  const groupRegexSignals: readonly { readonly groupId: string; readonly pattern: RegExp }[] = [
    {
      groupId: "engineering",
      pattern:
        /\b(code|implement|bug|fix|patch|diff|security|schema|migration|api|runtime|test|deploy)\b/i,
    },
    {
      groupId: "knowledge_research",
      pattern: /\b(current|public documentation|cite|compare|sources?|research|evidence)\b/i,
    },
    {
      groupId: "product_design",
      pattern: /\b(product|requirements|acceptance criteria|workflow|design|roadmap)\b/i,
    },
    {
      groupId: "communication",
      pattern: /\b(support|customer|reply|ticket|notes|email|write|summarize)\b/i,
    },
    {
      groupId: "business",
      pattern: /\b(strategy|market|sales|finance|procurement|vendor|cost)\b/i,
    },
    {
      groupId: "governance_safety",
      pattern: /\b(legal|compliance|privacy|health|safety|risk|policy)\b/i,
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
        (kw) => promptWords.includes(kw) || prompt.toLowerCase().includes(kw.toLowerCase()),
      );
      return { groupId, score: hits.length };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  // Context-based group biasing
  const contextBoosted: string[] = [];
  if (context) {
    if (context.hasTools) {
      contextBoosted.push("engineering");
    }
    if (context.hasImages) {
      contextBoosted.push("product_design");
    }
    if (context.hasFiles) {
      contextBoosted.push("engineering", "knowledge_research");
    }
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

function roleIsInCandidateGroup(
  role: CompactTaxonomy["roleSummaries"][number] | undefined,
  candidateGroupIds: readonly string[],
): boolean {
  if (!role) return false;
  return (
    candidateGroupIds.includes(role.primaryGroupId) ||
    role.secondaryGroupIds.some((groupId) => candidateGroupIds.includes(groupId))
  );
}

function scoreRoleForPrompt(
  role: CompactTaxonomy["roleSummaries"][number],
  prompt: string,
  context?: ClassificationContext,
): number {
  const promptLower = prompt.toLowerCase();
  let score = 0;
  const classification = role.classification;
  if (classification) {
    for (const signal of classification.positiveSignals) {
      if (promptLower.includes(signal.toLowerCase())) score += 2;
    }
    for (const signal of classification.negativeSignals) {
      if (promptLower.includes(signal.toLowerCase())) score -= 3;
    }
    const summaryWords = words(classification.summary);
    const promptWords = new Set(words(prompt));
    for (const word of summaryWords) {
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

  // Context-based biasing (F7)
  if (context) {
    const engineeringRoles = ["coder", "architect", "operator", "tester", "security", "data"];
    const productDesignRoles = ["designer", "product"];
    const knowledgeRoles = ["researcher", "knowledge", "scientist"];
    if (context.hasTools && engineeringRoles.includes(role.id)) score += 2;
    if (context.hasImages && productDesignRoles.includes(role.id)) score += 2;
    if (
      context.hasFiles &&
      (engineeringRoles.includes(role.id) || knowledgeRoles.includes(role.id))
    )
      score += 1;

    // R9.1: Tool name → role hints
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
    };
    for (const toolName of context.toolNames) {
      const hints = toolNameRoleHints[toolName];
      if (hints?.includes(role.id)) {
        score += 1;
        break;
      }
    }

    // R9.1: File extension → role hints
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
    for (const ext of context.fileExtensions) {
      const hints = fileExtensionRoleHints[ext];
      if (hints?.includes(role.id)) {
        score += 1;
        break;
      }
    }
  }

  return score;
}

function classifyByGroupAndRoleScoring(
  prompt: string,
  taxonomy: CompactTaxonomy,
  candidateGroupIds: readonly string[],
  context?: ClassificationContext,
): {
  roleId: string;
  taskType: string;
  confidence: number;
  evidence: readonly string[];
  alternatives: readonly { readonly role_hint_id: string; readonly task_type: string }[];
} {
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
    };
  }

  const scoredRoles = candidateRoles
    .map((role) => ({ role, score: scoreRoleForPrompt(role, prompt, context) }))
    .sort((a, b) => b.score - a.score);

  const bestRole = scoredRoles[0]?.role;
  const bestScore = scoredRoles[0]?.score;
  const runnerUpScore = scoredRoles.length > 1 ? scoredRoles[1]?.score : 0;
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
    const altTaskId = altTasks[0]?.id ?? `${entry.role.id}.general`;
    return { role_hint_id: entry.role.id, task_type: altTaskId };
  });

  const evidence = [
    `Group-first classification: matched groups [${candidateGroupIds.join(", ")}], scored ${candidateRoles.length} candidate roles.`,
    `Selected ${bestRole.id} (score ${bestScore}, margin ${scoreMargin}) from candidate groups.`,
    bestTask
      ? `Task guidance preferred ${bestTask.id}.`
      : "No task matched prompt signals; using default task.",
  ];

  return { roleId: bestRole.id, taskType, confidence, evidence, alternatives };
}

function buildTaxonomyFromStagedReader(
  prompt: string,
  reader: StagedCompactTaxonomyReader,
  context?: ClassificationContext,
): {
  readonly taxonomy: CompactTaxonomy;
  readonly roleTasks: readonly CompactRoleTask[];
  readonly loadedChunks: readonly string[];
  readonly useGroupScoring: boolean;
} {
  const manifest = reader.loadManifest();
  const groups = reader.loadGroups();
  const roleSummaries = reader.loadRoleSummaries();
  const roleTaskIndex = reader.loadRoleTaskIndex();
  const candidateGroupIds = selectCandidateGroupIds(prompt, groups, context);
  const match = rules.find((rule) => rule.pattern.test(prompt));
  const matchedRole = roleSummaries.find((role) => role.id === match?.roleId);

  // Always use group-first role scoring to determine the best role.
  // Regex rules serve as task/capability hints when they agree with the scored role.
  const useGroupScoring = true;
  const baseTaxonomy: CompactTaxonomy = {
    manifest,
    groups,
    roleSummaries,
    roleTaskIndex,
    roleTaskChunks: {},
  };
  const scored = classifyByGroupAndRoleScoring(prompt, baseTaxonomy, candidateGroupIds, context);

  // If regex rule strongly agrees with the scored role, prefer the rule's task type for precision.
  // If regex rule disagrees, still use group scoring but keep the regex rule as an alternative.
  const roleId = scored.roleId;
  if (match && match.roleId === roleId && roleIsInCandidateGroup(matchedRole, candidateGroupIds)) {
    // Regex rule confirms the scored role; keep the scored role (already set).
    // Task selection later will prefer the rule's taskType.
  } else if (match && !roleIsInCandidateGroup(matchedRole, candidateGroupIds)) {
    // Regex rule's role is not in any candidate group; ignore it entirely.
  }
  // Otherwise: scored role wins, regex rule is discarded for role selection.

  const roleTasks = reader.loadRoleTaskChunk(roleId);
  return {
    taxonomy: {
      manifest,
      groups,
      roleSummaries,
      roleTaskIndex,
      roleTaskChunks: {
        [roleId]: roleTasks,
      },
    },
    roleTasks,
    loadedChunks: ["groups", "role-summaries", "role-task-index", `tasks:${roleId}`],
    useGroupScoring,
  };
}

export function classifyWithProgressiveDisclosure(
  input: ProgressiveClassificationInput,
): ProgressiveClassification {
  const normalizedPrompt = input.prompt.trim();
  const staged = input.taxonomy
    ? {
        taxonomy: input.taxonomy,
        roleTasks: undefined as readonly CompactRoleTask[] | undefined,
        loadedChunks: ["groups", "role-summaries"] as readonly string[],
        useGroupScoring: true,
      }
    : buildTaxonomyFromStagedReader(
        normalizedPrompt,
        input.reader ?? createStagedCompactTaxonomyReader(),
        input.context,
      );
  const taxonomy = staged.taxonomy;

  let roleId: string;
  let requestedTaskType: string;
  let confidence: number;
  let match: (typeof rules)[number] | undefined;
  let groupResult: ReturnType<typeof classifyByGroupAndRoleScoring> | undefined;

  // Always use group-first scoring. Regex rules are task hints, not role selectors.
  const candidateGroupIds = selectCandidateGroupIds(
    normalizedPrompt,
    taxonomy.groups,
    input.context,
  );
  groupResult = classifyByGroupAndRoleScoring(
    normalizedPrompt,
    taxonomy,
    candidateGroupIds,
    input.context,
  );
  roleId = groupResult.roleId;
  requestedTaskType = groupResult.taskType;
  confidence = groupResult.confidence;

  // If a regex rule matches the same role that group scoring selected,
  // use the rule's task type for additional precision (rule knows task better).
  match = rules.find((rule) => rule.pattern.test(normalizedPrompt));
  if (match && match.roleId === roleId) {
    requestedTaskType = match.taskType;
    confidence = Math.max(confidence, 0.72);
  }

  const roleTasks = staged.roleTasks ?? taxonomy.roleTaskChunks[roleId] ?? [];
  const selectedTask = selectTask(roleTasks, roleId, requestedTaskType, normalizedPrompt);
  const taskType = selectedTask?.id ?? requestedTaskType;
  const roleSummary = taxonomy.roleSummaries.find((role) => role.id === roleId);

  let alternatives: readonly { readonly role_hint_id: string; readonly task_type: string }[];
  let evidence: readonly string[];

  if (groupResult) {
    alternatives = groupResult.alternatives;
    evidence = [
      ...groupResult.evidence,
      selectedTask && selectedTask.id !== groupResult.taskType
        ? `Task guidance refined selection to ${selectedTask.id}.`
        : `Confirmed taxonomy task ${taskType}.`,
    ];
  } else if (match) {
    alternatives = [
      ...(match.alternativeTasks ?? []).map((task) => ({
        role_hint_id: task.roleId,
        task_type: task.taskType,
      })),
      ...roleTasks
        .filter((task) => task.id !== taskType)
        .slice(0, 2)
        .map((task) => ({ role_hint_id: roleId, task_type: task.id })),
    ].slice(0, 4);
    evidence = [
      match.evidence,
      selectedTask && selectedTask.id !== match.taskType
        ? `Runtime or compact task guidance preferred ${selectedTask.id}.`
        : `Selected taxonomy task ${taskType}.`,
    ];
  } else {
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
        required_modalities: selectedTask?.requiredModalities.length
          ? selectedTask.requiredModalities
          : ["text"],
        output_modalities: ["text"],
        tool_classes: selectedTask?.toolClasses.length
          ? selectedTask.toolClasses
          : (match?.toolClasses ?? []),
        context_tokens_estimate: Math.max(1, Math.ceil(normalizedPrompt.length / 4)),
        evidence,
        alternatives,
      },
    },
    candidateGroupIds: roleSummary?.primaryGroupId ? [roleSummary.primaryGroupId] : [],
    candidateRoleIds: [roleId],
    loadedChunks: [...staged.loadedChunks, `tasks:${roleId}`].filter(
      (chunk, index, chunks) => chunks.indexOf(chunk) === index,
    ),
    hiddenModelCallUsed: false,
  };
}
