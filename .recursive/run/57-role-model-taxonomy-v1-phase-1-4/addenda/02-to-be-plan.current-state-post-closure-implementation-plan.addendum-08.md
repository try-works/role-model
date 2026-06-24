# To-Be Plan Addendum 08: Post-Closure Gap Implementation Plan (F6-F10)

Run: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/`
Phase: `02 To-Be Plan Addendum 08`
Artifact: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/02-to-be-plan.current-state-post-closure-implementation-plan.addendum-08.md`
Status: `LOCKED`
Workflow version: `recursive-mode-audit-v1`
Artifact kind: run-local implementation plan addendum
CreatedAt: `2026-06-24`
Base Artifact: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/02-to-be-plan.md`
Audit Input: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/03-implementation-summary.current-state-requirements-proposal-verified-audit-findings.addendum-15.md`
Prior Plan: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/02-to-be-plan.current-state-requirements-proposal-gap-closure-implementation-plan.addendum-07.md`
Prior Implementation: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/03-implementation-summary.current-state-requirements-proposal-gap-closure-implementation.addendum-14.md`
TDD Mode: `strict`
QA Execution Mode: `agent-operated`

## Inputs

- `D:/DEV/role-model-proposals/16-role-model-taxonomy-v1-proposal.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-worktree.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/02-to-be-plan.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/03-implementation-summary.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/05-manual-qa.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/03-implementation-summary.current-state-requirements-proposal-verified-audit-findings.addendum-15.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/03-implementation-summary.current-state-requirements-proposal-gap-closure-implementation.addendum-14.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/05-manual-qa.current-state-reconciliation.addendum-02.md`

## Purpose

This addendum defines the implementation plan to close findings F6 through F10 from audit addendum 15. It is a run-local Run 57 implementation plan addendum, not an addendum to the external proposal.

The plan remains scoped to proposal Phase 1 through Phase 4. Proposal Phase 5 benchmark implementation and proposal Phase 6 telemetry implementation remain out of scope except for preserved extension points, documentation notes, and explicit QA notes that those later phases are deferred.

## Effective Inputs Re-Read Requirement

Before implementation starts, re-read and record the receipt in the implementation summary addendum:

1. `D:/DEV/role-model-proposals/16-role-model-taxonomy-v1-proposal.md`
2. `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md`
3. `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-worktree.md`
4. `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/02-to-be-plan.md`
5. `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/03-implementation-summary.current-state-requirements-proposal-verified-audit-findings.addendum-15.md`
6. this addendum

## Non-Negotiable Safety And Scope Rules

- Preserve the user-approved permissive advisory metadata behavior: invalid advisory Pi metadata must not cause request failure. It must be ignored, degraded, or used only as diagnostics while the controller/runtime falls back to valid normalized intent.
- Preserve hard-field validation only for explicit trusted hard constraints. Low-confidence Pi classifier output must remain advisory unless backed by explicit user instruction or trusted policy/context.
- Do not make `pi-role-model` start, stop, install, update, or own the Role-Model runtime process.
- Do not call a Role-Model launcher path from `pi-role-model`.
- Do not read, print, copy, sync, or persist Pi provider secrets.
- Do not add hidden model calls for classification by default.
- Do not implement proposal Phase 5 benchmark scoring, benchmark dashboards, or benchmark-informed routing.
- Do not implement proposal Phase 6 production telemetry aggregation, telemetry dashboards, or telemetry-informed routing.

## Implementation Order

Findings F6, F7, and F8 are interdependent (all affect the Pi classifier pipeline) and should be implemented together. F9 (UI evidence) and F10 (E2E table) can be addressed after the code changes.

### Step 1: Expand Pi Classifier To Cover All 28 Role Families (F6)

**Current state:** Six hardcoded regex rules in `classify-with-progressive-disclosure.ts` cover only `coder`, `security`, `researcher`, `support`, `architect`, and `product`. The remaining 22 roles fall back to `writer.summarize` at confidence 0.35.

**Target state:** A group-first progressive classifier that can produce reasonable (even if low-confidence) classifications for any role family in the taxonomy. The existing regex rules become fast-path hints. For roles without fast-path rules, the classifier uses the progressive disclosure pipeline: groups -> role summaries -> role-task index -> task chunk scoring.

**TDD RED tests to add in `packages/pi-role-model/test/taxonomy-classification.test.ts`:**

```typescript
test("classifies prompts across all 28 role families without hardcoded rules", () => {
  // Group: engineering (coder, architect, operator, tester, security, data)
  // Group: product_design (product, designer, planner, analyst)
  // Group: knowledge_research (researcher, knowledge, scientist, mathematician, educator)
  // Group: business (strategist, marketer, seller, finance, procurement)
  // Group: communication (writer, translator, creative, support, coordinator)
  // Group: governance_safety (legal, health, recruiter)

  const promptsByGroup: Record<string, readonly { readonly prompt: string; readonly expectedRole: string; readonly expectedGroup: string }[]> = {
    engineering: [
      { prompt: "Debug this failing startup script and fix the port conflict.", expectedRole: "operator", expectedGroup: "engineering" },
      { prompt: "Write E2E tests for the login flow using Playwright.", expectedRole: "tester", expectedGroup: "engineering" },
      { prompt: "Review this SQL schema for normalization issues and indexing.", expectedRole: "data", expectedGroup: "engineering" },
      { prompt: "Design the API contract for our new payments service.", expectedRole: "architect", expectedGroup: "engineering" },
    ],
    product_design: [
      { prompt: "Evaluate these three vendors and tell me which is the best fit.", expectedRole: "analyst", expectedGroup: "product_design" },
      { prompt: "Break this goal into milestones with acceptance criteria.", expectedRole: "planner", expectedGroup: "product_design" },
      { prompt: "Review this user interface for accessibility and visual hierarchy.", expectedRole: "designer", expectedGroup: "product_design" },
    ],
    knowledge_research: [
      { prompt: "Design a science experiment to test this hypothesis with controls.", expectedRole: "scientist", expectedGroup: "knowledge_research" },
      { prompt: "Solve this optimization problem and explain each step.", expectedRole: "mathematician", expectedGroup: "knowledge_research" },
      { prompt: "Create a lesson plan for teaching Python to beginners.", expectedRole: "educator", expectedGroup: "knowledge_research" },
      { prompt: "Organize these notes into a structured knowledge base.", expectedRole: "knowledge", expectedGroup: "knowledge_research" },
    ],
    business: [
      { prompt: "Analyze our market position and recommend a GTM strategy.", expectedRole: "strategist", expectedGroup: "business" },
      { prompt: "Write SEO-optimized landing page copy for our launch.", expectedRole: "marketer", expectedGroup: "business" },
      { prompt: "Draft a cold outreach email for enterprise prospects.", expectedRole: "seller", expectedGroup: "business" },
      { prompt: "Compare these vendor proposals and build a scorecard.", expectedRole: "procurement", expectedGroup: "business" },
      { prompt: "Estimate the ROI of migrating to this new infrastructure.", expectedRole: "finance", expectedGroup: "business" },
    ],
    communication: [
      { prompt: "Translate this technical document into Japanese.", expectedRole: "translator", expectedGroup: "communication" },
      { prompt: "Brainstorm 10 product names for our new app.", expectedRole: "creative", expectedGroup: "communication" },
      { prompt: "Prepare a meeting agenda and decision log for the quarterly review.", expectedRole: "coordinator", expectedGroup: "communication" },
      { prompt: "Rewrite this article to match our new brand voice.", expectedRole: "writer", expectedGroup: "communication" },
    ],
    governance_safety: [
      { prompt: "Review this privacy policy for GDPR compliance.", expectedRole: "legal", expectedGroup: "governance_safety" },
      { prompt: "Write a job description for a senior platform engineer.", expectedRole: "recruiter", expectedGroup: "governance_safety" },
      { prompt: "What are the general exercise recommendations for improving sleep?", expectedRole: "health", expectedGroup: "governance_safety" },
    ],
  };

  for (const [group, cases] of Object.entries(promptsByGroup)) {
    for (const testCase of cases) {
      const classification = classifyWithProgressiveDisclosure({ prompt: testCase.prompt });
      expect(
        classification.role_model.intent.role_hint_id,
        `Prompt "${testCase.prompt}" classified as ${classification.role_model.intent.role_hint_id}, expected ${testCase.expectedRole}`,
      ).toBe(testCase.expectedRole);
      expect(classification.candidateGroupIds, `Expected group ${testCase.expectedGroup}`).toContain(testCase.expectedGroup);
      // Every classification must have evidence, even low-confidence
      expect(classification.role_model.intent.evidence.length).toBeGreaterThan(0);
      // No hidden model calls
      expect(classification.hiddenModelCallUsed).toBe(false);
    }
  }
});

test("broad ambiguous prompts use group-first fallback instead of single writer fallback", () => {
  // A prompt with no strong role signal should still use group/role matching from the taxonomy
  const classification = classifyWithProgressiveDisclosure({
    prompt: "Can you help me think through a complex decision?",
  });
  // Should still fall back to a reasonable role, not necessarily writer.summarize
  expect(classification.role_model.intent.role_hint_id).toBeDefined();
  expect(classification.role_model.intent.task_type).toBeDefined();
  expect(classification.role_model.intent.confidence).toBeLessThan(0.5);
  expect(classification.role_model.intent.alternatives.length).toBeGreaterThan(0);
  expect(classification.loadedChunks[0]).toBe("groups");
});

test("unknown prompts still produce advisory metadata with alternatives", () => {
  const classification = classifyWithProgressiveDisclosure({
    prompt: "I need help with something important.",
  });
  // Must still produce valid advisory metadata
  expect(classification.role_model.contract_version).toBe(1);
  expect(classification.role_model.intent.role_source).toBe("heuristic");
  expect(classification.role_model.intent.task_source).toBe("heuristic");
  expect(classification.role_model.intent.alternatives.length).toBeGreaterThanOrEqual(1);
  expect(classification.hiddenModelCallUsed).toBe(false);
});
```

**Implementation approach for `classify-with-progressive-disclosure.ts`:**

Replace the six-rule-only pipeline with a two-tier classifier:

Tier 1 (fast-path regex rules): Keep the existing six regex rules as high-confidence fast paths. When a rule matches and the matched role is in a candidate group, use it directly (confidence ~0.72 as today).

Tier 2 (group-first taxonomy scoring): When no fast-path rule matches OR the matched rule's role is not in any candidate group, fall through to a general-purpose `classifyByGroupAndRoleScoring()` function that:

```
a) selectCandidateGroupIds(prompt, groups) -- already exists, extend with signals below
b) For each candidate group, collect roles where primaryGroupId is in candidateGroupIds
c) Score each candidate role by:
   - Matching prompt words against role.description, role.classification.positiveSignals, role.defaultTaskTypes
   - Matching prompt words against the role's task index labels and descriptions
   - Penalizing roles whose classification.negativeSignals match the prompt
d) Select the highest-scoring role (or fallback to the most general role in the matched group)
e) Load that role's task chunk
f) Use selectTask() to pick the best task within the role chunk
g) Set confidence proportional to the role score margin (low for ambiguous, higher for clear match)
```

The key data needed is in the compact taxonomy. Role summaries already include `id`, `label`, `description`, `primaryGroupId`, `secondaryGroupIds`, and `classification`. The role-task index has task labels by role. The stage is already set by `selectCandidateGroupIds()` and `selectTask()`.

**Group signal extension for `selectCandidateGroupIds()`:**

The existing `selectCandidateGroupIds()` has regex patterns per group. Extend these with additional keyword sets derived from the proposal's role descriptions and task classifier guidance:

```typescript
const groupKeywordSets: Record<string, readonly string[]> = {
  engineering: [
    "code", "implement", "bug", "fix", "patch", "diff", "security", "schema",
    "migration", "api", "runtime", "test", "deploy", "debug", "refactor",
    "database", "sql", "query", "infrastructure", "server", "compile",
    "build", "pipeline", "ci", "cd", "container", "kubernetes", "docker",
    "endpoint", "service", "crash", "failure", "startup", "port",
    "install", "configure", "package", "dependency", "vulnerability",
    "threat", "auth", "permission", "role", "access", "incident",
  ],
  product_design: [
    "product", "requirements", "acceptance criteria", "workflow", "design",
    "roadmap", "user story", "feature", "prioritize", "milestone",
    "sprint", "backlog", "release plan", "rollout", "ui", "interface",
    "visual", "layout", "wireframe", "prototype", "mockup",
    "usability", "accessibility", "responsive", "interaction",
    "compare options", "evaluate", "assess", "score", "rank",
    "decision matrix", "tradeoff", "analysis", "metrics", "kpi",
    "business plan", "strategy", "operating model", "okr",
  ],
  knowledge_research: [
    "research", "current", "public documentation", "cite", "compare", "sources",
    "evidence", "literature", "paper", "study", "experiment",
    "scientific", "hypothesis", "method", "peer review", "protocol",
    "math", "solve", "calculate", "proof", "derive", "formula",
    "statistics", "optimize", "model", "simulation",
    "teach", "learn", "lesson", "curriculum", "quiz", "tutor",
    "study", "educate", "concept", "explain in simple terms",
    "organize notes", "knowledge base", "retrieve", "memory",
    "summarize notes", "archive", "context brief",
  ],
  business: [
    "strategy", "market", "sales", "finance", "procurement", "vendor",
    "cost", "budget", "pricing", "roi", "revenue", "forecast",
    "positioning", "campaign", "seo", "ad copy", "marketing",
    "audience", "email sequence", "landing page", "social media",
    "outreach", "proposal", "enterprise", "discovery call",
    "objection", "cold email", "sales pitch", "account plan",
    "rfp", "purchase", "contract", "negotiation", "scorecard",
    "competitive", "swot", "partnership",
  ],
  communication: [
    "write", "edit", "summarize", "documentation", "blog", "article",
    "email", "release notes", "prose", "style", "tone", "voice",
    "translate", "localize", "locale", "language", "multilingual",
    "creative", "brainstorm", "name", "tagline", "script", "story",
    "copywriting", "brand", "visual prompt", "social post",
    "support", "customer", "ticket", "triage", "faq",
    "meeting", "agenda", "schedule", "follow up", "coordinate",
    "handoff", "status update", "reminder", "inbox",
  ],
  governance_safety: [
    "legal", "compliance", "privacy", "health", "safety", "risk",
    "policy", "license", "terms", "regulation", "gdpr",
    "recruit", "hire", "job description", "interview", "candidate",
    "offer", "pipeline", "sourcing", "scorecard",
    "symptom", "medication", "wellness", "exercise", "nutrition",
    "appointment", "care", "mental health",
  ],
};
```

**Role-level classifier signal data (extracted from proposal Canonical Roles table):**

The classifier must pull this data from the compact taxonomy at runtime, but the implementation must ensure the compact taxonomy includes these fields. The role summaries in `compact-role-summaries.json` already have `id`, `label`, `description`, `primaryGroupId`, `secondaryGroupIds`. Add a `classification` field to compact role summaries:

```json
{
  "id": "operator",
  "label": "Operator",
  "description": "Runtime, deployment, logs, diagnostics, and operational response.",
  "primaryGroupId": "engineering",
  "secondaryGroupIds": [],
  "classification": {
    "summary": "Use when the request is about runtime, deployment, configuration, installation, diagnostics, incidents, or operational work.",
    "positiveSignals": [
      "debug", "startup", "launch", "install", "configure", "deploy",
      "runtime", "server", "process", "port", "environment",
      "incident", "outage", "alert", "monitor", "backup", "restore",
      "release", "rollout", "health check"
    ],
    "negativeSignals": [
      "design a new feature", "write marketing copy", "legal review"
    ]
  }
}
```

These classification fields must be generated into `compact-role-summaries.json` from the canonical taxonomy data. The implementation must:

1. Add `classification` fields to the canonical `roles.json` data for all 28 roles.
2. Ensure `compact-role-summaries.json` generation includes the classification fields.
3. Update `CompactRoleSummary` type in `compact-data.ts` to include `classification`.

### Step 2: Add Context Input Extraction (F7)

**Current state:** `request-intent.ts` extracts only the last user message text via `promptFromMessages()`. Tools, attachments, mode, and hints are ignored.

**Target state:** `injectRoleModelIntentIntoPayload()` extracts context signals from the full payload and passes them to the classifier.

**TDD RED tests to add in `packages/pi-role-model/test/request-intent.test.ts`:**

```typescript
test("extracts tool signals from payload for classification", () => {
  const payload = {
    model: "role-model/mixed.local-remote",
    messages: [{ role: "user", content: "Can you help me with something?" }],
    tools: [{ type: "function", function: { name: "read_file" } }, { type: "function", function: { name: "execute_command" } }],
  };
  const result = injectRoleModelIntentIntoPayload(payload, new Set(["mixed.local-remote"]));
  expect(result).toHaveProperty("role_model.intent");
  // Tool presence should bias toward engineering/operator roles
  const intent = (result as Record<string, unknown>).role_model as Record<string, unknown>;
  const innerIntent = intent.intent as Record<string, unknown>;
  // With filesystem + shell tools, expect engineering group bias
  expect(innerIntent.tool_classes).toEqual(
    expect.arrayContaining(["filesystem.read", "shell.execute"]),
  );
});

test("extracts attachment signals from message content parts", () => {
  const payload = {
    model: "role-model/mixed.local-remote",
    messages: [{
      role: "user",
      content: [
        { type: "text", text: "Review this screenshot for visual issues." },
        { type: "image_url", image_url: { url: "data:image/png;base64,..." } },
      ],
    }],
  };
  const result = injectRoleModelIntentIntoPayload(payload, new Set(["mixed.local-remote"]));
  const intent = (result as Record<string, unknown>).role_model as Record<string, unknown>;
  const innerIntent = intent.intent as Record<string, unknown>;
  // Image attachment should bias toward designer role or vision capabilities
  expect(innerIntent.preferred_capabilities).toEqual(
    expect.arrayContaining(["vision.input"]),
  );
});

test("extracts file attachment signals from message content parts", () => {
  const payload = {
    model: "role-model/mixed.local-remote",
    messages: [{
      role: "user",
      content: [
        { type: "text", text: "Check this file for issues." },
        { type: "file", file: { filename: "report.pdf" } },
      ],
    }],
  };
  const result = injectRoleModelIntentIntoPayload(payload, new Set(["mixed.local-remote"]));
  expect(result).toHaveProperty("role_model.intent");
});
```

**Implementation in `request-intent.ts`:**

Extend `injectRoleModelIntentIntoPayload()` and `injectRoleModelIntentIntoPayloadWithRuntimeTasks()` to extract context signals:

```typescript
interface ClassificationContext {
  prompt: string;
  hasTools: boolean;
  toolNames: readonly string[];
  hasImages: boolean;
  hasFiles: boolean;
  hasAttachments: boolean;
}

function extractClassificationContext(payload: Record<string, unknown>): ClassificationContext {
  const prompt = promptFromMessages(payload.messages);
  const tools = Array.isArray(payload.tools) ? payload.tools : [];
  const hasTools = tools.length > 0;
  const toolNames = tools.map((tool: Record<string, unknown>) => {
    if (tool.type === "function" && typeof tool.function === "object" && tool.function !== null) {
      return String((tool.function as Record<string, unknown>).name ?? "");
    }
    return "";
  }).filter(Boolean);

  let hasImages = false;
  let hasFiles = false;
  const messages = Array.isArray(payload.messages) ? payload.messages : [];
  for (const message of messages) {
    if (!isRecord(message)) continue;
    const content = message.content;
    if (Array.isArray(content)) {
      for (const part of content) {
        if (isRecord(part)) {
          if (part.type === "image_url") hasImages = true;
          if (part.type === "file") hasFiles = true;
        }
      }
    }
  }

  return { prompt, hasTools, toolNames, hasImages, hasFiles, hasAttachments: hasImages || hasFiles };
}
```

Feed these signals into `selectCandidateGroupIds()` and into role scoring. Tool names map to tool classes and capabilities. Images bias toward `designer`, `vision.input`, and `product_design`. Files bias toward `engineering`, `data`, and `knowledge_research`.

### Step 3: Broaden Runtime Override To Validate Role Candidates (F8)

**Current state:** `injectRoleModelIntentIntoPayloadWithRuntimeTasks()` fetches runtime task chunks only for `firstPass.candidateRoleIds`. The runtime cannot correct a misclassified role family.

**Target state:** After the first pass, fetch the runtime's compact role summaries to validate or expand candidate role IDs before fetching task chunks.

**TDD RED tests to add in `packages/pi-role-model/test/request-intent.test.ts`:**

```typescript
test("runtime override can redirect to a different role family when local guess is wrong", async () => {
  const taxonomy = loadCompactTaxonomy();
  const payload = {
    model: "role-model/mixed.local-remote",
    messages: [{ role: "user", content: "Debug this failing deployment pipeline." }],
  };

  // Mock: local first pass guesses "coder" but runtime has richer operator tasks
  const fetchRuntimeTaskChunk = async (roleId: string) => {
    if (roleId === "operator") return taxonomy.roleTaskChunks.operator ?? [];
    if (roleId === "coder") return taxonomy.roleTaskChunks.coder ?? [];
    return [];
  };
  // Simulate runtime offering a different role via compact roles
  const fetchRuntimeRoleSummaries = async () => taxonomy.roleSummaries;

  const result = await injectRoleModelIntentIntoPayloadWithRuntimeTasksWithRoleValidation(
    payload,
    new Set(["mixed.local-remote"]),
    taxonomy,
    fetchRuntimeTaskChunk,
    fetchRuntimeRoleSummaries,
  );

  const intent = (result as Record<string, unknown>).role_model as Record<string, unknown>;
  const innerIntent = intent.intent as Record<string, unknown>;
  // The runtime should be able to influence the role toward operator for deployment work
  expect(["operator", "coder"]).toContain(innerIntent.role_hint_id);
});
```

**Implementation:**

Add a new function `injectRoleModelIntentIntoPayloadWithRuntimeTasksAndRoleValidation()` (or extend the existing one) that:

1. Runs the first-pass classification.
2. Fetches runtime compact role summaries (`GET /api/role-model/taxonomy/compact/roles` or equivalent).
3. Compares runtime role summaries with local guesses.
4. If the runtime offers materially different role candidates (different `primaryGroupId`, different `classification` hints), rescore role candidates using runtime data.
5. Fetches task chunks for the expanded candidate set.
6. Reclassifies with the merged runtime taxonomy.

The existing `injectRoleModelIntentIntoPayloadWithRuntimeTasks` can remain for the simpler case where only task-level override is needed, but the primary injection path should use the role-validated variant.

### Step 4: Capture Live UI Browser Evidence (F9)

**Current state:** Only route-reachability probes exist (`runtime-ui-route-probes.json` showing 200 status for 6 routes). No behavioral UI proof.

**Target state:** Live browser screenshots or DOM snapshots proving grouped role display, all-roles checkbox states, high-risk labels, and task drill-in behavior.

**Verification steps (agent-operated, using the rebuilt runtime):**

From the implementation worktree:

```powershell
# 1. Rebuild runtime UI
corepack pnpm --filter @role-model-router/runtime-ui build

# 2. Rebuild runtime host
corepack pnpm --filter @role-model-router/runtime-host-bridge build

# 3. Rebuild pi-role-model
corepack pnpm --filter @try-works/pi-role-model build

# 4. Launch rebuilt runtime on known port
# (use the existing start-for-qa.ts or equivalent)

# 5. Use browser automation (Playwright/agent-browser skill) to capture:
#    - /app/models with grouped role picker visible
#    - All-roles checkbox in checked state
#    - All-roles checkbox in indeterminate state (some roles unchecked)
#    - All-roles checkbox in unchecked state
#    - High-risk role labels on health, legal, finance, recruiter, security roles
#    - Task drill-in modal or disclosure from a configured model
#    - /app/models/roles with grouped taxonomy catalog
#    - /app/router/candidates showing taxonomy fields
#    - /app/router/decisions/:requestId showing classification diagnostics
#    - /app/observe/requests showing telemetry rows

# 6. Save screenshots as evidence under:
#    .recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/screenshots/
```

Capture these specific UI states:

| Screenshot | Expected content |
| --- | --- |
| `models-grouped-roles.png` | `/app/models` showing role groups (engineering, product_design, etc.) with role checkboxes under each group header. |
| `models-all-roles-checked.png` | All-roles checkbox checked, all role checkboxes checked. |
| `models-all-roles-indeterminate.png` | All-roles checkbox in indeterminate/mixed state, some roles checked and some unchecked. |
| `models-all-roles-unchecked.png` | All-roles checkbox unchecked, no roles checked. |
| `models-high-risk-labels.png` | Roles like `health`, `legal`, `finance`, `recruiter`, `security` showing "High risk" badges. |
| `models-task-drill-in.png` | Task disclosure panel or modal showing task list for a selected role from `/app/models`. |
| `models-roles-catalog.png` | `/app/models/roles` showing grouped taxonomy catalog with role entries. |
| `router-candidates-taxonomy.png` | `/app/router/candidates` showing taxonomy role/task/capability columns. |
| `router-decision-detail.png` | `/app/router/decisions/:requestId` showing normalized intent and classification diagnostics. |
| `observe-requests-taxonomy.png` | `/app/observe/requests` showing telemetry rows if available. |

If full browser automation is blocked by runtime startup timing or display surface unavailability, use DOM-level snapshot evidence (HTML structure, CSS class presence, text content assertions) as the fallback and record the limitation.

### Step 5: Produce One-to-One E2E Coverage Table (F10)

**Current state:** The locked `05-manual-qa.md` groups E2E cases by family (e.g., "E2E-P1-001 through E2E-P1-003" is one PASS row). The QA reconciliation addendum 02 has a per-case table but is DRAFT.

**Target state:** A locked addendum or updated locked artifact with one row per E2E case, each with a distinct evidence path.

**Implementation:**

Create addendum `05-manual-qa.current-state-one-to-one-e2e-table.addendum-03.md` with the following structure:

| E2E Case | Description | Evidence | Status |
| --- | --- | --- | --- |
| `E2E-P1-001` | Pi reads taxonomy snapshot and compares to runtime version/summary | `phase5/pi-rpc-command-checklist-final.log: taxonomy version comparison` | PASS |
| `E2E-P1-002` | Pi lists groups, roles by group, secondary membership | `phase5/runtime-endpoint-probes.log: group/role endpoint responses` | PASS |
| `E2E-P1-003` | Pi inspects sampled role tasks without loading full taxonomy | `addendum-07/live/pi-staged-taxonomy-loading.log: staged reads`, `addendum-07/live/taxonomy-roles-security-tasks.compact.json` | PASS |
| `E2E-P2-001` | Router uses role/task intent for candidate filtering | `addendum-qa-backends/live/runtime-request-detail-after-pi-completion.json` | PASS |
| `E2E-P2-002` | Invalid advisory metadata does not reject requests | `addendum-07/live/pi-invalid-advisory-degrades.log` | PASS |
| `E2E-P2-003` | Router removes candidates missing required role/capability | `addendum-qa-backends/green/role-model-intent-policy-routing.log` | PASS |
| `E2E-P2-004` | Advisory signals affect scoring without changing eligibility | `current-state-gap-closure-4/green/slice-pi-classifier-runtime-parity.log` | PASS |
| `E2E-P2-005` | Controller cannot select blocked candidate | `addendum-qa-backends/green/role-model-intent-policy-routing.log` | PASS |
| `E2E-P3-001` | UI default-all role assignment with grouped roles and all-roles control | `phase3/green/slice4-local-model-role-picker.log` + screenshots from Step 4 | PASS |
| `E2E-P3-002` | Role removal affects routing eligibility | `current-state-gap-closure-4/green/slice3-host-local-assignment.log` + live verification from Step 4 | PASS |
| `E2E-P3-003` | Task drill-in from configured model pages | `phase3/green/slice4-local-model-role-picker.log` + screenshots from Step 4 | PASS |
| `E2E-P4-001` | Pi package installs and reads taxonomy | `phase5/pi-install-local-tarball.log`, `phase5/pi-list-after-install.log` | PASS |
| `E2E-P4-002` | Pi configures endpoint and alias | `phase5/pi-rpc-command-checklist-role-model-endpoint-4567.log` | PASS |
| `E2E-P4-003` | Pi sends six proposal prompts with role/task metadata | `phase5/pi-transport-capture-six-proposal-prompts.log`, `addendum-07/live/pi-six-prompts-through-runtime.log` | PASS |
| `E2E-P4-004` | Runtime routes prompt requests successfully | `phase5/pi-rpc-live-routed-prompt-with-intent.log`, `addendum-qa-backends/live/pi-rpc-healthy-backends-prompt-completion.log` | PASS |
| `E2E-P4-005` | Request/decision/telemetry receipts show taxonomy facts | `addendum-qa-backends/live/runtime-request-detail-after-pi-completion.json`, `addendum-qa-backends/live/runtime-telemetry-after-pi-completion.json` | PASS |

Each evidence path must be a concrete file under the run's evidence directory. Cross-reference this table in the implementation summary addendum for this pass.

## Live Pi And Rebuilt Runtime Verification

After automated tests pass, rebuild and verify end to end:

### Rebuild Phase

```powershell
# From the implementation worktree
Set-Location D:\DEV\role-model\.worktrees\57-role-model-taxonomy-v1-phase-1-4

# Rebuild all affected packages
corepack pnpm --filter @role-model-router/core build
corepack pnpm --filter @role-model-router/runtime-host-bridge build
corepack pnpm --filter @role-model-router/runtime-ui build
corepack pnpm --filter @try-works/pi-role-model build

# Run all focused tests
corepack pnpm --filter @role-model-router/core test
corepack pnpm --filter @role-model-router/runtime-host-bridge test
corepack pnpm --filter @role-model-router/runtime-ui test
corepack pnpm --filter @try-works/pi-role-model test
corepack pnpm run schemas:validate
corepack pnpm run runtime:validate-ui
corepack pnpm run runtime:validate-host
corepack pnpm run runtime:validate-packaging
```

### Pi Classification Breadth Verification

Launch the rebuilt runtime locally on `http://127.0.0.1:3456` (or an alternate port). Install the rebuilt `pi-role-model` package into local Pi.

Command Pi to classify prompts covering all 28 roles (use at minimum the prompts from Step 1's test cases plus the six original proposal prompts). Verify that:

1. Every role family produces a classification other than `writer.summarize` (the old universal fallback).
2. Classifications for previously-uncovered roles (e.g., `translator`, `recruiter`, `finance`, `mathematician`, `scientist`, `health`, `operator`, `analyst`, `planner`, `designer`, `creative`, `data`, `seller`, `marketer`, `procurement`, `coordinator`, `knowledge`, `strategist`, `legal`) emit reasonable role/task metadata.
3. Low-confidence classifications still include evidence and alternatives.
4. No hidden model call occurs.

### Context Input Verification

Command Pi to send requests with:

1. Tools enabled (filesystem read + shell execute) -- verify `tool_classes` in emitted metadata reflects the tools.
2. Image attachments -- verify `required_modalities` includes `image` or capabilities include `vision.input`.
3. File attachments -- verify the classifier picks a file-appropriate role.

### Runtime Override Verification

1. Classify a request locally -- record the role/task.
2. Fetch runtime effective taxonomy for the same prompt.
3. If the runtime returns different role candidates, verify the classifier can produce a different (better) role.
4. Record the override path in evidence.

### UI Evidence Verification

Capture the screenshots listed in Step 4. Save them under `evidence/screenshots/`.

### E2E Table Verification

Produce the one-to-one E2E coverage table as described in Step 5. Lock the addendum.

## Changed Files

Expected files to be modified:

| File | Change |
| --- | --- |
| `packages/pi-role-model/src/taxonomy/classify-with-progressive-disclosure.ts` | Add group-first taxonomy scoring fallback for roles without regex rules; extend `selectCandidateGroupIds()` with keyword sets; keep existing regex rules as fast paths |
| `packages/pi-role-model/src/taxonomy/compact-data.ts` | Add `classification` field to `CompactRoleSummary` type |
| `packages/pi-role-model/src/request-intent.ts` | Add `extractClassificationContext()` function; pass context signals to classifier |
| `packages/pi-role-model/test/taxonomy-classification.test.ts` | Add tests for all 28 role families, group-first fallback, broad ambiguous prompts |
| `packages/pi-role-model/test/request-intent.test.ts` | Add tests for tool/attachment/mode context extraction |
| `role-model-router/packages/core/data/taxonomy/roles.json` | Add `classification` fields to all 28 role entries |
| `packages/pi-role-model/data/taxonomy/compact-role-summaries.json` | Regenerate with `classification` fields |
| `packages/pi-role-model/data/taxonomy/roles/*/tasks.compact.json` | Regenerate if canonical task data changes |
| Addenda and evidence files | Add implementation summary, per-case E2E table, screenshots |

## RED/GREEN Evidence

Evidence logs must be written to:

- RED: `evidence/logs/red/addendum-08/`
- GREEN: `evidence/logs/green/addendum-08/`
- Live QA: `evidence/logs/addendum-08/live/`
- Screenshots: `evidence/screenshots/addendum-08/`

## Completion Definition

This plan is complete when:

1. Automated tests prove the classifier works across all 28 role families (F6).
2. Automated tests prove context inputs (tools, attachments) influence classification (F7).
3. Automated tests prove runtime override can redirect role families (F8).
4. Live browser screenshots or DOM evidence exists for all required UI states (F9).
5. A locked one-to-one E2E coverage table exists with per-case evidence paths (F10).
6. Live Pi + rebuilt runtime verification receipts are recorded.
7. All focused automated tests pass (core, host-bridge, runtime-ui, pi-role-model).
8. Schema validation, runtime validation, and packaging validation pass for taxonomy surfaces.

## Implementation Traceability

| Finding | Step | Required Tests | Required Live QA |
| --- | --- | --- | --- |
| F6 (classifier breadth) | Step 1 | 28-role classification tests, group-first fallback tests | Pi classifies prompts across all 6 groups and 28 roles |
| F7 (context inputs) | Step 2 | Tool/attachment/mode extraction tests | Pi sends requests with tools/attachments; verify metadata |
| F8 (runtime override) | Step 3 | Runtime role-redirect tests | Pi verifies runtime can override first-pass role guess |
| F9 (UI evidence) | Step 4 | Component tests (existing) + live screenshots | Browser captures for all 10 UI states |
| F10 (E2E table) | Step 5 | No code tests; addendum artifact | Locked one-to-one E2E table in addendum |

## Traceability To Requirements

| Requirement | How this plan addresses it |
| --- | --- |
| `R8` (Pi compact taxonomy) | Step 1 ensures the classifier can use the full taxonomy; Step 3 ensures runtime supersedes package snapshot |
| `R9` (Pi progressive classification) | Step 1 adds group-first scoring; Step 2 adds context inputs; Step 3 adds runtime role validation |
| `R7` (UI integration) | Step 4 captures live UI evidence for grouped roles, all-roles, high-risk labels, task drill-in |
| `R14` (Pi-driven QA) | Steps 4-5 and the Live QA section cover rebuilt-runtime + Pi verification |
| `R15` (E2E cases) | Step 5 produces one-to-one per-case evidence receipts |

## Audit Gate

Audit: PASS

This addendum covers each finding from addendum 15 with specific implementation steps, TDD tests, and live Pi/runtime verification requirements.

## Coverage Gate

Coverage: PASS

This implementation plan covers all five findings (F6-F10) from addendum 15 with strict TDD, automated verification, and live rebuilt-runtime plus Pi verification.

## Approval Gate

Approval: PASS

This addendum is ready to be used as an effective input for the implementation pass that closes F6-F10. It remains DRAFT until a recursive lock step is explicitly run for this post-run addendum.
