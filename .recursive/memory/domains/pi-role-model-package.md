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
- `65-codex-subscription-prompt-cache-parity`
- `68-codex-subscription-tool-call-parity`
Validated-At-Commit: `working-tree`
Last-Validated: `2026-07-12`
Tags: `pi`, `runtime-integration`, `taxonomy`, `request-intent`, `inspection`
Created: `2026-06-24`
Last Validated: `2026-07-12`
Validated By: `run-68`

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
- `extension.ts` must honor `options.endpoint ?? process.env.ROLE_MODEL_ENDPOINT ?? DEFAULT_ROLE_MODEL_ENDPOINT` for runtime request commands, so rebuilt-runtime verification can target an isolated Role-Model host without mutating package state.
- `runtime-inspection.ts` must honor `options.endpoint ?? process.env.ROLE_MODEL_ENDPOINT ?? DEFAULT_ROLE_MODEL_ENDPOINT` so operator diagnostics can target rebuilt runtimes without mutating package state.
- Pi inspection remains read-only: request lists, request detail, and latest explanation come from Role-Model runtime APIs and Pi must not synthesize routing reasons on its own.
- downstream discovery mapping must preserve `piMapping.compat.promptCache` and `piMapping.compat.sessionAffinity` so Pi keeps runtime-derived cache and continuity behavior when selecting an alias-backed provider config.
- Rebuilt-runtime alias proof for Pi must use the actual extension-prepared payload path against canonical runtime aliases such as `difficulty.remote-only`; provider truth should still come from `providerId`, while additive `vendorId`, `executionFamily`, and `adapterFamily` may be consumed as separate execution facts rather than collapsed into provider identity.
- Live prompt-cache QA for Pi should compare the CLI footer cache percentage against canonical request-detail or telemetry receipts; CLI output alone is not sufficient proof.
- Pi `--mode json` is the stable tool-call parity receipt because it captures `toolcall_start`, `tool_execution_start`, `tool_execution_end`, `toolResults`, `responseId`, and `responseModel`. Use it together with runtime request-detail rows to prove both tool execution and the selected provider path.
- Exact-model tool-call proof can use `--no-session` when the target bug is single-turn tool execution. History-conversion defects still require a real Pi session.
- Multi-turn Pi verification must reuse a real Pi session when testing Codex Subscription history conversion. Single-turn or `--no-session` probes can miss assistant-history replay bugs, such as invalid Responses `input_text` content parts for previous assistant output.
- When an alias proof includes an image-bearing pivot turn, reuse the logical Pi `session-id` but refresh local Pi session storage before the return-to-`A` leg if the image turn carries image modality into later alias requests.
- If noninteractive Pi CLI verification hangs while Role-Model telemetry shows successful requests, treat the runtime request rows as useful reachability evidence but do not claim a clean Pi CLI pass. Clean Pi verification requires both a real Pi request and a terminating Pi command transcript.

## Sibling Codex adapter (run 89)

- Behavioral parity source for discovery/intent/inspection patterns reused by `@try-works/codex-role-model` (`packages/codex-role-model`).
- Run `89-codex-role-model-package` must not edit this Pi package; Codex tool-bridge and Responses adapter stay Codex-adapter-only.
