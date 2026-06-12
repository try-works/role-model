Run: `/.recursive/run/42-provider-kind-craft-ask-routing/`
Phase: `01 AS-IS Analysis`
Status: `LOCKED`
LockedAt: `2026-06-12T09:19:07Z`
LockHash: `7cf4548e0ec692e859eafbd2a8a4a7998879ee62b04546104a6eaacdc720ba41`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/42-provider-kind-craft-ask-routing/00-requirements.md`
- `/.recursive/run/42-provider-kind-craft-ask-routing/00-worktree.md`
Outputs:
- `/.recursive/run/42-provider-kind-craft-ask-routing/01-as-is.md`
Scope note: Document current provider metadata and Craft difficulty routing behavior on baseline `f4e14af` before any run 42 changes.

## TODO

- [x] Read provider list/validation code paths
- [x] Document overlap split-brain for all 19 broken ids
- [x] Read Craft difficulty rubric and run 39 ask-mode behavior
- [x] Document existing tests and gaps
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Effective Inputs Re-read

- `00-requirements.md` (locked): R0–R3, overlap audit table, fixed decisions for merge precedence and declared-tools ask-mode.
- `00-worktree.md` (locked): worktree @ `f4e14af`, baseline craft tests green.

## Source Requirement Inventory

| R# | Disposition | Summary |
| --- | --- | --- |
| R0 | in-scope | Branch from post-run-40/41 `main`; protect prior runs |
| R1 | in-scope | 19 overlap providers fail connect due to metadata split-brain |
| R2 | in-scope | Craft declared tools bypass ask-mode; simple chat routes hard/quality |
| R3 | out-of-phase | Packaged `:3456` proof — Phase 5 only |

## Current Behavior by Requirement

### R0 — Baseline and isolation

- Worktree @ `f4e14af` on `recursive/42-provider-kind-craft-ask-routing`; no product diff before Phase 3.
- Run 40 catalog economics and run 39 session rehydration behavior present on baseline.

### R1 — Provider metadata split-brain

### Operator surface: `listProviders`

File: `role-model-router/apps/runtime-host-bridge/src/index.ts` (catalog branch ~9171–9206)

- Catalog overlap providers emit **catalog** `providerKind`, `adapterFamily`, `apiBase` directly from `currentNormalizedCatalog.providers`.
- Example: `deepseek` advertises `provider-deepseek` even when a LiteLLM row exists for the same `providerId`.

### Validation surface: `validateProviderAccounts`

File: `role-model-router/packages/provider-account/src/index.ts` (~265, ~290)

- Builds provider map from catalog, then **overwrites** on `additionalProviders` (runtime LiteLLM inventory) collision.
- Account upsert with `providerKind` from `listProviders` yields `PROVIDER_KIND_MISMATCH` when kinds differ.

### Observed overlap set (baseline audit)

- **19 broken** (catalog kind ≠ validation kind): `baseten`, `cerebras`, `cohere`, `databricks`, `deepinfra`, `deepseek`, `groq`, `minimax`, `mistral`, `morph`, `nebius`, `openrouter`, `ovhcloud`, `perplexity`, `sarvam`, `v0`, `wandb`, `xai`, `zai`
- **4 aligned** (must not regress): `openai`, `anthropic`, `moonshot`, `azure`

### OAuth start path

File: `role-model-router/apps/runtime-host-bridge/src/index.ts` (`startProviderDeviceAuthorization`)

- Resolves provider from catalog or LiteLLM list but uses raw catalog `providerKind` when constructing provisional account payload — same split-brain risk on overlap ids.

### Test gap

- No CI test ties `listProviders` metadata to `validateProviderAccounts` lookup for overlap ids.

### R2 — Craft declared-tools rubric inflation

### Ask-mode gate (run 39)

File: `role-model-router/apps/runtime-host-bridge/src/index.ts` (`summarizeDifficultySignals`, ~420–445)

```typescript
const askModeBurdenSource =
  input.toolCount === 0 ? combineLastUserDifficultyMessageText(input.messages) : combined;
// ...
return {
  toolCount: input.toolCount,
  historyTurnCount: input.messages.length,
  // ...
};
```

- Ask-mode (last-user-turn burden) applies **only** when `toolCount === 0`.
- Craft sends declared `tools` on every request → full transcript used for burden → inflated `toolCount` in rubric scoring (`>= 2` tools adds +3 score) → `hard` / `quality` strategy.

### Existing tests (baseline)

File: `role-model-router/apps/runtime-host-bridge/test/craft-ask-difficulty.test.ts`

- Covers run 39 cases with **no** declared tools (2 tests, green on baseline).
- **Missing:** declared-tools simple chat case; active-tool guard case.

### Expected failure mode (not yet tested)

- Payload: Craft preamble + `hello` + `tools.length >= 2`, no `tool` role / no `tool_calls` → classifies `hard` or non-`cost` on baseline.

### R3 — Packaged runtime proof (deferred)

- Not exercised in AS-IS; acceptance is Phase 5 `:3456` probe per requirements.

## Evidence

- Read `runtime-host-bridge/src/index.ts` `listProviders`, `summarizeDifficultySignals`, `startProviderDeviceAuthorization` on 2026-06-12
- Read `packages/provider-account/src/index.ts` `validateProviderAccounts` on 2026-06-12
- Baseline vitest: `craft-ask-difficulty.test.ts` — 2 tests pass @ `f4e14af`
- Requirements overlap audit table (19 broken / 4 aligned ids)

## Reproduction Steps (Novice-Runnable)

### R1 — Provider connect failure (example: deepseek)

1. Start runtime host bridge with normalized catalog + LiteLLM inventory loaded.
2. `GET /api/role-model/providers` → note `deepseek.providerKind` is `provider-deepseek`.
3. POST account upsert with that kind → HTTP 400 `PROVIDER_KIND_MISMATCH` (validation expects `provider-openai`).

### R2 — Craft simple chat routed hard

1. Send Craft-like chat completion with declared tools (N≥2) and simple last user message (`hello`) to a difficulty-routed alias (e.g. `mixed.local-remote`).
2. Inspect routing diagnostics → `difficulty: hard`, `strategy: quality` (Kimi path) on baseline.

## Relevant Code Pointers

| Area | Path |
| --- | --- |
| Difficulty rubric | `runtime-host-bridge/src/index.ts` — `summarizeDifficultySignals`, `classifyDifficultyFromSignals`, `maybeApplyDifficultyRouting` |
| Provider list merge | `runtime-host-bridge/src/index.ts` — `listProviders` |
| Account validation | `packages/provider-account/src/index.ts` — `validateProviderAccounts` |
| LiteLLM inventory | `packages/catalog/src/litellm-catalog.ts` — `deriveLiteLLMProviders` |
| Catalog export | `packages/catalog/data/normalized-catalog.json` |
| UI upsert payload | `apps/runtime-ui/app/routes/providers.tsx` (sends `providerKind` from list) |

## Prior Recursive Evidence Reviewed

- Run 39 (`39-runtime-session-rehydration-model-inventory`): ask-mode last-user-turn when `toolCount === 0`.
- Run 40 (`40-catalog-economics-moonshot-consolidation`): local peer preferred on `cost` strategy — blocked when Craft misclassified as `hard`.

## Earlier Phase Reconciliation

- `00-worktree.md`: worktree isolated @ `f4e14af`; no product diff yet.
- No conflicts between requirements and observed baseline behavior.

## Known Unknowns

- None blocking planning. Overlap id set is enumerated in requirements audit table.

## Gaps Found

- G1: No shared merge helper; operator surfaces use catalog row on overlap.
- G2: No overlap alignment CI guard.
- G3: Declared-tools Craft bypasses ask-mode.
- G4: No declared-tools difficulty tests.

## Repair Work Performed

- None. Analysis-only phase.

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `f4e14afa40e599b647eb187a76171b5b9b7a92c6`
- Comparison reference: `working-tree`
- Normalized diff command: `git diff --name-only f4e14afa40e599b647eb187a76171b5b9b7a92c6`
- Result: **No product file changes** — expected for AS-IS phase.

## Requirement Completion Status

| R# | Status | Changed Files | Evidence |
| --- | --- | --- | --- |
| R0 | documented | — | worktree @ `f4e14af` |
| R1 | documented | `index.ts`, `provider-account/src/index.ts` | code pointers above |
| R2 | documented | `index.ts`, `craft-ask-difficulty.test.ts` | code pointers above |
| R3 | deferred | — | Phase 5 |

## Subagent Capability Probe

- Subagent tools available; not delegated for AS-IS (bounded code read).

## Delegation Decision Basis

- Self-audit: AS-IS is direct code reading with locked requirements overlap table.

## Audit Context

- Phase: `01 AS-IS Analysis`
- Auditor: self (main agent)
- Audit Inputs Provided: locked requirements, locked worktree intent, baseline source reads
- Audit Execution Mode: self-audit

## Audit Verdict

Audit: PASS

## Traceability

- R0 → worktree @ `f4e14af`, post-run-41 baseline; no product diff before Phase 3
- R1 → `listProviders` catalog branch + `validateProviderAccounts` overwrite documented with 19-id table
- R2 → `summarizeDifficultySignals` `toolCount === 0` gate documented; declared-tools gap documented
- R3 → deferred to Phase 5; no AS-IS product gap beyond planning note above

## Coverage Gate

- [x] Provider metadata split-brain documented with code pointers
- [x] All 19 broken overlap ids referenced
- [x] Craft rubric inflation path documented
- [x] Existing vs missing tests documented

Coverage: PASS

## Approval Gate

- [x] AS-IS complete enough to plan Phase 2
- [x] No unresolved baseline unknowns

Approval: PASS
