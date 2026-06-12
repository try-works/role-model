Run: `/.recursive/run/42-provider-kind-craft-ask-routing/`
Phase: `02 To-Be Plan`
Status: `LOCKED`
LockedAt: `2026-06-12T09:21:53Z`
LockHash: `d04d7ffde89632c78361f0f738cb6ec09e49e23d66c9d4e7008d566ce1b1422e`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/42-provider-kind-craft-ask-routing/00-requirements.md`
- `/.recursive/run/42-provider-kind-craft-ask-routing/00-worktree.md`
- `/.recursive/run/42-provider-kind-craft-ask-routing/01-as-is.md`
Outputs:
- `/.recursive/run/42-provider-kind-craft-ask-routing/02-to-be-plan.md`
Scope note: ExecPlan-grade plan for R1 provider metadata merge and R2 Craft declared-tools ask-mode. **No implementation until this phase is locked.**

## TODO

- [x] Map each in-scope R# to concrete files and tests
- [x] Define strict TDD RED→GREEN sequence per track
- [x] Define regression guards and out-of-scope boundaries
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Effective Inputs Re-read

- `00-requirements.md`: R1 strict TDD (19-id table); R2 strict TDD (declared-tools + guard); fixed merge precedence; no catalog export rewrite.
- `01-as-is.md`: split-brain in `listProviders`; ask-mode only when `toolCount === 0`; no overlap tests today.

## Requirement Mapping

| R# | Disposition | Implementation Surface | Verification Surface |
| --- | --- | --- | --- |
| R0 | planned | worktree discipline | diff basis unchanged |
| R1 | planned | `provider-metadata-merge.ts`, `index.ts` (`listProviders`, OAuth start) | `provider-overlap-metadata.test.ts` |
| R2 | planned | `index.ts` (`summarizeDifficultySignals`, ask-mode helpers) | `craft-ask-difficulty.test.ts` |
| R3 | deferred | Phase 5 `:3456` overlap + Craft probes | `evidence/logs/phase5-*.log` |

## Implementation Steps

1. SP1 RED: add overlap tests; capture RED logs
2. SP1 GREEN: add merge helper; wire `listProviders` + OAuth; capture GREEN logs
3. SP2 RED: extend craft tests; capture RED logs
4. SP2 GREEN: implement ask-mode rubric; capture GREEN logs
5. Phase 4: run targeted + regression tests

## Planned Changes by File

### New: `role-model-router/apps/runtime-host-bridge/src/provider-metadata-merge.ts`

- `resolveValidationProviderMetadata({ catalogProvider, liteLLMProvider? })` — on overlap, LiteLLM wins for `providerKind`; prefer LiteLLM `adapterFamily` / `apiBase` when present.
- `listOverlapProviderKindMismatches()` — audit helper for CI guard.
- Constants: `HISTORICALLY_BROKEN_OVERLAP_PROVIDER_IDS` (19), `ALIGNED_OVERLAP_PROVIDER_IDS` (4).

### Modified: `role-model-router/apps/runtime-host-bridge/src/index.ts`

**R1 call sites**

1. `listProviders()` catalog branch — replace raw catalog `providerKind` / `adapterFamily` / `apiBase` with merged metadata when LiteLLM row exists.
2. `startProviderDeviceAuthorization()` — use merged metadata for variant `apiBase` and validation account `providerKind`.

**R2 rubric**

1. Add `hasActiveToolUsage(messages)` — true when any `tool` role or assistant `tool_calls`.
2. Add `isDifficultyAskMode({ messages, declaredToolCount })` — true when `declaredToolCount === 0` OR declared tools without active usage.
3. Update `summarizeDifficultySignals()` in ask-mode:
   - last-user-turn burden source
   - scoring `toolCount: 0`
   - user-turn `historyTurnCount`
   - user-message-only context tokens via `estimateContextTokens(userMessages, 0)`

### New: `role-model-router/apps/runtime-host-bridge/test/provider-overlap-metadata.test.ts`

| Test | Purpose |
| --- | --- |
| Legacy mismatch enumeration | Assert exactly 19 ids when using catalog-only operator metadata |
| Merged alignment | Assert zero mismatches with `resolveValidationProviderMetadata` |
| Parameterized upsert (×19) | UI-equivalent payload validates with merged kind |
| Aligned stability (×4) | `openai`, `anthropic`, `moonshot`, `azure` unchanged |
| Integration `listProviders` (×19) | Backend exposes validation-canonical kind |

### Modified: `role-model-router/apps/runtime-host-bridge/test/craft-ask-difficulty.test.ts`

| Test | Purpose |
| --- | --- |
| Existing run 39 cases | Must remain green |
| Declared-tools simple chat | 33 declared tools, no usage → `easy` / `cost`, `rubricSignals.toolCount: 0` |
| Active-tool guard | `tool_calls` + `tool` role → **not** easy/cost; `toolCount` preserved |

## Implementation Sub-phases

### SP1 — R1 provider metadata (strict TDD)

1. **RED:** Add `provider-overlap-metadata.test.ts` (unit + integration). Run vitest; capture `evidence/logs/red/sp1-overlap-listProviders.red.log` (expect 19 integration failures).
2. **RED:** Capture alignment/upsert failure evidence if split into separate runs: `sp1-overlap-alignment.red.log`, `sp1-overlap-upsert.red.log`.
3. **GREEN:** Implement `provider-metadata-merge.ts`; wire `listProviders` + OAuth start.
4. **GREEN:** Re-run tests; capture `evidence/logs/green/sp1-overlap-*.green.log`.

### SP2 — R2 Craft ask-mode (strict TDD)

1. **RED:** Add declared-tools test case; run vitest; capture `evidence/logs/red/sp2-craft-ask-mode.red.log` (expect hard/non-cost on baseline).
2. **RED:** Add active-tool guard test (passes on baseline or documents non-ask behavior); capture in RED log bundle.
3. **GREEN:** Implement ask-mode helpers + `summarizeDifficultySignals` changes.
4. **GREEN:** Capture `evidence/logs/green/sp2-craft-ask-mode.green.log`, `sp2-craft-ask-guard.green.log`.

## Testing Strategy

- Primary: `npx vitest run test/provider-overlap-metadata.test.ts test/craft-ask-difficulty.test.ts` (runtime-host-bridge)
- Regression: run 40 tier-1 catalog economics tests after SP2 (Phase 4)
- Regression: run 39 restart/session tests unchanged (Phase 4)

## Out of Scope (honored)

- Rewriting `normalized-catalog.json` export
- Per-provider exceptions (e.g. DeepSeek-only patches)
- Alias-on-strategy-save UI, `routable-inventory` alias reconcile (prior main WIP)
- Phase 5 `:3456` packaged proof (R3)

## Manual QA Scenarios

1. Loop all 19 overlap ids: merged `GET /providers` kind + stub `POST /accounts` non-400
2. Craft-like mapped request → `easy` / `cost` with local peer in pool
3. DeepSeek connect + chat using runtime-local credential config (not committed)

## Playwright Plan (if applicable)

Not applicable for Phase 3 unit/integration scope.

## Idempotence and Recovery

- Merge helper is pure metadata resolution; re-applying wiring is idempotent
- Rubric changes are deterministic from message history + declared tools
- Recovery: revert the four planned product files; no catalog export mutation

## Earlier Phase Reconciliation

- Plan addresses all gaps in `01-as-is.md` (G1–G4).
- Expected product/worktree change surface matches R1/R2 changed files above.

## Gaps Found

- None blocking lock.

## Repair Work Performed

- None. Planning-only phase.

## Worktree Diff Audit

- Baseline: `f4e14afa40e599b647eb187a76171b5b9b7a92c6`
- Expected change surface after Phase 3:
  - `role-model-router/apps/runtime-host-bridge/src/provider-metadata-merge.ts` (new)
  - `role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `role-model-router/apps/runtime-host-bridge/test/provider-overlap-metadata.test.ts` (new)
  - `role-model-router/apps/runtime-host-bridge/test/craft-ask-difficulty.test.ts`

## Requirement Completion Status

| R# | Status | Planned Files |
| --- | --- | --- |
| R0 | planned | worktree only |
| R1 | planned | merge helper + index + overlap tests |
| R2 | planned | index + craft tests |
| R3 | deferred | Phase 5 |

## Subagent Capability Probe

- Subagent tools available; Phase 3 may use bounded implementer/reviewer after lock.

## Delegation Decision Basis

- Self-audit for Phase 2 plan completeness.

## Audit Context

- Phase: `02 To-Be Plan`
- Auditor: self (main agent)
- Audit Inputs Provided: locked requirements, locked worktree, locked AS-IS
- Audit Execution Mode: self-audit

## Audit Verdict

Audit: PASS

## Traceability

- R0 → worktree discipline; no product edits before Phase 3
- R1 → merge helper + 19-id parameterized tests + `listProviders`/OAuth wiring
- R2 → ask-mode helpers + declared-tools RED/GREEN + guard test
- R3 → Phase 5 `:3456` packaged probes; no Phase 3 product files

## Coverage Gate

- [x] Every in-scope R# has concrete file and test mapping
- [x] Strict TDD RED/GREEN paths defined with evidence log names
- [x] Out-of-scope boundaries recorded
- [x] Expected diff surface recorded for Phase 3 reconciliation

Coverage: PASS

## Approval Gate

- [x] Plan is complete enough to implement after lock
- [x] No unresolved planning questions

Approval: PASS
