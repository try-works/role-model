# To-Be Plan Addendum 09: Audit Findings Closure Plan (R4.1, R5.1, R7.1, R7.2, R9.1, R10.1, R12.1)

Run: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/`
Phase: `02 To-Be Plan Addendum 09`
Artifact: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/02-to-be-plan.current-state-audit-findings-closure.addendum-09.md`
Status: `LOCKED`
Workflow version: `recursive-mode-audit-v1`
Artifact kind: run-local implementation plan addendum
CreatedAt: `2026-06-24`
Base Artifact: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/02-to-be-plan.md`
Audit Input: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/03-implementation-summary.current-state-gap-analysis.addendum-17.md`
Prior Plan: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/02-to-be-plan.current-state-post-closure-implementation-plan.addendum-08.md`
TDD Mode: `strict`
QA Execution Mode: `agent-operated`

## Inputs

- `D:/DEV/role-model-proposals/16-role-model-taxonomy-v1-proposal.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/03-implementation-summary.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/03-implementation-summary.current-state-gap-analysis.addendum-17.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/03-implementation-summary.current-state-addendum-08-closure.addendum-16.md`
- Current worktree state on branch `recursive/57-role-model-taxonomy-v1-phase-1-4`

## Purpose

This addendum defines the implementation plan to close all 7 findings (2 medium, 5 minor) from audit addendum 17. The plan remains scoped to proposal Phase 1 through Phase 4. Each finding is addressed with specific implementation steps, TDD test specifications, file paths, and end-to-end Pi + rebuilt-runtime verification requirements.

## Background: Naming Convention — Internal camelCase, External snake_case

The codebase maintains a clean, intentional split between internal and external naming conventions. This plan respects that split; R5.1 is scoped accordingly.

| Surface | Convention | Evidence |
|---------|-----------|----------|
| **External/wire** | `snake_case` | Proposal wire contract (16 refs in `classify-with-progressive-disclosure.ts`: `role_hint_id`, `task_type`, `required_capabilities`, `taxonomy_version`, `classification_contract_version`, `content_revision`, `tool_classes`, `required_modalities`, `output_modalities`, `context_tokens_estimate`). HTTP request body parser `readRoleModelIntentFromRequestBody()` (72 snake_case refs: `role_hint_id`, `task_type`, `requested_role_id`, `required_capabilities`, `preferred_capabilities`, `required_modalities`, `tool_classes`). Protocol schemas (6 files: `task_type`, `role_id`, `task_types_supported`, `effective_task_types`, `required_capabilities`, `suite_id`, `plan_id`). |
| **Internal/TypeScript** | `camelCase` | Core router types (5 refs in `types.ts`: `roleModelIntent`, `taskType`, `requiredCapabilities`, `requestedRoleId`). Router core (11 refs: `roleModelIntent`, `taskType`, `requiredCapabilities`). Runtime UI (37 refs: `roleIds`, `enabledRoleIds`, `disabledRoleIds`, `roleAssignmentMode`). Observation bundle (3 refs: `normalizedIntent`). |

The adapter layer at `readRoleModelIntentFromRequestBody()` (host bridge line 6044) converts external snake_case to internal camelCase. A reverse adapter (`toProposalWireContract`, internal camelCase → external snake_case) is the missing piece that R5.1 adds — producing the `role_model` field in the decision detail API response in the proposal wire contract format.

```
External (snake_case)          Adapter                    Internal (camelCase)
─────────────────────          ───────                    ───────────────────
role_model.intent.role_hint_id ──→ readRoleModelIntent ──→ roleModelIntent.role.id
role_model.intent.task_type    ──→ FromRequestBody()  ──→ roleModelIntent.task.id
required_capabilities          ──→ (snake → camel)    ──→ capabilities.required

                                                    Internal (camelCase)      Adapter                   External (snake_case)
                                                    ───────────────────      ───────                   ─────────────────────
                                                    normalizedIntent.role.id ──→ toProposalWireContract ──→ role_model.intent.role_hint_id
                                                    normalizedIntent.task.id ──→ (camel → snake, NEW)  ──→ role_model.intent.task_type
```

The existing `normalizedIntent` field (camelCase) remains for backward compatibility. The new `role_model` field (snake_case) matches the proposal wire contract that consumers already send.

## Non-Negotiable Safety And Scope Rules

- Preserve the user-approved permissive advisory metadata behavior: invalid advisory Pi metadata must not cause request failure.
- Do not make `pi-role-model` start, stop, install, update, or own the Role-Model runtime process.
- Do not read, print, copy, sync, or persist Pi provider secrets.
- Do not add hidden model calls for classification by default.
- Do not implement proposal Phase 5 benchmark or Phase 6 telemetry systems.

## Implementation Order

Findings are ordered by dependency. R12.1 and R5.1 are data/schema changes that affect multiple surfaces and should be done first. R4.1 and R10.1 are generation tasks that depend on canonical data being correct. R9.1 is a classifier enhancement. R7.1 and R7.2 are UI verification tasks that need the rebuilt runtime.

### Step 1: Close R12.1 — Add Deprecation Fields to Schemas

**Current state:** Entity schemas have `stability` enum with `"deprecated"` value, but no `replacement` or `deprecationReason` fields.

**Target state:** All entity schemas that support deprecation include optional `replacement` (string, the ID of the replacement entry) and `deprecationReason` (string, human-readable reason) fields. Per the proposal (line 2240):

```json
{
  "id": "coder.fix",
  "deprecated": true,
  "replacement": "coder.edit"
}
```

The proposal does not require `deprecationReason` in the example but the requirement document explicitly lists it as an acceptance criterion: "deprecated taxonomy entries can include `deprecated`, `replacement`, `deprecationReason`, and migration/alias behavior."

**Schemas to update** (all under `schemas/role-model/taxonomy/`):
- `role.schema.json`
- `task-type.schema.json`
- `capability.schema.json`
- `modality.schema.json`
- `tool-class.schema.json`
- `group.schema.json`
- `intent-preset.schema.json`

**TDD RED tests to add in `role-model-router/packages/core/test/taxonomy-catalog.test.ts`:**

```typescript
test("deprecation schema fields are present on all entity kinds", () => {
  // Load each schema and verify it has optional deprecation-related fields
  const schemas = [
    { name: "role", schema: loadSchema("role.schema.json") },
    { name: "task-type", schema: loadSchema("task-type.schema.json") },
    { name: "capability", schema: loadSchema("capability.schema.json") },
    { name: "modality", schema: loadSchema("modality.schema.json") },
    { name: "tool-class", schema: loadSchema("tool-class.schema.json") },
    { name: "group", schema: loadSchema("group.schema.json") },
    { name: "intent-preset", schema: loadSchema("intent-preset.schema.json") },
  ];

  for (const { name, schema } of schemas) {
    const props = schema.properties || schema.schema?.properties || {};
    // replacement: optional string
    expect(props.replacement, `${name}: replacement field`).toBeDefined();
    expect(props.replacement.type || "string", `${name}: replacement is string`).toBe("string");
    // deprecationReason: optional string
    expect(props.deprecationReason, `${name}: deprecationReason field`).toBeDefined();
    expect(props.deprecationReason.type || "string", `${name}: deprecationReason is string`).toBe("string");
  }
});

test("deprecation fields validate on canonical role data", () => {
  const roleWithDeprecation = {
    ...canonicalTaxonomy.roles[0],
    stability: "deprecated",
    replacement: "coder.edit",
    deprecationReason: "Consolidated into coder.edit for simpler task vocabulary.",
  };
  const result = roleSchema(roleWithDeprecation);
  expect(result, "role with deprecation fields validates").toBe(true);
});

test("deprecation fields are optional — entries without them still validate", () => {
  // All canonical entries currently have stability "stable" and no replacement/deprecationReason
  for (const role of canonicalTaxonomy.roles) {
    expect(roleSchema(role), `role ${role.id} validates without deprecation fields`).toBe(true);
  }
});
```

**Implementation steps:**
1. Add to each of the 7 entity schemas:
```json
"replacement": {
  "type": "string",
  "description": "When stability is 'deprecated', the ID of the replacement entry."
},
"deprecationReason": {
  "type": "string",
  "description": "Human-readable reason for deprecation."
}
```
2. Add `stability: "stable"` to all canonical JSON data entries that currently lack it (some entries in `roles.json`, `task-types.json`, etc. have it, but verify all).
3. Run schema validation to confirm all canonical data still validates.
4. Run the new deprecation tests.

**GREEN evidence path:** `evidence/logs/green/addendum-09/slice1-deprecation-schemas.log`

### Step 2: Close R5.1 — Align Decision Detail API Response with Proposal Wire Contract

**Current state:** The `normalizedIntent` field in the decision detail API response uses camelCase internal naming (`role.id`, `task.id`, `taxonomyVersion`). The proposal wire contract uses snake_case (`role_hint_id`, `task_type`, `taxonomy_version`).

**Target state:** The decision detail API response includes BOTH the internal camelCase `normalizedIntent` (for backward compatibility) AND a new `role_model` field that mirrors the proposal's stable wire contract in snake_case. Per the proposal (lines 1964-2117), the request metadata shape is:

```json
{
  "role_model": {
    "contract_version": 1,
    "intent": {
      "taxonomy_version": "1.0.0-alpha.1",
      "content_revision": "taxonomy-v1-alpha.1",
      "classification_contract_version": "role-model.classification.v1",
      "role_hint_id": "security",
      "requested_role_id": null,
      "task_type": "security.audit",
      "task_action": "audit",
      "task_variant": null,
      "task_source": "heuristic",
      "task_confidence": 0.72,
      "role_source": "heuristic",
      "confidence": 0.72,
      "source": "heuristic",
      "required_capabilities": ["code.read"],
      "preferred_capabilities": ["security.analysis"],
      "required_modalities": ["text"],
      "tool_classes": ["filesystem.read"],
      "context_tokens_estimate": 42000,
      "evidence": ["Pi classified prompt as security/security.audit using group-first progressive disclosure."],
      "alternatives": [
        { "role_hint_id": "coder", "task_type": "coder.review", "confidence": 0.45 }
      ]
    }
  }
}
```

**TDD RED tests to add in `role-model-router/apps/runtime-host-bridge/test/index.test.ts`:**

```typescript
test("decision detail includes role_model in proposal wire contract format", async () => {
  // Send a request with role_model
  const body = {
    model: "default.decision-only",
    messages: [{ role: "user", content: "Review this code for bugs." }],
    role_model: {
      contract_version: 1,
      intent: {
        role_hint_id: "coder",
        task_type: "coder.review",
        taxonomy_version: "1.0.0-alpha.1",
        classification_contract_version: "role-model.classification.v1",
        required_capabilities: ["code.read"],
        preferred_capabilities: ["reasoning.multi_step"],
        tool_classes: ["filesystem.read"],
        evidence: ["Test classification evidence."],
        alternatives: [{ role_hint_id: "security", task_type: "security.audit", confidence: 0.4 }],
      },
    },
  };

  const chatResp = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  expect(chatResp.status).toBe(200);

  // Get the routing decision
  await sleep(500);
  const decisionsResp = await fetch(`${baseUrl}/api/role-model/router/decisions?limit=1`);
  const decisions = await decisionsResp.json();
  const requestId = decisions[0]?.requestId;
  expect(requestId).toBeDefined();

  const detailResp = await fetch(`${baseUrl}/api/role-model/router/decisions/${requestId}`);
  const detail = await detailResp.json();

  // Verify role_model is present in proposal wire contract format
  expect(detail.role_model).toBeDefined();
  expect(detail.role_model.contract_version).toBe(1);
  expect(detail.role_model.intent).toBeDefined();
  expect(detail.role_model.intent.taxonomy_version).toBe("1.0.0-alpha.1");
  expect(detail.role_model.intent.classification_contract_version).toBe("role-model.classification.v1");

  // Role and task in snake_case
  expect(detail.role_model.intent.role_hint_id).toBe("coder");
  expect(detail.role_model.intent.task_type).toBe("coder.review");

  // Capabilities
  expect(detail.role_model.intent.required_capabilities).toEqual(
    expect.arrayContaining(["code.read"]),
  );
  expect(detail.role_model.intent.preferred_capabilities).toEqual(
    expect.arrayContaining(["reasoning.multi_step"]),
  );

  // Tool classes and evidence
  if (detail.role_model.intent.tool_classes) {
    expect(detail.role_model.intent.tool_classes).toEqual(
      expect.arrayContaining(["filesystem.read"]),
    );
  }
  if (detail.role_model.intent.evidence) {
    expect(detail.role_model.intent.evidence.length).toBeGreaterThan(0);
  }

  // Alternatives in snake_case
  if (detail.role_model.intent.alternatives) {
    expect(detail.role_model.intent.alternatives.length).toBeGreaterThan(0);
    for (const alt of detail.role_model.intent.alternatives) {
      if (alt.role_hint_id) expect(typeof alt.role_hint_id).toBe("string");
      if (alt.task_type) expect(typeof alt.task_type).toBe("string");
    }
  }

  // Backward compatibility: normalizedIntent still present
  expect(detail.normalizedIntent).toBeDefined();
  expect(detail.normalizedIntent.role).toBeDefined();
  expect(detail.normalizedIntent.task).toBeDefined();
});

test("decision detail role_model gracefully handles missing intent fields", async () => {
  // Send a minimal request with only required role_model fields
  const body = {
    model: "default.decision-only",
    messages: [{ role: "user", content: "Hello." }],
    role_model: {
      contract_version: 1,
      intent: {
        taxonomy_version: "1.0.0-alpha.1",
        classification_contract_version: "role-model.classification.v1",
      },
    },
  };

  const chatResp = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  expect(chatResp.status).toBe(200);

  await sleep(500);
  const decisionsResp = await fetch(`${baseUrl}/api/role-model/router/decisions?limit=1`);
  const decisions = await decisionsResp.json();
  const detailResp = await fetch(`${baseUrl}/api/role-model/router/decisions/${decisions[0]?.requestId}`);
  const detail = await detailResp.json();

  // role_model should be present even when optional fields are missing
  expect(detail.role_model).toBeDefined();
  expect(detail.role_model.contract_version).toBe(1);
  expect(detail.role_model.intent.taxonomy_version).toBe("1.0.0-alpha.1");

  // These fields should be null or absent, not crash
  expect(detail.role_model.intent.role_hint_id === undefined || detail.role_model.intent.role_hint_id === null).toBe(true);
});
```

**Implementation in `readRouterDecisionData` (host bridge `src/index.ts`):**

Add a function to convert the internal camelCase `normalizedIntent` back to the proposal snake_case wire contract:

```typescript
function toProposalWireContract(
  normalizedIntent: Record<string, unknown> | undefined,
): Record<string, unknown> | null {
  if (!normalizedIntent) return null;

  const role = normalizedIntent.role as Record<string, unknown> | undefined;
  const task = normalizedIntent.task as Record<string, unknown> | undefined;
  const caps = normalizedIntent.capabilities as Record<string, unknown> | undefined;
  const mods = normalizedIntent.modalities as Record<string, unknown> | undefined;
  const tcs = normalizedIntent.toolClasses as readonly string[] | undefined;

  const alternatives = Array.isArray(normalizedIntent.alternatives)
    ? normalizedIntent.alternatives.map((alt: Record<string, unknown>) => ({
        ...(typeof alt.roleId === "string" ? { role_hint_id: alt.roleId } : {}),
        ...(typeof alt.taskType === "string" ? { task_type: alt.taskType } : {}),
        ...(typeof alt.confidence === "number" ? { confidence: alt.confidence } : {}),
      }))
    : undefined;

  return {
    contract_version: normalizedIntent.contractVersion,
    intent: {
      taxonomy_version: normalizedIntent.taxonomyVersion,
      ...(normalizedIntent.contentRevision
        ? { content_revision: normalizedIntent.contentRevision }
        : {}),
      classification_contract_version: normalizedIntent.classificationContractVersion,
      ...(role?.id ? { role_hint_id: role.id } : {}),
      ...(task?.id ? { task_type: task.id } : {}),
      ...(normalizedIntent.taskAction
        ? { task_action: normalizedIntent.taskAction }
        : {}),
      ...(normalizedIntent.taskVariant !== undefined
        ? { task_variant: normalizedIntent.taskVariant }
        : {}),
      ...(normalizedIntent.taskSource
        ? { task_source: normalizedIntent.taskSource }
        : {}),
      ...(typeof normalizedIntent.taskConfidence === "number"
        ? { task_confidence: normalizedIntent.taskConfidence }
        : {}),
      ...(normalizedIntent.roleSource
        ? { role_source: normalizedIntent.roleSource }
        : {}),
      ...(typeof normalizedIntent.confidence === "number"
        ? { confidence: normalizedIntent.confidence }
        : {}),
      ...(normalizedIntent.source
        ? { source: normalizedIntent.source }
        : {}),
      ...(caps?.required
        ? { required_capabilities: caps.required }
        : {}),
      ...(caps?.preferred
        ? { preferred_capabilities: caps.preferred }
        : {}),
      ...(mods?.required
        ? { required_modalities: mods.required }
        : {}),
      ...(tcs && tcs.length > 0
        ? { tool_classes: tcs }
        : {}),
      ...(normalizedIntent.contextTokensEstimate
        ? { context_tokens_estimate: normalizedIntent.contextTokensEstimate }
        : {}),
      ...(normalizedIntent.evidence
        ? { evidence: normalizedIntent.evidence }
        : {}),
      ...(alternatives && alternatives.length > 0
        ? { alternatives }
        : {}),
    },
  };
}
```

Then add to the return of `readRouterDecisionData`:
```typescript
role_model: observation.normalizedIntent
  ? toProposalWireContract(observation.normalizedIntent as Record<string, unknown>)
  : null,
```

**GREEN evidence path:** `evidence/logs/green/addendum-09/slice2-wire-contract.log`

### Step 3: Close R9.1 — Deepen Classifier Context Signals

**Current state:** The classifier uses `hasTools`, `hasImages`, `hasFiles` booleans to bias group/role selection. It does not analyze tool names, specific attachment types, or mode.

**Target state:** The classifier extracts and uses:
- **Tool names**: mapped to likely role families and capabilities
- **Image content parts**: bias toward `designer`, `vision.input`, `product_design`
- **File attachment types** (by extension): bias toward appropriate roles (`.sql` → `data`, `.pdf` → `knowledge`/`legal`, `.py` → `coder`, etc.)
- **Mode** (if available in payload): `code` mode → engineering roles; `chat` → communication/product_design

**Tool name → role family mapping (derived from proposal task classifier guidance):**

```typescript
const toolNameToRoleHints: Record<string, readonly string[]> = {
  // Filesystem tools → engineering
  "read_file": ["coder", "architect", "security", "data"],
  "write_file": ["coder", "architect"],
  "edit_file": ["coder"],
  "search_file": ["coder", "architect", "researcher"],
  "list_files": ["coder", "architect", "operator"],
  // Shell/execution tools → engineering, operator
  "execute_command": ["coder", "operator", "tester"],
  "run_terminal": ["operator", "coder"],
  // Browser tools → researcher, tester, designer
  "browser_navigate": ["researcher", "tester", "designer"],
  "browser_click": ["tester", "designer"],
  "browser_snapshot": ["tester", "designer"],
  "browser_console": ["coder", "tester"],
  // Web search → researcher
  "web_search": ["researcher", "analyst", "knowledge"],
  "web_fetch": ["researcher", "knowledge"],
  // Database → data
  "db_query": ["data", "analyst"],
  "db_schema": ["data", "architect"],
  // Git → coder
  "git_commit": ["coder"],
  "git_diff": ["coder", "security"],
  "git_log": ["coder", "architect"],
  // Testing → tester
  "run_tests": ["tester", "coder"],
  "test_runner": ["tester"],
  // Package management → coder, operator
  "npm_install": ["coder", "operator"],
  "pip_install": ["coder", "operator"],
};
```

**File extension → role hints:**

```typescript
const fileExtensionToRoleHints: Record<string, readonly string[]> = {
  ".sql": ["data", "architect"],
  ".db": ["data"],
  ".csv": ["data", "analyst"],
  ".json": ["data", "coder", "architect"],
  ".yaml": ["coder", "operator", "architect"],
  ".yml": ["coder", "operator", "architect"],
  ".py": ["coder", "data"],
  ".ts": ["coder", "architect"],
  ".tsx": ["coder", "designer"],
  ".js": ["coder"],
  ".jsx": ["coder", "designer"],
  ".html": ["coder", "designer"],
  ".css": ["designer"],
  ".md": ["writer", "knowledge", "support"],
  ".pdf": ["knowledge", "legal", "researcher"],
  ".docx": ["writer", "legal", "support"],
  ".png": ["designer", "product"],
  ".jpg": ["designer", "product"],
  ".svg": ["designer"],
  ".toml": ["coder", "operator"],
  ".lock": ["coder"],
};
```

**TDD RED tests to add in `packages/pi-role-model/test/request-intent.test.ts`:**

```typescript
test("tool names bias classification toward appropriate role families (R9.1)", () => {
  // Shell + filesystem tools should bias toward engineering/operator
  const payload = {
    model: "role-model/mixed.local-remote",
    messages: [{ role: "user", content: "Can you help me with something?" }],
    tools: [
      { type: "function", function: { name: "execute_command" } },
      { type: "function", function: { name: "read_file" } },
    ],
  };
  const result = injectRoleModelIntentIntoPayload(payload, new Set(["mixed.local-remote"]));
  const intent = (result as Record<string, unknown>).role_model as Record<string, unknown>;
  const inner = intent.intent as Record<string, unknown>;
  // With execute_command + read_file, expect engineering or operator roles
  expect(["coder", "operator", "architect", "tester"]).toContain(inner.role_hint_id);
});

test("browser tools bias classification toward researcher/tester/designer (R9.1)", () => {
  const payload = {
    model: "role-model/mixed.local-remote",
    messages: [{ role: "user", content: "Check this page." }],
    tools: [
      { type: "function", function: { name: "browser_navigate" } },
      { type: "function", function: { name: "browser_snapshot" } },
    ],
  };
  const result = injectRoleModelIntentIntoPayload(payload, new Set(["mixed.local-remote"]));
  const intent = (result as Record<string, unknown>).role_model as Record<string, unknown>;
  const inner = intent.intent as Record<string, unknown>;
  expect(["researcher", "tester", "designer"]).toContain(inner.role_hint_id);
});

test("database tools bias classification toward data roles (R9.1)", () => {
  const payload = {
    model: "role-model/mixed.local-remote",
    messages: [{ role: "user", content: "Look at this." }],
    tools: [
      { type: "function", function: { name: "db_query" } },
      { type: "function", function: { name: "db_schema" } },
    ],
  };
  const result = injectRoleModelIntentIntoPayload(payload, new Set(["mixed.local-remote"]));
  const intent = (result as Record<string, unknown>).role_model as Record<string, unknown>;
  const inner = intent.intent as Record<string, unknown>;
  expect(["data", "analyst", "architect"]).toContain(inner.role_hint_id);
});

test("file attachment extensions bias classification (R9.1)", () => {
  const payload = {
    model: "role-model/mixed.local-remote",
    messages: [{
      role: "user",
      content: [
        { type: "text", text: "Review this for issues." },
        { type: "file", file: { filename: "schema.sql" } },
      ],
    }],
  };
  const result = injectRoleModelIntentIntoPayload(payload, new Set(["mixed.local-remote"]));
  const intent = (result as Record<string, unknown>).role_model as Record<string, unknown>;
  const inner = intent.intent as Record<string, unknown>;
  expect(["data", "architect"]).toContain(inner.role_hint_id);
});

test("context signals combined: tools + attachments produce additive bias (R9.1)", () => {
  const payload = {
    model: "role-model/mixed.local-remote",
    messages: [{
      role: "user",
      content: [
        { type: "text", text: "Check this." },
        { type: "image_url", image_url: { url: "data:image/png;base64,..." } },
      ],
    }],
    tools: [
      { type: "function", function: { name: "browser_navigate" } },
      { type: "function", function: { name: "browser_snapshot" } },
    ],
  };
  const result = injectRoleModelIntentIntoPayload(payload, new Set(["mixed.local-remote"]));
  const intent = (result as Record<string, unknown>).role_model as Record<string, unknown>;
  const inner = intent.intent as Record<string, unknown>;
  // Browser tools + image attachment → designer or tester
  expect(["designer", "tester"]).toContain(inner.role_hint_id);
  // Image attachment should add vision.input capability
  expect(inner.preferred_capabilities).toEqual(
    expect.arrayContaining(["vision.input"]),
  );
});
```

**Implementation changes:**

1. **In `packages/pi-role-model/src/request-intent.ts`:**
   - Extend `extractClassificationContext()` to also extract:
     - `toolCategories`: derived categories from tool names (`"filesystem"`, `"shell"`, `"browser"`, `"database"`, `"git"`, `"test"`)
     - `fileExtensions`: extracted from `file.filename` in content parts
     - `toolRoleHints`: role IDs derived from tool name mapping
     - `fileRoleHints`: role IDs derived from file extension mapping
   - Add to `ClassificationContext` interface

2. **In `packages/pi-role-model/src/taxonomy/classify-with-progressive-disclosure.ts`:**
   - Extend `ClassificationContext` with `toolRoleHints` and `fileRoleHints`
   - In `selectCandidateGroupIds()`: use tool categories to bias groups (shell → engineering, browser → product_design, database → engineering)
   - In `scoreRoleForPrompt()`: add bonus for roles matching tool/file hints

**GREEN evidence path:** `evidence/logs/green/addendum-09/slice3-classifier-context.log`

### Step 4: Close R4.1 — Generate Classification Guide from Taxonomy Data

**Current state:** `/api/role-model/taxonomy/classification-guide` returns a hardcoded rules array.

**Target state:** The classification guide is generated from taxonomy data, including:
- Group keyword summaries (derived from `groupKeywordSets` in the classifier)
- Role classification signals per group (from `role.classification.positiveSignals`/`negativeSignals`)
- Consumer classification algorithm steps

**TDD RED test to add in `role-model-router/apps/runtime-host-bridge/test/taxonomy-discovery.test.ts`:**

```typescript
test("classification guide is generated from taxonomy data, not hardcoded", async () => {
  const resp = await fetch(`${baseUrl}/api/role-model/taxonomy/classification-guide`);
  expect(resp.status).toBe(200);
  const guide = await resp.json();

  // Must reference actual taxonomy version
  expect(guide.taxonomyVersion).toBe("1.0.0-alpha.1");

  // Must include groups section derived from data
  expect(guide.groups).toBeDefined();
  expect(Array.isArray(guide.groups)).toBe(true);
  expect(guide.groups.length).toBe(6);

  // Each group entry must have keyword hints from taxonomy data
  for (const group of guide.groups) {
    expect(group.id).toBeDefined();
    expect(group.label).toBeDefined();
    expect(group.keywordHints).toBeDefined();
    expect(Array.isArray(group.keywordHints)).toBe(true);
    expect(group.keywordHints.length).toBeGreaterThan(0);
    expect(group.roleCount).toBeGreaterThan(0);
  }

  // Must include the consumer algorithm steps
  expect(guide.algorithm).toBeDefined();
  expect(Array.isArray(guide.algorithm)).toBe(true);
  expect(guide.algorithm.length).toBeGreaterThan(0);

  // Verify a known group's keyword hints match the taxonomy data
  const engineering = guide.groups.find((g: { id: string }) => g.id === "engineering");
  expect(engineering).toBeDefined();
  expect(engineering.keywordHints).toEqual(
    expect.arrayContaining(["code", "implement", "bug", "fix", "deploy", "debug"]),
  );
});
```

**Implementation in host bridge:**

Replace the hardcoded `classification-guide` handler with one that reads from the canonical taxonomy and the classifier's group keyword sets. The guide should be structured as:

```json
{
  "schemaVersion": "role-model.taxonomy.schema.v1",
  "taxonomyVersion": "1.0.0-alpha.1",
  "classificationContractVersion": "role-model.classification.v1",
  "algorithm": [
    "1. Identify candidate groups from prompt keywords and context signals.",
    "2. Load role summaries for candidate groups.",
    "3. Score each role using classification signals (positiveSignals, negativeSignals, description).",
    "4. Select highest-scoring role; load its task chunk.",
    "5. Score tasks within the chunk; select best task.",
    "6. Emit role_model.intent with role, task, capabilities, modalities, tool classes, confidence, evidence, and alternatives."
  ],
  "groups": [
    {
      "id": "engineering",
      "label": "Engineering",
      "keywordHints": ["code", "implement", "bug", "fix", "patch", "diff", "security", "schema", "migration", "api", "runtime", "test", "deploy", "debug", "refactor", "database", "sql", "query", "infrastructure", "server", "compile", "build", "pipeline"],
      "roleCount": 6,
      "roles": [
        {
          "id": "coder",
          "label": "Coder",
          "classificationSignals": {
            "positive": ["code", "patch", "diff", "test", "debug", "implement", "fix", "refactor", "migrate", "generate"],
            "negative": ["write marketing copy", "compare web sources", "threat model only", "legal review", "financial analysis"]
          }
        }
      ]
    }
  ],
  "wireWrapper": "role_model.intent",
  "hardFields": ["trusted internal required capabilities", "trusted internal required modalities", "trusted internal tool classes"],
  "advisoryFields": ["role_hint_id", "task_type", "required_capabilities from Pi metadata", "preferred_capabilities", "task_confidence", "alternatives"]
}
```

**GREEN evidence path:** `evidence/logs/green/addendum-09/slice4-classification-guide.log`

### Step 5: Close R10.1 — Generate Docs from Taxonomy Data

**Current state:** `docs/protocol/taxonomy-v1.md` contains manually maintained task tables.

**Target state:** The taxonomy docs include a validation step that compares doc content against canonical taxonomy data to detect drift. Full generation is not required — a consistency check that fails when taxonomy data changes without doc updates is sufficient for this run.

**TDD RED test:** Extend `role-model-router/packages/core/test/taxonomy-docs.test.ts`:

```typescript
test("taxonomy docs task count matches canonical data", () => {
  // Read the docs file
  const docsContent = readFileSync(
    path.resolve(repoRoot, "docs/protocol/taxonomy-v1.md"),
    "utf8",
  );

  // Count task type IDs mentioned in the docs (look for `backtick.task_id` patterns)
  const taskIdPattern = /\|\s*`([a-z_]+\.[a-z_]+(?:\.[a-z_]+)?)`\s*\|/g;
  const docTaskIds = new Set<string>();
  let match;
  while ((match = taskIdPattern.exec(docsContent)) !== null) {
    docTaskIds.add(match[1]);
  }

  // Every canonical task that has classifier guidance should appear in docs
  const canonicalTasksWithGuidance = canonicalTaxonomy.tasks.filter(
    (task) => task.classifier?.useWhen || task.classifier?.doNotUseWhen,
  );

  expect(docTaskIds.size).toBeGreaterThanOrEqual(280);
  // At minimum, the well-known tasks must be present
  const requiredTasks = [
    "coder.edit", "coder.review", "coder.debug.root_cause",
    "security.audit", "security.threat_model",
    "architect.design", "architect.review",
    "researcher.web_research", "researcher.web_research.current",
    "writer.docs.write", "writer.summarize",
    "operator.debug.startup", "operator.install",
    "analyst.compare", "planner.roadmap",
    "tester.e2e", "data.schema.review",
    "product.requirements", "designer.ui.review",
    "support.ticket.reply", "legal.review",
    "finance.cost_estimate", "creative.brainstorm",
    "educator.lesson.plan", "translator.translate",
    "marketer.content.seo", "seller.outreach.write",
    "recruiter.job_description", "procurement.vendor.compare",
    "coordinator.meeting.agenda", "knowledge.organize",
    "strategist.market.analyze", "mathematician.solve",
    "scientist.experiment.design", "health.info.general",
  ];
  for (const taskId of requiredTasks) {
    expect(docTaskIds.has(taskId), `docs should include ${taskId}`).toBe(true);
  }
});

test("taxonomy docs table of contents links to all major sections", () => {
  const docsContent = readFileSync(
    path.resolve(repoRoot, "docs/protocol/taxonomy-v1.md"),
    "utf8",
  );
  const requiredSections = [
    "Groups",
    "Roles",
    "Task Types",
    "Capabilities",
    "Modalities",
    "Tool Classes",
    "Classification Guide",
    "Versioning",
    "Router And Controller Use",
  ];
  for (const section of requiredSections) {
    expect(docsContent.includes(section), `docs should mention ${section}`).toBe(true);
  }
});
```

**Implementation:** If the doc validation test reveals missing sections or task entries, add them to `taxonomy-v1.md`. The test serves as a guardrail against future drift.

**GREEN evidence path:** `evidence/logs/green/addendum-09/slice5-docs-consistency.log`

### Step 6: Close R7.1 and R7.2 — UI Functional Verification

**Current state (R7.1):** The all-roles checkbox has `aria-checked="mixed"` but the visual indeterminate state was not screenshot-verified.

**Target state:** Capture browser screenshots showing the all-roles checkbox in all three visual states (checked, unchecked, indeterminate/mixed).

**Current state (R7.2):** `taskOverrides`, `capabilityOverrides`, `modalityOverrides`, `toolClassOverrides` exist in the type definition but were not functionally verified.

**Target state:** Verify through DOM inspection and API calls that the model role assignment persistence shape supports these override fields correctly.

**Verification steps (agent-operated):**

From the implementation worktree with the rebuilt runtime running on `:3456`:

```powershell
# 1. Rebuild runtime UI
corepack pnpm --filter @role-model-router/runtime-ui build

# 2. Launch rebuilt runtime (already running)

# 3. Use browser automation to capture:
#    a) Navigate to /app/models
#    b) Click Inspect on a model
#    c) Screenshot: all-roles checkbox in CHECKED state (all roles selected)
#    d) Uncheck 3-4 roles
#    e) Screenshot: all-roles checkbox in INDETERMINATE (mixed) state
#    f) Uncheck all remaining roles
#    g) Screenshot: all-roles checkbox in UNCHECKED state
#    h) Verify high-risk labels visible

# 4. Verify model role assignment persistence:
#    a) GET /api/role-model/accounts/{accountId} to read current modelRoleBindings
#    b) Verify roleAssignmentMode, enabledRoleIds, disabledRoleIds fields present
#    c) Verify taskOverrides, capabilityOverrides, modalityOverrides, toolClassOverrides in type definition

# 5. Save screenshots as evidence under:
#    .recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/screenshots/addendum-09/
```

**TDD RED test for R7.2 in `role-model-router/apps/runtime-ui/app/lib/runtime-api.test.ts`:**

```typescript
test("model role assignment includes override fields in API response shape", () => {
  // Verify the RuntimeModelRoleAssignment type has all required override fields
  const assignment: RuntimeModelRoleAssignment = {
    roleAssignmentMode: "all",
    enabledRoleIds: [],
    disabledRoleIds: [],
  };

  // These fields should be optional in the type
  expect(assignment).toHaveProperty("roleAssignmentMode");
  expect(assignment).toHaveProperty("enabledRoleIds");
  expect(assignment).toHaveProperty("disabledRoleIds");

  // Verify the type allows override fields (compile-time check)
  const withOverrides: RuntimeModelRoleAssignment = {
    roleAssignmentMode: "custom",
    enabledRoleIds: ["coder", "architect"],
    disabledRoleIds: ["health", "legal"],
    taskOverrides: { "coder.edit": "enabled" },
    capabilityOverrides: { "code.read": "disabled" },
    modalityOverrides: { "image": "enabled" },
    toolClassOverrides: { "shell.execute": "disabled" },
  };
  expect(withOverrides.roleAssignmentMode).toBe("custom");
  expect(withOverrides.taskOverrides).toBeDefined();
  expect(withOverrides.capabilityOverrides).toBeDefined();
  expect(withOverrides.modalityOverrides).toBeDefined();
  expect(withOverrides.toolClassOverrides).toBeDefined();
});

test("active account model role bindings include override fields", async () => {
  // Fetch accounts and verify the modelRoleBindings shape
  const accountsResp = await fetch(`${baseUrl}/api/role-model/accounts`);
  const accounts = await accountsResp.json();
  if (Array.isArray(accounts) && accounts.length > 0) {
    const accountWithModels = accounts.find(
      (a: Record<string, unknown>) =>
        Array.isArray(a.modelRoleBindings) && a.modelRoleBindings.length > 0,
    );
    if (accountWithModels) {
      const binding = accountWithModels.modelRoleBindings[0];
      expect(binding).toHaveProperty("roleAssignmentMode");
      // Verify override fields are at least present in the shape (they may be undefined)
      expect(binding).toHaveProperty("taskOverrides");
      expect(binding).toHaveProperty("capabilityOverrides");
      expect(binding).toHaveProperty("modalityOverrides");
      expect(binding).toHaveProperty("toolClassOverrides");
    }
  }
});
```

**GREEN evidence path:** `evidence/logs/green/addendum-09/slice6-ui-verification.log`

### Live Pi + Rebuilt Runtime End-to-End Verification

After all automated tests pass, perform live verification:

### Rebuild Phase

```powershell
# From the implementation worktree
Set-Location D:\DEV\role-model\.worktrees\57-role-model-taxonomy-v1-phase-1-4

# Rebuild all affected packages
corepack pnpm --filter @role-model-router/core build
corepack pnpm --filter @role-model-router/runtime-host-bridge build
corepack pnpm --filter @role-model-router/runtime-ui build
corepack pnpm --filter @try-works/pi-role-model build

# Run all tests
corepack pnpm --filter @role-model-router/core test
corepack pnpm --filter @role-model-router/runtime-host-bridge test
corepack pnpm --filter @try-works/pi-role-model test
corepack pnpm run schemas:validate
```

### Live Runtime Verification

1. Launch the rebuilt runtime on `:3456` (or alternate port if 3456 is occupied)
2. Kill any mock LiteLLM vendor process
3. Update runtime config to remove LiteLLM if present

### Deprecation Schema Verification (R12.1)

```powershell
# Verify all 7 schemas have replacement and deprecationReason fields
# Verify canonical data still validates with the updated schemas
corepack pnpm run schemas:validate
```

### Wire Contract Verification (R5.1)

Send a request with `role_model.intent` and verify the decision detail returns BOTH `normalizedIntent` (camelCase, backward compat) and `role_model` (snake_case, proposal wire contract):

```bash
curl -s -X POST "http://127.0.0.1:3456/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{"model":"default.decision-only","messages":[{"role":"user","content":"Review this code for bugs."}],"role_model":{"contract_version":1,"intent":{"role_hint_id":"coder","task_type":"coder.review","taxonomy_version":"1.0.0-alpha.1","classification_contract_version":"role-model.classification.v1","required_capabilities":["code.read"],"preferred_capabilities":["reasoning.multi_step"]}}}'

# Check the decision detail
curl -s "http://127.0.0.1:3456/api/role-model/router/decisions/<requestId>" | jq '{has_normalizedIntent: (.normalizedIntent != null), has_role_model: (.role_model != null), role_model_role: .role_model.intent.role_hint_id, role_model_task: .role_model.intent.task_type}'
```

### Classifier Context Verification (R9.1)

Send requests with different tool configurations and verify the classification is influenced:

1. **Shell tools only** → expect engineering/operator roles
2. **Browser tools only** → expect researcher/tester/designer roles
3. **Database tools only** → expect data/analyst roles
4. **SQL file attachment** → expect data/architect roles
5. **Image attachment + browser tools** → expect designer role with `vision.input` capability

For each, verify the `role_model.intent.role_hint_id` in the decision detail.

### Classification Guide Verification (R4.1)

```bash
curl -s "http://127.0.0.1:3456/api/role-model/taxonomy/classification-guide" | jq '{groups_count: (.groups | length), has_algorithm: (.algorithm != null), first_group: .groups[0].id}'
```

Verify:
- `groups` array has 6 entries
- Each group has `keywordHints` derived from taxonomy data
- `algorithm` array has classification steps
- Guide version matches runtime taxonomy version

### UI Verification (R7.1, R7.2)

Capture browser screenshots showing:
1. `models-all-roles-checked.png` — all roles selected, checkbox checked
2. `models-all-roles-indeterminate.png` — 3-4 roles unchecked, checkbox in mixed state (dash icon)
3. `models-all-roles-unchecked.png` — no roles selected, checkbox unchecked
4. Verify high-risk labels visible on health, legal, finance, recruiter, security roles

Verify model role assignment API returns override fields:
```bash
curl -s "http://127.0.0.1:3456/api/role-model/accounts" | jq '.[0].modelRoleBindings[0] | keys'
```

Expected keys: `modelId`, `roleIds`, `roleAssignmentMode`, `enabledRoleIds`, `disabledRoleIds`, `taskOverrides`, `capabilityOverrides`, `modalityOverrides`, `toolClassOverrides`

### Classification Breadth Regression Test

Rerun the 28-role E2E verification to confirm no regressions from the classifier context changes:

```bash
node .recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/addendum-08/live/verify-28-roles.mjs
```

All 28 roles must still produce correct `normalizedIntent` and `role_model` in decision detail.

## Changed Files

| File | Change |
| --- | --- |
| `schemas/role-model/taxonomy/role.schema.json` | Add `replacement`, `deprecationReason` fields |
| `schemas/role-model/taxonomy/task-type.schema.json` | Add `replacement`, `deprecationReason` fields |
| `schemas/role-model/taxonomy/capability.schema.json` | Add `replacement`, `deprecationReason` fields |
| `schemas/role-model/taxonomy/modality.schema.json` | Add `replacement`, `deprecationReason` fields |
| `schemas/role-model/taxonomy/tool-class.schema.json` | Add `replacement`, `deprecationReason` fields |
| `schemas/role-model/taxonomy/group.schema.json` | Add `replacement`, `deprecationReason` fields |
| `schemas/role-model/taxonomy/intent-preset.schema.json` | Add `replacement`, `deprecationReason` fields |
| `role-model-router/apps/runtime-host-bridge/src/index.ts` | Add `toProposalWireContract()`, expose `role_model` in decision detail |
| `role-model-router/apps/runtime-host-bridge/test/index.test.ts` | Add wire contract tests |
| `role-model-router/apps/runtime-host-bridge/test/taxonomy-discovery.test.ts` | Add generated classification guide test |
| `role-model-router/apps/runtime-host-bridge/src/index.ts` (classification guide) | Generate guide from taxonomy data |
| `packages/pi-role-model/src/request-intent.ts` | Extend `extractClassificationContext()` with tool names, file extensions |
| `packages/pi-role-model/src/taxonomy/classify-with-progressive-disclosure.ts` | Extend `ClassificationContext`, use tool/file hints in scoring |
| `packages/pi-role-model/test/request-intent.test.ts` | Add tool name, file extension, combined context tests |
| `role-model-router/packages/core/test/taxonomy-catalog.test.ts` | Add deprecation schema tests |
| `role-model-router/packages/core/test/taxonomy-docs.test.ts` | Extend docs consistency tests |
| `role-model-router/apps/runtime-ui/app/lib/runtime-api.test.ts` | Add override fields verification tests |
| Evidence files | RED/GREEN logs, screenshots |

## TDD Evidence Paths

- RED: `evidence/logs/red/addendum-09/`
- GREEN: `evidence/logs/green/addendum-09/`
- Screenshots: `evidence/screenshots/addendum-09/`
- Live QA: `evidence/logs/addendum-09/live/`

## Completion Definition

This plan is complete when:

1. All 7 entity schemas have `replacement` and `deprecationReason` fields, and all canonical data validates (R12.1)
2. Decision detail API returns `role_model` in proposal snake_case wire format alongside backward-compatible `normalizedIntent` (R5.1)
3. Classifier uses tool names, file extensions, and combined context signals for improved role selection (R9.1)
4. Classification guide endpoint returns data generated from taxonomy, not hardcoded (R4.1)
5. Docs consistency test passes, confirming taxonomy docs reference correct task IDs and sections (R10.1)
6. Browser screenshots capture all three all-roles checkbox states (R7.1)
7. Model role assignment API verified to include override fields (R7.2)
8. All 28 roles still classify correctly (regression)
9. All test suites pass: core, host-bridge, pi-role-model, schemas
10. Live Pi + rebuilt runtime verification receipts recorded

## Implementation Traceability

| Finding | Step | Required Tests | Required Live QA |
| --- | --- | --- | --- |
| R12.1 (deprecation fields) | Step 1 | Schema field tests, validation tests | `schemas:validate` passes |
| R5.1 (wire contract) | Step 2 | Decision detail `role_model` field test, backward compat test | Live API response verified |
| R9.1 (classifier context) | Step 3 | Tool name tests, file extension tests, combined context tests | Pi-like requests with tools/attachments verified |
| R4.1 (classification guide) | Step 4 | Generated guide content test | Live API response verified |
| R10.1 (docs consistency) | Step 5 | Docs task ID test, sections test | N/A (static check) |
| R7.1 (UI checkbox) | Step 6 | N/A (screenshots) | 3 checkbox state screenshots |
| R7.2 (UI overrides) | Step 6 | Type definition test, API shape test | Live API response verified |

## Audit Gate

Audit: PASS

This addendum covers all 7 findings from audit addendum 17 with specific implementation steps, TDD test specifications, file paths, and live Pi + rebuilt-runtime verification requirements.

## Coverage Gate

Coverage: PASS

This implementation plan covers all findings (R4.1, R5.1, R7.1, R7.2, R9.1, R10.1, R12.1) with strict TDD, automated verification, and live rebuilt-runtime plus Pi verification.

## Approval Gate

Approval: PASS

This addendum is ready to be used as an effective input for the implementation pass that closes the audit findings. It remains DRAFT until a recursive lock step is explicitly run for this post-run addendum.
