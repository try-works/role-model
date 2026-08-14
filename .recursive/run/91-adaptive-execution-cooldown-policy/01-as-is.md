Run: `/.recursive/run/91-adaptive-execution-cooldown-policy/`
Phase: `01 AS-IS`
Status: `LOCKED`
LockedAt: `2026-08-14T08:11:32Z`
LockHash: `ada77dd42809d317db19e6b216c4fa307ec8a1bd1dd2d96714a073f029b44591`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/91-adaptive-execution-cooldown-policy/00-requirements.md`
- `/.recursive/run/91-adaptive-execution-cooldown-policy/00-worktree.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
- `/.recursive/memory/domains/benchmark-scoring-and-grading-contracts.md`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/src/benchmark-runner.ts`
- `role-model-router/packages/runtime-observability/src/index.ts`
- `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- `role-model-router/apps/runtime-ui/app/lib/view-models.ts`
- `role-model-router/apps/runtime-ui/app/routes/providers.tsx`
Outputs:
- `/.recursive/run/91-adaptive-execution-cooldown-policy/01-as-is.md`
Scope note: Audit the current execution-failure cooldown from provider error classification through persistence, routing eligibility, telemetry, and the remote-provider UI.

## Audit Context

- Audit Execution Mode: `self-audit`
- Subagent Availability: `unavailable`
- Subagent Capability Probe: `Active system instructions disallow spawning collaborators for this task.`
- Delegation Decision Basis: `The controller performed the complete read-only source and evidence audit locally.`
- Audit Inputs Provided: `Locked Phase 0 artifacts, current code, tests, git history/blame, and relevant CURRENT memory shards.`

## TODO

- [x] Re-read locked requirements and worktree baseline
- [x] Trace classification, retry, persistence, deny-list, and refusal paths
- [x] Trace endpoint telemetry through runtime-observability and runtime-ui
- [x] Identify benchmark and credential-refresh behavior
- [x] Map every requirement to current behavior and gaps
- [x] Audit worktree diff and complete gates

## Effective Inputs Re-read

- `.recursive/run/91-adaptive-execution-cooldown-policy/00-requirements.md`
- `.recursive/run/91-adaptive-execution-cooldown-policy/00-worktree.md`
- `.recursive/STATE.md`
- `.recursive/DECISIONS.md`
- `.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
- `.recursive/memory/domains/benchmark-scoring-and-grading-contracts.md`
- The runtime-host, runtime-observability, benchmark-runner, runtime-api, view-model, route, and test files named in Inputs.

## Prior Recursive Evidence Reviewed

- `.recursive/memory/domains/runtime-routing-and-provider-capabilities.md` records the current 10m–20h cooldown, auth repair, telemetry ownership, and provider/runtime validation paths.
- `.recursive/memory/domains/benchmark-scoring-and-grading-contracts.md` records that benchmark traffic may bypass denial but must remain distinct from live runtime behavior.
- `.recursive/run/64-observed-data-decay-policy-recalibration/` establishes the related time-decay truthfulness pattern used in this analysis.

## Reproduction Steps (Novice-Runnable)

1. Start from the locked worktree and open `role-model-router/apps/runtime-host-bridge/src/index.ts`.
2. Observe the v1 maintenance key and 10-minute first schedule entry near the execution-failure constants.
3. Follow `executeCurrentExecutionRequest`: a retryable `fetch failed` is tried twice, then `recordExecutionFailureCooldown` persists failure count 1.
4. Issue the same exact-model request again before ten minutes; `readActiveExecutionFailureCooldownEndpointIds` denies the sole endpoint before provider execution.
5. Observe that the HTTP bridge returns 400 / `no_eligible_target` although the client request is valid and the only exclusion is temporary.
6. Open `/app/remote/providers`; the endpoint API contains `executionCooldown`, but the runtime UI type/view-model drops it and renders only provider health.

## Source Requirement Inventory

- R1 | Disposition: in-scope | Source Quote: Classify failures before changing endpoint eligibility | Summary: Preserve classifier detail through breaker policy and traffic isolation.
- R2 | Disposition: in-scope | Source Quote: Use a short adaptive connection/timeout policy | Summary: Replace the immediate ten-minute transport ban.
- R3 | Disposition: in-scope | Source Quote: Use failure-class-specific provider and rate-limit policy | Summary: Separate 5xx and Retry-After behavior.
- R4 | Disposition: in-scope | Source Quote: Block authentication and quota failures explicitly | Summary: Represent configuration/account blocks without timers.
- R5 | Disposition: in-scope | Source Quote: Implement explicit circuit lifecycle and half-open probing | Summary: Add probation/open/half-open and one-probe lifecycle.
- R6 | Disposition: in-scope | Source Quote: Preserve fallback routing and return truthful refusal semantics | Summary: Preserve fallback and return a truthful temporary 503.
- R7 | Disposition: in-scope | Source Quote: Persist a versioned breaker schema and migrate v1 safely | Summary: Store v2 and retire unsafe legacy bans.
- R8 | Disposition: in-scope | Source Quote: Expose breaker state through existing runtime telemetry APIs | Summary: Extend the existing receipt rather than add a parallel trace.
- R9 | Disposition: in-scope | Source Quote: Update the existing remote-provider UI | Summary: Show health and circuit independently.
- R10 | Disposition: quality-gate | Source Quote: Verify behavior with deterministic local tests | Summary: Cover policy and UI without paid live load.
- R11 | Disposition: quality-gate | Source Quote: Validate a stage release candidate before production promotion | Summary: Preserve dev-to-stage-RC-to-main release order.

## Current Execution Path

1. `classifyUpstreamExecutionFailure` maps timeout, quota, rate limit, connection, auth, 5xx, invalid request, and generic failures into `UpstreamExecutionError` fields.
2. `executeCurrentExecutionRequest` retries retryable failures once per endpoint inside the same request.
3. After retry exhaustion, `shouldRecordExecutionFailureCooldown` returns true for every `fallbackEligible` error, including connection, timeout, rate-limit, auth, quota, and provider 5xx.
4. `recordExecutionFailureCooldown` increments one endpoint-global count and uses a single `10m -> 30m -> 1h -> 5h -> 10h -> 20h` schedule.
5. The v1 map is persisted under `routing.execution-failure-cooldowns.v1` in `memory_maintenance`.
6. Before each routing decision, active v1 records are merged into `denyEndpoints`; the router selects another candidate or returns no target.
7. When cooldown-denied endpoints exhaust the route, `throwUnavailableExecutionTarget` returns HTTP 400 / `no_eligible_target`.
8. A successful execution deletes the endpoint record. No time-based failure-count reset exists.

## Current Behavior by Requirement

### `R1` Failure classification

- Present: The classifier already distinguishes the required error classes and invalid requests are `fallbackEligible: false`.
- Gap: Breaker recording is based only on `fallbackEligible`, so all otherwise distinct failure classes receive the same policy.
- Gap: Benchmark calls set `ignoreExecutionFailureCooldowns`, which bypasses denial but does not prevent benchmark failures from recording/escalating the live breaker.

### `R2` Connection/timeout policy

- Current: First retry-exhausted `upstream_connection_error` or `upstream_timeout` creates an immediate 10-minute deny.
- Current: Counts never decay; old failures continue up the ladder until success explicitly deletes the record.
- Gap: No probation state, 60-second grouping window, short ladder, or 5-minute reset.

### `R3` Provider 5xx and rate limits

- Current: Both use the same 10-minute initial schedule.
- Current: `rate_limited` remains retryable, so the same endpoint is retried immediately once inside the request.
- Gap: The direct HTTP path does not forward response `Retry-After` to the classifier or cooldown record.

### `R4` Authentication and quota

- Present: Direct local-file/local-encrypted OAuth execution performs one refresh after a 401/403, then classifies a repeated failure.
- Present: Codex-specific credential rehydration may clear an auth cooldown when fresher stored auth is found.
- Gap: Auth and quota are stored as timed cooldowns rather than explicit `blocked_auth` / `blocked_quota` states.
- Boundary: Static API-key credentials have no supported provider refresh API; the code must not fabricate one.

### `R5` Circuit lifecycle

- Current record has only `failureCount`, `cooldownUntilMs`, and last-error metadata.
- Gap: No probation, half-open, single-probe ownership, terminal blocked state, failure-free reset, or explicit healthy projection.

### `R6` Fallback and refusal

- Present: The current deny-list preserves fallback routing when another candidate is eligible.
- Gap: Temporary exhaustion is reported as HTTP 400 / `no_eligible_target`; no safe `retryAfterMs` or `nextProbeAtMs` is returned.
- Gap: Temporary and permanent exclusions are not semantically distinguished.

### `R7` Persistence and migration

- Current: v1 JSON is bounded only by endpoint count and stores safe summary metadata plus a bounded error preview.
- Gap: No schema envelope/version, failure class policy fields, circuit state, probe fields, or migration path.

### `R8` Telemetry APIs

- Present: `/api/role-model/endpoints` attaches `executionCooldown` from runtime-observability, and failure telemetry carries cooldown receipts.
- Gap: The receipt contract exposes only active/count/until/last class; it cannot represent probation, half-open, blocked states, or next probe.

### `R9` Remote-provider UI

- Current: `RuntimeEndpoint` omits `executionCooldown` even though the API emits it.
- Current: `buildConfiguredRemoteConnectionRows` carries only one `healthStatus`; `providers.tsx` shows that as a single badge.
- Gap: The UI silently drops circuit data and cannot distinguish provider health from routing circuit eligibility.

### `R10` Deterministic tests

- Present: Existing tests cover the legacy schedule, timeout denial, benchmark bypass, invalid-request exclusion, fallback, persistence, and auth repair.
- Gap: Those tests encode the unsafe 10-minute behavior and do not cover class-specific ladders, half-open concurrency, v1 migration, truthful 503, or UI projection.

### `R11` Stage-first validation

- Present: Repository policy targets changes to `dev` and promotes through `stage` before `main`.
- Gap: No RC exists for this change yet; Phase 5 must remain local/stage-oriented and use deterministic provider doubles rather than new DeepSeek load.

## Relevant Code Pointers

- `runtime-host-bridge/src/index.ts:3382-3413` — v1 key, single schedule, record shape.
- `runtime-host-bridge/src/index.ts:3730-3880` — upstream failure classification.
- `runtime-host-bridge/src/index.ts:3890-4124` — v1 parse/read/write/record/clear.
- `runtime-host-bridge/src/index.ts:11699-11758` — Codex auth repair and cooldown clearing.
- `runtime-host-bridge/src/index.ts:19917-20014` — cooldown deny merge and misleading 400 refusal.
- `runtime-host-bridge/src/index.ts:20360-20440` — direct provider execution and one OAuth refresh.
- `runtime-host-bridge/src/index.ts:20941-21010` — retry, cooldown record, fallback reroute.
- `runtime-host-bridge/src/index.ts:24330-24412` — endpoint API cooldown attachment.
- `runtime-host-bridge/src/benchmark-runner.ts:88-99` — benchmark bypass flag.
- `runtime-observability/src/index.ts:305-316` — legacy cooldown receipt type.
- `runtime-ui/app/lib/runtime-api.ts:279-304` — endpoint type drops cooldown.
- `runtime-ui/app/lib/view-models.ts:504-571` — configured row drops cooldown.
- `runtime-ui/app/routes/providers.tsx:1100-1160` — single health badge.

## History and Pattern Comparison

- Git blame shows the single long cooldown schedule originated in `4557cb197` and was later augmented with telemetry identifiers, not redesigned by failure class.
- CURRENT routing memory documents the legacy 10m–20h behavior and requires benchmark-owned executions to bypass normal denial; this run must update that memory because the owning paths and durable policy change.
- Existing observed-data decay work supplies a compatible principle: diagnostics must state whether freshness/reset behavior actually applied rather than implying it.

## Evidence

- `.recursive/run/91-adaptive-execution-cooldown-policy/evidence/logs/phase0/runtime-host-cooldown-baseline.log`
- `.recursive/run/91-adaptive-execution-cooldown-policy/evidence/logs/phase0/runtime-ui-provider-baseline.log`
- `git log -S EXECUTION_FAILURE_COOLDOWN_SCHEDULE_MS` and `git blame` identify the legacy policy origin.
- Direct source reads listed in Relevant Code Pointers prove the end-to-end data flow.

## Known Unknowns

- Vendor adapters do not all expose response headers. `Retry-After` can be honored on the direct HTTP path immediately; other adapters must use the safe default until their typed result exposes a header.
- Persisted half-open ownership does not need cross-process leasing while one runtime process owns the SQLite state, but process-local probe exclusion must be reset safely on restart.
- The current UI refresh cadence, rather than a new timer service, should own countdown refresh; Phase 2 will select the smallest existing render helper.

## Earlier Phase Reconciliation

- Locked requirements R1-R11 exactly match the traced current surfaces; no requirement was weakened or expanded.
- Locked Phase 0 diff basis remains `b5329e49972bad210f78d04cc957ee9238c42ab8`; no product file has changed.
- The stage-first/no-new-provider-load constraints remain compatible with deterministic provider doubles and the existing QA runtime.

## Subagent Contribution Verification

- No subagent contribution exists. The controller verified all cited paths and evidence directly because active system instructions make delegation unavailable.

## Worktree Diff Audit

- Baseline type: `remote ref`
- Baseline reference: `origin/dev`
- Comparison reference: `working-tree`
- Normalized baseline: `b5329e49972bad210f78d04cc957ee9238c42ab8`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only b5329e49972bad210f78d04cc957ee9238c42ab8`
- Current drift: run-91 recursive artifacts/evidence only; no product code changes before Phase 2/TDD.
- Unexpected product drift: none.

## Requirement Completion Status

- R1 | Status: blocked | Rationale: Current recording collapses all fallback-eligible classes. | Blocking Evidence: role-model-router/apps/runtime-host-bridge/src/index.ts
- R2 | Status: blocked | Rationale: Current first transport failure creates a ten-minute deny. | Blocking Evidence: role-model-router/apps/runtime-host-bridge/src/index.ts
- R3 | Status: blocked | Rationale: Provider 5xx and rate limits share the legacy schedule and Retry-After is dropped. | Blocking Evidence: role-model-router/apps/runtime-host-bridge/src/index.ts
- R4 | Status: blocked | Rationale: Auth and quota are timed cooldowns rather than explicit blocked states. | Blocking Evidence: role-model-router/apps/runtime-host-bridge/src/index.ts
- R5 | Status: blocked | Rationale: The v1 record has no explicit circuit lifecycle or probe ownership. | Blocking Evidence: role-model-router/apps/runtime-host-bridge/src/index.ts
- R6 | Status: blocked | Rationale: Temporary exhaustion returns 400/no_eligible_target. | Blocking Evidence: role-model-router/apps/runtime-host-bridge/src/index.ts
- R7 | Status: blocked | Rationale: Only the unversioned v1 endpoint map is persisted. | Blocking Evidence: role-model-router/apps/runtime-host-bridge/src/index.ts
- R8 | Status: blocked | Rationale: Existing cooldown receipt cannot represent the approved state machine. | Blocking Evidence: role-model-router/packages/runtime-observability/src/index.ts
- R9 | Status: blocked | Rationale: Runtime UI endpoint type and view model drop breaker receipts. | Blocking Evidence: role-model-router/apps/runtime-ui/app/lib/runtime-api.ts
- R10 | Status: blocked | Rationale: Deterministic tests currently assert the legacy policy. | Blocking Evidence: role-model-router/apps/runtime-host-bridge/test/index.test.ts
- R11 | Status: blocked | Rationale: No validated stage release candidate for this unimplemented change exists. | Blocking Evidence: .recursive/run/91-adaptive-execution-cooldown-policy/00-worktree.md

## Traceability

- R1, R2, R3, R4, and R5 map to classifier, record, persistence, and retry ownership in runtime-host.
- R6 and R7 map to routing refusal and maintenance-state migration.
- R8 and R9 map to runtime-observability, runtime API, view-model, and provider route.
- R10 maps to affected host/UI tests and builds; R11 maps to the locked branch and release policy.
- The exact incident maps to R2, R6, and R8: one exhausted `fetch failed` becomes a 10-minute deny and subsequent local 400.

## Gaps Found

- None. The retry, persistence, API, and UI traces cover every in-scope current-state surface.

## Repair Work Performed

- The draft audit initially lacked the workflow-v2 machine-readable inventory/context sections. Those artifact-only omissions were repaired before lock; no product code was changed.

## Audit Verdict

Audit: PASS

## Coverage Gate

- [x] Effective inputs re-read
- [x] Every R1-R11 requirement has a current-state finding
- [x] Provider execution, persistence, routing, telemetry, benchmark, and UI paths are traced
- [x] Worktree diff basis is reconciled

Coverage: PASS

## Approval Gate

- [x] AS-IS findings are concrete enough for root-cause analysis and planning
- [x] Supported credential-refresh boundary is explicit
- [x] No unresolved current-state ambiguity blocks Phase 1.5

Approval: PASS
