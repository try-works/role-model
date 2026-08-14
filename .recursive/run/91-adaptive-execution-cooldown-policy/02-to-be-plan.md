Run: `/.recursive/run/91-adaptive-execution-cooldown-policy/`
Phase: `02 TO-BE Plan`
Status: `LOCKED`
LockedAt: `2026-08-14T08:33:13Z`
LockHash: `16fb984a6fb03caffb3f3c8f4181ef4d9429328a8329ab41802658060ca69186`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/91-adaptive-execution-cooldown-policy/00-requirements.md`
- `/.recursive/run/91-adaptive-execution-cooldown-policy/00-worktree.md`
- `/.recursive/run/91-adaptive-execution-cooldown-policy/01-as-is.md`
- `/.recursive/run/91-adaptive-execution-cooldown-policy/01.5-root-cause.md`
Outputs:
- `/.recursive/run/91-adaptive-execution-cooldown-policy/02-to-be-plan.md`
Scope note: Plan one runtime-host-owned adaptive circuit breaker and its existing telemetry/UI projections without creating another package or service.

## TODO

- [x] Map R1-R11 to implementation, verification, and QA surfaces
- [x] Define the v2 state machine and conservative v1 migration
- [x] Define strict RED-first slices before production edits
- [x] Define focused and full validation floors
- [x] Reconcile the plan with locked root causes and release constraints

## Audit Context

- Audit Execution Mode: `self-audit`
- Subagent Availability: `unavailable`
- Subagent Capability Probe: `Active system instructions disallow spawning collaborators for this task.`
- Delegation Decision Basis: `The controller owns a bounded in-package plan derived from locked RC1-RC6.`
- Audit Inputs Provided: `Locked requirements/worktree/AS-IS/root cause, current runtime-host/observability/UI code, tests, and release policy.`

## Effective Inputs Re-read

- `.recursive/run/91-adaptive-execution-cooldown-policy/00-requirements.md`
- `.recursive/run/91-adaptive-execution-cooldown-policy/00-worktree.md`
- `.recursive/run/91-adaptive-execution-cooldown-policy/01-as-is.md`
- `.recursive/run/91-adaptive-execution-cooldown-policy/01.5-root-cause.md`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/src/benchmark-runner.ts`
- `role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `role-model-router/packages/runtime-observability/src/index.ts`
- `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- `role-model-router/apps/runtime-ui/app/lib/view-models.ts`
- `role-model-router/apps/runtime-ui/app/routes/providers.tsx`

## Planned Changes by File

### `role-model-router/apps/runtime-host-bridge/src/execution-circuit-breaker.ts` (new module in the existing package)

- Own v2 types, bounded parser/serializer, v1 retirement migration, failure-class policy, decay, success clear, half-open claim/release, receipt projection, and Retry-After parsing.
- Represent absent state as healthy; persisted states are probation/open/half_open/blocked_auth/blocked_quota.
- Keep only safe identifiers, error class/category, counts, and timestamps; omit raw error/request/response/credential material.

### `role-model-router/apps/runtime-host-bridge/src/index.ts`

- Replace v1 read/write/record/deny helpers with the v2 module while retaining the same `memory_maintenance` authority.
- Add `executionTrafficClass` to request options (default live); benchmark runner marks benchmark traffic and non-live failures never mutate live state.
- Preserve one immediate retry except rate limits; pass validated direct-HTTP Retry-After into classification/policy.
- Claim an expired open endpoint immediately after routing selects it and before provider I/O; reroute/refuse when another request owns the probe.
- Clear state on success and supported credential/account replacement; release abandoned probe ownership safely.
- Emit truthful 503 temporary/configuration-blocked errors with safe next-probe metadata.

### `role-model-router/apps/runtime-host-bridge/src/benchmark-runner.ts`

- Mark subject, judge, compare, and probe requests as `executionTrafficClass: benchmark` while preserving the existing deny-list bypass.

### `role-model-router/packages/runtime-observability/src/index.ts`

- Extend the existing cooldown receipt compatibly with `schemaVersion`, `circuitState`, `failureCategory`, optional `nextProbeAtMs`/`retryAfterMs`, and safe source identifiers.
- Keep legacy field names optional where existing telemetry consumers still rely on them.

### `role-model-router/apps/runtime-host-bridge/test/execution-circuit-breaker.test.ts` (new test)

- Own deterministic policy, decay, migration, bounded persistence, and half-open transition tests.

### `role-model-router/apps/runtime-host-bridge/test/index.test.ts`

- Replace the legacy schedule and immediate-denial expectations with live integration coverage for probation, second-failure open, fallback, 503 metadata, benchmark isolation, success clear, auth/quota blocks, and endpoint API receipts.

### `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`

- Carry the extended existing `executionCooldown` receipt on `RuntimeEndpoint`.

### `role-model-router/apps/runtime-ui/app/lib/view-models.ts` and `view-models.test.ts`

- Project provider health separately from circuit label/tone/detail/countdown and cover every state deterministically.

### `role-model-router/apps/runtime-ui/app/routes/providers.tsx`

- Render a second circuit badge/detail only when non-healthy state exists; preserve the existing health badge.

## Source Requirement Inventory

- R1 | Disposition: in-scope | Source Quote: Classify failures before changing endpoint eligibility | Summary: Class-aware decision and traffic isolation.
- R2 | Disposition: in-scope | Source Quote: Use a short adaptive connection/timeout policy | Summary: Probation and short capped ladder.
- R3 | Disposition: in-scope | Source Quote: Use failure-class-specific provider and rate-limit policy | Summary: 5xx ladder and bounded Retry-After.
- R4 | Disposition: in-scope | Source Quote: Block authentication and quota failures explicitly | Summary: Explicit configuration/account blocks.
- R5 | Disposition: in-scope | Source Quote: Implement explicit circuit lifecycle and half-open probing | Summary: One-probe state machine and reset.
- R6 | Disposition: in-scope | Source Quote: Preserve fallback routing and return truthful refusal semantics | Summary: Existing fallback plus truthful 503.
- R7 | Disposition: in-scope | Source Quote: Persist a versioned breaker schema and migrate v1 safely | Summary: v2 bounded maintenance state.
- R8 | Disposition: in-scope | Source Quote: Expose breaker state through existing runtime telemetry APIs | Summary: Extend current receipt.
- R9 | Disposition: in-scope | Source Quote: Update the existing remote-provider UI | Summary: Separate health/circuit rendering.
- R10 | Disposition: quality-gate | Source Quote: Verify behavior with deterministic local tests | Summary: Strict tests without paid load.
- R11 | Disposition: quality-gate | Source Quote: Validate a stage release candidate before production promotion | Summary: Local CI then stage RC only.

## Requirement Mapping

- R1 | Coverage: direct | Source Quote: Classify failures before changing endpoint eligibility | Implementation Surface: role-model-router/apps/runtime-host-bridge/src/execution-circuit-breaker.ts, role-model-router/apps/runtime-host-bridge/src/index.ts | Verification Surface: role-model-router/apps/runtime-host-bridge/test/execution-circuit-breaker.test.ts, role-model-router/apps/runtime-host-bridge/test/index.test.ts | QA Surface: .recursive/run/91-adaptive-execution-cooldown-policy/05-manual-qa.md
- R2 | Coverage: direct | Source Quote: Use a short adaptive connection/timeout policy | Implementation Surface: role-model-router/apps/runtime-host-bridge/src/execution-circuit-breaker.ts | Verification Surface: role-model-router/apps/runtime-host-bridge/test/execution-circuit-breaker.test.ts | QA Surface: .recursive/run/91-adaptive-execution-cooldown-policy/05-manual-qa.md
- R3 | Coverage: direct | Source Quote: Use failure-class-specific provider and rate-limit policy | Implementation Surface: role-model-router/apps/runtime-host-bridge/src/execution-circuit-breaker.ts, role-model-router/apps/runtime-host-bridge/src/index.ts | Verification Surface: role-model-router/apps/runtime-host-bridge/test/execution-circuit-breaker.test.ts, role-model-router/apps/runtime-host-bridge/test/index.test.ts | QA Surface: .recursive/run/91-adaptive-execution-cooldown-policy/05-manual-qa.md
- R4 | Coverage: direct | Source Quote: Block authentication and quota failures explicitly | Implementation Surface: role-model-router/apps/runtime-host-bridge/src/execution-circuit-breaker.ts, role-model-router/apps/runtime-host-bridge/src/index.ts | Verification Surface: role-model-router/apps/runtime-host-bridge/test/execution-circuit-breaker.test.ts, role-model-router/apps/runtime-host-bridge/test/index.test.ts | QA Surface: .recursive/run/91-adaptive-execution-cooldown-policy/05-manual-qa.md
- R5 | Coverage: direct | Source Quote: Implement explicit circuit lifecycle and half-open probing | Implementation Surface: role-model-router/apps/runtime-host-bridge/src/execution-circuit-breaker.ts, role-model-router/apps/runtime-host-bridge/src/index.ts | Verification Surface: role-model-router/apps/runtime-host-bridge/test/execution-circuit-breaker.test.ts, role-model-router/apps/runtime-host-bridge/test/index.test.ts | QA Surface: .recursive/run/91-adaptive-execution-cooldown-policy/05-manual-qa.md
- R6 | Coverage: direct | Source Quote: Preserve fallback routing and return truthful refusal semantics | Implementation Surface: role-model-router/apps/runtime-host-bridge/src/index.ts | Verification Surface: role-model-router/apps/runtime-host-bridge/test/index.test.ts | QA Surface: .recursive/run/91-adaptive-execution-cooldown-policy/05-manual-qa.md
- R7 | Coverage: direct | Source Quote: Persist a versioned breaker schema and migrate v1 safely | Implementation Surface: role-model-router/apps/runtime-host-bridge/src/execution-circuit-breaker.ts, role-model-router/apps/runtime-host-bridge/src/index.ts | Verification Surface: role-model-router/apps/runtime-host-bridge/test/execution-circuit-breaker.test.ts | QA Surface: .recursive/run/91-adaptive-execution-cooldown-policy/04-test-summary.md
- R8 | Coverage: direct | Source Quote: Expose breaker state through existing runtime telemetry APIs | Implementation Surface: role-model-router/packages/runtime-observability/src/index.ts, role-model-router/apps/runtime-host-bridge/src/index.ts | Verification Surface: role-model-router/apps/runtime-host-bridge/test/index.test.ts | QA Surface: .recursive/run/91-adaptive-execution-cooldown-policy/05-manual-qa.md
- R9 | Coverage: direct | Source Quote: Update the existing remote-provider UI | Implementation Surface: role-model-router/apps/runtime-ui/app/lib/runtime-api.ts, role-model-router/apps/runtime-ui/app/lib/view-models.ts, role-model-router/apps/runtime-ui/app/routes/providers.tsx | Verification Surface: role-model-router/apps/runtime-ui/app/lib/view-models.test.ts, role-model-router/apps/runtime-ui/app/routes/providers.test.ts | QA Surface: role-model-router/apps/runtime-ui/app/routes/providers.tsx, .recursive/run/91-adaptive-execution-cooldown-policy/05-manual-qa.md
- R10 | Coverage: direct | Source Quote: Verify behavior with deterministic local tests | Implementation Surface: role-model-router/apps/runtime-host-bridge/test/execution-circuit-breaker.test.ts, role-model-router/apps/runtime-host-bridge/test/index.test.ts, role-model-router/apps/runtime-ui/app/lib/view-models.test.ts | Verification Surface: .recursive/run/91-adaptive-execution-cooldown-policy/evidence/logs/red, .recursive/run/91-adaptive-execution-cooldown-policy/evidence/logs/green, .recursive/run/91-adaptive-execution-cooldown-policy/04-test-summary.md | QA Surface: .recursive/run/91-adaptive-execution-cooldown-policy/05-manual-qa.md
- R11 | Coverage: direct | Source Quote: Validate a stage release candidate before production promotion | Implementation Surface: .recursive/run/91-adaptive-execution-cooldown-policy/05-manual-qa.md | Verification Surface: .recursive/run/91-adaptive-execution-cooldown-policy/04-test-summary.md, .recursive/run/91-adaptive-execution-cooldown-policy/05-manual-qa.md | QA Surface: .recursive/run/91-adaptive-execution-cooldown-policy/05-manual-qa.md

## Implementation Steps

1. RED: add the pure v2 policy/state test file; confirm module/API absence or legacy semantics fail.
2. GREEN: implement v2 types, exact policy ladders, decay, migration, bounded parsing, receipts, and half-open transitions.
3. RED: update/add runtime-host integration assertions for benchmark isolation, rate-limit retry behavior, direct Retry-After, probation/open routing, one half-open probe, auth/quota blocks, success clear, and truthful 503.
4. GREEN: integrate the module into the existing maintenance state, execute loop, routing loop, endpoint API, and supported account/credential mutation seams.
5. RED: extend runtime UI endpoint/view-model tests for separate health/circuit state and countdown formatting.
6. GREEN: carry the receipt through runtime-api/view-model and render it in the existing providers route.
7. REFACTOR: remove obsolete v1 schedule/helpers and consolidate compatibility projection without changing behavior.
8. Run focused suites/builds, then full affected package suites and local CI-equivalent validation.
9. Run agent-operated rebuilt stage-style QA with deterministic provider doubles/fake clock; create no live provider load.

## Implementation Sub-phases

1. Policy kernel: strict RED/GREEN for the v2 state machine, ladders, decay, migration, persistence bounds, and half-open ownership.
2. Runtime integration: strict RED/GREEN for routing eligibility, request retry behavior, traffic isolation, receipts, and refusal semantics.
3. Provider UI: strict RED/GREEN for typed receipt propagation, distinct health/circuit presentation, and deterministic countdown text.
4. Refactor and validation: remove the obsolete v1 behavior, run affected suites/builds, then perform deterministic stage-style QA without live provider calls.

## Testing Strategy

TDD Mode: `strict`

### RED tests

- Pure policy/state: exact ladders/caps, connection probation window, five-minute reset, rate Retry-After/default/cap, auth/quota/invalid/non-live, success clear, one half-open claim, crash-safe half-open normalization, v1 retirement, corrupt/oversized input.
- Runtime integration: no immediate rate retry; first connection failure remains eligible; second opens; fallback remains eligible; sole temporary endpoint returns 503 with `endpoint_temporarily_unavailable`, `retryAfterMs`, and `nextProbeAtMs`; benchmark failure does not write live state.
- UI: endpoint receipt survives fetch typing and view-model mapping; health and circuit labels remain distinct; countdown formatting is bounded and deterministic.

### GREEN verification floor

- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/execution-circuit-breaker.test.ts`
- targeted `test/index.test.ts` names for breaker/fallback/auth/invalid behavior
- `corepack pnpm --filter @role-model-router/runtime-ui exec vitest run app/lib/view-models.test.ts app/routes/providers.test.ts app/lib/provider-account-state.test.ts`
- runtime-host and runtime-ui builds
- full runtime-host and runtime-ui suites once focused tests stabilize
- local `runtime:test-critical`, validators, and release-workflow checks before any push

## Manual QA Scenarios

QA Execution Mode: `agent-operated`

1. Start a freshly rebuilt stage-style QA runtime on a non-production port/state root.
2. Use a deterministic provider double to cause one `fetch failed`; confirm endpoint remains in probation and the next route reaches execution.
3. Cause a second failure inside 60 seconds; confirm 5-second open state, UI countdown, and truthful 503 when it is the only endpoint.
4. Advance the test clock, prove one half-open request executes while a concurrent request is locally deferred, then return success and confirm healthy/cleared state.
5. Exercise 5xx, rate-limit with/without Retry-After, auth, quota, invalid request, and benchmark traffic through deterministic doubles.
6. Capture endpoint API and `/app/remote/providers` proof showing provider health separately from circuit state.
7. Record that no new DeepSeek/provider calls were sent and no stage/main promotion occurred.

## Playwright Plan (if applicable)

Not applicable for the strict policy and view-model RED/GREEN slices. The final rebuilt provider-page proof will use the existing local runtime/UI QA surface; add Playwright only if the existing component/view-model tests cannot prove the rendered circuit state and countdown.

## Idempotence and Recovery

- v2 reads are deterministic; an absent v2 plus any v1 map writes one empty/retired v2 envelope and never renews legacy timers.
- Half-open claims store owner/start metadata; restart normalization reopens an abandoned claim for a fresh single probe rather than blocking forever.
- Success and explicit credential/account replacement clear state idempotently.
- Tests use injected timestamps and temporary SQLite roots; reruns do not depend on ambient runtime state.

## Plan Drift Check

- No new package, external service, queue, cache, or database is planned.
- No change to routing scores/catalog membership is planned; only eligibility changes.
- No paid/live provider load is planned.
- No direct stage/main promotion or production release is planned.
- If RED proves a vendor adapter needs a broader response-header contract, record an addendum before widening beyond the direct HTTP path.

## Known Unknowns Carried Forward

- Whether route-level half-open ownership needs a small request-scoped helper inside `index.ts` or can remain a direct module transition call.
- Which existing account mutation callbacks are the narrowest complete places to clear blocked-auth/quota state after explicit operator change.
- Whether a providers-route component test is necessary beyond pure view-model coverage and the final rebuilt UI proof.

## Traceability

- R1: failure classification and traffic isolation in the v2 module and runtime integration.
- R2: connection/timeout probation and capped ladder in deterministic policy tests.
- R3: provider 5xx and rate-limit ladders, Retry-After handling, and no same-endpoint rate retry.
- R4: explicit blocked-auth and blocked-quota states plus supported operator-change clears.
- R5: healthy/probation/open/half-open lifecycle, one-probe ownership, decay, and success clear.
- R6: fallback preservation and truthful 503 refusal metadata in runtime routing integration.
- R7: bounded v2 persistence and conservative v1 retirement migration.
- R8: runtime-observability and endpoint API circuit receipt projection.
- R9: runtime-api/view-model/providers route health/circuit separation.
- R10: strict RED/GREEN matrix, affected builds, and local CI-equivalent validation.
- R11: deterministic stage-style QA before any stage RC or production promotion.

## Gaps Found

None. RC1-RC6 and every R1-R11 acceptance surface are planned without widening infrastructure or live load.

## Repair Work Performed

None. This artifact defines implementation order and verification before Phase 3 production changes.

## Audit Verdict

Audit: PASS

The plan uses one existing-package circuit module, the current maintenance authority, current telemetry receipt, and current provider UI; it directly addresses every confirmed root cause.

## Earlier Phase Reconciliation

- `01-as-is.md` identified the current classifier/retry strengths and v1 persistence/routing/UI gaps.
- `01.5-root-cause.md` confirmed fallback/breaker conflation as the primary cause and named RC1-RC6.
- This plan preserves the current classifier and fallback algorithm while replacing only future eligibility semantics and its projections.
- The Phase 0 diff basis remains unchanged.

## Prior Recursive Evidence Reviewed

- `.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
- `.recursive/memory/domains/benchmark-scoring-and-grading-contracts.md`
- `.recursive/run/64-observed-data-decay-policy-recalibration/`

## Subagent Contribution Verification

- Reviewed Action Records: none.
- Main-Agent Verification Performed: direct reconciliation of all locked inputs and planned files.
- Acceptance Decision: not applicable.
- Repair Performed After Verification: none.

## Worktree Diff Audit

- Baseline type: `remote ref`
- Baseline reference: `origin/dev`
- Comparison reference: `working-tree`
- Normalized baseline: `b5329e49972bad210f78d04cc957ee9238c42ab8`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only b5329e49972bad210f78d04cc957ee9238c42ab8`
- Current drift is limited to run-91 artifacts/evidence; product implementation has not begun.
- Unexplained drift: none.

## Requirement Completion Status

- R1 | Status: planned | Implementation Surface: role-model-router/apps/runtime-host-bridge/src/execution-circuit-breaker.ts, role-model-router/apps/runtime-host-bridge/src/index.ts | Verification Surface: role-model-router/apps/runtime-host-bridge/test/execution-circuit-breaker.test.ts, role-model-router/apps/runtime-host-bridge/test/index.test.ts | QA Surface: .recursive/run/91-adaptive-execution-cooldown-policy/05-manual-qa.md
- R2 | Status: planned | Implementation Surface: role-model-router/apps/runtime-host-bridge/src/execution-circuit-breaker.ts | Verification Surface: role-model-router/apps/runtime-host-bridge/test/execution-circuit-breaker.test.ts | QA Surface: .recursive/run/91-adaptive-execution-cooldown-policy/05-manual-qa.md
- R3 | Status: planned | Implementation Surface: role-model-router/apps/runtime-host-bridge/src/execution-circuit-breaker.ts, role-model-router/apps/runtime-host-bridge/src/index.ts | Verification Surface: role-model-router/apps/runtime-host-bridge/test/execution-circuit-breaker.test.ts, role-model-router/apps/runtime-host-bridge/test/index.test.ts | QA Surface: .recursive/run/91-adaptive-execution-cooldown-policy/05-manual-qa.md
- R4 | Status: planned | Implementation Surface: role-model-router/apps/runtime-host-bridge/src/execution-circuit-breaker.ts, role-model-router/apps/runtime-host-bridge/src/index.ts | Verification Surface: role-model-router/apps/runtime-host-bridge/test/execution-circuit-breaker.test.ts, role-model-router/apps/runtime-host-bridge/test/index.test.ts | QA Surface: .recursive/run/91-adaptive-execution-cooldown-policy/05-manual-qa.md
- R5 | Status: planned | Implementation Surface: role-model-router/apps/runtime-host-bridge/src/execution-circuit-breaker.ts, role-model-router/apps/runtime-host-bridge/src/index.ts | Verification Surface: role-model-router/apps/runtime-host-bridge/test/execution-circuit-breaker.test.ts, role-model-router/apps/runtime-host-bridge/test/index.test.ts | QA Surface: .recursive/run/91-adaptive-execution-cooldown-policy/05-manual-qa.md
- R6 | Status: planned | Implementation Surface: role-model-router/apps/runtime-host-bridge/src/index.ts | Verification Surface: role-model-router/apps/runtime-host-bridge/test/index.test.ts | QA Surface: .recursive/run/91-adaptive-execution-cooldown-policy/05-manual-qa.md
- R7 | Status: planned | Implementation Surface: role-model-router/apps/runtime-host-bridge/src/execution-circuit-breaker.ts, role-model-router/apps/runtime-host-bridge/src/index.ts | Verification Surface: role-model-router/apps/runtime-host-bridge/test/execution-circuit-breaker.test.ts | QA Surface: .recursive/run/91-adaptive-execution-cooldown-policy/04-test-summary.md
- R8 | Status: planned | Implementation Surface: role-model-router/packages/runtime-observability/src/index.ts, role-model-router/apps/runtime-host-bridge/src/index.ts | Verification Surface: role-model-router/apps/runtime-host-bridge/test/index.test.ts | QA Surface: .recursive/run/91-adaptive-execution-cooldown-policy/05-manual-qa.md
- R9 | Status: planned | Implementation Surface: role-model-router/apps/runtime-ui/app/lib/runtime-api.ts, role-model-router/apps/runtime-ui/app/lib/view-models.ts, role-model-router/apps/runtime-ui/app/routes/providers.tsx | Verification Surface: role-model-router/apps/runtime-ui/app/lib/view-models.test.ts, role-model-router/apps/runtime-ui/app/routes/providers.test.ts | QA Surface: .recursive/run/91-adaptive-execution-cooldown-policy/05-manual-qa.md
- R10 | Status: planned | Implementation Surface: role-model-router/apps/runtime-host-bridge/test/execution-circuit-breaker.test.ts, role-model-router/apps/runtime-host-bridge/test/index.test.ts, role-model-router/apps/runtime-ui/app/lib/view-models.test.ts | Verification Surface: .recursive/run/91-adaptive-execution-cooldown-policy/evidence/logs/red, .recursive/run/91-adaptive-execution-cooldown-policy/evidence/logs/green, .recursive/run/91-adaptive-execution-cooldown-policy/04-test-summary.md | QA Surface: .recursive/run/91-adaptive-execution-cooldown-policy/05-manual-qa.md
- R11 | Status: planned | Implementation Surface: .recursive/run/91-adaptive-execution-cooldown-policy/05-manual-qa.md | Verification Surface: .recursive/run/91-adaptive-execution-cooldown-policy/04-test-summary.md, .recursive/run/91-adaptive-execution-cooldown-policy/05-manual-qa.md | QA Surface: .recursive/run/91-adaptive-execution-cooldown-policy/05-manual-qa.md

## Coverage Gate

- [x] R1-R11 map to concrete implementation, verification, and QA surfaces
- [x] Strict RED-first slices precede every production edit
- [x] v1 migration, restart recovery, and half-open concurrency are planned
- [x] Stage-first/no-live-load boundary is preserved

Coverage: PASS

## Approval Gate

- [x] Plan is specific enough to begin Phase 3 strict TDD
- [x] Plan stays within locked requirements and confirmed root causes
- [x] No unresolved blocker or infrastructure expansion remains

Approval: PASS
