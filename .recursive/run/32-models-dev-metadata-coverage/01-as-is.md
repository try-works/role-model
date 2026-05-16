Run: `/.recursive/run/32-models-dev-metadata-coverage/`
Phase: `01 AS-IS`
Status: `LOCKED`
LockedAt: `2026-05-15T22:18:37Z`
LockHash: `f94cc66a50c42cc0f1aea708824445bcdda22eaaaedc8c14186eae9e31024f57`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/32-models-dev-metadata-coverage/00-requirements.md`
- `/.recursive/run/32-models-dev-metadata-coverage/00-worktree.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/run/05-router-runtime-catalog-foundation/00-requirements.md`
- `/.recursive/run/14-router-runtime-ui-foundation/00-requirements.md`
- `/.recursive/run/17-oauth-litellm-generalization/00-requirements.md`
Outputs:
- `/.recursive/run/32-models-dev-metadata-coverage/01-as-is.md`
Scope note: This artifact records the current metadata pipeline, the shipped-catalog gap, the LiteLLM fallback seams, and the runtime/UI consumers that this run must preserve while moving provider and model metadata ownership to `models.dev`.

## TODO

- [x] Re-read the locked Phase 0 artifacts and authoritative inputs
- [x] Inventory the current catalog refresh/export path and shipped catalog assets
- [x] Map the current behavior and gaps back to `R1`-`R6`
- [x] Record code pointers, evidence, and identifier risks
- [x] Complete the audited-phase sections and gates

## Current Behavior by Requirement

- `R1`: blocked. The repo has `catalog:export`, but it only reads the pinned fixture files under `/testdata/catalog/` and writes generated output to `/runtime-output/router-catalog/`. There is no explicit command that fetches the live `models.dev` API and rewrites the pinned snapshot artifacts that the repo tracks.
- `R2`: blocked. The runtime-host bridge loads `role-model-router/packages/catalog/data/normalized-catalog.json`, and packaging copies that same tracked file into the SEA bundle. In the current baseline, that tracked artifact is effectively empty (`providers: []`, `models: []`), so the shipped runtime does not actually receive the intended `models.dev` metadata layer.
- `R3`: partially satisfied. The normalized catalog types already carry provider and model metadata such as `apiBase`, `envVars`, `pricing`, `capabilities`, `modalities`, and context limits. However, the provider snapshot type does not yet carry provider docs metadata, the tracked generated artifact is empty, and many provider defaults still come from `packages/catalog/src/litellm-catalog.ts` instead of the normalized catalog.
- `R4`: partially satisfied. LiteLLM provider coverage already exists through `deriveLiteLLMProviders()`, `extractLiteLLMModelIds()`, `applyUnifiedLiteLLMAdapterFamilyOverrides()`, and `synthesizeFixtureModelsForCatalog()`. But that fallback is not yet a deliberate `models.dev`-plus-LiteLLM merge layer, and the current catalog snapshot uses mixed model-id conventions (`gpt-4.1-mini`, `claude-3.7-sonnet`, `openai/gpt-4.1-mini-fast`, `moonshot/kimi-k2.5`) that would make naive live refresh risky.
- `R5`: partially satisfied. Runtime and UI surfaces already expose provider metadata such as `apiBase`, `envVars`, `supportedAuthModes`, and `controlPlaneRequirements`, and endpoint-registry plus provider-account validation already depend on normalized catalog models/providers. But because the shipped catalog is empty, those surfaces still rely heavily on LiteLLM-derived provider defaults and synthesized models rather than truthful `models.dev` catalog data.
- `R6`: not started. Phase 3 has not begun, no RED evidence exists yet for the required changes, and no end-to-end metadata-integration proof has been recorded.

## Relevant Code Pointers

- `/.recursive/run/32-models-dev-metadata-coverage/00-requirements.md`
- `/.recursive/run/32-models-dev-metadata-coverage/00-worktree.md`
- `/role-model-router/packages/catalog/src/index.ts`
- `/role-model-router/packages/catalog/src/cli.ts`
- `/role-model-router/packages/catalog/src/litellm-catalog.ts`
- `/role-model-router/packages/catalog/data/normalized-catalog.json`
- `/testdata/catalog/models-dev-snapshot.json`
- `/testdata/catalog/models-dev-local-overrides.json`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/src/package-sea.ts`
- `/role-model-router/packages/provider-account/src/index.ts`
- `/role-model-router/packages/endpoint-registry/src/index.ts`
- `/role-model-router/apps/runtime-ui/app/routes/providers.tsx`
- `/role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`

## Evidence

- `/role-model-router/packages/catalog/src/cli.ts` proves the current export path only transforms checked-in snapshot and override files into `runtime-output/router-catalog/*`; it does not refresh those inputs from live `models.dev`.
- `/role-model-router/packages/catalog/data/normalized-catalog.json` is currently a placeholder with empty `providers` and `models`, so the shipped catalog asset is not usable as the app’s authoritative metadata source.
- `/role-model-router/apps/runtime-host-bridge/src/index.ts:3037-3116` shows the runtime loading the tracked `packages/catalog/data/normalized-catalog.json` as `baseCatalog`, then layering LiteLLM providers and synthesized models on top of it.
- `/role-model-router/apps/runtime-host-bridge/src/package-sea.ts` copies `role-model-router/packages/catalog/data/normalized-catalog.json` into the packaged release, which means the empty tracked file directly affects the Windows executable.
- `/role-model-router/packages/catalog/src/litellm-catalog.ts` carries a large handwritten `KNOWN_PROVIDER_OVERRIDES` table with provider display names, env vars, API base URLs, auth hints, and special Moonshot OAuth metadata; this is the metadata ownership surface the run intends to shrink.
- `/role-model-router/packages/provider-account/src/index.ts` validates provider accounts against `input.catalog.providers`, so the normalized catalog is already part of the control-plane contract for provider metadata.
- `/role-model-router/packages/endpoint-registry/src/index.ts` uses `NormalizedCatalogModel` fields (`capabilities`, `modalities`, `contextWindow`, `requestShapeHints`) to construct declared endpoint metadata, so model metadata quality directly affects runtime endpoint inventory.
- `/role-model-router/apps/runtime-ui/app/routes/providers.tsx` uses `selectedProvider.apiBase`, `selectedProvider.envVars`, and variant metadata in the onboarding UI, which means provider metadata wiring is already user-visible.
- `/testdata/catalog/models-dev-snapshot.json` is currently a tiny hand-curated sample rather than full upstream coverage, and it mixes bare model ids with provider-prefixed model ids. That inconsistency is a concrete migration risk for a live refresh command.

## Known Unknowns

- The exact live refresh provenance shape is still open: the run must decide whether the refresh command records only `models.dev/api.json` capture time or also records GitHub branch/commit provenance from the upstream repository.
- The exact normalized provider schema extension for docs or npm metadata is still open; current snapshot/provider types do not carry a provider `doc` field.
- The precise merge rule for provider/model id mismatches between `models.dev` and LiteLLM is not implemented yet and must be made explicit in Phase 2.
- The current UI surfaces that should expose model pricing or richer capability/spec metadata beyond the existing provider onboarding page still need a targeted audit in implementation.

## Reproduction Steps (Novice-Runnable)

1. From the selected worktree root, run `corepack pnpm run catalog:export`.
2. Open `role-model-router\packages\catalog\data\normalized-catalog.json` and confirm the tracked shipped catalog still has empty `providers` and `models` arrays.
3. Open `runtime-output\router-catalog\normalized-catalog.json` and confirm the export command writes generated data to `runtime-output` instead of rewriting the tracked shipped artifact.
4. Search `role-model-router\apps\runtime-host-bridge\src\index.ts` for `normalized-catalog.json` and confirm runtime-host loads the tracked package-data file as its base catalog.
5. Open `role-model-router\apps\runtime-host-bridge\src\package-sea.ts` and confirm SEA packaging copies the same tracked package-data catalog file into packaged output.
6. Open `testdata\catalog\models-dev-snapshot.json` and confirm the pinned snapshot is a small curated sample with mixed bare and provider-prefixed model identifiers.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/05-router-runtime-catalog-foundation/00-requirements.md`
- `/.recursive/run/14-router-runtime-ui-foundation/00-requirements.md`
- `/.recursive/run/17-oauth-litellm-generalization/00-requirements.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`

## Audit Context

Audit Execution Mode: `self-audit`
Subagent Availability: `available`
Subagent Capability Probe: `task`, `code-review`, and recursive-mode skills remain available in this session.
Delegation Decision Basis: `Phase 1 required tight reconciliation between the just-locked run-32 requirements, the current worktree-only artifact state, and direct code inspection across catalog, runtime-host, provider-account, endpoint-registry, packaging, and UI surfaces.`
Delegation Override Reason: `The controller needed to repair the earlier root-checkout/worktree artifact mismatch and produce one integrated AS-IS narrative grounded in the exact live worktree state before planning or TDD began.`
Audit Inputs Provided:
- `/.recursive/run/32-models-dev-metadata-coverage/00-requirements.md`
- `/.recursive/run/32-models-dev-metadata-coverage/00-worktree.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- Changed files:
  - `/.recursive/run/32-models-dev-metadata-coverage/00-requirements.md`
  - `/.recursive/run/32-models-dev-metadata-coverage/00-worktree.md`
  - `/.recursive/run/32-models-dev-metadata-coverage/01-as-is.md`
- Targeted code references:
  - `/role-model-router/packages/catalog/src/index.ts`
  - `/role-model-router/packages/catalog/src/cli.ts`
  - `/role-model-router/packages/catalog/src/litellm-catalog.ts`
  - `/role-model-router/packages/catalog/data/normalized-catalog.json`
  - `/testdata/catalog/models-dev-snapshot.json`
  - `/role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/package-sea.ts`
  - `/role-model-router/packages/provider-account/src/index.ts`
  - `/role-model-router/packages/endpoint-registry/src/index.ts`
  - `/role-model-router/apps/runtime-ui/app/routes/providers.tsx`

## Effective Inputs Re-read

- `/.recursive/run/32-models-dev-metadata-coverage/00-requirements.md`
- `/.recursive/run/32-models-dev-metadata-coverage/00-worktree.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/run/05-router-runtime-catalog-foundation/00-requirements.md`
- `/.recursive/run/14-router-runtime-ui-foundation/00-requirements.md`
- `/.recursive/run/17-oauth-litellm-generalization/00-requirements.md`

## Earlier Phase Reconciliation

- `/.recursive/run/32-models-dev-metadata-coverage/00-requirements.md`:
  - claim carried forward: `models.dev` becomes the primary provider/model metadata source while LiteLLM remains execution coverage and role-model keeps only auth/control-plane overrides.
  - current reconciliation: the repo has the beginnings of that split, but the shipped catalog is empty and the runtime still depends on LiteLLM provider overrides as the practical metadata source.
- `/.recursive/run/32-models-dev-metadata-coverage/00-worktree.md`:
  - claim carried forward: all later phases must execute from `D:\DEV\role-model\.worktrees\32-models-dev-metadata-coverage` using diff basis `da3411c10faa6ee93fa9f5861a1b10359095b058`.
  - current reconciliation: Phase 1 inspection and evidence collection were performed from that selected worktree and reused the locked diff basis unchanged.

## Subagent Contribution Verification

- Reviewed Action Records: `none`
- Main-Agent Verification Performed:
  - `/.recursive/run/32-models-dev-metadata-coverage/00-requirements.md`
  - `/.recursive/run/32-models-dev-metadata-coverage/00-worktree.md`
  - `/.recursive/run/32-models-dev-metadata-coverage/01-as-is.md`
  - `/role-model-router/packages/catalog/src/index.ts`
  - `/role-model-router/packages/catalog/src/cli.ts`
  - `/role-model-router/packages/catalog/src/litellm-catalog.ts`
  - `/role-model-router/packages/catalog/data/normalized-catalog.json`
  - `/testdata/catalog/models-dev-snapshot.json`
  - `/role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/package-sea.ts`
  - `/role-model-router/packages/provider-account/src/index.ts`
  - `/role-model-router/packages/endpoint-registry/src/index.ts`
  - `/role-model-router/apps/runtime-ui/app/routes/providers.tsx`
- Acceptance Decision: `not applicable`
- Refresh Handling: `not applicable`
- Repair Performed After Verification:
  - `/.recursive/run/32-models-dev-metadata-coverage/01-as-is.md`

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `da3411c10faa6ee93fa9f5861a1b10359095b058`
- Comparison reference: `working-tree`
- Normalized baseline: `da3411c10faa6ee93fa9f5861a1b10359095b058`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only da3411c10faa6ee93fa9f5861a1b10359095b058`
- Diff basis used: `git diff --name-only da3411c10faa6ee93fa9f5861a1b10359095b058`
- Supplemental scope command: `git status --short --untracked-files=all`
- Base branch: `main`
- Worktree branch: `recursive/32-models-dev-metadata-coverage`
- Actual changed files reviewed:
  - `.recursive/run/32-models-dev-metadata-coverage/00-requirements.md`
  - `.recursive/run/32-models-dev-metadata-coverage/00-worktree.md`
  - `.recursive/run/32-models-dev-metadata-coverage/01-as-is.md`
- Unexplained drift:
  - none; current tracked drift is limited to run-32 recursive artifacts before product implementation begins

## Gaps Found

- none; this artifact fully captures the current AS-IS state for `R1`-`R6`, and the product-level gaps are already documented in `## Current Behavior by Requirement` plus `## Known Unknowns`

## Repair Work Performed

- Reconciled the current metadata ownership split against the actual code: empty shipped catalog, live export to `runtime-output`, runtime loading of tracked data, and LiteLLM fallback/provider defaults.
- Captured the worktree-local artifact correction as part of the actual Phase 1 state rather than silently assuming the earlier root-checkout artifacts applied to the isolated branch.

## Requirement Completion Status

- R1 | Status: out-of-scope | Rationale: planning-only AS-IS phase; implementation and verification land later in the run. | Scope Decision: `.recursive/run/32-models-dev-metadata-coverage/00-requirements.md` | Audit Note: Phase 1 baselined the missing live-refresh path only.
- R2 | Status: out-of-scope | Rationale: planning-only AS-IS phase; implementation and verification land later in the run. | Scope Decision: `.recursive/run/32-models-dev-metadata-coverage/00-requirements.md` | Audit Note: Phase 1 documented the empty shipped catalog artifact only.
- R3 | Status: out-of-scope | Rationale: planning-only AS-IS phase; implementation and verification land later in the run. | Scope Decision: `.recursive/run/32-models-dev-metadata-coverage/00-requirements.md` | Audit Note: Phase 1 recorded the current metadata-ownership mismatch only.
- R4 | Status: out-of-scope | Rationale: planning-only AS-IS phase; implementation and verification land later in the run. | Scope Decision: `.recursive/run/32-models-dev-metadata-coverage/00-requirements.md` | Audit Note: Phase 1 documented LiteLLM fallback and identifier-risk behavior only.
- R5 | Status: out-of-scope | Rationale: planning-only AS-IS phase; implementation and verification land later in the run. | Scope Decision: `.recursive/run/32-models-dev-metadata-coverage/00-requirements.md` | Audit Note: Phase 1 documented current runtime/UI consumer behavior only.
- R6 | Status: out-of-scope | Rationale: planning-only AS-IS phase; implementation and verification land later in the run. | Scope Decision: `.recursive/run/32-models-dev-metadata-coverage/00-requirements.md` | Audit Note: Phase 1 recorded that TDD and end-to-end evidence had not started yet.

## Audit Verdict

- Audit summary: the repo already contains the right broad architecture split, but the shipped catalog is empty, the refresh path is fixture-only, and LiteLLM still owns too much provider metadata for the run goals to be satisfied.
- Follow-up required before lock: none
Audit: PASS

## Traceability

- `R1` -> current missing live-refresh path is captured in `## Current Behavior by Requirement`, `## Evidence`, and `## Requirement Completion Status`.
- `R2` -> current shipped-artifact failure is captured in `## Current Behavior by Requirement`, `## Evidence`, and `## Requirement Completion Status`.
- `R3` -> current metadata-ownership mismatch is captured in `## Current Behavior by Requirement`, `## Evidence`, `## Gaps Found`, and `## Requirement Completion Status`.
- `R4` -> current LiteLLM fallback and mixed-id risk is captured in `## Current Behavior by Requirement`, `## Evidence`, `## Known Unknowns`, and `## Requirement Completion Status`.
- `R5` -> current runtime/UI consumer state is captured in `## Current Behavior by Requirement`, `## Evidence`, and `## Requirement Completion Status`.
- `R6` -> current lack of TDD/e2e evidence is captured in `## Current Behavior by Requirement` and `## Requirement Completion Status`.

## Coverage Gate

- Effective inputs reviewed:
  - `/.recursive/run/32-models-dev-metadata-coverage/00-requirements.md`
  - `/.recursive/run/32-models-dev-metadata-coverage/00-worktree.md`
  - `/.recursive/STATE.md`
  - `/.recursive/DECISIONS.md`
  - `/.recursive/run/05-router-runtime-catalog-foundation/00-requirements.md`
  - `/.recursive/run/14-router-runtime-ui-foundation/00-requirements.md`
  - `/.recursive/run/17-oauth-litellm-generalization/00-requirements.md`
- Requirement coverage check:
  - `R1`-`R6`: covered in `## Current Behavior by Requirement`, `## Evidence`, `## Gaps Found`, `## Known Unknowns`, and `## Requirement Completion Status`
- Out-of-scope confirmation:
  - `OOS1`-`OOS4`: preserved; no attempt has been made yet to replace LiteLLM execution, widen into unrelated UI redesign, or add new auth flows

Coverage: PASS

## Approval Gate

- [x] The current metadata pipeline and shipped-artifact gap are specific enough to drive Phase 2 planning
- [x] The LiteLLM fallback and identifier-alignment risk are explicit enough to constrain implementation
- [x] No unresolved Phase 1 ambiguity remains about why the current app is not yet using `models.dev` as its real metadata source

Approval: PASS
