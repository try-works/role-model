Run: `/.recursive/run/73-telemetry-surface-integrity-contract-fix/`
Phase: `02 TO-BE plan`
Status: `LOCKED`
LockedAt: `2026-07-16T19:44:13Z`
LockHash: `143115fdb7561e7ec7d5866e3deb98925eb9c65650b7445737cc2d75a71d2c85`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/73-telemetry-surface-integrity-contract-fix/00-requirements.md` (LOCKED)
- `/.recursive/run/73-telemetry-surface-integrity-contract-fix/00-worktree.md` (LOCKED)
- `/.recursive/run/73-telemetry-surface-integrity-contract-fix/01-as-is.md` (LOCKED)
- `/.recursive/run/73-telemetry-surface-integrity-contract-fix/01.5-root-cause.md` (LOCKED)
- `/.recursive/run/73-telemetry-surface-integrity-contract-fix/addenda/05-manual-qa.upstream-gap.02-to-be-plan.addendum-01.md`
- `/.recursive/run/73-telemetry-surface-integrity-contract-fix/addenda/05-manual-qa.upstream-gap.02-to-be-plan.addendum-02.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
Outputs:
- This file.

Scope note: This artifact defines the planned repair for the telemetry surface integrity run. It maps every requirement to a concrete implementation surface, verification surface, and QA surface, and it preserves the L1 → L2 → L3 → L4 → L5 layering established in the requirements.

## TODO

- [x] Re-read locked requirements and AS-IS analysis
- [x] Review prior recursive evidence for repair patterns
- [x] Build requirement mapping with implementation, verification, and QA surfaces
- [x] Define planned changes by file
- [x] Define implementation steps and sub-phases
- [x] Define testing strategy and Playwright plan
- [x] Define manual QA scenarios
- [x] Define idempotence and recovery considerations
- [x] Perform plan drift check against requirements and AS-IS
- [x] Complete audit verdict and gates

## Audit Context

- Audit Execution Mode: self-audit
- Subagent Availability: unavailable
- Subagent Capability Probe: No subagent CLI or model route is configured in the current worktree.
- Delegation Decision Basis: Self-audit is sufficient because the TO-BE plan is a code-reading and planning exercise against the locked AS-IS artifact.
- Delegation Override Reason: N/A
- Audit Inputs Provided:
  - `00-requirements.md` (LOCKED)
  - `00-worktree.md` (LOCKED)
  - `01-as-is.md` (LOCKED)
  - `/.recursive/STATE.md` and `/.recursive/DECISIONS.md`
  - Prior run evidence referenced in `01-as-is.md`

## Effective Inputs Re-read

- `00-requirements.md` (LOCKED) defines R1-R9 and constraints OOS1-OOS7. It mandates strict TDD, rebuilt-runtime browser verification, and shared-seam repairs at runtime-host, provider-openai, and runtime-ui layers.
- `01-as-is.md` (LOCKED) identifies defects G1-G13 and maps them to owning layers L1-L5. It records the baseline test results and diff basis.
- `00-worktree.md` (LOCKED) establishes the isolated worktree and base commit `11461400640736ab86d9340045bc1f90c102b464`.
- `01.5-root-cause.md` reduces the audit failures to six shared ownership failures: capability timing, canonical token truth, provider-wire usage truth, data-dependent chart geometry, deterministic browser data, and ordered rebuilt-runtime evidence.
- Addendum 01 records `A73-01` through `A73-08` and blocks the original Phase 3/4 completion claims.
- Addendum 02 is authoritative for remediation slices SP0-SP8 and strengthens the original plan without widening R1-R9.
- Prior recursive evidence reviewed in `01-as-is.md` remains relevant and is not contradicted by this plan.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/70-cache-hit-token-rate-analytics-fix/02-to-be-plan.md` — split-axis cache-efficiency chart contract; this plan must preserve the dual-axis rendering and metric definition.
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/02-to-be-plan.md` — prompt-cache continuity and OpenAI-family normalization; this plan must extend the request contract, not fork it.
- `/.recursive/run/63-router-backend-regression-and-telemetry-surface-hardening/02-to-be-plan.md` — telemetry analytics refresh and browser regression; this plan must extend the regression net.
- `/.recursive/run/60-runtime-ui-paper-linear-review-alignment/02-to-be-plan.md` — Paper/Linear design-system baseline; this plan must keep layout repair inside shared chart primitives.

## Requirement Mapping

- R1 | Coverage: direct | Source Quote: Establish one canonical prompt-cache request contract for cache-supporting coding-agent traffic | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/index.ts` | Verification Surface: `role-model-router/apps/runtime-host-bridge/src/index.test.ts` | QA Surface: Rebuilt-runtime request detail showing `promptCacheRequested: true` for a Kimi-compatible request without caller-supplied key
- R2 | Coverage: direct | Source Quote: Normalize Kimi or OpenAI-compatible usage and cached-token facts across streamed response shapes | Implementation Surface: `role-model-router/packages/provider-openai/src/index.ts` | Verification Surface: `role-model-router/packages/provider-openai/test/index.test.ts` | QA Surface: Rebuilt-runtime telemetry showing non-zero token usage for a streamed Kimi-compatible response with nested usage
- R3 | Coverage: direct | Source Quote: Make request-size and input-token surfaces truthful when provider usage is absent, delayed, or previously dropped | Implementation Surface: `role-model-router/packages/provider-openai/src/index.ts`, `role-model-router/apps/runtime-ui/app/routes/request-detail.tsx` | Verification Surface: `role-model-router/packages/provider-openai/test/index.test.ts`, `role-model-router/apps/runtime-ui/app/routes/request-detail.test.tsx` | QA Surface: Rebuilt-runtime request detail showing estimated or unavailable token count instead of false-zero when usage is missing
- R4 | Coverage: indirect | Source Quote: Preserve cache-efficiency and telemetry ownership semantics while repairing the truth source | Implementation Surface: `role-model-router/apps/runtime-ui/app/lib/telemetry-analytics.ts` | Verification Surface: `role-model-router/apps/runtime-ui/app/lib/telemetry-analytics.test.ts` | QA Surface: Observe `cacheHitTokenRate` chart remains correct after truth-source repair | Rationale: The existing formula in `telemetry-analytics.ts` is preserved; truthful input tokens make it produce correct values without changing the definition.
- R5 | Coverage: direct | Source Quote: Establish one canonical shared layout contract for time-series telemetry charts | Implementation Surface: `role-model-router/apps/runtime-ui/app/components/telemetry-charts.tsx`, `role-model-router/apps/runtime-ui/app/lib/design-system.ts` | Verification Surface: `role-model-router/apps/runtime-ui/app/components/telemetry-charts.test.tsx` | QA Surface: Browser regression confirming all time-series charts share the same contract defaults
- R6 | Coverage: direct | Source Quote: Eliminate clipping, repair legend alignment, and restore plot centering across the shared chart family | Implementation Surface: `role-model-router/apps/runtime-ui/app/components/telemetry-charts.tsx` | Verification Surface: `role-model-router/apps/runtime-ui/app/components/telemetry-charts.test.tsx` | QA Surface: Screenshots of Overview/Observe charts with fully visible axes and correctly inset legends
- R7 | Coverage: direct | Source Quote: Add strict-TDD automated regression coverage for both telemetry truth and chart layout contracts | Implementation Surface: `role-model-router/packages/provider-openai/test/index.test.ts`, `role-model-router/apps/runtime-host-bridge/src/index.test.ts`, `role-model-router/apps/runtime-ui/app/components/telemetry-charts.test.tsx`, `role-model-router/apps/runtime-ui/app/routes/request-detail.test.tsx` | Verification Surface: `03-implementation-summary.md` TDD Compliance Log, test logs | QA Surface: not-applicable-with-rationale
- R8 | Coverage: direct | Source Quote: Extend browser regression protection for real telemetry truth and chart geometry | Implementation Surface: `role-model-router/apps/runtime-ui/e2e/shared-surface-regression.spec.ts` | Verification Surface: Playwright run output | QA Surface: Agent-operated Playwright proof against rebuilt runtime
- R9 | Coverage: direct | Source Quote: Require rebuilt-runtime browser verification on the implementation commit for both live telemetry truth and chart layout repair | Implementation Surface: `05-manual-qa.md` | Verification Surface: `05-manual-qa.md` execution record and evidence paths | QA Surface: Rebuilt runtime on non-`:3456` port with browser proof

## Plan Drift Check

- The plan stays within the L1 → L2 → L3 → L4 → L5 layering defined in the requirements.
- No route-local Kimi-only hacks are introduced; all repairs are at shared seams.
- No telemetry metric definitions are changed; only the truth source is repaired.
- No chart-library migration is planned; Recharts remains the shared primitive.
- The plan does not include historical telemetry backfill; it targets live normalization and live request surfaces.
- The exported layout contract is a new shared primitive, not a route-local wrapper.
- R4 is covered indirectly because it is a cross-layer constraint satisfied by the direct repairs. The rationale for indirect coverage is that R4 does not require a separate code change; it is enforced by keeping the existing metric formula unchanged and by performing all truth repairs at shared backend seams rather than route-local UI layers.

## Planned Changes by File

- `role-model-router/apps/runtime-host-bridge/src/index.ts`
  - Extend `readOpenAIPromptCacheRequest` to synthesize fallback keys and add `source` provenance.
  - Update `toCacheContinuityScopeDescriptor` to consume synthesized keys.
- `role-model-router/packages/provider-openai/src/index.ts`
  - Add `usageExtractionPaths` fallback list for streamed usage.
  - Accumulate usage across stream chunks.
  - Add token estimate fallback and provenance labels.
- `role-model-router/apps/runtime-ui/app/components/telemetry-charts.tsx`
  - Export `telemetryChartLayoutContract`.
  - Use contract margins and axis widths.
  - Add dual-axis support to area and bar charts.
  - Add legend inset.
- `role-model-router/apps/runtime-ui/app/lib/design-system.ts`
  - Host the exported `telemetryChartLayoutContract` type/object if not exported from `telemetry-charts.tsx`.
- `role-model-router/apps/runtime-ui/app/routes/request-detail.tsx`
  - Render token provenance labels and `unavailable` state.
- `role-model-router/packages/provider-openai/test/index.test.ts`
  - Add stream-usage and fallback tests.
- `role-model-router/apps/runtime-host-bridge/src/index.test.ts`
  - Add prompt-cache synthesis and provenance tests.
- `role-model-router/apps/runtime-ui/app/components/telemetry-charts.test.tsx`
  - Add layout contract, dual-axis, clipping, and legend tests.
- `role-model-router/apps/runtime-ui/app/routes/request-detail.test.tsx`
  - Add token provenance rendering tests.
- `role-model-router/apps/runtime-ui/e2e/shared-surface-regression.spec.ts`
  - Add chart geometry and token-truth browser regressions.

## Implementation Steps

1. **L2 provider-openai**
   - Write failing tests for nested `choices[0].usage` parsing and absent-usage fallback.
   - Implement the usage extraction fallback list and accumulation.
   - Implement the token estimate fallback and provenance labels.
   - Run tests until green.
2. **L1 runtime-host-bridge**
   - Write failing tests for explicit cache key forwarding, synthesized key generation, capability exclusion, and provenance.
   - Extend `readOpenAIPromptCacheRequest` with synthesis logic.
   - Update `toCacheContinuityScopeDescriptor`.
   - Run tests until green.
3. **L3 request-detail**
   - Write failing tests for provenance label rendering and unavailable state.
   - Update `request-detail.tsx` to consume the new provenance fields.
   - Run tests until green.
4. **L4 shared chart geometry**
   - Write failing tests for exported contract, dual-axis area/bar, clipping guard, and legend inset.
   - Export `telemetryChartLayoutContract` and update chart components.
   - Run tests until green.
5. **L5 e2e regression**
   - Add deterministic Playwright assertions for chart geometry and token-truth surfaces.
6. **Phase 5 QA**
   - Rebuild the runtime on a dedicated port and capture browser evidence.

## Implementation Sub-phases

- Sub-phase 1: L2 provider-openai truth repair (R2, R3 data path)
- Sub-phase 2: L1 runtime-host-bridge request shaping (R1)
- Sub-phase 3: L3 request-detail display truth (R3 UI path)
- Sub-phase 4: L4 shared chart geometry (R5, R6)
- Sub-phase 5: L5 e2e and QA (R7, R8, R9)

## Testing Strategy

- TDD Mode: strict
- Every production-code change is preceded by a failing test in the owning package.
- RED-GREEN evidence paths are recorded in `03-implementation-summary.md` under the TDD Compliance Log.
- Package-level tests run before integration tests.
- Playwright tests run against a rebuilt runtime with deterministic QA seeding.

## Playwright Plan (if applicable)

- Update `role-model-router/apps/runtime-ui/e2e/shared-surface-regression.spec.ts` with:
  - Single-axis chart assertion: no clipped labels and no negative-margin overflow.
  - Dual-axis chart assertion: separate left and right Y axes with visible labels.
  - Legend assertion: legend items are inset from the card border.
  - Request-detail assertion: token count is non-zero or labeled `estimated`/`unavailable`; `promptCacheRequested` is `true` for cache-supporting requests.
- Use `start-for-qa.ts` and `testdata/router-runtime/fixtures` to seed deterministic data.
- Run against a non-`:3456` port.

## Manual QA Scenarios

- Scenario 1: Send a Kimi-compatible chat-completion request without `prompt_cache_key`. Verify request detail shows `promptCacheRequested: true` and the synthesized provenance label.
- Scenario 2: Send a streaming request with final usage under `choices[0].usage`. Verify request detail shows non-zero token usage and the correct provenance label.
- Scenario 3: Send a request where usage is absent. Verify request detail shows `estimated` or `unavailable` token count, not `0`.
- Scenario 4: Visit Overview `Cache Efficiency` and Observe `Cache Efficiency Trend`. Verify left-axis labels are fully visible, right-axis labels are present, and legends are inset.
- Scenario 5: Visit other shared time-series charts (latency, success/failure). Verify they inherit the repaired layout contract without route-local overrides.

## Idempotence and Recovery

- Prompt-cache synthesis is deterministic: the same conversation/session id produces the same key.
- Token estimate fallback is isolated and cannot corrupt execution or telemetry aggregation.
- Chart layout contract defaults are shared; route-level overrides are not required.
- If Playwright seeding fails, the package-level TDD tests still protect the contracts.
- The runtime can be restarted on the same port without changing the seeded state used for QA.

## Gaps Found

None. Addendum 01 records the original plan's underspecified contracts, and authoritative addendum 02 supplies the executable remediation plan for all of them.

## Earlier Phase Reconciliation

- `00-requirements.md` is LOCKED and unchanged.
- `00-worktree.md` is LOCKED and unchanged.
- `01-as-is.md` is LOCKED. No contradictions were found during planning.
- `01.5-root-cause.md` is LOCKED and identifies RC1-RC6 across L1-L5.
- All defects G1-G13 from `01-as-is.md` remain in scope and are refined by `A73-01` through `A73-08`.
- Addenda 01 and 02 are effective inputs. Where the original plan is less specific, addendum 02 SP0-SP8 controls implementation, verification, rebuilt-runtime QA, and closeout.

## Subagent Contribution Verification

- No subagent was used for this phase.
- Subagent Availability: unavailable.
- Main-Agent Verification Performed: N/A.
- Acceptance Decision: N/A.
- Repair Performed After Verification: N/A.

## Repair Work Performed

- No product code was changed in this phase. This is the TO-BE planning artifact.

## Requirement Completion Status

- R1 | Status: planned | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/index.ts` | Verification Surface: `role-model-router/apps/runtime-host-bridge/src/index.test.ts` | QA Surface: Rebuilt-runtime request detail for Kimi-compatible request without caller key
- R2 | Status: planned | Implementation Surface: `role-model-router/packages/provider-openai/src/index.ts` | Verification Surface: `role-model-router/packages/provider-openai/test/index.test.ts` | QA Surface: Rebuilt-runtime telemetry showing non-zero usage for nested-usage stream
- R3 | Status: planned | Implementation Surface: `role-model-router/packages/provider-openai/src/index.ts`, `role-model-router/apps/runtime-ui/app/routes/request-detail.tsx` | Verification Surface: `role-model-router/packages/provider-openai/test/index.test.ts`, `role-model-router/apps/runtime-ui/app/routes/request-detail.test.tsx` | QA Surface: Rebuilt-runtime request detail showing estimated or unavailable token count instead of false-zero
- R4 | Status: planned-indirectly | Implementation Surface: `role-model-router/apps/runtime-ui/app/lib/telemetry-analytics.ts` | Verification Surface: `role-model-router/apps/runtime-ui/app/lib/telemetry-analytics.test.ts` | QA Surface: Observe `cacheHitTokenRate` chart remains correct after truth-source repair | Rationale: The existing formula is preserved; truthful input tokens make it produce correct values without changing the definition.
- R5 | Status: planned | Implementation Surface: `role-model-router/apps/runtime-ui/app/components/telemetry-charts.tsx`, `role-model-router/apps/runtime-ui/app/lib/design-system.ts` | Verification Surface: `role-model-router/apps/runtime-ui/app/components/telemetry-charts.test.tsx` | QA Surface: Browser regression confirming shared contract defaults across chart kinds
- R6 | Status: planned | Implementation Surface: `role-model-router/apps/runtime-ui/app/components/telemetry-charts.tsx` | Verification Surface: `role-model-router/apps/runtime-ui/app/components/telemetry-charts.test.tsx` | QA Surface: Screenshots of fully visible axes and inset legends
- R7 | Status: planned | Implementation Surface: `role-model-router/packages/provider-openai/test/index.test.ts`, `role-model-router/apps/runtime-host-bridge/src/index.test.ts`, `role-model-router/apps/runtime-ui/app/components/telemetry-charts.test.tsx`, `role-model-router/apps/runtime-ui/app/routes/request-detail.test.tsx` | Verification Surface: `03-implementation-summary.md` TDD Compliance Log, test logs | QA Surface: not-applicable-with-rationale
- R8 | Status: planned | Implementation Surface: `role-model-router/apps/runtime-ui/e2e/shared-surface-regression.spec.ts` | Verification Surface: Playwright run output | QA Surface: Agent-operated Playwright proof against rebuilt runtime
- R9 | Status: planned | Implementation Surface: `05-manual-qa.md` | Verification Surface: `05-manual-qa.md` execution record and evidence paths | QA Surface: Rebuilt runtime on non-`:3456` port with browser proof

## Traceability

- R1/R4 → run 65 prompt-cache continuity, run 70 cache-efficiency metric definition
- R2/R3 → run 65 OpenAI-family normalization, run 63 telemetry analytics ownership
- R5/R6 → run 60 Paper/Linear design-system baseline, run 70 split-axis cache-efficiency chart
- R7/R8/R9 → run 51 testing architecture, run 63 browser regression expectations, run 65 rebuilt-runtime verification discipline

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `11461400640736ab86d9340045bc1f90c102b464`
- Comparison reference: `working-tree`
- Normalized baseline: `11461400640736ab86d9340045bc1f90c102b464`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 11461400640736ab86d9340045bc1f90c102b464`
- Planned or claimed changed files:
  - `role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `role-model-router/packages/provider-openai/src/index.ts`
  - `role-model-router/apps/runtime-ui/app/components/telemetry-charts.tsx`
  - `role-model-router/apps/runtime-ui/app/lib/design-system.ts`
  - `role-model-router/apps/runtime-ui/app/routes/request-detail.tsx`
  - `role-model-router/packages/provider-openai/test/index.test.ts`
  - `role-model-router/apps/runtime-host-bridge/src/index.test.ts`
  - `role-model-router/apps/runtime-ui/app/components/telemetry-charts.test.tsx`
  - `role-model-router/apps/runtime-ui/app/routes/request-detail.test.tsx`
  - `role-model-router/apps/runtime-ui/e2e/shared-surface-regression.spec.ts`
- Actual changed files reviewed: none (Phase 2 is planning-only)
- Unexplained drift: none

## Audit Verdict

Audit: PASS
- The TO-BE plan directly addresses every in-scope requirement from `00-requirements.md`, maps each to concrete implementation/verification/QA surfaces, and preserves the required layering and ownership boundaries.

## Coverage Gate

- [x] Every in-scope R1-R9 requirement is mapped in `## Requirement Mapping` with implementation, verification, and QA surfaces.
- [x] `## Plan Drift Check` confirms no scope expansion or ownership violations.
- [x] Prior recursive evidence is reviewed and preserved.
- [x] Worktree diff basis is recorded and matches `00-worktree.md`.
- [x] Audit passed.

Coverage: PASS

## Approval Gate

- [x] The TO-BE plan is complete and ready for Phase 3 implementation under strict TDD.
- [x] No unresolved plan gaps remain.
- [x] Audit passed.

Approval: PASS
