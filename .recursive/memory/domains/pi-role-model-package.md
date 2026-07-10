# Pi Role-Model Package

Type: `domain`
Status: `CURRENT`
Scope: `Repo-owned Pi integration package for Role-Model runtime discovery, request-intent injection, compact taxonomy usage, and runtime inspection commands.`
Owns-Paths: `packages/pi-role-model/**`
Watch-Paths: `role-model-router/apps/runtime-host-bridge/src/index.ts` (taxonomy APIs consumed by Pi)
Source-Runs:
- `57-role-model-taxonomy-v1-phase-1-4`
- `59-observe-taxonomy-analytics-completion`
- `62-litellm-pi-craft-codex-execution-hardening`
Validated-At-Commit: `working-tree`
Last-Validated: `2026-07-10`
Tags: `pi`, `runtime-integration`, `taxonomy`, `request-intent`, `inspection`
Created: `2026-06-24`
Last Validated: `2026-06-28`
Validated By: `run-59`

## Package Identity

- npm: `@try-works/pi-role-model@0.1.1`
- Installed via: `pi install @try-works/pi-role-model` or worktree path
- Does NOT: start runtime, open browser, copy credentials, read Pi auth files, make hidden model calls
- Runtime-owned inspection commands: `/role-model requests`, `/role-model explain latest`

## Request Metadata Injection Flow

```
Pi chat request
  → extension.ts: before_provider_request hook
    → resolveEffectiveTaxonomy() — fetch runtime manifest, compare versions
    → injectRoleModelIntentIntoPayload() or injectRoleModelIntentIntoPayloadWithRuntimeTasks()
      → extractClassificationContext() — prompt, tools, images, files, extensions
      → classifyWithProgressiveDisclosure() — group-first classification
      → attach role_model.intent to request body
  → Runtime receives request with metadata
```

## Classifier Architecture

Two-tier progressive classifier in `classify-with-progressive-disclosure.ts`:

**Tier 1: Group selection** — `selectCandidateGroupIds(prompt, groups, context)`
- Regex patterns per group (engineering, product_design, etc.)
- Keyword sets per group (~15-20 keywords each from proposal role descriptions)
- Context signals: tools bias engineering, images bias product_design, files bias engineering + knowledge_research
- Returns top 3 candidate groups

**Tier 2: Role scoring** — `classifyByGroupAndRoleScoring(prompt, taxonomy, candidateGroupIds, context)`
- Scores all roles whose primaryGroupId or secondaryGroupIds match candidate groups
- Uses `role.classification.positiveSignals` (+2 each), `negativeSignals` (-3 each), `summary` words (+1 each), `description` words (+1 each)
- Role ID in prompt: +4, role label in prompt: +3
- Context bonuses: tool names matching role hints (+1), file extensions matching role hints (+1)
- Selects highest-scoring role, loads its task chunk, runs `selectTask()`

**Context signal tables:**
- 15 tool name → role hints (e.g., `execute_command` → coder/operator/tester)
- 18 file extension → role hints (e.g., `.sql` → data/architect)

## Key Files

| File | Purpose |
|------|---------|
| `classify-with-progressive-disclosure.ts` | Main classifier with two-tier pipeline |
| `compact-data.ts` | Types for CompactTaxonomy, CompactRoleSummary, CompactRoleTask |
| `load-compact-taxonomy.ts` | Lazy-loading compact taxonomy from package data |
| `staged-compact-taxonomy.ts` | Progressive disclosure reader (groups first, then roles, then tasks) |
| `resolve-effective-taxonomy.ts` | Runtime vs package taxonomy comparison and precedence |
| `request-intent.ts` | Context extraction and intent injection into payload |
| `extension.ts` | Pi extension hook wiring |
| `runtime-inspection.ts` | Runtime-owned request list/detail and latest explanation reads |
| `skills/role-model/SKILL.md` | Pi skill documentation |

## Compact Taxonomy Data

- 28 role task chunks, each under 20KB (guardrail raised from 16KB for classification data)
- 6 group files with role IDs
- Manifest with content hashes for all chunks
- Runtime effective taxonomy takes precedence over package snapshot when reachable and compatible

## Safety Boundaries (from Run 56, preserved)

- No runtime process ownership (start/stop/install/update)
- No credential reads or copies
- No hidden model calls for classification
- Fail-closed for auth-required endpoints
- Remote endpoint trust required

## Durable Behavior Added After Run 57

- `extension.ts` must refresh effective taxonomy on startup, `/role-model setup`, and `/role-model alias refresh`; otherwise runtime and package taxonomy can drift after runtime-side updates.
- `runtime-inspection.ts` must honor `options.endpoint ?? process.env.ROLE_MODEL_ENDPOINT ?? DEFAULT_ROLE_MODEL_ENDPOINT` so operator diagnostics can target rebuilt runtimes without mutating package state.
- Pi inspection remains read-only: request lists, request detail, and latest explanation come from Role-Model runtime APIs and Pi must not synthesize routing reasons on its own.
- Rebuilt-runtime alias proof for Pi must use the actual extension-prepared payload path against canonical runtime aliases such as `difficulty.remote-only`; provider truth should still come from `providerId`, while additive `vendorId`, `executionFamily`, and `adapterFamily` may be consumed as separate execution facts rather than collapsed into provider identity.
- Multi-turn Pi verification must reuse a real Pi session when testing Codex Subscription history conversion. Single-turn or `--no-session` probes can miss assistant-history replay bugs, such as invalid Responses `input_text` content parts for previous assistant output.
- If noninteractive Pi CLI verification hangs while Role-Model telemetry shows successful requests, treat the runtime request rows as useful reachability evidence but do not claim a clean Pi CLI pass. Clean Pi verification requires both a real Pi request and a terminating Pi command transcript.
