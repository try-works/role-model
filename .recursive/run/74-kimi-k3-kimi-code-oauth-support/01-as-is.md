Run: `/.recursive/run/74-kimi-k3-kimi-code-oauth-support/`
Phase: `01 AS-IS`
Status: `LOCKED`
LockedAt: `2026-07-16T21:42:27Z`
LockHash: `61dc84d92e84d45c2fedec6e21ae0149fdde5d4cc32a4d284f4fb05f348e5d8a`
Inputs:
- `/.recursive/run/74-kimi-k3-kimi-code-oauth-support/00-requirements.md`
- `/.recursive/run/74-kimi-k3-kimi-code-oauth-support/00-worktree.md`
- `/.recursive/run/40-catalog-economics-moonshot-consolidation/00-requirements.md`
- `/.recursive/run/44-kimi-k2.7-code-catalog/00-requirements.md`
- `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/00-requirements.md`
- `/.recursive/run/68-codex-subscription-tool-call-parity/00-requirements.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
- `role-model-router/packages/catalog/src/litellm-catalog.ts`
- `role-model-router/packages/catalog/src/token-economics.ts`
- `role-model-router/packages/catalog/src/index.ts`
- `role-model-router/packages/catalog/test/index.test.ts`
- `role-model-router/packages/catalog/test/token-economics.test.ts`
- `role-model-router/packages/provider-openai/src/index.ts`
- `role-model-router/packages/provider-openai/test/index.test.ts`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/src/remote-health-probe.ts`
- `testdata/catalog/models-dev-snapshot.json`
- `testdata/catalog/models-dev-local-supplement.json`
- `testdata/catalog/models-dev-local-overrides.json`
- `testdata/catalog/litellm-model-prices.json`
Outputs:
- `/.recursive/run/74-kimi-k3-kimi-code-oauth-support/01-as-is.md`
Scope note: This document records the current state of the Kimi integration and identifies the exact requirements-aligned work that must be performed to support `moonshot/kimi-k3` through the existing Kimi Code OAuth path.

## TODO

- [x] Re-read the locked requirements and worktree context
- [x] Re-read prior relevant recursive runs (40, 44, 51, 68)
- [x] Re-read the runtime-routing-and-provider-capabilities memory shard
- [x] Inventory the current Kimi catalog, alias, provider, and execution surfaces
- [x] Identify the K3 work areas against each in-scope requirement
- [x] Record the source-requirement inventory (audit-v2)
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Audit Context

- Audit Execution Mode: self-audit
- Subagent Availability: unavailable
- Subagent Capability Probe: none (no routed subagent configured for this phase)
- Delegation Decision Basis: Phase 1 AS-IS analysis is bounded to repo file inspection and requirements reconciliation; performed by the controller with the required context bundle.
- Audit Inputs Provided:
  - `/.recursive/run/74-kimi-k3-kimi-code-oauth-support/00-requirements.md`
  - `/.recursive/run/74-kimi-k3-kimi-code-oauth-support/00-worktree.md`
  - Prior runs listed above
  - Memory shard `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
  - Code files listed above
  - Diff basis: `ac855c46309f3ccdf7b26b6375ed41ae0d380ffc` vs working-tree

## Effective Inputs Re-read

- `00-requirements.md` is locked and defines R1–R8 plus OOS1–OOS5.
- `00-worktree.md` is locked and records the isolated worktree at `ac855c46` with a clean baseline.
- Prior run 40 established the canonical-pricing alias pattern (`moonshot/kimi-k2.6` → `moonshotai/kimi-k2.6`) and the operator-hidden `moonshotai` provider.
- Prior run 44 extended that pattern to `moonshot/kimi-k2.7-code` and is the closest structural baseline for adding a new Kimi operator model.
- Prior run 51 established the testing architecture and regression matrix commands used in this repo.
- Prior run 68 captured cross-provider tool-call and continuation semantics on the shared OpenAI-compatible execution path.
- Memory shard confirms the shared Moonshot/Kimi path, the Kimi Code OAuth auth profile, and the execution contract.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/40-catalog-economics-moonshot-consolidation/00-requirements.md` — canonical pricing alias pattern, `TokenEconomics`, `OPERATOR_HIDDEN_CATALOG_PROVIDER_IDS`, Moonshot variant dedupe.
- `/.recursive/run/44-kimi-k2.7-code-catalog/00-requirements.md` — supplement-based operator model addition, refresh/export discipline, K2.7 canonical alias and execution path.
- `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/00-requirements.md` — regression commands and TDD expectations.
- `/.recursive/run/68-codex-subscription-tool-call-parity/00-requirements.md` — shared OpenAI-compatible execution path, tool-call parity, Kimi continuation history.
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md` — current Kimi Code OAuth path, hosted-search tool contract, provider identity semantics, prompt-cache normalization.

## Source Requirement Inventory

- `R1` | Source Quote: Add `moonshot/kimi-k3` to the repo’s authoritative catalog inputs and normalized catalog output using one clear metadata authority, with the documented K3 limits and the strongest capability/modality metadata the current schema can represent. | Summary: Catalog must expose `moonshot/kimi-k3` with `contextWindow = 1048576` and `maxOutputTokens = 131072`. | Disposition: in-scope
- `R2` | Source Quote: The runtime and catalog seams that already normalize and price Moonshot models must understand K3 through the same canonical patterns used for earlier Moonshot/Kimi models. | Summary: Add canonical pricing alias and comparable-model/probe alias for K3. | Disposition: in-scope
- `R3` | Source Quote: K3 must appear on the intended Moonshot/Kimi provider surfaces through the existing catalog-driven variant flow, with no duplicate provider row and no orphaned variant entry. | Summary: K3 must appear on the existing `moonshot` and `kimi-code` variants without a new provider. | Disposition: in-scope
- `R4` | Source Quote: The runtime must translate canonical K3 selections into the provider-local upstream id expected by the Kimi Code endpoint exactly once, while preserving canonical outward model identity for users and downstream runtime surfaces. | Summary: Centralized provider-local model-id mapping must produce upstream `k3` while preserving canonical identity. | Disposition: in-scope
- `R5` | Source Quote: Audit the current Kimi-specific request shaping and repair any K2.x-only assumptions so K3 requests use a compatible payload while preserving supported tool-calling and structured-output behavior. | Summary: Add K3 request-shape tests and adjust Kimi-specific shaping if needed. | Disposition: in-scope
- `R6` | Source Quote: Phase 3 must add or extend failing automated tests first, then implement the smallest production change needed to pass, with non-regression coverage for both K3 and existing Kimi Code behavior. | Summary: Strict TDD with RED/GREEN evidence for all K3 changes. | Disposition: quality-gate
- `R7` | Source Quote: Post-implementation verification must make real API calls through the actual Kimi Code OAuth-backed execution path used by this repo, rather than relying only on mocks, fixtures, or isolated request-shape assertions. | Summary: Live API verification is a Phase 5 obligation; if credentials are unavailable it must be deferred by user rescope. | Disposition: quality-gate
- `R8` | Source Quote: This run must improve the shared Moonshot/Kimi model path rather than leaving a one-off K3 exception that future model additions have to duplicate. | Summary: Use existing shared tables and centralized seams; no scattered K3-only branches. | Disposition: in-scope
- `OOS1-OOS5` | Source Quote: adding a new provider, a new provider variant family, or a new OAuth flow for K3 | Summary: Out-of-scope items are explicitly excluded. | Disposition: out-of-scope

## Current State (AS-IS)

### Catalog metadata

- The pinned `models.dev` snapshot (`testdata/catalog/models-dev-snapshot.json`) contains `moonshotai/kimi-k2.6` and `moonshotai/kimi-k2.7-code` but **no `moonshotai/kimi-k3`** row.
- The operator-facing supplement (`testdata/catalog/models-dev-local-supplement.json`) contains `moonshot/kimi-k2.5`, `moonshot/kimi-k2.6`, and `moonshot/kimi-k2.7-code` but **no `moonshot/kimi-k3`** row.
- The exported normalized catalog (`role-model-router/packages/catalog/data/normalized-catalog.json`) therefore lacks `moonshot/kimi-k3` and `moonshotai/kimi-k3`.
- `CANONICAL_MODEL_ID_ALIASES` in `token-economics.ts` maps `moonshot/kimi-k2.6` and `moonshot/kimi-k2.7-code` to `moonshotai/*` rows; **no K3 mapping exists**.

### Alias / comparable-model surfaces

- `remote-health-probe.ts` `COMPARABLE_MODEL_ID_ALIASES` knows `moonshot/kimi-k2.7-code`, `kimi-k2.7-code`, and `kimi-for-coding`; **no K3 aliases**.
- Provider variant generation in `runtime-host-bridge/src/index.ts` derives `moonshot` variants from catalog rows and presets; K3 is absent because it is not in the catalog.

### Provider surfaces

- `moonshot` provider in `litellm-catalog.ts` has the `kimi-code` OAuth profile and `moonshot-open-platform` API-key variant; variant generation deduplicates them. K3 will be picked up automatically once the catalog row exists.
- `OPERATOR_HIDDEN_CATALOG_PROVIDER_IDS` correctly hides `moonshotai`; no change needed.

### Execution path / provider-local model id

- In `provider-openai/src/index.ts`, `buildOpenAIRequest` strips the provider prefix from the target model id: `moonshot/kimi-k2.5` → `kimi-k2.5`. This is the current default behavior for all `moonshot/*` models.
- For K3, the upstream Kimi Code request model id is **not** `kimi-k3`; it is `k3` per the fixed decision. The existing prefix-stripping logic would produce `kimi-k3`, which is incorrect. A centralized override is required.
- Kimi-specific request shaping currently injects `thinking: {type: "disabled"}` when only Kimi builtin `$web_search` hosted tools are present. K3 behavior may differ; this must be tested and documented.

### Testing baseline

- `token-economics.test.ts` has K2.6 and K2.7-code alias tests; **no K3 test**.
- `provider-openai/test/index.test.ts` has K2.5 and K2.6 request-building tests; **no K3 test**.
- `runtime-host-bridge` tests exercise the Kimi Code OAuth path for K2.5/K2.6/K2.7-code; **no K3 test**.
- All targeted baseline tests pass after the worktree setup (Phase 0).

## Reproduction Steps (Novice-Runnable)

1. Open `testdata/catalog/models-dev-local-supplement.json` and search for `kimi-k3` — no matches.
2. Open `role-model-router/packages/catalog/src/token-economics.ts` and inspect `CANONICAL_MODEL_ID_ALIASES` — `moonshot/kimi-k3` is absent.
3. Open `role-model-router/apps/runtime-host-bridge/src/remote-health-probe.ts` and inspect `COMPARABLE_MODEL_ID_ALIASES` — no `k3` alias.
4. Open `provider-openai/src/index.ts` `buildOpenAIRequest` and note that model ids are prefix-stripped (`moonshot/kimi-k2.5` → `kimi-k2.5`), which would incorrectly produce `kimi-k3` instead of `k3` for K3.
5. Run `corepack pnpm --filter @role-model-router/catalog test` and `corepack pnpm --filter @role-model-router/provider-openai test` — they pass, but no K3 cases exist.

## Current Behavior by Requirement

- `R1` | Current: `moonshot/kimi-k3` and `moonshotai/kimi-k3` are absent from catalog export. Expected: Both rows present with `contextWindow: 1048576`, `maxOutputTokens: 131072`.
- `R2` | Current: `CANONICAL_MODEL_ID_ALIASES` has no K3 entry; `COMPARABLE_MODEL_ID_ALIASES` has no `k3`. Expected: Alias and probe tables know K3.
- `R3` | Current: `moonshot` and `kimi-code` variants list only K2.5/K2.6/K2.7-code. Expected: Variants include `moonshot/kimi-k3`.
- `R4` | Current: Prefix-stripping would produce `kimi-k3` upstream. Expected: Canonical selection resolves to upstream `k3`.
- `R5` | Current: K3-specific request shaping not tested. Expected: K3-compatible payload, no incompatible K2.x-only fields.
- `R6` | Current: No K3 tests. Expected: RED/GREEN tests before production code.
- `R7` | Current: No live K3 verification. Expected: Live OAuth-backed API verification in Phase 5.
- `R8` | Current: No extensibility blockers observed. Expected: Extend shared tables, no one-off branches.

## Relevant Code Pointers

- `testdata/catalog/models-dev-local-supplement.json` — operator-facing catalog rows.
- `testdata/catalog/models-dev-local-overrides.json` — provider/model overrides.
- `role-model-router/packages/catalog/src/token-economics.ts` — canonical pricing alias table.
- `role-model-router/packages/catalog/src/index.ts` — catalog normalization and export.
- `role-model-router/packages/catalog/data/normalized-catalog.json` — shipped normalized catalog.
- `role-model-router/apps/runtime-host-bridge/src/remote-health-probe.ts` — comparable-model aliases for health probes.
- `role-model-router/apps/runtime-host-bridge/src/index.ts` — provider variant generation and Kimi OAuth path.
- `role-model-router/packages/provider-openai/src/index.ts` — request builder and Kimi-specific shaping.
- `role-model-router/packages/provider-openai/test/index.test.ts` — request-building tests.

## Known Unknowns

1. Whether the live models.dev snapshot already contains a `moonshotai/kimi-k3` row (the pinned snapshot does not, but the local supplement can supply the operator row).
2. The exact Kimi Code K3 request-control semantics for `temperature`, `max_tokens`, `reasoning`, `thinking`, and `tools` — we will follow the official Kimi K3 quickstart and models.dev as authoritative and record any discrepancy.
3. Whether the current Kimi OAuth-backed test environment has credentials entitled to K3.

## Evidence

- Baseline test passes: `corepack pnpm --filter @role-model-router/catalog test` (16 tests), `corepack pnpm --filter @role-model-router/provider-openai test` (29 tests), `corepack pnpm --filter @role-model-router/runtime-host-bridge test` (547 tests).
- File inspection confirms K3 is absent from catalog supplement, alias tables, and comparable-model aliases.
- Request builder inspection confirms prefix-stripping is the only current model-id translation.

## Gaps Found

None.

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `ac855c46309f3ccdf7b26b6375ed41ae0d380ffc`
- Comparison reference: `working-tree`
- Normalized baseline: `ac855c46309f3ccdf7b26b6375ed41ae0d380ffc`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only ac855c46309f3ccdf7b26b6375ed41ae0d380ffc`
- Planned or claimed changed files: none at this phase (analysis only).
- Actual changed files reviewed: none.
- Unexplained drift: none.

## Earlier Phase Reconciliation

- Phase 0 (`00-worktree.md`) is locked and records a clean baseline from `ac855c46`.
- No upstream-gap addenda are needed; the requirements are clear and the AS-IS work areas are straightforward.

## Subagent Contribution Verification

- No subagent work contributed to this phase.
- Audit Execution Mode: self-audit.

## Repair Work Performed

- No repairs were needed; this phase is analysis-only.

## Requirement Completion Status

- `R1` | Status: deferred | Rationale: Implementation is planned for Phase 3; catalog row addition and export are the next concrete steps. | Deferred By: `/.recursive/run/74-kimi-k3-kimi-code-oauth-support/00-requirements.md`
- `R2` | Status: deferred | Rationale: Implementation is planned for Phase 3; alias and probe alias additions are the next concrete steps. | Deferred By: `/.recursive/run/74-kimi-k3-kimi-code-oauth-support/00-requirements.md`
- `R3` | Status: deferred | Rationale: Implementation is planned for Phase 3; catalog-driven variant exposure will be verified once the catalog row exists. | Deferred By: `/.recursive/run/74-kimi-k3-kimi-code-oauth-support/00-requirements.md`
- `R4` | Status: deferred | Rationale: Implementation is planned for Phase 3; centralized upstream model-id mapping is the next concrete step. | Deferred By: `/.recursive/run/74-kimi-k3-kimi-code-oauth-support/00-requirements.md`
- `R5` | Status: deferred | Rationale: Implementation is planned for Phase 3; K3 request-shape tests and any shaping adjustments are the next concrete steps. | Deferred By: `/.recursive/run/74-kimi-k3-kimi-code-oauth-support/00-requirements.md`
- `R6` | Status: deferred | Rationale: Implementation is planned for Phase 3; strict TDD evidence will be produced in Phase 3. | Deferred By: `/.recursive/run/74-kimi-k3-kimi-code-oauth-support/00-requirements.md`
- `R7` | Status: deferred | Rationale: Phase 5 live verification requires Kimi OAuth credentials entitled to K3; if unavailable, the user must explicitly rescope per the locked requirements. | Deferred By: `/.recursive/run/74-kimi-k3-kimi-code-oauth-support/00-requirements.md`
- `R8` | Status: deferred | Rationale: Implementation is planned for Phase 3; extensibility will be verified through code review and regression tests. | Deferred By: `/.recursive/run/74-kimi-k3-kimi-code-oauth-support/00-requirements.md`
- `OOS1-OOS5` | Status: out-of-scope | Rationale: Explicitly excluded by the locked requirements. | Scope Decision: `/.recursive/run/74-kimi-k3-kimi-code-oauth-support/00-requirements.md`

## Audit Verdict

- The AS-IS artifact accurately reflects the current state of the codebase and the K3 work areas.
- All required sections are present and non-empty.
- Coverage and Approval gates can be evaluated.

Audit: PASS

## Traceability

- `R1` → `testdata/catalog/models-dev-local-supplement.json`, `role-model-router/packages/catalog/data/normalized-catalog.json`.
- `R2` → `role-model-router/packages/catalog/src/token-economics.ts`, `role-model-router/apps/runtime-host-bridge/src/remote-health-probe.ts`.
- `R3` → catalog-driven variant generation in `role-model-router/apps/runtime-host-bridge/src/index.ts`.
- `R4` → `role-model-router/packages/provider-openai/src/index.ts`.
- `R5` → `role-model-router/packages/provider-openai/src/index.ts` Kimi-specific branch.
- `R6` → Phase 3 will demonstrate RED/GREEN evidence.
- `R7` → Phase 5; credential-dependent; rescope gate in `00-requirements.md`.
- `R8` → shared tables and centralized seams will be used.
- `OOS1-OOS5` → no action required.

## Coverage Gate

- [x] Every in-scope R# is mapped to a concrete planned implementation surface and verification surface
- [x] Source Requirement Inventory indexes all R# and OOS obligations
- [x] Prior recursive evidence relevant to the same subsystem was reviewed
- [x] Memory shard relevant to the Moonshot/Kimi path was reviewed
- [x] Worktree diff basis matches the locked Phase 0 artifact
- [x] No unexplained product/worktree drift

Coverage: PASS

## Approval Gate

- [x] AS-IS analysis accurately reflects the current repo state
- [x] Work areas are concrete enough to plan in Phase 2
- [x] No unexplained diff drift
- [x] Audit sections are complete and audit verdict is PASS

Approval: PASS
