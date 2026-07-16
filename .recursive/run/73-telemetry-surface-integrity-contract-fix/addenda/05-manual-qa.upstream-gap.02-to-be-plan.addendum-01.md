Run: `/.recursive/run/73-telemetry-surface-integrity-contract-fix/`
Phase: `05 Manual QA`
Status: `LOCKED`
LockedAt: `2026-07-16T20:42:42Z`
LockHash: `f4e5c73f9d2c5a5869f4460a08222e2726b94454e69ce708e316429ac240a59c`
Workflow version: `recursive-mode-audit-v2`
Addendum type: `upstream-gap audit findings`
Prior artifact with gap: `02-to-be-plan.md`, as reflected in `03-implementation-summary.md` and `04-test-summary.md`
Inputs:
- `/.recursive/run/73-telemetry-surface-integrity-contract-fix/00-requirements.md` (LOCKED)
- `/.recursive/run/73-telemetry-surface-integrity-contract-fix/01-as-is.md` (LOCKED)
- `/.recursive/run/73-telemetry-surface-integrity-contract-fix/02-to-be-plan.md` (LOCKED)
- `/.recursive/run/73-telemetry-surface-integrity-contract-fix/03-implementation-summary.md` (LOCKED)
- `/.recursive/run/73-telemetry-surface-integrity-contract-fix/04-test-summary.md` (LOCKED)
- `/.recursive/run/73-telemetry-surface-integrity-contract-fix/05-manual-qa.md` (DRAFT)
- implementation audit executed on `2026-07-17`
Outputs:
- `/.recursive/run/73-telemetry-surface-integrity-contract-fix/addenda/05-manual-qa.upstream-gap.02-to-be-plan.addendum-01.md`
- `/.recursive/run/73-telemetry-surface-integrity-contract-fix/addenda/05-manual-qa.upstream-gap.02-to-be-plan.addendum-02.md`

Scope note: This addendum records defects found while auditing the run-73 implementation against the locked R1-R9 contract. It does not widen scope. It corrects overstated Phase 3 and Phase 4 completion claims and blocks Phase 5 until the repair plan is implemented and reverified.

## TODO

- [x] Record every implementation and verification defect found by the audit
- [x] Map each defect to R1-R9 and concrete code or artifact evidence
- [x] Distinguish passing focused checks from unmet acceptance criteria
- [x] State the implications for locked Phase 3 and Phase 4 claims
- [x] Define the current-phase compensation path
- [x] Complete the addendum coverage and approval gates

## Audit Context

- Audit date: `2026-07-17`
- Audit execution mode: `self-audit`
- Subagent availability: unavailable; the worktree has no current router discovery inventory and no native subagent tool is exposed
- Diff basis: baseline `11461400640736ab86d9340045bc1f90c102b464` compared with the run-73 working tree
- Browser harness used for independent audit: Playwright QA runtime on `127.0.0.1:3462`
- Non-interference check: the existing runtime on `127.0.0.1:3456`, PID `4640`, remained untouched; the audit-owned `:3462` process was stopped after the run
- Product-code changes made by this audit: none

## Overall Verdict

Implementation audit: `FAIL`

The implementation compiles and several focused tests pass, but it does not satisfy the complete R1-R9 contract. Phase 5 must not proceed as QA-only work because repairs to production code, tests, and workflow receipts are required first.

## Findings

| Finding | Severity | Requirements | Disposition |
|---|---|---|---|
| `A73-01` Prompt-cache synthesis lacks message-hash fallback, capability gating, and operator-visible provenance | P1 | R1, R4, R7 | blocking |
| `A73-02` Token provenance is dropped before persistence and the UI relabels stored numeric values as measured | P1 | R3, R4, R7, R8 | blocking |
| `A73-03` Added browser chart regression fails and does not render deterministic populated chart geometry | P1 | R6, R8 | blocking |
| `A73-04` Mandatory rebuilt-runtime verification has not run | P1 | R9 | blocking |
| `A73-05` Strict TDD was not followed for chart, design-system, and request-detail production changes | P1 | R7 | blocking |
| `A73-06` Shared chart layout contract remains fixed-width, incompletely named, undocumented, and partly unused | P2 | R5, R6, R7 | blocking |
| `A73-07` Streamed usage regression matrix omits nested `tool_calls` and final-wire assertions | P2 | R2, R7 | blocking |
| `A73-08` Recursive workflow sequencing and lock evidence are inconsistent | P2 | R7, R8, R9 | blocking |

## Finding Details

### `A73-01` Prompt-cache request contract remains incomplete

Evidence:

- `role-model-router/apps/runtime-host-bridge/src/index.ts:588` synthesizes only from `requestOptions.sessionId` or `body.conversation_id`.
- No stable hash of the system prompt and ordered messages is implemented when continuity identifiers are absent.
- `mapChatCompletionsRequest` and `mapResponsesRequest` call synthesis before a selected target capability is available and do not consult `promptCaching.supported`.
- `PromptCacheRequest.source` exists in the execution type, but no persisted request-detail, telemetry, or diagnostic contract carries `explicit` versus `synthesized` provenance.
- Existing tests cover a Kimi session-id case and explicit-key authority only. They do not cover hash fallback, unsupported capability exclusion, persisted provenance, or exact-model plus alias-backed execution.

Implication:

- R1 is not implemented. Requests without a session/conversation id still receive no synthesized key, and unsupported transports can be marked as cache-requested before capability negotiation.

### `A73-02` Token truth source does not survive into operator surfaces

Evidence:

- `role-model-router/packages/provider-openai/src/index.ts:396` estimates from logical messages rather than the actual outbound provider request capture.
- `role-model-router/packages/adapter-execution/src/index.ts:204` adds an optional `usage.source`, but `createUsageEvent` at line 636 persists only token numbers.
- The canonical `UsageEvent` schema has no token-provenance or availability field.
- `role-model-router/apps/runtime-ui/app/routes/request-detail.tsx:195` defaults any persisted numeric token field to `measured`, so an estimated provider value is presented with false provenance.
- An unavailable estimate can still collapse to numeric zero before persistence, leaving downstream analytics unable to distinguish genuine zero from unavailable.

Implication:

- R3 and R4 are not implemented. Provenance does not travel with the fact, the UI infers truth locally, and unavailable or estimated values can silently affect telemetry semantics.

### `A73-03` Browser regression protection is failing and non-probative

Evidence:

- Audit command:
  - `corepack pnpm --filter @role-model-router/runtime-ui exec playwright test e2e/shared-surface-regression.spec.ts --grep "renders shared time-series|renders request detail" --reporter=line`
- Result: one failed, one passed.
- The chart test at `shared-surface-regression.spec.ts:107` searches for an `article`; `TelemetryChartCard` renders a `section`.
- The QA runtime contained no telemetry rows, so the page rendered empty states instead of axes, plots, or legends.
- The chart test does not measure label clipping, legend inset, plot centering, or right-side reserve.
- The request-detail test selects the first ambient request and passed against a pre-execution failure with `Tokens: n/a`; it did not prove measured or estimated token truth.

Implication:

- R8 is not verified and its current test cannot catch the reported regressions.

### `A73-04` Rebuilt-runtime verification is pending

Evidence:

- `05-manual-qa.md` remains `DRAFT`.
- Its execution record states that the rebuilt runtime has not been started.
- No implementation commit, rebuilt-runtime startup command, dedicated verification port, request ids, browser routes, or screenshots are recorded.
- The source-based QA Playwright harness on `:3462` is not the rebuilt packaged runtime required by R9.

Implication:

- R9 remains blocked. There is no equivalent-environment fallback.

### `A73-05` Strict TDD evidence is invalid for UI repairs

Evidence:

- `03-implementation-summary.md` treats a syntax error introduced while editing the design-system export as the chart RED state.
- No failing owning test preceded the chart, design-system, or request-detail production changes.
- `telemetry-charts.test.tsx` was not changed by run 73.
- The added Playwright cases were not executed before Phase 4 was marked locked.

Implication:

- R7's strict TDD gate is not satisfied. The unverified production slices must be reworked under a real RED-GREEN-REFACTOR cycle.

### `A73-06` Shared chart layout contract remains brittle

Evidence:

- `telemetryChartLayoutContract` uses fixed `48` pixel axis widths and fixed margins for all datasets.
- It does not expose the required canonical field names `leftAxisGutter`, `rightAxisReserve`, `legendInset`, `plotMargin`, and `plotHeight` as one coherent contract.
- `plotHeight` is exported but chart components still hard-code `h-[280px]`.
- Right-axis reserve is not derived from formatted labels, so excess blank space or clipping can recur as values change.
- `ChartLegendContent` always reads the single-axis legend inset.
- Neither `DESIGN_SYSTEM.md` nor `docs/architecture/11-runtime-ui-telemetry-graph-matrix.md` documents the contract.
- There are no new unit assertions for area/bar dual axes, gutter/margin coupling, wide ticks, fractional right ticks, zero boundaries, legend inset, or ranking-chart compatibility.

Implication:

- R5 is partial and R6 is unverified. The original systematic design defects can recur for wider labels or future chart consumers.

### `A73-07` Usage-shape regression matrix is incomplete

Evidence:

- Provider normalization now reads `choices[0].usage`, and the focused provider suite passes.
- The only new nested-usage regression ends with `finish_reason: "stop"`.
- No nested final-usage regression ends with `finish_reason: "tool_calls"`.
- No new test asserts the final streamed provider wire request contains the expected usage-enabling shape together with a synthesized `prompt_cache_key`.

Implication:

- R2 is only partially verified, and R7's required matrix is incomplete.

### `A73-08` Recursive evidence cannot support closeout

Evidence:

- This bug-fix run has no mandatory `01.5-root-cause.md` despite the recursive-debugging contract.
- `04-test-summary.md` has `LockedAt: 2026-07-16T13:33:06Z`, earlier than Phase 3's `LockedAt: 2026-07-16T13:34:52Z`.
- Phase 4 records `No Playwright execution` but marks R8 `verified`.
- Phase 4 has no lock receipt in the run's `locks/` directory.
- Recursive lint fails while Phase 5 remains pending, and full lock verification cannot pass until Phases 5-8 are complete.

Implication:

- The current lock chain and completion statuses cannot be relied upon. Workflow recovery must precede implementation repair.

## Independent Verification Results

| Check | Result |
|---|---|
| Runtime UI production build | PASS |
| Provider-openai focused suite | PASS, 25 tests |
| Runtime-host alias capability suite | PASS, 5 tests |
| Existing telemetry chart unit suite | PASS, 10 tests |
| Added targeted Playwright cases | FAIL, 1 failed and 1 passed |
| `git diff --check` | PASS, line-ending warnings only |
| Existing runtime on `:3456` preserved | PASS |

Passing build and focused unit checks prove that the current changes compile and preserve selected existing behavior. They do not satisfy the missing acceptance criteria above.

## Requirement Completion Status

- R1 | Status: blocked | Blocking Evidence: `A73-01` | Addendum: this file
- R2 | Status: blocked | Blocking Evidence: `A73-07` | Addendum: this file
- R3 | Status: blocked | Blocking Evidence: `A73-02` | Addendum: this file
- R4 | Status: blocked | Blocking Evidence: `A73-01`, `A73-02` | Addendum: this file
- R5 | Status: blocked | Blocking Evidence: `A73-06` | Addendum: this file
- R6 | Status: blocked | Blocking Evidence: `A73-03`, `A73-06` | Addendum: this file
- R7 | Status: blocked | Blocking Evidence: `A73-05`, `A73-06`, `A73-07` | Addendum: this file
- R8 | Status: blocked | Blocking Evidence: `A73-03` | Addendum: this file
- R9 | Status: blocked | Blocking Evidence: `A73-04` | Addendum: this file

## Current-Phase Compensation

- Phase 5 remains blocked and must not be locked.
- The implementation repair is defined in `05-manual-qa.upstream-gap.02-to-be-plan.addendum-02.md`.
- The repair workflow must reopen the earliest invalid phase, restore the missing root-cause gate, execute strict TDD repairs, rerun Phase 4 verification, and only then resume rebuilt-runtime QA.
- Locked base artifacts remain unchanged until the canonical reopen command is intentionally executed during remediation.

## Traceability

- `A73-01` -> R1, R4, R7
- `A73-02` -> R3, R4, R7, R8
- `A73-03` -> R6, R8
- `A73-04` -> R9
- `A73-05` -> R7
- `A73-06` -> R5, R6, R7
- `A73-07` -> R2, R7
- `A73-08` -> R7, R8, R9 and recursive workflow recovery

## Audit Verdict

Addendum audit: PASS

The implementation verdict remains FAIL. Every finding is mapped to requirements, evidence, implications, and a blocking disposition.

## Coverage Gate

- [x] Every audit finding is recorded with severity and evidence
- [x] Every finding is mapped to R1-R9
- [x] Passing checks and failing acceptance criteria are distinguished
- [x] Locked Phase 3 and Phase 4 overclaims are corrected without editing them
- [x] The current-phase compensation path is explicit

Coverage: PASS

## Approval Gate

- [x] The addendum is complete enough to serve as an authoritative remediation input
- [x] No implementation or verification gap is silently deferred
- [x] Phase 5 is explicitly blocked pending repair
- [x] The implementation-plan addendum owns the next executable steps

Approval: PASS
