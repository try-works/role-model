# Pi Role-Model Package

Status: `CURRENT`
Owns-Paths: `packages/pi-role-model/**`
Watch-Paths: `role-model-router/apps/runtime-host-bridge/src/index.ts` (taxonomy APIs consumed by Pi)
Created: `2026-06-24`
Last Validated: `2026-06-24`
Validated By: `260624-clever-seal`

## Package Identity

- npm: `@try-works/pi-role-model@0.1.1`
- Installed via: `pi install @try-works/pi-role-model` or worktree path
- Does NOT: start runtime, open browser, copy credentials, read Pi auth files, make hidden model calls

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
