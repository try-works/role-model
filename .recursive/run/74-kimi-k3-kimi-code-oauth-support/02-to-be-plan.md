Run: `/.recursive/run/74-kimi-k3-kimi-code-oauth-support/`
Phase: `02 TO-BE plan`
Status: `LOCKED`
LockedAt: `2026-07-16T21:47:34Z`
LockHash: `46295de2c53d5479d1891ba3aa4a2672e4ad220f0edb99c7e4558c61f3035364`
Inputs:
- `/.recursive/run/74-kimi-k3-kimi-code-oauth-support/00-requirements.md`
- `/.recursive/run/74-kimi-k3-kimi-code-oauth-support/01-as-is.md`
- `/.recursive/run/74-kimi-k3-kimi-code-oauth-support/00-worktree.md`
- `/.recursive/run/40-catalog-economics-moonshot-consolidation/00-requirements.md`
- `/.recursive/run/44-kimi-k2.7-code-catalog/00-requirements.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
Outputs:
- `/.recursive/run/74-kimi-k3-kimi-code-oauth-support/02-to-be-plan.md`
Scope note: This document defines the planned changes and validation steps to implement `moonshot/kimi-k3` support through the existing Kimi Code OAuth path.

## TODO

- [x] Re-read locked requirements and AS-IS analysis
- [x] Map each source-inventory item to implementation, verification, and QA surfaces
- [x] Check for plan drift against the requirements
- [x] Record TDD and regression-test strategy
- [x] Record Phase 5 QA approach and live-verification fallback
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Audit Context

- Audit Execution Mode: self-audit
- Subagent Availability: unavailable
- Subagent Capability Probe: no routed subagent configured for this phase
- Delegation Decision Basis: Phase 2 planning is bounded to requirements reconciliation and surface-path planning; performed by the controller.
- Audit Inputs Provided:
  - `/.recursive/run/74-kimi-k3-kimi-code-oauth-support/00-requirements.md`
  - `/.recursive/run/74-kimi-k3-kimi-code-oauth-support/01-as-is.md`
  - `/.recursive/run/74-kimi-k3-kimi-code-oauth-support/00-worktree.md`
  - Prior runs 40 and 44
  - Memory shard `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
  - Diff basis: `ac855c46309f3ccdf7b26b6375ed41ae0d380ffc` vs working-tree

## Effective Inputs Re-read

- `00-requirements.md` locked R1–R8 and OOS1–OOS5.
- `01-as-is.md` locked the current state: K3 absent from catalog supplement, alias tables, comparable-model aliases, and upstream model-id mapping; no K3 tests; live verification deferred to Phase 5.
- `00-worktree.md` locked the isolated worktree and clean baseline.
- Prior runs 40 and 44 established the canonical-pricing alias and supplement-based operator model patterns.
- Memory shard confirms the shared Moonshot/Kimi execution path and Kimi Code OAuth auth profile.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/40-catalog-economics-moonshot-consolidation/00-requirements.md` — canonical pricing alias pattern, `TokenEconomics`, `OPERATOR_HIDDEN_CATALOG_PROVIDER_IDS`, Moonshot variant dedupe.
- `/.recursive/run/44-kimi-k2.7-code-catalog/00-requirements.md` — supplement-based operator model addition, refresh/export discipline, K2.7 canonical alias and execution path.
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md` — current Kimi Code OAuth path, hosted-search tool contract, provider identity semantics, prompt-cache normalization.

## Planned Changes by File

| File | Change |
|---|---|
| `testdata/catalog/models-dev-local-supplement.json` | Add operator `moonshot/kimi-k3` row with documented K3 limits, capabilities, and modalities. |
| `testdata/catalog/models-dev-local-overrides.json` | Add local note for `moonshot/kimi-k3` if needed. |
| `role-model-router/packages/catalog/src/token-economics.ts` | Add `moonshot/kimi-k3` → `moonshotai/kimi-k3` to `CANONICAL_MODEL_ID_ALIASES`. |
| `role-model-router/apps/runtime-host-bridge/src/remote-health-probe.ts` | Add `moonshot/kimi-k3` / `kimi-k3` / `k3` to `COMPARABLE_MODEL_ID_ALIASES`. |
| `role-model-router/packages/provider-openai/src/index.ts` | Add centralized provider-local model-id mapping so `moonshot/kimi-k3` → `k3` upstream; add K3 request-shape handling if needed. |
| `role-model-router/packages/catalog/test/index.test.ts` | Add normalization test for K3 operator row. |
| `role-model-router/packages/catalog/test/token-economics.test.ts` | Add K3 alias and economics tests. |
| `role-model-router/packages/provider-openai/test/index.test.ts` | Add K3 upstream mapping and request-shape tests. |
| `role-model-router/packages/catalog/data/normalized-catalog.json` | Re-export to include K3 rows. |
| `role-model-router/packages/catalog/data/vendor-version-ledger.json` | Re-export to refresh provenance. |
| `testdata/catalog/litellm-model-prices.json` | Add `moonshot/kimi-k3` entry if needed for execution readiness. |

## Implementation Steps

1. Add K3 operator row to `testdata/catalog/models-dev-local-supplement.json`.
2. Add K3 canonical pricing alias to `role-model-router/packages/catalog/src/token-economics.ts`.
3. Add K3 comparable-model alias to `role-model-router/apps/runtime-host-bridge/src/remote-health-probe.ts`.
4. Add K3 upstream model-id mapping to `role-model-router/packages/provider-openai/src/index.ts`.
5. Write failing tests for K3 catalog normalization, alias resolution, and upstream mapping (RED).
6. Implement the minimal production changes to pass the tests (GREEN).
7. Re-export the normalized catalog and vendor ledger.
8. Run targeted package tests and full runtime-host-bridge regression suite.
9. Optionally add K3 to `testdata/catalog/litellm-model-prices.json` if execution tests require it.

## Implementation Sub-phases

- Sub-phase 1: Catalog metadata and alias tables (R1, R2).
- Sub-phase 2: Provider surfaces and upstream model-id mapping (R3, R4).
- Sub-phase 3: K3 request-shape compatibility and non-regression (R5).
- Sub-phase 4: Strict TDD evidence and regression coverage (R6).
- Sub-phase 5: Live Kimi OAuth-backed verification (R7) or user-rescoped deferral.

## Testing Strategy

- TDD Mode: strict.
- Add failing tests before production changes for each sub-phase.
- Record RED/GREEN logs under `/.recursive/run/74-kimi-k3-kimi-code-oauth-support/evidence/logs/`.
- Run package tests after each sub-phase:
  - `corepack pnpm --filter @role-model-router/catalog test`
  - `corepack pnpm --filter @role-model-router/provider-openai test`
  - `corepack pnpm --filter @role-model-router/runtime-host-bridge test`
- Verify non-regression of K2.7-code and K2.5 cases in each test run.

## Playwright Plan (if applicable)

Not applicable. The K3 feature is backend/catalog/provider focused; UI verification will use the rebuilt runtime providers page and Connect model dropdown, but no Playwright-specific scenario is required beyond the existing runtime-host-bridge and runtime-ui validation harnesses.

## Manual QA Scenarios

1. Rebuild and start the runtime on the worktree.
2. Verify `GET /api/role-model/providers` lists `moonshot/kimi-k3` on `moonshot` and `kimi-code` variants.
3. Verify `GET /v1/models` includes `moonshot/kimi-k3` when moonshot remote execution is configured.
4. If Kimi OAuth credentials are available, execute a live K3 chat-completion through the Kimi Code OAuth path and verify request detail shows canonical `moonshot/kimi-k3` and upstream `k3`.
5. If K3 credentials are unavailable, record the deferral and obtain explicit user rescope.

## Idempotence and Recovery

- Catalog export is deterministic; re-running `corepack pnpm run catalog:export` produces the same normalized catalog.
- Alias tables are additive; no existing K2.5/K2.7 mappings are modified.
- Provider-openai model-id mapping is centralized; future Kimi models can be added to the same table.
- Rebuild and re-run tests after each sub-phase to catch regressions early.

## Requirement Mapping

- `R1` | Coverage: direct | Source Quote: Add `moonshot/kimi-k3` to the repo’s authoritative catalog inputs and normalized catalog output using one clear metadata authority, with the documented K3 limits and the strongest capability/modality metadata the current schema can represent. | Implementation Surface: `testdata/catalog/models-dev-local-supplement.json`, `role-model-router/packages/catalog/data/normalized-catalog.json` | Verification Surface: `role-model-router/packages/catalog/test/index.test.ts`, `corepack pnpm --filter @role-model-router/catalog test`, `corepack pnpm run schemas:validate` | QA Surface: `GET /api/role-model/providers` and `GET /v1/models` on rebuilt runtime
- `R2` | Coverage: direct | Source Quote: The runtime and catalog seams that already normalize and price Moonshot models must understand K3 through the same canonical patterns used for earlier Moonshot/Kimi models. | Implementation Surface: `role-model-router/packages/catalog/src/token-economics.ts`, `role-model-router/apps/runtime-host-bridge/src/remote-health-probe.ts` | Verification Surface: `role-model-router/packages/catalog/test/token-economics.test.ts`, `corepack pnpm --filter @role-model-router/runtime-host-bridge test` | QA Surface: rebuilt-runtime provider API and health-probe readback
- `R3` | Coverage: indirect | Source Quote: K3 must appear on the intended Moonshot/Kimi provider surfaces through the existing catalog-driven variant flow, with no duplicate provider row and no orphaned variant entry. | Implementation Surface: `testdata/catalog/models-dev-local-supplement.json` (catalog row added for R1) | Verification Surface: `corepack pnpm --filter @role-model-router/runtime-host-bridge test`, `GET /api/role-model/providers` | QA Surface: rebuilt-runtime Connect UI model dropdown | Rationale: `moonshot` and `kimi-code` variant `modelIds` derive from catalog rows; the existing variant-dedupe logic handles the rest.
- `R4` | Coverage: direct | Source Quote: The runtime must translate canonical K3 selections into the provider-local upstream id expected by the Kimi Code endpoint exactly once, while preserving canonical outward model identity for users and downstream runtime surfaces. | Implementation Surface: `role-model-router/packages/provider-openai/src/index.ts` | Verification Surface: `role-model-router/packages/provider-openai/test/index.test.ts` | QA Surface: live request-detail readback showing canonical `moonshot/kimi-k3` and upstream `k3`
- `R5` | Coverage: direct | Source Quote: Audit the current Kimi-specific request shaping and repair any K2.x-only assumptions so K3 requests use a compatible payload while preserving supported tool-calling and structured-output behavior. | Implementation Surface: `role-model-router/packages/provider-openai/src/index.ts` Kimi-specific branch | Verification Surface: `role-model-router/packages/provider-openai/test/index.test.ts` | QA Surface: live K3 request acceptance through the Kimi Code OAuth path
- `R6` | Coverage: direct | Source Quote: Phase 3 must add or extend failing automated tests first, then implement the smallest production change needed to pass, with non-regression coverage for both K3 and existing Kimi Code behavior. | Implementation Surface: `role-model-router/packages/catalog/test/index.test.ts`, `role-model-router/packages/catalog/test/token-economics.test.ts`, `role-model-router/packages/provider-openai/test/index.test.ts` | Verification Surface: `evidence/logs/red/*`, `evidence/logs/green/*`, package test suites | QA Surface: strict TDD compliance log in `03-implementation-summary.md`
- `R7` | Coverage: deferred | Source Quote: Post-implementation verification must make real API calls through the actual Kimi Code OAuth-backed execution path used by this repo, rather than relying only on mocks, fixtures, or isolated request-shape assertions. | Rationale: Phase 5 live verification; if Kimi OAuth credentials or K3 entitlement are unavailable, rescope per `00-requirements.md`.
- `R8` | Coverage: direct | Source Quote: This run must improve the shared Moonshot/Kimi model path rather than leaving a one-off K3 exception that future model additions have to duplicate. | Implementation Surface: `role-model-router/packages/catalog/src/token-economics.ts`, `role-model-router/packages/provider-openai/src/index.ts` | Verification Surface: code review and regression tests | QA Surface: review bundle and `03.5-code-review.md` if needed
- `OOS1-OOS5` | Coverage: out-of-scope | Source Quote: adding a new provider, a new provider variant family, or a new OAuth flow for K3 | Rationale: Explicitly excluded by the locked requirements.

## Plan Drift Check

- No requirement merges are lossless; each R# maps to a distinct implementation surface.
- R3 is planned-indirectly because the catalog row added for R1 is the only change needed for variant exposure; no runtime-host code change is required.
- R7 is deferred to Phase 5 per the requirements.
- No out-of-scope work is introduced.
- The planned changes are additive and preserve existing K2.5/K2.7 behavior.

## Gaps Found

None.

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `ac855c46309f3ccdf7b26b6375ed41ae0d380ffc`
- Comparison reference: `working-tree`
- Normalized baseline: `ac855c46309f3ccdf7b26b6375ed41ae0d380ffc`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only ac855c46309f3ccdf7b26b6375ed41ae0d380ffc`
- Planned changed files:
  - `testdata/catalog/models-dev-local-supplement.json`
  - `testdata/catalog/models-dev-local-overrides.json`
  - `role-model-router/packages/catalog/src/token-economics.ts`
  - `role-model-router/apps/runtime-host-bridge/src/remote-health-probe.ts`
  - `role-model-router/packages/provider-openai/src/index.ts`
  - `role-model-router/packages/catalog/test/index.test.ts`
  - `role-model-router/packages/catalog/test/token-economics.test.ts`
  - `role-model-router/packages/provider-openai/test/index.test.ts`
  - `role-model-router/packages/catalog/data/normalized-catalog.json`
  - `role-model-router/packages/catalog/data/vendor-version-ledger.json`
  - `testdata/catalog/litellm-model-prices.json`
- Actual changed files reviewed: none yet (Phase 2).
- Unexplained drift: none.

## Earlier Phase Reconciliation

- Phase 0 (`00-worktree.md`) and Phase 1 (`01-as-is.md`) are locked.
- No upstream-gap addenda needed; the AS-IS analysis is complete and accurate.

## Subagent Contribution Verification

- No subagent work contributed to this phase.
- Audit Execution Mode: self-audit.

## Repair Work Performed

- No repairs needed; this phase is planning-only.

## Requirement Completion Status

- `R1` | Status: planned | Implementation Surface: `testdata/catalog/models-dev-local-supplement.json`, `role-model-router/packages/catalog/data/normalized-catalog.json` | Verification Surface: `role-model-router/packages/catalog/test/index.test.ts`, `corepack pnpm --filter @role-model-router/catalog test` | QA Surface: rebuilt-runtime provider and `/v1/models` APIs
- `R2` | Status: planned | Implementation Surface: `role-model-router/packages/catalog/src/token-economics.ts`, `role-model-router/apps/runtime-host-bridge/src/remote-health-probe.ts` | Verification Surface: `role-model-router/packages/catalog/test/token-economics.test.ts`, `corepack pnpm --filter @role-model-router/runtime-host-bridge test` | QA Surface: rebuilt-runtime provider and health-probe readback
- `R3` | Status: planned-indirectly | Implementation Surface: `testdata/catalog/models-dev-local-supplement.json` | Verification Surface: `corepack pnpm --filter @role-model-router/runtime-host-bridge test`, `GET /api/role-model/providers` | QA Surface: rebuilt-runtime Connect UI model dropdown | Rationale: `moonshot` and `kimi-code` variant `modelIds` derive from catalog rows.
- `R4` | Status: planned | Implementation Surface: `role-model-router/packages/provider-openai/src/index.ts` | Verification Surface: `role-model-router/packages/provider-openai/test/index.test.ts` | QA Surface: live request-detail readback
- `R5` | Status: planned | Implementation Surface: `role-model-router/packages/provider-openai/src/index.ts` Kimi-specific branch | Verification Surface: `role-model-router/packages/provider-openai/test/index.test.ts` | QA Surface: live K3 request acceptance
- `R6` | Status: planned | Implementation Surface: `role-model-router/packages/catalog/test/index.test.ts`, `role-model-router/packages/catalog/test/token-economics.test.ts`, `role-model-router/packages/provider-openai/test/index.test.ts` | Verification Surface: `evidence/logs/red/*`, `evidence/logs/green/*`, package test suites | QA Surface: strict TDD compliance log
- `R7` | Status: deferred | Rationale: Phase 5 live verification requires Kimi OAuth credentials entitled to K3; if unavailable, the user must explicitly rescope per the locked requirements. | Deferred By: `/.recursive/run/74-kimi-k3-kimi-code-oauth-support/00-requirements.md`
- `R8` | Status: planned | Implementation Surface: `role-model-router/packages/catalog/src/token-economics.ts`, `role-model-router/packages/provider-openai/src/index.ts` | Verification Surface: code review and regression tests | QA Surface: review bundle if delegated
- `OOS1-OOS5` | Status: out-of-scope | Rationale: Explicitly excluded by the locked requirements. | Scope Decision: `/.recursive/run/74-kimi-k3-kimi-code-oauth-support/00-requirements.md`

## Audit Verdict

- The TO-BE plan directly addresses every in-scope requirement and source-inventory item.
- Planned surfaces are concrete and map to the actual files identified in AS-IS.
- No plan drift or unexplained scope expansion.
- Coverage and Approval gates can be evaluated.

Audit: PASS

## Traceability

- `R1` → catalog supplement and export.
- `R2` → alias tables and probe aliases.
- `R3` → catalog-driven variant generation.
- `R4` → provider-openai request builder.
- `R5` → Kimi-specific request shaping.
- `R6` → strict TDD evidence.
- `R7` → Phase 5 live verification.
- `R8` → shared tables and centralized seams.
- `OOS1-OOS5` → no action.

## Coverage Gate

- [x] Every in-scope R# is mapped to a planned implementation surface, verification surface, and QA surface
- [x] Source Requirement Inventory items from `01-as-is.md` are accounted for
- [x] Plan drift check confirms no lossless merges or scope expansion
- [x] TDD strategy and Phase 5 QA approach are recorded
- [x] Worktree diff basis matches the locked Phase 0 artifact

Coverage: PASS

## Approval Gate

- [x] TO-BE plan is concrete enough to implement in Phase 3
- [x] No unexplained drift from requirements or AS-IS analysis
- [x] Audit sections are complete and audit verdict is PASS

Approval: PASS
